(() => {
  if (window.__radprimerChatGptPasterInstalled) return;
  window.__radprimerChatGptPasterInstalled = true;

  const SELECTORS = {
    main: "main#main",
    thread: "main#main #thread",
    assistantTurns:
      'main#main section[data-testid^="conversation-turn-"][data-turn="assistant"]',
    userTurns: 'main#main section[data-testid^="conversation-turn-"][data-turn="user"]',
    assistantMessages: '[data-message-author-role="assistant"]',
    finalAssistantMessage:
      '[data-message-author-role="assistant"][data-turn-start-message="true"]',
    markdown: ".markdown.markdown-new-styling, .markdown",
    responseActions: 'div[aria-label="Response actions"][role="group"]',
    copyResponseButton:
      'button[data-testid="copy-turn-action-button"][aria-label="Copy response"]',
    editor:
      'div#prompt-textarea[contenteditable="true"], div#prompt-textarea[contenteditable="true"][role="textbox"], [role="textbox"][contenteditable="true"][aria-multiline="true"], .ProseMirror[contenteditable="true"]',
    fallbackTextarea: 'textarea[name="prompt-textarea"]',
    composerForm: 'form[data-type="unified-composer"], form:has(#prompt-textarea)',
    sendButton:
      'button#composer-submit-button[data-testid="send-button"], button[data-testid="send-button"], button[aria-label="Send prompt"], button[aria-label="Send message"], button[aria-label="Send"], button#composer-submit-button, form[data-type="unified-composer"] button[type="submit"], form:has(#prompt-textarea) button[type="submit"]',
    stopButton:
      'button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="stop"], button[aria-label*="Stop generating"], button[aria-label*="Stop streaming"]'
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const isVisible = (el) => {
    if (!el || !(el instanceof Element)) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      rect.width > 0 &&
      rect.height > 0
    );
  };

  const waitFor = async (fn, timeoutMs, intervalMs = 150) => {
    const start = Date.now();
    let lastValue = null;
    while (Date.now() - start < timeoutMs) {
      lastValue = fn();
      if (lastValue) return lastValue;
      await sleep(intervalMs);
    }
    return null;
  };

  const sendProgress = (phase, message, compact = false) => {
    if (compact) createOrUpdateCompactStatus({ phase, message });
    else createOrUpdateOverlay({ phase, message });
  };

  const getComposerEditor = () => {
    const editor = Array.from(document.querySelectorAll(SELECTORS.editor)).find(isVisible);
    if (editor) return editor;
    return document.querySelector(SELECTORS.fallbackTextarea);
  };

  const waitForComposerEditor = async () => {
    return waitFor(() => getComposerEditor(), 30000);
  };

  const focusComposer = async (editor) => {
    editor.focus();
    await sleep(100);
  };

  const selectElementContents = (el) => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const dispatchEditorInput = (editor, data = "") => {
    editor.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data
      })
    );
    editor.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const setTextareaValue = (textarea, text) => {
    const proto = Object.getPrototypeOf(textarea);
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor?.set) descriptor.set.call(textarea, text);
    else textarea.value = text;
    dispatchEditorInput(textarea, text);
  };

  const clearContentEditable = (editor) => {
    editor.focus();
    selectElementContents(editor);
    let cleared = false;
    try {
      cleared = document.execCommand("delete", false, null);
    } catch {
      cleared = false;
    }
    if (!cleared) editor.textContent = "";
    dispatchEditorInput(editor);
  };

  const insertTextDomFallback = (editor, text) => {
    editor.focus();
    const selection = window.getSelection();
    let range = selection?.rangeCount ? selection.getRangeAt(0) : null;

    if (!range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    const fragment = document.createDocumentFragment();
    const parts = String(text || "").split("\n");
    let lastNode = null;

    parts.forEach((part, index) => {
      if (part) {
        const node = document.createTextNode(part);
        fragment.appendChild(node);
        lastNode = node;
      }
      if (index < parts.length - 1) {
        const br = document.createElement("br");
        fragment.appendChild(br);
        lastNode = br;
      }
    });

    range.deleteContents();
    range.insertNode(fragment);

    if (lastNode) {
      const after = document.createRange();
      after.setStartAfter(lastNode);
      after.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(after);
    }
  };

  const setContentEditableTextFast = async (editor, text) => {
    editor.focus();
    const fragment = document.createDocumentFragment();
    const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
    let lastBlock = null;

    lines.forEach((line) => {
      const block = document.createElement("p");
      if (line) {
        block.appendChild(document.createTextNode(line));
      } else {
        block.appendChild(document.createElement("br"));
      }
      fragment.appendChild(block);
      lastBlock = block;
    });

    editor.replaceChildren(fragment);

    if (lastBlock) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(lastBlock);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    dispatchEditorInput(editor, text);
    await sleep(100);
    return getComposerText(editor).trim().length > 0;
  };

  const insertIntoContentEditable = async (editor, text) => {
    editor.focus();
    const chunkSize = 15000;
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      let inserted = false;
      try {
        inserted = document.execCommand("insertText", false, chunk);
      } catch {
        inserted = false;
      }

      if (!inserted) {
        insertTextDomFallback(editor, chunk);
      }

      dispatchEditorInput(editor, chunk);
      await sleep(20);
    }
  };

  const clearAndFillComposer = async (editor, text, preferFastSet = false) => {
    await focusComposer(editor);
    if (editor.tagName === "TEXTAREA") {
      setTextareaValue(editor, "");
      setTextareaValue(editor, text);
      return;
    }

    if (preferFastSet && (await setContentEditableTextFast(editor, text))) return;

    clearContentEditable(editor);
    await insertIntoContentEditable(editor, text);
  };

  const getComposerText = (editor) => {
    if (!editor) return "";
    if (editor.tagName === "TEXTAREA") return editor.value || "";
    return editor.innerText || editor.textContent || "";
  };

  const normalizeForComposerCheck = (text) => {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();
  };

  const composerLooksFilled = (editor, text) => {
    const actual = normalizeForComposerCheck(getComposerText(editor));
    const expected = normalizeForComposerCheck(text);
    if (!actual) return false;
    if (!expected) return true;

    const start = expected.slice(0, Math.min(80, expected.length));
    const end = expected.slice(Math.max(0, expected.length - 80));
    const hasStart = !start || actual.includes(start);
    const hasEnd = !end || actual.includes(end);
    const lengthRatio = actual.length / expected.length;

    if (expected.length < 5000) return hasStart && hasEnd;

    // Long ProseMirror inserts can be visually complete while innerText is still
    // normalized, virtualized, or delayed. Do not block submission if the editor
    // clearly contains substantial prompt text.
    return (hasStart && (hasEnd || lengthRatio > 0.7)) || actual.length > 2000;
  };

  const getSendButton = () => {
    return Array.from(document.querySelectorAll(SELECTORS.sendButton)).find(
      (button) =>
        isVisible(button) &&
        !button.disabled &&
        button.getAttribute("aria-disabled") !== "true"
    );
  };

  const waitForSendButtonAfterTextInsertion = async (timeoutMs = 20000) => {
    return waitFor(() => getSendButton(), timeoutMs, 150);
  };

  const getComposerForm = (editor) => {
    return (
      editor?.closest?.("form") ||
      document.querySelector('form[data-type="unified-composer"]') ||
      document.querySelector("form")
    );
  };

  const getRunSnapshot = () => {
    return {
      stop: Boolean(getVisibleStopButton()),
      assistantCount: document.querySelectorAll(SELECTORS.assistantTurns).length,
      userCount: document.querySelectorAll(SELECTORS.userTurns).length,
      url: location.href,
      composerText: getComposerText(getComposerEditor())
    };
  };

  const generationStartedSince = (before) => {
    const now = getRunSnapshot();
    return (
      now.stop ||
      now.assistantCount > before.assistantCount ||
      now.userCount > before.userCount ||
      now.url !== before.url ||
      (before.composerText && !now.composerText.trim())
    );
  };

  const waitForGenerationStart = async (before, timeoutMs = 5000) => {
    return waitFor(() => generationStartedSince(before), timeoutMs, 150);
  };

  const clickLikeUser = (button) => {
    button.scrollIntoView({ block: "center", inline: "center" });
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      button.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          buttons: type.includes("down") ? 1 : 0
        })
      );
    }
  };

  const submitComposerForm = (editor, sendButton) => {
    const form = getComposerForm(editor);
    if (!form) return false;

    try {
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit(sendButton || undefined);
        return true;
      }
    } catch {}

    try {
      const event = new SubmitEvent("submit", {
        bubbles: true,
        cancelable: true,
        submitter: sendButton || null
      });
      return form.dispatchEvent(event);
    } catch {
      return form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
  };

  const pressEnterInComposer = (editor) => {
    editor.focus();
    const common = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    };
    editor.dispatchEvent(new KeyboardEvent("keydown", common));
    editor.dispatchEvent(new KeyboardEvent("keypress", common));
    editor.dispatchEvent(new KeyboardEvent("keyup", common));
  };

  const submitPrompt = async (editor, compactProgress = false) => {
    const before = getRunSnapshot();
    const sendButton = await waitForSendButtonAfterTextInsertion(20000);

    if (sendButton) {
      sendProgress("SENDING", "Trying ChatGPT send button...", compactProgress);
      try {
        sendButton.click();
      } catch {}
      if (await waitForGenerationStart(before, 3500)) return true;

      try {
        clickLikeUser(sendButton);
      } catch {}
      if (await waitForGenerationStart(before, 3500)) return true;
    }

    sendProgress(
      "SENDING",
      "Send button did not start generation; trying composer form submit...",
      compactProgress
    );
    if (submitComposerForm(editor, sendButton)) {
      if (await waitForGenerationStart(before, 3500)) return true;
    }

    sendProgress(
      "SENDING",
      "Form submit did not start generation; trying Enter key fallback...",
      compactProgress
    );
    pressEnterInComposer(editor);
    if (await waitForGenerationStart(before, 5000)) return true;

    throw new Error(
      "Prompt was inserted, but automated send did not start generation. Manual Enter may still work."
    );
  };

  const getVisibleStopButton = () => {
    return Array.from(document.querySelectorAll(SELECTORS.stopButton)).find(isVisible);
  };

  const getLatestAssistantTurn = () => {
    const turns = Array.from(document.querySelectorAll(SELECTORS.assistantTurns)).filter(
      isVisible
    );
    return turns.at(-1) || null;
  };

  const getFinalAssistantMessage = (turn) => {
    if (!turn) return null;
    return (
      turn.querySelector(SELECTORS.finalAssistantMessage) ||
      Array.from(turn.querySelectorAll(SELECTORS.assistantMessages)).at(-1) ||
      null
    );
  };

  const getMarkdownRoot = (message) => {
    if (!message) return null;
    return message.querySelector(SELECTORS.markdown) || message;
  };

  const normalizeExtractedText = (text) => {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  };

  const stripTrailingImageAuditBlock = (text) => {
    const value = String(text || "");
    const includeIndex = value.search(/(^|\n)\s*INCLUDE\s*=\s*\[[^\n]*/);
    if (includeIndex < 0) return value.trim();

    const beforeInclude = value
      .slice(0, includeIndex)
      .replace(/```(?:text|javascript)?/gi, "")
      .trim();
    const hasCaseMap = /CASE_MAP\s*=\s*\[/i.test(value.slice(includeIndex));

    // Grouping preflight responses are only the audit block. Preserve them.
    // Full narratives include the same block at the end, where it should be
    // stripped before clipboard/Speechify delivery.
    if (!beforeInclude && hasCaseMap) return value.trim();

    return value
      .slice(0, includeIndex)
      .replace(/\n?```(?:text|javascript)?\s*$/i, "")
      .trim();
  };

  const extractCleanMarkdownText = (markdownRoot) => {
    if (!markdownRoot) return "";
    const clone = markdownRoot.cloneNode(true);
    clone
      .querySelectorAll(
        [
          "button",
          '[role="button"]',
          '[aria-haspopup="dialog"]',
          ".not-prose",
          '[aria-label="Copy"]',
          '[aria-label="Copy response"]',
          '[data-testid="copy-turn-action-button"]',
          '[data-testid="project-save-turn-action-button"]'
        ].join(",")
      )
      .forEach((el) => el.remove());

    return normalizeExtractedText(serializeMarkdownNode(clone));
  };

  const inlineText = (node) => {
    return String(node?.innerText || node?.textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  };

  const getDirectText = (node) => {
    let text = "";
    for (const child of node.childNodes || []) {
      if (child.nodeType === Node.TEXT_NODE) text += child.textContent || "";
    }
    return text.trim();
  };

  const serializeList = (listEl, depth = 0) => {
    const ordered = listEl.tagName === "OL";
    let index = Number(listEl.getAttribute("start") || "1");
    const lines = [];

    for (const item of Array.from(listEl.children).filter((el) => el.tagName === "LI")) {
      const nestedLists = Array.from(item.children).filter((el) => el.matches("ul, ol"));
      const clone = item.cloneNode(true);
      clone.querySelectorAll("ul, ol").forEach((el) => el.remove());

      const marker = ordered ? `${index}. ` : "- ";
      const indent = "  ".repeat(depth);
      const body = inlineText(clone).replace(/\n+/g, "\n" + indent + "  ");
      lines.push(`${indent}${marker}${body}`.trimEnd());

      for (const nested of nestedLists) {
        const nestedText = serializeList(nested, depth + 1);
        if (nestedText) lines.push(nestedText);
      }

      index += 1;
    }

    return lines.join("\n");
  };

  const serializeTable = (tableEl) => {
    const rows = Array.from(tableEl.querySelectorAll("tr")).map((row) => {
      return Array.from(row.querySelectorAll("th, td"))
        .map((cell) => inlineText(cell).replace(/\s*\n+\s*/g, " "))
        .join("\t");
    });
    return rows.filter(Boolean).join("\n");
  };

  const collectTextWithBreaks = (node) => {
    if (!node) return "";
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const tag = node.tagName;
    if (tag === "BR") return "\n";

    const isLine =
      node.classList?.contains("cm-line") ||
      node.getAttribute("role") === "presentation" ||
      node.matches?.(".cm-line");

    let text = "";
    for (const child of node.childNodes || []) {
      text += collectTextWithBreaks(child);
    }

    if (isLine && !text.endsWith("\n")) text += "\n";
    return text;
  };

  const serializePre = (preEl) => {
    const cmLines = Array.from(preEl.querySelectorAll(".cm-line"));
    if (cmLines.length) {
      return cmLines
        .map((line) => collectTextWithBreaks(line).replace(/\n+$/g, ""))
        .join("\n")
        .replace(/\u00a0/g, " ")
        .trimEnd();
    }

    const code = preEl.querySelector(".cm-content") || preEl.querySelector("code") || preEl;
    const withBreaks = collectTextWithBreaks(code).replace(/\u00a0/g, " ").trimEnd();
    if (withBreaks.includes("\n")) return withBreaks;
    return String(code.innerText || code.textContent || "").replace(/\u00a0/g, " ").trimEnd();
  };

  const serializeMarkdownNode = (root) => {
    const blocks = [];

    const walk = (node) => {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = String(node.textContent || "").trim();
        if (text) blocks.push(text);
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName;

      if (tag === "BR") {
        blocks.push("\n");
        return;
      }

      if (["H1", "H2", "H3", "H4", "H5", "H6", "P"].includes(tag)) {
        const text = inlineText(node);
        if (text) blocks.push(text);
        return;
      }

      if (tag === "UL" || tag === "OL") {
        const text = serializeList(node);
        if (text) blocks.push(text);
        return;
      }

      if (tag === "PRE") {
        const text = serializePre(node);
        if (text) blocks.push(text);
        return;
      }

      if (tag === "BLOCKQUOTE") {
        const text = Array.from(node.childNodes)
          .map((child) => serializeMarkdownNode(child))
          .filter(Boolean)
          .join("\n\n")
          .split("\n")
          .map((line) => (line ? `> ${line}` : ">"))
          .join("\n");
        if (text) blocks.push(text);
        return;
      }

      if (tag === "TABLE") {
        const text = serializeTable(node);
        if (text) blocks.push(text);
        return;
      }

      const direct = getDirectText(node);
      const blockChildren = Array.from(node.children).filter((child) =>
        child.matches("h1,h2,h3,h4,h5,h6,p,ul,ol,pre,blockquote,table,div")
      );

      if (direct && !blockChildren.length) {
        blocks.push(inlineText(node));
        return;
      }

      for (const child of node.childNodes) walk(child);
    };

    walk(root);

    return blocks
      .join("\n\n")
      .replace(/\n\n\n+/g, "\n\n")
      .replace(/\n\n\n+/g, "\n\n")
      .trim();
  };

  const extractLatestAssistantText = () => {
    const latestTurn = getLatestAssistantTurn();
    const finalMessage = getFinalAssistantMessage(latestTurn);
    const markdownRoot = getMarkdownRoot(finalMessage);
    return {
      latestTurn,
      finalMessage,
      text: extractCleanMarkdownText(markdownRoot)
    };
  };

  const readClipboardText = async () => {
    try {
      if (!navigator.clipboard?.readText) return "";
      return await navigator.clipboard.readText();
    } catch {
      return "";
    }
  };

  const extractViaNativeCopyButton = async (latestTurn, fallbackText) => {
    const button = latestTurn?.querySelector(SELECTORS.copyResponseButton);
    if (!button || !isVisible(button)) return "";

    const before = await readClipboardText();
    try {
      clickLikeUser(button);
    } catch {
      try {
        button.click();
      } catch {
        return "";
      }
    }

    await sleep(700);
    const copied = await readClipboardText();
    const text = normalizeExtractedText(copied);
    if (!text) return "";

    const fallbackLength = String(fallbackText || "").length;
    const beforeLooksDifferent = !before || normalizeExtractedText(before) !== text;
    const lengthLooksPlausible = !fallbackLength || text.length >= Math.min(500, fallbackLength * 0.5);

    return beforeLooksDifferent && lengthLooksPlausible ? text : "";
  };

  const waitForFinalAssistantResponse = async ({ timeoutMs, stableMs, stripAuditBlock = true }) => {
    const start = Date.now();
    let lastText = "";
    let lastChangedAt = Date.now();
    let lastResult = null;
    sendProgress("WAITING_FOR_RESPONSE", "Waiting for ChatGPT response...");

    while (Date.now() - start < timeoutMs) {
      const result = extractLatestAssistantText();
      const latestTurn = result.latestTurn;
      const text = result.text;
      const hasCopyButton = !!latestTurn?.querySelector(SELECTORS.copyResponseButton);
      const hasResponseActions = !!latestTurn?.querySelector(SELECTORS.responseActions);
      const hasStop = !!getVisibleStopButton();

      if (text && text !== lastText) {
        lastText = text;
        lastResult = result;
        lastChangedAt = Date.now();
        sendProgress("RESPONSE_STREAMING", `Receiving response... ${text.length} characters`);
      }

      const stableEnough = text && Date.now() - lastChangedAt >= stableMs;

      if (text && stableEnough && !hasStop && (hasCopyButton || hasResponseActions)) {
        sendProgress("RESPONSE_STABLE_WAIT", "Response is stable. Capturing final text...");
        await sleep(500);
        const finalResult = extractLatestAssistantText();
        const nativeCopiedText = await extractViaNativeCopyButton(
          finalResult.latestTurn || latestTurn,
          finalResult.text || text
        );
        const rawText = nativeCopiedText || finalResult.text || text;
        const cleanedText = stripAuditBlock ? stripTrailingImageAuditBlock(rawText) : rawText.trim();
        return {
          text: cleanedText,
          partial: false
        };
      }

      await sleep(250);
    }

    if (lastText) {
      return {
        text: stripAuditBlock ? stripTrailingImageAuditBlock(lastText) : lastText.trim(),
        partial: true
      };
    }

    throw new Error("Timed out waiting for assistant response.");
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    }
  };

  const sendSpeechifyCreateMessage = (payload) => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "CREATE_SPEECHIFY_LECTURE", payload }, (response) => {
        const err = chrome.runtime.lastError;
        if (err) {
          resolve({ ok: false, error: err.message });
          return;
        }
        resolve(response || { ok: false, error: "No Speechify response returned." });
      });
    });
  };

  const activateCurrentTab = () => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "ACTIVATE_SENDER_TAB" }, (response) => {
        const err = chrome.runtime.lastError;
        if (err) {
          resolve({ ok: false, error: err.message });
          return;
        }
        resolve(response || { ok: false });
      });
    });
  };

  const sendCompletionMessage = (type, payload, result) => {
    if (!type) return;
    try {
      chrome.runtime.sendMessage({
        type,
        completionPayload: payload || null,
        result: result || null
      });
    } catch {}
  };

  const downloadTextFile = (text, filename) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const createOrUpdateCompactStatus = ({ phase, message, done, error } = {}) => {
    let host = document.getElementById("radprimer-runner-compact-status");
    if (!host) {
      host = document.createElement("div");
      host.id = "radprimer-runner-compact-status";
      host.style.position = "fixed";
      host.style.zIndex = "2147483647";
      host.style.right = "18px";
      host.style.bottom = "18px";
      document.documentElement.appendChild(host);

      const shadow = host.attachShadow({ mode: "open" });
      shadow.innerHTML = `
        <style>
          :host { all: initial; }
          .chip {
            max-width: min(360px, calc(100vw - 36px));
            padding: 10px 12px;
            border-radius: 12px;
            background: rgba(15, 23, 42, .92);
            color: #edf4ff;
            box-shadow: 0 12px 36px rgba(0,0,0,.32);
            border: 1px solid rgba(255,255,255,.14);
            backdrop-filter: blur(12px);
            font: 12px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          .phase {
            color: #9ec5ff;
            font-weight: 800;
            text-transform: uppercase;
            margin-right: 6px;
          }
          .error .phase { color: #ffb4b4; }
          .msg { color: #dbe7f8; }
        </style>
        <div class="chip">
          <span class="phase"></span>
          <span class="msg"></span>
        </div>
      `;
    }

    const shadow = host.shadowRoot;
    shadow.querySelector(".chip").classList.toggle("error", Boolean(error));
    if (phase) shadow.querySelector(".phase").textContent = phase;
    if (message) shadow.querySelector(".msg").textContent = message;
    if (done) setTimeout(() => host.remove(), 1800);
  };

  const createOrUpdateOverlay = ({ phase, message, text, error } = {}) => {
    let host = document.getElementById("radprimer-runner-overlay");
    if (!host) {
      host = document.createElement("div");
      host.id = "radprimer-runner-overlay";
      host.style.position = "fixed";
      host.style.zIndex = "2147483647";
      host.style.right = "22px";
      host.style.bottom = "22px";
      document.documentElement.appendChild(host);

      const shadow = host.attachShadow({ mode: "open" });
      shadow.innerHTML = `
        <style>
          :host { all: initial; }
          .box {
            width: min(720px, calc(100vw - 44px));
            max-height: 72vh;
            display: grid;
            grid-template-rows: auto auto 1fr auto;
            gap: 10px;
            padding: 14px;
            border: 1px solid rgba(255,255,255,.16);
            border-radius: 14px;
            background: rgba(18, 24, 33, .94);
            color: #edf4ff;
            box-shadow: 0 18px 60px rgba(0,0,0,.45);
            backdrop-filter: blur(14px);
            font: 13px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          .top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
          h2 { margin: 0; font-size: 15px; letter-spacing: 0; }
          .phase { color: #9ec5ff; font-weight: 700; }
          .msg { color: #c9d7ea; white-space: pre-wrap; }
          textarea {
            width: 100%;
            height: min(46vh, 420px);
            resize: vertical;
            border: 1px solid rgba(255,255,255,.14);
            border-radius: 10px;
            padding: 10px;
            background: rgba(3, 7, 12, .82);
            color: #edf4ff;
            font: 12px/1.45 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
            white-space: pre-wrap;
          }
          .actions { display: flex; gap: 8px; align-items: center; justify-content: space-between; }
          .buttons { display: flex; gap: 8px; }
          button {
            border: 0;
            border-radius: 8px;
            padding: 8px 10px;
            font: inherit;
            font-weight: 700;
            color: #0b1220;
            background: #d9e8ff;
            cursor: pointer;
          }
          button.secondary { background: rgba(255,255,255,.12); color: #edf4ff; }
          .count { color: #aab8cb; font-size: 12px; }
          .error { color: #ffb4b4; }
        </style>
        <div class="box">
          <div class="top">
            <h2>ChatGPT response captured</h2>
            <button class="secondary close" type="button">Close</button>
          </div>
          <div><span class="phase"></span> <span class="msg"></span></div>
          <textarea readonly spellcheck="false"></textarea>
          <div class="actions">
            <span class="count"></span>
            <div class="buttons">
              <button class="copy" type="button">Copy again</button>
              <button class="download" type="button">Download .txt</button>
            </div>
          </div>
        </div>
      `;
      shadow.querySelector(".close").addEventListener("click", () => host.remove());
      shadow.querySelector(".copy").addEventListener("click", async () => {
        await copyToClipboard(shadow.querySelector("textarea").value);
        shadow.querySelector(".msg").textContent = "Copied again.";
      });
      shadow.querySelector(".download").addEventListener("click", () => {
        downloadTextFile(shadow.querySelector("textarea").value, "chatgpt-response.txt");
      });
    }

    const shadow = host.shadowRoot;
    if (phase) shadow.querySelector(".phase").textContent = phase;
    if (message) shadow.querySelector(".msg").textContent = message;
    if (error) {
      shadow.querySelector(".msg").textContent = error;
      shadow.querySelector(".msg").classList.add("error");
    }
    if (typeof text === "string") {
      shadow.querySelector("textarea").value = text;
      shadow.querySelector(".count").textContent = `${text.length} characters`;
    }
  };

  const runPrompt = async ({
    promptText,
    autoSubmit,
    waitForResult,
    timeoutMs,
    speechify,
    preserveAuditBlock
  }) => {
    const compactProgress = Boolean(autoSubmit && !waitForResult);
    sendProgress("WAITING_FOR_COMPOSER", "Waiting for ChatGPT composer...", compactProgress);
    const editor = await waitForComposerEditor();
    if (!editor) throw new Error("Login required or ChatGPT composer not available.");

    try {
      localStorage.removeItem("oai/apps/conversationDrafts");
    } catch {}

    sendProgress("FILLING_PROMPT", "Clearing and filling composer...", compactProgress);
    await clearAndFillComposer(editor, promptText, compactProgress);

    sendProgress("VERIFYING_PROMPT", "Verifying prompt was inserted...", compactProgress);
    if (!composerLooksFilled(editor, promptText)) {
      const visibleTextLength = normalizeForComposerCheck(getComposerText(editor)).length;
      if (!visibleTextLength) {
        throw new Error("Composer appears empty after prompt insertion.");
      }
      sendProgress(
        "VERIFYING_PROMPT",
        "Exact prompt verification was weak, but composer contains text. Trying Send...",
        compactProgress
      );
    }

    if (!autoSubmit) {
      createOrUpdateOverlay({
        phase: "DONE",
        message: `Prompt inserted but not submitted. ${promptText.length} characters.`,
        text: promptText
      });
      return { chars: promptText.length, submitted: false };
    }

    sendProgress("SENDING", "Submitting prompt...", compactProgress);
    await submitPrompt(editor, compactProgress);
    await activateCurrentTab();
    if (!waitForResult) {
      createOrUpdateCompactStatus({
        phase: "SENT",
        message: "Prompt sent to ChatGPT.",
        done: true
      });
      return { chars: promptText.length, submitted: true };
    }

    const result = await waitForFinalAssistantResponse({
      timeoutMs,
      stableMs: 3000,
      stripAuditBlock: !preserveAuditBlock
    });

    sendProgress("COPYING", "Copying final response to clipboard...");
    const copied = await copyToClipboard(result.text);
    createOrUpdateOverlay({
      phase: result.partial ? "DONE_PARTIAL" : "DONE",
      message: copied
        ? "Response copied to clipboard."
        : "Response captured, but automatic clipboard copy may have failed.",
      text: result.text
    });

    let speechifyResult = null;
    if (speechify && result.text) {
      sendProgress("OPENING_SPEECHIFY", "Opening Speechify and creating text file...");
      speechifyResult = await sendSpeechifyCreateMessage({
        title: speechify.title || "",
        text: result.text,
        folder: speechify.folder,
        autoSave: speechify.autoSave !== false
      });

      createOrUpdateOverlay({
        phase: speechifyResult?.ok ? "SPEECHIFY_DONE" : "SPEECHIFY_ERROR",
        message: speechifyResult?.ok
          ? "Speechify text file created."
          : `Speechify failed: ${speechifyResult?.error || "unknown error"}`,
        text: result.text
      });
    }

    return {
      chars: promptText.length,
      submitted: true,
      assistantText: result.text,
      assistantChars: result.text.length,
      partial: Boolean(result.partial),
      copied,
      speechify: speechifyResult
    };
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "CHATGPT_FILL_COMPOSER") return false;

    if (message.backgroundRun) {
      runPrompt({
        promptText: String(message.text || ""),
        autoSubmit: Boolean(message.autoSubmit),
        waitForResult: Boolean(message.waitForResult),
        timeoutMs: Math.max(30000, Number(message.timeoutMs || 900000)),
        speechify: message.speechify || null,
        preserveAuditBlock: Boolean(message.preserveAuditBlock)
      })
        .then((result) => {
          sendCompletionMessage(message.completionMessageType, message.completionPayload, result);
        })
        .catch((error) => {
          createOrUpdateOverlay({
            phase: "ERROR",
            error: String(error?.message || error)
          });
          sendCompletionMessage(message.completionMessageType, message.completionPayload, {
            ok: false,
            error: String(error?.message || error)
          });
        });
      sendResponse({ ok: true, started: true });
      return false;
    }

    (async () => {
      const result = await runPrompt({
        promptText: String(message.text || ""),
        autoSubmit: Boolean(message.autoSubmit),
        waitForResult: Boolean(message.waitForResult),
        timeoutMs: Math.max(30000, Number(message.timeoutMs || 900000)),
        speechify: message.speechify || null,
        preserveAuditBlock: Boolean(message.preserveAuditBlock)
      });
      sendResponse({ ok: true, ...result });
    })().catch((error) => {
      const errorText = String(error?.message || error);
      createOrUpdateOverlay({ phase: "ERROR", error: errorText });
      sendResponse({ ok: false, error: errorText });
    });

    return true;
  });
})();
