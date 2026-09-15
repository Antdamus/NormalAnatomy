/* Loaded by the existing service worker; long model waits stay in the ChatGPT tab. */
const visualLectureJobs = new Set();

async function openVisualLecture(id = "") {
  const url = chrome.runtime.getURL("visual-lecture.html") + (id ? `?lesson=${encodeURIComponent(id)}` : "");
  const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL("visual-lecture.html") + "*" });
  const existing = tabs.find(tab => tab.url === url);
  if (existing) return chrome.tabs.update(existing.id, { active: true });
  return chrome.tabs.create({ url, active: true });
}

// Resolve from open organizer tabs and the actual reader, so ownership survives a
// worker restart and ends immediately when that organizer closes or the reader changes.
async function findVisualLecturePlaybackTarget(readerTab, readerState = null) {
  if (!readerTab?.id) return null;
  const organizerUrl = chrome.runtime.getURL("visual-lecture.html");
  const organizers = await chrome.tabs.query({ url: organizerUrl + "*" });
  if (!organizers.length) return null;
  if (!readerState) {
    const response = await sendSpeechifyMessageWithInjection(readerTab.id, {
      type: "SPEECHIFY_PLAYER_REMOTE", action: "state", tabAudible: !!readerTab.audible
    });
    if (!response?.ok) return null;
    readerState = response.result;
  }
  for (const tab of organizers) {
    const url = new URL(tab.url);
    if (url.protocol + "//" + url.host + url.pathname !== organizerUrl) continue;
    const id = url.searchParams.get("lesson");
    if (!id) continue;
    const lesson = await VisualLectureStore.get(id);
    const versions = lesson ? [lesson, ...(lesson.lectureHistory || []).map(version => ({ ...lesson, ...version }))] : [];
    if (versions.some(version => VisualLecture.matchesLectureReader(version, readerState))) {
      return { lessonId: id, organizerTabId: tab.id, speechifyTabId: readerTab.id };
    }
  }
  return null;
}

async function speechifyStateForSourcePage(tab, state) {
  const target = await findVisualLecturePlaybackTarget(tab, state);
  return target
    ? { ...state, lectureSection: null, sourceFollowSuppressed: true, visualLectureId: target.lessonId }
    : state;
}

async function startVisualLecture(tab, settings) {
  const captureSettings = { ...settings, mode: "narrative", include: "all", caseMap: "", downloadImages: true, downloadPlain: true, downloadAnnotated: true, keepCaptionHtml: true };
  const sourceInstruction = "Source capture for a visual lecture. Preserve the complete article, original image captions, modality/sequence information, clinical context and source relationships. Do not generate cards.";
  await sendPageStatus(tab.id, "Visual lecture", "Collecting source text and image references...");
  let extraction;
  if (settings.useMasterSource) {
    const master = await getLatestMasterSourceCache();
    if (!master?.packageText) throw new Error("Import the completed master source before generating its visual lecture.");
    extraction = await buildMasterSourceExtraction(captureSettings, sourceInstruction, master);
  } else extraction = await extractRadPrimerArticle(tab.id, captureSettings, sourceInstruction);
  const metadata = extraction.meta || {};
  const primary = new Set(metadata.masterImageIds || []);
  const archived = new Set(metadata.archiveOptionalImageIds || []);
  const registry = (metadata.imageRegistry?.length ? metadata.imageRegistry : buildSourceImageRegistryFromPending({ extractionMeta: metadata, downloadFiles: extraction.downloadFiles }))
    .map(entry => ({ ...normalizeImageRegistryEntry(entry), sourceUrl: entry.sourceArticleUrl || entry.sourceUrl || metadata.sourceUrl || tab.url, required: primary.size ? primary.has(entry.masterImageId) : !archived.has(entry.masterImageId) }));
  if (!registry.length) throw new Error("No image references were captured. Open the article image gallery and try again.");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(extraction.output + JSON.stringify(registry)));
  const id = "vl-" + Array.from(new Uint8Array(hash)).slice(0, 12).map(n => n.toString(16).padStart(2, "0")).join("");
  if (visualLectureJobs.has(id)) return { message: "This visual lecture is already starting.", lessonId: id };
  visualLectureJobs.add(id);
  try {
  let lesson = await VisualLectureStore.get(id);
  if (lesson) {
    await openVisualLecture(id);
    return { message: "Opened the saved visual lecture for this source. Use Resume there if a generation needs recovery.", lessonId: id };
  }
  const recommended = TeachingFramework.recommend({ title: metadata.title, teachingFramework: metadata.teachingFramework });
  const teachingFramework = { ...recommended, engine: settings.engine || recommended.engine };
  lesson = { id, title: metadata.title || "Radiology lesson", createdAt: Date.now(), status: "preparing", sourceText: extraction.output, registry, sourceMetadata: metadata, teachingFramework, sourceTabId: tab.id, settings, plan: null, narration: null };
  await VisualLectureStore.put(lesson);
  await openVisualLecture(id);
  await runVisualLectureStage(id, "plan");
  return { message: "Visual lecture started. Your study page will show the map first, then the narration.", lessonId: id };
  } finally { visualLectureJobs.delete(id); }
}

