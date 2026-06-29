const WORKFLOW_MODE_OPTIONS = [
  ["io_queue", "Build IO queue"],
  ["no_pictures", "Build cards without images"],
  ["chatgpt_cards", "Build cards with images"],
  ["narrative", "Narrative mode"]
];

const MODE_OPTIONS = {
  pathology: WORKFLOW_MODE_OPTIONS,
  normal: WORKFLOW_MODE_OPTIONS
};

const PROMPT_FILES = {
  pathology: {
    chatgpt_cards: "prompts/pathology_chatgpt_cards.txt",
    no_pictures: "prompts/pathology_chatgpt_cards.txt",
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
  cardModeDownloadImagesDisabled: false,
  downloadPlain: true,
  downloadAnnotated: true,
  keepCaptionHtml: true,
  autoGroupNonNarrative: true,
  captureCardAuditBundle: false,
  openChatGPT: false,
  autoSubmitChatGPT: false,
  chatgptUrl: "https://chatgpt.com/g/g-p-69e5418624448191a7a74b18f607688b-pediatrics/project",
  chatgptInstruction: "make sure you do not truncate the text and read the entire message",
  chatgptTimeoutSec: "900",
  cardAuditTimeoutSec: "3600",
  createAnkiImportFile: true,
  ankiDeckMode: "auto",
  ankiPathologyRoot: "Corebook",
  ankiNormalRoot: "RadprimerNormal",
  ankiDeckRoot: "Corebook::MSK::Trauma::Introduction to Osseous Trauma",
  ankiNoteType: "core_rad_notetype_v2",
  preferRadPrimerHierarchyForStatdx: true,
  useMasterSource: false,
  sourcePairingKey: "",
  autoSendToSpeechify: true,
  speechifyAutoSave: false,
  speechifyAutoPlayAfterSave: false,
  speechifyKeepAwake: false,
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

const $ = (id) => document.getElementById(id);

const fields = [
  "engine",
  "mode",
  "include",
  "caseMap",
  "coreGap",
  "coreSection",
  "corePages",
  "sourceNote",
  "coreNote",
  "downloadImages",
  "downloadPlain",
  "downloadAnnotated",
  "keepCaptionHtml",
  "autoGroupNonNarrative",
  "captureCardAuditBundle",
  "openChatGPT",
  "autoSubmitChatGPT",
  "chatgptUrl",
  "chatgptInstruction",
  "chatgptTimeoutSec",
  "cardAuditTimeoutSec",
  "createAnkiImportFile",
  "ankiDeckMode",
  "ankiPathologyRoot",
  "ankiNormalRoot",
  "ankiDeckRoot",
  "ankiNoteType",
  "preferRadPrimerHierarchyForStatdx",
  "useMasterSource",
  "sourcePairingKey",
  "autoSendToSpeechify",
  "speechifyAutoSave",
  "speechifyKeepAwake",
  "speechifyFolderUrl"
];

function setStatus(text) {
  $("status").textContent = text;
}

function populateModes(engine, selectedMode) {
  const modeEl = $("mode");
  modeEl.textContent = "";
  for (const [value, label] of MODE_OPTIONS[engine]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    modeEl.appendChild(option);
  }

  modeEl.value = normalizeVisibleMode(engine, selectedMode);
}

function normalizeVisibleMode(engine, mode) {
  const allowed = MODE_OPTIONS[engine]?.map(([value]) => value) || [];
  if (allowed.includes(mode)) return mode;
  if (mode === "narrative_with_images") return "narrative";
  if (mode === "no_pictures") return "no_pictures";
  if (mode === "chatgpt_cards" || mode === "codex_cards" || mode === "captions_only") {
    return "chatgpt_cards";
  }
  return allowed.includes(DEFAULTS.mode) ? DEFAULTS.mode : allowed[0];
}

function syncPanels() {
  const engine = $("engine").value;
  $("pathologyOptions").classList.toggle("hidden", engine !== "pathology");
  $("normalOptions").classList.toggle("hidden", engine !== "normal");
}

function buildSpeechifyFolderUrl(folderId) {
  const url = new URL("https://app.speechify.com/");
  if (folderId) url.searchParams.set("folder", folderId);
  return url.toString();
}

function parseSpeechifyFolderUrl(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    return {
      url: DEFAULTS.speechifyFolderUrl,
      id: DEFAULTS.speechifyFolderId
    };
  }

  const url = new URL(raw);
  if (url.hostname !== "app.speechify.com") {
    throw new Error("Speechify folder link must start with https://app.speechify.com/");
  }

  const id = url.searchParams.get("folder") || "";
  if (!id) {
    throw new Error("Speechify folder link must include a ?folder=... value.");
  }

  return {
    url: buildSpeechifyFolderUrl(id),
    id
  };
}

function getStoredSpeechifyFolderUrl(values) {
  if (values.speechifyFolderUrl) return values.speechifyFolderUrl;
  if (values.speechifyFolderId) return buildSpeechifyFolderUrl(values.speechifyFolderId);
  return DEFAULTS.speechifyFolderUrl;
}

function isNarrativeSpeechifyMode(settings) {
  if (!settings) return false;
  if (settings.engine === "pathology") return settings.mode === "narrative";
  if (settings.engine === "normal") {
    return settings.mode === "narrative";
  }
  return false;
}

function shouldNarrativeDownloadImages(settings) {
  return settings?.engine === "normal" && settings.mode === "narrative_with_images";
}

function isIoQueueMode(settings) {
  return settings?.mode === "io_queue";
}

function isNoPictureCardMode(settings) {
  return settings?.mode === "no_pictures";
}

function isNormalNoPictureCardMode(settings) {
  return settings?.engine === "normal" && isNoPictureCardMode(settings);
}

function isNonNarrativeMode(settings) {
  return Boolean(settings) && !isNarrativeSpeechifyMode(settings) && !isIoQueueMode(settings);
}

function isCardCreationMode(settings) {
  return isNonNarrativeMode(settings);
}

function shouldCaptureCardAuditBundle(settings) {
  if (isNormalNoPictureCardMode(settings)) return true;
  return Boolean(settings?.captureCardAuditBundle) && isNonNarrativeMode(settings);
}

function currentEngineMode() {
  return {
    engine: $("engine").value || DEFAULTS.engine,
    mode: $("mode").value || DEFAULTS.mode
  };
}

async function syncSourceCompareButtons() {
  let isArticleSource = false;
  try {
    const tab = await getActiveBrowserTab();
    isArticleSource = Boolean(getArticleSourceFromUrl(tab.url || ""));
  } catch {}

  $("exportSourceCompare").hidden = !isArticleSource;
  $("buildMasterSource").hidden = !isArticleSource;
}

function syncSpeechifyAvailability() {
  const engineMode = currentEngineMode();
  const eligible = isNarrativeSpeechifyMode(engineMode);
  const forcedAudit = isNormalNoPictureCardMode(engineMode);
  const auditEligible = isNonNarrativeMode(engineMode);
  $("autoSendToSpeechify").disabled = !eligible;
  $("speechifyAutoSave").disabled = true;
  $("speechifyAutoSave").checked = false;
  $("captureCardAuditBundle").disabled = !auditEligible || forcedAudit;
  if (!eligible) {
    $("autoSendToSpeechify").checked = false;
  }
  if (forcedAudit) {
    $("captureCardAuditBundle").checked = true;
    $("openChatGPT").checked = true;
    $("autoSubmitChatGPT").checked = true;
  }
  if (!auditEligible) $("captureCardAuditBundle").checked = false;
}

function applyNarrativeModeDefaults() {
  const engineMode = currentEngineMode();
  if (!isNarrativeSpeechifyMode(engineMode)) return;

  $("include").value = "all";
  $("caseMap").value = "";
  $("openChatGPT").checked = true;
  $("autoSubmitChatGPT").checked = true;
  $("autoSendToSpeechify").checked = true;
  $("speechifyAutoSave").checked = false;
  $("downloadImages").checked = shouldNarrativeDownloadImages(engineMode);
}

function applyIoQueueModeDefaults() {
  if (!isIoQueueMode(currentEngineMode())) return;
  $("include").value = "all";
  $("caseMap").value = "";
  $("downloadImages").checked = true;
  $("downloadPlain").checked = false;
  $("downloadAnnotated").checked = true;
  $("openChatGPT").checked = false;
  $("autoSubmitChatGPT").checked = false;
  $("autoSendToSpeechify").checked = false;
  $("captureCardAuditBundle").checked = false;
}

function applyNoPictureModeDefaults() {
  if (!isNoPictureCardMode(currentEngineMode())) return;
  $("include").value = "none";
  $("caseMap").value = "";
  $("downloadImages").checked = false;
  $("downloadPlain").checked = false;
  $("downloadAnnotated").checked = false;
}

function applyCardModeDefaults(values = {}) {
  if (!isCardCreationMode(currentEngineMode())) return;
  if (isNoPictureCardMode(currentEngineMode())) {
    applyNoPictureModeDefaults();
    return;
  }
  if (values.cardModeDownloadImagesDisabled) return;
  $("downloadImages").checked = true;
  $("downloadPlain").checked = true;
  $("downloadAnnotated").checked = true;
}

function parseCaseMapGroups(value) {
  const raw = String(value || "");
  if (raw.includes("[[")) {
    return (raw.match(/\[[^\[\]]+\]/g) || [])
      .map((group) =>
        (group.match(/\d+/g) || [])
          .map((n) => parseInt(n, 10))
          .filter((n) => Number.isFinite(n))
      )
      .filter((group) => group.length >= 2);
  }

  return raw
    .split(";")
    .map((group) =>
      group
        .split(/[,\s]+/)
        .map((n) => parseInt(n, 10))
        .filter((n) => Number.isFinite(n))
    )
    .filter((group) => group.length >= 2);
}

function shouldDelegateGroupingPreflight(settings) {
  if (!settings.autoGroupNonNarrative) return false;
  if (!settings.openChatGPT || !settings.autoSubmitChatGPT) return false;
  if (isIoQueueMode(settings)) return false;
  if (isNarrativeSpeechifyMode(settings)) return false;
  if (isNoPictureCardMode(settings)) return false;
  if (String(settings.include || "").trim().toLowerCase() === "none") return false;
  return parseCaseMapGroups(settings.caseMap).length === 0;
}

function readForm() {
  const engine = $("engine").value;
  const mode = normalizeVisibleMode(engine, $("mode").value);
  const ioQueueMode = isIoQueueMode({ engine, mode });
  const noPictureMode = isNoPictureCardMode({ engine, mode });
  const normalNoPictureMode = isNormalNoPictureCardMode({ engine, mode });
  const speechifyEligible = isNarrativeSpeechifyMode({ engine, mode });
  const narrativeDownloadImages = shouldNarrativeDownloadImages({ engine, mode });
  const captureCardAuditBundle =
    normalNoPictureMode || (!speechifyEligible && !ioQueueMode && Boolean($("captureCardAuditBundle").checked));
  const cardModeDownloadImagesDisabled =
    !speechifyEligible && !ioQueueMode && ($("downloadImages").checked === false || noPictureMode);
  const autoSendToSpeechify = speechifyEligible && !ioQueueMode && $("autoSendToSpeechify").checked;
  const autoSubmitChatGPT =
    !ioQueueMode && ($("autoSubmitChatGPT").checked || autoSendToSpeechify || captureCardAuditBundle);
  const openChatGPT = $("openChatGPT").checked || autoSubmitChatGPT;

  const speechifyFolder = parseSpeechifyFolderUrl($("speechifyFolderUrl").value);

  return {
    engine,
    mode,
    include: speechifyEligible || ioQueueMode ? "all" : noPictureMode ? "none" : $("include").value.trim(),
    caseMap: speechifyEligible || ioQueueMode || noPictureMode ? "" : $("caseMap").value.trim(),
    coreGap: $("coreGap").checked,
    coreSection: $("coreSection").value.trim(),
    corePages: $("corePages").value.trim(),
    sourceNote: $("sourceNote").value.trim(),
    coreNote: $("coreNote").value.trim(),
    downloadImages: ioQueueMode
      ? true
      : noPictureMode
        ? false
        : speechifyEligible
          ? narrativeDownloadImages
          : cardModeDownloadImagesDisabled
            ? false
            : $("downloadImages").checked,
    cardModeDownloadImagesDisabled: speechifyEligible || ioQueueMode ? false : cardModeDownloadImagesDisabled,
    downloadPlain: ioQueueMode || noPictureMode ? false : $("downloadPlain").checked,
    downloadAnnotated: ioQueueMode ? true : noPictureMode ? false : $("downloadAnnotated").checked,
    keepCaptionHtml: $("keepCaptionHtml").checked,
    autoGroupNonNarrative: $("autoGroupNonNarrative").checked,
    captureCardAuditBundle,
    openChatGPT: ioQueueMode ? false : speechifyEligible ? true : openChatGPT,
    autoSubmitChatGPT: ioQueueMode ? false : speechifyEligible || captureCardAuditBundle ? true : autoSubmitChatGPT,
    chatgptUrl: $("chatgptUrl").value.trim(),
    chatgptInstruction: $("chatgptInstruction").value.trim(),
    chatgptTimeoutSec: $("chatgptTimeoutSec").value.trim(),
    cardAuditTimeoutSec: $("cardAuditTimeoutSec").value.trim(),
    createAnkiImportFile: $("createAnkiImportFile").checked,
    ankiDeckMode: $("ankiDeckMode").value || DEFAULTS.ankiDeckMode,
    ankiPathologyRoot: $("ankiPathologyRoot").value.trim(),
    ankiNormalRoot: $("ankiNormalRoot").value.trim(),
    ankiDeckRoot: $("ankiDeckRoot").value.trim(),
    ankiNoteType: $("ankiNoteType").value.trim(),
    preferRadPrimerHierarchyForStatdx: $("preferRadPrimerHierarchyForStatdx").checked,
    useMasterSource: $("useMasterSource").checked,
    sourcePairingKey: $("sourcePairingKey").value.trim(),
    autoSendToSpeechify: speechifyEligible ? true : autoSendToSpeechify,
    speechifyAutoSave: false,
    speechifyAutoPlayAfterSave: false,
    speechifyKeepAwake: $("speechifyKeepAwake").checked,
    speechifyFolderUrl: speechifyFolder.url,
    speechifyFolderName: DEFAULTS.speechifyFolderName,
    speechifyFolderId: speechifyFolder.id,
    speechifyFolderChain: DEFAULTS.speechifyFolderChain,
    stripArrowTags: false,
    primarySourceLabel: "RadPrimer"
  };
}

function applyForm(values) {
  $("engine").value = values.engine || DEFAULTS.engine;
  populateModes($("engine").value, values.mode || DEFAULTS.mode);
  $("include").value = values.include ?? DEFAULTS.include;
  $("caseMap").value = values.caseMap ?? DEFAULTS.caseMap;
  $("coreGap").checked = values.coreGap ?? DEFAULTS.coreGap;
  $("coreSection").value = values.coreSection ?? DEFAULTS.coreSection;
  $("corePages").value = values.corePages ?? DEFAULTS.corePages;
  $("sourceNote").value = values.sourceNote ?? DEFAULTS.sourceNote;
  $("coreNote").value = values.coreNote ?? DEFAULTS.coreNote;
  $("downloadImages").checked = values.downloadImages ?? DEFAULTS.downloadImages;
  $("downloadPlain").checked = values.downloadPlain ?? DEFAULTS.downloadPlain;
  $("downloadAnnotated").checked = values.downloadAnnotated ?? DEFAULTS.downloadAnnotated;
  $("keepCaptionHtml").checked = values.keepCaptionHtml ?? DEFAULTS.keepCaptionHtml;
  $("autoGroupNonNarrative").checked =
    values.autoGroupNonNarrative ?? DEFAULTS.autoGroupNonNarrative;
  $("captureCardAuditBundle").checked =
    values.captureCardAuditBundle ?? DEFAULTS.captureCardAuditBundle;
  const autoSendToSpeechify = values.autoSendToSpeechify ?? DEFAULTS.autoSendToSpeechify;
  $("openChatGPT").checked =
    (values.openChatGPT ?? DEFAULTS.openChatGPT) ||
    (values.autoSubmitChatGPT ?? DEFAULTS.autoSubmitChatGPT) ||
    (values.captureCardAuditBundle ?? DEFAULTS.captureCardAuditBundle) ||
    autoSendToSpeechify;
  $("autoSubmitChatGPT").checked =
    (values.autoSubmitChatGPT ?? DEFAULTS.autoSubmitChatGPT) ||
    (values.captureCardAuditBundle ?? DEFAULTS.captureCardAuditBundle) ||
    autoSendToSpeechify;
  $("chatgptUrl").value = values.chatgptUrl ?? DEFAULTS.chatgptUrl;
  $("chatgptInstruction").value = values.chatgptInstruction ?? DEFAULTS.chatgptInstruction;
  $("chatgptTimeoutSec").value = values.chatgptTimeoutSec ?? DEFAULTS.chatgptTimeoutSec;
  $("cardAuditTimeoutSec").value = values.cardAuditTimeoutSec ?? DEFAULTS.cardAuditTimeoutSec;
  $("createAnkiImportFile").checked =
    values.createAnkiImportFile ?? DEFAULTS.createAnkiImportFile;
  $("ankiDeckMode").value = values.ankiDeckMode ?? DEFAULTS.ankiDeckMode;
  $("ankiPathologyRoot").value = values.ankiPathologyRoot ?? DEFAULTS.ankiPathologyRoot;
  $("ankiNormalRoot").value = values.ankiNormalRoot ?? DEFAULTS.ankiNormalRoot;
  $("ankiDeckRoot").value = values.ankiDeckRoot ?? DEFAULTS.ankiDeckRoot;
  $("ankiNoteType").value = values.ankiNoteType ?? DEFAULTS.ankiNoteType;
  $("preferRadPrimerHierarchyForStatdx").checked =
    values.preferRadPrimerHierarchyForStatdx ?? DEFAULTS.preferRadPrimerHierarchyForStatdx;
  $("useMasterSource").checked = values.useMasterSource ?? DEFAULTS.useMasterSource;
  $("sourcePairingKey").value = values.sourcePairingKey ?? DEFAULTS.sourcePairingKey;
  $("autoSendToSpeechify").checked = autoSendToSpeechify;
  $("speechifyAutoSave").checked = values.speechifyAutoSave ?? DEFAULTS.speechifyAutoSave;
  $("speechifyKeepAwake").checked = values.speechifyKeepAwake ?? DEFAULTS.speechifyKeepAwake;
  $("speechifyFolderUrl").value = getStoredSpeechifyFolderUrl(values);
  syncPanels();
  applyNarrativeModeDefaults();
  applyIoQueueModeDefaults();
  applyNoPictureModeDefaults();
  applyCardModeDefaults(values);
  syncSpeechifyAvailability();
}

async function saveForm() {
  await chrome.storage.local.set({ radprimerRunnerSettings: readForm() });
}

async function loadPrompt(engine, mode) {
  const file = PROMPT_FILES[engine]?.[mode];
  if (!file) throw new Error(`No packaged prompt for ${engine}/${mode}`);
  const response = await fetch(chrome.runtime.getURL(file));
  if (!response.ok) throw new Error(`Could not load ${file}`);
  return response.text();
}

function getArticleSourceFromUrl(url) {
  const raw = String(url || "");
  if (/^https:\/\/app\.radprimer\.com\//.test(raw)) {
    return { kind: "radprimer", label: "RadPrimer", extractorFile: "content-extractor.js" };
  }
  if (/^https:\/\/app\.statdx\.com\//.test(raw)) {
    return { kind: "statdx", label: "STATdx", extractorFile: "statdx-content-extractor.js" };
  }
  return null;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found.");
  if (!getArticleSourceFromUrl(tab.url)) {
    throw new Error("Open a RadPrimer or STATdx article page first.");
  }
  return tab;
}

async function getActiveBrowserTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found.");
  return tab;
}

