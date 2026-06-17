const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const GROUPING_PREFLIGHT_PROMPT = "prompts/grouping_preflight.txt";
const PENDING_GROUPING_PREFIX = "radprimerGroupingPending:";
const PENDING_CARD_AUDIT_PREFIX = "radprimerCardAuditPending:";
const RADPRIMER_HIERARCHY_PREFIX = "radprimerCanonicalHierarchy:";
const IMAGE_DOWNLOAD_SUBFOLDER = "RadPrimer";
const IO_QUEUE_SUBFOLDER = "RadPrimerIOQueue";
const IO_QUEUE_IMAGE_SUBFOLDER = `${IO_QUEUE_SUBFOLDER}/images`;
const CARD_AUDIT_SUBFOLDER = "RadPrimerAudit";
const SOURCE_COMPARE_SUBFOLDER = "RadPrimerSourceComparison";
const MASTER_SOURCE_SUBFOLDER = "RadiologyMasterSource";
const IMAIOS_LABEL_REPOSITORY_SUBFOLDER = "IMAIOSLabelRepository";
const IMAIOS_CHUNK_SESSION_SUBFOLDER = "IMAIOS/ChunkSessions";
const IMAGE_EVIDENCE_SUBFOLDER = "image_evidence";
const SOURCE_COMPARE_CACHE_PREFIX = "radprimerSourceCompareCache:";
const MASTER_SOURCE_CACHE_KEY = "radprimerLatestMasterSource";
const MASTER_SOURCE_CACHE_PREFIX = "radprimerMasterSourceCache:";
const IMAIOS_LABEL_REPOSITORY_STORAGE_KEY = "imaios-cine-tools:label-repository";
const CARD_AUDIT_DOWNLOAD_SENTINEL = "RADPRIMER_CARD_TSV_DOWNLOAD_READY";
const CORE_EVIDENCE_BEGIN = "CORE_EVIDENCE_FILE_BEGIN";
const CORE_EVIDENCE_END = "CORE_EVIDENCE_FILE_END";
const pendingTextDownloadFilenames = [];
const imaiosLiveDrillPairs = new Map();
const CARD_AUDIT_DOWNLOAD_OUTPUT_INSTRUCTION = [
  "AUTOMATED CAPTURE REQUIREMENT:",
  "When you reach final card export, create a downloadable TSV file instead of printing the TSV rows in chat.",
  "Do not print the TSV inline. Do not wrap the TSV in a code block.",
  "",
  "CORE EVIDENCE REQUIREMENT FOR CODEX AUDIT:",
  "If any Core Radiology content was used, you must also print a compact Core evidence block outside the TSV download. This block is for the audit bundle only and must not be included inside the TSV file.",
  "If no Core content was actually retrieved/used, still print the block with CORE_EVIDENCE_STATUS: NOT_USED.",
  "Use this exact plain-text wrapper:",
  CORE_EVIDENCE_BEGIN,
  "CORE_EVIDENCE_STATUS: USED | NOT_USED | CORE_GAP | CLARIFICATION_NEEDED",
  "CORE_SOURCE_BASIS: visible Core source/file/chapter/section/page range when available; if page numbers are not visible, say so.",
  "CORE_FACTS_USED:",
  "- concise bullet facts from Core that affected cards, summaries, mechanisms, differentials, or management.",
  "CORE_DERIVED_CARDS:",
  "- card questions/IDs or card types that used the Core facts.",
  "CORE_LIMITATIONS:",
  "- anything not found, not retrievable, or inferred from non-Core sources.",
  CORE_EVIDENCE_END,
  "",
  "After the download button/link is created, print this exact sentinel block as plain text:",
  CARD_AUDIT_DOWNLOAD_SENTINEL,
  "FILENAME: radprimer_cards.tsv",
  "EXPECTED_ROWS: <number of TSV rows>",
  "If you need Core pages or clarification first, ask for that information, then after the user answers, create the downloadable TSV and print the sentinel block."
].join("\n");
const SOURCE_COMPARE_EXTRACTION_PROMPT = [
  "Source-comparison extraction only.",
  "Do not generate a narrative or cards from this package.",
  "Preserve article hierarchy, source text, image filenames, selected image captions, arrows/annotations, source attribution, Core evidence if present, and Anki/breadcrumb metadata when available."
].join("\n");

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

let activeCardAuditDownload = null;
let lastSpeechifyPlayerTabId = null;
let speechifyAwakeWindowId = null;
let speechifyAwakeTabId = null;
let speechifyAwakeLastMoveAt = 0;
const pendingImageDownloadFilenames = new Map();

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
  settings.mode = normalizeVisibleMode(settings.engine || DEFAULTS.engine, settings.mode || DEFAULTS.mode);
  const folder = parseSpeechifyFolderUrl(
    settings.speechifyFolderUrl || buildSpeechifyFolderUrl(settings.speechifyFolderId)
  );
  settings.speechifyFolderUrl = folder.url;
  settings.speechifyFolderId = folder.id;
  settings.speechifyFolderName = "";
  settings.sourcePairingKey = String(settings.sourcePairingKey || "").trim();

  if (isNarrativeSpeechifyMode(settings)) {
    settings.include = "all";
    settings.caseMap = "";
    settings.openChatGPT = true;
    settings.autoSubmitChatGPT = true;
    settings.autoSendToSpeechify = true;
    settings.speechifyAutoSave = false;
    settings.downloadImages = shouldNarrativeDownloadImages(settings);
    settings.cardModeDownloadImagesDisabled = false;
  } else if (isIoQueueMode(settings)) {
    settings.include = "all";
    settings.caseMap = "";
    settings.openChatGPT = false;
    settings.autoSubmitChatGPT = false;
    settings.autoSendToSpeechify = false;
    settings.speechifyAutoSave = false;
    settings.downloadImages = true;
    settings.downloadPlain = false;
    settings.downloadAnnotated = true;
    settings.captureCardAuditBundle = false;
    settings.cardModeDownloadImagesDisabled = false;
    settings.useMasterSource = false;
  } else if (isNoPictureCardMode(settings)) {
    settings.include = "none";
    settings.caseMap = "";
    settings.autoSendToSpeechify = false;
    settings.speechifyAutoSave = false;
    settings.downloadImages = false;
    settings.downloadPlain = false;
    settings.downloadAnnotated = false;
    settings.cardModeDownloadImagesDisabled = true;
  } else {
    settings.autoSendToSpeechify = false;
    settings.speechifyAutoSave = false;
    settings.downloadImages = settings.cardModeDownloadImagesDisabled ? false : true;
  }

  if (settings.autoSendToSpeechify) {
    settings.openChatGPT = true;
    settings.autoSubmitChatGPT = true;
  }

  if (shouldCaptureCardAuditBundle(settings)) {
    settings.openChatGPT = true;
    settings.autoSubmitChatGPT = true;
  }

  return settings;
}

function normalizeVisibleMode(engine, mode) {
  const visibleModes = ["io_queue", "no_pictures", "chatgpt_cards", "narrative"];
  if (visibleModes.includes(mode)) return mode;
  if (mode === "narrative_with_images") return "narrative";
  if (mode === "codex_cards" || mode === "captions_only") return "chatgpt_cards";
  return DEFAULTS.mode;
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

function shouldCaptureCardAuditBundle(settings) {
  return Boolean(settings?.captureCardAuditBundle) && isNonNarrativeMode(settings);
}

function timeoutMsFromSeconds(value, fallbackSeconds, minimumSeconds = 30) {
  const parsed = parseInt(value || "", 10);
  const seconds = Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackSeconds;
  return Math.max(minimumSeconds, seconds) * 1000;
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

let imaiosModuleCatalogCache = null;

async function loadImaiosModuleCatalog() {
  if (imaiosModuleCatalogCache) return imaiosModuleCatalogCache;
  try {
    const response = await fetch(chrome.runtime.getURL("imaios_module_catalog.json"));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = await response.json();
    imaiosModuleCatalogCache = Array.isArray(catalog.modules) ? catalog.modules : [];
  } catch (error) {
    console.warn("Could not load IMaiOS module catalog", error);
    imaiosModuleCatalogCache = [];
  }
  return imaiosModuleCatalogCache;
}

function normalizeImaiosRouteText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bcomputed tomography\b/g, "ct")
    .replace(/\bmagnetic resonance imaging\b/g, "mri")
    .replace(/\binternal auditory canal\b/g, "iac")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeImaiosRouteText(value) {
  const stopWords = new Set(["and", "the", "of", "for", "with", "anatomy", "module", "atlas", "imaging"]);
  return normalizeImaiosRouteText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

function getImaiosChunkRouteQuery(library) {
  const chunks = Array.isArray(library?.chunks) ? library.chunks : [];
  return [
    library?.topic,
    library?.source,
    ...chunks.flatMap((chunk) => [
      chunk?.modality,
      chunk?.imaiosModality,
      chunk?.module,
      chunk?.title,
      chunk?.id
    ])
  ].filter(Boolean).join(" ");
}

function scoreImaiosModule(module, query) {
  const queryText = normalizeImaiosRouteText(query);
  if (!queryText) return 0;
  const queryTokens = new Set(tokenizeImaiosRouteText(queryText));
  const candidates = [
    module.name,
    module.key,
    module.moduleCode,
    module.href,
    ...(Array.isArray(module.aliases) ? module.aliases : [])
  ].filter(Boolean);

  let bestScore = 0;
  for (const candidate of candidates) {
    const candidateText = normalizeImaiosRouteText(candidate);
    if (!candidateText) continue;
    let score = 0;
    if (candidateText === queryText) score += 200;
    if (queryText.includes(candidateText) || candidateText.includes(queryText)) score += 80;

    const candidateTokens = new Set(tokenizeImaiosRouteText(candidateText));
    let overlap = 0;
    for (const token of candidateTokens) {
      if (queryTokens.has(token)) overlap += 1;
    }
    if (overlap) {
      score += overlap * 12;
      score += Math.round((overlap / Math.max(1, candidateTokens.size)) * 40);
    }

    for (const modality of ["ct", "mri", "mra", "cta", "pet", "cbct", "xray", "radiography"]) {
      if (queryTokens.has(modality) && candidateTokens.has(modality)) score += 18;
      if (queryTokens.has(modality) && !candidateTokens.has(modality)) score -= 12;
    }

    if (candidateText.includes("temporal bone") && queryText.includes("temporal bone")) score += 70;
    if (candidateText.includes("inner ear") && queryText.includes("inner ear")) score += 60;
    if (candidateText.includes("iac") && queryText.includes("iac")) score += 60;
    if (candidateText.includes("head and neck") && queryText.includes("head and neck")) score += 35;

    bestScore = Math.max(bestScore, score);
  }

  return bestScore + Math.min(10, Number(module.occurrences || 0));
}

async function getImaiosChunkLibraryTargetUrl(library) {
  const chunks = Array.isArray(library?.chunks) ? library.chunks : [];
  const explicitUrl = chunks
    .map((chunk) => String(chunk?.modalityUrl || chunk?.url || "").trim())
    .find((url) => /^https:\/\/(www\.)?imaios\.com\/.+/i.test(url));
  if (explicitUrl) return explicitUrl;

  const modules = await loadImaiosModuleCatalog();
  const query = getImaiosChunkRouteQuery(library);
  const scored = modules
    .map((module) => ({ module, score: scoreImaiosModule(module, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.module?.url && scored[0].score >= 35) return scored[0].module.url;
  return "https://www.imaios.com/en/e-anatomy/head-and-neck/ct-temporal-bone";
}

async function openOrFocusImaiosTab(targetUrl) {
  const tabs = await chrome.tabs.query({ url: ["https://imaios.com/*", "https://www.imaios.com/*"] });
  let tab = tabs?.[0];
  if (tab?.id) {
    tab = await chrome.tabs.update(tab.id, { active: true, url: targetUrl });
  } else {
    tab = await chrome.tabs.create({ url: targetUrl, active: true });
  }
  await waitForTabComplete(tab.id, 60000, "IMAIOS");
  return tab;
}

async function sendImaiosMessageWithInjection(tabId, payload) {
  try {
    return await sendTabMessage(tabId, payload);
  } catch (_error) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["imaios-cine-tools.js"]
    });
    await sleep(1000);
    return sendTabMessage(tabId, payload);
  }
}

async function openImaiosAndImportChunks(library) {
  if (!library || library.kind !== "imaios-chunk-library" || !Array.isArray(library.chunks)) {
    throw new Error("No valid IMaios chunk library was provided.");
  }
  const targetUrl = await getImaiosChunkLibraryTargetUrl(library);
  const tab = await openOrFocusImaiosTab(targetUrl);
  const response = await sendImaiosMessageWithInjection(tab.id, {
    type: "IMAIOS_IMPORT_CHUNKS",
    library
  });
  if (!response?.ok) throw new Error(response?.error || "IMAIOS chunk import failed.");
  return {
    ...response,
    tabId: tab.id,
    url: targetUrl
  };
}

async function sendLiveDrillCardPlanToImaios({ assistantText = "", sourcePayload = null, imaiosTabId = 0 } = {}) {
  const text = String(assistantText || "").trim();
  if (!text) throw new Error("No live-drill card plan text was provided.");

  let tab = null;
  if (imaiosTabId) {
    tab = await chrome.tabs.get(Number(imaiosTabId)).catch(() => null);
  }
  if (!tab?.id) {
    const tabs = await chrome.tabs.query({ url: ["https://imaios.com/*", "https://www.imaios.com/*"] });
    tab = tabs.find((candidate) => candidate.active) || tabs[0] || null;
  }
  if (!tab?.id) {
    throw new Error("No open IMAIOS tab was found. Open the target IMAIOS module first, then retry from ChatGPT.");
  }

  try {
    tab = await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
    await sleep(400);
  } catch {}

  const response = await sendImaiosMessageWithInjection(tab.id, {
    type: "IMAIOS_LIVE_DRILL_CARD_PLAN_READY",
    assistantText: text,
    sourcePayload
  });
  if (!response?.ok) throw new Error(response?.error || "IMAIOS could not generate the live-drill TSV.");

  try {
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
  } catch {}

  return {
    ...response,
    tabId: tab.id
  };
}

function buildImaiosModuleUrl(payload) {
  const url = new URL(payload?.module?.url || "https://www.imaios.com/en/e-anatomy/head-and-neck/ct-temporal-bone");
  url.hash = "";
  return url.toString();
}

function makeImaiosPairId(quizTabId, answerTabId) {
  return `imaios-pair-${Date.now()}-${quizTabId || "quiz"}-${answerTabId || "answer"}`;
}

async function startImaiosLiveDrillPairSession(message, senderTab) {
  const answerTabId = senderTab?.id || Number(message.answerTabId || message.leaderTabId || 0);
  if (!answerTabId) throw new Error("No IMAIOS answer tab was available.");
  const payload = message.payload && typeof message.payload === "object" ? message.payload : null;
  if (!payload || payload.kind !== "imaios-live-drill") {
    throw new Error("No valid live-drill payload was provided for paired tab mode.");
  }

  const quizUrl = buildImaiosModuleUrl(payload);
  const createOptions = {
    url: quizUrl,
    active: true,
    openerTabId: answerTabId
  };
  if (Number.isFinite(senderTab?.windowId)) createOptions.windowId = senderTab.windowId;
  const quizTab = await chrome.tabs.create(createOptions);
  await waitForTabComplete(quizTab.id, 60000, "IMAIOS paired clean tab");

  const pairId = makeImaiosPairId(quizTab.id, answerTabId);
  const pair = {
    pairId,
    leaderTabId: quizTab.id,
    followerTabId: answerTabId,
    payload,
    createdAt: Date.now()
  };
  imaiosLiveDrillPairs.set(pairId, pair);

  await sendImaiosMessageWithInjection(quizTab.id, {
    type: "IMAIOS_LIVE_DRILL_PAIR_ROLE",
    pairId,
    role: "quiz",
    peerTabId: answerTabId,
    payload
  }).catch(() => {});
  await sendImaiosMessageWithInjection(answerTabId, {
    type: "IMAIOS_LIVE_DRILL_PAIR_ROLE",
    pairId,
    role: "answer",
    peerTabId: quizTab.id,
    payload
  }).catch(() => {});

  return {
    ok: true,
    pairId,
    leaderTabId: quizTab.id,
    cleanTabId: quizTab.id,
    followerTabId: answerTabId,
    answerTabId,
    quizUrl
  };
}

async function relayImaiosLiveDrillPairSync(message, senderTab) {
  const pairId = String(message.pairId || "");
  const pair = imaiosLiveDrillPairs.get(pairId);
  if (!pair) throw new Error("The paired IMAIOS session is no longer registered.");
  if (senderTab?.id !== pair.leaderTabId && senderTab?.id !== pair.followerTabId) {
    throw new Error("This tab does not belong to the requested IMAIOS pair.");
  }
  const targetTabId = senderTab.id === pair.leaderTabId ? pair.followerTabId : pair.leaderTabId;
  const response = await sendImaiosMessageWithInjection(targetTabId, {
    type: "IMAIOS_LIVE_DRILL_PAIR_APPLY_SYNC",
    pairId,
    sync: message.sync || {}
  }).catch((error) => ({ ok: false, error: String(error?.message || error) }));
  return { ok: Boolean(response?.ok), targetTabId, peerResponse: response || null };
}

async function focusImaiosLiveDrillPairPeer(message, senderTab = null) {
  const pairId = String(message.pairId || "");
  const pair = imaiosLiveDrillPairs.get(pairId);
  if (!pair) throw new Error("The paired IMAIOS session is no longer registered.");
  if (senderTab?.id !== pair.leaderTabId && senderTab?.id !== pair.followerTabId) {
    throw new Error("This tab does not belong to the requested IMAIOS pair.");
  }
  const targetTabId = senderTab.id === pair.leaderTabId ? pair.followerTabId : pair.leaderTabId;
  const tab = await chrome.tabs.update(targetTabId, { active: true });
  if (tab?.windowId) await chrome.windows.update(tab.windowId, { focused: true });
  return { ok: true, targetTabId };
}

async function stopImaiosLiveDrillPairSession(message, senderTab = null) {
  const pairId = String(message.pairId || "");
  const pair = imaiosLiveDrillPairs.get(pairId);
  if (!pair) return { ok: true, stopped: false };
  if (senderTab?.id && senderTab.id !== pair.leaderTabId && senderTab.id !== pair.followerTabId) {
    throw new Error("This tab does not belong to the requested IMAIOS pair.");
  }
  imaiosLiveDrillPairs.delete(pairId);
  await Promise.all([
    sendImaiosMessageWithInjection(pair.leaderTabId, { type: "IMAIOS_LIVE_DRILL_PAIR_STOPPED", pairId }).catch(() => {}),
    sendImaiosMessageWithInjection(pair.followerTabId, { type: "IMAIOS_LIVE_DRILL_PAIR_STOPPED", pairId }).catch(() => {})
  ]);
  return { ok: true, stopped: true };
}

function removeImaiosLiveDrillPairsForTab(tabId) {
  const affected = Array.from(imaiosLiveDrillPairs.values())
    .filter((pair) => pair.leaderTabId === tabId || pair.followerTabId === tabId);
  for (const pair of affected) {
    imaiosLiveDrillPairs.delete(pair.pairId);
    const peerTabId = pair.leaderTabId === tabId ? pair.followerTabId : pair.leaderTabId;
    sendImaiosMessageWithInjection(peerTabId, {
      type: "IMAIOS_LIVE_DRILL_PAIR_STOPPED",
      pairId: pair.pairId
    }).catch(() => {});
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  removeImaiosLiveDrillPairsForTab(tabId);
});

async function getSpeechifyTab({ focus = false, createIfMissing = false } = {}) {
  const tabs = await chrome.tabs.query({ url: ["https://app.speechify.com/*"] });
  let tab = tabs.find((candidate) => candidate.active) || tabs[0] || null;

  if (!tab && createIfMissing) {
    tab = await chrome.tabs.create({ url: "https://app.speechify.com/", active: focus });
  }

  if (!tab?.id) {
    throw new Error("No Speechify tab is open. Open the Speechify lecture/player tab first.");
  }

  if (focus) {
    tab = await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
  }

  return tab;
}

async function getSpeechifyPlayerStates(tabs) {
  const states = [];
  let lastError = null;

  for (const tab of tabs) {
    if (!tab?.id) continue;
    try {
      const response = await sendSpeechifyMessageWithInjection(tab.id, {
        type: "SPEECHIFY_PLAYER_REMOTE",
        action: "state",
        tabAudible: Boolean(tab.audible)
      });
      if (response?.ok && response.result?.available) {
        states.push({
          tab,
          state: {
            ...response.result,
            isPlaying: Boolean(response.result?.isPlaying),
            tabAudible: Boolean(tab.audible)
          }
        });
      } else if (!response?.ok) {
        lastError = new Error(response?.error || "Speechify player state failed.");
      }
    } catch (error) {
      lastError = error;
    }
  }

  return { states, lastError };
}

function chooseSpeechifyPlayerState(states) {
  if (!states.length) return null;
  return (
    states.find((item) => item.state?.isPlaying) ||
    states.find((item) => item.tab?.id === lastSpeechifyPlayerTabId) ||
    states.find((item) => item.tab?.active) ||
    states.find((item) => item.tab?.audible || item.state?.tabAudible) ||
    states[0]
  );
}

async function focusSpeechifyTab(tab) {
  const focusedTab = await chrome.tabs.update(tab.id, { active: true });
  if (focusedTab.windowId) await chrome.windows.update(focusedTab.windowId, { focused: true });
  return focusedTab;
}

async function getSpeechifyKeepAwakeEnabled() {
  try {
    const stored = await chrome.storage.local.get("radprimerRunnerSettings");
    const settings = { ...DEFAULTS, ...(stored.radprimerRunnerSettings || {}) };
    return settings.speechifyKeepAwake !== false;
  } catch {
    return DEFAULTS.speechifyKeepAwake !== false;
  }
}

async function refocusSenderTab(senderTab) {
  try {
    if (senderTab?.id) await chrome.tabs.update(senderTab.id, { active: true });
    if (senderTab?.windowId) await chrome.windows.update(senderTab.windowId, { focused: true });
  } catch {}
}

async function ensureSpeechifyAwakeWindow(tab, senderTab = null) {
  if (!tab?.id) return tab;
  if (!(await getSpeechifyKeepAwakeEnabled())) return tab;

  let currentTab = tab;
  let currentWindow = null;
  try {
    currentTab = await chrome.tabs.get(tab.id);
    currentWindow = await chrome.windows.get(currentTab.windowId);
  } catch {
    return tab;
  }

  const senderWindowId = senderTab?.windowId || null;
  const alreadyCompanion =
    currentTab.id === speechifyAwakeTabId ||
    currentWindow?.id === speechifyAwakeWindowId ||
    (currentTab.active && currentWindow?.type === "popup" && currentWindow?.state !== "minimized");

  if (alreadyCompanion) {
    speechifyAwakeTabId = currentTab.id;
    speechifyAwakeWindowId = currentWindow?.id || speechifyAwakeWindowId;
    if (currentWindow?.state === "minimized") {
      try {
        await chrome.windows.update(currentWindow.id, { state: "normal", focused: false });
      } catch {}
    }
    return currentTab;
  }

  const alreadyVisibleInSeparateWindow =
    currentTab.active &&
    senderWindowId &&
    currentTab.windowId !== senderWindowId &&
    currentWindow?.state !== "minimized";

  if (alreadyVisibleInSeparateWindow) {
    speechifyAwakeTabId = currentTab.id;
    speechifyAwakeWindowId = currentWindow?.id || speechifyAwakeWindowId;
    return currentTab;
  }

  if (Date.now() - speechifyAwakeLastMoveAt < 2500) return currentTab;
  speechifyAwakeLastMoveAt = Date.now();

  try {
    const popup = await chrome.windows.create({
      tabId: currentTab.id,
      type: "popup",
      focused: false,
      width: 560,
      height: 760,
      left: 24,
      top: 24
    });

    const awakeTab = popup?.tabs?.[0] || (await chrome.tabs.get(currentTab.id));
    speechifyAwakeWindowId = popup?.id || awakeTab.windowId;
    speechifyAwakeTabId = awakeTab.id;
    lastSpeechifyPlayerTabId = awakeTab.id;
    await refocusSenderTab(senderTab);
    return awakeTab;
  } catch (error) {
    console.warn("[RadPrimer] Could not create Speechify awake window.", error);
    await refocusSenderTab(senderTab);
    return currentTab;
  }
}

async function sendSpeechifyPlayerRemote(payload = {}, senderTab = null) {
  const action = String(payload.action || "state");
  const tabs = await chrome.tabs.query({ url: ["https://app.speechify.com/*"] });

  if (action === "focus") {
    const { states } = await getSpeechifyPlayerStates(tabs);
    const chosen = chooseSpeechifyPlayerState(states);
    if (chosen?.tab?.id) {
      await focusSpeechifyTab(chosen.tab);
      lastSpeechifyPlayerTabId = chosen.tab.id;
      return chosen.state;
    }

    const tab = await getSpeechifyTab({ focus: true, createIfMissing: true });
    throw new Error(
      `Opened Speechify, but no player is visible in the current Speechify tab. ` +
        `Open the lecture/player page first.`
    );
  }

  if (action === "calibrate" || action === "updateCache") {
    if (!tabs.length) {
      throw new Error("No Speechify tab is open. Open the Speechify lecture/player tab first.");
    }

    const { states } = await getSpeechifyPlayerStates(tabs);
    const chosen = chooseSpeechifyPlayerState(states);
    const targetTab = chosen?.tab?.id ? chosen.tab : tabs.find((tab) => tab.id === lastSpeechifyPlayerTabId) || tabs[0];
    let focusedTab = targetTab;

    try {
      focusedTab = await focusSpeechifyTab(targetTab);
      await sleep(1200);
      const updatedTab = await chrome.tabs.get(focusedTab.id);
      const response = await sendSpeechifyMessageWithInjection(focusedTab.id, {
        type: "SPEECHIFY_PLAYER_REMOTE",
        action,
        tabAudible: Boolean(updatedTab?.audible || focusedTab?.audible)
      });

      if (!response?.ok) {
        throw new Error(response?.error || (action === "calibrate" ? "Speechify calibration failed." : "Speechify cache update failed."));
      }

      lastSpeechifyPlayerTabId = focusedTab.id;
      return {
        ...response.result,
        isPlaying: Boolean(response.result?.isPlaying),
        tabAudible: Boolean(updatedTab?.audible || focusedTab?.audible),
        calibrated: Boolean(response.result?.calibrated),
        syncAttempted: action === "calibrate" ? true : Boolean(response.result?.syncAttempted)
      };
    } finally {
      await refocusSenderTab(senderTab);
    }
  }

  if (!tabs.length) {
    throw new Error("No Speechify tab is open. Open the Speechify lecture/player tab first.");
  }

  if (lastSpeechifyPlayerTabId) {
    const preferredTab = tabs.find((tab) => tab.id === lastSpeechifyPlayerTabId);
    if (preferredTab?.id) {
      try {
        const response = await sendSpeechifyMessageWithInjection(preferredTab.id, {
          ...payload,
          type: "SPEECHIFY_PLAYER_REMOTE",
          action,
          tabAudible: Boolean(preferredTab.audible)
        });
        if (response?.ok) {
          let updatedTab = preferredTab;
          try {
            updatedTab = await chrome.tabs.get(preferredTab.id);
          } catch {}
          lastSpeechifyPlayerTabId = preferredTab.id;
          const result = {
            ...response.result,
            isPlaying: Boolean(response.result?.isPlaying),
            tabAudible: Boolean(updatedTab?.audible || preferredTab.audible)
          };
          if (action === "state") {
            return {
              ...result,
              speechifyAwakeWindow: Boolean(updatedTab?.windowId && updatedTab.windowId !== senderTab?.windowId)
            };
          }
          return result;
        }
      } catch {}
    }
  }

  const { states, lastError: stateError } = await getSpeechifyPlayerStates(tabs);
  const chosen = chooseSpeechifyPlayerState(states);

  if (action === "state") {
    if (chosen?.state) {
      const awakeTab = await ensureSpeechifyAwakeWindow(chosen.tab, senderTab);
      lastSpeechifyPlayerTabId = awakeTab?.id || chosen.tab.id;
      return {
        ...chosen.state,
        speechifyAwakeWindow: Boolean(awakeTab?.id && awakeTab.windowId !== senderTab?.windowId)
      };
    }
    throw stateError || new Error("No Speechify player is visible. Open a Speechify lecture/player tab first.");
  }

  const awakeChosenTab = chosen?.tab?.id ? await ensureSpeechifyAwakeWindow(chosen.tab, senderTab) : null;
  const orderedTabs = chosen?.tab?.id
    ? [awakeChosenTab || chosen.tab, ...tabs.filter((tab) => tab.id !== chosen.tab.id)]
    : tabs;

  let lastError = null;
  for (const tab of orderedTabs) {
    try {
      const response = await sendSpeechifyMessageWithInjection(tab.id, {
        ...payload,
        type: "SPEECHIFY_PLAYER_REMOTE",
        action,
        tabAudible: Boolean(tab.audible)
      });
      if (response?.ok) {
        lastSpeechifyPlayerTabId = tab.id;
        let updatedTab = tab;
        try {
          updatedTab = await chrome.tabs.get(tab.id);
        } catch {}
        return {
          ...response.result,
          isPlaying: Boolean(response.result?.isPlaying),
          tabAudible: Boolean(updatedTab?.audible || tab.audible)
        };
      }
      lastError = new Error(response?.error || "Speechify player command failed.");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Speechify player command failed.");
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
    autoSave: autoSave === true
  };

  const response = await sendSpeechifyMessageWithInjection(tab.id, payload);
  if (!response?.ok) throw new Error(response?.error || "Speechify automation failed.");
  return response.result;
}

function getArticleSourceFromUrl(url) {
  const raw = String(url || "");
  if (/^https:\/\/app\.radprimer\.com\//.test(raw)) {
    return {
      kind: "radprimer",
      label: "RadPrimer",
      displayName: "RadPrimer",
      extractorFile: "content-extractor.js"
    };
  }
  if (/^https:\/\/app\.statdx\.com\//.test(raw)) {
    return {
      kind: "statdx",
      label: "STATdx",
      displayName: "STATdx",
      extractorFile: "statdx-content-extractor.js"
    };
  }
  return null;
}

function getArticleSourceFromTab(tab) {
  return getArticleSourceFromUrl(tab?.url || "");
}

function assertSupportedArticleTab(tab) {
  const source = getArticleSourceFromTab(tab);
  if (!tab?.id || !source) {
    throw new Error("Open a RadPrimer or STATdx article page first.");
  }
  return source;
}

class MasterSourceTitleMismatchError extends Error {
  constructor({ current, companionTabs }) {
    const choices = [current, ...companionTabs].filter(Boolean);
    super(
      [
        "RadPrimer and STATdx article titles differ.",
        "Choose which open tab title should be used as the shared master-source topic, or cancel the build.",
        ...choices.map((choice, index) => `${index + 1}. ${choice.sourceLabel}: ${choice.title || "[title not found]"}`)
      ].join("\n")
    );
    this.code = "MASTER_SOURCE_TITLE_MISMATCH";
    this.titleChoices = choices;
  }
}

function normalizeArticleSourceKind(value) {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("statdx") || raw.includes("stat dx") || raw.includes("sdx")) return "statdx";
  if (raw.includes("radprimer") || raw === "rp") return "radprimer";
  return "";
}

function getArticleSourceForKind(sourceKind) {
  const kind = normalizeArticleSourceKind(sourceKind);
  if (kind === "radprimer") {
    return {
      kind,
      label: "RadPrimer",
      displayName: "RadPrimer",
      extractorFile: "content-extractor.js",
      imageToolsFile: "radprimer-image-tools.js",
      tabUrlPattern: "https://app.radprimer.com/*"
    };
  }
  if (kind === "statdx") {
    return {
      kind,
      label: "STATdx",
      displayName: "STATdx",
      extractorFile: "statdx-content-extractor.js",
      imageToolsFile: "statdx-image-tools.js",
      tabUrlPattern: "https://app.statdx.com/*"
    };
  }
  return null;
}

async function navigateSourceImage({ imageNumber, sourceKind, sourceLabel }, senderTab = null) {
  const numericImage = Number(imageNumber);
  if (!Number.isFinite(numericImage) || numericImage <= 0) {
    throw new Error("No valid image number was provided.");
  }

  const source = getArticleSourceForKind(sourceKind || sourceLabel);
  if (!source) throw new Error("No RadPrimer/STATdx source was provided for this image jump.");

  const senderSource = getArticleSourceFromTab(senderTab);
  let tab =
    senderTab?.id && senderSource?.kind === source.kind
      ? senderTab
      : null;

  if (!tab?.id) {
    const tabs = await chrome.tabs.query({ url: [source.tabUrlPattern] });
    tab =
      tabs.find((candidate) => candidate.active && candidate.windowId === senderTab?.windowId) ||
      tabs.find((candidate) => candidate.active) ||
      tabs[0] ||
      null;
  }

  if (!tab?.id) {
    throw new Error(`Open a ${source.label} article tab first.`);
  }

  const focusedTab = await chrome.tabs.update(tab.id, { active: true });
  if (focusedTab.windowId) await chrome.windows.update(focusedTab.windowId, { focused: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: [source.imageToolsFile]
  });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (detail) => {
      document.dispatchEvent(new CustomEvent("radprimer-navigate-image", { detail }));
    },
    args: [
      {
        imageNumber: numericImage,
        sourceKind: source.kind,
        sourceLabel: source.label,
        source: "speechify-audio-pill"
      }
    ]
  });

  return {
    sourceKind: source.kind,
    sourceLabel: source.label,
    imageNumber: numericImage,
    tabId: tab.id
  };
}

