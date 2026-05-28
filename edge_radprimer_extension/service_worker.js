const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const PROMPT_FILES = {
  pathology: {
    chatgpt_cards: "prompts/pathology_chatgpt_cards.txt",
    codex_cards: "prompts/pathology_codex_cards.txt",
    narrative: "prompts/pathology_narrative.txt"
  },
  normal: {
    chatgpt_cards: "prompts/normal_chatgpt_cards.txt",
    codex_cards: "prompts/normal_codex_cards.txt",
    narrative: "prompts/normal_narrative.txt",
    narrative_with_images: "prompts/normal_narrative.txt",
    no_pictures: "prompts/normal_no_pictures.txt",
    captions_only: "prompts/normal_captions_only.txt"
  }
};

const GROUPING_PREFLIGHT_PROMPT = "prompts/grouping_preflight.txt";
const PENDING_GROUPING_PREFIX = "radprimerGroupingPending:";
const IMAGE_DOWNLOAD_SUBFOLDER = "RadPrimer";
const ANKI_WATCHER_MANIFEST_FILENAME = "_radprimer_anki_manifest.json";

const DEFAULTS = {
  engine: "pathology",
  mode: "chatgpt_cards",
  include: "all",
  caseMap: "",
  coreGap: false,
  coreSection: "it might be in multiple regions of the book so you are going to have to look through it",
  corePages: "",
  sourceNote: "",
  coreNote: "",
  downloadImages: true,
  downloadPlain: true,
  downloadAnnotated: true,
  sendImagesToAnki: false,
  keepCaptionHtml: true,
  autoGroupNonNarrative: true,
  openChatGPT: false,
  autoSubmitChatGPT: false,
  chatgptUrl: "https://chatgpt.com/g/g-p-69e5418624448191a7a74b18f607688b-pediatrics/project",
  chatgptInstruction: "make sure you do not truncate the text and read the entire message",
  chatgptTimeoutSec: "900",
  autoSendToSpeechify: true,
  speechifyAutoSave: true,
  speechifyFolderUrl: "https://app.speechify.com/?folder=c00e2ad9-89b5-4829-9884-cde0dc8b82a7",
  speechifyFolderName: "Musculoskeletal",
  speechifyFolderId: "c00e2ad9-89b5-4829-9884-cde0dc8b82a7",
  speechifyFolderChain: [
    {
      name: "Pediatric",
      id: "e8b38956-af1b-4a58-a31a-8040936033ff"
    },
    {
      name: "Musculoskeletal",
      id: "c00e2ad9-89b5-4829-9884-cde0dc8b82a7"
    }
  ]
};

function buildSpeechifyFolderUrl(folderId) {
  const url = new URL("https://app.speechify.com/");
  if (folderId) url.searchParams.set("folder", folderId);
  return url.toString();
}

function parseSpeechifyFolderUrl(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return { url: DEFAULTS.speechifyFolderUrl, id: DEFAULTS.speechifyFolderId };
  const url = new URL(raw);
  if (url.hostname !== "app.speechify.com") {
    throw new Error("Speechify folder link must start with https://app.speechify.com/");
  }
  const id = url.searchParams.get("folder") || "";
  if (!id) throw new Error("Speechify folder link must include a ?folder=... value.");
  return { url: buildSpeechifyFolderUrl(id), id };
}

function normalizeSettings(rawSettings = {}) {
  const settings = { ...DEFAULTS, ...rawSettings };
  const folder = parseSpeechifyFolderUrl(
    settings.speechifyFolderUrl || buildSpeechifyFolderUrl(settings.speechifyFolderId)
  );
  settings.speechifyFolderUrl = folder.url;
  settings.speechifyFolderId = folder.id;
  settings.speechifyFolderName = "";

  if (isNarrativeSpeechifyMode(settings)) {
    settings.include = "all";
    settings.caseMap = "";
    settings.openChatGPT = true;
    settings.autoSubmitChatGPT = true;
    settings.autoSendToSpeechify = true;
    settings.speechifyAutoSave = true;
  } else {
    settings.autoSendToSpeechify = false;
    settings.speechifyAutoSave = false;
  }

  if (settings.autoSendToSpeechify) {
    settings.openChatGPT = true;
    settings.autoSubmitChatGPT = true;
  }

  return settings;
}