async function runVisualLectureStage(id, stage) {
  const lesson = await VisualLectureStore.get(id);
  if (!lesson) throw new Error("Saved lesson not found.");
  const token = crypto.randomUUID();
  let caseIds;
  if (stage === "narration") {
    lesson.narrationContractVersion = 2;
    const batches = VisualLecture.narrationBatches(lesson.plan);
    if (batches.length > 1) {
      const revision = lesson.pendingNarrationRevision || Number(lesson.narrationRevision || 1);
      if (!lesson.narrationProgress || lesson.narrationProgress.revision !== revision ||
          JSON.stringify(lesson.narrationProgress.batches) !== JSON.stringify(batches)) {
        lesson.narrationProgress = { version: 1, revision, batches, nextBatch: 0, segments: [] };
      }
      caseIds = lesson.narrationProgress.batches[lesson.narrationProgress.nextBatch];
      if (!caseIds) throw new Error("The saved narration preparation is inconsistent. Regenerate the lecture from its saved map.");
    }
  }
  const progress = lesson.narrationProgress;
  const section = stage === "narration" && progress ? { sectionNumber: progress.nextBatch + 1, sectionCount: progress.batches.length } : null;
  const retryReason = lesson.retryReason && !/prompt changed|did not retain|composer|automated send|message was not sent|no prompt was sent/i.test(lesson.retryReason) ? lesson.retryReason : "";
  const prompt = (section ? `PREPARATION STATUS: section ${section.sectionNumber} of ${section.sectionCount} of one combined lecture. This status is not spoken narration.\n\n` : "") +
    (stage === "plan" ? VisualLecture.planPrompt(lesson) : VisualLecture.narrationPrompt(lesson, caseIds)) +
    (retryReason ? `\n\nPrevious attempt failed validation: ${retryReason}\nCorrect that issue and return the entire complete JSON for this pass again.` : "");
  lesson.generationSummary = { stage, ...section, promptCharacters: prompt.length };
  Object.assign(lesson, { status: stage === "plan" ? "organizing" : "narrating", stage, token, stageStartedAt: Date.now(), error: "" });
  await VisualLectureStore.put(lesson);
  try {
    await openChatGptAndStart({ ...lesson.settings, autoSubmitChatGPT: true, autoSendToSpeechify: false },
      prompt, lesson.title,
      { waitForResult: true, speechify: null, preserveAuditBlock: true, expectedOutputKind: "visual_lecture_json", completionMessageType: "VISUAL_LECTURE_GENERATED", completionPayload: { id, token, stage, ...section } });
  } catch (error) {
    await VisualLectureStore.put({ ...lesson, status: "error", error: error.message, retryReason: error.message });
    throw error;
  }
}

