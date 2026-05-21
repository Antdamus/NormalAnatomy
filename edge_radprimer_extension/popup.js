const MODE_OPTIONS = {
  pathology: [
    ["chatgpt_cards", "Cards - ChatGPT autonomous"],
    ["codex_cards", "Cards - Codex workflow"],
    ["narrative", "Narrative"]
  ],
  normal: [
    ["chatgpt_cards", "Cards - ChatGPT autonomous"],
    ["codex_cards", "Cards - Codex workflow"],
    ["narrative_with_images", "Narrative + image downloads"],
    ["narrative", "Narrative"],
    ["no_pictures", "Cards - no pictures"],
    ["captions_only", "Cards - captions only"]
  ]
};

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
  openChatGPT: false,
  autoSubmitChatGPT: false,
  chatgptUrl: "https://chatgpt.com/g/g-p-69e5418624448191a7a74b18f607688b-pediatrics/project",
  chatgptInstruction: "make sure you do not truncate the text and read the entire message",
  chatgptTimeoutSec: "900",
  autoSendToSpeechify: true,
  speechifyAutoSave: true,
  speechifyAutoPlayAfterSave: false,
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
  "openChatGPT",
  "autoSubmitChatGPT",
  "chatgptUrl",
  "chatgptInstruction",
  "chatgptTimeoutSec",
  "autoSendToSpeechify",
  "speechifyAutoSave",
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

  const allowed = MODE_OPTIONS[engine].map(([value]) => value);
  modeEl.value = allowed.includes(selectedMode) ? selectedMode : allowed[0];
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
    return settings.mode === "narrative" || settings.mode === "narrative_with_images";
  }
  return false;
}

function currentEngineMode() {
  return {
    engine: $("engine").value || DEFAULTS.engine,
    mode: $("mode").value || DEFAULTS.mode
  };
}

function syncSpeechifyAvailability() {
  const eligible = isNarrativeSpeechifyMode(currentEngineMode());
  $("autoSendToSpeechify").disabled = !eligible;
  $("speechifyAutoSave").disabled = !eligible;
  if (!eligible) {
    $("autoSendToSpeechify").checked = false;
    $("speechifyAutoSave").checked = false;
  }
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
  if (isNarrativeSpeechifyMode(settings)) return false;
  if (settings.engine === "normal" && settings.mode === "no_pictures") return false;
  if (String(settings.include || "").trim().toLowerCase() === "none") return false;
  return parseCaseMapGroups(settings.caseMap).length === 0;
}

function readForm() {
  const engine = $("engine").value;
  const mode = $("mode").value;
  const speechifyEligible = isNarrativeSpeechifyMode({ engine, mode });
  const autoSendToSpeechify = speechifyEligible && $("autoSendToSpeechify").checked;
  const autoSubmitChatGPT = $("autoSubmitChatGPT").checked || autoSendToSpeechify;
  const openChatGPT = $("openChatGPT").checked || autoSubmitChatGPT;

  const speechifyFolder = parseSpeechifyFolderUrl($("speechifyFolderUrl").value);

  return {
    engine,
    mode,
    include: $("include").value.trim(),
    caseMap: $("caseMap").value.trim(),
    coreGap: $("coreGap").checked,
    coreSection: $("coreSection").value.trim(),
    corePages: $("corePages").value.trim(),
    sourceNote: $("sourceNote").value.trim(),
    coreNote: $("coreNote").value.trim(),
    downloadImages: $("downloadImages").checked,
    downloadPlain: $("downloadPlain").checked,
    downloadAnnotated: $("downloadAnnotated").checked,
    keepCaptionHtml: $("keepCaptionHtml").checked,
    autoGroupNonNarrative: $("autoGroupNonNarrative").checked,
    openChatGPT,
    autoSubmitChatGPT,
    chatgptUrl: $("chatgptUrl").value.trim(),
    chatgptInstruction: $("chatgptInstruction").value.trim(),
    chatgptTimeoutSec: $("chatgptTimeoutSec").value.trim(),
    autoSendToSpeechify,
    speechifyAutoSave: speechifyEligible && $("speechifyAutoSave").checked,
    speechifyAutoPlayAfterSave: false,
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
  const autoSendToSpeechify = values.autoSendToSpeechify ?? DEFAULTS.autoSendToSpeechify;
  $("openChatGPT").checked =
    (values.openChatGPT ?? DEFAULTS.openChatGPT) ||
    (values.autoSubmitChatGPT ?? DEFAULTS.autoSubmitChatGPT) ||
    autoSendToSpeechify;
  $("autoSubmitChatGPT").checked =
    (values.autoSubmitChatGPT ?? DEFAULTS.autoSubmitChatGPT) || autoSendToSpeechify;
  $("chatgptUrl").value = values.chatgptUrl ?? DEFAULTS.chatgptUrl;
  $("chatgptInstruction").value = values.chatgptInstruction ?? DEFAULTS.chatgptInstruction;
  $("chatgptTimeoutSec").value = values.chatgptTimeoutSec ?? DEFAULTS.chatgptTimeoutSec;
  $("autoSendToSpeechify").checked = autoSendToSpeechify;
  $("speechifyAutoSave").checked = values.speechifyAutoSave ?? DEFAULTS.speechifyAutoSave;
  $("speechifyFolderUrl").value = getStoredSpeechifyFolderUrl(values);
  syncPanels();
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

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found.");
  if (!/^https:\/\/app\.radprimer\.com\//.test(tab.url || "")) {
    throw new Error("Open a RadPrimer article page first.");
  }
  return tab;
}

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content-extractor.js"]
  });
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