function isNarrativeSpeechifyMode(settings) {
  if (!settings) return false;
  if (settings.engine === "pathology") return settings.mode === "narrative";
  if (settings.engine === "normal") {
    return settings.mode === "narrative" || settings.mode === "narrative_with_images";
  }
  return false;
}

async function loadRunnerSettings() {
  const stored = await chrome.storage.local.get("radprimerRunnerSettings");
  return normalizeSettings(stored.radprimerRunnerSettings || {});
}

async function loadPrompt(engine, mode) {
  const file = PROMPT_FILES[engine]?.[mode];
  if (!file) throw new Error(`No packaged prompt for ${engine}/${mode}`);
  const response = await fetch(chrome.runtime.getURL(file));
  if (!response.ok) throw new Error(`Could not load ${file}`);
  return response.text();
}

async function loadGroupingPreflightPrompt() {
  const response = await fetch(chrome.runtime.getURL(GROUPING_PREFLIGHT_PROMPT));
  if (!response.ok) throw new Error(`Could not load ${GROUPING_PREFLIGHT_PROMPT}`);
  return response.text();
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

async function sendPageStatus(tabId, phase, message, extra = {}) {
  try {
    await sendTabMessage(tabId, {
      type: "RADPRIMER_PAGE_RUN_STATUS",
      phase,
      message,
      ...extra
    });
  } catch {}
}

function waitForTabComplete(tabId, timeoutMs = 60000, label = "tab") {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let finished = false;

    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      clearInterval(timer);
    };

    const done = () => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve();
    };

    const fail = (error) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(error);
    };

    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") done();
    };

    const timer = setInterval(async () => {
      if (Date.now() - start > timeoutMs) {
        fail(new Error(`Timed out waiting for ${label} to load.`));
        return;
      }

      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === "complete") done();
      } catch (error) {
        fail(error);
      }
    }, 500);

    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId, (tab) => {
      if (!chrome.runtime.lastError && tab?.status === "complete") done();
    });
  });
}

async function openOrFocusSpeechifyTab(folderId) {
  const targetUrl = buildSpeechifyFolderUrl(folderId);
  const tabs = await chrome.tabs.query({ url: ["https://app.speechify.com/*"] });
  let tab = tabs?.[0];

  if (tab?.id) {
    tab = await chrome.tabs.update(tab.id, { active: true, url: targetUrl });
  } else {
    tab = await chrome.tabs.create({ url: targetUrl, active: true });
  }

  await waitForTabComplete(tab.id, 60000, "Speechify");
  return tab;
}

function sendSpeechifyMessage(tabId, payload) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, payload, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

async function sendSpeechifyMessageWithInjection(tabId, payload) {
  try {
    return await sendSpeechifyMessage(tabId, payload);
  } catch (_error) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["speechify-paster.js"]
    });
    await sleep(500);
    return sendSpeechifyMessage(tabId, payload);
  }
}

async function createSpeechifyLectureFromChatGPT({ title, text, folder, autoSave }) {
  if (!text?.trim()) throw new Error("No cleaned ChatGPT text was provided for Speechify.");

  const tab = await openOrFocusSpeechifyTab(folder?.id);
  const payload = {
    type: "SPEECHIFY_CREATE_TEXT_NOTE",
    requestId: crypto.randomUUID(),
    title,
    text,
    folder,
    autoSave: autoSave !== false
  };

  const response = await sendSpeechifyMessageWithInjection(tab.id, payload);
  if (!response?.ok) throw new Error(response?.error || "Speechify automation failed.");
  return response.result;
}

async function ensureRadPrimerExtractor(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content-extractor.js"]
  });
}

async function extractRadPrimerArticle(tabId, settings, promptText) {
  await ensureRadPrimerExtractor(tabId);
  const response = await sendTabMessage(tabId, {
    type: "RADPRIMER_EXTRACT",
    config: {
      ...settings,
      promptText,
      forceCaseLabels: settings.engine === "normal" && settings.mode === "chatgpt_cards"
    }
  });
  if (!response?.ok) throw new Error(response?.error || "Extraction failed.");
  return response;
}

