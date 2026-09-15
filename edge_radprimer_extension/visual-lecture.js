/* Extension page: local image persistence and UI, no remote rendering service. */
(async function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const store = VisualLectureStore;
  const id = new URL(location.href).searchParams.get("lesson");
  let lesson, patternId = "", caseId = "", follow = true, player = null, currentImage = "";
  let lastVersion = 0, polling = false, caching = false, cacheAttempted = false;
  let copyingLecture = false;
  let cardReview = null, reviewSaving = 0, cardPreparing = false;
  const pendingCardImages = new Set(), cardSaveErrors = new Map();
  let shortcuts;
  let viewerFollowCue = "";
  const urls = new Map(), failed = new Map();
  const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
  const showError = error => { $("error").textContent = error.message || String(error); $("error").hidden = false; };
  const request = async payload => {
    const response = await chrome.runtime.sendMessage({ ...payload, id });
    if (!response?.ok) throw new Error(response?.error || "The extension could not complete this step.");
    return response.result;
  };
  const phases = { preparing: "Preparing", organizing: "Building map", "map-ready": "Map ready", narrating: "Map ready · lecture preparing", "text-ready": "Narration ready", "saving-audio": "Saving in Speechify", ready: "Ready to study", error: "Step needs attention", "audio-error": "Map & text saved" };
  function safeSourceURL(value) {
    try { const url = new URL(value); return url.protocol === "https:" ? url.href : ""; } catch { return ""; }
  }
  function caption(raw) {
    const parsed = new DOMParser().parseFromString(String(raw || ""), "text/html");
    const target = el("div");
    function walk(source, dest) {
      for (const node of source.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) { dest.append(document.createTextNode(node.textContent)); continue; }
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.tagName === "IMG") {
          const name = (node.getAttribute("src") || "").split("/").pop();
          if (/^arrow_[A-Za-z0-9]+\.png$/.test(name)) {
            const icon = el("img"); icon.src = `assets/caption-icons/${name}`; icon.alt = VisualLecture.arrowLabel(name.slice(6, -4)) || "Source callout"; icon.title = icon.alt;
            icon.onerror = () => icon.replaceWith(el("span", `[${name} unavailable]`, "caption-icon-missing"));
            dest.append(icon);
          }
        } else if (["STRONG", "B", "EM", "I", "SUB", "SUP", "BR", "SPAN", "P"].includes(node.tagName)) {
          const child = el(node.tagName.toLowerCase()); walk(node, child); dest.append(child);
        } else if (!["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(node.tagName)) walk(node, dest);
      }
    }
    walk(parsed.body, target);
    return target;
  }
  const imageEntry = imageId => lesson.registry.find(image => image.masterImageId === imageId);
  function imageCardRole(imageId) {
    const image = imageEntry(imageId);
    const role = image?.teachingRole || lesson.sourceMetadata?.masterSource?.manifest?.sources?.find(s => s.id === image?.sourceArticleId)?.teachingRole;
    return ["normal", "pathology", "mixed"].includes(role) ? role : TeachingFramework.recommend(lesson).engine;
  }
  async function saveCardChoice(imageId, patch) {
    const group = LectureCardReview.groupFor(lesson, imageId);
    if (group.some(id => pendingCardImages.has(id))) return;
    group.forEach(id => { pendingCardImages.add(id); cardSaveErrors.delete(id); });
    reviewSaving++; drawCardSummary(); viewer.refreshCardState();
    for (const box of document.querySelectorAll(".card-choice[data-image]")) {
      if (pendingCardImages.has(box.dataset.image)) for (const control of box.querySelectorAll("select, input")) control.disabled = true;
    }
    try {
      const saved = await store.updateReview(lesson, imageId, { role: cardReview?.images?.[imageId]?.role || imageCardRole(imageId), ...patch });
      if (!cardReview || saved.revision >= cardReview.revision) cardReview = saved;
      $("card-review-status").textContent = `Choice saved${group.length > 1 ? " for the linked image group" : ""}. Prepare the selection again if you changed a previously prepared set.`;
    } catch (error) {
      group.forEach(id => cardSaveErrors.set(id, error.message || String(error)));
      showError(error);
    } finally {
      group.forEach(id => pendingCardImages.delete(id));
      reviewSaving--; refreshCardChoices();
    }
  }
  function cardChoice(imageId, compact = false) {
    const box = el("div", undefined, "card-choice");
    const selected = cardReview?.images?.[imageId] || { decision: "later", role: imageCardRole(imageId), objective: "" };
    const decision = el("select"), role = el("select");
    decision.setAttribute("aria-label", "Card use for " + imageId);
    role.setAttribute("aria-label", "Card framework for " + imageId);
    for (const [value, text] of [["lecture", "Not selected for cards"], ["cards", "Selected for cards"]]) { const option = el("option", text); option.value = value; decision.append(option); }
    for (const [value, text] of [["normal", "Anatomy"], ["pathology", "Pathology"], ["mixed", "Both"]]) { const option = el("option", text); option.value = value; role.append(option); }
    // Both legacy unselected states remain readable without rewriting saved reviews.
    decision.value = selected.decision === "cards" ? "cards" : "lecture"; role.value = selected.role;
    box.dataset.decision = selected.decision;
    box.dataset.image = imageId;
    decision.disabled = role.disabled = pendingCardImages.has(imageId);
    const save = patch => saveCardChoice(imageId, { role: role.value, ...patch });
    decision.onchange = () => save({ decision: decision.value });
    role.onchange = () => save({ role: role.value });
    box.append(decision, role);
    if (!compact) {
      const objective = el("input"); objective.type = "text"; objective.placeholder = "Optional: what should this image teach?";
      objective.setAttribute("aria-label", "Learning objective for " + imageId); objective.maxLength = 1000; objective.value = selected.objective || "";
      objective.disabled = pendingCardImages.has(imageId);
      objective.onchange = () => save({ objective: objective.value }); box.append(objective);
    }
    return box;
  }
  function drawCardSummary() {
    if (!lesson) return;
    const count = LectureCardReview.summary(cardReview, lesson);
    $("card-review-counts").textContent = `${count.cards} selected for cards · ${count.lecture + count.later} not selected for cards. Plain and annotated versions count as one image.`;
    $("prepare-cards").disabled = !count.cards || !!reviewSaving || cardPreparing;
    const framework = TeachingFramework.recommend(lesson);
    $("teaching-framework").textContent = `Lecture framework: ${framework.label}. ${framework.reason || ""}`;
  }
  function drawCardList() {
    if (!$("card-review-list").open || !lesson) return;
    $("card-review-images").replaceChildren(...lesson.registry.map(image => {
      const row = el("div", undefined, "card-review-row");
      const open = el("button", `${image.sourceLabel} image ${image.sourceImageNumber}${image.required === false ? " · archive" : ""}`);
      open.onclick = () => enlarge(image.masterImageId);
      row.append(open, cardChoice(image.masterImageId)); return row;
    }));
  }
  function refreshCardChoices() {
    for (const figure of document.querySelectorAll("#images figure[data-image]")) figure.querySelector(".card-choice")?.replaceWith(cardChoice(figure.dataset.image));
    drawCardSummary(); drawCardList(); viewer.refreshCardReview();
  }
  const assetKey = (imageId, variant) => `${lesson.id}/${imageId}/${variant}`;
  function imageURL(imageId) {
    const first = $("annotated").checked ? "annotated" : "plain";
    return urls.get(assetKey(imageId, first)) || urls.get(assetKey(imageId, first === "plain" ? "annotated" : "plain")) || "";
  }
  function imageVariantLabel(imageId) {
    const first = $("annotated").checked ? "annotated" : "plain";
    return urls.has(assetKey(imageId, first)) ? "" : first === "annotated" ? " · unannotated view" : " · annotated view";
  }
  const viewer = createVisualLectureViewer({
    shortcutLabel: (action, text) => shortcuts ? shortcuts.label(action, text) : text,
    getImage: imageEntry,
    getImages: imageId => {
      const selected = lesson.plan?.cases.find(c => c.id === caseId)?.imageIds || lesson.plan?.patterns.find(p => p.id === patternId)?.overviewImageIds || [];
      return (selected.includes(imageId) ? selected : lesson.registry.map(i => i.masterImageId)).filter(id => imageURL(id));
    },
    getURL: (imageId, variant) => urls.get(assetKey(imageId, variant)) || "",
    hasVariant: (imageId, variant) => urls.has(assetKey(imageId, variant)),
    renderCaption: caption,
    getCardState: imageId => ({ decision: cardReview?.images?.[imageId]?.decision || "later", pending: pendingCardImages.has(imageId), error: cardSaveErrors.get(imageId), groupSize: LectureCardReview.groupFor(lesson, imageId).length }),
    onToggleCard: imageId => saveCardChoice(imageId, { decision: cardReview?.images?.[imageId]?.decision === "cards" ? "lecture" : "cards" }),
    onImageChange: imageId => $("viewer-card-choice").replaceChildren(cardChoice(imageId, true)),
    onVariant: value => { $("annotated").checked = value; drawSelection(); },
    onToggleFollow: () => $("follow").click(),
    onAudio: async action => {
      const command = action === "playPause" ? (player?.isPlaying ? "pause" : "play") : action;
      updatePlayer(await request({ type: "VISUAL_LECTURE_PLAYER", action: command }));
    },
    onError: error => { $("viewer-variant-note").textContent = error.message; }
  });
  function refreshShortcutLabels() {
    viewer.refreshShortcuts();
    for (const [button, action, label] of [["play", "playPause", "Play / pause lecture"], ["back", "back10", "Rewind ten seconds"], ["follow", "follow", "Follow lecture on / off"], ["previous", "previousCase", "Previous case"], ["next", "nextCase", "Next case"], ["overview", "overview", "Show pattern overview"]]) $(button).title = shortcuts.label(action, label);
  }
  shortcuts = createVisualLectureShortcuts({
    isViewerOpen: viewer.isOpen,
    onChange: refreshShortcutLabels,
    onAction: action => {
      if (!lesson) return;
      if (viewer.perform(action)) return;
      if (["playPause", "back10", "forward10"].includes(action)) {
        if (!lesson.narration) return;
        const command = action === "playPause" ? (player?.isPlaying ? "pause" : "play") : action;
        request({ type: "VISUAL_LECTURE_PLAYER", action: command }).then(updatePlayer).catch(showError);
      } else if (action === "openImage") {
        const ids = lesson.plan?.cases.find(c => c.id === caseId)?.imageIds || lesson.plan?.patterns.find(p => p.id === patternId)?.overviewImageIds || [];
        const target = ids.includes(currentImage) && imageURL(currentImage) ? currentImage : ids.find(imageURL);
        if (target) enlarge(target);
      } else {
        const button = { follow: "follow", previousCase: "previous", nextCase: "next", overview: "overview" }[action];
        if (button && lesson.plan) $(button).click();
      }
    }
  });
  refreshShortcutLabels();
  function enlarge(imageId) {
    viewerFollowCue = currentImage ? `${caseId}/${currentImage}` : "";
    viewer.open(imageId, $("annotated").checked);
  }
  function drawMap() {
    $("map").replaceChildren();
    for (const pattern of lesson.plan?.patterns || []) {
      const button = el("button", undefined, "pattern-card"); button.dataset.pattern = pattern.id;
      button.setAttribute("aria-pressed", String(pattern.id === patternId));
      const preview = el("span", undefined, "preview");
      for (const imageId of pattern.overviewImageIds.slice(0, 3)) {
        const url = imageURL(imageId);
        if (url) { const img = el("img"); img.src = url; img.alt = ""; preview.append(img); }
      }
      const copy = el("span", undefined, "pattern-copy");
      copy.append(el("strong", pattern.label), el("span", pattern.cue));
      button.append(preview, copy);
      button.onclick = () => { setFollow(false); patternId = pattern.id; caseId = ""; drawSelection(); };
      $("map").append(button);
    }
  }
  function renderImage(imageId, labels = {}) {
    const image = imageEntry(imageId);
    const modality = labels[imageId] || lesson.plan?.cases.find(c => c.modalityLabels?.[imageId])?.modalityLabels[imageId] || "Source image";
    const figure = el("figure"); figure.dataset.image = imageId;
    figure.classList.toggle("current", currentImage === imageId && follow);
    const top = el("div", undefined, "image-top");
    top.append(el("strong", modality), el("span", `${image.sourceLabel} image ${image.sourceImageNumber}${imageVariantLabel(imageId)}`));
    const button = el("button", undefined, "image-button"); button.setAttribute("aria-label", `Enlarge ${image.sourceLabel} image ${image.sourceImageNumber}`);
    const url = imageURL(imageId);
    if (url) { const img = el("img"); img.src = url; img.alt = `${labels[imageId] || "Radiology"}, ${image.sourceLabel} image ${image.sourceImageNumber}`; button.append(img); button.onclick = () => enlarge(imageId); }
    else { button.disabled = true; button.append(el("span", cacheAttempted ? "Image unavailable. Open the source and retry below." : "Loading original image…", "unavailable")); }
    const cap = el("figcaption"), details = el("details"); details.append(el("summary", "Original caption"), caption(image.captionHtml || image.caption)); cap.append(details);
    if (image.captionEditoriallyUpdated) cap.append(el("p", `Teaching correction: ${image.caption}`));
    figure.append(top, button, cardChoice(imageId), cap); return figure;
  }
  function drawSelection() {
    drawMap();
    const pattern = lesson.plan?.patterns.find(p => p.id === patternId);
    $("case-panel").hidden = !pattern;
    if (!pattern) return;
    $("pattern-title").textContent = pattern.label;
    const cases = lesson.plan.cases.filter(c => c.patternId === pattern.id);
    $("cases").replaceChildren();
    for (const item of cases) {
      const button = el("button", item.label); button.setAttribute("aria-current", String(item.id === caseId));
      button.onclick = () => selectCase(item.id, true); $("cases").append(button);
    }
    const item = lesson.plan.cases.find(c => c.id === caseId);
    $("relationship").textContent = item ? { "single image": "ILLUSTRATED CASE", "same patient": "SAME PATIENT · LINKED VIEWS", comparison: "VISUAL COMPARISON · PATIENT IDENTITY NOT IMPLIED" }[item.relationship] : "COMPARE THE APPEARANCES";
    $("case-title").textContent = item?.label || "Pattern overview";
    $("focus").textContent = item?.focus || pattern.cue;
    $("discriminator").textContent = item?.discriminator || "Choose a case above to inspect the relevant sequences and distinguishing features.";
    $("images").replaceChildren(...(item?.imageIds || pattern.overviewImageIds).map(imageId => renderImage(imageId, item?.modalityLabels)));
    const index = lesson.plan.lectureOrder.indexOf(caseId);
    $("case-position").textContent = index >= 0 ? `${index + 1} / ${lesson.plan.lectureOrder.length}` : "Pattern overview";
    $("previous").disabled = index <= 0;
    $("next").disabled = index === lesson.plan.lectureOrder.length - 1;
  }
  function selectCase(nextId, manual = false) {
    const item = lesson.plan?.cases.find(c => c.id === nextId);
    if (!item) return;
    if (manual) setFollow(false);
    caseId = item.id; patternId = item.patternId; drawSelection();
  }
  function setFollow(value) {
    follow = value;
    if (value) viewerFollowCue = "";
    viewer.updateFollow(value);
    $("follow").setAttribute("aria-pressed", String(follow)); $("follow").textContent = `Follow lecture: ${follow ? "on" : "off"}`;
    if (!follow) $("sync").textContent = "Browsing freely. The audio can continue; turn Follow lecture on to return to its current case.";
    for (const figure of document.querySelectorAll("figure.current")) figure.classList.remove("current");
  }
  function drawSource() {
    $("source-images").replaceChildren();
    for (const image of lesson.registry) {
      const entry = el("div", undefined, "source-entry");
      entry.append(el("strong", `${image.sourceLabel} image ${image.sourceImageNumber}${image.required === false ? " · archive" : ""}`), caption(image.caption));
      const open = el("button", "View image"); open.onclick = () => enlarge(image.masterImageId); entry.append(open);
      const url = safeSourceURL(image.sourceUrl);
      if (url) { const link = el("a", "Open source article"); link.href = url; link.target = "_blank"; link.rel = "noreferrer"; entry.append(link); }
      $("source-images").append(entry);
    }
  }
  function drawStatus() {
    $("title").textContent = lesson.title; document.title = `${lesson.title} · Visual lecture`;
    $("phase").textContent = phases[lesson.status] || lesson.status;
    $("orientation").textContent = lesson.plan?.orientation || "Your visual map will appear here first.";
    $("progress").textContent = lesson.error || ({ organizing: "ChatGPT is organizing the source images into a visual map.", narrating: lesson.pendingNarrationRevision ? "Step 1 of 2: a new lecture is being prepared from this map. Saving in Speechify follows automatically." : "The map is ready to explore. ChatGPT is explaining its cases using the complete source.", "saving-audio": "Step 2 of 2: saving the finished lecture in Speechify. You will return here automatically.", ready: "Your map and explanation are saved. Original images are kept locally as they load." }[lesson.status] || "");
    if (lesson.status === "audio-error") $("progress").textContent += " The narration is already saved here. Retry audio save continues without regenerating it.";
    $("recover-map").hidden = !!lesson.plan;
    if (lesson.status === "error" && !lesson.plan && lesson.planDraft) $("progress").textContent += " Your response is saved. Resume rechecks it before requesting a replacement.";
    if (lesson.status === "map-ready") $("progress").textContent = "Your visual map is saved and ready to explore. Resume prepares the lecture explanation from this map.";
    if (lesson.status === "narrating" && lesson.narrationProgress) $("progress").textContent = `Your map is ready to explore. Preparing explanation ${lesson.narrationProgress.nextBatch + 1} of ${lesson.narrationProgress.batches.length}; these will play as one combined lecture. Completed parts are saved.`;
    if (lesson.status === "error" && lesson.narrationProgress) $("progress").textContent = `Explanation ${lesson.narrationProgress.nextBatch + 1} of ${lesson.narrationProgress.batches.length} paused. ${lesson.narrationProgress.nextBatch} completed parts are saved. ${lesson.error || ""} Choose Resume unfinished step to retry this part.`;
    const timedOut = Date.now() - (lesson.stageStartedAt || Date.now()) > Number(lesson.settings?.chatgptTimeoutSec || 900) * 1000 + 60000;
    $("resume").hidden = !["error", "audio-error", "map-ready", "text-ready", "preparing"].includes(lesson.status) && !(timedOut && ["organizing", "narrating", "saving-audio"].includes(lesson.status));
    $("resume").textContent = lesson.speechify?.readerFormat === "structured" ? "Prepare clean audio" : lesson.status === "audio-error" ? "Retry audio save" : "Resume unfinished step";
    $("audio").disabled = !lesson.speechifyTitle;
    if (document.activeElement !== $("audio-folder")) $("audio-folder").value = lesson.settings?.speechifyFolderUrl || "";
    $("regenerate").disabled = !lesson.plan || ["organizing", "narrating", "saving-audio", "preparing"].includes(lesson.status);
    $("play").disabled = !lesson.narration;
    $("back").disabled = !lesson.narration;
    $("copy-lecture").disabled = copyingLecture || !lesson.narration?.text;
    $("copy-speechify-title").disabled = copyingLecture || !lesson.narration?.text || !lesson.speechifyTitle;
    $("narration").replaceChildren();
    for (const segment of lesson.narration?.segments || []) {
      const item = lesson.plan.cases.find(c => c.id === segment.caseId);
      $("narration").append(el("h3", item.label), el("p", segment.text));
    }
    $("lecture-history").hidden = !lesson.lectureHistory?.length;
    $("lecture-versions").replaceChildren();
    for (const version of [...(lesson.lectureHistory || [])].reverse()) {
      const entry = el("details"); entry.append(el("summary", `Lecture ${version.narrationRevision}`));
      const url = safeSourceURL(version.speechify?.readerUrl);
      if (url) { const link = el("a", "Open this version in Speechify"); link.href = url; link.target = "_blank"; link.rel = "noreferrer"; entry.append(link); }
      entry.append(el("p", version.narration.text)); $("lecture-versions").append(entry);
    }
    const chatURL = safeSourceURL(lesson.chatGptUrl);
    $("chat-link").hidden = !chatURL; if (chatURL) $("chat-link").href = chatURL;
  }
  async function cacheImages(retry = false) {
    if (caching) return;
    caching = true;
    if (retry) failed.clear();
    const ordered = [...lesson.registry].sort((a,b) => Number(a.required === false) - Number(b.required === false));
    const tasks = ordered.flatMap(image => ["annotated", "plain"].map(variant => ({ image, variant, key: assetKey(image.masterImageId, variant) })));
    let next = 0, paintTimer = null;
    const paintAvailableImages = () => {
      paintTimer = null;
      const primary = lesson.registry.filter(image => image.required !== false);
      const available = primary.filter(image => imageURL(image.masterImageId)).length;
      $("media-progress").textContent = `${available} / ${primary.length} teaching images available offline${caching ? " · loading source images…" : available < primary.length ? ". Open the source and use Retry unavailable images below to recover missing files." : "."}`;
      drawSelection(); viewer.refresh();
    };
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < tasks.length) {
        const { image, variant, key } = tasks[next++];
        if (urls.has(key) || failed.has(key)) continue;
        try {
          let asset = await store.asset(key);
          if (!asset) {
            if (!safeSourceURL(image[variant + "Url"])) continue;
            await request({ type: "VISUAL_LECTURE_CACHE_IMAGE", imageId: image.masterImageId, variant });
            asset = await store.asset(key);
            if (!asset?.blob) throw new Error("The image could not be saved. Reload the extension and this study page, then retry.");
          }
          urls.set(key, URL.createObjectURL(asset.blob));
          if (!paintTimer) paintTimer = setTimeout(paintAvailableImages, 150);
        } catch (error) { failed.set(key, error.message); }
        $("asset-status").textContent = `${urls.size} image variants saved for offline study${failed.size ? ` · ${failed.size} unavailable` : ""}.`;
      }
    }));
    caching = false; cacheAttempted = true;
    clearTimeout(paintTimer);
    paintAvailableImages();
    if (failed.size) $("asset-status").textContent += ` ${[...new Set(failed.values())].slice(0,2).join(" ")}`;
  }
  function updatePlayer(state) {
    player = state;
    viewer.updateAudio(state);
    $("play").textContent = state.isPlaying ? "Pause lecture" : "Play lecture";
    if (!lesson.pendingNarrationRevision && !["saving-audio", "narrating", "organizing"].includes(lesson.status)) {
      $("phase").textContent = state.isPlaying ? "Lecture playing" : "Speechify connected";
      $("progress").textContent = state.readerFormat === "structured" ? "Following the open reader. Choose Prepare clean audio to remove the spoken JSON formatting." : "Connected to this lecture in Speechify. Images follow here; source-page following is paused.";
    }
    if (!follow) return;
    const segment = VisualLecture.locateLiveCase(lesson.narration?.segments || [], state.liveContext);
    if (segment && caseId !== segment.caseId) {
      selectCase(segment.caseId);
      $("case-panel").style.scrollMarginTop = `${document.querySelector(".toolbar").offsetHeight + 12}px`;
      if (!viewer.isOpen()) $("case-panel").scrollIntoView({ block: "start", behavior: "smooth" });
    }
    currentImage = VisualLecture.locateLiveImage(lesson.registry, segment, state);
    for (const figure of document.querySelectorAll("figure[data-image]")) figure.classList.toggle("current", figure.dataset.image === currentImage);
    const cue = segment && currentImage ? `${segment.caseId}/${currentImage}` : "";
    if (cue && cue !== viewerFollowCue && viewer.followImage(currentImage)) viewerFollowCue = cue;
    $("sync").textContent = segment ? "Following the live reader, including enlarged images. Click any pattern or case to browse freely." : "Waiting for a recognizable reader highlight. The map stays in place.";
  }
  async function poll() {
    if (polling || document.hidden) return;
    polling = true;
    try {
      const latestReview = await store.getReview(id);
      if ((latestReview?.revision || 0) !== (cardReview?.revision || 0)) {
        cardReview = LectureCardReview.validate(latestReview, lesson); refreshCardChoices();
      }
      const saved = await store.get(id);
      if (saved && saved.updatedAt !== lastVersion) {
        lesson = saved; lastVersion = saved.updatedAt;
        drawStatus(); drawSource();
        if (!patternId && lesson.plan) patternId = lesson.plan.patterns[0].id;
        drawSelection(); void cacheImages();
        drawCardSummary(); drawCardList();
      } else if (lesson) drawResumeTimeout();
      if (lesson?.narration && lesson.speechifyTitle) {
        try { updatePlayer(await request({ type: "VISUAL_LECTURE_PLAYER", action: "state" })); }
        catch (error) {
          if (player) { player = null; viewer.updateAudio(null); drawStatus(); $("play").textContent = "Play lecture"; }
          if (follow) $("sync").textContent = `${error.message} Your map and text remain available.`;
        }
      }
    } catch (error) { showError(error); } finally { polling = false; }
  }
  function drawResumeTimeout() {
    if (["organizing", "narrating", "saving-audio"].includes(lesson.status) && Date.now() - lesson.stageStartedAt > Number(lesson.settings?.chatgptTimeoutSec || 900) * 1000 + 60000) $("resume").hidden = false;
  }
  $("follow").onclick = () => { setFollow(!follow); if (follow && player) updatePlayer(player); };
  $("overview").onclick = () => { setFollow(false); caseId = ""; drawSelection(); };
  $("annotated").onchange = () => { drawSelection(); viewer.setAnnotated($("annotated").checked); };
  $("previous").onclick = () => selectCase(lesson.plan.lectureOrder[Math.max(0, lesson.plan.lectureOrder.indexOf(caseId) - 1)], true);
  $("next").onclick = () => selectCase(lesson.plan.lectureOrder[lesson.plan.lectureOrder.indexOf(caseId) + 1], true);
  $("play").onclick = async () => {
    try { updatePlayer(await request({ type: "VISUAL_LECTURE_PLAYER", action: player?.isPlaying ? "pause" : "play" })); }
    catch (error) { showError(error); }
  };
  $("back").onclick = async () => { try { updatePlayer(await request({ type: "VISUAL_LECTURE_PLAYER", action: "back10" })); } catch (error) { showError(error); } };
  $("audio").onclick = async () => { try { await request({ type: "VISUAL_LECTURE_PLAYER", action: "focus" }); } catch (error) { showError(error); } };
  $("save-audio-folder").onclick = async () => {
    $("save-audio-folder").disabled = true;
    try {
      await request({ type: "VISUAL_LECTURE_SET_AUDIO_FOLDER", folderUrl: $("audio-folder").value });
      await poll(); $("folder-status").textContent = "Destination saved for this lecture.";
    } catch (error) { $("folder-status").textContent = error.message; }
    finally { $("save-audio-folder").disabled = false; }
  };
  $("resume").onclick = async () => {
    $("resume").disabled = true; $("error").hidden = true;
    try { await request({ type: "VISUAL_LECTURE_RESUME" }); await poll(); } catch (error) { showError(error); } finally { $("resume").disabled = false; }
  };
  $("plan-response-file").onchange = async event => {
    try {
      const file = event.target.files[0];
      if (file) $("plan-response").value = await file.text();
    } catch (error) { $("plan-response-status").textContent = error.message; }
  };
  $("recover-plan-response").onclick = async () => {
    $("recover-plan-response").disabled = true;
    $("plan-response-status").textContent = "Checking this response against the saved source and image list…";
    try {
      const result = await request({ type: "VISUAL_LECTURE_IMPORT_PLAN_RESPONSE", text: $("plan-response").value });
      await poll();
      $("progress").textContent = `Recovered ${result.cases} cases covering ${result.images} images. Explore the map now, or choose Resume unfinished step to prepare the lecture.`;
    } catch (error) { $("plan-response-status").textContent = error.message; }
    finally { $("recover-plan-response").disabled = false; }
  };
  $("regenerate").onclick = async () => {
    $("regenerate").disabled = true; $("error").hidden = true;
    try { await request({ type: "VISUAL_LECTURE_REGENERATE_NARRATION" }); await poll(); }
    catch (error) { showError(error); drawStatus(); }
  };
  $("retry-images").onclick = () => cacheImages(true);
  $("card-review-list").ontoggle = drawCardList;
  $("prepare-cards").onclick = async () => {
    cardPreparing = true; drawCardSummary();
    try {
      const result = await request({ type: "VISUAL_LECTURE_PREPARE_CARDS" });
      $("card-review-status").textContent = `Prepared ${result.selectedCount} images. Card framework: ${result.teachingFramework.label}. In the extension popup, run Build cards with images using the active reviewed source. The card run will check your current Anki bank. Nothing has been generated yet.`;
    } catch (error) { $("card-review-status").textContent = error.message; }
    finally { cardPreparing = false; drawCardSummary(); }
  };
  async function copyLecturePart(part) {
    copyingLecture = true; $("copy-lecture").disabled = true; $("copy-speechify-title").disabled = true;
    const titleOnly = part === "title";
    $("copy-status").hidden = false; $("copy-status").textContent = titleOnly ? "Copying Speechify title…" : "Copying lecture text…";
    let saved;
    try {
      saved = await store.get(id);
      if (!saved?.narration?.text || (titleOnly && !saved.speechifyTitle)) {
        $("copy-status").textContent = "The lecture text is not ready yet.";
        return;
      }
      await navigator.clipboard.writeText(titleOnly ? saved.speechifyTitle : saved.narration.text);
      $("copy-status").textContent = titleOnly
        ? "Title copied. Paste it into Speechify’s Title field, then use Copy lecture text for the contents."
        : `Lecture text copied. Paste it into Speechify. Name the file “${saved.speechifyTitle}” so it connects here; use Copy Speechify title to copy the name.`;
    } catch {
      $("copy-status").textContent = titleOnly && (saved || lesson)?.speechifyTitle
        ? `Could not copy automatically. Use this exact Speechify title: ${(saved || lesson).speechifyTitle}`
        : "Could not copy automatically. You can copy the text manually under Read the lecture.";
      if (!titleOnly) $("transcript").open = true;
    } finally {
      copyingLecture = false; $("copy-lecture").disabled = !lesson.narration?.text;
      $("copy-speechify-title").disabled = !lesson.narration?.text || !lesson.speechifyTitle;
    }
  }
  $("copy-lecture").onclick = () => copyLecturePart("text");
  $("copy-speechify-title").onclick = () => copyLecturePart("title");
  const dataURL = blob => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
  $("export").onclick = async () => {
    $("export").disabled = true;
    try {
      const assets = {};
      for (const image of lesson.registry) for (const variant of ["plain", "annotated"]) {
        const key = assetKey(image.masterImageId, variant), asset = await store.asset(key);
        if (asset) assets[key] = await dataURL(asset.blob);
      }
      const portable = { format: "radiology-visual-lecture", version: 1, cardReview: await store.getReview(id), lesson: { ...lesson, settings: undefined, token: undefined, sourceTabId: undefined }, assets };
      const url = URL.createObjectURL(new Blob([JSON.stringify(portable)], { type: "application/json" }));
      const link = el("a"); link.href = url; link.download = `${lesson.title.replace(/[^a-z0-9-]+/gi, "_")}_visual_lecture.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) { showError(error); } finally { $("export").disabled = false; }
  };
  $("import").onchange = async event => {
    try {
      const file = event.target.files[0]; if (!file) return;
      const value = JSON.parse(await file.text());
      if (value.format !== "radiology-visual-lecture" || value.version !== 1 || !Array.isArray(value.lesson?.registry)) throw new Error("Choose a saved visual lecture copy.");
      const imported = value.lesson;
      if (!/^vl-[a-f0-9]+$/.test(imported.id)) throw new Error("Invalid lesson identity.");
      if (value.cardReview) LectureCardReview.validate(value.cardReview, imported);
      if (imported.plan) VisualLecture.validatePlan(imported.plan, imported.registry, imported.sourceText);
      if (imported.narration) {
        // Exported segments include deterministic cues; restore the raw text before validating.
        imported.narration = VisualLecture.validateNarration({ schemaVersion: 1, segments: imported.narration.segments.map(s => ({ caseId: s.caseId, text: s.text.startsWith(s.cue + "\n\n") ? s.text.slice(s.cue.length + 2) : s.text })) }, imported.plan, imported.registry, { requireArrowCues: imported.narration.arrowCuesVersion >= 1 });
      }
      for (const [key, assetData] of Object.entries(value.assets || {})) {
        if (!key.startsWith(imported.id + "/") || !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(assetData)) continue;
        await store.putAsset(key, await (await fetch(assetData)).blob());
      }
      const settings = (await chrome.storage.local.get("radprimerRunnerSettings")).radprimerRunnerSettings || {};
      await store.put({ ...imported, settings, token: "", status: imported.narration ? "ready" : "error", error: imported.narration ? "" : "Imported draft. Resume to finish generation." });
      if (value.cardReview) await store.putReview(value.cardReview);
      location.href = `visual-lecture.html?lesson=${encodeURIComponent(imported.id)}`;
    } catch (error) { showError(error); }
  };
  if (!id) {
    $("library").hidden = false;
    const lessons = await store.list();
    if (!lessons.length) $("lessons").append(el("p", "No saved lectures yet. Choose Generate visual lecture in the article runner."));
    for (const item of lessons) {
      const link = el("a", undefined, "lesson-link"); link.href = `visual-lecture.html?lesson=${encodeURIComponent(item.id)}`;
      link.append(el("strong", item.title), el("span", `${phases[item.status] || item.status} · ${new Date(item.updatedAt).toLocaleDateString()}`)); $("lessons").append(link);
    }
    return;
  }
  lesson = await store.get(id);
  if (!lesson) { showError(new Error("This lecture is not in the local library. Open Visual lectures or import its saved copy.")); return; }
  cardReview = LectureCardReview.validate(await store.getReview(id), lesson);
  $("study").hidden = false;
  await poll();
  setInterval(poll, 1500);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void poll(); });
})().catch(error => { document.getElementById("error").hidden = false; document.getElementById("error").textContent = error.message; });
