(() => {
  const guardKey = "__radprimerConversationDraftQuotaGuard";
  if (window[guardKey]) return;
  window[guardKey] = true;

  const isConversationDraftKey = (key) => {
    const text = String(key || "");
    return text === "oai/apps/conversationDrafts" || text.includes("conversationDrafts");
  };

  try {
    localStorage.removeItem("oai/apps/conversationDrafts");
  } catch {}

  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function radprimerSetItemGuard(key, value) {
    if (!isConversationDraftKey(key)) {
      return originalSetItem.call(this, key, value);
    }

    try {
      return originalSetItem.call(this, key, value);
    } catch (error) {
      if (
        error?.name === "QuotaExceededError" ||
        String(error?.message || "").toLowerCase().includes("quota")
      ) {
        console.warn(
          "[RadPrimer Runner] Suppressed ChatGPT conversationDrafts localStorage quota error for a long prompt."
        );
        return;
      }
      throw error;
    }
  };
})();