function getDownloadBasename(filename) {
  const raw = String(filename || "radprimer-image.jpg").trim();
  const base = raw.split(/[\\/]/).pop() || "radprimer-image.jpg";
  return base.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

function getStagedDownloadFilename(filename) {
  return `${IMAGE_DOWNLOAD_SUBFOLDER}/${getDownloadBasename(filename)}`;
}

function isRadPrimerStagedDownload(item) {
  const filename = String(item?.filename || "").replace(/\//g, "\\").toLowerCase();
  return filename.includes("\\downloads\\radprimer\\");
}

async function clearRadPrimerDownloadFolder() {
  const items = await chrome.downloads.search({});
  const staged = items.filter(isRadPrimerStagedDownload);
  let removed = 0;

  for (const item of staged) {
    try {
      if (item.state === "complete") await chrome.downloads.removeFile(item.id);
      removed += 1;
    } catch {}

    try {
      await chrome.downloads.erase({ id: item.id });
    } catch {}
  }

  return removed;
}

function waitForDownloadComplete(downloadId, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let finished = false;

    const cleanup = () => {
      chrome.downloads.onChanged.removeListener(listener);
      clearInterval(timer);
    };

    const done = (item) => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve(item);
    };

    const fail = (error) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(error);
    };

    const check = async () => {
      try {
        const [item] = await chrome.downloads.search({ id: downloadId });
        if (!item) return;
        if (item.state === "complete") done(item);
        if (item.state === "interrupted") {
          fail(new Error(item.error || `Image download ${downloadId} was interrupted.`));
        }
      } catch (error) {
        fail(error);
      }
    };

    const listener = (delta) => {
      if (delta.id !== downloadId || !delta.state?.current) return;
      check();
    };

    const timer = setInterval(() => {
      if (Date.now() - start > timeoutMs) {
        fail(new Error("Timed out waiting for image download to complete."));
        return;
      }
      check();
    }, 500);

    chrome.downloads.onChanged.addListener(listener);
    check();
  });
}

function bytesToBase64(bytes) {
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }

  return btoa(binary);
}

function textToDataUrl(text) {
  const bytes = new TextEncoder().encode(String(text || ""));
  return `data:application/json;base64,${bytesToBase64(bytes)}`;
}

async function writeAnkiWatcherManifest(files, settings = {}) {
  const expectedFiles = files.map((file) => getDownloadBasename(file.filename));
  const manifest = {
    version: 1,
    runId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    copyToAnki: Boolean(settings.sendImagesToAnki),
    stagingFolder: "Downloads\\RadPrimer",
    ankiMediaFolder: "C:\\Users\\josem.000\\AppData\\Roaming\\Anki2\\User 1\\collection.media",
    expectedFiles
  };

  const downloadId = await chrome.downloads.download({
    url: textToDataUrl(JSON.stringify(manifest, null, 2)),
    filename: getStagedDownloadFilename(ANKI_WATCHER_MANIFEST_FILENAME),
    conflictAction: "overwrite",
    saveAs: false
  });
  await waitForDownloadComplete(downloadId);
  return manifest;
}

async function downloadSelectedImages(files, settings = {}) {
  const list = Array.isArray(files) ? files.filter((file) => file?.url && file?.filename) : [];
  const result = {
    count: 0,
    clearedCount: 0,
    ankiWatcherRequested: Boolean(settings.sendImagesToAnki),
    ankiExpectedCount: 0
  };

  if (!list.length) return result;

  result.clearedCount = await clearRadPrimerDownloadFolder();
  const manifest = await writeAnkiWatcherManifest(list, settings);
  result.ankiExpectedCount = manifest.copyToAnki ? manifest.expectedFiles.length : 0;

  for (const file of list) {
    const downloadId = await chrome.downloads.download({
      url: file.url,
      filename: getStagedDownloadFilename(file.filename),
      conflictAction: "overwrite",
      saveAs: false
    });
    await waitForDownloadComplete(downloadId);
    result.count += 1;
    await sleep(100);
  }

  return result;
}

function describeImageDownloadResult(result) {
  const pieces = [
    `Downloaded ${result.count || 0} image file(s) to Downloads\\${IMAGE_DOWNLOAD_SUBFOLDER}.`
  ];
  if (result.clearedCount) {
    pieces.push(`Cleared ${result.clearedCount} previous staged file(s).`);
  }
  if (result.ankiWatcherRequested) {
    pieces.push(`Anki watcher enabled for ${result.ankiExpectedCount || result.count || 0} image file(s).`);
  }
  return pieces.join(" ");
}

