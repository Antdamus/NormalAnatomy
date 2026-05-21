const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildSpeechifyFolderUrl(folderId) {
  const url = new URL("https://app.speechify.com/");
  if (folderId) url.searchParams.set("folder", folderId);
  return url.toString();
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "DOWNLOAD_IMAGES") {
    (async () => {
      const files = Array.isArray(message.files) ? message.files : [];
      for (const file of files) {
        if (!file?.url || !file?.filename) continue;
        await chrome.downloads.download({
          url: file.url,
          filename: file.filename,
          saveAs: false
        });
        await sleep(message.delayMs || 250);
      }
      sendResponse({ ok: true, count: files.length });
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

  return false;
});