function visualLectureFolderFromUrl(value) {
  try {
    const url = new URL(value);
    const id = url.searchParams.get("folder");
    if (url.protocol !== "https:" || !/(^|\.)speechify\.com$/i.test(url.hostname) || !id) return null;
    return { id, name: "", parentChain: [] };
  } catch { return null; }
}

function visualLectureAudioFolder(lesson) {
  // A folder explicitly chosen in the study page takes precedence. Otherwise
  // inherit the verified reader's location, including the previous audio version.
  if (lesson.audioDestination?.source === "user") {
    const chosen = visualLectureFolderFromUrl(lesson.audioDestination.url);
    if (chosen) return chosen;
  }
  const versions = [lesson, ...(lesson.lectureHistory || []).slice().reverse()];
  for (const version of versions) {
    const folder = visualLectureFolderFromUrl(version.speechify?.readerUrl);
    if (folder) return folder;
  }
  const remembered = visualLectureFolderFromUrl(lesson.audioDestination?.url);
  if (remembered) return remembered;
  return buildSpeechifyPayload({ ...lesson.settings, mode: "narrative", autoSubmitChatGPT: true, autoSendToSpeechify: true }, lesson.title)?.folder;
}

function rememberVisualLectureAudioFolder(lesson, folder, source = "reader") {
  if (!folder?.id || (source !== "user" && lesson.audioDestination?.source === "user")) return;
  const url = buildSpeechifyFolderUrl(folder.id);
  lesson.audioDestination = { url, id: folder.id, source };
  lesson.settings = { ...lesson.settings, speechifyFolderUrl: url, speechifyFolderId: folder.id,
    speechifyFolderName: folder.name || "", speechifyFolderChain: folder.parentChain || [] };
}

function visualLectureAudioTitle(lesson) {
  const revision = Number(lesson.narrationRevision || 1);
  return `${lesson.title.slice(0, 78)} · ${lesson.id.slice(-8)}${revision > 1 ? ` · lecture ${revision}` : ""}`;
}

async function regenerateVisualLectureNarration(id, { retry = false } = {}) {
  if (visualLectureJobs.has(id)) throw new Error("This lecture already has a step running.");
  visualLectureJobs.add(id);
  try {
    const lesson = await VisualLectureStore.get(id);
    if (!lesson?.plan || !lesson.sourceText) throw new Error("The saved map and source are needed to regenerate the lecture.");
    const active = ["organizing", "narrating", "saving-audio"].includes(lesson.status);
    const recent = Date.now() - lesson.stageStartedAt < Number(lesson.settings?.chatgptTimeoutSec || 900) * 1000 + 60000;
    if (active && recent) throw new Error("Wait for the current lecture step to finish.");
    rememberVisualLectureAudioFolder(lesson, visualLectureAudioFolder(lesson));
    // Keep the playable version until a complete replacement passes validation.
    lesson.pendingNarrationRevision = lesson.pendingNarrationRevision || Number(lesson.narrationRevision || (lesson.narration ? 1 : 0)) + 1;
    if (!retry) { lesson.retryReason = ""; delete lesson.narrationProgress; }
    await VisualLectureStore.put(lesson);
    await runVisualLectureStage(id, "narration");
    return { started: true };
  } finally { visualLectureJobs.delete(id); }
}