function getImageOnlySettings(settings) {
  const imageSettings = {
    ...settings,
    downloadImages: true,
    openChatGPT: false,
    autoSubmitChatGPT: false,
    autoSendToSpeechify: false,
    speechifyAutoSave: false
  };

  const include = String(imageSettings.include || "").trim().toLowerCase();
  if (!include || include === "none") imageSettings.include = "all";
  if (!imageSettings.downloadPlain && !imageSettings.downloadAnnotated) {
    imageSettings.downloadPlain = true;
    imageSettings.downloadAnnotated = true;
  }

  return imageSettings;
}

async function installChatGptDraftQuotaGuard(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      const guardKey = "__radprimerConversationDraftQuotaGuard";
      if (window[guardKey]) return;
      window[guardKey] = true;

      try {
        localStorage.removeItem("oai/apps/conversationDrafts");
      } catch {}

      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function patchedSetItem(key, value) {
        const keyText = String(key || "");
        const isChatGptDraft =
          keyText === "oai/apps/conversationDrafts" ||
          keyText.includes("conversationDrafts");

        if (isChatGptDraft) {
          try {
            return originalSetItem.call(this, key, value);
          } catch (error) {
            if (
              error?.name === "QuotaExceededError" ||
              String(error?.message || "").includes("quota")
            ) {
              console.warn(
                "[RadPrimer Runner] Suppressed ChatGPT draft localStorage quota error for long automated prompt."
              );
              return;
            }
            throw error;
          }
        }

        return originalSetItem.call(this, key, value);
      };
    }
  });
}

function makeSpeechifyTitleFromText(text) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  let title = lines[0] || "ChatGPT Lecture";
  title = title.replace(/^#+\s*/, "").replace(/^Title:\s*/i, "").trim();
  if (title.length > 100) title = title.slice(0, 100).trim();
  return title || "ChatGPT Lecture";
}

function buildSpeechifyTitle(articleTitle, text) {
  if (articleTitle?.trim()) return articleTitle.trim().slice(0, 100);
  return makeSpeechifyTitleFromText(text);
}

function buildSpeechifyPayload(settings, articleTitle) {
  if (
    !settings.autoSendToSpeechify ||
    !settings.autoSubmitChatGPT ||
    !isNarrativeSpeechifyMode(settings)
  ) {
    return null;
  }

  return {
    title: buildSpeechifyTitle(articleTitle, ""),
    folder: {
      name: settings.speechifyFolderName || "",
      id: settings.speechifyFolderId || DEFAULTS.speechifyFolderId,
      parentChain: settings.speechifyFolderChain || DEFAULTS.speechifyFolderChain
    },
    autoSave: settings.speechifyAutoSave !== false
  };
}

function buildChatGptComposerText(settings, packageText) {
  const instruction = settings.chatgptInstruction || DEFAULTS.chatgptInstruction;
  return `${instruction}\n\n${packageText}`;
}

async function openChatGptAndStart(settings, packageText, articleTitle, options = {}) {
  const url = settings.chatgptUrl || DEFAULTS.chatgptUrl;
  if (!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(url)) {
    throw new Error("ChatGPT URL must start with https://chatgpt.com/ or https://chat.openai.com/");
  }

  const composerText = buildChatGptComposerText(settings, packageText);
  const tab = await chrome.tabs.create({ url, active: false });

  await waitForTabComplete(tab.id, 45000, "ChatGPT");
  await installChatGptDraftQuotaGuard(tab.id);
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["chatgpt-paster.js"]
  });

  const response = await sendTabMessage(tab.id, {
    type: "CHATGPT_FILL_COMPOSER",
    text: composerText,
    autoSubmit: Boolean(settings.autoSubmitChatGPT),
    waitForResult: Boolean(
      options.waitForResult ?? (settings.autoSubmitChatGPT && isNarrativeSpeechifyMode(settings))
    ),
    timeoutMs: Math.max(30, parseInt(settings.chatgptTimeoutSec || "900", 10) || 900) * 1000,
    speechify: options.speechify === undefined ? buildSpeechifyPayload(settings, articleTitle) : options.speechify,
    backgroundRun: options.backgroundRun !== false,
    preserveAuditBlock: Boolean(options.preserveAuditBlock),
    completionMessageType: options.completionMessageType,
    completionPayload: options.completionPayload || null
  });

  if (!response?.ok) throw new Error(response?.error || "Could not start ChatGPT workflow.");
  return response;
}

function isNonNarrativeMode(settings) {
  return Boolean(settings) && !isNarrativeSpeechifyMode(settings);
}