async function ensureContentScript(tabId) {
  const tab = await chrome.tabs.get(tabId);
  const source = getArticleSourceFromUrl(tab.url);
  if (!source) throw new Error("Open a RadPrimer or STATdx article page first.");
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [source.extractorFile]
  });
  return source;
}

function sendExtractMessage(tabId, config) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "RADPRIMER_EXTRACT", config }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

function sendDownloadMessage(files, settings) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "DOWNLOAD_IMAGES", files, settings, delayMs: 250 }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

function sendRunFromTabMessage(tabId) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "RUN_RADPRIMER_FROM_TAB_ID", tabId }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

function sendImageDownloadOnlyMessage(tabId) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "RUN_RADPRIMER_IMAGE_DOWNLOAD_ONLY", tabId }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

function sendIoQueueMessage(tabId) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "RUN_RADPRIMER_IO_QUEUE", tabId }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

function sendImportMasterSourceMessage(files) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "IMPORT_MASTER_SOURCE_CACHE", files }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

function sendGetMasterSourceMessage() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "GET_MASTER_SOURCE_CACHE" }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error(`Could not read ${file?.name || "file"}.`));
    reader.readAsText(file);
  });
}

async function readMasterSourceFileInput() {
  const input = $("masterSourceFiles");
  const files = Array.from(input?.files || []);
  if (!files.length) throw new Error("Choose master_source_import.json or the master source files first.");
  return Promise.all(
    files.map(async (file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      text: await readFileAsText(file)
    }))
  );
}