async function completeVisualLecture(message, sender) {
  if (!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(sender?.url || sender?.tab?.url || "")) throw new Error("Expected a ChatGPT generation result.");
  const { id, token, stage } = message.completionPayload || {};
  const lesson = await VisualLectureStore.get(id);
  if (!lesson || lesson.token !== token || lesson.stage !== stage || !["organizing", "narrating"].includes(lesson.status)) return { ignored: true };
  if (visualLectureJobs.has(id)) return { ignored: true };
  visualLectureJobs.add(id);
  let next = "";
  try {
    const result = message.result || {};
    lesson[stage + "Draft"] = result.assistantText || "";
    lesson[stage + "DraftComplete"] = !result.error && !result.partial;
    lesson.chatGptUrl = sender.tab?.url || sender.url;
    if (result.error || result.partial) throw new Error(result.error || "ChatGPT returned an incomplete response. Resume to regenerate the unfinished step.");
    const value = VisualLecture.parseJSON(result.assistantText);
    if (stage === "plan") {
      lesson.plan = VisualLecture.validatePlan(value, lesson.registry, lesson.sourceText);
      lesson.status = "map-ready";
      next = "narration";
    } else {
      const progress = lesson.narrationProgress;
      const passPlan = progress ? VisualLecture.narrationPlan(lesson.plan, progress.batches[progress.nextBatch]) : lesson.plan;
      let narration = VisualLecture.validateNarration(value, passPlan, lesson.registry, { requireArrowCues: lesson.narrationContractVersion >= 2 });
      if (progress) {
        progress.segments.push(...value.segments.map(segment => ({ caseId: segment.caseId, text: segment.text.trim() })));
        progress.nextBatch += 1;
        lesson.retryReason = "";
        if (progress.nextBatch < progress.batches.length) {
          await VisualLectureStore.put(lesson);
          // A fresh token prevents a duplicate callback from appending the pass twice.
          await runVisualLectureStage(id, "narration");
          return { saved: true, preparing: true, completedPasses: progress.nextBatch, totalPasses: progress.batches.length };
        }
        narration = VisualLecture.validateNarration({ schemaVersion: 1, segments: progress.segments }, lesson.plan, lesson.registry, { requireArrowCues: lesson.narrationContractVersion >= 2 });
        lesson.narrationPassCount = progress.batches.length;
        delete lesson.narrationProgress;
      }
      if (lesson.pendingNarrationRevision && lesson.narration) {
        try { await visualLecturePlayer(id, "pause"); } catch {}
        lesson.lectureHistory = [...(lesson.lectureHistory || []), {
          narrationRevision: Number(lesson.narrationRevision || 1), narration: lesson.narration,
          speechifyTitle: lesson.speechifyTitle, speechify: lesson.speechify, savedAt: Date.now()
        }];
      }
      rememberVisualLectureAudioFolder(lesson, visualLectureAudioFolder(lesson));
      lesson.speechifyWorkTabId = lesson.speechify?.tabId || lesson.speechifyWorkTabId;
      lesson.speechifyWorkReaderUrl = lesson.speechify?.readerUrl || lesson.speechifyWorkReaderUrl;
      lesson.narration = narration;
      lesson.narrationRevision = lesson.pendingNarrationRevision || Number(lesson.narrationRevision || 1);
      delete lesson.pendingNarrationRevision;
      lesson.speechify = {};
      lesson.speechifyTitle = visualLectureAudioTitle(lesson);
      lesson.retryReason = "";
      lesson.status = "text-ready";
      next = "speechify";
    }
    await VisualLectureStore.put(lesson);
  } catch (error) {
    await VisualLectureStore.put({ ...lesson, status: "error", error: error.message, retryReason: error.message });
    return { error: error.message };
  } finally { visualLectureJobs.delete(id); }
  if (next === "speechify") await prepareVisualLectureAudio(id);
  else if (next) await runVisualLectureStage(id, next);
  return { saved: true };
}

