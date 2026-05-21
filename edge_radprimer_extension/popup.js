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
  openChatGPT: false,
  autoSubmitChatGPT: false,
  chatgptUrl: "https://chatgpt.com/g/g-p-69e5418624448191a7a74b18f607688b-pediatrics/project",
  chatgptInstruction: "make sure you do not truncate the text and read the entire message",
  chatgptTimeoutSec: "900"
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
  "openChatGPT",
  "autoSubmitChatGPT",
  "chatgptUrl",
  "chatgptInstruction",
  "chatgptTimeoutSec"
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

function readForm() {
  return {
    engine: $("engine").value,
    mode: $("mode").value,
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
    openChatGPT: $("openChatGPT").checked,
    autoSubmitChatGPT: $("autoSubmitChatGPT").checked,
    chatgptUrl: $("chatgptUrl").value.trim(),
    chatgptInstruction: $("chatgptInstruction").value.trim(),
    chatgptTimeoutSec: $("chatgptTimeoutSec").value.trim(),
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
  $("openChatGPT").checked = values.openChatGPT ?? DEFAULTS.openChatGPT;
  $("autoSubmitChatGPT").checked = values.autoSubmitChatGPT ?? DEFAULTS.autoSubmitChatGPT;
  $("chatgptUrl").value = values.chatgptUrl ?? DEFAULTS.chatgptUrl;
  $("chatgptInstruction").value = values.chatgptInstruction ?? DEFAULTS.chatgptInstruction;
  $("chatgptTimeoutSec").value = values.chatgptTimeoutSec ?? DEFAULTS.chatgptTimeoutSec;
  syncPanels();
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

function sendChatGptFillMessage(tabId, text, settings) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      {
        type: "CHATGPT_FILL_COMPOSER",
        text,
        autoSubmit: Boolean(settings.autoSubmitChatGPT),
        waitForResult: Boolean(settings.autoSubmitChatGPT),
        timeoutMs: Math.max(30, parseInt(settings.chatgptTimeoutSec || "900", 10) || 900) * 1000
      },
      (response) => {
        const err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(response);
      }
    );
  });
}

async function openChatGptAndFill(settings, packageText) {
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

  const response = await sendChatGptFillMessage(tab.id, composerText, settings);
  await chrome.tabs.update(tab.id, { active: true });

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
    setStatus("Loading packaged prompt...");
    const promptText = await loadPrompt(settings.engine, settings.mode);
    const tab = await getActiveTab();
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
    if (settings.openChatGPT) {
      setStatus(
        settings.autoSubmitChatGPT
          ? "Opening ChatGPT, submitting, and waiting for final response..."
          : "Opening ChatGPT project and filling message box..."
      );
      try {
        const fillResponse = await openChatGptAndFill(settings, response.output);
        if (settings.autoSubmitChatGPT) {
          if (fillResponse.assistantText) {
            await copyText(fillResponse.assistantText);
            chatgptLine = `Submitted and copied final ChatGPT response (${fillResponse.assistantChars} chars).`;
          } else {
            chatgptLine = "Submitted to ChatGPT, but no assistant response text was returned.";
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
        chatgptLine
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
    await saveForm();
  });

  $("autoSubmitChatGPT").addEventListener("change", async () => {
    if ($("autoSubmitChatGPT").checked) {
      $("openChatGPT").checked = true;
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
