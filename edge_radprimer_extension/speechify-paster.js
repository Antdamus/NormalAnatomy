(() => {
  if (window.__radprimerSpeechifyPasterLoaded) return;
  window.__radprimerSpeechifyPasterLoaded = true;

  const SPEECHIFY_SELECTORS = {
    appRoot: "#__next",
    library: '[data-testid="library-v2"]',
    sidebarNewButton: 'button[data-testid="sidebar-import-button"]',
    toolbarAddTextButton: 'button[data-testid="add-text-button"]',
    breadcrumbItems: 'button[data-testid^="breadcrumb-item-"]',
    folderCards: '[data-testid^="library-grid-folder-"]',
    libraryItemCards: '[role="button"][data-item-id][aria-label]',
    libraryItemTitles: '[data-testid="library-item-title"]',
    dialog: '[role="dialog"][aria-modal="true"], #headlessui-portal-root [role="dialog"]',
    titleInput: "input#textImportTitle",
    textTextarea:
      'textarea#textImportText, [data-testid="library-text-import-editor"][contenteditable="true"], [role="textbox"][contenteditable="true"][aria-label="Type or paste text here"]',
    saveButton: 'button[data-testid="add-text-save-button"]',
    playerPlayButton: 'button[data-testid="player-play-button"]',
    playerBackwardButton: 'button[data-testid="player-backward-button"]',
    playerForwardButton: 'button[data-testid="player-forward-button"]',
    playerSpeedButton: 'button[data-testid="player-speed-button"]',
    playerVoiceButton: 'button[data-testid="player-voice-button"]',
    progressBar: '[role="progressbar"][aria-label="Listening progress"]',
    progressTimeToggle: 'button[data-testid="progress-time-toggle"]',
    progressDurationToggle: 'button[data-testid="progress-duration-toggle"]',
    navFileActionButton: 'button[data-testid="nav-file-action-button"]',
    readerScrollContainer: '[data-reader-scroll-container="true"]',
    readerBlocks: '[data-reader-scroll-container="true"] .reader-api-block, .reader-api-block',
    autoscrollCue: '[data-testid="autoscroll-button"] [class*="bg-hglt-prim"]',
    media: "audio, video"
  };

  const NUMBER_WORDS = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
    seventy: 70,
    eighty: 80,
    ninety: 90
  };
  const UNIT_WORDS = "one|two|three|four|five|six|seven|eight|nine";
  const TEEN_WORDS = "ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen";
  const TENS_WORDS = "twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety";
  const NUMBER_WORD_PATTERN = `(?:(?:${TENS_WORDS})(?:[-\\s]+(?:${UNIT_WORDS}))?|${TEEN_WORDS}|${UNIT_WORDS}|zero)`;
  const NUMBER_TOKEN_RE = new RegExp(`\\b(?:\\d{1,3}|${NUMBER_WORD_PATTERN})\\b`, "gi");
  let playerClockState = {
    elapsedSeconds: null,
    durationSeconds: null,
    progress: 0,
    isPlaying: false,
    updatedAt: 0,
    rawElapsedSeconds: null
  };
  let lectureExplicitImageState = {
    sourceKind: "",
    sourceLabel: "",
    imageNumber: null,
    groupNumbers: [],
    groupLabel: "",
    imageLabel: "",
    label: "",
    activeText: "",
    textPreview: "",
    debug: "",
    updatedAt: 0
  };
  let currentLectureIdentity = "";
  const SOURCE_HOTKEY_STORAGE_KEYS = ["radprimerZoomShortcutSettings", "statdxZoomShortcutSettings"];
  const DEFAULT_SOURCE_HOTKEYS = [
    "s",
    "k",
    "l",
    "t",
    "a",
    "+",
    "-",
    "0",
    "w",
    "i",
    "p",
    "ArrowLeft",
    "ArrowRight",
    "x",
    "MediaPlayPause"
  ];
  let sourceHotkeyKeys = new Set(DEFAULT_SOURCE_HOTKEYS);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const normalizeSourceHotkeyKey = (value) => {
    const raw = String(value || "");
    if (raw === " " || raw.toLowerCase() === "spacebar") return "Space";
    if (raw.length === 1) return raw.toLowerCase();
    return raw;
  };

  const isEditableTarget = (target) => {
    const el = target instanceof Element ? target : target?.parentElement;
    if (!el) return false;
    return Boolean(
      el.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')
    );
  };

  const loadSourceHotkeyKeys = async () => {
    try {
      const stored = await chrome.storage.local.get(SOURCE_HOTKEY_STORAGE_KEYS);
      const keys = [...DEFAULT_SOURCE_HOTKEYS];
      SOURCE_HOTKEY_STORAGE_KEYS.forEach((storageKey) => {
        const settings = stored?.[storageKey] || {};
        Object.values(settings).forEach((key) => {
          if (key) keys.push(key);
        });
      });
      sourceHotkeyKeys = new Set(keys.map(normalizeSourceHotkeyKey).filter(Boolean));
    } catch {
      sourceHotkeyKeys = new Set(DEFAULT_SOURCE_HOTKEYS.map(normalizeSourceHotkeyKey));
    }
  };

  const isSourceHotkeyEvent = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    if (isEditableTarget(event.target)) return false;
    const key = normalizeSourceHotkeyKey(event.key);
    return sourceHotkeyKeys.has(key) || (key === "=" && sourceHotkeyKeys.has("+"));
  };

  const relaySourceHotkeyFromSpeechify = (event) => {
    if (!isSourceHotkeyEvent(event)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    chrome.runtime.sendMessage({
      type: "RADPRIMER_RELAY_SOURCE_HOTKEY",
      event: {
        key: event.key,
        code: event.code,
        location: event.location,
        repeat: event.repeat,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey
      }
    }, (response) => {
      const error = chrome.runtime.lastError;
      if (error || !response?.ok) {
        console.warn("[Speechify source hotkey relay failed]", error?.message || response?.error || "Unknown error");
      }
    });
  };

  const refocusSourceAfterSpeechifyPlayerClick = (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (
      !target?.closest?.(
        [
          SPEECHIFY_SELECTORS.playerPlayButton,
          SPEECHIFY_SELECTORS.playerBackwardButton,
          SPEECHIFY_SELECTORS.playerForwardButton
        ].join(",")
      )
    ) {
      return;
    }

    window.setTimeout(() => {
      chrome.runtime.sendMessage({
        type: "RADPRIMER_REFOCUS_SOURCE_TAB",
        reason: "speechify-player-click"
      });
    }, 180);
  };

  const normalize = (value) => {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  const isVisible = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      style.opacity !== "0"
    );
  };

  const isVisibleThroughAncestors = (el) => {
    if (!isVisible(el)) return false;
    let current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      const style = getComputedStyle(current);
      if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") return false;
      current = current.parentElement;
    }
    return true;
  };

  const cleanDisplayText = (value) => {
    return String(value || "")
      .replace(/\u00A0/g, " ")
      .replace(/Ã—/g, "x")
      .replace(/×/g, "x")
      .replace(/\s+/g, " ")
      .trim();
  };

  const escapeRegExp = (value) => {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  const makeWholeCueRegex = (cueText) => {
    const cue = cleanDisplayText(cueText);
    if (!cue) return null;
    return new RegExp(`(^|[^A-Za-z0-9])(${escapeRegExp(cue)})(?=$|[^A-Za-z0-9])`, "gi");
  };

  const findCueOffsetsInText = (text, cueText) => {
    const source = cleanDisplayText(text);
    const cue = cleanDisplayText(cueText);
    const re = makeWholeCueRegex(cue);
    if (!source || !cue || !re) return [];

    const offsets = [];
    let match;
    while ((match = re.exec(source)) !== null) {
      offsets.push(match.index + String(match[1] || "").length);
      if (re.lastIndex <= match.index) re.lastIndex = match.index + 1;
    }
    return offsets;
  };

  const firstVisible = (selector) => {
    const candidates = Array.from(document.querySelectorAll(selector));
    return candidates.find(isVisible) || candidates[0] || null;
  };

  const getReadableFrameDocuments = () => {
    const docs = [document];
    for (const frame of Array.from(document.querySelectorAll("iframe"))) {
      try {
        const frameDocument = frame.contentDocument || frame.contentWindow?.document;
        if (frameDocument) docs.push(frameDocument);
      } catch {}
    }
    return docs;
  };

  const getActiveMediaElement = () => {
    const mediaElements = getReadableFrameDocuments().flatMap((doc) => {
      try {
        return Array.from(doc.querySelectorAll(SPEECHIFY_SELECTORS.media));
      } catch {
        return [];
      }
    });
    return (
      mediaElements.find((el) => {
        return (
          Number.isFinite(el.currentTime) &&
          el.currentTime > 0 &&
          Number.isFinite(el.duration) &&
          el.duration > 0 &&
          !el.ended
        );
      }) ||
      mediaElements.find((el) => Number.isFinite(el.duration) && el.duration > 0) ||
      mediaElements[0] ||
      null
    );
  };

  const parseImageNumberToken = (value) => {
    const normalized = String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (/^\d+$/.test(normalized)) {
      const number = parseInt(normalized, 10);
      return Number.isFinite(number) && number > 0 ? number : null;
    }

    const parts = normalized.split(/\s+/).filter(Boolean);
    if (!parts.length) return null;

    let total = 0;
    for (const part of parts) {
      if (!(part in NUMBER_WORDS)) return null;
      total += NUMBER_WORDS[part];
    }
    return total > 0 ? total : null;
  };

  const parseImageNumbers = (text) => {
    const source = String(text || "");
    const numbers = [];
    let match;
    NUMBER_TOKEN_RE.lastIndex = 0;
    while ((match = NUMBER_TOKEN_RE.exec(source)) !== null) {
      const value = parseImageNumberToken(match[0]);
      if (Number.isFinite(value) && value > 0) {
        numbers.push({ value, index: match.index, raw: match[0] });
      }
    }
    return numbers;
  };

  const parseLeadingImageNumbers = (text) => {
    const source = String(text || "");
    const numbers = [];
    let lastEnd = 0;
    let match;

    NUMBER_TOKEN_RE.lastIndex = 0;
    while ((match = NUMBER_TOKEN_RE.exec(source)) !== null) {
      const raw = match[0];
      const value = parseImageNumberToken(raw);
      if (!Number.isFinite(value) || value <= 0) continue;

      const gap = source.slice(lastEnd, match.index);
      const connectorOnly =
        numbers.length === 0
          ? /^[\s,;:([{]*$/i.test(gap)
          : /^[\s,;/&+\-\u2013\u2014]*(?:and|or|through|thru|to)?[\s,;/&+\-\u2013\u2014]*$/i.test(gap);

      if (!connectorOnly) break;

      numbers.push({ value, index: match.index, raw });
      lastEnd = match.index + raw.length;
    }

    return numbers;
  };

  const parseFirstImageNumberPhrase = (text) => {
    const source = String(text || "").replace(/^[\s,;:([{]+/, "");
    const numberRe = new RegExp(`^(\\d{1,3}|${NUMBER_WORD_PATTERN})\\b`, "i");
    const match = source.match(numberRe);
    if (!match) return null;

    const value = parseImageNumberToken(match[1]);
    if (!Number.isFinite(value) || value <= 0) return null;

    return {
      value,
      index: String(text || "").indexOf(match[1]),
      raw: match[1]
    };
  };

  const trimNonImageNumberTail = (text) => {
    return String(text || "")
      .replace(
        new RegExp(
          `,\\s+(?:\\d{1,3}|${NUMBER_WORD_PATTERN})\\s+(?:months?|years?|weeks?|days?|hours?|minutes?)\\b[\\s\\S]*$`,
          "i"
        ),
        ""
      )
      .replace(
        /\b(?:months?|years?|weeks?|days?|hours?|minutes?)\s+(?:later|earlier|after|before)\b[\s\S]*$/i,
        ""
      );
  };

  const parseImageMentionNumbers = (segment, isPlural) => {
    const cleanSegment = trimNonImageNumberTail(segment);
    if (!isPlural) {
      const first = parseFirstImageNumberPhrase(cleanSegment);
      return first ? [first.value] : [];
    }
    return expandRangeIfNeeded(parseLeadingImageNumbers(cleanSegment), cleanSegment);
  };

  const uniqueSortedNumbers = (numbers) => {
    return Array.from(new Set(numbers.filter((n) => Number.isFinite(n) && n > 0))).sort(
      (a, b) => a - b
    );
  };

  const compactImageNumbers = (numbers) => {
    const unique = uniqueSortedNumbers(numbers);
    if (!unique.length) return "";
    if (unique.length === 1) return String(unique[0]);

    const consecutive = unique.every((value, index) => {
      return index === 0 || value === unique[index - 1] + 1;
    });

    if (consecutive) return `${unique[0]}-${unique.at(-1)}`;
    if (unique.length <= 4) return unique.join("/");
    return `${unique[0]}-${unique.at(-1)}`;
  };

  const expandRangeIfNeeded = (numbers, segment) => {
    const values = numbers.map((item) => item.value ?? item);
    const hasRangeCue = /\b(?:through|thru|to)\b|[-\u2013\u2014]/i.test(segment);
    if (!hasRangeCue || values.length < 2) return values;

    const start = values[0];
    const end = values[1];
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 80) {
      return values;
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  };

  const extractImageMentions = (text) => {
    const source = cleanDisplayText(text);
    const mentions = [];
    const sourcePrefixPattern = "(?:RadPrimer|STATdx|STAT dx|RP|SDX)";
    const mentionRe = new RegExp(
      `\\b(?:(${sourcePrefixPattern})\\s+)?(images?)\\s+((?:(?!\\b${sourcePrefixPattern}\\s+images?\\b)[^.?!;:]){1,160})`,
      "gi"
    );
    let match;

    while ((match = mentionRe.exec(source)) !== null) {
      const sourceLabelRaw = cleanDisplayText(match[1] || "");
      const sourceKind = /stat\s*dx|sdx/i.test(sourceLabelRaw)
        ? "statdx"
        : /radprimer|rp/i.test(sourceLabelRaw)
          ? "radprimer"
          : "";
      const sourceLabel = sourceKind === "statdx" ? "STATdx" : sourceKind === "radprimer" ? "RadPrimer" : "";
      const isPlural = /^images$/i.test(match[2]);
      const numbers = parseImageMentionNumbers(match[3], isPlural);
      if (!numbers.length) continue;

      mentions.push({
        plural: isPlural,
        numbers,
        imageNumber: !isPlural || numbers.length === 1 ? numbers[0] : null,
        index: match.index,
        text: cleanDisplayText(match[0]),
        sourceKind,
        sourceLabel
      });
    }

    const codeRe = /\b(RP|SDX)[-\s]?(\d{1,3})(?:\s*(?:through|thru|to|-|\u2013|\u2014)\s*(?:(RP|SDX)[-\s]?)?(\d{1,3}))?\b/gi;
    while ((match = codeRe.exec(source)) !== null) {
      const sourceCode = String(match[1] || "").toUpperCase();
      const endSourceCode = String(match[3] || sourceCode).toUpperCase();
      if (endSourceCode !== sourceCode) continue;

      const start = Number(match[2]);
      const end = Number(match[4]);
      if (!Number.isFinite(start) || start <= 0) continue;

      const numbers =
        Number.isFinite(end) && end > start && end - start <= 80
          ? Array.from({ length: end - start + 1 }, (_, index) => start + index)
          : [start];
      const sourceKind = sourceCode === "SDX" ? "statdx" : "radprimer";
      const sourceLabel = sourceKind === "statdx" ? "STATdx" : "RadPrimer";

      mentions.push({
        plural: numbers.length > 1,
        numbers,
        imageNumber: numbers.length === 1 ? numbers[0] : null,
        index: match.index,
        text: cleanDisplayText(match[0]),
        sourceKind,
        sourceLabel
      });
    }

    return mentions.sort((a, b) => a.index - b.index);
  };

  const getOrderedGroupNumbers = (groupNumbers) => uniqueSortedNumbers(groupNumbers || []);

  const rememberExplicitImageSection = (section) => {
    const image = Number(section?.imageNumber);
    if (!Number.isFinite(image) || image <= 0) return;
    if (section?.highlightStale) return;

    lectureExplicitImageState = {
      sourceKind: section.sourceKind || "",
      sourceLabel: section.sourceLabel || "",
      imageNumber: image,
      groupNumbers: getOrderedGroupNumbers(section.groupNumbers || []),
      groupLabel: section.group || "",
      imageLabel: section.image || `image ${image}`,
      label: section.label || `image ${image}`,
      activeText: section.activeText || "",
      textPreview: section.textPreview || "",
      debug: section.debug || "",
      updatedAt: Date.now()
    };
  };

  const getLastExplicitImageSection = (sourceName = "held-explicit") => {
    const image = Number(lectureExplicitImageState.imageNumber);
    if (!Number.isFinite(image) || image <= 0) return null;
    if (Date.now() - Number(lectureExplicitImageState.updatedAt || 0) > 60 * 60 * 1000) return null;

    return {
      label: lectureExplicitImageState.label || `image ${image}`,
      group: lectureExplicitImageState.groupLabel || "",
      image: lectureExplicitImageState.imageLabel || `image ${image}`,
      imageNumber: image,
      sourceKind: lectureExplicitImageState.sourceKind || "",
      sourceLabel: lectureExplicitImageState.sourceLabel || "",
      groupNumbers: getOrderedGroupNumbers(lectureExplicitImageState.groupNumbers || []),
      source: sourceName,
      activeText: lectureExplicitImageState.activeText || "",
      textPreview: lectureExplicitImageState.textPreview || "",
      debug: lectureExplicitImageState.debug || ""
    };
  };

  const resetStrictImagePointerState = () => {
    lectureExplicitImageState = {
      sourceKind: "",
      sourceLabel: "",
      imageNumber: null,
      groupNumbers: [],
      groupLabel: "",
      imageLabel: "",
      label: "",
      activeText: "",
      textPreview: "",
      debug: "",
      updatedAt: 0
    };
  };

  const findTextIndexSimple = (sourceText, targetText) => {
    const source = cleanDisplayText(sourceText);
    const target = cleanDisplayText(targetText);
    if (!source || !target) return -1;
    return source.toLowerCase().indexOf(target.toLowerCase());
  };

  const getStrictMentionImageNumber = (mention) => {
    if (!mention || mention.plural) return null;
    const direct = Number(mention.imageNumber);
    if (Number.isFinite(direct) && direct > 0) return direct;

    const numbers = Array.isArray(mention.numbers)
      ? mention.numbers.map(Number).filter((value) => Number.isFinite(value) && value > 0)
      : [];
    return numbers.length === 1 ? numbers[0] : null;
  };

  const isStrictImageMention = (mention) => {
    if (!/\bimage\b/i.test(String(mention?.text || ""))) return false;
    return Number.isFinite(Number(getStrictMentionImageNumber(mention)));
  };

  const getStrictCutoffIndexForContext = (context) => {
    const blockText = cleanDisplayText(context?.blockText || "");
    const activeText = cleanDisplayText(context?.activeText || "");
    const highlightText = cleanDisplayText(context?.highlightText || "");
    const candidates = [];

    if (context?.source === "explicit-highlighted-sentence") {
      const activeIndex = Number(context?.activeTextIndex);
      if (Number.isFinite(activeIndex) && activeIndex >= 0) {
        return Math.max(0, Math.min(blockText.length, activeIndex + Math.max(1, activeText.length)));
      }
      return -1;
    }

    if (context?.source === "explicit-live-cursor") {
      const focusIndex = Number(context?.focusTextIndex);
      if (Number.isFinite(focusIndex) && focusIndex >= 0) {
        return Math.max(0, Math.min(blockText.length, focusIndex + Math.max(1, highlightText.length)));
      }
      return -1;
    }

    const activeIndex = Number(context?.activeTextIndex);
    if (Number.isFinite(activeIndex) && activeIndex >= 0) {
      candidates.push(activeIndex + Math.max(1, activeText.length));
    } else if (activeText && blockText) {
      const foundActive = findTextIndexSimple(blockText, activeText);
      if (foundActive >= 0) candidates.push(foundActive + Math.max(1, activeText.length));
    }

    const focusIndex = Number(context?.focusTextIndex);
    if (Number.isFinite(focusIndex) && focusIndex >= 0) {
      candidates.push(focusIndex + Math.max(1, highlightText.length));
    } else if (highlightText && blockText) {
      const foundHighlight = findTextIndexSimple(blockText, highlightText);
      if (foundHighlight >= 0) candidates.push(foundHighlight + Math.max(1, highlightText.length));
    }

    if (!candidates.length) return blockText.length;
    return Math.max(0, Math.min(blockText.length, Math.max(...candidates)));
  };

  const getStrictGroupForMention = (mentions, currentMention) => {
    if (!currentMention) return [];
    const currentImage = Number(getStrictMentionImageNumber(currentMention));
    if (!Number.isFinite(currentImage)) return [];

    const sourceKind = currentMention.sourceKind || "";
    const plural = mentions
      .filter((mention) => {
        if (!mention.plural || !Array.isArray(mention.numbers) || mention.numbers.length < 2) return false;
        if (!mention.numbers.includes(currentImage)) return false;
        if (sourceKind && mention.sourceKind && mention.sourceKind !== sourceKind) return false;
        if (mention.index > currentMention.index) return false;
        return currentMention.index - mention.index <= 2500;
      })
      .at(-1);

    return plural?.numbers || [];
  };

  const getLiveMentionWindow = (blockText, cutoff, afterChars = 160, blockElement = null, anchorRect = null) => {
    if (afterChars && typeof afterChars === "object" && "nodeType" in afterChars) {
      anchorRect = blockElement;
      blockElement = afterChars;
      afterChars = 160;
    }

    const safeAfterChars = Number.isFinite(Number(afterChars)) ? Number(afterChars) : 160;
    const renderedPrefix = getRenderedTextBeforeRect(blockElement, anchorRect);
    if (renderedPrefix) {
      const start = Math.max(0, renderedPrefix.length - 2600);
      const text = renderedPrefix.slice(start);
      return {
        text,
        start,
        end: renderedPrefix.length,
        mentions: extractImageMentions(text).map((mention) => ({
          ...mention,
          index: mention.index + start
        })),
        source: "rendered-prefix"
      };
    }

    const block = cleanDisplayText(blockText);
    const end = Math.max(0, Math.min(block.length, Number(cutoff) || 0));
    if (!block || end <= 0) return { text: "", start: 0, end: 0, mentions: [], source: "text-index" };

    const start = Math.max(0, end - 2200);
    const windowEnd = Math.min(block.length, end + safeAfterChars);
    const text = block.slice(start, windowEnd);
    const mentions = extractImageMentions(text)
      .map((mention) => ({
        ...mention,
        index: mention.index + start
      }))
      .filter((mention) => mention.index <= end);

    return { text, start, end, mentions, source: "text-index" };
  };

  const buildStrictLiveImageSection = (context) => {
    const blockText = cleanDisplayText(context?.blockText || "");
    if (!blockText) return null;

    const cutoff = getStrictCutoffIndexForContext(context);
    if (!Number.isFinite(cutoff) || cutoff < 0) return null;

    let mentions = [];
    if (context?.source === "explicit-highlighted-sentence") {
      const activeIndex = Math.max(0, Number(context?.activeTextIndex) || 0);
      mentions = extractImageMentions(context.activeText || "").map((mention) => ({
        ...mention,
        index: mention.index + activeIndex
      }));
    } else {
      const liveMentions = Array.isArray(context?.liveMentions) ? context.liveMentions : [];
      const liveWindow = context?.source === "explicit-live-cursor" && !liveMentions.length
        ? getLiveMentionWindow(blockText, cutoff, 160, context?.blockElement, context?.cursorRect)
        : null;
      mentions = liveMentions.length
        ? liveMentions
        : liveWindow?.mentions?.length
          ? liveWindow.mentions
        : extractImageMentions(blockText).filter((mention) => mention.index <= cutoff);
    }

    const currentMention = mentions.filter(isStrictImageMention).at(-1);
    if (!currentMention) return null;

    const currentImage = Number(getStrictMentionImageNumber(currentMention));
    const groupNumbers = getStrictGroupForMention(mentions, currentMention);
    if (!Number.isFinite(currentImage) || currentImage <= 0) return null;

    const group = getOrderedGroupNumbers(groupNumbers);
    const safeGroup = group.includes(currentImage) ? group : [];
    const groupLabel = safeGroup.length >= 2 ? `group ${compactImageNumbers(safeGroup)}` : "";
    const imageLabel = `image ${currentImage}`;
    const label = groupLabel ? `${groupLabel} / ${imageLabel}` : imageLabel;

    return {
      label,
      group: groupLabel,
      image: imageLabel,
      imageNumber: currentImage,
      sourceKind: currentMention.sourceKind || "",
      sourceLabel: currentMention.sourceLabel || "",
      groupNumbers: safeGroup,
      source: "strict-live-image-mention",
      activeText: cleanDisplayText(context?.activeText || ""),
      textPreview: cleanDisplayText(context?.activeText || context?.highlightText || "").slice(0, 240),
      debug: cleanDisplayText(context?.debug || ""),
      highlightAvailable: true,
      highlightStale: false,
      canCalibrateTimeline: false,
      textIndexSource: "strict-live-image-mention",
      textIndex: null
    };
  };

  const getSentenceInfoAroundIndex = (blockText, index, activeLength = 0) => {
    const block = cleanDisplayText(blockText);
    const startIndex = Number(index);
    if (!block || !Number.isFinite(startIndex) || startIndex < 0) {
      return { text: "", index: -1 };
    }

    const boundedIndex = Math.max(0, Math.min(block.length, startIndex));
    const focusLength = Math.max(0, Number(activeLength) || 0);
    const before = block.slice(0, boundedIndex);
    const after = block.slice(Math.min(block.length, boundedIndex + focusLength));
    const sentenceStart = Math.max(before.lastIndexOf("."), before.lastIndexOf("?"), before.lastIndexOf("!")) + 1;
    const afterStops = [after.indexOf("."), after.indexOf("?"), after.indexOf("!")].filter((n) => n >= 0);
    const sentenceEnd = afterStops.length
      ? Math.min(block.length, boundedIndex + focusLength + Math.min(...afterStops) + 1)
      : block.length;

    return {
      text: block.slice(sentenceStart, sentenceEnd).trim(),
      index: sentenceStart
    };
  };

  const getSpeechifyAutoscrollCueInfo = (blockText = "") => {
    const block = cleanDisplayText(blockText).toLowerCase();
    const cues = Array.from(document.querySelectorAll(SPEECHIFY_SELECTORS.autoscrollCue))
      .map((el) => ({
        el,
        text: cleanDisplayText(el.textContent || "")
      }))
      .filter((item) => item.text.length >= 2 && item.text.length <= 80);

    const cue = cues.find((item) => block && findCueOffsetsInText(block, item.text).length) || cues[0] || null;
    if (!cue) return { text: "", rect: null };

    const rect = isVisibleThroughAncestors(cue.el) ? cue.el.getBoundingClientRect() : null;
    return {
      text: cue.text,
      rect: rect && rect.width && rect.height ? rect : null
    };
  };

  const getSpeechifyAutoscrollCueText = (blockText = "") => {
    return getSpeechifyAutoscrollCueInfo(blockText).text;
  };

  const makeClientRect = (left, top, right, bottom) => {
    const safeLeft = Math.min(left, right);
    const safeTop = Math.min(top, bottom);
    const safeRight = Math.max(left, right);
    const safeBottom = Math.max(top, bottom);
    return {
      left: safeLeft,
      top: safeTop,
      right: safeRight,
      bottom: safeBottom,
      width: safeRight - safeLeft,
      height: safeBottom - safeTop
    };
  };

  const getSvgGraphicClientRect = (el) => {
    if (!el) return null;

    try {
      if (typeof el.getBBox === "function" && typeof el.getScreenCTM === "function") {
        const box = el.getBBox();
        const matrix = el.getScreenCTM();
        if (box && matrix && Number.isFinite(box.width) && Number.isFinite(box.height) && box.width > 0 && box.height > 0) {
          const points = [
            new DOMPoint(box.x, box.y).matrixTransform(matrix),
            new DOMPoint(box.x + box.width, box.y).matrixTransform(matrix),
            new DOMPoint(box.x, box.y + box.height).matrixTransform(matrix),
            new DOMPoint(box.x + box.width, box.y + box.height).matrixTransform(matrix)
          ];
          const rect = makeClientRect(
            Math.min(...points.map((point) => point.x)),
            Math.min(...points.map((point) => point.y)),
            Math.max(...points.map((point) => point.x)),
            Math.max(...points.map((point) => point.y))
          );
          if (rect.width > 0 && rect.height > 0) return rect;
        }
      }
    } catch {}

    const rect = el.getBoundingClientRect?.();
    return rect && rect.width > 0 && rect.height > 0 ? rect : null;
  };

  const getPrimarySvgHighlightRects = (block) => {
    if (!block) return [];
    const primarySvg =
      block.querySelector('svg[style*="--color-hglt-prim"]') ||
      block.querySelector('[style*="--color-hglt-prim"] svg') ||
      block.querySelector('[style*="--color-hglt-prim"]');
    if (!primarySvg) return [];

    const shapes = Array.from(
      primarySvg.querySelectorAll?.("path, rect, polygon, polyline, circle, ellipse") || []
    )
      .map(getSvgGraphicClientRect)
      .filter((rect) => rect && rect.width > 0 && rect.height > 0)
      .filter((rect) => rect.width <= 900 && rect.height <= 240);

    if (shapes.length) return shapes;

    const rect = primarySvg.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return [];
    if (rect.height > 240 || rect.width > 900) return [];
    return [rect];
  };

  const getPrimarySvgHighlightRect = (block) => {
    const rects = getPrimarySvgHighlightRects(block);
    return rects.length ? rects[rects.length - 1] : null;
  };

  const getSecondarySvgHighlightRects = (block) => {
    if (!block) return [];
    const secondarySvgs = Array.from(
      block.querySelectorAll('svg[style*="--color-hglt-sec"], [style*="--color-hglt-sec"] svg')
    );

    return secondarySvgs
      .flatMap((svg) => Array.from(svg.querySelectorAll?.("path, rect, polygon, polyline, circle, ellipse") || []))
      .map(getSvgGraphicClientRect)
      .filter((rect) => rect && rect.width > 0 && rect.height > 0)
      .filter((rect) => rect.width <= 1200 && rect.height <= 260);
  };

  const rectIntersects = (a, b, padding = 3) => {
    if (!a || !b) return false;
    return (
      a.right >= b.left - padding &&
      a.left <= b.right + padding &&
      a.bottom >= b.top - padding &&
      a.top <= b.bottom + padding
    );
  };

  const getTextNodesUnder = (root) => {
    if (!root) return [];
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return cleanDisplayText(node.nodeValue || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
  };

  const getTextRangeCoveredByRects = (block, highlightRects) => {
    const blockText = cleanDisplayText(block?.textContent || "");
    if (!block || !blockText || !highlightRects?.length) return null;

    const textNodes = getTextNodesUnder(block);
    let rawPrefix = "";
    const covered = [];

    for (const node of textNodes) {
      const raw = node.nodeValue || "";
      const wordRe = /\S+/g;
      let match;

      while ((match = wordRe.exec(raw)) !== null) {
        try {
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, Math.min(raw.length, match.index + match[0].length));
          const rects = Array.from(range.getClientRects()).filter((rect) => rect.width && rect.height);
          range.detach?.();
          if (!rects.some((rect) => highlightRects.some((highlightRect) => rectIntersects(rect, highlightRect)))) {
            continue;
          }

          covered.push({
            start: cleanDisplayText(rawPrefix + raw.slice(0, match.index)).length,
            end: cleanDisplayText(rawPrefix + raw.slice(0, match.index + match[0].length)).length
          });
        } catch {}
      }

      rawPrefix += raw;
    }

    if (!covered.length) return null;
    const start = Math.max(0, Math.min(...covered.map((item) => item.start)));
    const end = Math.min(blockText.length, Math.max(...covered.map((item) => item.end)));
    if (end <= start) return null;

    return {
      text: blockText.slice(start, end).trim(),
      start,
      end
    };
  };

  const rectIsBeforeOrAtAnchor = (rect, anchorRect) => {
    if (!rect || !anchorRect) return false;
    const lineSlack = Math.max(4, Math.min(18, anchorRect.height * 0.75));
    if (rect.bottom < anchorRect.top - lineSlack) return true;

    const sameLine =
      rect.top <= anchorRect.bottom + lineSlack &&
      rect.bottom >= anchorRect.top - lineSlack;
    return sameLine && rect.left <= anchorRect.right + lineSlack;
  };

  const getRenderedTextBeforeRect = (block, anchorRect) => {
    if (!block || !anchorRect) return "";

    const textNodes = getTextNodesUnder(block);
    const words = [];
    for (const node of textNodes) {
      const raw = node.nodeValue || "";
      const wordRe = /\S+/g;
      let match;

      while ((match = wordRe.exec(raw)) !== null) {
        try {
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, Math.min(raw.length, match.index + match[0].length));
          const rects = Array.from(range.getClientRects()).filter((rect) => rect.width && rect.height);
          range.detach?.();

          if (rects.some((rect) => rectIsBeforeOrAtAnchor(rect, anchorRect))) {
            words.push(match[0]);
          }
        } catch {}
      }
    }

    return cleanDisplayText(words.join(" "));
  };

  const findHighlightedCueRange = (ranges, cueText, focusIndex = -1) => {
    const cue = cleanDisplayText(cueText);
    if (!cue) return null;

    const matches = (ranges || [])
      .flatMap((range) => {
        const offsets = findCueOffsetsInText(range?.text || "", cue);
        return offsets.map((cueOffset) => {
          const cueIndex = Math.max(0, Number(range.start) || 0) + cueOffset;
          const distance = Number.isFinite(focusIndex) && focusIndex >= 0
            ? Math.abs(cueIndex - focusIndex)
            : Number.MAX_SAFE_INTEGER - cueIndex;
          return {
            ...range,
            cueIndex,
            distance
          };
        });
      })
      .sort((a, b) => a.distance - b.distance || b.cueIndex - a.cueIndex);

    return matches[0] || null;
  };

  const getLiveSentenceInfoForFocus = (block, blockText, focusIndex, cueText = "") => {
    const secondaryRanges = getSecondarySvgHighlightRects(block)
      .map((rect) => getTextRangeCoveredByRects(block, [rect]))
      .filter((range) => range?.text);
    const cueRange = findHighlightedCueRange(secondaryRanges, cueText, focusIndex);
    const highlightedRange =
      cueRange ||
      secondaryRanges.find((range) => focusIndex >= range.start - 3 && focusIndex <= range.end + 3);
    const sentenceFocus = Number.isFinite(cueRange?.cueIndex) ? cueRange.cueIndex : focusIndex;

    if (highlightedRange) {
      const sentenceInfo = getSentenceInfoAroundIndex(
        blockText,
        sentenceFocus,
        Math.max(1, cleanDisplayText(cueText).length || highlightedRange.end - highlightedRange.start)
      );
      return sentenceInfo.text ? sentenceInfo : highlightedRange;
    }

    return getSentenceInfoAroundIndex(blockText, focusIndex, Math.max(1, cleanDisplayText(cueText).length));
  };

  const getReaderFocusPoint = (block) => {
    const root = firstVisible(SPEECHIFY_SELECTORS.readerScrollContainer);
    const rect = root?.getBoundingClientRect?.() || block?.getBoundingClientRect?.();
    if (!rect || !rect.width || !rect.height) return null;
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height * 0.45,
      rect
    };
  };

  const findCueOccurrenceIndexNearRect = (block, cueText, targetRect) => {
    const cue = cleanDisplayText(cueText);
    const blockText = cleanDisplayText(block?.textContent || "");
    if (!block || cue.length < 2 || !blockText) return -1;

    const cueRe = makeWholeCueRegex(cue);
    if (!cueRe) return -1;
    const focusPoint = targetRect
      ? {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2,
          rect: targetRect
        }
      : getReaderFocusPoint(block);
    const textNodes = getTextNodesUnder(block);
    let rawPrefix = "";
    let best = null;

    for (const node of textNodes) {
      const raw = node.nodeValue || "";
      const re = makeWholeCueRegex(cue);
      let match;

      while ((match = re.exec(raw)) !== null) {
        const localIndex = match.index + String(match[1] || "").length;
        let score = cleanDisplayText(rawPrefix + raw.slice(0, localIndex)).length;

        try {
          const range = document.createRange();
          range.setStart(node, localIndex);
          range.setEnd(node, Math.min(raw.length, localIndex + cue.length));
          const rects = Array.from(range.getClientRects()).filter((rect) => rect.width && rect.height);
          range.detach?.();

          if (rects.length && focusPoint) {
            const rootRect = focusPoint.rect;
            const bestRectDistance = Math.min(
              ...rects.map((rect) => {
                const dx = rect.left + rect.width / 2 - focusPoint.x;
                const dy = rect.top + rect.height / 2 - focusPoint.y;
                const outsideViewport = targetRect
                  ? 0
                  : rect.bottom < rootRect.top || rect.top > rootRect.bottom || rect.right < rootRect.left || rect.left > rootRect.right
                    ? 2500
                    : 0;
                return Math.hypot(dx, dy) + outsideViewport;
              })
            );
            score = bestRectDistance;
          }
        } catch {}

        const normalizedIndex = cleanDisplayText(rawPrefix + raw.slice(0, localIndex)).length;
        if (!best || score < best.score) {
          best = { score, index: normalizedIndex };
        }

        if (re.lastIndex <= match.index) re.lastIndex = match.index + 1;
      }

      rawPrefix += raw;
    }

    if (best) return best.index;
    return findCueOffsetsInText(blockText, cue)[0] ?? -1;
  };

  const findTextIndexNearRect = (block, targetRect) => {
    const blockText = cleanDisplayText(block?.textContent || "");
    if (!block || !targetRect || !blockText) return -1;

    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;
    const textNodes = getTextNodesUnder(block);
    let rawPrefix = "";
    let best = null;

    for (const node of textNodes) {
      const raw = node.nodeValue || "";
      const wordRe = /\S+/g;
      let match;

      while ((match = wordRe.exec(raw)) !== null) {
        try {
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, Math.min(raw.length, match.index + match[0].length));
          const rects = Array.from(range.getClientRects()).filter((rect) => rect.width && rect.height);
          range.detach?.();

          if (!rects.length) continue;

          const distance = Math.min(
            ...rects.map((rect) => {
              const dx = rect.left + rect.width / 2 - targetX;
              const dy = rect.top + rect.height / 2 - targetY;
              return Math.hypot(dx, dy);
            })
          );
          const normalizedIndex = cleanDisplayText(rawPrefix + raw.slice(0, match.index)).length;
          if (!best || distance < best.distance) {
            best = { distance, index: normalizedIndex };
          }
        } catch {}
      }

      rawPrefix += raw;
    }

    return best ? best.index : -1;
  };

  const getLiveReaderBlocks = () => {
    const root = firstVisible(SPEECHIFY_SELECTORS.readerScrollContainer) || document;
    return Array.from(root.querySelectorAll(SPEECHIFY_SELECTORS.readerBlocks))
      .filter(isVisible)
      .filter((block) => cleanDisplayText(block.textContent || ""));
  };

  const getSimpleLiveReaderContext = () => {
    const blocks = getLiveReaderBlocks();
    if (!blocks.length) return null;

    const cursorContexts = blocks
      .map((item) => {
        const primaryRects = getPrimarySvgHighlightRects(item);
        if (!primaryRects.length) return null;

        const blockText = cleanDisplayText(item?.textContent || "");
        if (!blockText) return null;
        const cue = getSpeechifyAutoscrollCueText(blockText);

        const cursor = primaryRects
          .map((rect) => {
            const primaryCueRange = cue
              ? findHighlightedCueRange(
                  [getTextRangeCoveredByRects(item, [rect])].filter((range) => range?.text),
                  cue,
                  -1
                )
              : null;
            const cueIndex = Number.isFinite(primaryCueRange?.cueIndex)
              ? primaryCueRange.cueIndex
              : cue
                ? findCueOccurrenceIndexNearRect(item, cue, rect)
                : -1;
            return {
              rect,
              primaryCueRange,
              cueIndex,
              focusIndex: cueIndex >= 0 ? cueIndex : findTextIndexNearRect(item, rect)
            };
          })
          .filter((candidate) => candidate.focusIndex >= 0)
          .sort((a, b) => a.focusIndex - b.focusIndex)
          .at(-1);
        if (!cursor) return null;

        const sentenceInfo = getLiveSentenceInfoForFocus(item, blockText, cursor.focusIndex, cue);
        const liveWindow = getLiveMentionWindow(
          blockText,
          cursor.focusIndex + Math.max(1, cleanDisplayText(cue).length),
          160,
          item,
          cursor.rect
        );
        const activeText = liveWindow.mentions.length ? liveWindow.text : sentenceInfo.text || "";

        return {
          activeText,
          activeTextIndex: liveWindow.mentions.length
            ? liveWindow.start
            : sentenceInfo.start ?? (sentenceInfo.index >= 0 ? sentenceInfo.index : cursor.focusIndex),
          blockText,
          highlightText: cue || "",
          focusTextIndex: cursor.focusIndex,
          source: "explicit-live-cursor",
          debug: `cue=${cue || "-"} focus=${cursor.focusIndex} primary=${Number.isFinite(cursor.primaryCueRange?.cueIndex) ? cursor.primaryCueRange.cueIndex : "-"} win=${liveWindow.source || "-"} mentions=${liveWindow.mentions.map((mention) => mention.imageNumber || mention.numbers?.[0]).join("/") || "-"} active=${activeText.slice(0, 90)}`,
          liveMentions: liveWindow.mentions,
          blockElement: item,
          cursorRect: cursor.rect
        };
      })
      .filter(Boolean);
    if (cursorContexts.length) return cursorContexts.at(-1);

    const cueText = getSpeechifyAutoscrollCueText();
    const block =
      blocks.find((item) => getPrimarySvgHighlightRect(item)) ||
      blocks.find((item) => findCueOffsetsInText(item.textContent || "", cueText).length) ||
      blocks[0];
    const blockText = cleanDisplayText(block?.textContent || "");
    if (!blockText) return null;

    const cueInfo = getSpeechifyAutoscrollCueInfo(blockText);
    const targetRect = getPrimarySvgHighlightRect(block) || cueInfo.rect;
    const cue = cueInfo.text;
    const highlightedCueRange = cue
      ? findHighlightedCueRange(
          [
            targetRect ? getTextRangeCoveredByRects(block, [targetRect]) : null,
            ...getSecondarySvgHighlightRects(block)
            .map((rect) => getTextRangeCoveredByRects(block, [rect]))
          ].filter((range) => range?.text),
          cue,
          -1
        )
      : null;
    const focusIndex = Number.isFinite(highlightedCueRange?.cueIndex)
      ? highlightedCueRange.cueIndex
      : cue && targetRect
        ? findCueOccurrenceIndexNearRect(block, cue, targetRect)
        : targetRect
          ? findTextIndexNearRect(block, targetRect)
          : cue
            ? findCueOccurrenceIndexNearRect(block, cue, null)
            : -1;
    if (focusIndex < 0) return null;

    const sentenceInfo = getLiveSentenceInfoForFocus(block, blockText, focusIndex, cue);
    const liveWindow = getLiveMentionWindow(
      blockText,
      focusIndex + Math.max(1, cleanDisplayText(cue).length),
      160,
      block,
      targetRect
    );
    const activeText = liveWindow.mentions.length ? liveWindow.text : sentenceInfo.text || "";
    return {
      activeText,
      activeTextIndex: liveWindow.mentions.length
        ? liveWindow.start
        : sentenceInfo.start ?? (sentenceInfo.index >= 0 ? sentenceInfo.index : focusIndex),
      blockText,
      highlightText: cue,
      focusTextIndex: focusIndex,
      source: "explicit-live-cursor",
      debug: `cue=${cue || "-"} focus=${focusIndex} highlighted=${Number.isFinite(highlightedCueRange?.cueIndex) ? highlightedCueRange.cueIndex : "-"} win=${liveWindow.source || "-"} mentions=${liveWindow.mentions.map((mention) => mention.imageNumber || mention.numbers?.[0]).join("/") || "-"} active=${activeText.slice(0, 90)}`,
      liveMentions: liveWindow.mentions,
      blockElement: block,
      cursorRect: targetRect
    };
  };

  const inferLectureImageSection = () => {
    // Keep this deliberately simple: update only on explicit image mentions before the live cursor.
    const context = getSimpleLiveReaderContext();
    if (context) {
      const strictSection = buildStrictLiveImageSection(context);
      if (strictSection) {
        rememberExplicitImageSection(strictSection);
        return {
          ...strictSection,
          source: "explicit-live-image-mention",
          highlightAvailable: true,
          highlightStale: false
        };
      }
    }

    const heldSection = getLastExplicitImageSection("explicit-held-image");
    return heldSection
      ? {
          ...heldSection,
          highlightAvailable: Boolean(context),
          highlightStale: false,
          source: "explicit-held-image",
          activeText: cleanDisplayText(context?.activeText || heldSection.activeText || ""),
          textPreview: cleanDisplayText(context?.activeText || heldSection.textPreview || "").slice(0, 240),
          debug: cleanDisplayText(context?.debug || heldSection.debug || "")
        }
      : null;
  };

  const normalizeSpeedLabel = (value) => {
    return cleanDisplayText(value)
      .replace(/\s+/g, "")
      .replace(/\.0x$/i, "x")
      .toLowerCase();
  };

  const clickVisible = (selector, label) => {
    const el = firstVisible(selector);
    if (!el) throw new Error(`Speechify ${label} button was not found.`);
    if (el.disabled || el.getAttribute("aria-disabled") === "true") {
      throw new Error(`Speechify ${label} button is disabled.`);
    }
    el.click();
    return el;
  };

  const waitUntil = async (predicate, timeoutMs, errorMessage) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        if (predicate()) return true;
      } catch {}
      await sleep(250);
    }
    throw new Error(errorMessage || "Timed out waiting for Speechify.");
  };

  const waitForElement = async (selector, timeoutMs = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = document.querySelector(selector);
      if (el && isVisible(el)) return el;
      await sleep(250);
    }
    throw new Error(`Timed out waiting for element: ${selector}`);
  };

  const createOrUpdateSpeechifyOverlay = ({ phase, message }) => {
    const id = "og-speechify-automation-overlay";
    let host = document.getElementById(id);

    if (!host) {
      host = document.createElement("div");
      host.id = id;
      host.style.position = "fixed";
      host.style.right = "18px";
      host.style.bottom = "18px";
      host.style.zIndex = "2147483647";
      host.style.fontFamily =
        "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
      document.documentElement.appendChild(host);

      const shadow = host.attachShadow({ mode: "open" });
      shadow.innerHTML = `
        <style>
          .box {
            width: 340px;
            max-width: calc(100vw - 36px);
            border-radius: 14px;
            padding: 14px 16px;
            background: rgba(18, 18, 22, 0.94);
            color: white;
            box-shadow: 0 18px 60px rgba(0,0,0,.35);
            backdrop-filter: blur(18px);
            border: 1px solid rgba(255,255,255,.12);
          }
          .head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 6px;
          }
          .title {
            font-weight: 750;
            font-size: 14px;
          }
          .close {
            width: 24px;
            height: 24px;
            display: grid;
            place-items: center;
            border: 0;
            border-radius: 999px;
            background: rgba(255,255,255,.12);
            color: white;
            cursor: pointer;
            font: 700 14px/1 system-ui, sans-serif;
          }
          .phase {
            font-size: 12px;
            opacity: .72;
            margin-bottom: 4px;
          }
          .message {
            font-size: 13px;
            line-height: 1.35;
          }
        </style>
        <div class="box">
          <div class="head">
            <div class="title">Speechify automation</div>
            <button class="close" type="button" title="Close" aria-label="Close">x</button>
          </div>
          <div class="phase" id="phase"></div>
          <div class="message" id="message"></div>
        </div>
      `;
      shadow.querySelector(".close").addEventListener("click", () => host.remove());
    }

    const shadow = host.shadowRoot;
    clearTimeout(host.__radprimerDismissTimer);
    shadow.getElementById("phase").textContent = phase || "";
    shadow.getElementById("message").textContent = message || "";

    if (["DONE", "READY_TO_SAVE"].includes(String(phase || "").toUpperCase())) {
      host.__radprimerDismissTimer = setTimeout(() => host.remove(), 7000);
    }
  };

  const parseClockText = (value) => {
    const text = cleanDisplayText(value);
    if (!text) return null;
    const parts = text.split(":").map((part) => Number(part.trim()));

    if (!parts.length || parts.length > 3 || parts.some((part) => !Number.isFinite(part))) {
      return null;
    }
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  };

  const parseSpeechifySpeedRate = (value) => {
    const text = cleanDisplayText(value).replace(/\s+/g, "").toLowerCase();
    const match = text.match(/(\d+(?:\.\d+)?)/);
    const rate = match ? Number(match[1]) : 1;
    return Number.isFinite(rate) && rate > 0 ? rate : 1;
  };

  const formatClockSeconds = (value) => {
    if (!Number.isFinite(value)) return "";
    const total = Math.max(0, Math.floor(value));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    if (hours) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const getSyntheticClock = ({
    elapsedText,
    durationText,
    progress,
    isPlaying,
    speedRate,
    mediaElapsedSeconds,
    mediaDurationSeconds
  }) => {
    const now = Date.now();
    const hasMediaElapsed = Number.isFinite(mediaElapsedSeconds) && mediaElapsedSeconds >= 0;
    const hasMediaDuration = Number.isFinite(mediaDurationSeconds) && mediaDurationSeconds > 0;
    const rawElapsedSeconds = hasMediaElapsed ? mediaElapsedSeconds : parseClockText(elapsedText);
    const rawDurationSeconds = hasMediaDuration ? mediaDurationSeconds : parseClockText(durationText);
    const durationSeconds =
      Number.isFinite(rawDurationSeconds) && rawDurationSeconds > 0
        ? rawDurationSeconds
        : playerClockState.durationSeconds;
    const rawProgress = Number.isFinite(Number(progress)) ? Number(progress) : 0;
    let elapsedSeconds = Number.isFinite(rawElapsedSeconds)
      ? rawElapsedSeconds
      : playerClockState.elapsedSeconds;
    let source = hasMediaElapsed ? "media" : "dom";

    if (
      !hasMediaElapsed &&
      isPlaying &&
      Number.isFinite(playerClockState.elapsedSeconds) &&
      Number.isFinite(playerClockState.updatedAt) &&
      now > playerClockState.updatedAt
    ) {
      const domClockFrozen =
        Number.isFinite(rawElapsedSeconds) &&
        Number.isFinite(playerClockState.rawElapsedSeconds) &&
        rawElapsedSeconds === playerClockState.rawElapsedSeconds;
      const noDomClock = !Number.isFinite(rawElapsedSeconds);

      if (domClockFrozen || noDomClock) {
        elapsedSeconds =
          playerClockState.elapsedSeconds +
          ((now - playerClockState.updatedAt) / 1000) * parseSpeechifySpeedRate(speedRate);
        source = "synthetic";
      }
    }

    if (
      !hasMediaElapsed &&
      !isPlaying &&
      Number.isFinite(rawElapsedSeconds) &&
      Number.isFinite(playerClockState.rawElapsedSeconds) &&
      rawElapsedSeconds === playerClockState.rawElapsedSeconds &&
      Number.isFinite(playerClockState.elapsedSeconds) &&
      playerClockState.elapsedSeconds > rawElapsedSeconds
    ) {
      elapsedSeconds = playerClockState.elapsedSeconds;
      source = "synthetic";
    }

    if (Number.isFinite(durationSeconds) && durationSeconds > 0 && Number.isFinite(elapsedSeconds)) {
      elapsedSeconds = Math.max(0, Math.min(durationSeconds, elapsedSeconds));
    }

    const computedProgress =
      Number.isFinite(durationSeconds) && durationSeconds > 0 && Number.isFinite(elapsedSeconds)
        ? (elapsedSeconds / durationSeconds) * 100
        : rawProgress;
    const finalProgress = Math.max(0, Math.min(100, computedProgress || 0));

    playerClockState = {
      elapsedSeconds,
      durationSeconds,
      progress: finalProgress,
      isPlaying,
      updatedAt: now,
      rawElapsedSeconds: Number.isFinite(rawElapsedSeconds) ? rawElapsedSeconds : null
    };

    return {
      elapsedSeconds,
      durationSeconds,
      progress: finalProgress,
      elapsedText: formatClockSeconds(elapsedSeconds) || cleanDisplayText(elapsedText),
      durationText: formatClockSeconds(durationSeconds) || cleanDisplayText(durationText),
      source
    };
  };

  const adjustPlayerClock = (deltaSeconds) => {
    if (!Number.isFinite(playerClockState.elapsedSeconds)) return;
    const duration = playerClockState.durationSeconds;
    let elapsed = playerClockState.elapsedSeconds + deltaSeconds;
    if (Number.isFinite(duration) && duration > 0) elapsed = Math.max(0, Math.min(duration, elapsed));
    else elapsed = Math.max(0, elapsed);

    playerClockState = {
      ...playerClockState,
      elapsedSeconds: elapsed,
      progress: Number.isFinite(duration) && duration > 0 ? (elapsed / duration) * 100 : playerClockState.progress,
      updatedAt: Date.now()
    };
  };

  const getSpeechifyPlayState = ({ tabAudible = false } = {}) => {
    const playButton = firstVisible(SPEECHIFY_SELECTORS.playerPlayButton);
    const media = getActiveMediaElement();
    const playLabel = cleanDisplayText(playButton?.getAttribute("aria-label") || "");
    const mediaIsPlaying = Boolean(media && !media.paused && !media.ended);
    const labelSaysPause = /^pause\b/i.test(playLabel);
    const labelSaysPlay = /^(play|resume)\b/i.test(playLabel);

    return {
      available: Boolean(playButton),
      playLabel,
      isPlaying: labelSaysPause || (!labelSaysPlay && (mediaIsPlaying || Boolean(tabAudible)))
    };
  };

  const getSpeechifyPlayerState = ({ tabAudible = false } = {}) => {
    const playButton = firstVisible(SPEECHIFY_SELECTORS.playerPlayButton);
    const progressBar = firstVisible(SPEECHIFY_SELECTORS.progressBar);
    const timeButton = firstVisible(SPEECHIFY_SELECTORS.progressTimeToggle);
    const durationButton = firstVisible(SPEECHIFY_SELECTORS.progressDurationToggle);
    const speedButton = firstVisible(SPEECHIFY_SELECTORS.playerSpeedButton);
    const voiceButton = firstVisible(SPEECHIFY_SELECTORS.playerVoiceButton);
    const titleButton = firstVisible(SPEECHIFY_SELECTORS.navFileActionButton);
    const media = getActiveMediaElement();
    const playState = getSpeechifyPlayState({ tabAudible });
    const playLabel = playState.playLabel;
    const progress = parseFloat(progressBar?.getAttribute("aria-valuenow") || "");
    const isPlaying = playState.isPlaying;
    const rawElapsed = cleanDisplayText(timeButton?.innerText || "");
    const rawDuration = cleanDisplayText(durationButton?.innerText || "");
    const title = cleanDisplayText(
      titleButton?.innerText || document.title.replace(/\s*\|\s*Speechify\s*$/i, "")
    );
    const lectureIdentity = normalize(title || location.href);
    if (lectureIdentity && lectureIdentity !== currentLectureIdentity) {
      currentLectureIdentity = lectureIdentity;
      resetStrictImagePointerState();
    }
    const speedText = cleanDisplayText(
      speedButton?.innerText ||
        (speedButton?.getAttribute("aria-label") || "").replace(/^Speed:\s*/i, "")
    );
    const clock = getSyntheticClock({
      elapsedText: rawElapsed,
      durationText: rawDuration,
      progress: Number.isFinite(progress) ? progress : 0,
      isPlaying,
      speedRate: speedText,
      mediaElapsedSeconds: media && Number.isFinite(media.currentTime) ? media.currentTime : null,
      mediaDurationSeconds: media && Number.isFinite(media.duration) ? media.duration : null
    });

    return {
      available: Boolean(playButton),
      isPlaying,
      tabAudible: Boolean(tabAudible),
      playLabel,
      elapsed: clock.elapsedText,
      duration: clock.durationText,
      elapsedSeconds: clock.elapsedSeconds,
      durationSeconds: clock.durationSeconds,
      progress: clock.progress,
      clockSource: clock.source,
      speed: speedText,
      voice: cleanDisplayText(
        voiceButton?.dataset?.voiceName ||
          (voiceButton?.getAttribute("aria-label") || "").replace(/^Voice:\s*/i, "")
      ),
      title,
      lectureSection: inferLectureImageSection({
        title,
        progress: clock.progress,
        elapsedSeconds: clock.elapsedSeconds,
        durationSeconds: clock.durationSeconds,
        clockSource: clock.source,
        isPlaying,
        tabAudible: Boolean(tabAudible)
      }),
      url: location.href
    };
  };

  const getElementSpeedText = (el) => {
    return cleanDisplayText(
      el?.innerText ||
        el?.textContent ||
        el?.getAttribute?.("aria-label") ||
        el?.getAttribute?.("data-value") ||
        ""
    );
  };

  const findSpeechifySpeedOption = (targetSpeed) => {
    const wanted = normalizeSpeedLabel(targetSpeed);
    if (!wanted) return null;

    const currentButton = firstVisible(SPEECHIFY_SELECTORS.playerSpeedButton);
    const candidates = Array.from(
      document.querySelectorAll(
        [
          "button",
          '[role="menuitem"]',
          '[role="option"]',
          '[role="button"]',
          '[data-testid*="speed"]',
          "[data-value]"
        ].join(",")
      )
    ).filter((el) => el && el !== currentButton && isVisible(el));

    return (
      candidates.find((el) => normalizeSpeedLabel(getElementSpeedText(el)) === wanted) ||
      candidates.find((el) => normalizeSpeedLabel(getElementSpeedText(el)).includes(wanted)) ||
      null
    );
  };

  const setSpeechifySpeed = async (targetSpeed, stateOptions = {}) => {
    const wanted = normalizeSpeedLabel(targetSpeed);
    if (!wanted) throw new Error("No Speechify speed was requested.");

    const current = normalizeSpeedLabel(getSpeechifyPlayerState(stateOptions).speed);
    if (current === wanted) return getSpeechifyPlayerState(stateOptions);

    clickVisible(SPEECHIFY_SELECTORS.playerSpeedButton, "speed");

    let option = null;
    await waitUntil(
      () => {
        option = findSpeechifySpeedOption(wanted);
        return Boolean(option);
      },
      5000,
      `Speechify speed option ${targetSpeed} was not found.`
    );

    option.click();
    await sleep(350);
    return getSpeechifyPlayerState(stateOptions);
  };

  const waitForSpeechifyPlayStateFlip = async (previousIsPlaying, stateOptions = {}, timeoutMs = 1500) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const current = getSpeechifyPlayState(stateOptions);
      if (current.available && current.isPlaying !== previousIsPlaying) return true;
      await sleep(50);
    }
    return false;
  };

  const runSpeechifyPlayerRemote = async ({ action, speed, tabAudible }) => {
    const normalizedAction = String(action || "state");
    const stateOptions = { tabAudible: Boolean(tabAudible) };
    let state = null;

    if (normalizedAction === "playPause") {
      const before = getSpeechifyPlayState(stateOptions);
      clickVisible(SPEECHIFY_SELECTORS.playerPlayButton, "play/pause");
      if (before.available) await waitForSpeechifyPlayStateFlip(before.isPlaying, stateOptions);
      else await sleep(120);
    } else if (normalizedAction === "back10") {
      clickVisible(SPEECHIFY_SELECTORS.playerBackwardButton, "back 10 seconds");
      adjustPlayerClock(-10);
      await sleep(220);
    } else if (normalizedAction === "forward10") {
      clickVisible(SPEECHIFY_SELECTORS.playerForwardButton, "forward 10 seconds");
      adjustPlayerClock(10);
      await sleep(220);
    } else if (normalizedAction === "speed") {
      clickVisible(SPEECHIFY_SELECTORS.playerSpeedButton, "speed");
      await sleep(220);
    } else if (normalizedAction === "setSpeed") {
      state = await setSpeechifySpeed(speed, stateOptions);
    } else if (normalizedAction !== "state" && normalizedAction !== "focus") {
      throw new Error(`Unsupported Speechify player action: ${normalizedAction}`);
    }

    state = state || getSpeechifyPlayerState(stateOptions);
    if (!state.available) {
      throw new Error("No Speechify player is visible. Open a Speechify lecture/player tab first.");
    }
    return state;
  };

  const waitForSpeechifyLibrary = async (timeoutMs = 60000) => {
    await waitForElement(SPEECHIFY_SELECTORS.library, timeoutMs);
    await waitUntil(
      () =>
        !!document.querySelector(SPEECHIFY_SELECTORS.library) &&
        !!document.querySelector(SPEECHIFY_SELECTORS.appRoot),
      timeoutMs,
      "Speechify library not loaded or login required."
    );
  };

  const isCurrentSpeechifyFolder = (folder) => {
    if (!folder) return false;

    if (folder.id) {
      const byId = document.querySelector(
        `button[data-testid="breadcrumb-item-${CSS.escape(folder.id)}"]`
      );
      if (byId) {
        if (!folder.name) return true;
        if (normalize(byId.innerText) === normalize(folder.name)) return true;
      }
    }

    const breadcrumbs = Array.from(
      document.querySelectorAll(SPEECHIFY_SELECTORS.breadcrumbItems)
    );
    const last = breadcrumbs.at(-1);
    return Boolean(folder.name) && normalize(last?.innerText || "") === normalize(folder.name);
  };

  const verifySpeechifyFolderOpen = async ({ folderId, folderName, timeoutMs = 30000 }) => {
    await waitUntil(
      () => isCurrentSpeechifyFolder({ id: folderId, name: folderName }),
      timeoutMs,
      `Speechify did not open target folder "${folderName || folderId}".`
    );
  };

  const findVisibleSpeechifyFolderCard = async (folder) => {
    const selectors = [];
    if (folder.id) {
      selectors.push(`[data-testid="library-grid-folder-${CSS.escape(folder.id)}"]`);
      selectors.push(`[data-item-id="${CSS.escape(folder.id)}"]`);
    }

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && isVisible(el)) return el;
    }

    const candidates = [
      ...document.querySelectorAll(SPEECHIFY_SELECTORS.folderCards),
      ...document.querySelectorAll(SPEECHIFY_SELECTORS.libraryItemCards)
    ];

    return (
      candidates.find((el) => {
        const label = el.getAttribute("aria-label") || el.innerText || "";
        return normalize(label) === normalize(folder.name) && isVisible(el);
      }) || null
    );
  };

  const navigateSpeechifyFolderChain = async (folderChain) => {
    await waitForSpeechifyLibrary();

    for (const folder of folderChain) {
      if (isCurrentSpeechifyFolder(folder)) continue;
      const card = await findVisibleSpeechifyFolderCard(folder);
      if (!card) {
        throw new Error(
          `Speechify folder "${folder.name}" (${folder.id}) was not visible.`
        );
      }
      card.click();
      await waitUntil(
        () => isCurrentSpeechifyFolder(folder),
        20000,
        `Clicked Speechify folder "${folder.name}", but breadcrumb did not update.`
      );
    }
  };

  const waitForTextOption = async (labels, timeoutMs) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const candidates = [
        ...document.querySelectorAll("button"),
        ...document.querySelectorAll('[role="menuitem"]'),
        ...document.querySelectorAll('[role="option"]'),
        ...document.querySelectorAll('[role="button"]')
      ];

      const match = candidates.find((el) => {
        const text = normalize(el.innerText || el.textContent || "");
        return labels.some((label) => {
          const wanted = normalize(label);
          return text === wanted || text.includes(wanted);
        });
      });

      if (match && isVisible(match)) return match;
      await sleep(250);
    }

    throw new Error(`Could not find Speechify text import option: ${labels.join(", ")}`);
  };

  const openSpeechifyAddTextModal = async () => {
    const toolbarButton = document.querySelector(SPEECHIFY_SELECTORS.toolbarAddTextButton);
    if (toolbarButton && isVisible(toolbarButton)) {
      toolbarButton.click();
    } else {
      const newButton = await waitForElement(SPEECHIFY_SELECTORS.sidebarNewButton, 15000);
      newButton.click();
      await sleep(300);
      const option = await waitForTextOption(["Paste Text", "Add Text", "Create Note", "Text"], 15000);
      option.click();
    }

    await waitForElement(SPEECHIFY_SELECTORS.textTextarea, 20000);
    await waitForElement(SPEECHIFY_SELECTORS.titleInput, 20000);
    await waitForElement(SPEECHIFY_SELECTORS.saveButton, 20000);
  };

  const setNativeValue = (el, value) => {
    const proto =
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value);
    else el.value = value;

    el.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: value
      })
    );
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const setContentEditableValue = (el, value) => {
    el.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);

    const inserted = document.execCommand?.("insertText", false, value);
    if (!inserted || !textareaValueMatchesSource(el.innerText || el.textContent || "", value)) {
      el.textContent = value;
    }

    el.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertFromPaste",
        data: value
      })
    );
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const setSpeechifyTextFieldValue = (el, value) => {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      setNativeValue(el, value);
    } else if (el?.isContentEditable) {
      setContentEditableValue(el, value);
    } else {
      throw new Error("Speechify text field is not editable.");
    }
  };

  const getSpeechifyTextFieldValue = (el) => {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value || "";
    return el?.innerText || el?.textContent || "";
  };

  const normalizeTextareaText = (value) => {
    return String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  };

  const textareaValueMatchesSource = (value, sourceText) => {
    const accepted = normalizeTextareaText(value);
    const expected = normalizeTextareaText(sourceText);
    if (!expected.trim()) return false;
    if (accepted === expected || accepted.trim() === expected.trim()) return true;

    const expectedStart = expected.slice(0, 160).trim();
    const expectedEnd = expected.slice(Math.max(0, expected.length - 160)).trim();
    const acceptedTrimmed = accepted.trim();
    const expectedTrimmed = expected.trim();

    return (
      acceptedTrimmed.length >= Math.max(1, expectedTrimmed.length - 2) &&
      (!expectedStart || accepted.includes(expectedStart.slice(0, 80))) &&
      (!expectedEnd || accepted.includes(expectedEnd.slice(Math.max(0, expectedEnd.length - 80))))
    );
  };

  const makeSpeechifyTitleFromText = (text) => {
    const lines = String(text || "")
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let title = lines[0] || "ChatGPT Lecture";
    title = title.replace(/^#+\s*/, "").replace(/^Title:\s*/i, "").trim();
    if (title.length > 100) title = title.slice(0, 100).trim();
    return title || "ChatGPT Lecture";
  };

  const waitForSaveEnabled = async (timeoutMs = 15000) => {
    await waitUntil(() => {
      const btn = document.querySelector(SPEECHIFY_SELECTORS.saveButton);
      return btn && !btn.disabled && btn.getAttribute("aria-disabled") !== "true";
    }, timeoutMs, "Speechify Save File button did not become enabled.");
  };

  const fillSpeechifyAddTextModal = async ({ title, text }) => {
    const titleInput = await waitForElement(SPEECHIFY_SELECTORS.titleInput, 15000);
    const textArea = await waitForElement(SPEECHIFY_SELECTORS.textTextarea, 15000);
    const finalTitle = title || makeSpeechifyTitleFromText(text);

    titleInput.focus();
    setNativeValue(titleInput, finalTitle);

    textArea.focus();
    setSpeechifyTextFieldValue(textArea, text);

    await waitUntil(() => {
      return textareaValueMatchesSource(getSpeechifyTextFieldValue(textArea), text);
    }, 15000, "Speechify textarea did not accept the full text.");

    await waitForSaveEnabled();
  };

  const clickSpeechifySaveFile = async () => {
    const btn = await waitForElement(SPEECHIFY_SELECTORS.saveButton, 15000);
    if (btn.disabled || btn.getAttribute("aria-disabled") === "true") {
      throw new Error("Speechify Save File button is still disabled.");
    }
    btn.click();
  };

  const waitForSpeechifySaveCompletion = async ({ title, timeoutMs = 90000 }) => {
    const normalizedTitle = normalize(title);
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const modalStillOpen = !!document.querySelector(SPEECHIFY_SELECTORS.textTextarea);
      const titleFound = Array.from(
        document.querySelectorAll(SPEECHIFY_SELECTORS.libraryItemTitles)
      ).some((el) => normalize(el.innerText) === normalizedTitle);
      const cardFound = Array.from(
        document.querySelectorAll(SPEECHIFY_SELECTORS.libraryItemCards)
      ).some((el) => normalize(el.getAttribute("aria-label")) === normalizedTitle);

      if (!modalStillOpen || titleFound || cardFound) return true;
      await sleep(300);
    }

    throw new Error("Timed out waiting for Speechify file save completion.");
  };

  const runSpeechifyCreateTextNote = async ({ title, text, folder, autoSave }) => {
    if (!text?.trim()) throw new Error("No text was provided to Speechify.");
    const finalTitle = title || makeSpeechifyTitleFromText(text);

    createOrUpdateSpeechifyOverlay({
      phase: "WAITING_FOR_LIBRARY",
      message: "Waiting for Speechify library..."
    });
    await waitForSpeechifyLibrary();

    createOrUpdateSpeechifyOverlay({
      phase: "VERIFYING_FOLDER",
      message: `Verifying Speechify folder: ${folder?.name || folder?.id || "default"}`
    });

    if (folder?.id || folder?.name) {
      try {
        await verifySpeechifyFolderOpen({
          folderId: folder.id,
          folderName: folder.name,
          timeoutMs: 30000
        });
      } catch (directUrlError) {
        console.warn(
          "[Speechify] Direct folder URL verification failed. Trying fallback navigation.",
          directUrlError
        );
        if (Array.isArray(folder.parentChain) && folder.parentChain.length) {
          await navigateSpeechifyFolderChain(folder.parentChain);
        } else {
          throw directUrlError;
        }
      }
    }

    createOrUpdateSpeechifyOverlay({
      phase: "OPENING_ADD_TEXT",
      message: "Opening Speechify Add Text modal..."
    });
    await openSpeechifyAddTextModal();

    createOrUpdateSpeechifyOverlay({
      phase: "FILLING_TEXT",
      message: "Filling Speechify title and text..."
    });
    await fillSpeechifyAddTextModal({ title: finalTitle, text });

    if (autoSave === true) {
      createOrUpdateSpeechifyOverlay({
        phase: "SAVING_FILE",
        message: "Saving Speechify file..."
      });
      await clickSpeechifySaveFile();
      await waitForSpeechifySaveCompletion({ title: finalTitle, timeoutMs: 90000 });
      createOrUpdateSpeechifyOverlay({
        phase: "DONE",
        message: "Speechify text file created."
      });
    } else {
      createOrUpdateSpeechifyOverlay({
        phase: "READY_TO_SAVE",
        message: "Speechify text is filled. Click Save File when you are ready."
      });
    }

    return { title: finalTitle, folder, autoSaved: autoSave === true };
  };

  loadSourceHotkeyKeys();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (!SOURCE_HOTKEY_STORAGE_KEYS.some((key) => changes[key])) return;
    loadSourceHotkeyKeys();
  });
  document.addEventListener("keydown", relaySourceHotkeyFromSpeechify, true);
  document.addEventListener("click", refocusSourceAfterSpeechifyPlayerClick, true);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "SPEECHIFY_PLAYER_REMOTE") {
      runSpeechifyPlayerRemote(message)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((error) => {
          console.error("[Speechify remote error]", error);
          sendResponse({ ok: false, error: String(error?.message || error) });
        });

      return true;
    }

    if (message?.type !== "SPEECHIFY_CREATE_TEXT_NOTE") return false;

    runSpeechifyCreateTextNote(message)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => {
        console.error("[Speechify automation error]", error);
        createOrUpdateSpeechifyOverlay({
          phase: "ERROR",
          message: String(error?.message || error)
        });
        sendResponse({ ok: false, error: String(error?.message || error) });
      });

    return true;
  });
})();
