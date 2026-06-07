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
    textTextarea: "textarea#textImportText",
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
    updatedAt: 0
  };
  let readerHighlightState = {
    signature: "",
    changedAt: 0,
    checkedAt: 0,
    source: "",
    lastContext: null
  };
  let currentLectureIdentity = "";

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  const cleanDisplayText = (value) => {
    return String(value || "")
      .replace(/\u00A0/g, " ")
      .replace(/Ã—/g, "x")
      .replace(/×/g, "x")
      .replace(/\s+/g, " ")
      .trim();
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
      textPreview: lectureExplicitImageState.textPreview || ""
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
      updatedAt: 0
    };
    readerHighlightState = {
      signature: "",
      changedAt: 0,
      checkedAt: 0,
      source: "",
      lastContext: null
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

  const buildStrictLiveImageSection = (context) => {
    const blockText = cleanDisplayText(context?.blockText || "");
    if (!blockText) return null;

    const cutoff = getStrictCutoffIndexForContext(context);
    const mentions = extractImageMentions(blockText).filter((mention) => mention.index <= cutoff);
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
      highlightAvailable: true,
      highlightStale: false,
      canCalibrateTimeline: false,
      textIndexSource: "strict-live-image-mention",
      textIndex: null
    };
  };

  const getSentenceAroundText = (blockText, activeText) => {
    const block = cleanDisplayText(blockText);
    const active = cleanDisplayText(activeText);
    if (!block || active.length < 4) return active || block;

    const index = block.toLowerCase().indexOf(active.toLowerCase());
    if (index < 0) return active || block;

    const before = block.slice(0, index);
    const after = block.slice(index + active.length);
    const sentenceStart = Math.max(before.lastIndexOf("."), before.lastIndexOf("?"), before.lastIndexOf("!")) + 1;
    const afterStops = [after.indexOf("."), after.indexOf("?"), after.indexOf("!")].filter((n) => n >= 0);
    const sentenceEnd = afterStops.length ? index + active.length + Math.min(...afterStops) + 1 : block.length;

    return block.slice(sentenceStart, sentenceEnd).trim();
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

  const getSentenceAroundIndex = (blockText, index, activeLength = 0) => {
    return getSentenceInfoAroundIndex(blockText, index, activeLength).text;
  };

  const getSpeechifyAutoscrollCueText = (blockText = "") => {
    const block = cleanDisplayText(blockText).toLowerCase();
    const cues = Array.from(document.querySelectorAll(SPEECHIFY_SELECTORS.autoscrollCue))
      .map((el) => cleanDisplayText(el.textContent || ""))
      .filter((text) => text.length >= 2 && text.length <= 80);

    if (!cues.length) return "";
    return cues.find((text) => block && block.includes(text.toLowerCase())) || cues[0] || "";
  };

  const getPrimarySvgHighlightRect = (block) => {
    if (!block) return null;
    const primarySvg =
      block.querySelector('svg[style*="--color-hglt-prim"]') ||
      block.querySelector('[style*="--color-hglt-prim"] svg') ||
      block.querySelector('[style*="--color-hglt-prim"]');
    if (!primarySvg) return null;

    const rect = primarySvg.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    return rect;
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

  const getElementTextIndexWithinBlock = (block, el) => {
    if (!block || !el || block === el || !block.contains(el)) return -1;

    const textNodes = getTextNodesUnder(block);
    let rawPrefix = "";

    for (const node of textNodes) {
      if (el.contains(node)) {
        return cleanDisplayText(rawPrefix).length;
      }
      rawPrefix += node.nodeValue || "";
    }

    return -1;
  };

  const getReaderActiveContextForElement = (block, el, text) => {
    const blockText = cleanDisplayText(block?.textContent || "");
    const highlightText = cleanDisplayText(text || "");
    if (!blockText) {
      return { activeText: "", activeTextIndex: -1, focusTextIndex: -1 };
    }

    const elementIndex = getElementTextIndexWithinBlock(block, el);
    if (elementIndex >= 0) {
      const sentenceInfo = getSentenceInfoAroundIndex(blockText, elementIndex, highlightText.length);
      return {
        activeText: sentenceInfo.text || blockText,
        activeTextIndex: sentenceInfo.index >= 0 ? sentenceInfo.index : 0,
        focusTextIndex: elementIndex
      };
    }

    const activeText = getSentenceAroundText(blockText, highlightText);
    return {
      activeText,
      activeTextIndex: activeText ? findTextIndexSimple(blockText, activeText) : -1,
      focusTextIndex: highlightText ? findTextIndexSimple(blockText, highlightText) : -1
    };
  };

  const findCueOccurrenceIndexNearRect = (block, cueText, targetRect) => {
    const cue = cleanDisplayText(cueText);
    const blockText = cleanDisplayText(block?.textContent || "");
    if (!block || cue.length < 2 || !blockText) return -1;

    const lowerCue = cue.toLowerCase();
    const textNodes = getTextNodesUnder(block);
    let globalRawOffset = 0;
    let best = null;

    for (const node of textNodes) {
      const raw = node.nodeValue || "";
      const lowerRaw = raw.toLowerCase();
      let localIndex = lowerRaw.indexOf(lowerCue);

      while (localIndex >= 0) {
        let score = globalRawOffset + localIndex;

        if (targetRect) {
          try {
            const range = document.createRange();
            range.setStart(node, localIndex);
            range.setEnd(node, Math.min(raw.length, localIndex + cue.length));
            const rects = Array.from(range.getClientRects()).filter((rect) => rect.width && rect.height);
            range.detach?.();

            const targetX = targetRect.left + targetRect.width / 2;
            const targetY = targetRect.top + targetRect.height / 2;
            const bestRectDistance = rects.length
              ? Math.min(
                  ...rects.map((rect) => {
                    const dx = rect.left + rect.width / 2 - targetX;
                    const dy = rect.top + rect.height / 2 - targetY;
                    return Math.hypot(dx, dy);
                  })
                )
              : 5000;
            score = bestRectDistance;
          } catch {}
        }

        const rawPrefix = textNodes
          .slice(0, textNodes.indexOf(node))
          .map((item) => item.nodeValue || "")
          .join("");
        const normalizedIndex = cleanDisplayText(rawPrefix + raw.slice(0, localIndex)).length;
        if (!best || score < best.score) {
          best = { score, index: normalizedIndex };
        }

        localIndex = lowerRaw.indexOf(lowerCue, localIndex + Math.max(1, cue.length));
      }

      globalRawOffset += raw.length;
    }

    if (best) return best.index;
    return blockText.toLowerCase().indexOf(lowerCue);
  };

  const getSvgAnchoredReaderContext = (block) => {
    const blockText = cleanDisplayText(block?.textContent || "");
    if (!blockText) return null;

    const cue = getSpeechifyAutoscrollCueText(blockText);
    if (!cue) return null;

    const cueIndex = findCueOccurrenceIndexNearRect(block, cue, getPrimarySvgHighlightRect(block));
    if (cueIndex < 0) return null;

    const activeText = getSentenceAroundIndex(blockText, cueIndex, cue.length) || getSentenceAroundText(blockText, cue);
    return {
      activeText: activeText || blockText,
      blockText,
      highlightText: cue,
      highlightSignature: `${cue}|${blockText.slice(0, 360)}|${cueIndex}`.slice(0, 900),
      source: "highlight-svg-cue"
    };
  };

  const getReaderContextBlockForElement = (el, root) => {
    if (!el) return null;

    const preferred = el.closest?.(".reader-api-block") || el.closest?.("p");
    const preferredText = cleanDisplayText(preferred?.textContent || "");
    if (preferred && preferredText.length >= 24) return preferred;

    let current = el.parentElement;
    const rootEl = root === document ? document.body : root;
    let best = preferred || el;

    while (current && current !== rootEl && current !== document.body && current !== document.documentElement) {
      const text = cleanDisplayText(current.textContent || "");
      if (text.length >= 80 && text.length <= 3500) {
        best = current;
        break;
      }
      if (text.length > cleanDisplayText(best?.textContent || "").length && text.length <= 3500) {
        best = current;
      }
      current = current.parentElement;
    }

    return best || el;
  };

  const isPaintedReaderHighlightElement = (el) => {
    if (!el || !isVisible(el)) return false;
    const text = cleanDisplayText(el.textContent || "");
    if (!text || text.length > 1200) return false;

    const style = getComputedStyle(el);
    const bg = style.backgroundColor;
    const painted = bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)";
    if (!painted) return false;

    const className = String(el.className || "").toLowerCase();
    if (/(button|control|toolbar|menu|popover|tooltip)/i.test(className)) return false;

    return true;
  };

  const parseCssRgb = (value) => {
    const match = String(value || "").match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;
    const parts = match[1]
      .split(",")
      .map((part) => Number(String(part).trim()))
      .filter(Number.isFinite);
    if (parts.length < 3) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length >= 4 ? parts[3] : 1 };
  };

  const getHighlightColorScore = (el) => {
    const rgb = parseCssRgb(getComputedStyle(el).backgroundColor);
    if (!rgb || rgb.a === 0) return 0;

    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const min = Math.min(rgb.r, rgb.g, rgb.b);
    const saturation = max - min;
    const bluePurpleBias = rgb.b - Math.min(rgb.r, rgb.g);
    const grayPenalty = saturation < 18 ? 220 : 0;
    const activeBlueBonus = bluePurpleBias > 18 ? -260 : bluePurpleBias > 8 ? -120 : 0;
    const purpleSentenceBonus = rgb.b > rgb.r + 8 && rgb.b > rgb.g + 4 ? -130 : 0;

    return grayPenalty + activeBlueBonus + purpleSentenceBonus;
  };

  const scoreReaderHighlightCandidate = (el) => {
    if (!el) return Number.POSITIVE_INFINITY;
    const text = cleanDisplayText(el.textContent || "");
    const tagName = String(el.tagName || "").toUpperCase();
    const className = String(el.className || "").toLowerCase();
    const bg = getComputedStyle(el).backgroundColor;
    const explicit =
      el.matches?.('[aria-current="true"], [data-current="true"], [data-active="true"], mark') ||
      /(highlight|hglt|listening|current)/i.test(className);
    const painted = bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)";

    let score = 0;
    if (explicit) score -= 250;
    if (painted) score -= 80;
    if (/^(MARK|SPAN|STRONG|EM)$/i.test(tagName)) score -= 80;
    if (/^(P|DIV|SECTION|ARTICLE)$/i.test(tagName)) score += 160;

    if (text.length <= 0) score += 10000;
    else if (text.length <= 80) score += text.length;
    else if (text.length <= 260) score += 120 + text.length * 0.25;
    else score += 600 + text.length;

    score += getHighlightColorScore(el);

    const rect = el.getBoundingClientRect();
    score += Math.max(0, rect.height - 90) * 4;
    return score;
  };

  const getHighlightedReaderContext = () => {
    const root = firstVisible(SPEECHIFY_SELECTORS.readerScrollContainer) || document;
    const candidates = Array.from(
      root.querySelectorAll(
        [
          '[aria-current="true"]',
          '[data-current="true"]',
          '[data-active="true"]',
          '[data-testid*="current"]',
          '[data-testid*="listening"]',
          '[class*="highlight"]',
          '[class*="hglt"]',
          '[class*="listening"]',
          "mark"
        ].join(",")
      )
    )
      .slice(0, 120)
      .sort((a, b) => scoreReaderHighlightCandidate(a) - scoreReaderHighlightCandidate(b));

    for (const el of candidates) {
      if (!isVisible(el)) continue;
      const text = cleanDisplayText(el.textContent || "");
      if (!text) continue;

      const className = String(el.className || "").toLowerCase();
      const bg = getComputedStyle(el).backgroundColor;
      const explicit =
        el.matches?.('[aria-current="true"], [data-current="true"], [data-active="true"], mark') ||
        /(highlight|hglt|listening|current)/i.test(className);
      const painted = bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)";

      if (!explicit && !painted) continue;

      const block = getReaderContextBlockForElement(el, root);
      const blockText = cleanDisplayText(block.textContent || "");
      const activeContext = getReaderActiveContextForElement(block, el, text);
      const activeText = activeContext.activeText;
      return {
        activeText,
        activeTextIndex: activeContext.activeTextIndex,
        blockText,
        highlightText: cleanDisplayText(text),
        focusTextIndex: activeContext.focusTextIndex,
        highlightSignature: `${cleanDisplayText(text).slice(0, 180)}|${activeText.slice(0, 220)}|${blockText.slice(0, 260)}`.slice(0, 900),
        source: "highlight"
      };
    }

    const paintedTextCandidates = Array.from(root.querySelectorAll("mark, span, strong, em, p, div"))
      .slice(0, 3000)
      .filter(isPaintedReaderHighlightElement)
      .sort((a, b) => scoreReaderHighlightCandidate(a) - scoreReaderHighlightCandidate(b));

    for (const el of paintedTextCandidates) {
      const text = cleanDisplayText(el.textContent || "");
      const block = getReaderContextBlockForElement(el, root);
      const blockText = cleanDisplayText(block.textContent || "");
      if (!blockText) continue;
      const activeContext = getReaderActiveContextForElement(block, el, text);
      const activeText = activeContext.activeText;
      return {
        activeText,
        activeTextIndex: activeContext.activeTextIndex,
        blockText,
        highlightText: text,
        focusTextIndex: activeContext.focusTextIndex,
        highlightSignature: `${text.slice(0, 180)}|${activeText.slice(0, 220)}|${blockText.slice(0, 260)}`.slice(0, 900),
        source: "highlight-painted"
      };
    }

    const svgMarkedBlocks = Array.from(
      root.querySelectorAll(
        [
          ".reader-api-block:has(svg path)",
          ".reader-api-block:has(svg rect)",
          ".reader-api-block:has(svg polygon)",
          ".reader-api-block:has(svg polyline)",
          ".reader-api-block:has(svg circle)",
          ".reader-api-block:has(svg ellipse)"
        ].join(",")
      )
    ).filter(isVisible);

    for (const block of svgMarkedBlocks) {
      const blockText = cleanDisplayText(block.textContent || "");
      if (!blockText) continue;
      const anchoredContext = getSvgAnchoredReaderContext(block);
      if (anchoredContext) return anchoredContext;

      const svgSignature = Array.from(
        block.querySelectorAll("svg path, svg rect, svg polygon, svg polyline, svg circle, svg ellipse")
      )
        .map((el) => {
          return [
            el.tagName,
            el.getAttribute("d"),
            el.getAttribute("points"),
            el.getAttribute("x"),
            el.getAttribute("y"),
            el.getAttribute("width"),
            el.getAttribute("height"),
            el.getAttribute("cx"),
            el.getAttribute("cy"),
            el.getAttribute("r"),
            el.getAttribute("style"),
            el.getAttribute("fill")
          ]
            .filter(Boolean)
            .join(":");
        })
        .join("|");
      return {
        activeText: blockText,
        blockText,
        highlightText: "",
        highlightSignature: `${blockText.slice(0, 180)}|${svgSignature}`.slice(0, 900),
        source: "highlight-svg"
      };
    }

    return null;
  };

  const trackHighlightedReaderContext = ({ context, isPlaying = false, tabAudible = false } = {}) => {
    const now = Date.now();
    if (!context) {
      readerHighlightState.checkedAt = now;
      return {
        context: null,
        highlightAvailable: false,
        highlightStale: false,
        highlightAgeMs: readerHighlightState.changedAt ? now - readerHighlightState.changedAt : null
      };
    }

    const signature = cleanDisplayText(
      context.highlightSignature || context.activeText || context.blockText || ""
    ).slice(0, 900);
    if (signature && signature !== readerHighlightState.signature) {
      readerHighlightState = {
        signature,
        changedAt: now,
        checkedAt: now,
        source: context.source,
        lastContext: context
      };
    } else {
      readerHighlightState = {
        ...readerHighlightState,
        checkedAt: now,
        source: context.source || readerHighlightState.source,
        lastContext: context
      };
    }

    const ageMs = readerHighlightState.changedAt ? now - readerHighlightState.changedAt : 0;
    const visibleLiveHighlight = Boolean(
      document.visibilityState === "visible" && String(context.source || "").startsWith("highlight")
    );
    return {
      context,
      highlightAvailable: true,
      highlightStale: Boolean(!visibleLiveHighlight && (isPlaying || tabAudible) && ageMs > 15000),
      highlightAgeMs: ageMs
    };
  };

  const inferLectureImageSection = (timing = {}) => {
    const highlightInfo = trackHighlightedReaderContext({
      context: getHighlightedReaderContext(),
      isPlaying: Boolean(timing.isPlaying),
      tabAudible: Boolean(timing.tabAudible)
    });

    if (highlightInfo.context && !highlightInfo.highlightStale) {
      const strictSection = buildStrictLiveImageSection(highlightInfo.context);
      if (strictSection) {
        rememberExplicitImageSection(strictSection);
        return strictSection;
      }

      const heldSection = getLastExplicitImageSection("strict-held-image");
      return heldSection
        ? {
            ...heldSection,
            highlightAvailable: true,
            highlightStale: false,
            source: "strict-held-image"
          }
        : null;
    }

    const heldSection = getLastExplicitImageSection("strict-held-image");
    return heldSection
      ? {
          ...heldSection,
          highlightAvailable: highlightInfo.highlightAvailable,
          highlightStale: highlightInfo.highlightStale,
          source: "strict-held-image"
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

  const getSpeechifyPlayerState = ({ tabAudible = false } = {}) => {
    const playButton = firstVisible(SPEECHIFY_SELECTORS.playerPlayButton);
    const progressBar = firstVisible(SPEECHIFY_SELECTORS.progressBar);
    const timeButton = firstVisible(SPEECHIFY_SELECTORS.progressTimeToggle);
    const durationButton = firstVisible(SPEECHIFY_SELECTORS.progressDurationToggle);
    const speedButton = firstVisible(SPEECHIFY_SELECTORS.playerSpeedButton);
    const voiceButton = firstVisible(SPEECHIFY_SELECTORS.playerVoiceButton);
    const titleButton = firstVisible(SPEECHIFY_SELECTORS.navFileActionButton);
    const media = getActiveMediaElement();
    const playLabel = cleanDisplayText(playButton?.getAttribute("aria-label") || "");
    const progress = parseFloat(progressBar?.getAttribute("aria-valuenow") || "");
    const mediaIsPlaying = Boolean(media && !media.paused && !media.ended);
    const isPlaying = Boolean(tabAudible) || mediaIsPlaying || /^pause\b/i.test(playLabel);
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

  const runSpeechifyPlayerRemote = async ({ action, speed, tabAudible }) => {
    const normalizedAction = String(action || "state");
    const stateOptions = { tabAudible: Boolean(tabAudible) };
    let state = null;

    if (normalizedAction === "playPause") {
      clickVisible(SPEECHIFY_SELECTORS.playerPlayButton, "play/pause");
      await sleep(220);
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
    setNativeValue(textArea, text);

    await waitUntil(() => {
      return textareaValueMatchesSource(textArea.value || "", text);
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