async function ensureRadPrimerExtractor(tabId) {
  const tab = await chrome.tabs.get(tabId);
  const source = assertSupportedArticleTab(tab);
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [source.extractorFile]
  });
  return source;
}

async function extractRadPrimerArticle(tabId, settings, promptText) {
  const source = await ensureRadPrimerExtractor(tabId);
  const imaiosLabelRepository = await loadImaiosLabelRepository();
  const response = await sendTabMessage(tabId, {
    type: "RADPRIMER_EXTRACT",
    config: {
      ...settings,
      primarySourceLabel: source.label,
      promptText,
      imaiosLabelRepository,
      forceCaseLabels: settings.engine === "normal" && settings.mode === "chatgpt_cards"
    }
  });
  if (!response?.ok) throw new Error(response?.error || "Extraction failed.");
  response.meta = {
    ...(response.meta || {}),
    sourceKind: response.meta?.sourceKind || source.kind,
    primarySourceLabel: response.meta?.primarySourceLabel || source.label
  };
  await rememberRadPrimerHierarchyFromExtraction(response, settings, response.meta?.sourceUrl || "");
  await applySavedRadPrimerHierarchyToExtraction(response, settings);
  return response;
}

async function loadImaiosLabelRepository() {
  try {
    const stored = await chrome.storage.local.get(IMAIOS_LABEL_REPOSITORY_STORAGE_KEY);
    const repository = stored?.[IMAIOS_LABEL_REPOSITORY_STORAGE_KEY] || null;
    if (repository && typeof repository === "object" && countImaiosRepositoryLabels(repository) > 0) {
      return repository;
    }
    return await pullImaiosLabelRepositoryFromOpenTabs();
  } catch (error) {
    console.warn("Could not load IMaios label repository", error);
    return await pullImaiosLabelRepositoryFromOpenTabs();
  }
}

async function pullImaiosLabelRepositoryFromOpenTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: ["https://imaios.com/*", "https://www.imaios.com/*"] });
    for (const tab of tabs) {
      if (!tab?.id) continue;
      try {
        const response = await sendImaiosMessageWithInjection(tab.id, {
          type: "GET_IMAIOS_LABEL_REPOSITORY"
        });
        const repository = response?.repository;
        if (response?.ok && repository && countImaiosRepositoryLabels(repository) > 0) {
          await chrome.storage.local.set({ [IMAIOS_LABEL_REPOSITORY_STORAGE_KEY]: repository });
          return repository;
        }
      } catch (error) {
        console.warn("Could not read IMaios label repository from tab", tab.id, error);
      }
    }
  } catch (error) {
    console.warn("Could not query IMaios tabs for label repository", error);
  }
  return null;
}

function normalizeImaiosRepositoryForBackup(repository) {
  const source = repository && typeof repository === "object" ? repository : {};
  return {
    kind: "imaios-label-repository",
    version: Number(source.version) || 1,
    updatedAt: source.updatedAt || new Date().toISOString(),
    backupCreatedAt: new Date().toISOString(),
    modalities: Array.isArray(source.modalities) ? source.modalities : [],
    labels: Array.isArray(source.labels) ? source.labels : [],
    moduleLabels: source.moduleLabels && typeof source.moduleLabels === "object" ? source.moduleLabels : {},
    importInstructions: [
      "Recovery: open an IMaios module with the extension panel loaded.",
      "Copy this entire JSON file to the clipboard.",
      "Click Import labels in the IMaios Cine panel.",
      "Then run ChatGPT/RadPrimer automation again; the saved labels will be injected into future prompts."
    ]
  };
}

function countImaiosRepositoryLabels(repository) {
  return Object.values(repository?.moduleLabels || {})
    .reduce((total, module) => total + (Array.isArray(module?.labels) ? module.labels.length : 0), 0);
}

function createImaiosBackupTimestamp(value = new Date()) {
  return value.toISOString().replace(/[:.]/g, "-");
}

function buildImaiosLabelRepositoryRedoPrompt(repository) {
  const backup = normalizeImaiosRepositoryForBackup(repository);
  const modules = Object.values(backup.moduleLabels || {})
    .filter((module) => module && Array.isArray(module.labels) && module.labels.length)
    .sort((a, b) => String(a.name || a.key || "").localeCompare(String(b.name || b.key || "")));
  const moduleCount = modules.length;
  const labelCount = countImaiosRepositoryLabels(backup);
  if (!moduleCount || !labelCount) {
    throw new Error("No saved IMaios module labels are available in extension storage or open IMaios tabs. Open the IMaios module where labels were saved and refresh it, or copy Downloads\\IMAIOSLabelRepository\\imaios_label_repository_latest.json and click Import labels in the IMaios panel.");
  }

  const repositoryBlock = modules.map((module) => [
    `MODULE = ${module.name || module.key || "IMaios module"}`,
    `MODULE_KEY = ${module.key || ""}`,
    module.url ? `URL = ${module.url}` : "",
    "AVAILABLE_LABELS:",
    ...module.labels
  ].filter(Boolean).join("\n")).join("\n\n");

  const promptText = [
    "Redo only the IMaios anatomy label output from this same conversation.",
    "",
    "Use the article/source/images already present above. Do not rewrite the Speechify narrative. Do not regenerate cards. Do not redo the image grouping audit except where needed to preserve chunk context.",
    "",
    "Your task now:",
    "1. Re-infer the anatomy concepts needed for the topic already discussed above.",
    "2. Select exact labels only from the latest IMaios label repository below.",
    "3. If a concept has no exact/synonym/component match, put it in a gap-review block instead of inventing a label.",
    "4. Output separate small IMaios copy-paste code blocks, one teachable chunk per block.",
    "5. If a candidate block becomes large, split it into anatomy-aware subchunks based on the local region rather than arbitrary count alone.",
    "6. Finish with one valid JSON code block with kind `imaios-chunk-library`.",
    "7. Preserve article routing metadata for downstream Anki/live-drill cards: include top-level `breadcrumb`, `deckPath`, and `tags` when the conversation/source provides them, and repeat or refine them on each chunk when a chunk needs more specific routing.",
    "",
    "Anatomy-aware chunk sizing:",
    "- do not group labels merely because they are anatomically related",
    "- each block should be the smallest useful visual learning pass for that region",
    "- prefer 3-7 labels per block, but use anatomy and visual review logic rather than a rigid count",
    "- split blocks over about 8 labels unless the labels form one uninterrupted named chain, pathway, route of spread, or procedural corridor",
    "- choose the split order that makes sense locally: framework first, then spaces or compartments, pathways, small parts, danger landmarks, routes of spread, and variants or mimics",
    "- for temporal bone, natural subchunks may include outer bony framework, mastoid and middle ear air spaces, ossicular chain, otic capsule and labyrinth, facial nerve canal, skull base vascular landmarks, and normal fissures or pseudofracture lines",
    "- if a large region is split, make every subchunk its own human code block and its own JSON chunk",
    "- use chunk titles that show the larger region and the subchunk focus, but keep only actual labels inside the code block",
    "- every JSON chunk must include moduleKey, moduleName, modality, and modalityUrl for the IMaios module its labels come from",
    "- every JSON chunk should include breadcrumb, deckPath, and tags when the parent source or article breadcrumb is known; do not invent unsupported hierarchy when it is not known",
    "- never mix labels from different moduleKeys inside one JSON chunk; split them into separate chunks",
    "",
    "For every JSON label object include:",
    "- concept",
    "- preferredLabel, copied exactly from AVAILABLE_LABELS",
    "- aliases",
    "- matchStatus: exact | synonym-from-repository | component-match | candidate",
    "- status: verified",
    "- moduleKey",
    "- breadcrumb when available",
    "- deckPath when available",
    "- tags when available",
    "- parentGroup when this chunk is a subchunk of a larger anatomical region",
    "- note when useful",
    "",
    "For unmatched concepts include `unmatchedConcepts` in the JSON and a human gap-review code block with:",
    "NEEDED = structure or concept",
    "TRY_LABELS = label 1 | label 2 | label 3",
    "MATCH_STATUS = unmatched | component-match | wrong-modality | needs-other-resource",
    "REASON = why this concept could not be represented by one verified repository label",
    "",
    "=== IMAIOS LABEL REPOSITORY ===",
    `Repository modules: ${moduleCount}`,
    `Repository labels: ${labelCount}`,
    "",
    repositoryBlock
  ].join("\n");

  return {
    promptText,
    moduleCount,
    labelCount
  };
}

async function downloadImaiosLabelRepositoryBackup(repository, options = {}) {
  const backup = normalizeImaiosRepositoryForBackup(repository);
  const moduleCount = Object.keys(backup.moduleLabels || {}).length;
  const labelCount = countImaiosRepositoryLabels(backup);
  if (!moduleCount || !labelCount) {
    throw new Error("No saved IMaios module labels are available to back up.");
  }

  await chrome.storage.local.set({ [IMAIOS_LABEL_REPOSITORY_STORAGE_KEY]: backup });
  const text = JSON.stringify(backup, null, 2);
  const latestFilename = `${IMAIOS_LABEL_REPOSITORY_SUBFOLDER}/imaios_label_repository_latest.json`;
  const timestamp = createImaiosBackupTimestamp();
  const snapshotFilename = `${IMAIOS_LABEL_REPOSITORY_SUBFOLDER}/snapshots/imaios_label_repository_${timestamp}.json`;
  const latestDownloadId = await downloadTextFileToPath(
    latestFilename,
    text,
    "application/json;charset=utf-8"
  );
  let snapshotDownloadId = null;
  if (options.snapshot === true) {
    snapshotDownloadId = await downloadTextFileToPath(
      snapshotFilename,
      text,
      "application/json;charset=utf-8"
    );
  }

  return {
    moduleCount,
    labelCount,
    downloadFolder: `Downloads\\${IMAIOS_LABEL_REPOSITORY_SUBFOLDER}`,
    latestFilename,
    snapshotFilename: options.snapshot === true ? snapshotFilename : "",
    latestDownloadId,
    snapshotDownloadId
  };
}

async function downloadImaiosChunkSessionBackup(library, options = {}) {
  const backup = normalizeImaiosChunkSessionForBackup(library, options);
  const articleFolderName = sanitizeDownloadPathPart(
    backup.articleTitle || backup.topic || "imaios_chunk_session",
    "imaios_chunk_session"
  );
  const text = JSON.stringify(backup, null, 2);
  const timestamp = createImaiosBackupTimestamp();
  const latestFilename = `${IMAIOS_CHUNK_SESSION_SUBFOLDER}/${articleFolderName}/imaios_chunk_session_latest.json`;
  const snapshotFilename = `${IMAIOS_CHUNK_SESSION_SUBFOLDER}/${articleFolderName}/imaios_chunk_session_${timestamp}.json`;
  const latestDownloadId = await downloadTextFileToPath(
    latestFilename,
    text,
    "application/json;charset=utf-8"
  );
  const snapshotDownloadId = await downloadTextFileToPath(
    snapshotFilename,
    text,
    "application/json;charset=utf-8"
  );

  return {
    articleTitle: backup.articleTitle,
    topic: backup.topic,
    chunkCount: backup.chunkCount,
    moduleCount: backup.moduleCount,
    downloadFolder: `Downloads\\${IMAIOS_CHUNK_SESSION_SUBFOLDER.replace(/\//g, "\\")}\\${articleFolderName}`,
    latestFilename,
    snapshotFilename,
    latestDownloadId,
    snapshotDownloadId
  };
}

function normalizeImaiosChunkSessionForBackup(library, options = {}) {
  const source = library && typeof library === "object" ? library : {};
  const chunks = Array.isArray(source.chunks) ? source.chunks : [];
  const articleTitle = cleanArticleTitleText(
    source.articleTitle ||
    source.sourceTitle ||
    source.topic ||
    source.title ||
    source.name ||
    options.articleTitle ||
    options.topic ||
    "IMAIOS chunk session"
  );
  const moduleMap = new Map();
  for (const chunk of chunks) {
    const key = String(chunk?.moduleKey || chunk?.targetModuleKey || chunk?.imaiosModuleKey || "").trim()
      || deriveImaiosModuleKeyFromUrl(chunk?.modalityUrl || chunk?.moduleUrl || chunk?.url || "");
    const name = String(chunk?.moduleName || chunk?.targetModuleName || chunk?.modality || key || "Unspecified module").trim();
    const url = String(chunk?.modalityUrl || chunk?.moduleUrl || chunk?.targetModuleUrl || chunk?.url || "").trim();
    const mapKey = key || name;
    if (!moduleMap.has(mapKey)) {
      moduleMap.set(mapKey, { key, name, url, chunkCount: 0 });
    }
    moduleMap.get(mapKey).chunkCount += 1;
    if (!moduleMap.get(mapKey).url && url) moduleMap.get(mapKey).url = url;
  }

  return {
    kind: "imaios-chunk-session-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    articleTitle,
    topic: String(source.topic || articleTitle || "").trim(),
    source: String(source.source || options.source || "").trim(),
    page: options.page || {},
    chunkCount: chunks.length,
    moduleCount: moduleMap.size,
    modules: Array.from(moduleMap.values()),
    library: source
  };
}

function deriveImaiosModuleKeyFromUrl(url) {
  const text = String(url || "").trim();
  if (!text) return "";
  try {
    const parsed = new URL(text);
    return parsed.pathname
      .replace(/^\/[a-z]{2}\//i, "/")
      .replace(/^\/e-anatomy\//i, "")
      .replace(/^\/+|\/+$/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  } catch (_error) {
    return "";
  }
}

function cleanArticleTitleText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^Document:\s*/i, "")
    .replace(/\s*\|\s*STATdx.*$/i, "")
    .trim();
}

async function extractArticleTitleFromTab(tab) {
  assertSupportedArticleTab(tab);
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const clean = (text) => String(text || "").replace(/\s+/g, " ").trim();
        const titleFromImageParams = (selector) => {
          const raw = document.querySelector(selector)?.getAttribute("imageparams") || "";
          if (!raw) return "";
          const query = raw.startsWith("?") ? raw.slice(1) : raw;
          return clean(new URLSearchParams(query).get("parentTitle") || "");
        };
        const candidates = location.hostname.includes("statdx")
          ? [
              document.querySelector(".document-header__document-title")?.textContent,
              document.querySelector("h1")?.textContent,
              document.querySelector("head > title")?.textContent
            ]
          : [
              document.querySelector("h1.document-name-js.page-heading-js")?.textContent,
              document.querySelector("#content .page-heading h1")?.textContent,
              document.querySelector(".page-heading h1")?.textContent,
              document.querySelector("head > title")?.textContent,
              titleFromImageParams("#focusImageData"),
              titleFromImageParams("#imageData")
            ];
        for (let title of candidates) {
          title = clean(title)
            .replace(/^Document:\s*/i, "")
            .replace(/\s*\|\s*STATdx.*$/i, "")
            .trim();
          if (title) return title;
        }
        return "";
      }
    });
    const title = cleanArticleTitleText(results?.[0]?.result || "");
    if (title) return title;
  } catch {}
  return cleanArticleTitleText(tab.title || "");
}

async function findOpenCompanionArticleTabs(tab) {
  const currentSource = assertSupportedArticleTab(tab);
  const companionKind = currentSource.kind === "radprimer" ? "statdx" : "radprimer";
  const companionSource = getArticleSourceForKind(companionKind);
  const tabs = await chrome.tabs.query({ url: [companionSource.tabUrlPattern] });
  return tabs
    .filter((candidate) => candidate.id && candidate.id !== tab.id)
    .sort((a, b) => {
      const aSameWindow = a.windowId === tab.windowId ? 1 : 0;
      const bSameWindow = b.windowId === tab.windowId ? 1 : 0;
      if (aSameWindow !== bSameWindow) return bSameWindow - aSameWindow;
      if (a.active !== b.active) return a.active ? -1 : 1;
      return (b.lastAccessed || 0) - (a.lastAccessed || 0);
    });
}