function sendRecoverCardAuditTsvMessage(tabId) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "RECOVER_CARD_AUDIT_TSV_FROM_CHATGPT_TAB", tabId }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

function sendExportAuditSourceMessage(tabId) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "EXPORT_RADPRIMER_AUDIT_SOURCE_ONLY", tabId }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

function sendExportSourceCompareMessage(tabId) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "EXPORT_ARTICLE_SOURCE_COMPARISON", tabId }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

function sendBuildMasterSourceMessage(tabId, options = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: "BUILD_MASTER_SOURCE_FROM_ARTICLE",
      tabId,
      selectedPairingTitle: options.selectedPairingTitle || ""
    }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

function promptForMasterSourceTitleChoice(response) {
  const choices = Array.isArray(response?.titleChoices) ? response.titleChoices : [];
  if (!choices.length) return null;

  const lines = choices.map((choice, index) => (
    `${index + 1}. ${choice.sourceLabel || choice.sourceKind || "Source"}: ${choice.title || "[title not found]"}`
  ));
  const answer = window.prompt(
    [
      "RadPrimer and STATdx article titles differ.",
      "Cancel to stop the build, enter a number/title, or type a shared master-source topic.",
      "",
      ...lines
    ].join("\n"),
    "1"
  );
  if (answer === null) return null;

  const trimmed = answer.trim();
  const index = Number(trimmed);
  if (Number.isInteger(index) && index >= 1 && index <= choices.length) {
    return choices[index - 1].title || "";
  }

  const exact = choices.find((choice) => normalizeTitleForChoice(choice.title) === normalizeTitleForChoice(trimmed));
  return exact?.title || trimmed;
}