function parseCaseMapGroups(value) {
  return String(value || "")
    .split(";")
    .map((group) =>
      group
        .split(/[,\s]+/)
        .map((n) => parseInt(n, 10))
        .filter((n) => Number.isFinite(n))
    )
    .filter((group) => group.length >= 2);
}

function shouldRunGroupingPreflight(settings) {
  if (!settings?.autoGroupNonNarrative) return false;
  if (!settings.openChatGPT || !settings.autoSubmitChatGPT) return false;
  if (!isNonNarrativeMode(settings)) return false;
  if (settings.engine === "normal" && settings.mode === "no_pictures") return false;
  if (String(settings.include || "").trim().toLowerCase() === "none") return false;
  return parseCaseMapGroups(settings.caseMap).length === 0;
}

function parseNumberArray(raw) {
  return String(raw || "")
    .match(/\d+/g)
    ?.map((n) => parseInt(n, 10))
    .filter((n) => Number.isFinite(n)) || [];
}

function parseGroupingAudit(text) {
  const value = String(text || "");
  const includeMatch = value.match(/INCLUDE\s*=\s*\[([\s\S]*?)\]/i);
  if (!includeMatch) throw new Error("Grouping result did not include an INCLUDE array.");

  const include = parseNumberArray(includeMatch[1]);
  if (!include.length) throw new Error("Grouping INCLUDE array was empty.");

  const caseStart = value.search(/CASE_MAP\s*=/i);
  let caseMap = [];
  if (caseStart >= 0) {
    const afterCase = value.slice(caseStart);
    const outerStart = afterCase.indexOf("[");
    if (outerStart >= 0) {
      let depth = 0;
      let outerEnd = -1;
      for (let i = outerStart; i < afterCase.length; i += 1) {
        const ch = afterCase[i];
        if (ch === "[") depth += 1;
        if (ch === "]") {
          depth -= 1;
          if (depth === 0) {
            outerEnd = i;
            break;
          }
        }
      }
      const rawCaseMap = outerEnd >= 0 ? afterCase.slice(outerStart, outerEnd + 1) : "";
      const groupMatches = rawCaseMap.match(/\[[^\[\]]+\]/g) || [];
      caseMap = groupMatches.map(parseNumberArray).filter((group) => group.length >= 2);
    }
  }

  const includeText = include.join(",");
  const caseMapText = caseMap.map((group) => group.join(",")).join("; ");

  return {
    include,
    caseMap,
    includeText,
    caseMapText
  };
}

async function savePendingGroupingRun(pendingId, payload) {
  await chrome.storage.local.set({ [`${PENDING_GROUPING_PREFIX}${pendingId}`]: payload });
}

async function takePendingGroupingRun(pendingId) {
  const key = `${PENDING_GROUPING_PREFIX}${pendingId}`;
  const stored = await chrome.storage.local.get(key);
  return stored[key] || null;
}

async function clearPendingGroupingRun(pendingId) {
  await chrome.storage.local.remove(`${PENDING_GROUPING_PREFIX}${pendingId}`);
}

async function runFinalCardModeAfterGrouping(pending, groupingText) {
  const grouping = parseGroupingAudit(groupingText);
  const settings = {
    ...pending.settings,
    include: grouping.includeText,
    caseMap: grouping.caseMapText,
    autoSendToSpeechify: false
  };

  await chrome.storage.local.set({ radprimerRunnerSettings: settings });

  const radPrimerTabId = pending.radPrimerTabId;
  await sendPageStatus(
    radPrimerTabId,
    "Grouping",
    `Applied grouping: INCLUDE = [${grouping.includeText}] | CASE_MAP = ${grouping.caseMapText || "[]"}.`
  );

  await chrome.tabs.update(radPrimerTabId, { active: true });
  const radPrimerTab = await chrome.tabs.get(radPrimerTabId);
  if (radPrimerTab?.windowId) await chrome.windows.update(radPrimerTab.windowId, { focused: true });

  const promptText = await loadPrompt(settings.engine, settings.mode);
  await sendPageStatus(radPrimerTabId, "Extracting", "Rebuilding final prompt package with grouped images...");
  const extraction = await extractRadPrimerArticle(radPrimerTabId, settings, promptText);

  if (settings.downloadImages && extraction.downloadFiles?.length) {
    await sendPageStatus(radPrimerTabId, "Images", "Downloading grouped image files...");
    const result = await downloadSelectedImages(extraction.downloadFiles, settings);
    await sendPageStatus(radPrimerTabId, "Images", describeImageDownloadResult(result));
  }

  await sendPageStatus(radPrimerTabId, "ChatGPT", "Opening ChatGPT with the final card prompt...");
  await openChatGptAndStart(settings, extraction.output, extraction.meta?.title || "", {
    waitForResult: false,
    speechify: null
  });

  await sendPageStatus(radPrimerTabId, "Sent", "Grouped card-mode prompt sent to ChatGPT.", {
    done: true
  });
}

