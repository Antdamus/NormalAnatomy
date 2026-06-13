(() => {
  if (window.__IMAIOS_CINE_TOOLS_LOADED__) return;
  window.__IMAIOS_CINE_TOOLS_LOADED__ = true;

  const PRESETS = [
    {
      id: "surface-landmarks",
      label: "Surface landmarks",
      structures: [
        "Sternocleidomastoid muscle",
        "Descending part of trapezius muscle",
        "Platysma"
      ]
    },
    {
      id: "scalenes",
      label: "Scalenes",
      structures: [
        "Scalenus anterior muscle",
        "Scalenus medius muscle",
        "Scalenus posterior muscle"
      ]
    },
    {
      id: "infrahyoid-straps",
      label: "Infrahyoid straps",
      structures: [
        "Sternohyoid muscle",
        "Sternothyroid muscle",
        "Thyrohyoid muscle",
        "Omohyoid muscle"
      ]
    },
    {
      id: "suprahyoid",
      label: "Suprahyoid",
      structures: [
        "Digastric muscle",
        "Mylohyoid muscle",
        "Geniohyoid muscle",
        "Stylohyoid muscle"
      ]
    },
    {
      id: "prevertebral",
      label: "Prevertebral",
      structures: [
        "Longus colli muscle",
        "Longus capitis muscle"
      ]
    },
    {
      id: "posterior-neck",
      label: "Posterior neck",
      structures: [
        "Splenius capitis muscle",
        "Splenius colli muscle",
        "Semispinalis capitis muscle",
        "Semispinalis colli muscle",
        "Levator scapulae"
      ]
    },
    {
      id: "suboccipital",
      label: "Suboccipital",
      structures: [
        "Obliquus superior capitis muscle",
        "Obliquus inferior capitis muscle",
        "Suboccipital muscles"
      ]
    }
  ];

  const APP_ID = "imaios-cine-tools";
  const PAGE_STORAGE_KEY = `${APP_ID}:page:${location.origin}${location.pathname}`;
  const PREFS_STORAGE_KEY = `${APP_ID}:prefs`;
  const CINE_SPEED_MIN = 1;
  const CINE_SPEED_MAX = 20;
  const DEFAULT_CINE_SPEED = 5;
  const state = {
    activePresetId: PRESETS[0].id,
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
    rangeCineIntervalMs: cineSpeedToIntervalMs(DEFAULT_CINE_SPEED)
  };

  async function init() {
    const viewerReady = await waitFor(() => shouldMountOnThisPage(), 12000, 250);
    if (!viewerReady) return;

    loadSavedState();
    mount();
    refreshPanel();
    window.addEventListener("fullscreenchange", remount);
    window.addEventListener("resize", keepPanelInViewport);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
  }

  function loadSavedState() {
    try {
      const page = JSON.parse(localStorage.getItem(PAGE_STORAGE_KEY) || "{}");
      const prefs = JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY) || "{}");
      if (Array.isArray(page.boxes)) state.boxes = page.boxes;
      if (Array.isArray(page.selectedStructures)) state.selectedStructures = page.selectedStructures;
      if (typeof page.customListText === "string") state.customListText = page.customListText;
      if (typeof page.activePresetId === "string") state.activePresetId = page.activePresetId;
      if (typeof page.boxesVisible === "boolean") state.boxesVisible = page.boxesVisible;
      if (typeof page.collapsed === "boolean") state.collapsed = page.collapsed;
      if (prefs.panelPosition && Number.isFinite(prefs.panelPosition.left) && Number.isFinite(prefs.panelPosition.top)) {
        state.panelPosition = prefs.panelPosition;
      }
      if (Number.isFinite(prefs.rangeCineSpeed)) {
        setCineSpeed(prefs.rangeCineSpeed, { save: false, refresh: false });
      }
    } catch (error) {
      console.warn("IMAIOS Cine Tools: could not load saved state", error);
    }
  }

  function savePageState() {
    try {
      localStorage.setItem(PAGE_STORAGE_KEY, JSON.stringify({
        activePresetId: state.activePresetId,
        selectedStructures: state.selectedStructures,
        customListText: state.customListText,
        boxes: state.boxes,
        boxesVisible: state.boxesVisible,
        collapsed: state.collapsed
      }));
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({
        panelPosition: state.panelPosition,
        rangeCineSpeed: state.rangeCineSpeed
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
    const presetOptions = PRESETS.map((preset) => (
      `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.label)}</option>`
    )).join("");

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
          gap: 8px;
          padding: 10px;
        }

        .panel.collapsed .controls {
          display: none;
        }

        .row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }

        .row.three {
          grid-template-columns: 1fr 1fr 1fr;
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
          background: rgba(255,255,255,0.08);
          color: #f5f7fa;
          outline: none;
        }

        select {
          height: 30px;
          padding: 0 8px;
          font-size: 12px;
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

        .icon-button {
          width: 28px;
          min-height: 26px;
          padding: 0;
          font-size: 13px;
        }

        .hint,
        .status,
        .selected {
          font-size: 11px;
          line-height: 1.35;
          color: rgba(245,247,250,0.74);
        }

        .status {
          min-height: 15px;
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
      </style>
      <div class="box-layer" data-role="box-layer"></div>
      <section class="panel" data-role="panel" aria-label="IMAIOS cine tools">
        <div class="header" data-role="drag-panel">
          <div class="title">IMAIOS Cine</div>
          <button class="icon-button" type="button" data-action="toggle-panel" title="Minimize panel">-</button>
        </div>
        <div class="controls">
          <select data-role="preset">${presetOptions}</select>
          <div class="row">
            <button class="primary" type="button" data-action="apply-preset">Apply preset</button>
            <button type="button" data-action="stop-search">Stop</button>
          </div>
          <div class="row">
            <button type="button" data-action="set-pins">Set pins</button>
            <button type="button" data-action="set-labels">Show labels</button>
          </div>
          <textarea data-role="custom-list" spellcheck="false"></textarea>
          <div class="row">
            <button type="button" data-action="apply-list">Apply list</button>
            <button type="button" data-action="reset-list">Reset list</button>
          </div>
          <div class="row three">
            <button type="button" data-action="add-box">Add box</button>
            <button type="button" data-action="toggle-boxes">Hide boxes</button>
            <button class="danger" type="button" data-action="clear-boxes">Clear</button>
          </div>
          <div class="row three">
            <button type="button" data-action="copy-manifest">Copy manifest</button>
            <button type="button" data-action="copy-prompt">Copy prompt</button>
            <button type="button" data-action="copy-labels">Copy labels</button>
          </div>
          <div class="row">
            <button type="button" data-action="copy-probe">Copy probe</button>
            <button type="button" data-action="copy-slice">Copy slice</button>
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
          <div class="selected" data-role="selected"></div>
          <div class="status" data-role="status"></div>
          <div class="hint">Space ping-pong. [ backward, ] forward. 1/2/3 axial/coronal/sagittal.</div>
        </div>
      </section>
    `;
  }

  function bindPanelEvents() {
    const root = state.shadow;
    root.querySelector("[data-action='toggle-panel']").addEventListener("click", () => {
      state.collapsed = !state.collapsed;
      savePageState();
      refreshPanel();
    });
    root.querySelector("[data-role='preset']").addEventListener("change", (event) => {
      state.activePresetId = event.target.value;
      state.customListText = getActivePreset().structures.join("\n");
      savePageState();
      refreshPanel();
    });
    root.querySelector("[data-role='custom-list']").addEventListener("input", (event) => {
      state.customListText = event.target.value;
      savePageState();
    });
    root.querySelector("[data-action='apply-preset']").addEventListener("click", () => {
      const preset = getActivePreset();
      applyStructures(preset.structures, preset.label);
    });
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
    const preset = getActivePreset();
    const panel = root.querySelector("[data-role='panel']");
    const presetSelect = root.querySelector("[data-role='preset']");
    const customList = root.querySelector("[data-role='custom-list']");
    const selected = root.querySelector("[data-role='selected']");
    const togglePanel = root.querySelector("[data-action='toggle-panel']");
    const toggleBoxes = root.querySelector("[data-action='toggle-boxes']");
    const playRange = root.querySelector("[data-action='play-range']");
    const cineSpeed = root.querySelector("[data-role='cine-speed']");
    const cineSpeedValue = root.querySelector("[data-role='cine-speed-value']");

    panel.classList.toggle("collapsed", state.collapsed);
    panel.style.left = `${state.panelPosition.left}px`;
    panel.style.top = `${state.panelPosition.top}px`;
    presetSelect.value = state.activePresetId;
    if (!state.customListText) state.customListText = preset.structures.join("\n");
    customList.value = state.customListText;
    togglePanel.textContent = state.collapsed ? "+" : "-";
    toggleBoxes.textContent = state.boxesVisible ? "Hide boxes" : "Show boxes";
    playRange.textContent = state.rangeCineRunning ? "Pause range" : "Play range";
    cineSpeed.value = String(state.rangeCineSpeed);
    cineSpeedValue.textContent = `${Math.round(1000 / state.rangeCineIntervalMs)} fps`;

    const names = state.selectedStructures.length ? state.selectedStructures : preset.structures;
    selected.textContent = names.join(", ");
  }

  function getActivePreset() {
    return PRESETS.find((preset) => preset.id === state.activePresetId) || PRESETS[0];
  }

  function parseCustomList() {
    return state.shadow.querySelector("[data-role='custom-list']").value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
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

  async function searchAndClickStructure(structureName) {
    const input = findModuleSearchInput();
    if (!input) {
      return { ok: false, reason: "Open the e-Anatomy viewer first; I could not find 'Search in this module'." };
    }

    await focusModuleSearch(input);
    await clearSearchInput(input);
    await delay(160);
    await typeSearchValue(input, structureName);
    await delay(180);

    const result = await waitFor(() => findSearchResult(structureName, input), 5200, 120);
    if (!result) {
      pressSearchKey(input, "ArrowDown");
      await delay(120);
      pressSearchKey(input, "Enter");
      return { ok: true, fallback: true };
    }

    input.focus();
    await delay(80);
    clickElement(result);
    return { ok: true };
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

  async function typeSearchValue(input, value) {
    setInputValue(input, "");
    let nextValue = "";
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
      await delay(14);
    }
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
    const requestedStructures = state.selectedStructures.length ? state.selectedStructures : parseCustomList();
    const lockedStructures = getLockedStructureNames();
    const cineRange = getSuggestedCineRange();
    const manifest = {
      kind: "imaios-cine-anki-card",
      pageTitle: document.title,
      url: location.href,
      preset: getActivePreset().label,
      requestedStructures,
      lockedStructures,
      confirmedLockedCount: countLockedMatches(requestedStructures),
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
    const structures = state.selectedStructures.length ? state.selectedStructures : parseCustomList();
    const prompt = [
      "Create a compact Anki set for identifying these neck muscles on IMAIOS head and neck CT cine clips:",
      "",
      structures.map((name) => `- ${name}`).join("\n"),
      "",
      "Use the clips as the visual prompt. Make cards that test image identification first, then add the minimum anatomy needed to prevent confusion with neighboring muscles.",
      "For each structure, include plane-specific recognition cues for axial, coronal, and sagittal review when useful. Include relationships, attachments, and action/innervation only when they help localization or high-yield discrimination.",
      "Avoid pathology framing. Keep the cards anatomy-first and concise.",
      "",
      "Return TSV columns: Front, Back, Extra, Tags."
    ].join("\n");
    await writeClipboard(prompt);
    setStatus("Card prompt copied.");
  }

  async function copyAvailableLabels() {
    const exportData = buildAvailableLabelsExport();
    await writeClipboard(JSON.stringify(exportData, null, 2));
    const muscleSuffix = exportData.muscleLikeLabels.length ? `, ${exportData.muscleLikeLabels.length} muscle-like` : "";
    setStatus(`Copied ${exportData.labels.length} labels${muscleSuffix}.`);
  }

  function buildAvailableLabelsExport() {
    const entries = getAvailableStructureEntries();
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
      series: getSeriesInfo(),
      slice: getSliceInfo(),
      counts: {
        labels: labels.length,
        muscleLikeLabels: muscleLikeLabels.length,
        rawEntries: entries.length
      },
      sourceCounts,
      muscleLikeLabels,
      labels
    };
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
    const mode = normalizedDirection < 0 ? "backward" : "forward";
    if (state.rangeCineRunning && state.rangeCineMode === mode) {
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
    state.rangeCineMode = mode;
    refreshPanel();
    setStatus(`Playing range ${range.startSlice}-${range.endSlice} ${mode}.`, 0);
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
      const slice = Number.isFinite(state.rangeCineCurrent) ? state.rangeCineCurrent : range.startSlice;
      const moved = await setViewerSlice(slice);
      if (!moved.ok) {
        stopRangeCine({ quiet: true });
        setStatus(moved.reason);
        return;
      }
      const direction = state.rangeCineDirection || 1;
      let nextSlice = slice + direction;
      if (state.rangeCineMode === "forward") {
        nextSlice = nextSlice > range.endSlice ? range.startSlice : nextSlice;
      } else if (state.rangeCineMode === "backward") {
        nextSlice = nextSlice < range.startSlice ? range.endSlice : nextSlice;
      } else if (range.startSlice === range.endSlice) {
        nextSlice = range.startSlice;
      } else if (nextSlice > range.endSlice) {
        state.rangeCineDirection = -1;
        nextSlice = range.endSlice - 1;
      } else if (nextSlice < range.startSlice) {
        state.rangeCineDirection = 1;
        nextSlice = range.startSlice + 1;
      }
      state.rangeCineCurrent = nextSlice;
    } finally {
      state.rangeCineBusy = false;
    }
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
    const currentPlane = normalizePlaneName(getSeriesInfo().selectedPlane);
    if (currentPlane === plane) {
      setStatus(`Already on ${plane}.`);
      return;
    }

    const menuButton = findPlaneSelectorButton();
    if (menuButton) {
      clickElement(menuButton);
      await delay(260);
    }

    let option = await waitFor(() => findPlaneOption(plane), 1800, 120);
    if (!option && menuButton) {
      clickElement(menuButton);
      await delay(260);
      option = await waitFor(() => findPlaneOption(plane), 1200, 120);
    }

    if (!option) {
      setStatus(`Could not find ${plane}. Open All series/plane menu, then try Alt+1/2/3 again.`, 7000);
      return;
    }

    clickElement(option);
    setStatus(`Switching to ${plane}...`);
  }

  function normalizePlaneName(value) {
    const match = String(value || "").match(/\b(Axial|Coronal|Sagittal)\b/i);
    if (!match) return "";
    return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  }

  function findPlaneSelectorButton() {
    const currentPlane = normalizePlaneName(getSeriesInfo().selectedPlane);
    const candidates = Array.from(document.body.querySelectorAll("button,[role='button'],div,span"))
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

  function findPlaneOption(targetPlane) {
    const expected = normalizeText(targetPlane);
    const candidates = Array.from(document.body.querySelectorAll("button,li,a,p,span,div,[role='option'],[role='menuitem'],[role='button']"))
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

    candidates.sort((a, b) => scorePlaneOption(b.element, targetPlane) - scorePlaneOption(a.element, targetPlane));
    return candidates.length ? getPlaneOptionClickTarget(candidates[0].element) : null;
  }

  function scorePlaneOption(element, targetPlane) {
    const rect = element.getBoundingClientRect();
    let score = 0;
    if (element.matches("button,li,a,[role='option'],[role='menuitem'],[role='button']")) score += 14;
    if (element.closest("[class*='dropdown'],[class*='menu'],[class*='select'],[role='listbox'],[role='menu']")) score += 16;
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
    const titleCandidates = Array.from(document.querySelectorAll("[class*='title'],[title],p,span,button,div"))
      .filter((element) => isVisible(element))
      .map((element) => cleanText(element.getAttribute("title") || element.textContent || ""))
      .filter((text) => /head and neck|axial|sagittal|coronal|3d/i.test(text))
      .slice(0, 30);

    return {
      visibleTextCandidates: unique(titleCandidates),
      selectedPlane: inferSelectedPlane(titleCandidates)
    };
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

  function onKeyDown(event) {
    if (event.__imaiosCineToolsHandled) return;
    const isEditing = isEditableEventTarget(event);
    if (isPlainSpaceEvent(event) && !isEditing) {
      markKeyboardEventHandled(event);
      toggleRangeCine();
      return;
    }
    const cineDirection = getDirectionalCineHotkey(event);
    if (cineDirection && !isEditing) {
      markKeyboardEventHandled(event);
      startDirectionalRangeCine(cineDirection);
      return;
    }
    const targetPlane = getPlaneHotkey(event);
    if (targetPlane && !isEditing) {
      markKeyboardEventHandled(event);
      switchPlane(targetPlane);
      return;
    }

    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const key = event.key.toLowerCase();
    if (key === "i") {
      state.collapsed = !state.collapsed;
      savePageState();
      refreshPanel();
      markKeyboardEventHandled(event);
    } else if (key === "b") {
      state.boxesVisible = !state.boxesVisible;
      savePageState();
      renderBoxes();
      refreshPanel();
      markKeyboardEventHandled(event);
    }
  }

  function onKeyUp(event) {
    if (event.__imaiosCineToolsHandled) return;
    if ((isPlainSpaceEvent(event) || getDirectionalCineHotkey(event) || getPlaneHotkey(event)) && !isEditableEventTarget(event)) {
      markKeyboardEventHandled(event);
    }
  }

  function isPlainSpaceEvent(event) {
    return !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
      && (event.code === "Space" || event.key === " " || event.key === "Spacebar");
  }

  function getDirectionalCineHotkey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return 0;
    if (event.key === "]" || event.code === "BracketRight") return 1;
    if (event.key === "[" || event.code === "BracketLeft") return -1;
    return 0;
  }

  function getPlaneHotkey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return "";
    if (event.key === "1" || event.code === "Digit1") return "Axial";
    if (event.key === "2" || event.code === "Digit2") return "Coronal";
    if (event.key === "3" || event.code === "Digit3") return "Sagittal";
    return "";
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