function normalizeTitleForChoice(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function waitForTabComplete(tabId) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Timed out waiting for ChatGPT tab to load."));
    }, 45000);

    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status === "complete") {
        finish();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId, (tab) => {
      if (!chrome.runtime.lastError && tab?.status === "complete") {
        finish();
      }
    });
  });
}

function sendChatGptFillMessage(tabId, text, settings, articleTitle) {
  const shouldWaitForNarrative = settings.autoSubmitChatGPT && isNarrativeSpeechifyMode(settings);
  const speechifyPayload =
    settings.autoSendToSpeechify && shouldWaitForNarrative
      ? {
          title: buildSpeechifyTitle(articleTitle, ""),
          folder: {
            name: settings.speechifyFolderName || "",
            id: settings.speechifyFolderId || DEFAULTS.speechifyFolderId,
            parentChain: settings.speechifyFolderChain || DEFAULTS.speechifyFolderChain
          },
          autoSave: settings.speechifyAutoSave === true
        }
      : null;

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      {
        type: "CHATGPT_FILL_COMPOSER",
        text,
        autoSubmit: Boolean(settings.autoSubmitChatGPT),
        waitForResult: Boolean(shouldWaitForNarrative),
        timeoutMs: Math.max(30, parseInt(settings.chatgptTimeoutSec || "900", 10) || 900) * 1000,
        speechify: speechifyPayload
      },
      (response) => {
        const err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(response);
      }
    );
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

function sendSpeechifyCreateMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "CREATE_SPEECHIFY_LECTURE", payload }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

async function createSpeechifyLecture(settings, articleTitle, text) {
  const folder = {
    name: settings.speechifyFolderName || "",
    id: settings.speechifyFolderId || DEFAULTS.speechifyFolderId,
    parentChain: settings.speechifyFolderChain || DEFAULTS.speechifyFolderChain
  };

  const response = await sendSpeechifyCreateMessage({
    title: buildSpeechifyTitle(articleTitle, text),
    text,
    folder,
    autoSave: settings.speechifyAutoSave === true
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Could not create Speechify text file.");
  }

  return response.result;
}

async function openChatGptAndFill(settings, packageText, articleTitle = "") {
  const url = settings.chatgptUrl || DEFAULTS.chatgptUrl;
  if (!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(url)) {
    throw new Error("ChatGPT URL must start with https://chatgpt.com/ or https://chat.openai.com/");
  }

  const instruction =
    settings.chatgptInstruction || DEFAULTS.chatgptInstruction;
  const composerText = `${instruction}\n\n${packageText}`;

  const tab = await chrome.tabs.create({ url, active: false });
  await waitForTabComplete(tab.id);
  await installChatGptDraftQuotaGuard(tab.id);
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["chatgpt-paster.js"]
  });

  const response = await sendChatGptFillMessage(tab.id, composerText, settings, articleTitle);

  if (!response?.ok) {
    throw new Error(response?.error || "Could not fill ChatGPT composer.");
  }

  return response;
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

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