async function runRadPrimerFromPage(tab) {
  if (!tab?.id || !/^https:\/\/app\.radprimer\.com\//.test(tab.url || "")) {
    throw new Error("Open a RadPrimer article page first.");
  }

  await sendPageStatus(tab.id, "Loading", "Loading saved runner settings...");
  const settings = await loadRunnerSettings();

  await sendPageStatus(tab.id, "Prompt", `Loading ${settings.engine}/${settings.mode} prompt...`);
  const promptText = await loadPrompt(settings.engine, settings.mode);

  await sendPageStatus(tab.id, "Extracting", "Extracting article and image captions...");
  const extraction = await extractRadPrimerArticle(tab.id, settings, promptText);

  if (settings.downloadImages && extraction.downloadFiles?.length) {
    await sendPageStatus(tab.id, "Images", "Downloading selected image files...");
    const result = await downloadSelectedImages(extraction.downloadFiles, settings);
    await sendPageStatus(tab.id, "Images", describeImageDownloadResult(result));
  }

  if (!settings.openChatGPT) {
    await sendPageStatus(
      tab.id,
      "Done",
      "Extraction complete. ChatGPT opening is disabled in saved settings.",
      { done: true }
    );
    return {
      message: "Extraction complete. ChatGPT opening is disabled in saved settings."
    };
  }

  if (shouldRunGroupingPreflight(settings) && extraction.meta?.totalImagesOnPage > 1) {
    await sendPageStatus(
      tab.id,
      "Grouping",
      "Running image-grouping preflight before the card prompt..."
    );

    const groupingPromptText = await loadGroupingPreflightPrompt();
    const groupingSettings = {
      ...settings,
      mode: "grouping_preflight",
      promptText: groupingPromptText,
      include: settings.include || "all",
      caseMap: "",
      downloadImages: false,
      autoSendToSpeechify: false
    };
    const groupingExtraction = await extractRadPrimerArticle(tab.id, groupingSettings, groupingPromptText);
    const pendingId = crypto.randomUUID();
    await savePendingGroupingRun(pendingId, {
      radPrimerTabId: tab.id,
      settings,
      articleTitle: extraction.meta?.title || "",
      createdAt: Date.now()
    });

    await openChatGptAndStart(
      {
        ...settings,
        autoSubmitChatGPT: true,
        autoSendToSpeechify: false
      },
      groupingExtraction.output,
      groupingExtraction.meta?.title || "",
      {
        waitForResult: true,
        speechify: null,
        preserveAuditBlock: true,
        completionMessageType: "RADPRIMER_GROUPING_PREFLIGHT_DONE",
        completionPayload: { pendingId, radPrimerTabId: tab.id }
      }
    );

    await sendPageStatus(
      tab.id,
      "Grouping",
      "Grouping preflight sent to ChatGPT. The final card prompt will run automatically after the grouping result is captured.",
      { done: true }
    );

    return {
      message:
        "Grouping preflight sent to ChatGPT. The final card prompt will run automatically after the grouping result is captured."
    };
  }

  const willWaitForNarrative = settings.autoSubmitChatGPT && isNarrativeSpeechifyMode(settings);
  await sendPageStatus(
    tab.id,
    "ChatGPT",
    willWaitForNarrative
      ? "Opening ChatGPT and starting the narrative job..."
      : "Opening ChatGPT, focusing it, and sending the prompt..."
  );
  await openChatGptAndStart(settings, extraction.output, extraction.meta?.title || "");
  await sendPageStatus(
    tab.id,
    "Sent",
    willWaitForNarrative
      ? "Sent to ChatGPT. The ChatGPT tab will capture the narrative and send it to Speechify if enabled."
      : "Sent to ChatGPT. This mode stops after submission.",
    { done: true }
  );

  return {
    message: willWaitForNarrative
      ? "Sent to ChatGPT. The ChatGPT tab will capture the narrative and send it to Speechify if enabled."
      : "Sent to ChatGPT. This mode stops after submission."
  };
}

