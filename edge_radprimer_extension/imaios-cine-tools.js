(() => {
  if (window.__IMAIOS_CINE_TOOLS_LOADED__) return;
  window.__IMAIOS_CINE_TOOLS_LOADED__ = true;

  const APP_ID = "imaios-cine-tools";
  const DEBUG_BUILD_TAG = "2026-06-21-native-direct-isolate-v1";
  const PAGE_STORAGE_KEY = `${APP_ID}:page:${location.origin}${location.pathname}`;
  const PREFS_STORAGE_KEY = `${APP_ID}:prefs`;
  const CHUNK_LIBRARY_STORAGE_KEY = `${APP_ID}:chunk-library`;
  const LABEL_REPOSITORY_STORAGE_KEY = `${APP_ID}:label-repository`;
  const LABEL_DETAIL_REPOSITORY_STORAGE_KEY = `${APP_ID}:label-detail-repository`;
  const LAST_LIVE_DRILL_CARD_SOURCE_KEY = `${APP_ID}:last-live-drill-card-source`;
  const LIVE_DRILL_CARD_BATCH_STORAGE_KEY = `${APP_ID}:live-drill-card-batch`;
  const NATIVE_RESTORE_STATE_BASELINE_KEY = `${APP_ID}:native-restore-state-baseline`;
  const EXTENSION_LABEL_REPOSITORY_STORAGE_KEY = "imaios-cine-tools:label-repository";
  const EXTENSION_LABEL_DETAIL_REPOSITORY_STORAGE_KEY = "imaios-cine-tools:label-detail-repository";
  const EMPTY_CHUNK_LIBRARY = { version: 1, topic: "", chunks: [] };
  const EMPTY_LABEL_REPOSITORY = { version: 1, updatedAt: "", modalities: [], labels: [], moduleLabels: {} };
  const EMPTY_LABEL_DETAIL_REPOSITORY = { kind: "imaios-label-detail-repository", version: 1, updatedAt: "", moduleDetails: {} };
  const EMPTY_LIVE_DRILL_CARD_BATCH = { kind: "imaios-live-drill-card-batch", version: 1, topic: "", source: "", createdAt: "", updatedAt: "", items: [] };
  const DEFAULT_DECK_ROOT = "IMAIOS";
  const LIVE_DRILL_ANKI_NOTE_TYPE = "Basic";
  const LIVE_DRILL_STUDY_SHIELD_ENABLED = true;
  const LIVE_DRILL_PAIR_INPUT_SYNC_ENABLED = false;
  const CINE_SPEED_MIN = 1;
  const CINE_SPEED_MAX = 20;
  const DEFAULT_CINE_SPEED = 5;
  const ANKI_CINE_SLICE_HOLD_MS = 1000;
  const PIN_MODE_STORAGE_KEY = "im_viewer-pin-mode";
  const REVERSE_SCROLL_STORAGE_KEY = "im_viewer-reverse-scroll";
  const HOTKEY_ACTIONS = [
    { id: "pingpong", label: "Cine ping-pong" },
    { id: "cineBackward", label: "Cine backward" },
    { id: "cineForward", label: "Cine forward" },
    { id: "speedDown", label: "Speed down" },
    { id: "speedUp", label: "Speed up" },
    { id: "applyChunk", label: "Apply chunk" },
    { id: "switchPairTab", label: "Open/switch paired tab" },
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
    switchPairTab: { code: "KeyT", key: "t", alt: false, ctrl: false, meta: false, shift: false },
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
    routingText: "",
    routingDeckRoot: DEFAULT_DECK_ROOT,
    boxes: [],
    boxesVisible: true,
    host: null,
    shadow: null,
    panelPosition: { left: 18, top: 112 },
    collapsed: false,
    searchRunning: false,
    cancelSearch: false,
    searchPrimeAt: 0,
    searchPrimeModuleKey: "",
    statusTimer: 0,
    rangeCineTimer: 0,
    rangeCineRunning: false,
    rangeCineBusy: false,
    rangeCineCurrent: null,
    rangeCineDirection: 1,
    rangeCineMode: "pingpong",
    rangeCineSpeed: DEFAULT_CINE_SPEED,
    rangeCineIntervalMs: cineSpeedToIntervalMs(DEFAULT_CINE_SPEED),
    recordingCine: false,
    recordPlaneScope: "current",
    chunkModalOpen: false,
    chunkInfoModalOpen: false,
    chunkInfoFontSize: 15,
    cardPlanePickerOpen: false,
    batchCartModalOpen: false,
    cardSeriesOptionsByModule: {},
    cardSeriesSelectionsByModule: {},
    chunkLibrary: { ...EMPTY_CHUNK_LIBRARY },
    activeChunkId: "",
    labelRepository: { ...EMPTY_LABEL_REPOSITORY },
    labelDetailRepository: { ...EMPTY_LABEL_DETAIL_REPOSITORY },
    applyChunkClearFirst: true,
    hotkeys: createDefaultHotkeys(),
    keyEditorOpen: false,
    captureHotkeyAction: "",
    reverseScrollWatchTimer: 0,
    lastReverseScrollPlane: "",
    lastRestoredDrillHash: "",
    lastLiveDrillCardSource: null,
    liveDrillCardBatch: { ...EMPTY_LIVE_DRILL_CARD_BATCH },
    lastLiveDrillRestoreDebug: null,
    studyShield: null,
    liveDrillRestoreRunning: false,
    liveDrillPair: null,
    liveDrillPairStarting: false,
    liveDrillPairSyncTimer: 0,
    liveDrillPairLastSignature: "",
    liveDrillPairSyncBusy: false,
    liveDrillPairApplying: false,
    liveDrillPairInputApplying: false,
    liveDrillPairInputHandlers: null,
    liveDrillPairInputLastSent: 0,
    liveDrillPairPointerActive: false
  };

  async function init() {
    const viewerReady = await waitFor(() => shouldMountOnThisPage(), 12000, 250);
    if (!viewerReady) return;

    loadSavedState();
    writePinModePreference(true);
    syncLabelRepositoryToExtensionStorage();
    syncLabelDetailRepositoryToExtensionStorage();
    mount();
    refreshPanel();
    window.addEventListener("fullscreenchange", remount);
    window.addEventListener("resize", keepPanelInViewport);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("hashchange", () => {
      restoreLiveDrillFromUrl({ reason: "hashchange" }).catch((error) => {
        setStatus(`Live drill restore failed: ${error?.message || error}`, 9000);
      });
    });
    scheduleAllStructuresHiddenOnLoad();
    syncReverseScrollForCurrentPlane().catch(() => {});
    state.reverseScrollWatchTimer = window.setInterval(() => {
      syncReverseScrollForCurrentPlane().catch(() => {});
    }, 1400);
    scheduleQuietPinsResetOnLoad();
    setTimeout(() => {
      restoreLiveDrillFromUrl({ reason: "load" }).catch((error) => {
        setStatus(`Live drill restore failed: ${error?.message || error}`, 9000);
      });
    }, 900);
  }

  function loadSavedState() {
    try {
      const page = JSON.parse(localStorage.getItem(PAGE_STORAGE_KEY) || "{}");
      const prefs = JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY) || "{}");
      if (Array.isArray(page.boxes)) state.boxes = page.boxes;
      if (Array.isArray(page.selectedStructures)) state.selectedStructures = page.selectedStructures;
      if (typeof page.customListText === "string") state.customListText = page.customListText;
      if (typeof page.routingText === "string") state.routingText = page.routingText;
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
      if (["current", "axial-coronal", "all"].includes(prefs.recordPlaneScope)) {
        state.recordPlaneScope = prefs.recordPlaneScope;
      }
      if (Number.isFinite(prefs.chunkInfoFontSize)) {
        state.chunkInfoFontSize = clamp(Math.round(prefs.chunkInfoFontSize), 12, 24);
      }
      if (prefs.cardSeriesOptionsByModule && typeof prefs.cardSeriesOptionsByModule === "object") {
        state.cardSeriesOptionsByModule = normalizeCardSeriesMap(prefs.cardSeriesOptionsByModule);
      }
      if (prefs.cardSeriesSelectionsByModule && typeof prefs.cardSeriesSelectionsByModule === "object") {
        state.cardSeriesSelectionsByModule = normalizeCardSeriesMap(prefs.cardSeriesSelectionsByModule);
      }
      if (typeof prefs.routingDeckRoot === "string") {
        state.routingDeckRoot = prefs.routingDeckRoot || DEFAULT_DECK_ROOT;
      }
      state.chunkLibrary = normalizeImportedChunkLibrary(JSON.parse(localStorage.getItem(CHUNK_LIBRARY_STORAGE_KEY) || "null"));
      state.labelRepository = normalizeImportedLabelRepository(JSON.parse(localStorage.getItem(LABEL_REPOSITORY_STORAGE_KEY) || "null"));
      state.labelDetailRepository = normalizeImportedLabelDetailRepository(JSON.parse(localStorage.getItem(LABEL_DETAIL_REPOSITORY_STORAGE_KEY) || "null"));
      state.lastLiveDrillCardSource = normalizeSavedLiveDrillSource(JSON.parse(localStorage.getItem(LAST_LIVE_DRILL_CARD_SOURCE_KEY) || "null"));
      state.liveDrillCardBatch = normalizeLiveDrillCardBatch(JSON.parse(localStorage.getItem(LIVE_DRILL_CARD_BATCH_STORAGE_KEY) || "null"));
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
        routingText: state.routingText,
        boxes: state.boxes,
        boxesVisible: state.boxesVisible,
        collapsed: state.collapsed
      }));
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({
        panelPosition: state.panelPosition,
        rangeCineSpeed: state.rangeCineSpeed,
        applyChunkClearFirst: state.applyChunkClearFirst,
        recordPlaneScope: state.recordPlaneScope,
        chunkInfoFontSize: state.chunkInfoFontSize,
        cardSeriesOptionsByModule: state.cardSeriesOptionsByModule,
        cardSeriesSelectionsByModule: state.cardSeriesSelectionsByModule,
        routingDeckRoot: state.routingDeckRoot,
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
    const currentChunkButtonHtml = buildCurrentChunkButtonHtml();
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
          max-height: calc(100vh - 12px);
          display: flex;
          flex-direction: column;
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
          flex: 1 1 auto;
          min-height: 0;
          overflow: auto;
          overscroll-behavior: contain;
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

        .chunk-current-control {
          display: block;
        }

        .chunk-select-button {
          width: 100%;
          min-height: 44px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          text-align: left;
        }

        .chunk-select-number,
        .chunk-picker-number {
          display: inline-grid;
          place-items: center;
          width: 24px;
          height: 24px;
          border: 1px solid rgba(116,184,255,0.38);
          border-radius: 999px;
          background: rgba(24,104,171,0.24);
          color: rgba(236,247,255,0.96);
          font-size: 11px;
          font-weight: 800;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }

        .chunk-select-copy {
          display: grid;
          min-width: 0;
          gap: 2px;
        }

        .chunk-select-title {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 760;
          line-height: 1.2;
          color: rgba(255,255,255,0.96);
        }

        .chunk-select-hint {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10px;
          font-weight: 550;
          line-height: 1.2;
          color: rgba(245,247,250,0.58);
        }

        .chunk-info-strip {
          display: block;
          min-height: 58px;
          max-height: 58px;
          overflow: auto;
          padding: 7px 9px;
          border: 1px solid rgba(116,184,255,0.18);
          border-left: 3px solid rgba(116,184,255,0.45);
          border-radius: 7px;
          background: linear-gradient(135deg, rgba(14, 23, 32, 0.82), rgba(255,255,255,0.035));
          color: rgba(245,247,250,0.78);
          font: 10.8px/1.36 Inter, "Segoe UI", Arial, sans-serif;
          resize: vertical;
          cursor: zoom-in;
          transition: max-height 140ms ease, border-color 140ms ease, background 140ms ease;
          overscroll-behavior: contain;
        }

        .chunk-info-strip:hover,
        .chunk-info-strip:focus {
          max-height: 132px;
          border-color: rgba(116,184,255,0.44);
          background: linear-gradient(135deg, rgba(14, 23, 32, 0.96), rgba(255,255,255,0.05));
        }

        .chunk-info-strip.empty {
          color: rgba(245,247,250,0.46);
          font-style: italic;
        }

        .chunk-info-dialog {
          width: min(680px, calc(100vw - 28px));
        }

        .chunk-info-reader {
          max-height: min(440px, calc(100vh - 190px));
          overflow: auto;
          padding: 13px 14px;
          border: 1px solid rgba(116,184,255,0.24);
          border-left: 3px solid rgba(116,184,255,0.58);
          border-radius: 8px;
          background: rgba(9, 13, 18, 0.88);
          color: rgba(247,250,255,0.94);
          line-height: 1.45;
          white-space: pre-wrap;
          overscroll-behavior: contain;
        }

        .chunk-info-reader.empty {
          color: rgba(245,247,250,0.52);
          font-style: italic;
        }

        .chunk-info-controls {
          display: grid;
          grid-template-columns: auto minmax(120px, 1fr) auto;
          align-items: center;
          gap: 8px;
          padding: 8px 0 0;
          color: rgba(245,247,250,0.68);
          font-size: 11px;
        }

        .chunk-info-controls input {
          width: 100%;
        }

        .card-plane-control {
          display: grid;
          grid-template-columns: minmax(104px, 0.44fr) 1fr;
          align-items: center;
          gap: 6px;
        }

        .card-plane-control button {
          min-height: 28px;
          padding: 4px 7px;
          font-size: 11px;
        }

        .card-plane-summary {
          min-height: 28px;
          padding: 5px 7px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 6px;
          background: rgba(255,255,255,0.05);
          color: rgba(245,247,250,0.82);
          font-size: 10.5px;
          line-height: 1.35;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .card-plane-picker {
          display: grid;
          gap: 7px;
          padding: 8px;
          border: 1px solid rgba(116,184,255,0.25);
          border-radius: 7px;
          background: rgba(11, 15, 20, 0.92);
        }

        .card-plane-picker.support-hidden {
          display: none;
        }

        .card-plane-picker-head,
        .card-plane-picker-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          color: rgba(245,247,250,0.72);
          font-size: 10.5px;
        }

        .card-plane-picker-head button,
        .card-plane-picker-foot button {
          min-height: 24px;
          padding: 3px 7px;
          font-size: 10.5px;
        }

        .card-plane-options {
          display: grid;
          gap: 5px;
          max-height: 132px;
          overflow: auto;
          padding-right: 2px;
        }

        .card-plane-option {
          display: grid;
          grid-template-columns: 18px 1fr;
          align-items: start;
          gap: 6px;
          padding: 5px 6px;
          border-radius: 6px;
          background: rgba(255,255,255,0.05);
          color: rgba(245,247,250,0.9);
          font-size: 11px;
          line-height: 1.25;
        }

        .card-plane-option input {
          margin: 1px 0 0;
        }

        .library-modal {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 14px;
          background: rgba(0,0,0,0.48);
          pointer-events: auto;
          z-index: 2147483647;
        }

        .library-modal.hidden {
          display: none;
        }

        .library-dialog {
          width: min(520px, calc(100vw - 28px));
          max-height: min(660px, calc(100vh - 32px));
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 9px;
          background: rgba(24, 27, 31, 0.98);
          box-shadow: 0 18px 42px rgba(0,0,0,0.5);
          color: #f5f7fa;
        }

        .library-header,
        .library-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 11px;
          background: rgba(255,255,255,0.06);
        }

        .library-header strong {
          font-size: 13px;
        }

        .library-body {
          display: grid;
          gap: 8px;
          min-height: 0;
          overflow: auto;
          padding: 10px;
        }

        .library-footer {
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .library-empty {
          padding: 14px;
          border: 1px dashed rgba(255,255,255,0.16);
          border-radius: 8px;
          color: rgba(245,247,250,0.62);
          font-size: 12px;
          line-height: 1.35;
        }

        .chunk-picker-grid {
          display: grid;
          gap: 8px;
        }

        .chunk-picker-card {
          display: grid;
          gap: 7px;
          padding: 10px;
          border: 1px solid rgba(255,255,255,0.12);
          border-left: 3px solid rgba(116,184,255,0.38);
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.035));
        }

        .chunk-picker-card.active {
          border-color: rgba(116,184,255,0.48);
          border-left-color: rgba(58,158,255,0.95);
          background: linear-gradient(135deg, rgba(38,123,202,0.18), rgba(255,255,255,0.04));
          box-shadow: inset 0 0 0 1px rgba(58,158,255,0.12);
        }

        .chunk-picker-head {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: start;
          gap: 8px;
        }

        .chunk-picker-title {
          font-size: 13px;
          font-weight: 760;
          line-height: 1.25;
          color: rgba(255,255,255,0.96);
        }

        .chunk-picker-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 5px;
        }

        .chunk-pill {
          display: inline-flex;
          align-items: center;
          min-height: 20px;
          padding: 2px 7px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          background: rgba(0,0,0,0.22);
          color: rgba(245,247,250,0.74);
          font-size: 10.5px;
          line-height: 1.2;
          white-space: nowrap;
        }

        .chunk-pill.strong {
          border-color: rgba(116,184,255,0.38);
          background: rgba(24,104,171,0.3);
          color: rgba(236,247,255,0.96);
          font-weight: 750;
        }

        .chunk-picker-labels {
          color: rgba(245,247,250,0.62);
          font-size: 10.8px;
          line-height: 1.35;
          max-height: 44px;
          overflow: hidden;
        }

        .chunk-picker-action {
          min-width: 104px;
          align-self: start;
        }

        .batch-group {
          display: grid;
          gap: 7px;
          padding: 8px 9px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          border-left: 3px solid rgba(116,184,255,0.35);
          background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.028));
        }

        .batch-cart-dialog {
          width: min(700px, calc(100vw - 28px));
        }

        .batch-group-head {
          display: grid;
          grid-template-columns: 18px minmax(0, 1fr);
          align-items: start;
          gap: 7px;
          color: rgba(245,247,250,0.96);
          font-weight: 750;
          font-size: 12px;
          line-height: 1.25;
        }

        .batch-group-copy {
          display: grid;
          min-width: 0;
          gap: 3px;
        }

        .batch-title-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: baseline;
          gap: 8px;
        }

        .batch-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .batch-label-preview {
          max-height: 42px;
          overflow: auto;
          padding: 5px 7px;
          border-radius: 6px;
          background: rgba(0,0,0,0.16);
          color: rgba(245,247,250,0.72);
          font-size: 10.5px;
          font-weight: 520;
          line-height: 1.35;
          overscroll-behavior: contain;
        }

        .batch-plane-list {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .batch-plane-row {
          display: inline-grid;
          grid-template-columns: 16px auto;
          align-items: center;
          gap: 5px;
          max-width: 100%;
          padding: 4px 7px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 999px;
          background: rgba(0,0,0,0.2);
          color: rgba(245,247,250,0.82);
          font-size: 10.5px;
          line-height: 1.15;
        }

        .batch-group input {
          margin: 0;
          accent-color: #1f8ddc;
        }

        .batch-meta {
          color: rgba(245,247,250,0.56);
          font-size: 10.5px;
          white-space: nowrap;
        }

        .batch-plane-row .batch-meta {
          font-size: 9.8px;
        }

        .quick-card-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
        }

        .quick-card-actions button {
          min-height: 28px;
          padding: 4px 6px;
          font-size: 11px;
        }

        .quick-card-actions .primary,
        .quick-card-actions button[data-action="toggle-paired-answer"],
        .quick-card-actions button[data-action="add-module-chunks-to-batch"] {
          grid-column: 1 / -1;
        }

        .quick-batch-cart {
          display: grid;
          gap: 4px;
        }

        .quick-batch-summary {
          min-height: 28px;
          padding: 5px 7px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 6px;
          background: rgba(255,255,255,0.05);
          color: rgba(245,247,250,0.82);
          font-size: 10.5px;
          line-height: 1.35;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .quick-batch-cart button {
          min-height: 28px;
          padding: 4px 7px;
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
        input[type="text"],
        button {
          box-sizing: border-box;
          font: inherit;
        }

        select,
        textarea,
        input[type="text"] {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 6px;
          background: #2b2f34;
          color: #f5f7fa;
          outline: none;
        }

        select,
        input[type="text"] {
          height: 30px;
          padding: 0 8px;
          font-size: 12px;
        }

        select:focus,
        textarea:focus,
        input[type="text"]:focus {
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

        .capture-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .capture-scope {
          height: 30px;
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
          padding: 8px 9px;
          border: 1px solid rgba(77, 154, 220, 0.36);
          border-radius: 8px;
          background: rgba(20, 29, 38, 0.9);
          color: #8fd0ff;
        }

        .status:empty {
          display: none;
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
          max-height: 132px;
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
          <div class="chunk-current-control">
            <button class="chunk-select-button" type="button" data-action="open-chunk-modal" data-role="quick-chunk-button">${currentChunkButtonHtml}</button>
          </div>
          <div class="chunk-info-strip empty" data-role="quick-chunk-info" tabindex="0" role="button" aria-label="Open chunk scan guide">Select a chunk to show its scan guide.</div>
          <div class="quick-chunk-label">Card planes</div>
          <div class="card-plane-control">
            <button type="button" data-action="toggle-card-plane-picker">Select planes</button>
            <div class="card-plane-summary" data-role="card-plane-summary"></div>
          </div>
          <div class="quick-batch-cart">
            <div class="quick-chunk-label">Anki batch cart</div>
            <div class="quick-batch-summary" data-role="quick-batch-cart-summary">Batch cart empty</div>
            <button type="button" data-action="open-batch-cart-modal">Manage batch</button>
          </div>
          <div class="quick-card-actions">
            <button class="primary" type="button" data-action="run-live-drill-smart-card-automation">Create Anki cards based on batch</button>
            <button type="button" data-action="add-current-live-drill-to-batch">Add current plane</button>
            <button type="button" data-action="add-live-drill-to-batch">Add selected planes</button>
            <button type="button" data-action="add-module-chunks-to-batch" title="Add every chunk in this module across the selected card planes">Add all module chunks</button>
          </div>
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
            <summary>Breadcrumb routing</summary>
            <div class="section-note">Paste a route JSON here to apply breadcrumb/deck/tags to this imported chunk session. Deck root replaces the first segment of any pasted deckPath.</div>
            <input type="text" data-role="routing-root" spellcheck="false" aria-label="Deck root" placeholder="IMAIOS">
            <textarea data-role="routing-json" spellcheck="false" placeholder='{"breadcrumb":["Head and Neck","Temporal Bone"],"deckPath":"IMAIOS::Head and Neck::Temporal Bone","tags":["head_neck","temporal_bone"]}'></textarea>
            <div class="row three">
              <button class="primary" type="button" data-action="apply-routing-json">Apply routing</button>
              <button type="button" data-action="copy-routing-json">Copy current</button>
              <button class="danger" type="button" data-action="clear-routing-json">Clear route</button>
            </div>
            <div class="chunk-summary" data-role="routing-summary"></div>
          </details>

          <details class="tool-section">
            <summary>Cine capture</summary>
            <select class="capture-scope" data-role="record-plane-scope">${buildPlaneScopeOptions()}</select>
            <div class="capture-actions">
              <button class="primary" type="button" data-action="record-cine">Record pair</button>
              <button type="button" data-action="copy-anki-video-html">Copy Anki HTML</button>
            </div>
            <div class="section-note">Uses the selected chunk/range and saves the pins plus labels pair for Anki.</div>
          </details>

          <details class="tool-section">
            <summary>Live drill links</summary>
            <div class="row three">
              <button class="primary" type="button" data-action="copy-live-drill-link">Copy link</button>
              <button type="button" data-action="copy-live-drill-json">Copy JSON</button>
              <button type="button" data-action="test-live-drill">Test</button>
            </div>
            <div class="row">
              <button type="button" data-action="copy-live-drill-card-prompt">Copy prompt</button>
              <button type="button" data-action="import-live-drill-card-plan">Plan to TSV</button>
            </div>
            <div class="row three">
              <button type="button" data-action="add-current-live-drill-to-batch">Add current</button>
              <button type="button" data-action="add-live-drill-to-batch">Add selected</button>
              <button type="button" data-action="add-module-chunks-to-batch">Add module</button>
            </div>
            <div class="row">
              <button type="button" data-action="open-batch-cart-modal">Manage batch</button>
              <button class="danger" type="button" data-action="clear-live-drill-card-batch">Clear batch</button>
            </div>
            <div class="row">
              <button type="button" data-action="copy-live-drill-card-batch">Copy batch</button>
              <button type="button" data-action="backup-live-drill-card-batch">Save batch</button>
            </div>
            <div class="chunk-summary" data-role="live-drill-card-batch-summary"></div>
            <div class="row">
              <button type="button" data-action="probe-locked-details">Probe label info</button>
              <button type="button" data-action="probe-locked-details-search-pin">Probe via search pins</button>
              <button type="button" data-action="probe-locked-details-search-pin-fast">Fast probe</button>
              <button type="button" data-action="probe-native-restore">Native restore probe</button>
              <button type="button" data-action="probe-native-id-map">Native ID map</button>
              <button type="button" data-action="probe-native-action-discovery">Action discovery</button>
              <button type="button" data-action="probe-native-bundle-search">Bundle search</button>
              <button type="button" data-action="start-native-action-trace">Start trace</button>
              <button type="button" data-action="copy-native-action-trace">Copy trace</button>
              <button type="button" data-action="copy-live-drill-restore-debug">Restore debug</button>
              <button type="button" data-action="mark-native-state-baseline">Mark state</button>
              <button type="button" data-action="copy-native-state-diff">State diff</button>
              <button type="button" data-action="copy-slice">Copy slice</button>
            </div>
            <div class="section-note">Uses the currently locked labels to create Anki live-drill links. ChatGPT plans the subgroups; this extension builds the links.</div>
          </details>

          <details class="tool-section">
            <summary>Label repository</summary>
            <div class="section-note">Harvest search-verifies this module and saves only labels IMAIOS can actually find.</div>
            <div class="main-actions">
              <button class="primary" type="button" data-action="harvest-labels">Harvest labels</button>
              <button type="button" data-action="map-module-native-ids">Collect IDs</button>
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
              <button type="button" data-action="probe-locked-details">Probe label info</button>
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
            <div class="row">
              <button class="primary" type="button" data-action="record-cine">Record pair</button>
              <button type="button" data-action="copy-anki-video-html">Copy Anki HTML</button>
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
      <div class="library-modal hidden" data-role="chunk-modal">
        <div class="library-dialog" role="dialog" aria-label="Select IMAIOS chunk">
          <div class="library-header">
            <strong>Current chunk</strong>
            <button class="icon-button" type="button" data-action="close-chunk-modal" title="Close chunk selector">x</button>
          </div>
          <div class="library-body" data-role="chunk-modal-body"></div>
          <div class="library-footer">
            <button type="button" data-action="reapply-current-chunk">Reapply current</button>
            <button class="primary" type="button" data-action="close-chunk-modal">Done</button>
          </div>
        </div>
      </div>
      <div class="library-modal hidden" data-role="chunk-info-modal">
        <div class="library-dialog chunk-info-dialog" role="dialog" aria-label="Read current chunk guide">
          <div class="library-header">
            <strong data-role="chunk-info-title">Chunk guide</strong>
            <button class="icon-button" type="button" data-action="close-chunk-info-modal" title="Close chunk guide">x</button>
          </div>
          <div class="library-body">
            <div data-role="chunk-info-modal-body"></div>
            <label class="chunk-info-controls">
              <span>Text</span>
              <input type="range" min="12" max="24" step="1" data-role="chunk-info-font-size">
              <span data-role="chunk-info-font-size-value"></span>
            </label>
          </div>
        </div>
      </div>
      <div class="library-modal hidden" data-role="card-plane-modal">
        <div class="library-dialog" role="dialog" aria-label="Select IMAIOS card planes">
          <div class="library-header">
            <strong>Select planes</strong>
            <button class="icon-button" type="button" data-action="close-card-plane-picker" title="Close plane selector">x</button>
          </div>
          <div class="library-body">
            <div class="section-note">Saved for this module. These are used by Add selected planes and Add module chunks.</div>
            <div class="card-plane-options" data-role="card-plane-options"></div>
          </div>
          <div class="library-footer">
            <button type="button" data-action="refresh-card-plane-options">Refresh</button>
            <button class="primary" type="button" data-action="close-card-plane-picker">Done</button>
          </div>
        </div>
      </div>
      <div class="library-modal hidden" data-role="batch-cart-modal">
        <div class="library-dialog batch-cart-dialog" role="dialog" aria-label="Review IMAIOS Anki batch cart">
          <div class="library-header">
            <strong>Anki batch cart</strong>
            <button class="icon-button" type="button" data-action="close-batch-cart-modal" title="Close batch cart">x</button>
          </div>
          <div class="library-body" data-role="batch-cart-body"></div>
          <div class="library-footer">
            <button type="button" data-action="remove-checked-batch-cart-items">Remove checked</button>
            <button class="danger" type="button" data-action="clear-live-drill-card-batch">Clear batch</button>
            <button class="primary" type="button" data-action="close-batch-cart-modal">Done</button>
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
    root.querySelector("[data-role='routing-json']").addEventListener("input", (event) => {
      state.routingText = event.target.value;
      savePageState();
    });
    root.querySelector("[data-role='routing-root']").addEventListener("input", (event) => {
      state.routingDeckRoot = cleanText(event.target.value) || DEFAULT_DECK_ROOT;
      savePageState();
      const routingSummary = root.querySelector("[data-role='routing-summary']");
      if (routingSummary) routingSummary.textContent = getRoutingSummaryText();
    });
    root.querySelector("[data-role='chunk']").addEventListener("change", (event) => {
      setActiveChunkId(event.target.value);
    });
    root.querySelectorAll("[data-action='open-chunk-modal']").forEach((button) => {
      button.addEventListener("click", openChunkModal);
    });
    root.querySelectorAll("[data-action='close-chunk-modal']").forEach((button) => {
      button.addEventListener("click", closeChunkModal);
    });
    root.querySelector("[data-role='quick-chunk-info']").addEventListener("click", openChunkInfoModal);
    root.querySelector("[data-role='quick-chunk-info']").addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openChunkInfoModal();
    });
    root.querySelectorAll("[data-action='close-chunk-info-modal']").forEach((button) => {
      button.addEventListener("click", closeChunkInfoModal);
    });
    root.querySelector("[data-role='chunk-info-font-size']").addEventListener("input", (event) => {
      state.chunkInfoFontSize = clamp(Number(event.target.value) || 15, 12, 24);
      savePageState();
      refreshPanel();
    });
    root.querySelector("[data-action='reapply-current-chunk']").addEventListener("click", reapplyActiveChunkFromQuickSelect);
    root.addEventListener("click", async (event) => {
      const button = event.target?.closest?.("[data-action='select-chunk-from-modal']");
      if (!button) return;
      const chunkId = cleanText(button.getAttribute("data-chunk-id") || "");
      if (!chunkId) return;
      await setActiveChunkIdAndApply(chunkId, { forceClearFirst: true, closeChunkModal: true, fastReview: true });
    });
    root.querySelector("[data-role='chunk-module']").addEventListener("change", (event) => {
      navigateToChunkModule(event.target.value);
    });
    root.querySelector("[data-role='apply-clear-first']").addEventListener("change", (event) => {
      state.applyChunkClearFirst = Boolean(event.target.checked);
      savePageState();
      refreshPanel();
    });
    root.querySelectorAll("[data-role='record-plane-scope']").forEach((select) => {
      select.addEventListener("change", (event) => {
        const value = String(event.target.value || "current");
        state.recordPlaneScope = ["current", "axial-coronal", "all"].includes(value) ? value : "current";
        savePageState();
        refreshPanel();
      });
    });
    root.querySelector("[data-action='toggle-card-plane-picker']").addEventListener("click", toggleCardPlanePicker);
    root.querySelector("[data-action='refresh-card-plane-options']").addEventListener("click", refreshCardPlaneOptionsFromImaios);
    root.querySelectorAll("[data-action='close-card-plane-picker']").forEach((button) => button.addEventListener("click", () => {
      state.cardPlanePickerOpen = false;
      refreshPanel();
    }));
    root.addEventListener("change", (event) => {
      const checkbox = event.target?.closest?.("[data-role='card-plane-option']");
      if (!checkbox) return;
      updateCardSeriesSelectionFromPicker();
    });
    root.querySelector("[data-action='apply-chunk']").addEventListener("click", applyActiveChunk);
    root.querySelector("[data-action='check-chunk']").addEventListener("click", checkActiveChunk);
    root.querySelector("[data-action='import-chunks']").addEventListener("click", importChunksFromClipboard);
    root.querySelector("[data-action='import-chunk-file']").addEventListener("click", () => {
      const input = root.querySelector("[data-role='chunk-file-input']");
      if (input) input.click();
    });
    root.querySelector("[data-role='chunk-file-input']").addEventListener("change", importChunksFromSelectedFile);
    root.querySelector("[data-action='apply-routing-json']").addEventListener("click", applyRoutingJsonFromPanel);
    root.querySelector("[data-action='copy-routing-json']").addEventListener("click", copyCurrentRoutingJson);
    root.querySelector("[data-action='clear-routing-json']").addEventListener("click", clearCurrentRoutingMetadata);
    root.querySelector("[data-action='import-labels']").addEventListener("click", importLabelsFromClipboard);
    root.querySelector("[data-action='copy-chunk-template']").addEventListener("click", copyChunkTemplate);
    root.querySelector("[data-action='harvest-labels']").addEventListener("click", harvestCurrentModuleLabels);
    root.querySelector("[data-action='map-module-native-ids']").addEventListener("click", mapCurrentModuleNativeIds);
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
      const result = await resetQuietPinsByCyclingPins();
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
    root.querySelectorAll("[data-action='copy-slice']").forEach((button) => {
      button.addEventListener("click", copySliceProbe);
    });
    root.querySelectorAll("[data-action='probe-locked-details']").forEach((button) => {
      button.addEventListener("click", copyLockedLabelDetailProbe);
    });
    root.querySelector("[data-action='probe-locked-details-search-pin']").addEventListener("click", () => {
      copyLockedLabelSearchPinDetailProbe({ fast: false });
    });
    root.querySelector("[data-action='probe-locked-details-search-pin-fast']").addEventListener("click", () => {
      copyLockedLabelSearchPinDetailProbe({ fast: true });
    });
    root.querySelector("[data-action='probe-native-restore']").addEventListener("click", copyNativeRestoreProbe);
    root.querySelector("[data-action='probe-native-id-map']").addEventListener("click", copyNativeIdMapProbe);
    root.querySelector("[data-action='probe-native-action-discovery']").addEventListener("click", copyNativeActionDiscoveryProbe);
    root.querySelector("[data-action='probe-native-bundle-search']").addEventListener("click", copyNativeBundleSearchProbe);
    root.querySelector("[data-action='start-native-action-trace']").addEventListener("click", startNativeActionTraceProbe);
    root.querySelector("[data-action='copy-native-action-trace']").addEventListener("click", copyNativeActionTraceProbe);
    root.querySelector("[data-action='copy-live-drill-restore-debug']").addEventListener("click", copyLiveDrillRestoreDebug);
    root.querySelector("[data-action='mark-native-state-baseline']").addEventListener("click", markNativeRestoreStateBaseline);
    root.querySelector("[data-action='copy-native-state-diff']").addEventListener("click", copyNativeRestoreStateDiff);
    root.querySelector("[data-action='copy-range']").addEventListener("click", copyCineRangeText);
    root.querySelector("[data-action='copy-range-json']").addEventListener("click", copyCineRangeJson);
    root.querySelector("[data-action='go-range-start']").addEventListener("click", goToRangeStart);
    root.querySelector("[data-action='play-range']").addEventListener("click", toggleRangeCine);
    root.querySelector("[data-action='stop-range']").addEventListener("click", stopRangeCine);
    root.querySelectorAll("[data-action='record-cine']").forEach((button) => {
      button.addEventListener("click", recordCurrentCineForAnki);
    });
    root.querySelectorAll("[data-action='copy-anki-video-html']").forEach((button) => {
      button.addEventListener("click", copyCurrentAnkiVideoHtml);
    });
    root.querySelector("[data-action='copy-live-drill-link']").addEventListener("click", copyLiveDrillLink);
    root.querySelector("[data-action='copy-live-drill-json']").addEventListener("click", copyLiveDrillJson);
    root.querySelector("[data-action='test-live-drill']").addEventListener("click", testLiveDrillRestore);
    root.querySelectorAll("[data-action='run-live-drill-smart-card-automation']").forEach((button) => {
      button.addEventListener("click", runLiveDrillSmartCardAutomation);
    });
    root.querySelectorAll("[data-action='run-live-drill-card-automation']").forEach((button) => {
      button.addEventListener("click", runLiveDrillCardAutomation);
    });
    root.querySelectorAll("[data-action='add-live-drill-to-batch']").forEach((button) => {
      button.addEventListener("click", addCurrentLiveDrillToCardBatch);
    });
    root.querySelectorAll("[data-action='add-current-live-drill-to-batch']").forEach((button) => {
      button.addEventListener("click", addCurrentLiveDrillCurrentPlaneToCardBatch);
    });
    root.querySelectorAll("[data-action='add-module-chunks-to-batch']").forEach((button) => {
      button.addEventListener("click", addCurrentModuleChunksToCardBatch);
    });
    root.querySelectorAll("[data-action='open-batch-cart-modal']").forEach((button) => {
      button.addEventListener("click", openBatchCartModal);
    });
    root.querySelectorAll("[data-action='close-batch-cart-modal']").forEach((button) => {
      button.addEventListener("click", closeBatchCartModal);
    });
    root.querySelector("[data-action='remove-checked-batch-cart-items']").addEventListener("click", removeCheckedLiveDrillCardBatchItems);
    root.querySelector("[data-role='chunk-modal']").addEventListener("click", (event) => {
      if (event.target !== event.currentTarget) return;
      state.chunkModalOpen = false;
      refreshPanel();
    });
    root.querySelector("[data-role='chunk-info-modal']").addEventListener("click", (event) => {
      if (event.target !== event.currentTarget) return;
      state.chunkInfoModalOpen = false;
      refreshPanel();
    });
    root.querySelector("[data-role='card-plane-modal']").addEventListener("click", (event) => {
      if (event.target !== event.currentTarget) return;
      state.cardPlanePickerOpen = false;
      refreshPanel();
    });
    root.querySelector("[data-role='batch-cart-modal']").addEventListener("click", (event) => {
      if (event.target !== event.currentTarget) return;
      state.batchCartModalOpen = false;
      refreshPanel();
    });
    root.addEventListener("change", (event) => {
      const groupInput = event.target?.closest?.("[data-role='batch-cart-group-check']");
      if (!groupInput) return;
      const groupKey = cleanText(groupInput.getAttribute("data-group-key") || "");
      root.querySelectorAll("[data-role='batch-cart-item-check']").forEach((input) => {
        if (cleanText(input.getAttribute("data-group-key") || "") === groupKey) input.checked = groupInput.checked;
      });
    });
    root.querySelectorAll("[data-action='run-live-drill-batch-card-automation']").forEach((button) => {
      button.addEventListener("click", runLiveDrillBatchCardAutomation);
    });
    root.querySelector("[data-action='copy-live-drill-card-batch']").addEventListener("click", copyLiveDrillCardBatch);
    root.querySelector("[data-action='backup-live-drill-card-batch']").addEventListener("click", () => {
      backupLiveDrillCardBatchToDownloads("manual").then((result) => {
        setStatus(result.ok ? `Batch saved to ${result.path}.` : `Batch save failed: ${result.error || "unknown error"}`, result.ok ? 9000 : 12000);
      });
    });
    root.querySelectorAll("[data-action='clear-live-drill-card-batch']").forEach((button) => {
      button.addEventListener("click", clearLiveDrillCardBatch);
    });
    root.querySelectorAll("[data-action='toggle-paired-answer']").forEach((button) => {
      button.addEventListener("click", togglePairedAnswerSession);
    });
    root.querySelector("[data-action='copy-live-drill-card-prompt']").addEventListener("click", copyLiveDrillCardPrompt);
    root.querySelector("[data-action='import-live-drill-card-plan']").addEventListener("click", importLiveDrillCardPlanFromClipboard);
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
    const quickChunkButton = root.querySelector("[data-role='quick-chunk-button']");
    const quickChunkInfo = root.querySelector("[data-role='quick-chunk-info']");
    const quickBatchCartSummary = root.querySelector("[data-role='quick-batch-cart-summary']");
    const chunkSelect = root.querySelector("[data-role='chunk']");
    const chunkPreview = root.querySelector("[data-role='chunk-preview']");
    const chunkSummary = root.querySelector("[data-role='chunk-summary']");
    const routingRoot = root.querySelector("[data-role='routing-root']");
    const routingJson = root.querySelector("[data-role='routing-json']");
    const routingSummary = root.querySelector("[data-role='routing-summary']");
    const recordPlaneScopes = Array.from(root.querySelectorAll("[data-role='record-plane-scope']"));
    const chunkModal = root.querySelector("[data-role='chunk-modal']");
    const chunkModalBody = root.querySelector("[data-role='chunk-modal-body']");
    const chunkInfoModal = root.querySelector("[data-role='chunk-info-modal']");
    const chunkInfoTitle = root.querySelector("[data-role='chunk-info-title']");
    const chunkInfoBody = root.querySelector("[data-role='chunk-info-modal-body']");
    const chunkInfoFontSize = root.querySelector("[data-role='chunk-info-font-size']");
    const chunkInfoFontSizeValue = root.querySelector("[data-role='chunk-info-font-size-value']");
    const cardPlaneSummary = root.querySelector("[data-role='card-plane-summary']");
    const cardPlaneModal = root.querySelector("[data-role='card-plane-modal']");
    const cardPlaneOptions = root.querySelector("[data-role='card-plane-options']");
    const batchCartModal = root.querySelector("[data-role='batch-cart-modal']");
    const batchCartBody = root.querySelector("[data-role='batch-cart-body']");
    const applyClearFirst = root.querySelector("[data-role='apply-clear-first']");
    const customList = root.querySelector("[data-role='custom-list']");
    const selected = root.querySelector("[data-role='selected']");
    const togglePanel = root.querySelector("[data-action='toggle-panel']");
    const toggleBoxes = root.querySelector("[data-action='toggle-boxes']");
    const playRange = root.querySelector("[data-action='play-range']");
    const recordCineButtons = Array.from(root.querySelectorAll("[data-action='record-cine']"));
    const pairedAnswerButton = root.querySelector("[data-action='toggle-paired-answer']");
    const cineSpeed = root.querySelector("[data-role='cine-speed']");
    const cineSpeedValue = root.querySelector("[data-role='cine-speed-value']");
    const keyModal = root.querySelector("[data-role='key-modal']");
    const hotkeyHint = root.querySelector("[data-role='hotkey-hint']");
    const batchSummary = root.querySelector("[data-role='live-drill-card-batch-summary']");

    panel.classList.toggle("collapsed", state.collapsed);
    state.panelPosition.left = clamp(state.panelPosition.left, 4, Math.max(4, window.innerWidth - panel.offsetWidth - 4));
    state.panelPosition.top = clamp(state.panelPosition.top, 4, Math.max(4, window.innerHeight - panel.offsetHeight - 4));
    panel.style.left = `${state.panelPosition.left}px`;
    panel.style.top = `${state.panelPosition.top}px`;
    chunkModuleSelect.innerHTML = buildChunkModuleOptions();
    chunkModuleSelect.value = normalizeModuleKey(getCurrentModuleKey());
    if (quickChunkButton) quickChunkButton.innerHTML = buildCurrentChunkButtonHtml();
    if (quickChunkInfo) {
      const info = getActiveChunkInfoText();
      quickChunkInfo.textContent = info || "No scan guide saved for this chunk yet.";
      quickChunkInfo.classList.toggle("empty", !info);
      quickChunkInfo.removeAttribute("title");
    }
    if (quickBatchCartSummary) quickBatchCartSummary.textContent = getLiveDrillCardBatchCompactSummaryText();
    chunkSelect.innerHTML = buildChunkOptions();
    chunkSelect.value = state.activeChunkId;
    recordPlaneScopes.forEach((select) => {
      select.innerHTML = buildPlaneScopeOptions();
      select.value = state.recordPlaneScope;
      select.disabled = Boolean(state.recordingCine);
    });
    if (chunkModal) chunkModal.classList.toggle("hidden", !state.chunkModalOpen);
    if (chunkModalBody) chunkModalBody.innerHTML = buildChunkPickerModalHtml();
    if (chunkInfoModal) chunkInfoModal.classList.toggle("hidden", !state.chunkInfoModalOpen);
    if (chunkInfoTitle) chunkInfoTitle.textContent = getChunkInfoModalTitle();
    if (chunkInfoBody) chunkInfoBody.innerHTML = buildChunkInfoModalBodyHtml();
    if (chunkInfoFontSize) chunkInfoFontSize.value = String(state.chunkInfoFontSize);
    if (chunkInfoFontSizeValue) chunkInfoFontSizeValue.textContent = `${Math.round(state.chunkInfoFontSize)} px`;
    if (cardPlaneSummary) cardPlaneSummary.textContent = getCardSeriesSelectionSummary();
    if (cardPlaneModal) cardPlaneModal.classList.toggle("hidden", !state.cardPlanePickerOpen);
    if (cardPlaneOptions) cardPlaneOptions.innerHTML = buildCardSeriesPickerHtml();
    if (batchCartModal) batchCartModal.classList.toggle("hidden", !state.batchCartModalOpen);
    if (batchCartBody) batchCartBody.innerHTML = buildLiveDrillCardBatchCartModalHtml();
    applyClearFirst.checked = state.applyChunkClearFirst;
    chunkPreview.innerHTML = buildChunkPreviewHtml();
    chunkSummary.textContent = getChunkSummaryText();
    routingRoot.value = getRoutingDeckRoot();
    routingJson.value = state.routingText;
    routingSummary.textContent = getRoutingSummaryText();
    if (!state.customListText && chunk) state.customListText = chunkToPreferredLabelText(chunk);
    customList.value = state.customListText;
    togglePanel.textContent = state.collapsed ? "+" : "-";
    toggleBoxes.textContent = state.boxesVisible ? "Hide boxes" : "Show boxes";
    playRange.textContent = state.rangeCineRunning ? "Pause range" : "Play range";
    recordCineButtons.forEach((button) => {
      button.textContent = state.recordingCine ? "Recording..." : "Record pair";
      button.disabled = Boolean(state.recordingCine);
    });
    if (pairedAnswerButton) {
      const activePair = Boolean(state.liveDrillPair?.pairId);
      pairedAnswerButton.textContent = activePair ? "Switch pair tab" : "Open clean tab";
      pairedAnswerButton.classList.toggle("primary", activePair);
      pairedAnswerButton.disabled = false;
    }
    if (batchSummary) batchSummary.textContent = getLiveDrillCardBatchSummaryText();
    cineSpeed.value = String(state.rangeCineSpeed);
    cineSpeedValue.textContent = `${Math.round(1000 / state.rangeCineIntervalMs)} fps`;
    keyModal.classList.toggle("hidden", !state.keyEditorOpen);
    hotkeyHint.textContent = `${formatHotkey(state.hotkeys.pingpong)} ping-pong. ${formatHotkey(state.hotkeys.cineBackward)} backward, ${formatHotkey(state.hotkeys.cineForward)} forward. ${formatHotkey(state.hotkeys.speedDown)}/${formatHotkey(state.hotkeys.speedUp)} speed. ${formatHotkey(state.hotkeys.applyChunk)} apply chunk. ${formatHotkey(state.hotkeys.switchPairTab)} switch pair. ${formatHotkey(state.hotkeys.pinsOn)} pins, ${formatHotkey(state.hotkeys.labelsOn)} labels. ${formatHotkey(state.hotkeys.selectAll)} select all. ${formatHotkey(state.hotkeys.reverseScroll)} reverse scroll. ${formatHotkey(state.hotkeys.clearLocked)} clear locked. ${formatHotkey(state.hotkeys.axial)}/${formatHotkey(state.hotkeys.coronal)}/${formatHotkey(state.hotkeys.sagittal)} planes. ${formatHotkey(state.hotkeys.series1)}-${formatHotkey(state.hotkeys.series9)} series slots.`;
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

  function buildPlaneScopeOptions() {
    const options = [
      ["current", "Current plane"],
      ["axial-coronal", "Axial + Coronal"],
      ["all", "All available planes"]
    ];
    return options.map(([value, label]) => (
      `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`
    )).join("");
  }

  function getPlanesForScope(scope) {
    if (scope === "axial-coronal") return ["Axial", "Coronal"];
    if (scope === "all") return ["Axial", "Coronal", "Sagittal"];
    return ["current"];
  }

  function normalizeCardSeriesMap(value) {
    const output = {};
    if (!value || typeof value !== "object") return output;
    for (const [rawKey, rawItems] of Object.entries(value)) {
      const key = normalizeModuleKey(rawKey || "");
      if (!key || !Array.isArray(rawItems)) continue;
      const items = unique(rawItems.map(cleanText).filter(Boolean)).filter((name) => !isAllSeriesName(name));
      if (items.length) output[key] = items;
    }
    return output;
  }

  function getCardSeriesModuleKey() {
    return normalizeModuleKey(getCurrentModuleKey()) || normalizeModuleKey(location.pathname) || "current-module";
  }

  function getStoredCardSeriesOptions(moduleKey = getCardSeriesModuleKey()) {
    return unique((state.cardSeriesOptionsByModule[moduleKey] || []).map(cleanText).filter(Boolean)).filter((name) => !isAllSeriesName(name));
  }

  function getStoredCardSeriesSelection(moduleKey = getCardSeriesModuleKey()) {
    return unique((state.cardSeriesSelectionsByModule[moduleKey] || []).map(cleanText).filter(Boolean)).filter((name) => !isAllSeriesName(name));
  }

  function getCurrentSeriesLabel() {
    const series = getSeriesInfo();
    return cleanText(series.selectedSeries || normalizePlaneName(series.selectedPlane) || inferSelectedPlaneFromDom() || "");
  }

  function getAvailableCardSeriesOptions(moduleKey = getCardSeriesModuleKey()) {
    const seriesInfo = getSeriesInfo();
    const visible = Array.isArray(seriesInfo.availableSeries) ? seriesInfo.availableSeries : [];
    const current = getCurrentSeriesLabel();
    return unique([
      ...getStoredCardSeriesOptions(moduleKey),
      current,
      ...visible
    ].map(cleanText).filter(Boolean)).filter((name) => !isAllSeriesName(name));
  }

  function getSelectedCardSeriesForCurrentModule() {
    const moduleKey = getCardSeriesModuleKey();
    const selected = getStoredCardSeriesSelection(moduleKey);
    return selected.length ? selected : [];
  }

  function getCardSeriesSelectionSummary() {
    const selected = getSelectedCardSeriesForCurrentModule();
    if (!selected.length) {
      const current = getCurrentSeriesLabel();
      return current ? `Current only: ${current}` : "Current plane only";
    }
    if (selected.length <= 2) return selected.join(", ");
    return `${selected.slice(0, 2).join(", ")} +${selected.length - 2}`;
  }

  function buildCardSeriesPickerHtml() {
    const moduleKey = getCardSeriesModuleKey();
    const options = getAvailableCardSeriesOptions(moduleKey);
    const selected = new Set(getStoredCardSeriesSelection(moduleKey).map(normalizeText));
    if (!options.length) {
      return `<div class="section-note">Click Refresh after the IMAIOS series menu is available.</div>`;
    }
    return options.map((name) => {
      const checked = selected.has(normalizeText(name));
      return [
        `<label class="card-plane-option">`,
        `<input type="checkbox" data-role="card-plane-option" value="${escapeHtml(name)}"${checked ? " checked" : ""}>`,
        `<span>${escapeHtml(name)}</span>`,
        `</label>`
      ].join("");
    }).join("");
  }

  async function toggleCardPlanePicker() {
    state.cardPlanePickerOpen = !state.cardPlanePickerOpen;
    if (state.cardPlanePickerOpen && !getStoredCardSeriesOptions().length) {
      await refreshCardPlaneOptionsFromImaios({ keepOpen: true });
      return;
    }
    refreshPanel();
  }

  async function refreshCardPlaneOptionsFromImaios(options = {}) {
    const moduleKey = getCardSeriesModuleKey();
    const menuButton = findPlaneSelectorButton();
    const menuRect = menuButton ? menuButton.getBoundingClientRect() : null;
    await openSeriesMenuIfNeeded(menuButton, menuRect);
    await delay(120);
    const detected = unique(getVisibleQuickSeriesOptionsNear(menuRect)
      .map((element) => getQuickSeriesOptionName(element))
      .map(cleanText)
      .filter(Boolean))
      .filter((name) => !isAllSeriesName(name));
    const current = getCurrentSeriesLabel();
    const optionsForModule = unique([current, ...detected].map(cleanText).filter(Boolean)).filter((name) => !isAllSeriesName(name));
    if (optionsForModule.length) {
      state.cardSeriesOptionsByModule[moduleKey] = optionsForModule;
      const currentSelection = getStoredCardSeriesSelection(moduleKey);
      if (!currentSelection.length && current) {
        state.cardSeriesSelectionsByModule[moduleKey] = [current];
      } else if (currentSelection.length) {
        const available = new Set(optionsForModule.map(normalizeText));
        const kept = currentSelection.filter((name) => available.has(normalizeText(name)));
        state.cardSeriesSelectionsByModule[moduleKey] = kept.length ? kept : [current || optionsForModule[0]].filter(Boolean);
      }
      savePageState();
      setStatus(`Detected ${optionsForModule.length} series for this module. Saved selection: ${getCardSeriesSelectionSummary()}.`, 6000);
    } else {
      setStatus("Could not detect series options. Open the IMAIOS series menu once, then try Refresh.", 8000);
    }
    state.cardPlanePickerOpen = options.keepOpen !== false;
    await closeSeriesMenuIfOpen(menuButton, menuRect);
    refreshPanel();
  }

  function updateCardSeriesSelectionFromPicker() {
    const root = state.shadow;
    if (!root) return;
    const moduleKey = getCardSeriesModuleKey();
    const values = Array.from(root.querySelectorAll("[data-role='card-plane-option']:checked"))
      .map((input) => cleanText(input.value || ""))
      .filter(Boolean);
    if (values.length) {
      state.cardSeriesSelectionsByModule[moduleKey] = unique(values);
    } else {
      delete state.cardSeriesSelectionsByModule[moduleKey];
    }
    savePageState();
    const summary = root.querySelector("[data-role='card-plane-summary']");
    if (summary) summary.textContent = getCardSeriesSelectionSummary();
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
    const matching = getCurrentModuleChunks();
    if (!matching.length) return `<option value="">No chunks for this module</option>`;
    return [
      `<option value="">Select chunk...</option>`,
      ...matching.map((chunk) => {
        const labelCount = getChunkLabelTargets(chunk).length;
        const countText = labelCount ? ` (${labelCount})` : " (0)";
        return `<option value="${escapeHtml(chunk.id)}">${escapeHtml(`${chunk.title || chunk.id || "Chunk"}${countText}`)}</option>`;
      })
    ].join("");
  }

  function buildCurrentChunkButtonHtml() {
    const chunk = getActiveChunk();
    if (!chunk) {
      return [
        `<span class="chunk-select-number">-</span>`,
        `<span class="chunk-select-copy">`,
        `<span class="chunk-select-title">Choose chunk</span>`,
        `<span class="chunk-select-hint">Click to change</span>`,
        `</span>`
      ].join("");
    }
    const labelCount = getChunkLabelTargets(chunk).length;
    const number = getChunkIndexInCurrentModule(chunk);
    const title = chunk.title || chunk.id || "Chunk";
    const labelText = `${labelCount} label${labelCount === 1 ? "" : "s"}`;
    return [
      `<span class="chunk-select-number">${escapeHtml(number ? String(number) : "-")}</span>`,
      `<span class="chunk-select-copy">`,
      `<span class="chunk-select-title">${escapeHtml(title)}</span>`,
      `<span class="chunk-select-hint">${escapeHtml(labelText)} - click to change</span>`,
      `</span>`
    ].join("");
  }

  function getChunkIndexInCurrentModule(chunk) {
    if (!chunk) return 0;
    const chunks = getCurrentModuleChunks();
    const index = chunks.findIndex((entry) => entry?.id && entry.id === chunk.id);
    return index >= 0 ? index + 1 : 0;
  }

  function getActiveChunkInfoText() {
    const chunk = getActiveChunk();
    if (!chunk) return "";
    const lines = normalizeStringList(chunk.learningFrame || chunk.learningNotes || chunk.notes);
    return lines.join(" ");
  }

  function openChunkModal() {
    state.chunkModalOpen = true;
    refreshPanel();
  }

  function closeChunkModal() {
    state.chunkModalOpen = false;
    refreshPanel();
  }

  function openChunkInfoModal() {
    state.chunkInfoModalOpen = true;
    refreshPanel();
  }

  function closeChunkInfoModal() {
    state.chunkInfoModalOpen = false;
    refreshPanel();
  }

  function getChunkInfoModalTitle() {
    const chunk = getActiveChunk();
    if (!chunk) return "Chunk guide";
    const number = getChunkIndexInCurrentModule(chunk);
    const title = chunk.title || chunk.id || "Chunk";
    return `${number ? `${number}. ` : ""}${title}`;
  }

  function buildChunkInfoModalBodyHtml() {
    const text = getActiveChunkInfoText();
    const className = text ? "chunk-info-reader" : "chunk-info-reader empty";
    const body = text || "No scan guide text is saved for this chunk yet.";
    return `<div class="${className}" style="font-size:${escapeHtml(String(Math.round(state.chunkInfoFontSize)))}px">${escapeHtml(body)}</div>`;
  }

  function buildChunkPickerModalHtml() {
    const chunks = getCurrentModuleChunks();
    if (!chunks.length) {
      return `<div class="library-empty">No chunks are available for this IMAIOS module. Import a chunk session or open the module that matches the imported chunks.</div>`;
    }
    return `<div class="chunk-picker-grid">${chunks.map((chunk, index) => buildChunkPickerCardHtml(chunk, index)).join("")}</div>`;
  }

  function buildChunkPickerCardHtml(chunk, index = 0) {
    const active = chunk?.id && chunk.id === state.activeChunkId;
    const targets = getChunkLabelTargets(chunk);
    const labels = targets.map((target) => cleanText(target.preferredLabel || "")).filter(Boolean);
    const parentGroup = cleanText(chunk?.parentGroup || chunk?.group || "");
    const modality = cleanText(chunk?.modality || "");
    const moduleName = getChunkModuleDisplayName(chunk);
    const actionText = active ? "Reapply" : "Select + apply";
    const meta = [
      `<span class="chunk-pill strong">${targets.length} label${targets.length === 1 ? "" : "s"}</span>`,
      parentGroup ? `<span class="chunk-pill">${escapeHtml(parentGroup)}</span>` : "",
      modality ? `<span class="chunk-pill">${escapeHtml(modality)}</span>` : "",
      moduleName ? `<span class="chunk-pill">${escapeHtml(moduleName)}</span>` : ""
    ].filter(Boolean).join("");
    const labelText = labels.length
      ? labels.slice(0, 8).join(", ") + (labels.length > 8 ? `, +${labels.length - 8}` : "")
      : "No labels in this chunk.";
    return [
      `<article class="chunk-picker-card${active ? " active" : ""}">`,
      `<div class="chunk-picker-head">`,
      `<span class="chunk-picker-number">${escapeHtml(String(index + 1))}</span>`,
      `<div>`,
      `<div class="chunk-picker-title">${escapeHtml(chunk?.title || chunk?.id || "Chunk")}</div>`,
      `<div class="chunk-picker-meta">${meta}</div>`,
      `</div>`,
      `<button class="${active ? "primary " : ""}chunk-picker-action" type="button" data-action="select-chunk-from-modal" data-chunk-id="${escapeHtml(chunk?.id || "")}">${escapeHtml(actionText)}</button>`,
      `</div>`,
      `<div class="chunk-picker-labels">${escapeHtml(labelText)}</div>`,
      `</article>`
    ].join("");
  }

  function getCurrentModuleChunks() {
    const chunks = Array.isArray(state.chunkLibrary.chunks) ? state.chunkLibrary.chunks : [];
    const currentModuleKey = getCurrentModuleKey();
    return chunks.filter((chunk) => chunkMatchesCurrentModule(chunk, currentModuleKey));
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

  async function setActiveChunkIdAndApply(chunkId, options = {}) {
    setActiveChunkId(chunkId);
    if (!chunkId) return;
    if (options.closeChunkModal) {
      state.chunkModalOpen = false;
      refreshPanel();
    }
    await delay(50);
    if (options.forceClearFirst) {
      await applyActiveChunkWithTemporaryClearFirst(options.applyOptions || (options.fastReview ? getFastChunkReviewApplyOptions() : {}));
      return;
    }
    await applyActiveChunk(options.applyOptions || (options.fastReview ? getFastChunkReviewApplyOptions() : {}));
  }

  async function reapplyActiveChunkFromQuickSelect() {
    const chunk = getActiveChunk();
    if (!chunk || state.searchRunning) return;
    setStatus(`Reapplying ${chunk.title || "current chunk"}...`, 0);
    await applyActiveChunkWithTemporaryClearFirst(getFastChunkReviewApplyOptions());
  }

  function getFastChunkReviewApplyOptions() {
    return {
      fast: true,
      skipInitialPrime: true,
      fallbackPrimeOnMiss: true,
      reuseRecentPrimeMs: 0,
      afterClearDelayMs: 100,
      variantMissDelayMs: 35,
      perLabelDelayMs: 300,
      searchTimeoutMs: 2800,
      searchIntervalMs: 45,
      searchClearDelayMs: 35,
      searchAfterTypeDelayMs: 45,
      finalCheckDelayMs: 220
    };
  }

  async function applyActiveChunkWithTemporaryClearFirst(options = {}) {
    const originalClearFirst = state.applyChunkClearFirst;
    state.applyChunkClearFirst = true;
    try {
      await applyActiveChunk(options);
    } finally {
      state.applyChunkClearFirst = originalClearFirst;
      savePageState();
      refreshPanel();
    }
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

  function getRoutingSummaryText() {
    const library = state.chunkLibrary || {};
    const chunks = Array.isArray(library.chunks) ? library.chunks : [];
    const routedChunks = chunks.filter((chunk) => {
      const route = getChunkRoutingMetadata(chunk);
      return route.breadcrumb.length || route.deckPath || route.tags.length;
    }).length;
    const route = getLibraryRoutingMetadata();
    const parts = [];
    if (route.breadcrumb.length) parts.push(`Breadcrumb: ${route.breadcrumb.join(" > ")}`);
    if (route.deckPath) parts.push(`Deck: ${route.deckPath}`);
    if (route.tags.length) parts.push(`Tags: ${route.tags.join(", ")}`);
    if (routedChunks) parts.push(`${routedChunks}/${chunks.length} chunks have chunk-level routing.`);
    return parts.length
      ? [`Root: ${getRoutingDeckRoot()}`, ...parts].join(" ")
      : `Root: ${getRoutingDeckRoot()}. No manual route saved. Paste a route JSON here if this lecture needs an explicit breadcrumb/deck path.`;
  }

  function getRoutingDeckRoot() {
    return cleanText(state.routingDeckRoot || DEFAULT_DECK_ROOT) || DEFAULT_DECK_ROOT;
  }

  function applyDeckRootOverride(deckPath, root = getRoutingDeckRoot()) {
    if (deckPath == null || deckPath === false) return "";
    const path = cleanText(deckPath);
    const deckRoot = cleanText(root) || DEFAULT_DECK_ROOT;
    if (!path) return "";
    const parts = path.split("::").map(cleanText).filter(Boolean);
    if (!parts.length) return deckRoot;
    parts[0] = deckRoot;
    return parts.join("::");
  }

  function buildDeckPathFromBreadcrumb(breadcrumb) {
    const deckRoot = getRoutingDeckRoot();
    const parts = Array.isArray(breadcrumb) ? breadcrumb.map(cleanText).filter(Boolean) : [];
    if (!parts.length) return `${deckRoot}::Live drills`;
    if (normalizeText(parts[0]) === normalizeText(deckRoot)) return parts.join("::");
    return [deckRoot, ...parts].join("::");
  }

  async function applyRoutingJsonFromPanel() {
    const text = state.shadow.querySelector("[data-role='routing-json']").value || state.routingText || "";
    if (!text.trim()) {
      setStatus("Paste breadcrumb/deck/tag JSON first.", 7000);
      return;
    }
    let routeData = null;
    try {
      routeData = parseRoutingJsonInput(text);
    } catch (error) {
      setStatus(`Routing JSON failed: ${error.message || error}`, 9000);
      return;
    }
    const result = applyRoutingDataToChunkLibrary(routeData);
    if (!result.ok) {
      setStatus(result.message, 9000);
      return;
    }
    state.routingText = "";
    saveChunkLibrary();
    savePageState();
    refreshPanel();
    const backupResult = await backupChunkSessionToDownloads("manual-routing");
    const backupText = backupResult.ok
      ? ` Backup written to ${backupResult.result.downloadFolder}.`
      : ` Backup failed: ${backupResult.error || "unknown error"}`;
    setStatus(`${result.message}${backupText}`, 12000);
  }

  function parseRoutingJsonInput(text) {
    const parsed = JSON.parse(stripOuterJsonFence(text));
    if (!parsed || typeof parsed !== "object") throw new Error("Expected a JSON object.");
    if (parsed.kind === "imaios-chunk-session-backup" && parsed.library) return parsed.library;
    if (parsed.library?.kind === "imaios-chunk-library" || Array.isArray(parsed.library?.chunks)) return parsed.library;
    return parsed;
  }

  function stripOuterJsonFence(text) {
    const value = String(text || "").trim();
    const match = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return match ? match[1].trim() : value;
  }

  function applyRoutingDataToChunkLibrary(routeData) {
    if (!state.chunkLibrary || typeof state.chunkLibrary !== "object") {
      state.chunkLibrary = normalizeImportedChunkLibrary(null);
    }
    const route = extractRoutingPatch(routeData);
    const hasTopLevelRoute = route.breadcrumb.length || route.deckPath || route.tags.length || route.topic || route.source || route.articleTitle;
    const patchChunks = Array.isArray(routeData.chunks) ? routeData.chunks : [];
    if (!hasTopLevelRoute && !patchChunks.length) {
      return { ok: false, message: "No breadcrumb, deckPath, tags, topic, source, or chunks were found in that JSON." };
    }

    if (route.articleTitle) state.chunkLibrary.articleTitle = route.articleTitle;
    if (route.topic) state.chunkLibrary.topic = route.topic;
    if (route.source) state.chunkLibrary.source = route.source;
    if (route.breadcrumb.length) state.chunkLibrary.breadcrumb = route.breadcrumb;
    if (route.deckPath) state.chunkLibrary.deckPath = route.deckPath;
    if (route.tags.length) state.chunkLibrary.tags = route.tags;

    let chunkUpdates = 0;
    for (const patchChunk of patchChunks) {
      const chunkRoute = extractRoutingPatch(patchChunk);
      if (!chunkRoute.breadcrumb.length && !chunkRoute.deckPath && !chunkRoute.tags.length && !chunkRoute.parentGroup) continue;
      const existing = findChunkForRoutingPatch(patchChunk);
      if (!existing) continue;
      if (chunkRoute.parentGroup) existing.parentGroup = chunkRoute.parentGroup;
      if (chunkRoute.breadcrumb.length) existing.breadcrumb = chunkRoute.breadcrumb;
      if (chunkRoute.deckPath) existing.deckPath = chunkRoute.deckPath;
      if (chunkRoute.tags.length) existing.tags = chunkRoute.tags;
      chunkUpdates += 1;
    }

    const topText = hasTopLevelRoute ? "Updated session route" : "No session-level route changed";
    const chunkText = patchChunks.length ? ` and ${chunkUpdates}/${patchChunks.length} chunk route${patchChunks.length === 1 ? "" : "s"}` : "";
    return { ok: true, message: `${topText}${chunkText}.` };
  }

  function extractRoutingPatch(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      articleTitle: cleanText(source.articleTitle || source.sourceTitle || source.title || ""),
      topic: cleanText(source.topic || ""),
      source: cleanText(source.source || ""),
      parentGroup: cleanText(source.parentGroup || source.group || source.region || ""),
      breadcrumb: normalizeBreadcrumbList(
        source.breadcrumb ||
        source.breadcrumbs ||
        source.breadcrumbTrail ||
        source.deckBreadcrumb ||
        source.ankiBreadcrumb ||
        source.anki?.breadcrumb ||
        source.anki?.breadcrumbTrail ||
        source.metadata?.breadcrumbTrail ||
        source.routing?.breadcrumb ||
        source.routing?.breadcrumbTrail
      ),
      deckPath: applyDeckRootOverride(
        source.deckPath ||
        source.suggestedDeckPath ||
        source.ankiDeckPath ||
        source.anki?.deckPath ||
        source.anki?.deck ||
        source.metadata?.deckPath ||
        source.routing?.deckPath ||
        ""
      ),
      tags: normalizeStringList(
        source.tags ||
        source.suggestedTags ||
        source.ankiTags ||
        source.anki?.tags ||
        source.metadata?.tags ||
        source.routing?.tags
      )
    };
  }

  function findChunkForRoutingPatch(patchChunk) {
    const chunks = Array.isArray(state.chunkLibrary.chunks) ? state.chunkLibrary.chunks : [];
    const patchId = cleanText(patchChunk?.id || "");
    const patchTitle = normalizeText(patchChunk?.title || patchChunk?.name || "");
    const patchModuleKey = normalizeModuleKey(patchChunk?.moduleKey || patchChunk?.targetModuleKey || patchChunk?.modalityUrl || patchChunk?.url || "");
    return chunks.find((chunk) => patchId && chunk.id === patchId) ||
      chunks.find((chunk) => patchTitle && normalizeText(chunk.title) === patchTitle && (!patchModuleKey || getChunkModuleKey(chunk) === patchModuleKey)) ||
      null;
  }

  async function copyCurrentRoutingJson() {
    const library = state.chunkLibrary || {};
    const route = getLibraryRoutingMetadata();
    const chunks = Array.isArray(library.chunks) ? library.chunks : [];
    const routedChunks = chunks.map((chunk) => {
      const chunkRoute = getChunkRoutingMetadata(chunk);
      if (!chunkRoute.breadcrumb.length && !chunkRoute.deckPath && !chunkRoute.tags.length) return null;
      return {
        id: chunk.id,
        title: chunk.title,
        parentGroup: chunk.parentGroup || "",
        moduleKey: getChunkModuleKey(chunk),
        breadcrumb: chunkRoute.breadcrumb,
        deckPath: chunkRoute.deckPath,
        tags: chunkRoute.tags
      };
    }).filter(Boolean);
    const output = {
      kind: "imaios-routing",
      version: 1,
      topic: library.topic || "",
      source: library.source || "",
      breadcrumb: route.breadcrumb,
      deckPath: route.deckPath,
      tags: route.tags,
      chunks: routedChunks
    };
    await writeClipboard(JSON.stringify(output, null, 2));
    setStatus("Current routing JSON copied.");
  }

  async function clearCurrentRoutingMetadata() {
    const route = getLibraryRoutingMetadata();
    const chunks = Array.isArray(state.chunkLibrary.chunks) ? state.chunkLibrary.chunks : [];
    const routedChunks = chunks.filter((chunk) => {
      const chunkRoute = getChunkRoutingMetadata(chunk);
      return chunkRoute.breadcrumb.length || chunkRoute.deckPath || chunkRoute.tags.length;
    });
    if (!route.breadcrumb.length && !route.deckPath && !route.tags.length && !routedChunks.length) {
      setStatus("No routing metadata is currently saved.");
      return;
    }
    const confirmed = typeof window.confirm === "function" && window.confirm(
      `Clear manual breadcrumb/deck/tags for this imported chunk session?\n\nSession route: ${route.breadcrumb.length || route.deckPath || route.tags.length ? "yes" : "no"}\nChunk-level routes: ${routedChunks.length}\n\nThis updates the local chunk-session backup too.`
    ) === true;
    if (!confirmed) {
      setStatus("Clear routing cancelled.");
      return;
    }
    delete state.chunkLibrary.breadcrumb;
    delete state.chunkLibrary.deckPath;
    delete state.chunkLibrary.tags;
    for (const chunk of chunks) {
      delete chunk.breadcrumb;
      delete chunk.deckPath;
      delete chunk.tags;
    }
    state.routingText = "";
    saveChunkLibrary();
    savePageState();
    refreshPanel();
    const backupResult = await backupChunkSessionToDownloads("manual-routing-clear");
    const backupText = backupResult.ok
      ? ` Backup written to ${backupResult.result.downloadFolder}.`
      : ` Backup failed: ${backupResult.error || "unknown error"}`;
    setStatus(`Cleared routing metadata.${backupText}`, 11000);
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

  async function applyActiveChunk(options = {}) {
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
        await delay(options.afterClearDelayMs ?? (options.fast ? 120 : 250));
      }
    }
    state.customListText = chunkToPreferredLabelText(chunk);
    state.selectedStructures = targets.map((target) => target.preferredLabel);
    savePageState();
    refreshPanel();
    await applyChunkTargets(targets, chunk.title, options);
  }

  async function applyChunkTargets(targets, sourceLabel, options = {}) {
    if (state.searchRunning) {
      setStatus("Search is already running.");
      return;
    }
    state.searchRunning = true;
    state.cancelSearch = false;
    const fast = Boolean(options.fast);
    const variantMissDelayMs = options.variantMissDelayMs ?? (fast ? 40 : 120);
    const perLabelDelayMs = options.perLabelDelayMs ?? (fast ? 260 : 650);
    const searchOptions = {
      timeoutMs: options.searchTimeoutMs ?? (fast ? 2600 : undefined),
      intervalMs: options.searchIntervalMs ?? (fast ? 50 : undefined),
      clearDelayMs: options.searchClearDelayMs ?? (fast ? 35 : undefined),
      afterTypeDelayMs: options.searchAfterTypeDelayMs ?? (fast ? 45 : undefined)
    };
    const availableMap = getCurrentAvailableLabelMap();
    const requestedStructures = targets.map((target) => chooseBestChunkLabel(target, availableMap));
    state.selectedStructures = unique(requestedStructures);
    savePageState();
    refreshPanel();

    const nativePlan = buildNativeRestorePlanForLabelNames(requestedStructures, getCurrentModuleInfo());
    if (options.useNativeRestore !== false && nativePlan.complete && getLockedStructureCount() === 0) {
      setStatus(`${sourceLabel}: trying native ID restore for ${requestedStructures.length} labels...`, 0);
      const nativeResult = await applyLiveDrillNativeRestore(nativePlan, requestedStructures);
      if (nativeResult.ok) {
        state.searchRunning = false;
        const pinsResult = await resetQuietPinsByCyclingPins();
        const pinsSuffix = pinsResult.ok ? " Quiet pins on." : " Could not restore quiet pins.";
        setStatus(`${sourceLabel}: native restore locked ${requestedStructures.length}/${targets.length}.${pinsSuffix}`, 8000);
        return;
      }
      setStatus(`${sourceLabel}: native IDs did not live-restore; falling back to search.`, 3500);
      await delay(140);
    }

    let primedThisApply = false;
    if (!options.skipPrime && !options.skipInitialPrime && !hasRecentModuleSearchPrime(options.reuseRecentPrimeMs)) {
      const primed = await primeModuleSearch();
      if (!primed.ok) {
        setStatus(primed.reason);
        state.searchRunning = false;
        return;
      }
      primedThisApply = true;
    }

    const appliedNames = [];
    const missedNames = [];
    const tryApplyTarget = async (target, variants) => {
      for (const variant of variants) {
        setStatus(`Searching ${variant}...`);
        const result = await searchAndClickStructure(variant, { ...searchOptions, allowFallback: false });
        if (result.ok) return variant;
        await delay(variantMissDelayMs);
      }
      const fallback = variants[0] || target.preferredLabel;
      const result = await searchAndClickStructure(fallback, { ...searchOptions, allowFallback: true });
      return result.ok ? fallback : null;
    };
    for (const target of targets) {
      if (state.cancelSearch) break;
      const variants = getChunkLabelVariants(target, availableMap);
      let applied = await tryApplyTarget(target, variants);
      if (!applied && options.fallbackPrimeOnMiss && !primedThisApply) {
        setStatus("Search missed. Warming up IMAIOS search once, then retrying...", 0);
        const primed = await primeModuleSearch();
        primedThisApply = true;
        if (primed.ok) {
          applied = await tryApplyTarget(target, variants);
        } else {
          setStatus(primed.reason, 5000);
        }
      }
      if (applied) {
        appliedNames.push(applied);
        setStatus(`Selected ${applied}.`);
      } else {
        missedNames.push(target.preferredLabel);
        setStatus(`Could not select ${target.preferredLabel}.`);
      }
      await delay(perLabelDelayMs);
    }

    state.searchRunning = false;
    if (options.skipFinalLockedCheck) {
      const missSuffix = missedNames.length ? ` Missed ${missedNames.length}.` : "";
      const stopSuffix = state.cancelSearch ? " Stopped." : "";
      setStatus(`${sourceLabel}: selected ${appliedNames.length}/${targets.length}.${missSuffix}${stopSuffix}`, 5000);
      return;
    }
    setStatus("Checking locked structures...");
    await delay(options.finalCheckDelayMs ?? (fast ? 250 : 650));
    const locked = countLockedMatches(appliedNames);
    const pinsResult = await resetQuietPinsByCyclingPins();
    const pinsSuffix = pinsResult.ok ? " Quiet pins on." : " Could not restore quiet pins.";
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
    const pinsResult = await resetQuietPinsByCyclingPins();
    const pinsSuffix = pinsResult.ok ? " Quiet pins on." : " Could not restore quiet pins.";
    setStatus(`${sourceLabel}: locked ${locked}/${total}.${suffix}${pinsSuffix}`, 7000);
  }

  async function searchAndClickStructure(structureName, options = {}) {
    const availability = await searchStructureAvailability(structureName, {
      timeoutMs: options.timeoutMs || 5200,
      delayMs: options.delayMs,
      clearDelayMs: options.clearDelayMs,
      afterTypeDelayMs: options.afterTypeDelayMs,
      intervalMs: options.intervalMs,
      exact: Boolean(options.exact)
    });
    const input = availability.input;
    if (!availability.ok) {
      if (options.allowFallback === false || !input) return availability;
      pressSearchKey(input, "ArrowDown");
      await delay(120);
      pressSearchKey(input, "Enter");
      if (options.closeDetailPanelAfterClick) {
        await delay(180);
        await closeStructureDetailPanel();
      }
      return { ok: true, fallback: true };
    }

    input.focus();
    await delay(80);
    clickElement(availability.result);
    if (options.closeDetailPanelAfterClick) {
      await delay(180);
      await closeStructureDetailPanel();
    }
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

    const result = await waitFor(() => findSearchResult(structureName, input, { exact: Boolean(options.exact) }), options.timeoutMs || 1600, options.intervalMs || 80);
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
    state.searchPrimeAt = Date.now();
    state.searchPrimeModuleKey = normalizeModuleKey(getCurrentModuleKey());
    return { ok: true };
  }

  function hasRecentModuleSearchPrime(maxAgeMs) {
    const ageMs = Number(maxAgeMs);
    if (!Number.isFinite(ageMs) || ageMs <= 0) return false;
    if (!state.searchPrimeAt) return false;
    if (Date.now() - state.searchPrimeAt > ageMs) return false;
    return normalizeModuleKey(getCurrentModuleKey()) === state.searchPrimeModuleKey;
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

  function findSearchResult(structureName, input, options = {}) {
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
        text: normalizeText(cleanSearchResultText(element.textContent || ""))
      }))
      .filter((item) => item.text && item.text.length <= 220)
      .filter((item) => options.exact ? item.text === expected : item.text.includes(expected));

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
    const restoreShieldPointerEvents = setLiveDrillStudyShieldPointerPassthrough(true);

    try {
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
    } finally {
      restoreShieldPointerEvents();
    }
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

  async function setPinsMode(enabled, options = {}) {
    const result = await setLabelingToggleMode("Pins", enabled, {
      missingReason: "Could not find the Pins toggle.",
      ...options
    });
    if (result.ok) writePinModePreference(enabled);
    return result;
  }

  async function setLabelingToggleMode(labelText, enabled, options = {}) {
    let row = findLabelingSettingRow(labelText);
    if (!row && options.openPanel !== false) {
      await openLabelingPanel();
      row = await waitFor(() => findLabelingSettingRow(labelText), 1800, 120);
    }
    if (!row) {
      return { ok: false, reason: options.missingReason || `Could not find the ${labelText} toggle.` };
    }

    const toggle = findSwitchControl(row);
    const target = findToggleClickTarget(row);
    const current = toggle ? isSwitchOn(toggle) : null;
    if (current === enabled) return { ok: true, changed: false };
    if (current === null && options.requireKnownState) {
      return { ok: true, changed: false, skipped: true, uncertain: true, reason: `Skipped ${labelText}; toggle state was unclear.` };
    }

    await realMouseClick(target, 0.9, 0.5);
    await delay(350);

    const updatedRow = findLabelingSettingRow(labelText) || row;
    const updatedToggle = findSwitchControl(updatedRow) || toggle;
    const updated = updatedToggle ? isSwitchOn(updatedToggle) : null;
    if (updated === enabled || updated === null) {
      return { ok: true, changed: true, uncertain: updated === null };
    }
    return { ok: false, reason: enabled ? `${labelText} toggle did not turn on.` : `${labelText} toggle did not turn off.` };
  }

  async function restoreQuietPinsMode(options = {}) {
    writePinModePreference(true);
    const pinsResult = await setPinsMode(true, options);
    const targetedResult = await setLabelingToggleMode("Targeted labeling", false, {
      openPanel: options.openPanel,
      requireKnownState: true,
      missingReason: "Could not find the Targeted labeling toggle."
    });
    return {
      ok: pinsResult.ok || targetedResult.ok,
      pins: pinsResult,
      targetedLabeling: targetedResult
    };
  }

  function scheduleQuietPinsResetOnLoad() {
    writePinModePreference(true);
    window.setTimeout(() => {
      if (state.searchRunning || state.liveDrillRestoreRunning || getLiveDrillHashPayload()) return;
      resetQuietPinsByCyclingPins().catch((error) => {
        console.warn("IMAIOS Cine Tools: could not reset quiet pins on load", error);
      });
    }, 1800);
  }

  async function resetQuietPinsByCyclingPins() {
    await restoreQuietPinsMode({ openPanel: false });
    await delay(250);
    const offResult = await setPinsMode(false, { openPanel: true });
    await delay(250);
    const onResult = await restoreQuietPinsMode({ openPanel: true });
    return { ok: offResult.ok || onResult.ok, off: offResult, on: onResult };
  }

  function writePinModePreference(enabled) {
    const oldValue = localStorage.getItem(PIN_MODE_STORAGE_KEY);
    const newValue = enabled ? "true" : "false";
    if (oldValue !== newValue) {
      localStorage.setItem(PIN_MODE_STORAGE_KEY, newValue);
    }
  }

  function scheduleAllStructuresHiddenOnLoad() {
    [900, 1800, 3200, 5200].forEach((delayMs) => {
      window.setTimeout(() => {
        if (state.searchRunning || state.liveDrillRestoreRunning) return;
        enforceAllStructuresHidden({ source: "load" }).catch((error) => {
          console.warn("IMAIOS Cine Tools: could not enforce hidden structures on load", error);
        });
      }, delayMs);
    });
  }

  async function enforceAllStructuresHidden(options = {}) {
    if (!options.allowWithLocked && getLockedStructureCount()) {
      return { ok: true, skipped: true, reason: "Locked structures are present." };
    }

    return pressImaiosKeyboardShortcut("h", "KeyH");
  }

  async function pressImaiosKeyboardShortcut(key, code) {
    if (chrome?.runtime?.sendMessage) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "IMAIOS_DISPATCH_KEY_PRESS",
          key,
          code
        });
        if (response?.ok) return { ok: true, method: "debugger-key" };
      } catch (error) {
        console.warn("IMAIOS Cine Tools: debugger key press failed; falling back to synthetic key", error);
      }
    }

    const target = document.activeElement instanceof Element && !isEditableTarget(document.activeElement)
      ? document.activeElement
      : document.body;
    const eventInit = {
      key,
      code,
      bubbles: true,
      cancelable: true,
      view: window
    };
    target.dispatchEvent(new KeyboardEvent("keydown", eventInit));
    target.dispatchEvent(new KeyboardEvent("keypress", eventInit));
    target.dispatchEvent(new KeyboardEvent("keyup", eventInit));
    return { ok: true, uncertain: true, method: "synthetic-key" };
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
      state.panelPosition.left = clamp(start.left + moveEvent.clientX - start.x, 4, Math.max(4, window.innerWidth - panel.offsetWidth - 4));
      state.panelPosition.top = clamp(start.top + moveEvent.clientY - start.y, 4, Math.max(4, window.innerHeight - panel.offsetHeight - 4));
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
    await copyLiveDrillCardPrompt();
  }

  async function copyLiveDrillCardPrompt() {
    const promptPackage = await buildLiveDrillCardPromptPackage({ requireLocked: true });
    if (!promptPackage.ok) {
      setStatus(promptPackage.reason, 7000);
      return;
    }
    saveLastLiveDrillCardSource(promptPackage.payload);
    await writeClipboard(promptPackage.promptText);
    const enrichmentText = describeLiveDrillPromptEnrichment(promptPackage.enrichment);
    setStatus(`GPT card prompt copied for ${promptPackage.payload.labels.length} locked labels.${enrichmentText} Paste it into ChatGPT, then use Plan to TSV on the JSON result.`, 12000);
  }

  async function runLiveDrillSmartCardAutomation() {
    const batch = normalizeLiveDrillCardBatch(state.liveDrillCardBatch);
    if (batch.items.length) {
      await runLiveDrillBatchCardAutomation();
      return;
    }
    setStatus("Batch cart is empty, so creating cards from the current locked labels.", 5000);
    await runLiveDrillCardAutomation();
  }

  async function runLiveDrillCardAutomation() {
    const promptPackage = await buildLiveDrillCardPromptPackage({ requireLocked: true });
    if (!promptPackage.ok) {
      setStatus(promptPackage.reason, 7000);
      return;
    }
    if (!chrome?.runtime?.sendMessage) {
      setStatus("Extension messaging is unavailable, so automatic ChatGPT launch cannot run.", 9000);
      return;
    }

    saveLastLiveDrillCardSource(promptPackage.payload);
    const enrichmentText = describeLiveDrillPromptEnrichment(promptPackage.enrichment);
    setStatus(`Sending ${promptPackage.payload.labels.length} locked labels to ChatGPT for card planning.${enrichmentText}`, 0);
    chrome.runtime.sendMessage({
      type: "RUN_IMAIOS_LIVE_DRILL_CARD_AUTOMATION",
      promptText: promptPackage.promptText,
      sourcePayload: promptPackage.payload
    }, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        setStatus(`Automatic ChatGPT run failed: ${error.message || error}`, 12000);
        return;
      }
      if (!response?.ok) {
        setStatus(`Automatic ChatGPT run failed: ${response?.error || "unknown error"}`, 12000);
        return;
      }
      setStatus(response.message || "ChatGPT is building the live-drill card plan. IMAIOS will generate the TSV when it returns.", 14000);
    });
  }

  async function addCurrentLiveDrillToCardBatch() {
    const seriesNames = getSelectedCardSeriesForCurrentModule();
    if (seriesNames.length) {
      await addCurrentLiveDrillSeriesToCardBatch(seriesNames);
      return;
    }
    await addCurrentLiveDrillCurrentPlaneToCardBatch();
  }

  async function addCurrentLiveDrillCurrentPlaneToCardBatch() {
    const result = await buildCurrentLiveDrillCardBatchItem();
    if (!result.ok) {
      setStatus(result.reason, 7000);
      return;
    }
    upsertLiveDrillCardBatchItem(result.item);
    saveLiveDrillCardBatch();
    refreshPanel();
    const backup = await backupLiveDrillCardBatchToDownloads("add");
    const enrichmentText = describeLiveDrillPromptEnrichment(result.enrichment);
    const backupText = backup.ok ? ` Saved batch backup.` : ` Backup failed: ${backup.error || "unknown error"}`;
    const seriesText = result.item.series || result.item.plane || "";
    setStatus(`Added current plane to Anki batch: ${result.item.title} (${result.item.labelCount} labels${seriesText ? `, ${seriesText}` : ""}). Batch has ${state.liveDrillCardBatch.items.length} drills.${enrichmentText}${backupText}`, 12000);
  }

  async function addCurrentLiveDrillSeriesToCardBatch(seriesNames) {
    const chunk = getActiveChunk();
    if (!chunk) {
      setStatus("Select or import a chunk first.");
      return;
    }
    if (!chunkMatchesCurrentModule(chunk)) {
      const moduleName = getChunkModuleDisplayName(chunk) || getChunkModuleKey(chunk);
      setStatus(`This chunk belongs to ${moduleName || "another IMAIOS module"}. Open that module before adding plane cards.`, 9000);
      return;
    }
    if (state.searchRunning) {
      setStatus("Search is already running.");
      return;
    }

    const originalSeriesInfo = getSeriesInfo();
    const originalSeries = cleanText(originalSeriesInfo.selectedSeries || "");
    const originalPlane = normalizePlaneName(originalSeriesInfo.selectedPlane) || inferSelectedPlaneFromDom();
    const added = [];
    const skipped = [];
    let labelsAppliedForChunk = false;
    for (const seriesName of unique(seriesNames.map(cleanText).filter(Boolean))) {
      setStatus(`Preparing ${seriesName} card set...`, 0);
      const switched = await switchSeriesByName(seriesName, { quiet: true });
      if (!switched?.ok) {
        skipped.push(`${seriesName}: ${switched?.reason || "not available"}`);
        continue;
      }
      await delay(350);
      if (!labelsAppliedForChunk) {
        await applyActiveChunk();
        await delay(300);
      }
      let result = await buildCurrentLiveDrillCardBatchItem();
      if (!result.ok && labelsAppliedForChunk) {
        await applyActiveChunk();
        await delay(300);
        result = await buildCurrentLiveDrillCardBatchItem();
      }
      if (!result.ok) {
        skipped.push(`${seriesName}: ${result.reason || "could not build drill"}`);
        continue;
      }
      labelsAppliedForChunk = true;
      upsertLiveDrillCardBatchItem(result.item);
      added.push(result.item);
    }

    if (originalSeries) {
      await switchSeriesByName(originalSeries, { quiet: true });
    } else if (originalPlane) {
      await switchPlane(originalPlane, { quiet: true });
    }

    if (!added.length) {
      setStatus(`No plane card sets added. ${skipped.join(" ")}`.trim(), 12000);
      refreshPanel();
      return;
    }

    saveLiveDrillCardBatch();
    refreshPanel();
    const backup = await backupLiveDrillCardBatchToDownloads("add");
    const addedText = added.map((item) => item.series || item.plane || item.title).join(", ");
    const skippedText = skipped.length ? ` Skipped ${skipped.join("; ")}.` : "";
    const backupText = backup.ok ? " Saved batch backup." : ` Backup failed: ${backup.error || "unknown error"}`;
    setStatus(`Added ${added.length} series card set${added.length === 1 ? "" : "s"} to Anki batch: ${addedText}.${skippedText} Batch has ${state.liveDrillCardBatch.items.length} drills.${backupText}`, 14000);
  }

  async function addCurrentModuleChunksToCardBatch() {
    const chunks = getCurrentModuleChunks().filter((chunk) => getChunkLabelTargets(chunk).length);
    if (!chunks.length) {
      setStatus("No label-bearing chunks are available for this module.", 8000);
      return;
    }
    if (state.searchRunning) {
      setStatus("Search is already running.");
      return;
    }

    const selectedSeries = getSelectedCardSeriesForCurrentModule();
    const currentSeries = getCurrentSeriesLabel();
    const seriesNames = selectedSeries.length ? selectedSeries : [currentSeries].filter(Boolean);
    const seriesTargets = seriesNames.length ? seriesNames : [""];
    const originalChunkId = state.activeChunkId;
    const originalSeriesInfo = getSeriesInfo();
    const originalSeries = cleanText(originalSeriesInfo.selectedSeries || "");
    const originalPlane = normalizePlaneName(originalSeriesInfo.selectedPlane) || inferSelectedPlaneFromDom();
    const originalClearFirst = state.applyChunkClearFirst;
    const added = [];
    const skipped = [];
    state.cancelSearch = false;
    state.applyChunkClearFirst = true;
    savePageState();

    try {
      const primed = await primeModuleSearch();
      if (!primed.ok) {
        setStatus(primed.reason, 9000);
        return;
      }
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
        if (state.cancelSearch) break;
        const chunk = chunks[chunkIndex];
        setActiveChunkId(chunk.id);
        await delay(80);
        let labelsAppliedForChunk = false;

        for (const seriesName of seriesTargets) {
          if (state.cancelSearch) break;
          const targetText = seriesName || "current series";
          setStatus(`Adding module chunk ${chunkIndex + 1}/${chunks.length}: ${chunk.title || chunk.id} (${targetText})...`, 0);
          if (seriesName) {
            const switched = await switchSeriesByName(seriesName, { quiet: true });
            if (!switched?.ok) {
              skipped.push(`${chunk.title || chunk.id} / ${seriesName}: ${switched?.reason || "series not available"}`);
              continue;
            }
            await delay(350);
          }

          if (!labelsAppliedForChunk) {
            await applyActiveChunk({
              fast: true,
              skipPrime: true,
              skipFinalLockedCheck: true,
              perLabelDelayMs: 240,
              searchTimeoutMs: 2400,
              searchIntervalMs: 45
            });
            if (state.cancelSearch) break;
            await delay(140);
          } else {
            await delay(80);
          }
          let result = await buildCurrentLiveDrillCardBatchItem();
          if (!result.ok && labelsAppliedForChunk) {
            await applyActiveChunk({
              fast: true,
              skipPrime: true,
              skipFinalLockedCheck: true,
              perLabelDelayMs: 260,
              searchTimeoutMs: 2800,
              searchIntervalMs: 50
            });
            if (state.cancelSearch) break;
            await delay(160);
            result = await buildCurrentLiveDrillCardBatchItem();
          }
          if (!result.ok) {
            skipped.push(`${chunk.title || chunk.id} / ${targetText}: ${result.reason || "could not build drill"}`);
            continue;
          }
          labelsAppliedForChunk = true;
          upsertLiveDrillCardBatchItem(result.item);
          saveLiveDrillCardBatch();
          added.push(result.item);
        }
      }
    } finally {
      state.applyChunkClearFirst = originalClearFirst;
      if (originalSeries) {
        await switchSeriesByName(originalSeries, { quiet: true });
      } else if (originalPlane) {
        await switchPlane(originalPlane, { quiet: true });
      }
      setActiveChunkId(originalChunkId);
      savePageState();
      refreshPanel();
    }

    if (!added.length) {
      const stoppedText = state.cancelSearch ? " Stopped." : "";
      setStatus(`No module chunks were added.${stoppedText} ${skipped.slice(0, 3).join("; ")}`.trim(), 12000);
      return;
    }

    const backup = await backupLiveDrillCardBatchToDownloads("module");
    const seriesText = selectedSeries.length ? ` across ${selectedSeries.length} saved series` : " in the current series";
    const skippedText = skipped.length ? ` Skipped ${skipped.length}.` : "";
    const stoppedText = state.cancelSearch ? " Stopped before finishing." : "";
    const backupText = backup.ok ? " Saved batch backup." : ` Backup failed: ${backup.error || "unknown error"}`;
    setStatus(`Added ${added.length} module drill${added.length === 1 ? "" : "s"} from ${chunks.length} chunks${seriesText}.${skippedText}${stoppedText} Batch has ${state.liveDrillCardBatch.items.length} drills.${backupText}`, 16000);
  }

  async function buildCurrentLiveDrillCardBatchItem() {
    const promptPackage = await buildLiveDrillCardPromptPackage({
      requireLocked: true,
      enrichDetails: "cache-only"
    });
    if (!promptPackage.ok) {
      return promptPackage;
    }
    const source = buildLiveDrillCardPromptSource(promptPackage.payload, promptPackage.enrichment);
    const item = buildLiveDrillCardBatchItem(source, promptPackage.payload, promptPackage.enrichment);
    return { ok: true, item, payload: promptPackage.payload, enrichment: promptPackage.enrichment };
  }

  function buildLiveDrillCardBatchItem(source, payload, enrichment) {
    const moduleName = cleanText(source?.module?.name || payload?.module?.name || "");
    const chunkTitle = cleanText(source?.chunk?.title || payload?.chunk?.title || payload?.title || "");
    const title = cleanText(chunkTitle || payload?.title || moduleName || "IMAIOS drill");
    return {
      id: source.sourceDrillId || payload.id || createSlug(`${moduleName}-${chunkTitle}`) || `drill-${Date.now()}`,
      kind: "imaios-live-drill-card-batch-item",
      version: 1,
      title,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceDrillId: source.sourceDrillId || payload.id || "",
      moduleKey: source?.module?.key || payload?.module?.key || "",
      moduleName,
      chunkId: source?.chunk?.id || payload?.chunk?.id || "",
      chunkTitle,
      plane: source?.viewer?.plane || payload?.viewer?.plane || "",
      series: source?.viewer?.selectedSeries || payload?.viewer?.selectedSeries || "",
      labelCount: Array.isArray(source.labels) ? source.labels.length : 0,
      capturedDetailCount: Number(source?.labelDetailEnrichment?.capturedDetails || 0),
      labels: Array.isArray(source.labels) ? source.labels : [],
      source,
      payload,
      enrichmentSummary: source.labelDetailEnrichment || getLiveDrillLabelDetailEnrichmentSummary(enrichment)
    };
  }

  function upsertLiveDrillCardBatchItem(item) {
    const batch = normalizeLiveDrillCardBatch(state.liveDrillCardBatch);
    const now = new Date().toISOString();
    const topic = cleanText(batch.topic || state.chunkLibrary.topic || state.chunkLibrary.articleTitle || "IMAIOS live drills");
    const source = cleanText(batch.source || state.chunkLibrary.source || "");
    const items = batch.items.filter((existing) => existing.id !== item.id && existing.sourceDrillId !== item.sourceDrillId);
    items.push({ ...item, updatedAt: now });
    state.liveDrillCardBatch = {
      ...batch,
      topic,
      source,
      createdAt: batch.createdAt || now,
      updatedAt: now,
      items
    };
  }

  async function runLiveDrillBatchCardAutomation() {
    const batchSource = buildLiveDrillBatchCardSource();
    if (!batchSource.ok) {
      setStatus(batchSource.reason, 9000);
      return;
    }
    if (!chrome?.runtime?.sendMessage) {
      setStatus("Extension messaging is unavailable, so automatic ChatGPT launch cannot run.", 9000);
      return;
    }
    saveLastLiveDrillCardSource(batchSource.payload);
    const detailCount = Object.keys(batchSource.payload.labelDetails || {}).length;
    const compressionText = batchSource.payload.promptCompression
      ? ` Compact prompt: ${batchSource.payload.promptCompression.uniqueLabelDetails || detailCount} shared definitions.`
      : "";
    const labelCount = Number(batchSource.payload.promptCompression?.totalLabelOccurrences || 0);
    setStatus(`Sending Anki batch to ChatGPT: ${batchSource.payload.batchItems.length} drills, ${labelCount} labels, ${detailCount} definitions.${compressionText}`, 0);
    chrome.runtime.sendMessage({
      type: "RUN_IMAIOS_LIVE_DRILL_CARD_AUTOMATION",
      promptText: buildLiveDrillBatchCardPrompt(batchSource.payload),
      sourcePayload: batchSource.payload
    }, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        setStatus(`Automatic ChatGPT batch run failed: ${error.message || error}`, 12000);
        return;
      }
      if (!response?.ok) {
        setStatus(`Automatic ChatGPT batch run failed: ${response?.error || "unknown error"}`, 12000);
        return;
      }
      setStatus(response.message || "ChatGPT is building the batch live-drill card plan. IMAIOS will generate the TSV when it returns.", 14000);
    });
  }

  async function copyLiveDrillCardBatch() {
    const batch = normalizeLiveDrillCardBatch(state.liveDrillCardBatch);
    await writeClipboard(JSON.stringify(batch, null, 2));
    setStatus(`Copied Anki batch: ${batch.items.length} drill${batch.items.length === 1 ? "" : "s"}.`);
  }

  async function clearLiveDrillCardBatch() {
    const count = state.liveDrillCardBatch.items.length;
    if (!count) {
      setStatus("Anki batch is already empty.");
      return;
    }
    const ok = window.confirm(`Clear the Anki batch?\n\nThis removes ${count} collected drill${count === 1 ? "" : "s"} from local browser storage. A previous downloaded backup will not be deleted.`);
    if (!ok) return;
    state.liveDrillCardBatch = normalizeLiveDrillCardBatch(null);
    saveLiveDrillCardBatch();
    refreshPanel();
    setStatus("Anki batch cleared.", 6000);
  }

  function openBatchCartModal() {
    state.batchCartModalOpen = true;
    refreshPanel();
  }

  function closeBatchCartModal() {
    state.batchCartModalOpen = false;
    refreshPanel();
  }

  function removeCheckedLiveDrillCardBatchItems() {
    const root = state.shadow;
    if (!root) return;
    const batch = normalizeLiveDrillCardBatch(state.liveDrillCardBatch);
    const groups = groupLiveDrillCardBatchItems(batch.items);
    const removeKeys = new Set();

    root.querySelectorAll("[data-role='batch-cart-group-check']:checked").forEach((input) => {
      const groupKey = cleanText(input.getAttribute("data-group-key") || "");
      const group = groups.find((entry) => entry.key === groupKey);
      if (group) group.items.forEach((item) => removeKeys.add(getBatchItemSelectionKey(item)));
    });
    root.querySelectorAll("[data-role='batch-cart-item-check']:checked").forEach((input) => {
      const itemKey = cleanText(input.value || input.getAttribute("data-item-key") || "");
      if (itemKey) removeKeys.add(itemKey);
    });

    if (!removeKeys.size) {
      setStatus("Check one or more batch cart items to remove.", 7000);
      return;
    }

    const items = batch.items.filter((entry) => !removeKeys.has(getBatchItemSelectionKey(entry)));
    state.liveDrillCardBatch = {
      ...batch,
      updatedAt: new Date().toISOString(),
      items
    };
    saveLiveDrillCardBatch();
    refreshPanel();
    setStatus(`Removed ${removeKeys.size} plane set${removeKeys.size === 1 ? "" : "s"} from the Anki batch. Batch has ${items.length} drill${items.length === 1 ? "" : "s"}.`, 9000);
  }

  function saveLiveDrillCardBatch() {
    try {
      localStorage.setItem(LIVE_DRILL_CARD_BATCH_STORAGE_KEY, JSON.stringify(normalizeLiveDrillCardBatch(state.liveDrillCardBatch)));
    } catch (error) {
      console.warn("IMAIOS Cine Tools: could not save live-drill card batch", error);
    }
  }

  async function backupLiveDrillCardBatchToDownloads(source = "") {
    const batch = normalizeLiveDrillCardBatch({
      ...state.liveDrillCardBatch,
      backupSource: source,
      backupCreatedAt: new Date().toISOString()
    });
    if (!batch.items.length) return { ok: false, error: "Batch is empty." };
    const topicSlug = createSlug(batch.topic || state.chunkLibrary.topic || "imaios-live-drill-batch") || "imaios-live-drill-batch";
    const path = `IMAIOS/LiveDrills/${topicSlug}/batch/imaios_live_drill_card_batch.json`;
    try {
      await downloadTextAsFile(JSON.stringify(batch, null, 2), path, "application/json;charset=utf-8");
      return { ok: true, path: `Downloads\\${path.replace(/\//g, "\\")}` };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
  }

  function getBatchItemSelectionKey(item) {
    return cleanText(item?.sourceDrillId || item?.id || "");
  }

  function getBatchItemSeriesLabel(item) {
    return cleanText(item?.series || item?.source?.viewer?.selectedSeries || item?.payload?.viewer?.selectedSeries || item?.plane || item?.source?.viewer?.plane || item?.payload?.viewer?.plane || "");
  }

  function getLiveDrillBatchGroupKey(item) {
    const moduleKey = cleanText(item?.moduleKey || item?.source?.module?.key || item?.payload?.module?.key || "");
    const moduleName = cleanText(item?.moduleName || item?.source?.module?.name || item?.payload?.module?.name || "");
    const chunkId = cleanText(item?.chunkId || item?.source?.chunk?.id || item?.payload?.chunk?.id || "");
    const chunkTitle = cleanText(item?.chunkTitle || item?.title || item?.source?.chunk?.title || item?.payload?.chunk?.title || "");
    return createSlug([moduleKey || moduleName, chunkId || chunkTitle].filter(Boolean).join("-")) || getBatchItemSelectionKey(item);
  }

  function groupLiveDrillCardBatchItems(items) {
    const groups = [];
    const byKey = new Map();
    (Array.isArray(items) ? items : []).forEach((item) => {
      const key = getLiveDrillBatchGroupKey(item);
      if (!key) return;
      let group = byKey.get(key);
      if (!group) {
        group = {
          key,
          title: cleanText(item.chunkTitle || item.title || item.source?.chunk?.title || item.payload?.chunk?.title || "IMAIOS chunk"),
          moduleName: cleanText(item.moduleName || item.source?.module?.name || item.payload?.module?.name || ""),
          moduleKey: cleanText(item.moduleKey || item.source?.module?.key || item.payload?.module?.key || ""),
          items: [],
          seriesNames: []
        };
        byKey.set(key, group);
        groups.push(group);
      }
      group.items.push(item);
      group.seriesNames = unique([...group.seriesNames, getBatchItemSeriesLabel(item)].filter(Boolean));
    });
    return groups;
  }

  function getBatchGroupLabelCountText(group) {
    const counts = Array.from(new Set((group?.items || [])
      .map((item) => Number(item.labelCount || item.labels?.length || 0))
      .filter((count) => Number.isFinite(count) && count > 0)))
      .sort((a, b) => a - b);
    if (!counts.length) return "0 labels";
    if (counts.length === 1) return `${counts[0]} label${counts[0] === 1 ? "" : "s"}`;
    return `${counts[0]}-${counts[counts.length - 1]} labels`;
  }

  function getBatchGroupLabelNames(group) {
    const labels = [];
    (group?.items || []).forEach((item) => {
      const itemLabels = Array.isArray(item.labels) ? item.labels : Array.isArray(item.source?.labels) ? item.source.labels : [];
      itemLabels.forEach((entry) => {
        const label = cleanText(entry?.preferredLabel || entry?.label || entry?.name || entry);
        if (label) labels.push(label);
      });
    });
    return unique(labels);
  }

  function getLiveDrillCardBatchSummaryText() {
    const batch = normalizeLiveDrillCardBatch(state.liveDrillCardBatch);
    if (!batch.items.length) return "Anki batch is empty. Add reviewed locked drills here, then create cards from the full batch.";
    const groups = groupLiveDrillCardBatchItems(batch.items);
    const labelCount = batch.items.reduce((sum, item) => sum + Number(item.labelCount || item.labels?.length || 0), 0);
    const detailCount = batch.items.reduce((sum, item) => sum + Number(item.capturedDetailCount || item.source?.labelDetailEnrichment?.capturedDetails || 0), 0);
    const modules = unique(batch.items.map((item) => item.moduleName).filter(Boolean));
    const lastItems = groups.slice(-4).map((group) => `${group.title}${group.seriesNames.length ? ` (${group.seriesNames.join(", ")})` : ""}`).join("; ");
    return `${groups.length} chunk${groups.length === 1 ? "" : "s"} queued across ${batch.items.length} plane set${batch.items.length === 1 ? "" : "s"}; ${labelCount} labels; ${detailCount} definitions; ${modules.length} module${modules.length === 1 ? "" : "s"}. Latest: ${lastItems}`;
  }

  function getLiveDrillCardBatchCompactSummaryText() {
    const batch = normalizeLiveDrillCardBatch(state.liveDrillCardBatch);
    if (!batch.items.length) return "Batch cart empty";
    const groups = groupLiveDrillCardBatchItems(batch.items);
    const labelCount = batch.items.reduce((sum, item) => sum + Number(item.labelCount || item.labels?.length || 0), 0);
    return `${groups.length} chunk${groups.length === 1 ? "" : "s"} / ${batch.items.length} plane${batch.items.length === 1 ? "" : "s"} / ${labelCount} labels`;
  }

  function buildLiveDrillCardBatchCartModalHtml() {
    const batch = normalizeLiveDrillCardBatch(state.liveDrillCardBatch);
    if (!batch.items.length) {
      return `<div class="library-empty">The Anki batch cart is empty. Add the current chunk, selected planes, or all module chunks first.</div>`;
    }
    const groups = groupLiveDrillCardBatchItems(batch.items);
    return groups.map((group, index) => {
      const seriesText = group.seriesNames.length ? group.seriesNames.join(", ") : "current plane";
      const labelText = getBatchGroupLabelCountText(group);
      const labelNames = getBatchGroupLabelNames(group);
      const labelPreview = labelNames.length ? labelNames.join(", ") : "No labels stored for this batch item.";
      const groupHeader = [
        `<label class="batch-group-head">`,
        `<input type="checkbox" data-role="batch-cart-group-check" data-group-key="${escapeHtml(group.key)}">`,
        `<span class="batch-group-copy">`,
        `<span class="batch-title-row">`,
        `<span class="batch-title">${escapeHtml(`${index + 1}. ${group.title || "IMAIOS chunk"}`)}</span>`,
        `<span class="batch-meta">${escapeHtml(`${seriesText} | ${labelText}`)}</span>`,
        `</span>`,
        `<span class="batch-label-preview"><strong>Labels:</strong> ${escapeHtml(labelPreview)}</span>`,
        `</span>`,
        `</label>`
      ].join("");
      const rows = group.items.map((item) => {
        const itemKey = getBatchItemSelectionKey(item);
        const series = getBatchItemSeriesLabel(item) || "current plane";
        const labels = Number(item.labelCount || item.labels?.length || 0);
        const details = Number(item.capturedDetailCount || item.source?.labelDetailEnrichment?.capturedDetails || 0);
        return [
          `<label class="batch-plane-row">`,
          `<input type="checkbox" data-role="batch-cart-item-check" data-group-key="${escapeHtml(group.key)}" data-item-key="${escapeHtml(itemKey)}" value="${escapeHtml(itemKey)}">`,
          `<span>${escapeHtml(`${series} | ${labels} label${labels === 1 ? "" : "s"}${details ? `, ${details} def` : ""}`)}</span>`,
          `</label>`
        ].join("");
      }).join("");
      return `<div class="batch-group">${groupHeader}<div class="batch-plane-list">${rows}</div></div>`;
    }).join("");
  }

  async function togglePairedAnswerSession() {
    if (state.liveDrillPairStarting) {
      setStatus("Paired tab is still opening. Give it a moment.", 5000);
      return;
    }
    if (state.liveDrillPair?.pairId) {
      await focusPairedPeerTab();
      return;
    }
    await startPairedAnswerSession();
  }

  async function startPairedAnswerSession() {
    if (state.liveDrillPairStarting) return;
    const drill = await buildLiveDrillPayloadFromCurrent({ requireLocked: true });
    if (!drill.ok) {
      setStatus(drill.reason, 9000);
      return;
    }
    if (!chrome?.runtime?.sendMessage) {
      setStatus("Extension messaging is unavailable, so the paired clean tab cannot open.", 9000);
      return;
    }

    state.liveDrillPairStarting = true;
    setStatus("Opening paired clean tab...", 0);
    chrome.runtime.sendMessage({
      type: "START_IMAIOS_LIVE_DRILL_PAIR_SESSION",
      payload: drill.payload
    }, async (response) => {
      state.liveDrillPairStarting = false;
      const error = chrome.runtime.lastError;
      if (error) {
        setStatus(`Could not open paired clean tab: ${error.message || error}`, 12000);
        return;
      }
      if (!response?.ok) {
        setStatus(`Could not open paired clean tab: ${response?.error || "unknown error"}`, 12000);
        return;
      }
      await setLiveDrillPairRole({
        pairId: response.pairId,
        role: "answer",
        peerTabId: response.leaderTabId || response.cleanTabId || 0,
        payload: drill.payload
      });
      setStatus(response.reused
        ? "Existing paired tab found. Move either tab and the other will follow."
        : "Paired clean tab opened. Move either tab and the other will follow.",
      10000);
    });
  }

  async function focusPairedPeerTab() {
    const pair = state.liveDrillPair;
    if (!pair?.pairId) {
      setStatus("No paired IMAIOS tab is active.", 5000);
      return;
    }
    if (!chrome?.runtime?.sendMessage) {
      setStatus("Extension messaging is unavailable, so the paired tab cannot be focused.", 8000);
      return;
    }
    chrome.runtime.sendMessage({
      type: "FOCUS_IMAIOS_LIVE_DRILL_PAIR_PEER",
      pairId: pair.pairId
    }, async (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        const message = String(error.message || error);
        if (/no longer registered/i.test(message)) {
          await stopPairedAnswerSession({ silent: true, notifyServiceWorker: false });
          await startPairedAnswerSession();
          return;
        }
        setStatus(`Could not switch paired tab: ${message}`, 9000);
        return;
      }
      if (!response?.ok) {
        const message = String(response?.error || "unknown error");
        if (/no longer registered/i.test(message)) {
          await stopPairedAnswerSession({ silent: true, notifyServiceWorker: false });
          await startPairedAnswerSession();
          return;
        }
        setStatus(`Could not switch paired tab: ${message}`, 9000);
      }
    });
  }

  async function stopPairedAnswerSession(options = {}) {
    const pair = state.liveDrillPair;
    stopLiveDrillPairSync();
    state.liveDrillPair = null;
    state.liveDrillPairLastSignature = "";
    refreshPanel();
    if (options.notifyServiceWorker && pair?.pairId && chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: "STOP_IMAIOS_LIVE_DRILL_PAIR_SESSION",
        pairId: pair.pairId
      }, () => {});
    }
    if (!options.silent) setStatus("Paired tab sync stopped.", 5000);
  }

  async function setLiveDrillPairRole(pairInfo = {}) {
    const pairId = String(pairInfo.pairId || "");
    const roleText = String(pairInfo.role || "");
    const role = roleText === "answer" || roleText === "follower"
      ? "answer"
      : (roleText === "quiz" || roleText === "leader" ? "quiz" : "peer");
    if (!pairId) return;
    const existingPair = state.liveDrillPair;
    const samePairRole = existingPair?.pairId === pairId && existingPair?.role === role;
    state.liveDrillPair = {
      pairId,
      role,
      peerTabId: Number(pairInfo.peerTabId || 0),
      payload: pairInfo.payload || null
    };

    if (samePairRole) {
      if (!state.liveDrillPairSyncTimer) startLiveDrillPairSync();
      refreshPanel();
      return;
    }

    state.liveDrillPairLastSignature = "";
    stopLiveDrillPairSync();
    if (role === "quiz") {
      await preparePairedQuizTab(pairInfo.payload);
    } else if (role === "answer") {
      if (pairInfo.payload?.kind === "imaios-live-drill" && !state.liveDrillRestoreRunning && !getLockedStructureCount()) {
        const encoded = getLiveDrillHashPayload();
        if (encoded) state.lastRestoredDrillHash = encoded;
        restoreLiveDrillPayload(pairInfo.payload, { source: "pair-answer" }).catch((error) => {
          setStatus(`Answer tab restore failed: ${error?.message || error}`, 12000);
        });
      }
    }
    startLiveDrillPairSync();
    refreshPanel();
  }

  async function preparePairedQuizTab(payload) {
    if (!payload || payload.kind !== "imaios-live-drill") return;
    try {
      const targetPlane = normalizePlaneName(payload.viewer?.plane || "");
      const currentPlane = normalizePlaneName(getSeriesInfo().selectedPlane) || inferSelectedPlaneFromDom();
      if (targetPlane && currentPlane && targetPlane !== currentPlane) {
        await switchPlane(targetPlane, { quiet: true });
        await delay(240);
      }
      const targetSlice = parseNumber(payload.viewer?.slice?.value);
      if (Number.isFinite(targetSlice)) {
        await setViewerSlice(targetSlice);
      }
      const clearResult = await clearLockedStructuresForPairSetup();
      await enforceAllStructuresHidden({ source: "pair-clean" });
      setStatus(clearResult.ok
        ? "Clean quiz tab ready. Move either tab and the pair stays synced."
        : `Clean quiz tab opened, but labels could not be cleared: ${clearResult.reason || "unknown error"}`,
      clearResult.ok ? 9000 : 14000);
    } catch (error) {
      setStatus(`Clean quiz setup failed: ${error?.message || error}`, 12000);
    }
  }

  async function clearLockedStructuresForPairSetup() {
    let lastResult = { ok: true, clearedCount: 0 };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await delay(attempt === 0 ? 450 : 750);
      const count = getLockedStructureCount();
      if (!count) {
        lastResult = { ok: true, clearedCount: 0 };
        continue;
      }
      lastResult = await clearLockedStructuresForApply();
      if (lastResult.ok) {
        const stableClear = await waitFor(() => getLockedStructureCount() === 0 ? true : null, 900, 120);
        if (stableClear) return lastResult;
      }
    }
    const remaining = getLockedStructureCount();
    if (!remaining) return lastResult.ok ? lastResult : { ok: true, clearedCount: 0 };
    return {
      ok: false,
      reason: lastResult.reason || `${remaining} locked structures still appear after setup clear.`
    };
  }

  function startLiveDrillPairSync() {
    stopLiveDrillPairSync();
    state.liveDrillPairSyncTimer = window.setInterval(sendLiveDrillPairSyncIfChanged, 240);
    startLiveDrillPairInputSync();
    sendLiveDrillPairSyncIfChanged();
  }

  function stopLiveDrillPairSync() {
    if (state.liveDrillPairSyncTimer) {
      window.clearInterval(state.liveDrillPairSyncTimer);
      state.liveDrillPairSyncTimer = 0;
    }
    state.liveDrillPairSyncBusy = false;
    stopLiveDrillPairInputSync();
  }

  function sendLiveDrillPairSyncIfChanged() {
    const pair = state.liveDrillPair;
    if (!pair?.pairId || state.liveDrillPairSyncBusy || state.liveDrillPairApplying || state.liveDrillRestoreRunning) return;
    const sync = getLiveDrillPairSyncSnapshot();
    if (!Number.isFinite(sync.slice?.value)) return;
    const signature = getLiveDrillPairSyncSignature(sync);
    if (signature === state.liveDrillPairLastSignature) return;
    state.liveDrillPairLastSignature = signature;
    state.liveDrillPairSyncBusy = true;
    chrome.runtime.sendMessage({
      type: "IMAIOS_LIVE_DRILL_PAIR_SYNC",
      pairId: pair.pairId,
      sync
    }, (response) => {
      state.liveDrillPairSyncBusy = false;
      const message = String(chrome.runtime.lastError?.message || response?.error || "");
      if (!response?.ok && /no longer registered|does not belong/i.test(message)) {
        stopPairedAnswerSession({ silent: true, notifyServiceWorker: false });
        setStatus("Paired tab sync was reset. Press T to reopen the clean pair.", 9000);
      }
    });
  }

  function getLiveDrillPairSyncSignature(sync = {}) {
    return `${sync.moduleKey || ""}|${normalizePlaneName(sync.plane || "")}|${sync.selectedSeries || ""}|${sync.slice?.value ?? ""}`;
  }

  function getLiveDrillPairSyncSnapshot() {
    const series = getSeriesInfo();
    const slice = getSliceInfo();
    return {
      moduleKey: getCurrentModuleKey(),
      moduleName: getCurrentModuleInfo().name,
      plane: normalizePlaneName(series.selectedPlane) || inferSelectedPlaneFromDom() || "",
      selectedSeries: series.selectedSeries || "",
      slice: {
        value: slice.value,
        min: slice.min,
        max: slice.max,
        counterText: slice.counterText || ""
      },
      at: Date.now()
    };
  }

  async function applyLiveDrillPairSync(sync = {}) {
    if (state.liveDrillPairApplying || state.liveDrillRestoreRunning) return { ok: false, reason: "Pair sync is busy." };
    state.liveDrillPairApplying = true;
    try {
      const targetPlane = normalizePlaneName(sync.plane || "");
      const targetSeries = cleanText(sync.selectedSeries || "");
      let currentSeriesInfo = getSeriesInfo();
      const currentSeries = cleanText(currentSeriesInfo.selectedSeries || "");
      if (targetSeries && normalizeText(targetSeries) !== normalizeText(currentSeries)) {
        const seriesResult = await switchSeriesByName(targetSeries, { quiet: true });
        if (seriesResult.ok) {
          await delay(180);
          currentSeriesInfo = getSeriesInfo();
        }
      }
      const currentPlane = normalizePlaneName(currentSeriesInfo.selectedPlane) || inferSelectedPlaneFromDom();
      if (targetPlane && currentPlane && targetPlane !== currentPlane) {
        await switchPlane(targetPlane, { quiet: true });
        await delay(180);
      }
      const targetSlice = parseNumber(sync.slice?.value);
      const currentSlice = getSliceInfo().value;
      if (Number.isFinite(targetSlice) && currentSlice !== targetSlice) {
        await setViewerSlice(targetSlice);
      }
      state.liveDrillPairLastSignature = getLiveDrillPairSyncSignature(sync);
      return { ok: true };
    } finally {
      state.liveDrillPairApplying = false;
    }
  }

  function startLiveDrillPairInputSync() {
    stopLiveDrillPairInputSync();
    if (!LIVE_DRILL_PAIR_INPUT_SYNC_ENABLED) return;
    const onWheel = (event) => handleLiveDrillPairWheel(event);
    const onPointerDown = (event) => handleLiveDrillPairPointer(event, "pointerdown");
    const onPointerMove = (event) => handleLiveDrillPairPointer(event, "pointermove");
    const onPointerUp = (event) => handleLiveDrillPairPointer(event, "pointerup");
    state.liveDrillPairInputHandlers = { onWheel, onPointerDown, onPointerMove, onPointerUp };
    document.addEventListener("wheel", onWheel, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerUp, true);
  }

  function stopLiveDrillPairInputSync() {
    const handlers = state.liveDrillPairInputHandlers;
    if (!handlers) return;
    document.removeEventListener("wheel", handlers.onWheel, true);
    document.removeEventListener("pointerdown", handlers.onPointerDown, true);
    document.removeEventListener("pointermove", handlers.onPointerMove, true);
    document.removeEventListener("pointerup", handlers.onPointerUp, true);
    document.removeEventListener("pointercancel", handlers.onPointerUp, true);
    state.liveDrillPairInputHandlers = null;
    state.liveDrillPairPointerActive = false;
  }

  function handleLiveDrillPairWheel(event) {
    if (!shouldRelayLiveDrillPairInput(event)) return;
    const point = getViewerRelativePoint(event.clientX, event.clientY);
    if (!point) return;
    sendLiveDrillPairInput({
      kind: "wheel",
      point,
      deltaX: Number(event.deltaX || 0),
      deltaY: Number(event.deltaY || 0),
      deltaZ: Number(event.deltaZ || 0),
      deltaMode: Number(event.deltaMode || 0),
      ctrlKey: Boolean(event.ctrlKey),
      shiftKey: Boolean(event.shiftKey),
      altKey: Boolean(event.altKey),
      metaKey: Boolean(event.metaKey)
    });
  }

  function handleLiveDrillPairPointer(event, phase) {
    if (phase === "pointermove" && !state.liveDrillPairPointerActive) return;
    if (!shouldRelayLiveDrillPairInput(event)) return;
    if (phase === "pointerdown") state.liveDrillPairPointerActive = true;
    if (phase === "pointerup") state.liveDrillPairPointerActive = false;
    if (phase === "pointermove") {
      const now = Date.now();
      if (now - state.liveDrillPairInputLastSent < 36) return;
      state.liveDrillPairInputLastSent = now;
    }
    const point = getViewerRelativePoint(event.clientX, event.clientY);
    if (!point) return;
    sendLiveDrillPairInput({
      kind: "pointer",
      phase,
      point,
      button: Number(event.button || 0),
      buttons: Number(event.buttons || 0),
      pointerId: Number(event.pointerId || 1),
      pointerType: event.pointerType || "mouse",
      ctrlKey: Boolean(event.ctrlKey),
      shiftKey: Boolean(event.shiftKey),
      altKey: Boolean(event.altKey),
      metaKey: Boolean(event.metaKey)
    });
  }

  function shouldRelayLiveDrillPairInput(event) {
    if (!LIVE_DRILL_PAIR_INPUT_SYNC_ENABLED) return false;
    if (!state.liveDrillPair?.pairId || state.liveDrillPairApplying || state.liveDrillPairInputApplying || state.liveDrillRestoreRunning) return false;
    if (event.target && (state.host?.contains(event.target) || event.target.closest?.("input,textarea,select,button,[contenteditable='true']"))) return false;
    if (!isSafeViewerInputTarget(event.target)) return false;
    return Boolean(getViewerRelativePoint(event.clientX, event.clientY));
  }

  function sendLiveDrillPairInput(input) {
    const pair = state.liveDrillPair;
    if (!pair?.pairId || !chrome?.runtime?.sendMessage) return;
    chrome.runtime.sendMessage({
      type: "IMAIOS_LIVE_DRILL_PAIR_INPUT",
      pairId: pair.pairId,
      input
    }, () => {});
  }

  async function applyLiveDrillPairInput(input = {}) {
    if (!LIVE_DRILL_PAIR_INPUT_SYNC_ENABLED) return { ok: true, disabled: true };
    if (state.liveDrillPairInputApplying || state.liveDrillRestoreRunning) return { ok: false, reason: "Pair input is busy." };
    const point = input.point || {};
    const client = viewerPointToClient(point);
    if (!client) return { ok: false, reason: "Could not map viewer input point." };
    state.liveDrillPairInputApplying = true;
    try {
      const target = document.elementFromPoint(client.x, client.y) || getViewerInteractionElement();
      if (!target) return { ok: false, reason: "Could not find viewer target." };
      if (!isSafeViewerInputTarget(target)) {
        return { ok: false, reason: "Mirrored input point landed outside the image viewer." };
      }
      if (input.kind === "wheel") {
        dispatchMirroredWheel(target, client, input);
      } else if (input.kind === "pointer") {
        dispatchMirroredPointer(target, client, input);
      }
      return { ok: true };
    } finally {
      setTimeout(() => {
        state.liveDrillPairInputApplying = false;
      }, 80);
    }
  }

  function dispatchMirroredWheel(target, client, input) {
    target.dispatchEvent(new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: client.x,
      clientY: client.y,
      deltaX: Number(input.deltaX || 0),
      deltaY: Number(input.deltaY || 0),
      deltaZ: Number(input.deltaZ || 0),
      deltaMode: Number(input.deltaMode || 0),
      ctrlKey: Boolean(input.ctrlKey),
      shiftKey: Boolean(input.shiftKey),
      altKey: Boolean(input.altKey),
      metaKey: Boolean(input.metaKey)
    }));
  }

  function dispatchMirroredPointer(target, client, input) {
    const phase = input.phase || "pointermove";
    const eventBase = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: client.x,
      clientY: client.y,
      button: Number(input.button || 0),
      buttons: phase === "pointerup" ? 0 : Number(input.buttons || 1),
      ctrlKey: Boolean(input.ctrlKey),
      shiftKey: Boolean(input.shiftKey),
      altKey: Boolean(input.altKey),
      metaKey: Boolean(input.metaKey)
    };
    try {
      target.dispatchEvent(new PointerEvent(phase, {
        ...eventBase,
        pointerId: Number(input.pointerId || 1),
        pointerType: input.pointerType || "mouse",
        isPrimary: true
      }));
    } catch {
      target.dispatchEvent(new MouseEvent(phase.replace(/^pointer/, "mouse"), eventBase));
      return;
    }
    target.dispatchEvent(new MouseEvent(phase.replace(/^pointer/, "mouse"), eventBase));
  }

  async function buildLiveDrillCardPromptPackage(options = {}) {
    const drill = await buildLiveDrillPayloadFromCurrent({ requireLocked: options.requireLocked !== false });
    if (!drill.ok) return drill;

    const enrichment = options.enrichDetails === false
      ? null
      : await enrichLiveDrillCardPromptDetails(drill.payload, {
        cacheOnly: options.enrichDetails === "cache-only" || Boolean(options.cacheOnlyDetails)
      });
    return {
      ok: true,
      payload: drill.payload,
      enrichment,
      promptText: buildLiveDrillCardPrompt(drill.payload, enrichment)
    };
  }

  async function harvestLabelDetailsForPlan(rawLabels, planModule = {}) {
    const labelList = unique((Array.isArray(rawLabels) ? rawLabels : [])
      .map((item) => typeof item === "string" ? item : item?.preferredLabel || item?.label || item?.name || "")
      .map(cleanText)
      .filter(Boolean));
    if (!labelList.length) {
      return { ok: false, error: "No labels were provided for IMAIOS definition harvest." };
    }
    const module = getCurrentModuleInfo();
    const series = getSeriesInfo();
    const slice = getSliceInfo();
    const payload = {
      kind: "imaios-live-drill",
      version: 1,
      id: createSlug(`${module.key}-${planModule.title || planModule.name || "definition-harvest"}`) || `imaios-definition-harvest-${Date.now()}`,
      title: cleanText(planModule.title || planModule.name || "IMAIOS definition harvest"),
      createdAt: new Date().toISOString(),
      module,
      viewer: {
        plane: normalizePlaneName(series.selectedPlane) || inferSelectedPlaneFromDom() || "",
        selectedSeries: series.selectedSeries || "",
        slice: {
          value: slice.value,
          min: slice.min,
          max: slice.max,
          counterText: slice.counterText || ""
        }
      },
      chunk: null,
      sourceContext: {
        articleTitle: "",
        topic: cleanText(planModule.topic || ""),
        source: cleanText(planModule.source || ""),
        breadcrumb: Array.isArray(planModule.breadcrumb) ? planModule.breadcrumb : [],
        deckPath: applyDeckRootOverride(planModule.deckPath || ""),
        tags: Array.isArray(planModule.tags) ? planModule.tags : []
      },
      labels: buildLiveDrillLabelEntries(labelList),
      lockedLabels: labelList,
      restorePlan: {
        clearLockedFirst: true,
        setPinsMode: true,
        switchPlane: false,
        setSlice: false
      }
    };

    const enrichment = await enrichLiveDrillCardPromptDetails(payload);
    const counts = enrichment?.counts || {};
    return {
      ok: enrichment?.ok !== false && !enrichment?.skipped,
      error: enrichment?.ok === false ? (enrichment.reason || "IMAIOS definition enrichment failed.") : "",
      module,
      requestedLabels: labelList,
      counts: {
        requestedLabels: labelList.length,
        capturedDetails: Number(counts.capturedDetails || 0),
        cachedDetails: Number(counts.cachedDetails || 0),
        newlyCapturedDetails: Number(counts.newlyCapturedDetails || 0),
        missedDetails: Number(counts.missedDetails || 0)
      },
      enrichment,
      details: (Array.isArray(enrichment?.labels) ? enrichment.labels : []).map((result) => ({
        label: result.label || result.detail?.title || "",
        normalizedLabel: result.normalizedLabel || normalizeText(result.label || result.detail?.title || ""),
        status: result.status || "",
        source: result.source || "",
        cached: Boolean(result.cached),
        reason: result.reason || "",
        detail: result.detail || null
      }))
    };
  }

  async function enrichLiveDrillCardPromptDetails(payload, options = {}) {
    const labels = getLiveDrillRestoreLabels(payload);
    if (!labels.length) return { ok: false, skipped: true, reason: "No labels were available for enrichment." };
    const labelInfoMap = getLiveDrillPayloadLabelInfoMap(payload);
    const cachedResults = [];
    const missingLabels = [];
    for (const label of labels) {
      const labelInfo = labelInfoMap.get(normalizeText(label)) || {
        preferredLabel: label,
        moduleKey: payload?.module?.key || "",
        moduleName: payload?.module?.name || "",
        moduleUrl: payload?.module?.url || ""
      };
      const cached = getCachedLabelDetailRecord(labelInfo);
      if (cached) cachedResults.push(buildCachedLabelDetailResult(cached, labelInfo));
      else missingLabels.push(label);
    }
    if (!missingLabels.length) {
      return buildCombinedLabelDetailEnrichmentProbe(payload, cachedResults, null, {
        ok: true,
        cacheOnly: true
      });
    }
    if (options.cacheOnly) {
      return buildCombinedLabelDetailEnrichmentProbe(payload, cachedResults, null, {
        ok: true,
        cacheOnly: true,
        missingLabels
      });
    }
    if (state.searchRunning) {
      return buildCombinedLabelDetailEnrichmentProbe(payload, cachedResults, null, {
        ok: false,
        skipped: true,
        reason: "Another search workflow is already running.",
        missingLabels
      });
    }
    if (state.liveDrillRestoreRunning) {
      return buildCombinedLabelDetailEnrichmentProbe(payload, cachedResults, null, {
        ok: false,
        skipped: true,
        reason: "A live-drill restore is still running; label-detail enrichment is disabled until the drill is ready.",
        missingLabels
      });
    }

    const cacheText = cachedResults.length ? ` (${cachedResults.length} cached)` : "";
    setStatus(`Fast enrichment: collecting IMAIOS definitions for ${missingLabels.length} missing label${missingLabels.length === 1 ? "" : "s"}${cacheText}...`, 0);
    const workflow = await runLockedLabelSearchPinDetailWorkflow(missingLabels, {
      profile: getSearchPinProbeProfile({ fast: true }),
      sourcePayload: payload,
      statusVerb: "Fast enrichment"
    });
    const freshProbe = workflow.probe || {
      ok: false,
      reason: workflow.reason || "Could not run label detail enrichment.",
      labels: []
    };
    const mergeResult = mergeLabelDetailProbeIntoRepository(freshProbe, payload);
    let saveResult = null;
    let backupResult = null;
    if (mergeResult.savedCount) {
      saveResult = await saveLabelDetailRepository();
      if (saveResult.ok) {
        backupResult = await backupLabelDetailRepositoryToDownloads("live-drill-enrichment");
      }
    }
    return buildCombinedLabelDetailEnrichmentProbe(payload, cachedResults, freshProbe, {
      ok: workflow.ok,
      reason: workflow.reason || freshProbe.reason || "",
      missingLabels,
      repository: {
        mergeResult,
        saveResult,
        backupResult
      }
    });
  }

  function buildCombinedLabelDetailEnrichmentProbe(payload, cachedResults = [], freshProbe = null, options = {}) {
    const lockedLabels = getLiveDrillRestoreLabels(payload);
    const freshLabels = Array.isArray(freshProbe?.labels) ? freshProbe.labels : [];
    const labels = [...cachedResults, ...freshLabels];
    const captured = labels.filter((item) => item.status === "captured").length;
    const freshCaptured = freshLabels.filter((item) => item.status === "captured").length;
    const statusCounts = labels.reduce((counts, item) => {
      const key = item.status || "unknown";
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
    const freshCounts = freshProbe?.counts || {};
    return {
      kind: "imaios-locked-label-search-pin-detail-probe",
      version: 1,
      createdAt: new Date().toISOString(),
      pageTitle: freshProbe?.pageTitle || document.title,
      url: freshProbe?.url || location.href,
      module: freshProbe?.module || payload?.module || getCurrentModuleInfo(),
      series: freshProbe?.series || getSeriesInfo(),
      slice: freshProbe?.slice || getSliceInfo(),
      ok: options.ok !== false,
      skipped: Boolean(options.skipped),
      cacheOnly: Boolean(options.cacheOnly),
      reason: options.reason || freshProbe?.reason || "",
      counts: {
        lockedLabels: lockedLabels.length,
        attemptedLabels: Number(freshCounts.attemptedLabels || 0),
        searchResultsFound: Number(freshCounts.searchResultsFound || 0),
        visiblePinsFound: Number(freshCounts.visiblePinsFound || 0),
        capturedDetails: captured,
        cachedDetails: cachedResults.length,
        newlyCapturedDetails: freshCaptured,
        missedDetails: Math.max(0, lockedLabels.length - captured),
        statusCounts
      },
      workflow: {
        ...(freshProbe?.workflow || {}),
        profile: freshProbe?.workflow?.profile || "fast",
        cacheHitLabels: cachedResults.map((item) => item.label).filter(Boolean),
        missingLabelsRequested: Array.isArray(options.missingLabels) ? options.missingLabels : [],
        repository: options.repository || null
      },
      sourceDrill: payload,
      lockedLabels,
      labels
    };
  }

  function describeLiveDrillPromptEnrichment(enrichment) {
    if (!enrichment) return "";
    const counts = enrichment.counts || {};
    if (enrichment.cacheOnly) {
      const captured = Number(counts.capturedDetails || 0);
      const total = Number(counts.lockedLabels || 0);
      const missed = Number(counts.missedDetails || Math.max(0, total - captured));
      if (!total) return "";
      return missed
        ? ` Cached definitions ${captured}/${total}; ${missed} missing, no harvest run.`
        : ` Cached definitions ${captured}/${total}; no harvest run.`;
    }
    if (enrichment.skipped || enrichment.reason) return ` Label-detail enrichment skipped: ${enrichment.reason || "unknown reason"}.`;
    const captured = Number(counts.capturedDetails || 0);
    const cached = Number(counts.cachedDetails || 0);
    const fresh = Number(counts.newlyCapturedDetails || 0);
    const total = Number(counts.lockedLabels || 0);
    const sourceText = cached || fresh ? ` (${cached} cached, ${fresh} new)` : "";
    return total ? ` Enriched ${captured}/${total} with IMAIOS definitions${sourceText}.` : "";
  }

  function buildLiveDrillCardPrompt(payload, enrichment = null) {
    const source = buildLiveDrillCardPromptSource(payload, enrichment);
    return buildLiveDrillSingleCardPrompt(source);
  }

  function buildLiveDrillCardPromptSource(payload, enrichment = null) {
    const context = buildLiveDrillCardContext(payload);
    const labelDetailByKey = getLiveDrillLabelDetailPromptMap(enrichment);
    return {
      kind: "imaios-live-drill-card-source",
      version: 1,
      sourceDrillId: payload.id,
      generatedAt: new Date().toISOString(),
      breadcrumb: context.breadcrumb,
      suggestedDeckPath: context.suggestedDeckPath,
      suggestedTags: context.suggestedTags,
      routing: {
        explicitBreadcrumb: context.explicitBreadcrumb,
        explicitDeckPath: context.explicitDeckPath,
        explicitTags: context.explicitTags
      },
      module: payload.module,
      viewer: payload.viewer,
      chunk: payload.chunk,
      labels: payload.labels.map((entry) => ({
        preferredLabel: entry.preferredLabel,
        aliases: entry.aliases || [],
        href: entry.href || "",
        source: entry.source || "",
        imaiosDetail: labelDetailByKey.get(normalizeText(entry.preferredLabel)) || null
      })),
      labelDetailEnrichment: getLiveDrillLabelDetailEnrichmentSummary(enrichment),
      learningFrame: context.learningFrame
    };
  }

  function buildLiveDrillSingleCardPrompt(source) {
    return [
      "You are planning Anki identification cards for live IMAIOS anatomy drills.",
      "",
      "Goal:",
      "- The card front will contain a live IMAIOS drill link that restores the selected module, series/plane, slice, and locked labels.",
      "- The learner opens the link and names the locked structures in IMAIOS before revealing the answer.",
      "- This is vocabulary and image-recognition practice, not a lecture and not pathology cards.",
      `- The extension will export a standard Anki \`${LIVE_DRILL_ANKI_NOTE_TYPE}\` note type TSV, not Image Occlusion and not a custom radiology note type.`,
      "",
      "Hard rules:",
      "- Use only the exact `preferredLabel` strings supplied in INPUT.labels.",
      "- Do not invent labels, rename labels, or substitute synonyms in the `labels` arrays.",
      "- Every supplied label must appear in at least one card.",
      "- Do not output final TSV and do not output encoded IMAIOS URLs. The browser extension will generate those from your JSON plan.",
      "- Keep each card a learnable visual retrieval task. Prefer 2-4 labels per card. Use 5-6 only when they are one tight object/subpart family. Split larger groups into pedagogic subgroups.",
      "- If a parent label and subparts are present, you may include the parent with the subparts when it improves orientation, but do not make every card depend on remembering a huge list.",
      "- Use INPUT.labels[].imaiosDetail as supplemental anatomy context for relationships, hierarchy, boundaries, contents, and nearby confusions.",
      "- IMAIOS details are for better grouping and concise recognition cues; do not turn the card into a definition memorization card.",
      "- If a label has no captured IMAIOS detail, still include it using the exact preferredLabel and use the available neighboring context.",
      "- Use INPUT.learningFrame and INPUT.chunk as the source for scan order, review rationale, boundaries, and article-specific emphasis when writing recognitionCues, contrastCues, and rationale.",
      "- Keep recognitionCues practical for image review: where to start looking, what boundary/relationship matters, and what nearby structure could be confused.",
      "- Spell out uncommon acronyms the first time they appear in generated prose, followed by the acronym in parentheses. Common modality acronyms such as CT and MRI may remain abbreviated.",
      "- Preserve the breadcrumb/deck/tag context exactly enough that downstream import can route the card.",
      "- If INPUT.routing.explicitBreadcrumb, INPUT.routing.explicitDeckPath, or INPUT.routing.explicitTags are populated, treat them as authoritative source routing. Copy them unless a tiny formatting cleanup is needed.",
      "- Include INPUT.viewer.selectedSeries or INPUT.viewer.plane in the title when it clarifies the card set.",
      "",
      "Return exactly one fenced JSON block with this schema:",
      "```json",
      "{",
      "  \"kind\": \"imaios-live-drill-card-plan\",",
      "  \"version\": 1,",
      "  \"sourceDrillId\": \"copy INPUT.sourceDrillId\",",
      "  \"title\": \"short card-set title\",",
      "  \"breadcrumb\": [\"copy or lightly refine INPUT.breadcrumb\"],",
      "  \"deckPath\": \"copy or lightly refine INPUT.suggestedDeckPath\",",
      "  \"tags\": [\"copy or lightly refine INPUT.suggestedTags\"],",
      "  \"cards\": [",
      "    {",
      "      \"id\": \"short-stable-slug\",",
      "      \"title\": \"card title\",",
      "      \"frontPrompt\": \"Open the live drill and name the locked structures.\",",
      "      \"labels\": [\"exact preferredLabel\", \"exact preferredLabel\"],",
      "      \"recognitionCues\": [\"brief visual/anatomic cue\", \"brief visual/anatomic cue\"],",
      "      \"contrastCues\": [\"brief nearby-confusion cue if useful\"],",
      "      \"rationale\": \"why these labels belong together pedagogically\",",
      "      \"tags\": [\"optional_extra_tag\"]",
      "    }",
      "  ]",
      "}",
      "```",
      "",
      "INPUT:",
      "```json",
      JSON.stringify(source, null, 2),
      "```"
    ].join("\n");
  }

  function buildBatchPromptLabelDetailKey(label, item = {}) {
    const preferredLabel = cleanText(label?.preferredLabel || label?.label || label?.name || label || "");
    const moduleKey = cleanText(label?.moduleKey || item.moduleKey || item.source?.module?.key || item.payload?.module?.key || "");
    const basis = [moduleKey || "module", preferredLabel].filter(Boolean).join("::");
    return createSlug(basis) || normalizeText(basis).replace(/\s+/g, "-");
  }

  function compactBatchPromptLabelDetail(detail) {
    const source = detail?.detail && typeof detail.detail === "object" ? detail.detail : detail;
    if (!source || typeof source !== "object") return null;
    const definition = limitPromptText(source.definition || "", 900);
    const summary = limitPromptText(source.summary || "", 360);
    const hierarchy = Array.isArray(source.hierarchy)
      ? source.hierarchy.map((card) => ({
        name: cleanText(card.name || ""),
        ancestors: Array.isArray(card.ancestors) ? card.ancestors.map(cleanText).filter(Boolean).slice(0, 5) : [],
        children: Array.isArray(card.children) ? card.children.map(cleanText).filter(Boolean).slice(0, 8) : []
      })).filter((card) => card.name || card.ancestors.length || card.children.length).slice(0, 3)
      : [];
    const chips = Array.isArray(source.chips)
      ? source.chips.map((chip) => typeof chip === "string" ? chip : chip?.label || "").map(cleanText).filter(Boolean).slice(0, 8)
      : [];
    if (!definition && !summary && !hierarchy.length && !chips.length) return null;
    return {
      title: cleanText(source.title || ""),
      alternateTitle: cleanText(source.alternateTitle || ""),
      definition,
      summary,
      chips,
      hierarchy
    };
  }

  function compactBatchPromptLabel(label, item, detailMap) {
    const preferredLabel = cleanText(label?.preferredLabel || label?.label || label?.name || label || "");
    if (!preferredLabel) return null;
    const detailKey = buildBatchPromptLabelDetailKey(label, item);
    const detail = compactBatchPromptLabelDetail(label?.imaiosDetail || null);
    if (detail && detailKey && !detailMap[detailKey]) {
      detailMap[detailKey] = {
        preferredLabel,
        moduleKey: cleanText(label?.moduleKey || item.moduleKey || item.source?.module?.key || item.payload?.module?.key || ""),
        moduleName: cleanText(item.moduleName || item.source?.module?.name || item.payload?.module?.name || ""),
        href: cleanText(label?.href || ""),
        ...detail
      };
    }
    return {
      preferredLabel,
      detailKey
    };
  }

  function compactBatchPromptModule(module = {}) {
    return {
      key: cleanText(module.key || ""),
      name: cleanText(module.name || ""),
      url: cleanText(module.url || ""),
      pathname: cleanText(module.pathname || "")
    };
  }

  function compactBatchPromptViewer(viewer = {}) {
    return {
      plane: cleanText(viewer.plane || ""),
      selectedSeries: cleanText(viewer.selectedSeries || ""),
      slice: viewer.slice && typeof viewer.slice === "object" ? {
        value: Number(viewer.slice.value ?? 0),
        min: Number(viewer.slice.min ?? 0),
        max: Number(viewer.slice.max ?? 0),
        counterText: cleanText(viewer.slice.counterText || "")
      } : null,
      range: viewer.range && typeof viewer.range === "object" ? {
        startSlice: Number(viewer.range.startSlice ?? viewer.range.start ?? 0),
        endSlice: Number(viewer.range.endSlice ?? viewer.range.end ?? 0),
        frameCount: Number(viewer.range.frameCount || 0)
      } : null
    };
  }

  function compactBatchPromptChunk(chunk = {}) {
    return {
      id: cleanText(chunk.id || ""),
      title: cleanText(chunk.title || ""),
      parentGroup: cleanText(chunk.parentGroup || ""),
      source: cleanText(chunk.source || ""),
      modality: cleanText(chunk.modality || ""),
      moduleKey: cleanText(chunk.moduleKey || ""),
      moduleName: cleanText(chunk.moduleName || ""),
      modalityUrl: cleanText(chunk.modalityUrl || ""),
      breadcrumb: normalizeBreadcrumbList(chunk.breadcrumb || []),
      deckPath: applyDeckRootOverride(chunk.deckPath || ""),
      tags: normalizeStringList(chunk.tags || [])
    };
  }

  function buildLiveDrillBatchCardSource() {
    const batch = normalizeLiveDrillCardBatch(state.liveDrillCardBatch);
    if (!batch.items.length) return { ok: false, reason: "Anki batch is empty. Add reviewed live drills first." };
    const now = new Date().toISOString();
    const topic = cleanText(batch.topic || state.chunkLibrary.topic || state.chunkLibrary.articleTitle || "IMAIOS live drills");
    const route = getLibraryRoutingMetadata({
      sourceContext: {
        ...state.chunkLibrary,
        topic
      }
    });
    const breadcrumb = route.breadcrumb.length ? route.breadcrumb : normalizeBreadcrumbList([topic]);
    const suggestedDeckPath = route.deckPath || buildDeckPathFromBreadcrumb(breadcrumb);
    const suggestedTags = unique([
      ...route.tags,
      "imaios",
      "live_drill",
      "batch",
      topic && `article::${topic}`
    ].filter(Boolean).map(toAnkiTag));
    const batchItems = batch.items.map((item) => normalizeLiveDrillCardBatchItem(item)).filter(Boolean);
    const labelDetails = {};
    const compactItems = batchItems.map((item) => {
      const rawLabels = Array.isArray(item.source?.labels) ? item.source.labels : Array.isArray(item.labels) ? item.labels : [];
      const labels = rawLabels.map((label) => compactBatchPromptLabel(label, item, labelDetails)).filter(Boolean);
      const module = compactBatchPromptModule(item.source?.module || item.payload?.module || {});
      const viewer = compactBatchPromptViewer(item.source?.viewer || item.payload?.viewer || {});
      const chunk = compactBatchPromptChunk(item.source?.chunk || item.payload?.chunk || {});
      return {
        id: item.id,
        sourceDrillId: item.sourceDrillId,
        title: item.title,
        plane: item.plane || viewer.plane || "",
        series: item.series || viewer.selectedSeries || "",
        module,
        viewer,
        chunk,
        labels,
        learningFrame: normalizeStringList(item.source?.learningFrame || item.payload?.chunk?.learningFrame || [])
      };
    }).filter((item) => item.sourceDrillId && item.labels.length);
    const labels = compactItems.flatMap((item) => item.labels.map((label) => ({
      preferredLabel: label.preferredLabel,
      detailKey: label.detailKey,
      sourceDrillId: item.sourceDrillId,
      sourceTitle: item.title,
      moduleKey: item.module?.key || "",
      moduleName: item.module?.name || ""
    })));
    return {
      ok: true,
      payload: {
        kind: "imaios-live-drill-batch-source",
        version: 1,
        sourceDrillId: `batch-${createSlug(topic) || Date.now()}`,
        generatedAt: now,
        title: topic,
        topic,
        source: cleanText(batch.source || state.chunkLibrary.source || ""),
        sourceContext: {
          articleTitle: topic,
          topic,
          source: cleanText(batch.source || state.chunkLibrary.source || ""),
          breadcrumb,
          deckPath: suggestedDeckPath,
          tags: suggestedTags
        },
        breadcrumb,
        suggestedDeckPath,
        suggestedTags,
        routing: {
          explicitBreadcrumb: route.breadcrumb,
          explicitDeckPath: route.deckPath,
          explicitTags: route.tags
        },
        promptCompression: {
          mode: "shared-label-details",
          originalBatchItems: batchItems.length,
          sentBatchItems: compactItems.length,
          totalLabelOccurrences: labels.length,
          uniqueLabelDetails: Object.keys(labelDetails).length
        },
        labelDetails,
        batchItems: compactItems
      }
    };
  }

  function buildLiveDrillBatchCardPrompt(source) {
    return [
      "You are planning Anki identification cards for a batch of live IMAIOS anatomy drills collected across one study session.",
      "",
      "Goal:",
      "- The card front will contain a live IMAIOS drill link that restores one selected module, series/plane, slice, and locked-label set.",
      "- The learner opens the link and names the locked structures in IMAIOS before revealing the answer.",
      "- This is vocabulary and image-recognition practice, not a lecture and not pathology cards.",
      `- The extension will export a standard Anki \`${LIVE_DRILL_ANKI_NOTE_TYPE}\` note type TSV.`,
      "",
      "Hard rules:",
      "- Create cards only from INPUT.batchItems[].labels[].preferredLabel.",
      "- Each card must use labels from exactly one INPUT.batchItems[] item and must include that item's `sourceDrillId`.",
      "- Do not mix labels from different modules/drills in one card, because each card opens one live IMAIOS drill link.",
      "- Every supplied label from every batch item must appear in at least one card.",
      "- Use only exact `preferredLabel` strings. Do not invent labels, rename labels, or substitute synonyms in the `labels` arrays.",
      "- Prefer 2-4 labels per card. Use 5-6 only when they are one tight object/subpart family. Split larger groups into pedagogic subgroups.",
      "- Each label may include a `detailKey`; look up INPUT.labelDetails[detailKey] for the shared IMAIOS definition/context instead of expecting the full detail inline.",
      "- Use INPUT.labelDetails as supplemental anatomy context for relationships, hierarchy, boundaries, contents, and nearby confusions.",
      "- Details are for better grouping and concise recognition cues; do not turn cards into definition memorization cards.",
      "- Use each INPUT.batchItems[].learningFrame and INPUT.batchItems[].chunk as the source for scan order, review rationale, boundaries, and article-specific emphasis when writing recognitionCues, contrastCues, and rationale.",
      "- Keep recognitionCues practical for image review: where to start looking, what boundary/relationship matters, and what nearby structure could be confused.",
      "- Spell out uncommon acronyms the first time they appear in generated prose, followed by the acronym in parentheses. Common modality acronyms such as CT and MRI may remain abbreviated.",
      "- Preserve breadcrumb/deck/tag context for the overall batch.",
      "- When multiple batch items share the same chunk/title across different series or planes, include the series or plane in the card title.",
      "",
      "Return exactly one fenced JSON block with this schema:",
      "```json",
      "{",
      "  \"kind\": \"imaios-live-drill-card-plan\",",
      "  \"version\": 1,",
      "  \"sourceDrillId\": \"copy INPUT.sourceDrillId\",",
      "  \"title\": \"short batch card-set title\",",
      "  \"breadcrumb\": [\"copy or lightly refine INPUT.breadcrumb\"],",
      "  \"deckPath\": \"copy or lightly refine INPUT.suggestedDeckPath\",",
      "  \"tags\": [\"copy or lightly refine INPUT.suggestedTags\"],",
      "  \"cards\": [",
      "    {",
      "      \"id\": \"short-stable-slug\",",
      "      \"sourceDrillId\": \"copy one INPUT.batchItems[].sourceDrillId\",",
      "      \"title\": \"card title\",",
      "      \"frontPrompt\": \"Open the live drill and name the locked structures.\",",
      "      \"labels\": [\"exact preferredLabel\", \"exact preferredLabel\"],",
      "      \"recognitionCues\": [\"brief visual/anatomic cue\"],",
      "      \"contrastCues\": [\"brief nearby-confusion cue if useful\"],",
      "      \"rationale\": \"why these labels belong together pedagogically\",",
      "      \"tags\": [\"optional_extra_tag\"]",
      "    }",
      "  ]",
      "}",
      "```",
      "",
      "INPUT:",
      "```json",
      JSON.stringify(source, null, 2),
      "```"
    ].join("\n");
  }

  function getLiveDrillLabelDetailPromptMap(enrichment) {
    const labels = Array.isArray(enrichment?.labels) ? enrichment.labels : [];
    const map = new Map();
    for (const result of labels) {
      const key = normalizeText(result?.label || result?.detail?.title || "");
      if (!key || map.has(key)) continue;
      map.set(key, buildLiveDrillLabelDetailPromptContext(result));
    }
    return map;
  }

  function getLiveDrillLabelDetailEnrichmentSummary(enrichment) {
    if (!enrichment) return null;
    const counts = enrichment.counts || {};
    return {
      profile: enrichment.workflow?.profile || "",
      capturedDetails: Number(counts.capturedDetails || 0),
      cachedDetails: Number(counts.cachedDetails || 0),
      newlyCapturedDetails: Number(counts.newlyCapturedDetails || 0),
      missedDetails: Number(counts.missedDetails || 0),
      attemptedLabels: Number(counts.attemptedLabels || 0),
      visiblePinsFound: Number(counts.visiblePinsFound || 0),
      searchResultsFound: Number(counts.searchResultsFound || 0),
      statusCounts: counts.statusCounts || {},
      repository: enrichment.workflow?.repository || null,
      missedLabels: (Array.isArray(enrichment.labels) ? enrichment.labels : [])
        .filter((item) => item.status !== "captured")
        .map((item) => ({
          label: item.label || "",
          status: item.status || "",
          reason: item.reason || ""
        }))
    };
  }

  function buildLiveDrillLabelDetailPromptContext(result) {
    const detail = result?.detail || {};
    return {
      captureStatus: result?.status || "",
      captureSource: result?.source || "",
      selectedText: result?.selectedText || "",
      reason: result?.reason || "",
      title: detail.title || "",
      alternateTitle: detail.alternateTitle || "",
      definition: limitPromptText(detail.definition || "", 1600),
      definitionSource: limitPromptText(detail.definitionSource || "", 360),
      summary: limitPromptText(detail.summary || "", 700),
      chips: Array.isArray(detail.chips)
        ? detail.chips.map((chip) => chip.label || "").filter(Boolean).slice(0, 10)
        : [],
      hierarchy: Array.isArray(detail.hierarchy)
        ? detail.hierarchy.map((card) => ({
          name: card.name || "",
          ancestors: Array.isArray(card.ancestors) ? card.ancestors.slice(0, 8) : [],
          children: Array.isArray(card.children) ? card.children.slice(0, 12) : []
        })).slice(0, 5)
        : []
    };
  }

  function limitPromptText(value, maxLength) {
    const text = cleanText(value || "");
    const limit = Number(maxLength) || 1000;
    if (text.length <= limit) return text;
    return `${text.slice(0, limit).replace(/\s+\S*$/, "")}...`;
  }

  function buildLiveDrillCardContext(payload) {
    const isBatch = isLiveDrillBatchSource(payload);
    const chunk = isBatch ? null : getActiveChunk();
    const sourceContext = payload?.sourceContext || {};
    const libraryRoute = getLibraryRoutingMetadata(payload);
    const chunkRoute = isBatch ? { breadcrumb: [], deckPath: "", tags: [] } : getChunkRoutingMetadata(chunk, payload?.chunk || {});
    const articleTitle = cleanText(sourceContext.articleTitle || sourceContext.topic || state.chunkLibrary.articleTitle || state.chunkLibrary.topic || payload?.chunk?.title || payload?.module?.name || "IMAIOS anatomy");
    const sourceName = cleanText(sourceContext.source || state.chunkLibrary.source || chunk?.source || "");
    const moduleName = cleanText(payload?.module?.name || getCurrentModuleName());
    const chunkTitle = cleanText(payload?.chunk?.title || chunk?.title || payload?.title || "");
    const parentGroup = cleanText(payload?.chunk?.parentGroup || chunk?.parentGroup || "");
    const plane = cleanText(payload?.viewer?.plane || "");
    const explicitBreadcrumb = unique([
      ...libraryRoute.breadcrumb,
      ...chunkRoute.breadcrumb
    ]);
    const fallbackBreadcrumb = unique([
      articleTitle,
      sourceName,
      moduleName,
      parentGroup,
      chunkTitle
    ].filter(Boolean));
    const breadcrumb = explicitBreadcrumb.length ? explicitBreadcrumb : fallbackBreadcrumb;
    const learningFrame = unique([
      ...(Array.isArray(chunk?.learningFrame) ? chunk.learningFrame : []),
      ...(Array.isArray(payload?.chunk?.learningFrame) ? payload.chunk.learningFrame : [])
    ]);
    const explicitDeckPath = applyDeckRootOverride(chunkRoute.deckPath || libraryRoute.deckPath);
    const suggestedDeckPath = explicitDeckPath || buildDeckPathFromBreadcrumb(breadcrumb);
    const explicitTags = unique([
      ...libraryRoute.tags,
      ...chunkRoute.tags
    ]);
    const suggestedTags = unique([
      ...explicitTags,
      "imaios",
      "live_drill",
      articleTitle && `article::${articleTitle}`,
      moduleName && `module::${moduleName}`,
      chunkTitle && `chunk::${chunkTitle}`,
      plane && `plane::${plane}`
    ].filter(Boolean).map(toAnkiTag));
    return {
      articleTitle,
      sourceName,
      moduleName,
      chunkTitle,
      parentGroup,
      plane,
      breadcrumb,
      explicitBreadcrumb,
      learningFrame,
      suggestedDeckPath,
      explicitDeckPath,
      suggestedTags,
      explicitTags
    };
  }

  function getLibraryRoutingMetadata(payload = null) {
    const library = {
      ...(state.chunkLibrary || {}),
      ...(payload?.sourceContext && typeof payload.sourceContext === "object" ? payload.sourceContext : {})
    };
    return {
      breadcrumb: normalizeBreadcrumbList(
        library.breadcrumb ||
        library.breadcrumbs ||
        library.breadcrumbTrail ||
        library.deckBreadcrumb ||
        library.ankiBreadcrumb ||
        library.anki?.breadcrumb ||
        library.anki?.breadcrumbTrail ||
        library.metadata?.breadcrumbTrail
      ),
      deckPath: applyDeckRootOverride(
        library.deckPath ||
        library.suggestedDeckPath ||
        library.ankiDeckPath ||
        library.anki?.deckPath ||
        library.anki?.deck ||
        library.metadata?.deckPath ||
        ""
      ),
      tags: normalizeStringList(
        library.tags ||
        library.suggestedTags ||
        library.ankiTags ||
        library.anki?.tags ||
        library.metadata?.tags
      )
    };
  }

  function getChunkRoutingMetadata(chunk, payloadChunk = {}) {
    const source = {
      ...(payloadChunk && typeof payloadChunk === "object" ? payloadChunk : {}),
      ...(chunk && typeof chunk === "object" ? chunk : {})
    };
    return {
      breadcrumb: normalizeBreadcrumbList(
        source.breadcrumb ||
        source.breadcrumbs ||
        source.breadcrumbTrail ||
        source.deckBreadcrumb ||
        source.ankiBreadcrumb ||
        source.anki?.breadcrumb ||
        source.anki?.breadcrumbTrail ||
        source.routing?.breadcrumb ||
        source.routing?.breadcrumbTrail
      ),
      deckPath: applyDeckRootOverride(
        source.deckPath ||
        source.suggestedDeckPath ||
        source.ankiDeckPath ||
        source.anki?.deckPath ||
        source.anki?.deck ||
        source.routing?.deckPath ||
        ""
      ),
      tags: normalizeStringList(
        source.tags ||
        source.suggestedTags ||
        source.ankiTags ||
        source.anki?.tags ||
        source.routing?.tags
      )
    };
  }

  function normalizeBreadcrumbList(value) {
    if (Array.isArray(value)) return unique(value.map(cleanText).filter(Boolean));
    if (typeof value === "string") {
      const text = cleanText(value);
      if (!text) return [];
      return unique(text.split(/\s*(?:::|>|\/)\s*/).map(cleanText).filter(Boolean));
    }
    return [];
  }

  async function importLiveDrillCardPlanFromClipboard() {
    let text = "";
    try {
      text = await readClipboard();
    } catch (_error) {
      setStatus("Could not read clipboard for the ChatGPT card plan.", 7000);
      return;
    }

    let plan = null;
    try {
      plan = parseLiveDrillCardPlan(text);
    } catch (error) {
      setStatus(`Card plan import failed: ${error.message || error}`, 10000);
      return;
    }

    const sourcePayload = await getSourcePayloadForCardPlan(plan);
    const result = await finalizeLiveDrillCardPlan(plan, sourcePayload, { source: "clipboard" });
    setStatus(result.message, result.ok ? 14000 : 12000);
  }

  async function finalizeLiveDrillCardPlan(plan, sourcePayload, options = {}) {
    if (!sourcePayload) {
      return {
        ok: false,
        message: "No saved live-drill source is available. Click Create Anki cards or copy the GPT card prompt from the current locked labels first."
      };
    }

    await refreshLabelRepositoriesFromStorage();

    const validation = validateLiveDrillCardPlan(plan, sourcePayload);
    if (validation.unknownLabels.length) {
      return {
        ok: false,
        message: `Plan has labels not in the source drill: ${validation.unknownLabels.slice(0, 6).join(", ")}${validation.unknownLabels.length > 6 ? "..." : ""}. Fix the JSON in ChatGPT and try again.`
      };
    }
    if (!validation.validCards.length) {
      return { ok: false, message: "The card plan has no cards with source labels." };
    }

    const deckPath = getLiveDrillImportDeckPath(plan, sourcePayload);
    const nativeCoverage = getLiveDrillPlanNativeCoverage(sourcePayload, validation.validCards);
    const tsv = buildLiveDrillCardsTsv(plan, sourcePayload, validation.validCards, { deckPath });
    const outputPaths = buildLiveDrillCardOutputPaths(sourcePayload, plan);
    const normalizedPlan = {
      ...plan,
      deckPath,
      noteType: LIVE_DRILL_ANKI_NOTE_TYPE,
      generatedTsvAt: new Date().toISOString(),
      generatedBy: options.source || "imaios",
      outputColumns: ["Front", "Back", "Tags"],
      ankiImportHeaders: {
        separator: "tab",
        html: true,
        notetype: LIVE_DRILL_ANKI_NOTE_TYPE,
        deck: deckPath,
        columns: ["Front", "Back", "Tags"],
        tagsColumn: 3
      },
      sourceDrillPayload: sourcePayload,
      coverage: {
        sourceLabels: validation.sourceLabels,
        coveredLabels: validation.coveredLabels,
        missingLabels: validation.missingLabels,
        nativeFastRestore: nativeCoverage
      }
    };
    let copied = false;
    let clipboardText = "";
    try {
      await writeClipboard(tsv);
      copied = true;
    } catch (error) {
      clipboardText = ` Clipboard copy failed: ${error?.message || error}`;
    }
    let downloadText = "";
    let downloaded = false;
    try {
      await downloadTextAsFile(tsv, outputPaths.tsvPath, "text/tab-separated-values;charset=utf-8");
      await downloadTextAsFile(JSON.stringify(normalizedPlan, null, 2), outputPaths.planPath, "application/json;charset=utf-8");
      downloadText = ` Downloaded to Downloads\\${outputPaths.folder.replace(/\//g, "\\")}.`;
      downloaded = true;
    } catch (error) {
      downloadText = ` Download failed: ${error?.message || error}`;
    }
    const missingText = validation.missingLabels.length
      ? ` Missing from plan: ${validation.missingLabels.join(", ")}.`
      : "";
    const nativeText = nativeCoverage.cardsWithCompleteNativeRestore === nativeCoverage.cardCount
      ? ` Native fast restore: ${nativeCoverage.cardsWithCompleteNativeRestore}/${nativeCoverage.cardCount} cards.`
      : ` Native fast restore incomplete: ${nativeCoverage.cardsWithCompleteNativeRestore}/${nativeCoverage.cardCount} cards, ${nativeCoverage.labelsWithNativeIds}/${nativeCoverage.labelCount} labels mapped.`;
    return {
      ok: downloaded,
      copied,
      clipboardError: clipboardText,
      rowCount: validation.validCards.length,
      missingLabels: validation.missingLabels,
      outputPaths,
      message: `${copied ? "Copied" : "Generated"} ${validation.validCards.length} live-drill TSV row${validation.validCards.length === 1 ? "" : "s"}.${missingText}${nativeText}${downloadText}${clipboardText}`
    };
  }

  function getLiveDrillPlanNativeCoverage(sourcePayload, cards = []) {
    const coverage = {
      cardCount: 0,
      cardsWithCompleteNativeRestore: 0,
      labelCount: 0,
      labelsWithNativeIds: 0,
      missingLabels: []
    };
    (Array.isArray(cards) ? cards : []).forEach((card, index) => {
      const payload = buildLiveDrillSubPayload(sourcePayload, card, index);
      const labels = Array.isArray(payload.labels) ? payload.labels : [];
      coverage.cardCount += 1;
      coverage.labelCount += labels.length;
      coverage.labelsWithNativeIds += labels.filter((label) => uniqueNativeIds(label.nativeIds || label.nativeId || []).length).length;
      if (payload.nativeRestore?.complete) coverage.cardsWithCompleteNativeRestore += 1;
      labels
        .filter((label) => !uniqueNativeIds(label.nativeIds || label.nativeId || []).length)
        .forEach((label) => coverage.missingLabels.push({
          cardId: cleanText(card?.id || ""),
          sourceDrillId: cleanText(card?.sourceDrillId || ""),
          label: cleanText(label.preferredLabel || "")
        }));
    });
    return coverage;
  }

  function parseLiveDrillCardPlan(text) {
    const candidates = getJsonCandidatesFromText(text);
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        const plan = normalizeLiveDrillCardPlan(parsed);
        if (plan) return plan;
      } catch (_error) {}
    }
    throw new Error("No valid imaios-live-drill-card-plan JSON block was found.");
  }

  function getJsonCandidatesFromText(text) {
    const value = String(text || "").trim();
    const candidates = [];
    const fenced = Array.from(value.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((match) => match[1].trim());
    candidates.push(...fenced);
    if (value.startsWith("{") && value.endsWith("}")) candidates.push(value);
    const kindIndex = value.lastIndexOf('"kind"');
    if (kindIndex >= 0) {
      const start = value.lastIndexOf("{", kindIndex);
      const end = value.lastIndexOf("}");
      if (start >= 0 && end > start) candidates.push(value.slice(start, end + 1));
    }
    return unique(candidates.filter(Boolean));
  }

  function normalizeLiveDrillCardPlan(value) {
    if (!value || typeof value !== "object") return null;
    if (value.kind !== "imaios-live-drill-card-plan") return null;
    const rawCards = Array.isArray(value.cards)
      ? value.cards
      : Array.isArray(value.cardPlan)
        ? value.cardPlan
        : [];
    const cards = rawCards.map((card, index) => normalizeLiveDrillCardPlanCard(card, index)).filter(Boolean);
    return {
      kind: "imaios-live-drill-card-plan",
      version: Number(value.version) || 1,
      sourceDrillId: cleanText(value.sourceDrillId || value.drillId || ""),
      title: cleanText(value.title || value.cardSetTitle || "IMAIOS live drill cards"),
      breadcrumb: normalizeBreadcrumbList(value.breadcrumb || value.breadcrumbs || value.breadcrumbTrail || value.deckBreadcrumb || value.ankiBreadcrumb || value.anki?.breadcrumb || value.anki?.breadcrumbTrail),
      deckPath: applyDeckRootOverride(value.deckPath || value.suggestedDeckPath || value.ankiDeckPath || value.anki?.deckPath || value.anki?.deck || ""),
      tags: normalizeStringList(value.tags || value.suggestedTags || value.ankiTags || value.anki?.tags),
      cards,
      sourceDrillPayload: isLiveDrillCardSourcePayload(value.sourceDrillPayload) ? value.sourceDrillPayload : null
    };
  }

  function normalizeLiveDrillCardPlanCard(card, index) {
    if (!card || typeof card !== "object") return null;
    const labels = normalizeCardPlanLabels(card.labels || card.lockedLabels || card.drillLabels || card.answerLabels);
    if (!labels.length) return null;
    const title = cleanText(card.title || card.name || labels.slice(0, 3).join(", "));
    return {
      id: cleanText(card.id || createSlug(title) || `card-${index + 1}`),
      sourceDrillId: cleanText(card.sourceDrillId || card.sourceItemId || card.drillId || ""),
      title,
      frontPrompt: cleanText(card.frontPrompt || card.front || "Open the live drill and name the locked structures."),
      labels,
      recognitionCues: normalizeCueList(card.recognitionCues || card.cues || card.answerCues),
      contrastCues: normalizeCueList(card.contrastCues || card.differentiationCues || card.traps),
      rationale: cleanText(card.rationale || card.groupingRationale || card.note || ""),
      tags: normalizeStringList(card.tags)
    };
  }

  function normalizeCardPlanLabels(value) {
    if (Array.isArray(value)) {
      return unique(value.map((item) => {
        if (typeof item === "string") return cleanText(item);
        if (item && typeof item === "object") return cleanText(item.preferredLabel || item.label || item.name || "");
        return "";
      }).filter(Boolean));
    }
    if (typeof value === "string") {
      return unique(value.split(/\r?\n|[|;]/).map(cleanText).filter(Boolean));
    }
    return [];
  }

  function normalizeCueList(value) {
    if (Array.isArray(value)) {
      return value.map((item) => {
        if (typeof item === "string") return cleanText(item);
        if (item && typeof item === "object") {
          const label = cleanText(item.label || item.structure || "");
          const cue = cleanText(item.cue || item.text || item.note || item.description || "");
          return label && cue ? `${label}: ${cue}` : cue || label;
        }
        return "";
      }).filter(Boolean);
    }
    return normalizeStringList(value);
  }

  async function getSourcePayloadForCardPlan(plan) {
    if (isLiveDrillCardSourcePayload(plan?.sourceDrillPayload)) return plan.sourceDrillPayload;
    const saved = normalizeSavedLiveDrillSource(state.lastLiveDrillCardSource || readLastLiveDrillCardSource());
    const savedSourceId = cleanText(saved?.payload?.id || saved?.payload?.sourceDrillId || "");
    if (saved?.payload && (!plan.sourceDrillId || !savedSourceId || plan.sourceDrillId === savedSourceId)) return saved.payload;
    if (saved?.payload && labelsCoverPlan(saved.payload, plan)) return saved.payload;
    const current = await buildLiveDrillPayloadFromCurrent({ requireLocked: false });
    if (current.ok && current.payload?.labels?.length && labelsCoverPlan(current.payload, plan)) return current.payload;
    return saved?.payload || null;
  }

  function validateLiveDrillCardPlan(plan, sourcePayload) {
    if (isLiveDrillBatchSource(sourcePayload)) return validateLiveDrillBatchCardPlan(plan, sourcePayload);

    const sourceLabels = unique((sourcePayload.labels || []).map((entry) => cleanText(entry.preferredLabel || entry.label || "")).filter(Boolean));
    const sourceKeys = new Map(sourceLabels.map((label) => [normalizeText(label), label]));
    const unknownLabels = [];
    const validCards = [];
    const coveredKeys = new Set();

    for (const card of plan.cards || []) {
      const labels = [];
      for (const label of card.labels || []) {
        const key = normalizeText(label);
        if (!sourceKeys.has(key)) {
          unknownLabels.push(label);
          continue;
        }
        labels.push(sourceKeys.get(key));
        coveredKeys.add(key);
      }
      if (labels.length) validCards.push({ ...card, labels: unique(labels) });
    }

    const coveredLabels = sourceLabels.filter((label) => coveredKeys.has(normalizeText(label)));
    const missingLabels = sourceLabels.filter((label) => !coveredKeys.has(normalizeText(label)));
    return {
      sourceLabels,
      coveredLabels,
      missingLabels,
      unknownLabels: unique(unknownLabels),
      validCards
    };
  }

  function validateLiveDrillBatchCardPlan(plan, sourcePayload) {
    const items = getLiveDrillBatchSourceItems(sourcePayload);
    const allSourceLabels = items.flatMap((item) => getLiveDrillSourceLabels(item.payload).map((label) => ({
      item,
      label,
      key: normalizeText(label)
    })));
    const unknownLabels = [];
    const validCards = [];
    const covered = new Set();

    for (const card of plan.cards || []) {
      const item = resolveLiveDrillBatchItemForCard(sourcePayload, card);
      if (!item) {
        unknownLabels.push(...(card.labels || []));
        continue;
      }
      const sourceKeys = new Map(getLiveDrillSourceLabels(item.payload).map((label) => [normalizeText(label), label]));
      const labels = [];
      for (const label of card.labels || []) {
        const key = normalizeText(label);
        if (!sourceKeys.has(key)) {
          unknownLabels.push(`${item.title || item.sourceDrillId}: ${label}`);
          continue;
        }
        labels.push(sourceKeys.get(key));
        covered.add(`${item.sourceDrillId}|${key}`);
      }
      if (labels.length) validCards.push({ ...card, sourceDrillId: item.sourceDrillId, labels: unique(labels) });
    }

    const sourceLabels = allSourceLabels.map((entry) => `${entry.item.title || entry.item.sourceDrillId}: ${entry.label}`);
    const coveredLabels = allSourceLabels
      .filter((entry) => covered.has(`${entry.item.sourceDrillId}|${entry.key}`))
      .map((entry) => `${entry.item.title || entry.item.sourceDrillId}: ${entry.label}`);
    const missingLabels = allSourceLabels
      .filter((entry) => !covered.has(`${entry.item.sourceDrillId}|${entry.key}`))
      .map((entry) => `${entry.item.title || entry.item.sourceDrillId}: ${entry.label}`);
    return {
      sourceLabels,
      coveredLabels,
      missingLabels,
      unknownLabels: unique(unknownLabels),
      validCards
    };
  }

  function labelsCoverPlan(sourcePayload, plan) {
    if (isLiveDrillBatchSource(sourcePayload)) {
      return (plan?.cards || []).every((card) => Boolean(resolveLiveDrillBatchItemForCard(sourcePayload, card)));
    }
    const sourceKeys = new Set((sourcePayload?.labels || []).map((entry) => normalizeText(entry.preferredLabel || entry.label || "")));
    const planLabels = (plan?.cards || []).flatMap((card) => card.labels || []);
    return planLabels.length > 0 && planLabels.every((label) => sourceKeys.has(normalizeText(label)));
  }

  function isLiveDrillCardSourcePayload(value) {
    return Boolean(value && typeof value === "object" && (
      value.kind === "imaios-live-drill" ||
      value.kind === "imaios-live-drill-batch-source"
    ));
  }

  function isLiveDrillBatchSource(value) {
    return Boolean(value && typeof value === "object" && value.kind === "imaios-live-drill-batch-source" && Array.isArray(value.batchItems));
  }

  function getLiveDrillSourceLabels(payload) {
    return unique((payload?.labels || []).map((entry) => cleanText(entry.preferredLabel || entry.label || "")).filter(Boolean));
  }

  function getLiveDrillBatchSourceItems(sourcePayload) {
    return (Array.isArray(sourcePayload?.batchItems) ? sourcePayload.batchItems : [])
      .map((item) => {
        const payload = item?.payload?.kind === "imaios-live-drill"
          ? item.payload
          : {
              kind: "imaios-live-drill",
              version: 1,
              id: item?.sourceDrillId || item?.id || "",
              title: item?.title || "",
              module: item?.module || {},
              viewer: item?.viewer || {},
              chunk: item?.chunk || {},
              labels: Array.isArray(item?.labels) ? item.labels : [],
              lockedLabels: (Array.isArray(item?.labels) ? item.labels : []).map((entry) => entry.preferredLabel || entry.label || "").filter(Boolean),
              sourceContext: sourcePayload.sourceContext || {
                topic: sourcePayload.topic || sourcePayload.title || "",
                source: sourcePayload.source || "",
                breadcrumb: sourcePayload.breadcrumb || [],
                deckPath: sourcePayload.suggestedDeckPath || "",
                tags: sourcePayload.suggestedTags || []
              }
            };
        return {
          ...item,
          sourceDrillId: cleanText(item?.sourceDrillId || payload.id || item?.id || ""),
          title: cleanText(item?.title || payload.title || payload.chunk?.title || payload.module?.name || ""),
          payload
        };
      })
      .filter((item) => item.sourceDrillId && item.payload?.labels?.length);
  }

  function resolveLiveDrillSourcePayloadForCard(sourcePayload, card) {
    if (!isLiveDrillBatchSource(sourcePayload)) return sourcePayload;
    const item = resolveLiveDrillBatchItemForCard(sourcePayload, card);
    return item?.payload || null;
  }

  function resolveLiveDrillBatchItemForCard(sourcePayload, card) {
    const items = getLiveDrillBatchSourceItems(sourcePayload);
    const requestedId = cleanText(card?.sourceDrillId || "");
    if (requestedId) {
      const exact = items.find((item) => item.sourceDrillId === requestedId || item.id === requestedId);
      if (exact) return exact;
      return null;
    }
    const cardLabels = normalizeCardPlanLabels(card?.labels || []);
    if (!cardLabels.length) return null;
    return items.find((item) => {
      const keys = new Set(getLiveDrillSourceLabels(item.payload).map(normalizeText));
      return cardLabels.every((label) => keys.has(normalizeText(label)));
    }) || null;
  }

  function getLiveDrillImportDeckPath(plan, sourcePayload) {
    const context = buildLiveDrillCardContext(sourcePayload);
    const explicit = applyDeckRootOverride(plan?.deckPath || context.suggestedDeckPath || "");
    if (explicit) return explicit;
    const breadcrumb = normalizeBreadcrumbList(plan?.breadcrumb || context.breadcrumb || []);
    return buildDeckPathFromBreadcrumb(breadcrumb);
  }

  function buildLiveDrillCardsTsv(plan, sourcePayload, cards, options = {}) {
    const deckPath = applyDeckRootOverride(options.deckPath || getLiveDrillImportDeckPath(plan, sourcePayload));
    const importHeaders = [
      "#separator:tab",
      "#html:true",
      `#notetype:${LIVE_DRILL_ANKI_NOTE_TYPE}`,
      `#deck:${deckPath}`,
      "#columns:Front\tBack\tTags",
      "#tags column:3"
    ];
    const rows = cards.map((card, index) => {
      const cardSourcePayload = resolveLiveDrillSourcePayloadForCard(sourcePayload, card) || sourcePayload;
      const cardPayload = buildLiveDrillSubPayload(sourcePayload, card, index);
      const link = buildLiveDrillUrl(cardPayload);
      const front = buildLiveDrillCardFront(card, link);
      const back = buildLiveDrillBasicBack(card, cardSourcePayload, plan, deckPath);
      const tags = buildLiveDrillCardTags(card, cardSourcePayload, plan);
      return [front, back, tags];
    });
    return [...importHeaders, ...rows.map((row) => row.map(tsvCell).join("\t"))].join("\n");
  }

  function buildLiveDrillSubPayload(sourcePayload, card, index) {
    const basePayload = resolveLiveDrillSourcePayloadForCard(sourcePayload, card) || sourcePayload;
    const sourceByKey = new Map((basePayload.labels || []).map((entry) => [normalizeText(entry.preferredLabel || entry.label || ""), entry]));
    const labels = card.labels.map((label) => {
      const entry = sourceByKey.get(normalizeText(label)) || {};
      const moduleKey = entry.moduleKey || basePayload.module?.key || "";
      const nativeMatch = getNativeIdsForLabel(label, moduleKey);
      const nativeIds = uniqueNativeIds([
        ...(Array.isArray(entry.nativeIds) ? entry.nativeIds : []),
        entry.nativeId,
        ...(nativeMatch.ids || [])
      ]);
      return {
        preferredLabel: cleanText(entry.preferredLabel || label),
        normalizedLabel: normalizeText(entry.preferredLabel || label),
        moduleKey,
        aliases: Array.isArray(entry.aliases) ? entry.aliases : [],
        repositoryStatus: entry.repositoryStatus || "",
        href: entry.href || "",
        source: entry.source || "card-plan",
        nativeId: nativeIds[0] || null,
        nativeIds,
        nativeModuleSlug: cleanText(entry.nativeModuleSlug || nativeMatch.moduleSlug || "")
      };
    });
    const title = cleanText(card.title || labels.map((entry) => entry.preferredLabel).join(", "));
    const nativeRestore = buildLiveDrillNativeRestorePlan(labels, basePayload.module || {});
    return {
      ...basePayload,
      id: createSlug(`${basePayload.id || "imaios-live-drill"}-${card.id || index + 1}`) || `${basePayload.id || "imaios-live-drill"}-${index + 1}`,
      title,
      createdAt: new Date().toISOString(),
      labels,
      lockedLabels: labels.map((entry) => entry.preferredLabel),
      nativeRestore,
      studyShield: {
        enabled: true,
        source: "anki-card",
        mode: "cover-until-ready"
      }
    };
  }

  function buildLiveDrillCardFront(card, link) {
    return [
      `<a href="${escapeHtml(link)}">Open IMAIOS live drill</a>`,
      `<br>`,
      escapeHtml(card.frontPrompt || "Name the locked structures before revealing the answer."),
      `<br><span class="imaios-card-count">${card.labels.length} structure${card.labels.length === 1 ? "" : "s"}</span>`
    ].join("");
  }

  function buildLiveDrillCardBack(card) {
    const labels = card.labels.map((label) => `<li><strong>${escapeHtml(label)}</strong></li>`).join("");
    const cues = (card.recognitionCues || []).map((cue) => `<li>${escapeHtml(cue)}</li>`).join("");
    const contrast = (card.contrastCues || []).map((cue) => `<li>${escapeHtml(cue)}</li>`).join("");
    return [
      `<div class="imaios-live-answer"><strong>Answer</strong><ol>${labels}</ol>`,
      cues ? `<strong>Recognition cues</strong><ul>${cues}</ul>` : "",
      contrast ? `<strong>Do not confuse with</strong><ul>${contrast}</ul>` : "",
      `</div>`
    ].join("");
  }

  function buildLiveDrillBasicBack(card, sourcePayload, plan, deckPath = "") {
    const answer = buildLiveDrillCardBack(card);
    const extra = buildLiveDrillCardExtra(card, sourcePayload, plan, deckPath);
    return extra ? `${answer}<hr>${extra}` : answer;
  }

  function buildLiveDrillCardExtra(card, sourcePayload, plan, deckPath = "") {
    const viewer = sourcePayload.viewer || {};
    const range = viewer.range || {};
    const module = sourcePayload.module || {};
    const chunk = sourcePayload.chunk || {};
    const effectiveDeckPath = applyDeckRootOverride(deckPath || plan.deckPath || "");
    return [
      `Module: ${escapeHtml(module.name || module.key || "")}`,
      `Chunk: ${escapeHtml(chunk.title || sourcePayload.title || "")}`,
      `Plane: ${escapeHtml(viewer.plane || "")}`,
      viewer.selectedSeries ? `Series: ${escapeHtml(viewer.selectedSeries)}` : "",
      `Slice: ${escapeHtml(String(viewer.slice?.value ?? ""))}`,
      `Range: ${escapeHtml(`${range.startSlice ?? ""}-${range.endSlice ?? ""}`)}`,
      effectiveDeckPath ? `Deck path: ${escapeHtml(effectiveDeckPath)}` : "",
      card.rationale ? `Grouping: ${escapeHtml(card.rationale)}` : ""
    ].filter(Boolean).join("<br>");
  }

  function buildLiveDrillCardTags(card, sourcePayload, plan) {
    const context = buildLiveDrillCardContext(sourcePayload);
    return unique([
      ...(Array.isArray(plan.tags) ? plan.tags : []),
      ...context.suggestedTags,
      ...(Array.isArray(card.tags) ? card.tags : []),
      card.title && `card::${card.title}`
    ].filter(Boolean).map(toAnkiTag)).join(" ");
  }

  function buildLiveDrillCardOutputPaths(sourcePayload, plan) {
    const context = buildLiveDrillCardContext(sourcePayload);
    const articleSlug = createSlug(context.articleTitle || sourcePayload.topic || sourcePayload.module?.name || "imaios-live-drills") || "imaios-live-drills";
    const chunkSlug = createSlug(context.chunkTitle || sourcePayload.title || sourcePayload.topic || "drill") || "drill";
    const base = createSlug(plan.title || sourcePayload.title || sourcePayload.topic || "live-drill-cards") || `live-drill-cards-${Date.now()}`;
    const folder = `IMAIOS/LiveDrills/${articleSlug}/${chunkSlug}`;
    return {
      folder,
      tsvPath: `${folder}/${base}_anki.tsv`,
      planPath: `${folder}/${base}_card_plan.json`
    };
  }

  function saveLastLiveDrillCardSource(payload) {
    const source = normalizeSavedLiveDrillSource({
      kind: "imaios-live-drill-card-source",
      version: 1,
      savedAt: new Date().toISOString(),
      payload
    });
    state.lastLiveDrillCardSource = source;
    try {
      localStorage.setItem(LAST_LIVE_DRILL_CARD_SOURCE_KEY, JSON.stringify(source));
    } catch (error) {
      console.warn("IMAIOS Cine Tools: could not save live-drill card source", error);
    }
  }

  function readLastLiveDrillCardSource() {
    try {
      return JSON.parse(localStorage.getItem(LAST_LIVE_DRILL_CARD_SOURCE_KEY) || "null");
    } catch (_error) {
      return null;
    }
  }

  function normalizeSavedLiveDrillSource(value) {
    if (!value || typeof value !== "object") return null;
    const payload = isLiveDrillCardSourcePayload(value.payload) ? value.payload : isLiveDrillCardSourcePayload(value) ? value : null;
    if (!payload || (!Array.isArray(payload.labels) && !Array.isArray(payload.batchItems))) return null;
    return {
      kind: "imaios-live-drill-card-source",
      version: Number(value.version) || 1,
      savedAt: cleanText(value.savedAt || new Date().toISOString()),
      payload
    };
  }

  function normalizeLiveDrillCardBatch(value) {
    if (!value || typeof value !== "object") return { ...EMPTY_LIVE_DRILL_CARD_BATCH, items: [] };
    const items = (Array.isArray(value.items) ? value.items : [])
      .map((item) => normalizeLiveDrillCardBatchItem(item))
      .filter(Boolean);
    return {
      kind: "imaios-live-drill-card-batch",
      version: Number(value.version) || 1,
      topic: cleanText(value.topic || state.chunkLibrary?.topic || state.chunkLibrary?.articleTitle || ""),
      source: cleanText(value.source || state.chunkLibrary?.source || ""),
      createdAt: cleanText(value.createdAt || ""),
      updatedAt: cleanText(value.updatedAt || ""),
      backupSource: cleanText(value.backupSource || ""),
      backupCreatedAt: cleanText(value.backupCreatedAt || ""),
      items
    };
  }

  function normalizeLiveDrillCardBatchItem(item) {
    if (!item || typeof item !== "object") return null;
    const payload = item.payload?.kind === "imaios-live-drill" ? item.payload : null;
    const source = item.source && typeof item.source === "object" ? item.source : (payload ? buildLiveDrillCardPromptSource(payload, null) : null);
    const sourceDrillId = cleanText(item.sourceDrillId || source?.sourceDrillId || payload?.id || item.id || "");
    const labels = Array.isArray(item.labels) ? item.labels : Array.isArray(source?.labels) ? source.labels : [];
    if (!sourceDrillId || !labels.length) return null;
    const title = cleanText(item.title || source?.chunk?.title || payload?.chunk?.title || payload?.title || source?.module?.name || "IMAIOS drill");
    return {
      id: cleanText(item.id || sourceDrillId),
      kind: "imaios-live-drill-card-batch-item",
      version: Number(item.version) || 1,
      title,
      addedAt: cleanText(item.addedAt || item.createdAt || ""),
      updatedAt: cleanText(item.updatedAt || ""),
      sourceDrillId,
      moduleKey: cleanText(item.moduleKey || source?.module?.key || payload?.module?.key || ""),
      moduleName: cleanText(item.moduleName || source?.module?.name || payload?.module?.name || ""),
      chunkId: cleanText(item.chunkId || source?.chunk?.id || payload?.chunk?.id || ""),
      chunkTitle: cleanText(item.chunkTitle || source?.chunk?.title || payload?.chunk?.title || ""),
      plane: cleanText(item.plane || source?.viewer?.plane || payload?.viewer?.plane || ""),
      series: cleanText(item.series || source?.viewer?.selectedSeries || payload?.viewer?.selectedSeries || ""),
      labelCount: Number(item.labelCount || labels.length || 0),
      capturedDetailCount: Number(item.capturedDetailCount || source?.labelDetailEnrichment?.capturedDetails || 0),
      labels,
      source,
      payload,
      enrichmentSummary: item.enrichmentSummary || source?.labelDetailEnrichment || null
    };
  }

  function toAnkiTag(value) {
    const text = cleanText(value);
    if (!text) return "";
    return text
      .split("::")
      .map((part) => createSlug(part).replace(/-/g, "_"))
      .filter(Boolean)
      .join("::");
  }

  async function copyLiveDrillJson() {
    const drill = await buildLiveDrillPayloadFromCurrent({ requireLocked: true });
    if (!drill.ok) {
      setStatus(drill.reason, 7000);
      return;
    }
    saveLastLiveDrillCardSource(drill.payload);
    await writeClipboard(JSON.stringify(drill.payload, null, 2));
    setStatus(`Live drill JSON copied with ${drill.payload.labels.length} locked labels.`);
  }

  async function copyLiveDrillLink() {
    const drill = await buildLiveDrillPayloadFromCurrent({ requireLocked: true });
    if (!drill.ok) {
      setStatus(drill.reason, 7000);
      return;
    }
    saveLastLiveDrillCardSource(drill.payload);
    const link = buildLiveDrillUrl(drill.payload);
    await writeClipboard(link);
    setStatus(`Live drill link copied with ${drill.payload.labels.length} labels.`);
  }

  async function testLiveDrillRestore() {
    const drill = await buildLiveDrillPayloadFromCurrent({ requireLocked: true });
    if (!drill.ok) {
      setStatus(drill.reason, 7000);
      return;
    }
    await restoreLiveDrillPayload(drill.payload, { source: "test" });
  }

  async function buildLiveDrillPayloadFromCurrent(options = {}) {
    const lockedLabels = await collectLockedStructureNames();
    return buildLiveDrillPayload({ ...options, lockedLabels });
  }

  function buildLiveDrillPayload(options = {}) {
    const lockedLabels = Array.isArray(options.lockedLabels) ? options.lockedLabels : getLockedStructureNames();
    if (options.requireLocked && !lockedLabels.length) {
      return { ok: false, reason: "Lock at least one structure first, then copy a live drill." };
    }
    const chunk = getActiveChunk();
    const slice = getSliceInfo();
    const series = getSeriesInfo();
    const range = getSuggestedCineRange();
    const module = getCurrentModuleInfo();
    const labels = buildLiveDrillLabelEntries(lockedLabels);
    const nativeRestore = buildLiveDrillNativeRestorePlan(labels, module);
    const title = chunk?.title || labels.slice(0, 4).map((item) => item.preferredLabel).join(", ") || "IMAIOS live drill";
    const viewerPlane = normalizePlaneName(series.selectedPlane) || inferSelectedPlaneFromDom() || "";
    const viewerSeries = series.selectedSeries || "";
    const idScope = viewerSeries || viewerPlane || "current";
    const payload = {
      kind: "imaios-live-drill",
      version: 1,
      id: createSlug(`${module.key}-${title}-${idScope}`) || `imaios-drill-${Date.now()}`,
      title,
      createdAt: new Date().toISOString(),
      module,
      viewer: {
        plane: viewerPlane,
        selectedSeries: viewerSeries,
        slice: {
          value: slice.value,
          min: slice.min,
          max: slice.max,
          counterText: slice.counterText || ""
        },
        range: {
          startSlice: range.startSlice,
          endSlice: range.endSlice,
          frameCount: range.frameCount,
          basis: range.basis || ""
        }
      },
      chunk: chunk ? {
        id: chunk.id,
        title: chunk.title,
        parentGroup: chunk.parentGroup || "",
        source: chunk.source || "",
        modality: chunk.modality || "",
        moduleKey: getChunkModuleKey(chunk),
        moduleName: getChunkModuleDisplayName(chunk),
        modalityUrl: chunk.modalityUrl || chunk.moduleUrl || chunk.url || "",
        breadcrumb: Array.isArray(chunk.breadcrumb) ? chunk.breadcrumb : [],
        deckPath: applyDeckRootOverride(chunk.deckPath || ""),
        tags: Array.isArray(chunk.tags) ? chunk.tags : [],
        routing: chunk.routing || null,
        learningFrame: Array.isArray(chunk.learningFrame) ? chunk.learningFrame : []
      } : null,
      sourceContext: {
        articleTitle: state.chunkLibrary.articleTitle || "",
        topic: state.chunkLibrary.topic || "",
        source: state.chunkLibrary.source || "",
        breadcrumb: Array.isArray(state.chunkLibrary.breadcrumb) ? state.chunkLibrary.breadcrumb : [],
        deckPath: applyDeckRootOverride(state.chunkLibrary.deckPath || ""),
        tags: Array.isArray(state.chunkLibrary.tags) ? state.chunkLibrary.tags : []
      },
      labels,
      lockedLabels: labels.map((item) => item.preferredLabel),
      nativeRestore,
      restorePlan: {
        clearLockedFirst: true,
        setPinsMode: true,
        switchPlane: Boolean(viewerPlane),
        setSlice: Number.isFinite(slice.value)
      }
    };
    return { ok: true, payload };
  }

  async function collectLockedStructureNames() {
    let names = findLockedStructuresPanel() ? getLockedStructureNames() : [];
    if (names.length) return names;
    const lockedButton = findLockedStructuresButton();
    const expectedCount = lockedButton ? getLockedStructureCountFromButton(lockedButton) : 0;
    if (!lockedButton || !expectedCount) return names;

    await realMouseClick(lockedButton, 0.5, 0.5);
    names = await waitFor(() => {
      const currentNames = getLockedStructureNames();
      return currentNames.length ? currentNames : null;
    }, 1800, 100);
    return names || [];
  }

  function buildLiveDrillLabelEntries(lockedLabels) {
    const availableEntries = getAvailableStructureEntries();
    const entriesByLabel = new Map();
    for (const entry of availableEntries) {
      const key = normalizeText(entry.label);
      if (key && !entriesByLabel.has(key)) entriesByLabel.set(key, entry);
    }
    return unique(lockedLabels).map((label) => {
      const repositoryEntry = findRepositoryLabelForTarget({ preferredLabel: label, aliases: [] });
      const availableEntry = entriesByLabel.get(normalizeText(label)) || null;
      const nativeMatch = getNativeIdsForLabel(label, getCurrentModuleKey());
      const nativeIds = uniqueNativeIds(nativeMatch.ids || []);
      return {
        preferredLabel: label,
        normalizedLabel: normalizeText(label),
        moduleKey: getCurrentModuleKey(),
        aliases: Array.isArray(repositoryEntry?.aliases) ? repositoryEntry.aliases : [],
        repositoryStatus: repositoryEntry?.status || "",
        href: availableEntry?.href || repositoryEntry?.href || "",
        source: availableEntry?.source || "locked-structure",
        nativeId: nativeIds[0] || null,
        nativeIds,
        nativeModuleSlug: nativeMatch.moduleSlug || ""
      };
    });
  }

  function buildLiveDrillUrl(payload) {
    const url = new URL(payload?.module?.url || location.href);
    url.hash = `imaiosDrill=${base64UrlEncode(JSON.stringify(payload))}`;
    return url.toString();
  }

  function shouldShowLiveDrillStudyShield(payload, options = {}) {
    if (!LIVE_DRILL_STUDY_SHIELD_ENABLED) return false;
    if (options.source === "test") return false;
    const shield = payload?.studyShield || payload?.restorePlan?.studyShield || null;
    return Boolean(shield && shield.enabled !== false && shield.source === "anki-card");
  }

  function showLiveDrillStudyShield(payload, status = "loading") {
    const labels = getLiveDrillRestoreLabels(payload);
    let host = document.getElementById("imaios-live-drill-study-shield");
    if (!host) {
      host = document.createElement("div");
      host.id = "imaios-live-drill-study-shield";
      host.setAttribute("role", "dialog");
      host.setAttribute("aria-live", "polite");
      host.innerHTML = `
        <div class="imaios-study-shield-card">
          <div class="imaios-study-shield-kicker">IMAIOS live drill</div>
          <div class="imaios-study-shield-title"></div>
          <div class="imaios-study-shield-message"></div>
          <button class="imaios-study-shield-reveal" type="button">Reveal drill</button>
        </div>
      `;
      const style = document.createElement("style");
      style.textContent = `
        #imaios-live-drill-study-shield {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px;
          box-sizing: border-box;
          background: rgba(13, 17, 22, 0.78);
          backdrop-filter: blur(22px) saturate(0.82);
          -webkit-backdrop-filter: blur(22px) saturate(0.82);
          color: #f5f7fa;
          font: 16px/1.35 Inter, "Segoe UI", Arial, sans-serif;
        }
        #imaios-live-drill-study-shield .imaios-study-shield-card {
          width: min(560px, calc(100vw - 44px));
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 10px;
          background: rgba(25, 31, 39, 0.92);
          box-shadow: 0 28px 90px rgba(0,0,0,0.52);
          padding: 24px 26px;
          text-align: center;
        }
        #imaios-live-drill-study-shield .imaios-study-shield-kicker {
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #8dc7ff;
        }
        #imaios-live-drill-study-shield .imaios-study-shield-title {
          font-size: 23px;
          font-weight: 750;
          letter-spacing: 0;
          color: #ffffff;
        }
        #imaios-live-drill-study-shield .imaios-study-shield-message {
          margin-top: 10px;
          font-size: 15px;
          color: rgba(245,247,250,0.78);
        }
        #imaios-live-drill-study-shield .imaios-study-shield-reveal {
          display: none;
          margin: 18px auto 0;
          min-height: 38px;
          padding: 0 18px;
          border: 1px solid rgba(107, 178, 255, 0.76);
          border-radius: 8px;
          background: rgba(24, 132, 232, 0.94);
          color: #fff;
          font: 700 14px/1 Inter, "Segoe UI", Arial, sans-serif;
          cursor: pointer;
        }
        #imaios-live-drill-study-shield.ready .imaios-study-shield-reveal,
        #imaios-live-drill-study-shield.error .imaios-study-shield-reveal {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `;
      host.appendChild(style);
      const reveal = host.querySelector(".imaios-study-shield-reveal");
      reveal.addEventListener("click", hideLiveDrillStudyShield);
      host.addEventListener("click", (event) => {
        if (event.target === host && (host.classList.contains("ready") || host.classList.contains("error"))) {
          hideLiveDrillStudyShield();
        }
      });
      document.documentElement.appendChild(host);
    }
    document.removeEventListener("keydown", onLiveDrillStudyShieldKeyDown, true);
    document.addEventListener("keydown", onLiveDrillStudyShieldKeyDown, true);

    state.studyShield = { payloadId: payload?.id || "", status };
    host.classList.toggle("ready", status === "ready");
    host.classList.toggle("error", status === "error");
    host.querySelector(".imaios-study-shield-title").textContent = status === "ready" ? "Drill ready" : "No spoilers";
    host.querySelector(".imaios-study-shield-message").textContent = status === "ready"
      ? `Ready. ${labels.length} structure${labels.length === 1 ? "" : "s"} loaded. Click reveal when you are ready to identify.`
      : status === "error"
        ? "The drill could not finish restoring. You can reveal the page to inspect what happened."
        : `Loading ${labels.length} structure${labels.length === 1 ? "" : "s"} without spoilers...`;
    host.querySelector(".imaios-study-shield-reveal").textContent = status === "error" ? "Reveal page" : "Reveal drill";
  }

  function setLiveDrillStudyShieldPointerPassthrough(enabled) {
    const host = document.getElementById("imaios-live-drill-study-shield");
    if (!host) return () => {};
    const previous = host.style.pointerEvents;
    if (enabled) host.style.pointerEvents = "none";
    return () => {
      host.style.pointerEvents = previous;
    };
  }

  function hideLiveDrillStudyShield() {
    const host = document.getElementById("imaios-live-drill-study-shield");
    if (host) host.remove();
    document.removeEventListener("keydown", onLiveDrillStudyShieldKeyDown, true);
    state.studyShield = null;
  }

  function onLiveDrillStudyShieldKeyDown(event) {
    const host = document.getElementById("imaios-live-drill-study-shield");
    if (!host) {
      document.removeEventListener("keydown", onLiveDrillStudyShieldKeyDown, true);
      return;
    }
    const ready = host.classList.contains("ready") || host.classList.contains("error");
    const revealKey = event.key === "Enter" || event.key === "Escape" || event.key === " " || event.code === "Space";
    event.preventDefault();
    event.stopPropagation();
    if (ready && revealKey) hideLiveDrillStudyShield();
  }

  function markLiveDrillStudyShieldReady(payload) {
    if (!document.getElementById("imaios-live-drill-study-shield")) return;
    showLiveDrillStudyShield(payload, "ready");
  }

  function markLiveDrillStudyShieldError(payload) {
    if (!document.getElementById("imaios-live-drill-study-shield")) return;
    showLiveDrillStudyShield(payload, "error");
  }

  async function clearLiveDrillTransientViewerState() {
    try {
      const input = findModuleSearchInput();
      if (input) {
        await clearSearchInput(input);
        input.blur();
      }
    } catch (error) {
      console.warn("IMAIOS Cine Tools: could not clear live-drill search state", error);
    }
    try {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur?.();
      }
    } catch {}
    clearLiveDrillHoverLabels();
    await delay(80);
    clearLiveDrillHoverLabels();
  }

  function clearLiveDrillHoverLabels() {
    const elements = Array.from(document.querySelectorAll(
      ".structure-title-component,[class*='structure-title'],[class*='label-title'],[class*='label-name'],[class*='tooltip']"
    ))
      .filter((element) => element !== state.host && isVisible(element))
      .slice(0, 120);
    for (const element of elements) {
      dispatchPointerExit(element);
    }
    dispatchPointerMoveAway();
  }

  function dispatchPointerExit(element) {
    const rect = element.getBoundingClientRect();
    const clientX = clamp(rect.left - 16, 4, Math.max(4, window.innerWidth - 4));
    const clientY = clamp(rect.top - 16, 4, Math.max(4, window.innerHeight - 4));
    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX,
      clientY,
      relatedTarget: document.body
    };
    dispatchPointerEventSafely(element, "pointerout", eventInit);
    dispatchPointerEventSafely(element, "pointerleave", { ...eventInit, bubbles: false });
    element.dispatchEvent(new MouseEvent("mouseout", eventInit));
    element.dispatchEvent(new MouseEvent("mouseleave", { ...eventInit, bubbles: false }));
  }

  function dispatchPointerMoveAway() {
    const target = document.elementFromPoint(4, 4) || document.body;
    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: 4,
      clientY: 4
    };
    dispatchPointerEventSafely(target, "pointermove", eventInit);
    target.dispatchEvent(new MouseEvent("mousemove", eventInit));
  }

  function dispatchPointerEventSafely(element, type, eventInit) {
    if (typeof PointerEvent === "undefined") return;
    try {
      element.dispatchEvent(new PointerEvent(type, eventInit));
    } catch {}
  }

  async function restoreLiveDrillFromUrl(options = {}) {
    const encoded = getLiveDrillHashPayload();
    if (!encoded) return { ok: false, reason: "No live drill hash." };
    if (state.lastRestoredDrillHash === encoded || state.liveDrillRestoreRunning) {
      return { ok: true, skipped: true };
    }
    const payload = parseLiveDrillPayload(encoded);
    state.lastRestoredDrillHash = encoded;
    return restoreLiveDrillPayload(payload, { source: options.reason || "url" });
  }

  function getLiveDrillNativeRestorePlan(payload) {
    const moduleKey = cleanText(payload?.module?.key || getCurrentModuleKey());
    const payloadPlan = payload?.nativeRestore && typeof payload.nativeRestore === "object" ? payload.nativeRestore : null;
    const labels = Array.isArray(payload?.labels) ? payload.labels : [];
    const moduleSlug = cleanText(
      payloadPlan?.moduleSlug
      || labels.find((entry) => cleanText(entry?.nativeModuleSlug))?.nativeModuleSlug
      || getSavedModuleNativeSlug(moduleKey)
      || ""
    );
    const idsFromPayload = uniqueNativeIds(payloadPlan?.ids || []);
    const labelPlans = labels.map((entry) => {
      const label = cleanText(entry?.preferredLabel || entry?.label || "");
      const nativeMatch = getNativeIdsForLabel(label, moduleKey);
      const ids = uniqueNativeIds([
        ...(Array.isArray(entry?.nativeIds) ? entry.nativeIds : []),
        entry?.nativeId,
        ...(nativeMatch.ids || [])
      ]);
      return { label, ids };
    });
    const ids = idsFromPayload.length ? idsFromPayload : uniqueNativeIds(labelPlans.flatMap((item) => item.ids));
    const mappedLabelCount = idsFromPayload.length && payloadPlan?.complete
      ? labels.length
      : labelPlans.filter((item) => item.ids.length).length;
    return {
      storageKey: "im_viewer_locked_structures",
      moduleSlug,
      ids,
      labelCount: labels.length,
      mappedLabelCount,
      complete: Boolean(moduleSlug && labels.length && mappedLabelCount === labels.length && ids.length),
      source: idsFromPayload.length ? "payload" : "module-label-repository"
    };
  }

  function readNativeLockedStructureStore() {
    const value = parseStorageValue(localStorage.getItem("im_viewer_locked_structures"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function writeNativeLockedStructureIds(moduleSlug, ids) {
    const slug = cleanText(moduleSlug);
    const nativeIds = uniqueNativeIds(ids);
    if (!slug || !nativeIds.length) return { ok: false, reason: "Missing native module slug or IDs." };
    const store = readNativeLockedStructureStore();
    store[slug] = nativeIds;
    localStorage.setItem("im_viewer_locked_structures", JSON.stringify(store));
    return { ok: true, moduleSlug: slug, ids: nativeIds };
  }

  function nativeStorageMatchesPlan(plan) {
    if (!plan?.complete) return false;
    const store = readNativeLockedStructureStore();
    const currentIds = uniqueNativeIds(store[plan.moduleSlug] || []);
    if (currentIds.length !== plan.ids.length) return false;
    const currentSet = new Set(currentIds.map(String));
    return plan.ids.every((id) => currentSet.has(String(id)));
  }

  async function applyLiveDrillNativeRestore(plan, labels) {
    if (!plan?.complete) {
      return { ok: false, reason: "Native restore plan is incomplete." };
    }
    const directResult = await runImaiosPageContextProbe("native-direct-isolate", {
      ids: plan.ids,
      moduleSlug: plan.moduleSlug,
      labels: Array.isArray(labels) ? labels : [],
      source: "codex-live-drill",
      waitMs: 220
    }, 4500);
    if (directResult?.ok) {
      const directAcknowledged = await waitFor(() => {
        const count = getLockedStructureCount();
        if (count >= labels.length) return true;
        return null;
      }, 1200, 80);
      if (directAcknowledged) {
        return createNativeRestoreSuccessResult(plan, labels, {
          nativePreloaded: false,
          nativeDirect: true,
          directResult
        });
      }
    }
    const writeResult = writeNativeLockedStructureIds(plan.moduleSlug, plan.ids);
    if (!writeResult.ok) return { ok: false, reason: writeResult.reason || "Native write failed." };
    const acknowledged = await waitFor(() => {
      const count = getLockedStructureCount();
      if (count >= labels.length) return true;
      return null;
    }, 900, 90);
    if (!acknowledged) {
      return {
        ok: false,
        reason: directResult?.reason
          ? `Direct native isolate failed (${directResult.reason}); IMAIOS also did not acknowledge the native IDs after startup.`
          : "IMAIOS did not acknowledge the native IDs after startup.",
        directResult
      };
    }
    return createNativeRestoreSuccessResult(plan, labels, { nativePreloaded: false });
  }

  function createNativeRestoreSuccessResult(plan, labels, options = {}) {
    return {
      ok: true,
      locked: labels,
      missing: [],
      attempted: [],
      nativeRestoreUsed: true,
      nativePreloaded: Boolean(options.nativePreloaded),
      nativeDirect: Boolean(options.nativeDirect),
      directNativeCalled: Number(options.directResult?.called?.length || 0),
      nativeModuleSlug: plan.moduleSlug,
      nativeIdCount: plan.ids.length
    };
  }

  function createLiveDrillRestoreDebug(payload, labels, options = {}) {
    const nativePlan = getLiveDrillNativeRestorePlan(payload);
    return {
      kind: "imaios-live-drill-restore-debug",
      version: 1,
      buildTag: DEBUG_BUILD_TAG,
      createdAt: new Date().toISOString(),
      pageTitle: document.title,
      url: location.href,
      source: cleanText(options.source || ""),
      payload: summarizeLiveDrillPayloadForDebug(payload),
      labels,
      nativePlan: summarizeNativeRestorePlan(nativePlan),
      preload: getLiveDrillPreloadDebug(),
      initialRuntime: getLiveDrillRuntimeDebugSnapshot(nativePlan),
      steps: [],
      finalRuntime: null,
      result: null,
      _startedAt: Date.now()
    };
  }

  function summarizeLiveDrillPayloadForDebug(payload = {}) {
    const labels = Array.isArray(payload.labels) ? payload.labels : [];
    return {
      id: cleanText(payload.id || ""),
      title: cleanText(payload.title || ""),
      module: {
        key: cleanText(payload.module?.key || ""),
        name: cleanText(payload.module?.name || ""),
        url: cleanText(payload.module?.url || ""),
        pathname: cleanText(payload.module?.pathname || "")
      },
      viewer: {
        plane: cleanText(payload.viewer?.plane || ""),
        selectedSeries: cleanText(payload.viewer?.selectedSeries || ""),
        slice: payload.viewer?.slice || null
      },
      labelCount: labels.length,
      labelsWithPayloadNativeIds: labels.filter((entry) => uniqueNativeIds(entry?.nativeIds || entry?.nativeId || []).length).length,
      hasNativeRestore: Boolean(payload.nativeRestore && typeof payload.nativeRestore === "object"),
      nativeRestore: payload.nativeRestore ? summarizeNativeRestorePlan(payload.nativeRestore) : null,
      studyShield: payload.studyShield || null
    };
  }

  function summarizeNativeRestorePlan(plan = {}) {
    const ids = uniqueNativeIds(plan.ids || []);
    return {
      complete: Boolean(plan.complete),
      source: cleanText(plan.source || ""),
      storageKey: cleanText(plan.storageKey || "im_viewer_locked_structures"),
      moduleSlug: cleanText(plan.moduleSlug || ""),
      idCount: ids.length,
      ids,
      labelCount: Number(plan.labelCount || 0),
      mappedLabelCount: Number(plan.mappedLabelCount || 0)
    };
  }

  function getLiveDrillPreloadDebug() {
    const marker = parseStorageValue(sessionStorage.getItem("imaios-cine-tools:native-preloaded"));
    const error = sessionStorage.getItem("imaios-cine-tools:native-preload-error") || "";
    return {
      marker,
      error: cleanText(error)
    };
  }

  function getLiveDrillRuntimeDebugSnapshot(nativePlan = null) {
    const plan = nativePlan && typeof nativePlan === "object" ? nativePlan : null;
    const store = readNativeLockedStructureStore();
    const moduleSlug = cleanText(plan?.moduleSlug || getCurrentNativeLockedStructureState().currentSlug || "");
    const storedIds = uniqueNativeIds(moduleSlug ? store[moduleSlug] || [] : []);
    const series = getSeriesInfo();
    return {
      at: new Date().toISOString(),
      currentModule: getCurrentModuleInfo(),
      series: {
        selectedPlane: cleanText(series.selectedPlane || series.plane || ""),
        selectedSeries: cleanText(series.selectedSeries || series.series || ""),
        selectedSeriesText: cleanText(series.selectedSeriesText || series.text || ""),
        candidateCount: Array.isArray(series.visibleTextCandidates) ? series.visibleTextCandidates.length : 0
      },
      slice: getSliceInfo(),
      lockedCount: getLockedStructureCount(),
      lockedLabels: getLockedStructureNames(),
      nativeStorage: {
        moduleSlug,
        storedIds,
        storedIdCount: storedIds.length,
        matchesPlan: plan?.complete ? nativeStorageMatchesPlan(plan) : false,
        allModuleSlugs: Object.keys(store || {})
      },
      searchInputPresent: Boolean(findModuleSearchInput()),
      visibleLabelCount: getVisibleLabelElements().length
    };
  }

  function addLiveDrillRestoreDebugStep(debug, step, details = {}) {
    if (!debug) return;
    debug.steps.push({
      step,
      at: new Date().toISOString(),
      elapsedMs: Date.now() - (debug._startedAt || Date.now()),
      ...details
    });
  }

  async function copyLiveDrillRestoreDebug() {
    let payload = null;
    const encoded = getLiveDrillHashPayload();
    if (encoded) {
      try {
        payload = parseLiveDrillPayload(encoded);
      } catch (error) {
        payload = { parseError: String(error?.message || error) };
      }
    }
    const currentReport = payload?.kind === "imaios-live-drill"
      ? createLiveDrillRestoreDebug(payload, getLiveDrillRestoreLabels(payload), { source: "manual-debug" })
      : null;
    if (currentReport) {
      currentReport.finalRuntime = getLiveDrillRuntimeDebugSnapshot(getLiveDrillNativeRestorePlan(payload));
      delete currentReport._startedAt;
    }
    const report = {
      kind: "imaios-live-drill-debug-report",
      version: 1,
      buildTag: DEBUG_BUILD_TAG,
      createdAt: new Date().toISOString(),
      currentHashPayload: currentReport,
      lastRestore: state.lastLiveDrillRestoreDebug || null
    };
    await writeClipboard(JSON.stringify(report, null, 2));
    const last = state.lastLiveDrillRestoreDebug;
    const summary = last?.result?.mode
      ? ` Last restore mode: ${last.result.mode}.`
      : "";
    setStatus(`Live-drill restore debug copied.${summary}`, 12000);
  }

  async function markNativeRestoreStateBaseline() {
    const snapshot = buildNativeRestoreStateSnapshot("baseline");
    localStorage.setItem(NATIVE_RESTORE_STATE_BASELINE_KEY, JSON.stringify(snapshot));
    await writeClipboard(JSON.stringify({
      kind: "imaios-native-restore-state-baseline",
      version: 1,
      createdAt: new Date().toISOString(),
      instructions: "Baseline saved. Reproduce the alternate state, then click State diff.",
      snapshot
    }, null, 2));
    setStatus("Native restore baseline saved and copied. Now reproduce the alternate state, then click State diff.", 14000);
  }

  async function copyNativeRestoreStateDiff() {
    const current = buildNativeRestoreStateSnapshot("current");
    const baseline = parseStorageValue(localStorage.getItem(NATIVE_RESTORE_STATE_BASELINE_KEY));
    if (!baseline || baseline.kind !== "imaios-native-restore-state-snapshot") {
      localStorage.setItem(NATIVE_RESTORE_STATE_BASELINE_KEY, JSON.stringify(current));
      await writeClipboard(JSON.stringify({
        kind: "imaios-native-restore-state-baseline",
        version: 1,
        createdAt: new Date().toISOString(),
        instructions: "No prior baseline existed, so the current state was saved as baseline. Reproduce the alternate state, then click State diff again.",
        snapshot: current
      }, null, 2));
      setStatus("No native restore baseline existed, so I saved the current state. Reproduce the alternate state, then click State diff again.", 14000);
      return;
    }

    const diff = diffNativeRestoreStateSnapshots(baseline, current);
    const report = {
      kind: "imaios-native-restore-state-diff",
      version: 1,
      createdAt: new Date().toISOString(),
      baseline: summarizeNativeRestoreStateSnapshot(baseline),
      current: summarizeNativeRestoreStateSnapshot(current),
      diff,
      baselineSnapshot: baseline,
      currentSnapshot: current
    };
    await writeClipboard(JSON.stringify(report, null, 2));
    const changedCount = diff.storage.localStorage.changed.length + diff.storage.sessionStorage.changed.length;
    setStatus(`Native restore state diff copied: ${changedCount} focused storage key${changedCount === 1 ? "" : "s"} changed, locked ${diff.lockedCount.before} -> ${diff.lockedCount.after}.`, 14000);
  }

  function captureNativeRestorePreFallbackState(restoreDebug, reason = "") {
    if (!restoreDebug) return null;
    const current = buildNativeRestoreStateSnapshot(`pre-fallback:${cleanText(reason || "unknown")}`);
    const baseline = parseStorageValue(localStorage.getItem(NATIVE_RESTORE_STATE_BASELINE_KEY));
    const hasBaseline = baseline?.kind === "imaios-native-restore-state-snapshot";
    const diff = hasBaseline ? diffNativeRestoreStateSnapshots(baseline, current) : null;
    const record = {
      reason: cleanText(reason || ""),
      capturedAt: new Date().toISOString(),
      baselineAvailable: hasBaseline,
      baseline: hasBaseline ? summarizeNativeRestoreStateSnapshot(baseline) : null,
      current: summarizeNativeRestoreStateSnapshot(current),
      diffSummary: summarizeNativeRestoreDiffForDebug(diff),
      diff,
      currentSnapshot: current
    };
    if (!Array.isArray(restoreDebug.preFallbackSnapshots)) restoreDebug.preFallbackSnapshots = [];
    restoreDebug.preFallbackSnapshots.push(record);
    addLiveDrillRestoreDebugStep(restoreDebug, "pre-fallback-state-captured", {
      reason: record.reason,
      baselineAvailable: hasBaseline,
      current: record.current,
      diffSummary: record.diffSummary
    });
    return record;
  }

  function summarizeNativeRestoreDiffForDebug(diff) {
    if (!diff) return null;
    return {
      moduleChanged: Boolean(diff.moduleChanged),
      urlChanged: Boolean(diff.urlChanged),
      payloadIdChanged: Boolean(diff.payloadIdChanged),
      nativePlanChanged: Boolean(diff.nativePlanChanged),
      lockedCount: diff.lockedCount || null,
      nativeStorageChanged: Boolean(diff.nativeStorage?.changed),
      viewerStorageChangedKeys: Object.keys(diff.viewerStorageChanged || {}),
      localStorageChangedKeys: (diff.storage?.localStorage?.changed || []).map((entry) => entry.key),
      localStorageAddedKeys: (diff.storage?.localStorage?.added || []).map((entry) => entry.key),
      localStorageRemovedKeys: (diff.storage?.localStorage?.removed || []).map((entry) => entry.key),
      sessionStorageChangedKeys: (diff.storage?.sessionStorage?.changed || []).map((entry) => entry.key),
      sessionStorageAddedKeys: (diff.storage?.sessionStorage?.added || []).map((entry) => entry.key),
      sessionStorageRemovedKeys: (diff.storage?.sessionStorage?.removed || []).map((entry) => entry.key),
      domChangedKeys: Object.keys(diff.domChanged || {}),
      appHintsChangedKeys: Object.keys(diff.appHintsChanged || {})
    };
  }

  function buildNativeRestoreStateSnapshot(stage = "snapshot") {
    const payload = getCurrentLiveDrillPayloadForDebug();
    const nativePlan = payload ? getLiveDrillNativeRestorePlan(payload) : null;
    return {
      kind: "imaios-native-restore-state-snapshot",
      version: 1,
      buildTag: DEBUG_BUILD_TAG,
      stage,
      createdAt: new Date().toISOString(),
      pageTitle: document.title,
      url: location.href,
      module: getCurrentModuleInfo(),
      hashPayload: payload ? summarizeLiveDrillPayloadForDebug(payload) : null,
      nativePlan: nativePlan ? summarizeNativeRestorePlan(nativePlan) : null,
      preload: getLiveDrillPreloadDebug(),
      runtime: getLiveDrillRuntimeDebugSnapshot(nativePlan),
      viewerStorage: getViewerLocalStorageState(),
      focusedStorage: getFocusedNativeRestoreStorageSnapshot(),
      dom: getNativeRestoreDomSnapshot(),
      appHints: getCompactAppStateHints()
    };
  }

  function getCurrentLiveDrillPayloadForDebug() {
    const encoded = getLiveDrillHashPayload();
    if (!encoded) return null;
    try {
      const payload = parseLiveDrillPayload(encoded);
      return payload?.kind === "imaios-live-drill" ? payload : null;
    } catch (_error) {
      return null;
    }
  }

  function summarizeNativeRestoreStateSnapshot(snapshot = {}) {
    return {
      stage: cleanText(snapshot.stage || ""),
      createdAt: cleanText(snapshot.createdAt || ""),
      url: cleanText(snapshot.url || ""),
      module: snapshot.module || null,
      payload: snapshot.hashPayload ? {
        id: snapshot.hashPayload.id,
        title: snapshot.hashPayload.title,
        labelCount: snapshot.hashPayload.labelCount,
        labelsWithPayloadNativeIds: snapshot.hashPayload.labelsWithPayloadNativeIds,
        hasNativeRestore: snapshot.hashPayload.hasNativeRestore
      } : null,
      nativePlan: snapshot.nativePlan || null,
      lockedCount: Number(snapshot.runtime?.lockedCount || 0),
      lockedLabels: snapshot.runtime?.lockedLabels || [],
      nativeStorage: snapshot.runtime?.nativeStorage || null,
      preload: snapshot.preload || null
    };
  }

  function diffNativeRestoreStateSnapshots(before = {}, after = {}) {
    const beforeRuntime = before.runtime || {};
    const afterRuntime = after.runtime || {};
    return {
      moduleChanged: normalizeModuleKey(before.module?.key || "") !== normalizeModuleKey(after.module?.key || ""),
      urlChanged: cleanText(before.url || "") !== cleanText(after.url || ""),
      payloadIdChanged: cleanText(before.hashPayload?.id || "") !== cleanText(after.hashPayload?.id || ""),
      nativePlanChanged: JSON.stringify(before.nativePlan || null) !== JSON.stringify(after.nativePlan || null),
      lockedCount: {
        before: Number(beforeRuntime.lockedCount || 0),
        after: Number(afterRuntime.lockedCount || 0)
      },
      lockedLabels: {
        before: beforeRuntime.lockedLabels || [],
        after: afterRuntime.lockedLabels || []
      },
      nativeStorage: {
        before: beforeRuntime.nativeStorage || null,
        after: afterRuntime.nativeStorage || null,
        changed: JSON.stringify(beforeRuntime.nativeStorage || null) !== JSON.stringify(afterRuntime.nativeStorage || null)
      },
      viewerStorageChanged: diffObjectShallow(before.viewerStorage || {}, after.viewerStorage || {}),
      storage: {
        localStorage: diffFocusedStorageEntries(before.focusedStorage?.localStorage || [], after.focusedStorage?.localStorage || []),
        sessionStorage: diffFocusedStorageEntries(before.focusedStorage?.sessionStorage || [], after.focusedStorage?.sessionStorage || [])
      },
      domChanged: diffObjectShallow(before.dom || {}, after.dom || {}),
      appHintsChanged: diffObjectShallow(before.appHints || {}, after.appHints || {})
    };
  }

  function getFocusedNativeRestoreStorageSnapshot() {
    const pattern = /^(im_|viewer-|vuex|pinia|persist|eanatomy|anatomy)|viewer|locked|lock|isolate|isolated|structure|slice|series|module|label|pin|overlay|cross|menu/i;
    return {
      localStorage: collectFocusedNativeStorageEntries(localStorage, pattern),
      sessionStorage: collectFocusedNativeStorageEntries(sessionStorage, pattern)
    };
  }

  function collectFocusedNativeStorageEntries(storage, pattern) {
    const entries = [];
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key || key === NATIVE_RESTORE_STATE_BASELINE_KEY) continue;
        if (key.startsWith(`${APP_ID}:`) && key !== `${APP_ID}:native-preloaded` && key !== `${APP_ID}:native-preload-error`) continue;
        if (!pattern.test(key)) continue;
        const raw = storage.getItem(key) || "";
        entries.push({
          key,
          rawLength: raw.length,
          hash: simpleStringHash(raw),
          value: compactNativeStateValue(parseStorageValue(raw))
        });
      }
    } catch (error) {
      entries.push({ key: "__storage_error__", error: String(error?.message || error) });
    }
    return entries.sort((a, b) => a.key.localeCompare(b.key)).slice(0, 160);
  }

  function compactNativeStateValue(value, depth = 0) {
    if (value === null || value === undefined) return value ?? null;
    if (typeof value === "string") return value.length > 260 ? `${value.slice(0, 260)}...` : value;
    if (typeof value === "number" || typeof value === "boolean") return value;
    if (depth >= 3) return Array.isArray(value) ? `[array:${value.length}]` : "[object]";
    if (Array.isArray(value)) return value.slice(0, 24).map((item) => compactNativeStateValue(item, depth + 1));
    if (typeof value === "object") {
      return Object.fromEntries(Object.entries(value).slice(0, 48).map(([key, item]) => [
        key,
        compactNativeStateValue(item, depth + 1)
      ]));
    }
    return String(value);
  }

  function getNativeRestoreDomSnapshot() {
    const lockedButton = findLockedStructuresButton();
    const lockedPanel = findLockedStructuresPanel();
    const labelElements = getVisibleLabelElements();
    const pinElements = getPinLikeElements();
    return {
      lockedButton: lockedButton ? elementProbe(lockedButton) : null,
      lockedPanel: lockedPanel ? elementProbe(lockedPanel) : null,
      lockedCount: getLockedStructureCount(),
      lockedNames: getLockedStructureNames(),
      visibleLabelCount: labelElements.length,
      visibleLabelSample: labelElements.slice(0, 12),
      pinLikeCount: pinElements.length,
      pinLikeSample: pinElements.slice(0, 12),
      searchInputPresent: Boolean(findModuleSearchInput()),
      detailPanelPresent: Boolean(findStructureDetailPanel(""))
    };
  }

  function getCompactAppStateHints() {
    const hints = getAppStateHints();
    return {
      hasVueDevtoolsHook: Boolean(hints.hasVueDevtoolsHook),
      windowKeys: (hints.windowKeys || []).slice(0, 40),
      localStorageKeys: (hints.localStorageKeys || []).filter((key) => !String(key).startsWith(`${APP_ID}:`)).slice(0, 60),
      sessionStorageKeys: (hints.sessionStorageKeys || []).filter((key) => !String(key).startsWith(`${APP_ID}:`)).slice(0, 60)
    };
  }

  function diffFocusedStorageEntries(beforeEntries = [], afterEntries = []) {
    const beforeMap = new Map(beforeEntries.map((entry) => [entry.key, entry]));
    const afterMap = new Map(afterEntries.map((entry) => [entry.key, entry]));
    const keys = unique([...beforeMap.keys(), ...afterMap.keys()]);
    const added = [];
    const removed = [];
    const changed = [];
    for (const key of keys) {
      const before = beforeMap.get(key);
      const after = afterMap.get(key);
      if (!before && after) {
        added.push(after);
      } else if (before && !after) {
        removed.push(before);
      } else if (before && after && (before.hash !== after.hash || before.rawLength !== after.rawLength)) {
        changed.push({
          key,
          before: { rawLength: before.rawLength, hash: before.hash, value: before.value },
          after: { rawLength: after.rawLength, hash: after.hash, value: after.value }
        });
      }
    }
    return { added, removed, changed };
  }

  function diffObjectShallow(before = {}, after = {}) {
    const keys = unique([...Object.keys(before || {}), ...Object.keys(after || {})]);
    const changed = {};
    for (const key of keys) {
      const beforeValue = before?.[key];
      const afterValue = after?.[key];
      if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) continue;
      changed[key] = { before: beforeValue ?? null, after: afterValue ?? null };
    }
    return changed;
  }

  function simpleStringHash(value) {
    const text = String(value || "");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  async function restoreLiveDrillPayload(payload, options = {}) {
    const labels = getLiveDrillRestoreLabels(payload);
    if (!labels.length) throw new Error("The live drill has no labels to restore.");
    const expectedModuleKey = normalizeModuleKey(payload?.module?.key || payload?.module?.pathname || payload?.module?.url || "");
    const currentModuleKey = getCurrentModuleKey();
    if (expectedModuleKey && currentModuleKey && expectedModuleKey !== currentModuleKey) {
      throw new Error(`This drill belongs to ${payload?.module?.name || expectedModuleKey}, not the current module.`);
    }

    const restoreDebug = createLiveDrillRestoreDebug(payload, labels, options);
    state.lastLiveDrillRestoreDebug = restoreDebug;
    addLiveDrillRestoreDebugStep(restoreDebug, "start", {
      expectedModuleKey,
      currentModuleKey,
      labelCount: labels.length
    });

    const useStudyShield = shouldShowLiveDrillStudyShield(payload, options);
    if (useStudyShield) showLiveDrillStudyShield(payload, "loading");

    state.liveDrillRestoreRunning = true;
    try {
      setStatus(`Restoring live drill: ${payload.title || labels.length + " labels"}...`, 0);
      const nativePlan = getLiveDrillNativeRestorePlan(payload);
      restoreDebug.nativePlan = summarizeNativeRestorePlan(nativePlan);
      let restoreResult = null;

      if (nativePlan.complete) {
        const initialLockedCount = getLockedStructureCount();
        const storageMatchedAtStart = nativeStorageMatchesPlan(nativePlan);
        addLiveDrillRestoreDebugStep(restoreDebug, storageMatchedAtStart ? "native-storage-matched-plan-before-search" : "native-storage-missing-before-search", {
          nativePlan: summarizeNativeRestorePlan(nativePlan),
          initialLockedCount,
          runtime: getLiveDrillRuntimeDebugSnapshot(nativePlan)
        });
        if (!storageMatchedAtStart && initialLockedCount === 0) {
          const seedResult = writeNativeLockedStructureIds(nativePlan.moduleSlug, nativePlan.ids);
          addLiveDrillRestoreDebugStep(restoreDebug, "native-storage-seeded-before-search", {
            seedResult,
            runtime: getLiveDrillRuntimeDebugSnapshot(nativePlan)
          });
        }

        const allowNativeAcceptance = storageMatchedAtStart || initialLockedCount === 0;
        const nativeVisible = allowNativeAcceptance && storageMatchedAtStart && initialLockedCount >= labels.length
          ? { storageMatches: true, lockedCount: initialLockedCount, alreadyVisible: true }
          : null;
        addLiveDrillRestoreDebugStep(restoreDebug, "native-pre-search-visible-check", {
          nativeVisible: Boolean(nativeVisible),
          allowNativeAcceptance,
          storageMatchedAtStart,
          lockedCount: getLockedStructureCount(),
          skippedWait: true
        });
        if (nativeVisible) {
          restoreResult = createNativeRestoreSuccessResult(nativePlan, labels, { nativePreloaded: storageMatchedAtStart });
        } else {
          addLiveDrillRestoreDebugStep(restoreDebug, "native-preload-not-hydrated", {
            reason: allowNativeAcceptance
              ? "Native IDs were present/seeded, but IMAIOS did not render the expected locked count before search fallback."
              : "Native storage did not match and old locked structures were already visible, so native acceptance was not trusted."
          });
        }
      } else {
        addLiveDrillRestoreDebugStep(restoreDebug, "native-plan-incomplete-before-search", {
          nativePlan: summarizeNativeRestorePlan(nativePlan)
        });
      }

      if (!restoreResult) {
        const searchInput = await waitFor(() => findModuleSearchInput(), 7000, 200);
        if (!searchInput) throw new Error("Could not find IMAIOS module search to restore the drill.");
        addLiveDrillRestoreDebugStep(restoreDebug, "search-input-ready", {
          lockedCount: getLockedStructureCount()
        });
        addLiveDrillRestoreDebugStep(restoreDebug, "viewer-context-deferred-until-final", {
          reason: "Native IDs did not hydrate; locking labels by search first is faster than switching plane/series before fallback."
        });
      }

      if (!restoreResult) {
        captureNativeRestorePreFallbackState(restoreDebug, "before-clear-or-search");
        const lockedCountBeforeClear = getLockedStructureCount();
        const clearResult = lockedCountBeforeClear > 0
          ? await clearLockedStructuresForApply()
          : { ok: true, skipped: true, lockedCount: 0, reason: "No visible locked structures to clear." };
        addLiveDrillRestoreDebugStep(restoreDebug, "clear-before-restore", {
          clearResult,
          runtime: getLiveDrillRuntimeDebugSnapshot(nativePlan)
        });
        if (!clearResult.ok) throw new Error(clearResult.reason || "Could not clear existing locked structures.");
        const shouldAttemptDirectNative = nativePlan.complete;
        if (shouldAttemptDirectNative) {
          const nativeResult = await applyLiveDrillNativeRestore(nativePlan, labels);
          addLiveDrillRestoreDebugStep(restoreDebug, "direct-native-restore-attempt", {
            result: nativeResult,
            runtime: getLiveDrillRuntimeDebugSnapshot(nativePlan)
          });
          if (nativeResult.ok) restoreResult = nativeResult;
        } else if (nativePlan.complete) {
          addLiveDrillRestoreDebugStep(restoreDebug, "direct-native-restore-skipped", {
            reason: "Native plan was complete, but direct native restore was not attempted."
          });
        } else {
          addLiveDrillRestoreDebugStep(restoreDebug, "native-plan-incomplete", {
            nativePlan: summarizeNativeRestorePlan(nativePlan)
          });
        }
      }

      if (!restoreResult) {
        captureNativeRestorePreFallbackState(restoreDebug, "before-fallback-search");
        addLiveDrillRestoreDebugStep(restoreDebug, "fallback-search-start", {
          labels
        });
        state.selectedStructures = labels;
        state.customListText = labels.join("\n");
        savePageState();
        refreshPanel();
        const restoreSearchOptions = getLiveDrillRestoreSearchOptions(payload, options);
        restoreResult = await applyLiveDrillLabels(labels, payload.title ? `Live drill ${payload.title}` : "Live drill", restoreSearchOptions.primary);
        addLiveDrillRestoreDebugStep(restoreDebug, "fallback-search-primary-result", {
          result: restoreResult
        });
        if (restoreResult.missing.length && restoreSearchOptions.fallback) {
          setStatus(`Fast restore missed ${restoreResult.missing.length}; retrying with steadier timing...`, 0);
          const retryResult = await applyLiveDrillLabels(
            restoreResult.missing,
            payload.title ? `Live drill ${payload.title} retry` : "Live drill retry",
            restoreSearchOptions.fallback
          );
          restoreResult = mergeLiveDrillRestoreResults(labels, restoreResult, retryResult);
          addLiveDrillRestoreDebugStep(restoreDebug, "fallback-search-retry-result", {
            retryResult,
            mergedResult: restoreResult
          });
        }
      }

      await restoreLiveDrillViewerContext(payload, { quiet: true, phase: "final" });
      const sliceValue = parseNumber(payload?.viewer?.slice?.value);
      if (Number.isFinite(sliceValue)) {
        await delay(300);
        await setViewerSlice(sliceValue);
      }
      await closeStructureDetailPanel();
      await clearLiveDrillTransientViewerState();
      await resetQuietPinsByCyclingPins();
      await closeStructureDetailPanel();
      await clearLiveDrillTransientViewerState();
      const missSuffix = restoreResult.missing.length ? ` Missing: ${restoreResult.missing.join(", ")}.` : "";
      setStatus(`Live drill ready: ${restoreResult.locked.length}/${labels.length} labels restored.${missSuffix}`, options.source === "test" ? 11000 : 14000);
      if (useStudyShield) hideLiveDrillStudyShield();
      restoreDebug.finalRuntime = getLiveDrillRuntimeDebugSnapshot(getLiveDrillNativeRestorePlan(payload));
      restoreDebug.result = {
        ok: restoreResult.missing.length === 0,
        mode: restoreResult.nativeRestoreUsed ? (restoreResult.nativePreloaded ? "native-preload" : "native-direct") : "fallback-search",
        labelCount: labels.length,
        restoredCount: restoreResult.locked.length,
        missing: restoreResult.missing,
        nativeRestoreUsed: Boolean(restoreResult.nativeRestoreUsed),
        nativePreloaded: Boolean(restoreResult.nativePreloaded)
      };
      delete restoreDebug._startedAt;
      return { ok: restoreResult.missing.length === 0, labelCount: labels.length, ...restoreResult };
    } catch (error) {
      restoreDebug.finalRuntime = getLiveDrillRuntimeDebugSnapshot(getLiveDrillNativeRestorePlan(payload));
      restoreDebug.result = {
        ok: false,
        mode: "error",
        error: String(error?.message || error)
      };
      delete restoreDebug._startedAt;
      if (useStudyShield) markLiveDrillStudyShieldError(payload);
      throw error;
    } finally {
      state.liveDrillRestoreRunning = false;
    }
  }

  function getLiveDrillRestoreSearchOptions(payload, options = {}) {
    const base = {
      noRetry: true,
      closeDetailPanelAfterClick: true,
      skipVerification: true,
      skipPrime: true,
      exactTimeoutMs: 1800,
      afterClickDelayMs: 300,
      searchClearDelayMs: 45,
      searchAfterTypeDelayMs: 70
    };
    const shield = payload?.studyShield || payload?.restorePlan?.studyShield || null;
    const isAnkiCardRestore = shield?.source === "anki-card" || options.source === "anki-card";
    if (!isAnkiCardRestore) return { primary: base, fallback: null };
    return {
      primary: {
        ...base,
        exactTimeoutMs: 1150,
        afterClickDelayMs: 140,
        searchClearDelayMs: 28,
        searchAfterTypeDelayMs: 38
      },
      fallback: base
    };
  }

  function mergeLiveDrillRestoreResults(requestedLabels, firstResult = {}, retryResult = {}) {
    const attempted = [
      ...(Array.isArray(firstResult.attempted) ? firstResult.attempted : []),
      ...(Array.isArray(retryResult.attempted) ? retryResult.attempted : [])
    ];
    const locked = unique([
      ...(Array.isArray(firstResult.locked) ? firstResult.locked : []),
      ...(Array.isArray(retryResult.locked) ? retryResult.locked : [])
    ]);
    return {
      locked,
      missing: getMissingLabels(requestedLabels, locked),
      attempted,
      verificationSkipped: Boolean(firstResult.verificationSkipped || retryResult.verificationSkipped),
      fastRetryUsed: true
    };
  }

  async function restoreLiveDrillViewerContext(payload, options = {}) {
    const targetSeries = cleanText(payload?.viewer?.selectedSeries || "");
    const targetPlane = normalizePlaneName(payload?.viewer?.plane || "");
    if (!targetSeries && !targetPlane) return { ok: true, skipped: true };

    const attempts = options.phase === "final" ? 2 : 1;
    let lastResult = { ok: false, reason: "No viewer restore attempted." };
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const current = getSeriesInfo();
      const currentSeries = cleanText(current.selectedSeries || "");
      const currentPlane = normalizePlaneName(current.selectedPlane || "") || inferSelectedPlaneFromDom() || "";
      const seriesMatches = targetSeries && normalizeText(currentSeries) === normalizeText(targetSeries);
      const planeMatches = targetPlane && normalizePlaneName(currentPlane) === targetPlane;
      if ((targetSeries && seriesMatches) || (!targetSeries && targetPlane && planeMatches)) {
        return { ok: true, alreadySelected: true, series: currentSeries, plane: currentPlane };
      }

      if (targetSeries) {
        lastResult = await switchSeriesByName(targetSeries, { quiet: true });
        if (lastResult.ok) {
          await delay(options.phase === "final" ? 420 : 350);
          continue;
        }
      }

      if (targetPlane) {
        lastResult = await switchPlane(targetPlane, { quiet: true });
        if (lastResult.ok) {
          await delay(options.phase === "final" ? 420 : 350);
          continue;
        }
      }

      if (attempt + 1 < attempts) await delay(650);
    }

    if (!options.quiet && !lastResult.ok) {
      setStatus(`Could not restore ${targetSeries || targetPlane}; using current series.`, 6000);
    }
    return lastResult;
  }

  async function applyLiveDrillLabels(labels, sourceLabel, options = {}) {
    if (state.searchRunning) {
      return { locked: [], missing: labels, attempted: [], reason: "Search is already running." };
    }
    state.searchRunning = true;
    state.cancelSearch = false;
    const requested = unique(labels);
    const attempted = [];
    try {
      if (!options.skipPrime) {
        const primed = await primeModuleSearch();
        if (!primed.ok) return { locked: [], missing: requested, attempted, reason: primed.reason };
      }

      await applyLiveDrillLabelPass(requested, attempted, sourceLabel, {
        exact: true,
        closeDetailPanelAfterClick: Boolean(options.closeDetailPanelAfterClick),
        timeoutMs: options.exactTimeoutMs,
        afterClickDelayMs: options.afterClickDelayMs,
        searchClearDelayMs: options.searchClearDelayMs,
        searchAfterTypeDelayMs: options.searchAfterTypeDelayMs
      });

      if (options.skipVerification) {
        const locked = unique(attempted.filter((item) => item.ok).map((item) => item.label));
        return {
          locked,
          missing: getMissingLabels(requested, locked),
          attempted,
          verificationSkipped: true
        };
      }

      let locked = await readLockedNamesForVerification();
      let missing = getMissingLabels(requested, locked);
      const lockedCount = getLockedStructureCount();

      if (options.assumeCompleteWhenLockCountMatches && lockedCount >= requested.length) {
        locked = requested;
        missing = [];
      }

      if (missing.length && !options.noRetry) {
        setStatus(`Retrying ${missing.length} missing live-drill label${missing.length === 1 ? "" : "s"}...`, 0);
        await applyLiveDrillLabelPass(missing, attempted, sourceLabel, {
          exact: false,
          closeDetailPanelAfterClick: Boolean(options.closeDetailPanelAfterClick),
          afterClickDelayMs: options.afterClickDelayMs,
          searchClearDelayMs: options.searchClearDelayMs,
          searchAfterTypeDelayMs: options.searchAfterTypeDelayMs
        });
        locked = await readLockedNamesForVerification();
        missing = getMissingLabels(requested, locked);
      }

      return { locked, missing, attempted };
    } finally {
      state.searchRunning = false;
    }
  }

  async function applyLiveDrillLabelPass(labels, attempted, sourceLabel, options = {}) {
    for (const label of labels) {
      if (state.cancelSearch) break;
      setStatus(`${sourceLabel}: restoring ${label}...`, 0);
      const result = await searchAndClickStructure(label, {
        exact: Boolean(options.exact),
        allowFallback: !options.exact,
        timeoutMs: options.timeoutMs || (options.exact ? 2600 : 5200),
        closeDetailPanelAfterClick: Boolean(options.closeDetailPanelAfterClick),
        clearDelayMs: options.searchClearDelayMs,
        afterTypeDelayMs: options.searchAfterTypeDelayMs
      });
      attempted.push({ label, ok: Boolean(result.ok), exact: Boolean(options.exact), reason: result.reason || "" });
      const afterClickDelay = Number.isFinite(options.afterClickDelayMs)
        ? Math.max(0, options.afterClickDelayMs)
        : (result.ok ? 760 : 220);
      await delay(afterClickDelay);
    }
  }

  async function readLockedNamesForVerification() {
    await delay(500);
    return collectLockedStructureNames();
  }

  function getMissingLabels(requested, locked) {
    const lockedKeys = new Set((locked || []).map(normalizeText));
    return requested.filter((label) => !lockedKeys.has(normalizeText(label)));
  }

  function getLiveDrillRestoreLabels(payload) {
    const labels = Array.isArray(payload?.labels)
      ? payload.labels.map((entry) => cleanText(entry?.preferredLabel || entry?.label || ""))
      : [];
    const legacyLabels = Array.isArray(payload?.lockedLabels) ? payload.lockedLabels.map(cleanText) : [];
    return unique([...labels, ...legacyLabels]);
  }

  function getLiveDrillHashPayload(hash = location.hash) {
    const text = String(hash || "").replace(/^#/, "");
    if (!text) return "";
    const params = new URLSearchParams(text);
    return params.get("imaiosDrill") || "";
  }

  function parseLiveDrillPayload(encoded) {
    try {
      const text = base64UrlDecode(encoded);
      const payload = JSON.parse(text);
      if (payload?.kind !== "imaios-live-drill") throw new Error("Unexpected drill kind.");
      return payload;
    } catch (error) {
      throw new Error(`Could not parse live drill link: ${error?.message || error}`);
    }
  }

  function base64UrlEncode(text) {
    const bytes = new TextEncoder().encode(String(text));
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlDecode(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new TextDecoder().decode(bytes);
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

    if (message?.type === "GET_IMAIOS_LABEL_DETAIL_REPOSITORY") {
      sendResponse({
        ok: true,
        repository: state.labelDetailRepository,
        stats: getLabelDetailRepositoryStats(state.labelDetailRepository),
        module: getCurrentModuleInfo()
      });
      return true;
    }

    if (message?.type === "IMAIOS_HARVEST_LABEL_DETAILS_FOR_PLAN") {
      (async () => {
        const result = await harvestLabelDetailsForPlan(message.labels || message.planModule?.labels || [], message.planModule || {});
        sendResponse(result);
      })().catch((error) => {
        sendResponse({ ok: false, error: String(error?.message || error) });
      });
      return true;
    }

    if (message?.type === "IMAIOS_LIVE_DRILL_CARD_PLAN_READY") {
      (async () => {
        try {
          const sourcePayload = isLiveDrillCardSourcePayload(message.sourcePayload)
            ? message.sourcePayload
            : null;
          if (sourcePayload) saveLastLiveDrillCardSource(sourcePayload);
          setStatus("ChatGPT card plan received. Building live-drill TSV...", 0);
          const plan = parseLiveDrillCardPlan(message.assistantText || message.text || "");
          const payload = sourcePayload || await getSourcePayloadForCardPlan(plan);
          const result = await finalizeLiveDrillCardPlan(plan, payload, { source: "chatgpt-automation" });
          setStatus(result.message, result.ok ? 14000 : 12000);
          sendResponse(result.ok ? { ok: true, ...result } : { ok: false, error: result.message, ...result });
        } catch (error) {
          const messageText = `Live-drill TSV automation failed: ${error?.message || error}`;
          setStatus(messageText, 14000);
          sendResponse({ ok: false, error: String(error?.message || error) });
        }
      })();
      return true;
    }

    if (message?.type === "IMAIOS_LIVE_DRILL_CARD_PLAN_FAILED") {
      setStatus(`Live-drill card automation failed: ${message.error || "unknown error"}`, 14000);
      sendResponse({ ok: true });
      return true;
    }

    if (message?.type === "IMAIOS_LIVE_DRILL_PAIR_ROLE") {
      (async () => {
        await setLiveDrillPairRole({
          pairId: message.pairId || "",
          role: message.role || "",
          peerTabId: message.peerTabId || 0,
          payload: message.payload || null
        });
        sendResponse({ ok: true });
      })().catch((error) => {
        sendResponse({ ok: false, error: String(error?.message || error) });
      });
      return true;
    }

    if (message?.type === "IMAIOS_LIVE_DRILL_PAIR_APPLY_SYNC") {
      (async () => {
        if (!state.liveDrillPair?.pairId || state.liveDrillPair.pairId !== message.pairId) {
          sendResponse({ ok: false, error: "This tab is not part of the requested IMAIOS pair." });
          return;
        }
        const result = await applyLiveDrillPairSync(message.sync || {});
        sendResponse(result);
      })().catch((error) => {
        sendResponse({ ok: false, error: String(error?.message || error) });
      });
      return true;
    }

    if (message?.type === "IMAIOS_LIVE_DRILL_PAIR_APPLY_INPUT") {
      (async () => {
        if (!state.liveDrillPair?.pairId || state.liveDrillPair.pairId !== message.pairId) {
          sendResponse({ ok: false, error: "This tab is not part of the requested IMAIOS pair." });
          return;
        }
        const result = await applyLiveDrillPairInput(message.input || {});
        sendResponse(result);
      })().catch((error) => {
        sendResponse({ ok: false, error: String(error?.message || error) });
      });
      return true;
    }

    if (message?.type === "IMAIOS_LIVE_DRILL_PAIR_STOPPED") {
      stopPairedAnswerSession({ silent: true, notifyServiceWorker: false });
      sendResponse({ ok: true });
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
      } else if (parsed?.kind === "imaios-label-detail-repository") {
        state.labelDetailRepository = mergeLabelDetailRepositories(state.labelDetailRepository, parsed);
        const saveResult = await saveLabelDetailRepository();
        refreshPanel();
        if (!saveResult.ok) {
          setStatus(`Definition import failed while saving: ${saveResult.error}`, 9000);
          return;
        }
        const stats = getLabelDetailRepositoryStats(state.labelDetailRepository);
        const backupResult = await backupLabelDetailRepositoryToDownloads("import");
        const backupText = backupResult.ok
          ? ` Backup written to ${backupResult.result.downloadFolder}.`
          : ` Backup failed: ${backupResult.error}`;
        setStatus(`Imported ${stats.detailCount} saved IMAIOS label definitions across ${stats.moduleCount} modules.${backupText}`, 12000);
        return;
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
      breadcrumb: normalizeBreadcrumbList(source && (
        source.breadcrumb ||
        source.breadcrumbs ||
        source.breadcrumbTrail ||
        source.deckBreadcrumb ||
        source.ankiBreadcrumb ||
        source.anki?.breadcrumb ||
        source.anki?.breadcrumbTrail ||
        source.metadata?.breadcrumbTrail
      )),
      deckPath: applyDeckRootOverride(source && (
        source.deckPath ||
        source.suggestedDeckPath ||
        source.ankiDeckPath ||
        source.anki?.deckPath ||
        source.anki?.deck ||
        source.metadata?.deckPath ||
        ""
      )),
      tags: normalizeStringList(source && (
        source.tags ||
        source.suggestedTags ||
        source.ankiTags ||
        source.anki?.tags ||
        source.metadata?.tags
      )),
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
    const labels = getRawChunkLabels(value).map(normalizeChunkLabel).filter(Boolean);
    const labelModuleKeys = unique(labels.map((label) => normalizeModuleKey(label.moduleKey)).filter(Boolean));
    const parentGroup = cleanText(value.parentGroup || value.group || value.region || "");
    const title = buildChunkTitle({
      explicitTitle: value.title || value.name || "",
      fallbackId: value.id || "",
      parentGroup,
      labels,
      index
    });
    const rawId = cleanText(value.id || "");
    const id = cleanText(
      (rawId && !isGenericChunkTitle(rawId) ? rawId : "")
      || createSlug(title)
      || `chunk-${index + 1}`
    );
    return {
      id,
      title,
      parentGroup,
      moduleKey: normalizeModuleKey(value.moduleKey || value.targetModuleKey || value.imaiosModuleKey || value.moduleUrl || value.modalityUrl || value.url || "") || (labelModuleKeys.length === 1 ? labelModuleKeys[0] : ""),
      moduleName: cleanText(value.moduleName || value.targetModuleName || ""),
      modality: cleanText(value.modality || value.imaiosModality || value.module || ""),
      modalityUrl: cleanText(value.modalityUrl || value.url || ""),
      breadcrumb: normalizeBreadcrumbList(
        value.breadcrumb ||
        value.breadcrumbs ||
        value.breadcrumbTrail ||
        value.deckBreadcrumb ||
        value.ankiBreadcrumb ||
        value.anki?.breadcrumb ||
        value.anki?.breadcrumbTrail ||
        value.routing?.breadcrumb ||
        value.routing?.breadcrumbTrail
      ),
      deckPath: applyDeckRootOverride(
        value.deckPath ||
        value.suggestedDeckPath ||
        value.ankiDeckPath ||
        value.anki?.deckPath ||
        value.anki?.deck ||
        value.routing?.deckPath ||
        ""
      ),
      tags: normalizeStringList(
        value.tags ||
        value.suggestedTags ||
        value.ankiTags ||
        value.anki?.tags ||
        value.routing?.tags
      ),
      learningOrder: Number(value.learningOrder || value.order || index + 1),
      labels,
      unmatchedConcepts: normalizeGapReviewList(value.unmatchedConcepts || value.gapReview || value.needsReview),
      learningFrame: normalizeStringList(value.learningFrame || value.learningNotes || value.notes),
      source: cleanText(value.source || "")
    };
  }

  function buildChunkTitle({ explicitTitle = "", fallbackId = "", parentGroup = "", labels = [], index = 0 } = {}) {
    const explicit = cleanText(explicitTitle);
    if (explicit && !isGenericChunkTitle(explicit)) return explicit;

    const group = cleanText(parentGroup);
    const labelNames = labels
      .map((label) => cleanText(label.preferredLabel || label.concept || ""))
      .filter(Boolean);
    const focusLabels = labelNames.filter((label) => !group || normalizeText(label) !== normalizeText(group));
    const focus = buildChunkTitleFocus(focusLabels.length ? focusLabels : labelNames);
    if (group && focus) return compactChunkTitle(`${group}: ${focus}`);
    if (group) return compactChunkTitle(group);
    if (focus) return compactChunkTitle(focus);

    const idTitle = slugToTitle(cleanText(fallbackId));
    if (idTitle && !isGenericChunkTitle(idTitle)) return compactChunkTitle(idTitle);
    return `Chunk ${index + 1}`;
  }

  function buildChunkTitleFocus(labels) {
    const names = unique((Array.isArray(labels) ? labels : []).map(cleanText).filter(Boolean));
    if (!names.length) return "";
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names[0]} and related landmarks`;
  }

  function isGenericChunkTitle(value) {
    const text = cleanText(value);
    if (!text) return true;
    return /^chunk(?:[\s_-]*\d+)?$/i.test(text)
      || /^section(?:[\s_-]*\d+)?$/i.test(text)
      || /^group(?:[\s_-]*\d+)?$/i.test(text);
  }

  function slugToTitle(value) {
    const text = cleanText(value)
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text || isGenericChunkTitle(text)) return "";
    return text.replace(/\b[a-z]/g, (match) => match.toUpperCase());
  }

  function compactChunkTitle(value, maxLength = 78) {
    const text = cleanText(value);
    if (text.length <= maxLength) return text;
    const truncated = text.slice(0, maxLength + 1).replace(/\s+\S*$/, "").trim();
    return `${truncated || text.slice(0, maxLength).trim()}...`;
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
        sourceCounts: rawModule?.sourceCounts && typeof rawModule.sourceCounts === "object" ? rawModule.sourceCounts : {},
        nativeModuleSlug: cleanText(rawModule?.nativeModuleSlug || rawModule?.nativeSlug || rawModule?.imaiosNativeSlug || ""),
        nativeIds: normalizeNativeIdMap(rawModule?.nativeIds || rawModule?.nativeLabelIds || rawModule?.labelNativeIds || {})
      };
    }
    return modules;
  }

  function normalizeImportedLabelDetailRepository(value) {
    const source = value && typeof value === "object" ? value : {};
    const repository = {
      kind: "imaios-label-detail-repository",
      version: Number(source.version) || 1,
      updatedAt: cleanText(source.updatedAt || source.createdAt || ""),
      moduleDetails: {}
    };

    const rawModules = source.moduleDetails && typeof source.moduleDetails === "object"
      ? source.moduleDetails
      : {};
    for (const [key, rawModule] of Object.entries(rawModules)) {
      const moduleKey = cleanText(rawModule?.key || key);
      if (!moduleKey) continue;
      const details = normalizeLabelDetailRecordMap(rawModule?.details || rawModule?.labels || {});
      repository.moduleDetails[moduleKey] = {
        key: moduleKey,
        name: cleanText(rawModule?.name || rawModule?.moduleName || moduleKey),
        url: cleanText(rawModule?.url || rawModule?.moduleUrl || ""),
        updatedAt: cleanText(rawModule?.updatedAt || ""),
        details
      };
    }

    if (source.details && typeof source.details === "object") {
      const moduleInfo = source.module && typeof source.module === "object" ? source.module : {};
      const moduleKey = cleanText(moduleInfo.key || source.moduleKey || "global");
      const existing = repository.moduleDetails[moduleKey] || {
        key: moduleKey,
        name: cleanText(moduleInfo.name || source.moduleName || moduleKey),
        url: cleanText(moduleInfo.url || source.moduleUrl || ""),
        updatedAt: "",
        details: {}
      };
      existing.details = {
        ...existing.details,
        ...normalizeLabelDetailRecordMap(source.details)
      };
      repository.moduleDetails[moduleKey] = existing;
    }

    if (!repository.updatedAt) repository.updatedAt = new Date().toISOString();
    return repository;
  }

  function normalizeLabelDetailRecordMap(value) {
    const records = {};
    const rawItems = Array.isArray(value)
      ? value
      : Object.entries(value || {}).map(([key, item]) => ({ key, item }));
    for (const raw of rawItems) {
      const item = raw && raw.item !== undefined ? raw.item : raw;
      const fallbackKey = raw && raw.key !== undefined ? raw.key : "";
      const record = normalizeLabelDetailRecord(item, fallbackKey);
      if (!record) continue;
      records[record.normalizedLabel] = record;
    }
    return records;
  }

  function normalizeLabelDetailRecord(value, fallbackLabel = "") {
    if (!value || typeof value !== "object") return null;
    const detail = value.detail && typeof value.detail === "object"
      ? value.detail
      : {
          title: value.title || "",
          alternateTitle: value.alternateTitle || "",
          definition: value.definition || "",
          definitionSource: value.definitionSource || "",
          summary: value.summary || "",
          chips: value.chips || [],
          hierarchy: value.hierarchy || []
        };
    const preferredLabel = cleanText(value.preferredLabel || value.label || detail.title || fallbackLabel || "");
    const normalizedLabel = normalizeText(value.normalizedLabel || preferredLabel);
    if (!preferredLabel || !normalizedLabel) return null;
    return {
      preferredLabel,
      normalizedLabel,
      moduleKey: cleanText(value.moduleKey || ""),
      moduleName: cleanText(value.moduleName || ""),
      moduleUrl: cleanText(value.moduleUrl || ""),
      href: cleanText(value.href || ""),
      capturedAt: cleanText(value.capturedAt || value.createdAt || ""),
      updatedAt: cleanText(value.updatedAt || value.capturedAt || value.createdAt || ""),
      captureStatus: cleanText(value.captureStatus || value.status || "captured"),
      captureSource: cleanText(value.captureSource || value.source || ""),
      selectedText: cleanText(value.selectedText || ""),
      detail: normalizeLabelDetailPayload(detail)
    };
  }

  function normalizeLabelDetailPayload(detail) {
    const value = detail && typeof detail === "object" ? detail : {};
    return {
      title: cleanText(value.title || ""),
      alternateTitle: cleanText(value.alternateTitle || ""),
      definition: cleanText(value.definition || ""),
      definitionSource: cleanText(value.definitionSource || ""),
      summary: cleanText(value.summary || ""),
      chips: Array.isArray(value.chips)
        ? value.chips.map((chip) => ({
            label: cleanText(chip?.label || chip || ""),
            href: cleanText(chip?.href || ""),
            className: cleanText(chip?.className || "")
          })).filter((chip) => chip.label)
        : [],
      hierarchy: Array.isArray(value.hierarchy)
        ? value.hierarchy.map((card) => ({
            name: cleanText(card?.name || ""),
            ancestors: normalizeStringList(card?.ancestors || []),
            children: normalizeStringList(card?.children || [])
          })).filter((card) => card.name || card.ancestors.length || card.children.length)
        : [],
      moduleImageCount: Number(value.moduleImageCount || 0),
      rawText: cleanText(value.rawText || "")
    };
  }

  function mergeLabelDetailRepositories(baseValue, incomingValue) {
    const base = normalizeImportedLabelDetailRepository(baseValue);
    const incoming = normalizeImportedLabelDetailRepository(incomingValue);
    for (const [moduleKey, incomingModule] of Object.entries(incoming.moduleDetails || {})) {
      const existing = base.moduleDetails[moduleKey] || {
        key: moduleKey,
        name: incomingModule.name || moduleKey,
        url: incomingModule.url || "",
        updatedAt: "",
        details: {}
      };
      base.moduleDetails[moduleKey] = {
        ...existing,
        name: incomingModule.name || existing.name,
        url: incomingModule.url || existing.url,
        updatedAt: incomingModule.updatedAt || existing.updatedAt,
        details: {
          ...(existing.details || {}),
          ...(incomingModule.details || {})
        }
      };
    }
    base.updatedAt = new Date().toISOString();
    return base;
  }

  function getCachedLabelDetailRecord(labelInfo = {}) {
    const repository = normalizeImportedLabelDetailRepository(state.labelDetailRepository || {});
    const normalizedLabel = normalizeText(labelInfo.preferredLabel || labelInfo.label || "");
    if (!normalizedLabel) return null;
    const moduleKey = cleanText(labelInfo.moduleKey || "");
    const direct = moduleKey
      ? repository.moduleDetails?.[moduleKey]?.details?.[normalizedLabel]
      : null;
    if (hasUsableLabelDetailRecord(direct)) return direct;
    for (const module of Object.values(repository.moduleDetails || {})) {
      const record = module?.details?.[normalizedLabel] || null;
      if (hasUsableLabelDetailRecord(record)) return record;
    }
    return null;
  }

  function hasUsableLabelDetailRecord(record) {
    if (!record || !record.detail) return false;
    return Boolean(
      cleanText(record.detail.definition || "")
      || cleanText(record.detail.summary || "")
      || cleanText(record.detail.title || record.preferredLabel || "")
    );
  }

  function buildCachedLabelDetailResult(record, labelInfo = {}) {
    return {
      label: record.preferredLabel || labelInfo.preferredLabel || "",
      normalizedLabel: record.normalizedLabel || normalizeText(labelInfo.preferredLabel || ""),
      status: "captured",
      source: "definition-cache",
      selectedText: record.selectedText || "",
      href: record.href || labelInfo.href || "",
      moduleKey: record.moduleKey || labelInfo.moduleKey || "",
      cached: true,
      detail: record.detail || {}
    };
  }

  function mergeLabelDetailProbeIntoRepository(probe, sourcePayload = null) {
    const repository = normalizeImportedLabelDetailRepository(state.labelDetailRepository || {});
    const now = new Date().toISOString();
    const module = sourcePayload?.module || probe?.module || getCurrentModuleInfo();
    const moduleKey = cleanText(module?.key || getCurrentModuleKey());
    const moduleEntry = repository.moduleDetails[moduleKey] || {
      key: moduleKey,
      name: cleanText(module?.name || getCurrentModuleName() || moduleKey),
      url: cleanText(module?.url || getCurrentUrlWithoutHash()),
      updatedAt: "",
      details: {}
    };
    moduleEntry.details = moduleEntry.details && typeof moduleEntry.details === "object" ? moduleEntry.details : {};
    const payloadLabelMap = getLiveDrillPayloadLabelInfoMap(sourcePayload);
    let addedCount = 0;
    let updatedCount = 0;

    for (const result of Array.isArray(probe?.labels) ? probe.labels : []) {
      if (result?.status !== "captured" || result?.cached) continue;
      const label = cleanText(result.label || result.detail?.title || "");
      const normalizedLabel = normalizeText(label);
      if (!normalizedLabel || !result.detail) continue;
      const labelInfo = payloadLabelMap.get(normalizedLabel) || {};
      const previous = moduleEntry.details?.[normalizedLabel] || null;
      const record = normalizeLabelDetailRecord({
        preferredLabel: labelInfo.preferredLabel || label,
        normalizedLabel,
        moduleKey,
        moduleName: moduleEntry.name,
        moduleUrl: moduleEntry.url,
        href: labelInfo.href || result.href || "",
        capturedAt: previous?.capturedAt || now,
        updatedAt: now,
        captureStatus: result.status,
        captureSource: result.source || "",
        selectedText: result.selectedText || "",
        detail: result.detail
      });
      if (!record || !hasUsableLabelDetailRecord(record)) continue;
      if (previous) updatedCount += 1;
      else addedCount += 1;
      moduleEntry.details[normalizedLabel] = record;
    }

    moduleEntry.updatedAt = now;
    repository.moduleDetails[moduleKey] = moduleEntry;
    repository.updatedAt = now;
    state.labelDetailRepository = repository;
    return {
      ok: true,
      addedCount,
      updatedCount,
      savedCount: addedCount + updatedCount,
      moduleKey,
      moduleName: moduleEntry.name
    };
  }

  function getLiveDrillPayloadLabelInfoMap(payload) {
    const map = new Map();
    const module = payload?.module || {};
    for (const entry of Array.isArray(payload?.labels) ? payload.labels : []) {
      const preferredLabel = cleanText(entry?.preferredLabel || entry?.label || "");
      const key = normalizeText(preferredLabel);
      if (!key) continue;
      map.set(key, {
        preferredLabel,
        moduleKey: cleanText(entry?.moduleKey || module.key || ""),
        moduleName: cleanText(entry?.moduleName || module.name || ""),
        moduleUrl: cleanText(entry?.moduleUrl || module.url || ""),
        href: cleanText(entry?.href || "")
      });
    }
    return map;
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

  function getSavedModuleLabelEntry(moduleKey = getCurrentModuleKey()) {
    const key = cleanText(moduleKey || getCurrentModuleKey());
    const moduleLabels = state.labelRepository?.moduleLabels || {};
    if (moduleLabels[key]) return moduleLabels[key];
    const normalizedKey = normalizeModuleKey(key);
    if (!normalizedKey) return null;
    for (const [savedKey, entry] of Object.entries(moduleLabels)) {
      if (normalizeModuleKey(savedKey) === normalizedKey) return entry;
      if (normalizeModuleKey(entry?.key || "") === normalizedKey) return entry;
    }
    return null;
  }

  function getSavedModuleNativeSlug(moduleKey = getCurrentModuleKey()) {
    const moduleEntry = getSavedModuleLabelEntry(moduleKey);
    return cleanText(moduleEntry?.nativeModuleSlug || moduleEntry?.nativeSlug || moduleEntry?.imaiosNativeSlug || "");
  }

  function getNativeIdsForLabel(label, moduleKey = getCurrentModuleKey()) {
    const moduleEntry = getSavedModuleLabelEntry(moduleKey);
    const nativeIds = normalizeNativeIdMap(moduleEntry?.nativeIds || moduleEntry?.nativeLabelIds || moduleEntry?.labelNativeIds || {});
    const keys = new Set([normalizeText(label)]);
    const repositoryEntry = findRepositoryLabelForTarget({ preferredLabel: label, aliases: [] });
    if (repositoryEntry) {
      keys.add(normalizeText(repositoryEntry.preferredLabel || ""));
      for (const alias of Array.isArray(repositoryEntry.aliases) ? repositoryEntry.aliases : []) {
        keys.add(normalizeText(alias));
      }
    }
    for (const key of keys) {
      if (key && Array.isArray(nativeIds[key]) && nativeIds[key].length) {
        return {
          ids: uniqueNativeIds(nativeIds[key]),
          moduleSlug: getSavedModuleNativeSlug(moduleKey),
          source: "module-label-repository"
        };
      }
    }
    return {
      ids: [],
      moduleSlug: getSavedModuleNativeSlug(moduleKey),
      source: ""
    };
  }

  function buildLiveDrillNativeRestorePlan(labels, module = null) {
    const entries = Array.isArray(labels) ? labels : [];
    const moduleKey = cleanText(module?.key || entries.find((entry) => entry?.moduleKey)?.moduleKey || getCurrentModuleKey());
    const moduleSlug = cleanText(
      entries.find((entry) => cleanText(entry?.nativeModuleSlug))?.nativeModuleSlug
      || module?.nativeModuleSlug
      || getSavedModuleNativeSlug(moduleKey)
      || ""
    );
    const labelPlans = entries.map((entry) => {
      const label = cleanText(entry?.preferredLabel || entry?.label || "");
      const ids = uniqueNativeIds(entry?.nativeIds || entry?.nativeId || []);
      return { label, ids };
    });
    const ids = uniqueNativeIds(labelPlans.flatMap((item) => item.ids));
    const mappedLabelCount = labelPlans.filter((item) => item.ids.length).length;
    return {
      storageKey: "im_viewer_locked_structures",
      moduleSlug,
      ids,
      labelCount: labelPlans.length,
      mappedLabelCount,
      complete: Boolean(moduleSlug && labelPlans.length && mappedLabelCount === labelPlans.length && ids.length),
      source: "native-lock-id-map"
    };
  }

  function buildNativeRestorePlanForLabelNames(labelNames, module = getCurrentModuleInfo()) {
    const moduleKey = cleanText(module?.key || getCurrentModuleKey());
    const entries = unique((Array.isArray(labelNames) ? labelNames : []).map(cleanText)).map((label) => {
      const nativeMatch = getNativeIdsForLabel(label, moduleKey);
      const nativeIds = uniqueNativeIds(nativeMatch.ids || []);
      return {
        preferredLabel: label,
        normalizedLabel: normalizeText(label),
        moduleKey,
        nativeId: nativeIds[0] || null,
        nativeIds,
        nativeModuleSlug: nativeMatch.moduleSlug || ""
      };
    });
    return buildLiveDrillNativeRestorePlan(entries, module);
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

  async function saveLabelDetailRepository() {
    try {
      state.labelDetailRepository = normalizeImportedLabelDetailRepository({
        ...state.labelDetailRepository,
        updatedAt: new Date().toISOString()
      });
      localStorage.setItem(LABEL_DETAIL_REPOSITORY_STORAGE_KEY, JSON.stringify(state.labelDetailRepository));
      await syncLabelDetailRepositoryToExtensionStorage();
      return { ok: true };
    } catch (error) {
      console.warn("IMAIOS Cine Tools: could not save label detail repository", error);
      return { ok: false, error: String(error?.message || error) };
    }
  }

  async function syncLabelRepositoryToExtensionStorage() {
    if (!chrome?.storage?.local) return { ok: false, error: "Extension storage is unavailable." };
    const stats = getLabelRepositoryStats(state.labelRepository);
    await chrome.storage.local.set({ [EXTENSION_LABEL_REPOSITORY_STORAGE_KEY]: state.labelRepository });
    return { ok: true, stats };
  }

  async function syncLabelDetailRepositoryToExtensionStorage() {
    if (!chrome?.storage?.local) return { ok: false, error: "Extension storage is unavailable." };
    const stats = getLabelDetailRepositoryStats(state.labelDetailRepository);
    await chrome.storage.local.set({ [EXTENSION_LABEL_DETAIL_REPOSITORY_STORAGE_KEY]: state.labelDetailRepository });
    return { ok: true, stats };
  }

  async function refreshLabelRepositoriesFromStorage() {
    const localLabelRepository = normalizeImportedLabelRepository(JSON.parse(localStorage.getItem(LABEL_REPOSITORY_STORAGE_KEY) || "null"));
    const localDetailRepository = normalizeImportedLabelDetailRepository(JSON.parse(localStorage.getItem(LABEL_DETAIL_REPOSITORY_STORAGE_KEY) || "null"));
    state.labelRepository = mergeLabelRepositories(state.labelRepository, localLabelRepository);
    state.labelDetailRepository = mergeLabelDetailRepositories(state.labelDetailRepository, localDetailRepository);

    if (!chrome?.storage?.local) return { ok: true, source: "localStorage" };

    try {
      const values = await chrome.storage.local.get([
        EXTENSION_LABEL_REPOSITORY_STORAGE_KEY,
        EXTENSION_LABEL_DETAIL_REPOSITORY_STORAGE_KEY
      ]);
      const extensionLabelRepository = normalizeImportedLabelRepository(values?.[EXTENSION_LABEL_REPOSITORY_STORAGE_KEY] || null);
      const extensionDetailRepository = normalizeImportedLabelDetailRepository(values?.[EXTENSION_LABEL_DETAIL_REPOSITORY_STORAGE_KEY] || null);
      state.labelRepository = mergeLabelRepositories(state.labelRepository, extensionLabelRepository);
      state.labelDetailRepository = mergeLabelDetailRepositories(state.labelDetailRepository, extensionDetailRepository);
      localStorage.setItem(LABEL_REPOSITORY_STORAGE_KEY, JSON.stringify(state.labelRepository));
      localStorage.setItem(LABEL_DETAIL_REPOSITORY_STORAGE_KEY, JSON.stringify(state.labelDetailRepository));
      return { ok: true, source: "extension-storage" };
    } catch (error) {
      console.warn("IMAIOS Cine Tools: could not refresh repositories from extension storage", error);
      return { ok: false, error: String(error?.message || error) };
    }
  }

  function mergeLabelRepositories(baseRepository, incomingRepository) {
    const base = normalizeImportedLabelRepository(baseRepository);
    const incoming = normalizeImportedLabelRepository(incomingRepository);
    const moduleLabels = { ...base.moduleLabels };
    for (const [moduleKey, incomingModule] of Object.entries(incoming.moduleLabels || {})) {
      const previous = moduleLabels[moduleKey] || {};
      moduleLabels[moduleKey] = {
        ...previous,
        ...incomingModule,
        labels: unique([
          ...(Array.isArray(previous.labels) ? previous.labels : []),
          ...(Array.isArray(incomingModule.labels) ? incomingModule.labels : [])
        ]).sort(compareLabels),
        sourceCounts: {
          ...(previous.sourceCounts && typeof previous.sourceCounts === "object" ? previous.sourceCounts : {}),
          ...(incomingModule.sourceCounts && typeof incomingModule.sourceCounts === "object" ? incomingModule.sourceCounts : {})
        },
        nativeModuleSlug: cleanText(incomingModule.nativeModuleSlug || previous.nativeModuleSlug || ""),
        nativeIds: mergeNativeIdMaps(previous.nativeIds, incomingModule.nativeIds)
      };
    }
    return normalizeImportedLabelRepository({
      ...base,
      updatedAt: cleanText(incoming.updatedAt || base.updatedAt || new Date().toISOString()),
      modalities: unique([
        ...normalizeStringList(base.modalities || []),
        ...normalizeStringList(incoming.modalities || [])
      ]),
      labels: mergeGlobalLabelEntries(base.labels, incoming.labels),
      moduleLabels
    });
  }

  function mergeGlobalLabelEntries(baseLabels = [], incomingLabels = []) {
    const byKey = new Map();
    for (const entry of [...baseLabels, ...incomingLabels]) {
      const preferredLabel = cleanText(entry?.preferredLabel || entry?.label || entry?.name || entry || "");
      const key = normalizeText(preferredLabel);
      if (!key) continue;
      const previous = byKey.get(key) || {};
      byKey.set(key, {
        ...previous,
        ...entry,
        preferredLabel,
        aliases: unique([...(previous.aliases || []), ...normalizeStringList(entry?.aliases || entry?.synonyms)]),
        modalities: unique([...(previous.modalities || []), ...normalizeStringList(entry?.modalities || entry?.modality)]),
        regions: unique([...(previous.regions || []), ...normalizeStringList(entry?.regions || entry?.region)]),
        status: cleanText(entry?.status || previous.status || "verified"),
        notes: cleanText(entry?.notes || entry?.note || previous.notes || "")
      });
    }
    return Array.from(byKey.values()).sort((a, b) => compareLabels(a.preferredLabel, b.preferredLabel));
  }

  function mergeLabelDetailRepositories(baseRepository, incomingRepository) {
    const base = normalizeImportedLabelDetailRepository(baseRepository);
    const incoming = normalizeImportedLabelDetailRepository(incomingRepository);
    const moduleDetails = { ...(base.moduleDetails || {}) };
    for (const [moduleKey, incomingModule] of Object.entries(incoming.moduleDetails || {})) {
      const previous = moduleDetails[moduleKey] || {};
      moduleDetails[moduleKey] = {
        ...previous,
        ...incomingModule,
        detailsByLabel: {
          ...(previous.detailsByLabel && typeof previous.detailsByLabel === "object" ? previous.detailsByLabel : {}),
          ...(incomingModule.detailsByLabel && typeof incomingModule.detailsByLabel === "object" ? incomingModule.detailsByLabel : {})
        }
      };
    }
    return normalizeImportedLabelDetailRepository({
      ...base,
      updatedAt: cleanText(incoming.updatedAt || base.updatedAt || new Date().toISOString()),
      moduleDetails
    });
  }

  function mergeNativeIdMaps(baseMap, incomingMap) {
    const merged = normalizeNativeIdMap(baseMap || {});
    const incoming = normalizeNativeIdMap(incomingMap || {});
    for (const [key, ids] of Object.entries(incoming)) {
      merged[key] = uniqueNativeIds([...(merged[key] || []), ...ids]);
    }
    return merged;
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

  function getLabelDetailRepositoryStats(repository) {
    const moduleDetails = repository?.moduleDetails && typeof repository.moduleDetails === "object"
      ? repository.moduleDetails
      : {};
    const modules = Object.values(moduleDetails)
      .filter((module) => module && module.details && Object.keys(module.details).length);
    const detailCount = modules.reduce((total, module) => total + Object.keys(module.details || {}).length, 0);
    return {
      moduleCount: modules.length,
      detailCount
    };
  }

  function normalizeStringList(value) {
    if (Array.isArray(value)) return value.map((item) => cleanText(item)).filter(Boolean);
    if (typeof value === "string") return value.split(/\r?\n|[|;]/).map((item) => cleanText(item)).filter(Boolean);
    return value ? [cleanText(value)].filter(Boolean) : [];
  }

  function uniqueNativeIds(values) {
    const rawItems = Array.isArray(values) ? values : [values];
    const ids = [];
    const seen = new Set();
    for (const item of rawItems) {
      const value = item && typeof item === "object"
        ? item.id ?? item.nativeId ?? item.structureId ?? item.value
        : item;
      const id = Number.parseInt(String(value ?? "").trim(), 10);
      if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    return ids;
  }

  function normalizeNativeIdMap(value) {
    const map = {};
    if (!value || typeof value !== "object") return map;
    for (const [key, idsValue] of Object.entries(value)) {
      const normalizedKey = normalizeText(key);
      if (!normalizedKey) continue;
      const ids = uniqueNativeIds(idsValue);
      if (ids.length) map[normalizedKey] = ids;
    }
    return map;
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
      if (options.mapNativeIds !== false) {
        await mapNativeIdsForLabels(exportData.labels, {
          sourceLabel: "Harvest native IDs",
          skipExisting: true,
          copyProbe: false,
          clearAtEnd: true,
          completionPrefix: `Harvest saved ${saveResult.afterCount} verified labels.`
        });
      }
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

  async function backupLabelDetailRepositoryToDownloads(source = "") {
    if (!chrome?.runtime?.sendMessage) {
      return { ok: false, error: "Extension messaging is unavailable." };
    }
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: "BACKUP_IMAIOS_LABEL_DETAIL_REPOSITORY",
        repository: state.labelDetailRepository,
        source,
        snapshot: false
      }, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          resolve({ ok: false, error: error.message || String(error) });
          return;
        }
        if (!response?.ok) {
          resolve({ ok: false, error: response?.error || "unknown definition backup error" });
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
      nativeModuleSlug: cleanText(previous.nativeModuleSlug || previous.nativeSlug || previous.imaiosNativeSlug || ""),
      nativeIds: normalizeNativeIdMap(previous.nativeIds || previous.nativeLabelIds || previous.labelNativeIds || {}),
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
      url: getCurrentUrlWithoutHash(),
      pathname: location.pathname
    };
  }

  function getCurrentUrlWithoutHash() {
    const url = new URL(location.href);
    url.hash = "";
    return url.toString();
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

  async function copyCurrentAnkiVideoHtml() {
    const range = getSuggestedCineRange();
    const pinsMeta = buildCineRecordingMetadata(range, "pins");
    const labelsMeta = buildCineRecordingMetadata(range, "labels");
    await writeClipboard(buildAnkiVideoPairHtml(pinsMeta.filename, labelsMeta.filename));
    setStatus(`Copied Anki video HTML for ${pinsMeta.filename} and ${labelsMeta.filename}.`);
  }

  async function recordCurrentCineForAnki() {
    if (state.recordingCine) {
      setStatus("Cine recording is already running.");
      return;
    }
    const result = getValidCineRange();
    if (!result.ok) {
      setStatus(`${result.reason} Apply/lock a chunk first, then record.`, 8000);
      return;
    }
    if (!window.MediaRecorder) {
      setStatus("MediaRecorder is not available in this browser.", 9000);
      return;
    }

    state.recordingCine = true;
    refreshPanel();
    const recordingPlanes = getRecordingPlanesForScope(state.recordPlaneScope);
    let stream = null;
    let croppedCapture = null;
    const previousHostDisplay = state.host ? state.host.style.display : "";
    try {
      setStatus("Choose the current IMAIOS tab/window to record...", 0);
      stream = await requestCineCaptureStream();

      setStatus("Expanding viewer for cine capture...", 0);
      await ensureViewerFullscreenForRecording();
      await delay(500);

      if (state.host) state.host.style.display = "none";
      await delay(150);
      croppedCapture = await createCroppedCineCaptureStream(stream);
      const recordingStream = croppedCapture.stream;
      stopRangeCine({ quiet: true });

      const recordings = [];
      const skipped = [];
      for (const plane of recordingPlanes) {
        const planeLabel = normalizePlaneName(plane) || normalizePlaneName(getSeriesInfo().selectedPlane) || "current";
        if (normalizePlaneName(plane)) {
          setStatus(`Switching to ${planeLabel} for cine capture...`, 0);
          const switched = await switchPlane(planeLabel, { quiet: true });
          if (!switched?.ok) {
            skipped.push(`${planeLabel}: ${switched?.reason || "not available"}`);
            continue;
          }
          await delay(700);
        }

        const planeRangeResult = getValidCineRange();
        if (!planeRangeResult.ok) {
          skipped.push(`${planeLabel}: ${planeRangeResult.reason}`);
          continue;
        }

        const pinsMeta = buildCineRecordingMetadata(planeRangeResult.range, "pins", planeLabel);
        const labelsMeta = buildCineRecordingMetadata(planeRangeResult.range, "labels", planeLabel);
        const pinsDownload = await recordCineVariantForAnki(recordingStream, pinsMeta, async () => {
          await resetQuietPinsByCyclingPins();
        });
        const labelsDownload = await recordCineVariantForAnki(recordingStream, labelsMeta, async () => {
          await setPinsMode(false, { openPanel: true });
        });
        recordings.push({ plane: pinsMeta.plane, pinsMeta, labelsMeta, pinsDownload, labelsDownload });
      }

      if (!recordings.length) {
        throw new Error(`No planes were recorded. ${skipped.join(" ")}`.trim());
      }

      const html = buildAnkiVideoSetHtml(recordings);
      const tsv = buildAnkiCineSetTsv(recordings, html);
      const notes = buildAnkiCineSetNotes(recordings, html, skipped);
      const indexPaths = buildAnkiCineSetIndexPaths(recordings, state.recordPlaneScope);
      await downloadTextAsFile(tsv, indexPaths.tsvPath, "text/tab-separated-values;charset=utf-8");
      await downloadTextAsFile(notes, indexPaths.notesPath, "text/plain;charset=utf-8");
      await writeClipboard(html);
      await resetQuietPinsByCyclingPins();
      const routedPath = recordings[0].pinsDownload.routedFilename || recordings[0].pinsDownload.filename || recordings[0].pinsMeta.downloadPath;
      const routedFolder = String(routedPath).replace(/[\\\/][^\\\/]*$/, "").replace(/\//g, "\\");
      const skippedText = skipped.length ? ` Skipped ${skipped.length}: ${skipped.join("; ")}.` : "";
      setStatus(`Saved ${recordings.length} cine pair${recordings.length === 1 ? "" : "s"} to ${routedFolder || `Downloads\\${recordings[0].pinsMeta.folder.replace(/\//g, "\\")}`}. Copied Anki HTML.${skippedText}`, 14000);
    } catch (error) {
      stopRangeCine({ quiet: true });
      setStatus(`Cine recording failed: ${error?.message || error}`, 12000);
    } finally {
      if (croppedCapture) croppedCapture.cleanup();
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (state.host) state.host.style.display = previousHostDisplay;
      state.recordingCine = false;
      refreshPanel();
    }
  }

  function getRecordingPlanesForScope(scope) {
    return getPlanesForScope(scope);
  }

  async function recordCineVariantForAnki(stream, meta, prepareViewer) {
    const mimeType = getSupportedVideoMimeType();
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 3000000
    });
    const chunks = [];
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size) chunks.push(event.data);
    });

    const stopped = new Promise((resolve, reject) => {
      recorder.addEventListener("stop", resolve, { once: true });
      recorder.addEventListener("error", (event) => reject(event.error || new Error("MediaRecorder failed.")), { once: true });
    });

    setStatus(`Preparing ${meta.variantLabel} cine...`, 0);
    await prepareViewer();
    stopRangeCine({ quiet: true });
    await setViewerSlice(meta.range.startSlice);
    await delay(450);

    recorder.start(250);
    setStatus(`Recording ${meta.variantLabel} cine...`, 0);
    await playRangeOnceForward(meta.range, meta.sliceHoldMs);
    await delay(350);
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;

    const blob = new Blob(chunks, { type: mimeType || "video/webm" });
    if (!blob.size) throw new Error(`${meta.variantLabel} recording produced an empty video.`);
    return downloadDataUrl(await blobToDataUrl(blob), meta.downloadPath);
  }

  async function requestCineCaptureStream() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen/tab capture is not available in this browser.");
    }
    try {
      return await navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: {
          frameRate: { ideal: 30, max: 30 },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        preferCurrentTab: true,
        selfBrowserSurface: "include"
      });
    } catch (error) {
      const message = String(error?.message || error || "");
      if (/denied|dismissed|cancel|notallowed/i.test(message) || error?.name === "NotAllowedError") {
        throw new Error("Recording was cancelled or blocked. Click Record pair again and choose the current IMAIOS tab/window.");
      }
      throw error;
    }
  }

  async function createCroppedCineCaptureStream(sourceStream) {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = sourceStream;
    video.style.cssText = "position:fixed;left:-99999px;top:-99999px;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.documentElement.appendChild(video);
    await new Promise((resolve, reject) => {
      video.addEventListener("loadedmetadata", resolve, { once: true });
      video.addEventListener("error", () => reject(video.error || new Error("Could not initialize capture video.")), { once: true });
    });
    await video.play();

    const crop = getCineCropRect();
    const scaleX = video.videoWidth / Math.max(1, window.innerWidth);
    const scaleY = video.videoHeight / Math.max(1, window.innerHeight);
    const sourceRect = {
      x: Math.max(0, Math.round(crop.left * scaleX)),
      y: Math.max(0, Math.round(crop.top * scaleY)),
      width: Math.min(video.videoWidth, Math.round(crop.width * scaleX)),
      height: Math.min(video.videoHeight, Math.round(crop.height * scaleY))
    };
    sourceRect.width = Math.max(64, Math.min(sourceRect.width, video.videoWidth - sourceRect.x));
    sourceRect.height = Math.max(64, Math.min(sourceRect.height, video.videoHeight - sourceRect.y));

    const canvas = document.createElement("canvas");
    canvas.width = sourceRect.width;
    canvas.height = sourceRect.height;
    canvas.style.cssText = "position:fixed;left:-99999px;top:-99999px;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.documentElement.appendChild(canvas);
    const context = canvas.getContext("2d", { alpha: false });
    let stopped = false;
    const draw = () => {
      if (stopped) return;
      try {
        context.drawImage(
          video,
          sourceRect.x,
          sourceRect.y,
          sourceRect.width,
          sourceRect.height,
          0,
          0,
          canvas.width,
          canvas.height
        );
      } catch (_error) {
        // The capture stream can briefly resize during fullscreen transitions.
      }
      requestAnimationFrame(draw);
    };
    draw();

    const stream = canvas.captureStream(30);
    return {
      stream,
      cleanup() {
        stopped = true;
        stream.getTracks().forEach((track) => track.stop());
        video.remove();
        canvas.remove();
      }
    };
  }

  function getCineCropRect() {
    const viewport = {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight
    };
    const menu = findVisibleViewerMenu();
    if (menu) {
      const rect = menu.getBoundingClientRect();
      if (rect.left > window.innerWidth * 0.45) viewport.right = Math.max(320, Math.round(rect.left));
    }
    const browserShareNotice = Array.from(document.body.querySelectorAll("div,section"))
      .filter((element) => element !== state.host && isVisible(element))
      .map((element) => element.getBoundingClientRect())
      .find((rect) => rect.top > window.innerHeight * 0.78 && rect.height < 90 && rect.width > window.innerWidth * 0.4);
    if (browserShareNotice) viewport.bottom = Math.min(viewport.bottom, Math.max(320, Math.round(browserShareNotice.top)));
    return {
      left: viewport.left,
      top: viewport.top,
      width: Math.max(320, viewport.right - viewport.left),
      height: Math.max(240, viewport.bottom - viewport.top)
    };
  }

  function findVisibleViewerMenu() {
    const candidates = Array.from(document.body.querySelectorAll(
      "nav.menu-viewer,.menu-viewer,nav[class*='menu-viewer'],[class*='menu-viewer']"
    ))
      .filter((element) => element !== state.host && isVisible(element))
      .filter((element) => /labeling|display mode|advanced settings|anatomical parts|window/i.test(element.textContent || ""));
    candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return br.left - ar.left;
    });
    return candidates[0] || null;
  }

  function getSupportedVideoMimeType() {
    const candidates = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  function buildCineRecordingMetadata(range, variant = "pins", planeOverride = "") {
    const chunk = getActiveChunk();
    const seriesInfo = getSeriesInfo();
    const plane = normalizePlaneName(planeOverride) || normalizePlaneName(seriesInfo.selectedPlane) || "current";
    const chunkTitle = chunk?.title || "IMAIOS cine";
    const articleTitle = getCurrentModuleName() || document.title || "IMAIOS";
    const articleSlug = createSlug(articleTitle) || "imaios-module";
    const chunkSlug = createSlug(chunkTitle) || "chunk";
    const rangeSlug = `${plane.toLowerCase()}_${range.startSlice || "start"}-${range.endSlice || "end"}`;
    const base = createSlug(`${rangeSlug}`) || `cine-${Date.now()}`;
    const variantSlug = variant === "labels" ? "labels" : "pins";
    const filename = `${base}_${variantSlug}.webm`;
    const folder = `IMAIOS/Cines/${articleSlug}/${chunkSlug}`;
    const sliceHoldMs = ANKI_CINE_SLICE_HOLD_MS;
    const durationMs = getCineRecordingDurationMs(range, sliceHoldMs);
    return {
      moduleName: articleTitle,
      articleTitle,
      chunkTitle,
      plane,
      range,
      durationMs,
      sliceHoldMs,
      variant: variantSlug,
      variantLabel: variantSlug === "labels" ? "labels" : "pins",
      filename,
      base,
      folder,
      downloadPath: `${folder}/${filename}`,
      tsvPath: `${folder}/${base}_anki.tsv`,
      notesPath: `${folder}/${base}_anki_html.txt`
    };
  }

  function getCineRecordingDurationMs(range, sliceHoldMs = ANKI_CINE_SLICE_HOLD_MS) {
    const frameCount = Math.max(1, Number(range.frameCount) || 1);
    return Math.max(1800, Math.round(frameCount * sliceHoldMs + 700));
  }

  function buildAnkiVideoHtml(filename) {
    return `<video controls preload="metadata" style="max-width:100%;height:auto;" src="${escapeHtml(filename)}"></video>`;
  }

  function buildAnkiVideoPairHtml(pinsFilename, labelsFilename) {
    return [
      `<div class="imaios-cine-pair">`,
      `<div><strong>Pins</strong><br>${buildAnkiVideoHtml(pinsFilename)}</div>`,
      `<div><strong>Labels</strong><br>${buildAnkiVideoHtml(labelsFilename)}</div>`,
      `</div>`
    ].join("");
  }

  function buildAnkiVideoSetHtml(recordings) {
    if (!Array.isArray(recordings) || !recordings.length) return "";
    if (recordings.length === 1) {
      return buildAnkiVideoPairHtml(recordings[0].pinsMeta.filename, recordings[0].labelsMeta.filename);
    }
    return [
      `<div class="imaios-cine-set">`,
      ...recordings.map((item) => [
        `<section class="imaios-cine-plane">`,
        `<h4>${escapeHtml(item.pinsMeta.plane)}</h4>`,
        buildAnkiVideoPairHtml(item.pinsMeta.filename, item.labelsMeta.filename),
        `</section>`
      ].join("")),
      `</div>`
    ].join("");
  }

  function buildAnkiCineTsv(meta, html, labelsMeta = null) {
    return [
      ["Module", "Chunk", "Plane", "Range", "SliceHoldMs", "PinsFile", "LabelsFile", "VideoHtml"],
      [
        meta.moduleName,
        meta.chunkTitle,
        meta.plane,
        `${meta.range.startSlice || ""}-${meta.range.endSlice || ""}`,
        meta.sliceHoldMs,
        meta.filename,
        labelsMeta?.filename || "",
        html
      ]
    ].map((row) => row.map(tsvCell).join("\t")).join("\n");
  }

  function buildAnkiCineSetTsv(recordings, html) {
    const header = ["Module", "Chunk", "Plane", "Range", "SliceHoldMs", "PinsFile", "LabelsFile", "VideoHtml"];
    const rows = recordings.map((item) => [
      item.pinsMeta.moduleName,
      item.pinsMeta.chunkTitle,
      item.pinsMeta.plane,
      `${item.pinsMeta.range.startSlice || ""}-${item.pinsMeta.range.endSlice || ""}`,
      item.pinsMeta.sliceHoldMs,
      item.pinsMeta.filename,
      item.labelsMeta.filename,
      recordings.length === 1 ? html : buildAnkiVideoPairHtml(item.pinsMeta.filename, item.labelsMeta.filename)
    ]);
    if (recordings.length > 1) {
      rows.push([
        recordings[0].pinsMeta.moduleName,
        recordings[0].pinsMeta.chunkTitle,
        "All recorded planes",
        "",
        recordings[0].pinsMeta.sliceHoldMs,
        "",
        "",
        html
      ]);
    }
    return [header, ...rows].map((row) => row.map(tsvCell).join("\t")).join("\n");
  }

  function buildAnkiCineNotes(meta, html, labelsMeta = null) {
    return [
      "IMAIOS Anki Cine",
      `Module: ${meta.moduleName}`,
      `Chunk: ${meta.chunkTitle}`,
      `Plane: ${meta.plane}`,
      `Range: ${meta.range.startSlice || ""}-${meta.range.endSlice || ""}`,
      `Slice hold: ${meta.sliceHoldMs} ms per slice`,
      `Pins media file: ${meta.filename}`,
      labelsMeta ? `Labels media file: ${labelsMeta.filename}` : "",
      "",
      "Anki HTML:",
      html,
      "",
      "Copy the WebM into Anki media or import the TSV after placing the media file where Anki can find it."
    ].join("\n");
  }

  function buildAnkiCineSetNotes(recordings, html, skipped = []) {
    const first = recordings[0]?.pinsMeta;
    return [
      "IMAIOS Anki Cine Set",
      `Module: ${first?.moduleName || ""}`,
      `Chunk: ${first?.chunkTitle || ""}`,
      `Planes: ${recordings.map((item) => item.pinsMeta.plane).join(", ")}`,
      `Slice hold: ${first?.sliceHoldMs || ""} ms per slice`,
      skipped.length ? `Skipped: ${skipped.join("; ")}` : "",
      "",
      ...recordings.flatMap((item) => [
        `${item.pinsMeta.plane}: ${item.pinsMeta.range.startSlice || ""}-${item.pinsMeta.range.endSlice || ""}`,
        `Pins media file: ${item.pinsMeta.filename}`,
        `Labels media file: ${item.labelsMeta.filename}`
      ]),
      "",
      "Anki HTML:",
      html,
      "",
      "Copy the WebM files into Anki media or import the TSV after placing the media files where Anki can find them."
    ].filter((line) => line !== "").join("\n");
  }

  function buildAnkiCineSetIndexPaths(recordings, scope) {
    const first = recordings[0]?.pinsMeta;
    const planes = recordings.map((item) => item.pinsMeta.plane).join("_");
    const base = createSlug(`${scope || "current"}_${planes || "cine"}_anki`) || `cine_${Date.now()}_anki`;
    const folder = first?.folder || "IMAIOS/Cines/imaios-module/chunk";
    return {
      tsvPath: `${folder}/${base}.tsv`,
      notesPath: `${folder}/${base}_html.txt`
    };
  }

  function tsvCell(value) {
    return String(value ?? "").replace(/\t/g, " ").replace(/\r?\n/g, "<br>");
  }

  async function downloadTextAsFile(text, filename, mimeType = "text/plain;charset=utf-8") {
    const dataUrl = `data:${mimeType},${encodeURIComponent(text)}`;
    return downloadDataUrl(dataUrl, filename);
  }

  async function downloadDataUrl(url, filename) {
    const response = await chrome.runtime.sendMessage({
      type: "IMAIOS_DOWNLOAD_DATA_URL",
      url,
      filename
    });
    if (!response?.ok) throw new Error(response?.error || `Could not download ${filename}.`);
    return response;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result || "")), { once: true });
      reader.addEventListener("error", () => reject(reader.error || new Error("Could not read video blob.")), { once: true });
      reader.readAsDataURL(blob);
    });
  }

  async function ensureViewerFullscreenForRecording() {
    pressGlobalKey("f", "KeyF");
    await delay(850);
    if (looksLikeViewerFullscreen()) return { ok: true, method: "keyboard" };

    const button = findViewerFullscreenButton();
    if (!button) return { ok: false, reason: "Could not find the IMAIOS fullscreen button." };
    const text = cleanText(button.getAttribute("title") || button.getAttribute("aria-label") || button.textContent || "");
    if (/exit|restore|leave/i.test(text)) return { ok: true, already: true };
    await realMouseClick(button, 0.5, 0.5);
    await delay(750);
    return { ok: true, clicked: true };
  }

  function pressGlobalKey(key, code = key) {
    const active = document.activeElement;
    if (active && typeof active.blur === "function") active.blur();
    const eventBase = {
      key,
      code,
      bubbles: true,
      cancelable: true,
      view: window
    };
    const targets = [document.body, document.documentElement, document, window].filter(Boolean);
    for (const target of targets) {
      target.dispatchEvent(new KeyboardEvent("keydown", eventBase));
      target.dispatchEvent(new KeyboardEvent("keyup", eventBase));
    }
  }

  function looksLikeViewerFullscreen() {
    const menu = findVisibleViewerMenu();
    const menuLeft = menu ? menu.getBoundingClientRect().left : window.innerWidth;
    const darkAreaWidth = menuLeft;
    return darkAreaWidth > window.innerWidth * 0.68 && window.innerHeight > 520;
  }

  function findViewerFullscreenButton() {
    const candidates = Array.from(document.body.querySelectorAll(
      "button.button-fullscreen,button[title*='Fullscreen'],button[aria-label*='Fullscreen'],[role='button'][title*='Fullscreen']"
    ))
      .filter((element) => element !== state.host && isVisible(element));
    candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const aScore = (a.matches("button.button-fullscreen") ? 30 : 0) + ar.left / 100 + ar.top / 100;
      const bScore = (b.matches("button.button-fullscreen") ? 30 : 0) + br.left / 100 + br.top / 100;
      return bScore - aScore;
    });
    return candidates[0] || null;
  }

  async function playRangeOnceForward(range, sliceHoldMs = state.rangeCineIntervalMs) {
    stopRangeCine({ quiet: true });
    const start = Math.round(Number(range.startSlice));
    const end = Math.round(Number(range.endSlice));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      throw new Error("The cine range is invalid.");
    }
    for (let slice = start; slice <= end; slice += 1) {
      const moved = await setViewerSlice(slice);
      if (!moved.ok) throw new Error(moved.reason || `Could not set slice ${slice}.`);
      await delay(sliceHoldMs);
    }
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

  function runImaiosPageContextProbe(mode = "generic", options = {}, timeoutMs = 9000) {
    return new Promise((resolve) => {
      const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const source = `${APP_ID}:page-context-probe`;
      let settled = false;
      const cleanup = () => {
        window.removeEventListener("message", onMessage, true);
        clearTimeout(timer);
        if (script && script.parentNode) script.remove();
      };
      const finish = (payload) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(payload);
      };
      const onMessage = (event) => {
        if (event.source !== window) return;
        const data = event.data || {};
        if (data.source !== source || data.nonce !== nonce) return;
        finish(data.payload || { ok: false, error: "Empty page-context payload." });
      };
      const script = document.createElement("script");
      const timer = setTimeout(() => {
        finish({ ok: false, error: `Timed out waiting for page-context probe: ${mode}` });
      }, timeoutMs);
      window.addEventListener("message", onMessage, true);
      script.src = chrome.runtime.getURL("imaios-page-context-probe.js");
      script.dataset.source = source;
      script.dataset.nonce = nonce;
      script.dataset.mode = mode;
      script.dataset.stage = mode;
      script.dataset.options = JSON.stringify(options || {});
      script.onload = () => setTimeout(() => script.remove(), 0);
      script.onerror = () => finish({ ok: false, error: `Could not load page-context probe: ${mode}` });
      (document.documentElement || document.head || document.body).appendChild(script);
    });
  }

  async function copyNativeActionDiscoveryProbe() {
    if (state.searchRunning) {
      setStatus("Search is already running. Stop it before probing native action discovery.", 7000);
      return;
    }
    setStatus("Discovering reachable IMAIOS native action candidates...", 0);
    const lockedLabels = await collectLockedStructureNames();
    const labelCandidates = collectNativeRestoreProbeLabels(lockedLabels);
    const pageContext = await runImaiosPageContextProbe("native-action-discovery", {
      labels: labelCandidates.slice(0, 30),
      module: getCurrentModuleInfo(),
      series: getSeriesInfo(),
      slice: getSliceInfo()
    }, 14000);
    const probe = {
      kind: "imaios-native-action-discovery-probe",
      version: 1,
      buildTag: DEBUG_BUILD_TAG,
      createdAt: new Date().toISOString(),
      pageTitle: document.title,
      url: location.href,
      module: getCurrentModuleInfo(),
      series: getSeriesInfo(),
      slice: getSliceInfo(),
      lockedLabels,
      labelCandidates,
      lockedCount: getLockedStructureCount(),
      nativeLocked: getCurrentNativeLockedStructureState(),
      contentWorld: {
        lockedButton: findLockedStructuresButton() ? elementDeepProbe(findLockedStructuresButton()) : null,
        lockedPanel: findLockedStructuresPanel() ? elementDeepProbe(findLockedStructuresPanel()) : null,
        searchInput: findModuleSearchInput() ? elementDeepProbe(findModuleSearchInput()) : null,
        visibleLabels: getVisibleLabelElements().slice(0, 40),
        pinLikeElements: getPinLikeElements().slice(0, 60),
        appStateHints: getAppStateHints()
      },
      pageContext
    };
    await writeClipboard(JSON.stringify(probe, null, 2));
    const componentCount = Array.isArray(pageContext?.vueComponents) ? pageContext.vueComponents.length : 0;
    const functionCount = Array.isArray(pageContext?.globalFunctionCandidates) ? pageContext.globalFunctionCandidates.length : 0;
    setStatus(`Native action discovery copied: ${componentCount} Vue component candidates, ${functionCount} global function candidates.`, 14000);
  }

  async function copyNativeBundleSearchProbe() {
    if (state.searchRunning) {
      setStatus("Search is already running. Stop it before probing IMAIOS bundles.", 7000);
      return;
    }
    setStatus("Searching loaded IMAIOS bundles for lock/isolate internals...", 0);
    const lockedLabels = await collectLockedStructureNames();
    const labelCandidates = collectNativeRestoreProbeLabels(lockedLabels);
    const pageContext = await runImaiosPageContextProbe("native-bundle-search", {
      labels: labelCandidates.slice(0, 30),
      module: getCurrentModuleInfo(),
      series: getSeriesInfo(),
      slice: getSliceInfo(),
      maxScripts: 28
    }, 24000);
    const probe = {
      kind: "imaios-native-bundle-search-probe",
      version: 1,
      buildTag: DEBUG_BUILD_TAG,
      createdAt: new Date().toISOString(),
      pageTitle: document.title,
      url: location.href,
      module: getCurrentModuleInfo(),
      series: getSeriesInfo(),
      slice: getSliceInfo(),
      lockedLabels,
      labelCandidates,
      lockedCount: getLockedStructureCount(),
      nativeLocked: getCurrentNativeLockedStructureState(),
      pageContext
    };
    await writeClipboard(JSON.stringify(probe, null, 2));
    const results = Array.isArray(pageContext?.results) ? pageContext.results : [];
    const hitScripts = results.filter((item) => Array.isArray(item.hits) && item.hits.length).length;
    const hitTerms = results.reduce((sum, item) => sum + (Array.isArray(item.hits) ? item.hits.length : 0), 0);
    setStatus(`Bundle search copied: ${hitScripts} script${hitScripts === 1 ? "" : "s"} with ${hitTerms} matching term group${hitTerms === 1 ? "" : "s"}.`, 16000);
  }

  async function startNativeActionTraceProbe() {
    setStatus("Starting native action trace. Now manually lock one structure, then click Copy trace.", 0);
    const lockedLabels = await collectLockedStructureNames();
    const labelCandidates = collectNativeRestoreProbeLabels(lockedLabels);
    const pageContext = await runImaiosPageContextProbe("native-action-trace-start", {
      labels: labelCandidates.slice(0, 30),
      module: getCurrentModuleInfo(),
      series: getSeriesInfo(),
      slice: getSliceInfo()
    }, 9000);
    if (!pageContext?.ok) {
      setStatus(`Native action trace did not start: ${pageContext?.error || pageContext?.reason || "unknown error"}`, 12000);
      return;
    }
    setStatus("Trace is running. Manually lock one label now, then click Copy trace.", 20000);
  }

  async function copyNativeActionTraceProbe() {
    setStatus("Copying native action trace...", 0);
    const pageContext = await runImaiosPageContextProbe("native-action-trace-stop", {
      module: getCurrentModuleInfo(),
      series: getSeriesInfo(),
      slice: getSliceInfo()
    }, 22000);
    const probe = {
      kind: "imaios-native-action-trace-probe",
      version: 1,
      buildTag: DEBUG_BUILD_TAG,
      createdAt: new Date().toISOString(),
      pageTitle: document.title,
      url: location.href,
      module: getCurrentModuleInfo(),
      series: getSeriesInfo(),
      slice: getSliceInfo(),
      lockedLabels: await collectLockedStructureNames(),
      lockedCount: getLockedStructureCount(),
      nativeLocked: getCurrentNativeLockedStructureState(),
      pageContext
    };
    await writeClipboard(JSON.stringify(probe, null, 2));
    const recordCount = Number(pageContext?.recordCount || pageContext?.records?.length || 0);
    setStatus(pageContext?.ok === false
      ? `Native action trace copied with warning: ${pageContext.reason || pageContext.error || "no trace found"}`
      : `Native action trace copied: ${recordCount} records.`, 14000);
  }

  async function copyNativeRestoreProbe() {
    if (state.searchRunning) {
      setStatus("Search is already running. Stop it before probing native restore state.", 7000);
      return;
    }
    const lockedLabels = await collectLockedStructureNames();
    const labelCandidates = collectNativeRestoreProbeLabels(lockedLabels);
    const nativeLocked = getCurrentNativeLockedStructureState();
    setStatus(`Probing native IMAIOS restore state${labelCandidates.length ? ` for ${labelCandidates.length} label candidates` : ""}...`, 0);
    state.searchRunning = true;
    const searchProbes = [];
    try {
      const labelsToSearch = labelCandidates.slice(0, 8);
      for (const label of labelsToSearch) {
        searchProbes.push(await probeSearchResultElement(label));
        await delay(120);
      }
      const input = findModuleSearchInput();
      if (input) {
        await clearSearchInput(input);
      }
    } finally {
      state.searchRunning = false;
    }

    const probe = {
      kind: "imaios-native-lock-restore-probe",
      version: 1,
      createdAt: new Date().toISOString(),
      pageTitle: document.title,
      url: location.href,
      module: getCurrentModuleInfo(),
      series: getSeriesInfo(),
      slice: getSliceInfo(),
      lockedLabels,
      labelCandidates,
      lockedCount: getLockedStructureCount(),
      nativeLocked,
      lockedPanel: findLockedStructuresPanel() ? elementDeepProbe(findLockedStructuresPanel()) : null,
      lockedButton: findLockedStructuresButton() ? elementDeepProbe(findLockedStructuresButton()) : null,
      searchInput: findModuleSearchInput() ? elementDeepProbe(findModuleSearchInput()) : null,
      searchProbes,
      visibleLabels: getVisibleLabelElements().slice(0, 40),
      pinLikeElements: getPinLikeElements().slice(0, 60),
      storage: getNativeRestoreStorageSnapshot(lockedLabels),
      indexedDb: await getIndexedDbProbe(),
      historyState: compactProbeValue(history.state),
      appStateHints: getAppStateHints()
    };
    await writeClipboard(JSON.stringify(probe, null, 2));
    const hitCount = countNativeRestoreStorageHits(probe.storage);
    setStatus(`Native restore probe copied: ${hitCount} storage hit${hitCount === 1 ? "" : "s"}, ${searchProbes.filter((item) => item.ok).length}/${searchProbes.length} search result probes.`, 14000);
  }

  function collectNativeRestoreProbeLabels(lockedLabels = []) {
    const chunk = getActiveChunk();
    const chunkLabels = chunk ? getChunkLabelTargets(chunk).map((target) => target.preferredLabel) : [];
    return unique([
      ...(lockedLabels || []),
      ...(state.selectedStructures || []),
      ...parseCustomListSafe(),
      ...chunkLabels
    ].map(cleanText).filter(Boolean));
  }

  function getCurrentNativeLockedStructureState() {
    const store = parseStorageValue(localStorage.getItem("im_viewer_locked_structures"));
    const currentSlug = getCurrentNativeViewerModuleSlug(store);
    const ids = currentSlug && store && typeof store === "object" && Array.isArray(store[currentSlug])
      ? store[currentSlug]
      : [];
    return {
      storageKey: "im_viewer_locked_structures",
      currentSlug,
      ids,
      idCount: ids.length,
      allModuleSlugs: store && typeof store === "object" ? Object.keys(store) : []
    };
  }

  function getCurrentNativeViewerModuleSlug(store = null) {
    const lastModule = cleanText(parseStorageValue(localStorage.getItem("viewer-last-module")) || "");
    if (lastModule) return lastModule;
    const seriesSeen = parseStorageValue(localStorage.getItem("im_viewer_last_series_seen"));
    const lockedStore = store || parseStorageValue(localStorage.getItem("im_viewer_locked_structures"));
    const moduleKey = normalizeModuleKey(getCurrentModuleKey());
    const candidates = unique([
      ...Object.keys(seriesSeen && typeof seriesSeen === "object" ? seriesSeen : {}),
      ...Object.keys(lockedStore && typeof lockedStore === "object" ? lockedStore : {})
    ]);
    return candidates.find((candidate) => normalizeModuleKey(candidate) === moduleKey)
      || candidates.find((candidate) => moduleKey && normalizeModuleKey(candidate).includes(moduleKey.split("-").slice(-2).join("-")))
      || "";
  }

  async function probeSearchResultElement(label) {
    const result = {
      label,
      ok: false,
      selectedText: "",
      reason: "",
      input: null,
      resultElement: null,
      ancestors: []
    };
    const availability = await searchStructureAvailability(label, {
      exact: true,
      timeoutMs: 1400,
      intervalMs: 45,
      clearDelayMs: 25,
      afterTypeDelayMs: 40
    });
    result.input = availability.input ? elementDeepProbe(availability.input) : null;
    result.ok = Boolean(availability.ok);
    result.selectedText = cleanText(availability.selectedText || "");
    result.reason = availability.reason || "";
    if (availability.result) {
      result.resultElement = elementDeepProbe(availability.result);
      result.ancestors = getElementAncestorProbe(availability.result, 5);
    }
    return result;
  }

  async function copyNativeIdMapProbe() {
    if (state.searchRunning) {
      setStatus("Search is already running. Stop it before probing native IDs.", 7000);
      return;
    }
    const lockedLabels = await collectLockedStructureNames();
    const labelCandidates = collectNativeRestoreProbeLabels(lockedLabels);
    if (!labelCandidates.length) {
      setStatus("Select a chunk or add labels before running the native ID map probe.", 8000);
      return;
    }
    await mapNativeIdsForLabels(labelCandidates, {
      sourceLabel: "Native ID map",
      skipExisting: false,
      copyProbe: true,
      clearAtEnd: false
    });
  }

  async function mapCurrentModuleNativeIds() {
    if (state.searchRunning) {
      setStatus("Search is already running. Stop it before collecting module IDs.", 7000);
      return;
    }
    const saved = getSavedLabelsForCurrentModule();
    const savedLabels = Array.isArray(saved.labels) ? saved.labels : [];
    const visibleLabels = buildAvailableLabelsExport().labels || [];
    const labelCandidates = unique((savedLabels.length ? savedLabels : visibleLabels).map(cleanText).filter(Boolean)).sort(compareLabels);
    if (!labelCandidates.length) {
      setStatus("No saved labels for this module yet. Harvest labels first, then collect IDs.", 9000);
      return;
    }
    await mapNativeIdsForLabels(labelCandidates, {
      sourceLabel: "Module native IDs",
      skipExisting: true,
      copyProbe: true,
      clearAtEnd: true,
      completionPrefix: `Module label set: ${labelCandidates.length} label${labelCandidates.length === 1 ? "" : "s"}.`
    });
  }

  function getLabelsMissingNativeIds(labels, moduleKey = getCurrentModuleKey()) {
    return unique((labels || []).map(cleanText).filter(Boolean))
      .filter((label) => !getNativeIdsForLabel(label, moduleKey).ids.length);
  }

  async function mapNativeIdsForLabels(rawLabels, options = {}) {
    if (state.searchRunning) {
      setStatus("Search is already running. Stop it before collecting native IDs.", 7000);
      return { ok: false, reason: "Search is already running." };
    }

    const allCandidates = unique((rawLabels || []).map(cleanText).filter(Boolean)).sort(compareLabels);
    if (!allCandidates.length) {
      const message = "No labels were provided for native ID mapping.";
      setStatus(message, 8000);
      return { ok: false, reason: message };
    }
    const moduleKey = getCurrentModuleKey();
    const labelCandidates = options.skipExisting === false
      ? allCandidates
      : getLabelsMissingNativeIds(allCandidates, moduleKey).sort(compareLabels);
    const skippedExisting = allCandidates.length - labelCandidates.length;
    if (!labelCandidates.length) {
      const message = `${options.completionPrefix ? `${options.completionPrefix} ` : ""}All ${allCandidates.length} module label${allCandidates.length === 1 ? "" : "s"} already have native IDs.`;
      setStatus(message, 12000);
      return {
        ok: true,
        skippedExisting,
        mapped: 0,
        total: allCandidates.length,
        probe: null
      };
    }

    const initialNative = getCurrentNativeLockedStructureState();
    const results = [];
    const cleanup = [];
    state.searchRunning = true;
    state.cancelSearch = false;
    try {
      setStatus(`${options.sourceLabel || "Native ID map"}: clearing current locks before ${labelCandidates.length} label probe...`, 0);
      await closeStructureDetailPanel();
      const clearResult = await clearLockedStructuresForApply();
      cleanup.push({ step: "initial-clear", clearResult });
      if (!clearResult.ok) {
        throw new Error(clearResult.reason || "Could not clear locked structures before native ID mapping.");
      }
      await waitFor(() => getCurrentNativeLockedStructureState().idCount === 0 ? true : null, 1600, 80);
      await clearModuleSearchInputForProbe();

      for (let index = 0; index < labelCandidates.length; index += 1) {
        if (state.cancelSearch) break;
        const label = labelCandidates[index];
        const beforeNative = getCurrentNativeLockedStructureState();
        const skippedText = skippedExisting ? ` (${skippedExisting} already mapped)` : "";
        setStatus(`${options.sourceLabel || "Native ID map"} ${index + 1}/${labelCandidates.length}${skippedText}: ${label}`, 0);
        const searchResult = await searchAndClickStructure(label, {
          exact: true,
          allowFallback: false,
          closeDetailPanelAfterClick: true,
          timeoutMs: 1800,
          intervalMs: 45,
          clearDelayMs: 28,
          afterTypeDelayMs: 40
        });
        const afterNative = await waitFor(() => {
          const current = getCurrentNativeLockedStructureState();
          if (!searchResult.ok || current.ids.length > beforeNative.ids.length) return current;
          return null;
        }, 1800, 80) || getCurrentNativeLockedStructureState();
        const beforeSet = new Set(beforeNative.ids.map(String));
        const addedIds = afterNative.ids.filter((id) => !beforeSet.has(String(id)));
        results.push({
          label,
          ok: Boolean(searchResult.ok && addedIds.length),
          searchOk: Boolean(searchResult.ok),
          selectedText: cleanText(searchResult.selectedText || ""),
          reason: searchResult.reason || (addedIds.length ? "" : "No new native locked-structure ID appeared."),
          beforeIds: beforeNative.ids,
          afterIds: afterNative.ids,
          addedIds
        });
        await clearModuleSearchInputForProbe();
        await delay(120);
      }
      await closeStructureDetailPanel();
      await resetQuietPinsByCyclingPins();
      if (options.clearAtEnd) {
        const finalClearResult = await clearLockedStructuresForApply();
        cleanup.push({ step: "final-clear", clearResult: finalClearResult });
      }
    } catch (error) {
      results.push({
        label: "__probe_error__",
        ok: false,
        reason: error?.message || String(error)
      });
    } finally {
      state.searchRunning = false;
    }

    const finalNative = getCurrentNativeLockedStructureState();
    const mapped = results.filter((item) => item.ok && item.addedIds?.length).length;
    const probe = {
      kind: "imaios-native-lock-id-map-probe",
      version: 1,
      createdAt: new Date().toISOString(),
      pageTitle: document.title,
      url: location.href,
      module: getCurrentModuleInfo(),
      series: getSeriesInfo(),
      slice: getSliceInfo(),
      initialNative,
      finalNative,
      labelCandidates,
      allCandidateCount: allCandidates.length,
      skippedExisting,
      cleanup,
      counts: {
        labelCandidates: allCandidates.length,
        testedLabelCandidates: labelCandidates.length,
        skippedExisting,
        mapped,
        missed: labelCandidates.length - mapped,
        stopped: Boolean(state.cancelSearch)
      },
      mappings: results
    };
    const mergeResult = mergeNativeIdMapProbeIntoRepository(probe);
    const saveResult = await saveLabelRepository();
    const backupResult = saveResult.ok ? await backupLabelRepositoryToDownloads() : { ok: false, error: saveResult.error || "save failed" };
    if (options.copyProbe !== false) await writeClipboard(JSON.stringify(probe, null, 2));
    const saveText = saveResult.ok
      ? ` Saved ${mergeResult.savedMappingCount} native ID map${mergeResult.savedMappingCount === 1 ? "" : "s"} for ${mergeResult.moduleName}.`
      : ` Save failed: ${saveResult.error}`;
    const backupText = backupResult.ok ? " Backup updated." : ` Backup failed: ${backupResult.error}`;
    const copiedText = options.copyProbe === false ? "" : " copied";
    const prefix = options.completionPrefix ? `${options.completionPrefix} ` : "";
    const skippedText = skippedExisting ? ` ${skippedExisting} already had IDs.` : "";
    setStatus(`${prefix}Native ID map${copiedText}: ${mapped}/${labelCandidates.length} missing labels mapped.${skippedText}${saveText}${backupText}`, mapped === labelCandidates.length ? 12000 : 15000);
    refreshPanel();
    return {
      ok: saveResult.ok,
      mapped,
      tested: labelCandidates.length,
      skippedExisting,
      total: allCandidates.length,
      probe,
      mergeResult,
      saveResult,
      backupResult
    };
  }

  function mergeNativeIdMapProbeIntoRepository(probe) {
    const repository = normalizeImportedLabelRepository(state.labelRepository || {});
    const moduleInfo = probe?.module || getCurrentModuleInfo();
    const moduleKey = cleanText(moduleInfo?.key || getCurrentModuleKey());
    const previous = repository.moduleLabels[moduleKey] || {};
    const previousLabels = Array.isArray(previous.labels) ? previous.labels : [];
    const nativeIds = normalizeNativeIdMap(previous.nativeIds || previous.nativeLabelIds || previous.labelNativeIds || {});
    const mappedLabels = [];
    let savedMappingCount = 0;

    for (const mapping of Array.isArray(probe?.mappings) ? probe.mappings : []) {
      if (!mapping?.ok) continue;
      const label = cleanText(mapping.label || mapping.selectedText || "");
      const key = normalizeText(label);
      const ids = uniqueNativeIds(mapping.addedIds || mapping.afterIds || []);
      if (!key || !ids.length) continue;
      nativeIds[key] = uniqueNativeIds([...(nativeIds[key] || []), ...ids]);
      mappedLabels.push(label);
      savedMappingCount += 1;
    }

    const nativeModuleSlug = cleanText(
      probe?.finalNative?.currentSlug
      || probe?.initialNative?.currentSlug
      || previous.nativeModuleSlug
      || ""
    );
    repository.moduleLabels[moduleKey] = {
      ...previous,
      key: moduleKey,
      name: cleanText(moduleInfo?.name || previous.name || moduleKey),
      url: cleanText(moduleInfo?.url || previous.url || getCurrentUrlWithoutHash()),
      updatedAt: new Date().toISOString(),
      labels: unique([...previousLabels, ...mappedLabels]).sort(compareLabels),
      sourceCounts: previous.sourceCounts && typeof previous.sourceCounts === "object" ? previous.sourceCounts : {},
      nativeModuleSlug,
      nativeIds
    };
    repository.updatedAt = new Date().toISOString();
    state.labelRepository = repository;
    return {
      ok: true,
      savedMappingCount,
      moduleKey,
      moduleName: repository.moduleLabels[moduleKey].name,
      nativeModuleSlug
    };
  }

  async function copyLockedLabelDetailProbe() {
    const lockedLabels = await collectLockedStructureNames();
    if (!lockedLabels.length) {
      setStatus("Lock at least one structure first, then probe label info.", 7000);
      return;
    }

    setStatus(`Probing ${lockedLabels.length} locked label${lockedLabels.length === 1 ? "" : "s"} using the current label display mode...`, 0);
    const labelsResult = {
      ok: true,
      skipped: true,
      reason: "Probe label info does not automatically switch label/pin mode."
    };
    await delay(180);

    const results = [];
    for (let index = 0; index < lockedLabels.length; index += 1) {
      if (index > 0) {
        await closeStructureDetailPanel();
        await delay(360);
      }
      const label = lockedLabels[index];
      setStatus(`Probing label info ${index + 1}/${lockedLabels.length}: ${label}`, 0);
      results.push(await captureLockedLabelDetail(label, { allowSearchFallback: false }));
      await delay(520);
    }

    const captured = results.filter((item) => item.status === "captured").length;
    const clicked = results.filter((item) => item.click?.ok).length;
    const visibleMatches = results.filter((item) => item.matchedElement).length;
    const searchFallbacks = results.filter((item) => resultUsedDetailSearchFallback(item)).length;
    const statusCounts = results.reduce((counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {});
    const probe = {
      kind: "imaios-locked-label-detail-probe",
      version: 1,
      createdAt: new Date().toISOString(),
      pageTitle: document.title,
      url: location.href,
      module: getCurrentModuleInfo(),
      series: getSeriesInfo(),
      slice: getSliceInfo(),
      counts: {
        lockedLabels: lockedLabels.length,
        visibleLabelMatches: visibleMatches,
        visibleLabelClicks: clicked,
        searchFallbacks,
        capturedDetails: captured,
        missedDetails: lockedLabels.length - captured,
        statusCounts
      },
      pinsModeRequest: labelsResult,
      lockedLabels,
      labels: results
    };

    await writeClipboard(JSON.stringify(probe, null, 2));
    setStatus(`Locked-label detail probe copied: ${visibleMatches}/${lockedLabels.length} visible DOM matches, ${searchFallbacks} search fallback${searchFallbacks === 1 ? "" : "s"}, ${captured} captured.`, 12000);
  }

  async function copyLockedLabelSearchPinDetailProbe(options = {}) {
    const profile = getSearchPinProbeProfile(options);
    const lockedLabels = await collectLockedStructureNames();
    if (!lockedLabels.length) {
      setStatus("Lock at least one structure first, then run the search-pin probe.", 7000);
      return;
    }
    if (state.searchRunning) {
      setStatus("A search/apply workflow is already running. Stop it before probing via search pins.", 7000);
      return;
    }

    const workflow = await runLockedLabelSearchPinDetailWorkflow(lockedLabels, {
      profile,
      statusVerb: profile.label
    });
    const probe = workflow.probe;

    await writeClipboard(JSON.stringify(probe, null, 2));
    const counts = probe.counts || {};
    const workflowInfo = probe.workflow || {};
    const captured = Number(counts.capturedDetails || 0);
    const visiblePins = Number(counts.visiblePinsFound || 0);
    const total = Number(counts.lockedLabels || lockedLabels.length || 0);
    const restoreResult = workflowInfo.restoreOriginalLockedLabels || null;
    const restoreText = restoreResult?.ok ? " Restored original locked labels." : (restoreResult ? " Original labels were not fully restored." : (profile.restoreOriginalLabels ? "" : " Did not restore labels."));
    const errorText = workflowInfo.error ? ` Error: ${workflowInfo.error}` : "";
    setStatus(`${profile.label} copied: ${captured}/${total} captured, ${visiblePins} visible pins.${restoreText}${errorText}`, 14000);
  }

  async function runLockedLabelSearchPinDetailWorkflow(lockedLabels, options = {}) {
    const profile = options.profile || getSearchPinProbeProfile(options);
    const labelList = unique((Array.isArray(lockedLabels) ? lockedLabels : [])
      .map(cleanText)
      .filter(Boolean));
    const sourcePayload = options.sourcePayload?.kind === "imaios-live-drill" ? options.sourcePayload : null;
    const sourceDrill = sourcePayload
      ? { ok: true, payload: sourcePayload }
      : buildLiveDrillPayload({ lockedLabels: labelList, requireLocked: false });
    const results = [];
    const cleanup = [];
    let initialClear = null;
    let workflowError = "";

    state.searchRunning = true;
    state.cancelSearch = false;
    setStatus(`${options.statusVerb || profile.label}: captured ${labelList.length} locked label names. Clearing locked labels...`, 0);

    try {
      await closeStructureDetailPanel();
      initialClear = await clearLockedStructuresForApply();
      if (!initialClear.ok) {
        workflowError = initialClear.reason || "Could not clear locked labels before search-pin probing.";
      } else {
        await clearModuleSearchInputForProbe();
        for (let index = 0; index < labelList.length; index += 1) {
          if (state.cancelSearch) {
            workflowError = "Stopped by user.";
            break;
          }
          const label = labelList[index];
          setStatus(`${options.statusVerb || profile.label} ${index + 1}/${labelList.length}: ${label}`, 0);
          const result = await captureLockedLabelDetailViaSearchPin(label, profile);
          results.push(result);
          await delay(result.status === "captured" ? profile.afterCapturedMs : profile.afterMissMs);
          await closeStructureDetailPanel();
          const clearResult = await clearLockedStructuresForApply();
          cleanup.push({ label, clearResult });
          await clearModuleSearchInputForProbe();
          await delay(profile.betweenLabelsMs);
        }
      }
    } catch (error) {
      workflowError = error?.message || String(error);
    } finally {
      state.searchRunning = false;
    }

    let restoreResult = null;
    if (profile.restoreOriginalLabels && initialClear?.ok && labelList.length && !state.cancelSearch) {
      restoreResult = await restoreLockedLabelsAfterSearchPinProbe(labelList);
    }

    const captured = results.filter((item) => item.status === "captured").length;
    const visiblePins = results.filter((item) => item.visiblePin).length;
    const searchResultsFound = results.filter((item) => item.searchResult).length;
    const statusCounts = results.reduce((counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {});
    const probe = {
      kind: "imaios-locked-label-search-pin-detail-probe",
      version: 1,
      createdAt: new Date().toISOString(),
      pageTitle: document.title,
      url: location.href,
      module: getCurrentModuleInfo(),
      series: getSeriesInfo(),
      slice: getSliceInfo(),
      counts: {
        lockedLabels: labelList.length,
        attemptedLabels: results.length,
        searchResultsFound,
        visiblePinsFound: visiblePins,
        capturedDetails: captured,
        missedDetails: labelList.length - captured,
        statusCounts
      },
      workflow: {
        mode: "clear-locked-then-search-one-label-at-a-time",
        profile: profile.name,
        restoreOriginalLabelsRequested: profile.restoreOriginalLabels,
        initialClear,
        cleanup,
        restoreOriginalLockedLabels: restoreResult,
        error: workflowError
      },
      sourceDrill: sourceDrill.ok ? sourceDrill.payload : null,
      lockedLabels: labelList,
      labels: results
    };

    return {
      ok: !workflowError,
      reason: workflowError,
      profile,
      probe
    };
  }

  function getSearchPinProbeProfile(options = {}) {
    if (options.fast) {
      return {
        name: "fast",
        label: "Fast search-pin probe",
        restoreOriginalLabels: false,
        searchTimeoutMs: 1800,
        clearDelayMs: 45,
        afterTypeDelayMs: 70,
        afterSearchClickMs: 140,
        autoPanelWaitMs: 500,
        autoPanelIntervalMs: 50,
        visiblePinWaitMs: 1500,
        visiblePinIntervalMs: 50,
        labelClickWaitMs: 1300,
        afterCapturedMs: 110,
        afterMissMs: 70,
        betweenLabelsMs: 70
      };
    }
    return {
      name: "reliable",
      label: "Search-pin probe",
      restoreOriginalLabels: true,
      searchTimeoutMs: 3200,
      clearDelayMs: 90,
      afterTypeDelayMs: 160,
      afterSearchClickMs: 420,
      autoPanelWaitMs: 900,
      autoPanelIntervalMs: 80,
      visiblePinWaitMs: 3600,
      visiblePinIntervalMs: 80,
      labelClickWaitMs: 3200,
      afterCapturedMs: 650,
      afterMissMs: 260,
      betweenLabelsMs: 260
    };
  }

  async function captureLockedLabelDetailViaSearchPin(label, profile = getSearchPinProbeProfile()) {
    const availability = await searchStructureAvailability(label, {
      exact: true,
      timeoutMs: profile.searchTimeoutMs,
      clearDelayMs: profile.clearDelayMs,
      afterTypeDelayMs: profile.afterTypeDelayMs
    });

    if (!availability.ok) {
      return {
        label,
        normalizedLabel: normalizeText(label),
        status: "no-search-result",
        reason: availability.reason || "No exact module-search result matched this locked label."
      };
    }

    const searchResult = elementProbe(availability.result);
    const click = await realMouseClick(availability.result, 0.5, 0.5);
    const selectedText = availability.selectedText || label;
    await delay(profile.afterSearchClickMs);

    const autoPanel = await waitFor(() => (
      findStructureDetailPanelForLabel(label)
      || findStructureDetailPanelForLabel(selectedText)
    ), profile.autoPanelWaitMs, profile.autoPanelIntervalMs);
    if (autoPanel) {
      return {
        label,
        normalizedLabel: normalizeText(label),
        status: "captured",
        source: "search-result-auto-panel",
        selectedText,
        searchResult,
        searchClick: click,
        detail: extractStructureDetailPanelInfo(autoPanel, label)
      };
    }

    const visiblePin = await waitFor(() => findVisibleStructureLabelElement(label), profile.visiblePinWaitMs, profile.visiblePinIntervalMs);
    if (!visiblePin) {
      return {
        label,
        normalizedLabel: normalizeText(label),
        status: "search-result-found-but-no-visible-pin-on-current-slice",
        reason: "The exact search result was selected, but no matching pin/label became visible on the current image. The label may be off-slice or off-plane.",
        selectedText,
        searchResult,
        searchClick: click,
        lockedCountAfterSearch: getLockedStructureCount()
      };
    }

    const detailClick = await clickVisibleStructureLabelForDetail(visiblePin, label, {
      labelClickWaitMs: profile.labelClickWaitMs
    });
    if (!detailClick.panel) {
      return {
        label,
        normalizedLabel: normalizeText(label),
        status: "visible-pin-clicked-no-detail",
        reason: "The searched pin/label appeared, but clicking it did not open a matching definition drawer.",
        selectedText,
        searchResult,
        searchClick: click,
        visiblePin: visiblePin.probe,
        matchScore: visiblePin.score,
        click: detailClick.click,
        clickAttempts: detailClick.attempts,
        visiblePanelAfterClick: detailClick.visiblePanelAfterClick || null
      };
    }

    return {
      label,
      normalizedLabel: normalizeText(label),
      status: "captured",
      source: "search-pin-visible-label",
      selectedText,
      searchResult,
      searchClick: click,
      visiblePin: visiblePin.probe,
      matchScore: visiblePin.score,
      click: detailClick.click,
      clickAttempts: detailClick.attempts,
      detail: extractStructureDetailPanelInfo(detailClick.panel, label)
    };
  }

  async function clearModuleSearchInputForProbe() {
    const input = findModuleSearchInput();
    if (!input) return { ok: false, reason: "Could not find module search input." };
    await clearSearchInput(input);
    return { ok: true };
  }

  async function restoreLockedLabelsAfterSearchPinProbe(labels) {
    try {
      state.selectedStructures = unique(labels);
      state.customListText = state.selectedStructures.join("\n");
      savePageState();
      refreshPanel();
      setStatus("Restoring original locked labels after search-pin probe...", 0);
      const result = await applyLiveDrillLabels(state.selectedStructures, "Search-pin probe restore");
      return {
        ok: !result.missing.length,
        locked: result.locked,
        missing: result.missing,
        attempted: result.attempted
      };
    } catch (error) {
      return { ok: false, reason: error?.message || String(error) };
    }
  }

  function resultUsedDetailSearchFallback(item) {
    return Boolean(item && (
      item.searchResult
      || item.searchFallback
      || item.source === "module-search"
      || item.visibleClickFallback
    ));
  }

  async function captureLockedLabelDetail(label, options = {}) {
    const alreadyOpenPanel = findStructureDetailPanelForLabel(label);
    if (alreadyOpenPanel) {
      return {
        label,
        normalizedLabel: normalizeText(label),
        status: "captured",
        source: "already-open-panel",
        detail: extractStructureDetailPanelInfo(alreadyOpenPanel, label)
      };
    }

    const target = findVisibleStructureLabelElement(label);
    if (!target) {
      if (options.allowSearchFallback) {
        const searchResult = await captureLockedLabelDetailFromSearch(label);
        if (searchResult.status === "captured") return searchResult;
        return {
          label,
          normalizedLabel: normalizeText(label),
          status: "not-visible",
          reason: "No visible structure label element matched this locked label after labels were shown.",
          searchFallback: searchResult
        };
      }
      return {
        label,
        normalizedLabel: normalizeText(label),
        status: "not-visible",
        reason: "No visible structure label element matched this locked label after labels were shown. Automatic module-search fallback is disabled for the normal probe."
      };
    }

    const clickResult = await clickVisibleStructureLabelForDetail(target, label);
    if (!clickResult.panel) {
      if (options.allowSearchFallback) {
        const searchResult = await captureLockedLabelDetailFromSearch(label);
        if (searchResult.status === "captured") {
          return {
            ...searchResult,
            visibleClickFallback: {
              status: "clicked-no-panel",
            reason: "Clicked the visible label, but no matching detail panel was detected before search fallback.",
            matchedElement: target.probe,
            matchScore: target.score,
            click: clickResult.click,
            clickAttempts: clickResult.attempts
          }
        };
      }
        return {
          label,
          normalizedLabel: normalizeText(label),
          status: "clicked-no-panel",
          reason: "Clicked the visible label, but no matching detail panel was detected.",
          matchedElement: target.probe,
          matchScore: target.score,
          click: clickResult.click,
          clickAttempts: clickResult.attempts,
          visiblePanelAfterClick: clickResult.visiblePanelAfterClick || null,
          searchFallback: searchResult
        };
      }
      return {
        label,
        normalizedLabel: normalizeText(label),
        status: "clicked-no-panel",
        reason: "Clicked the visible label, but no matching detail panel was detected. Automatic module-search fallback is disabled for the normal probe.",
        matchedElement: target.probe,
        matchScore: target.score,
        click: clickResult.click,
        clickAttempts: clickResult.attempts,
        visiblePanelAfterClick: clickResult.visiblePanelAfterClick || null
      };
    }

    const detail = extractStructureDetailPanelInfo(clickResult.panel, label);
    return {
      label,
      normalizedLabel: normalizeText(label),
      status: "captured",
      matchedElement: target.probe,
      matchScore: target.score,
      click: clickResult.click,
      clickAttempts: clickResult.attempts,
      detail
    };
  }

  async function clickVisibleStructureLabelForDetail(target, label, options = {}) {
    const attempts = buildVisibleStructureLabelClickAttempts(target.element, options);
    const attempt = attempts[0];
    if (!attempt) {
      return { ok: false, panel: null, click: null, attempts: [] };
    }
    const click = await realMouseClick(attempt.element, attempt.xRatio, attempt.yRatio);
    attempt.click = click;
    await delay(180);
    const panel = await waitFor(() => findStructureDetailPanelForLabel(label), attempt.waitMs, 50);
    if (panel) {
      return {
        ok: true,
        panel,
        click,
        attempts: [serializeVisibleLabelClickAttempt(attempt)]
      };
    }
    const visiblePanel = findStructureDetailPanel("");
    return {
      ok: false,
      panel: null,
      click,
      attempts: [serializeVisibleLabelClickAttempt(attempt)],
      visiblePanelAfterClick: visiblePanel ? extractStructureDetailPanelInfo(visiblePanel, "") : null
    };
  }

  function buildVisibleStructureLabelClickAttempts(element, options = {}) {
    const waitMs = Number.isFinite(options.labelClickWaitMs) ? options.labelClickWaitMs : 3200;
    const textChild = Array.from(element.querySelectorAll("span,p,div"))
      .filter((child) => child !== element && isVisible(child))
      .filter((child) => cleanText(child.textContent || "").length > 1)
      .sort((a, b) => elementArea(b) - elementArea(a))[0] || null;
    const attempts = [];
    if (textChild) attempts.push({ element: textChild, xRatio: 0.5, yRatio: 0.5, target: "text-child", waitMs });
    attempts.push(
      { element, xRatio: 0.5, yRatio: 0.5, target: "label-center", waitMs }
    );
    const seen = new Set();
    return attempts.filter((attempt) => {
      const key = `${attempt.target}:${attempt.xRatio}:${attempt.yRatio}:${elementProbe(attempt.element).rect.left}:${elementProbe(attempt.element).rect.top}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function serializeVisibleLabelClickAttempt(attempt) {
    return {
      target: attempt.target,
      xRatio: attempt.xRatio,
      yRatio: attempt.yRatio,
      click: attempt.click || null,
      element: elementProbe(attempt.element)
    };
  }

  async function captureLockedLabelDetailFromSearch(label) {
    const availability = await searchStructureAvailability(label, {
      exact: true,
      timeoutMs: 2600,
      clearDelayMs: 90,
      afterTypeDelayMs: 140
    });

    if (!availability.ok) {
      return {
        label,
        normalizedLabel: normalizeText(label),
        status: "search-no-result",
        reason: availability.reason || "No exact module-search result matched this locked label."
      };
    }

    const click = await realMouseClick(availability.result, 0.5, 0.5);
    const selectedLabel = availability.selectedText || label;
    const searchProbe = elementProbe(availability.result);
    const panel = await waitFor(() => (
      findStructureDetailPanelForLabel(label)
      || findStructureDetailPanelForLabel(selectedLabel)
    ), 3000, 120);

    if (!panel) {
      return {
        label,
        normalizedLabel: normalizeText(label),
        status: "search-clicked-no-panel",
        reason: "Clicked the exact module-search result, but no matching detail panel was detected.",
        source: "module-search",
        selectedText: selectedLabel,
        searchResult: searchProbe,
        click
      };
    }

    return {
      label,
      normalizedLabel: normalizeText(label),
      status: "captured",
      source: "module-search",
      selectedText: selectedLabel,
      searchResult: searchProbe,
      click,
      detail: extractStructureDetailPanelInfo(panel, label)
    };
  }

  function findStructureDetailPanelForLabel(label) {
    const panel = findStructureDetailPanel(label);
    if (!panel || !structureDetailPanelMatchesLabel(panel, label)) return null;
    return panel;
  }

  function structureDetailPanelMatchesLabel(panel, label) {
    const expected = normalizeText(label);
    if (!expected) return false;
    const title = normalizeText(panel.querySelector(".structure-name")?.textContent || "");
    if (title && title === expected) return true;
    const lines = getReadableElementText(panel).split(/\n+/).map(normalizeText).filter(Boolean);
    return lines.slice(0, 8).some((line) => line === expected);
  }

  function findVisibleStructureLabelElement(label) {
    const candidates = Array.from(document.querySelectorAll(
      ".structure-title-component,[class*='structure-title'],[class*='label-title'],[class*='label-name']"
    ))
      .filter((element) => element !== state.host && isVisible(element))
      .map((element) => {
        const text = getVisibleStructureLabelText(element);
        return {
          element,
          text,
          score: scoreVisibleStructureLabelElement(element, text, label),
          probe: elementProbe(element)
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || elementArea(a.element) - elementArea(b.element));
    return candidates[0] || null;
  }

  function getVisibleStructureLabelText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll("svg,style,script").forEach((node) => node.remove());
    return normalizeStructureLabel(cleanText(
      clone.getAttribute("title") ||
      clone.getAttribute("aria-label") ||
      clone.textContent ||
      ""
    ));
  }

  function scoreVisibleStructureLabelElement(element, text, label) {
    const expected = normalizeText(label);
    const actual = normalizeText(text);
    if (!expected || !actual) return 0;
    let score = 0;
    if (actual === expected) score += 120;
    else if (actual.includes(expected) || expected.includes(actual)) score += 58;
    else return 0;

    const className = String(element.className || "");
    const rect = element.getBoundingClientRect();
    if (/structure-title-component/i.test(className)) score += 45;
    if (/structure-title|label/i.test(className)) score += 18;
    if (element.querySelector("img")) score += 8;
    if (rect.width >= 24 && rect.width <= 560) score += 8;
    if (rect.height >= 16 && rect.height <= 140) score += 8;
    if (rect.top >= -20 && rect.bottom <= window.innerHeight + 20) score += 5;
    if (rect.left >= -40 && rect.right <= window.innerWidth + 40) score += 5;
    score -= Math.max(0, actual.length - expected.length - 24) / 3;
    return score;
  }

  function findStructureDetailPanel(expectedLabel = "") {
    const explicit = findExplicitStructureDetailPanel(expectedLabel);
    if (explicit) return explicit;

    const candidates = Array.from(document.body.querySelectorAll("aside,section,article,main,div"))
      .filter((element) => element !== state.host && isVisible(element))
      .map((element) => ({
        element,
        score: scoreStructureDetailPanelCandidate(element, expectedLabel)
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || elementArea(b.element) - elementArea(a.element));
    return candidates[0]?.element || null;
  }

  function findExplicitStructureDetailPanel(expectedLabel = "") {
    const candidates = Array.from(document.body.querySelectorAll(
      "#structure-details-id,.structure-details,.panel-container"
    ))
      .filter((element) => element !== state.host && isVisible(element))
      .filter((element) => element.matches(".panel-container") ? Boolean(element.querySelector("#structure-details-id,.structure-details")) : true)
      .map((element) => ({
        element: element.matches(".panel-container") ? (element.querySelector("#structure-details-id,.structure-details") || element) : element,
        score: scoreExplicitStructureDetailPanel(element, expectedLabel)
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || elementArea(b.element) - elementArea(a.element));
    return candidates[0]?.element || null;
  }

  function scoreExplicitStructureDetailPanel(element, expectedLabel = "") {
    const panel = element.matches(".panel-container") ? (element.querySelector("#structure-details-id,.structure-details") || element) : element;
    if (!panel.querySelector(".structure-name,.structure-definition,#definition-viewer-preview")) return 0;
    const title = cleanText(panel.querySelector(".structure-name")?.textContent || "");
    const expected = normalizeText(expectedLabel);
    let score = 150;
    if (panel.id === "structure-details-id") score += 90;
    if (panel.matches(".structure-details")) score += 65;
    if (panel.querySelector(".structure-definition")) score += 35;
    if (panel.querySelector(".structure-card-subtitle-latin")) score += 12;
    if (expected && normalizeText(title) === expected) score += 120;
    else if (expected && normalizeText(panel.textContent || "").includes(expected)) score += 45;
    return score;
  }

  function scoreStructureDetailPanelCandidate(element, expectedLabel = "") {
    const text = getReadableElementText(element);
    if (!/\bDefinition\b/i.test(text)) return 0;
    if (text.length < 60 || text.length > 16000) return 0;

    const expected = normalizeText(expectedLabel);
    const normalizedText = normalizeText(text);
    const rect = element.getBoundingClientRect();
    let score = 30;
    if (expected && normalizedText.includes(expected)) score += 55;
    if (rect.width >= 220 && rect.width <= Math.min(780, window.innerWidth * 0.68)) score += 22;
    if (rect.height >= 220) score += 14;
    if (rect.left <= window.innerWidth * 0.42) score += 12;
    if (rect.top <= 130) score += 8;
    if (/\bLock\b/i.test(text)) score += 8;
    if (/\bHide\b/i.test(text)) score += 5;
    if (/\bSee more\b/i.test(text)) score += 4;
    if (element.matches("body,html")) score -= 120;
    score -= Math.max(0, text.length - 5000) / 350;
    return score;
  }

  function extractStructureDetailPanelInfo(panel, expectedLabel = "") {
    const text = getReadableElementText(panel);
    const lines = text.split(/\n+/).map(cleanText).filter(Boolean);
    const title = cleanText(panel.querySelector(".structure-name")?.textContent || "") || getStructureDetailTitle(lines, expectedLabel);
    const alternateTitle = cleanText(panel.querySelector(".structure-card-subtitle-latin")?.textContent || "") || getStructureDetailAlternateTitle(lines, title);
    const definition = getStructuredDefinitionText(panel) || extractPanelSection(lines, "Definition", [
      /^This definition incorporates/i,
      /^See more$/i,
      /^In this module$/i,
      /^Translations$/i,
      /^Related/i,
      /^References$/i,
      /^Bibliography$/i,
      /^Anatomical hierarchy$/i
    ]);
    const summary = extractPanelLineBlock(lines, /^To summarize:/i, [
      /^In this module$/i,
      /^Translations$/i,
      /^Related/i,
      /^References$/i
    ]);

    return {
      title,
      alternateTitle,
      definition,
      definitionSource: getStructuredDefinitionSource(panel),
      summary,
      chips: getStructureDetailChips(panel, title),
      hierarchy: getStructureDetailHierarchy(panel),
      moduleImageCount: panel.querySelectorAll(".structure-gallery-item-image").length,
      rawText: text.slice(0, 6000),
      panel: elementProbe(panel)
    };
  }

  function getStructuredDefinitionText(panel) {
    const nodes = Array.from(panel.querySelectorAll(
      ".structure-definition .structure-definition-html:not(.structure-definition-source),#definition-viewer-preview .structure-definition-html:not(.structure-definition-source)"
    ));
    const parts = nodes
      .map((node) => cleanTextFromDefinitionNode(node))
      .filter(Boolean)
      .filter((text) => !/^This definition incorporates/i.test(text));
    return cleanText(parts.join(" "));
  }

  function cleanTextFromDefinitionNode(node) {
    const blockNodes = Array.from(node.querySelectorAll("p,li"));
    const sourceNodes = new Set(node.querySelectorAll(".structure-definition-source"));
    const blocks = (blockNodes.length ? blockNodes : [node])
      .filter((block) => !sourceNodes.has(block) && !block.closest(".structure-definition-source"))
      .map((block) => cleanText(block.textContent || ""))
      .filter(Boolean);
    return cleanText(blocks.join(" "));
  }

  function getStructuredDefinitionSource(panel) {
    return cleanText(panel.querySelector(".structure-definition-source")?.textContent || "");
  }

  function getStructureDetailHierarchy(panel) {
    const cards = Array.from(panel.querySelectorAll(".structure-hierarchy-card"))
      .map((card) => {
        const name = cleanText(card.querySelector(".structure-hierarchy-header--title")?.textContent || "");
        const ancestors = Array.from(card.querySelectorAll(".structure-hierarchy-ancestor-label"))
          .map((item) => cleanText(item.textContent || ""))
          .filter(Boolean);
        const children = Array.from(card.querySelectorAll(".structure-hierarchy-children-label"))
          .map((item) => cleanText(item.textContent || ""))
          .filter(Boolean);
        return { name, ancestors, children };
      })
      .filter((card) => card.name || card.ancestors.length || card.children.length);
    return cards.slice(0, 8);
  }

  function getReadableElementText(element) {
    const text = element.innerText || element.textContent || "";
    return String(text)
      .replace(/\r/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function getStructureDetailTitle(lines, expectedLabel = "") {
    const expected = normalizeText(expectedLabel);
    const first = lines.find((line) => {
      if (/^(Lock|Hide|Definition|See more|In this module|Menu)$/i.test(line)) return false;
      if (line.length > 120) return false;
      return !expected || normalizeText(line) === expected || normalizeText(line).includes(expected) || expected.includes(normalizeText(line));
    });
    return first || lines[0] || cleanText(expectedLabel);
  }

  function getStructureDetailAlternateTitle(lines, title) {
    const titleIndex = lines.findIndex((line) => normalizeText(line) === normalizeText(title));
    const candidates = lines.slice(Math.max(0, titleIndex + 1), titleIndex < 0 ? 4 : titleIndex + 5);
    return candidates.find((line) => {
      if (!line || normalizeText(line) === normalizeText(title)) return false;
      if (/^(Lock|Hide|Definition|See more)$/i.test(line)) return false;
      return line.length <= 120;
    }) || "";
  }

  function extractPanelSection(lines, heading, stopPatterns) {
    const start = lines.findIndex((line) => normalizeText(line) === normalizeText(heading));
    if (start < 0) return "";
    const collected = [];
    for (const line of lines.slice(start + 1)) {
      if (stopPatterns.some((pattern) => pattern.test(line))) break;
      if (!/^(Lock|Hide)$/i.test(line)) collected.push(line);
    }
    return cleanText(collected.join(" "));
  }

  function extractPanelLineBlock(lines, startPattern, stopPatterns) {
    const start = lines.findIndex((line) => startPattern.test(line));
    if (start < 0) return "";
    const collected = [];
    for (const line of lines.slice(start)) {
      if (collected.length && stopPatterns.some((pattern) => pattern.test(line))) break;
      collected.push(line);
    }
    return cleanText(collected.join(" "));
  }

  function getStructureDetailChips(panel, title) {
    const blocked = new Set(["lock", "hide", "see more", "menu", "definition", normalizeText(title)]);
    const chips = [];
    for (const element of panel.querySelectorAll("a,button,[role='button'],[class*='tag'],[class*='chip']")) {
      if (!isVisible(element)) continue;
      const text = normalizeStructureLabel(cleanText(element.textContent || element.getAttribute("title") || ""));
      const normalized = normalizeText(text);
      if (!text || text.length > 100 || blocked.has(normalized)) continue;
      if (/^(x|close|share|copy|show|hide|lock)$/i.test(text)) continue;
      chips.push({
        label: text,
        href: element instanceof HTMLAnchorElement ? element.href : "",
        className: String(element.className || "")
      });
    }
    const seen = new Set();
    return chips.filter((chip) => {
      const key = normalizeText(chip.label);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
  }

  async function closeStructureDetailPanel() {
    const panel = findStructureDetailPanel("");
    if (!panel) return false;
    const panelRect = panel.getBoundingClientRect();
    const buttons = Array.from(panel.querySelectorAll("button,[role='button']"))
      .filter((element) => isVisible(element))
      .map((element) => ({
        element,
        score: scoreDetailPanelCloseButton(element, panelRect)
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const button = buttons[0]?.element || null;
    if (!button) return false;
    await realMouseClick(button, 0.5, 0.5);
    await delay(180);
    return true;
  }

  function scoreDetailPanelCloseButton(element, panelRect) {
    const text = cleanText(element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent || "");
    const rect = element.getBoundingClientRect();
    let score = 0;
    if (/close/i.test(text)) score += 90;
    if (/^(x|X)$/i.test(text)) score += 55;
    if (element.querySelector("svg")) score += 12;
    if (rect.top <= panelRect.top + 120) score += 18;
    if (rect.left >= panelRect.right - 150) score += 24;
    if (rect.right >= panelRect.right - 70) score += 30;
    score += clamp((rect.left - (panelRect.right - 170)) / 5, 0, 28);
    if (rect.width >= 20 && rect.width <= 90 && rect.height >= 20 && rect.height <= 90) score += 10;
    if (/lock|hide|see more/i.test(text)) score -= 80;
    return score;
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

  async function switchPlane(targetPlane, options = {}) {
    const plane = normalizePlaneName(targetPlane);
    if (!plane) {
      if (!options.quiet) setStatus("Unknown plane.");
      return { ok: false, reason: "Unknown plane." };
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
      const reason = `Could not find ${plane}.`;
      if (!options.quiet) setStatus(`${reason} Open the plane menu once, then press the hotkey again.`, 7000);
      return { ok: false, reason };
    }

    await realMouseClick(option, 0.5, 0.5);
    const label = getPlaneOptionLabel(option) || plane;
    if (!options.quiet) setStatus(`Switching to ${label}...`);
    await delay(520);
    const reverseResult = await syncReverseScrollForPlane(plane, { quiet: true });
    const reverseState = plane === "Coronal" ? "on" : "off";
    if (!options.quiet) {
      setStatus(reverseResult.ok ? `${label}: reverse scroll ${reverseState}.` : reverseResult.reason, reverseResult.ok ? 4200 : 7000);
    }
    return reverseResult.ok
      ? { ok: true, plane, label, reverseScroll: reverseState }
      : { ok: false, reason: reverseResult.reason || `Could not switch to ${plane}.` };
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

  async function switchSeriesByName(seriesName, options = {}) {
    const name = cleanText(seriesName || "");
    if (!name) return { ok: false, reason: "No series name." };
    const current = cleanText(getSeriesInfo().selectedSeries || "");
    if (normalizeText(current) === normalizeText(name)) return { ok: true, series: name, alreadySelected: true };

    stopRangeCine({ quiet: true });
    const menuButton = findPlaneSelectorButton();
    const menuRect = menuButton ? menuButton.getBoundingClientRect() : null;
    await openSeriesMenuIfNeeded(menuButton, menuRect);

    let option = await waitFor(() => findQuickSeriesOption(name, menuRect), 1200, 100);
    if (!option && menuButton) {
      await realMouseClick(menuButton, 0.5, 0.5);
      await delay(180);
      option = await waitFor(() => findQuickSeriesOption(name, menuRect), 900, 100);
    }

    if (!option) {
      const reason = `Could not find series ${name}.`;
      if (!options.quiet) setStatus(reason, 6000);
      return { ok: false, reason };
    }

    const optionName = getQuickSeriesOptionName(option) || name;
    await realMouseClick(option, 0.5, 0.5);
    await delay(420);
    const plane = normalizePlaneName(optionName);
    if (plane) await syncReverseScrollForPlane(plane, { quiet: true });
    if (!options.quiet) setStatus(`Switched to ${optionName}.`, 4200);
    return { ok: true, series: optionName };
  }

  async function openSeriesMenuIfNeeded(menuButton, menuRect) {
    if (getVisibleQuickSeriesOptionsNear(menuRect).length) return;
    if (!menuButton) return;
    await realMouseClick(menuButton, 0.5, 0.5);
    await delay(260);
  }

  async function closeSeriesMenuIfOpen(menuButton, menuRect) {
    if (!getVisibleQuickSeriesOptionsNear(menuRect).length) return;
    if (menuButton) {
      await realMouseClick(menuButton, 0.5, 0.5);
      await delay(160);
    }
    if (getVisibleQuickSeriesOptionsNear(menuRect).length) {
      document.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
        cancelable: true
      }));
      await delay(120);
    }
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

  function getViewerInteractionElement() {
    const canvases = Array.from(document.querySelectorAll("canvas,#anatomy-canvas,[data-name='image-canvas']"))
      .filter((element) => element !== state.host && !state.host?.contains(element) && isVisible(element))
      .map((element) => ({ element, rect: element.getBoundingClientRect(), style: getComputedStyle(element) }))
      .filter((item) => item.rect.width >= 120 && item.rect.height >= 120)
      .filter((item) => item.rect.bottom > 40 && item.rect.top < window.innerHeight - 40);
    canvases.sort((a, b) => (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height));
    if (canvases[0]) return canvases[0].element;

    const containers = Array.from(document.querySelectorAll(".viewer,[class*='viewer-container'],[class*='image-viewer'],[class*='image-container']"))
      .filter((element) => element !== state.host && !state.host?.contains(element) && isVisible(element))
      .filter((element) => element.querySelector("canvas,#anatomy-canvas,[data-name='image-canvas']"))
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter((item) => item.rect.width >= 160 && item.rect.height >= 160)
      .filter((item) => item.rect.bottom > 40 && item.rect.top < window.innerHeight - 40);
    containers.sort((a, b) => (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height));
    return containers[0]?.element || null;
  }

  function isSafeViewerInputTarget(target) {
    const element = target && target.nodeType === Node.ELEMENT_NODE ? target : target?.parentElement;
    if (!element || element === state.host || state.host?.contains(element)) return false;
    if (element.closest("input,textarea,select,button,[role='button'],[role='switch'],[role='checkbox'],[role='menu'],[role='menuitem'],[role='option'],[contenteditable='true']")) return false;
    const text = cleanText(element.textContent || "");
    if (/\b(Targeted labeling|Practice|Pins|Font size|Display mode|Anatomical Parts|Select all|Hide|Lock)\b/i.test(text)) return false;
    const viewer = getViewerInteractionElement();
    if (!viewer) return false;
    return element === viewer || viewer.contains(element) || element.contains(viewer);
  }

  function getViewerInteractionRect() {
    const element = getViewerInteractionElement();
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    return rect;
  }

  function getViewerRelativePoint(clientX, clientY) {
    const rect = getViewerInteractionRect();
    if (!rect) return null;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    return {
      xRatio: clamp((clientX - rect.left) / rect.width, 0, 1),
      yRatio: clamp((clientY - rect.top) / rect.height, 0, 1)
    };
  }

  function viewerPointToClient(point = {}) {
    const rect = getViewerInteractionRect();
    if (!rect) return null;
    const xRatio = clamp(Number(point.xRatio), 0, 1);
    const yRatio = clamp(Number(point.yRatio), 0, 1);
    if (!Number.isFinite(xRatio) || !Number.isFinite(yRatio)) return null;
    return {
      x: rect.left + rect.width * xRatio,
      y: rect.top + rect.height * yRatio
    };
  }

  function getViewerViewportSnapshot() {
    const element = getViewerInteractionElement();
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const parent = element.parentElement && element.parentElement !== document.body ? element.parentElement : null;
    const parentStyle = parent ? getComputedStyle(parent) : null;
    return {
      element: element.tagName.toLowerCase(),
      className: String(element.className || "").slice(0, 160),
      rect: rectProbe(rect),
      transform: style.transform && style.transform !== "none" ? style.transform : "",
      parentTransform: parentStyle?.transform && parentStyle.transform !== "none" ? parentStyle.transform : ""
    };
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
      PIN_MODE_STORAGE_KEY,
      REVERSE_SCROLL_STORAGE_KEY,
      "im_viewer-overlay-opacity",
      "im_viewer-cross-references",
      "im_viewer-menu-open"
    ];
    return Object.fromEntries(keys.map((key) => [key, parseStorageValue(localStorage.getItem(key))]));
  }

  function getNativeRestoreStorageSnapshot(lockedLabels = []) {
    const pattern = /imaios|eanatomy|anatomy|viewer|slice|series|pin|label|lock|locked|isolate|structure|selected|overlay|store|vue|nuxt/i;
    return {
      localStorage: collectNativeStorageEntries(localStorage, pattern, lockedLabels),
      sessionStorage: collectNativeStorageEntries(sessionStorage, pattern, lockedLabels)
    };
  }

  function collectNativeStorageEntries(storage, pattern, lockedLabels = []) {
    const entries = [];
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key) continue;
        const raw = storage.getItem(key);
        const labelHits = getStorageLabelHits(raw, lockedLabels);
        if (!pattern.test(key) && !labelHits.length) continue;
        entries.push({
          key,
          rawLength: raw ? raw.length : 0,
          labelHits,
          preview: compactProbeValue(parseStorageValue(raw))
        });
      }
    } catch (error) {
      entries.push({ key: "__storage_error__", error: error?.message || String(error) });
    }
    entries.sort((a, b) => (b.labelHits?.length || 0) - (a.labelHits?.length || 0) || String(a.key).localeCompare(String(b.key)));
    return entries.slice(0, 120);
  }

  function getStorageLabelHits(raw, lockedLabels = []) {
    const normalizedRaw = normalizeText(raw || "");
    if (!normalizedRaw) return [];
    return unique((lockedLabels || []).filter((label) => normalizedRaw.includes(normalizeText(label))));
  }

  function countNativeRestoreStorageHits(storage = {}) {
    return [...(storage.localStorage || []), ...(storage.sessionStorage || [])]
      .filter((entry) => Array.isArray(entry.labelHits) && entry.labelHits.length)
      .length;
  }

  async function getIndexedDbProbe() {
    try {
      if (!window.indexedDB || typeof indexedDB.databases !== "function") {
        return { supported: false, databases: [] };
      }
      const databases = await indexedDB.databases();
      return {
        supported: true,
        databases: (databases || []).map((database) => ({
          name: cleanText(database?.name || ""),
          version: database?.version || null
        })).filter((database) => database.name).slice(0, 80)
      };
    } catch (error) {
      return { supported: true, error: error?.message || String(error), databases: [] };
    }
  }

  function compactProbeValue(value, depth = 0) {
    if (value === null || value === undefined) return value ?? null;
    if (typeof value === "string") return value.length > 1200 ? `${value.slice(0, 1200)}...` : value;
    if (typeof value === "number" || typeof value === "boolean") return value;
    if (depth >= 3) return Array.isArray(value) ? `[array:${value.length}]` : "[object]";
    if (Array.isArray(value)) return value.slice(0, 12).map((item) => compactProbeValue(item, depth + 1));
    if (typeof value === "object") {
      return Object.fromEntries(Object.entries(value).slice(0, 32).map(([key, item]) => [
        key,
        compactProbeValue(item, depth + 1)
      ]));
    }
    return String(value);
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

  function elementDeepProbe(element) {
    if (!element) return null;
    const probe = elementProbe(element);
    const attrs = {};
    for (const attr of Array.from(element.attributes || [])) {
      if (!/^(id|class|role|title|aria-|data-|href|name|type|value|placeholder|sort|slice)/i.test(attr.name)) continue;
      attrs[attr.name] = String(attr.value || "").slice(0, 500);
    }
    return {
      ...probe,
      attributes: attrs,
      dataset: Object.fromEntries(Object.entries(element.dataset || {}).slice(0, 40).map(([key, value]) => [key, String(value || "").slice(0, 500)])),
      html: String(element.outerHTML || "").replace(/\s+/g, " ").slice(0, 1200)
    };
  }

  function getElementAncestorProbe(element, limit = 5) {
    const ancestors = [];
    let cursor = element?.parentElement || null;
    while (cursor && cursor !== document.body && ancestors.length < limit) {
      ancestors.push(elementDeepProbe(cursor));
      cursor = cursor.parentElement;
    }
    return ancestors;
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
    } else if (actionId === "switchPairTab") {
      togglePairedAnswerSession();
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
    const result = enabled ? await resetQuietPinsByCyclingPins() : await setPinsMode(false);
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
    const button = findLockedStructuresButton();
    const buttonCount = button ? getLockedStructureCountFromButton(button) : 0;
    if (buttonCount) return buttonCount;
    const panel = findLockedStructuresPanel();
    return panel ? getLockedStructureNames().length : 0;
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
      .filter((element) => /locked structures/i.test(element.textContent || ""))
      .filter((element) => {
        const text = cleanText(element.textContent || "");
        return /clear all/i.test(text) || element.querySelector("button.clear-isolate") || getLockedStructureCountFromButton(findLockedStructuresButton()) > 0;
      });
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
    const panel = findLockedStructuresPanel();
    const lockedButton = findLockedStructuresButton();
    const lockedButtonCount = lockedButton ? getLockedStructureCountFromButton(lockedButton) : 0;
    if (!panel && !lockedButtonCount) return [];
    const scope = panel || document.body;
    const selectors = panel
      ? [
        ".list-structure--container-tag",
        "[class*='list-structure'][class*='tag']",
        "[class*='container-tag']",
        "[class*='locked'][class*='tag']",
        "[class*='chip']",
        "button",
        "[role='button']",
        "span",
        "div"
      ]
      : [
        "[class*='locked'][class*='tag']",
        "[class*='isolate'][class*='tag']",
        "[class*='chip']"
      ];
    const candidates = Array.from(scope.querySelectorAll(
      selectors.join(",")
    ));
    const accepted = [];
    const scored = candidates
      .filter((element) => element !== state.host && isVisible(element))
      .map((element) => ({
        element,
        label: extractLockedChipLabel(element),
        score: scoreLockedLabelCandidate(element, panel)
      }))
      .filter((item) => item.label && item.score > 0)
      .sort((a, b) => (
        b.score - a.score ||
        elementArea(a.element) - elementArea(b.element)
      ));

    for (const item of scored) {
      if (accepted.some((acceptedItem) => acceptedItem.element.contains(item.element) || item.element.contains(acceptedItem.element))) {
        continue;
      }
      accepted.push(item);
    }

    return splitCompositeLockedLabelsFromKnownSets(unique(accepted.map((item) => item.label)));
  }

  function splitCompositeLockedLabelsFromKnownSets(labels) {
    if (!Array.isArray(labels) || labels.length !== 1) return labels;
    const compactLabel = normalizeText(labels[0]).replace(/\s+/g, "");
    if (!compactLabel) return labels;

    const chunk = getActiveChunk();
    const knownSets = [
      chunk ? getChunkLabelTargets(chunk).map((target) => target.preferredLabel) : [],
      state.selectedStructures || [],
      parseCustomListSafe(),
      getSavedLabelsForCurrentModule().labels || []
    ];

    for (const known of knownSets) {
      const cleaned = unique((known || []).map(cleanText).filter(Boolean));
      if (cleaned.length < 2 || cleaned.length > 30) continue;
      const joined = cleaned.map((item) => normalizeText(item).replace(/\s+/g, "")).join("");
      if (joined && joined === compactLabel) return cleaned;
    }
    return labels;
  }

  function parseCustomListSafe() {
    try {
      return state.shadow ? parseCustomList() : [];
    } catch (_error) {
      return [];
    }
  }

  function extractLockedChipLabel(element) {
    const text = cleanLockedStructureText(element.textContent || "");
    if (!isLikelyLockedStructureChipText(text)) return "";
    return text;
  }

  function isLikelyLockedStructureChipText(text) {
    if (!text || text.length < 2 || text.length > 90) return false;
    if (/^(locked structures|clear all|search in this module)$/i.test(text)) return false;
    if (/^\d+$/.test(text)) return false;
    if (/^[x×✕✖]+$/i.test(text)) return false;
    if (/search|select all|anatomical parts|window|menu/i.test(text)) return false;
    return /[a-z]/i.test(text);
  }

  function scoreLockedLabelCandidate(element, panel = null) {
    const label = extractLockedChipLabel(element);
    if (!label) return 0;
    if (isCompositeLockedStructureContainer(element)) return 0;
    const rect = element.getBoundingClientRect();
    if (rect.width < 24 || rect.width > 680 || rect.height < 18 || rect.height > 92) return 0;
    const className = String(element.className || "");
    let score = 1;
    if (panel && panel.contains(element)) score += 40;
    if (/tag|chip|isolate|locked|structure/i.test(className)) score += 28;
    if (element.matches("button,[role='button']")) score += 12;
    if (element.querySelector("svg")) score += 10;
    if (rect.height >= 24 && rect.height <= 72) score += 8;
    if (rect.width >= 48 && rect.width <= 520) score += 6;
    score -= Math.max(0, label.length - 55) / 4;
    return score;
  }

  function isCompositeLockedStructureContainer(element) {
    const children = Array.from(element.children || [])
      .filter((child) => child instanceof Element && isVisible(child))
      .map((child) => cleanLockedStructureText(child.textContent || ""))
      .filter(isLikelyLockedStructureChipText);
    if (children.length > 1) return true;
    const svgCount = element.querySelectorAll("svg").length;
    if (svgCount > 1) return true;
    const text = cleanLockedStructureText(element.textContent || "");
    if (children.length === 1 && text && text !== children[0] && text.includes(children[0])) return true;
    return false;
  }

  function elementArea(element) {
    const rect = element.getBoundingClientRect();
    return Math.max(0, rect.width * rect.height);
  }

  function cleanLockedStructureText(text) {
    return String(text)
      .replace(/[×✕✖]/g, " ")
      .replace(/\s+[x×✕✖]\s*$/i, " ")
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
    return Array.from(new Set((Array.isArray(items) ? items : []).map(cleanText).filter(Boolean)));
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
