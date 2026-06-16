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

  const CARD_AUDIT_DOWNLOAD_SENTINEL = "RADPRIMER_CARD_TSV_DOWNLOAD_READY";

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

  const IMAGE_REF_NUMBER_PATTERN = "(?:\\d+|[a-z]+(?:[-\\s]+[a-z]+){0,4})";

  const stripDuplicateSpokenSourceCodes = (text) => {
    let value = String(text || "");

    const sourceCodePairs = [
      { source: "STATdx", code: "SDX" },
      { source: "RadPrimer", code: "RP" }
    ];

    for (const { source, code } of sourceCodePairs) {
      const sourceImage = `${source}\\s+image\\s+${IMAGE_REF_NUMBER_PATTERN}`;
      const shortCode = `${code}[-\\s]*${IMAGE_REF_NUMBER_PATTERN}`;
      const commaOrSlashPattern = new RegExp(
        `\\b(${sourceImage})\\s*(?:,|/)\\s*${shortCode}(?=\\s*[,.;:)\\]\\n]|\\s*$)`,
        "gi"
      );
      const parentheticalPattern = new RegExp(
        `\\b(${sourceImage})\\s*\\(\\s*${shortCode}\\s*\\)`,
        "gi"
      );

      value = value
        .replace(commaOrSlashPattern, "$1")
        .replace(parentheticalPattern, "$1");
    }

    return value.trim();
  };

  const cleanNarrativeTextForDelivery = (text) => {
    return stripDuplicateSpokenSourceCodes(text);
  };

  const stripOuterCodeFence = (text) => {
    const value = String(text || "").trim();
    const match = value.match(/^```(?:tsv|text|csv|json)?\s*([\s\S]*?)\s*```$/i);
    return match ? match[1].trim() : value;
  };

  const getAssistantCodeBlocks = (markdownRoot) => {
    if (!markdownRoot) return [];
    return Array.from(markdownRoot.querySelectorAll("pre"))
      .map((pre) => serializePre(pre).trim())
      .filter(Boolean);
  };

  const parseImaiosChunkLibrary = (text) => {
    const value = stripOuterCodeFence(text);
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.kind === "imaios-chunk-library" && Array.isArray(parsed.chunks)) {
        return parsed;
      }
    } catch {}
    return null;
  };

  const extractImaiosChunkLibraryFromText = (text) => {
    const value = String(text || "");
    const fencedBlocks = Array.from(value.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi))
      .map((match) => match[1].trim());
    for (let index = fencedBlocks.length - 1; index >= 0; index -= 1) {
      const parsed = parseImaiosChunkLibrary(fencedBlocks[index]);
      if (parsed) return parsed;
    }

    const kindIndex = value.lastIndexOf('"kind"');
    if (kindIndex < 0) return null;
    const start = value.lastIndexOf("{", kindIndex);
    const end = value.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return parseImaiosChunkLibrary(value.slice(start, end + 1));
  };

  const extractLatestImaiosChunkLibrary = () => {
    const latestTurn = getLatestAssistantTurn();
    const finalMessage = getFinalAssistantMessage(latestTurn);
    const markdownRoot = getMarkdownRoot(finalMessage);
    const codeBlocks = getAssistantCodeBlocks(markdownRoot);
    for (let index = codeBlocks.length - 1; index >= 0; index -= 1) {
      const parsed = parseImaiosChunkLibrary(codeBlocks[index]);
      if (parsed) return parsed;
    }
    return extractImaiosChunkLibraryFromText(extractCleanMarkdownText(markdownRoot));
  };

  const extractLatestImaiosLiveDrillCardPlan = () => {
    const latestTurn = getLatestAssistantTurn();
    const finalMessage = getFinalAssistantMessage(latestTurn);
    const markdownRoot = getMarkdownRoot(finalMessage);
    const codeBlocks = getAssistantCodeBlocks(markdownRoot);
    for (let index = codeBlocks.length - 1; index >= 0; index -= 1) {
      const parsed = parseImaiosLiveDrillCardPlan(codeBlocks[index]);
      if (parsed) {
        return {
          plan: parsed,
          text: JSON.stringify(parsed, null, 2)
        };
      }
    }

    const text = extractCleanMarkdownText(markdownRoot);
    const parsed = extractImaiosLiveDrillCardPlanFromText(text);
    return parsed
      ? { plan: parsed, text: JSON.stringify(parsed, null, 2) }
      : null;
  };

  const looksLikeInlineCardTsv = (text) => {
    const value = stripOuterCodeFence(text);
    const lines = value
      .split(/\n+/)
      .map((line) => line.trimEnd())
      .filter(Boolean);
    const tabbedLines = lines.filter((line) => (line.match(/\t/g) || []).length >= 8);
    const strongTabbedLines = lines.filter((line) => (line.match(/\t/g) || []).length >= 15);
    return strongTabbedLines.length >= 2 || tabbedLines.length >= 4;
  };

  const looksLikeCardTsvDownloadReady = (text) => {
    const value = String(text || "");
    return value.includes(CARD_AUDIT_DOWNLOAD_SENTINEL);
  };

  const parseImaiosLiveDrillCardPlan = (text) => {
    const value = stripOuterCodeFence(text);
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.kind === "imaios-live-drill-card-plan" && Array.isArray(parsed.cards)) {
        return parsed;
      }
    } catch {}
    return null;
  };

  const extractImaiosLiveDrillCardPlanFromText = (text) => {
    const value = String(text || "");
    const fencedBlocks = Array.from(value.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi))
      .map((match) => match[1].trim());
    for (let index = fencedBlocks.length - 1; index >= 0; index -= 1) {
      const parsed = parseImaiosLiveDrillCardPlan(fencedBlocks[index]);
      if (parsed) return parsed;
    }

    const kindIndex = value.lastIndexOf('"kind"');
    if (kindIndex < 0) return null;
    const start = value.lastIndexOf("{", kindIndex);
    const end = value.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return parseImaiosLiveDrillCardPlan(value.slice(start, end + 1));
  };

  const looksLikeImaiosLiveDrillCardPlan = (text) => {
    return Boolean(extractImaiosLiveDrillCardPlanFromText(text));
  };

  const expectedOutputMessage = (expectedOutputKind) => {
    if (expectedOutputKind === "card_tsv_download") {
      return "Assistant responded, but it has not shown the TSV download sentinel yet. Waiting for the final card export...";
    }
    if (expectedOutputKind === "card_tsv") {
      return "Assistant responded, but it is not inline TSV yet. Waiting for the final card export...";
    }
    if (expectedOutputKind === "imaios_live_drill_card_plan") {
      return "Assistant responded, but it has not shown a valid imaios-live-drill-card-plan JSON block yet. Waiting for the final card plan...";
    }
    return "Assistant responded, but the expected output is not ready yet.";
  };

  const outputMatchesExpectation = (text, expectedOutputKind) => {
    if (!expectedOutputKind) return true;
    if (expectedOutputKind === "card_tsv") return looksLikeInlineCardTsv(text);
    if (expectedOutputKind === "card_tsv_download") return looksLikeCardTsvDownloadReady(text);
    if (expectedOutputKind === "imaios_live_drill_card_plan") return looksLikeImaiosLiveDrillCardPlan(text);
    return true;
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

  const unique = (values) => {
    const seen = new Set();
    return values
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .filter((value) => {
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const extractCardAuditPageContext = () => {
    const mainText = String(document.querySelector(SELECTORS.main)?.innerText || document.body?.innerText || "");
    const titleHints = [];
    const patterns = [
      /PRIMARY TOPIC:\s*([^\n\r]+)/gi,
      /CENTERING TOPIC FOR THIS CHAT:\s*([^\n\r]+)/gi,
      /USE THIS AS THE CHAT TITLE\s*\/\s*WORKING TOPIC LABEL:\s*([^\n\r]+)/gi,
      /Topic:\s*([^\n\r]+)/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(mainText))) {
        const value = String(match[1] || "")
          .replace(/\s{2,}.*/, "")
          .replace(/[.。]\s*$/, "")
          .trim();
        if (value && value.length <= 160) titleHints.push(value);
      }
    }

    const headings = Array.from(document.querySelectorAll("h1, h2, [data-testid='conversation-title']"))
      .map((el) => el.innerText || el.textContent || "")
      .filter((text) => text && text.length <= 160);

    return {
      titleHints: unique([...titleHints, ...headings]),
      url: location.href,
      pageTitle: document.title || "",
      hasDownloadSentinel: mainText.includes(CARD_AUDIT_DOWNLOAD_SENTINEL),
      snippet: mainText.slice(0, 4000)
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

  const waitForFinalAssistantResponse = async ({
    timeoutMs,
    stableMs,
    stripAuditBlock = true,
    expectedOutputKind = ""
  }) => {
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
        const imaiosChunkLibrary = extractImaiosChunkLibraryFromText(rawText);
        const cleanedText = stripAuditBlock ? stripTrailingImageAuditBlock(rawText) : rawText.trim();
        const deliveryText = expectedOutputKind ? cleanedText : cleanNarrativeTextForDelivery(cleanedText);
        if (!outputMatchesExpectation(deliveryText, expectedOutputKind)) {
          lastChangedAt = Date.now();
          sendProgress(
            "WAITING_FOR_EXPECTED_OUTPUT",
            expectedOutputMessage(expectedOutputKind)
          );
          await sleep(750);
          continue;
        }
        return {
          text: deliveryText,
          rawText,
          imaiosChunkLibrary,
          partial: false
        };
      }

      await sleep(250);
    }

    if (lastText) {
      const cleanedLastText = stripAuditBlock ? stripTrailingImageAuditBlock(lastText) : lastText.trim();
      const deliveryLastText = expectedOutputKind ? cleanedLastText : cleanNarrativeTextForDelivery(cleanedLastText);
      if (!outputMatchesExpectation(deliveryLastText, expectedOutputKind)) {
        throw new Error(`Timed out waiting for expected ChatGPT output. ${expectedOutputMessage(expectedOutputKind)}`);
      }
      return {
        text: deliveryLastText,
        rawText: lastText,
        imaiosChunkLibrary: extractImaiosChunkLibraryFromText(lastText),
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
      if (type === "IMAIOS_LIVE_DRILL_CARD_PLAN_DONE") {
        createOrUpdateOverlay({
          phase: "SENDING_IMAIOS",
          message: "Live-drill card plan captured. Sending it back to IMAIOS...",
          text: result?.assistantText || result?.text || ""
        });
      }
      chrome.runtime.sendMessage({
        type,
        completionPayload: payload || null,
        result: result || null
      }, async (response) => {
        if (chrome.runtime.lastError) {
          if (type === "IMAIOS_LIVE_DRILL_CARD_PLAN_DONE") {
            createOrUpdateOverlay({
              phase: "IMAIOS_SEND_ERROR",
              error: chrome.runtime.lastError.message || "Could not send the live-drill plan to IMAIOS.",
              text: result?.assistantText || result?.text || ""
            });
          }
          return;
        }
        if (type === "IMAIOS_LIVE_DRILL_CARD_PLAN_DONE") {
          createOrUpdateOverlay({
            phase: response?.ok ? "IMAIOS_TSV_READY" : "IMAIOS_TSV_ERROR",
            message: response?.ok
              ? response.result?.message || response.result?.result?.message || "IMAIOS generated the live-drill TSV."
              : `IMAIOS handoff failed: ${response?.error || "unknown error"}`,
            error: response?.ok ? "" : response?.error || "unknown error",
            text: result?.assistantText || result?.text || ""
          });
          return;
        }
        if (!response?.clipboardText) return;

        const copied = await copyToClipboard(response.clipboardText);
        createOrUpdateOverlay({
          phase: copied ? "BUNDLE_READY" : "BUNDLE_READY_COPY_FAILED",
          message: copied
            ? "Bundle wake-up message copied to clipboard."
            : "Bundle saved, but wake-up message clipboard copy may have failed.",
          text: response.clipboardText
        });
      });
    } catch {}
  };

  const sendRuntimeRequest = (message) => {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          const err = chrome.runtime.lastError;
          if (err) {
            resolve({ ok: false, error: err.message });
            return;
          }
          resolve(response || { ok: false, error: "No response returned." });
        });
      } catch (error) {
        resolve({ ok: false, error: String(error?.message || error) });
      }
    });
  };

  const sendRuntimeRequestWithTimeout = (message, timeoutMs, timeoutMessage) => {
    return Promise.race([
      sendRuntimeRequest(message),
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: false,
            error: timeoutMessage || "Timed out waiting for extension background response."
          });
        }, timeoutMs);
      })
    ]);
  };

  const findCardTsvDownloadButton = () => {
    const latestTurn = getLatestAssistantTurn();
    const roots = [
      latestTurn,
      latestTurn ? getMarkdownRoot(getFinalAssistantMessage(latestTurn)) : null,
      document.querySelector(SELECTORS.main)
    ].filter(Boolean);

    const seen = new Set();
    const candidates = roots
      .flatMap((root) => Array.from(root.querySelectorAll("button, a[download], a[href], [role='button'], [data-testid]")))
      .filter((el) => {
        if (!el || seen.has(el) || !isVisible(el)) return false;
        seen.add(el);
        return true;
      });

    const candidateText = (el) =>
      [
        el.innerText,
        el.textContent,
        el.getAttribute?.("aria-label"),
        el.getAttribute?.("title"),
        el.getAttribute?.("download"),
        el.getAttribute?.("href"),
        el.getAttribute?.("data-testid")
      ]
        .filter(Boolean)
        .join(" ");

    const scoreCandidate = (el) => {
      const text = candidateText(el);
      const lower = text.toLowerCase();
      let score = 0;

      if (/download\s+(?:the\s+)?(?:.+?\s+)?tsv/i.test(text)) score += 140;
      if (/tsv\s+download/i.test(text)) score += 140;
      if (/download\s+(?:the\s+)?radprimer/i.test(text)) score += 130;
      if (/radprimer[_-]?cards\.tsv/i.test(text)) score += 100;
      if (/\.tsv\b/i.test(text)) score += 80;
      if (/sandbox:\/|\/mnt\/data|download|attachment|file/i.test(text)) score += 25;
      if (/cards?|anki|tsv/i.test(text)) score += 20;
      if (/copy|share|sources|regenerate|thumb|more actions|read aloud/i.test(text)) score -= 80;
      if (/uploaded|pasted text|core radiology|pdf|source/i.test(text) && !/tsv/i.test(text)) score -= 80;
      if (lower.includes(CARD_AUDIT_DOWNLOAD_SENTINEL.toLowerCase())) score -= 50;

      return score;
    };

    const ranked = candidates
      .map((el) => ({ el, score: scoreCandidate(el) }))
      .filter((item) => item.score >= 60)
      .sort((a, b) => b.score - a.score);

    return (
      ranked[0]?.el ||
      candidates.find((el) => /download\s+(?:the\s+)?(?:.+?\s+)?tsv|tsv\s+download/i.test(candidateText(el))) ||
      candidates.find((el) => /radprimer[_-]?cards\.tsv|\.tsv\b/i.test(candidateText(el))) ||
      candidates.find((el) => /download/i.test(candidateText(el)) && /tsv|cards?/i.test(candidateText(el))) ||
      null
    );
  };

  const findDownloadAnchorForElement = (el) => {
    if (!el) return null;
    if (el.matches?.("a[href]")) return el;

    const closest = el.closest?.("a[href]");
    if (closest) return closest;

    const roots = [
      el,
      el.parentElement,
      el.closest?.("[data-testid], [role='group'], article, section")
    ].filter(Boolean);

    for (const root of roots) {
      const anchors = Array.from(root.querySelectorAll?.("a[href]") || []);
      const match = anchors.find((anchor) => {
        const text = [
          anchor.href,
          anchor.getAttribute("download"),
          anchor.innerText,
          anchor.textContent,
          anchor.getAttribute("aria-label"),
          anchor.getAttribute("title")
        ]
          .filter(Boolean)
          .join(" ");
        return /\.tsv\b|radprimer[_-]?cards|download|sandbox:\/|\/mnt\/data/i.test(text);
      });
      if (match) return match;
    }

    return null;
  };

  const looksLikeDownloadedCardTsv = (text) => {
    const value = String(text || "").trim();
    if (!value) return false;
    const lines = value.split(/\r?\n/).filter((line) => line.trim());
    if (!lines.length) return false;
    const tabbedLines = lines.filter((line) => line.split("\t").length >= 20);
    return tabbedLines.length >= Math.min(2, lines.length);
  };

  const readCardTsvFromDownloadElement = async (el) => {
    const anchor = findDownloadAnchorForElement(el);
    const href = anchor?.href || "";
    if (!href) return null;
    if (/^sandbox:/i.test(href)) return null;

    try {
      const response = await fetch(href);
      if (!response.ok) return null;
      const text = await response.text();
      if (!looksLikeDownloadedCardTsv(text)) return null;
      return {
        text,
        source: {
          method: "chatgpt-download-link-fetch",
          href,
          download: anchor.getAttribute("download") || "",
          contentType: response.headers.get("content-type") || ""
        }
      };
    } catch {
      return null;
    }
  };

  const captureCardTsvDownload = async (completionPayload, sentinelText) => {
    if (!completionPayload?.pendingId) throw new Error("Missing card-audit pending id for TSV download capture.");

    sendProgress("PREPARING_CARD_TSV_DOWNLOAD", "Preparing audit bundle for ChatGPT TSV download...");
    const prepared = await sendRuntimeRequest({
      type: "RADPRIMER_CARD_AUDIT_PREPARE_DOWNLOAD",
      completionPayload,
      sentinelText
    });
    if (!prepared?.ok) throw new Error(prepared?.error || "Could not prepare card audit download bundle.");

    const button = await waitFor(() => findCardTsvDownloadButton(), 15000, 250);
    if (!button) throw new Error("Could not find the ChatGPT TSV download button.");

    sendProgress("READING_CARD_TSV_DOWNLOAD", "Trying direct TSV capture from ChatGPT download link...");
    const directTsv = await readCardTsvFromDownloadElement(button);
    if (directTsv?.text) {
      const completed = await sendRuntimeRequest({
        type: "RADPRIMER_CARD_AUDIT_FINALIZE_TSV_TEXT",
        completionPayload,
        generatedCards: directTsv.text,
        source: directTsv.source
      });
      if (!completed?.ok) throw new Error(completed?.error || "Could not stage downloaded TSV text.");

      let copied = false;
      if (completed.clipboardText) copied = await copyToClipboard(completed.clipboardText);
      createOrUpdateOverlay({
        phase: copied ? "AUDIT_READY" : "AUDIT_READY_COPY_FAILED",
        message: copied
          ? "TSV captured directly. Audit wake-up message copied to clipboard."
          : "TSV captured directly, but wake-up message clipboard copy may have failed.",
        text: completed.clipboardText || ""
      });

      return {
        bundle: completed.bundle || null,
        clipboardText: completed.clipboardText || "",
        copiedWakeMessage: copied,
        directCapture: true
      };
    }

    sendProgress("DOWNLOADING_CARD_TSV", "Clicking ChatGPT TSV download...");
    clickLikeUser(button);

    const completed = await sendRuntimeRequestWithTimeout(
      {
        type: "RADPRIMER_CARD_AUDIT_WAIT_DOWNLOAD",
        completionPayload,
        timeoutMs: 180000
      },
      95000,
      "Clicked the ChatGPT TSV download, but the extension could not confirm the matching audit-bundle capture. If the TSV downloaded, use Capture TSV again after reloading the extension."
    );
    if (!completed?.ok) throw new Error(completed?.error || "Timed out waiting for ChatGPT TSV download.");

    let copied = false;
    if (completed.clipboardText) copied = await copyToClipboard(completed.clipboardText);
    createOrUpdateOverlay({
      phase: copied ? "AUDIT_READY" : "AUDIT_READY_COPY_FAILED",
      message: copied
        ? "TSV download captured. Audit wake-up message copied to clipboard."
        : "TSV download captured, but wake-up message clipboard copy may have failed.",
      text: completed.clipboardText || ""
    });

    return {
      bundle: completed.bundle || null,
      clipboardText: completed.clipboardText || "",
      copiedWakeMessage: copied
    };
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
            cursor: pointer;
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
      host.title = "Click to dismiss";
      host.addEventListener("click", () => host.remove());
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

  const installChatGptRecoveryButtons = () => {
    if (document.getElementById("radprimer-chatgpt-tsv-recovery")) return;

    const host = document.createElement("div");
    host.id = "radprimer-chatgpt-tsv-recovery";
    host.style.position = "fixed";
    host.style.zIndex = "2147483646";
    host.style.right = "18px";
    host.style.top = "86px";
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .shell {
          position: relative;
          display: flex;
          align-items: flex-end;
          flex-direction: column;
          gap: 8px;
          font: 12px/1.25 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .toggle {
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 999px;
          padding: 9px 12px;
          background: rgba(18, 24, 33, .9);
          color: #edf4ff;
          box-shadow: 0 16px 48px rgba(0,0,0,.34);
          backdrop-filter: blur(16px);
          cursor: pointer;
          font: inherit;
          font-weight: 850;
          letter-spacing: 0;
        }
        .toggle:hover { background: rgba(30, 41, 59, .94); }
        .panel {
          width: 256px;
          display: grid;
          gap: 10px;
          padding: 10px;
          border-radius: 14px;
          background: rgba(18, 24, 33, .94);
          border: 1px solid rgba(255,255,255,.16);
          box-shadow: 0 16px 48px rgba(0,0,0,.34);
          backdrop-filter: blur(16px);
          color: #edf4ff;
        }
        .panel.hidden { display: none; }
        .group {
          display: grid;
          gap: 6px;
          padding: 8px;
          border-radius: 10px;
          background: rgba(255,255,255,.055);
        }
        .group-title {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #bfdbfe;
          font-size: 11px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .04em;
        }
        .button-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        button {
          border: 0;
          border-radius: 9px;
          padding: 9px 10px;
          background: #dbeafe;
          color: #0f172a;
          cursor: pointer;
          font: inherit;
          font-weight: 850;
          letter-spacing: 0;
        }
        button:hover { background: #bfdbfe; }
        button.primary { background: #93c5fd; }
        button.primary:hover { background: #60a5fa; }
        button.secondary { background: #dcfce7; }
        button.secondary:hover { background: #bbf7d0; }
        button.import { background: #fef3c7; }
        button.import:hover { background: #fde68a; }
        button.redo { background: #e9d5ff; }
        button.redo:hover { background: #ddd6fe; }
        button:disabled { cursor: wait; opacity: .72; }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 99px;
          background: #93c5fd;
          box-shadow: 0 0 0 4px rgba(147,197,253,.16);
        }
      </style>
      <div class="shell">
        <button class="toggle" type="button" title="Open RadPrimer and IMAIOS recovery tools">Rad tools</button>
        <div class="panel hidden">
          <div class="group">
            <div class="group-title"><span class="dot" aria-hidden="true"></span>Live drill cards</div>
            <button class="primary live-drill-plan" type="button" title="Send the latest imaios-live-drill-card-plan JSON back to the open IMAIOS tab and generate TSV">Send plan to IMAIOS</button>
          </div>
          <div class="group">
            <div class="group-title">IMAIOS chunks</div>
            <div class="button-row">
              <button class="secondary imaios" type="button" title="Copy the latest IMAIOS chunk JSON for the IMAIOS extension">Copy chunks</button>
              <button class="import import-imaios" type="button" title="Import the latest IMAIOS chunk JSON from this ChatGPT response into IMAIOS">Import chunks</button>
            </div>
            <button class="redo redo-imaios" type="button" title="Ask ChatGPT to regenerate only the IMAIOS chunks using the latest saved label repository, then import them into IMAIOS">Redo chunks + import</button>
          </div>
          <div class="group">
            <div class="group-title">RadPrimer audit</div>
            <button class="tsv" type="button" title="Capture this ChatGPT TSV into the matching RadPrimer audit bundle">Capture TSV</button>
          </div>
        </div>
      </div>
    `;

    shadow.querySelector(".toggle").addEventListener("click", () => {
      const panel = shadow.querySelector(".panel");
      panel.classList.toggle("hidden");
    });

    const sendLatestLiveDrillPlanToImaios = async () => {
      const extracted = extractLatestImaiosLiveDrillCardPlan();
      if (!extracted?.plan) {
        return {
          ok: false,
          error: "No valid imaios-live-drill-card-plan JSON block was found in the latest assistant response."
        };
      }
      const response = await sendRuntimeRequest({
        type: "SEND_IMAIOS_LIVE_DRILL_CARD_PLAN",
        assistantText: extracted.text
      });
      if (!response?.ok) {
        return {
          ok: false,
          error: response?.error || "Could not send the live-drill card plan to IMAIOS.",
          text: extracted.text
        };
      }
      return {
        ok: true,
        plan: extracted.plan,
        text: extracted.text,
        result: response.result || {}
      };
    };

    shadow.querySelector(".live-drill-plan").addEventListener("click", async () => {
      const button = shadow.querySelector(".live-drill-plan");
      button.disabled = true;
      button.textContent = "Sending...";
      try {
        createOrUpdateOverlay({
          phase: "IMAIOS_PLAN",
          message: "Sending latest live-drill card plan to IMAIOS..."
        });
        const result = await sendLatestLiveDrillPlanToImaios();
        if (!result.ok) {
          createOrUpdateOverlay({
            phase: "IMAIOS_PLAN_ERROR",
            error: result.error,
            text: result.text || ""
          });
          return;
        }
        createOrUpdateOverlay({
          phase: "IMAIOS_TSV_READY",
          message: result.result?.message || result.result?.result?.message || `Sent ${result.plan.cards?.length || 0} planned live-drill card groups to IMAIOS.`,
          text: result.text
        });
        createOrUpdateCompactStatus({
          phase: "IMAIOS",
          message: "Live-drill TSV generated.",
          done: true
        });
      } catch (error) {
        createOrUpdateOverlay({
          phase: "ERROR",
          error: String(error?.message || error)
        });
      } finally {
        button.disabled = false;
        button.textContent = "Send plan to IMAIOS";
      }
    });

    shadow.querySelector(".tsv").addEventListener("click", async () => {
      const button = shadow.querySelector(".tsv");
      button.disabled = true;
      button.textContent = "Capturing...";
      createOrUpdateCompactStatus({
        phase: "TSV",
        message: "Capturing latest TSV download..."
      });

      const response = await sendRuntimeRequest({
        type: "RECOVER_CARD_AUDIT_TSV_FROM_CHATGPT_TAB"
      });

      if (!response?.ok) {
        createOrUpdateOverlay({
          phase: "ERROR",
          error: response?.error || "Could not capture the latest TSV download."
        });
        button.disabled = false;
        button.textContent = "Capture TSV";
        return;
      }

      if (response.clipboardText) await copyToClipboard(response.clipboardText);
      createOrUpdateOverlay({
        phase: "AUDIT_READY",
        message: "TSV download captured. Audit wake-up message copied to clipboard.",
        text: response.clipboardText || ""
      });
      createOrUpdateCompactStatus({
        phase: "DONE",
        message: "TSV captured.",
        done: true
      });
      button.disabled = false;
      button.textContent = "Capture TSV";
    });

    shadow.querySelector(".imaios").addEventListener("click", async () => {
      const button = shadow.querySelector(".imaios");
      button.disabled = true;
      button.textContent = "Copying...";
      try {
        const library = extractLatestImaiosChunkLibrary();
        if (!library) {
          createOrUpdateOverlay({
            phase: "IMAIOS_NOT_FOUND",
            error: "No valid imaios-chunk-library JSON block was found in the latest assistant response."
          });
          return;
        }
        const text = JSON.stringify(library, null, 2);
        await copyToClipboard(text);
        createOrUpdateOverlay({
          phase: "IMAIOS_READY",
          message: `Copied ${library.chunks.length} IMaios chunks. Open IMaios and click Import chunks.`,
          text
        });
      } catch (error) {
        createOrUpdateOverlay({
          phase: "ERROR",
          error: String(error?.message || error)
        });
      } finally {
        button.disabled = false;
        button.textContent = "Copy IMaios chunks";
      }
    });

    const importLatestImaiosChunks = async () => {
      const library = extractLatestImaiosChunkLibrary();
      if (!library) {
        return {
          ok: false,
          error: "No valid imaios-chunk-library JSON block was found in the latest assistant response."
        };
      }
      const response = await sendRuntimeRequest({
        type: "OPEN_IMAIOS_CHUNKS",
        library
      });
      if (!response?.ok) {
        return {
          ok: false,
          error: response?.error || "IMaios import failed."
        };
      }
      return {
        ok: true,
        library,
        result: response.result || {}
      };
    };

    shadow.querySelector(".import-imaios").addEventListener("click", async () => {
      const button = shadow.querySelector(".import-imaios");
      button.disabled = true;
      button.textContent = "Importing...";
      try {
        const result = await importLatestImaiosChunks();
        if (!result.ok) {
          createOrUpdateOverlay({
            phase: "IMAIOS_IMPORT_ERROR",
            error: result.error
          });
          return;
        }
        createOrUpdateOverlay({
          phase: "IMAIOS_IMPORTED",
          message: `Imported ${result.result.chunkCount || result.library.chunks.length} IMaios chunks. ${result.result.savedLabelCount || 0} module labels saved.`,
          text: JSON.stringify(result.library, null, 2)
        });
      } catch (error) {
        createOrUpdateOverlay({
          phase: "ERROR",
          error: String(error?.message || error)
        });
      } finally {
        button.disabled = false;
        button.textContent = "Import IMaios";
      }
    });

    shadow.querySelector(".redo-imaios").addEventListener("click", async () => {
      const button = shadow.querySelector(".redo-imaios");
      button.disabled = true;
      button.textContent = "Redoing...";
      try {
        const response = await sendRuntimeRequest({
          type: "BUILD_IMAIOS_REDO_PROMPT"
        });
        if (!response?.ok || !response.promptText) {
          createOrUpdateOverlay({
            phase: "IMAIOS_REDO_ERROR",
            error: response?.error || "Could not build the IMaios redo prompt."
          });
          return;
        }
        const result = await runPrompt({
          promptText: response.promptText,
          autoSubmit: true,
          waitForResult: true,
          timeoutMs: 900000,
          speechify: null,
          preserveAuditBlock: true,
          expectedOutputKind: "",
          completionPayload: null
        });
        if (!result.imaiosChunkLibrary?.chunks?.length) {
          createOrUpdateOverlay({
            phase: "IMAIOS_REDO_DONE_NO_JSON",
            message: "ChatGPT finished, but I could not find a valid imaios-chunk-library JSON block to import.",
            text: result.assistantText || ""
          });
          return;
        }
        if (!result.imaios?.ok) {
          createOrUpdateOverlay({
            phase: "IMAIOS_REDO_IMPORT_ERROR",
            error: result.imaios?.error || "ChatGPT regenerated chunks, but IMaios import failed.",
            text: result.assistantText || ""
          });
          return;
        }
        createOrUpdateOverlay({
          phase: "IMAIOS_REDO_IMPORTED",
          message: `Regenerated and imported ${result.imaios.result?.chunkCount || result.imaiosChunkLibrary.chunks.length} IMaios chunks using ${response.moduleCount || 0} saved modules and ${response.labelCount || 0} labels.`,
          text: result.assistantText || JSON.stringify(result.imaiosChunkLibrary, null, 2)
        });
        createOrUpdateCompactStatus({
          phase: "IMAIOS",
          message: "IMaios redo imported.",
          done: true
        });
      } catch (error) {
        createOrUpdateOverlay({
          phase: "ERROR",
          error: String(error?.message || error)
        });
      } finally {
        button.disabled = false;
        button.textContent = "Redo + Import";
      }
    });
  };

  const runPrompt = async ({
    promptText,
    autoSubmit,
    waitForResult,
    timeoutMs,
    speechify,
    preserveAuditBlock,
    expectedOutputKind,
    completionPayload
  }) => {
    const compactProgress = Boolean(autoSubmit && !waitForResult);
    sendProgress("WAITING_FOR_COMPOSER", "Waiting for ChatGPT composer...", compactProgress);
    const editor = await waitForComposerEditor();
    if (!editor) throw new Error("Login required or ChatGPT composer not available.");

    try {
      localStorage.removeItem("oai/apps/conversationDrafts");
    } catch {}

    const preferFastComposerFill =
      compactProgress ||
      expectedOutputKind === "card_tsv_download" ||
      String(promptText || "").length > 12000;

    sendProgress("FILLING_PROMPT", "Clearing and filling composer...", compactProgress);
    await clearAndFillComposer(editor, promptText, preferFastComposerFill);

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
      stripAuditBlock: !preserveAuditBlock,
      expectedOutputKind
    });

    if (expectedOutputKind === "card_tsv_download") {
      const auditDownload = await captureCardTsvDownload(completionPayload, result.text);
      return {
        chars: promptText.length,
        submitted: true,
        assistantText: result.text,
        assistantChars: result.text.length,
        imaiosChunkLibrary: result.imaiosChunkLibrary || null,
        partial: Boolean(result.partial),
        auditDownload,
        suppressCompletionMessage: true
      };
    }

    sendProgress("COPYING", "Copying final response to clipboard...");
    const copied = await copyToClipboard(result.text);
    createOrUpdateOverlay({
      phase: result.partial ? "DONE_PARTIAL" : "DONE",
      message: copied
        ? "Response copied to clipboard."
        : "Response captured, but automatic clipboard copy may have failed.",
      text: result.text
    });

    let imaiosResult = null;
    if (result.imaiosChunkLibrary?.chunks?.length) {
      sendProgress(
        "OPENING_IMAIOS",
        `Opening IMaios and importing ${result.imaiosChunkLibrary.chunks.length} chunks...`
      );
      imaiosResult = await sendRuntimeRequest({
        type: "OPEN_IMAIOS_CHUNKS",
        library: result.imaiosChunkLibrary
      });
      createOrUpdateOverlay({
        phase: imaiosResult?.ok ? "IMAIOS_READY" : "IMAIOS_ERROR",
        message: imaiosResult?.ok
          ? imaiosResult.result?.labelSaveOk === false
            ? `IMaios chunks imported. ${imaiosResult.result?.chunkCount || result.imaiosChunkLibrary.chunks.length} chunks loaded, but labels did not save: ${imaiosResult.result?.error || "unknown error"}`
            : `IMaios chunks imported. ${imaiosResult.result?.chunkCount || result.imaiosChunkLibrary.chunks.length} chunks loaded. ${imaiosResult.result?.savedLabelCount || 0} module labels saved.`
          : `IMaios import failed: ${imaiosResult?.error || "unknown error"}`,
        text: result.text
      });
    }

    let speechifyResult = null;
    if (speechify && result.text) {
      const speechifyAutoSave = speechify.autoSave === true;
      sendProgress(
        "OPENING_SPEECHIFY",
        speechifyAutoSave
          ? "Opening Speechify and creating text file..."
          : "Opening Speechify and filling the Add Text form..."
      );
      speechifyResult = await sendSpeechifyCreateMessage({
        title: speechify.title || "",
        text: result.text,
        folder: speechify.folder,
        autoSave: speechifyAutoSave
      });

      createOrUpdateOverlay({
        phase: speechifyResult?.ok ? "SPEECHIFY_DONE" : "SPEECHIFY_ERROR",
        message: speechifyResult?.ok
          ? speechifyAutoSave
            ? "Speechify text file created."
            : "Speechify form filled. Click Save File in Speechify."
          : `Speechify failed: ${speechifyResult?.error || "unknown error"}`,
        text: result.text
      });
    }

    return {
      chars: promptText.length,
      submitted: true,
      assistantText: result.text,
      assistantChars: result.text.length,
      imaiosChunkLibrary: result.imaiosChunkLibrary || null,
      partial: Boolean(result.partial),
      copied,
      imaios: imaiosResult,
      speechify: speechifyResult
    };
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "CHATGPT_GET_CARD_AUDIT_CONTEXT") {
      try {
        sendResponse({
          ok: true,
          context: extractCardAuditPageContext()
        });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }

      return true;
    }

    if (message?.type === "CHATGPT_CAPTURE_LATEST_CARD_TSV_DOWNLOAD") {
      (async () => {
        const result = extractLatestAssistantText();
        const auditDownload = await captureCardTsvDownload(
          message.completionPayload || {},
          result.text || ""
        );
        sendResponse({
          ok: true,
          auditDownload,
          clipboardText: auditDownload.clipboardText || ""
        });
      })().catch((error) => {
        createOrUpdateOverlay({
          phase: "ERROR",
          error: String(error?.message || error)
        });
        sendResponse({ ok: false, error: String(error?.message || error) });
      });

      return true;
    }

    if (message?.type !== "CHATGPT_FILL_COMPOSER") return false;

    if (message.backgroundRun) {
      runPrompt({
        promptText: String(message.text || ""),
        autoSubmit: Boolean(message.autoSubmit),
        waitForResult: Boolean(message.waitForResult),
        timeoutMs: Math.max(30000, Number(message.timeoutMs || 900000)),
        speechify: message.speechify || null,
        preserveAuditBlock: Boolean(message.preserveAuditBlock),
        expectedOutputKind: String(message.expectedOutputKind || ""),
        completionPayload: message.completionPayload || null
      })
        .then((result) => {
          if (!result?.suppressCompletionMessage) {
            sendCompletionMessage(message.completionMessageType, message.completionPayload, result);
          }
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
        preserveAuditBlock: Boolean(message.preserveAuditBlock),
        expectedOutputKind: String(message.expectedOutputKind || ""),
        completionPayload: message.completionPayload || null
      });
      sendResponse({ ok: true, ...result });
    })().catch((error) => {
      const errorText = String(error?.message || error);
      createOrUpdateOverlay({ phase: "ERROR", error: errorText });
      sendResponse({ ok: false, error: errorText });
    });

    return true;
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installChatGptRecoveryButtons, { once: true });
  } else {
    installChatGptRecoveryButtons();
  }
})();
