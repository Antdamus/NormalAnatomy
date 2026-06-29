(() => {
  if (window.__radiopaediaPacsViewerInstalled) return;
  window.__radiopaediaPacsViewerInstalled = true;

  const HOST_ID = "radiopaedia-pacs-viewer-host";
  const LAUNCHER_ID = "radiopaedia-pacs-viewer-launcher";
  const SHORTCUT_STORAGE_KEY = "radiopaediaPacsShortcutSettings";
  const CROSS_TAB_STORAGE_KEY = "radiopaediaPacsCrossTabStudies";
  const REFRESH_DELAY_MS = 120;
  const SYNC_DELAYS = [70, 180, 360, 700];
  const BRIDGE_REQUEST_EVENT = "radiopaedia-pacs-bridge-request";
  const BRIDGE_RESPONSE_EVENT = "radiopaedia-pacs-bridge-response";
  const BRIDGE_TIMEOUT_MS = 900;
  const MIN_DISPLAY_VALUE = 0.2;
  const MAX_DISPLAY_VALUE = 4;
  const PRELOAD_AHEAD = 18;
  const PRELOAD_BEHIND = 8;
  const PRELOAD_CONCURRENCY = 4;
  const MAX_PRELOADED_IMAGES = 160;
  const SLICE_SCRUB_PX = 26;
  const DEFAULT_SHORTCUTS = {
    close: "Escape",
    previousSeries: "ArrowLeft",
    nextSeries: "ArrowRight",
    previousSlice: "ArrowUp",
    nextSlice: "ArrowDown",
    zoomIn: "+",
    zoomOut: "-",
    resetView: "0",
    resetWindow: "w",
    invert: "i",
    sync: "r",
    toggleDefaultDrag: "d",
    panDrag: "Space",
    windowDrag: "Shift"
  };
  const SHORTCUT_ACTIONS = [
    ["close", "Close viewer"],
    ["previousSeries", "Previous series"],
    ["nextSeries", "Next series"],
    ["previousSlice", "Previous slice"],
    ["nextSlice", "Next slice"],
    ["zoomIn", "Zoom in"],
    ["zoomOut", "Zoom out"],
    ["resetView", "Reset zoom/pan"],
    ["resetWindow", "Reset window/level"],
    ["invert", "Invert display"],
    ["sync", "Sync viewport"],
    ["toggleDefaultDrag", "Toggle default drag"],
    ["panDrag", "Pan drag key"],
    ["windowDrag", "Window/level drag key"]
  ];

  const state = {
    open: false,
    series: [],
    activeKey: "",
    imageUrl: "",
    scale: 1,
    windowBrightness: 1,
    windowContrast: 1,
    inverted: false,
    x: 0,
    y: 0,
    dragging: false,
    windowing: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    windowOriginBrightness: 1,
    windowOriginContrast: 1,
    sliceScrubbing: false,
    scrubOriginSlice: null,
    scrubLastSlice: null,
    frameStacks: new Map(),
    bridgeSeries: [],
    bridgeSeq: 0,
    bridgeSetSeq: 0,
    bridgeRequests: new Map(),
    bridgeStatus: "pending",
    bridgeError: "",
    bridgeApiUrl: "",
    imageCache: new Map(),
    preloadQueue: [],
    activePreloads: 0,
    cacheGeneration: 0,
    shortcutSettings: { ...DEFAULT_SHORTCUTS },
    shortcutCaptureAction: "",
    pressedKeys: new Set(),
    defaultDragMode: "slice",
    imageFullscreen: false,
    compareMode: false,
    compareLayout: "side",
    compareLinked: false,
    activePane: "a",
    comparePanes: {
      a: { key: "", imageUrl: "", sliceNumber: null, anchorSlice: null },
      b: { key: "", imageUrl: "", sliceNumber: null, anchorSlice: null }
    },
    compareTransforms: {
      a: { scale: 1, x: 0, y: 0, rotation: 0 },
      b: { scale: 1, x: 0, y: 0, rotation: 0 }
    },
    externalSeries: [],
    crossTabStudies: { a: null, b: null },
    suppressOwnKeyCapture: false,
    lastScrollAt: 0,
    refreshTimer: 0
  };

  function isRadiopaediaCasePage() {
    return /(^|\.)radiopaedia\.org$/i.test(location.hostname) && /\/cases\//i.test(location.pathname);
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      !el.closest(".hidden")
    );
  }

  function absoluteUrl(raw) {
    if (!raw) return "";
    try {
      return new URL(raw, location.href).href;
    } catch {
      return String(raw || "");
    }
  }

  function normalizeUrl(raw) {
    const url = absoluteUrl(raw);
    if (!url) return "";
    return url.replace(/\?.*$/, "");
  }

  function getImageUrl(img) {
    return normalizeUrl(img?.currentSrc || img?.src || img?.getAttribute?.("src") || "");
  }

  function normalizeShortcutKey(value) {
    const raw = String(value || "");
    if (raw === " " || raw.toLowerCase() === "spacebar") return "Space";
    if (/^esc$/i.test(raw)) return "Escape";
    if (/^ctrl$/i.test(raw)) return "Control";
    if (/^cmd$/i.test(raw)) return "Meta";
    if (raw.length === 1) return raw.toLowerCase();
    return raw;
  }

  function displayShortcutKey(value) {
    const key = normalizeShortcutKey(value);
    if (!key) return "Unassigned";
    if (key === "Space") return "Space";
    if (key === "Control") return "Ctrl";
    if (key === "Meta") return "Meta";
    if (key === "ArrowLeft") return "Left arrow";
    if (key === "ArrowRight") return "Right arrow";
    if (key === "ArrowUp") return "Up arrow";
    if (key === "ArrowDown") return "Down arrow";
    if (key.length === 1) return key.toUpperCase();
    return key;
  }

  function isEditableTarget(target) {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      Boolean(target?.isContentEditable)
    );
  }

  function getShortcutPanel() {
    return document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".shortcut-panel") || null;
  }

  function renderShortcutPanel() {
    const host = document.getElementById(HOST_ID);
    if (!host?.shadowRoot) return;
    const list = host.shadowRoot.querySelector(".shortcut-list");
    if (!list) return;

    list.innerHTML = "";
    SHORTCUT_ACTIONS.forEach(([id, label]) => {
      const row = document.createElement("div");
      row.className = "shortcut-row";
      const labelEl = document.createElement("span");
      labelEl.textContent = label;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "shortcut-key";
      button.dataset.shortcutAction = id;
      button.textContent =
        state.shortcutCaptureAction === id
          ? "Press key..."
          : displayShortcutKey(state.shortcutSettings[id]);
      button.classList.toggle("listening", state.shortcutCaptureAction === id);
      row.append(labelEl, button);
      list.appendChild(row);
    });
  }

  async function loadShortcutSettings() {
    try {
      const stored = await chrome.storage.local.get(SHORTCUT_STORAGE_KEY);
      state.shortcutSettings = {
        ...DEFAULT_SHORTCUTS,
        ...(stored?.[SHORTCUT_STORAGE_KEY] || {})
      };
    } catch {
      state.shortcutSettings = { ...DEFAULT_SHORTCUTS };
    }
    renderShortcutPanel();
  }

  async function saveShortcutSettings() {
    try {
      await chrome.storage.local.set({ [SHORTCUT_STORAGE_KEY]: state.shortcutSettings });
    } catch {}
  }

  async function resetShortcutSettings() {
    state.shortcutSettings = { ...DEFAULT_SHORTCUTS };
    state.shortcutCaptureAction = "";
    await saveShortcutSettings();
    renderShortcutPanel();
  }

  function toggleShortcutPanel() {
    const panel = getShortcutPanel();
    if (!panel) return;
    panel.hidden = !panel.hidden;
    state.shortcutCaptureAction = "";
    renderShortcutPanel();
  }

  function startShortcutCapture(actionId) {
    if (!SHORTCUT_ACTIONS.some(([id]) => id === actionId)) return;
    state.shortcutCaptureAction = actionId;
    const panel = getShortcutPanel();
    if (panel) panel.hidden = false;
    renderShortcutPanel();
  }

  async function assignShortcutFromEvent(event) {
    if (!state.shortcutCaptureAction) return false;
    event.preventDefault();
    event.stopPropagation();

    const key = normalizeShortcutKey(event.key);
    if (key === "Escape") {
      state.shortcutCaptureAction = "";
      renderShortcutPanel();
      return true;
    }

    state.shortcutSettings = {
      ...state.shortcutSettings,
      [state.shortcutCaptureAction]: key === "Backspace" || key === "Delete" ? "" : key
    };
    state.shortcutCaptureAction = "";
    await saveShortcutSettings();
    renderShortcutPanel();
    return true;
  }

  function shortcutMatches(event, actionId) {
    const saved = normalizeShortcutKey(state.shortcutSettings[actionId]);
    const pressed = normalizeShortcutKey(event.key);
    if (!saved || !pressed) return false;
    if (saved === pressed) return true;
    return actionId === "zoomIn" && saved === "+" && pressed === "=";
  }

  function shortcutHeld(event, actionId) {
    const saved = normalizeShortcutKey(state.shortcutSettings[actionId]);
    if (!saved) return false;
    if (saved === "Shift") return Boolean(event?.shiftKey) || state.pressedKeys.has(saved);
    if (saved === "Control") return Boolean(event?.ctrlKey) || state.pressedKeys.has(saved);
    if (saved === "Alt") return Boolean(event?.altKey) || state.pressedKeys.has(saved);
    if (saved === "Meta") return Boolean(event?.metaKey) || state.pressedKeys.has(saved);
    return state.pressedKeys.has(saved);
  }

  function parseImagePath(url) {
    const text = String(url || "");
    const match = text.match(/\/images\/(\d+)\/([^/?#]+?)(?:_(big_gallery|medium|thumb|large))?\.jpe?g/i);
    const filename = match?.[2] || "";
    const imageId = match?.[1] || "";
    const sequenceMatch = filename.match(/IMG-(\d+)-(\d+)/i);
    return {
      imageId,
      filename,
      sequenceNumber: sequenceMatch ? parseInt(sequenceMatch[1], 10) : null,
      sliceNumber: sequenceMatch ? parseInt(sequenceMatch[2], 10) : null
    };
  }

  function getModalityLabel() {
    const candidates = Array.from(document.querySelectorAll("span, div"))
      .map((el) => String(el.textContent || "").trim())
      .filter((text) => /^(CT|MRI|MR|US|Ultrasound|X-ray|XR|PET|NM|MRA|CTA)$/i.test(text));
    return candidates[0] || "Radiopaedia";
  }

  function getViewportLabel(container) {
    const slot = container.closest("[data-slot]")?.getAttribute("data-slot");
    if (slot !== null && slot !== undefined && slot !== "") {
      const number = parseInt(slot, 10);
      return Number.isFinite(number) ? `Viewport ${number + 1}` : `Viewport ${slot}`;
    }

    const hook = container.closest("[data-js-hook]")?.getAttribute("data-js-hook") || "";
    const match = hook.match(/viewport-(\d+)/i);
    if (match) return `Viewport ${parseInt(match[1], 10) + 1}`;
    return "";
  }

  function getScrollbarInfo(container) {
    const bar = container.querySelector('[data-test-hook="scrollbar"]');
    const rawPosition = parseInt(bar?.getAttribute("data-test-scroll-position") || "", 10);
    const chunkNumbers = Array.from(container.querySelectorAll("[data-idx]"))
      .map((el) => parseInt(el.getAttribute("data-idx") || "", 10))
      .filter((value) => Number.isFinite(value));
    const total = chunkNumbers.length ? Math.max(...chunkNumbers) + 1 : null;
    return {
      rawPosition: Number.isFinite(rawPosition) ? rawPosition : null,
      total
    };
  }

  function getFrameStack(key) {
    if (!key) return null;
    let stack = state.frameStacks.get(key);
    if (!stack) {
      stack = {
        frames: new Map(),
        currentSlice: null,
        totalSlices: null,
        label: "",
        modality: "",
        sequenceNumber: null,
        seriesNumberLabel: "",
        seriesId: ""
      };
      state.frameStacks.set(key, stack);
    }
    return stack;
  }

  function makeFrameSnapshot(info) {
    return {
      key: info.key,
      seriesId: info.seriesId,
      order: info.order,
      viewport: info.viewport,
      visible: info.visible,
      imageUrl: info.imageUrl,
      imageId: info.imageId,
      filename: info.filename,
      sequenceNumber: info.sequenceNumber,
      sliceNumber: info.sliceNumber,
      totalSlices: info.totalSlices,
      label: info.label,
      seriesNumberLabel: info.seriesNumberLabel,
      modality: info.modality
    };
  }

  function rememberFrame(info) {
    if (!info?.key || !info.imageUrl) return info;
    const stack = getFrameStack(info.key);
    if (!stack) return info;

    stack.label = info.label || stack.label;
    stack.modality = info.modality || stack.modality;
    stack.sequenceNumber = Number.isFinite(info.sequenceNumber) ? info.sequenceNumber : stack.sequenceNumber;
    stack.seriesNumberLabel = info.seriesNumberLabel || stack.seriesNumberLabel;
    stack.seriesId = info.seriesId || stack.seriesId;
    if (Number.isFinite(info.totalSlices)) stack.totalSlices = info.totalSlices;
    if (Number.isFinite(info.sliceNumber)) {
      stack.currentSlice = info.sliceNumber;
      stack.frames.set(info.sliceNumber, makeFrameSnapshot(info));
    }

    info.knownFrames = stack.frames.size;
    info.totalSlices = info.totalSlices || stack.totalSlices;
    return info;
  }

  function getStackProgress(info) {
    const stack = getFrameStack(info?.key);
    if (!stack) return "";
    const known = stack.frames.size;
    const total = info?.totalSlices || stack.totalSlices;
    if (known && total) return `${known}/${total} loaded`;
    if (known > 1) return `${known} loaded`;
    return "";
  }

  function getCachedImageCount(info) {
    if (!info?.key) return 0;
    let count = 0;
    state.imageCache.forEach((entry) => {
      if (entry.seriesKey === info.key && entry.status === "loaded") count += 1;
    });
    return count;
  }

  function makeBridgeFrameInfo(seriesInfo, frame) {
    const parsed = parseImagePath(frame?.imageUrl || "");
    return {
      key: seriesInfo.key,
      seriesId: seriesInfo.seriesId,
      order: seriesInfo.order,
      viewport: seriesInfo.viewport,
      visible: seriesInfo.visible,
      imageUrl: frame?.imageUrl || "",
      imageId: frame?.imageId || parsed.imageId || String(frame?.id || ""),
      filename: parsed.filename,
      sequenceNumber: seriesInfo.sequenceNumber,
      sliceNumber: frame?.sliceNumber || (Number.isFinite(frame?.frameIdx) ? frame.frameIdx + 1 : null),
      totalSlices: seriesInfo.totalSlices,
      label: seriesInfo.label,
      seriesNumberLabel: seriesInfo.seriesNumberLabel,
      modality: seriesInfo.modality,
      bridgeFrameIndex: frame?.frameIdx,
      bridgeAvailable: true
    };
  }

  function applyBridgeState(bridgeState) {
    if (!bridgeState?.series?.length) return false;

    const series = bridgeState.series.map((raw, index) => {
      const key = String(raw.key || raw.seriesId || index);
      const frameIdx = Number.isFinite(raw.frameIdx) ? raw.frameIdx : 0;
      const frames = Array.isArray(raw.frames) ? raw.frames : [];
      const frame = frames[frameIdx] || frames[0];
      const seriesInfo = {
        key,
        seriesId: String(raw.seriesId || key),
        order: Number.isFinite(raw.order) ? raw.order : index,
        viewport: raw.viewport || "",
        visible: Boolean(raw.visible),
        imageUrl: frame?.imageUrl || "",
        imageId: String(frame?.id || frame?.imageId || ""),
        filename: parseImagePath(frame?.imageUrl || "").filename,
        sequenceNumber: Number.isFinite(raw.sequenceNumber) ? raw.sequenceNumber : index + 1,
        sliceNumber: frameIdx + 1,
        totalSlices: Number.isFinite(raw.totalSlices) ? raw.totalSlices : frames.length,
        label: raw.label || `Series ${Number.isFinite(raw.sequenceNumber) ? raw.sequenceNumber : index + 1}`,
        seriesNumberLabel: raw.seriesNumberLabel || `Series ${Number.isFinite(raw.sequenceNumber) ? raw.sequenceNumber : index + 1}`,
        modality: raw.modality || bridgeState.modality || getModalityLabel(),
        bridgeFrameIndex: frameIdx,
        bridgeAvailable: true
      };

      const stack = getFrameStack(key);
      if (stack) {
        stack.frames = new Map();
        stack.currentSlice = frameIdx + 1;
        stack.totalSlices = seriesInfo.totalSlices;
        stack.label = seriesInfo.label;
        stack.modality = seriesInfo.modality;
        stack.sequenceNumber = seriesInfo.sequenceNumber;
        stack.seriesNumberLabel = seriesInfo.seriesNumberLabel;
        stack.seriesId = seriesInfo.seriesId;
        frames.forEach((item, frameIndex) => {
          const snapshot = makeBridgeFrameInfo(seriesInfo, {
            ...item,
            frameIdx: Number.isFinite(item.frameIdx) ? item.frameIdx : frameIndex,
            sliceNumber: Number.isFinite(item.sliceNumber) ? item.sliceNumber : frameIndex + 1
          });
          if (snapshot.imageUrl) stack.frames.set(snapshot.sliceNumber, snapshot);
        });
      }

      return rememberFrame(seriesInfo);
    }).filter((item) => item.imageUrl);

    if (!series.length) return false;
    state.bridgeSeries = series;
    state.series = series;
    if (!state.activeKey || !series.some((item) => item.key === state.activeKey)) {
      const visible = series.find((item) => item.visible);
      state.activeKey = (visible || series[0]).key;
    }
    return true;
  }

  function chooseSeriesImage(container) {
    const images = Array.from(container.querySelectorAll("img[src]"))
      .filter((img) => /radiopaedia\.org\/images\//i.test(getImageUrl(img)));
    if (!images.length) return null;
    const visible = images.find(isVisible);
    return visible || images[0];
  }

  function getSeriesInfo(container, order) {
    const image = chooseSeriesImage(container);
    const imageUrl = getImageUrl(image);
    if (!imageUrl) return null;

    const seriesId = container.getAttribute("data-series-id") || "";
    const parsed = parseImagePath(imageUrl);
    const scrollbar = getScrollbarInfo(container);
    const currentSlice =
      Number.isFinite(parsed.sliceNumber)
        ? parsed.sliceNumber
        : scrollbar.rawPosition !== null
          ? scrollbar.rawPosition + 1
          : null;
    const visible = isVisible(container);
    const viewport = getViewportLabel(container);
    const sequenceNumber = Number.isFinite(parsed.sequenceNumber) ? parsed.sequenceNumber : order + 1;
    const key = seriesId || parsed.imageId || imageUrl;

    return {
      key,
      seriesId,
      order,
      viewport,
      visible,
      container,
      image,
      imageUrl,
      imageId: parsed.imageId,
      filename: parsed.filename,
      sequenceNumber,
      sliceNumber: currentSlice,
      totalSlices: scrollbar.total,
      label: `Series ${sequenceNumber}`,
      modality: getModalityLabel()
    };
  }

  function collectSeries() {
    const containers = Array.from(document.querySelectorAll("[data-series-id]"));
    const byKey = new Map();
    containers.forEach((container, index) => {
      const info = rememberFrame(getSeriesInfo(container, index));
      if (!info) return;
      const previous = byKey.get(info.key);
      if (!previous || (!previous.visible && info.visible)) {
        byKey.set(info.key, info);
      }
    });

    const domSeries = Array.from(byKey.values()).sort((a, b) => a.order - b.order);
    if (state.bridgeSeries.length) {
      const series = state.bridgeSeries.map((bridgeInfo) => {
        const domInfo = domSeries.find((item) =>
          item.key === bridgeInfo.key ||
          String(item.seriesId) === String(bridgeInfo.seriesId)
        );
        if (!domInfo) return bridgeInfo;
        return rememberFrame({
          ...bridgeInfo,
          container: domInfo.container,
          image: domInfo.image,
          viewport: domInfo.viewport || bridgeInfo.viewport,
          visible: domInfo.visible
        });
      });
      const combined = [...series, ...state.externalSeries];
      state.series = combined;
      return combined;
    }

    const series = [...domSeries, ...state.externalSeries];
    state.series = series;
    return series;
  }

  function getActiveSeries() {
    return state.series.find((item) => item.key === state.activeKey) || null;
  }

  function chooseInitialSeries() {
    const series = collectSeries();
    if (!series.length) return null;
    return series.find((item) => item.visible) || series[0];
  }

  function sliceText(info) {
    if (!info) return "";
    if (info.sliceNumber && info.totalSlices) return `Slice ${info.sliceNumber}/${info.totalSlices}`;
    if (info.sliceNumber) return `Slice ${info.sliceNumber}`;
    return "Slice --";
  }

  function statusText(info) {
    if (!info) return "No Radiopaedia series detected.";
    const seriesNumber = info.seriesNumberLabel && info.seriesNumberLabel !== info.label
      ? info.seriesNumberLabel
      : "";
    const pieces = [info.modality, seriesNumber, sliceText(info)];
    const progress = getStackProgress(info);
    if (progress) pieces.push(progress);
    const cachedImages = getCachedImageCount(info);
    if (cachedImages) pieces.push(`${cachedImages} cached`);
    if (info.viewport) pieces.push(info.viewport);
    if (!info.visible) pieces.push("snapshot");
    return pieces.filter(Boolean).join(" | ");
  }

  function compactFrame(frame) {
    return {
      key: frame.key,
      seriesId: frame.seriesId,
      order: frame.order,
      viewport: frame.viewport,
      visible: frame.visible,
      imageUrl: frame.imageUrl,
      imageId: frame.imageId,
      filename: frame.filename,
      sequenceNumber: frame.sequenceNumber,
      sliceNumber: frame.sliceNumber,
      totalSlices: frame.totalSlices,
      label: frame.label,
      seriesNumberLabel: frame.seriesNumberLabel,
      modality: frame.modality
    };
  }

  function serializeSeriesForCrossTab(info) {
    const stack = getFrameStack(info.key);
    const frames = Array.from(stack?.frames?.values?.() || [])
      .filter((frame) => frame?.imageUrl)
      .sort((a, b) => (a.sliceNumber || 0) - (b.sliceNumber || 0))
      .map(compactFrame);
    if (!frames.length && info.imageUrl) frames.push(compactFrame(info));

    return {
      key: String(info.key || info.seriesId || info.imageUrl),
      seriesId: info.seriesId,
      order: info.order,
      label: info.label,
      seriesNumberLabel: info.seriesNumberLabel,
      modality: info.modality,
      sequenceNumber: info.sequenceNumber,
      sliceNumber: info.sliceNumber,
      totalSlices: info.totalSlices || stack?.totalSlices || frames.length,
      imageUrl: info.imageUrl,
      frames
    };
  }

  function buildCrossTabStudy() {
    const series = collectSeries()
      .filter((info) => !info.external && info.imageUrl)
      .map(serializeSeriesForCrossTab)
      .filter((info) => info.frames.length);
    if (!series.length) return null;

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: String(document.title || "Radiopaedia study").replace(/\s+/g, " ").trim(),
      url: location.href,
      savedAt: Date.now(),
      modality: series.find((info) => info.modality)?.modality || getModalityLabel(),
      series
    };
  }

  function shortStudyTitle(study) {
    const title = String(study?.title || "").replace(/\s+/g, " ").trim();
    return title ? title.slice(0, 70) : "Saved study";
  }

  function updateCrossTabButtons() {
    const host = document.getElementById(HOST_ID);
    const shadow = host?.shadowRoot;
    if (!shadow) return;
    ["a", "b"].forEach((slot) => {
      const study = state.crossTabStudies[slot];
      const button = shadow.querySelector(`.load-${slot}`);
      if (button) {
        button.disabled = !study;
        button.title = study
          ? `Load ${shortStudyTitle(study)} into pane ${slot.toUpperCase()}`
          : `No saved study in slot ${slot.toUpperCase()}`;
      }
    });
  }

  async function loadCrossTabStudies() {
    try {
      const stored = await chrome.storage.local.get(CROSS_TAB_STORAGE_KEY);
      state.crossTabStudies = {
        a: stored?.[CROSS_TAB_STORAGE_KEY]?.a || null,
        b: stored?.[CROSS_TAB_STORAGE_KEY]?.b || null
      };
    } catch {
      state.crossTabStudies = { a: null, b: null };
    }
    updateCrossTabButtons();
  }

  async function saveCurrentStudyToSlot(slot) {
    try {
      await refreshFromBridge({ preferVisible: true, resetView: false });
    } catch {}
    const study = buildCrossTabStudy();
    if (!study) {
      const host = ensureHost();
      const subtitle = host.shadowRoot?.querySelector(".subtitle");
      if (subtitle) subtitle.textContent = "No loaded Radiopaedia frames available to save.";
      return false;
    }

    state.crossTabStudies = {
      ...state.crossTabStudies,
      [slot]: study
    };
    try {
      await chrome.storage.local.set({ [CROSS_TAB_STORAGE_KEY]: state.crossTabStudies });
    } catch {
      const host = ensureHost();
      const subtitle = host.shadowRoot?.querySelector(".subtitle");
      if (subtitle) subtitle.textContent = "Could not save this study; the stored stack may be too large.";
      return false;
    }

    updateCrossTabButtons();
    const host = ensureHost();
    const subtitle = host.shadowRoot?.querySelector(".subtitle");
    if (subtitle) subtitle.textContent = `Saved ${study.series.length} series to slot ${slot.toUpperCase()}.`;
    return true;
  }

  function removeExternalSlot(slot) {
    const prefix = `external:${slot}:`;
    state.externalSeries = state.externalSeries.filter((info) => !String(info.key).startsWith(prefix));
    state.series = state.series.filter((info) => !String(info.key).startsWith(prefix));
    Array.from(state.frameStacks.keys()).forEach((key) => {
      if (String(key).startsWith(prefix)) state.frameStacks.delete(key);
    });
  }

  function importCrossTabStudy(slot, study) {
    if (!study?.series?.length) return [];
    removeExternalSlot(slot);
    const imported = [];
    study.series.forEach((seriesInfo, index) => {
      const externalKey = `external:${slot}:${study.id}:${seriesInfo.key || index}`;
      const frames = (seriesInfo.frames || [])
        .filter((frame) => frame?.imageUrl)
        .map((frame, frameIndex) => ({
          ...frame,
          key: externalKey,
          seriesId: externalKey,
          order: index,
          label: `${slot.toUpperCase()} ${seriesInfo.label || frame.label || `Series ${index + 1}`}`,
          seriesNumberLabel: seriesInfo.seriesNumberLabel || frame.seriesNumberLabel || `Series ${index + 1}`,
          modality: seriesInfo.modality || frame.modality || study.modality || "Radiopaedia",
          sliceNumber: Number.isFinite(frame.sliceNumber) ? frame.sliceNumber : frameIndex + 1,
          totalSlices: seriesInfo.totalSlices || seriesInfo.frames.length
        }));
      if (!frames.length) return;

      const firstFrame = frames.find((frame) => frame.sliceNumber === seriesInfo.sliceNumber) || frames[0];
      const stack = getFrameStack(externalKey);
      stack.frames = new Map();
      stack.currentSlice = firstFrame.sliceNumber || 1;
      stack.totalSlices = seriesInfo.totalSlices || frames.length;
      stack.label = firstFrame.label;
      stack.modality = firstFrame.modality;
      stack.sequenceNumber = seriesInfo.sequenceNumber || firstFrame.sequenceNumber || index + 1;
      stack.seriesNumberLabel = firstFrame.seriesNumberLabel;
      stack.seriesId = externalKey;
      frames.forEach((frame) => stack.frames.set(frame.sliceNumber, compactFrame(frame)));

      imported.push({
        ...firstFrame,
        key: externalKey,
        seriesId: externalKey,
        external: true,
        sourceSlot: slot,
        sourceTitle: study.title,
        sourceUrl: study.url,
        totalSlices: stack.totalSlices,
        imageUrl: firstFrame.imageUrl
      });
    });

    state.externalSeries.push(...imported);
    state.series = [
      ...state.series.filter((info) => !String(info.key).startsWith(`external:${slot}:`)),
      ...imported
    ];
    return imported;
  }

  async function loadCrossTabStudyToPane(slot) {
    await loadCrossTabStudies();
    const study = state.crossTabStudies[slot];
    const imported = importCrossTabStudy(slot, study);
    if (!imported.length) {
      const host = ensureHost();
      const subtitle = host.shadowRoot?.querySelector(".subtitle");
      if (subtitle) subtitle.textContent = `No saved study found in slot ${slot.toUpperCase()}.`;
      updateCrossTabButtons();
      return false;
    }

    state.compareMode = true;
    state.activePane = slot;
    setComparePaneImage(slot, imported[0], { activate: true, resetAnchor: true });
    anchorCompareLink();
    renderComparePanes();
    renderSequenceList();
    updateCrossTabButtons();
    return true;
  }

  function ensureLauncher() {
    if (!isRadiopaediaCasePage()) return null;
    let button = document.getElementById(LAUNCHER_ID);
    if (button) return button;

    button = document.createElement("button");
    button.id = LAUNCHER_ID;
    button.type = "button";
    button.textContent = "PACS";
    button.title = "Open Radiopaedia PACS viewer";
    button.addEventListener("click", () => openViewer());
    document.documentElement.appendChild(button);
    injectLauncherStyle();
    return button;
  }

  function requestBridge(action, payload = {}) {
    const requestId = `rp-pacs-${Date.now()}-${++state.bridgeSeq}`;
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        state.bridgeRequests.delete(requestId);
        resolve({
          ok: false,
          error: "Bridge timed out",
          state: { bridge: { ok: false, error: "Bridge timed out" }, series: [] }
        });
      }, BRIDGE_TIMEOUT_MS);

      state.bridgeRequests.set(requestId, { resolve, timer });
      document.dispatchEvent(new CustomEvent(BRIDGE_REQUEST_EVENT, {
        detail: { requestId, action, payload }
      }));
    });
  }

  function onBridgeResponse(event) {
    const detail = event.detail || {};
    const request = state.bridgeRequests.get(detail.requestId);
    if (!request) return;
    window.clearTimeout(request.timer);
    state.bridgeRequests.delete(detail.requestId);
    request.resolve(detail);
  }

  function setBridgeStatus(response, fallbackError = "") {
    const bridge = response?.state?.bridge;
    if (response?.ok && bridge?.ok !== false) {
      state.bridgeStatus = "connected";
      state.bridgeError = "";
      state.bridgeApiUrl = bridge?.apiUrl || state.bridgeApiUrl;
      return;
    }

    state.bridgeStatus = "unavailable";
    state.bridgeError = bridge?.error || response?.error || fallbackError || "Bridge unavailable";
    state.bridgeApiUrl = bridge?.apiUrl || state.bridgeApiUrl;
  }

  function bridgeStatusText() {
    if (state.bridgeStatus === "connected") return "Bridge OK";
    if (state.bridgeStatus === "unavailable") return `Bridge off: ${state.bridgeError || "unavailable"}`;
    return "Bridge pending";
  }

  function selectInfoAfterSync(options = {}) {
    const previousKey = options.previousKey || state.activeKey;
    const previousUrl = options.previousUrl || state.imageUrl;
    let info = null;
    if (previousKey) info = state.series.find((item) => item.key === previousKey) || null;
    if (options.preferVisible && (!info || !info.visible)) {
      info = state.series.find((item) => item.visible && item.imageUrl !== previousUrl) ||
        state.series.find((item) => item.visible && item.key === previousKey) ||
        state.series.find((item) => item.visible);
    }
    return info || state.series[0] || null;
  }

  function renderSyncedInfo(info, options = {}) {
    renderSequenceList();
    if (state.compareMode) {
      renderComparePanes();
      return;
    }
    if (state.open && info) {
      setImage(info, {
        resetView: Boolean(options.resetView),
        preloadDirection: options.preloadDirection || 0
      });
    }
    if (state.open && !info) showEmpty();
  }

  function refreshFromBridge(options = {}) {
    const previousKey = state.activeKey;
    const previousUrl = state.imageUrl;
    return requestBridge("get-state").then((response) => {
      setBridgeStatus(response, "No Radiopaedia viewport state");
      if (!response?.ok || !applyBridgeState(response.state)) {
        updateStatus(getActiveSeries());
        return false;
      }
      const info = selectInfoAfterSync({ ...options, previousKey, previousUrl });
      renderSyncedInfo(info, options);
      return true;
    });
  }

  function injectLauncherStyle() {
    if (document.getElementById(`${LAUNCHER_ID}-style`)) return;
    const style = document.createElement("style");
    style.id = `${LAUNCHER_ID}-style`;
    style.textContent = `
      #${LAUNCHER_ID} {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483646;
        border: 1px solid rgba(255, 255, 255, .32);
        background: rgba(10, 14, 22, .94);
        color: #f8fafc;
        box-shadow: 0 14px 42px rgba(0, 0, 0, .45);
        border-radius: 8px;
        padding: 9px 12px;
        font: 850 12px/1.1 Arial, Helvetica, sans-serif;
        letter-spacing: 0;
        cursor: pointer;
      }
      #${LAUNCHER_ID}:hover {
        background: rgba(25, 33, 48, .98);
      }
    `;
    document.documentElement.appendChild(style);
  }

  function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (host) return host;

    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.display = "none";
    host.style.position = "fixed";
    host.style.inset = "0";
    host.style.zIndex = "2147483647";
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host {
          color-scheme: dark;
          font-family: Arial, Helvetica, sans-serif;
        }
        * {
          box-sizing: border-box;
        }
        [hidden] {
          display: none !important;
        }
        .shell {
          width: 100vw;
          height: 100vh;
          background: #05070a;
          color: #f8fafc;
          display: grid;
          grid-template-columns: 248px minmax(0, 1fr);
          overflow: hidden;
        }
        .shell.image-fullscreen {
          grid-template-columns: minmax(0, 1fr);
          background: #000;
        }
        .shell.image-fullscreen .sidebar,
        .shell.image-fullscreen .topbar,
        .shell.image-fullscreen .footer,
        .shell.image-fullscreen .shortcut-panel {
          display: none !important;
        }
        .shell.image-fullscreen .main {
          grid-template-rows: minmax(0, 1fr);
          background: #000;
        }
        .shell.image-fullscreen .stage {
          background: #000;
        }
        .shell.compare-mode .stage > .single-image {
          display: none !important;
        }
        .shell.compare-mode .stage > .empty {
          display: none !important;
        }
        .shell.compare-mode .compare-grid {
          display: grid;
        }
        .sidebar {
          border-right: 1px solid rgba(148, 163, 184, .22);
          background: #0b0f16;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          min-width: 0;
        }
        .side-head {
          padding: 14px 14px 12px;
          border-bottom: 1px solid rgba(148, 163, 184, .18);
        }
        .side-head strong {
          display: block;
          font-size: 13px;
          line-height: 1.2;
          font-weight: 850;
        }
        .side-head span {
          display: block;
          margin-top: 5px;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.35;
        }
        .sequence-list {
          overflow: auto;
          padding: 10px;
          display: grid;
          gap: 8px;
          align-content: start;
        }
        .sequence {
          width: 100%;
          border: 1px solid rgba(148, 163, 184, .22);
          background: #111827;
          color: #e5e7eb;
          border-radius: 8px;
          display: grid;
          grid-template-columns: 58px minmax(0, 1fr);
          gap: 9px;
          padding: 7px;
          text-align: left;
          cursor: pointer;
        }
        .sequence.active {
          border-color: rgba(96, 165, 250, .86);
          background: #162033;
          box-shadow: 0 0 0 1px rgba(96, 165, 250, .26) inset;
        }
        .sequence.pane-a {
          border-color: rgba(34, 197, 94, .82);
        }
        .sequence.pane-b {
          border-color: rgba(96, 165, 250, .86);
        }
        .sequence img {
          width: 58px;
          height: 58px;
          object-fit: cover;
          border-radius: 6px;
          background: #030712;
        }
        .sequence .meta {
          min-width: 0;
          align-self: center;
        }
        .sequence .label {
          display: block;
          font-size: 12px;
          line-height: 1.2;
          font-weight: 850;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sequence .sub {
          display: block;
          color: #94a3b8;
          margin-top: 4px;
          font-size: 11px;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .side-foot {
          padding: 10px 12px 12px;
          border-top: 1px solid rgba(148, 163, 184, .18);
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.35;
        }
        .main {
          position: relative;
          min-width: 0;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          background: #02040a;
        }
        .topbar {
          min-height: 54px;
          border-bottom: 1px solid rgba(148, 163, 184, .22);
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: #0a0f18;
        }
        .status strong {
          display: block;
          font-size: 13px;
          line-height: 1.2;
          font-weight: 850;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .status span {
          display: block;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.35;
          margin-top: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tools {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 7px;
        }
        .tools button {
          width: 34px;
          height: 32px;
          border-radius: 7px;
          border: 1px solid rgba(148, 163, 184, .26);
          background: #141c29;
          color: #e5e7eb;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
        }
        .tools button:hover {
          background: #1f2937;
        }
        .tools button:disabled {
          opacity: .42;
          cursor: not-allowed;
        }
        .tools button:disabled:hover {
          background: #141c29;
        }
        .tools .wide {
          width: auto;
          padding: 0 10px;
        }
        .tools .slice-step {
          min-width: 58px;
        }
        .tools .active-toggle {
          background: #bfdbfe;
          color: #0f172a;
          border-color: rgba(191, 219, 254, .9);
        }
        .shortcut-panel {
          position: absolute;
          top: 62px;
          right: 12px;
          z-index: 5;
          width: min(340px, calc(100vw - 32px));
          max-height: min(540px, calc(100vh - 96px));
          overflow: auto;
          padding: 12px;
          border-radius: 8px;
          background: rgba(11, 15, 22, .96);
          border: 1px solid rgba(96, 165, 250, .34);
          box-shadow: 0 24px 70px rgba(0, 0, 0, .48);
        }
        .shortcut-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #e5e7eb;
          font-size: 12px;
          font-weight: 850;
          margin-bottom: 10px;
        }
        .shortcut-head button,
        .shortcut-key {
          min-width: 86px;
          height: 30px;
          border-radius: 7px;
          border: 1px solid rgba(148, 163, 184, .26);
          background: #162033;
          color: #e5e7eb;
          font-size: 11px;
          font-weight: 850;
          cursor: pointer;
        }
        .shortcut-list {
          display: grid;
          gap: 7px;
        }
        .shortcut-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          color: #cbd5e1;
          font-size: 12px;
          line-height: 1.2;
        }
        .shortcut-key.listening {
          background: #bfdbfe;
          color: #0f172a;
        }
        .stage {
          position: relative;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          background:
            linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,255,255,.035) 1px, transparent 1px),
            #000;
          background-size: 32px 32px;
          cursor: grab;
          touch-action: none;
        }
        .stage.dragging {
          cursor: grabbing;
        }
        .stage.windowing {
          cursor: crosshair;
        }
        .stage.slicing {
          cursor: ns-resize;
        }
        .stage img {
          position: absolute;
          inset: 0;
          margin: auto;
          max-width: 100%;
          max-height: 100%;
          width: 100%;
          height: 100%;
          object-fit: contain;
          transform-origin: center center;
          user-select: none;
          -webkit-user-drag: none;
        }
        .compare-grid {
          position: absolute;
          inset: 0;
          display: none;
          gap: 10px;
          padding: 10px;
        }
        .compare-grid.layout-side {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          grid-template-rows: minmax(0, 1fr);
        }
        .compare-grid.layout-stack {
          grid-template-columns: minmax(0, 1fr);
          grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
        }
        .compare-pane {
          position: relative;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, .28);
          background: #000;
          border-radius: 8px;
        }
        .compare-pane.active {
          border-color: rgba(34, 197, 94, .95);
          box-shadow: 0 0 0 1px rgba(34, 197, 94, .42) inset;
        }
        .compare-pane[data-pane="b"].active {
          border-color: rgba(96, 165, 250, .95);
          box-shadow: 0 0 0 1px rgba(96, 165, 250, .42) inset;
        }
        .shell.image-fullscreen .compare-pane,
        .shell.image-fullscreen .compare-pane.active,
        .shell.image-fullscreen .compare-pane[data-pane="b"].active {
          border-color: transparent;
          box-shadow: none;
        }
        .compare-pane img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          transform-origin: center center;
          user-select: none;
          -webkit-user-drag: none;
        }
        .compare-label {
          position: absolute;
          left: 10px;
          bottom: 10px;
          max-width: calc(100% - 20px);
          padding: 5px 8px;
          border-radius: 7px;
          background: rgba(2, 6, 23, .78);
          color: #e5e7eb;
          font-size: 11px;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          pointer-events: none;
        }
        .compare-empty {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: #94a3b8;
          font-size: 13px;
          text-align: center;
          padding: 20px;
          pointer-events: none;
        }
        .empty {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: #94a3b8;
          font-size: 13px;
          text-align: center;
          padding: 24px;
        }
        .footer {
          min-height: 34px;
          border-top: 1px solid rgba(148, 163, 184, .18);
          background: #080c13;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          padding: 8px 12px;
          font-size: 11px;
          line-height: 1.25;
        }
        .footer .hint {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .footer .bridge {
          margin-left: auto;
          color: #cbd5e1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 36vw;
        }
        .footer .scale {
          white-space: nowrap;
        }
        @media (max-width: 760px) {
          .shell {
            grid-template-columns: 1fr;
            grid-template-rows: 132px minmax(0, 1fr);
          }
          .sidebar {
            border-right: 0;
            border-bottom: 1px solid rgba(148, 163, 184, .22);
            grid-template-rows: auto minmax(0, 1fr);
          }
          .side-foot {
            display: none;
          }
          .sequence-list {
            grid-auto-flow: column;
            grid-auto-columns: 188px;
            overflow-x: auto;
            overflow-y: hidden;
          }
          .shell.image-fullscreen {
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: minmax(0, 1fr);
          }
        }
      </style>
      <div class="shell" role="dialog" aria-modal="true" aria-label="Radiopaedia PACS viewer">
        <aside class="sidebar">
          <div class="side-head">
            <strong>Radiopaedia PACS</strong>
            <span>Click a sequence, then scroll the stack in the main pane.</span>
          </div>
          <div class="sequence-list"></div>
          <div class="side-foot">Left-drag scrubs slices by default. D toggles left-drag between slices and pan. Shift + drag adjusts display window.</div>
        </aside>
        <main class="main">
          <div class="topbar">
            <div class="status">
              <strong class="title">No sequence selected</strong>
              <span class="subtitle">Open a Radiopaedia study with rendered images.</span>
            </div>
            <div class="tools">
              <button class="slice-prev wide slice-step" type="button" title="Previous slice">Slice -</button>
              <button class="slice-next wide slice-step" type="button" title="Next slice">Slice +</button>
              <button class="prev wide" type="button" title="Previous sequence">Series -</button>
              <button class="next wide" type="button" title="Next sequence">Series +</button>
              <button class="zoom-out" type="button" title="Zoom out">-</button>
              <button class="zoom-in" type="button" title="Zoom in">+</button>
              <button class="reset" type="button" title="Reset view">1:1</button>
              <button class="rotate-left wide" type="button" title="Rotate active compare pane left">R-</button>
              <button class="rotate-right wide" type="button" title="Rotate active compare pane right">R+</button>
              <button class="window-down" type="button" title="Lower display window">W-</button>
              <button class="window-up" type="button" title="Raise display window">W+</button>
              <button class="level-down" type="button" title="Darker display level">L-</button>
              <button class="level-up" type="button" title="Brighter display level">L+</button>
              <button class="invert wide" type="button" title="Invert display">Inv</button>
              <button class="reset-window wide" type="button" title="Reset display window">WL 0</button>
              <button class="sync wide" type="button" title="Sync with the live Radiopaedia viewport">Sync</button>
              <button class="keys wide" type="button" title="Keyboard shortcuts">Keys</button>
              <button class="compare wide" type="button" title="Show two linked image panes">Compare</button>
              <button class="pane-a wide" type="button" title="Send selected sequence to pane A">A</button>
              <button class="pane-b wide" type="button" title="Send selected sequence to pane B">B</button>
              <button class="compare-layout wide" type="button" title="Switch compare layout">Side</button>
              <button class="compare-link wide" type="button" title="Link current compare slices">Link</button>
              <button class="save-a wide" type="button" title="Save this tab's study to cross-tab slot A">Save A</button>
              <button class="save-b wide" type="button" title="Save this tab's study to cross-tab slot B">Save B</button>
              <button class="load-a wide" type="button" title="Load saved slot A into pane A">Load A</button>
              <button class="load-b wide" type="button" title="Load saved slot B into pane B">Load B</button>
              <button class="image-full wide" type="button" title="Image-only fullscreen">Full</button>
              <button class="close" type="button" title="Close">x</button>
            </div>
          </div>
          <div class="shortcut-panel" hidden>
            <div class="shortcut-head">
              <span>Study shortcuts</span>
              <button class="shortcut-reset" type="button">Reset</button>
            </div>
            <div class="shortcut-list"></div>
          </div>
          <div class="stage">
            <img class="single-image" alt="Radiopaedia image">
            <div class="compare-grid layout-side" hidden>
              <div class="compare-pane active" data-pane="a" role="button" tabindex="0" aria-label="Compare pane A">
                <img alt="Radiopaedia compare image A" hidden>
                <span class="compare-label">Pane A</span>
                <span class="compare-empty">Select pane A, then choose a sequence.</span>
              </div>
              <div class="compare-pane" data-pane="b" role="button" tabindex="0" aria-label="Compare pane B">
                <img alt="Radiopaedia compare image B" hidden>
                <span class="compare-label">Pane B</span>
                <span class="compare-empty">Select pane B, then choose a sequence.</span>
              </div>
            </div>
            <div class="empty" hidden>No rendered Radiopaedia image detected yet.</div>
          </div>
          <div class="footer">
            <span class="hint">Left-drag follows the current drag mode. D toggles slices/pan. Shift + wheel/drag: display window.</span>
            <span class="bridge">Bridge pending</span>
            <span class="scale">100%</span>
          </div>
        </main>
      </div>
    `;

    shadow.querySelector(".close").addEventListener("click", closeViewer);
    shadow.querySelector(".prev").addEventListener("click", () => activateRelativeSeries(-1));
    shadow.querySelector(".next").addEventListener("click", () => activateRelativeSeries(1));
    shadow.querySelector(".slice-prev").addEventListener("click", () => scrollStack(-1));
    shadow.querySelector(".slice-next").addEventListener("click", () => scrollStack(1));
    shadow.querySelector(".zoom-in").addEventListener("click", () => zoomBy(1.2));
    shadow.querySelector(".zoom-out").addEventListener("click", () => zoomBy(1 / 1.2));
    shadow.querySelector(".reset").addEventListener("click", resetView);
    shadow.querySelector(".rotate-left").addEventListener("click", () => rotateActivePaneBy(-5));
    shadow.querySelector(".rotate-right").addEventListener("click", () => rotateActivePaneBy(5));
    shadow.querySelector(".window-up").addEventListener("click", () => adjustWindow({ contrastMultiplier: 1.15 }));
    shadow.querySelector(".window-down").addEventListener("click", () => adjustWindow({ contrastMultiplier: 1 / 1.15 }));
    shadow.querySelector(".level-up").addEventListener("click", () => adjustWindow({ brightnessDelta: 0.08 }));
    shadow.querySelector(".level-down").addEventListener("click", () => adjustWindow({ brightnessDelta: -0.08 }));
    shadow.querySelector(".invert").addEventListener("click", toggleInvert);
    shadow.querySelector(".reset-window").addEventListener("click", resetWindowing);
    shadow.querySelector(".sync").addEventListener("click", () => syncFromPage({ preferVisible: true }));
    shadow.querySelector(".keys").addEventListener("click", toggleShortcutPanel);
    shadow.querySelector(".compare").addEventListener("click", toggleCompareMode);
    shadow.querySelector(".pane-a").addEventListener("click", () => setActivePane("a"));
    shadow.querySelector(".pane-b").addEventListener("click", () => setActivePane("b"));
    shadow.querySelector(".compare-layout").addEventListener("click", toggleCompareLayout);
    shadow.querySelector(".compare-link").addEventListener("click", toggleCompareLink);
    shadow.querySelector(".save-a").addEventListener("click", () => saveCurrentStudyToSlot("a"));
    shadow.querySelector(".save-b").addEventListener("click", () => saveCurrentStudyToSlot("b"));
    shadow.querySelector(".load-a").addEventListener("click", () => loadCrossTabStudyToPane("a"));
    shadow.querySelector(".load-b").addEventListener("click", () => loadCrossTabStudyToPane("b"));
    shadow.querySelector(".image-full").addEventListener("click", enterImageFullscreen);
    shadow.querySelector(".shortcut-reset").addEventListener("click", resetShortcutSettings);
    shadow.querySelector(".shortcut-list").addEventListener("click", (event) => {
      const button = event.target?.closest?.("[data-shortcut-action]");
      if (!button) return;
      startShortcutCapture(button.dataset.shortcutAction);
    });

    const stage = shadow.querySelector(".stage");
    shadow.querySelector(".compare-grid").addEventListener("click", (event) => {
      const pane = event.target?.closest?.(".compare-pane")?.dataset?.pane;
      if (pane) setActivePane(pane);
    });
    stage.addEventListener("wheel", onStageWheel, { passive: false });
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    stage.addEventListener("dblclick", () => {
      if (state.compareMode) {
        const transform = paneTransform(state.activePane);
        if (transform.scale < 1.8) {
          transform.scale = 2.5;
          applyTransform();
        } else {
          resetPaneTransform(state.activePane);
        }
      } else if (state.scale < 1.8) {
        state.scale = 2.5;
        applyTransform();
      } else {
        resetView();
      }
    });

    document.documentElement.appendChild(host);
    renderShortcutPanel();
    return host;
  }

  function syncImageFullscreenClass() {
    const host = ensureHost();
    const shell = host.shadowRoot?.querySelector(".shell");
    shell?.classList.toggle("image-fullscreen", Boolean(state.imageFullscreen));
  }

  function enterImageFullscreen() {
    const host = ensureHost();
    state.imageFullscreen = true;
    state.shortcutCaptureAction = "";
    renderShortcutPanel();
    syncImageFullscreenClass();

    if (typeof host.requestFullscreen === "function" && document.fullscreenElement !== host) {
      host.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    }
  }

  function exitImageFullscreen(options = {}) {
    if (!state.imageFullscreen && document.fullscreenElement !== document.getElementById(HOST_ID)) return;
    const host = document.getElementById(HOST_ID);
    state.imageFullscreen = false;
    syncImageFullscreenClass();

    if (
      !options.skipDocumentExit &&
      host &&
      document.fullscreenElement === host &&
      typeof document.exitFullscreen === "function"
    ) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function paneState(paneId = state.activePane) {
    return state.comparePanes[paneId] || state.comparePanes.a;
  }

  function defaultCompareTransform() {
    return { scale: 1, x: 0, y: 0, rotation: 0 };
  }

  function paneTransform(paneId = state.activePane) {
    if (!state.compareTransforms[paneId]) {
      state.compareTransforms[paneId] = defaultCompareTransform();
    }
    return state.compareTransforms[paneId];
  }

  function resetPaneTransform(paneId = state.activePane, options = {}) {
    state.compareTransforms[paneId] = defaultCompareTransform();
    if (!options.silent) applyTransform();
  }

  function compareTransformStyle(paneId = state.activePane) {
    const transform = paneTransform(paneId);
    return `translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale})`;
  }

  function infoForPane(paneId = state.activePane) {
    const pane = paneState(paneId);
    if (!pane.key) return null;
    const info = state.series.find((item) => item.key === pane.key) || null;
    if (!info) return null;
    return {
      ...info,
      imageUrl: pane.imageUrl || info.imageUrl,
      sliceNumber: Number.isFinite(pane.sliceNumber) ? pane.sliceNumber : info.sliceNumber
    };
  }

  function syncCompareClass() {
    const host = ensureHost();
    const shadow = host.shadowRoot;
    const shell = shadow?.querySelector(".shell");
    const grid = shadow?.querySelector(".compare-grid");
    shell?.classList.toggle("compare-mode", Boolean(state.compareMode));
    if (grid) {
      grid.hidden = !state.compareMode;
      grid.classList.toggle("layout-side", state.compareLayout === "side");
      grid.classList.toggle("layout-stack", state.compareLayout === "stack");
    }
  }

  function compareTitle() {
    const a = infoForPane("a");
    const b = infoForPane("b");
    if (!state.compareMode) return "";
    if (a && b) return `Compare ${a.label} / ${b.label}`;
    if (a) return `Compare ${a.label} / Pane B empty`;
    if (b) return `Compare Pane A empty / ${b.label}`;
    return "Compare mode";
  }

  function compareSubtitle() {
    const a = infoForPane("a");
    const b = infoForPane("b");
    const pieces = [];
    if (a) pieces.push(`A ${sliceText(a)}`);
    if (b) pieces.push(`B ${sliceText(b)}`);
    pieces.push(state.compareLinked ? "linked" : "unlinked");
    pieces.push(state.compareLayout === "side" ? "side-by-side" : "stacked");
    return pieces.join(" | ");
  }

  function updateCompareButtons() {
    const host = ensureHost();
    const shadow = host.shadowRoot;
    shadow.querySelector(".compare")?.classList.toggle("active-toggle", state.compareMode);
    shadow.querySelector(".pane-a")?.classList.toggle("active-toggle", state.compareMode && state.activePane === "a");
    shadow.querySelector(".pane-b")?.classList.toggle("active-toggle", state.compareMode && state.activePane === "b");
    const layout = shadow.querySelector(".compare-layout");
    if (layout) layout.textContent = state.compareLayout === "side" ? "Side" : "Stack";
    shadow.querySelector(".compare-layout")?.classList.toggle("active-toggle", state.compareMode);
    shadow.querySelector(".compare-link")?.classList.toggle("active-toggle", state.compareMode && state.compareLinked);
  }

  function updateComparePaneClasses() {
    const host = ensureHost();
    host.shadowRoot?.querySelectorAll(".compare-pane").forEach((pane) => {
      pane.classList.toggle("active", pane.dataset.pane === state.activePane);
    });
    updateCompareButtons();
  }

  function updateCompareStatus() {
    if (!state.compareMode) return;
    const host = ensureHost();
    const shadow = host.shadowRoot;
    const title = shadow.querySelector(".title");
    const subtitle = shadow.querySelector(".subtitle");
    const scale = shadow.querySelector(".scale");
    if (title) title.textContent = compareTitle();
    if (subtitle) subtitle.textContent = compareSubtitle();
    if (scale) scale.textContent = displayStatusText();
  }

  function setActivePane(paneId) {
    if (!state.comparePanes[paneId]) return;
    state.activePane = paneId;
    const info = infoForPane(paneId);
    if (info) {
      state.activeKey = info.key;
      state.imageUrl = info.imageUrl;
    }
    updateComparePaneClasses();
    updateCompareStatus();
  }

  function renderComparePane(paneId) {
    const host = ensureHost();
    const shadow = host.shadowRoot;
    const pane = paneState(paneId);
    const paneEl = shadow.querySelector(`.compare-pane[data-pane="${paneId}"]`);
    if (!paneEl) return;
    const img = paneEl.querySelector("img");
    const label = paneEl.querySelector(".compare-label");
    const empty = paneEl.querySelector(".compare-empty");
    const info = infoForPane(paneId);

    if (!info?.imageUrl) {
      if (img) {
        img.hidden = true;
        img.style.display = "none";
        img.removeAttribute("src");
      }
      if (empty) {
        empty.hidden = false;
        empty.style.display = "";
      }
      if (label) label.textContent = `Pane ${paneId.toUpperCase()}`;
      return;
    }

    if (img) {
      if (img.src !== info.imageUrl) img.src = info.imageUrl;
      img.hidden = false;
      img.style.display = "";
      img.style.transform = compareTransformStyle(paneId);
      img.style.filter = displayFilter();
    }
    if (empty) {
      empty.hidden = true;
      empty.style.display = "none";
    }
    if (label) label.textContent = `${paneId.toUpperCase()}: ${info.label} - ${sliceText(info)}`;
    pane.imageUrl = info.imageUrl;
    pane.sliceNumber = info.sliceNumber;
    queueImagePreload(info, { priority: paneId === state.activePane });
    preloadStackAround(info, 0);
  }

  function renderComparePanes() {
    syncCompareClass();
    renderComparePane("a");
    renderComparePane("b");
    updateComparePaneClasses();
    updateCompareStatus();
  }

  function chooseAdjacentSeries(info) {
    if (!state.series.length) return null;
    if (!info) return state.series[0] || null;
    const index = state.series.findIndex((item) => item.key === info.key);
    if (index < 0) return state.series.find((item) => item.key !== info.key) || info;
    return state.series[(index + 1) % state.series.length] || info;
  }

  function setComparePaneImage(paneId, info, options = {}) {
    if (!state.comparePanes[paneId] || !info?.imageUrl) return false;
    rememberFrame(info);
    const pane = paneState(paneId);
    pane.key = info.key;
    pane.imageUrl = info.imageUrl;
    pane.sliceNumber = Number.isFinite(info.sliceNumber) ? info.sliceNumber : pane.sliceNumber;
    if (options.resetAnchor) {
      pane.anchorSlice = pane.sliceNumber;
      resetPaneTransform(paneId, { silent: true });
    } else if (!state.compareLinked) {
      pane.anchorSlice = pane.sliceNumber;
    }
    if (paneId === state.activePane || options.activate) {
      state.activePane = paneId;
      state.activeKey = info.key;
      state.imageUrl = info.imageUrl;
    }
    renderComparePanes();
    renderSequenceList();
    return true;
  }

  function setComparePaneSlice(paneId, sliceNumber, options = {}) {
    const info = infoForPane(paneId);
    if (!info || !Number.isFinite(sliceNumber)) return false;
    const stack = getFrameStack(info.key);
    const total = info.totalSlices || stack?.totalSlices;
    const targetSlice = Number.isFinite(total)
      ? Math.max(1, Math.min(total, sliceNumber))
      : Math.max(1, sliceNumber);
    const frame = getCachedFrame(info, targetSlice) || {
      ...info,
      sliceNumber: targetSlice
    };
    if (!frame.imageUrl) return false;
    return setComparePaneImage(paneId, frame, {
      resetAnchor: false,
      activate: options.activate
    });
  }

  function anchorCompareLink() {
    ["a", "b"].forEach((paneId) => {
      const info = infoForPane(paneId);
      if (info?.sliceNumber) state.comparePanes[paneId].anchorSlice = info.sliceNumber;
    });
  }

  function toggleCompareMode() {
    state.compareMode = !state.compareMode;
    if (state.compareMode) {
      const primary = getActiveSeries() || chooseInitialSeries();
      const secondary = chooseAdjacentSeries(primary);
      if (primary && !state.comparePanes.a.key) {
        setComparePaneImage("a", primary, { activate: true, resetAnchor: true });
      }
      if (secondary && !state.comparePanes.b.key) {
        setComparePaneImage("b", secondary, { resetAnchor: true });
      }
      anchorCompareLink();
    } else {
      state.compareLinked = false;
      syncCompareClass();
      updateCompareButtons();
      updateStatus(getActiveSeries());
    }
    renderComparePanes();
    renderSequenceList();
  }

  function toggleCompareLayout() {
    state.compareLayout = state.compareLayout === "side" ? "stack" : "side";
    renderComparePanes();
  }

  function toggleCompareLink() {
    state.compareLinked = !state.compareLinked;
    if (state.compareLinked) anchorCompareLink();
    renderComparePanes();
  }

  function renderSequenceList() {
    const host = ensureHost();
    const list = host.shadowRoot.querySelector(".sequence-list");
    if (!list) return;
    list.innerHTML = "";

    if (!state.series.length) {
      const item = document.createElement("div");
      item.className = "empty-sequences";
      item.textContent = "No rendered sequences detected.";
      list.appendChild(item);
      return;
    }

    state.series.forEach((info) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sequence";
      button.classList.toggle("active", !state.compareMode && info.key === state.activeKey);
      button.classList.toggle("pane-a", state.compareMode && info.key === state.comparePanes.a.key);
      button.classList.toggle("pane-b", state.compareMode && info.key === state.comparePanes.b.key);
      button.dataset.seriesKey = info.key;
      button.title = `${info.label} ${sliceText(info)}`;
      button.addEventListener("click", () => activateSeries(info.key, { resetView: true }));

      const img = document.createElement("img");
      img.alt = info.label;
      img.src = info.imageUrl;

      const meta = document.createElement("span");
      meta.className = "meta";
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = info.label;
      const sub = document.createElement("span");
      sub.className = "sub";
      sub.textContent = [
        info.seriesNumberLabel && info.seriesNumberLabel !== info.label ? info.seriesNumberLabel : "",
        sliceText(info),
        getStackProgress(info),
        info.viewport,
        info.visible ? "" : "snapshot"
      ]
        .filter(Boolean)
        .join(" | ");
      meta.append(label, sub);
      button.append(img, meta);
      list.appendChild(button);
    });
  }

  function updateStatus(info) {
    const host = ensureHost();
    const shadow = host.shadowRoot;
    if (state.compareMode) {
      updateCompareStatus();
      return;
    }
    const title = shadow.querySelector(".title");
    const subtitle = shadow.querySelector(".subtitle");
    const scale = shadow.querySelector(".scale");
    const bridge = shadow.querySelector(".bridge");
    if (title) title.textContent = info ? `${info.label} - ${sliceText(info)}` : "No sequence selected";
    if (subtitle) subtitle.textContent = statusText(info);
    if (scale) scale.textContent = displayStatusText();
    if (bridge) {
      bridge.textContent = bridgeStatusText();
      bridge.title = state.bridgeStatus === "connected"
        ? state.bridgeApiUrl || "Radiopaedia viewport bridge connected"
        : state.bridgeError || "Radiopaedia viewport bridge pending";
    }
  }

  function setImage(info, options = {}) {
    if (!info?.imageUrl) return false;
    if (state.compareMode) {
      return setComparePaneImage(options.pane || state.activePane, info, {
        activate: true,
        resetAnchor: Boolean(options.resetView)
      });
    }
    rememberFrame(info);
    const host = ensureHost();
    const shadow = host.shadowRoot;
    const img = shadow.querySelector(".stage > .single-image");
    const empty = shadow.querySelector(".empty");
    syncCompareClass();
    state.activeKey = info.key;
    state.imageUrl = info.imageUrl;
    const existingIndex = state.series.findIndex((item) => item.key === info.key);
    if (existingIndex >= 0) {
      state.series[existingIndex] = {
        ...state.series[existingIndex],
        ...makeFrameSnapshot(info),
        container: state.series[existingIndex].container || info.container,
        image: state.series[existingIndex].image || info.image,
        visible: info.visible ?? state.series[existingIndex].visible
      };
    }
    if (img.src !== info.imageUrl) img.src = info.imageUrl;
    queueImagePreload(info, { priority: true });
    img.hidden = false;
    img.style.display = "";
    empty.hidden = true;
    empty.style.display = "none";

    if (options.resetView) {
      state.scale = 1;
      state.x = 0;
      state.y = 0;
    }

    applyTransform();
    preloadStackAround(info, options.preloadDirection || 0);
    renderSequenceList();
    updateStatus(info);
    return true;
  }

  function showEmpty() {
    const host = ensureHost();
    const shadow = host.shadowRoot;
    const img = shadow.querySelector(".stage > .single-image");
    const empty = shadow.querySelector(".empty");
    img.hidden = true;
    img.style.display = "none";
    empty.hidden = false;
    empty.style.display = "";
    updateStatus(null);
  }

  function openViewer() {
    const host = ensureHost();
    host.style.display = "block";
    state.open = true;
    state.imageFullscreen = false;
    state.compareMode = false;
    state.compareLinked = false;
    state.activePane = "a";
    state.comparePanes = {
      a: { key: "", imageUrl: "", sliceNumber: null, anchorSlice: null },
      b: { key: "", imageUrl: "", sliceNumber: null, anchorSlice: null }
    };
    state.compareTransforms = {
      a: defaultCompareTransform(),
      b: defaultCompareTransform()
    };
    state.externalSeries = [];
    syncImageFullscreenClass();
    syncCompareClass();
    updateCompareButtons();
    loadCrossTabStudies();
    const info = chooseInitialSeries();
    renderSequenceList();
    if (info) setImage(info, { resetView: true });
    else showEmpty();
    refreshFromBridge({ preferVisible: true, resetView: false });
  }

  function closeViewer() {
    const host = document.getElementById(HOST_ID);
    exitImageFullscreen();
    if (host) host.style.display = "none";
    state.open = false;
    state.dragging = false;
    state.windowing = false;
    state.sliceScrubbing = false;
    state.scrubOriginSlice = null;
    state.scrubLastSlice = null;
    state.shortcutCaptureAction = "";
    state.compareMode = false;
    state.compareLinked = false;
    state.compareTransforms = {
      a: defaultCompareTransform(),
      b: defaultCompareTransform()
    };
    state.externalSeries = [];
    state.pressedKeys.clear();
    clearImageCache();
    renderShortcutPanel();
  }

  function activateSeries(key, options = {}) {
    collectSeries();
    const info = state.series.find((item) => item.key === key);
    if (!info) return false;
    if (state.compareMode) {
      return setComparePaneImage(state.activePane, info, {
        activate: true,
        resetAnchor: Boolean(options.resetView)
      });
    }
    const didSet = setImage(info, options);
    if (didSet && info.bridgeAvailable) {
      setBridgeFrame(info, info.sliceNumber || 1);
    }
    return didSet;
  }

  function activateRelativeSeries(delta) {
    collectSeries();
    if (!state.series.length) return;
    if (state.compareMode) {
      const paneInfo = infoForPane(state.activePane);
      const currentIndex = Math.max(0, state.series.findIndex((item) => item.key === paneInfo?.key));
      const info = state.series[(currentIndex + delta + state.series.length) % state.series.length];
      setComparePaneImage(state.activePane, info, { activate: true, resetAnchor: true });
      return;
    }
    const currentIndex = Math.max(0, state.series.findIndex((item) => item.key === state.activeKey));
    const nextIndex = (currentIndex + delta + state.series.length) % state.series.length;
    const info = state.series[nextIndex];
    setImage(info, { resetView: true });
    if (info.bridgeAvailable) setBridgeFrame(info, info.sliceNumber || 1);
  }

  function syncFromPage(options = {}) {
    if (options.bridge !== false) {
      refreshFromBridge(options).then((ok) => {
        if (!ok) syncFromPage({ ...options, bridge: false });
      });
      return;
    }

    const previousKey = state.activeKey;
    const previousUrl = state.imageUrl;
    const series = collectSeries();
    state.series = series;
    const info = selectInfoAfterSync({ ...options, previousKey, previousUrl });
    if (state.compareMode) {
      renderComparePanes();
      renderSequenceList();
      return;
    }
    renderSyncedInfo(info, { resetView: false });
  }

  function getCachedFrame(info, sliceNumber) {
    if (!info || !Number.isFinite(sliceNumber)) return null;
    const stack = getFrameStack(info.key);
    const cached = stack?.frames.get(sliceNumber);
    if (!cached) return null;
    return {
      ...info,
      ...cached,
      container: info.container,
      image: info.image,
      viewport: info.viewport || cached.viewport,
      visible: info.visible ?? cached.visible,
      totalSlices: info.totalSlices || cached.totalSlices || stack.totalSlices
    };
  }

  function clearImageCache() {
    state.cacheGeneration += 1;
    state.preloadQueue = [];
    state.imageCache.forEach((entry) => {
      entry.cancelled = true;
      if (entry.img) {
        entry.img.onload = null;
        entry.img.onerror = null;
        entry.img.src = "";
      }
    });
    state.imageCache.clear();
    state.activePreloads = 0;
  }

  function trimImageCache() {
    if (state.imageCache.size <= MAX_PRELOADED_IMAGES) return;
    const currentUrl = normalizeUrl(state.imageUrl);
    const removable = Array.from(state.imageCache.values())
      .filter((entry) => entry.status !== "loading" && entry.url !== currentUrl)
      .sort((a, b) => a.lastUsed - b.lastUsed);

    while (state.imageCache.size > MAX_PRELOADED_IMAGES && removable.length) {
      const entry = removable.shift();
      entry.cancelled = true;
      if (entry.img) {
        entry.img.onload = null;
        entry.img.onerror = null;
        entry.img.src = "";
      }
      state.imageCache.delete(entry.url);
    }
  }

  function pumpPreloadQueue() {
    while (state.open && state.activePreloads < PRELOAD_CONCURRENCY && state.preloadQueue.length) {
      const entry = state.preloadQueue.shift();
      if (!entry || entry.cancelled || entry.status !== "queued") continue;
      if (entry.generation !== state.cacheGeneration) continue;

      entry.status = "loading";
      entry.lastUsed = Date.now();
      state.activePreloads += 1;

      const img = new Image();
      img.decoding = "async";
      if ("fetchPriority" in img) img.fetchPriority = entry.priority ? "high" : "low";
      entry.img = img;

      let settled = false;
      const finish = (status) => {
        if (settled) return;
        settled = true;
        img.onload = null;
        img.onerror = null;

        if (
          !entry.cancelled &&
          entry.generation === state.cacheGeneration &&
          state.imageCache.get(entry.url) === entry
        ) {
          entry.status = status;
          entry.lastUsed = Date.now();
          if (state.open && entry.seriesKey === state.activeKey) updateStatus(getActiveSeries());
        }

        if (entry.generation === state.cacheGeneration) {
          state.activePreloads = Math.max(0, state.activePreloads - 1);
          trimImageCache();
          pumpPreloadQueue();
        }
      };

      const finishLoaded = () => {
        if (typeof img.decode === "function") {
          img.decode().then(() => finish("loaded")).catch(() => finish("loaded"));
          return;
        }
        finish("loaded");
      };

      img.onload = finishLoaded;
      img.onerror = () => finish("error");
      img.src = entry.url;
      if (img.complete && img.naturalWidth > 0) finishLoaded();
    }
  }

  function queueImagePreload(frame, options = {}) {
    const url = normalizeUrl(frame?.imageUrl || "");
    if (!url) return;

    const existing = state.imageCache.get(url);
    if (existing) {
      existing.lastUsed = Date.now();
      if (options.priority && existing.status === "queued") {
        existing.priority = true;
        state.preloadQueue = state.preloadQueue.filter((entry) => entry !== existing);
        state.preloadQueue.unshift(existing);
      }
      return;
    }

    const entry = {
      url,
      img: null,
      status: "queued",
      priority: Boolean(options.priority),
      seriesKey: frame.key,
      sliceNumber: frame.sliceNumber,
      lastUsed: Date.now(),
      generation: state.cacheGeneration,
      cancelled: false
    };

    state.imageCache.set(url, entry);
    if (entry.priority) state.preloadQueue.unshift(entry);
    else state.preloadQueue.push(entry);
    trimImageCache();
    pumpPreloadQueue();
  }

  function preloadStackAround(info, direction = 0) {
    if (!state.open || !info?.key) return;
    const stack = getFrameStack(info.key);
    const current = Number.isFinite(info.sliceNumber) ? info.sliceNumber : stack?.currentSlice;
    if (!Number.isFinite(current)) return;

    const total = info.totalSlices || stack?.totalSlices || null;
    const primary = direction < 0 ? -1 : 1;
    const offsets = [0];
    for (let step = 1; step <= PRELOAD_AHEAD; step += 1) {
      offsets.push(step * primary);
      if (step <= PRELOAD_BEHIND) offsets.push(-step * primary);
    }

    offsets.forEach((offset, index) => {
      const sliceNumber = current + offset;
      if (sliceNumber < 1) return;
      if (Number.isFinite(total) && sliceNumber > total) return;
      const frame = getCachedFrame(info, sliceNumber);
      if (!frame?.imageUrl) return;
      queueImagePreload(frame, { priority: index < 5 });
    });
  }

  function getNextSliceNumber(info, direction) {
    const stack = getFrameStack(info?.key);
    const current = info?.sliceNumber || stack?.currentSlice;
    if (!Number.isFinite(current)) return null;
    const total = info?.totalSlices || stack?.totalSlices;
    const next = current + (direction > 0 ? 1 : -1);
    if (Number.isFinite(total)) return Math.max(1, Math.min(total, next));
    return Math.max(1, next);
  }

  function scheduleStackSync() {
    state.lastScrollAt = Date.now();
    SYNC_DELAYS.forEach((delay) => window.setTimeout(() => syncFromPage(), delay));
  }

  function focusRadiopaediaTarget(info) {
    const candidates = [
      info?.container?.querySelector("[data-scale-provider]"),
      info?.container,
      info?.container?.closest("[data-slot]"),
      info?.seriesId ? document.querySelector(`[data-series-id="${info.seriesId}"]`) : null,
      document.querySelector(".FullscreenViewer")
    ].filter(Boolean);
    const target = candidates.find((candidate) => candidate instanceof HTMLElement) || null;
    if (!target) return null;

    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    try {
      target.focus({ preventScroll: true });
    } catch {
      target.focus();
    }
    return target;
  }

  function createStackKeyEvent(key) {
    return new KeyboardEvent("keydown", {
      key,
      code: key,
      bubbles: true,
      cancelable: true,
      composed: true
    });
  }

  function dispatchRadiopaediaKey(direction) {
    const info = getActiveSeries() || chooseInitialSeries();
    const key = direction > 0 ? "ArrowDown" : "ArrowUp";
    const target = focusRadiopaediaTarget(info);

    state.suppressOwnKeyCapture = true;
    try {
      window.dispatchEvent(createStackKeyEvent(key));
      const focused = document.activeElement;
      if (target) target.dispatchEvent(createStackKeyEvent(key));
      if (focused && focused !== target && focused instanceof HTMLElement) {
        focused.dispatchEvent(createStackKeyEvent(key));
      }
    } finally {
      window.setTimeout(() => {
        state.suppressOwnKeyCapture = false;
      }, 0);
    }

    scheduleStackSync();
    return Boolean(target);
  }

  function dispatchWheelToSource(deltaY) {
    const info = getActiveSeries();
    const container =
      info?.container ||
      (info?.seriesId ? document.querySelector(`[data-series-id="${info.seriesId}"]`) : null);
    const targets = Array.from(new Set([
      container?.querySelector('[data-test-hook="scrollbar"]'),
      container?.querySelector("[data-scale-provider]"),
      container?.querySelector("img"),
      container,
      container?.closest("[data-slot]"),
      document.querySelector(".FullscreenViewer")
    ].filter((target) => target instanceof EventTarget)));
    if (!targets.length) return false;

    targets.forEach((target) => {
      const rect = target instanceof Element ? target.getBoundingClientRect() : null;
      const wheel = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        composed: true,
        deltaY,
        deltaX: 0,
        deltaMode: 0,
        clientX: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        clientY: rect ? rect.top + rect.height / 2 : window.innerHeight / 2
      });
      target.dispatchEvent(wheel);
    });
    scheduleStackSync();
    return true;
  }

  function driveNativeStack(direction) {
    const didWheel = dispatchWheelToSource(direction * 130);
    const didKey = dispatchRadiopaediaKey(direction);
    return didWheel || didKey;
  }

  function setBridgeFrame(info, sliceNumber, options = {}) {
    if (!info?.bridgeAvailable || !Number.isFinite(sliceNumber)) return Promise.resolve(false);
    const sequence = Number.isFinite(options.sequence) ? options.sequence : state.bridgeSetSeq + 1;
    state.bridgeSetSeq = Math.max(state.bridgeSetSeq, sequence);
    const frameIdx = Math.max(0, sliceNumber - 1);
    return requestBridge("set-frame", {
      seriesId: info.seriesId || info.key,
      frameIdx
    }).then((response) => {
      if (sequence !== state.bridgeSetSeq) return true;
      setBridgeStatus(response, "Could not set Radiopaedia frame");
      if (!response?.ok || !applyBridgeState(response.state)) {
        updateStatus(getActiveSeries());
        return false;
      }
      const synced = state.series.find((item) => item.key === info.key) ||
        state.series.find((item) => String(item.seriesId) === String(info.seriesId)) ||
        selectInfoAfterSync();
      renderSyncedInfo(synced, {
        resetView: false,
        preloadDirection: options.preloadDirection || 0
      });
      return true;
    });
  }

  function setSliceNumber(sliceNumber, options = {}) {
    collectSeries();
    if (state.compareMode) {
      return setComparePaneSlice(state.activePane, sliceNumber, { activate: true });
    }
    const info = getActiveSeries();
    if (!info) return false;

    const direction = options.direction || Math.sign(sliceNumber - (info.sliceNumber || 0)) || 1;
    const stack = getFrameStack(info.key);
    const total = info.totalSlices || stack?.totalSlices;
    const targetSlice = Number.isFinite(total)
      ? Math.max(1, Math.min(total, sliceNumber))
      : Math.max(1, sliceNumber);
    const cached = getCachedFrame(info, targetSlice);
    if (cached && cached.imageUrl !== state.imageUrl) {
      setImage(cached, { resetView: false, preloadDirection: direction });
    }

    if (info.bridgeAvailable) {
      setBridgeFrame(info, targetSlice, { preloadDirection: direction }).then((ok) => {
        if (!ok && !cached) driveNativeStack(direction);
      });
      return true;
    }

    const droveNativeStack = driveNativeStack(direction);
    return droveNativeStack || Boolean(cached);
  }

  function paneFromEvent(event) {
    const paneId = event.target?.closest?.(".compare-pane")?.dataset?.pane;
    return state.comparePanes[paneId] ? paneId : state.activePane;
  }

  function scrollCompareStack(direction, paneId = state.activePane) {
    collectSeries();
    const info = infoForPane(paneId);
    if (!info) return false;

    const nextSlice = getNextSliceNumber(info, direction);
    if (!Number.isFinite(nextSlice)) return false;
    const moved = setComparePaneSlice(paneId, nextSlice, { activate: true });
    if (!moved) return false;

    if (state.compareLinked) {
      const otherPaneId = paneId === "a" ? "b" : "a";
      const pane = paneState(paneId);
      const other = paneState(otherPaneId);
      const otherInfo = infoForPane(otherPaneId);
      if (
        otherInfo &&
        Number.isFinite(pane.anchorSlice) &&
        Number.isFinite(other.anchorSlice)
      ) {
        const offset = nextSlice - pane.anchorSlice;
        setComparePaneSlice(otherPaneId, other.anchorSlice + offset, { activate: false });
      }
    }

    renderComparePanes();
    return true;
  }

  function scrollStack(direction) {
    collectSeries();
    if (state.compareMode) return scrollCompareStack(direction, state.activePane);
    const info = getActiveSeries();
    if (!info) return false;

    const nextSlice = getNextSliceNumber(info, direction);
    if (!Number.isFinite(nextSlice)) return false;
    return setSliceNumber(nextSlice, { direction });
  }

  function onStageWheel(event) {
    event.preventDefault();
    if (state.compareMode) setActivePane(paneFromEvent(event));
    if (shortcutHeld(event, "windowDrag")) {
      adjustWindow({ contrastMultiplier: event.deltaY < 0 ? 1.08 : 1 / 1.08 });
      return;
    }
    if (event.ctrlKey || event.altKey || event.metaKey) {
      zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15);
      return;
    }
    if (event.deltaY !== 0) scrollStack(event.deltaY > 0 ? 1 : -1);
  }

  function zoomBy(multiplier) {
    if (state.compareMode) {
      const transform = paneTransform(state.activePane);
      transform.scale = Math.max(0.25, Math.min(12, transform.scale * multiplier));
      applyTransform();
      return;
    }
    state.scale = Math.max(0.25, Math.min(12, state.scale * multiplier));
    applyTransform();
  }

  function rotateActivePaneBy(degrees) {
    if (!state.compareMode) return;
    const transform = paneTransform(state.activePane);
    transform.rotation = ((transform.rotation + degrees + 180) % 360) - 180;
    applyTransform();
  }

  function clampDisplayValue(value) {
    return Math.max(MIN_DISPLAY_VALUE, Math.min(MAX_DISPLAY_VALUE, value));
  }

  function adjustWindow(options = {}) {
    if (Number.isFinite(options.contrastMultiplier)) {
      state.windowContrast = clampDisplayValue(state.windowContrast * options.contrastMultiplier);
    }
    if (Number.isFinite(options.brightnessDelta)) {
      state.windowBrightness = clampDisplayValue(state.windowBrightness + options.brightnessDelta);
    }
    applyTransform();
  }

  function resetWindowing() {
    state.windowBrightness = 1;
    state.windowContrast = 1;
    state.inverted = false;
    applyTransform();
  }

  function toggleInvert() {
    state.inverted = !state.inverted;
    applyTransform();
  }

  function displayFilter() {
    const filters = [
      `brightness(${state.windowBrightness})`,
      `contrast(${state.windowContrast})`
    ];
    if (state.inverted) filters.push("invert(1)");
    return filters.join(" ");
  }

  function displayStatusText() {
    const transform = state.compareMode ? paneTransform(state.activePane) : null;
    const pieces = state.compareMode
      ? [
          `Pane ${state.activePane.toUpperCase()}`,
          `${Math.round(transform.scale * 100)}%`,
          `Rot ${Math.round(transform.rotation)}deg`,
          "Drag pan"
        ]
      : [`${Math.round(state.scale * 100)}%`, `Drag ${state.defaultDragMode}`];
    if (state.windowContrast !== 1 || state.windowBrightness !== 1 || state.inverted) {
      pieces.push(`W${Math.round(state.windowContrast * 100)}`);
      pieces.push(`L${Math.round(state.windowBrightness * 100)}`);
      if (state.inverted) pieces.push("Inv");
    }
    return pieces.join(" ");
  }

  function resetView() {
    if (state.compareMode) {
      resetPaneTransform(state.activePane);
      return;
    }
    state.scale = 1;
    state.x = 0;
    state.y = 0;
    applyTransform();
  }

  function toggleDefaultDragMode() {
    state.defaultDragMode = state.defaultDragMode === "pan" ? "slice" : "pan";
    updateStatus(getActiveSeries());
  }

  function applyTransform() {
    const shadow = document.getElementById(HOST_ID)?.shadowRoot;
    if (!shadow) return;
    if (state.compareMode) {
      shadow.querySelectorAll(".compare-pane").forEach((pane) => {
        const img = pane.querySelector("img");
        if (!img) return;
        img.style.transform = compareTransformStyle(pane.dataset.pane);
        img.style.filter = displayFilter();
      });
      updateCompareStatus();
      return;
    }
    const img = shadow.querySelector(".stage > .single-image");
    if (!img) return;
    img.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    img.style.filter = displayFilter();
    updateStatus(getActiveSeries());
  }

  function pointerInsideImage(event) {
    const shadow = document.getElementById(HOST_ID)?.shadowRoot;
    if (state.compareMode) {
      const pane = event.target?.closest?.(".compare-pane");
      if (pane?.dataset?.pane) {
        setActivePane(pane.dataset.pane);
        return true;
      }
    }
    const img = shadow?.querySelector(".stage > .single-image");
    if (!img || img.hidden) return false;
    const rect = img.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    if (!pointerInsideImage(event)) return;
    event.preventDefault();
    const stage = event.currentTarget;
    if (shortcutHeld(event, "windowDrag")) {
      state.windowing = true;
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.windowOriginBrightness = state.windowBrightness;
      state.windowOriginContrast = state.windowContrast;
      stage.classList.add("windowing");
      stage.setPointerCapture?.(event.pointerId);
      return;
    }

    if (state.compareMode || shortcutHeld(event, "panDrag") || state.defaultDragMode === "pan") {
      state.dragging = true;
      state.startX = event.clientX;
      state.startY = event.clientY;
      if (state.compareMode) {
        const transform = paneTransform(state.activePane);
        state.originX = transform.x;
        state.originY = transform.y;
      } else {
        state.originX = state.x;
        state.originY = state.y;
      }
      stage.classList.add("dragging");
      stage.setPointerCapture?.(event.pointerId);
      return;
    }

    const info = getActiveSeries();
    const stack = getFrameStack(info?.key);
    const currentSlice = info?.sliceNumber || stack?.currentSlice;
    if (!Number.isFinite(currentSlice)) return;
    state.sliceScrubbing = true;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.scrubOriginSlice = currentSlice;
    state.scrubLastSlice = currentSlice;
    stage.classList.add("slicing");
    stage.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (state.sliceScrubbing) {
      const offset = Math.round((event.clientY - state.startY) / SLICE_SCRUB_PX);
      const targetSlice = state.scrubOriginSlice + offset;
      if (Number.isFinite(targetSlice) && targetSlice !== state.scrubLastSlice) {
        const direction = Math.sign(targetSlice - state.scrubLastSlice) || 1;
        state.scrubLastSlice = targetSlice;
        setSliceNumber(targetSlice, { direction });
      }
      return;
    }

    if (state.windowing) {
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      state.windowContrast = clampDisplayValue(state.windowOriginContrast * Math.exp(dx / 260));
      state.windowBrightness = clampDisplayValue(state.windowOriginBrightness - dy / 260);
      applyTransform();
      return;
    }

    if (!state.dragging) return;
    if (state.compareMode) {
      const transform = paneTransform(state.activePane);
      transform.x = state.originX + event.clientX - state.startX;
      transform.y = state.originY + event.clientY - state.startY;
    } else {
      state.x = state.originX + event.clientX - state.startX;
      state.y = state.originY + event.clientY - state.startY;
    }
    applyTransform();
  }

  function onPointerUp(event) {
    const stage = event.currentTarget;
    state.sliceScrubbing = false;
    state.windowing = false;
    state.dragging = false;
    state.scrubOriginSlice = null;
    state.scrubLastSlice = null;
    stage.classList.remove("slicing");
    stage.classList.remove("windowing");
    stage.classList.remove("dragging");
    stage.releasePointerCapture?.(event.pointerId);
  }

  function performShortcutAction(actionId) {
    if (actionId === "close") closeViewer();
    else if (actionId === "previousSeries") activateRelativeSeries(-1);
    else if (actionId === "nextSeries") activateRelativeSeries(1);
    else if (actionId === "previousSlice") scrollStack(-1);
    else if (actionId === "nextSlice") scrollStack(1);
    else if (actionId === "zoomIn") zoomBy(1.2);
    else if (actionId === "zoomOut") zoomBy(1 / 1.2);
    else if (actionId === "resetView") resetView();
    else if (actionId === "resetWindow") resetWindowing();
    else if (actionId === "invert") toggleInvert();
    else if (actionId === "sync") syncFromPage({ preferVisible: true });
    else if (actionId === "toggleDefaultDrag") toggleDefaultDragMode();
  }

  async function handleKeydown(event) {
    const key = normalizeShortcutKey(event.key);
    if (key) state.pressedKeys.add(key);

    if (await assignShortcutFromEvent(event)) return;
    if (state.suppressOwnKeyCapture) return;
    if (!state.open) return;
    if (isEditableTarget(event.target)) return;
    if (key === "Escape" && state.imageFullscreen) {
      event.preventDefault();
      event.stopPropagation();
      exitImageFullscreen();
      return;
    }

    for (const [actionId] of SHORTCUT_ACTIONS) {
      if (!shortcutMatches(event, actionId)) continue;
      event.preventDefault();
      event.stopPropagation();
      if (actionId === "panDrag" || actionId === "windowDrag") return;
      performShortcutAction(actionId);
      return;
    }
  }

  function handleKeyup(event) {
    const key = normalizeShortcutKey(event.key);
    if (key) state.pressedKeys.delete(key);
  }

  function scheduleRefresh() {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = window.setTimeout(() => {
      const previousUrl = state.imageUrl;
      syncFromPage();
      if (state.open && !state.compareMode && state.imageUrl !== previousUrl) resetView();
    }, REFRESH_DELAY_MS);
  }

  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      if (!mutations.some((mutation) =>
        mutation.type === "attributes" ||
        Array.from(mutation.addedNodes || []).some((node) => node.nodeType === Node.ELEMENT_NODE)
      )) {
        return;
      }
      scheduleRefresh();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "class", "style", "data-test-scroll-position", "data-series-id"]
    });
  }

  function init() {
    if (!isRadiopaediaCasePage()) return;
    ensureLauncher();
    loadShortcutSettings();
    collectSeries();
    startObserver();
    document.addEventListener(BRIDGE_RESPONSE_EVENT, onBridgeResponse);
    document.addEventListener("keydown", handleKeydown, true);
    document.addEventListener("keyup", handleKeyup, true);
    document.addEventListener("fullscreenchange", () => {
      const host = document.getElementById(HOST_ID);
      if (state.imageFullscreen && document.fullscreenElement !== host) {
        exitImageFullscreen({ skipDocumentExit: true });
      }
    });
    window.addEventListener("blur", () => state.pressedKeys.clear());
    refreshFromBridge({ preferVisible: true });
    window.setTimeout(() => {
      ensureLauncher();
      collectSeries();
      refreshFromBridge({ preferVisible: true });
    }, 1500);
  }

  init();
})();
