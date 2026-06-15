(() => {
  if (window.__IMAIOS_CINE_TOOLS_LOADED__) return;
  window.__IMAIOS_CINE_TOOLS_LOADED__ = true;

  const APP_ID = "imaios-cine-tools";
  const PAGE_STORAGE_KEY = `${APP_ID}:page:${location.origin}${location.pathname}`;
  const PREFS_STORAGE_KEY = `${APP_ID}:prefs`;
  const CHUNK_LIBRARY_STORAGE_KEY = `${APP_ID}:chunk-library`;
  const LABEL_REPOSITORY_STORAGE_KEY = `${APP_ID}:label-repository`;
  const EXTENSION_LABEL_REPOSITORY_STORAGE_KEY = "imaios-cine-tools:label-repository";
  const EMPTY_CHUNK_LIBRARY = { version: 1, topic: "", chunks: [] };
  const EMPTY_LABEL_REPOSITORY = { version: 1, updatedAt: "", modalities: [], labels: [], moduleLabels: {} };
  const CINE_SPEED_MIN = 1;
  const CINE_SPEED_MAX = 20;
  const DEFAULT_CINE_SPEED = 5;
  const REVERSE_SCROLL_STORAGE_KEY = "im_viewer-reverse-scroll";
  const HOTKEY_ACTIONS = [
    { id: "pingpong", label: "Cine ping-pong" },
    { id: "cineBackward", label: "Cine backward" },
    { id: "cineForward", label: "Cine forward" },
    { id: "speedDown", label: "Speed down" },
    { id: "speedUp", label: "Speed up" },
    { id: "applyChunk", label: "Apply chunk" },
    { id: "pinsOn", label: "Show pins" },
    { id: "labelsOn", label: "Show labels" },
    { id: "selectAll", label: "Select all labels" },
    { id: "reverseScroll", label: "Reverse scroll" },
    { id: "clearLocked", label: "Clear locked" },
    { id: "axial", label: "Axial plane" },
    { id: "coronal", label: "Coronal plane" },
    { id: "sagittal", label: "Sagittal plane" },
    { id: "series1", label: "Series slot 1" },
    { id: "series2", label: "Series slot 2" },
    { id: "series3", label: "Series slot 3" },
    { id: "series4", label: "Series slot 4" },
    { id: "series5", label: "Series slot 5" },
    { id: "series6", label: "Series slot 6" },
    { id: "series7", label: "Series slot 7" },
    { id: "series8", label: "Series slot 8" },
    { id: "series9", label: "Series slot 9" },
    { id: "togglePanel", label: "Panel" },
    { id: "toggleBoxes", label: "Boxes" }
  ];
  const DEFAULT_HOTKEYS = {
    pingpong: { code: "Space", key: " ", alt: false, ctrl: false, meta: false, shift: false },
    cineBackward: { code: "BracketLeft", key: "[", alt: false, ctrl: false, meta: false, shift: false },
    cineForward: { code: "BracketRight", key: "]", alt: false, ctrl: false, meta: false, shift: false },
    speedDown: { code: "Minus", key: "-", alt: false, ctrl: false, meta: false, shift: false },
    speedUp: { code: "Equal", key: "=", alt: false, ctrl: false, meta: false, shift: false },
    applyChunk: { code: "Enter", key: "Enter", alt: true, ctrl: false, meta: false, shift: false },
    pinsOn: { code: "KeyP", key: "p", alt: false, ctrl: false, meta: false, shift: false },
    labelsOn: { code: "KeyL", key: "l", alt: false, ctrl: false, meta: false, shift: false },
    selectAll: { code: "KeyA", key: "a", alt: true, ctrl: false, meta: false, shift: false },
    reverseScroll: { code: "KeyI", key: "i", alt: false, ctrl: false, meta: false, shift: false },
    clearLocked: { code: "Delete", key: "Delete", alt: true, ctrl: false, meta: false, shift: false },
    axial: { code: "Digit1", key: "1", alt: false, ctrl: false, meta: false, shift: false },
    coronal: { code: "Digit2", key: "2", alt: false, ctrl: false, meta: false, shift: false },
    sagittal: { code: "Digit3", key: "3", alt: false, ctrl: false, meta: false, shift: false },
    series1: { code: "Digit1", key: "1", alt: true, ctrl: false, meta: false, shift: false },
    series2: { code: "Digit2", key: "2", alt: true, ctrl: false, meta: false, shift: false },
    series3: { code: "Digit3", key: "3", alt: true, ctrl: false, meta: false, shift: false },
    series4: { code: "Digit4", key: "4", alt: true, ctrl: false, meta: false, shift: false },
    series5: { code: "Digit5", key: "5", alt: true, ctrl: false, meta: false, shift: false },
    series6: { code: "Digit6", key: "6", alt: true, ctrl: false, meta: false, shift: false },
    series7: { code: "Digit7", key: "7", alt: true, ctrl: false, meta: false, shift: false },
    series8: { code: "Digit8", key: "8", alt: true, ctrl: false, meta: false, shift: false },
    series9: { code: "Digit9", key: "9", alt: true, ctrl: false, meta: false, shift: false },
    togglePanel: { code: "KeyI", key: "i", alt: true, ctrl: false, meta: false, shift: false },
    toggleBoxes: { code: "KeyB", key: "b", alt: true, ctrl: false, meta: false, shift: false }
  };
  const state = {
    selectedStructures: [],
    customListText: "",
    boxes: [],
    boxesVisible: true,
    host: null,
    shadow: null,
    panelPosition: { left: 18, top: 112 },
    collapsed: false,
    searchRunning: false,
    cancelSearch: false,
    statusTimer: 0,
    rangeCineTimer: 0,
    rangeCineRunning: false,
    rangeCineBusy: false,
    rangeCineCurrent: null,
    rangeCineDirection: 1,
    rangeCineMode: "pingpong",
    rangeCineSpeed: DEFAULT_CINE_SPEED,
    rangeCineIntervalMs: cineSpeedToIntervalMs(DEFAULT_CINE_SPEED),
    chunkLibrary: { ...EMPTY_CHUNK_LIBRARY },
    activeChunkId: "",
    labelRepository: { ...EMPTY_LABEL_REPOSITORY },
    applyChunkClearFirst: true,
    hotkeys: createDefaultHotkeys(),
    keyEditorOpen: false,
    captureHotkeyAction: "",
    reverseScrollWatchTimer: 0,
    lastReverseScrollPlane: ""
  };

  async function init() {
    const viewerReady = await waitFor(() => shouldMountOnThisPage(), 12000, 250);
    if (!viewerReady) return;

    loadSavedState();
    syncLabelRepositoryToExtensionStorage();
    mount();
    refreshPanel();
    window.addEventListener("fullscreenchange", remount);
    window.addEventListener("resize", keepPanelInViewport);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    syncReverseScrollForCurrentPlane().catch(() => {});
    state.reverseScrollWatchTimer = window.setInterval(() => {
      syncReverseScrollForCurrentPlane().catch(() => {});
    }, 1400);
  }

  function loadSavedState() {
    try {
      const page = JSON.parse(localStorage.getItem(PAGE_STORAGE_KEY) || "{}");
      const prefs = JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY) || "{}");
      if (Array.isArray(page.boxes)) state.boxes = page.boxes;
      if (Array.isArray(page.selectedStructures)) state.selectedStructures = page.selectedStructures;
      if (typeof page.customListText === "string") state.customListText = page.customListText;
      if (typeof page.boxesVisible === "boolean") state.boxesVisible = page.boxesVisible;
      if (typeof page.collapsed === "boolean") state.collapsed = page.collapsed;
      if (prefs.panelPosition && Number.isFinite(prefs.panelPosition.left) && Number.isFinite(prefs.panelPosition.top)) {
        state.panelPosition = prefs.panelPosition;
      }
      if (Number.isFinite(prefs.rangeCineSpeed)) {
        setCineSpeed(prefs.rangeCineSpeed, { save: false, refresh: false });
      }
      if (prefs.hotkeys && typeof prefs.hotkeys === "object") {
        state.hotkeys = mergeHotkeys(prefs.hotkeys);
      }
      if (typeof prefs.applyChunkClearFirst === "boolean") {
        state.applyChunkClearFirst = prefs.applyChunkClearFirst;
      }
      state.chunkLibrary = normalizeImportedChunkLibrary(JSON.parse(localStorage.getItem(CHUNK_LIBRARY_STORAGE_KEY) || "null"));
      state.labelRepository = normalizeImportedLabelRepository(JSON.parse(localStorage.getItem(LABEL_REPOSITORY_STORAGE_KEY) || "null"));
      if (page.activeChunkId && getChunkById(page.activeChunkId)) state.activeChunkId = page.activeChunkId;
    } catch (error) {
      console.warn("IMAIOS Cine Tools: could not load saved state", error);
    }
  }

  function savePageState() {
    try {
      localStorage.setItem(PAGE_STORAGE_KEY, JSON.stringify({
        activeChunkId: state.activeChunkId,
        selectedStructures: state.selectedStructures,
        customListText: state.customListText,
        boxes: state.boxes,
        boxesVisible: state.boxesVisible,
        collapsed: state.collapsed
      }));
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({
        panelPosition: state.panelPosition,
        rangeCineSpeed: state.rangeCineSpeed,
        applyChunkClearFirst: state.applyChunkClearFirst,
        hotkeys: state.hotkeys
      }));
    } catch (error) {
      console.warn("IMAIOS Cine Tools: could not save state", error);
    }
  }

  function mount() {
    if (state.host && state.host.isConnected) return;
    state.host = document.createElement("div");
    state.host.id = `${APP_ID}-host`;
    state.host.style.cssText = [
      "all:initial",
      "position:fixed",
      "inset:0",
      "width:0",
      "height:0",
      "z-index:2147483647",
      "pointer-events:none"
    ].join(";");
    state.shadow = state.host.attachShadow({ mode: "open" });
    state.shadow.innerHTML = buildMarkup();
    getMountRoot().appendChild(state.host);
    bindPanelEvents();
    renderBoxes();
  }

  function remount() {
    if (!state.host) return;
    getMountRoot().appendChild(state.host);
    keepPanelInViewport();
  }

  function getMountRoot() {
    return document.fullscreenElement || document.body || document.documentElement;
  }

  function shouldMountOnThisPage() {
    if (/\/e-anatomy\/anatomical-structures\//i.test(location.pathname)) return false;
    return Boolean(findModuleSearchInput() || document.querySelector("#anatomy-canvas,.viewer,[data-name='image-canvas']"));
  }

  function buildMarkup() {
    const chunkOptions = buildChunkOptions();
    const chunkModuleOptions = buildChunkModuleOptions();
    const hotkeyRows = HOTKEY_ACTIONS.map((action) => `
      <div class="key-row">
        <span>${escapeHtml(action.label)}</span>
        <button type="button" data-hotkey-action="${escapeHtml(action.id)}"></button>
      </div>
    `).join("");

    return `
      <style>
        :host {
          color-scheme: dark;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
        }

        .panel {
          position: fixed;
          left: ${state.panelPosition.left}px;
          top: ${state.panelPosition.top}px;
          width: 292px;
          max-width: calc(100vw - 24px);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 8px;
          background: rgba(18, 20, 23, 0.94);
          box-shadow: 0 14px 34px rgba(0,0,0,0.38);
          color: #f5f7fa;
          pointer-events: auto;
          z-index: 2147483647;
          overflow: hidden;
          user-select: none;
        }

        .panel.collapsed {
          width: 178px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 8px 8px 7px 10px;
          background: rgba(255,255,255,0.07);
          cursor: move;
        }

        .title {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0;
          white-space: nowrap;
        }

        .controls {
          display: grid;
          gap: 10px;
          padding: 10px;
          max-height: min(720px, calc(100vh - 92px));
          overflow: auto;
        }

        .panel.collapsed .controls {
          display: none;
        }

        .quick-chunk-bar {
          display: grid;
          gap: 5px;
          padding: 8px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.09);
          background: rgba(0,0,0,0.18);
        }

        .quick-chunk-label {
          font-size: 10px;
          line-height: 1.1;
          font-weight: 750;
          text-transform: uppercase;
          color: rgba(245,247,250,0.52);
        }

        .quick-chunk-bar select {
          height: 28px;
          font-size: 11px;
        }

        .row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }

        .row.three {
          grid-template-columns: 1fr 1fr 1fr;
        }

        .row.four {
          grid-template-columns: 1fr 1fr 1fr 1fr;
        }

        select,
        textarea,
        button {
          box-sizing: border-box;
          font: inherit;
        }

        select,
        textarea {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 6px;
          background: #2b2f34;
          color: #f5f7fa;
          outline: none;
        }

        select {
          height: 30px;
          padding: 0 8px;
          font-size: 12px;
        }

        select:focus {
          border-color: rgba(58, 158, 255, 0.86);
          box-shadow: 0 0 0 2px rgba(58, 158, 255, 0.22);
        }

        select option,
        select optgroup {
          background: #25292e;
          color: #f5f7fa;
          font: 12px/1.3 Inter, "Segoe UI", Arial, sans-serif;
        }

        select option:checked {
          background: #1f8ddc;
          color: #ffffff;
        }

        select option:disabled {
          color: rgba(245,247,250,0.56);
        }

        textarea {
          min-height: 74px;
          max-height: 160px;
          resize: vertical;
          padding: 7px 8px;
          font-size: 12px;
          line-height: 1.34;
          user-select: text;
        }

        button {
          min-height: 30px;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 6px;
          background: rgba(255,255,255,0.09);
          color: #f5f7fa;
          cursor: pointer;
          font-size: 12px;
          font-weight: 650;
          letter-spacing: 0;
        }

        button:hover {
          background: rgba(255,255,255,0.15);
        }

        button.primary {
          border-color: rgba(58, 158, 255, 0.72);
          background: rgba(22, 128, 224, 0.88);
        }

        button.primary:hover {
          background: rgba(33, 145, 244, 0.94);
        }

        button.danger {
          border-color: rgba(255, 120, 92, 0.58);
        }

        button.danger:hover {
          background: rgba(180, 58, 44, 0.28);
        }

        .tool-section {
          display: grid;
          gap: 8px;
          padding: 9px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          background: rgba(255,255,255,0.045);
        }

        details.tool-section {
          display: block;
        }

        details.tool-section > *:not(summary) {
          margin-top: 8px;
        }

        summary {
          cursor: pointer;
          font-size: 12px;
          font-weight: 750;
          color: rgba(245,247,250,0.92);
        }

        .section-title {
          font-size: 12px;
          font-weight: 750;
          color: rgba(245,247,250,0.92);
        }

        .section-note {
          font-size: 11px;
          line-height: 1.35;
          color: rgba(245,247,250,0.62);
        }

        .main-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .check-row {
          display: flex;
          align-items: center;
          gap: 7px;
          min-height: 24px;
          font-size: 11px;
          line-height: 1.25;
          color: rgba(245,247,250,0.76);
          user-select: none;
        }

        .check-row input {
          width: 15px;
          height: 15px;
          margin: 0;
          accent-color: #1f8ddc;
        }

        .icon-button {
          width: 28px;
          min-height: 26px;
          padding: 0;
          font-size: 13px;
        }

        .hint,
        .status,
        .selected,
        .chunk-summary,
        .chunk-preview {
          font-size: 11px;
          line-height: 1.35;
          color: rgba(245,247,250,0.74);
        }

        .status {
          min-height: 44px;
          padding: 8px 9px;
          border: 1px solid rgba(77, 154, 220, 0.36);
          border-radius: 8px;
          background: rgba(20, 29, 38, 0.9);
          color: #8fd0ff;
        }

        .selected {
          padding: 6px 7px;
          border-radius: 6px;
          background: rgba(255,255,255,0.06);
          max-height: 56px;
          overflow: auto;
          user-select: text;
        }

        .chunk-summary {
          min-height: 28px;
          max-height: 72px;
          overflow: auto;
          padding: 6px 7px;
          border-radius: 6px;
          background: rgba(60, 132, 94, 0.12);
          user-select: text;
        }

        .chunk-preview {
          display: grid;
          gap: 6px;
          min-height: 74px;
          max-height: 180px;
          overflow: auto;
          padding: 8px 9px;
          border-radius: 7px;
          background: rgba(0,0,0,0.24);
          user-select: text;
        }

        .chunk-preview-title {
          color: #ffffff;
          font-weight: 750;
        }

        .chunk-preview-meta {
          color: rgba(245,247,250,0.58);
        }

        .chunk-preview-list {
          margin: 0;
          padding-left: 16px;
        }

        .chunk-preview-list li {
          margin: 2px 0;
        }

        .support-hidden {
          display: none;
        }

        .speed-row {
          display: grid;
          grid-template-columns: 44px 1fr 44px;
          align-items: center;
          gap: 8px;
        }

        .speed-row label,
        .speed-value {
          font-size: 11px;
          line-height: 1.2;
          color: rgba(245,247,250,0.78);
        }

        .speed-value {
          text-align: right;
          white-space: nowrap;
        }

        input[type="range"] {
          width: 100%;
          accent-color: #1f8ddc;
        }

        .box-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 2147483646;
        }

        .occlusion-box {
          position: fixed;
          min-width: 42px;
          min-height: 30px;
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 6px;
          background: rgba(0,0,0,0.98);
          box-shadow: 0 8px 22px rgba(0,0,0,0.32);
          pointer-events: auto;
          cursor: move;
        }

        .occlusion-box.hidden {
          display: none;
        }

        .occlusion-box::before {
          content: "";
          position: absolute;
          inset: 5px;
          border: 1px dashed rgba(255,255,255,0.12);
          border-radius: 4px;
          pointer-events: none;
        }

        .resize {
          position: absolute;
          width: 16px;
          height: 16px;
          right: 0;
          bottom: 0;
          cursor: nwse-resize;
        }

        .key-modal {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 14px;
          background: rgba(0,0,0,0.42);
          pointer-events: auto;
          z-index: 2147483647;
        }

        .key-modal.hidden {
          display: none;
        }

        .key-dialog {
          width: min(360px, calc(100vw - 28px));
          max-height: calc(100vh - 32px);
          overflow: auto;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 8px;
          background: rgba(24, 27, 31, 0.98);
          box-shadow: 0 18px 42px rgba(0,0,0,0.48);
          color: #f5f7fa;
        }

        .key-header,
        .key-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 9px 10px;
          background: rgba(255,255,255,0.06);
        }

        .key-list {
          display: grid;
          gap: 6px;
          padding: 10px;
        }

        .key-row {
          display: grid;
          grid-template-columns: 1fr 112px;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }

        .key-row button.capturing {
          border-color: rgba(58, 158, 255, 0.82);
          background: rgba(22, 128, 224, 0.88);
        }
      </style>
      <div class="box-layer" data-role="box-layer"></div>
      <section class="panel" data-role="panel" aria-label="IMAIOS cine tools">
        <div class="header" data-role="drag-panel">
          <div class="title">IMAIOS Labels</div>
          <button class="icon-button" type="button" data-action="toggle-panel" title="Minimize panel">-</button>
        </div>
        <div class="quick-chunk-bar">
          <div class="quick-chunk-label">Current chunk</div>
          <select data-role="quick-chunk">${chunkOptions}</select>
        </div>
        <div class="controls">
          <div class="status" data-role="status">Ready.</div>

          <div class="tool-section">
            <div class="section-title">Chunks</div>
            <select data-role="chunk-module">${chunkModuleOptions}</select>
            <select data-role="chunk">${chunkOptions}</select>
            <div class="chunk-preview" data-role="chunk-preview"></div>
            <label class="check-row">
              <input type="checkbox" data-role="apply-clear-first">
              <span>Clear locked before apply</span>
            </label>
            <div class="row">
              <button class="primary" type="button" data-action="apply-chunk">Apply chunk</button>
              <button type="button" data-action="check-chunk">Check chunk</button>
            </div>
            <div class="row three">
              <button type="button" data-action="import-chunks">Import clipboard</button>
              <button type="button" data-action="import-chunk-file">Import file</button>
              <button type="button" data-action="stop-search">Stop</button>
            </div>
            <input class="support-hidden" type="file" accept=".json,application/json" data-role="chunk-file-input">
            <div class="chunk-summary" data-role="chunk-summary"></div>
          </div>

          <details class="tool-section">
            <summary>Label repository</summary>
            <div class="section-note">Harvest search-verifies this module and saves only labels IMAIOS can actually find.</div>
            <div class="main-actions">
              <button class="primary" type="button" data-action="harvest-labels">Harvest labels</button>
              <button class="danger" type="button" data-action="clear-module-labels">Clear cache</button>
            </div>
          </details>

          <details class="tool-section">
            <summary>Manual list</summary>
            <textarea data-role="custom-list" spellcheck="false"></textarea>
            <div class="row">
              <button type="button" data-action="apply-list">Apply list</button>
              <button type="button" data-action="reset-list">Reset list</button>
            </div>
          </details>

          <details class="tool-section">
            <summary>Advanced</summary>
            <div class="row">
              <button type="button" data-action="import-labels">Import labels</button>
              <button type="button" data-action="copy-chunk-template">Template</button>
            </div>
            <div class="row">
              <button type="button" data-action="copy-labels">Copy labels</button>
              <button type="button" data-action="export-label-repo">Export repo</button>
            </div>
            <div class="row">
              <button type="button" data-action="copy-manifest">Copy manifest</button>
              <button type="button" data-action="copy-prompt">Copy prompt</button>
            </div>
            <div class="row">
              <button type="button" data-action="copy-probe">Copy probe</button>
              <button type="button" data-action="copy-slice">Copy slice</button>
            </div>
          </details>

          <details class="tool-section">
            <summary>Cine and boxes</summary>
            <div class="row three">
              <button type="button" data-action="set-pins">Set pins</button>
              <button type="button" data-action="set-labels">Show labels</button>
              <button type="button" data-action="open-key-editor">Keys</button>
            </div>
            <div class="row three">
              <button type="button" data-action="add-box">Add box</button>
              <button type="button" data-action="toggle-boxes">Hide boxes</button>
              <button class="danger" type="button" data-action="clear-boxes">Clear</button>
            </div>
            <div class="row">
              <button type="button" data-action="copy-range">Copy range</button>
              <button type="button" data-action="copy-range-json">Range JSON</button>
            </div>
            <div class="row three">
              <button type="button" data-action="go-range-start">Go start</button>
              <button class="primary" type="button" data-action="play-range">Play range</button>
              <button type="button" data-action="stop-range">Stop cine</button>
            </div>
            <div class="speed-row">
              <label for="${APP_ID}-speed">Speed</label>
              <input id="${APP_ID}-speed" type="range" min="${CINE_SPEED_MIN}" max="${CINE_SPEED_MAX}" step="1" data-role="cine-speed">
              <span class="speed-value" data-role="cine-speed-value"></span>
            </div>
            <div class="hint" data-role="hotkey-hint"></div>
          </details>

          <div class="selected support-hidden" data-role="selected"></div>
        </div>
      </section>
      <div class="key-modal hidden" data-role="key-modal">
        <div class="key-dialog" role="dialog" aria-label="IMAIOS cine shortcuts">
          <div class="key-header">
            <strong>Shortcuts</strong>
            <button class="icon-button" type="button" data-action="close-key-editor" title="Close shortcuts">x</button>
          </div>
          <div class="key-list" data-role="key-list">${hotkeyRows}</div>
          <div class="key-footer">
            <button type="button" data-action="reset-hotkeys">Reset</button>
            <span class="hint">Click an action, then press a key. Esc cancels.</span>
          </div>
        </div>
      </div>
    `;
  }

  function bindPanelEvents() {
    const root = state.shadow;
    root.querySelector("[data-action='toggle-panel']").addEventListener("click", () => {
      state.collapsed = !state.collapsed;
      savePageState();
      refreshPanel();
    });
    root.querySelector("[data-role='custom-list']").addEventListener("input", (event) => {
      state.customListText = event.target.value;
      savePageState();
    });
    root.querySelector("[data-role='chunk']").addEventListener("change", (event) => {
      setActiveChunkId(event.target.value);
    });
    root.querySelector("[data-role='quick-chunk']").addEventListener("change", async (event) => {
      await setActiveChunkIdAndApply(event.target.value);
    });
    root.querySelector("[data-role='chunk-module']").addEventListener("change", (event) => {
      navigateToChunkModule(event.target.value);
    });
    root.querySelector("[data-role='apply-clear-first']").addEventListener("change", (event) => {
      state.applyChunkClearFirst = Boolean(event.target.checked);
      savePageState();
      refreshPanel();
    });
    root.querySelector("[data-action='apply-chunk']").addEventListener("click", applyActiveChunk);
    root.querySelector("[data-action='check-chunk']").addEventListener("click", checkActiveChunk);
    root.querySelector("[data-action='import-chunks']").addEventListener("click", importChunksFromClipboard);
    root.querySelector("[data-action='import-chunk-file']").addEventListener("click", () => {
      const input = root.querySelector("[data-role='chunk-file-input']");
      if (input) input.click();
    });
    root.querySelector("[data-role='chunk-file-input']").addEventListener("change", importChunksFromSelectedFile);
    root.querySelector("[data-action='import-labels']").addEventListener("click", importLabelsFromClipboard);
    root.querySelector("[data-action='copy-chunk-template']").addEventListener("click", copyChunkTemplate);
    root.querySelector("[data-action='harvest-labels']").addEventListener("click", harvestCurrentModuleLabels);
    root.querySelector("[data-action='clear-module-labels']").addEventListener("click", clearCurrentModuleSavedLabels);
    root.querySelector("[data-action='apply-list']").addEventListener("click", () => {
      const names = parseCustomList();
      if (!names.length) {
        setStatus("Add one structure per line first.");
        return;
      }
      applyStructures(names, "Custom list");
    });
    root.querySelector("[data-action='stop-search']").addEventListener("click", () => {
      state.cancelSearch = true;
      setStatus("Stopping after current step.");
    });
    root.querySelector("[data-action='set-pins']").addEventListener("click", async () => {
      const result = await setPinsMode(true);
      setStatus(result.ok ? "Pins mode enabled." : result.reason);
    });
    root.querySelector("[data-action='set-labels']").addEventListener("click", async () => {
      const result = await setPinsMode(false);
      setStatus(result.ok ? "Pins mode disabled." : result.reason);
    });
    root.querySelector("[data-action='open-key-editor']").addEventListener("click", () => {
      state.keyEditorOpen = true;
      state.captureHotkeyAction = "";
      refreshPanel();
    });
    root.querySelector("[data-action='close-key-editor']").addEventListener("click", () => {
      state.keyEditorOpen = false;
      state.captureHotkeyAction = "";
      refreshPanel();
    });
    root.querySelector("[data-action='reset-hotkeys']").addEventListener("click", () => {
      state.hotkeys = createDefaultHotkeys();
      state.captureHotkeyAction = "";
      savePageState();
      refreshPanel();
      setStatus("Shortcuts reset.");
    });
    root.querySelectorAll("[data-hotkey-action]").forEach((button) => {
      button.addEventListener("click", () => {
        state.captureHotkeyAction = button.getAttribute("data-hotkey-action") || "";
        refreshPanel();
      });
    });
    root.querySelector("[data-action='reset-list']").addEventListener("click", () => {
      state.selectedStructures = [];
      savePageState();
      refreshPanel();
      setStatus("Saved review list reset.");
    });
    root.querySelector("[data-action='add-box']").addEventListener("click", addBox);
    root.querySelector("[data-action='toggle-boxes']").addEventListener("click", () => {
      state.boxesVisible = !state.boxesVisible;
      savePageState();
      renderBoxes();
      refreshPanel();
      setStatus(state.boxesVisible ? "Occlusion boxes visible." : "Occlusion boxes hidden.");
    });
    root.querySelector("[data-action='clear-boxes']").addEventListener("click", () => {
      state.boxes = [];
      savePageState();
      renderBoxes();
      setStatus("Occlusion boxes cleared.");
    });
    root.querySelector("[data-action='copy-manifest']").addEventListener("click", copyManifest);
    root.querySelector("[data-action='copy-prompt']").addEventListener("click", copyPrompt);
    root.querySelector("[data-action='copy-labels']").addEventListener("click", copyAvailableLabels);
    root.querySelector("[data-action='export-label-repo']").addEventListener("click", exportLabelRepository);
    root.querySelector("[data-action='copy-probe']").addEventListener("click", copyViewerProbe);
    root.querySelector("[data-action='copy-slice']").addEventListener("click", copySliceProbe);
    root.querySelector("[data-action='copy-range']").addEventListener("click", copyCineRangeText);
    root.querySelector("[data-action='copy-range-json']").addEventListener("click", copyCineRangeJson);
    root.querySelector("[data-action='go-range-start']").addEventListener("click", goToRangeStart);
    root.querySelector("[data-action='play-range']").addEventListener("click", toggleRangeCine);
    root.querySelector("[data-action='stop-range']").addEventListener("click", stopRangeCine);
    root.querySelector("[data-role='cine-speed']").addEventListener("input", (event) => {
      setCineSpeed(parseNumber(event.target.value));
    });
    root.querySelector("[data-role='drag-panel']").addEventListener("pointerdown", startPanelDrag);
  }

  function refreshPanel() {
    const root = state.shadow;
    if (!root) return;
    let chunk = getActiveChunk();
    if (chunk && !chunkMatchesCurrentModule(chunk)) {
      state.activeChunkId = "";
      state.customListText = "";
      state.selectedStructures = [];
      chunk = null;
      savePageState();
    }
    if (!chunk && !state.activeChunkId && Array.isArray(state.chunkLibrary.chunks) && state.chunkLibrary.chunks.length) {
      chunk = selectFirstCurrentModuleChunk();
      if (chunk) savePageState();
    }
    const panel = root.querySelector("[data-role='panel']");
    const chunkModuleSelect = root.querySelector("[data-role='chunk-module']");
    const quickChunkSelect = root.querySelector("[data-role='quick-chunk']");
    const chunkSelect = root.querySelector("[data-role='chunk']");
    const chunkPreview = root.querySelector("[data-role='chunk-preview']");
    const chunkSummary = root.querySelector("[data-role='chunk-summary']");
    const applyClearFirst = root.querySelector("[data-role='apply-clear-first']");
    const customList = root.querySelector("[data-role='custom-list']");
    const selected = root.querySelector("[data-role='selected']");
    const togglePanel = root.querySelector("[data-action='toggle-panel']");
    const toggleBoxes = root.querySelector("[data-action='toggle-boxes']");
    const playRange = root.querySelector("[data-action='play-range']");
    const cineSpeed = root.querySelector("[data-role='cine-speed']");
    const cineSpeedValue = root.querySelector("[data-role='cine-speed-value']");
    const keyModal = root.querySelector("[data-role='key-modal']");
    const hotkeyHint = root.querySelector("[data-role='hotkey-hint']");

    panel.classList.toggle("collapsed", state.collapsed);
    panel.style.left = `${state.panelPosition.left}px`;
    panel.style.top = `${state.panelPosition.top}px`;
    chunkModuleSelect.innerHTML = buildChunkModuleOptions();
    chunkModuleSelect.value = normalizeModuleKey(getCurrentModuleKey());
    quickChunkSelect.innerHTML = buildChunkOptions();
    quickChunkSelect.value = state.activeChunkId;
    chunkSelect.innerHTML = buildChunkOptions();
    chunkSelect.value = state.activeChunkId;
    applyClearFirst.checked = state.applyChunkClearFirst;
    chunkPreview.innerHTML = buildChunkPreviewHtml();
    chunkSummary.textContent = getChunkSummaryText();
    if (!state.customListText && chunk) state.customListText = chunkToPreferredLabelText(chunk);
    customList.value = state.customListText;
    togglePanel.textContent = state.collapsed ? "+" : "-";
    toggleBoxes.textContent = state.boxesVisible ? "Hide boxes" : "Show boxes";
    playRange.textContent = state.rangeCineRunning ? "Pause range" : "Play range";
    cineSpeed.value = String(state.rangeCineSpeed);
    cineSpeedValue.textContent = `${Math.round(1000 / state.rangeCineIntervalMs)} fps`;
    keyModal.classList.toggle("hidden", !state.keyEditorOpen);
    hotkeyHint.textContent = `${formatHotkey(state.hotkeys.pingpong)} ping-pong. ${formatHotkey(state.hotkeys.cineBackward)} backward, ${formatHotkey(state.hotkeys.cineForward)} forward. ${formatHotkey(state.hotkeys.speedDown)}/${formatHotkey(state.hotkeys.speedUp)} speed. ${formatHotkey(state.hotkeys.applyChunk)} apply chunk. ${formatHotkey(state.hotkeys.pinsOn)} pins, ${formatHotkey(state.hotkeys.labelsOn)} labels. ${formatHotkey(state.hotkeys.selectAll)} select all. ${formatHotkey(state.hotkeys.reverseScroll)} reverse scroll. ${formatHotkey(state.hotkeys.clearLocked)} clear locked. ${formatHotkey(state.hotkeys.axial)}/${formatHotkey(state.hotkeys.coronal)}/${formatHotkey(state.hotkeys.sagittal)} planes. ${formatHotkey(state.hotkeys.series1)}-${formatHotkey(state.hotkeys.series9)} series slots.`;
    root.querySelectorAll("[data-hotkey-action]").forEach((button) => {
      const actionId = button.getAttribute("data-hotkey-action") || "";
      button.textContent = state.captureHotkeyAction === actionId ? "Press key..." : formatHotkey(state.hotkeys[actionId]);
      button.classList.toggle("capturing", state.captureHotkeyAction === actionId);
    });

    const chunkNames = chunk ? getChunkLabelTargets(chunk).map((target) => target.preferredLabel) : [];
    const names = state.selectedStructures.length ? state.selectedStructures : chunkNames;
    selected.textContent = names.join(", ");
  }

  function buildChunkModuleOptions() {
    const modules = getChunkModuleEntries();
    if (!modules.length) return `<option value="">No session modules</option>`;
    const currentKey = normalizeModuleKey(getCurrentModuleKey());
    const hasCurrent = modules.some((module) => module.key === currentKey);
    return [
      hasCurrent ? "" : `<option value="">Current module not in session</option>`,
      ...modules.map((module) => {
        const countText = module.chunkCount === 1 ? "1 chunk" : `${module.chunkCount} chunks`;
        const urlText = module.url ? "" : " - no URL";
        return `<option value="${escapeHtml(module.key)}">${escapeHtml(`${module.name} (${countText})${urlText}`)}</option>`;
      })
    ].filter(Boolean).join("");
  }

  function getChunkModuleEntries() {
    const chunks = Array.isArray(state.chunkLibrary.chunks) ? state.chunkLibrary.chunks : [];
    const map = new Map();
    for (const chunk of chunks) {
      const key = getChunkModuleKey(chunk);
      if (!key) continue;
      const existing = map.get(key) || {
        key,
        name: getChunkModuleDisplayName(chunk) || key,
        url: getChunkModuleUrl(chunk),
        chunkCount: 0
      };
      existing.chunkCount += 1;
      if (!existing.url) existing.url = getChunkModuleUrl(chunk);
      if ((!existing.name || existing.name === key) && getChunkModuleDisplayName(chunk)) {
        existing.name = getChunkModuleDisplayName(chunk);
      }
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  function getChunkModuleUrl(chunk) {
    const raw = cleanText(chunk?.modalityUrl || chunk?.moduleUrl || chunk?.targetModuleUrl || chunk?.url || "");
    if (!raw) return "";
    try {
      const parsed = new URL(raw, location.href);
      if (!/imaios\.com$/i.test(parsed.hostname.replace(/^www\./i, ""))) return "";
      return parsed.href;
    } catch (_error) {
      return "";
    }
  }

  function navigateToChunkModule(moduleKey) {
    const key = normalizeModuleKey(moduleKey);
    if (!key) {
      refreshPanel();
      return;
    }
    if (key === normalizeModuleKey(getCurrentModuleKey())) {
      setStatus("Already on this IMaios module.");
      refreshPanel();
      return;
    }
    const moduleEntry = getChunkModuleEntries().find((module) => module.key === key);
    if (!moduleEntry) {
      setStatus("That module is not in this imported chunk session.", 7000);
      refreshPanel();
      return;
    }
    if (!moduleEntry.url) {
      setStatus(`No URL was provided for ${moduleEntry.name}. Ask ChatGPT to include modalityUrl for each chunk.`, 9000);
      refreshPanel();
      return;
    }
    setStatus(`Opening ${moduleEntry.name}...`, 0);
    window.location.assign(moduleEntry.url);
  }

  function buildChunkOptions() {
    const chunks = Array.isArray(state.chunkLibrary.chunks) ? state.chunkLibrary.chunks : [];
    if (!chunks.length) return `<option value="">No imported chunks</option>`;
    const currentModuleKey = getCurrentModuleKey();
    const matching = chunks.filter((chunk) => chunkMatchesCurrentModule(chunk, currentModuleKey));
    if (!matching.length) return `<option value="">No chunks for this module</option>`;
    return [
      `<option value="">Select chunk...</option>`,
      ...matching.map((chunk) => `<option value="${escapeHtml(chunk.id)}">${escapeHtml(chunk.title)}</option>`)
    ].join("");
  }

  function getChunkById(id) {
    const chunks = Array.isArray(state.chunkLibrary.chunks) ? state.chunkLibrary.chunks : [];
    return chunks.find((chunk) => chunk.id === id) || null;
  }

  function getActiveChunk() {
    return getChunkById(state.activeChunkId);
  }

  function setActiveChunkId(chunkId) {
    state.activeChunkId = chunkId || "";
    const chunk = getActiveChunk();
    state.customListText = chunk ? chunkToPreferredLabelText(chunk) : "";
    state.selectedStructures = [];
    savePageState();
    refreshPanel();
  }

  async function setActiveChunkIdAndApply(chunkId) {
    setActiveChunkId(chunkId);
    if (!chunkId) return;
    await delay(50);
    await applyActiveChunk();
  }

  function selectFirstCurrentModuleChunk() {
    const chunks = Array.isArray(state.chunkLibrary.chunks) ? state.chunkLibrary.chunks : [];
    const currentModuleKey = getCurrentModuleKey();
    const matchingChunk = chunks.find((chunk) => chunkMatchesCurrentModule(chunk, currentModuleKey)) || null;
    state.activeChunkId = matchingChunk ? matchingChunk.id : "";
    state.customListText = matchingChunk ? chunkToPreferredLabelText(matchingChunk) : "";
    return matchingChunk;
  }

  function chunkMatchesCurrentModule(chunk, currentModuleKey = getCurrentModuleKey()) {
    const key = getChunkModuleKey(chunk);
    if (!key) return true;
    return normalizeModuleKey(key) === normalizeModuleKey(currentModuleKey);
  }

  function getChunkModuleKey(chunk) {
    const explicit = cleanText(chunk?.moduleKey || chunk?.targetModuleKey || chunk?.imaiosModuleKey || "");
    if (explicit) return normalizeModuleKey(explicit);
    const fromUrl = getModuleKeyFromUrl(chunk?.modalityUrl || chunk?.url || "");
    if (fromUrl) return fromUrl;
    const labelKeys = unique(getChunkLabelTargets(chunk).map((target) => normalizeModuleKey(target.moduleKey)).filter(Boolean));
    if (labelKeys.length === 1) return labelKeys[0];
    return "";
  }

  function getChunkModuleDisplayName(chunk) {
    return cleanText(chunk?.moduleName || chunk?.targetModuleName || chunk?.modality || getChunkModuleKey(chunk) || "");
  }

  function getModuleKeyFromUrl(url) {
    const text = cleanText(url);
    if (!text) return "";
    try {
      const parsed = new URL(text, location.href);
      return getModuleKeyFromPath(parsed.pathname);
    } catch (_error) {
      return "";
    }
  }

  function normalizeModuleKey(value) {
    const text = cleanText(value);
    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return getModuleKeyFromUrl(text);
    if (text.includes("/")) return getModuleKeyFromPath(text);
    return text
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }

  function buildChunkPreviewHtml() {
    const chunks = Array.isArray(state.chunkLibrary.chunks) ? state.chunkLibrary.chunks : [];
    if (!chunks.length) {
      return [
        `<div class="chunk-preview-title">No chunks imported</div>`,
        `<div class="chunk-preview-meta">Import a ChatGPT chunk manifest, then each selected chunk will show its exact label set here before injection.</div>`
      ].join("");
    }

    const chunk = getActiveChunk();
    if (!chunk) {
      const currentModuleKey = getCurrentModuleKey();
      const matching = chunks.filter((item) => chunkMatchesCurrentModule(item, currentModuleKey));
      const otherCount = chunks.length - matching.length;
      const titles = matching.slice(0, 8).map((item) => `<li>${escapeHtml(item.title || item.id)}</li>`).join("");
      const extra = matching.length > 8 ? `<li>...${matching.length - 8} more</li>` : "";
      const list = titles ? `<ol class="chunk-preview-list">${titles}${extra}</ol>` : "";
      return [
        `<div class="chunk-preview-title">${escapeHtml(state.chunkLibrary.topic || "Chunk set loaded")}</div>`,
        `<div class="chunk-preview-meta">${matching.length} chunks available for this module. ${otherCount} chunks belong to other modules.</div>`,
        list || `<div class="chunk-preview-meta">Open a matching IMaios module to use the other chunks.</div>`
      ].join("");
    }

    const targets = getChunkLabelTargets(chunk);
    const unavailable = targets.filter((target) => target.status && !/^(available|matched|verified|selected)$/i.test(target.status));
    const labels = targets.map((target) => `<li>${escapeHtml(target.preferredLabel)}</li>`).join("");
    const modality = chunk.modality ? `Modality: ${escapeHtml(chunk.modality)}. ` : "";
    const moduleMatch = chunkMatchesCurrentModule(chunk);
    const moduleName = getChunkModuleDisplayName(chunk);
    const moduleText = moduleMatch
      ? `Current module match${moduleName ? `: ${escapeHtml(moduleName)}` : ""}. `
      : `Other module${moduleName ? `: ${escapeHtml(moduleName)}` : ""}. Open its module before injecting. `;
    const unavailableText = unavailable.length ? ` ${unavailable.length} flagged for review.` : "";
    return [
      `<div class="chunk-preview-title">${escapeHtml(chunk.title || chunk.id)}</div>`,
      `<div class="chunk-preview-meta">${moduleText}${modality}${targets.length} labels selected.${unavailableText}</div>`,
      labels ? `<ol class="chunk-preview-list">${labels}</ol>` : `<div class="chunk-preview-meta">This chunk has no labels yet.</div>`
    ].join("");
  }

  function getChunkSummaryText() {
    const chunks = Array.isArray(state.chunkLibrary.chunks) ? state.chunkLibrary.chunks : [];
    const moduleInfo = getCurrentModuleInfo();
    const saved = getSavedLabelsForCurrentModule();
    const savedCount = Array.isArray(saved.labels) ? saved.labels.length : 0;
    const currentCount = getAvailableStructureEntries().length;
    const labelStatus = savedCount
      ? `Labels saved for this module: ${savedCount}. Current visible labels: ${currentCount}.`
      : `No saved labels for this module yet. Current visible labels: ${currentCount}.`;
    if (!chunks.length) return `${moduleInfo.name}: ${labelStatus} Import a chunk manifest from clipboard, then select a learning chunk here.`;
    const chunk = getActiveChunk();
    const currentModuleKey = getCurrentModuleKey();
    const currentChunkCount = chunks.filter((item) => chunkMatchesCurrentModule(item, currentModuleKey)).length;
    const otherChunkCount = chunks.length - currentChunkCount;
    if (!chunk) return `${labelStatus} ${currentChunkCount} chunks for this module, ${otherChunkCount} for other modules. Select one to preview.`;
    const labelCount = getChunkLabelTargets(chunk).length;
    const modality = chunk.modality ? `Modality: ${chunk.modality}. ` : "";
    const repoCount = Array.isArray(state.labelRepository.labels) ? state.labelRepository.labels.length : 0;
    const matchText = chunkMatchesCurrentModule(chunk) ? "Chunk matches this module." : "Chunk belongs to another module.";
    return `${labelStatus} ${matchText} ${modality}${labelCount} chunk labels. ${repoCount} global repository labels loaded.`;
  }

  function chunkToPreferredLabelText(chunk) {
    return getChunkLabelTargets(chunk).map((target) => target.preferredLabel).join("\n");
  }

  function parseCustomList() {
    return state.shadow.querySelector("[data-role='custom-list']").value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function applyActiveChunk() {
    const chunk = getActiveChunk();
    if (!chunk) {
      setStatus("Select or import a chunk first.");
      return;
    }
    if (!chunkMatchesCurrentModule(chunk)) {
      const moduleName = getChunkModuleDisplayName(chunk) || getChunkModuleKey(chunk);
      setStatus(`This chunk belongs to ${moduleName || "another IMAIOS module"}. Open that module before injecting.`, 9000);
      return;
    }
    const targets = getChunkLabelTargets(chunk);
    if (!targets.length) {
      setStatus("Selected chunk has no labels.");
      return;
    }
    if (state.applyChunkClearFirst) {
      const clearResult = await clearLockedStructuresForApply();
      if (!clearResult.ok) {
        setStatus(`Could not clear locked structures before applying: ${clearResult.reason}`, 9000);
        return;
      }
      if (clearResult.clearedCount) {
        setStatus(`Cleared ${clearResult.clearedCount} locked structures. Applying chunk...`, 3500);
        await delay(250);
      }
    }
    state.customListText = chunkToPreferredLabelText(chunk);
    state.selectedStructures = targets.map((target) => target.preferredLabel);
    savePageState();
    refreshPanel();
    await applyChunkTargets(targets, chunk.title);
  }

  async function applyChunkTargets(targets, sourceLabel) {
    if (state.searchRunning) {
      setStatus("Search is already running.");
      return;
    }
    state.searchRunning = true;
    state.cancelSearch = false;
    const availableMap = getCurrentAvailableLabelMap();
    const requestedStructures = targets.map((target) => chooseBestChunkLabel(target, availableMap));
    state.selectedStructures = unique(requestedStructures);
    savePageState();
    refreshPanel();

    const primed = await primeModuleSearch();
    if (!primed.ok) {
      setStatus(primed.reason);
      state.searchRunning = false;
      return;
    }

    const appliedNames = [];
    const missedNames = [];
    for (const target of targets) {
      if (state.cancelSearch) break;
      const variants = getChunkLabelVariants(target, availableMap);
      let applied = null;
      for (const variant of variants) {
        setStatus(`Searching ${variant}...`);
        const result = await searchAndClickStructure(variant, { allowFallback: false });
        if (result.ok) {
          applied = variant;
          break;
        }
        await delay(120);
      }
      if (!applied) {
        const fallback = variants[0] || target.preferredLabel;
        const result = await searchAndClickStructure(fallback, { allowFallback: true });
        applied = result.ok ? fallback : null;
      }
      if (applied) {
        appliedNames.push(applied);
        setStatus(`Selected ${applied}.`);
      } else {
        missedNames.push(target.preferredLabel);
        setStatus(`Could not select ${target.preferredLabel}.`);
      }
      await delay(650);
    }

    state.searchRunning = false;
    setStatus("Checking locked structures...");
    await delay(650);
    const locked = countLockedMatches(appliedNames);
    const pinsResult = await setPinsMode(true);
    const pinsSuffix = pinsResult.ok ? " Pins on." : ` ${pinsResult.reason}`;
    const missSuffix = missedNames.length ? ` Missed ${missedNames.length}.` : "";
    const stopSuffix = state.cancelSearch ? " Stopped." : "";
    setStatus(`${sourceLabel}: locked ${locked}/${targets.length}.${missSuffix}${stopSuffix}${pinsSuffix}`, 8000);
  }

  async function applyStructures(structures, sourceLabel) {
    if (state.searchRunning) {
      setStatus("Search is already running.");
      return;
    }
    state.searchRunning = true;
    state.cancelSearch = false;
    const requestedStructures = unique(structures);
    state.selectedStructures = requestedStructures;
    savePageState();
    refreshPanel();

    const primed = await primeModuleSearch();
    if (!primed.ok) {
      setStatus(primed.reason);
      state.searchRunning = false;
      return;
    }

    for (const structure of requestedStructures) {
      if (state.cancelSearch) break;
      setStatus(`Searching ${structure}...`);
      const result = await searchAndClickStructure(structure);
      if (result.ok) {
        setStatus(result.fallback ? `Tried keyboard select for ${structure}.` : `Selected ${structure}.`);
      } else {
        setStatus(result.reason || `Could not select ${structure}.`);
      }
      await delay(650);
    }

    state.searchRunning = false;
    setStatus("Checking locked structures...");
    await delay(650);
    const locked = countLockedMatches(requestedStructures);
    const total = requestedStructures.length;
    const suffix = state.cancelSearch ? " Stopped." : "";
    const pinsResult = await setPinsMode(true);
    const pinsSuffix = pinsResult.ok ? " Pins on." : ` ${pinsResult.reason}`;
    setStatus(`${sourceLabel}: locked ${locked}/${total}.${suffix}${pinsSuffix}`, 7000);
  }

  async function searchAndClickStructure(structureName, options = {}) {
    const availability = await searchStructureAvailability(structureName, {
      timeoutMs: options.timeoutMs || 5200,
      delayMs: options.delayMs
    });
    const input = availability.input;
    if (!availability.ok) {
      if (options.allowFallback === false || !input) return availability;
      pressSearchKey(input, "ArrowDown");
      await delay(120);
      pressSearchKey(input, "Enter");
      return { ok: true, fallback: true };
    }

    input.focus();
    await delay(80);
    clickElement(availability.result);
    return { ok: true, selectedText: availability.selectedText };
  }

  async function searchStructureAvailability(structureName, options = {}) {
    const input = findModuleSearchInput();
    if (!input) {
      return { ok: false, reason: "Open the e-Anatomy viewer first; I could not find 'Search in this module'." };
    }

    await focusModuleSearch(input);
    await clearSearchInput(input);
    await delay(options.clearDelayMs ?? 80);
    await typeSearchValue(input, structureName, { delayMs: options.delayMs ?? 0 });
    await delay(options.afterTypeDelayMs ?? 90);

    const result = await waitFor(() => findSearchResult(structureName, input), options.timeoutMs || 1600, options.intervalMs || 80);
    if (!result) {
      return { ok: false, input, reason: `No search result for ${structureName}.` };
    }

    return {
      ok: true,
      input,
      result,
      selectedText: cleanSearchResultText(result.textContent || structureName) || structureName
    };
  }

  async function primeModuleSearch() {
    const input = findModuleSearchInput();
    if (!input) {
      return { ok: false, reason: "Open the e-Anatomy viewer first; I could not find 'Search in this module'." };
    }

    setStatus("Warming up IMAIOS search...");
    await focusModuleSearch(input);
    await clearSearchInput(input);
    await delay(160);
    await typeSearchValue(input, "zzzz-no-match");
    await delay(260);
    await clearSearchInput(input);
    await delay(420);
    return { ok: true };
  }

  function findModuleSearchInput() {
    const inputs = Array.from(document.querySelectorAll("input, textarea"));
    return inputs.find((input) => (
      /search in this module/i.test(input.getAttribute("placeholder") || "") && isVisible(input)
    ));
  }

  function setInputValue(input, value) {
    const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: value ? "insertText" : "deleteContentBackward",
      data: value
    }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function focusModuleSearch(input) {
    input.scrollIntoView({ block: "nearest", inline: "nearest" });
    input.focus();
    input.click();
    await delay(80);
  }

  async function clearSearchInput(input) {
    input.focus();
    input.dispatchEvent(new KeyboardEvent("keydown", {
      key: "a",
      code: "KeyA",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
      view: window
    }));
    input.dispatchEvent(new KeyboardEvent("keyup", {
      key: "a",
      code: "KeyA",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
      view: window
    }));
    setInputValue(input, "");
    input.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "deleteContentBackward",
      data: null
    }));
    await delay(90);
  }

  async function typeSearchValue(input, value, options = {}) {
    setInputValue(input, "");
    let nextValue = "";
    const delayMs = Number.isFinite(options.delayMs) ? Math.max(0, options.delayMs) : 14;
    for (const character of value) {
      nextValue += character;
      input.dispatchEvent(new KeyboardEvent("keydown", {
        key: character,
        bubbles: true,
        cancelable: true,
        view: window
      }));
      setInputValue(input, nextValue);
      input.dispatchEvent(new KeyboardEvent("keyup", {
        key: character,
        bubbles: true,
        cancelable: true,
        view: window
      }));
      if (delayMs) await delay(delayMs);
    }
  }

  function cleanSearchResultText(text) {
    return cleanText(text)
      .replace(/\s+(definition|related terms|additional terms)$/i, "")
      .trim();
  }

  function findSearchResult(structureName, input) {
    const expected = normalizeText(structureName);
    const inputRect = input.getBoundingClientRect();
    const candidates = Array.from(document.body.querySelectorAll(
      "li.item,.item,button,[role='option'],[role='menuitem'],li,mat-option,div,span"
    ))
      .filter((element) => element !== state.host)
      .filter((element) => isVisible(element))
      .filter((element) => isNearSearchDropdown(element, inputRect))
      .map((element) => ({
        element,
        text: normalizeText(element.textContent || "")
      }))
      .filter((item) => item.text && item.text.length <= 220 && item.text.includes(expected));

    candidates.sort((a, b) => scoreSearchCandidate(b, expected) - scoreSearchCandidate(a, expected));
    return candidates.length ? getSearchResultClickTarget(candidates[0].element, inputRect) : null;
  }

  function scoreSearchCandidate(item, expected) {
    let score = 0;
    if (item.text === expected) score += 30;
    if (/^(li|mat-option)$/i.test(item.element.tagName)) score += 14;
    if (/^(button)$/i.test(item.element.tagName)) score += 8;
    if (item.element.getAttribute("role") === "option") score += 6;
    if (hasClassToken(item.element, "item")) score += 16;
    if (/search|result|option|autocomplete|suggest/i.test(item.element.className || "")) score += 4;
    const rect = item.element.getBoundingClientRect();
    if (rect.height >= 24 && rect.height <= 96) score += 4;
    score -= Math.abs(item.text.length - expected.length) / 20;
    return score;
  }

  function hasClassToken(element, token) {
    return Array.from(element.classList || []).some((className) => className.toLowerCase() === token);
  }

  function isNearSearchDropdown(element, inputRect) {
    const rect = element.getBoundingClientRect();
    const dropdownLeft = inputRect.left - 24;
    const dropdownRight = Math.min(window.innerWidth, inputRect.left + Math.max(inputRect.width + 520, 760));
    const dropdownTop = inputRect.bottom - 8;
    const dropdownBottom = Math.min(window.innerHeight, inputRect.bottom + 560);
    const horizontallyOverlaps = rect.right >= dropdownLeft && rect.left <= dropdownRight;
    const verticallyBelowInput = rect.bottom >= dropdownTop && rect.top <= dropdownBottom;
    return horizontallyOverlaps && verticallyBelowInput;
  }

  function getSearchResultClickTarget(element, inputRect) {
    const selector = "button,[role='option'],[role='menuitem'],li,mat-option,[class*='option'],[class*='result'],[class*='item']";
    let node = element;
    while (node && node !== document.body && node !== document.documentElement) {
      if (node.matches && node.matches(selector) && isVisible(node) && isNearSearchDropdown(node, inputRect)) {
        return node;
      }
      node = node.parentElement;
    }
    return element;
  }

  function clickElement(element) {
    clickElementAt(element, 0.5, 0.5);
  }

  function clickElementAt(element, xRatio, yRatio) {
    element.scrollIntoView({ block: "center", inline: "nearest" });
    const rect = element.getBoundingClientRect();
    const eventInit = {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width * xRatio,
      clientY: rect.top + rect.height * yRatio,
      view: window
    };
    element.dispatchEvent(new PointerEvent("pointerover", eventInit));
    element.dispatchEvent(new MouseEvent("mouseover", eventInit));
    element.dispatchEvent(new PointerEvent("pointermove", eventInit));
    element.dispatchEvent(new MouseEvent("mousemove", eventInit));
    element.dispatchEvent(new PointerEvent("pointerdown", eventInit));
    element.dispatchEvent(new MouseEvent("mousedown", eventInit));
    element.dispatchEvent(new PointerEvent("pointerup", eventInit));
    element.dispatchEvent(new MouseEvent("mouseup", eventInit));
    element.dispatchEvent(new MouseEvent("click", eventInit));
    if (typeof element.click === "function") element.click();
  }

  async function realMouseClick(element, xRatio = 0.5, yRatio = 0.5) {
    element.scrollIntoView({ block: "center", inline: "nearest" });
    await delay(80);
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width * xRatio;
    const y = rect.top + rect.height * yRatio;

    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "IMAIOS_DISPATCH_MOUSE_CLICK",
          x,
          y
        });
        if (response?.ok) return { ok: true, method: "debugger" };
      } catch (error) {
        console.warn("IMAIOS Cine Tools: debugger mouse click failed; falling back to synthetic click", error);
      }
    }

    clickElementAt(element, xRatio, yRatio);
    return { ok: true, method: "synthetic" };
  }

  function pressSearchKey(input, key) {
    const eventBase = {
      key,
      code: key,
      bubbles: true,
      cancelable: true,
      view: window
    };
    input.dispatchEvent(new KeyboardEvent("keydown", eventBase));
    input.dispatchEvent(new KeyboardEvent("keypress", eventBase));
    input.dispatchEvent(new KeyboardEvent("keyup", eventBase));
  }

  function isVisible(element) {
    if (!element || element === document.body || element === document.documentElement) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const style = getComputedStyle(element);
    return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity || 1) > 0.02;
  }

  async function setPinsMode(enabled) {
    let row = findLabelingSettingRow("Pins");
    if (!row) {
      await openLabelingPanel();
      row = await waitFor(() => findLabelingSettingRow("Pins"), 1800, 120);
    }
    if (!row) {
      return { ok: false, reason: "Could not find the Pins toggle." };
    }

    const toggle = findSwitchControl(row);
    const target = findToggleClickTarget(row);
    const current = toggle ? isSwitchOn(toggle) : null;
    if (current === enabled) return { ok: true, changed: false };

    await realMouseClick(target, 0.9, 0.5);
    await delay(350);

    const updatedRow = findLabelingSettingRow("Pins") || row;
    const updatedToggle = findSwitchControl(updatedRow) || toggle;
    const updated = updatedToggle ? isSwitchOn(updatedToggle) : null;
    if (updated === enabled || updated === null) {
      return { ok: true, changed: true, uncertain: updated === null };
    }
    return { ok: false, reason: enabled ? "Pins toggle did not turn on." : "Pins toggle did not turn off." };
  }

  async function toggleSelectAllLabels() {
    let row = findLabelingSettingRow("Select all");
    if (!row) {
      await openLabelingPanel();
      row = await waitFor(() => findLabelingSettingRow("Select all"), 1800, 120);
    }
    if (!row) {
      return { ok: false, reason: "Could not find the Select all option. Open the Anatomical Parts menu once, then press the shortcut again." };
    }

    const toggle = findSwitchControl(row);
    const current = toggle ? isSwitchOn(toggle) : null;
    await realMouseClick(findToggleClickTarget(row), 0.88, 0.5);
    await delay(350);

    const updatedRow = findLabelingSettingRow("Select all") || row;
    const updatedToggle = updatedRow ? findSwitchControl(updatedRow) : toggle;
    const updated = updatedToggle ? isSwitchOn(updatedToggle) : null;
    return {
      ok: true,
      changed: updated === null || current === null ? true : updated !== current,
      enabled: updated === null ? (current === null ? null : !current) : updated,
      uncertain: updated === null
    };
  }

  async function setReverseScrollMode(enabled) {
    const row = findLabelingSettingRow("Reverse scroll");
    const toggle = row ? findSwitchControl(row) : null;
    const target = row ? findToggleClickTarget(row) : null;
    const current = toggle ? isSwitchOn(toggle) : readReverseScrollPreference();
    if (current === enabled) {
      writeReverseScrollPreference(enabled);
      return { ok: true, changed: false, storageOnly: !toggle, enabled };
    }

    if (target && current !== null) {
      await realMouseClick(target, 0.88, 0.5);
      await delay(300);
      const updatedRow = findLabelingSettingRow("Reverse scroll") || row;
      const updatedToggle = updatedRow ? findSwitchControl(updatedRow) : toggle;
      const updated = updatedToggle ? isSwitchOn(updatedToggle) : readReverseScrollPreference();
      if (updated === enabled) {
        writeReverseScrollPreference(enabled);
        return { ok: true, changed: true, storageOnly: false, enabled };
      }
    }

    writeReverseScrollPreference(enabled);
    return { ok: true, changed: current !== enabled, storageOnly: true, enabled };
  }

  async function toggleReverseScrollMode() {
    const row = findLabelingSettingRow("Reverse scroll");
    const toggle = row ? findSwitchControl(row) : null;
    const current = toggle ? isSwitchOn(toggle) : readReverseScrollPreference();
    return setReverseScrollMode(!Boolean(current));
  }

  async function syncReverseScrollForPlane(plane, options = {}) {
    const normalizedPlane = normalizePlaneName(plane);
    if (!normalizedPlane) return { ok: false, reason: "Unknown plane." };
    const enabled = normalizedPlane === "Coronal";
    const result = await setReverseScrollMode(enabled);
    if (result.ok) state.lastReverseScrollPlane = normalizedPlane;
    if (!options.quiet) {
      setStatus(result.ok ? `${normalizedPlane}: reverse scroll ${enabled ? "on" : "off"}.` : result.reason, result.ok ? 3600 : 7000);
    }
    return result;
  }

  async function syncReverseScrollForCurrentPlane() {
    const plane = normalizePlaneName(getSeriesInfo().selectedPlane) || inferSelectedPlaneFromDom();
    if (!plane || plane === state.lastReverseScrollPlane) return;
    await syncReverseScrollForPlane(plane, { quiet: true });
  }

  function readReverseScrollPreference() {
    return parseStorageValue(localStorage.getItem(REVERSE_SCROLL_STORAGE_KEY)) === true;
  }

  function writeReverseScrollPreference(enabled) {
    const oldValue = localStorage.getItem(REVERSE_SCROLL_STORAGE_KEY);
    const newValue = enabled ? "true" : "false";
    if (oldValue !== newValue) {
      localStorage.setItem(REVERSE_SCROLL_STORAGE_KEY, newValue);
    }
    try {
      window.dispatchEvent(new StorageEvent("storage", {
        key: REVERSE_SCROLL_STORAGE_KEY,
        oldValue,
        newValue,
        url: location.href,
        storageArea: localStorage
      }));
    } catch (_error) {
      window.dispatchEvent(new Event("storage"));
    }
    window.dispatchEvent(new CustomEvent("imaios-cine-tools:reverse-scroll-change", {
      detail: { enabled }
    }));
  }

  function findLabelingSettingRow(labelText) {
    const expected = normalizeText(labelText);
    const titledRow = findToggleListItemByTitle(labelText);
    if (titledRow) return titledRow;

    const toggleRows = Array.from(document.body.querySelectorAll(".toggle-item,[class*='toggle-item']"))
      .filter((element) => element !== state.host && isVisible(element))
      .map((toggle) => findSettingRowFromToggle(toggle, expected))
      .filter(Boolean);
    if (toggleRows.length) {
      toggleRows.sort((a, b) => scoreSettingRow(b, expected) - scoreSettingRow(a, expected));
      return toggleRows[0];
    }

    const candidates = Array.from(document.body.querySelectorAll("div,li,button,[role='button']"))
      .filter((element) => element !== state.host && isVisible(element))
      .filter((element) => normalizeText(element.textContent || "").includes(expected))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width >= 140 && rect.width <= Math.max(620, window.innerWidth * 0.45) && rect.height >= 28 && rect.height <= 90;
      });

    candidates.sort((a, b) => scoreSettingRow(b, expected) - scoreSettingRow(a, expected));
    return candidates[0] || null;
  }

  function findToggleListItemByTitle(labelText) {
    const expected = normalizeText(labelText);
    const rows = Array.from(document.body.querySelectorAll("li.list-li.is-toggle[title], li[title].is-toggle, li[title]"))
      .filter((element) => element !== state.host && isVisible(element))
      .filter((element) => element.getAttribute("aria-disabled") !== "true")
      .filter((element) => {
        const title = normalizeText(element.getAttribute("title") || "");
        return title === expected || title.startsWith(`${expected} `) || title.startsWith(`${expected} (`);
      });
    rows.sort((a, b) => scoreSettingRow(b, expected) - scoreSettingRow(a, expected));
    return rows[0] || null;
  }

  function findSettingRowFromToggle(toggle, expected) {
    let node = toggle.parentElement;
    let depth = 0;
    while (node && node !== document.body && node !== document.documentElement && depth < 7) {
      const text = normalizeText(node.textContent || "");
      if (text.includes(expected) && isVisible(node)) {
        return node;
      }
      node = node.parentElement;
      depth += 1;
    }
    return null;
  }

  function scoreSettingRow(element, expected) {
    const text = normalizeText(element.textContent || "");
    const rect = element.getBoundingClientRect();
    let score = 0;
    if (text === expected) score += 24;
    if (text.startsWith(expected)) score += 8;
    if (rect.left > window.innerWidth * 0.45) score += 10;
    if (findSwitchControl(element)) score += 16;
    score -= Math.abs(rect.height - 48) / 8;
    score -= Math.max(0, text.length - expected.length) / 10;
    return score;
  }

  function findSwitchControl(row) {
    const rowRect = row.getBoundingClientRect();
    const exactToggles = Array.from(row.querySelectorAll(".toggle-item,[class*='toggle-item']"))
      .filter((element) => isVisible(element))
      .filter((element) => element.getAttribute("aria-disabled") !== "true");
    if (exactToggles.length) {
      exactToggles.sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right);
      return exactToggles[0];
    }

    const candidates = Array.from(row.querySelectorAll("input,button,[role='switch'],[role='checkbox'],span,div"))
      .filter((element) => isVisible(element))
      .filter((element) => element.getAttribute("aria-disabled") !== "true")
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left > rowRect.left + rowRect.width * 0.55 &&
          rect.width >= 24 &&
          rect.width <= 90 &&
          rect.height >= 14 &&
          rect.height <= 44;
      });

    candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return br.right - ar.right;
    });
    return candidates[0] || null;
  }

  function findToggleClickTarget(row) {
    const titledRow = row.matches && row.matches("li[title].is-toggle, li.list-li.is-toggle[title]") ? row : row.closest("li[title].is-toggle, li.list-li.is-toggle[title]");
    if (titledRow && isVisible(titledRow)) return titledRow;
    return row;
  }

  function isSwitchOn(element) {
    if (element instanceof HTMLInputElement) return element.checked;
    if (hasClassToken(element, "toggle-item")) {
      return hasClassToken(element, "selected");
    }
    const aria = element.getAttribute("aria-checked") || element.getAttribute("aria-pressed");
    if (aria === "true") return true;
    if (aria === "false") return false;

    const classText = String(element.className || "").toLowerCase();
    if (/\b(on|active|checked|selected|enabled)\b/.test(classText)) return true;
    if (/\b(off|inactive|disabled)\b/.test(classText)) return false;

    const style = getComputedStyle(element);
    const colorText = `${style.backgroundColor} ${style.borderColor} ${style.color}`.toLowerCase();
    if (/rgb\(\s*(0|10|14|20|25|30|33|38|45|50)\s*,\s*(120|128|145|150|158|160|170|180|190|200|210)\s*,\s*(210|220|224|230|240|244|255)\s*\)/.test(colorText)) {
      return true;
    }
    return null;
  }

  async function openLabelingPanel() {
    if (findLabelingSettingRow("Pins")) return true;
    const button = findLayerPanelButton();
    if (!button) return false;
    clickElement(button);
    await delay(350);
    return Boolean(findLabelingSettingRow("Pins"));
  }

  function findLayerPanelButton() {
    const candidates = Array.from(document.body.querySelectorAll("button,[role='button'],div"))
      .filter((element) => element !== state.host && isVisible(element))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top > 170 || rect.left < window.innerWidth * 0.52) return false;
        if (rect.width < 36 || rect.width > 110 || rect.height < 36 || rect.height > 110) return false;
        const html = (element.outerHTML || "").slice(0, 1600).toLowerCase();
        return /layer|stack|label|menu|data-name/.test(html) || element.querySelector("svg");
      });

    candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const aScore = (a.querySelector("svg") ? 10 : 0) + (ar.left > window.innerWidth * 0.65 ? 4 : 0);
      const bScore = (b.querySelector("svg") ? 10 : 0) + (br.left > window.innerWidth * 0.65 ? 4 : 0);
      return bScore - aScore;
    });
    return candidates[0] || null;
  }

  function addBox() {
    const box = {
      id: `box-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      left: Math.max(16, Math.round(window.innerWidth * 0.66)),
      top: Math.max(16, Math.round(window.innerHeight * 0.68)),
      width: 280,
      height: 70
    };
    state.boxes.push(box);
    state.boxesVisible = true;
    savePageState();
    renderBoxes();
    refreshPanel();
    setStatus("Drag or resize the new occlusion box.");
  }

  function renderBoxes() {
    if (!state.shadow) return;
    const layer = state.shadow.querySelector("[data-role='box-layer']");
    layer.innerHTML = "";
    for (const box of state.boxes) {
      const element = document.createElement("div");
      element.className = `occlusion-box${state.boxesVisible ? "" : " hidden"}`;
      element.dataset.boxId = box.id;
      element.style.left = `${box.left}px`;
      element.style.top = `${box.top}px`;
      element.style.width = `${box.width}px`;
      element.style.height = `${box.height}px`;

      const resize = document.createElement("div");
      resize.className = "resize";
      resize.dataset.resize = "1";
      element.appendChild(resize);
      element.addEventListener("pointerdown", startBoxDrag);
      layer.appendChild(element);
    }
  }

  function startBoxDrag(event) {
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget;
    const box = state.boxes.find((candidate) => candidate.id === element.dataset.boxId);
    if (!box) return;

    const start = {
      x: event.clientX,
      y: event.clientY,
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      mode: event.target.dataset.resize ? "resize" : "move"
    };

    element.setPointerCapture(event.pointerId);
    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - start.x;
      const dy = moveEvent.clientY - start.y;
      if (start.mode === "resize") {
        box.width = clamp(start.width + dx, 42, window.innerWidth - box.left - 8);
        box.height = clamp(start.height + dy, 30, window.innerHeight - box.top - 8);
      } else {
        box.left = clamp(start.left + dx, 0, window.innerWidth - box.width);
        box.top = clamp(start.top + dy, 0, window.innerHeight - box.height);
      }
      element.style.left = `${box.left}px`;
      element.style.top = `${box.top}px`;
      element.style.width = `${box.width}px`;
      element.style.height = `${box.height}px`;
    };
    const onUp = () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onUp);
      savePageState();
    };
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onUp);
  }

  function startPanelDrag(event) {
    if (event.target.closest("button")) return;
    event.preventDefault();
    const panel = state.shadow.querySelector("[data-role='panel']");
    const start = {
      x: event.clientX,
      y: event.clientY,
      left: state.panelPosition.left,
      top: state.panelPosition.top
    };
    panel.setPointerCapture(event.pointerId);
    const onMove = (moveEvent) => {
      state.panelPosition.left = clamp(start.left + moveEvent.clientX - start.x, 4, window.innerWidth - panel.offsetWidth - 4);
      state.panelPosition.top = clamp(start.top + moveEvent.clientY - start.y, 4, window.innerHeight - panel.offsetHeight - 4);
      panel.style.left = `${state.panelPosition.left}px`;
      panel.style.top = `${state.panelPosition.top}px`;
    };
    const onUp = () => {
      panel.removeEventListener("pointermove", onMove);
      panel.removeEventListener("pointerup", onUp);
      panel.removeEventListener("pointercancel", onUp);
      savePageState();
    };
    panel.addEventListener("pointermove", onMove);
    panel.addEventListener("pointerup", onUp);
    panel.addEventListener("pointercancel", onUp);
  }

  function keepPanelInViewport() {
    const panel = state.shadow && state.shadow.querySelector("[data-role='panel']");
    if (!panel) return;
    state.panelPosition.left = clamp(state.panelPosition.left, 4, Math.max(4, window.innerWidth - panel.offsetWidth - 4));
    state.panelPosition.top = clamp(state.panelPosition.top, 4, Math.max(4, window.innerHeight - panel.offsetHeight - 4));
    panel.style.left = `${state.panelPosition.left}px`;
    panel.style.top = `${state.panelPosition.top}px`;
    savePageState();
  }

  async function copyManifest() {
    const chunk = getActiveChunk();
    const chunkStructures = chunk ? getChunkLabelTargets(chunk).map((target) => target.preferredLabel) : [];
    const requestedStructures = state.selectedStructures.length ? state.selectedStructures : parseCustomList().length ? parseCustomList() : chunkStructures;
    const lockedStructures = getLockedStructureNames();
    const cineRange = getSuggestedCineRange();
    const manifest = {
      kind: "imaios-cine-anki-card",
      pageTitle: document.title,
      url: location.href,
      chunk: chunk ? {
        id: chunk.id,
        title: chunk.title,
        modality: chunk.modality || "",
        modalityUrl: chunk.modalityUrl || ""
      } : null,
      requestedStructures,
      lockedStructures,
      confirmedLockedCount: countLockedMatches(requestedStructures),
      learningFrame: chunk && Array.isArray(chunk.learningFrame) ? chunk.learningFrame : [],
      cineRange,
      cinePlayback: {
        mode: "bounded ping-pong",
        speed: state.rangeCineSpeed,
        intervalMs: state.rangeCineIntervalMs
      },
      capturePlan: {
        front: "Record the IMAIOS cine in Pins mode so only point markers are shown.",
        back: "Record the same cine with Pins off so the labels and leader lines are visible."
      },
      occlusionBoxes: state.boxes.map((box) => ({
        left: Math.round(box.left),
        top: Math.round(box.top),
        width: Math.round(box.width),
        height: Math.round(box.height)
      })),
      createdAt: new Date().toISOString()
    };
    await writeClipboard(JSON.stringify(manifest, null, 2));
    setStatus("Manifest copied.");
  }

  async function copyPrompt() {
    const chunk = getActiveChunk();
    const chunkStructures = chunk ? getChunkLabelTargets(chunk).map((target) => target.preferredLabel) : [];
    const structures = state.selectedStructures.length ? state.selectedStructures : parseCustomList().length ? parseCustomList() : chunkStructures;
    const learningFrame = chunk && Array.isArray(chunk.learningFrame) ? chunk.learningFrame : [];
    const prompt = [
      "Create a compact Anki set for identifying these structures on IMAIOS cine clips:",
      "",
      structures.map((name) => `- ${name}`).join("\n"),
      "",
      learningFrame.length ? "Use this learning framework to group the cards:" : "",
      learningFrame.length ? learningFrame.map((line) => `- ${line}`).join("\n") : "",
      learningFrame.length ? "" : "",
      "Use the clips as the visual prompt. Make cards that test image identification first, then add the minimum anatomy needed to prevent confusion with neighboring muscles.",
      "When the selected chunk supplies a learning framework, create one compact framework card first, then focused identification cards grouped by that framework.",
      "For each structure, include plane-specific recognition cues for axial, coronal, and sagittal review when useful. Include relationships, attachments, and action/innervation only when they help localization or high-yield discrimination.",
      "Avoid pathology framing. Keep the cards anatomy-first and concise.",
      "",
      "Return TSV columns: Front, Back, Extra, Tags."
    ].join("\n");
    await writeClipboard(prompt);
    setStatus("Card prompt copied.");
  }

  async function importChunksFromClipboard() {
    let text = "";
    try {
      text = await readClipboard();
    } catch (error) {
      setStatus("Could not read clipboard for chunks.");
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const result = await importChunkLibraryObject(parsed, { source: "clipboard" });
      setChunkImportStatus(result, "Imported");
    } catch (error) {
      setStatus(`Chunk import failed: ${error.message || error}`);
    }
  }

  async function importChunksFromSelectedFile(event) {
    const input = event.currentTarget;
    const file = input?.files && input.files[0] ? input.files[0] : null;
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = await importChunkLibraryObject(parsed, { source: "file", fileName: file.name });
      setChunkImportStatus(result, "Imported file");
    } catch (error) {
      setStatus(`Chunk file import failed: ${error.message || error}`, 9000);
    } finally {
      if (input) input.value = "";
    }
  }

  async function importChunkLibraryObject(value, options = {}) {
    state.chunkLibrary = normalizeImportedChunkLibrary(value);
    saveChunkLibrary();
    const chunks = state.chunkLibrary.chunks || [];
    const activeChunk = selectFirstCurrentModuleChunk();
    savePageState();
    refreshPanel();
    const backupResult = await backupChunkSessionToDownloads(options.source || "chatgpt");
    return {
      chunkCount: chunks.length,
      currentModuleChunkCount: chunks.filter((chunk) => chunkMatchesCurrentModule(chunk)).length,
      activeChunkId: state.activeChunkId,
      activeChunkTitle: activeChunk ? activeChunk.title : "",
      topic: state.chunkLibrary.topic || "",
      backup: backupResult
    };
  }

  function setChunkImportStatus(result, prefix) {
    const backupText = result.backup?.ok
      ? ` Backup written to ${result.backup.result.downloadFolder}.`
      : ` Backup failed: ${result.backup?.error || "unknown error"}`;
    const availableText = result.activeChunkId ? "." : "; open the matching module to use the rest.";
    setStatus(`${prefix} ${result.chunkCount} chunks. ${result.currentModuleChunkCount} available for this module${availableText}${backupText}`, 12000);
  }

  async function backupChunkSessionToDownloads(source = "") {
    if (!chrome?.runtime?.sendMessage) {
      return { ok: false, error: "Extension messaging is unavailable." };
    }
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: "BACKUP_IMAIOS_CHUNK_SESSION",
        library: state.chunkLibrary,
        topic: state.chunkLibrary.topic || "",
        source,
        page: {
          title: document.title,
          url: location.href,
          module: getCurrentModuleInfo()
        }
      }, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          resolve({ ok: false, error: error.message || String(error) });
          return;
        }
        if (!response?.ok) {
          resolve({ ok: false, error: response?.error || "unknown chunk backup error" });
          return;
        }
        resolve({ ok: true, result: response.result || {} });
      });
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GET_IMAIOS_LABEL_REPOSITORY") {
      sendResponse({
        ok: true,
        repository: state.labelRepository,
        stats: getLabelRepositoryStats(state.labelRepository),
        module: getCurrentModuleInfo()
      });
      return true;
    }

    if (message?.type !== "IMAIOS_IMPORT_CHUNKS") return false;
    (async () => {
      try {
        const result = await importChunkLibraryObject(message.library || message.payload || {}, { source: "chatgpt" });
        const labelExport = buildAvailableLabelsExport();
        let labelSaveResult = { ok: true };
        if (labelExport.labels.length) {
          mergeAvailableLabelsIntoRepository(labelExport);
          labelSaveResult = await saveLabelRepository();
        }
        if (!labelSaveResult.ok) {
          setStatus(`Imported ${result.chunkCount} chunks, but label save failed: ${labelSaveResult.error}`, 9000);
        } else {
          const backupText = result.backup?.ok
            ? ` Backup written to ${result.backup.result.downloadFolder}.`
            : ` Backup failed: ${result.backup?.error || "unknown error"}`;
          setStatus(`Imported ${result.chunkCount} chunks from ChatGPT. Saved ${labelExport.labels.length} module labels.${backupText}`, 12000);
        }
        sendResponse({
          ok: true,
          ...result,
          savedLabelCount: labelExport.labels.length,
          labelSaveOk: labelSaveResult.ok,
          module: labelExport.module,
          error: labelSaveResult.ok ? "" : labelSaveResult.error
        });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true;
  });

  async function importLabelsFromClipboard() {
    let text = "";
    try {
      text = await readClipboard();
    } catch (error) {
      setStatus("Could not read clipboard for labels.");
      return;
    }
    try {
      const parsed = JSON.parse(text);
      if (parsed?.kind === "imaios-available-labels") {
        mergeAvailableLabelsIntoRepository(parsed);
      } else {
        state.labelRepository = normalizeImportedLabelRepository(parsed);
      }
      const saveResult = await saveLabelRepository();
      refreshPanel();
      if (!saveResult.ok) {
        setStatus(`Label import failed while saving: ${saveResult.error}`, 9000);
        return;
      }
      const count = Array.isArray(state.labelRepository.labels) ? state.labelRepository.labels.length : 0;
      const moduleCount = Object.keys(state.labelRepository.moduleLabels || {}).length;
      setStatus(`Imported ${count} repository labels across ${moduleCount} modules.`);
    } catch (error) {
      setStatus(`Label import failed: ${error.message || error}`);
    }
  }

  async function copyChunkTemplate() {
    const template = {
      kind: "imaios-chunk-library",
      version: 1,
      topic: "Temporal Bone Fractures",
      source: "master-source",
      chunks: [
        {
          id: "temporal-bone-fractures-otic-capsule",
          title: "Otic capsule and labyrinth",
          modality: "CT temporal bone",
          modalityUrl: "https://www.imaios.com/en/e-anatomy/head-and-neck/ct-temporal-bone",
          learningOrder: 1,
          labels: [
            {
              preferredLabel: "Otic capsule",
              aliases: ["Bony labyrinth", "Labyrinthine capsule"],
              status: "candidate",
              note: "Verify exact IMAIOS wording in CT temporal bone."
            },
            {
              preferredLabel: "Cochlea",
              aliases: ["Cochlear labyrinth"],
              status: "candidate"
            }
          ],
          learningFrame: [
            "Start with the bony labyrinth and otic capsule because fracture classification depends on whether this region is spared or violated.",
            "Then add adjacent facial nerve, ossicular, and vascular landmarks as separate chunks."
          ]
        }
      ]
    };
    await writeClipboard(JSON.stringify(template, null, 2));
    setStatus("Chunk template copied.");
  }

  async function checkActiveChunk() {
    const chunk = getActiveChunk();
    if (!chunk) {
      setStatus("Select or import a chunk first.");
      return;
    }
    const report = buildChunkCheckReport(chunk);
    await writeClipboard(JSON.stringify(report, null, 2));
    setStatus(`Check copied: ${report.counts.exact} exact, ${report.counts.aliasResolved} alias, ${report.counts.unresolved} unresolved.`);
  }

  function buildChunkCheckReport(chunk) {
    const availableMap = getCurrentAvailableLabelMap();
    const targets = getChunkLabelTargets(chunk);
    const rows = targets.map((target) => {
      const variants = getChunkLabelVariants(target, availableMap);
      const generatedAliases = getGeneratedLabelAliases(target);
      const matched = variants.find((variant) => availableMap.has(normalizeText(variant))) || "";
      const preferredAvailable = availableMap.has(normalizeText(target.preferredLabel));
      const repositoryMatch = findRepositoryLabelForTarget(target);
      return {
        preferredLabel: target.preferredLabel,
        aliases: target.aliases,
        generatedAliases,
        status: preferredAvailable ? "exact" : matched ? "alias-resolved" : repositoryMatch ? "repository-only" : "unresolved",
        selectedLabel: matched || (repositoryMatch ? repositoryMatch.preferredLabel : target.preferredLabel),
        matchedCurrentPageLabel: matched,
        repositoryPreferredLabel: repositoryMatch ? repositoryMatch.preferredLabel : "",
        notes: target.note || ""
      };
    });
    return {
      kind: "imaios-chunk-check",
      createdAt: new Date().toISOString(),
      pageTitle: document.title,
      url: location.href,
      chunk: {
        id: chunk.id,
        title: chunk.title,
        modality: chunk.modality || "",
        modalityUrl: chunk.modalityUrl || ""
      },
      counts: {
        labels: rows.length,
        exact: rows.filter((row) => row.status === "exact").length,
        aliasResolved: rows.filter((row) => row.status === "alias-resolved").length,
        repositoryOnly: rows.filter((row) => row.status === "repository-only").length,
        unresolved: rows.filter((row) => row.status === "unresolved").length
      },
      availableLabelCount: availableMap.size,
      labels: rows
    };
  }

  function normalizeImportedChunkLibrary(value) {
    const source = unwrapChunkLibraryPayload(value);
    const rawChunks = Array.isArray(source)
      ? source
      : source && Array.isArray(source.chunks)
        ? source.chunks
        : [];
    const chunks = rawChunks.map(normalizeChunk).filter(Boolean);
    return {
      version: Number(source && source.version) || 1,
      articleTitle: cleanText(source && (source.articleTitle || source.sourceTitle || source.title || "")),
      topic: cleanText(source && (source.topic || source.articleTitle || source.sourceTitle || source.title || "")),
      source: cleanText(source && source.source || ""),
      unmatchedConcepts: normalizeGapReviewList(source && (source.unmatchedConcepts || source.gapReview || source.needsReview)),
      importedAt: new Date().toISOString(),
      chunks
    };
  }

  function unwrapChunkLibraryPayload(value) {
    if (value?.kind === "imaios-chunk-session-backup" && value.library) return value.library;
    if (value?.library?.kind === "imaios-chunk-library" || Array.isArray(value?.library?.chunks)) return value.library;
    if (value?.payload?.library) return value.payload.library;
    return value;
  }

  function normalizeChunk(value, index) {
    if (!value || typeof value !== "object") return null;
    const title = cleanText(value.title || value.name || value.id || `Chunk ${index + 1}`);
    const id = cleanText(value.id || createSlug(title) || `chunk-${index + 1}`);
    const labels = getRawChunkLabels(value).map(normalizeChunkLabel).filter(Boolean);
    const labelModuleKeys = unique(labels.map((label) => normalizeModuleKey(label.moduleKey)).filter(Boolean));
    return {
      id,
      title,
      parentGroup: cleanText(value.parentGroup || value.group || value.region || ""),
      moduleKey: normalizeModuleKey(value.moduleKey || value.targetModuleKey || value.imaiosModuleKey || value.moduleUrl || value.modalityUrl || value.url || "") || (labelModuleKeys.length === 1 ? labelModuleKeys[0] : ""),
      moduleName: cleanText(value.moduleName || value.targetModuleName || ""),
      modality: cleanText(value.modality || value.imaiosModality || value.module || ""),
      modalityUrl: cleanText(value.modalityUrl || value.url || ""),
      learningOrder: Number(value.learningOrder || value.order || index + 1),
      labels,
      unmatchedConcepts: normalizeGapReviewList(value.unmatchedConcepts || value.gapReview || value.needsReview),
      learningFrame: normalizeStringList(value.learningFrame || value.learningNotes || value.notes),
      source: cleanText(value.source || "")
    };
  }

  function getRawChunkLabels(value) {
    if (Array.isArray(value.labels)) return value.labels;
    if (Array.isArray(value.structures)) return value.structures;
    if (Array.isArray(value.imaiosLabels)) return value.imaiosLabels;
    return [];
  }

  function normalizeChunkLabel(value) {
    if (typeof value === "string") {
      const preferredLabel = cleanText(value);
      return preferredLabel ? { preferredLabel, aliases: [], status: "candidate", note: "" } : null;
    }
    if (!value || typeof value !== "object") return null;
    const preferredLabel = cleanText(value.preferredLabel || value.label || value.name || value.imaiosLabel || "");
    if (!preferredLabel) return null;
    return {
      concept: cleanText(value.concept || value.sourceConcept || value.neededConcept || preferredLabel),
      preferredLabel,
      aliases: normalizeStringList(value.aliases || value.synonyms || value.alternateLabels),
      status: cleanText(value.status || value.matchStatus || "candidate"),
      matchStatus: cleanText(value.matchStatus || value.status || "candidate"),
      moduleKey: cleanText(value.moduleKey || value.module || ""),
      note: cleanText(value.note || value.notes || "")
    };
  }

  function normalizeGapReviewList(value) {
    const rawItems = Array.isArray(value) ? value : value ? [value] : [];
    return rawItems.map((item) => {
      if (typeof item === "string") {
        const concept = cleanText(item);
        return concept ? { concept, tryLabels: [], reason: "" } : null;
      }
      if (!item || typeof item !== "object") return null;
      const concept = cleanText(item.concept || item.needed || item.neededConcept || item.structure || item.label || "");
      if (!concept) return null;
      return {
        concept,
        tryLabels: normalizeStringList(item.tryLabels || item.try_labels || item.candidateLabels || item.suggestions),
        reason: cleanText(item.reason || item.note || item.notes || "")
      };
    }).filter(Boolean);
  }

  function normalizeImportedLabelRepository(value) {
    if (!value || typeof value !== "object") return { ...EMPTY_LABEL_REPOSITORY };
    const rawLabels = Array.isArray(value.labels)
      ? value.labels
      : Array.isArray(value.muscleLikeLabels)
        ? value.muscleLikeLabels
        : [];
    const labels = rawLabels.map((item) => {
      if (typeof item === "string") {
        const preferredLabel = cleanText(item);
        return preferredLabel ? { preferredLabel, aliases: [], modalities: [], regions: [], status: "verified", notes: "" } : null;
      }
      if (!item || typeof item !== "object") return null;
      const preferredLabel = cleanText(item.preferredLabel || item.label || item.name || "");
      if (!preferredLabel) return null;
      return {
        preferredLabel,
        aliases: normalizeStringList(item.aliases || item.synonyms),
        modalities: normalizeStringList(item.modalities || item.modality),
        regions: normalizeStringList(item.regions || item.region),
        status: cleanText(item.status || "verified"),
        notes: cleanText(item.notes || item.note || "")
      };
    }).filter(Boolean);
    return {
      kind: "imaios-label-repository",
      version: Number(value.version) || 1,
      updatedAt: cleanText(value.updatedAt || value.createdAt || new Date().toISOString()),
      modalities: Array.isArray(value.modalities) ? value.modalities : [],
      labels,
      moduleLabels: normalizeModuleLabelMap(value.moduleLabels || value.modules || {})
    };
  }

  function normalizeModuleLabelMap(value) {
    const modules = {};
    if (!value || typeof value !== "object") return modules;
    for (const [key, rawModule] of Object.entries(value)) {
      const moduleKey = cleanText(key);
      if (!moduleKey) continue;
      const rawLabels = Array.isArray(rawModule)
        ? rawModule
        : Array.isArray(rawModule?.labels)
          ? rawModule.labels
          : [];
      modules[moduleKey] = {
        key: moduleKey,
        name: cleanText(rawModule?.name || rawModule?.moduleName || moduleKey),
        url: cleanText(rawModule?.url || ""),
        updatedAt: cleanText(rawModule?.updatedAt || rawModule?.createdAt || ""),
        labels: unique(rawLabels.map((item) => typeof item === "string" ? item : item?.preferredLabel || item?.label || item?.name || ""))
          .sort(compareLabels),
        sourceCounts: rawModule?.sourceCounts && typeof rawModule.sourceCounts === "object" ? rawModule.sourceCounts : {}
      };
    }
    return modules;
  }

  function getChunkLabelTargets(chunk) {
    return Array.isArray(chunk.labels) ? chunk.labels.map(normalizeChunkLabel).filter(Boolean) : [];
  }

  function getChunkLabelVariants(target, availableMap) {
    const repositoryMatch = findRepositoryLabelForTarget(target);
    const variants = [
      repositoryMatch && repositoryMatch.preferredLabel,
      target.preferredLabel,
      ...target.aliases,
      ...getGeneratedLabelAliases(target),
      repositoryMatch && Array.isArray(repositoryMatch.aliases) ? repositoryMatch.aliases : []
    ].flat();
    const normalized = unique(variants
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => cleanText(item)));
    normalized.sort((a, b) => {
      const aAvailable = availableMap.has(normalizeText(a)) ? 1 : 0;
      const bAvailable = availableMap.has(normalizeText(b)) ? 1 : 0;
      return bAvailable - aAvailable;
    });
    return normalized;
  }

  function getGeneratedLabelAliases(target) {
    const source = [
      target && target.preferredLabel,
      ...(Array.isArray(target && target.aliases) ? target.aliases : [])
    ].filter(Boolean).join(" | ");
    const text = normalizeText(source);
    const aliases = [];
    const add = (...items) => aliases.push(...items);

    if (/\bpetrous apex\b/.test(text) || /\bapex of petrous temporal bone\b/.test(text)) {
      add("Apex of petrous part");
    }
    if (/\bmastoid air cells?\b/.test(text)) {
      add("Mastoid cells");
    }
    if (/\bmastoid part\b/.test(text) && /\btemporal bone\b/.test(text)) {
      add("Mastoid process", "Mastoid cells", "Mastoid antrum", "Aditus to mastoid antrum");
    }
    if (/\bpetrous part\b/.test(text) && /\btemporal bone\b/.test(text)) {
      add("Petrous part", "Petrous part of temporal bone");
    }
    if (/\btympanic part\b/.test(text) && /\btemporal bone\b/.test(text)) {
      add("Tympanic part", "Tympanic part of temporal bone");
    }

    return unique(aliases.map(cleanText).filter(Boolean));
  }

  function chooseBestChunkLabel(target, availableMap) {
    return getChunkLabelVariants(target, availableMap)[0] || target.preferredLabel;
  }

  function findRepositoryLabelForTarget(target) {
    const labels = Array.isArray(state.labelRepository.labels) ? state.labelRepository.labels : [];
    const keys = new Set([target.preferredLabel, ...target.aliases].map(normalizeText));
    return labels.find((entry) => {
      const variants = [entry.preferredLabel, ...(Array.isArray(entry.aliases) ? entry.aliases : [])];
      return variants.some((variant) => keys.has(normalizeText(variant)));
    }) || null;
  }

  function getCurrentAvailableLabelMap() {
    const map = new Map();
    const saved = getSavedLabelsForCurrentModule();
    for (const label of saved.labels || []) {
      const key = normalizeText(label);
      if (key && !map.has(key)) map.set(key, label);
    }
    for (const entry of getAvailableStructureEntries()) {
      const key = normalizeText(entry.label);
      if (key && !map.has(key)) map.set(key, entry.label);
    }
    for (const name of getLockedStructureNames()) {
      const key = normalizeText(name);
      if (key && !map.has(key)) map.set(key, name);
    }
    return map;
  }

  function getSavedLabelsForCurrentModule() {
    const moduleKey = getCurrentModuleKey();
    const moduleLabels = state.labelRepository?.moduleLabels || {};
    return moduleLabels[moduleKey] || { key: moduleKey, labels: [] };
  }

  function saveChunkLibrary() {
    try {
      localStorage.setItem(CHUNK_LIBRARY_STORAGE_KEY, JSON.stringify(state.chunkLibrary));
    } catch (error) {
      console.warn("IMAIOS Cine Tools: could not save chunk library", error);
    }
  }

  async function saveLabelRepository() {
    try {
      localStorage.setItem(LABEL_REPOSITORY_STORAGE_KEY, JSON.stringify(state.labelRepository));
      await syncLabelRepositoryToExtensionStorage();
      return { ok: true };
    } catch (error) {
      console.warn("IMAIOS Cine Tools: could not save label repository", error);
      return { ok: false, error: String(error?.message || error) };
    }
  }

  async function syncLabelRepositoryToExtensionStorage() {
    if (!chrome?.storage?.local) return { ok: false, error: "Extension storage is unavailable." };
    const stats = getLabelRepositoryStats(state.labelRepository);
    await chrome.storage.local.set({ [EXTENSION_LABEL_REPOSITORY_STORAGE_KEY]: state.labelRepository });
    return { ok: true, stats };
  }

  function getLabelRepositoryStats(repository) {
    const moduleLabels = repository?.moduleLabels && typeof repository.moduleLabels === "object"
      ? repository.moduleLabels
      : {};
    const moduleCount = Object.values(moduleLabels).filter((module) => Array.isArray(module?.labels) && module.labels.length).length;
    const labelCount = Object.values(moduleLabels)
      .reduce((total, module) => total + (Array.isArray(module?.labels) ? module.labels.length : 0), 0);
    return {
      moduleCount,
      labelCount,
      globalLabelCount: Array.isArray(repository?.labels) ? repository.labels.length : 0
    };
  }

  function normalizeStringList(value) {
    if (Array.isArray(value)) return value.map((item) => cleanText(item)).filter(Boolean);
    if (typeof value === "string") return value.split(/\r?\n|[|;]/).map((item) => cleanText(item)).filter(Boolean);
    return value ? [cleanText(value)].filter(Boolean) : [];
  }

  function createSlug(value) {
    return cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function copyAvailableLabels() {
    const exportData = buildAvailableLabelsExport();
    await writeClipboard(JSON.stringify(exportData, null, 2));
    const muscleSuffix = exportData.muscleLikeLabels.length ? `, ${exportData.muscleLikeLabels.length} muscle-like` : "";
    setStatus(`Copied ${exportData.labels.length} labels${muscleSuffix}.`);
  }

  async function harvestCurrentModuleLabels() {
    await harvestCurrentModuleLabelsBySearchVerification({ dryRun: false });
  }

  async function harvestCurrentModuleLabelsBySearchVerification(options = {}) {
    if (state.searchRunning) {
      setStatus("Search is already running.");
      return null;
    }

    const entries = getPreloadedModuleStructureEntries(getAvailableStructureEntries());
    const candidateLabels = unique(entries.map((entry) => entry.label)).sort(compareLabels);
    if (!candidateLabels.length) {
      setStatus("No module candidate labels found to harvest.", 7000);
      return null;
    }

    const limit = Number.isFinite(options.limit) && options.limit > 0
      ? Math.min(candidateLabels.length, Math.round(options.limit))
      : candidateLabels.length;
    const testedLabels = candidateLabels.slice(0, limit);
    const verified = [];
    const missed = [];
    state.searchRunning = true;
    state.cancelSearch = false;
    state.selectedStructures = testedLabels;
    savePageState();
    refreshPanel();

    const primed = await primeModuleSearch();
    if (!primed.ok) {
      state.searchRunning = false;
      setStatus(primed.reason, 9000);
      return null;
    }

    for (let index = 0; index < testedLabels.length; index += 1) {
      if (state.cancelSearch) break;
      const label = testedLabels[index];
      setStatus(`Harvesting ${index + 1}/${testedLabels.length}: ${label}`, 0);
      const result = await searchStructureAvailability(label, {
        timeoutMs: options.timeoutMs || 1300,
        intervalMs: 70,
        delayMs: 0,
        clearDelayMs: 40,
        afterTypeDelayMs: 70
      });
      if (result.ok) {
        verified.push({
          label: result.selectedText || label,
          candidateLabel: label,
          source: "verified-fast-search-result",
          href: "",
          searchMatched: true,
          lockConfirmed: false,
          matchReason: "exact search result found"
        });
      } else {
        missed.push({ label, reason: result.reason || "no search result" });
      }
      await delay(70);
    }

    state.searchRunning = false;
    const stopped = Boolean(state.cancelSearch);
    state.cancelSearch = false;
    const exportData = buildAvailableLabelsExport(verified, {
      harvest: {
        mode: "verified-fast-search",
        dryRun: Boolean(options.dryRun),
        candidateLabels: candidateLabels.length,
        testedLabels: testedLabels.length,
        verifiedLabels: verified.length,
        missedLabels: missed.length,
        stopped,
        missed
      }
    });

    if (options.dryRun) {
      await writeClipboard(JSON.stringify({
        kind: "imaios-verified-harvest-test",
        createdAt: new Date().toISOString(),
        dryRun: true,
        module: exportData.module,
        counts: exportData.harvest,
        verifiedLabels: exportData.labels,
        missed
      }, null, 2));
      setStatus(`Test harvest copied: ${verified.length}/${testedLabels.length} matched; ${missed.length} missed.`, 9000);
      refreshPanel();
      return exportData;
    }

    if (!exportData.labels.length) {
      setStatus(`Harvest found 0 verified module labels. Nothing saved. ${missed.length} missed.`, 9000);
      refreshPanel();
      return exportData;
    }

    const saveResult = await saveModuleLabelExport(exportData, { mode: "harvest" });
    if (saveResult.ok) {
      const removedText = saveResult.removedCount ? ` ${saveResult.removedCount} stale removed;` : "";
      setStatus(`Harvest saved ${saveResult.afterCount} verified labels for ${saveResult.moduleName}. ${saveResult.addedCount} new;${removedText} ${missed.length} missed.${saveResult.backupText}`, 12000);
    } else {
      setStatus(saveResult.message, 10000);
    }
    refreshPanel();
    return exportData;
  }

  async function clearCurrentModuleSavedLabels() {
    const moduleKey = getCurrentModuleKey();
    const previous = getSavedLabelsForCurrentModule();
    const previousCount = Array.isArray(previous.labels) ? previous.labels.length : 0;
    const moduleName = previous.name || getCurrentModuleName() || moduleKey;
    if (!previousCount) {
      setStatus(`No saved labels to clear for ${moduleName}.`, 6500);
      return;
    }

    const confirmed = typeof window.confirm === "function" && window.confirm(
      `Clear the saved IMaios label cache for this module?\n\nModule: ${moduleName}\nSaved labels: ${previousCount}\n\nThis only clears this module, but it cannot be undone from the page cache. The local backup file will be updated too.\n\nPress OK only if you meant to clear this module.`
    ) === true;
    if (!confirmed) {
      setStatus("Clear cache cancelled.");
      return;
    }

    const repository = normalizeImportedLabelRepository(state.labelRepository || {});
    delete repository.moduleLabels[moduleKey];
    repository.modalities = (repository.modalities || []).filter((item) => (item.key || item.name) !== moduleKey);
    repository.updatedAt = new Date().toISOString();
    state.labelRepository = repository;
    const saveResult = await saveLabelRepository();
    refreshPanel();
    if (!saveResult.ok) {
      setStatus(`Clear failed for ${moduleName}: ${saveResult.error}`, 9000);
      return;
    }
    const backupResult = await backupLabelRepositoryToDownloads();
    const backupText = backupResult.ok
      ? ` Backup written to ${backupResult.result.downloadFolder}.`
      : ` Backup failed: ${backupResult.error}`;
    setStatus(`Cleared ${previousCount} saved labels for ${moduleName}.${backupText}`, 11000);
  }

  async function saveCurrentModuleLabels() {
    const exportData = buildAvailableLabelsExport();
    if (!exportData.labels.length) {
      setStatus("No visible IMaios labels found to save for this module.", 7000);
      return;
    }
    const result = await saveModuleLabelExport(exportData, { mode: "save" });
    refreshPanel();
    setStatus(result.ok ? result.message : result.message, result.ok ? 11000 : 9000);
  }

  async function saveModuleLabelExport(exportData, options = {}) {
    const before = getSavedLabelsForCurrentModule();
    const beforeCount = Array.isArray(before.labels) ? before.labels.length : 0;
    const beforeKeys = new Set((before.labels || []).map(normalizeText));
    const newCount = exportData.labels.filter((label) => !beforeKeys.has(normalizeText(label))).length;
    const mergeResult = mergeAvailableLabelsIntoRepository(exportData, { replaceModuleLabels: true });
    const saveResult = await saveLabelRepository();
    const moduleName = exportData.module.name || exportData.module.key;
    if (!saveResult.ok) {
      return { ok: false, moduleName, message: `Label save failed for ${moduleName}: ${saveResult.error}` };
    }
    const afterCount = mergeResult.labels.length;
    const verb = beforeCount ? "Updated" : "Created";
    const addedText = newCount ? ` Added ${newCount} new.` : " Already saved; refreshed timestamp.";
    const removedText = mergeResult.removedCount ? ` Removed ${mergeResult.removedCount} stale.` : "";
    const backupResult = await backupLabelRepositoryToDownloads();
    const backupText = backupResult.ok
      ? ` Backup written to ${backupResult.result.downloadFolder}.`
      : ` Backup failed: ${backupResult.error}`;
    const noun = options.mode === "harvest" ? "verified labels" : "labels";
    return {
      ok: true,
      moduleName,
      beforeCount,
      afterCount,
      addedCount: newCount,
      removedCount: mergeResult.removedCount || 0,
      backupText,
      message: `${verb} ${noun} for ${moduleName}: ${afterCount} saved.${addedText}${removedText}${backupText}`
    };
  }

  async function exportLabelRepository() {
    const repository = normalizeImportedLabelRepository({
      ...state.labelRepository,
      updatedAt: new Date().toISOString()
    });
    state.labelRepository = repository;
    const saveResult = await saveLabelRepository();
    if (!saveResult.ok) {
      setStatus(`Export failed: ${saveResult.error}`, 9000);
      return;
    }
    await writeClipboard(JSON.stringify(repository, null, 2));
    const backupResult = await backupLabelRepositoryToDownloads();
    const moduleCount = Object.keys(repository.moduleLabels || {}).length;
    const labelCount = Object.values(repository.moduleLabels || {})
      .reduce((total, module) => total + (Array.isArray(module.labels) ? module.labels.length : 0), 0);
    const backupText = backupResult.ok
      ? ` Backup written to ${backupResult.result.downloadFolder}.`
      : ` Backup failed: ${backupResult.error}`;
    setStatus(`Exported repository: ${moduleCount} modules, ${labelCount} module labels copied to clipboard.${backupText}`, 11000);
  }

  async function backupLabelRepositoryToDownloads() {
    if (!chrome?.runtime?.sendMessage) {
      return { ok: false, error: "Extension messaging is unavailable." };
    }
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: "BACKUP_IMAIOS_LABEL_REPOSITORY",
        repository: state.labelRepository,
        snapshot: false
      }, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          resolve({ ok: false, error: error.message || String(error) });
          return;
        }
        if (!response?.ok) {
          resolve({ ok: false, error: response?.error || "unknown backup error" });
          return;
        }
        resolve({ ok: true, result: response.result || {} });
      });
    });
  }

  function mergeAvailableLabelsIntoRepository(exportData, options = {}) {
    const repository = normalizeImportedLabelRepository(state.labelRepository || {});
    const moduleKey = exportData.module?.key || getCurrentModuleKey();
    const previous = repository.moduleLabels[moduleKey] || {};
    const previousLabels = Array.isArray(previous.labels) ? previous.labels : [];
    const incomingLabels = Array.isArray(exportData.labels) ? exportData.labels : [];
    const labels = options.replaceModuleLabels === false
      ? unique([...previousLabels, ...incomingLabels]).sort(compareLabels)
      : unique(incomingLabels).sort(compareLabels);
    const labelKeys = new Set(labels.map(normalizeText));
    const removedCount = options.replaceModuleLabels === false
      ? 0
      : previousLabels.filter((label) => !labelKeys.has(normalizeText(label))).length;

    repository.moduleLabels[moduleKey] = {
      key: moduleKey,
      name: exportData.module?.name || previous.name || moduleKey,
      url: exportData.module?.url || previous.url || location.href,
      updatedAt: new Date().toISOString(),
      labels,
      sourceCounts: exportData.sourceCounts || previous.sourceCounts || {},
      updateMode: options.replaceModuleLabels === false ? "merged" : "replaced",
      previousLabelCount: previousLabels.length,
      removedCount
    };
    repository.updatedAt = new Date().toISOString();

    const existingModalities = Array.isArray(repository.modalities) ? repository.modalities : [];
    if (!existingModalities.some((item) => (item.key || item.name) === moduleKey)) {
      existingModalities.push({
        key: moduleKey,
        name: repository.moduleLabels[moduleKey].name,
        url: repository.moduleLabels[moduleKey].url,
        aliases: []
      });
    }
    repository.modalities = existingModalities;
    state.labelRepository = repository;
    return repository.moduleLabels[moduleKey];
  }

  function buildAvailableLabelsExport(entries = getAvailableStructureEntries(), extra = {}) {
    const labels = unique(entries.map((entry) => entry.label)).sort(compareLabels);
    const muscleLikeLabels = labels.filter(isMuscleLikeLabel);
    const sourceCounts = entries.reduce((counts, entry) => {
      counts[entry.source] = (counts[entry.source] || 0) + 1;
      return counts;
    }, {});

    return {
      kind: "imaios-available-labels",
      createdAt: new Date().toISOString(),
      pageTitle: document.title,
      url: location.href,
      module: getCurrentModuleInfo(),
      series: getSeriesInfo(),
      slice: getSliceInfo(),
      counts: {
        labels: labels.length,
        muscleLikeLabels: muscleLikeLabels.length,
        rawEntries: entries.length
      },
      sourceCounts,
      ...(extra.harvest ? { harvest: extra.harvest } : {}),
      muscleLikeLabels,
      labels
    };
  }

  function getCurrentModuleInfo() {
    return {
      key: getCurrentModuleKey(),
      name: getCurrentModuleName(),
      url: location.href,
      pathname: location.pathname
    };
  }

  function getCurrentModuleKey() {
    return getModuleKeyFromPath(location.pathname) || "current-imaios-module";
  }

  function getModuleKeyFromPath(pathname) {
    const path = cleanText(pathname)
      .replace(/^\/[a-z]{2}\//i, "/")
      .replace(/^\/e-anatomy\//i, "")
      .replace(/^\/+|\/+$/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    return path;
  }

  function getCurrentModuleName() {
    const title = cleanText(document.title || "");
    if (title) {
      return title
        .replace(/\s*[-|]\s*IMAIOS.*$/i, "")
        .replace(/\s*[-|]\s*e-Anatomy.*$/i, "")
        .trim();
    }
    return getCurrentModuleKey().split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ");
  }

  function getAvailableStructureEntries() {
    const entries = [];
    const addEntry = (label, source, href = "") => {
      const cleaned = normalizeStructureLabel(label);
      if (!isLikelyStructureLabel(cleaned)) return;
      entries.push({ label: cleaned, source, href });
    };

    for (const link of document.querySelectorAll("a[href*='/e-anatomy/anatomical-structures/'],a[href*='/anatomical-structures/']")) {
      addEntry(link.textContent || link.getAttribute("title") || "", "anatomical-structure-link", link.href || link.getAttribute("href") || "");
    }

    for (const element of document.querySelectorAll(".navi-link,.list-structure--container-tag,.structure-title-component,[class*='structure-title']")) {
      addEntry(element.textContent || element.getAttribute("title") || "", "structure-dom");
    }

    for (const name of getLockedStructureNames()) {
      addEntry(name, "locked-structure");
    }

    const seen = new Set();
    return entries.filter((entry) => {
      const key = normalizeText(entry.label);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getPreloadedModuleStructureEntries(entries = getAvailableStructureEntries()) {
    const moduleEntries = entries.filter((entry) => entry.source === "anatomical-structure-link");
    const source = moduleEntries.length ? moduleEntries : entries;
    const seen = new Set();
    return source.filter((entry) => {
      const key = normalizeText(entry.label);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function normalizeStructureLabel(label) {
    return cleanText(label)
      .replace(/^[+×]\s*/i, "")
      .replace(/^x\s+/i, "")
      .replace(/\s*[+×]\s*$/i, "")
      .replace(/\s+x\s*$/i, "")
      .replace(/\s+\(\s*$/, "")
      .trim();
  }

  function isLikelyStructureLabel(label) {
    if (!label || label.length < 2 || label.length > 120) return false;
    if (/https?:|www\.|@/.test(label)) return false;
    if (/^[\d\s/.,:;()_-]+$/.test(label)) return false;
    if (/^(home|products|pricing|solutions|resources|subscribe|search|menu|languages|contact us|definition|related terms|additional terms|references|bibliography|anatomical hierarchy|all series|apply preset|apply list|reset list|copy manifest|copy prompt|copy labels|copy probe|copy slice|copy range|range json|go start|play range|stop cine|speed)$/i.test(label)) {
      return false;
    }
    if (/^(human anatomy|e-anatomy|anatomical structures|anatomical parts)$/i.test(label)) return false;
    return true;
  }

  function isMuscleLikeLabel(label) {
    return /\b(muscle|muscles|platysma|trapezius|sternocleidomastoid|scalenus|scalene|digastric|mylohyoid|geniohyoid|stylohyoid|sternohyoid|sternothyroid|thyrohyoid|omohyoid|longus|splenius|semispinalis|levator scapulae|obliquus|rectus capitis|vocalis|cricothyroid|arytenoid|constrictor)\b/i.test(label);
  }

  function compareLabels(a, b) {
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  }

  async function copyCineRangeText() {
    const range = getSuggestedCineRange();
    if (!range.startSlice || !range.endSlice) {
      setStatus("No colored cine range found.");
      return;
    }

    const text = [
      `${range.series || "Current series"} cine range: slices ${range.startSlice}-${range.endSlice}`,
      `Frame count: ${range.frameCount}`,
      range.colorSummary.length ? `Color ranges: ${range.colorSummary.map((item) => `${item.color} ${item.ranges.map((pair) => pair.join("-")).join(",")}`).join("; ")}` : ""
    ].filter(Boolean).join("\n");
    await writeClipboard(text);
    setStatus(`Cine range copied: ${range.startSlice}-${range.endSlice}.`);
  }

  async function copyCineRangeJson() {
    const range = getSuggestedCineRange();
    await writeClipboard(JSON.stringify(range, null, 2));
    setStatus(range.startSlice ? `Range JSON copied: ${range.startSlice}-${range.endSlice}.` : "Range JSON copied.");
  }

  async function goToRangeStart() {
    const result = getValidCineRange();
    if (!result.ok) {
      setStatus(result.reason);
      return;
    }
    stopRangeCine({ quiet: true });
    const moved = await setViewerSlice(result.range.startSlice);
    setStatus(moved.ok ? `At range start ${result.range.startSlice}.` : moved.reason);
  }

  function toggleRangeCine() {
    if (state.rangeCineRunning) {
      stopRangeCine();
      return;
    }
    startRangeCine();
  }

  async function startDirectionalRangeCine(direction) {
    const normalizedDirection = direction < 0 ? -1 : 1;
    if (state.rangeCineRunning && state.rangeCineMode === "pingpong" && state.rangeCineDirection === normalizedDirection) {
      stopRangeCine();
      return;
    }

    const result = getValidCineRange();
    if (!result.ok) {
      setStatus(result.reason);
      return;
    }

    stopRangeCine({ quiet: true });
    const range = result.range;
    const sliceInfo = getSliceInfo();
    const current = Number.isFinite(sliceInfo.value) && sliceInfo.value >= range.startSlice && sliceInfo.value <= range.endSlice
      ? sliceInfo.value
      : normalizedDirection > 0 ? range.startSlice : range.endSlice;

    state.rangeCineRunning = true;
    state.rangeCineCurrent = current;
    state.rangeCineDirection = normalizedDirection;
    state.rangeCineMode = "pingpong";
    refreshPanel();
    setStatus(`Playing range ${range.startSlice}-${range.endSlice} ${normalizedDirection < 0 ? "backward" : "forward"}, then ping-pong.`, 0);
    await stepRangeCine(range);
    if (!state.rangeCineRunning) return;
    startRangeCineTimer(range);
  }

  async function startRangeCine() {
    const result = getValidCineRange();
    if (!result.ok) {
      setStatus(result.reason);
      return;
    }

    stopRangeCine({ quiet: true });
    const range = result.range;
    const sliceInfo = getSliceInfo();
    const current = Number.isFinite(sliceInfo.value) && sliceInfo.value >= range.startSlice && sliceInfo.value <= range.endSlice
      ? sliceInfo.value
      : range.startSlice;

    state.rangeCineRunning = true;
    state.rangeCineCurrent = current;
    state.rangeCineDirection = current >= range.endSlice ? -1 : 1;
    state.rangeCineMode = "pingpong";
    refreshPanel();
    setStatus(`Playing range ${range.startSlice}-${range.endSlice} back and forth.`, 0);
    await stepRangeCine(range);
    if (!state.rangeCineRunning) return;
    startRangeCineTimer(range);
  }

  function stopRangeCine(options = {}) {
    if (state.rangeCineTimer) {
      clearInterval(state.rangeCineTimer);
      state.rangeCineTimer = 0;
    }
    const wasRunning = state.rangeCineRunning;
    state.rangeCineRunning = false;
    state.rangeCineBusy = false;
    state.rangeCineDirection = 1;
    state.rangeCineMode = "pingpong";
    refreshPanel();
    if (!options.quiet && wasRunning) setStatus("Range cine stopped.");
  }

  function startRangeCineTimer(range) {
    if (state.rangeCineTimer) clearInterval(state.rangeCineTimer);
    state.rangeCineTimer = setInterval(() => {
      stepRangeCine(range);
    }, state.rangeCineIntervalMs);
  }

  function setCineSpeed(value, options = {}) {
    const speed = clamp(Math.round(Number(value) || DEFAULT_CINE_SPEED), CINE_SPEED_MIN, CINE_SPEED_MAX);
    state.rangeCineSpeed = speed;
    state.rangeCineIntervalMs = cineSpeedToIntervalMs(speed);

    if (state.rangeCineRunning) {
      const result = getValidCineRange();
      if (result.ok) startRangeCineTimer(result.range);
    }

    if (options.save !== false) savePageState();
    if (options.refresh !== false) refreshPanel();
  }

  function adjustCineSpeed(delta) {
    const nextSpeed = clamp(state.rangeCineSpeed + delta, CINE_SPEED_MIN, CINE_SPEED_MAX);
    setCineSpeed(nextSpeed);
    setStatus(`Cine speed ${nextSpeed} (${Math.round(1000 / state.rangeCineIntervalMs)} fps).`);
  }

  function cineSpeedToIntervalMs(speed) {
    const normalized = clamp(Number(speed) || DEFAULT_CINE_SPEED, CINE_SPEED_MIN, CINE_SPEED_MAX);
    if (normalized <= DEFAULT_CINE_SPEED) {
      return Math.round(280 - ((normalized - CINE_SPEED_MIN) * 40));
    }
    if (normalized <= 10) {
      return Math.round(120 - ((normalized - DEFAULT_CINE_SPEED) * 16));
    }
    return Math.round(40 - ((normalized - 10) * 2));
  }

  async function stepRangeCine(range) {
    if (!state.rangeCineRunning || state.rangeCineBusy) return;
    state.rangeCineBusy = true;
    try {
      const slice = getNextRangeCineSlice(range);
      const moved = await setViewerSlice(slice);
      if (!moved.ok) {
        stopRangeCine({ quiet: true });
        setStatus(moved.reason);
        return;
      }
      state.rangeCineCurrent = slice;
    } finally {
      state.rangeCineBusy = false;
    }
  }

  function getNextRangeCineSlice(range) {
    const start = Math.round(range.startSlice);
    const end = Math.round(range.endSlice);
    if (start === end) return start;

    const fallback = state.rangeCineDirection < 0 ? end : start;
    const current = Number.isFinite(state.rangeCineCurrent)
      ? clamp(Math.round(state.rangeCineCurrent), start, end)
      : fallback;

    if (state.rangeCineMode === "forward") {
      return current >= end ? start : current + 1;
    }

    if (state.rangeCineMode === "backward") {
      return current <= start ? end : current - 1;
    }

    let direction = state.rangeCineDirection || 1;
    let nextSlice = current + direction;

    if (nextSlice > end) {
      direction = -1;
      nextSlice = end - 1;
    } else if (nextSlice < start) {
      direction = 1;
      nextSlice = start + 1;
    }

    state.rangeCineDirection = direction;
    return nextSlice;
  }

  function getValidCineRange() {
    const range = getSuggestedCineRange();
    if (!Number.isFinite(range.startSlice) || !Number.isFinite(range.endSlice)) {
      return { ok: false, reason: "No highlighted cine range detected yet. Apply/lock structures first." };
    }
    if (range.endSlice < range.startSlice) {
      return { ok: false, reason: "Detected cine range is invalid." };
    }
    return { ok: true, range };
  }

  async function setViewerSlice(slice) {
    const targetSlice = Math.round(slice);
    const input = findViewerSliceInput();
    if (input) {
      input.focus();
      setInputValue(input, String(targetSlice));
      pressInputKey(input, "Enter");
      input.blur();
      return { ok: true, method: "slice-input" };
    }

    const timelineElement = findTimelineSliceElement(targetSlice);
    if (timelineElement) {
      await realMouseClick(timelineElement, 0.5, 0.5);
      return { ok: true, method: "timeline-click" };
    }

    return { ok: false, reason: "Could not find the slice counter or timeline slice controls." };
  }

  function findViewerSliceInput() {
    const inputs = Array.from(document.querySelectorAll("input[type='number']"))
      .filter((input) => isVisible(input));
    return inputs.find((input) => Number(input.max) > 10) || inputs[0] || null;
  }

  function findTimelineSliceElement(slice) {
    return Array.from(document.querySelectorAll(".slice[sort_order], [sort_order][slice_id]"))
      .find((element) => parseNumber(element.getAttribute("sort_order")) === slice) || null;
  }

  function pressInputKey(input, key) {
    const eventBase = {
      key,
      code: key,
      bubbles: true,
      cancelable: true,
      view: window
    };
    input.dispatchEvent(new KeyboardEvent("keydown", eventBase));
    input.dispatchEvent(new KeyboardEvent("keypress", eventBase));
    input.dispatchEvent(new KeyboardEvent("keyup", eventBase));
  }

  async function copyViewerProbe() {
    const probe = buildViewerProbe({ includeSliceElements: true });
    await writeClipboard(JSON.stringify(probe, null, 2));
    setStatus("Viewer probe copied.");
  }

  async function copySliceProbe() {
    const probe = buildViewerProbe({ includeSliceElements: false });
    await writeClipboard(JSON.stringify(probe, null, 2));
    setStatus("Current slice probe copied.");
  }

  function buildViewerProbe(options = {}) {
    const sliceInfo = getSliceInfo();
    const timeline = getTimelineInfo(options.includeSliceElements);
    const labelElements = getVisibleLabelElements();
    const pinLikeElements = getPinLikeElements();
    const canvases = getCanvasLayerInfo();
    const requestedStructures = state.selectedStructures.length ? state.selectedStructures : parseCustomList();

    return {
      kind: options.includeSliceElements ? "imaios-viewer-probe" : "imaios-current-slice-probe",
      createdAt: new Date().toISOString(),
      pageTitle: document.title,
      url: location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1
      },
      series: getSeriesInfo(),
      slice: sliceInfo,
      timeline,
      suggestedCineRange: getSuggestedCineRange(timeline),
      requestedStructures,
      lockedStructures: getLockedStructureNames(),
      confirmedLockedCount: countLockedMatches(requestedStructures),
      toggles: {
        pins: getToggleProbe("Pins"),
        practice: getToggleProbe("Practice"),
        targetedLabeling: getToggleProbe("Targeted labeling")
      },
      moduleSearchInput: Boolean(findModuleSearchInput()),
      visibleLabels: labelElements,
      pinLikeElements,
      canvases,
      viewerLocalStorage: getViewerLocalStorageState(),
      appStateHints: getAppStateHints()
    };
  }

  function getSliceInfo() {
    const sliceInput = findViewerSliceInput();
    const counter = sliceInput ? sliceInput.closest(".counterContainer,[class*='counter']") : null;
    const maxText = counter ? Array.from(counter.querySelectorAll("span"))
      .map((span) => span.textContent || "")
      .find((text) => /^\s*\d+\s*$/.test(text)) : "";

    return {
      value: sliceInput ? parseNumber(sliceInput.value) : null,
      min: sliceInput ? parseNumber(sliceInput.min) : null,
      max: sliceInput ? parseNumber(sliceInput.max || maxText) : null,
      counterText: counter ? cleanText(counter.textContent || "") : "",
      inputFound: Boolean(sliceInput)
    };
  }

  function getTimelineInfo(includeElements) {
    const slices = Array.from(document.querySelectorAll(".slice[sort_order], [sort_order][slice_id]"));
    const entries = slices.map((element) => ({
      sortOrder: parseNumber(element.getAttribute("sort_order")),
      sliceId: element.getAttribute("slice_id") || "",
      className: String(element.className || ""),
      style: element.getAttribute("style") || ""
    })).filter((entry) => Number.isFinite(entry.sortOrder) || entry.sliceId);

    const sortOrders = entries.map((entry) => entry.sortOrder).filter(Number.isFinite);
    const styledEntries = entries.filter((entry) => entry.style && entry.style.trim());
    return {
      count: entries.length,
      firstSortOrder: sortOrders.length ? Math.min(...sortOrders) : null,
      lastSortOrder: sortOrders.length ? Math.max(...sortOrders) : null,
      styledCount: styledEntries.length,
      styledRanges: numberRanges(styledEntries.map((entry) => entry.sortOrder).filter(Number.isFinite)),
      colorRanges: getTimelineColorRanges(styledEntries),
      currentCandidates: entries.filter((entry) => /active|current|selected/i.test(`${entry.className} ${entry.style}`)).slice(0, 20),
      entries: includeElements ? entries.slice(0, 1200) : undefined
    };
  }

  function getSuggestedCineRange(timeline = null) {
    const timelineInfo = timeline || getTimelineInfo(false);
    const styledRanges = Array.isArray(timelineInfo.styledRanges) ? timelineInfo.styledRanges : [];
    const firstRange = styledRanges[0] || [];
    const lastRange = styledRanges[styledRanges.length - 1] || [];
    const startSlice = Number.isFinite(firstRange[0]) ? firstRange[0] : null;
    const endSlice = Number.isFinite(lastRange[1]) ? lastRange[1] : null;

    const colorSummary = Object.entries(timelineInfo.colorRanges || {}).map(([color, ranges]) => ({
      color,
      ranges
    }));

    return {
      series: getSeriesInfo().selectedPlane || "Current series",
      startSlice,
      endSlice,
      frameCount: Number.isFinite(startSlice) && Number.isFinite(endSlice) ? endSlice - startSlice + 1 : null,
      basis: "union of colored timeline slice markers for the currently locked/highlighted structures",
      colorSummary
    };
  }

  function getTimelineColorRanges(entries) {
    const byColor = {};
    for (const entry of entries) {
      const colors = unique(extractRgbColors(entry.style));
      for (const color of colors) {
        if (!byColor[color]) byColor[color] = [];
        byColor[color].push(entry.sortOrder);
      }
    }

    return Object.fromEntries(Object.entries(byColor).map(([color, sortOrders]) => (
      [color, numberRanges(sortOrders.filter(Number.isFinite))]
    )));
  }

  function extractRgbColors(style) {
    return Array.from(String(style || "").matchAll(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g))
      .map((match) => match[0].replace(/\s+/g, ""));
  }

  function numberRanges(values) {
    const numbers = Array.from(new Set(values.filter(Number.isFinite))).sort((a, b) => a - b);
    const ranges = [];
    let start = null;
    let previous = null;
    for (const number of numbers) {
      if (start === null) {
        start = number;
        previous = number;
      } else if (number === previous + 1) {
        previous = number;
      } else {
        ranges.push([start, previous]);
        start = number;
        previous = number;
      }
    }
    if (start !== null) ranges.push([start, previous]);
    return ranges;
  }

  async function switchPlane(targetPlane) {
    const plane = normalizePlaneName(targetPlane);
    if (!plane) {
      setStatus("Unknown plane.");
      return;
    }

    stopRangeCine({ quiet: true });
    const menuButton = findPlaneSelectorButton();
    const menuRect = menuButton ? menuButton.getBoundingClientRect() : null;
    await openSeriesMenuIfNeeded(menuButton, menuRect);

    let option = await waitFor(() => findPlaneOption(plane, menuRect), 1800, 120);
    if (!option && menuButton) {
      await realMouseClick(menuButton, 0.5, 0.5);
      await delay(260);
      option = await waitFor(() => findPlaneOption(plane, menuRect), 1200, 120);
    }

    if (!option) {
      setStatus(`Could not find ${plane}. Open the plane menu once, then press the hotkey again.`, 7000);
      return;
    }

    await realMouseClick(option, 0.5, 0.5);
    const label = getPlaneOptionLabel(option) || plane;
    setStatus(`Switching to ${label}...`);
    await delay(520);
    const reverseResult = await syncReverseScrollForPlane(plane, { quiet: true });
    const reverseState = plane === "Coronal" ? "on" : "off";
    setStatus(reverseResult.ok ? `${label}: reverse scroll ${reverseState}.` : reverseResult.reason, reverseResult.ok ? 4200 : 7000);
  }

  async function switchSeriesSlot(slotNumber) {
    const slot = Number(slotNumber);
    if (!Number.isInteger(slot) || slot < 1) {
      setStatus("Unknown series slot.");
      return;
    }

    stopRangeCine({ quiet: true });
    const menuButton = findPlaneSelectorButton();
    const menuRect = menuButton ? menuButton.getBoundingClientRect() : null;
    await openSeriesMenuIfNeeded(menuButton, menuRect);

    let option = await waitFor(() => findQuickSeriesOptionBySlot(slot, menuRect), 1800, 120);
    if (!option && menuButton) {
      await realMouseClick(menuButton, 0.5, 0.5);
      await delay(260);
      option = await waitFor(() => findQuickSeriesOptionBySlot(slot, menuRect), 1200, 120);
    }

    if (!option) {
      setStatus(`Could not find series slot ${slot}. Open All series once, then press the hotkey again.`, 7000);
      return;
    }

    const name = getQuickSeriesOptionName(option) || `series slot ${slot}`;
    await realMouseClick(option, 0.5, 0.5);
    setStatus(`Switching to ${name}...`);
    const plane = normalizePlaneName(name);
    if (plane) {
      await delay(520);
      const reverseResult = await syncReverseScrollForPlane(plane, { quiet: true });
      const reverseState = plane === "Coronal" ? "on" : "off";
      setStatus(reverseResult.ok ? `${name}: reverse scroll ${reverseState}.` : reverseResult.reason, reverseResult.ok ? 4200 : 7000);
    }
  }

  async function openSeriesMenuIfNeeded(menuButton, menuRect) {
    if (getVisibleQuickSeriesOptionsNear(menuRect).length) return;
    if (!menuButton) return;
    await realMouseClick(menuButton, 0.5, 0.5);
    await delay(260);
  }

  function getPlaneOptionLabel(option) {
    if (!option) return "";
    return getQuickSeriesOptionName(option) || cleanText(option.getAttribute("title") || option.textContent || "");
  }

  function normalizePlaneName(value) {
    const match = String(value || "").match(/\b(Axial|Coronal|Sagittal)\b/i);
    if (!match) return "";
    return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  }

  function findPlaneSelectorButton() {
    const quickSelector = findQuickSeriesSelectorButton();
    if (quickSelector) return quickSelector;

    const currentPlane = normalizePlaneName(getSeriesInfo().selectedPlane);
    const candidates = Array.from(document.body.querySelectorAll("output,button,[role='button'],[role='combobox'],div,span"))
      .filter((element) => element !== state.host && isVisible(element))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top > 185 || rect.height < 28 || rect.height > 120 || rect.width < 54 || rect.width > 460) return false;
        const text = cleanText(element.getAttribute("title") || element.textContent || "");
        return /\b(Axial|Coronal|Sagittal|All series)\b/i.test(text);
      });

    candidates.sort((a, b) => scorePlaneSelector(b, currentPlane) - scorePlaneSelector(a, currentPlane));
    return candidates[0] || null;
  }

  function findQuickSeriesSelectorButton() {
    const candidates = Array.from(document.body.querySelectorAll(
      [
        "output.series-quick-select__output",
        "[class*='series-quick-select__output']",
        "[role='combobox'][aria-controls='list_box']",
        "[role='combobox'][class*='series']"
      ].join(",")
    ))
      .filter((element) => element !== state.host && isVisible(element))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top > 220 || rect.height < 24 || rect.height > 120 || rect.width < 70 || rect.width > 520) return false;
        const text = cleanText(element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent || "");
        return /\b(All series|Axial|Coronal|Sagittal|3D)\b/i.test(text) || String(element.className || "").includes("series-quick-select");
      });

    candidates.sort((a, b) => scoreQuickSeriesSelector(b) - scoreQuickSeriesSelector(a));
    return candidates[0] || null;
  }

  function scoreQuickSeriesSelector(element) {
    const rect = element.getBoundingClientRect();
    const text = cleanText(element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent || "");
    let score = 0;
    if (element.matches("output.series-quick-select__output,[class*='series-quick-select__output']")) score += 50;
    if (element.matches("[role='combobox']")) score += 20;
    if (/\b(All series|Axial|Coronal|Sagittal|3D)\b/i.test(text)) score += 12;
    if (rect.top < 170) score += 8;
    if (rect.left > window.innerWidth * 0.25 && rect.left < window.innerWidth * 0.9) score += 8;
    score -= Math.abs(rect.height - 48) / 8;
    return score;
  }

  function scorePlaneSelector(element, currentPlane) {
    const rect = element.getBoundingClientRect();
    const text = cleanText(element.getAttribute("title") || element.textContent || "");
    const normalizedText = normalizeText(text);
    let score = 0;
    if (currentPlane && normalizeText(text) === normalizeText(currentPlane)) score += 28;
    if (currentPlane && normalizedText.includes(normalizeText(currentPlane))) score += 12;
    if (/all series/i.test(text)) score += 10;
    if (element.matches("button,[role='button']")) score += 8;
    if (element.querySelector("img,svg")) score += 4;
    if (rect.left > window.innerWidth * 0.36 && rect.left < window.innerWidth * 0.92) score += 8;
    score -= Math.max(0, cleanText(text).length - 40) / 8;
    score -= Math.abs(rect.height - 48) / 10;
    return score;
  }

  function findPlaneOption(targetPlane, menuRect = null) {
    const quickOption = findQuickSeriesOption(targetPlane, menuRect);
    if (quickOption) return quickOption;

    const expected = normalizeText(targetPlane);
    let candidates = Array.from(document.body.querySelectorAll("button,li,a,p,span,div,[role='option'],[role='menuitem'],[role='button']"))
      .filter((element) => element !== state.host && isVisible(element))
      .map((element) => ({
        element,
        text: cleanText(element.getAttribute("title") || element.textContent || "")
      }))
      .filter((item) => normalizeText(item.text) === expected)
      .filter((item) => {
        const rect = item.element.getBoundingClientRect();
        return rect.width >= 24 && rect.width <= 440 && rect.height >= 16 && rect.height <= 96;
      });

    const nearbyCandidates = menuRect ? candidates.filter((item) => isNearPlaneMenu(item.element, menuRect)) : [];
    if (nearbyCandidates.length) candidates = nearbyCandidates;

    candidates.sort((a, b) => scorePlaneOption(b.element, targetPlane, menuRect) - scorePlaneOption(a.element, targetPlane, menuRect));
    return candidates.length ? getPlaneOptionClickTarget(candidates[0].element) : null;
  }

  function findQuickSeriesOption(targetSeries, menuRect = null) {
    const expected = normalizeText(targetSeries);
    const options = getVisibleQuickSeriesOptions()
      .map((element) => ({
        element,
        name: getQuickSeriesOptionName(element)
      }))
      .filter((item) => quickSeriesNameMatches(item.name, expected));

    const nearbyOptions = menuRect ? options.filter((item) => isNearPlaneMenu(item.element, menuRect)) : [];
    const candidates = nearbyOptions.length ? nearbyOptions : options;
    candidates.sort((a, b) => (
      scoreQuickSeriesOption(b.element, menuRect) - scoreQuickSeriesOption(a.element, menuRect) ||
      a.element.getBoundingClientRect().top - b.element.getBoundingClientRect().top
    ));
    return candidates.length ? candidates[0].element : null;
  }

  function findQuickSeriesOptionBySlot(slotNumber, menuRect = null) {
    const options = getVisibleQuickSeriesOptionsNear(menuRect)
      .map((element) => ({
        element,
        name: getQuickSeriesOptionName(element)
      }))
      .filter((item) => item.name && !isAllSeriesName(item.name));
    return options[slotNumber - 1]?.element || null;
  }

  function quickSeriesNameMatches(name, expected) {
    const normalizedName = normalizeText(name);
    if (!normalizedName || !expected) return false;
    if (normalizedName === expected) return true;
    if (/^(axial|coronal|sagittal)$/.test(expected)) {
      return normalizedName.startsWith(`${expected} `) || normalizedName.startsWith(`${expected}-`);
    }
    return false;
  }

  function isAllSeriesName(name) {
    return /^all series$/i.test(cleanText(name));
  }

  function getVisibleQuickSeriesOptions() {
    return Array.from(document.body.querySelectorAll(
      [
        ".series-quick-select-option[role='option']",
        ".series-quick-select-option",
        "[role='option'][class*='series-quick-select']"
      ].join(",")
    ))
      .filter((element) => element !== state.host && isVisible(element));
  }

  function getVisibleQuickSeriesOptionsNear(menuRect = null) {
    const options = getVisibleQuickSeriesOptions();
    const nearbyOptions = menuRect ? options.filter((element) => isNearPlaneMenu(element, menuRect)) : [];
    const candidates = nearbyOptions.length ? nearbyOptions : options;
    return candidates.sort((a, b) => (
      a.getBoundingClientRect().top - b.getBoundingClientRect().top ||
      a.getBoundingClientRect().left - b.getBoundingClientRect().left
    ));
  }

  function getQuickSeriesOptionName(element) {
    const nameElement = element.querySelector(".series-quick-select-option__name");
    if (nameElement) return cleanText(nameElement.textContent || "");
    const imageAlt = element.querySelector("img[alt]")?.getAttribute("alt");
    if (imageAlt) return cleanText(imageAlt);
    return cleanText(element.getAttribute("title") || element.getAttribute("aria-label") || element.textContent || "");
  }

  function scoreQuickSeriesOption(element, menuRect = null) {
    const rect = element.getBoundingClientRect();
    let score = 0;
    if (element.matches(".series-quick-select-option")) score += 40;
    if (element.matches("[role='option']")) score += 16;
    if (element.querySelector(".series-quick-select-option__name")) score += 12;
    if (element.closest(".series-quick-select__scrollbox,[role='listbox']")) score += 16;
    if (menuRect && isNearPlaneMenu(element, menuRect)) score += 18;
    if (rect.width >= 70 && rect.width <= 520 && rect.height >= 24 && rect.height <= 80) score += 8;
    return score;
  }

  function isNearPlaneMenu(element, menuRect) {
    const rect = element.getBoundingClientRect();
    const left = menuRect.left - 120;
    const right = menuRect.right + 180;
    const top = menuRect.top - 40;
    const bottom = menuRect.bottom + 420;
    return rect.right >= left && rect.left <= right && rect.bottom >= top && rect.top <= bottom;
  }

  function scorePlaneOption(element, targetPlane, menuRect = null) {
    const rect = element.getBoundingClientRect();
    let score = 0;
    if (element.matches("button,li,a,[role='option'],[role='menuitem'],[role='button']")) score += 14;
    if (element.closest("[class*='dropdown'],[class*='menu'],[class*='select'],[role='listbox'],[role='menu']")) score += 16;
    if (menuRect && isNearPlaneMenu(element, menuRect)) score += 18;
    if (rect.left > window.innerWidth * 0.28) score += 8;
    if (rect.top < 260) score += 4;
    return score;
  }

  function getPlaneOptionClickTarget(element) {
    const selector = "button,li,a,[role='option'],[role='menuitem'],[role='button'],[class*='item'],[class*='option']";
    let node = element;
    while (node && node !== document.body && node !== document.documentElement) {
      if (node.matches && node.matches(selector) && isVisible(node)) return node;
      node = node.parentElement;
    }
    return element;
  }

  function getSeriesInfo() {
    const quickSelector = findQuickSeriesSelectorButton();
    const visibleSeriesOptions = unique(getVisibleQuickSeriesOptions()
      .map((element) => getQuickSeriesOptionName(element))
      .filter(Boolean));
    const titleCandidates = Array.from(document.querySelectorAll("[class*='title'],[title],p,span,button,div"))
      .filter((element) => isVisible(element))
      .map((element) => cleanText(element.getAttribute("title") || element.textContent || ""))
      .filter((text) => /head and neck|axial|sagittal|coronal|3d/i.test(text))
      .slice(0, 30);

    return {
      visibleTextCandidates: unique(titleCandidates),
      selectedSeries: quickSelector ? cleanQuickSeriesSelectorText(quickSelector) : "",
      availableSeries: visibleSeriesOptions,
      seriesSelectorFound: Boolean(quickSelector),
      selectedPlane: inferSelectedPlane(titleCandidates)
    };
  }

  function cleanQuickSeriesSelectorText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll("svg,img").forEach((node) => node.remove());
    return cleanText(clone.textContent || "");
  }

  function inferSelectedPlane(candidates) {
    const domPlane = inferSelectedPlaneFromDom();
    if (domPlane) return domPlane;
    const exact = candidates
      .map((candidate) => cleanText(candidate))
      .find((candidate) => /^(Axial|Sagittal|Coronal)$/i.test(candidate));
    if (exact) return normalizePlaneName(exact);
    const joined = candidates.join(" ");
    const match = joined.match(/\b(Axial|Sagittal|Coronal|3D\s*-\s*[^,\n]+)/i);
    return match ? cleanText(match[0]) : "";
  }

  function inferSelectedPlaneFromDom() {
    const candidates = Array.from(document.querySelectorAll("button,[role='button'],div,span,p"))
      .filter((element) => element !== state.host && isVisible(element))
      .map((element) => ({
        element,
        plane: normalizePlaneName(cleanText(element.getAttribute("title") || element.textContent || ""))
      }))
      .filter((item) => item.plane);

    candidates.sort((a, b) => scoreSelectedPlaneCandidate(b.element) - scoreSelectedPlaneCandidate(a.element));
    return candidates.length && scoreSelectedPlaneCandidate(candidates[0].element) > 0 ? candidates[0].plane : "";
  }

  function scoreSelectedPlaneCandidate(element) {
    const rect = element.getBoundingClientRect();
    const text = cleanText(element.getAttribute("title") || element.textContent || "");
    let score = 0;
    if (/^(Axial|Sagittal|Coronal)$/i.test(text)) score += 16;
    if (element.matches("button,[role='button']")) score += 8;
    if (rect.top < 185) score += 10;
    if (rect.left > window.innerWidth * 0.32 && rect.left < window.innerWidth * 0.92) score += 12;
    if (rect.width >= 54 && rect.width <= 460 && rect.height >= 28 && rect.height <= 120) score += 6;
    if (rect.left < window.innerWidth * 0.24) score -= 8;
    score -= Math.max(0, text.length - 40) / 8;
    return score;
  }

  function getVisibleLabelElements() {
    return Array.from(document.querySelectorAll(".structure-title-component,[class*='structure-title'],[class*='label']"))
      .filter((element) => element !== state.host && isVisible(element))
      .map((element) => elementProbe(element))
      .filter((item) => item.text || /structure-title|label/i.test(item.className))
      .slice(0, 80);
  }

  function getPinLikeElements() {
    return Array.from(document.querySelectorAll("[class*='pin'],[class*='point'],[title*='Pin'],[title*='Pins']"))
      .filter((element) => element !== state.host && isVisible(element))
      .map((element) => elementProbe(element))
      .slice(0, 120);
  }

  function getCanvasLayerInfo() {
    return Array.from(document.querySelectorAll("canvas"))
      .map((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return {
          id: canvas.id || "",
          dataName: canvas.getAttribute("data-name") || "",
          className: String(canvas.className || ""),
          width: canvas.width,
          height: canvas.height,
          rect: rectProbe(rect),
          display: getComputedStyle(canvas).display,
          opacity: getComputedStyle(canvas).opacity
        };
      });
  }

  function getToggleProbe(labelText) {
    const row = findLabelingSettingRow(labelText);
    if (!row) return { found: false, on: null };
    const toggle = findSwitchControl(row);
    return {
      found: true,
      on: toggle ? isSwitchOn(toggle) : null,
      row: elementProbe(row),
      toggle: toggle ? elementProbe(toggle) : null
    };
  }

  function getAppStateHints() {
    const keyPattern = /imaios|eanatomy|anatomy|viewer|slice|series|pin|label|vue/i;
    const windowKeys = Object.keys(window)
      .filter((key) => keyPattern.test(key))
      .slice(0, 100);
    const localStorageKeys = getStorageKeys(localStorage, keyPattern);
    const sessionStorageKeys = getStorageKeys(sessionStorage, keyPattern);
    return {
      windowKeys,
      hasVueDevtoolsHook: Boolean(window.__VUE_DEVTOOLS_GLOBAL_HOOK__),
      localStorageKeys,
      sessionStorageKeys
    };
  }

  function getViewerLocalStorageState() {
    const keys = [
      "im_viewer_locked_structures",
      "im_viewer_last_slice_seen",
      "im_viewer_last_slice_seen-Head-Neck-CT",
      "im_viewer_last_series_seen",
      "im_viewer-pin-mode",
      REVERSE_SCROLL_STORAGE_KEY,
      "im_viewer-overlay-opacity",
      "im_viewer-cross-references",
      "im_viewer-menu-open"
    ];
    return Object.fromEntries(keys.map((key) => [key, parseStorageValue(localStorage.getItem(key))]));
  }

  function parseStorageValue(value) {
    if (value === null || value === undefined) return null;
    try {
      return JSON.parse(value);
    } catch (_error) {
      return value;
    }
  }

  function getStorageKeys(storage, pattern) {
    try {
      return Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key) => key && pattern.test(key))
        .slice(0, 80);
    } catch (_error) {
      return [];
    }
  }

  function elementProbe(element) {
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName.toLowerCase(),
      text: cleanText(element.textContent || ""),
      title: cleanText(element.getAttribute("title") || ""),
      className: String(element.className || ""),
      dataName: element.getAttribute("data-name") || "",
      role: element.getAttribute("role") || "",
      ariaDisabled: element.getAttribute("aria-disabled") || "",
      rect: rectProbe(rect)
    };
  }

  function rectProbe(rect) {
    return {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }

  async function writeClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  async function readClipboard() {
    if (navigator.clipboard && navigator.clipboard.readText) {
      return navigator.clipboard.readText();
    }
    throw new Error("Clipboard read is not available in this browser context.");
  }

  function createDefaultHotkeys() {
    return Object.fromEntries(Object.entries(DEFAULT_HOTKEYS).map(([actionId, binding]) => (
      [actionId, normalizeHotkeyBinding(binding)]
    )));
  }

  function mergeHotkeys(savedHotkeys) {
    const merged = createDefaultHotkeys();
    for (const action of HOTKEY_ACTIONS) {
      if (Object.prototype.hasOwnProperty.call(savedHotkeys, action.id)) {
        const binding = normalizeHotkeyBinding(savedHotkeys[action.id]);
        merged[action.id] = binding;
      }
    }
    return merged;
  }

  function normalizeHotkeyBinding(binding) {
    if (!binding || typeof binding !== "object" || !binding.code) return null;
    return {
      code: String(binding.code),
      key: typeof binding.key === "string" ? binding.key : "",
      alt: Boolean(binding.alt),
      ctrl: Boolean(binding.ctrl),
      meta: Boolean(binding.meta),
      shift: Boolean(binding.shift)
    };
  }

  function handleHotkeyCapture(event) {
    markKeyboardEventHandled(event);
    const actionId = state.captureHotkeyAction;
    if (!actionId) return;

    if (event.key === "Escape") {
      state.captureHotkeyAction = "";
      refreshPanel();
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      state.hotkeys[actionId] = null;
      state.captureHotkeyAction = "";
      savePageState();
      refreshPanel();
      setStatus("Shortcut cleared.");
      return;
    }

    const binding = hotkeyFromEvent(event);
    if (!binding) {
      setStatus("Press a non-modifier key.");
      return;
    }

    for (const otherAction of HOTKEY_ACTIONS) {
      if (otherAction.id !== actionId && hotkeyBindingsEqual(state.hotkeys[otherAction.id], binding)) {
        state.hotkeys[otherAction.id] = null;
      }
    }
    state.hotkeys[actionId] = binding;
    state.captureHotkeyAction = "";
    savePageState();
    refreshPanel();
    setStatus(`${getHotkeyActionLabel(actionId)} set to ${formatHotkey(binding)}.`);
  }

  function hotkeyFromEvent(event) {
    if (["Alt", "Control", "Meta", "Shift"].includes(event.key)) return null;
    return {
      code: event.code || event.key,
      key: event.key || event.code,
      alt: Boolean(event.altKey),
      ctrl: Boolean(event.ctrlKey),
      meta: Boolean(event.metaKey),
      shift: Boolean(event.shiftKey)
    };
  }

  function getHotkeyActionForEvent(event) {
    const action = HOTKEY_ACTIONS.find((item) => hotkeyMatchesEvent(state.hotkeys[item.id], event));
    return action ? action.id : "";
  }

  function hotkeyMatchesEvent(binding, event) {
    if (!binding || !binding.code) return false;
    const modifiersMatch = Boolean(binding.alt) === Boolean(event.altKey) &&
      Boolean(binding.ctrl) === Boolean(event.ctrlKey) &&
      Boolean(binding.meta) === Boolean(event.metaKey) &&
      Boolean(binding.shift) === Boolean(event.shiftKey);
    if (!modifiersMatch) return false;
    if (String(binding.code) === String(event.code || event.key)) return true;
    const bindingKey = normalizeHotkeyKey(binding.key || hotkeyKeyLabel(binding));
    const eventKey = normalizeHotkeyKey(event.key || event.code);
    return Boolean(bindingKey && eventKey && bindingKey === eventKey);
  }

  function hotkeyBindingsEqual(a, b) {
    if (!a || !b) return false;
    return a.code === b.code &&
      Boolean(a.alt) === Boolean(b.alt) &&
      Boolean(a.ctrl) === Boolean(b.ctrl) &&
      Boolean(a.meta) === Boolean(b.meta) &&
      Boolean(a.shift) === Boolean(b.shift);
  }

  function formatHotkey(binding) {
    if (!binding || !binding.code) return "None";
    const parts = [];
    if (binding.ctrl) parts.push("Ctrl");
    if (binding.alt) parts.push("Alt");
    if (binding.shift) parts.push("Shift");
    if (binding.meta) parts.push("Meta");
    parts.push(hotkeyKeyLabel(binding));
    return parts.join("+");
  }

  function hotkeyKeyLabel(binding) {
    const code = String(binding.code || "");
    if (code === "Space") return "Space";
    if (code === "BracketLeft") return "[";
    if (code === "BracketRight") return "]";
    if (/^Digit\d$/.test(code)) return code.replace("Digit", "");
    if (/^Key[A-Z]$/.test(code)) return code.replace("Key", "");
    if (code === "Backquote") return "`";
    if (code === "Minus") return "-";
    if (code === "Equal") return "=";
    if (code === "Semicolon") return ";";
    if (code === "Quote") return "'";
    if (code === "Comma") return ",";
    if (code === "Period") return ".";
    if (code === "Slash") return "/";
    if (code === "Backslash") return "\\";
    return cleanText(binding.key || code);
  }

  function normalizeHotkeyKey(value) {
    const text = String(value || "");
    if (text === " ") return "space";
    if (/^space(bar)?$/i.test(text)) return "space";
    return text.trim().toLowerCase();
  }

  function getHotkeyActionLabel(actionId) {
    const action = HOTKEY_ACTIONS.find((item) => item.id === actionId);
    return action ? action.label : "Shortcut";
  }

  function onKeyDown(event) {
    if (event.__imaiosCineToolsHandled) return;
    if (state.captureHotkeyAction) {
      handleHotkeyCapture(event);
      return;
    }
    if (state.keyEditorOpen) {
      if (event.key === "Escape") {
        state.keyEditorOpen = false;
        state.captureHotkeyAction = "";
        refreshPanel();
        markKeyboardEventHandled(event);
      }
      return;
    }

    const isEditing = isEditableEventTarget(event);
    const actionId = getHotkeyActionForEvent(event);
    if (actionId && !isEditing) {
      markKeyboardEventHandled(event);
      executeHotkeyAction(actionId);
      return;
    }
  }

  function onKeyUp(event) {
    if (event.__imaiosCineToolsHandled) return;
    if ((state.captureHotkeyAction || state.keyEditorOpen || getHotkeyActionForEvent(event)) && !isEditableEventTarget(event)) {
      markKeyboardEventHandled(event);
    }
  }

  function executeHotkeyAction(actionId) {
    if (actionId === "pingpong") {
      toggleRangeCine();
    } else if (actionId === "cineBackward") {
      startDirectionalRangeCine(-1);
    } else if (actionId === "cineForward") {
      startDirectionalRangeCine(1);
    } else if (actionId === "speedDown") {
      adjustCineSpeed(-1);
    } else if (actionId === "speedUp") {
      adjustCineSpeed(1);
    } else if (actionId === "applyChunk") {
      applyActiveChunk();
    } else if (actionId === "pinsOn") {
      applyPinsHotkey(true);
    } else if (actionId === "labelsOn") {
      applyPinsHotkey(false);
    } else if (actionId === "selectAll") {
      applySelectAllHotkey();
    } else if (actionId === "reverseScroll") {
      applyReverseScrollHotkey();
    } else if (actionId === "clearLocked") {
      clearLockedStructuresHotkey();
    } else if (actionId === "axial") {
      switchPlane("Axial");
    } else if (actionId === "coronal") {
      switchPlane("Coronal");
    } else if (actionId === "sagittal") {
      switchPlane("Sagittal");
    } else if (/^series[1-9]$/.test(actionId)) {
      switchSeriesSlot(Number(actionId.replace("series", "")));
    } else if (actionId === "togglePanel") {
      state.collapsed = !state.collapsed;
      savePageState();
      refreshPanel();
    } else if (actionId === "toggleBoxes") {
      state.boxesVisible = !state.boxesVisible;
      savePageState();
      renderBoxes();
      refreshPanel();
    }
  }

  async function applyPinsHotkey(enabled) {
    const result = await setPinsMode(enabled);
    setStatus(result.ok ? (enabled ? "Pins mode enabled." : "Labels shown.") : result.reason);
  }

  async function applySelectAllHotkey() {
    const result = await toggleSelectAllLabels();
    if (!result.ok) {
      setStatus(result.reason, 7000);
      return;
    }
    const stateText = result.enabled === null ? "toggled" : (result.enabled ? "on" : "off");
    setStatus(`Select all ${stateText}.`);
  }

  async function applyReverseScrollHotkey() {
    const result = await toggleReverseScrollMode();
    setStatus(result.ok ? `Reverse scroll ${result.enabled ? "on" : "off"}.` : result.reason, result.ok ? 3600 : 7000);
  }

  async function clearLockedStructuresHotkey() {
    const result = await clearLockedStructuresForApply();
    if (result.ok) {
      if (result.clearedCount) {
        state.selectedStructures = [];
        savePageState();
        refreshPanel();
        setStatus(`Cleared ${result.clearedCount} locked structures.`);
      } else {
        setStatus("No locked structures to clear.");
      }
      return;
    }
    setStatus(result.reason || "Could not clear locked structures.", 7000);
  }

  async function clearLockedStructuresForApply() {
    const beforeCount = getLockedStructureCount();
    if (!beforeCount) {
      return { ok: true, clearedCount: 0 };
    }

    const clearButton = await findOrOpenClearLockedButton();
    if (!clearButton) {
      const fallback = await clearLockedStructureChipsIndividually();
      if (fallback.ok) {
        return { ok: true, clearedCount: fallback.clearedCount || beforeCount };
      }
      return { ok: false, reason: fallback.reason || "Could not find the locked-structures Clear all button." };
    }

    await realMouseClick(clearButton, 0.5, 0.5);
    const cleared = await waitFor(() => getLockedStructureCount() === 0 ? true : null, 2400, 120);
    if (!cleared) {
      return { ok: false, reason: `Clicked Clear all, but ${getLockedStructureCount()} locked structures still appear.` };
    }
    return { ok: true, clearedCount: beforeCount };
  }

  async function findOrOpenClearLockedButton() {
    let clearButton = findClearLockedButton();
    if (clearButton) return clearButton;

    const lockedButton = findLockedStructuresButton();
    if (!lockedButton) return null;
    await realMouseClick(lockedButton, 0.5, 0.5);
    clearButton = await waitFor(() => findClearLockedButton(), 2200, 100);
    return clearButton || null;
  }

  function findClearLockedButton() {
    const buttons = Array.from(document.body.querySelectorAll("button.clear-isolate, button"));
    return buttons.find((button) => (
      button !== state.host &&
      isVisible(button) &&
      /^clear all$/i.test(cleanText(button.textContent || "")) &&
      button.classList.contains("clear-isolate")
    )) || buttons.find((button) => (
      button !== state.host &&
      isVisible(button) &&
      /^clear all$/i.test(cleanText(button.textContent || ""))
    )) || buttons.find((button) => (
      button !== state.host &&
      isVisible(button) &&
      /clear all/i.test(cleanText(button.textContent || "")) &&
      isInsideLockedStructuresPanel(button)
    )) || null;
  }

  function findLockedStructuresButton() {
    const buttons = Array.from(document.body.querySelectorAll(
      "button.number-isolated, button.icon-button.number-isolated, button[aria-pressed]"
    ));
    const candidates = buttons
      .filter((button) => button !== state.host && isVisible(button))
      .map((button) => ({ button, count: getLockedStructureCountFromButton(button), score: scoreLockedStructuresButton(button) }))
      .filter((item) => item.count > 0 || item.score > 0)
      .sort((a, b) => (b.count - a.count) || (b.score - a.score));
    return candidates.length ? candidates[0].button : null;
  }

  function scoreLockedStructuresButton(button) {
    let score = 0;
    if (button.classList.contains("number-isolated")) score += 50;
    if (button.classList.contains("icon-button")) score += 10;
    if (button.querySelector("svg")) score += 5;
    if (/\d+/.test(button.textContent || "")) score += 15;
    return score;
  }

  function getLockedStructureCount() {
    const visibleLocked = getLockedStructureNames().length;
    const button = findLockedStructuresButton();
    return Math.max(visibleLocked, button ? getLockedStructureCountFromButton(button) : 0);
  }

  function getLockedStructureCountFromButton(button) {
    if (!button) return 0;
    const text = cleanText(button.textContent || "");
    const match = text.match(/\d+/);
    return match ? Number(match[0]) || 0 : 0;
  }

  async function clearLockedStructureChipsIndividually() {
    let panel = findLockedStructuresPanel();
    if (!panel) {
      const lockedButton = findLockedStructuresButton();
      if (lockedButton) {
        await realMouseClick(lockedButton, 0.5, 0.5);
        panel = await waitFor(() => findLockedStructuresPanel(), 1600, 100);
      }
    }
    if (!panel) {
      return { ok: false, reason: "Could not open the locked-structures panel." };
    }

    let clearedCount = 0;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const removeButton = findLockedChipRemoveButton();
      if (!removeButton) break;
      await realMouseClick(removeButton, 0.5, 0.5);
      clearedCount += 1;
      await delay(90);
      if (getLockedStructureCount() === 0) break;
    }

    if (clearedCount && getLockedStructureCount() === 0) return { ok: true, clearedCount };
    return { ok: false, reason: clearedCount ? "Clicked locked chips, but some remain." : "Could not find locked chip remove buttons." };
  }

  function findLockedChipRemoveButton() {
    const panel = findLockedStructuresPanel();
    const scope = panel || document.body;
    const candidates = Array.from(scope.querySelectorAll("button,[role='button'],span,div"))
      .filter((element) => element !== state.host && isVisible(element))
      .filter((element) => /[×✕✖x]$/i.test(cleanText(element.textContent || "")))
      .filter((element) => !/clear all/i.test(cleanText(element.textContent || "")));
    candidates.sort((a, b) => scoreLockedChipRemoveButton(b) - scoreLockedChipRemoveButton(a));
    return candidates[0] || null;
  }

  function scoreLockedChipRemoveButton(element) {
    const text = cleanText(element.textContent || "");
    let score = 0;
    if (/^[×✕✖x]$/i.test(text)) score += 40;
    if (/[×✕✖]$/.test(text)) score += 20;
    if (/tag|chip|structure|container/i.test(element.className || "")) score += 10;
    const rect = element.getBoundingClientRect();
    if (rect.width >= 16 && rect.width <= 420 && rect.height >= 16 && rect.height <= 80) score += 8;
    return score - Math.max(0, text.length - 80);
  }

  function findLockedStructuresPanel() {
    const elements = Array.from(document.body.querySelectorAll("section,aside,div,dialog"))
      .filter((element) => element !== state.host && isVisible(element))
      .filter((element) => /locked structures/i.test(element.textContent || ""));
    elements.sort((a, b) => scoreLockedStructuresPanel(b) - scoreLockedStructuresPanel(a));
    return elements[0] || null;
  }

  function scoreLockedStructuresPanel(element) {
    const text = cleanText(element.textContent || "");
    const rect = element.getBoundingClientRect();
    let score = 0;
    if (/locked structures/i.test(text)) score += 30;
    if (/clear all/i.test(text)) score += 40;
    if (/[×✕✖]/.test(text)) score += 20;
    if (element.querySelector("button.clear-isolate")) score += 40;
    if (element.querySelector("button,[role='button']")) score += 8;
    if (rect.width >= 220 && rect.height >= 160) score += 12;
    score -= Math.abs((rect.width * rect.height) - 240000) / 120000;
    return score;
  }

  function isInsideLockedStructuresPanel(element) {
    let node = element.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      if (/locked structures/i.test(node.textContent || "")) return true;
      node = node.parentElement;
    }
    return false;
  }

  function isEditableEventTarget(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    return path.some((node) => node instanceof Element && isEditableTarget(node));
  }

  function isEditableTarget(target) {
    if (!target || target === document.body || target === document.documentElement) return false;
    const element = target instanceof Element ? target : target.parentElement;
    return Boolean(element && (
      element.closest("input,textarea,select,[contenteditable='true'],[contenteditable='']")
      || element.isContentEditable
    ));
  }

  function markKeyboardEventHandled(event) {
    event.__imaiosCineToolsHandled = true;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
  }

  function setStatus(message, clearAfter = 4500) {
    const status = state.shadow && state.shadow.querySelector("[data-role='status']");
    if (!status) return;
    status.textContent = message;
    clearTimeout(state.statusTimer);
    if (clearAfter) {
      state.statusTimer = setTimeout(() => {
        status.textContent = "";
      }, clearAfter);
    }
  }

  function waitFor(predicate, timeoutMs, intervalMs) {
    const started = Date.now();
    return new Promise((resolve) => {
      const tick = () => {
        const value = predicate();
        if (value) {
          resolve(value);
          return;
        }
        if (Date.now() - started >= timeoutMs) {
          resolve(null);
          return;
        }
        setTimeout(tick, intervalMs);
      };
      tick();
    });
  }

  function normalizeText(text) {
    return String(text).replace(/\s+/g, " ").trim().toLowerCase();
  }

  function cleanText(text) {
    return String(text).replace(/\s+/g, " ").trim();
  }

  function parseNumber(value) {
    const number = Number(String(value || "").trim());
    return Number.isFinite(number) ? number : null;
  }

  function getLockedStructureNames() {
    const tags = Array.from(document.querySelectorAll(
      [
        ".list-structure--container-tag",
        "[class*='list-structure'][class*='tag']",
        "[class*='container-tag']",
        "[class*='locked'][class*='tag']"
      ].join(",")
    ));
    return unique(tags
      .filter((element) => isVisible(element))
      .map((element) => cleanLockedStructureText(element.textContent || ""))
      .filter((text) => text && !/^locked structures$/i.test(text)));
  }

  function cleanLockedStructureText(text) {
    return String(text)
      .replace(/[×✕✖]/g, " ")
      .replace(/\s+x$/i, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isStructureLocked(structureName) {
    const expected = normalizeText(structureName);
    return getLockedStructureNames().some((lockedName) => normalizeText(lockedName) === expected);
  }

  function countLockedMatches(structureNames) {
    const lockedNames = getLockedStructureNames().map((name) => normalizeText(name));
    return unique(structureNames).filter((name) => lockedNames.includes(normalizeText(name))).length;
  }

  function unique(items) {
    return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  init();
})();