function sendDownloadMessage(files) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "DOWNLOAD_IMAGES", files, delayMs: 250 }, (response) => {
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
          autoSave: settings.speechifyAutoSave !== false
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
    autoSave: settings.speechifyAutoSave !== false
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

    if (shouldDelegateGroupingPreflight(settings)) {
      setStatus("Starting grouping preflight through the page runner...");
      const delegated = await sendRunFromTabMessage(tab.id);
      if (!delegated?.ok) throw new Error(delegated?.error || "Grouping preflight failed.");
      setStatus(delegated.message || "Grouping preflight started.");
      return;
    }

    setStatus("Loading packaged prompt...");
    const promptText = await loadPrompt(settings.engine, settings.mode);
    await ensureContentScript(tab.id);

    setStatus("Extracting RadPrimer article...");
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
      const downloadResponse = await sendDownloadMessage(response.downloadFiles);
      if (!downloadResponse?.ok) throw new Error(downloadResponse?.error || "Download failed.");
      downloadLine = `Downloaded ${downloadResponse.count} file(s).`;
    } else if (settings.downloadImages) {
      downloadLine = "No selected image files to download.";
    }

    let chatgptLine = "ChatGPT opening disabled.";
    let speechifyLine = "Speechify disabled.";
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
            if (fillResponse.speechify?.ok) {
              speechifyLine = `Created Speechify file: ${fillResponse.speechify.result?.title || "untitled"}.`;
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
    const text = await loadPrompt(settings.engine, settings.mode);
    setStatus(`Packaged prompt OK: ${settings.engine}/${settings.mode}\nCharacters: ${text.length}`);
  } catch (error) {
    setStatus(`Prompt check failed: ${error?.message || error}`);
  }
}

async function init() {
  const stored = await chrome.storage.local.get("radprimerRunnerSettings");
  applyForm({ ...DEFAULTS, ...(stored.radprimerRunnerSettings || {}) });

  $("engine").addEventListener("change", async () => {
    populateModes($("engine").value, $("mode").value);
    syncPanels();
    syncSpeechifyAvailability();
    await saveForm();
  });

  $("mode").addEventListener("change", async () => {
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

  for (const id of fields) {
    $(id).addEventListener("change", saveForm);
    if ($(id).tagName === "TEXTAREA" || $(id).type === "text") {
      $(id).addEventListener("input", saveForm);
    }
  }

  $("run").addEventListener("click", run);
  $("refreshPrompts").addEventListener("click", checkPrompts);
}

init().catch((error) => setStatus(`Init error: ${error?.message || error}`));