async function prepareVisualLectureAudio(id) {
  const lesson = await VisualLectureStore.get(id);
  if (!lesson?.narration) throw new Error("The narration is not ready yet.");
  if (visualLectureJobs.has(id)) return;
  visualLectureJobs.add(id);
  const title = visualLectureAudioTitle(lesson);
  try {
    lesson.status = "saving-audio";
    lesson.stageStartedAt = Date.now();
    lesson.speechifyTitle = title;
    lesson.error = "";
    await VisualLectureStore.put(lesson);
    const folder = visualLectureAudioFolder(lesson);
    rememberVisualLectureAudioFolder(lesson, folder);
    lesson.speechify = await createSpeechifyLectureFromChatGPT({ title, text: lesson.narration.text, folder, autoSave: true, openReader: true,
      reuseTabId: lesson.speechifyWorkTabId || lesson.speechify?.tabId,
      expectedReaderUrl: lesson.speechify?.readerUrl || lesson.speechifyWorkReaderUrl,
      onTabReady: async tab => { lesson.speechifyWorkTabId = tab.id; await VisualLectureStore.put(lesson); }
    });
    lesson.speechifyWorkReaderUrl = lesson.speechify.readerUrl || lesson.speechifyWorkReaderUrl;
    lesson.status = "ready";
    await VisualLectureStore.put(lesson);
  } catch (error) {
    await VisualLectureStore.put({ ...lesson, status: "audio-error", error: error.message });
  } finally {
    visualLectureJobs.delete(id);
    await openVisualLecture(id);
  }
}

async function recoverSavedVisualPlan(lesson) {
  const repairableLegacyError = /^Unknown case relationship\b/.test(lesson.error || "");
  if (lesson.plan || !lesson.planDraft || !(lesson.planDraftComplete === true || repairableLegacyError)) return false;
  try {
    const recovered = VisualLecture.validatePlan(VisualLecture.parseJSON(lesson.planDraft), lesson.registry, lesson.sourceText);
    Object.assign(lesson, { plan: recovered, status: "map-ready", error: "", retryReason: "", planRecoveredAt: Date.now() });
    await VisualLectureStore.put(lesson);
    return true;
  } catch { return false; }
}

async function importVisualPlanResponse(id, text) {
  if (visualLectureJobs.has(id)) throw new Error("Wait for the current step to finish before recovering its response.");
  visualLectureJobs.add(id);
  try {
    const lesson = await VisualLectureStore.get(id);
    if (!lesson) throw new Error("Saved lesson not found.");
    if (lesson.plan || lesson.narration) throw new Error("This lecture already has a saved map. Its existing map and image choices have been kept.");
    const draft = String(text || "");
    const plan = VisualLecture.validatePlan(VisualLecture.parseJSON(draft), lesson.registry, lesson.sourceText);
    if (lesson.planDraft && lesson.planDraft !== draft) {
      lesson.planDraftHistory = [...(lesson.planDraftHistory || []), { text: lesson.planDraft, complete: lesson.planDraftComplete, savedAt: Date.now() }];
    }
    // Invalidate a late callback from the abandoned organizer, without changing
    // lesson identity, cached images, or the separately stored card review.
    Object.assign(lesson, { plan, planDraft: draft, planDraftComplete: true, planRecoveredAt: Date.now(),
      token: "", stage: "plan", status: "map-ready", error: "", retryReason: "" });
    await VisualLectureStore.put(lesson);
    return { saved: true, cases: plan.cases.length, images: new Set(plan.cases.flatMap(item => item.imageIds)).size };
  } finally { visualLectureJobs.delete(id); }
}

