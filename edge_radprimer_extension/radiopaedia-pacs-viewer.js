(() => {
  if (window.__radiopaediaPacsViewerInstalled) return;
  window.__radiopaediaPacsViewerInstalled = true;

  const HOST_ID = "radiopaedia-pacs-viewer-host";
  const LAUNCHER_ID = "radiopaedia-pacs-viewer-launcher";
  const REFRESH_DELAY_MS = 120;
  const SYNC_DELAYS = [70, 180, 360, 700];
  const BRIDGE_REQUEST_EVENT = "radiopaedia-pacs-bridge-request";
  const BRIDGE_RESPONSE_EVENT = "radiopaedia-pacs-bridge-response";
  const BRIDGE_TIMEOUT_MS = 900;

  const state = {
    open: false,
    series: [],
    activeKey: "",
    imageUrl: "",
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    frameStacks: new Map(),
    bridgeSeries: [],
    bridgeSeq: 0,
    bridgeRequests: new Map(),
    bridgeStatus: "pending",
    bridgeError: "",
    bridgeApiUrl: "",
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
      state.series = series;
      return series;
    }

    const series = domSeries;
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
    const pieces = [info.modality, info.label, sliceText(info)];
    const progress = getStackProgress(info);
    if (progress) pieces.push(progress);
    if (info.viewport) pieces.push(info.viewport);
    if (!info.visible) pieces.push("snapshot");
    return pieces.filter(Boolean).join(" | ");
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
    if (state.open && info) setImage(info, { resetView: Boolean(options.resetView) });
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
        .tools .wide {
          width: auto;
          padding: 0 10px;
        }
        .tools .slice-step {
          min-width: 58px;
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
        .stage img {
          position: absolute;
          inset: 0;
          margin: auto;
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          transform-origin: center center;
          user-select: none;
          -webkit-user-drag: none;
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
        }
      </style>
      <div class="shell" role="dialog" aria-modal="true" aria-label="Radiopaedia PACS viewer">
        <aside class="sidebar">
          <div class="side-head">
            <strong>Radiopaedia PACS</strong>
            <span>Click a sequence, then scroll the stack in the main pane.</span>
          </div>
          <div class="sequence-list"></div>
          <div class="side-foot">Wheel or up/down scrolls the native Radiopaedia stack and loads slices into this viewer. Ctrl/Alt + wheel zooms. Drag pans.</div>
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
              <button class="sync wide" type="button" title="Sync with the live Radiopaedia viewport">Sync</button>
              <button class="close" type="button" title="Close">x</button>
            </div>
          </div>
          <div class="stage">
            <img alt="Radiopaedia image">
            <div class="empty" hidden>No rendered Radiopaedia image detected yet.</div>
          </div>
          <div class="footer">
            <span class="hint">Mouse wheel/up/down: slices. Ctrl/Alt + wheel: zoom. Drag: pan. Double-click: zoom toggle.</span>
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
    shadow.querySelector(".sync").addEventListener("click", () => syncFromPage({ preferVisible: true }));

    const stage = shadow.querySelector(".stage");
    stage.addEventListener("wheel", onStageWheel, { passive: false });
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    stage.addEventListener("dblclick", () => {
      if (state.scale < 1.8) {
        state.scale = 2.5;
        applyTransform();
      } else {
        resetView();
      }
    });

    document.documentElement.appendChild(host);
    return host;
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
      button.classList.toggle("active", info.key === state.activeKey);
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
      sub.textContent = [sliceText(info), getStackProgress(info), info.viewport, info.visible ? "" : "snapshot"]
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
    const title = shadow.querySelector(".title");
    const subtitle = shadow.querySelector(".subtitle");
    const scale = shadow.querySelector(".scale");
    const bridge = shadow.querySelector(".bridge");
    if (title) title.textContent = info ? `${info.label} - ${sliceText(info)}` : "No sequence selected";
    if (subtitle) subtitle.textContent = statusText(info);
    if (scale) scale.textContent = `${Math.round(state.scale * 100)}%`;
    if (bridge) {
      bridge.textContent = bridgeStatusText();
      bridge.title = state.bridgeStatus === "connected"
        ? state.bridgeApiUrl || "Radiopaedia viewport bridge connected"
        : state.bridgeError || "Radiopaedia viewport bridge pending";
    }
  }

  function setImage(info, options = {}) {
    if (!info?.imageUrl) return false;
    rememberFrame(info);
    const host = ensureHost();
    const shadow = host.shadowRoot;
    const img = shadow.querySelector(".stage img");
    const empty = shadow.querySelector(".empty");
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
    renderSequenceList();
    updateStatus(info);
    return true;
  }

  function showEmpty() {
    const host = ensureHost();
    const shadow = host.shadowRoot;
    const img = shadow.querySelector(".stage img");
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
    const info = chooseInitialSeries();
    renderSequenceList();
    if (info) setImage(info, { resetView: true });
    else showEmpty();
    refreshFromBridge({ preferVisible: true, resetView: false });
  }

  function closeViewer() {
    const host = document.getElementById(HOST_ID);
    if (host) host.style.display = "none";
    state.open = false;
    state.dragging = false;
  }

  function activateSeries(key, options = {}) {
    collectSeries();
    const info = state.series.find((item) => item.key === key);
    if (!info) return false;
    const didSet = setImage(info, options);
    if (didSet && info.bridgeAvailable) {
      setBridgeFrame(info, info.sliceNumber || 1);
    }
    return didSet;
  }

  function activateRelativeSeries(delta) {
    collectSeries();
    if (!state.series.length) return;
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

  function getNextSliceNumber(info, direction) {
    const stack = getFrameStack(info?.key);
    const current = stack?.currentSlice || info?.sliceNumber;
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

  function setBridgeFrame(info, sliceNumber) {
    if (!info?.bridgeAvailable || !Number.isFinite(sliceNumber)) return Promise.resolve(false);
    const frameIdx = Math.max(0, sliceNumber - 1);
    return requestBridge("set-frame", {
      seriesId: info.seriesId || info.key,
      frameIdx
    }).then((response) => {
      setBridgeStatus(response, "Could not set Radiopaedia frame");
      if (!response?.ok || !applyBridgeState(response.state)) {
        updateStatus(getActiveSeries());
        return false;
      }
      const synced = state.series.find((item) => item.key === info.key) ||
        state.series.find((item) => String(item.seriesId) === String(info.seriesId)) ||
        selectInfoAfterSync();
      renderSyncedInfo(synced, { resetView: false });
      return true;
    });
  }

  function scrollStack(direction) {
    collectSeries();
    const info = getActiveSeries();
    if (!info) return false;

    const nextSlice = getNextSliceNumber(info, direction);
    const cached = getCachedFrame(info, nextSlice);
    if (cached && cached.imageUrl !== state.imageUrl) {
      setImage(cached, { resetView: false });
    }

    if (info.bridgeAvailable) {
      setBridgeFrame(info, nextSlice).then((ok) => {
        if (!ok && !cached) driveNativeStack(direction);
      });
      return true;
    }

    const droveNativeStack = driveNativeStack(direction);
    return droveNativeStack || Boolean(cached);
  }

  function onStageWheel(event) {
    event.preventDefault();
    if (event.ctrlKey || event.altKey || event.metaKey) {
      zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15);
      return;
    }
    if (event.deltaY !== 0) scrollStack(event.deltaY > 0 ? 1 : -1);
  }

  function zoomBy(multiplier) {
    state.scale = Math.max(0.25, Math.min(12, state.scale * multiplier));
    applyTransform();
  }

  function resetView() {
    state.scale = 1;
    state.x = 0;
    state.y = 0;
    applyTransform();
  }

  function applyTransform() {
    const img = document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".stage img");
    if (!img) return;
    img.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    updateStatus(getActiveSeries());
  }

  function pointerInsideImage(event) {
    const img = document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".stage img");
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
    if (!pointerInsideImage(event)) return;
    const stage = event.currentTarget;
    state.dragging = true;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.originX = state.x;
    state.originY = state.y;
    stage.classList.add("dragging");
    stage.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!state.dragging) return;
    state.x = state.originX + event.clientX - state.startX;
    state.y = state.originY + event.clientY - state.startY;
    applyTransform();
  }

  function onPointerUp(event) {
    const stage = event.currentTarget;
    state.dragging = false;
    stage.classList.remove("dragging");
    stage.releasePointerCapture?.(event.pointerId);
  }

  function handleKeydown(event) {
    if (state.suppressOwnKeyCapture) return;
    if (!state.open) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

    const key = event.key;
    const handledKeys = [
      "Escape",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      " ",
      "+",
      "=",
      "-",
      "_",
      "0",
      "f",
      "F"
    ];
    if (!handledKeys.includes(key)) return;

    event.preventDefault();
    event.stopPropagation();

    if (key === "Escape") closeViewer();
    else if (key === "ArrowLeft") activateRelativeSeries(-1);
    else if (key === "ArrowRight") activateRelativeSeries(1);
    else if (key === "ArrowUp" || key === "PageUp") scrollStack(-1);
    else if (key === "ArrowDown" || key === "PageDown" || key === " ") scrollStack(1);
    else if (key === "+" || key === "=") zoomBy(1.2);
    else if (key === "-" || key === "_") zoomBy(1 / 1.2);
    else if (key === "0" || key === "f" || key === "F") resetView();
  }

  function scheduleRefresh() {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = window.setTimeout(() => {
      const previousUrl = state.imageUrl;
      syncFromPage();
      if (state.open && state.imageUrl !== previousUrl) resetView();
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
    collectSeries();
    startObserver();
    document.addEventListener(BRIDGE_RESPONSE_EVENT, onBridgeResponse);
    document.addEventListener("keydown", handleKeydown, true);
    refreshFromBridge({ preferVisible: true });
    window.setTimeout(() => {
      ensureLauncher();
      collectSeries();
      refreshFromBridge({ preferVisible: true });
    }, 1500);
  }

  init();
})();
