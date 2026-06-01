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
  const SPEECHIFY_LECTURE_CACHE_KEY = "radprimerSpeechifyLectureCache";

  let speechifyLectureCache = null;
  let playerClockState = {
    elapsedSeconds: null,
    durationSeconds: null,
    progress: 0,
    isPlaying: false,
    updatedAt: 0,
    rawElapsedSeconds: null
  };
  let readerFullTextCache = { text: "", updatedAt: 0 };
  let lectureSectionCache = { key: "", value: null, updatedAt: 0 };
  let lectureTimelineCalibration = {
    titleKey: "",
    textFraction: null,
    textIndex: null,
    anchorImageNumber: null,
    anchorSection: null,
    elapsedSeconds: null,
    durationSeconds: null,
    updatedAt: 0
  };
  let speechTimelineCache = {
    key: "",
    segments: [],
    totalWeight: 0
  };
  let readerHighlightState = {
    signature: "",
    changedAt: 0,
    checkedAt: 0,
    source: "",
    lastContext: null
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const resetReaderCalibration = ({ preserveTimeline = false } = {}) => {
    readerHighlightState = {
      signature: "",
      changedAt: 0,
      checkedAt: 0,
      source: "",
      lastContext: null
    };
    lectureSectionCache = { key: "", value: null, updatedAt: 0 };
    if (!preserveTimeline) {
      lectureTimelineCalibration = {
        titleKey: "",
        textFraction: null,
        textIndex: null,
        anchorImageNumber: null,
        anchorSection: null,
        elapsedSeconds: null,
        durationSeconds: null,
        updatedAt: 0
      };
    }
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

  const loadSpeechifyLectureCache = async () => {
    try {
      const stored = await chrome.storage.local.get(SPEECHIFY_LECTURE_CACHE_KEY);
      speechifyLectureCache = stored?.[SPEECHIFY_LECTURE_CACHE_KEY] || null;
    } catch {
      speechifyLectureCache = null;
    }
  };

  loadSpeechifyLectureCache();

  try {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      if (changes[SPEECHIFY_LECTURE_CACHE_KEY]) {
        speechifyLectureCache = changes[SPEECHIFY_LECTURE_CACHE_KEY].newValue || null;
      }
    });
  } catch {}

  const rememberSpeechifyLecture = async ({ title, text }) => {
    const finalTitle = cleanDisplayText(title || "");
    const finalText = String(text || "");
    if (!finalText.trim()) return;

    const entry = {
      title: finalTitle,
      normalizedTitle: normalize(finalTitle),
      text: finalText,
      savedAt: Date.now()
    };
    const previousByTitle = speechifyLectureCache?.byTitle || {};
    const byTitle = { ...previousByTitle, [entry.normalizedTitle || "__latest__"]: entry };
    const sortedKeys = Object.keys(byTitle).sort((a, b) => {
      return (byTitle[b]?.savedAt || 0) - (byTitle[a]?.savedAt || 0);
    });

    for (const key of sortedKeys.slice(5)) delete byTitle[key];

    const nextCache = { latest: entry, byTitle };
    speechifyLectureCache = nextCache;

    try {
      await chrome.storage.local.set({ [SPEECHIFY_LECTURE_CACHE_KEY]: nextCache });
    } catch (error) {
      console.warn("[RadPrimer Speechify] Could not cache lecture text for progress tracking.", error);
    }
  };

  const getCachedLectureTextForTitle = (title) => {
    const normalizedTitle = normalize(title);
    const byTitle = speechifyLectureCache?.byTitle || {};
    if (normalizedTitle && byTitle[normalizedTitle]?.text) return byTitle[normalizedTitle].text;

    const latest = speechifyLectureCache?.latest;
    if (!latest?.text) return "";

    const latestTitle = normalize(latest.title);
    const fuzzyTitleMatch =
      normalizedTitle &&
      latestTitle &&
      (latestTitle === normalizedTitle ||
        latestTitle.includes(normalizedTitle) ||
        normalizedTitle.includes(latestTitle));

    if (!normalizedTitle || fuzzyTitleMatch) {
      return latest.text;
    }

    return "";
  };

  const getReaderBlockEntries = () => {
    const scroller = firstVisible(SPEECHIFY_SELECTORS.readerScrollContainer);
    const scrollTop = scroller?.scrollTop || window.scrollY || 0;
    return Array.from(document.querySelectorAll(SPEECHIFY_SELECTORS.readerBlocks))
      .map((block) => {
        const text = cleanDisplayText(block.textContent || "");
        if (!text) return null;
        const positioned = block.closest?.('[style*="top:"]') || block.parentElement;
        const styleText = positioned?.getAttribute?.("style") || "";
        const topMatch = styleText.match(/\btop:\s*([0-9.]+)px/i);
        const top = topMatch
          ? Number.parseFloat(topMatch[1])
          : block.getBoundingClientRect().top + scrollTop;
        return {
          text,
          top: Number.isFinite(top) ? top : scrollTop
        };
      })
      .filter(Boolean);
  };

  const getReaderFullText = ({ force = false } = {}) => {
    const now = Date.now();
    if (!force && readerFullTextCache.text && now - readerFullTextCache.updatedAt < 15000) {
      return readerFullTextCache.text;
    }

    readerFullTextCache = { text: getReaderBlockEntries().map((entry) => entry.text).join("\n\n"), updatedAt: now };
    return readerFullTextCache.text;
  };

  const scrapeFullReaderText = async ({ timeoutMs = 25000 } = {}) => {
    const scroller = firstVisible(SPEECHIFY_SELECTORS.readerScrollContainer);
    if (!scroller) throw new Error("Speechify reader scroll container was not found.");

    const originalTop = scroller.scrollTop || 0;
    const start = Date.now();
    const entries = new Map();
    const rememberVisibleBlocks = () => {
      getReaderBlockEntries().forEach((entry) => {
        const key = `${Math.round(entry.top)}|${entry.text.slice(0, 160)}`;
        entries.set(key, entry);
      });
    };

    const scrollTo = async (top) => {
      scroller.scrollTop = Math.max(0, top);
      scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
      await sleep(120);
      rememberVisibleBlocks();
    };

    rememberVisibleBlocks();
    await scrollTo(0);

    let maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const step = Math.max(360, Math.floor((scroller.clientHeight || 800) * 0.72));
    let current = 0;

    while (current < maxScroll && Date.now() - start < timeoutMs) {
      current = Math.min(maxScroll, current + step);
      await scrollTo(current);
      maxScroll = Math.max(maxScroll, scroller.scrollHeight - scroller.clientHeight);
    }

    await scrollTo(maxScroll);
    await scrollTo(originalTop);

    const text = Array.from(entries.values())
      .sort((a, b) => a.top - b.top)
      .map((entry) => entry.text)
      .filter(Boolean)
      .join("\n\n");

    readerFullTextCache = { text, updatedAt: Date.now() };
    return text;
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
    const mentionRe = /\b(images?)\s+([^.?!;:]{1,160})/gi;
    let match;

    while ((match = mentionRe.exec(source)) !== null) {
      const numbers = expandRangeIfNeeded(parseImageNumbers(match[2]), match[2]);
      if (!numbers.length) continue;

      mentions.push({
        plural: /^images$/i.test(match[1]),
        numbers,
        index: match.index,
        text: cleanDisplayText(match[0])
      });
    }

    return mentions;
  };

  const getSectionMaxImageNumber = (section) => {
    if (Number.isFinite(Number(section?.imageNumber))) return Number(section.imageNumber);
    if (Array.isArray(section?.groupNumbers) && section.groupNumbers.length) {
      return Math.max(...section.groupNumbers.map(Number).filter(Number.isFinite));
    }
    const text = [section?.image, section?.group, section?.label].filter(Boolean).join(" ");
    const numbers = parseImageNumbers(text).map((item) => item.value).filter(Number.isFinite);
    return numbers.length ? Math.max(...numbers) : null;
  };

  const makeAnchorSectionSnapshot = (section) => {
    if (!section) return null;
    return {
      label: section.label || "",
      group: section.group || "",
      image: section.image || "",
      imageNumber: Number.isFinite(Number(section.imageNumber)) ? Number(section.imageNumber) : null,
      groupNumbers: Array.isArray(section.groupNumbers) ? section.groupNumbers : [],
      textFraction: Number.isFinite(Number(section.textFraction)) ? Number(section.textFraction) : null,
      textIndex: Number.isFinite(Number(section.textIndex)) ? Number(section.textIndex) : null,
      activeText: section.activeText || "",
      textPreview: section.textPreview || "",
      source: "sync-anchor"
    };
  };

  const findTextIndexLoose = (sourceText, targetText) => {
    const source = cleanDisplayText(sourceText);
    const target = cleanDisplayText(targetText);
    if (!source || !target || target.length < 4) return -1;

    const lowerSource = source.toLowerCase();
    const lowerTarget = target.toLowerCase();
    let index = lowerSource.indexOf(lowerTarget);
    if (index >= 0) return index;

    const chunks = [
      lowerTarget.slice(0, 220),
      lowerTarget.slice(0, 140),
      lowerTarget.slice(0, 90),
      lowerTarget.slice(Math.max(0, lowerTarget.length - 220)),
      lowerTarget.slice(Math.max(0, lowerTarget.length - 140))
    ]
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length >= 40);

    for (const chunk of chunks) {
      index = lowerSource.indexOf(chunk);
      if (index >= 0) return index;
    }

    return -1;
  };

  const hasCrossImageSynthesisCue = (text) => {
    return /\b(cross[- ]image synthesis|synthesize (?:across )?(?:the )?images|synthesis across images|now synthesize (?:the )?images|synthesize the images|step back and integrate|across (?:all )?(?:the )?(?:images|radiographs|cases))\b/i.test(
      text || ""
    );
  };

  const hasCloseoutCue = (text) => {
    return /\b(high[- ]yield closeout|highest[- ]yield closeout|final framework|final takeaways?|after reviewing|after this set|by the end|for first[- ]pass mastery)\b/i.test(
      text || ""
    );
  };

  const inferSpecialLectureSection = ({ source, boundedIndex, sourceName, activeText, textPreview, textFraction }) => {
    const cleanSource = cleanDisplayText(source);
    const lowerContext = cleanDisplayText(activeText || textPreview || "").toLowerCase();
    const contextPreview = textPreview || cleanSource.slice(Math.max(0, boundedIndex - 140), boundedIndex + 180);

    if (hasCrossImageSynthesisCue(lowerContext)) {
      return {
        label: "cross-image synthesis",
        source: sourceName,
        sectionType: "cross-image synthesis",
        textFraction,
        textIndex: boundedIndex,
        activeText,
        textPreview: contextPreview
      };
    }

    if (cleanSource) {
      const before = cleanSource.slice(0, Math.max(0, boundedIndex)).toLowerCase();
      const lastCross = Math.max(
        before.lastIndexOf("cross-image synthesis"),
        before.lastIndexOf("cross image synthesis"),
        before.lastIndexOf("now synthesize the images"),
        before.lastIndexOf("synthesize the images"),
        before.lastIndexOf("step back and integrate")
      );
      if (lastCross >= 0) {
        const lastCloseout = Math.max(
          before.lastIndexOf("high-yield closeout"),
          before.lastIndexOf("highest-yield closeout"),
          before.lastIndexOf("final framework"),
          before.lastIndexOf("final takeaway"),
          before.lastIndexOf("after reviewing"),
          before.lastIndexOf("for first-pass mastery")
        );
        if (lastCross > lastCloseout) {
          return {
            label: "cross-image synthesis",
            source: sourceName,
            sectionType: "cross-image synthesis",
            textFraction,
            textIndex: boundedIndex,
            activeText,
            textPreview: contextPreview
          };
        }
      }
    }

    return null;
  };

  const buildLectureImageSectionFromMentions = ({ source, focusIndex, sourceName, activeText, textPreview }) => {
    const cleanSource = cleanDisplayText(source);
    if (!cleanSource || !Number.isFinite(focusIndex) || focusIndex < 0) return null;

    const boundedIndex = Math.max(0, Math.min(cleanSource.length - 1, focusIndex));
    const textFraction = cleanSource.length > 1 ? boundedIndex / (cleanSource.length - 1) : 0;
    const mentions = extractImageMentions(cleanSource);
    const lowerContext = cleanDisplayText(activeText || textPreview || "").toLowerCase();
    const specialSection = inferSpecialLectureSection({
      source: cleanSource,
      boundedIndex,
      sourceName,
      activeText,
      textPreview,
      textFraction
    });
    if (specialSection) return specialSection;

    if (!mentions.length) {
      if (boundedIndex < cleanSource.length * 0.12 || /\b(opening|orientation|big[- ]picture|organizing spine|before the images?)\b/i.test(lowerContext)) {
        return {
          label: "intro",
          source: sourceName,
          textFraction,
          textIndex: boundedIndex,
          activeText,
          textPreview: textPreview || cleanSource.slice(0, 220)
        };
      }

      if (boundedIndex > cleanSource.length * 0.86 || hasCloseoutCue(lowerContext) || /\b(wrap[- ]?up|closeout)\b/i.test(lowerContext)) {
        return {
          label: "wrap-up",
          source: sourceName,
          textFraction,
          textIndex: boundedIndex,
          activeText,
          textPreview: textPreview || cleanSource.slice(Math.max(0, boundedIndex - 110), boundedIndex + 110)
        };
      }

      return null;
    }

    const priorMentions = mentions.filter((mention) => mention.index <= boundedIndex);
    const currentMention = priorMentions.at(-1) || mentions[0];
    const recentPlural = priorMentions
      .filter((mention) => mention.plural && mention.numbers.length >= 2 && boundedIndex - mention.index < 3000)
      .at(-1);
    const currentNumbers = uniqueSortedNumbers(currentMention?.numbers || []);
    const singularMentions = priorMentions.filter((mention) => !mention.plural || mention.numbers.length === 1);
    const lastSingular = singularMentions.at(-1);
    let currentImage = lastSingular?.numbers?.at(-1) || null;
    let groupNumbers =
      recentPlural?.numbers?.length >= 2
        ? recentPlural.numbers
        : currentMention?.plural && currentNumbers.length >= 2
          ? currentNumbers
          : [];

    if (currentImage && groupNumbers.length >= 2 && !groupNumbers.includes(currentImage)) {
      groupNumbers = [];
    }

    if (!currentImage && !groupNumbers.length && currentNumbers.length === 1) {
      currentImage = currentNumbers[0];
    }

    const groupLabel = groupNumbers.length >= 2 ? `group ${compactImageNumbers(groupNumbers)}` : "";
    const imageLabel = currentImage ? `image ${currentImage}` : "";
    const label = groupLabel && imageLabel ? `${groupLabel} / ${imageLabel}` : groupLabel || imageLabel;
    const targetImageNumber = currentImage || groupNumbers[0] || null;

    return label
      ? {
          label,
          group: groupLabel,
          image: imageLabel,
          imageNumber: targetImageNumber,
          groupNumbers,
          source: sourceName,
          textFraction,
          textIndex: boundedIndex,
          activeText,
          textPreview: textPreview || cleanSource.slice(Math.max(0, boundedIndex - 110), boundedIndex + 110)
        }
      : null;
  };

  const getSectionSourceText = (title, allowReaderFallback = true) => {
    return cleanDisplayText(getCachedLectureTextForTitle(title) || (allowReaderFallback ? getReaderFullText() : ""));
  };

  const clamp01 = (value) => Math.max(0, Math.min(1, value));

  const titleCalibrationKey = (title) => normalize(title || document.title.replace(/\s*\|\s*Speechify\s*$/i, ""));

  const getRawTimelineFraction = ({ progress, elapsedSeconds, durationSeconds } = {}) => {
    const numericProgress = Number(progress);
    const numericElapsed = Number(elapsedSeconds);
    const numericDuration = Number(durationSeconds);

    if (
      Number.isFinite(numericElapsed) &&
      Number.isFinite(numericDuration) &&
      numericDuration > 0
    ) {
      return clamp01(numericElapsed / numericDuration);
    }

    if (Number.isFinite(numericProgress) && numericProgress > 0) {
      return clamp01(numericProgress / 100);
    }

    return null;
  };

  const getAnchoredTimelineFraction = (timing = {}) => {
    const rawFraction = getRawTimelineFraction(timing);
    if (!Number.isFinite(rawFraction)) return null;

    const titleKey = titleCalibrationKey(timing.title);
    const calibration = lectureTimelineCalibration;
    if (
      !calibration?.titleKey ||
      calibration.titleKey !== titleKey ||
      !Number.isFinite(calibration.textFraction) ||
      !Number.isFinite(calibration.elapsedSeconds) ||
      !Number.isFinite(calibration.durationSeconds)
    ) {
      return rawFraction;
    }

    const elapsed = Number(timing.elapsedSeconds);
    const duration = Number(timing.durationSeconds) || calibration.durationSeconds;
    if (!Number.isFinite(elapsed) || !Number.isFinite(duration) || duration <= 0) return rawFraction;

    const anchorElapsed = Math.max(0, Math.min(duration, calibration.elapsedSeconds));
    const anchorFraction = clamp01(calibration.textFraction);
    if (elapsed >= anchorElapsed) {
      const remainingSeconds = Math.max(0.001, duration - anchorElapsed);
      return clamp01(anchorFraction + ((elapsed - anchorElapsed) / remainingSeconds) * (1 - anchorFraction));
    }

    if (anchorElapsed > 0) {
      return clamp01(anchorFraction * (elapsed / anchorElapsed));
    }

    return rawFraction;
  };

  const speechTimelineKey = (source) => {
    return `${source.length}|${source.slice(0, 90)}|${source.slice(-90)}`;
  };

  const estimateSpeechWeight = (text) => {
    const source = String(text || "");
    const words = source.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)?/g) || [];
    const numericTokens = source.match(/\b\d+(?:[.,]\d+)?\b/g) || [];
    const acronyms = source.match(/\b[A-Z]{2,}\b/g) || [];
    const commas = source.match(/[,;]/g) || [];
    const strongPauses = source.match(/[.!?:]/g) || [];
    const imageMentions = source.match(/\bimages?\s+\w+/gi) || [];

    return Math.max(
      0.5,
      words.length +
        numericTokens.length * 0.35 +
        acronyms.length * 0.18 +
        commas.length * 0.16 +
        strongPauses.length * 0.38 +
        imageMentions.length * 0.25
    );
  };

  const pushSpeechSegment = (segments, source, start, end) => {
    const boundedStart = Math.max(0, Math.min(source.length, start));
    const boundedEnd = Math.max(boundedStart, Math.min(source.length, end));
    const text = source.slice(boundedStart, boundedEnd).trim();
    if (!text) return;

    const segment = {
      start: boundedStart,
      end: boundedEnd,
      weight: estimateSpeechWeight(text),
      cumulativeStart: 0,
      cumulativeEnd: 0
    };
    segments.push(segment);
  };

  const splitSpeechSegment = (segments, source, start, end) => {
    let cursor = start;
    while (end - cursor > 360) {
      const windowEnd = Math.min(end, cursor + 310);
      const chunk = source.slice(cursor, windowEnd);
      const softBreak = Math.max(chunk.lastIndexOf(","), chunk.lastIndexOf(";"), chunk.lastIndexOf(" "));
      const cut = softBreak >= 160 ? cursor + softBreak + 1 : windowEnd;
      pushSpeechSegment(segments, source, cursor, cut);
      cursor = cut;
    }
    pushSpeechSegment(segments, source, cursor, end);
  };

  const getSpeechTimeline = (sourceText) => {
    const source = cleanDisplayText(sourceText);
    const key = speechTimelineKey(source);
    if (speechTimelineCache.key === key) return speechTimelineCache;

    const segments = [];
    const sentenceRe = /[^.!?]+[.!?]+|[^.!?]+$/g;
    let match;
    while ((match = sentenceRe.exec(source)) !== null) {
      splitSpeechSegment(segments, source, match.index, match.index + match[0].length);
    }
    if (!segments.length && source) pushSpeechSegment(segments, source, 0, source.length);

    let cumulative = 0;
    segments.forEach((segment) => {
      segment.cumulativeStart = cumulative;
      cumulative += segment.weight;
      segment.cumulativeEnd = cumulative;
    });

    speechTimelineCache = {
      key,
      segments,
      totalWeight: cumulative || 1
    };
    return speechTimelineCache;
  };

  const getTimelineWeightAtIndex = (timeline, index) => {
    const segments = timeline?.segments || [];
    if (!segments.length) return 0;

    const boundedIndex = Math.max(0, index);
    const segment =
      segments.find((candidate) => boundedIndex >= candidate.start && boundedIndex <= candidate.end) ||
      (boundedIndex < segments[0].start ? segments[0] : segments.at(-1));
    const span = Math.max(1, segment.end - segment.start);
    const localFraction = clamp01((boundedIndex - segment.start) / span);
    return segment.cumulativeStart + segment.weight * localFraction;
  };

  const getTimelineIndexAtWeight = (timeline, weight) => {
    const segments = timeline?.segments || [];
    if (!segments.length) return 0;

    const target = Math.max(0, Math.min(timeline.totalWeight || 1, weight));
    const segment =
      segments.find((candidate) => target >= candidate.cumulativeStart && target <= candidate.cumulativeEnd) ||
      segments.at(-1);
    const spanWeight = Math.max(0.001, segment.cumulativeEnd - segment.cumulativeStart);
    const localFraction = clamp01((target - segment.cumulativeStart) / spanWeight);
    return Math.round(segment.start + (segment.end - segment.start) * localFraction);
  };

  const getWeightedTimelineTextIndex = ({ source, title, progress, elapsedSeconds, durationSeconds } = {}) => {
    const timeline = getSpeechTimeline(source);
    const rawFraction = getRawTimelineFraction({ progress, elapsedSeconds, durationSeconds });
    if (!Number.isFinite(rawFraction)) return null;

    const duration = Number(durationSeconds);
    const elapsed = Number(elapsedSeconds);
    let targetWeight = rawFraction * timeline.totalWeight;
    const calibration = lectureTimelineCalibration;

    if (
      calibration?.titleKey &&
      calibration.titleKey === titleCalibrationKey(title) &&
      Number.isFinite(calibration.textIndex) &&
      Number.isFinite(calibration.elapsedSeconds) &&
      Number.isFinite(calibration.durationSeconds) &&
      Number.isFinite(duration) &&
      duration > 0 &&
      Number.isFinite(elapsed)
    ) {
      const anchorWeight = getTimelineWeightAtIndex(timeline, calibration.textIndex);
      const anchorElapsed = Math.max(0, Math.min(duration, calibration.elapsedSeconds));
      if (elapsed >= anchorElapsed) {
        const remainingSeconds = Math.max(0.001, duration - anchorElapsed);
        targetWeight =
          anchorWeight + ((elapsed - anchorElapsed) / remainingSeconds) * (timeline.totalWeight - anchorWeight);
      } else if (anchorElapsed > 0) {
        targetWeight = anchorWeight * (elapsed / anchorElapsed);
      }
    }

    return getTimelineIndexAtWeight(timeline, targetWeight);
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
    ).slice(0, 80);

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

      const block = el.closest(".reader-api-block") || el.closest("p") || el;
      const blockText = cleanDisplayText(block.textContent || "");
      return {
        activeText: getSentenceAroundText(blockText, text),
        blockText,
        highlightSignature: cleanDisplayText(text).slice(0, 700),
        source: "highlight"
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
    return {
      context,
      highlightAvailable: true,
      highlightStale: Boolean((isPlaying || tabAudible) && ageMs > 15000),
      highlightAgeMs: ageMs
    };
  };

  const getBestVisibleReaderContext = () => {
    const blocks = Array.from(document.querySelectorAll(SPEECHIFY_SELECTORS.readerBlocks))
      .filter(isVisible)
      .map((block) => {
        const rect = block.getBoundingClientRect();
        const visibleTop = Math.max(rect.top, 0);
        const visibleBottom = Math.min(rect.bottom, window.innerHeight);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const center = rect.top + rect.height / 2;
        const targetY = window.innerHeight * 0.46;
        return {
          block,
          rect,
          visibleHeight,
          score: Math.abs(center - targetY) - visibleHeight * 0.2
        };
      })
      .filter((item) => item.visibleHeight > 0);

    blocks.sort((a, b) => a.score - b.score);
    const best = blocks[0]?.block || null;
    if (!best) return null;

    return {
      activeText: "",
      blockText: cleanDisplayText(best.textContent || ""),
      source: "visible"
    };
  };

  const inferContextLectureImageSection = () => {
    const context = getHighlightedReaderContext() || getBestVisibleReaderContext();
    const activeText = context?.activeText || "";
    const blockText = context?.blockText || "";
    const sourceText = activeText || blockText;
    if (!sourceText) return null;

    const activeMentions = extractImageMentions(activeText);
    const blockMentions = extractImageMentions(blockText);
    const mentions = activeMentions.length ? activeMentions : blockMentions;
    const lower = sourceText.toLowerCase();

    if (hasCrossImageSynthesisCue(lower)) {
      return {
        label: "cross-image synthesis",
        source: context.source,
        sectionType: "cross-image synthesis",
        highlightAvailable: context.source?.startsWith("highlight") || false,
        activeText,
        textPreview: sourceText.slice(0, 220)
      };
    }

    if (!mentions.length) {
      let label = "";
      if (/\b(opening|orientation|big[- ]picture|organizing spine|before the images?)\b/i.test(lower)) {
        label = "intro";
      } else if (hasCloseoutCue(lower) || /\b(wrap[- ]?up|closeout)\b/i.test(lower)) {
        label = "wrap-up";
      }
      return label
        ? {
            label,
            source: context.source,
            highlightAvailable: context.source?.startsWith("highlight") || false,
            activeText,
            textPreview: sourceText.slice(0, 220)
          }
        : null;
    }

    const blockPluralMention = blockMentions.find((mention) => mention.plural && mention.numbers.length >= 2);
    const allNumbers = uniqueSortedNumbers(mentions.flatMap((mention) => mention.numbers));
    const blockNumbers = uniqueSortedNumbers(blockMentions.flatMap((mention) => mention.numbers));
    const groupNumbers =
      blockPluralMention?.numbers?.length >= 2
        ? blockPluralMention.numbers
        : activeMentions.length
          ? []
          : blockNumbers.length >= 2
            ? blockNumbers
            : [];
    const singularMentions = mentions.filter((mention) => !mention.plural || mention.numbers.length === 1);
    let currentImage = null;

    if (activeMentions.length) {
      const activeSingular = singularMentions.at(-1);
      currentImage = activeSingular?.numbers?.at(-1) || null;
    }

    if (!currentImage && !groupNumbers.length && allNumbers.length === 1) {
      currentImage = allNumbers[0];
    }

    const groupLabel = groupNumbers.length >= 2 ? `group ${compactImageNumbers(groupNumbers)}` : "";
    const imageLabel = currentImage ? `image ${currentImage}` : "";
    const label = groupLabel && imageLabel ? `${groupLabel} / ${imageLabel}` : groupLabel || imageLabel;
    const targetImageNumber = currentImage || groupNumbers[0] || null;

    return label
      ? {
          label,
          group: groupLabel,
          image: imageLabel,
          imageNumber: targetImageNumber,
          groupNumbers,
          source: context.source,
          highlightAvailable: context.source?.startsWith("highlight") || false,
          activeText,
          textPreview: sourceText.slice(0, 220)
        }
      : null;
  };

  const inferActiveTextLectureImageSection = ({ context, title, highlightAvailable, highlightStale, highlightAgeMs }) => {
    const activeText = cleanDisplayText(context?.activeText || "");
    const blockText = cleanDisplayText(context?.blockText || "");
    const cachedSourceText = cleanDisplayText(getCachedLectureTextForTitle(title));
    const sourceText = cachedSourceText || getReaderFullText();
    const sourceIsCachedScript = Boolean(cachedSourceText);
    const lookupText = activeText || blockText;
    let section = null;

    if (sourceText && lookupText) {
      let focusIndex = findTextIndexLoose(sourceText, lookupText);
      if (focusIndex >= 0) {
        focusIndex += Math.min(lookupText.length, 320);
        section = buildLectureImageSectionFromMentions({
          source: sourceText,
          focusIndex,
          sourceName: context.source || "highlight",
          activeText,
          textPreview: lookupText.slice(0, 240)
        });
        if (section) {
          section = {
            ...section,
            canCalibrateTimeline: sourceIsCachedScript,
            textIndexSource: sourceIsCachedScript ? "cached-script" : "reader-visible",
            textIndex: sourceIsCachedScript ? section.textIndex : null
          };
        }
      }
    }

    if (!section && blockText) {
      section = buildLectureImageSectionFromMentions({
        source: blockText,
        focusIndex: blockText.length - 1,
        sourceName: context.source || "highlight",
        activeText,
        textPreview: blockText.slice(0, 240)
      });
      if (section) {
        section = {
          ...section,
          canCalibrateTimeline: false,
          textIndexSource: "local",
          textIndex: null
        };
      }
    }

    return section
      ? {
          ...section,
          highlightAvailable,
          highlightStale,
          highlightAgeMs
        }
      : null;
  };

  const inferTimelineLectureImageSection = ({
    title,
    progress,
    elapsedSeconds,
    durationSeconds,
    clockSource,
    allowReaderFallback = false
  } = {}) => {
    const cachedText = getCachedLectureTextForTitle(title) || (allowReaderFallback ? getReaderFullText() : "");
    const source = cleanDisplayText(cachedText);
    if (!source) return null;

    const index = getWeightedTimelineTextIndex({
      source,
      title,
      progress,
      elapsedSeconds,
      durationSeconds
    });

    if (!Number.isFinite(index)) return null;

    const boundedIndex = Math.max(0, Math.min(source.length - 1, index));
    const fraction = source.length > 1 ? boundedIndex / (source.length - 1) : 0;
    const specialSection = inferSpecialLectureSection({
      source,
      boundedIndex,
      sourceName: "timeline",
      activeText: "",
      textPreview: source.slice(Math.max(0, boundedIndex - 140), boundedIndex + 180),
      textFraction: fraction
    });
    if (specialSection) {
      return {
        ...specialSection,
        estimated: true,
        clockSource
      };
    }
    const mentions = extractImageMentions(source);

    if (!mentions.length) {
      if (fraction < 0.12) {
        return {
          label: "intro",
          source: "timeline",
          estimated: true,
          clockSource,
          textFraction: fraction,
          textIndex: boundedIndex,
          textPreview: source.slice(0, 220)
        };
      }
      if (fraction > 0.86) {
        return {
          label: "wrap-up",
          source: "timeline",
          estimated: true,
          clockSource,
          textFraction: fraction,
          textIndex: boundedIndex,
          textPreview: source.slice(Math.max(0, boundedIndex - 110), boundedIndex + 110)
        };
      }
      return null;
    }

    const priorMentions = mentions.filter((mention) => mention.index <= boundedIndex);
    const currentMention = priorMentions.at(-1) || mentions[0];
    const recentPlural = priorMentions
      .filter((mention) => mention.plural && mention.numbers.length >= 2 && boundedIndex - mention.index < 2200)
      .at(-1);

    const currentNumbers = uniqueSortedNumbers(currentMention?.numbers || []);
    const currentImage =
      currentNumbers.length === 1
        ? currentNumbers[0]
        : !currentMention?.plural && currentNumbers.length
          ? currentNumbers.at(-1)
          : null;
    const groupNumbers =
      recentPlural?.numbers?.length >= 2
        ? recentPlural.numbers
        : currentMention?.plural && currentNumbers.length >= 2
          ? currentNumbers
          : [];
    const groupLabel = groupNumbers.length >= 2 ? `group ${compactImageNumbers(groupNumbers)}` : "";
    const imageLabel =
      currentImage && (!groupNumbers.length || groupNumbers.includes(currentImage))
        ? `image ${currentImage}`
        : "";
    const label = groupLabel && imageLabel ? `${groupLabel} / ${imageLabel}` : imageLabel || groupLabel;
    const targetImageNumber = currentImage || groupNumbers[0] || null;

    return label
      ? {
          label,
          group: groupLabel,
          image: imageLabel,
          imageNumber: targetImageNumber,
          groupNumbers,
          source: "timeline",
          estimated: true,
          clockSource,
          textFraction: fraction,
          textIndex: boundedIndex,
          textPreview: source.slice(Math.max(0, boundedIndex - 110), boundedIndex + 110)
        }
      : null;
  };

  const calibrateOwnedClockFromSection = (section, timing = {}) => {
    if (!section || section.highlightStale || section.estimated) return;
    if (section.canCalibrateTimeline === false || section.textIndexSource !== "cached-script") return;
    const fraction = Number(section.textFraction);
    const elapsed = Number(timing.elapsedSeconds);
    const duration = Number(timing.durationSeconds);
    const source = cleanDisplayText(getCachedLectureTextForTitle(timing.title));
    if (!source || source.length < 2) return;
    const textIndex = Number.isFinite(Number(section.textIndex))
      ? Number(section.textIndex)
      : source.length > 1
        ? Math.round(clamp01(fraction) * (source.length - 1))
        : null;
    if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) return;
    if (!Number.isFinite(elapsed) || elapsed < 0) return;
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (!Number.isFinite(textIndex)) return;

    lectureTimelineCalibration = {
      titleKey: titleCalibrationKey(timing.title),
      textFraction: clamp01(fraction),
      textIndex: Math.max(0, Math.min(Math.max(0, source.length - 1), textIndex)),
      anchorImageNumber: getSectionMaxImageNumber(section),
      anchorSection: makeAnchorSectionSnapshot(section),
      elapsedSeconds: Math.max(0, Math.min(duration, elapsed)),
      durationSeconds: duration,
      updatedAt: Date.now()
    };
  };

  const shouldPinToCalibrationAnchor = (section, timing = {}) => {
    const calibration = lectureTimelineCalibration;
    if (!section || !calibration?.anchorSection) return false;
    if (calibration.titleKey !== titleCalibrationKey(timing.title)) return false;

    const elapsed = Number(timing.elapsedSeconds);
    const anchorElapsed = Number(calibration.elapsedSeconds);
    if (!Number.isFinite(elapsed) || !Number.isFinite(anchorElapsed)) return false;
    if (elapsed < anchorElapsed - 4) return false;

    const anchorMax = Number(calibration.anchorImageNumber);
    if (!Number.isFinite(anchorMax)) return false;

    const sectionMax = Number(getSectionMaxImageNumber(section));
    return !Number.isFinite(sectionMax) || sectionMax < anchorMax;
  };

  const pinToCalibrationAnchor = (section, timing = {}) => {
    if (!shouldPinToCalibrationAnchor(section, timing)) return section;
    const anchor = lectureTimelineCalibration.anchorSection;
    return {
      ...section,
      ...anchor,
      source: "owned-clock-sync-anchor",
      estimated: true,
      calibratedEstimate: true,
      pinnedToSync: true,
      textPreview: section?.textPreview || anchor.textPreview || "",
      activeText: anchor.activeText || section?.activeText || ""
    };
  };

  const inferLectureImageSection = (timing = {}) => {
    const highlightInfo = trackHighlightedReaderContext({
      context: getHighlightedReaderContext(),
      isPlaying: Boolean(timing.isPlaying),
      tabAudible: Boolean(timing.tabAudible)
    });

    if (highlightInfo.context) {
      const highlightSection = inferActiveTextLectureImageSection({
        context: highlightInfo.context,
        title: timing.title,
        highlightAvailable: highlightInfo.highlightAvailable,
        highlightStale: highlightInfo.highlightStale,
        highlightAgeMs: highlightInfo.highlightAgeMs
      });

      if (highlightSection && !highlightInfo.highlightStale) {
        calibrateOwnedClockFromSection(highlightSection, timing);
        return highlightSection;
      }
    }

    const cacheKey = [
      normalize(timing.title || ""),
      document.visibilityState,
      timing.clockSource || "",
      Math.floor(Number(timing.elapsedSeconds || 0) / 4),
      Math.floor(Number(timing.progress || 0)),
      readerHighlightState.signature.slice(0, 48)
    ].join("|");
    const now = Date.now();
    if (lectureSectionCache.key === cacheKey && now - lectureSectionCache.updatedAt < 3500) {
      return lectureSectionCache.value;
    }

    let contextSection = highlightInfo.highlightStale ? null : inferContextLectureImageSection();
    if (contextSection) {
      contextSection = {
        ...contextSection,
        highlightAvailable: highlightInfo.highlightAvailable,
        highlightStale: highlightInfo.highlightStale,
        highlightAgeMs: highlightInfo.highlightAgeMs
      };
      lectureSectionCache = { key: cacheKey, value: contextSection, updatedAt: now };
      return contextSection;
    }

    const finalSection = pinToCalibrationAnchor(
      inferTimelineLectureImageSection({ ...timing, allowReaderFallback: true }),
      timing
    );
    const decoratedSection = finalSection
      ? {
          ...finalSection,
          source: finalSection.source === "owned-clock-sync-anchor" ? finalSection.source : "owned-clock",
          estimated: true,
          calibratedEstimate:
            Boolean(lectureTimelineCalibration.anchorSection) &&
            lectureTimelineCalibration.titleKey === titleCalibrationKey(timing.title) &&
            Number.isFinite(lectureTimelineCalibration.textFraction),
          highlightAvailable: highlightInfo.highlightAvailable,
          highlightStale: highlightInfo.highlightStale,
          highlightAgeMs: highlightInfo.highlightAgeMs
        }
      : null;

    lectureSectionCache = { key: cacheKey, value: decoratedSection, updatedAt: now };
    return decoratedSection;
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
    const previousCalibrationUpdatedAt = Number(lectureTimelineCalibration.updatedAt || 0);
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
    } else if (normalizedAction === "calibrate") {
      resetReaderCalibration({ preserveTimeline: true });
      await sleep(350);
    } else if (normalizedAction === "updateCache") {
      const currentState = getSpeechifyPlayerState(stateOptions);
      const context = getHighlightedReaderContext() || getBestVisibleReaderContext();
      const lookupText = cleanDisplayText(context?.activeText || context?.blockText || "");
      const readerText = await scrapeFullReaderText();
      if (!readerText.trim()) {
        throw new Error("Could not read the current Speechify text to update the cache.");
      }
      const verificationIndex = lookupText ? findTextIndexLoose(readerText, lookupText) : -1;
      if (lookupText && verificationIndex < 0) {
        throw new Error(
          "Cache scrape finished, but the current Speechify sentence was not found inside it. Try pausing Speechify, then press Cache again."
        );
      }
      await rememberSpeechifyLecture({
        title: currentState.title || document.title.replace(/\s*\|\s*Speechify\s*$/i, ""),
        text: readerText
      });
      resetReaderCalibration();
      state = {
        ...getSpeechifyPlayerState(stateOptions),
        cacheVerified: Boolean(lookupText && verificationIndex >= 0),
        cacheVerificationPreview: lookupText.slice(0, 180)
      };
    } else if (normalizedAction !== "state" && normalizedAction !== "focus") {
      throw new Error(`Unsupported Speechify player action: ${normalizedAction}`);
    }

    state = state || getSpeechifyPlayerState(stateOptions);
    if (!state.available) {
      throw new Error("No Speechify player is visible. Open a Speechify lecture/player tab first.");
    }
    if (normalizedAction === "calibrate") {
      const calibrationUpdated = Number(lectureTimelineCalibration.updatedAt || 0) > previousCalibrationUpdatedAt;
      const calibrationMatchesTitle =
        lectureTimelineCalibration.titleKey === titleCalibrationKey(state.title) &&
        Boolean(lectureTimelineCalibration.anchorSection);
      const syncLabel = state.lectureSection?.label || lectureTimelineCalibration.anchorSection?.label || "";
      const calibrated = Boolean(calibrationUpdated && calibrationMatchesTitle);
      const calibrationPreserved = Boolean(!calibrationUpdated && calibrationMatchesTitle);
      const syncStatus = calibrated ? "matched" : calibrationPreserved ? "preserved" : "failed";
      const syncMessage = calibrated
        ? `Sync locked: matched Speechify text to the script${syncLabel ? ` at ${syncLabel}` : ""}.`
        : calibrationPreserved
          ? `Sync checked: no new script match, keeping previous anchor${syncLabel ? ` at ${syncLabel}` : ""}.`
          : "Sync failed: highlighted Speechify text did not match the cached script.";
      return {
        ...state,
        calibrated,
        syncAttempted: true,
        calibrationPreserved,
        syncStatus,
        syncMessage
      };
    }
    if (normalizedAction === "updateCache") {
      const cacheText = getCachedLectureTextForTitle(state.title);
      const verifiedSuffix = state.cacheVerified ? " Verified current sentence." : "";
      return {
        ...state,
        cacheUpdated: true,
        cacheChars: cacheText.length,
        cacheMessage: `Cache updated from full Speechify reader scrape (${cacheText.length.toLocaleString()} characters).${verifiedSuffix} Press Sync to lock to the updated script.`
      };
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

    await rememberSpeechifyLecture({ title: finalTitle, text: normalizeTextareaText(textArea.value || text) });
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
