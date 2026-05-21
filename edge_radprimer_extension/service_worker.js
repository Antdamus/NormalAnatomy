chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "DOWNLOAD_IMAGES") return false;

  (async () => {
    const files = Array.isArray(message.files) ? message.files : [];
    for (const file of files) {
      if (!file?.url || !file?.filename) continue;
      await chrome.downloads.download({
        url: file.url,
        filename: file.filename,
        saveAs: false
      });
      await new Promise((resolve) => setTimeout(resolve, message.delayMs || 250));
    }
    sendResponse({ ok: true, count: files.length });
  })().catch((error) => {
    sendResponse({ ok: false, error: String(error?.message || error) });
  });

  return true;
});
