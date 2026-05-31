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
    readerBlocks: '[data-reader-scroll-container="true"] .reader-api-block, .reader-api-block'
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
          "mark",
          ".reader-api-block span"
        ].join(",")
      )
    );

    for (const el of candidates) {
      if (!isVisible(el)) continue;
      const text = cleanDisplayText(el.innerText || el.textContent || "");
      if (!text) continue;

      const className = String(el.className || "").toLowerCase();
      const bg = getComputedStyle(el).backgroundColor;
      const explicit =
        el.matches?.('[aria-current="true"], [data-current="true"], [data-active="true"], mark') ||
        /(highlight|hglt|listening|current)/i.test(className);
      const painted = bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)";

      if (!explicit && !painted) continue;

      const block = el.closest(".reader-api-block") || el.closest("p") || el;
      const blockText = cleanDisplayText(block.innerText || block.textContent || "");
      return {
        activeText: getSentenceAroundText(blockText, text),
        blockText,
        source: "highlight"
      };
    }

    return null;
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
      blockText: cleanDisplayText(best.innerText || best.textContent || ""),
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

    if (!mentions.length) {
      let label = "";
      if (/\b(opening|orientation|big[- ]picture|organizing spine|before the images?)\b/i.test(lower)) {
        label = "intro";
      } else if (/\b(synthesis|synthesize|wrap[- ]?up|closeout|takeaway|after reviewing|final framework)\b/i.test(lower)) {
        label = "wrap-up";
      }
      return label
        ? {
            label,
            source: context.source,
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

    return label
      ? {
          label,
          group: groupLabel,
          image: imageLabel,
          source: context.source,
          activeText,
          textPreview: sourceText.slice(0, 220)
        }
      : null;
  };

  const inferTimelineLectureImageSection = ({ title, progress, elapsedSeconds, durationSeconds } = {}) => {
    const cachedText = getCachedLectureTextForTitle(title);
    const source = cleanDisplayText(cachedText);
    if (!source) return null;

    let fraction = null;
    const numericProgress = Number(progress);
    const numericElapsed = Number(elapsedSeconds);
    const numericDuration = Number(durationSeconds);

    if (Number.isFinite(numericProgress) && numericProgress > 0) {
      fraction = Math.max(0, Math.min(1, numericProgress / 100));
    } else if (
      Number.isFinite(numericElapsed) &&
      Number.isFinite(numericDuration) &&
      numericDuration > 0
    ) {
      fraction = Math.max(0, Math.min(1, numericElapsed / numericDuration));
    }

    if (!Number.isFinite(fraction)) return null;

    const index = Math.max(0, Math.min(source.length - 1, Math.round(source.length * fraction)));
    const mentions = extractImageMentions(source);

    if (!mentions.length) {
      if (fraction < 0.12) {
        return { label: "intro", source: "timeline", textPreview: source.slice(0, 220) };
      }
      if (fraction > 0.86) {
        return {
          label: "wrap-up",
          source: "timeline",
          textPreview: source.slice(Math.max(0, index - 110), index + 110)
        };
      }
      return null;
    }

    const priorMentions = mentions.filter((mention) => mention.index <= index);
    const currentMention = priorMentions.at(-1) || mentions[0];
    const recentPlural = priorMentions
      .filter((mention) => mention.plural && mention.numbers.length >= 2 && index - mention.index < 2200)
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

    return label
      ? {
          label,
          group: groupLabel,
          image: imageLabel,
          source: "timeline",
          textPreview: source.slice(Math.max(0, index - 110), index + 110)
        }
      : null;
  };

  const inferLectureImageSection = (timing = {}) => {
    const contextSection = inferContextLectureImageSection();
    if (contextSection?.source === "highlight") return contextSection;

    const timelineSection = inferTimelineLectureImageSection(timing);
    return timelineSection || contextSection;
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

  const getSyntheticClock = ({ elapsedText, durationText, progress, isPlaying, speedRate }) => {
    const now = Date.now();
    const rawElapsedSeconds = parseClockText(elapsedText);
    const rawDurationSeconds = parseClockText(durationText);
    const durationSeconds =
      Number.isFinite(rawDurationSeconds) && rawDurationSeconds > 0
        ? rawDurationSeconds
        : playerClockState.durationSeconds;
    const rawProgress = Number.isFinite(Number(progress)) ? Number(progress) : 0;
    let elapsedSeconds = Number.isFinite(rawElapsedSeconds)
      ? rawElapsedSeconds
      : playerClockState.elapsedSeconds;
    let source = "dom";

    if (
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

  const getSpeechifyPlayerState = () => {
    const playButton = firstVisible(SPEECHIFY_SELECTORS.playerPlayButton);
    const progressBar = firstVisible(SPEECHIFY_SELECTORS.progressBar);
    const timeButton = firstVisible(SPEECHIFY_SELECTORS.progressTimeToggle);
    const durationButton = firstVisible(SPEECHIFY_SELECTORS.progressDurationToggle);
    const speedButton = firstVisible(SPEECHIFY_SELECTORS.playerSpeedButton);
    const voiceButton = firstVisible(SPEECHIFY_SELECTORS.playerVoiceButton);
    const titleButton = firstVisible(SPEECHIFY_SELECTORS.navFileActionButton);
    const playLabel = cleanDisplayText(playButton?.getAttribute("aria-label") || "");
    const progress = parseFloat(progressBar?.getAttribute("aria-valuenow") || "");
    const isPlaying = /^pause\b/i.test(playLabel);
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
      speedRate: speedText
    });

    return {
      available: Boolean(playButton),
      isPlaying,
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
        durationSeconds: clock.durationSeconds
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

  const setSpeechifySpeed = async (targetSpeed) => {
    const wanted = normalizeSpeedLabel(targetSpeed);
    if (!wanted) throw new Error("No Speechify speed was requested.");

    const current = normalizeSpeedLabel(getSpeechifyPlayerState().speed);
    if (current === wanted) return getSpeechifyPlayerState();

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
    return getSpeechifyPlayerState();
  };

  const runSpeechifyPlayerRemote = async ({ action, speed }) => {
    const normalizedAction = String(action || "state");
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
      state = await setSpeechifySpeed(speed);
    } else if (normalizedAction !== "state" && normalizedAction !== "focus") {
      throw new Error(`Unsupported Speechify player action: ${normalizedAction}`);
    }

    state = state || getSpeechifyPlayerState();
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
      const value = textArea.value || "";
      if (!value.trim()) return false;
      const expectedStart = text.slice(0, 100).trim();
      return (
        value.length >= Math.min(text.length * 0.95, Math.max(1, text.length - 10)) &&
        (!expectedStart || value.includes(expectedStart.slice(0, 50))) &&
        (text.length < 500 || value.length > 500)
      );
    }, 15000, "Speechify textarea did not accept the full text.");

    await rememberSpeechifyLecture({ title: finalTitle, text });
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