async function run() {
  const button = $("run");
  button.disabled = true;
  try {
    const settings = readForm();
    await saveForm();
    const tab = await getActiveTab();

    if (isIoQueueMode(settings)) {
      setStatus("Building image-occlusion queue...");
      const response = await sendIoQueueMessage(tab.id);
      if (!response?.ok) throw new Error(response?.error || "IO queue build failed.");
      setStatus(response.message || "IO queue package created.");
      return;
    }

    if (settings.useMasterSource || shouldDelegateGroupingPreflight(settings) || shouldCaptureCardAuditBundle(settings)) {
      setStatus(
        settings.useMasterSource
          ? "Starting master-source run through the page runner..."
          : shouldDelegateGroupingPreflight(settings)
          ? "Starting grouping preflight through the page runner..."
          : "Starting card audit capture through the page runner..."
      );
      const delegated = await sendRunFromTabMessage(tab.id);
      if (!delegated?.ok) {
        throw new Error(delegated?.error || "Page-runner workflow failed.");
      }
      setStatus(delegated.message || "Master-source workflow started.");
      return;
    }

    setStatus("Loading packaged prompt...");
    const promptText = await loadPrompt(settings.engine, settings.mode);
    await ensureContentScript(tab.id);

    setStatus(`Extracting ${getArticleSourceFromUrl(tab.url)?.label || "article"} article...`);
    const response = await sendExtractMessage(tab.id, {
      ...settings,
      promptText,
      forceCaseLabels: settings.engine === "normal" && settings.mode === "chatgpt_cards"
    });

    if (!response?.ok) throw new Error(response?.error || "Extraction failed.");

    setStatus("Copying package to clipboard...");
    await copyText(response.output);

    let downloadLine = "Downloads disabled.";
    if (settings.downloadImages && response.downloadFiles?.length) {
      setStatus("Downloading selected images...");
      const downloadResponse = await sendDownloadMessage(response.downloadFiles, settings);
      if (!downloadResponse?.ok) throw new Error(downloadResponse?.error || "Download failed.");
      downloadLine = `Downloaded ${downloadResponse.count} file(s) to Downloads\\RadPrimer.`;
    } else if (settings.downloadImages) {
      downloadLine = "No selected image files to download.";
    }

    let chatgptLine = "ChatGPT opening disabled.";
    let speechifyLine = "Speechify disabled.";
    let imaiosLine = "IMaios chunks not checked.";
    if (settings.openChatGPT) {
      const shouldWaitForNarrative =
        settings.autoSubmitChatGPT && isNarrativeSpeechifyMode(settings);
      setStatus(
        shouldWaitForNarrative
          ? "Opening ChatGPT, submitting, and waiting for final response..."
          : settings.autoSubmitChatGPT
            ? "Opening ChatGPT and submitting prompt..."
            : "Opening ChatGPT project and filling message box..."
      );
      try {
        const fillResponse = await openChatGptAndFill(
          settings,
          response.output,
          response.meta?.title || ""
        );
        if (shouldWaitForNarrative) {
          if (fillResponse.assistantText) {
            await copyText(fillResponse.assistantText);
            chatgptLine = `Submitted and copied final ChatGPT response (${fillResponse.assistantChars} chars).`;
            if (fillResponse.imaios?.ok) {
              imaiosLine = `IMaios opened and imported ${fillResponse.imaios.result?.chunkCount || fillResponse.imaiosChunkLibrary?.chunks?.length || 0} chunks.`;
            } else if (fillResponse.imaios?.error) {
              imaiosLine = `IMaios import failed; use Copy IMaios chunks in the ChatGPT tab. ${fillResponse.imaios.error}`;
            } else {
              imaiosLine = fillResponse.imaiosChunkLibrary?.chunks?.length
                ? `IMaios chunk JSON found (${fillResponse.imaiosChunkLibrary.chunks.length} chunks). Use Copy IMaios chunks in the ChatGPT tab.`
                : "No IMaios chunk JSON found in the captured response.";
            }
            if (fillResponse.speechify?.ok) {
              speechifyLine = fillResponse.speechify.result?.autoSaved
                ? `Created Speechify file: ${fillResponse.speechify.result?.title || "untitled"}.`
                : `Filled Speechify form: ${fillResponse.speechify.result?.title || "untitled"}. Click Save File in Speechify.`;
            } else if (fillResponse.speechify?.error) {
              speechifyLine = `Speechify failed; final response remains on clipboard. ${fillResponse.speechify.error}`;
            } else if (settings.autoSendToSpeechify) {
              speechifyLine = "Speechify was requested, but no Speechify result was returned.";
            }
          } else {
            chatgptLine = "Submitted to ChatGPT, but no assistant response text was returned.";
          }
        } else if (settings.autoSubmitChatGPT) {
          chatgptLine = "Submitted to ChatGPT. This mode stops after submission.";
          if (settings.autoSendToSpeechify && !isNarrativeSpeechifyMode(settings)) {
            speechifyLine = "Speechify skipped because this is not a narrative mode.";
          }
        } else {
          chatgptLine = `Filled ChatGPT composer (${fillResponse.chars} chars). Not submitted.`;
        }
      } catch (error) {
        chatgptLine = `ChatGPT fill failed; package remains on clipboard. ${error?.message || error}`;
      }
    }

    const meta = response.meta || {};
    setStatus(
      [
        "Copied prompt package to clipboard.",
        `Title: ${meta.title || "[not found]"}`,
        `Images on page: ${meta.totalImagesOnPage ?? 0}`,
        `Selected: ${(meta.selectedImages || []).join(", ") || "none"}`,
        `Cases/groups: ${(meta.cases || []).map((g) => `[${g.join(",")}]`).join(" ") || "none"}`,
        `Characters: ${meta.outputChars || response.output.length}`,
        downloadLine,
        chatgptLine,
        imaiosLine,
        speechifyLine
      ].join("\n")
    );
  } catch (error) {
    setStatus(`Error: ${error?.message || error}`);
  } finally {
    button.disabled = false;
  }
}