// This function is serialized into an already-open source tab. It intentionally
// uses only that page's ordinary same-origin session, never reads credentials.
async function readVisualLectureSourceImage(url) {
  try {
    if (new URL(url).origin !== location.origin) throw new Error("The source tab changed. Reopen the matching source and retry.");
    const response = await fetch(url, { credentials: "include", signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Source image request failed (HTTP ${response.status}).`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 20 * 1024 * 1024) throw new Error("The source image is too large to transfer.");
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 16384) binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
    return { base64: btoa(binary), type: response.headers.get("content-type") || "" };
  } catch (error) { return { error: error.message }; }
}

async function cacheVisualLectureImage(id, imageId, variant) {
  if (!["plain", "annotated"].includes(variant)) throw new Error("Unknown image variant.");
  const lesson = await VisualLectureStore.get(id);
  const image = lesson?.registry.find(entry => entry.masterImageId === imageId);
  if (!image) throw new Error("This image is not in the saved source registry.");
  const key = `${id}/${imageId}/${variant}`;
  if (await VisualLectureStore.asset(key)) return { cached: true };
  const url = new URL(image[variant + "Url"]);
  if (url.protocol !== "https:" || !/^(?:app\.radprimer\.com|(?:[a-z0-9-]+\.)?statdx\.com)$/i.test(url.hostname)) throw new Error("Unsupported source image address.");
  let lastError;
  // Same-origin requests retain the source's login/session semantics. Prefer
  // this path to extension-origin fetches, which can receive login HTML.
  const tabs = await chrome.tabs.query({ url: `${url.origin}/*` });
  tabs.sort((a,b) => Number(b.id === lesson.sourceTabId) - Number(a.id === lesson.sourceTabId));
  for (const tab of tabs.slice(0,2)) {
    try {
      const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: "MAIN", func: readVisualLectureSourceImage, args: [url.href] });
      const result = results?.[0]?.result;
      if (!result?.base64) throw new Error(result?.error || "The source tab did not return an image.");
      const bytes = Uint8Array.from(atob(result.base64), char => char.charCodeAt(0));
      const blob = await VisualLectureMedia.imageBlob(new Blob([bytes], { type: result.type }));
      await VisualLectureStore.putAsset(key, blob);
      return { cached: true, method: "source-session" };
    } catch (error) { lastError = error; }
  }
  try {
    const response = await fetch(url.href, { credentials: "include", signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Source image request failed (HTTP ${response.status}).`);
    const blob = await VisualLectureMedia.imageBlob(await response.blob());
    await VisualLectureStore.putAsset(key, blob);
    return { cached: true, method: "direct" };
  } catch (error) { lastError = lastError || error; }
  throw new Error(`${image.sourceLabel}: ${lastError?.message || "Image unavailable."}${tabs.length ? "" : ` Open a signed-in ${image.sourceLabel} article tab and retry.`}`);
}

async function visualLecturePlayer(id, action) {
  const lesson = await VisualLectureStore.get(id);
  if (!lesson?.speechifyTitle) throw new Error("The lecture is still being prepared.");
  const tabs = await querySpeechifyTabs();
  for (const tab of tabs.sort((a, b) => Number(b.id === lesson.speechify?.tabId) - Number(a.id === lesson.speechify?.tabId))) {
    try {
      const response = await sendSpeechifyMessageWithInjection(tab.id, { type: "SPEECHIFY_PLAYER_REMOTE", action: "state", tabAudible: !!tab.audible });
      if (!response?.ok || !VisualLecture.matchesLectureReader(lesson, response.result)) continue;
      const state = response.result;
      const readerFormat = /["“]schemaVersion["”]\s*:\s*1/.test(state.readerTextSample || "") ||
        (state.url === lesson.speechify?.readerUrl && lesson.speechify?.readerFormat === "structured") ? "structured" : "text";
      const connected = { ...state, readerFormat };
      // A regeneration can finish while a reader request is in flight.
      const saved = await VisualLectureStore.get(id);
      if (!saved || !VisualLecture.matchesLectureReader(saved, state)) continue;
      if (!visualLectureJobs.has(id)) {
        const speechify = { ...saved.speechify, tabId: tab.id, readerUrl: state.url, boundTitle: state.title, readerFormat };
        const status = readerFormat === "structured" ? "audio-error" : "ready";
        const error = readerFormat === "structured" ? "The open Speechify file includes JSON. Choose Prepare clean audio to hear just the lecture." : "";
        const destinationBefore = JSON.stringify(saved.audioDestination);
        rememberVisualLectureAudioFolder(saved, visualLectureFolderFromUrl(state.url));
        if (!saved.pendingNarrationRevision && !["organizing", "narrating"].includes(saved.status) && (saved.status !== status || saved.error !== error || JSON.stringify(saved.speechify) !== JSON.stringify(speechify) || destinationBefore !== JSON.stringify(saved.audioDestination))) {
          await VisualLectureStore.put({ ...saved, status, error, speechify });
        }
      }
      if (action === "focus") { await focusSpeechifyTab(tab); return connected; }
      if (action === "state") return connected;
      if (!["play", "pause", "back10", "forward10"].includes(action)) throw new Error("Unknown player control.");
      const result = await sendSpeechifyMessageWithInjection(tab.id, { type: "SPEECHIFY_PLAYER_REMOTE", action, tabAudible: !!tab.audible });
      if (!result?.ok) throw new Error(result?.error || "Player control failed.");
      return { ...result.result, readerFormat };
    } catch (error) { if (tabs.length === 1 && action !== "focus") throw error; }
  }
  if (action === "focus" && lesson.speechify?.readerUrl) {
    const url = new URL(lesson.speechify.readerUrl);
    if (url.protocol === "https:" && /(^|\.)speechify\.com$/i.test(url.hostname)) {
      await chrome.tabs.create({ url: url.href });
      return { opened: true };
    }
  }
  if (action === "focus") {
    const folder = visualLectureAudioFolder(lesson);
    await chrome.tabs.create({ url: buildSpeechifyFolderUrl(folder?.id), active: true });
    return { opened: true };
  }
  throw new Error(`Open this saved lecture in Speechify to connect its player. For a manually saved file, use Copy Speechify title and name it “${lesson.speechifyTitle}”.`);
}

async function prepareVisualLectureCards(id) {
  const lesson = await VisualLectureStore.get(id);
  if (!lesson) throw new Error("Saved lesson not found.");
  const review = await VisualLectureStore.getReview(id);
  const plan = LectureCardReview.selectedPlan(review, lesson);
  const allowed = new Set(plan.selectedImageIds);
  const imageRegistry = lesson.registry.filter(image => allowed.has(image.masterImageId)).map(image => ({
    ...image, required: true, downloadRecommendation: "primaryTeachingSet", cardRole: plan.imageObjectives[image.masterImageId].role
  }));
  const roles = [...new Set(Object.values(plan.imageObjectives).map(item => item.role))];
  const engine = roles.length === 1 ? roles[0] : "mixed";
  const originalManifest = lesson.sourceMetadata?.masterSource?.manifest || {};
  const teachingFramework = { version: 1, engine, basis: "learner-card-selection", reason: "Based on the anatomy/pathology objectives you selected for these images." };
  // Retain full source context; the separate registry and allowlist limit card media.
  const manifest = { ...originalManifest, articleTitle: lesson.title, teachingFramework, cardSelectionPlan: plan,
    imageCount: imageRegistry.length, sourceImageCount: lesson.registry.length,
    sourceSelectionPlan: { imageDownloadPlan: { primaryTeachingSet: { reviewed: plan.selectedImageIds }, archiveOptionalDuplicates: {} } },
    selectedPrimaryImageIds: plan.selectedImageIds, archiveOptionalImageIds: [],
    canonicalHierarchy: originalManifest.canonicalHierarchy || lesson.sourceMetadata?.breadcrumbTrail || [] };
  delete manifest.packageSha256; delete manifest.imageRegistrySha256;
  const cache = await storeMasterSourceCache({ articleTitle: lesson.title, sourceLabel: "Reviewed lecture card source", packageText: lesson.sourceText,
    manifest, teachingFramework, imageRegistry, selectedPrimaryImageIds: plan.selectedImageIds, archiveOptionalImageIds: [] });
  const stored = await chrome.storage.local.get("radprimerRunnerSettings");
  await chrome.storage.local.set({ radprimerRunnerSettings: { ...DEFAULTS, ...(stored.radprimerRunnerSettings || {}),
    useMasterSource: true, engine, mode: "chatgpt_cards", autoGroupNonNarrative: false,
    include: "all", caseMap: "", downloadImages: true, cardModeDownloadImagesDisabled: false,
    downloadPlain: true, downloadAnnotated: true, keepCaptionHtml: true, captureCardAuditBundle: true } });
  return { selectedCount: imageRegistry.length, teachingFramework: TeachingFramework.recommend({ teachingFramework }), masterSource: summarizeMasterSource(cache) };
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!String(message?.type || "").startsWith("VISUAL_LECTURE_")) return false;
  (async () => {
    if (message.type === "VISUAL_LECTURE_GENERATED") return completeVisualLecture(message, sender);
    if (message.type === "VISUAL_LECTURE_MODEL_STARTED") {
      if (!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(sender.url || sender.tab?.url || "")) throw new Error("Expected the active ChatGPT generation.");
      const pending = await VisualLectureStore.get(message.completionPayload?.id);
      if (pending?.token === message.completionPayload?.token) await openVisualLecture(pending.id);
      return {};
    }
    const ownPage = String(sender.url || "").startsWith(chrome.runtime.getURL(""));
    if (message.type === "VISUAL_LECTURE_OPEN") { await openVisualLecture(message.id || ""); return {}; }
    if (!ownPage) throw new Error("Use the saved study page for this action.");
    if (message.type === "VISUAL_LECTURE_IMPORT_PLAN_RESPONSE") return importVisualPlanResponse(message.id, message.text);
    if (message.type === "VISUAL_LECTURE_PREPARE_CARDS") return prepareVisualLectureCards(message.id);
    if (message.type === "VISUAL_LECTURE_CACHE_IMAGE") return cacheVisualLectureImage(message.id, message.imageId, message.variant);
    if (message.type === "VISUAL_LECTURE_REGENERATE_NARRATION") return regenerateVisualLectureNarration(message.id);
    if (message.type === "VISUAL_LECTURE_PLAYER") return visualLecturePlayer(message.id, message.action || "state");
    if (message.type === "VISUAL_LECTURE_SET_AUDIO_FOLDER") {
      const lesson = await VisualLectureStore.get(message.id);
      if (!lesson) throw new Error("Saved lesson not found.");
      if (visualLectureJobs.has(lesson.id)) throw new Error("Wait for the current audio step to finish before changing its destination.");
      const address = new URL(String(message.folderUrl || ""));
      if (address.protocol !== "https:") throw new Error("Use an HTTPS Speechify folder link.");
      const folder = parseSpeechifyFolderUrl(address.href);
      rememberVisualLectureAudioFolder(lesson, { id: folder.id, name: "", parentChain: [] }, "user");
      await VisualLectureStore.put(lesson);
      return { saved: true };
    }
    if (message.type === "VISUAL_LECTURE_RESUME") {
      const lesson = await VisualLectureStore.get(message.id);
      if (!lesson) throw new Error("Saved lesson not found.");
      if (visualLectureJobs.has(lesson.id)) throw new Error("This step is already running.");
      if (["organizing", "narrating"].includes(lesson.status) && Date.now() - lesson.stageStartedAt < Number(lesson.settings.chatgptTimeoutSec || 900) * 1000 + 60000) throw new Error("ChatGPT is still working. Resume becomes available if the step times out.");
      if (lesson.pendingNarrationRevision) {
        await regenerateVisualLectureNarration(lesson.id, { retry: true });
      } else if (lesson.narration) {
        // An uncertain save may have succeeded. Recover that reader before creating anything.
        try {
          const player = await visualLecturePlayer(lesson.id, "state");
          if (player.readerFormat !== "structured") return { recovered: true };
          if (player.isPlaying) await visualLecturePlayer(lesson.id, "pause");
        } catch {}
        await prepareVisualLectureAudio(lesson.id);
      } else {
        await recoverSavedVisualPlan(lesson);
        await runVisualLectureStage(lesson.id, lesson.plan ? "narration" : "plan");
      }
      return {};
    }
    throw new Error("Unknown visual lecture action.");
  })().then(result => respond({ ok: true, result })).catch(error => respond({ ok: false, error: error.message }));
  return true;
});