function getDownloadBasename(filename) {
  const raw = String(filename || "radprimer-image.jpg").trim();
  const base = raw.split(/[\\/]/).pop() || "radprimer-image.jpg";
  return base.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

function getStagedDownloadFilename(filename, subfolder = IMAGE_DOWNLOAD_SUBFOLDER) {
  return `${subfolder}/${getDownloadBasename(filename)}`;
}

function getSourceFilenameLabel(sourceKind, sourceLabel) {
  const kind = normalizeArticleSourceKind(sourceKind || sourceLabel);
  if (kind === "statdx") return "STATdx";
  if (kind === "radprimer") return "RadPrimer";
  return sanitizeDownloadPathPart(sourceLabel || sourceKind || "Source", "Source");
}

function buildSourceQualifiedImageFilename(file = {}) {
  const base = getDownloadBasename(file.filename || file.plainFilename || file.annotatedFilename || "image.jpg");
  const masterImageId = sanitizeDownloadPathPart(file.masterImageId || "", "");
  const sourceLabel = getSourceFilenameLabel(file.sourceKind, file.sourceLabel);
  const variant = file.variant === "annotated" ? "annotated" : file.variant === "plain" ? "plain" : "";
  const prefix = [masterImageId, sourceLabel, variant].filter(Boolean).join("_");
  if (!prefix) return base;
  if (base.toLowerCase().startsWith(prefix.toLowerCase())) return base;
  return `${prefix}_${base}`;
}

function normalizeDownloadUrl(url) {
  try {
    const parsed = new URL(String(url || ""));
    parsed.hash = "";
    return parsed.href;
  } catch {
    return String(url || "");
  }
}

function isDownloadInSubfolder(item, subfolder) {
  const filename = String(item?.filename || "").replace(/\//g, "\\").toLowerCase();
  const normalizedSubfolder = String(subfolder || "")
    .replace(/\//g, "\\")
    .toLowerCase()
    .replace(/^\\+|\\+$/g, "");
  return Boolean(normalizedSubfolder) && filename.includes(`\\downloads\\${normalizedSubfolder}\\`);
}

function isRadPrimerStagedDownload(item) {
  return isDownloadInSubfolder(item, IMAGE_DOWNLOAD_SUBFOLDER);
}

async function clearDownloadSubfolder(subfolder) {
  const items = await chrome.downloads.search({});
  const staged = items.filter((item) => isDownloadInSubfolder(item, subfolder));
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

async function clearRadPrimerDownloadFolder() {
  return clearDownloadSubfolder(IMAGE_DOWNLOAD_SUBFOLDER);
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

function getCardAuditGeneratedCardsPath(folderName) {
  return `${CARD_AUDIT_SUBFOLDER}/${folderName}/generated_cards.tsv`;
}

function isLikelyChatGptGeneratedDownload(item) {
  const url = String(item?.url || "").toLowerCase();
  const finalUrl = String(item?.finalUrl || "").toLowerCase();
  const filename = String(item?.filename || "").toLowerCase();
  const mime = String(item?.mime || "").toLowerCase();
  const referrer = String(item?.referrer || "").toLowerCase();

  if (url.includes("chatgpt.com") || url.includes("chat.openai.com")) return true;
  if (finalUrl.includes("chatgpt.com") || finalUrl.includes("chat.openai.com")) return true;
  if (referrer.includes("chatgpt.com") || referrer.includes("chat.openai.com")) return true;
  if (url.includes("/mnt/data/") || finalUrl.includes("/mnt/data/")) return true;
  if (url.includes("sandbox:") || finalUrl.includes("sandbox:")) return true;
  if (url.startsWith("blob:") && url.includes("chatgpt")) return true;
  if (filename.endsWith(".tsv") || filename.includes("tsv")) return true;
  if (mime.includes("tab-separated") || mime.includes("text/tab") || mime.includes("text/plain")) {
    return true;
  }
  return false;
}

function downloadItemSnapshot(item) {
  return {
    id: item?.id || null,
    url: item?.url || "",
    finalUrl: item?.finalUrl || "",
    filename: item?.filename || "",
    mime: item?.mime || "",
    referrer: item?.referrer || "",
    tabId: item?.tabId ?? null,
    byExtensionId: item?.byExtensionId || "",
    likelyChatGptGeneratedDownload: isLikelyChatGptGeneratedDownload(item)
  };
}

function isActiveCardAuditDownloadCandidate(downloadItem, active = activeCardAuditDownload) {
  if (!active || Date.now() > active.expiresAt) return false;
  if (downloadItem?.byExtensionId === chrome.runtime.id) return false;

  const itemTabId = Number(downloadItem?.tabId);
  const activeTabId = Number(active.chatGptTabId);
  if (active.chatGptTabId && Number.isFinite(itemTabId) && itemTabId === activeTabId) {
    return true;
  }

  return isLikelyChatGptGeneratedDownload(downloadItem);
}

function handleCardAuditDownloadFilename(downloadItem, suggest) {
  const normalizedDownloadUrl = normalizeDownloadUrl(downloadItem?.url);
  const textIndex = pendingTextDownloadFilenames.findIndex(
    (entry) => entry.url === normalizedDownloadUrl
  );
  const extensionTextIndex =
    textIndex >= 0
      ? textIndex
      : downloadItem?.byExtensionId === chrome.runtime.id && pendingTextDownloadFilenames.length
        ? 0
        : -1;
  if (extensionTextIndex >= 0) {
    suggest({
      filename: pendingTextDownloadFilenames[extensionTextIndex].filename,
      conflictAction: "overwrite"
    });
    return;
  }

  const imageFilename = pendingImageDownloadFilenames.get(normalizeDownloadUrl(downloadItem?.url));
  if (imageFilename) {
    suggest({
      filename: imageFilename,
      conflictAction: "overwrite"
    });
    return;
  }

  const active = activeCardAuditDownload;
  if (!active || Date.now() > active.expiresAt) return;
  if (active.downloadId && active.downloadId !== downloadItem.id) return;
  if (!isActiveCardAuditDownloadCandidate(downloadItem, active)) return;

  active.downloadId = downloadItem.id;
  active.originalDownload = downloadItemSnapshot(downloadItem);

  suggest({
    filename: getCardAuditGeneratedCardsPath(active.folderName),
    conflictAction: "overwrite"
  });
}

if (chrome.downloads?.onDeterminingFilename) {
  chrome.downloads.onDeterminingFilename.addListener(handleCardAuditDownloadFilename);
}

function handleCardAuditDownloadCreated(downloadItem) {
  const active = activeCardAuditDownload;
  if (!active || active.downloadId || Date.now() > active.expiresAt) return;
  if (!isActiveCardAuditDownloadCandidate(downloadItem, active)) return;

  active.downloadId = downloadItem.id;
  active.originalDownload = downloadItemSnapshot(downloadItem);
}

if (chrome.downloads?.onCreated) {
  chrome.downloads.onCreated.addListener(handleCardAuditDownloadCreated);
}

async function downloadSelectedImages(files, settings = {}, options = {}) {
  if (activeCardAuditDownload && !activeCardAuditDownload.downloadId) {
    activeCardAuditDownload = null;
  }

  const list = Array.isArray(files) ? files.filter((file) => file?.url && file?.filename) : [];
  const subfolder = options.subfolder || IMAGE_DOWNLOAD_SUBFOLDER;
  const clearSubfolder = options.clearSubfolder || subfolder;
  const result = {
    count: 0,
    clearedCount: 0,
    subfolder,
    downloads: []
  };

  if (!list.length) return result;

  if (options.clear !== false) {
    result.clearedCount = await clearDownloadSubfolder(clearSubfolder);
  }

  for (const file of list) {
    const stagedFilename = getStagedDownloadFilename(file.filename, subfolder);
    const normalizedUrl = normalizeDownloadUrl(file.url);
    pendingImageDownloadFilenames.set(normalizedUrl, stagedFilename);
    const downloadId = await chrome.downloads.download({
      url: file.url,
      filename: stagedFilename,
      conflictAction: "overwrite",
      saveAs: false
    });
    let completedItem = null;
    try {
      completedItem = await waitForDownloadComplete(downloadId);
    } finally {
      pendingImageDownloadFilenames.delete(normalizedUrl);
    }
    result.count += 1;
    result.downloads.push({
      ...file,
      requestedFilename: file.filename,
      stagedFilename,
      downloadedFilename: completedItem?.filename || stagedFilename,
      downloadId,
      state: completedItem?.state || ""
    });
    await sleep(100);
  }

  return result;
}

function describeImageDownloadResult(result) {
  const pieces = [
    `Downloaded ${result.count || 0} image file(s) to Downloads\\${result.subfolder || IMAGE_DOWNLOAD_SUBFOLDER}.`
  ];
  if (result.clearedCount) {
    pieces.push(`Cleared ${result.clearedCount} previous staged file(s).`);
  }
  return pieces.join(" ");
}

function padQueueIndex(value) {
  return String(value || 0).padStart(2, "0");
}

function getFileImageNumber(file = {}, fallback = 0) {
  const candidates = [
    file.imageNumber,
    file.sourceImageNumber,
    file.sourceNumber,
    file.originalIndex
  ];
  for (const candidate of candidates) {
    const number = Number(candidate);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return fallback;
}

function getQueueImageBaseName(file = {}) {
  if (file.baseName) return String(file.baseName);
  const name = getDownloadBasename(file.requestedFilename || file.filename || "");
  return name.replace(/_annot(?=\.[^.]+$)/i, "").replace(/\.[^.]+$/, "") || "image";
}

function findDownloadedFileForQueue(downloads = [], sourceNumber, variant) {
  const number = Number(sourceNumber);
  return downloads.find((file) => {
    if (variant && file.variant !== variant) return false;
    return getFileImageNumber(file) === number;
  }) || null;
}

function buildIoQueuePayload(extraction, downloadResult = {}) {
  const meta = extraction?.meta || {};
  const downloads = Array.isArray(downloadResult.downloads) ? downloadResult.downloads : [];
  const downloadedNumbers = [
    ...new Set(downloads.map((file, index) => getFileImageNumber(file, index + 1)).filter(Boolean))
  ];
  const rawGroups = Array.isArray(meta.cases) && meta.cases.length
    ? meta.cases
    : (Array.isArray(meta.selectedImages) && meta.selectedImages.length
      ? meta.selectedImages.map((number) => [number])
      : downloadedNumbers.map((number) => [number]));
  const groups = rawGroups
    .map((group) => (Array.isArray(group) ? group : [group])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0))
    .filter((group) => group.length);

  const items = [];
  groups.forEach((group, groupIndex) => {
    const blockKind = group.length > 1 ? "CASE" : "IMAGE";
    const blockIndex = groupIndex + 1;
    const blockLabel = `${blockKind}_${padQueueIndex(blockIndex)}`;

    group.forEach((sourceNumber, itemIndex) => {
      const plain = findDownloadedFileForQueue(downloads, sourceNumber, "plain");
      const annotated = findDownloadedFileForQueue(downloads, sourceNumber, "annotated");
      const file = annotated || plain || downloads.find((entry) => getFileImageNumber(entry) === sourceNumber) || null;
      if (!file) return;

      const imageFilename = plain ? getDownloadBasename(plain.requestedFilename || plain.filename) : "";
      const annotatedFilename = annotated ? getDownloadBasename(annotated.requestedFilename || annotated.filename) : "";
      const imagePath = plain?.downloadedFilename || "";
      const annotatedPath = annotated?.downloadedFilename || "";

      items.push({
        queue_id: `${blockLabel}:${sourceNumber || itemIndex + 1}`,
        article_title: meta.title || "",
        topic: meta.title || "",
        block_label: blockLabel,
        block_kind: blockKind,
        block_index: blockIndex,
        group_numbers: group,
        source_number: sourceNumber || itemIndex + 1,
        base_name: getQueueImageBaseName(file),
        image_filename: imageFilename,
        annotated_filename: annotatedFilename,
        caption: file.caption || "",
        image_path: imagePath,
        annotated_path: annotatedPath,
        preferred_path: annotatedPath || imagePath,
        status: "pending",
        notes: ""
      });
    });
  });

  return {
    article_title: meta.title || "",
    topic: meta.title || "",
    total_items: items.length,
    items
  };
}

async function downloadIoQueueFiles(extraction, downloadResult) {
  const queue = buildIoQueuePayload(extraction, downloadResult);
  if (!queue.items.length) {
    throw new Error("No Image Occlusion queue items could be built from the downloaded image set.");
  }

  await downloadTextFileToPath(
    `${IO_QUEUE_SUBFOLDER}/source_package.txt`,
    extraction.output || "",
    "text/plain;charset=utf-8"
  );
  await downloadTextFileToPath(
    `${IO_QUEUE_SUBFOLDER}/queue.json`,
    JSON.stringify(queue, null, 2),
    "application/json;charset=utf-8"
  );

  return queue;
}

function sanitizeDownloadPathPart(value, fallback = "radprimer") {
  const text = String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);

  return (text || fallback)
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

function buildSourceCompareDownloadPlan(title, sourceLabel, folderLabel = "") {
  const articlePart = sanitizeDownloadPathPart(title, "radiology_source");
  const folderPart = sanitizeDownloadPathPart(folderLabel || title, "radiology_source");
  const sourcePart = sanitizeDownloadPathPart(sourceLabel, "source");
  return {
    articleFolderName: folderPart,
    fileBaseName: `${sourcePart}_${articlePart}`
  };
}

function getSourceImageShortPrefix(sourceKind, sourceLabel) {
  const kind = normalizeSourceCompareKind(sourceKind, sourceLabel);
  if (kind === "statdx") return "SDX";
  if (kind === "radprimer") return "RP";
  return "SRC";
}

function getSourceImageMasterId(sourceKind, sourceLabel, sourceImageNumber) {
  const number = Number(sourceImageNumber);
  const suffix = Number.isFinite(number) && number > 0 ? String(number).padStart(2, "0") : "00";
  return `${getSourceImageShortPrefix(sourceKind, sourceLabel)}-${suffix}`;
}

function getImageEvidenceExtension(value, fallbackUrl = "") {
  const raw = `${value || ""} ${fallbackUrl || ""}`.toLowerCase();
  const match = raw.match(/\.(jpe?g|png|webp|gif|bmp|tiff?)(?:[\s?#]|$)/i);
  if (!match) return "jpg";
  const ext = match[1].toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

function buildImageEvidenceFilename(entry = {}, variant = "plain") {
  const sourceImageNumber = Number(entry.sourceImageNumber ?? entry.imageNumber);
  const masterImageId =
    entry.masterImageId ||
    getSourceImageMasterId(entry.sourceKind, entry.sourceLabel, sourceImageNumber);
  const sourceLabel = getSourceFilenameLabel(entry.sourceKind, entry.sourceLabel);
  const numberPart =
    Number.isFinite(sourceImageNumber) && sourceImageNumber > 0
      ? `image_${String(sourceImageNumber).padStart(2, "0")}`
      : "image";
  const imageId = String(entry.imageId || "").replace(/[^a-z0-9-]/gi, "");
  const imageIdPart = imageId ? imageId.slice(0, 8) : "";
  const ext = getImageEvidenceExtension(
    variant === "annotated" ? entry.annotatedFilename || entry.filename : entry.plainFilename || entry.filename,
    variant === "annotated" ? entry.annotatedUrl || entry.url : entry.plainUrl || entry.url
  );
  return [masterImageId, sourceLabel, numberPart, variant, imageIdPart]
    .filter(Boolean)
    .map((part) => sanitizeDownloadPathPart(part, "image"))
    .join("_")
    .concat(`.${ext}`);
}

function buildImageEvidenceManifest(imageRegistry = [], evidenceFolderName = IMAGE_EVIDENCE_SUBFOLDER) {
  return (Array.isArray(imageRegistry) ? imageRegistry : [])
    .map((entry, index) => normalizeImageRegistryEntry(entry, { index: index + 1 }))
    .map((entry) => {
      const variant = entry.plainUrl ? "plain" : entry.annotatedUrl ? "annotated" : "";
      const evidenceUrl = variant === "annotated" ? entry.annotatedUrl : entry.plainUrl;
      const evidenceFilename = variant
        ? `${evidenceFolderName}/${buildImageEvidenceFilename(entry, variant)}`
        : "";
      return {
        masterImageId: entry.masterImageId,
        sourceKind: entry.sourceKind,
        sourceLabel: entry.sourceLabel,
        sourceImageNumber: entry.sourceImageNumber,
        imageId: entry.imageId || "",
        baseName: entry.baseName || "",
        caption: entry.caption || "",
        evidenceVariant: variant,
        evidenceUrl,
        evidenceFilename,
        duplicateEvidenceRole:
          "Use this plain/unannotated preview for visual duplicate classification before archiving any image.",
        downloaded: false,
        downloadError: ""
      };
    })
    .filter((entry) => entry.evidenceUrl && entry.evidenceFilename);
}

function attachImageEvidenceToRegistry(imageRegistry = [], evidenceEntries = []) {
  const byId = new Map(
    (Array.isArray(evidenceEntries) ? evidenceEntries : []).map((entry) => [entry.masterImageId, entry])
  );
  return (Array.isArray(imageRegistry) ? imageRegistry : []).map((entry, index) => {
    const normalized = normalizeImageRegistryEntry(entry, { index: index + 1 });
    const evidence = byId.get(normalized.masterImageId);
    if (!evidence) return normalized;
    return {
      ...normalized,
      visualEvidence: {
        evidenceFilename: evidence.evidenceFilename,
        evidenceVariant: evidence.evidenceVariant,
        evidenceUrl: evidence.evidenceUrl,
        downloaded: Boolean(evidence.downloaded),
        downloadError: evidence.downloadError || "",
        duplicateEvidenceRole: evidence.duplicateEvidenceRole
      }
    };
  });
}

function buildImageEvidenceBlock(entries = [], folder = IMAGE_EVIDENCE_SUBFOLDER) {
  const list = Array.isArray(entries) ? entries : [];
  return {
    folder,
    purpose:
      "Visual evidence for duplicate detection. Use these image files before deciding that source images are exact duplicates.",
    duplicateClassificationRule:
      "Archive only images proven to be exact/same-slice/same-screenshot duplicates or unusable. Caption-only similarity is not enough; uncertain or merely similar images stay primary as recognition reinforcement.",
    entries: list
  };
}

async function downloadUrlToPath(url, relativeFilename, timeoutMs = 120000) {
  const normalizedUrl = normalizeDownloadUrl(url);
  pendingImageDownloadFilenames.set(normalizedUrl, relativeFilename);
  try {
    const downloadId = await chrome.downloads.download({
      url,
      filename: relativeFilename,
      conflictAction: "overwrite",
      saveAs: false
    });
    await waitForDownloadComplete(downloadId, timeoutMs);
    return downloadId;
  } finally {
    pendingImageDownloadFilenames.delete(normalizedUrl);
  }
}

async function downloadImageEvidenceFiles(rootSubfolder, folderName, evidenceEntries = []) {
  const list = Array.isArray(evidenceEntries) ? evidenceEntries : [];
  for (const entry of list) {
    if (!entry.evidenceUrl || !entry.evidenceFilename) continue;
    const relativeFilename = `${rootSubfolder}/${folderName}/${entry.evidenceFilename}`;
    try {
      await downloadUrlToPath(entry.evidenceUrl, relativeFilename, 150000);
      entry.downloaded = true;
      entry.downloadError = "";
    } catch (error) {
      entry.downloaded = false;
      entry.downloadError = String(error?.message || error);
    }
    await sleep(75);
  }
  return list;
}

function normalizeSourceCompareKind(sourceKind, sourceLabel) {
  const raw = `${sourceKind || ""} ${sourceLabel || ""}`.toLowerCase();
  if (raw.includes("statdx") || raw.includes("stat dx")) return "statdx";
  if (raw.includes("radprimer") || raw.includes("rad primer")) return "radprimer";
  return sanitizeDownloadPathPart(sourceLabel || sourceKind || "source", "source").toLowerCase();
}

function sourceCompareDisplayLabel(source) {
  if (!source) return "Source";
  if (source.sourceKind === "radprimer") return "RadPrimer";
  if (source.sourceKind === "statdx") return "STATdx";
  return source.sourceLabel || source.primarySourceLabel || "Source";
}

const SOURCE_COMPARE_TITLE_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "case",
  "cases",
  "diagnosis",
  "disease",
  "for",
  "imaging",
  "in",
  "of",
  "on",
  "radprimer",
  "statdx",
  "the",
  "to",
  "with"
]);

const SOURCE_COMPARE_TOKEN_ALIASES = new Map([
  ["aortic", "aorta"],
  ["arterial", "artery"],
  ["arteries", "artery"],
  ["calcaneal", "calcaneus"],
  ["fractures", "fracture"],
  ["injuries", "trauma"],
  ["injury", "trauma"],
  ["lesions", "lesion"],
  ["neoplasms", "neoplasm"],
  ["splenic", "spleen"],
  ["traumatic", "trauma"],
  ["tumors", "tumor"],
  ["vascular", "vessel"]
]);

function getSourcePairingKey(title, settings = {}) {
  const manualKey = String(settings?.sourcePairingKey || "").trim();
  return normalizeArticleTitleKey(manualKey || title);
}

function getSourceCompareCacheKey(title, settings = {}) {
  const key = getSourcePairingKey(title, settings);
  return key ? `${SOURCE_COMPARE_CACHE_PREFIX}${key}` : "";
}

function getSourceCompareCacheKeyFromPairingKey(pairingKey) {
  const key = normalizeArticleTitleKey(pairingKey);
  return key ? `${SOURCE_COMPARE_CACHE_PREFIX}${key}` : "";
}

function uniqueSourceCompareStrings(values) {
  const seen = new Set();
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = normalizeArticleTitleKey(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeSourceCompareTitleToken(token) {
  const raw = String(token || "").toLowerCase();
  if (!raw || SOURCE_COMPARE_TITLE_STOPWORDS.has(raw)) return "";
  if (SOURCE_COMPARE_TOKEN_ALIASES.has(raw)) return SOURCE_COMPARE_TOKEN_ALIASES.get(raw);
  if (raw.endsWith("ies") && raw.length > 4) return `${raw.slice(0, -3)}y`;
  if (raw.endsWith("s") && raw.length > 4) return raw.slice(0, -1);
  return raw;
}

function getComparableTitleTokens(value) {
  return normalizeArticleTitleKey(value)
    .split("_")
    .map(normalizeSourceCompareTitleToken)
    .filter(Boolean);
}

function scoreSourceCompareTitleSimilarity(left, right) {
  const leftKey = normalizeArticleTitleKey(left);
  const rightKey = normalizeArticleTitleKey(right);
  if (!leftKey || !rightKey) return 0;
  if (leftKey === rightKey) return 1;

  const leftTokens = new Set(getComparableTitleTokens(left));
  const rightTokens = new Set(getComparableTitleTokens(right));
  if (!leftTokens.size || !rightTokens.size) return 0;

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size || 1;
  const jaccard = intersection / union;
  const containment = intersection / Math.min(leftTokens.size, rightTokens.size);
  let score = Math.max(jaccard, containment * 0.84);

  if (leftKey.includes(rightKey) || rightKey.includes(leftKey)) score = Math.max(score, 0.92);
  return Math.min(score, 1);
}

function getSourceCompareTitleCandidates(cache) {
  const sources = Object.values(cache?.sources || {});
  return uniqueSourceCompareStrings([
    cache?.articleTitle,
    ...(Array.isArray(cache?.articleTitles) ? cache.articleTitles : []),
    ...sources.flatMap((source) => [
      source.articleTitle,
      source.metadata?.articleTitle,
      source.metadata?.title,
      source.metadata?.primaryTopic,
      source.metadata?.workingTopic,
      ...(Array.isArray(source.metadata?.breadcrumbTrail) ? source.metadata.breadcrumbTrail.slice(-2) : [])
    ])
  ]);
}

function scoreSourceCompareCacheForTitle(cache, title) {
  return getSourceCompareTitleCandidates(cache).reduce(
    (best, candidate) => Math.max(best, scoreSourceCompareTitleSimilarity(title, candidate)),
    0
  );
}

function getSourceCompareCacheSourceKinds(cache) {
  return new Set(Object.keys(cache?.sources || {}).filter(Boolean));
}

function hasUsefulSourceForPairing(candidateCache, currentCache) {
  const currentKinds = getSourceCompareCacheSourceKinds(currentCache);
  return Object.keys(candidateCache?.sources || {}).some((kind) => !currentKinds.has(kind));
}

function mergeSourceCompareCaches(primaryCache = {}, secondaryCache = {}, matchInfo = null) {
  return {
    ...secondaryCache,
    ...primaryCache,
    sources: {
      ...(secondaryCache.sources || {}),
      ...(primaryCache.sources || {})
    },
    articleTitle: primaryCache.articleTitle || secondaryCache.articleTitle || "",
    titleKey: primaryCache.titleKey || secondaryCache.titleKey || "",
    sourcePairingKey: primaryCache.sourcePairingKey || secondaryCache.sourcePairingKey || "",
    articleTitles: uniqueSourceCompareStrings([
      primaryCache.articleTitle,
      secondaryCache.articleTitle,
      ...(Array.isArray(primaryCache.articleTitles) ? primaryCache.articleTitles : []),
      ...(Array.isArray(secondaryCache.articleTitles) ? secondaryCache.articleTitles : []),
      ...getSourceCompareTitleCandidates(primaryCache),
      ...getSourceCompareTitleCandidates(secondaryCache)
    ]),
    updatedAt: new Date().toISOString(),
    fuzzyMatchedSourceCompare: matchInfo || primaryCache.fuzzyMatchedSourceCompare || null
  };
}

async function getAllSourceCompareCaches() {
  const stored = await chrome.storage.local.get(null);
  return Object.entries(stored)
    .filter(([key, value]) => key.startsWith(SOURCE_COMPARE_CACHE_PREFIX) && value?.sources)
    .map(([key, cache]) => ({ key, cache }));
}

async function findBestSourceCompareCacheMatch({ title, currentCache, currentKey }) {
  const currentKinds = getSourceCompareCacheSourceKinds(currentCache);
  const scored = (await getAllSourceCompareCaches())
    .filter(({ key, cache }) => key !== currentKey && hasUsefulSourceForPairing(cache, currentCache))
    .map(({ key, cache }) => ({
      key,
      cache,
      score: scoreSourceCompareCacheForTitle(cache, title),
      titles: getSourceCompareTitleCandidates(cache),
      sourceKinds: [...getSourceCompareCacheSourceKinds(cache)]
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0] || null;
  const second = scored[1] || null;
  if (!best) return { match: null, candidates: scored.slice(0, 4) };

  const decisiveEnough = best.score >= 0.88 || !second || best.score - second.score >= 0.08;
  const hasNeededSource = best.sourceKinds.some((kind) => !currentKinds.has(kind));
  if (best.score >= 0.64 && decisiveEnough && hasNeededSource) {
    return { match: best, candidates: scored.slice(0, 4) };
  }

  return { match: null, candidates: scored.slice(0, 4) };
}

function summarizeCachedComparisonSources(cache) {
  const sources = Object.values(cache?.sources || {});
  if (!sources.length) return "No comparison sources cached yet.";
  return sources
    .map((source) => `${sourceCompareDisplayLabel(source)} (${source.cachedAt || "cached"})`)
    .join(", ");
}

async function cacheSourceCompareBundle({ pending, bundle }) {
  const metadata = bundle?.metadata || {};
  const title = metadata.articleTitle || pending?.articleTitle || pending?.extractionMeta?.title || "";
  const sourcePairingKey = getSourcePairingKey(title, pending?.settings || {});
  const key = getSourceCompareCacheKeyFromPairingKey(sourcePairingKey);
  if (!key) return null;

  const sourceKind = normalizeSourceCompareKind(
    metadata.sourceKind || pending?.extractionMeta?.sourceKind,
    metadata.sourceLabel || metadata.primarySourceLabel || pending?.extractionMeta?.primarySourceLabel
  );
  const sourceLabel = metadata.sourceLabel || metadata.primarySourceLabel || sourceKind;
  const stored = await chrome.storage.local.get(key);
  const cache = stored[key] || {
    articleTitle: title,
    titleKey: normalizeArticleTitleKey(title),
    sourcePairingKey,
    articleTitles: [],
    createdAt: new Date().toISOString(),
    sources: {}
  };

  cache.articleTitle = cache.articleTitle || title;
  cache.titleKey = cache.titleKey || normalizeArticleTitleKey(title);
  cache.sourcePairingKey = cache.sourcePairingKey || sourcePairingKey;
  cache.articleTitles = uniqueSourceCompareStrings([
    ...(Array.isArray(cache.articleTitles) ? cache.articleTitles : []),
    cache.articleTitle,
    title,
    metadata.articleTitle,
    metadata.title,
    metadata.primaryTopic,
    metadata.workingTopic,
    ...(Array.isArray(metadata.breadcrumbTrail) ? metadata.breadcrumbTrail.slice(-2) : [])
  ]);
  cache.updatedAt = new Date().toISOString();
  cache.sources = {
    ...(cache.sources || {}),
    [sourceKind]: {
      sourceKind,
      sourceLabel,
      primarySourceLabel: metadata.primarySourceLabel || sourceLabel,
      articleTitle: title,
      sourcePairingKey,
      sourceUrl: metadata.sourceUrl || pending?.radPrimerUrl || "",
      sourcePackage: pending?.sourcePackage || "",
      metadata,
      imageRegistry: Array.isArray(metadata.imageRegistry) ? metadata.imageRegistry : buildSourceImageRegistryFromPending(pending),
      downloadFiles: Array.isArray(metadata.downloadFiles) ? metadata.downloadFiles : pending?.downloadFiles || [],
      files: bundle?.files || {},
      downloadFolder: bundle?.downloadFolder || "",
      fileBaseName: bundle?.fileBaseName || "",
      cachedAt: new Date().toISOString(),
      outputChars: String(pending?.sourcePackage || "").length
    }
  };

  await chrome.storage.local.set({ [key]: cache });
  return cache;
}

async function getSourceCompareCache(title, settings = {}) {
  const key = getSourceCompareCacheKey(title, settings);
  if (!key) return null;
  const stored = await chrome.storage.local.get(key);
  return stored[key] || null;
}

async function getSourceCompareCacheByPairingKey(pairingKey) {
  const key = getSourceCompareCacheKeyFromPairingKey(pairingKey);
  if (!key) return null;
  const stored = await chrome.storage.local.get(key);
  return stored[key] || null;
}

function getMasterSourcePairFromCache(cache) {
  const sources = cache?.sources || {};
  const radPrimer = sources.radprimer || null;
  const statdx = sources.statdx || null;
  if (radPrimer && statdx) return [radPrimer, statdx];
  return [];
}

function buildMasterSourceDownloadPlan(title) {
  const articlePart = sanitizeDownloadPathPart(title, "radiology_master_source");
  return {
    articleFolderName: articlePart,
    fileBaseName: `MasterSource_${articlePart}`
  };
}

function getMasterSourceCacheKey(title) {
  const key = normalizeArticleTitleKey(title);
  return key ? `${MASTER_SOURCE_CACHE_PREFIX}${key}` : "";
}

function normalizeImageRegistrySourceKind(sourceKind, sourceLabel) {
  return normalizeSourceCompareKind(sourceKind, sourceLabel);
}

function normalizeImageRegistryEntry(entry = {}, fallback = {}) {
  const sourceKind = normalizeImageRegistrySourceKind(
    entry.sourceKind || entry.source || fallback.sourceKind,
    entry.sourceLabel || fallback.sourceLabel
  );
  const sourceLabel =
    entry.sourceLabel ||
    entry.source ||
    fallback.sourceLabel ||
    (sourceKind === "statdx" ? "STATdx" : sourceKind === "radprimer" ? "RadPrimer" : "Source");
  const sourceImageNumber = Number(
    entry.sourceImageNumber ?? entry.imageNumber ?? entry.originalIndex ?? fallback.imageNumber
  );
  const masterImageId =
    entry.masterImageId ||
    entry.masterId ||
    `${sourceKind === "statdx" ? "SDX" : sourceKind === "radprimer" ? "RP" : "SRC"}-${String(
      Number.isFinite(sourceImageNumber) ? sourceImageNumber : fallback.index || 0
    ).padStart(2, "0")}`;

  return {
    ...entry,
    masterImageId,
    sourceKind,
    sourceLabel,
    sourceImageNumber: Number.isFinite(sourceImageNumber) ? sourceImageNumber : null,
    filename: entry.filename || entry.plainFilename || fallback.filename || "",
    plainFilename: entry.plainFilename || (entry.variant === "plain" ? entry.filename : "") || fallback.plainFilename || "",
    annotatedFilename:
      entry.annotatedFilename ||
      entry.annotFilename ||
      (entry.variant === "annotated" ? entry.filename : "") ||
      fallback.annotatedFilename ||
      "",
    plainUrl: entry.plainUrl || (entry.variant === "plain" ? entry.url : "") || fallback.plainUrl || "",
    annotatedUrl:
      entry.annotatedUrl ||
      entry.annotUrl ||
      (entry.variant === "annotated" ? entry.url : "") ||
      fallback.annotatedUrl ||
      "",
    caption: entry.caption || fallback.caption || "",
    baseName: entry.baseName || fallback.baseName || "",
    group: entry.group || fallback.group || "",
    usedFor: Array.isArray(entry.usedFor) ? entry.usedFor : fallback.usedFor || [],
    downloadRecommendation: entry.downloadRecommendation || fallback.downloadRecommendation || ""
  };
}

function buildSourceImageRegistryFromPending(pending = {}) {
  const files = Array.isArray(pending.downloadFiles) ? pending.downloadFiles : [];
  const sourceKind = pending.extractionMeta?.sourceKind || "";
  const sourceLabel = pending.extractionMeta?.primarySourceLabel || pending.extractionMeta?.sourceLabel || "";
  const byKey = new Map();

  for (const file of files) {
    const imageNumber = Number(file.imageNumber);
    const key = `${file.sourceKind || sourceKind || "source"}:${Number.isFinite(imageNumber) ? imageNumber : file.baseName || file.filename}`;
    const previous = byKey.get(key) || {};
    const next = normalizeImageRegistryEntry(
      {
        ...previous,
        sourceKind: file.sourceKind || sourceKind,
        sourceLabel: file.sourceLabel || sourceLabel,
        sourceImageNumber: Number.isFinite(imageNumber) ? imageNumber : previous.sourceImageNumber,
        imageId: file.imageId || previous.imageId || "",
        baseName: file.baseName || previous.baseName || "",
        caption: file.caption || previous.caption || "",
        plainFilename: file.variant === "plain" ? file.filename : previous.plainFilename,
        annotatedFilename: file.variant === "annotated" ? file.filename : previous.annotatedFilename,
        plainUrl: file.variant === "plain" ? file.url : previous.plainUrl,
        annotatedUrl: file.variant === "annotated" ? file.url : previous.annotatedUrl
      },
      { sourceKind, sourceLabel }
    );
    byKey.set(key, next);
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const sourceCompare = String(a.sourceKind || "").localeCompare(String(b.sourceKind || ""));
    if (sourceCompare) return sourceCompare;
    return Number(a.sourceImageNumber || 0) - Number(b.sourceImageNumber || 0);
  });
}

function shouldUseRegistryEntryForMasterDownload(entry, hasExplicitRecommendations) {
  if (!hasExplicitRecommendations) return true;
  return entry.downloadRecommendation === "primaryTeachingSet";
}

function flattenRegistryToDownloadFiles(imageRegistry = []) {
  const files = [];
  const normalizedEntries = (Array.isArray(imageRegistry) ? imageRegistry : []).map((entry) =>
    normalizeImageRegistryEntry(entry)
  );
  const hasExplicitRecommendations = normalizedEntries.some((entry) =>
    ["primaryTeachingSet", "archiveOptionalDuplicate"].includes(entry.downloadRecommendation)
  );

  for (const entry of normalizedEntries) {
    if (!shouldUseRegistryEntryForMasterDownload(entry, hasExplicitRecommendations)) continue;
    if (entry.plainUrl && entry.plainFilename) {
      const file = {
        url: entry.plainUrl,
        filename: entry.plainFilename,
        imageNumber: entry.sourceImageNumber,
        masterImageId: entry.masterImageId,
        sourceKind: entry.sourceKind,
        sourceLabel: entry.sourceLabel,
        variant: "plain",
        caption: entry.caption,
        downloadRecommendation: entry.downloadRecommendation
      };
      files.push({
        ...file,
        filename: buildSourceQualifiedImageFilename(file)
      });
    }
    if (entry.annotatedUrl && entry.annotatedFilename) {
      const file = {
        url: entry.annotatedUrl,
        filename: entry.annotatedFilename,
        imageNumber: entry.sourceImageNumber,
        masterImageId: entry.masterImageId,
        sourceKind: entry.sourceKind,
        sourceLabel: entry.sourceLabel,
        variant: "annotated",
        caption: entry.caption,
        downloadRecommendation: entry.downloadRecommendation
      };
      files.push({
        ...file,
        filename: buildSourceQualifiedImageFilename(file)
      });
    }
  }
  return files;
}

function sanitizeAnkiDeckPart(value, fallback = "RadPrimer Article") {
  const text = String(value || "")
    .replace(/\r?\n/g, " ")
    .replace(/::/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || fallback;
}

function sanitizeAnkiDeckPath(value) {
  return String(value || "")
    .split("::")
    .map((part) => sanitizeAnkiDeckPart(part, ""))
    .filter(Boolean)
    .join("::");
}

function normalizeAnkiDeckPartForCompare(value) {
  return sanitizeAnkiDeckPart(value, "").toLowerCase();
}

function normalizeArticleTitleKey(value) {
  return sanitizeAnkiDeckPart(value, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getRadPrimerHierarchyStorageKey(title) {
  const key = normalizeArticleTitleKey(title);
  return key ? `${RADPRIMER_HIERARCHY_PREFIX}${key}` : "";
}

const ANKI_BREADCRUMB_SKIP = new Set(["basic"]);
const ANKI_BREADCRUMB_ALIASES = new Map(
  [
    ["Musculoskeletal", "MSK"],
    ["Gastrointestinal", "GI"],
    ["Genitourinary", "GU"],
    ["Neuroradiology", "Neuro"],
    ["Pediatric", "Pediatrics"],
    ["Interventional Radiology", "IR"]
  ].map(([from, to]) => [from.toLowerCase(), to])
);

function mapAnkiBreadcrumbPart(value) {
  const part = sanitizeAnkiDeckPart(value, "");
  if (!part) return "";
  return ANKI_BREADCRUMB_ALIASES.get(part.toLowerCase()) || part;
}

function pushUniqueDeckPart(parts, part) {
  const cleaned = sanitizeAnkiDeckPart(part, "");
  if (!cleaned) return;
  const last = parts.at(-1);
  if (last && normalizeAnkiDeckPartForCompare(last) === normalizeAnkiDeckPartForCompare(cleaned)) {
    return;
  }
  parts.push(cleaned);
}

function buildAnkiBreadcrumbDeckParts(breadcrumbTrail, title) {
  const parts = [];
  const titleText = sanitizeAnkiDeckPart(title, "");

  for (const rawPart of Array.isArray(breadcrumbTrail) ? breadcrumbTrail : []) {
    const cleaned = sanitizeAnkiDeckPart(rawPart, "");
    if (!cleaned || ANKI_BREADCRUMB_SKIP.has(cleaned.toLowerCase())) continue;

    const colonMatch = cleaned.match(/^(.+?)\s*:\s*(.+)$/);
    if (colonMatch) {
      const prefix = mapAnkiBreadcrumbPart(colonMatch[1]);
      const suffix = sanitizeAnkiDeckPart(colonMatch[2], "");
      pushUniqueDeckPart(parts, prefix);
      pushUniqueDeckPart(parts, suffix);
      continue;
    }

    pushUniqueDeckPart(parts, mapAnkiBreadcrumbPart(cleaned));
  }

  if (titleText && normalizeAnkiDeckPartForCompare(parts.at(-1)) !== normalizeAnkiDeckPartForCompare(titleText)) {
    pushUniqueDeckPart(parts, titleText);
  }

  return parts;
}

function getAutoAnkiRoot(settings) {
  if (settings?.engine === "normal") {
    return sanitizeAnkiDeckPath(settings.ankiNormalRoot || DEFAULTS.ankiNormalRoot);
  }
  return sanitizeAnkiDeckPath(settings?.ankiPathologyRoot || DEFAULTS.ankiPathologyRoot);
}

function normalizeAnkiDeckMode(value) {
  return value === "manual" ? "manual" : "auto";
}

function buildAnkiDeckTarget(pending) {
  const settings = pending?.settings || {};
  const title = sanitizeAnkiDeckPart(
    pending?.articleTitle || pending?.extractionMeta?.title || "RadPrimer Article"
  );
  const breadcrumbTrail = Array.isArray(pending?.extractionMeta?.breadcrumbTrail)
    ? pending.extractionMeta.breadcrumbTrail
    : [];
  const deckMode = normalizeAnkiDeckMode(settings.ankiDeckMode);
  const hierarchyOverride = pending?.extractionMeta?.ankiHierarchyOverride;

  if (deckMode === "auto" && hierarchyOverride?.deckName) {
    return {
      deckMode,
      deckRoot: hierarchyOverride.deckRoot || getAutoAnkiRoot(settings),
      deckParts: Array.isArray(hierarchyOverride.deckParts)
        ? hierarchyOverride.deckParts
        : String(hierarchyOverride.deckName).split("::").filter(Boolean),
      breadcrumbTrail: Array.isArray(hierarchyOverride.breadcrumbTrail)
        ? hierarchyOverride.breadcrumbTrail
        : breadcrumbTrail,
      deckName: sanitizeAnkiDeckPath(hierarchyOverride.deckName) || title,
      hierarchySource: hierarchyOverride.sourceLabel || "RadPrimer"
    };
  }

  if (deckMode === "manual") {
    const deckRoot = sanitizeAnkiDeckPath(settings.ankiDeckRoot || DEFAULTS.ankiDeckRoot);
    return {
      deckMode,
      deckRoot,
      deckParts: [title],
      breadcrumbTrail,
      deckName: deckRoot ? `${deckRoot}::${title}` : title
    };
  }

  const deckRoot = getAutoAnkiRoot(settings);
  const rootParts = deckRoot.split("::").filter(Boolean);
  const deckParts = buildAnkiBreadcrumbDeckParts(breadcrumbTrail, title);

  while (
    rootParts.length &&
    deckParts.length &&
    normalizeAnkiDeckPartForCompare(rootParts.at(-1)) === normalizeAnkiDeckPartForCompare(deckParts[0])
  ) {
    deckParts.shift();
  }

  const finalParts = [...rootParts, ...(deckParts.length ? deckParts : [title])];
  return {
    deckMode,
    deckRoot,
    deckParts: finalParts,
    breadcrumbTrail,
    deckName: finalParts.join("::") || title
  };
}

function buildAnkiDeckName(pending) {
  return buildAnkiDeckTarget(pending).deckName;
}

async function rememberRadPrimerHierarchyFromExtraction(extraction, settings, sourceUrl = "") {
  const meta = extraction?.meta || {};
  if (meta.sourceKind !== "radprimer") return null;

  const title = meta.title || "";
  const key = getRadPrimerHierarchyStorageKey(title);
  if (!key) return null;

  const pending = {
    settings,
    articleTitle: title,
    extractionMeta: {
      ...meta,
      ankiHierarchyOverride: null
    }
  };
  const target = buildAnkiDeckTarget(pending);
  const hierarchy = {
    title,
    sourceLabel: "RadPrimer",
    sourceKind: "radprimer",
    sourceUrl,
    breadcrumbTrail: meta.breadcrumbTrail || [],
    deckRoot: target.deckRoot || "",
    deckParts: target.deckParts || [],
    deckName: target.deckName || "",
    createdAt: new Date().toISOString()
  };

  if (!hierarchy.deckName) return null;
  await chrome.storage.local.set({ [key]: hierarchy });
  return hierarchy;
}

async function applySavedRadPrimerHierarchyToExtraction(extraction, settings) {
  const meta = extraction?.meta || {};
  if (settings?.preferRadPrimerHierarchyForStatdx === false) return null;
  if (meta.sourceKind !== "statdx") return null;

  const key = getRadPrimerHierarchyStorageKey(meta.title || "");
  if (!key) return null;

  const stored = await chrome.storage.local.get(key);
  const hierarchy = stored[key];
  if (!hierarchy?.deckName) return null;

  extraction.meta = {
    ...meta,
    ankiHierarchyOverride: {
      ...hierarchy,
      appliedToSourceLabel: meta.primarySourceLabel || "STATdx"
    }
  };
  return hierarchy;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function textToDataUrl(text, mimeType = "text/plain;charset=utf-8") {
  const bytes = new TextEncoder().encode(String(text || ""));
  return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
}

function stripOuterCodeFence(text) {
  const value = String(text || "").trim();
  const match = value.match(/^```(?:tsv|text|csv)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : value;
}

function looksLikeInlineCardTsv(text) {
  const value = stripOuterCodeFence(text);
  const lines = value
    .split(/\n+/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
  const tabbedLines = lines.filter((line) => (line.match(/\t/g) || []).length >= 8);
  const strongTabbedLines = lines.filter((line) => (line.match(/\t/g) || []).length >= 15);
  return strongTabbedLines.length >= 2 || tabbedLines.length >= 4;
}

function extractCoreEvidenceBlock(text) {
  const value = String(text || "");
  const begin = value.indexOf(CORE_EVIDENCE_BEGIN);
  if (begin < 0) {
    return {
      text: [
        "CORE_EVIDENCE_STATUS: NOT_PROVIDED",
        "CORE_SOURCE_BASIS: No Core evidence block was found in the captured ChatGPT response.",
        "CORE_FACTS_USED:",
        "- None auditable from ChatGPT output.",
        "CORE_DERIVED_CARDS:",
        "- Unknown; audit should treat Core-specific claims as unverified unless source_package.txt contains direct Core text.",
        "CORE_LIMITATIONS:",
        "- ChatGPT may have used project files, but this bundle did not capture evidence for Codex verification."
      ].join("\n"),
      status: "NOT_PROVIDED",
      provided: false
    };
  }

  const contentStart = begin + CORE_EVIDENCE_BEGIN.length;
  const end = value.indexOf(CORE_EVIDENCE_END, contentStart);
  const raw = end >= 0 ? value.slice(contentStart, end) : value.slice(contentStart);
  const cleaned = raw
    .replace(/```(?:text|markdown|md)?/gi, "")
    .replace(/```/g, "")
    .trim();
  const statusMatch = cleaned.match(/CORE_EVIDENCE_STATUS\s*:\s*([A-Z_]+)/i);
  const status = statusMatch ? statusMatch[1].toUpperCase() : "UNKNOWN";

  return {
    text: cleaned || "CORE_EVIDENCE_STATUS: EMPTY\nCORE_SOURCE_BASIS: Empty Core evidence block.",
    status,
    provided: true
  };
}

function stripCoreEvidenceBlock(text) {
  const value = String(text || "");
  const begin = value.indexOf(CORE_EVIDENCE_BEGIN);
  if (begin < 0) return value;
  const contentStart = begin + CORE_EVIDENCE_BEGIN.length;
  const end = value.indexOf(CORE_EVIDENCE_END, contentStart);
  const removeEnd = end >= 0 ? end + CORE_EVIDENCE_END.length : value.length;
  return `${value.slice(0, begin)}\n${value.slice(removeEnd)}`.trim();
}

function buildAuditInstructions(metadata) {
  const ankiDeckName = metadata.anki?.deckName || "";
  const ankiNoteType = metadata.anki?.noteType || DEFAULTS.ankiNoteType;
  return [
    "# RadPrimer Card Audit Bundle",
    "",
    "Audit goal: compare `generated_cards.tsv` against `source_package.txt` and `core_evidence.txt` when present, then produce a corrected, higher-yield TSV when needed.",
    "",
    "Checklist:",
    "- Preserve the existing TSV schema and column order.",
    "- Remove cards that test prompt metadata, source-review bookkeeping, generator decisions, or vague audit statements.",
    "- Split overloaded cards when one front is asking for too many independent facts.",
    "- Add missing high-yield cards only when the source package or captured Core evidence supports them.",
    "- Improve mechanism and histology explanations when they are unclear; explicitly label any outside clarification added during review.",
    "- Keep one main concept per card unless the card is intentionally testing a pathway or structured comparison.",
    "- Check image-based cards against the selected image list and grouped cases in `metadata.json`.",
    "- Keep source attribution on the back of cards when the note type supports it.",
    "- Treat Core-specific claims as auditable only if supported by `core_evidence.txt` or direct Core text inside `source_package.txt`.",
    "- If `core_evidence.txt` says NOT_PROVIDED, EMPTY, or CLARIFICATION_NEEDED, remove or relabel Core-only claims unless independently supported by the visible bundle files.",
    "",
    "Suggested final outputs:",
    "- `corrected_cards.tsv`",
    metadata.anki?.createImportFile
      ? "- `corrected_cards_anki_import.tsv` with Anki import headers for the target deck"
      : "",
    "- `audit_report.md` with high-signal changes and remaining uncertainties",
    "",
    metadata.anki?.createImportFile
      ? [
          "Anki import file rule:",
          `- Target note type: \`${ankiNoteType}\``,
          `- Target deck: \`${ankiDeckName}\``,
          "- Create `corrected_cards_anki_import.tsv` by prepending these lines to the corrected TSV rows:",
          "  `#separator:tab`",
          "  `#html:true`",
          `  \`#notetype:${ankiNoteType}\``,
          `  \`#deck:${ankiDeckName}\``,
          "- Do not add a field header row after those import directives.",
          "- Keep `corrected_cards.tsv` as the clean no-header 22-column audit output."
        ].join("\n")
      : "",
    "",
    `Topic: ${metadata.articleTitle || "[unknown]"}`,
    `Engine/mode: ${metadata.engine || ""}/${metadata.mode || ""}`,
    `Created: ${metadata.createdAt || ""}`
  ].join("\n");
}

function buildAuditWakeMessage(bundle) {
  const downloadFolder = bundle?.downloadFolder || `Downloads\\${CARD_AUDIT_SUBFOLDER}`;
  return [
    "Audit the latest RadPrimer card-audit bundle.",
    "",
    `The browser staged bundle is here: ${downloadFolder}`,
    "",
    "Please do the full card-quality audit:",
    "1. From C:\\Users\\josem.000\\NormalAnatomy, import the newest complete bundle by running or emulating edge_radprimer_extension\\tools\\import-latest-radprimer-audit-bundle.ps1.",
    "2. Read C:\\Users\\josem.000\\NormalAnatomy\\radprimer_audit_queue\\_latest_radprimer_audit_bundle.txt.",
    "3. In that bundle, compare source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md, and core_evidence.txt if present.",
    "4. Write corrected_cards.tsv, audit_report.md, and _codex_audit_done.txt in the same bundle folder.",
    "5. If metadata.json contains an Anki deck target, also write corrected_cards_anki_import.tsv with Anki import headers so Anki can create/select the target subdeck automatically.",
    "",
    "Preserve the TSV schema and column order. Remove metadata/bookkeeping cards, split overloaded cards, add missing source-supported high-yield cards, and improve unclear mechanism or histology explanations while labeling any outside clarification. Treat Core-specific claims as verified only when core_evidence.txt or source_package.txt contains auditable Core support."
  ].join("\n");
}

function buildSourceOnlyWakeMessage(bundle) {
  const downloadFolder = bundle?.downloadFolder || `Downloads\\${CARD_AUDIT_SUBFOLDER}`;
  return [
    "I exported a RadPrimer audit source-only bundle.",
    "",
    `The source bundle is here: ${downloadFolder}`,
    "",
    "Use this together with the generated ChatGPT TSV if I provide it separately.",
    "The bundle contains source_package.txt, metadata.json, audit_instructions.md, and _source_only_bundle.txt.",
    "",
    "Please compare the generated TSV against the source package, preserve the TSV schema and column order, remove weak/meta cards, split overloaded cards, add missing source-supported high-yield cards, and produce corrected_cards.tsv plus audit_report.md."
  ].join("\n");
}

function buildSourceCompareInstructions(metadata) {
  return [
    "# Source Comparison Bundle",
    "",
    "Purpose: compare this source package against another source package for the same radiology topic, usually RadPrimer vs STATdx.",
    "",
    "Comparison goals:",
    "- Decide which source should be the primary generator source for this topic.",
    "- Identify which source is stronger for image recognition, mechanisms, histology/pathology, differentials, modality-specific findings, nuclear medicine, ultrasound, management, and board-style traps.",
    "- Recommend whether to use one source alone or a merged extraction plan.",
    "- Protect review load: flag facts that are narrative-only, suspend-worthy, or too low-yield for first-pass cards.",
    "- Preserve source attribution. Do not merge facts in a way that makes it unclear where they came from.",
    "- If image_evidence files are present, use them for visual comparison. Do not classify two images as exact duplicates from captions alone.",
    "",
    "Preferred output when comparing two bundles:",
    "1. Source recommendation: RadPrimer only, STATdx only, or merged.",
    "2. What each source contributes best.",
    "3. Missing or weak areas in each source.",
    "4. Recommended card-generation plan: image cards, mechanism cards, differential cards, high-yield cards, and cards to avoid.",
    "5. Narrative plan if a Speechify lecture is being generated.",
    "",
    `Topic: ${metadata.articleTitle || "[unknown]"}`,
    `Source: ${metadata.sourceLabel || metadata.primarySourceLabel || "[unknown]"}`,
    `Engine/mode at export: ${metadata.engine || ""}/${metadata.mode || ""}`,
    `Created: ${metadata.createdAt || ""}`,
    `Image evidence files: ${metadata.imageEvidence?.entries?.length || 0}`
  ].join("\n");
}

function buildSourceCompareWakeMessage(bundle) {
  const downloadFolder = bundle?.downloadFolder || `Downloads\\${SOURCE_COMPARE_SUBFOLDER}`;
  const sourceLabel = bundle?.metadata?.sourceLabel || bundle?.metadata?.primarySourceLabel || "source";
  const files = bundle?.files || {};
  const lines = [
    "I exported a radiology source-comparison bundle.",
    "",
    `Source: ${sourceLabel}`,
    `Bundle: ${downloadFolder}`
  ];
  if (files.sourcePackage) lines.push(`Source package: ${downloadFolder}\\${files.sourcePackage}`);
  if (files.metadata) lines.push(`Metadata: ${downloadFolder}\\${files.metadata}`);
  if (files.instructions) lines.push(`Instructions: ${downloadFolder}\\${files.instructions}`);
  if (files.imageEvidence) lines.push(`Image evidence manifest: ${downloadFolder}\\${files.imageEvidence}`);
  lines.push(
    "",
    "When I provide another source-comparison bundle for the same topic, compare the two source packages and recommend which one should drive the narrative/cards, or whether they should be merged.",
    "In the extension, once both RadPrimer and STATdx comparison sources have been exported for this title, use Build master source to create the fused upstream package automatically.",
    "",
    "Focus on my goals: image recognition, mechanisms, histology/pathology when relevant, differential diagnosis, modality-specific patterns including ultrasound/nuclear medicine, board traps, and review-load control."
  );
  return lines.join("\n");
}

function buildMasterSourceRequestInstructions(metadata) {
  return [
    "# Master Source Request Bundle",
    "",
    "Purpose: this bundle contains paired source packages that Codex should fuse into one master source artifact.",
    "",
    "Expected Codex outputs in the imported queue bundle:",
    "- master_source_package.txt",
    "- master_source_manifest.json",
    "- image_registry.json",
    "- master_source_import.json",
    "- master_source_report.md",
    "- _codex_master_source_done.txt",
    "",
    "Rules:",
    "- Use RadPrimer as the canonical hierarchy/backbone when a RadPrimer source is present.",
    "- Use STATdx as supplemental depth when it is stronger for image examples, modality-specific detail, mechanisms, management, or differential nuance.",
    "- Preserve source attribution with labels such as [RadPrimer], [STATdx], or [Both].",
    "- Do not invent Core Radiology support. Treat Core-specific claims as verified only if the provided source packages contain auditable Core evidence.",
    "- Do not create cards or a lecture yet. Create only the fused master source package and report.",
    "- First run an image coverage gate: determine which RadPrimer images are exact duplicates, near duplicates, conceptual replacements, or not covered by STATdx.",
    "- If image_evidence files are present, use those actual image files for visual duplicate classification. Caption similarity, matching diagnosis, or matching case wording is not enough to call an image an exact duplicate.",
    "- Exact duplicate status requires visual evidence: same image file/source image ID, same pixel/perceptual appearance, same slice/screenshot, or a direct manual/source note. If that evidence is absent or uncertain, label the relationship near duplicate or conceptual replacement and keep the image primary.",
    "- Do not discard a RadPrimer image unless STATdx clearly replaces the same teaching need. If unsure, keep the RadPrimer image in the primary teaching set.",
    "- For image-recognition learning, near duplicates are valuable reinforcement, not waste. If a source image is a different patient, projection, slice, stage, severity, modality, or visually distinct example of the same disease pattern, keep it in the primaryTeachingSet and label its role as recognitionReinforcement.",
    "- Conceptual replacements should not remove images by default. If two images teach the same diagnosis but look different, keep both in the primaryTeachingSet unless one is a literal duplicate or unusable.",
    "- Archive only true duplicate/recovery images by default: same image, same slice, same screenshot, trivial size variant, or same visual content with only caption/source differences. If exact duplicate status is uncertain, keep the image primary.",
    "- Do not omit images from the registry. Separate images into a primaryTeachingSet for future narrative/cards, recognitionReinforcement images within that primary set, and archiveOptionalDuplicates for literal duplicate/recovery/complete-source review.",
    "- Treat same-patient, follow-up, adjacent-slice, procedure, comparison-view, and time-lapse image groups as atomic teaching clusters. If one image from that cluster is selected, include the companion images needed to understand the case.",
    "- Do not replace or archive a single image inside a source case cluster unless the whole cluster is replaced by an equivalent cluster from the other source, or unless master_source_report.md explicitly explains why splitting the cluster is safe.",
    "- master_source_report.md must list any selected/archived case-cluster splits and the reason. If there are no intentional splits, say that no source case cluster was intentionally split.",
    "- Preserve grouping, time-lapse, procedure, or follow-up context when captions imply it.",
    "- Use source-qualified image labels throughout the fused package. For human-facing prose, prefer one clean display label such as RadPrimer image 5 or STATdx image 4. Keep short labels such as RP-05 and SDX-04 in registry fields, filenames, metadata, and traceability notes rather than repeating both labels in the same prose sentence.",
    "- The fused package must be directly usable as the article/source package for later narrative and card generation.",
    "",
    "Required image registry contract:",
    "- image_registry.json must be a JSON array.",
    "- Each image object must include masterImageId, sourceKind, sourceLabel, sourceImageNumber, caption, usedFor, downloadRecommendation, plainFilename/annotatedFilename when known, and plainUrl/annotatedUrl when known.",
    "- When provided, carry visualEvidence.evidenceFilename/evidenceVariant/downloaded into each image object so future repairs can audit duplicate decisions against the actual staged images.",
    "- masterImageId should be RP-01, RP-02, etc. for RadPrimer and SDX-01, SDX-02, etc. for STATdx unless a clearer stable source code exists.",
    "- downloadRecommendation must be primaryTeachingSet for images to download/use by default and archiveOptionalDuplicate only for exact duplicate/recovery images that should not drive default cards/lecture.",
    "- For retained near duplicates or alternate same-pattern examples, set downloadRecommendation: primaryTeachingSet and include usedFor values such as recognitionReinforcement, alternateExample, modalityVariant, stageVariant, or severityVariant as appropriate.",
    "- Downloadable filenames should be source-qualified, for example RP-05_RadPrimer_plain_<original>.jpg and SDX-04_STATdx_plain_<original>.jpg, so Anki fields can reference the exact source image.",
    "- If a source image should be excluded from future teaching, keep it in the registry with downloadRecommendation: archiveOptionalDuplicate or usedFor: [] and explain why in master_source_report.md. The reason must explicitly say exact duplicate, same image/slice/screenshot, unusable, or another concrete non-teaching reason.",
    "",
    "Required manifest/import contract:",
    "- master_source_manifest.json must include articleTitle, canonicalHierarchy, sourcePriority, sourceCoverage, imageCountBySource, sourceAttributionRules, selectedPrimaryImageIds, archiveOptionalImageIds, and sourceSelectionPlan.",
    "- sourceSelectionPlan must state what text to keep from each source, what to downweight/skip, the primary image download/use set, archive duplicates, and generator instructions for narrative/cards.",
    "- sourceSelectionPlan must include imageCurationPolicy: exact duplicates may be archived; near duplicates and conceptual replacements remain selected as recognition reinforcement unless visually identical or unusable.",
    "- sourceSelectionPlan must include duplicateEvidencePolicy: exactDuplicate decisions require visual evidence from image_evidence files, same stable source image ID, image hashes, or explicit manual/source confirmation. Caption-only or topic-only similarity must be marked uncertain/nearDuplicate and kept primary.",
    "- sourceSelectionPlan must include a caseClusterGuardrails section describing atomic cluster rules and any intentional cluster splits.",
    "- master_source_import.json must be a single JSON object with: version, articleTitle, createdAt, packageText, manifest, imageRegistry, sourceSelectionPlan, selectedPrimaryImageIds, and archiveOptionalImageIds.",
    "- packageText in master_source_import.json must be exactly the same text written to master_source_package.txt.",
    "",
    `Topic: ${metadata.articleTitle || "[unknown]"}`,
    `Created: ${metadata.createdAt || ""}`,
    `Source pairing key: ${metadata.sourcePairingKey || "[article title]"}`,
    metadata.sourcePairingMatch
      ? `Source pairing match: ${metadata.sourcePairingMatch.type || "matched"} score ${metadata.sourcePairingMatch.score || ""} from ${metadata.sourcePairingMatch.matchedTitles?.[0] || metadata.sourcePairingMatch.matchedCacheKey || "[unknown]"}`
      : "Source pairing match: exact/manual cache",
    `Sources: ${(metadata.sources || []).map((source) => source.sourceLabel || source.sourceKind).join(", ")}`,
    `Image evidence files: ${metadata.imageEvidence?.entries?.length || 0}`
  ].join("\n");
}

function buildMasterSourceWakeMessage(bundle) {
  const downloadFolder = bundle?.downloadFolder || `Downloads\\${MASTER_SOURCE_SUBFOLDER}`;
  return [
    "Create the master radiology source package from the staged browser bundle.",
    "",
    `The browser staged bundle is here: ${downloadFolder}`,
    "",
    "Please do the full master-source synthesis:",
    "1. From C:\\Users\\josem.000\\NormalAnatomy, import the newest complete master-source request bundle by running or emulating edge_radprimer_extension\\tools\\import-latest-master-source-bundle.ps1.",
    "2. Read C:\\Users\\josem.000\\NormalAnatomy\\master_source_queue\\_latest_master_source_bundle.txt.",
    "3. In that bundle, compare RadPrimer_source_package.txt, STATdx_source_package.txt, RadPrimer_metadata.json, STATdx_metadata.json, metadata.json, and master_source_request.md.",
    "4. If image_evidence_manifest.json and image_evidence/ are present, inspect those actual image files before classifying anything as an exact duplicate.",
    "5. Write master_source_package.txt, master_source_manifest.json, image_registry.json, master_source_import.json, master_source_report.md, and _codex_master_source_done.txt in the same imported bundle folder.",
    "",
    "Use RadPrimer as the canonical hierarchy/backbone when present. Before merging, check whether STATdx fully covers the RadPrimer image set and mark each RadPrimer image as exact duplicate, near duplicate, conceptual replacement, or not covered. Use actual image_evidence files, same stable source image IDs, image hashes, or explicit manual/source notes before calling anything an exact duplicate; captions alone are not enough. Use STATdx as supplemental depth for stronger images, captions, mechanisms, differentials, modality-specific detail, or management. Preserve source attribution and image grouping/time-lapse/procedure context. Treat same-patient/follow-up/procedure/adjacent-slice/time-lapse clusters as atomic unless an explicit documented split is safe. For image-recognition learning, archive only true duplicates or unusable images by default. Near duplicates, alternate same-disease examples, and conceptual replacements should remain selected as recognition reinforcement unless they are literally the same image/slice/screenshot. Do not generate cards or a lecture yet.",
    "",
    "Important: the extension will later import master_source_import.json. Make its packageText source-qualified with clean human-facing labels like RadPrimer image 5 and STATdx image 4 whenever both sources contribute images. Keep RP-05 and SDX-04 in the image registry, manifest, filenames, and traceability fields, but do not force both the long label and short code into the same narrative-facing prose. Also include selectedPrimaryImageIds/archiveOptionalImageIds and sourceSelectionPlan.imageDownloadPlan so the extension can download only curated primary images with source-qualified filenames."
  ].join("\n");
}

async function downloadAuditTextFile(folderName, filename, text, mimeType = "text/plain;charset=utf-8") {
  return downloadTextFileToPath(
    `${CARD_AUDIT_SUBFOLDER}/${folderName}/${filename}`,
    text,
    mimeType
  );
}

async function downloadTextFileToPath(relativeFilename, text, mimeType = "text/plain;charset=utf-8") {
  const url = textToDataUrl(text, mimeType);
  const normalizedUrl = normalizeDownloadUrl(url);
  pendingTextDownloadFilenames.push({
    url: normalizedUrl,
    filename: relativeFilename
  });

  try {
    const downloadId = await chrome.downloads.download({
      url,
      filename: relativeFilename,
      conflictAction: "overwrite",
      saveAs: false
    });
    await waitForDownloadComplete(downloadId, 120000);
    return downloadId;
  } finally {
    const index = pendingTextDownloadFilenames.findIndex(
      (entry) => entry.url === normalizedUrl && entry.filename === relativeFilename
    );
    if (index >= 0) pendingTextDownloadFilenames.splice(index, 1);
  }
}

async function downloadSourceCompareTextFile(folderName, filename, text, mimeType = "text/plain;charset=utf-8") {
  return downloadTextFileToPath(
    `${SOURCE_COMPARE_SUBFOLDER}/${folderName}/${filename}`,
    text,
    mimeType
  );
}

async function downloadMasterSourceTextFile(folderName, filename, text, mimeType = "text/plain;charset=utf-8") {
  return downloadTextFileToPath(
    `${MASTER_SOURCE_SUBFOLDER}/${folderName}/${filename}`,
    text,
    mimeType
  );
}

function createCardAuditMetadata(pending, createdAt, generated = {}) {
  const ankiTarget = buildAnkiDeckTarget(pending);
  return {
    createdAt,
    articleTitle: pending.articleTitle || pending.extractionMeta?.title || "radprimer_cards",
    sourceUrl: pending.radPrimerUrl || "",
    engine: pending.settings?.engine || "",
    mode: pending.settings?.mode || "",
    selectedImages: pending.extractionMeta?.selectedImages || [],
    masterImageIds: pending.extractionMeta?.masterImageIds || [],
    sourceQualifiedImages: pending.extractionMeta?.sourceQualifiedImages || [],
    cases: pending.extractionMeta?.cases || [],
    totalImagesOnPage: pending.extractionMeta?.totalImagesOnPage ?? null,
    breadcrumbTrail: pending.extractionMeta?.breadcrumbTrail || [],
    outputChars: pending.sourcePackage?.length || 0,
    generatedChars: generated.generatedChars ?? null,
    generatedRawChars: generated.generatedRawChars ?? null,
    generatedViaDownload: Boolean(generated.generatedViaDownload),
    sourceOnlyBundle: Boolean(generated.sourceOnlyBundle),
    downloadSentinel: generated.downloadSentinel || "",
    coreEvidence: {
      status: generated.coreEvidenceStatus || "",
      provided: Boolean(generated.coreEvidenceProvided),
      chars: generated.coreEvidenceChars ?? null,
      filename: generated.coreEvidenceFilename || "core_evidence.txt"
    },
    anki: {
      createImportFile: pending.settings?.createAnkiImportFile !== false,
      deckMode: ankiTarget.deckMode,
      deckRoot: ankiTarget.deckRoot,
      manualDeckRoot: pending.settings?.ankiDeckRoot || DEFAULTS.ankiDeckRoot,
      pathologyRoot: pending.settings?.ankiPathologyRoot || DEFAULTS.ankiPathologyRoot,
      normalRoot: pending.settings?.ankiNormalRoot || DEFAULTS.ankiNormalRoot,
      breadcrumbTrail: ankiTarget.breadcrumbTrail,
      deckParts: ankiTarget.deckParts,
      deckName: ankiTarget.deckName,
      hierarchySource: ankiTarget.hierarchySource || pending.extractionMeta?.primarySourceLabel || "",
      noteType: pending.settings?.ankiNoteType || DEFAULTS.ankiNoteType,
      importFilename: "corrected_cards_anki_import.tsv"
    },
    downloadFiles: (pending.downloadFiles || []).map((file) => ({
      filename: file.filename,
      label: file.label || "",
      imageNumber: file.imageNumber || null,
      masterImageId: file.masterImageId || "",
      sourceKind: file.sourceKind || pending.extractionMeta?.sourceKind || "",
      sourceLabel: file.sourceLabel || pending.extractionMeta?.primarySourceLabel || "",
      variant: file.variant || "",
      url: file.url || ""
    })),
    imageRegistry: Array.isArray(pending.extractionMeta?.imageRegistry)
      ? pending.extractionMeta.imageRegistry
      : buildSourceImageRegistryFromPending(pending),
    masterSource: pending.extractionMeta?.masterSource || null,
    settings: {
      include: pending.settings?.include || "",
      caseMap: pending.settings?.caseMap || "",
      coreGap: Boolean(pending.settings?.coreGap),
      coreSection: pending.settings?.coreSection || "",
      corePages: pending.settings?.corePages || "",
      sourceNote: pending.settings?.sourceNote || "",
      coreNote: pending.settings?.coreNote || "",
      createAnkiImportFile: pending.settings?.createAnkiImportFile !== false,
      ankiDeckMode: pending.settings?.ankiDeckMode || DEFAULTS.ankiDeckMode,
      ankiPathologyRoot: pending.settings?.ankiPathologyRoot || DEFAULTS.ankiPathologyRoot,
      ankiNormalRoot: pending.settings?.ankiNormalRoot || DEFAULTS.ankiNormalRoot,
      ankiDeckRoot: pending.settings?.ankiDeckRoot || DEFAULTS.ankiDeckRoot,
      preferRadPrimerHierarchyForStatdx:
        pending.settings?.preferRadPrimerHierarchyForStatdx ?? DEFAULTS.preferRadPrimerHierarchyForStatdx,
      ankiNoteType: pending.settings?.ankiNoteType || DEFAULTS.ankiNoteType
    }
  };
}

async function stageCardAuditBundle({ pending, assistantText }) {
  const createdAt = new Date().toISOString();
  const title = pending.articleTitle || pending.extractionMeta?.title || "radprimer_cards";
  const folderName = `${sanitizeDownloadPathPart(title)}_${createdAt.replace(/[:.]/g, "-")}`;
  const coreEvidence = extractCoreEvidenceBlock(assistantText);
  const generatedCards = stripOuterCodeFence(stripCoreEvidenceBlock(assistantText));
  const metadata = createCardAuditMetadata(pending, createdAt, {
    generatedChars: generatedCards.length,
    generatedRawChars: String(assistantText || "").length,
    coreEvidenceStatus: coreEvidence.status,
    coreEvidenceProvided: coreEvidence.provided,
    coreEvidenceChars: coreEvidence.text.length
  });

  await downloadAuditTextFile(folderName, "source_package.txt", pending.sourcePackage || "");
  await downloadAuditTextFile(folderName, "generated_cards.tsv", generatedCards);
  await downloadAuditTextFile(folderName, "core_evidence.txt", coreEvidence.text);
  if (generatedCards !== String(assistantText || "").trim()) {
    await downloadAuditTextFile(folderName, "generated_cards_raw.txt", assistantText || "");
  }
  await downloadAuditTextFile(
    folderName,
    "metadata.json",
    JSON.stringify(metadata, null, 2),
    "application/json;charset=utf-8"
  );
  await downloadAuditTextFile(folderName, "audit_instructions.md", buildAuditInstructions(metadata), "text/markdown;charset=utf-8");
  await downloadAuditTextFile(
    folderName,
    "_bundle_complete.txt",
    `complete=true\ncreatedAt=${createdAt}\narticleTitle=${title}\n`
  );

  return {
    folderName,
    downloadFolder: `Downloads\\${CARD_AUDIT_SUBFOLDER}\\${folderName}`,
    metadata
  };
}

async function stageCardAuditSourceOnlyBundle({ pending, sourceLabel = "source_only" }) {
  const createdAt = new Date().toISOString();
  const title = pending.articleTitle || pending.extractionMeta?.title || "radprimer_source";
  const folderName = `${sanitizeDownloadPathPart(title)}_${sourceLabel}_${createdAt.replace(/[:.]/g, "-")}`;
  const metadata = createCardAuditMetadata(pending, createdAt, {
    sourceOnlyBundle: true
  });

  await downloadAuditTextFile(folderName, "source_package.txt", pending.sourcePackage || "");
  await downloadAuditTextFile(
    folderName,
    "metadata.json",
    JSON.stringify(metadata, null, 2),
    "application/json;charset=utf-8"
  );
  await downloadAuditTextFile(folderName, "audit_instructions.md", buildAuditInstructions(metadata), "text/markdown;charset=utf-8");
  await downloadAuditTextFile(
    folderName,
    "_source_only_bundle.txt",
    `sourceOnly=true\ncreatedAt=${createdAt}\narticleTitle=${title}\n`
  );

  return {
    folderName,
    downloadFolder: `Downloads\\${CARD_AUDIT_SUBFOLDER}\\${folderName}`,
    metadata
  };
}

async function stageSourceCompareBundle({ pending }) {
  const createdAt = new Date().toISOString();
  const title = pending.articleTitle || pending.extractionMeta?.title || "radiology_source";
  const sourceLabel =
    pending.extractionMeta?.primarySourceLabel ||
    pending.extractionMeta?.sourceKind ||
    pending.settings?.primarySourceLabel ||
    "source";
  const sourcePairingKey = getSourcePairingKey(title, pending.settings || {});
  const sourcePairingFolderLabel = pending.settings?.sourcePairingKey || title;
  const downloadPlan = buildSourceCompareDownloadPlan(title, sourceLabel, sourcePairingFolderLabel);
  let imageRegistry = Array.isArray(pending.extractionMeta?.imageRegistry)
    ? pending.extractionMeta.imageRegistry
    : buildSourceImageRegistryFromPending(pending);
  let imageEvidenceEntries = buildImageEvidenceManifest(
    imageRegistry,
    `${downloadPlan.fileBaseName}_${IMAGE_EVIDENCE_SUBFOLDER}`
  );
  imageEvidenceEntries = await downloadImageEvidenceFiles(
    SOURCE_COMPARE_SUBFOLDER,
    downloadPlan.articleFolderName,
    imageEvidenceEntries
  );
  imageRegistry = attachImageEvidenceToRegistry(imageRegistry, imageEvidenceEntries);
  const metadata = {
    ...createCardAuditMetadata(pending, createdAt, {
      sourceOnlyBundle: true
    }),
    sourceComparisonBundle: true,
    sourceComparisonFolder: `${SOURCE_COMPARE_SUBFOLDER}/${downloadPlan.articleFolderName}`,
    sourceComparisonFileBase: downloadPlan.fileBaseName,
    sourcePairingKey,
    sourcePairingKeyRaw: pending.settings?.sourcePairingKey || "",
    sourcePairingFolder: downloadPlan.articleFolderName,
    sourceLabel,
    sourceKind: pending.extractionMeta?.sourceKind || "",
    primarySourceLabel: pending.extractionMeta?.primarySourceLabel || sourceLabel,
    imageRegistry,
    imageEvidence: buildImageEvidenceBlock(
      imageEvidenceEntries,
      `${downloadPlan.fileBaseName}_${IMAGE_EVIDENCE_SUBFOLDER}`
    )
  };

  const sourcePackageFilename = `${downloadPlan.fileBaseName}_source_package.txt`;
  const metadataFilename = `${downloadPlan.fileBaseName}_metadata.json`;
  const instructionsFilename = `${downloadPlan.fileBaseName}_source_compare_instructions.md`;
  const evidenceFilename = `${downloadPlan.fileBaseName}_image_evidence_manifest.json`;
  const markerFilename = `${downloadPlan.fileBaseName}_source_compare_bundle.txt`;

  await downloadSourceCompareTextFile(downloadPlan.articleFolderName, sourcePackageFilename, pending.sourcePackage || "");
  await downloadSourceCompareTextFile(
    downloadPlan.articleFolderName,
    metadataFilename,
    JSON.stringify(metadata, null, 2),
    "application/json;charset=utf-8"
  );
  await downloadSourceCompareTextFile(
    downloadPlan.articleFolderName,
    instructionsFilename,
    buildSourceCompareInstructions(metadata),
    "text/markdown;charset=utf-8"
  );
  await downloadSourceCompareTextFile(
    downloadPlan.articleFolderName,
    evidenceFilename,
    JSON.stringify(metadata.imageEvidence, null, 2),
    "application/json;charset=utf-8"
  );
  await downloadSourceCompareTextFile(
    downloadPlan.articleFolderName,
    markerFilename,
    `sourceCompare=true\ncreatedAt=${createdAt}\narticleTitle=${title}\nsourceLabel=${sourceLabel}\nsourcePairingKey=${metadata.sourcePairingKey || ""}\nsourcePairingFolder=${metadata.sourcePairingFolder || ""}\n`
  );

  return {
    folderName: downloadPlan.articleFolderName,
    fileBaseName: downloadPlan.fileBaseName,
    downloadFolder: `Downloads\\${SOURCE_COMPARE_SUBFOLDER}\\${downloadPlan.articleFolderName}`,
    files: {
      sourcePackage: sourcePackageFilename,
      metadata: metadataFilename,
      instructions: instructionsFilename,
      imageEvidence: evidenceFilename,
      marker: markerFilename
    },
    metadata
  };
}

async function stageMasterSourceRequestBundle({
  articleTitle,
  sources,
  sourceCompareCacheKey,
  sourcePairingKey,
  sourcePairingMatch
}) {
  const createdAt = new Date().toISOString();
  const title = articleTitle || "radiology_master_source";
  const downloadPlan = buildMasterSourceDownloadPlan(title);
  const folderName = `${downloadPlan.articleFolderName}_${createdAt.replace(/[:.]/g, "-")}`;
  const sourceList = Array.isArray(sources) ? sources : [];
  const metadata = {
    createdAt,
    articleTitle: title,
    masterSourceRequestBundle: true,
    sourceCompareCacheKey: sourceCompareCacheKey || "",
    sourcePairingKey: sourcePairingKey || "",
    sourcePairingMatch: sourcePairingMatch || null,
    sourceCount: sourceList.length,
    sources: sourceList.map((source) => ({
      sourceKind: source.sourceKind || "",
      sourceLabel: sourceCompareDisplayLabel(source),
      sourceUrl: source.sourceUrl || "",
      cachedAt: source.cachedAt || "",
      outputChars: source.outputChars ?? String(source.sourcePackage || "").length,
      downloadFolder: source.downloadFolder || "",
      fileBaseName: source.fileBaseName || "",
      metadata: {
        articleTitle: source.metadata?.articleTitle || source.articleTitle || "",
        sourceComparisonFolder: source.metadata?.sourceComparisonFolder || "",
        anki: source.metadata?.anki || null,
        breadcrumbTrail: source.metadata?.breadcrumbTrail || [],
        imageRegistry: Array.isArray(source.metadata?.imageRegistry)
          ? source.metadata.imageRegistry
          : Array.isArray(source.imageRegistry)
            ? source.imageRegistry
            : []
      },
      imageRegistry: Array.isArray(source.metadata?.imageRegistry)
        ? source.metadata.imageRegistry
        : Array.isArray(source.imageRegistry)
          ? source.imageRegistry
          : [],
      downloadFiles: Array.isArray(source.metadata?.downloadFiles)
        ? source.metadata.downloadFiles
        : Array.isArray(source.downloadFiles)
          ? source.downloadFiles
          : []
    }))
  };
  const allImageEvidenceEntries = [];
  for (const sourceSummary of metadata.sources) {
    const evidenceFolderName = `${IMAGE_EVIDENCE_SUBFOLDER}/${sanitizeDownloadPathPart(
      sourceSummary.sourceLabel || sourceSummary.sourceKind || "Source",
      "Source"
    )}`;
    let imageRegistry = Array.isArray(sourceSummary.imageRegistry) ? sourceSummary.imageRegistry : [];
    let imageEvidenceEntries = buildImageEvidenceManifest(imageRegistry, evidenceFolderName);
    imageEvidenceEntries = await downloadImageEvidenceFiles(
      MASTER_SOURCE_SUBFOLDER,
      folderName,
      imageEvidenceEntries
    );
    imageRegistry = attachImageEvidenceToRegistry(imageRegistry, imageEvidenceEntries);
    sourceSummary.imageRegistry = imageRegistry;
    sourceSummary.imageEvidence = buildImageEvidenceBlock(imageEvidenceEntries, evidenceFolderName);
    sourceSummary.metadata = {
      ...(sourceSummary.metadata || {}),
      imageRegistry,
      imageEvidence: sourceSummary.imageEvidence
    };
    allImageEvidenceEntries.push(...imageEvidenceEntries);
  }
  metadata.imageEvidence = buildImageEvidenceBlock(allImageEvidenceEntries);

  const metadataFilename = "metadata.json";
  const instructionsFilename = "master_source_request.md";
  const evidenceFilename = "image_evidence_manifest.json";
  const markerFilename = "_master_source_request_complete.txt";

  await downloadMasterSourceTextFile(
    folderName,
    metadataFilename,
    JSON.stringify(metadata, null, 2),
    "application/json;charset=utf-8"
  );
  await downloadMasterSourceTextFile(
    folderName,
    instructionsFilename,
    buildMasterSourceRequestInstructions(metadata),
    "text/markdown;charset=utf-8"
  );
  await downloadMasterSourceTextFile(
    folderName,
    evidenceFilename,
    JSON.stringify(metadata.imageEvidence, null, 2),
    "application/json;charset=utf-8"
  );

  for (const source of sourceList) {
    const sourceLabel = sanitizeDownloadPathPart(sourceCompareDisplayLabel(source), "Source");
    const enrichedSourceMetadata =
      metadata.sources.find((item) => item.sourceKind === source.sourceKind)?.metadata ||
      metadata.sources.find((item) => sourceCompareDisplayLabel(item) === sourceCompareDisplayLabel(source))?.metadata ||
      source.metadata ||
      {};
    await downloadMasterSourceTextFile(
      folderName,
      `${sourceLabel}_source_package.txt`,
      source.sourcePackage || ""
    );
    await downloadMasterSourceTextFile(
      folderName,
      `${sourceLabel}_metadata.json`,
      JSON.stringify(enrichedSourceMetadata, null, 2),
      "application/json;charset=utf-8"
    );
  }

  await downloadMasterSourceTextFile(
    folderName,
    markerFilename,
    `masterSourceRequest=true\ncreatedAt=${createdAt}\narticleTitle=${title}\nsources=${sourceList.map(sourceCompareDisplayLabel).join(", ")}\n`
  );

  return {
    folderName,
    fileBaseName: downloadPlan.fileBaseName,
    downloadFolder: `Downloads\\${MASTER_SOURCE_SUBFOLDER}\\${folderName}`,
    files: {
      metadata: metadataFilename,
      request: instructionsFilename,
      imageEvidence: evidenceFilename,
      marker: markerFilename
    },
    metadata
  };
}

function parseJsonMaybe(text, fallback = null) {
  const raw = String(text || "").trim();
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function pickNamedFile(files, patterns) {
  const list = Array.isArray(files) ? files : [];
  return list.find((file) => patterns.some((pattern) => pattern.test(String(file?.name || "")))) || null;
}

function normalizeMasterSourceCache(input = {}) {
  const articleTitle =
    input.articleTitle ||
    input.manifest?.articleTitle ||
    input.metadata?.articleTitle ||
    "Radiology Master Source";
  const packageText = String(input.packageText || input.sourcePackage || input.masterSourcePackage || "").trim();
  if (!packageText) throw new Error("Master source import did not include packageText/master_source_package.txt.");

  const manifest = input.manifest && typeof input.manifest === "object" ? input.manifest : {};
  const imageRegistryRaw = Array.isArray(input.imageRegistry)
    ? input.imageRegistry
    : Array.isArray(input.images)
      ? input.images
      : [];
  const selectedPrimaryIds = getMasterSourcePrimaryImageIds(input, manifest);
  const archiveOptionalIds = getMasterSourceArchiveImageIds(input, manifest);
  const imageRegistry = imageRegistryRaw.map((entry, index) => {
    const normalized = normalizeImageRegistryEntry(entry, { index: index + 1 });
    if (selectedPrimaryIds.size && selectedPrimaryIds.has(normalized.masterImageId)) {
      normalized.downloadRecommendation = "primaryTeachingSet";
    } else if (archiveOptionalIds.has(normalized.masterImageId)) {
      normalized.downloadRecommendation = "archiveOptionalDuplicate";
    }
    return normalized;
  });
  const createdAt = input.createdAt || manifest.createdAt || new Date().toISOString();
  const importedAt = new Date().toISOString();
  const cache = {
    version: 1,
    sourceKind: "master",
    sourceLabel: "RadPrimer + STATdx master source",
    articleTitle,
    titleKey: normalizeArticleTitleKey(articleTitle),
    createdAt,
    importedAt,
    packageText,
    manifest: {
      ...manifest,
      articleTitle: manifest.articleTitle || articleTitle,
      selectedPrimaryImageIds: Array.from(selectedPrimaryIds),
      archiveOptionalImageIds: Array.from(archiveOptionalIds)
    },
    imageRegistry,
    selectedPrimaryImageIds: Array.from(selectedPrimaryIds),
    archiveOptionalImageIds: Array.from(archiveOptionalIds),
    downloadFiles: flattenRegistryToDownloadFiles(imageRegistry),
    outputChars: packageText.length
  };

  if (!cache.titleKey) throw new Error("Master source import has no usable article title.");
  return cache;
}

function collectMasterImageIdsFromPlan(planGroup = {}) {
  const ids = new Set();
  for (const value of Object.values(planGroup || {})) {
    if (!Array.isArray(value)) continue;
    value.forEach((id) => {
      const text = String(id || "").trim();
      if (text) ids.add(text);
    });
  }
  return ids;
}

function getMasterSourcePrimaryImageIds(input = {}, manifest = {}) {
  const explicit = Array.isArray(input.selectedPrimaryImageIds)
    ? input.selectedPrimaryImageIds
    : Array.isArray(manifest.selectedPrimaryImageIds)
      ? manifest.selectedPrimaryImageIds
      : [];
  const ids = new Set(explicit.map((id) => String(id || "").trim()).filter(Boolean));
  const plan = input.sourceSelectionPlan || manifest.sourceSelectionPlan || {};
  const primaryPlan = plan?.imageDownloadPlan?.primaryTeachingSet || {};
  collectMasterImageIdsFromPlan(primaryPlan).forEach((id) => ids.add(id));
  return ids;
}

function getMasterSourceArchiveImageIds(input = {}, manifest = {}) {
  const explicit = Array.isArray(input.archiveOptionalImageIds)
    ? input.archiveOptionalImageIds
    : Array.isArray(manifest.archiveOptionalImageIds)
      ? manifest.archiveOptionalImageIds
      : [];
  const ids = new Set(explicit.map((id) => String(id || "").trim()).filter(Boolean));
  const plan = input.sourceSelectionPlan || manifest.sourceSelectionPlan || {};
  const archivePlan = plan?.imageDownloadPlan?.archiveOptionalDuplicates || {};
  collectMasterImageIdsFromPlan(archivePlan).forEach((id) => ids.add(id));
  return ids;
}

function buildMasterSourceCacheFromFiles(files = []) {
  const importFile = pickNamedFile(files, [/master[_-]source[_-]import\.json$/i]);
  if (importFile) {
    const parsed = parseJsonMaybe(importFile.text);
    if (!parsed || typeof parsed !== "object") throw new Error("master_source_import.json is not valid JSON.");
    return normalizeMasterSourceCache(parsed);
  }

  const packageFile = pickNamedFile(files, [/master[_-]source[_-]package\.txt$/i]);
  const manifestFile = pickNamedFile(files, [/master[_-]source[_-]manifest\.json$/i]);
  const registryFile = pickNamedFile(files, [/image[_-]registry\.json$/i]);

  if (!packageFile) throw new Error("Select master_source_import.json or master_source_package.txt.");
  const manifest = parseJsonMaybe(manifestFile?.text, {});
  const imageRegistry = parseJsonMaybe(registryFile?.text, []);
  if (registryFile && !Array.isArray(imageRegistry)) {
    throw new Error("image_registry.json must contain a JSON array.");
  }

  return normalizeMasterSourceCache({
    articleTitle: manifest?.articleTitle || "",
    packageText: packageFile.text,
    manifest,
    imageRegistry
  });
}

async function storeMasterSourceCache(cache) {
  const finalCache = normalizeMasterSourceCache(cache);
  const titleKey = getMasterSourceCacheKey(finalCache.articleTitle);
  const payload = {
    [MASTER_SOURCE_CACHE_KEY]: finalCache
  };
  if (titleKey) payload[titleKey] = finalCache;
  await chrome.storage.local.set(payload);
  return finalCache;
}

async function getLatestMasterSourceCache() {
  const stored = await chrome.storage.local.get(MASTER_SOURCE_CACHE_KEY);
  return stored[MASTER_SOURCE_CACHE_KEY] || null;
}

function buildMasterSourcePromptPackage(settings, promptText, masterSource) {
  const title = masterSource?.articleTitle || "Radiology Master Source";
  const manifestText = JSON.stringify(masterSource?.manifest || {}, null, 2);
  const registryText = JSON.stringify(masterSource?.imageRegistry || [], null, 2);
  const sourcePackage = String(masterSource?.packageText || "").trim();

  return [
    "=== MASTER SOURCE MODE ===",
    "Use the fused master source below as the active article/source package for this run.",
    "Image references are source-qualified. Preserve labels such as RP-05, SDX-04, RadPrimer image 5, and STATdx image 4 in metadata, card image fields, audit blocks, and download/file references.",
    "If images from both sources are used, never collapse them into bare image numbers without source labels.",
    "For narrative prose meant to be spoken aloud, say only one clean source-qualified reference per image, such as RadPrimer image 5 or STATdx image 4. Do not say both the long label and the short code, such as STATdx image 4, SDX-04.",
    "",
    "=== TOPIC ===",
    `PRIMARY TOPIC: ${title}`,
    `CENTERING TOPIC FOR THIS CHAT: ${title}`,
    `USE THIS AS THE CHAT TITLE / WORKING TOPIC LABEL: ${title}`,
    "",
    settings.mode === "narrative" || settings.mode === "narrative_with_images"
      ? ""
      : `=== CORE VALIDATION INPUT ===\n${[
          settings.coreGap
            ? "Pathway B - Core GAP explicitly invoked."
            : "Pathway A - Core Radiology cross-check available or requested.",
          settings.coreGap
            ? "Core GAP: use only the fused master source plus any explicitly supplied Core evidence."
            : `Core section/chapter/pages: ${settings.coreSection || "[SECTION NOT PROVIDED]"}${
                settings.corePages ? ` | pages: ${settings.corePages}` : ""
              }`,
          "Treat Core-specific claims as verified only when the fused source or imported evidence explicitly supports them."
        ].join("\n")}`,
    "",
    "=== PROMPT ===",
    promptText,
    "",
    "=== FUSED MASTER SOURCE PACKAGE ===",
    sourcePackage || "[master_source_package.txt was empty]",
    "",
    "=== MASTER IMAGE REGISTRY ===",
    registryText,
    "",
    "=== MASTER SOURCE MANIFEST ===",
    manifestText,
    "",
    "=== SOURCE ATTRIBUTION ===",
    "Primary source label: RadPrimer + STATdx master source",
    "Source note: Generated by Codex from paired RadPrimer and STATdx comparison bundles."
  ]
    .filter((part) => part !== "")
    .join("\n");
}

function buildMasterSourceExtraction(settings, promptText, masterSource) {
  const title = masterSource?.articleTitle || "Radiology Master Source";
  const imageRegistry = Array.isArray(masterSource?.imageRegistry) ? masterSource.imageRegistry : [];
  const downloadableIds = new Set(
    Array.isArray(masterSource?.downloadFiles)
      ? masterSource.downloadFiles.map((file) => file.masterImageId).filter(Boolean)
      : []
  );
  const selectedPrimaryIds = new Set(
    Array.isArray(masterSource?.selectedPrimaryImageIds) ? masterSource.selectedPrimaryImageIds : []
  );
  const activePrimaryIds = downloadableIds.size ? downloadableIds : selectedPrimaryIds;
  const primaryImageRegistry = activePrimaryIds.size
    ? imageRegistry.filter((entry) => activePrimaryIds.has(entry.masterImageId))
    : imageRegistry;
  const selectedImages = primaryImageRegistry
    .map((entry, index) => entry.sourceImageNumber || index + 1)
    .filter((value) => Number.isFinite(Number(value)));
  const sourceQualifiedImages = primaryImageRegistry
    .map((entry) => ({
      masterImageId: entry.masterImageId || "",
      sourceKind: entry.sourceKind || "",
      sourceLabel: entry.sourceLabel || "",
      sourceImageNumber: entry.sourceImageNumber || null,
      label:
        entry.masterImageId ||
        `${entry.sourceLabel || entry.sourceKind || "Source"} image ${entry.sourceImageNumber || ""}`.trim(),
      caption: entry.caption || ""
    }))
    .filter((entry) => entry.masterImageId || entry.sourceImageNumber);
  const cases = primaryImageRegistry
    .filter((entry) => Array.isArray(entry.groupNumbers) && entry.groupNumbers.length)
    .map((entry) => entry.groupNumbers);

  return {
    output: buildMasterSourcePromptPackage(settings, promptText, masterSource),
    downloadFiles: Array.isArray(masterSource?.downloadFiles)
      ? masterSource.downloadFiles
      : flattenRegistryToDownloadFiles(imageRegistry),
    meta: {
      title,
      sourceKind: "master",
      primarySourceLabel: "RadPrimer + STATdx master source",
      breadcrumbTrail: masterSource?.manifest?.canonicalHierarchy || [],
      totalImagesOnPage: imageRegistry.length,
      selectedImages,
      masterImageIds: sourceQualifiedImages.map((entry) => entry.masterImageId).filter(Boolean),
      archiveOptionalImageIds: Array.isArray(masterSource?.archiveOptionalImageIds)
        ? masterSource.archiveOptionalImageIds
        : [],
      sourceQualifiedImages,
      cases,
      imageRegistry,
      primaryImageRegistry,
      outputChars: String(masterSource?.packageText || "").length,
      masterSource: {
        importedAt: masterSource?.importedAt || "",
        createdAt: masterSource?.createdAt || "",
        sourceLabel: masterSource?.sourceLabel || "RadPrimer + STATdx master source"
      }
    }
  };
}

async function prepareCardAuditDownloadBundle({ pendingId, sentinelText = "", chatGptTabId = null }) {
  if (!pendingId) throw new Error("Missing card audit pending id.");
  const pending = await takePendingCardAuditRun(pendingId);
  if (!pending) throw new Error("Could not find pending RadPrimer card audit run.");

  const createdAt = new Date().toISOString();
  const title = pending.articleTitle || pending.extractionMeta?.title || "radprimer_cards";
  const folderName = `${sanitizeDownloadPathPart(title)}_${createdAt.replace(/[:.]/g, "-")}`;
  const coreEvidence = extractCoreEvidenceBlock(sentinelText);
  const metadata = createCardAuditMetadata(pending, createdAt, {
    generatedViaDownload: true,
    downloadSentinel: sentinelText,
    coreEvidenceStatus: coreEvidence.status,
    coreEvidenceProvided: coreEvidence.provided,
    coreEvidenceChars: coreEvidence.text.length
  });

  await sendPageStatus(
    pending.radPrimerTabId,
    "Audit Bundle",
    "Preparing audit bundle and waiting for ChatGPT TSV download..."
  );

  await downloadAuditTextFile(folderName, "source_package.txt", pending.sourcePackage || "");
  await downloadAuditTextFile(folderName, "core_evidence.txt", coreEvidence.text);
  await downloadAuditTextFile(
    folderName,
    "metadata.json",
    JSON.stringify(metadata, null, 2),
    "application/json;charset=utf-8"
  );
  await downloadAuditTextFile(folderName, "audit_instructions.md", buildAuditInstructions(metadata), "text/markdown;charset=utf-8");

  activeCardAuditDownload = {
    pendingId,
    folderName,
    metadata,
    pending,
    createdAt,
    coreEvidence,
    preparedAtMs: Date.now(),
    chatGptTabId,
    expiresAt: Date.now() + 10 * 60 * 1000,
    downloadId: null,
    originalDownload: null
  };

  return {
    folderName,
    downloadFolder: `Downloads\\${CARD_AUDIT_SUBFOLDER}\\${folderName}`,
    metadata
  };
}

function isDownloadInPreparedCardAuditBundle(item, active) {
  if (!item || !active?.folderName) return false;
  const filename = String(item.filename || "").replace(/\//g, "\\").toLowerCase();
  const expected = getCardAuditGeneratedCardsPath(active.folderName).replace(/\//g, "\\").toLowerCase();
  return filename.endsWith(expected);
}

async function findPreparedCardAuditDownload(active) {
  if (!active) return null;
  const startedAfter = new Date(Math.max(0, (active.preparedAtMs || Date.now()) - 30000)).toISOString();
  const items = await chrome.downloads.search({ startedAfter });

  const routed = items
    .filter((item) => isDownloadInPreparedCardAuditBundle(item, active))
    .sort((a, b) => (b.startTime || "").localeCompare(a.startTime || ""))[0];
  if (routed) return routed;

  return items
    .filter((item) => isActiveCardAuditDownloadCandidate(item, active))
    .sort((a, b) => (b.startTime || "").localeCompare(a.startTime || ""))[0] || null;
}

async function redownloadCardAuditTsvToBundle(downloadedItem, active) {
  const sourceUrl = downloadedItem?.finalUrl || downloadedItem?.url || "";
  if (!sourceUrl || /^blob:|^filesystem:/i.test(sourceUrl)) return null;

  const downloadId = await chrome.downloads.download({
    url: sourceUrl,
    filename: getCardAuditGeneratedCardsPath(active.folderName),
    conflictAction: "overwrite",
    saveAs: false
  });
  return waitForDownloadComplete(downloadId, 120000);
}

async function completePreparedCardAuditBundleFromGeneratedCards({
  pendingId,
  generatedCards,
  generatedDownload = {},
  generatedCardsMode = "downloaded"
}) {
  const active = activeCardAuditDownload;
  if (!active || active.pendingId !== pendingId) {
    throw new Error("No prepared card-audit TSV bundle is active.");
  }

  const text = String(generatedCards || "");
  if (text.trim()) {
    await downloadAuditTextFile(
      active.folderName,
      "generated_cards.tsv",
      text,
      "text/tab-separated-values;charset=utf-8"
    );
  } else if (generatedCardsMode !== "downloaded") {
    throw new Error("No generated TSV text was provided.");
  }

  const pending = active.pending;
  const metadata = {
    ...active.metadata,
    generatedDownload
  };

  await downloadAuditTextFile(
    active.folderName,
    "metadata.json",
    JSON.stringify(metadata, null, 2),
    "application/json;charset=utf-8"
  );
  await downloadAuditTextFile(
    active.folderName,
    "_bundle_complete.txt",
    `complete=true\ncreatedAt=${active.createdAt}\narticleTitle=${metadata.articleTitle}\ngeneratedCards=${generatedCardsMode}\n`
  );

  const bundle = {
    folderName: active.folderName,
    downloadFolder: `Downloads\\${CARD_AUDIT_SUBFOLDER}\\${active.folderName}`,
    metadata
  };

  await clearPendingCardAuditRun(pendingId);
  activeCardAuditDownload = null;

  await sendPageStatus(
    pending.radPrimerTabId,
    "Audit Bundle Ready",
    `Saved card audit bundle: ${bundle.downloadFolder}. Wake-up message will be copied to the clipboard.`,
    { done: true }
  );

  return {
    bundle,
    clipboardText: buildAuditWakeMessage(bundle)
  };
}

async function waitForPreparedCardAuditDownload(pendingId, timeoutMs = 180000) {
  const active = activeCardAuditDownload;
  if (!active || active.pendingId !== pendingId) {
    throw new Error("No prepared card-audit TSV download is active.");
  }

  const start = Date.now();
  while (!active.downloadId && Date.now() - start < timeoutMs) {
    const found = await findPreparedCardAuditDownload(active);
    if (found?.id) {
      active.downloadId = found.id;
      active.originalDownload = active.originalDownload || downloadItemSnapshot(found);
      break;
    }
    await sleep(250);
  }

  if (!active.downloadId) {
    activeCardAuditDownload = null;
    throw new Error("Timed out waiting for ChatGPT to start the TSV download.");
  }

  let downloadedItem = await waitForDownloadComplete(active.downloadId, timeoutMs);
  let reroutedDownload = null;
  if (!isDownloadInPreparedCardAuditBundle(downloadedItem, active)) {
    reroutedDownload = await redownloadCardAuditTsvToBundle(downloadedItem, active);
    if (!reroutedDownload || !isDownloadInPreparedCardAuditBundle(reroutedDownload, active)) {
      activeCardAuditDownload = null;
      throw new Error(
        "ChatGPT TSV download completed, but Edge did not route it into the RadPrimer audit bundle as generated_cards.tsv."
      );
    }
    downloadedItem = reroutedDownload;
  }
  return completePreparedCardAuditBundleFromGeneratedCards({
    pendingId,
    generatedCards: "",
    generatedCardsMode: "downloaded",
    generatedDownload: {
      originalFilename: active.originalDownload?.filename || downloadedItem?.filename || "",
      originalUrl: active.originalDownload?.url || downloadedItem?.url || "",
      originalFinalUrl: active.originalDownload?.finalUrl || downloadedItem?.finalUrl || "",
      mime: active.originalDownload?.mime || downloadedItem?.mime || "",
      downloadId: active.downloadId,
      routedFilename: downloadedItem?.filename || "",
      reroutedDownloadId: reroutedDownload?.id || null
    }
  });
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

async function ensureChatGptPaster(tabId) {
  await installChatGptDraftQuotaGuard(tabId);
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["chatgpt-paster.js"]
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
    autoSave: settings.speechifyAutoSave === true
  };
}

function buildChatGptComposerText(settings, packageText, options = {}) {
  const instruction = settings.chatgptInstruction || DEFAULTS.chatgptInstruction;
  const extraInstruction = String(options.extraComposerInstruction || "").trim();
  return [instruction, packageText, extraInstruction].filter(Boolean).join("\n\n");
}

async function openChatGptAndStart(settings, packageText, articleTitle, options = {}) {
  const url = settings.chatgptUrl || DEFAULTS.chatgptUrl;
  if (!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(url)) {
    throw new Error("ChatGPT URL must start with https://chatgpt.com/ or https://chat.openai.com/");
  }

  const composerText = buildChatGptComposerText(settings, packageText, options);
  const tab = await chrome.tabs.create({ url, active: false });

  await waitForTabComplete(tab.id, 45000, "ChatGPT");
  await ensureChatGptPaster(tab.id);

  const response = await sendTabMessage(tab.id, {
    type: "CHATGPT_FILL_COMPOSER",
    text: composerText,
    autoSubmit: Boolean(settings.autoSubmitChatGPT),
    waitForResult: Boolean(
      options.waitForResult ?? (settings.autoSubmitChatGPT && isNarrativeSpeechifyMode(settings))
    ),
    timeoutMs: options.timeoutMs || timeoutMsFromSeconds(settings.chatgptTimeoutSec, 900, 30),
    speechify: options.speechify === undefined ? buildSpeechifyPayload(settings, articleTitle) : options.speechify,
    backgroundRun: options.backgroundRun !== false,
    preserveAuditBlock: Boolean(options.preserveAuditBlock),
    expectedOutputKind: options.expectedOutputKind || "",
    completionMessageType: options.completionMessageType,
    completionPayload: options.completionPayload || null
  });

  if (!response?.ok) throw new Error(response?.error || "Could not start ChatGPT workflow.");
  return response;
}

async function runImaiosLiveDrillCardAutomation(message, senderTab) {
  const imaiosTabId = senderTab?.id || Number(message.imaiosTabId || 0);
  if (!imaiosTabId) throw new Error("No IMAIOS tab was available for the live-drill card run.");
  const promptText = String(message.promptText || "").trim();
  if (!promptText) throw new Error("No live-drill card prompt was provided.");
  const sourcePayload = message.sourcePayload && typeof message.sourcePayload === "object"
    ? message.sourcePayload
    : null;
  if (!sourcePayload || !["imaios-live-drill", "imaios-live-drill-batch-source"].includes(sourcePayload.kind)) {
    throw new Error("No valid live-drill source payload was provided.");
  }

  const settings = await loadRunnerSettings();
  settings.openChatGPT = true;
  settings.autoSubmitChatGPT = true;
  settings.autoSendToSpeechify = false;
  settings.speechifyAutoSave = false;

  const response = await openChatGptAndStart(
    settings,
    promptText,
    sourcePayload.title || sourcePayload.topic || "IMAIOS live drill cards",
    {
      waitForResult: true,
      timeoutMs: timeoutMsFromSeconds(settings.chatgptTimeoutSec, 900, 60),
      speechify: null,
      backgroundRun: true,
      preserveAuditBlock: true,
      expectedOutputKind: "imaios_live_drill_card_plan",
      completionMessageType: "IMAIOS_LIVE_DRILL_CARD_PLAN_DONE",
      completionPayload: {
        imaiosTabId,
        sourceDrillId: sourcePayload.id || sourcePayload.sourceDrillId || "",
        sourcePayload
      }
    }
  );

  return {
    started: Boolean(response?.started || response?.submitted || response?.ok),
    chars: promptText.length,
    sourceDrillId: sourcePayload.id || sourcePayload.sourceDrillId || "",
    title: sourcePayload.title || sourcePayload.topic || "",
    message: "Sent live-drill card prompt to ChatGPT. The TSV will be generated back in IMAIOS when the plan is ready."
  };
}

function isNonNarrativeMode(settings) {
  return Boolean(settings) && !isNarrativeSpeechifyMode(settings) && !isIoQueueMode(settings);
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
  if (settings?.useMasterSource) return false;
  if (!settings?.autoGroupNonNarrative) return false;
  if (!settings.openChatGPT || !settings.autoSubmitChatGPT) return false;
  if (!isNonNarrativeMode(settings)) return false;
  if (isNoPictureCardMode(settings)) return false;
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

async function savePendingCardAuditRun(pendingId, payload) {
  await chrome.storage.local.set({ [`${PENDING_CARD_AUDIT_PREFIX}${pendingId}`]: payload });
}

async function takePendingCardAuditRun(pendingId) {
  const key = `${PENDING_CARD_AUDIT_PREFIX}${pendingId}`;
  const stored = await chrome.storage.local.get(key);
  return stored[key] || null;
}

async function clearPendingCardAuditRun(pendingId) {
  await chrome.storage.local.remove(`${PENDING_CARD_AUDIT_PREFIX}${pendingId}`);
}

function normalizeAuditMatchText(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractTopicLabelsFromText(text) {
  const value = String(text || "");
  const labels = [];
  const patterns = [
    /PRIMARY TOPIC:\s*([^\n\r]+)/gi,
    /CENTERING TOPIC FOR THIS CHAT:\s*([^\n\r]+)/gi,
    /USE THIS AS THE CHAT TITLE\s*\/\s*WORKING TOPIC LABEL:\s*([^\n\r]+)/gi,
    /Topic:\s*([^\n\r]+)/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(value))) {
      const label = String(match[1] || "")
        .replace(/\s{2,}.*/, "")
        .replace(/[.。]\s*$/, "")
        .trim();
      if (label && label.length <= 160) labels.push(label);
    }
  }

  return labels;
}

function uniqueAuditLabels(values) {
  const seen = new Set();
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = normalizeAuditMatchText(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function getAllPendingCardAuditRuns() {
  const stored = await chrome.storage.local.get(null);
  return Object.entries(stored)
    .filter(([key, value]) => key.startsWith(PENDING_CARD_AUDIT_PREFIX) && value)
    .map(([key, pending]) => ({
      pendingId: key.slice(PENDING_CARD_AUDIT_PREFIX.length),
      pending
    }))
    .sort((a, b) => (b.pending?.createdAt || 0) - (a.pending?.createdAt || 0));
}

async function getLatestPendingCardAuditRun() {
  return (await getAllPendingCardAuditRuns())[0] || null;
}

function getPendingCardAuditTitleLabels(pending) {
  return uniqueAuditLabels([
    pending?.articleTitle,
    pending?.extractionMeta?.title,
    pending?.extractionMeta?.primaryTopic,
    pending?.extractionMeta?.workingTopic,
    ...(Array.isArray(pending?.extractionMeta?.breadcrumbTrail) ? pending.extractionMeta.breadcrumbTrail : []),
    ...extractTopicLabelsFromText(String(pending?.sourcePackage || "").slice(0, 12000))
  ]);
}

function scorePendingCardAuditMatch(pending, normalizedHints) {
  const labels = getPendingCardAuditTitleLabels(pending);
  let score = 0;

  for (const label of labels) {
    const normalizedLabel = normalizeAuditMatchText(label);
    if (!normalizedLabel || normalizedLabel.length < 4) continue;

    for (const normalizedHint of normalizedHints) {
      if (!normalizedHint || normalizedHint.length < 4) continue;

      if (normalizedLabel === normalizedHint) {
        score = Math.max(score, 100);
      } else if (
        normalizedLabel.length >= 8 &&
        normalizedHint.length >= 8 &&
        (normalizedLabel.includes(normalizedHint) || normalizedHint.includes(normalizedLabel))
      ) {
        score = Math.max(score, 80);
      }
    }
  }

  return score;
}

function describePendingCardAuditRun(entry) {
  const labels = getPendingCardAuditTitleLabels(entry?.pending);
  const title = labels[0] || entry?.pendingId || "untitled";
  const stamp = entry?.pending?.createdAt ? new Date(entry.pending.createdAt).toLocaleString() : "unknown time";
  return `${title} (${stamp})`;
}

async function choosePendingCardAuditRunForChatContext(context = {}) {
  const pendingRuns = await getAllPendingCardAuditRuns();
  if (!pendingRuns.length) {
    throw new Error("No pending card-audit run was found. If needed, export an audit source bundle from the article page.");
  }

  const titleHints = uniqueAuditLabels([
    ...(Array.isArray(context?.titleHints) ? context.titleHints : []),
    ...extractTopicLabelsFromText(context?.snippet || ""),
    context?.pageTitle
  ]).filter((hint) => normalizeAuditMatchText(hint) !== "chatgpt");

  const normalizedHints = uniqueAuditLabels(titleHints)
    .map(normalizeAuditMatchText)
    .filter((hint) => hint.length >= 4);

  if (!normalizedHints.length) {
    if (pendingRuns.length === 1) return pendingRuns[0];
    throw new Error(
      `Could not identify the current ChatGPT topic. Pending audit runs: ${pendingRuns.map(describePendingCardAuditRun).join(" | ")}.`
    );
  }

  const matches = pendingRuns
    .map((entry) => ({
      entry,
      score: scorePendingCardAuditMatch(entry.pending, normalizedHints)
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || (b.entry.pending?.createdAt || 0) - (a.entry.pending?.createdAt || 0));

  if (matches.length) return matches[0].entry;

  throw new Error(
    `No pending card-audit run matched this ChatGPT page (${titleHints.join(" / ")}). Pending audit runs: ${pendingRuns
      .map(describePendingCardAuditRun)
      .join(" | ")}.`
  );
}

async function openFinalCardPrompt(settings, extraction, tab, statusPrefix = "card prompt") {
  const articleTitle = extraction.meta?.title || "";

  if (!shouldCaptureCardAuditBundle(settings)) {
    await openChatGptAndStart(settings, extraction.output, articleTitle, {
      waitForResult: false,
      speechify: null
    });
    return {
      message: `Sent ${statusPrefix} to ChatGPT. This mode stops after submission.`,
      capturing: false
    };
  }

  const pendingId = crypto.randomUUID();
  await savePendingCardAuditRun(pendingId, {
    radPrimerTabId: tab.id,
    radPrimerUrl: tab.url || "",
    settings,
    articleTitle,
    sourcePackage: extraction.output,
    extractionMeta: extraction.meta || {},
    downloadFiles: extraction.downloadFiles || [],
    createdAt: Date.now()
  });

  await openChatGptAndStart(settings, extraction.output, articleTitle, {
    waitForResult: true,
    speechify: null,
    extraComposerInstruction: CARD_AUDIT_DOWNLOAD_OUTPUT_INSTRUCTION,
    expectedOutputKind: "card_tsv_download",
    timeoutMs: timeoutMsFromSeconds(settings.cardAuditTimeoutSec, 3600, 600),
    completionMessageType: "RADPRIMER_CARD_AUDIT_CAPTURE_DONE",
    completionPayload: { pendingId, radPrimerTabId: tab.id }
  });

  return {
    message: `Sent ${statusPrefix} to ChatGPT. The generated cards will be captured into an audit bundle.`,
    capturing: true
  };
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
  let extraction;
  if (settings.useMasterSource) {
    await sendPageStatus(
      radPrimerTabId,
      "Master Source",
      "Rebuilding final grouped prompt package from imported fused master source..."
    );
    const masterSource = await getLatestMasterSourceCache();
    if (!masterSource?.packageText) {
      throw new Error("Use master source is enabled, but no imported master source was found. Import master_source_import.json first.");
    }
    extraction = buildMasterSourceExtraction(settings, promptText, masterSource);
  } else {
    await sendPageStatus(radPrimerTabId, "Extracting", "Rebuilding final prompt package with grouped images...");
    extraction = await extractRadPrimerArticle(radPrimerTabId, settings, promptText);
  }

  if (settings.downloadImages && extraction.downloadFiles?.length) {
    await sendPageStatus(radPrimerTabId, "Images", "Downloading grouped image files...");
    const result = await downloadSelectedImages(extraction.downloadFiles, settings);
    await sendPageStatus(radPrimerTabId, "Images", describeImageDownloadResult(result));
  }

  await sendPageStatus(
    radPrimerTabId,
    "ChatGPT",
    shouldCaptureCardAuditBundle(settings)
      ? "Opening ChatGPT with the final card prompt and audit capture enabled..."
      : "Opening ChatGPT with the final card prompt..."
  );
  const finalRun = await openFinalCardPrompt(settings, extraction, radPrimerTab, "grouped card-mode prompt");

  await sendPageStatus(radPrimerTabId, "Sent", finalRun.message || "Grouped card-mode prompt sent to ChatGPT.", {
    done: true
  });

  return finalRun;
}

async function runRadPrimerFromPage(tab) {
  const articleSource = assertSupportedArticleTab(tab);

  await sendPageStatus(tab.id, "Loading", "Loading saved runner settings...");
  const settings = await loadRunnerSettings();

  if (isIoQueueMode(settings)) {
    await sendPageStatus(tab.id, "IO Queue", "Building image-occlusion queue from this article...");
    return runRadPrimerIoQueue(tab);
  }

  await sendPageStatus(tab.id, "Prompt", `Loading ${settings.engine}/${settings.mode} prompt...`);
  const promptText = await loadPrompt(settings.engine, settings.mode);

  let extraction;
  if (settings.useMasterSource) {
    await sendPageStatus(tab.id, "Master Source", "Loading imported fused master source...");
    const masterSource = await getLatestMasterSourceCache();
    if (!masterSource?.packageText) {
      throw new Error("Use master source is enabled, but no imported master source was found. Import master_source_import.json in the popup first.");
    }
    extraction = buildMasterSourceExtraction(settings, promptText, masterSource);
  } else {
    await sendPageStatus(tab.id, "Extracting", `Extracting ${articleSource.displayName} article and image captions...`);
    extraction = await extractRadPrimerArticle(tab.id, settings, promptText);
  }
  const willRunGroupingPreflight =
    shouldRunGroupingPreflight(settings) && extraction.meta?.totalImagesOnPage > 1;

  if (!willRunGroupingPreflight && settings.downloadImages && extraction.downloadFiles?.length) {
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

  if (willRunGroupingPreflight) {
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
    const groupingExtraction = settings.useMasterSource
      ? buildMasterSourceExtraction(groupingSettings, groupingPromptText, await getLatestMasterSourceCache())
      : await extractRadPrimerArticle(tab.id, groupingSettings, groupingPromptText);
    const pendingId = crypto.randomUUID();
    await savePendingGroupingRun(pendingId, {
      radPrimerTabId: tab.id,
      radPrimerUrl: tab.url || "",
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
  const willCaptureCardAudit = shouldCaptureCardAuditBundle(settings);
  await sendPageStatus(
    tab.id,
    "ChatGPT",
    willWaitForNarrative
      ? "Opening ChatGPT and starting the narrative job..."
      : willCaptureCardAudit
        ? "Opening ChatGPT, sending the card prompt, and capturing the generated cards for audit..."
      : "Opening ChatGPT, focusing it, and sending the prompt..."
  );
  let finalRun = null;
  if (willCaptureCardAudit) {
    finalRun = await openFinalCardPrompt(settings, extraction, tab, "card-mode prompt");
  } else {
    await openChatGptAndStart(settings, extraction.output, extraction.meta?.title || "");
  }
  await sendPageStatus(
    tab.id,
    "Sent",
    willWaitForNarrative
      ? "Sent to ChatGPT. The ChatGPT tab will capture the narrative and send it to Speechify if enabled."
      : willCaptureCardAudit
        ? finalRun?.message || "Sent to ChatGPT. The generated cards will be captured into an audit bundle."
      : "Sent to ChatGPT. This mode stops after submission.",
    { done: true }
  );

  return {
    message: willWaitForNarrative
      ? "Sent to ChatGPT. The ChatGPT tab will capture the narrative and send it to Speechify if enabled."
      : willCaptureCardAudit
        ? finalRun?.message || "Sent to ChatGPT. The generated cards will be captured into an audit bundle."
      : "Sent to ChatGPT. This mode stops after submission."
  };
}

async function runRadPrimerImageDownloadOnly(tab) {
  const articleSource = assertSupportedArticleTab(tab);

  await sendPageStatus(tab.id, "Images", "Preparing image-only download...");
  const settings = getImageOnlySettings(await loadRunnerSettings());
  const promptText = await loadPrompt(settings.engine, settings.mode);

  let extraction;
  if (settings.useMasterSource) {
    await sendPageStatus(tab.id, "Master Source", "Loading imported fused master source image plan...");
    const masterSource = await getLatestMasterSourceCache();
    if (!masterSource?.packageText) {
      throw new Error("Use master source is enabled, but no imported master source was found. Import master_source_import.json first.");
    }
    extraction = buildMasterSourceExtraction(settings, promptText, masterSource);
  } else {
    await sendPageStatus(tab.id, "Extracting", `Extracting selected ${articleSource.displayName} image list...`);
    extraction = await extractRadPrimerArticle(tab.id, settings, promptText);
  }

  if (!extraction.downloadFiles?.length) {
    const message = settings.useMasterSource
      ? "No curated master-source image URLs were available to download. Re-export the RadPrimer/STATdx comparison sources so their metadata includes image URLs, then rebuild/import the master source."
      : "No image files were selected for download.";
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

async function runRadPrimerIoQueue(tab) {
  const articleSource = assertSupportedArticleTab(tab);

  await sendPageStatus(tab.id, "IO Queue", "Preparing annotated Image Occlusion queue...");
  const storedSettings = await loadRunnerSettings();
  const settings = {
    ...storedSettings,
    mode: "chatgpt_cards",
    include: "all",
    downloadImages: true,
    downloadPlain: false,
    downloadAnnotated: true,
    keepCaptionHtml: true,
    openChatGPT: false,
    autoSubmitChatGPT: false,
    autoSendToSpeechify: false,
    speechifyAutoSave: false
  };
  const promptText = await loadPrompt(settings.engine, settings.mode);

  let extraction;
  if (settings.useMasterSource) {
    await sendPageStatus(tab.id, "Master Source", "Loading imported fused master source image plan...");
    const masterSource = await getLatestMasterSourceCache();
    if (!masterSource?.packageText) {
      throw new Error("Use master source is enabled, but no imported master source was found. Import master_source_import.json first.");
    }
    extraction = buildMasterSourceExtraction(settings, promptText, masterSource);
    const annotatedFiles = (extraction.downloadFiles || []).filter((file) =>
      file.variant === "annotated" || /_annot(?=\.)/i.test(String(file.filename || ""))
    );
    if (annotatedFiles.length) extraction = { ...extraction, downloadFiles: annotatedFiles };
  } else {
    await sendPageStatus(tab.id, "Extracting", `Extracting all ${articleSource.displayName} image captions for IO...`);
    extraction = await extractRadPrimerArticle(tab.id, settings, promptText);
  }

  if (!extraction.downloadFiles?.length) {
    const message = "No annotated image files were available for the Image Occlusion queue.";
    await sendPageStatus(tab.id, "IO Queue", message, { done: true });
    return { message, meta: extraction.meta || null };
  }

  await sendPageStatus(tab.id, "Images", "Downloading annotated images into the IO queue folder...");
  const downloadResult = await downloadSelectedImages(extraction.downloadFiles, settings, {
    subfolder: IO_QUEUE_IMAGE_SUBFOLDER,
    clearSubfolder: IO_QUEUE_SUBFOLDER
  });

  await sendPageStatus(tab.id, "Queue", "Writing Image Occlusion queue.json...");
  const queue = await downloadIoQueueFiles(extraction, downloadResult);
  const message = [
    `Built Image Occlusion queue with ${queue.total_items} item(s).`,
    `Annotated images and queue.json are in Downloads\\${IO_QUEUE_SUBFOLDER}.`,
    "Open Anki -> Tools -> Image Occlusion Queue Runner; the add-on can load this default queue."
  ].join(" ");
  await sendPageStatus(tab.id, "IO Queue Ready", message, { done: true });

  return {
    message,
    meta: extraction.meta || null,
    download: downloadResult,
    queue: {
      totalItems: queue.total_items,
      folder: IO_QUEUE_SUBFOLDER,
      queuePath: `${IO_QUEUE_SUBFOLDER}/queue.json`
    }
  };
}

async function exportRadPrimerAuditSourceOnly(tab) {
  assertSupportedArticleTab(tab);

  await sendPageStatus(tab.id, "Audit Source", "Extracting source-only audit bundle...");
  const settings = {
    ...(await loadRunnerSettings()),
    // Keep image URL metadata in source-only bundles. This does not download files here;
    // it only asks the extractor to include URL-bearing downloadFiles/imageRegistry.
    downloadImages: true,
    openChatGPT: false,
    autoSubmitChatGPT: false,
    autoSendToSpeechify: false,
    speechifyAutoSave: false
  };
  const promptText = SOURCE_COMPARE_EXTRACTION_PROMPT;
  const extraction = await extractRadPrimerArticle(tab.id, settings, promptText);
  const pending = {
    radPrimerTabId: tab.id,
    radPrimerUrl: tab.url || "",
    settings,
    articleTitle: extraction.meta?.title || "",
    sourcePackage: extraction.output,
    extractionMeta: extraction.meta || {},
    downloadFiles: extraction.downloadFiles || [],
    createdAt: Date.now()
  };
  const bundle = await stageCardAuditSourceOnlyBundle({ pending });
  const clipboardText = buildSourceOnlyWakeMessage(bundle);

  await sendPageStatus(
    tab.id,
    "Audit Source Ready",
    `Saved source-only audit bundle: ${bundle.downloadFolder}.`,
    { done: true }
  );

  return {
    bundle,
    clipboardText,
    message: `Saved source-only audit bundle: ${bundle.downloadFolder}.`
  };
}

async function exportArticleSourceComparison(tab, options = {}) {
  const articleSource = assertSupportedArticleTab(tab);

  await sendPageStatus(tab.id, "Compare Source", `Extracting ${articleSource.displayName} comparison source bundle...`);
  const settings = {
    ...(await loadRunnerSettings()),
    ...(options.settingsOverride || {}),
    // Keep image URL metadata in comparison bundles so a later fused master source
    // can download only its curated image set. This does not download files here;
    // it only asks the extractor to include URL-bearing downloadFiles/imageRegistry.
    mode: "chatgpt_cards",
    include: "all",
    caseMap: "",
    downloadImages: true,
    downloadPlain: true,
    downloadAnnotated: true,
    keepCaptionHtml: true,
    openChatGPT: false,
    autoSubmitChatGPT: false,
    autoSendToSpeechify: false,
    speechifyAutoSave: false
  };
  const promptText = SOURCE_COMPARE_EXTRACTION_PROMPT;
  const extraction = await extractRadPrimerArticle(tab.id, settings, promptText);
  const pending = {
    radPrimerTabId: tab.id,
    radPrimerUrl: tab.url || "",
    settings,
    articleTitle: extraction.meta?.title || "",
    sourcePackage: extraction.output,
    extractionMeta: extraction.meta || {},
    downloadFiles: extraction.downloadFiles || [],
    createdAt: Date.now()
  };
  const bundle = await stageSourceCompareBundle({ pending });
  const cache = await cacheSourceCompareBundle({ pending, bundle });
  const clipboardText = buildSourceCompareWakeMessage(bundle);
  const cacheMessage = cache
    ? ` Cached sources for this title: ${summarizeCachedComparisonSources(cache)}.`
    : "";

  await sendPageStatus(
    tab.id,
    "Compare Source Ready",
    `Saved comparison source bundle: ${bundle.downloadFolder}.${cacheMessage}`,
    { done: true }
  );

  return {
    bundle,
    cache,
    clipboardText,
    message: `Saved comparison source bundle: ${bundle.downloadFolder}.${cacheMessage}`
  };
}

async function runMasterSourceFromPage(tab, options = {}) {
  const currentSource = assertSupportedArticleTab(tab);
  const companionTabs = await findOpenCompanionArticleTabs(tab);
  const companionSource = getArticleSourceForKind(currentSource.kind === "radprimer" ? "statdx" : "radprimer");
  if (!companionTabs.length) {
    throw new Error(`Open a ${companionSource.label} article tab for the same topic, then run Build master source again.`);
  }

  await sendPageStatus(tab.id, "Master Source", "Checking open RadPrimer/STATdx article titles...");
  const currentTitle = await extractArticleTitleFromTab(tab);
  const companionTitleEntries = [];
  for (const companionTab of companionTabs) {
    const companionTabSource = assertSupportedArticleTab(companionTab);
    companionTitleEntries.push({
      tab: companionTab,
      tabId: companionTab.id,
      sourceKind: companionTabSource.kind,
      sourceLabel: companionTabSource.label,
      title: await extractArticleTitleFromTab(companionTab),
      url: companionTab.url || ""
    });
  }

  const currentChoice = {
    tabId: tab.id,
    sourceKind: currentSource.kind,
    sourceLabel: currentSource.label,
    title: currentTitle,
    url: tab.url || ""
  };
  const currentTitleKey = normalizeArticleTitleKey(currentTitle);
  let companionChoice =
    companionTitleEntries.find((entry) => normalizeArticleTitleKey(entry.title) === currentTitleKey) ||
    companionTitleEntries[0];
  const titlesMatch = Boolean(
    currentTitleKey &&
    normalizeArticleTitleKey(companionChoice.title) === currentTitleKey
  );

  const selectedPairingTitle = cleanArticleTitleText(options.selectedPairingTitle || "");
  let canonicalTitle = titlesMatch ? currentTitle : selectedPairingTitle;
  if (!titlesMatch && !canonicalTitle) {
    throw new MasterSourceTitleMismatchError({
      current: currentChoice,
      companionTabs: companionTitleEntries.map(({ tab, ...entry }) => entry)
    });
  }

  const allowedTitleKeys = new Set(
    [currentChoice, ...companionTitleEntries].map((entry) => normalizeArticleTitleKey(entry.title)).filter(Boolean)
  );
  if (!titlesMatch && !allowedTitleKeys.has(normalizeArticleTitleKey(canonicalTitle))) {
    throw new MasterSourceTitleMismatchError({
      current: currentChoice,
      companionTabs: companionTitleEntries.map(({ tab, ...entry }) => entry)
    });
  }

  const selectedCompanion = companionTitleEntries.find(
    (entry) => normalizeArticleTitleKey(entry.title) === normalizeArticleTitleKey(canonicalTitle)
  );
  if (selectedCompanion) companionChoice = selectedCompanion;
  canonicalTitle = canonicalTitle || currentTitle || companionChoice.title || "radiology_master_source";

  const sourcePairingKey = getSourcePairingKey(canonicalTitle, { sourcePairingKey: canonicalTitle });
  const sourceCompareCacheKey = getSourceCompareCacheKeyFromPairingKey(sourcePairingKey);
  const settingsOverride = { sourcePairingKey: canonicalTitle };

  await sendPageStatus(tab.id, "Master Source", `Exporting ${currentSource.label} comparison source...`);
  const currentExport = await exportArticleSourceComparison(tab, { settingsOverride });
  await sendPageStatus(companionChoice.tabId, "Master Source", `Exporting ${companionChoice.sourceLabel} comparison source...`);
  const companionExport = await exportArticleSourceComparison(companionChoice.tab, { settingsOverride });

  let cache = (sourcePairingKey && (await getSourceCompareCacheByPairingKey(sourcePairingKey))) || currentExport.cache || companionExport.cache;
  let pair = getMasterSourcePairFromCache(cache);
  let sourcePairingMatch = titlesMatch
    ? null
    : {
        type: "manual-title-choice",
        selectedTitle: canonicalTitle,
        sourceTitles: [currentChoice, { ...companionChoice, tab: undefined }].map((entry) => ({
          sourceKind: entry.sourceKind,
          sourceLabel: entry.sourceLabel,
          title: entry.title,
          url: entry.url
        }))
      };

  if (pair.length < 2) {
    const available = summarizeCachedComparisonSources(cache);
    throw new Error(
      `Master source expected RadPrimer and STATdx after exporting both open tabs, but only found: ${available}.`
    );
  }

  const bundle = await stageMasterSourceRequestBundle({
    articleTitle: canonicalTitle,
    sources: pair,
    sourceCompareCacheKey,
    sourcePairingKey,
    sourcePairingMatch
  });
  const clipboardText = buildMasterSourceWakeMessage(bundle);
  const matchNote = sourcePairingMatch
    ? ` Shared title: "${canonicalTitle}".`
    : ` Pairing key: ${sourcePairingKey || "article title"}.`;
  const message = `Prepared Codex master-source request bundle: ${bundle.downloadFolder}.${matchNote} Wake-up message copied to clipboard.`;
  await sendPageStatus(tab.id, "Master Source Ready", message, { done: true });

  return {
    message,
    bundle,
    clipboardText,
    sourcePairingKey,
    sourcePairingMatch,
    cachedSources: pair.map(sourceCompareDisplayLabel),
    exportedSources: [
      currentExport.bundle?.metadata?.sourceLabel || currentSource.label,
      companionExport.bundle?.metadata?.sourceLabel || companionChoice.sourceLabel
    ].filter(Boolean)
  };
}

async function recoverLatestCardAuditDownloadFromChatGptTab(tab) {
  if (!tab?.id || !/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(tab.url || "")) {
    throw new Error("Open the completed ChatGPT conversation tab first.");
  }

  await ensureChatGptPaster(tab.id);
  const contextResponse = await sendTabMessage(tab.id, {
    type: "CHATGPT_GET_CARD_AUDIT_CONTEXT"
  });
  const chatContext = contextResponse?.ok ? contextResponse.context || {} : {};
  const latest = await choosePendingCardAuditRunForChatContext(chatContext);
  const response = await sendTabMessage(tab.id, {
    type: "CHATGPT_CAPTURE_LATEST_CARD_TSV_DOWNLOAD",
    completionPayload: {
      pendingId: latest.pendingId,
      radPrimerTabId: latest.pending.radPrimerTabId
    }
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Could not capture the latest ChatGPT TSV download.");
  }

  return {
    ...response,
    clipboardText: response.auditDownload?.clipboardText || response.clipboardText || "",
    bundle: response.auditDownload?.bundle || response.bundle || null,
    matchedArticleTitle: latest.pending.articleTitle || latest.pending.extractionMeta?.title || "",
    chatContext
  };
}

async function dispatchTabMouseClick(tabId, x, y) {
  if (!tabId) throw new Error("No tab id available for mouse click.");
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error("Mouse click coordinates were not finite.");
  }

  const target = { tabId };
  await chrome.debugger.attach(target, "1.3");
  try {
    const point = { x: Math.round(x), y: Math.round(y), button: "left", clickCount: 1 };
    await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: point.x,
      y: point.y
    });
    await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      ...point,
      buttons: 1
    });
    await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      ...point,
      buttons: 0
    });
  } finally {
    await chrome.debugger.detach(target).catch(() => {});
  }
}

async function dispatchTabKeyPress(tabId, key, code) {
  if (!tabId) throw new Error("No tab id available for key press.");
  const normalizedKey = String(key || "");
  const normalizedCode = String(code || normalizedKey || "");
  if (!normalizedKey || !normalizedCode) throw new Error("Missing key/code for key press.");

  const upper = normalizedKey.length === 1 ? normalizedKey.toUpperCase() : normalizedKey;
  const virtualKeyCode = upper === "Escape" ? 27 : upper.charCodeAt(0);
  const target = { tabId };
  await chrome.debugger.attach(target, "1.3");
  try {
    const base = {
      windowsVirtualKeyCode: virtualKeyCode,
      nativeVirtualKeyCode: virtualKeyCode,
      key: normalizedKey,
      code: normalizedCode
    };
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
      type: "keyDown",
      ...base,
      text: normalizedKey.length === 1 ? normalizedKey : "",
      unmodifiedText: normalizedKey.length === 1 ? normalizedKey : ""
    });
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
      type: "keyUp",
      ...base
    });
  } finally {
    await chrome.debugger.detach(target).catch(() => {});
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "IMAIOS_DOWNLOAD_DATA_URL") {
    (async () => {
      const url = String(message.url || "");
      const filename = String(message.filename || "").replace(/^[/\\]+/, "");
      if (!url.startsWith("data:")) throw new Error("Expected a data URL for IMAIOS download.");
      if (!filename) throw new Error("Missing filename for IMAIOS download.");
      const normalizedUrl = normalizeDownloadUrl(url);
      pendingTextDownloadFilenames.push({ url: normalizedUrl, filename });
      let completedItem = null;
      try {
        const downloadId = await chrome.downloads.download({
          url,
          filename,
          saveAs: false,
          conflictAction: "overwrite"
        });
        completedItem = await waitForDownloadComplete(downloadId, 180000);
        sendResponse({
          ok: true,
          downloadId,
          filename,
          routedFilename: completedItem?.filename || ""
        });
      } finally {
        const index = pendingTextDownloadFilenames.findIndex(
          (entry) => entry.url === normalizedUrl && entry.filename === filename
        );
        if (index >= 0) pendingTextDownloadFilenames.splice(index, 1);
      }
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "IMAIOS_DISPATCH_MOUSE_CLICK") {
    (async () => {
      const tabId = _sender?.tab?.id;
      await dispatchTabMouseClick(tabId, Number(message.x), Number(message.y));
      sendResponse({ ok: true });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "IMAIOS_DISPATCH_KEY_PRESS") {
    (async () => {
      const tabId = _sender?.tab?.id;
      await dispatchTabKeyPress(tabId, message.key || "", message.code || "");
      sendResponse({ ok: true });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "IMPORT_MASTER_SOURCE_CACHE") {
    (async () => {
      const cache = buildMasterSourceCacheFromFiles(message.files || []);
      const stored = await storeMasterSourceCache(cache);
      sendResponse({
        ok: true,
        masterSource: {
          articleTitle: stored.articleTitle,
          importedAt: stored.importedAt,
          outputChars: stored.outputChars,
          imageCount: stored.imageRegistry.length,
          downloadFileCount: stored.downloadFiles.length
        }
      });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "GET_MASTER_SOURCE_CACHE") {
    (async () => {
      const stored = await getLatestMasterSourceCache();
      sendResponse({
        ok: true,
        masterSource: stored
          ? {
              articleTitle: stored.articleTitle,
              importedAt: stored.importedAt,
              outputChars: stored.outputChars,
              imageCount: stored.imageRegistry?.length || 0,
              downloadFileCount: stored.downloadFiles?.length || 0
            }
          : null
      });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

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

  if (message?.type === "OPEN_IMAIOS_CHUNKS") {
    (async () => {
      const result = await openImaiosAndImportChunks(message.library || message.payload?.library || message.payload || {});
      sendResponse({ ok: true, result });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "BACKUP_IMAIOS_LABEL_REPOSITORY") {
    (async () => {
      const repository = message.repository || message.payload?.repository || await loadImaiosLabelRepository();
      const result = await downloadImaiosLabelRepositoryBackup(repository, {
        snapshot: message.snapshot === true
      });
      sendResponse({ ok: true, result });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "BACKUP_IMAIOS_CHUNK_SESSION") {
    (async () => {
      const library = message.library || message.payload?.library || message.payload || {};
      const result = await downloadImaiosChunkSessionBackup(library, {
        articleTitle: message.articleTitle || message.payload?.articleTitle || "",
        topic: message.topic || message.payload?.topic || "",
        source: message.source || message.payload?.source || "",
        page: message.page || message.payload?.page || {}
      });
      sendResponse({ ok: true, result });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "BUILD_IMAIOS_REDO_PROMPT") {
    (async () => {
      const repository = await loadImaiosLabelRepository();
      const result = buildImaiosLabelRepositoryRedoPrompt(repository);
      sendResponse({ ok: true, ...result });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "SPEECHIFY_PLAYER_REMOTE") {
    (async () => {
      const result = await sendSpeechifyPlayerRemote(message.payload || {}, _sender?.tab || null);
      sendResponse({ ok: true, result });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "RADPRIMER_NAVIGATE_SOURCE_IMAGE") {
    (async () => {
      const result = await navigateSourceImage(message || {}, _sender?.tab || null);
      sendResponse({ ok: true, result });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "RUN_IMAIOS_LIVE_DRILL_CARD_AUTOMATION") {
    (async () => {
      const result = await runImaiosLiveDrillCardAutomation(message, _sender?.tab || null);
      sendResponse({ ok: true, ...result });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "START_IMAIOS_LIVE_DRILL_PAIR_SESSION") {
    (async () => {
      const result = await startImaiosLiveDrillPairSession(message, _sender?.tab || null);
      sendResponse(result);
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "IMAIOS_LIVE_DRILL_PAIR_SYNC") {
    (async () => {
      const result = await relayImaiosLiveDrillPairSync(message, _sender?.tab || null);
      sendResponse(result);
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "STOP_IMAIOS_LIVE_DRILL_PAIR_SESSION") {
    (async () => {
      const result = await stopImaiosLiveDrillPairSession(message, _sender?.tab || null);
      sendResponse(result);
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "FOCUS_IMAIOS_LIVE_DRILL_PAIR_PEER") {
    (async () => {
      const result = await focusImaiosLiveDrillPairPeer(message, _sender?.tab || null);
      sendResponse(result);
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "SEND_IMAIOS_LIVE_DRILL_CARD_PLAN") {
    (async () => {
      const result = await sendLiveDrillCardPlanToImaios({
        assistantText: message.assistantText || message.text || "",
        sourcePayload: message.sourcePayload || null,
        imaiosTabId: message.imaiosTabId || 0
      });
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

  if (message?.type === "IMAIOS_LIVE_DRILL_CARD_PLAN_DONE") {
    (async () => {
      const tabId = message.completionPayload?.imaiosTabId;
      if (!tabId) throw new Error("Missing IMAIOS tab id for live-drill card plan.");
      const sourcePayload = message.completionPayload?.sourcePayload || null;

      if (message.result?.ok === false) {
        const error = message.result.error || "ChatGPT live-drill card planning failed.";
        await sendImaiosMessageWithInjection(tabId, {
          type: "IMAIOS_LIVE_DRILL_CARD_PLAN_FAILED",
          error
        }).catch(() => {});
        throw new Error(error);
      }

      const assistantText = String(message.result?.assistantText || message.result?.text || "").trim();
      if (!assistantText) throw new Error("ChatGPT returned no live-drill card plan text.");

      const imaiosResult = await sendLiveDrillCardPlanToImaios({
        assistantText,
        sourcePayload,
        imaiosTabId: tabId
      });

      sendResponse({ ok: true, result: imaiosResult });
    })().catch(async (error) => {
      const tabId = message.completionPayload?.imaiosTabId;
      if (tabId) {
        await sendImaiosMessageWithInjection(tabId, {
          type: "IMAIOS_LIVE_DRILL_CARD_PLAN_FAILED",
          error: String(error?.message || error)
        }).catch(() => {});
      }
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
      if (!tabId) throw new Error("No article tab id was provided.");
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

  if (message?.type === "RUN_RADPRIMER_IO_QUEUE") {
    (async () => {
      const tab =
        message.tabId ? await chrome.tabs.get(message.tabId) : _sender?.tab;
      const result = await runRadPrimerIoQueue(tab);
      sendResponse({ ok: true, ...result });
    })().catch(async (error) => {
      const tabId = message.tabId || _sender?.tab?.id;
      if (tabId) {
        await sendPageStatus(tabId, "IO Queue Error", String(error?.message || error), {
          error: true
        });
      }
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "EXPORT_RADPRIMER_AUDIT_SOURCE_ONLY") {
    (async () => {
      const tab = message.tabId ? await chrome.tabs.get(message.tabId) : _sender?.tab;
      const result = await exportRadPrimerAuditSourceOnly(tab);
      sendResponse({ ok: true, ...result });
    })().catch(async (error) => {
      const tabId = message.tabId || _sender?.tab?.id;
      if (tabId) {
        await sendPageStatus(tabId, "Audit Source Error", String(error?.message || error), {
          error: true
        });
      }
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "EXPORT_ARTICLE_SOURCE_COMPARISON") {
    (async () => {
      const tab = message.tabId ? await chrome.tabs.get(message.tabId) : _sender?.tab;
      const result = await exportArticleSourceComparison(tab);
      sendResponse({ ok: true, ...result });
    })().catch(async (error) => {
      const tabId = message.tabId || _sender?.tab?.id;
      if (tabId) {
        await sendPageStatus(tabId, "Compare Source Error", String(error?.message || error), {
          error: true
        });
      }
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "BUILD_MASTER_SOURCE_FROM_ARTICLE") {
    (async () => {
      const tab = message.tabId ? await chrome.tabs.get(message.tabId) : _sender?.tab;
      const result = await runMasterSourceFromPage(tab, {
        selectedPairingTitle: message.selectedPairingTitle || ""
      });
      sendResponse({ ok: true, ...result });
    })().catch(async (error) => {
      const tabId = message.tabId || _sender?.tab?.id;
      if (tabId) {
        await sendPageStatus(tabId, "Master Source Error", String(error?.message || error), {
          error: true
        });
      }
      sendResponse({
        ok: false,
        error: String(error?.message || error),
        errorCode: error?.code || "",
        titleChoices: Array.isArray(error?.titleChoices) ? error.titleChoices : []
      });
    });

    return true;
  }

  if (message?.type === "RECOVER_CARD_AUDIT_TSV_FROM_CHATGPT_TAB") {
    (async () => {
      const tab = message.tabId ? await chrome.tabs.get(message.tabId) : _sender?.tab;
      const result = await recoverLatestCardAuditDownloadFromChatGptTab(tab);
      sendResponse({ ok: true, ...result });
    })().catch((error) => {
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

  if (message?.type === "RADPRIMER_CARD_AUDIT_PREPARE_DOWNLOAD") {
    (async () => {
      const pendingId = message.completionPayload?.pendingId;
      const bundle = await prepareCardAuditDownloadBundle({
        pendingId,
        sentinelText: message.sentinelText || "",
        chatGptTabId: _sender?.tab?.id || null
      });
      sendResponse({ ok: true, bundle });
    })().catch(async (error) => {
      const tabId = message.completionPayload?.radPrimerTabId;
      if (tabId) {
        await sendPageStatus(tabId, "Audit Bundle Error", String(error?.message || error), {
          error: true
        });
      }
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "RADPRIMER_CARD_AUDIT_WAIT_DOWNLOAD") {
    (async () => {
      const pendingId = message.completionPayload?.pendingId;
      const result = await waitForPreparedCardAuditDownload(pendingId, message.timeoutMs || 180000);
      sendResponse({ ok: true, ...result });
    })().catch(async (error) => {
      const tabId = message.completionPayload?.radPrimerTabId;
      if (tabId) {
        await sendPageStatus(tabId, "Audit Bundle Error", String(error?.message || error), {
          error: true
        });
      }
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "RADPRIMER_CARD_AUDIT_FINALIZE_TSV_TEXT") {
    (async () => {
      const pendingId = message.completionPayload?.pendingId;
      const result = await completePreparedCardAuditBundleFromGeneratedCards({
        pendingId,
        generatedCards: message.generatedCards || "",
        generatedCardsMode: "direct-link-text",
        generatedDownload: {
          ...(message.source || {}),
          directTextCapture: true
        }
      });
      sendResponse({ ok: true, ...result });
    })().catch(async (error) => {
      const tabId = message.completionPayload?.radPrimerTabId;
      if (tabId) {
        await sendPageStatus(tabId, "Audit Bundle Error", String(error?.message || error), {
          error: true
        });
      }
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  if (message?.type === "RADPRIMER_CARD_AUDIT_CAPTURE_DONE") {
    (async () => {
      const pendingId = message.completionPayload?.pendingId;
      if (!pendingId) throw new Error("Missing card audit pending id.");
      const pending = await takePendingCardAuditRun(pendingId);
      if (!pending) throw new Error("Could not find pending RadPrimer card audit run.");

      if (message.result?.ok === false) {
        if (activeCardAuditDownload?.pendingId === pendingId) activeCardAuditDownload = null;
        throw new Error(message.result.error || "ChatGPT card capture failed.");
      }

      const assistantText = message.result?.assistantText || "";
      if (!assistantText.trim()) throw new Error("ChatGPT card capture returned no text.");
      if (!looksLikeInlineCardTsv(assistantText)) {
        throw new Error(
          "ChatGPT finished, but the legacy captured response did not look like TSV."
        );
      }

      await sendPageStatus(
        pending.radPrimerTabId,
        "Audit Bundle",
        "Saving generated cards and source package into Downloads\\RadPrimerAudit..."
      );
      const bundle = await stageCardAuditBundle({ pending, assistantText });
      const clipboardText = buildAuditWakeMessage(bundle);
      await clearPendingCardAuditRun(pendingId);
      await sendPageStatus(
        pending.radPrimerTabId,
        "Audit Bundle Ready",
        `Saved card audit bundle: ${bundle.downloadFolder}. Wake-up message will be copied to the clipboard.`,
        { done: true }
      );
      sendResponse({ ok: true, bundle, clipboardText });
    })().catch(async (error) => {
      const tabId = message.completionPayload?.radPrimerTabId;
      if (tabId) {
        await sendPageStatus(tabId, "Audit Bundle Error", String(error?.message || error), {
          error: true
        });
      }
      sendResponse({ ok: false, error: String(error?.message || error) });
    });

    return true;
  }

  return false;
});