async function checkPrompts() {
  try {
    const settings = readForm();
    if (isIoQueueMode(settings)) {
      setStatus("IO queue mode uses the extractor and queue builder; no packaged prompt is needed.");
      return;
    }
    const text = await loadPrompt(settings.engine, settings.mode);
    setStatus(`Packaged prompt OK: ${settings.engine}/${settings.mode}\nCharacters: ${text.length}`);
  } catch (error) {
    setStatus(`Prompt check failed: ${error?.message || error}`);
  }
}

async function downloadImagesOnly() {
  const button = $("downloadImagesOnly");
  button.disabled = true;
  try {
    await saveForm();
    const tab = await getActiveTab();
    setStatus("Downloading images only...");
    const response = await sendImageDownloadOnlyMessage(tab.id);
    if (!response?.ok) throw new Error(response?.error || "Image download failed.");

    const meta = response.meta || {};
    setStatus(
      [
        response.message || "Image download complete.",
        `Title: ${meta.title || "[not found]"}`,
        `Selected: ${(meta.selectedImages || []).join(", ") || "none"}`,
        `Cases/groups: ${(meta.cases || []).map((g) => `[${g.join(",")}]`).join(" ") || "none"}`
      ].join("\n")
    );
  } catch (error) {
    setStatus(`Image download error: ${error?.message || error}`);
  } finally {
    button.disabled = false;
  }
}

async function buildIoQueue() {
  const button = $("buildIoQueue");
  button.disabled = true;
  try {
    await saveForm();
    const tab = await getActiveTab();
    setStatus("Building Image Occlusion queue...");
    const response = await sendIoQueueMessage(tab.id);
    if (!response?.ok) throw new Error(response?.error || "IO queue build failed.");

    const meta = response.meta || {};
    const queue = response.queue || {};
    setStatus(
      [
        response.message || "Image Occlusion queue built.",
        `Title: ${meta.title || "[not found]"}`,
        `Queue items: ${queue.totalItems ?? "unknown"}`,
        `Folder: Downloads\\${queue.folder || "RadPrimerIOQueue"}`
      ].join("\n")
    );
  } catch (error) {
    setStatus(`IO queue error: ${error?.message || error}`);
  } finally {
    button.disabled = false;
  }
}

async function recoverCardAuditTsv() {
  const button = $("recoverCardAuditTsv");
  button.disabled = true;
  try {
    const tab = await getActiveBrowserTab();
    if (!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(tab.url || "")) {
      throw new Error("Open the completed ChatGPT conversation tab, then click this recovery button.");
    }

    setStatus("Capturing latest ChatGPT TSV download...");
    const response = await sendRecoverCardAuditTsvMessage(tab.id);
    if (!response?.ok) throw new Error(response?.error || "TSV recovery failed.");

    const wakeMessage = response.clipboardText || response.auditDownload?.clipboardText || "";
    if (wakeMessage) await copyText(wakeMessage);
    setStatus(
      [
        "Captured latest ChatGPT TSV download.",
        `Bundle: ${response.bundle?.downloadFolder || response.auditDownload?.bundle?.downloadFolder || "[created]"}`,
        wakeMessage ? "Audit wake-up message copied to clipboard." : "No wake-up message was returned."
      ].join("\n")
    );
  } catch (error) {
    setStatus(`TSV recovery error: ${error?.message || error}`);
  } finally {
    button.disabled = false;
  }
}

async function exportAuditSource() {
  const button = $("exportAuditSource");
  button.disabled = true;
  try {
    await saveForm();
    const tab = await getActiveTab();
    setStatus("Exporting source-only audit bundle...");
    const response = await sendExportAuditSourceMessage(tab.id);
    if (!response?.ok) throw new Error(response?.error || "Source-only export failed.");

    if (response.clipboardText) await copyText(response.clipboardText);
    setStatus(
      [
        response.message || "Source-only audit bundle exported.",
        `Bundle: ${response.bundle?.downloadFolder || "[created]"}`,
        response.clipboardText ? "Source-only wake-up message copied to clipboard." : "No wake-up message was returned."
      ].join("\n")
    );
  } catch (error) {
    setStatus(`Audit source export error: ${error?.message || error}`);
  } finally {
    button.disabled = false;
  }
}

async function exportSourceCompare() {
  const button = $("exportSourceCompare");
  button.disabled = true;
  try {
    await saveForm();
    const tab = await getActiveTab();
    setStatus("Exporting comparison source bundle...");
    const response = await sendExportSourceCompareMessage(tab.id);
    if (!response?.ok) throw new Error(response?.error || "Comparison source export failed.");

    if (response.clipboardText) await copyText(response.clipboardText);
    setStatus(
      [
        response.message || "Comparison source bundle exported.",
        `Bundle: ${response.bundle?.downloadFolder || "[created]"}`,
        response.clipboardText ? "Comparison wake-up message copied to clipboard." : "No wake-up message was returned."
      ].join("\n")
    );
  } catch (error) {
    setStatus(`Comparison source export error: ${error?.message || error}`);
  } finally {
    button.disabled = false;
  }
}