async function runRadPrimerImageDownloadOnly(tab) {
  if (!tab?.id || !/^https:\/\/app\.radprimer\.com\//.test(tab.url || "")) {
    throw new Error("Open a RadPrimer article page first.");
  }

  await sendPageStatus(tab.id, "Images", "Preparing image-only download...");
  const settings = getImageOnlySettings(await loadRunnerSettings());
  const promptText = await loadPrompt(settings.engine, settings.mode);

  await sendPageStatus(tab.id, "Extracting", "Extracting selected image list...");
  const extraction = await extractRadPrimerArticle(tab.id, settings, promptText);

  if (!extraction.downloadFiles?.length) {
    const message = "No image files were selected for download.";
    await sendPageStatus(tab.id, "Images", message, { done: true });
    return { message, meta: extraction.meta || null };
  }

  await sendPageStatus(tab.id, "Images", "Downloading images only...");
  const result = await downloadSelectedImages(extraction.downloadFiles, settings);
  const message = describeImageDownloadResult(result);
  await sendPageStatus(tab.id, "Done", message, { done: true });

  return {
    message,
    meta: extraction.meta || null,
    download: result
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "DOWNLOAD_IMAGES") {
    (async () => {
      const files = Array.isArray(message.files) ? message.files : [];
      const settings = { ...DEFAULTS, ...(message.settings || {}) };
      const result = await downloadSelectedImages(files, settings);
      sendResponse({ ok: true, ...result });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "CREATE_SPEECHIFY_LECTURE") {
    (async () => {
      const result = await createSpeechifyLectureFromChatGPT(message.payload || {});
      sendResponse({ ok: true, result });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "ACTIVATE_SENDER_TAB") {
    (async () => {
      const tabId = _sender?.tab?.id;
      const windowId = _sender?.tab?.windowId;
      if (!tabId) throw new Error("No sender tab available to activate.");
      await chrome.tabs.update(tabId, { active: true });
      if (windowId) await chrome.windows.update(windowId, { focused: true });
      sendResponse({ ok: true });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "RUN_RADPRIMER_FROM_PAGE") {
    (async () => {
      const tab = _sender?.tab;
      const result = await runRadPrimerFromPage(tab);
      sendResponse({ ok: true, ...result });
    })().catch(async (error) => {
      const tabId = _sender?.tab?.id;
      if (tabId) {
        await sendPageStatus(tabId, "Error", String(error?.message || error), {
          error: true
        });
      }
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "RUN_RADPRIMER_FROM_TAB_ID") {
    (async () => {
      const tabId = message.tabId;
      if (!tabId) throw new Error("No RadPrimer tab id was provided.");
      const tab = await chrome.tabs.get(tabId);
      const result = await runRadPrimerFromPage(tab);
      sendResponse({ ok: true, ...result });
    })().catch(async (error) => {
      const tabId = message.tabId;
      if (tabId) {
        await sendPageStatus(tabId, "Error", String(error?.message || error), {
          error: true
        });
      }
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "RUN_RADPRIMER_IMAGE_DOWNLOAD_ONLY") {
    (async () => {
      const tab =
        message.tabId ? await chrome.tabs.get(message.tabId) : _sender?.tab;
      const result = await runRadPrimerImageDownloadOnly(tab);
      sendResponse({ ok: true, ...result });
    })().catch(async (error) => {
      const tabId = message.tabId || _sender?.tab?.id;
      if (tabId) {
        await sendPageStatus(tabId, "Image Error", String(error?.message || error), {
          error: true
        });
      }
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "RADPRIMER_GROUPING_PREFLIGHT_DONE") {
    (async () => {
      const pendingId = message.completionPayload?.pendingId;
      if (!pendingId) throw new Error("Missing grouping preflight pending id.");
      const pending = await takePendingGroupingRun(pendingId);
      if (!pending) throw new Error("Could not find pending RadPrimer grouping run.");
      await runFinalCardModeAfterGrouping(pending, message.result?.assistantText || "");
      await clearPendingGroupingRun(pendingId);
      sendResponse({ ok: true });
    })().catch(async (error) => {
      const tabId = message.completionPayload?.radPrimerTabId;
      if (tabId) {
        await sendPageStatus(tabId, "Grouping Error", String(error?.message || error), {
          error: true
        });
      }
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  return false;
});
