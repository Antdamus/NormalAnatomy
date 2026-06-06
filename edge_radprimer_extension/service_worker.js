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
const PENDING_CARD_AUDIT_PREFIX = "radprimerCardAuditPending:";
const RADPRIMER_HIERARCHY_PREFIX = "radprimerCanonicalHierarchy:";
const IMAGE_DOWNLOAD_SUBFOLDER = "RadPrimer";
const CARD_AUDIT_SUBFOLDER = "RadPrimerAudit";
const SOURCE_COMPARE_SUBFOLDER = "RadPrimerSourceComparison";
const CARD_AUDIT_DOWNLOAD_SENTINEL = "RADPRIMER_CARD_TSV_DOWNLOAD_READY";
const CORE_EVIDENCE_BEGIN = "CORE_EVIDENCE_FILE_BEGIN";
const CORE_EVIDENCE_END = "CORE_EVIDENCE_FILE_END";
const MAC_NORMAL_ANATOMY_REPO_HINT =
  "/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy";
const pendingTextDownloadFilenames = [];
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
    settings.speechifyAutoSave = false;
  } else {
    settings.autoSendToSpeechify = false;
    settings.speechifyAutoSave = false;
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

function isNarrativeSpeechifyMode(settings) {
  if (!settings) return false;
  if (settings.engine === "pathology") return settings.mode === "narrative";
  if (settings.engine === "normal") {
    return settings.mode === "narrative" || settings.mode === "narrative_with_images";
  }
  return false;
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
            isPlaying: Boolean(response.result?.isPlaying || tab.audible),
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
    states.find((item) => item.tab?.audible || item.state?.tabAudible) ||
    states.find((item) => item.state?.isPlaying) ||
    states.find((item) => item.tab?.id === lastSpeechifyPlayerTabId) ||
    states.find((item) => item.tab?.active) ||
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
        isPlaying: Boolean(response.result?.isPlaying || updatedTab?.audible || focusedTab?.audible),
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
          isPlaying: Boolean(response.result?.isPlaying || updatedTab?.audible || tab.audible),
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
  const response = await sendTabMessage(tabId, {
    type: "RADPRIMER_EXTRACT",
    config: {
      ...settings,
      primarySourceLabel: source.label,
      promptText,
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

function getDownloadBasename(filename) {
  const raw = String(filename || "radprimer-image.jpg").trim();
  const base = raw.split(/[\\/]/).pop() || "radprimer-image.jpg";
  return base.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

function getStagedDownloadFilename(filename) {
  return `${IMAGE_DOWNLOAD_SUBFOLDER}/${getDownloadBasename(filename)}`;
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

function getCardAuditGeneratedCardsPath(folderName) {
  return `${CARD_AUDIT_SUBFOLDER}/${folderName}/generated_cards.tsv`;
}

function isLikelyChatGptGeneratedDownload(item) {
  const url = String(item?.url || "").toLowerCase();
  const filename = String(item?.filename || "").toLowerCase();
  const mime = String(item?.mime || "").toLowerCase();

  if (url.includes("chatgpt.com") || url.includes("chat.openai.com")) return true;
  if (url.startsWith("blob:") && url.includes("chatgpt")) return true;
  if (filename.endsWith(".tsv") || filename.includes("tsv")) return true;
  if (mime.includes("tab-separated") || mime.includes("text/tab") || mime.includes("text/plain")) {
    return true;
  }
  return false;
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
  if (!active || active.downloadId || Date.now() > active.expiresAt) return;
  if (downloadItem?.byExtensionId === chrome.runtime.id) return;
  if (!isLikelyChatGptGeneratedDownload(downloadItem)) return;

  active.downloadId = downloadItem.id;
  active.originalDownload = {
    url: downloadItem.url || "",
    filename: downloadItem.filename || "",
    mime: downloadItem.mime || "",
    likelyChatGptGeneratedDownload: isLikelyChatGptGeneratedDownload(downloadItem)
  };

  suggest({
    filename: getCardAuditGeneratedCardsPath(active.folderName),
    conflictAction: "overwrite"
  });
}

if (chrome.downloads?.onDeterminingFilename) {
  chrome.downloads.onDeterminingFilename.addListener(handleCardAuditDownloadFilename);
}

async function downloadSelectedImages(files, settings = {}) {
  if (activeCardAuditDownload && !activeCardAuditDownload.downloadId) {
    activeCardAuditDownload = null;
  }

  const list = Array.isArray(files) ? files.filter((file) => file?.url && file?.filename) : [];
  const result = {
    count: 0,
    clearedCount: 0
  };

  if (!list.length) return result;

  result.clearedCount = await clearRadPrimerDownloadFolder();

  for (const file of list) {
    const stagedFilename = getStagedDownloadFilename(file.filename);
    const normalizedUrl = normalizeDownloadUrl(file.url);
    pendingImageDownloadFilenames.set(normalizedUrl, stagedFilename);
    const downloadId = await chrome.downloads.download({
      url: file.url,
      filename: stagedFilename,
      conflictAction: "overwrite",
      saveAs: false
    });
    try {
      await waitForDownloadComplete(downloadId);
    } finally {
      pendingImageDownloadFilenames.delete(normalizedUrl);
    }
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
  return pieces.join(" ");
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

function buildSourceCompareDownloadPlan(title, sourceLabel) {
  const articlePart = sanitizeDownloadPathPart(title, "radiology_source");
  const sourcePart = sanitizeDownloadPathPart(sourceLabel, "source");
  return {
    articleFolderName: articlePart,
    fileBaseName: `${sourcePart}_${articlePart}`
  };
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

async function getPlatformOs() {
  try {
    const info = await chrome.runtime.getPlatformInfo();
    return info?.os || "";
  } catch {
    return "";
  }
}

function getAuditDownloadFolderForPlatform(bundle, platformOs = "") {
  const folderName = bundle?.folderName || "";
  if (platformOs === "mac" || platformOs === "linux" || platformOs === "openbsd") {
    return folderName
      ? `~/Downloads/${CARD_AUDIT_SUBFOLDER}/${folderName}`
      : `~/Downloads/${CARD_AUDIT_SUBFOLDER}`;
  }

  return bundle?.downloadFolder || `Downloads\\${CARD_AUDIT_SUBFOLDER}`;
}

function buildAuditImportSteps(platformOs = "") {
  if (platformOs === "mac") {
    return [
      `1. From the NormalAnatomy repo root on this Mac, run \`edge_radprimer_extension/tools/import-latest-radprimer-audit-bundle.command\`. Repo path hint: \`${MAC_NORMAL_ANATOMY_REPO_HINT}\`.`,
      "   If the .command launcher is blocked by macOS, run `python3 edge_radprimer_extension/tools/radprimer_watchers.py import-latest-audit-bundle` from the repo root instead.",
      "2. Read `radprimer_audit_queue/_latest_radprimer_audit_bundle.txt`."
    ];
  }

  if (platformOs === "linux" || platformOs === "openbsd") {
    return [
      "1. From the NormalAnatomy repo root, run `python3 edge_radprimer_extension/tools/radprimer_watchers.py import-latest-audit-bundle`.",
      "2. Read `radprimer_audit_queue/_latest_radprimer_audit_bundle.txt`."
    ];
  }

  return [
    "1. From `C:\\Users\\josem.000\\NormalAnatomy`, import the newest complete bundle by running `edge_radprimer_extension\\tools\\import-latest-radprimer-audit-bundle.ps1`.",
    "2. Read `C:\\Users\\josem.000\\NormalAnatomy\\radprimer_audit_queue\\_latest_radprimer_audit_bundle.txt`."
  ];
}

function buildAuditWakeMessage(bundle, platformOs = "") {
  const downloadFolder = getAuditDownloadFolderForPlatform(bundle, platformOs);
  const importSteps = buildAuditImportSteps(platformOs);
  return [
    "Audit the latest RadPrimer card-audit bundle.",
    "",
    `The browser staged bundle is here: ${downloadFolder}`,
    "",
    "Please do the full card-quality audit:",
    ...importSteps,
    "3. In that bundle, compare source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md, and core_evidence.txt if present.",
    "4. Write corrected_cards.tsv, audit_report.md, and _codex_audit_done.txt in the same bundle folder.",
    "5. If metadata.json contains an Anki deck target, also write corrected_cards_anki_import.tsv with Anki import headers so Anki can create/select the target subdeck automatically.",
    "",
    "Preserve the TSV schema and column order. Remove metadata/bookkeeping cards, split overloaded cards, add missing source-supported high-yield cards, and improve unclear mechanism or histology explanations while labeling any outside clarification. Treat Core-specific claims as verified only when core_evidence.txt or source_package.txt contains auditable Core support."
  ].join("\n");
}

function buildSourceOnlyWakeMessage(bundle, platformOs = "") {
  const downloadFolder = getAuditDownloadFolderForPlatform(bundle, platformOs);
  const importSteps = buildAuditImportSteps(platformOs);
  return [
    "I exported a RadPrimer audit source-only bundle.",
    "",
    `The source bundle is here: ${downloadFolder}`,
    "",
    "Import it into the local queue first:",
    ...importSteps,
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
    `Created: ${metadata.createdAt || ""}`
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
  lines.push(
    "",
    "When I provide another source-comparison bundle for the same topic, compare the two source packages and recommend which one should drive the narrative/cards, or whether they should be merged.",
    "",
    "Focus on my goals: image recognition, mechanisms, histology/pathology when relevant, differential diagnosis, modality-specific patterns including ultrasound/nuclear medicine, board traps, and review-load control."
  );
  return lines.join("\n");
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

function createCardAuditMetadata(pending, createdAt, generated = {}) {
  const ankiTarget = buildAnkiDeckTarget(pending);
  return {
    createdAt,
    articleTitle: pending.articleTitle || pending.extractionMeta?.title || "radprimer_cards",
    sourceUrl: pending.radPrimerUrl || "",
    engine: pending.settings?.engine || "",
    mode: pending.settings?.mode || "",
    selectedImages: pending.extractionMeta?.selectedImages || [],
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
      imageNumber: file.imageNumber || null
    })),
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
  const downloadPlan = buildSourceCompareDownloadPlan(title, sourceLabel);
  const metadata = {
    ...createCardAuditMetadata(pending, createdAt, {
      sourceOnlyBundle: true
    }),
    sourceComparisonBundle: true,
    sourceComparisonFolder: `${SOURCE_COMPARE_SUBFOLDER}/${downloadPlan.articleFolderName}`,
    sourceComparisonFileBase: downloadPlan.fileBaseName,
    sourceLabel,
    sourceKind: pending.extractionMeta?.sourceKind || "",
    primarySourceLabel: pending.extractionMeta?.primarySourceLabel || sourceLabel
  };

  const sourcePackageFilename = `${downloadPlan.fileBaseName}_source_package.txt`;
  const metadataFilename = `${downloadPlan.fileBaseName}_metadata.json`;
  const instructionsFilename = `${downloadPlan.fileBaseName}_source_compare_instructions.md`;
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
    markerFilename,
    `sourceCompare=true\ncreatedAt=${createdAt}\narticleTitle=${title}\nsourceLabel=${sourceLabel}\n`
  );

  return {
    folderName: downloadPlan.articleFolderName,
    fileBaseName: downloadPlan.fileBaseName,
    downloadFolder: `Downloads\\${SOURCE_COMPARE_SUBFOLDER}\\${downloadPlan.articleFolderName}`,
    files: {
      sourcePackage: sourcePackageFilename,
      metadata: metadataFilename,
      instructions: instructionsFilename,
      marker: markerFilename
    },
    metadata
  };
}

async function prepareCardAuditDownloadBundle({ pendingId, sentinelText = "" }) {
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

async function waitForPreparedCardAuditDownload(pendingId, timeoutMs = 180000) {
  const active = activeCardAuditDownload;
  if (!active || active.pendingId !== pendingId) {
    throw new Error("No prepared card-audit TSV download is active.");
  }

  const start = Date.now();
  while (!active.downloadId && Date.now() - start < timeoutMs) {
    await sleep(250);
  }

  if (!active.downloadId) {
    activeCardAuditDownload = null;
    throw new Error("Timed out waiting for ChatGPT to start the TSV download.");
  }

  const downloadedItem = await waitForDownloadComplete(active.downloadId, timeoutMs);
  const pending = active.pending;
  const metadata = {
    ...active.metadata,
    generatedDownload: {
      originalFilename: active.originalDownload?.filename || downloadedItem?.filename || "",
      originalUrl: active.originalDownload?.url || downloadedItem?.url || "",
      mime: active.originalDownload?.mime || downloadedItem?.mime || "",
      downloadId: active.downloadId
    }
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
    `complete=true\ncreatedAt=${active.createdAt}\narticleTitle=${metadata.articleTitle}\ngeneratedCards=downloaded\n`
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
    clipboardText: buildAuditWakeMessage(bundle, await getPlatformOs())
  };
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

async function getLatestPendingCardAuditRun() {
  const stored = await chrome.storage.local.get(null);
  return Object.entries(stored)
    .filter(([key, value]) => key.startsWith(PENDING_CARD_AUDIT_PREFIX) && value)
    .map(([key, pending]) => ({
      pendingId: key.slice(PENDING_CARD_AUDIT_PREFIX.length),
      pending
    }))
    .sort((a, b) => (b.pending?.createdAt || 0) - (a.pending?.createdAt || 0))[0] || null;
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
  await sendPageStatus(radPrimerTabId, "Extracting", "Rebuilding final prompt package with grouped images...");
  const extraction = await extractRadPrimerArticle(radPrimerTabId, settings, promptText);

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

  await sendPageStatus(tab.id, "Prompt", `Loading ${settings.engine}/${settings.mode} prompt...`);
  const promptText = await loadPrompt(settings.engine, settings.mode);

  await sendPageStatus(tab.id, "Extracting", `Extracting ${articleSource.displayName} article and image captions...`);
  const extraction = await extractRadPrimerArticle(tab.id, settings, promptText);
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
    const groupingExtraction = await extractRadPrimerArticle(tab.id, groupingSettings, groupingPromptText);
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

  await sendPageStatus(tab.id, "Extracting", `Extracting selected ${articleSource.displayName} image list...`);
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

async function exportRadPrimerAuditSourceOnly(tab) {
  assertSupportedArticleTab(tab);

  await sendPageStatus(tab.id, "Audit Source", "Extracting source-only audit bundle...");
  const settings = {
    ...(await loadRunnerSettings()),
    downloadImages: false,
    openChatGPT: false,
    autoSubmitChatGPT: false,
    autoSendToSpeechify: false,
    speechifyAutoSave: false
  };
  const promptText = await loadPrompt(settings.engine, settings.mode);
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
  const clipboardText = buildSourceOnlyWakeMessage(bundle, await getPlatformOs());

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

async function exportArticleSourceComparison(tab) {
  const articleSource = assertSupportedArticleTab(tab);

  await sendPageStatus(tab.id, "Compare Source", `Extracting ${articleSource.displayName} comparison source bundle...`);
  const settings = {
    ...(await loadRunnerSettings()),
    downloadImages: false,
    openChatGPT: false,
    autoSubmitChatGPT: false,
    autoSendToSpeechify: false,
    speechifyAutoSave: false
  };
  const promptText = await loadPrompt(settings.engine, settings.mode);
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
  const clipboardText = buildSourceCompareWakeMessage(bundle);

  await sendPageStatus(
    tab.id,
    "Compare Source Ready",
    `Saved comparison source bundle: ${bundle.downloadFolder}.`,
    { done: true }
  );

  return {
    bundle,
    clipboardText,
    message: `Saved comparison source bundle: ${bundle.downloadFolder}.`
  };
}

async function recoverLatestCardAuditDownloadFromChatGptTab(tab) {
  if (!tab?.id || !/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(tab.url || "")) {
    throw new Error("Open the completed ChatGPT conversation tab first.");
  }

  const latest = await getLatestPendingCardAuditRun();
  if (!latest) {
    throw new Error("No pending card-audit run was found. If needed, export an audit source bundle from the article page.");
  }

  await ensureChatGptPaster(tab.id);
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
    bundle: response.auditDownload?.bundle || response.bundle || null
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

  if (message?.type === "SPEECHIFY_PLAYER_REMOTE") {
    (async () => {
      const result = await sendSpeechifyPlayerRemote(message.payload || {}, _sender?.tab || null);
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
        sentinelText: message.sentinelText || ""
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
      const clipboardText = buildAuditWakeMessage(bundle, await getPlatformOs());
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