async function buildMasterSource() {
  const button = $("buildMasterSource");
  button.disabled = true;
  try {
    await saveForm();
    const tab = await getActiveTab();
    const sharedPairingTitle = $("sourcePairingKey").value.trim();
    setStatus("Exporting open RadPrimer + STATdx sources and building master source package...");
    let response = await sendBuildMasterSourceMessage(tab.id, {
      selectedPairingTitle: sharedPairingTitle
    });
    if (!response?.ok && response?.errorCode === "MASTER_SOURCE_TITLE_MISMATCH") {
      const selectedPairingTitle = promptForMasterSourceTitleChoice(response);
      if (!selectedPairingTitle) {
        setStatus("Master source build cancelled before exporting because the open article titles differ.");
        return;
      }
      setStatus(`Using shared master-source title: ${selectedPairingTitle}\nExporting both open sources...`);
      response = await sendBuildMasterSourceMessage(tab.id, { selectedPairingTitle });
    }
    if (!response?.ok) throw new Error(response?.error || "Master source build failed.");

    if (response.clipboardText) await copyText(response.clipboardText);
    setStatus(
      [
        response.message || "Master source request bundle prepared.",
        response.bundle?.downloadFolder ? `Bundle: ${response.bundle.downloadFolder}` : "",
        response.exportedSources?.length ? `Exported: ${response.exportedSources.join(", ")}` : "",
        response.cachedSources?.length ? `Sources: ${response.cachedSources.join(", ")}` : "",
        response.clipboardText ? "Codex wake-up message copied to clipboard." : ""
      ].filter(Boolean).join("\n")
    );
  } catch (error) {
    setStatus(`Master source error: ${error?.message || error}`);
  } finally {
    button.disabled = false;
  }
}

async function importMasterSource() {
  const button = $("importMasterSource");
  button.disabled = true;
  try {
    const files = await readMasterSourceFileInput();
    setStatus("Importing master source into extension storage...");
    const response = await sendImportMasterSourceMessage(files);
    if (!response?.ok) throw new Error(response?.error || "Master source import failed.");

    $("useMasterSource").checked = true;
    await saveForm();

    const source = response.masterSource || {};
    setStatus(
      [
        "Imported master source.",
        `Title: ${source.articleTitle || "[unknown]"}`,
        `Images: ${source.imageCount ?? 0}`,
        `Downloadable image files: ${source.downloadFileCount ?? 0}`,
        `Characters: ${source.outputChars ?? 0}`,
        "Use imported master source is now enabled."
      ].join("\n")
    );
  } catch (error) {
    setStatus(`Master source import error: ${error?.message || error}`);
  } finally {
    button.disabled = false;
  }
}

async function showMasterSource() {
  try {
    const response = await sendGetMasterSourceMessage();
    if (!response?.ok) throw new Error(response?.error || "Could not read imported master source.");
    const source = response.masterSource;
    if (!source) {
      setStatus("No master source is imported yet.");
      return;
    }
    setStatus(
      [
        "Imported master source is available.",
        `Title: ${source.articleTitle || "[unknown]"}`,
        `Imported: ${source.importedAt || "[unknown]"}`,
        `Images: ${source.imageCount ?? 0}`,
        `Downloadable image files: ${source.downloadFileCount ?? 0}`,
        `Characters: ${source.outputChars ?? 0}`
      ].join("\n")
    );
  } catch (error) {
    setStatus(`Master source status error: ${error?.message || error}`);
  }
}

async function init() {
  const stored = await chrome.storage.local.get("radprimerRunnerSettings");
  applyForm({ ...DEFAULTS, ...(stored.radprimerRunnerSettings || {}) });
  await syncSourceCompareButtons();

  $("engine").addEventListener("change", async () => {
    populateModes($("engine").value, $("mode").value);
    syncPanels();
    applyNarrativeModeDefaults();
    applyIoQueueModeDefaults();
    applyNoPictureModeDefaults();
    applyCardModeDefaults();
    syncSpeechifyAvailability();
    await saveForm();
  });

  $("mode").addEventListener("change", async () => {
    applyNarrativeModeDefaults();
    applyIoQueueModeDefaults();
    applyNoPictureModeDefaults();
    applyCardModeDefaults();
    syncSpeechifyAvailability();
    await saveForm();
  });

  $("autoSubmitChatGPT").addEventListener("change", async () => {
    if ($("autoSubmitChatGPT").checked) {
      $("openChatGPT").checked = true;
    }
    await saveForm();
  });

  $("autoSendToSpeechify").addEventListener("change", async () => {
    if ($("autoSendToSpeechify").checked) {
      $("openChatGPT").checked = true;
      $("autoSubmitChatGPT").checked = true;
    }
    await saveForm();
  });

  $("captureCardAuditBundle").addEventListener("change", async () => {
    if ($("captureCardAuditBundle").checked) {
      $("openChatGPT").checked = true;
      $("autoSubmitChatGPT").checked = true;
    }
    await saveForm();
  });

  for (const id of fields) {
    $(id).addEventListener("change", saveForm);
    if ($(id).tagName === "TEXTAREA" || $(id).type === "text") {
      $(id).addEventListener("input", saveForm);
    }
  }

  $("run").addEventListener("click", run);
  $("downloadImagesOnly").addEventListener("click", downloadImagesOnly);
  $("buildIoQueue").addEventListener("click", buildIoQueue);
  $("recoverCardAuditTsv").addEventListener("click", recoverCardAuditTsv);
  $("exportAuditSource").addEventListener("click", exportAuditSource);
  $("exportSourceCompare").addEventListener("click", exportSourceCompare);
  $("buildMasterSource").addEventListener("click", buildMasterSource);
  $("importMasterSource").addEventListener("click", importMasterSource);
  $("showMasterSource").addEventListener("click", showMasterSource);
  $("refreshPrompts").addEventListener("click", checkPrompts);
}

init().catch((error) => setStatus(`Init error: ${error?.message || error}`));
