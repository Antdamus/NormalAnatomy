(() => {
  if (window.__radprimerRunnerPageButtonLoaded) return;
  window.__radprimerRunnerPageButtonLoaded = true;

  const HOST_ID = "radprimer-runner-page-button";

  const MODE_OPTIONS = {
    pathology: [
      ["chatgpt_cards", "Cards - ChatGPT autonomous"],
      ["codex_cards", "Cards - Codex workflow"],
      ["narrative", "Narrative"]
    ],
    normal: [
      ["chatgpt_cards", "Cards - ChatGPT autonomous"],
      ["codex_cards", "Cards - Codex workflow"],
      ["narrative_with_images", "Narrative + image downloads"],
      ["narrative", "Narrative"],
      ["no_pictures", "Cards - no pictures"],
      ["captions_only", "Cards - captions only"]
    ]
  };

  const DEFAULTS = {
    engine: "pathology",
    mode: "chatgpt_cards",
    include: "all",
    caseMap: "",
    coreGap: false,
    coreSection: "it might be in multiple regions of the book so you are going to have to look through it",
    corePages: "",
    sourceNote: "",
    coreNote: "",
    downloadImages: true,
    downloadPlain: true,
    downloadAnnotated: true,
    sendImagesToAnki: false,
    keepCaptionHtml: true,
    autoGroupNonNarrative: true,
    openChatGPT: true,
    autoSubmitChatGPT: true,
    chatgptUrl: "https://chatgpt.com/g/g-p-69e5418624448191a7a74b18f607688b-pediatrics/project",
    chatgptInstruction: "make sure you do not truncate the text and read the entire message",
    chatgptTimeoutSec: "900",
    autoSendToSpeechify: true,
    speechifyAutoSave: true,
    speechifyFolderUrl: "https://app.speechify.com/?folder=c00e2ad9-89b5-4829-9884-cde0dc8b82a7"
  };

  const getStoredSettings = async () => {
    const stored = await chrome.storage.local.get("radprimerRunnerSettings");
    return { ...DEFAULTS, ...(stored.radprimerRunnerSettings || {}) };
  };

  const saveSettings = async (settings) => {
    await chrome.storage.local.set({ radprimerRunnerSettings: settings });
  };

  const ensureHost = () => {
    let host = document.getElementById(HOST_ID);
    if (host) return host;

    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.position = "fixed";
    host.style.right = "22px";
    host.style.bottom = "24px";
    host.style.zIndex = "2147483647";
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .root {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #0f172a;
        }
        .dock {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }
        .actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        button {
          border: 0;
          cursor: pointer;
          font: inherit;
          letter-spacing: 0;
        }
        .primary, .icon {
          color: #fff;
          background: linear-gradient(135deg, rgba(20, 105, 255, .98), rgba(80, 58, 220, .98));
          box-shadow: 0 16px 42px rgba(31, 111, 235, .28), 0 6px 16px rgba(12, 18, 28, .24);
          transition: transform .16s ease, box-shadow .16s ease, opacity .16s ease;
        }
        .primary {
          border-radius: 999px;
          padding: 13px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 800;
        }
        .icon {
          width: 46px;
          height: 46px;
          border-radius: 999px;
          display: grid;
          place-items: center;
        }
        .primary:hover, .icon:hover {
          transform: translateY(-1px);
          box-shadow: 0 20px 48px rgba(31, 111, 235, .34), 0 8px 20px rgba(12, 18, 28, .28);
        }
        .primary[disabled], .icon[disabled] {
          cursor: default;
          opacity: .76;
          transform: none;
        }
        .spark {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(255,255,255,.18);
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }
        svg { width: 16px; height: 16px; display: block; }
        .status {
          width: 360px;
          max-width: calc(100vw - 44px);
          border-radius: 12px;
          padding: 10px 12px;
          background: rgba(14, 20, 30, .92);
          color: #edf4ff;
          box-shadow: 0 14px 42px rgba(0,0,0,.24);
          border: 1px solid rgba(255,255,255,.14);
          backdrop-filter: blur(16px);
          display: none;
        }
        .status.show { display: block; }
        .phase {
          color: #99bdff;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .msg {
          color: #f5f8ff;
          font-size: 12px;
          line-height: 1.35;
          white-space: pre-wrap;
        }
        .error .phase { color: #ffb4b4; }
        .backdrop {
          position: fixed;
          inset: 0;
          display: none;
          place-items: center;
          background: rgba(6, 10, 18, .42);
          backdrop-filter: blur(10px);
        }
        .backdrop.open { display: grid; }
        .modal {
          width: min(820px, calc(100vw - 38px));
          max-height: min(84vh, 840px);
          overflow: auto;
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,250,252,.98));
          border: 1px solid rgba(148, 163, 184, .28);
          box-shadow: 0 34px 110px rgba(15, 23, 42, .34);
        }
        .modal-head {
          padding: 24px 26px 18px;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }
        h2 {
          margin: 0 0 6px;
          font-size: 22px;
          line-height: 1.2;
          color: #0f172a;
        }
        .sub {
          margin: 0;
          color: #64748b;
          font-size: 13.5px;
          max-width: 560px;
        }
        .close {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: #eef2f7;
          color: #0f172a;
          font-weight: 900;
        }
        .modal-body {
          padding: 0 26px 24px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .wide { grid-column: 1 / -1; }
        .spaced { margin-top: 14px; }
        .card {
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: rgba(255,255,255,.82);
          padding: 16px;
          margin-top: 14px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, .055);
        }
        .card:first-child { margin-top: 0; }
        .card-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .card-title h3 {
          margin: 0;
          font-size: 14px;
          color: #0f172a;
        }
        .hint {
          color: #64748b;
          font-size: 12px;
          line-height: 1.35;
        }
        label {
          display: block;
          font-size: 12px;
          font-weight: 800;
          color: #1e293b;
        }
        input[type="text"], select, textarea {
          width: 100%;
          margin-top: 5px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #0f172a;
          border-radius: 12px;
          padding: 10px 11px;
          font: inherit;
          font-size: 13px;
          outline: none;
        }
        textarea { resize: vertical; min-height: 62px; }
        input[type="text"]:focus, select:focus, textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, .14);
        }
        .checks {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .check {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 10px 11px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          font-size: 12px;
          font-weight: 750;
        }
        .check input { margin: 0; }
        details {
          margin-top: 14px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          background: rgba(248,250,252,.78);
          overflow: hidden;
        }
        summary {
          cursor: pointer;
          padding: 13px 15px;
          font-size: 13px;
          font-weight: 850;
          color: #334155;
          list-style: none;
        }
        summary::-webkit-details-marker { display: none; }
        summary::after {
          content: "+";
          float: right;
          color: #64748b;
        }
        details[open] summary::after { content: "-"; }
        .details-body {
          padding: 0 15px 15px;
        }
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding-top: 18px;
        }
        .ghost {
          border-radius: 10px;
          padding: 10px 13px;
          background: #eef2f7;
          color: #0f172a;
          font-weight: 850;
        }
        .run-config {
          border-radius: 10px;
          padding: 10px 15px;
          background: #1f6feb;
          color: #fff;
          font-weight: 850;
        }
      </style>
      <div class="root">
        <div class="dock">
          <div class="status" role="status" aria-live="polite">
            <div class="phase">Ready</div>
            <div class="msg">Ready.</div>
          </div>
          <div class="actions">
            <button class="icon configure" type="button" title="Configure run">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" stroke="currentColor" stroke-width="2"/>
                <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.1 2.1 0 0 1-2.97 2.97l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.09 1.65V21.3a2.1 2.1 0 0 1-4.2 0v-.06a1.8 1.8 0 0 0-1.09-1.65 1.8 1.8 0 0 0-1.98.36l-.04.04a2.1 2.1 0 1 1-2.97-2.97l.04-.04A1.8 1.8 0 0 0 3.8 15a1.8 1.8 0 0 0-1.65-1.09H2.1a2.1 2.1 0 0 1 0-4.2h.06A1.8 1.8 0 0 0 3.8 8.62a1.8 1.8 0 0 0-.36-1.98l-.04-.04A2.1 2.1 0 0 1 6.37 3.63l.04.04a1.8 1.8 0 0 0 1.98.36A1.8 1.8 0 0 0 9.48 2.38V2.1a2.1 2.1 0 0 1 4.2 0v.28a1.8 1.8 0 0 0 1.09 1.65 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.1 2.1 0 1 1 2.97 2.97l-.04.04a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.09h.28a2.1 2.1 0 0 1 0 4.2h-.28A1.8 1.8 0 0 0 19.4 15Z" stroke="currentColor" stroke-width="1.7"/>
              </svg>
            </button>
            <button class="icon image-only" type="button" title="Download images only">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16h-11A2.5 2.5 0 0 1 4 13.5v-7Z" stroke="currentColor" stroke-width="1.8"/>
                <path d="M7 13l2.7-2.7 2.1 2.1L14.2 10 17 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 17v4m0 0 2-2m-2 2-2-2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="primary quick-run" type="button" title="Run with saved settings">
              <span class="spark" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M13 3 5 14h6l-1 7 9-12h-6l0-6Z" fill="currentColor"/>
                </svg>
              </span>
              <span class="label">Run lecture</span>
            </button>
          </div>
        </div>
        <div class="backdrop">
          <div class="modal" role="dialog" aria-modal="true" aria-label="RadPrimer runner settings">
            <div class="modal-head">
              <div>
                <h2>Run this RadPrimer article</h2>
                <p class="sub">Choose the engine, mode, images, ChatGPT, and Speechify path for this run.</p>
              </div>
              <button class="close" type="button" aria-label="Close">x</button>
            </div>
            <div class="modal-body">
              <section class="card">
                <div class="card-title">
                  <h3>Teaching Mode</h3>
                  <span class="hint">The only choice you usually need.</span>
                </div>
                <div class="grid">
                  <label>Engine<select data-field="engine"></select></label>
                  <label>Mode<select data-field="mode"></select></label>
                </div>
              </section>

              <section class="card">
                <div class="card-title">
                  <h3>Destinations</h3>
                  <span class="hint">ChatGPT creates it. Speechify stores it.</span>
                </div>
                <div class="checks">
                  <label class="check"><input data-field="openChatGPT" type="checkbox"> Open ChatGPT</label>
                  <label class="check"><input data-field="autoSubmitChatGPT" type="checkbox"> Submit automatically</label>
                  <label class="check"><input data-field="autoSendToSpeechify" type="checkbox"> Send narrative to Speechify</label>
                  <label class="check"><input data-field="speechifyAutoSave" type="checkbox"> Auto-save Speechify</label>
                </div>
                <div class="grid spaced">
                  <label class="wide">Speechify folder link<input data-field="speechifyFolderUrl" type="text"></label>
                  <span class="hint wide">Speechify runs only for Normal Narrative, Normal Narrative + image downloads, and Pathology Narrative. Card modes stop after ChatGPT submission.</span>
                </div>
              </section>

              <details>
                <summary>Images and case grouping</summary>
                <div class="details-body">
                  <div class="grid">
                    <label>Include images<input data-field="include" type="text" placeholder="all, none, or 1,2,5"></label>
                    <label>Case map<input data-field="caseMap" type="text" placeholder="1,2; 5,6"></label>
                  </div>
                  <div class="checks" style="margin-top: 12px;">
                    <label class="check"><input data-field="autoGroupNonNarrative" type="checkbox"> Auto-group card modes first</label>
                    <label class="check"><input data-field="downloadImages" type="checkbox"> Download selected images</label>
                    <label class="check"><input data-field="downloadPlain" type="checkbox"> Plain images</label>
                    <label class="check"><input data-field="downloadAnnotated" type="checkbox"> Annotated images</label>
                    <label class="check"><input data-field="sendImagesToAnki" type="checkbox"> Local watcher copies images to Anki</label>
                    <label class="check"><input data-field="keepCaptionHtml" type="checkbox"> Keep arrow HTML</label>
                  </div>
                  <span class="hint wide">Image files stage in Downloads\\RadPrimer. The local watcher mirrors checked runs into Anki collection.media.</span>
                </div>
              </details>

              <details>
                <summary>Source notes</summary>
                <div class="details-body">
                  <div class="grid">
                    <label class="wide">Core section / note<textarea data-field="coreSection"></textarea></label>
                    <label>Core pages<input data-field="corePages" type="text"></label>
                    <label class="check"><input data-field="coreGap" type="checkbox"> Core GAP</label>
                    <label class="wide">Normal source note<textarea data-field="sourceNote"></textarea></label>
                    <label class="wide">Normal Core note<textarea data-field="coreNote"></textarea></label>
                  </div>
                </div>
              </details>

              <details>
                <summary>ChatGPT details</summary>
                <div class="details-body">
                  <div class="grid">
                    <label class="wide">ChatGPT project URL<input data-field="chatgptUrl" type="text"></label>
                    <label class="wide">Composer instruction<textarea data-field="chatgptInstruction"></textarea></label>
                    <label>Wait timeout, seconds<input data-field="chatgptTimeoutSec" type="text"></label>
                  </div>
                </div>
              </details>

              <div class="modal-actions">
                <button class="ghost save-only" type="button">Save settings</button>
                <button class="ghost download-config" type="button">Save and download images</button>
                <button class="run-config" type="button">Save and run</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    shadow.querySelector(".quick-run").addEventListener("click", () => runFromPage(host));
    shadow.querySelector(".image-only").addEventListener("click", () => downloadImagesOnly(host));
    shadow.querySelector(".configure").addEventListener("click", () => openModal(host));
    shadow.querySelector(".close").addEventListener("click", () => closeModal(host));
    shadow.querySelector(".backdrop").addEventListener("click", (event) => {
      if (event.target === event.currentTarget) closeModal(host);
    });
    shadow.querySelector('[data-field="engine"]').addEventListener("change", () => {
      populateModeSelect(host);
      applyNarrativeModeDefaults(host);
      syncSpeechifyAvailability(host);
    });
    shadow.querySelector('[data-field="mode"]').addEventListener("change", () => {
      applyNarrativeModeDefaults(host);
      syncSpeechifyAvailability(host);
    });
    shadow.querySelector('[data-field="autoSendToSpeechify"]').addEventListener("change", () => {
      const autoSend = field(host, "autoSendToSpeechify").checked;
      if (autoSend) {
        field(host, "openChatGPT").checked = true;
        field(host, "autoSubmitChatGPT").checked = true;
      }
    });
    shadow.querySelector(".save-only").addEventListener("click", async () => {
      await saveSettings(readModalSettings(host));
      setStatus(host, "Saved", "Settings saved.");
      closeModal(host);
    });
    shadow.querySelector(".run-config").addEventListener("click", async () => {
      await saveSettings(readModalSettings(host));
      closeModal(host);
      runFromPage(host);
    });
    shadow.querySelector(".download-config").addEventListener("click", async () => {
      await saveSettings(readModalSettings(host));
      closeModal(host);
      downloadImagesOnly(host);
    });

    return host;
  };

  const field = (host, name) => host.shadowRoot.querySelector(`[data-field="${name}"]`);

  const populateEngineSelect = (host) => {
    const select = field(host, "engine");
    select.textContent = "";
    [
      ["pathology", "Pathology / disease"],
      ["normal", "Normal anatomy"]
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
  };

  const populateModeSelect = (host, selectedMode) => {
    const engine = field(host, "engine").value || DEFAULTS.engine;
    const select = field(host, "mode");
    select.textContent = "";
    for (const [value, label] of MODE_OPTIONS[engine]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    }
    const allowed = MODE_OPTIONS[engine].map(([value]) => value);
    select.value = allowed.includes(selectedMode) ? selectedMode : allowed[0];
    syncSpeechifyAvailability(host);
  };

  const isNarrativeSpeechifyMode = (values) => {
    if (!values) return false;
    if (values.engine === "pathology") return values.mode === "narrative";
    if (values.engine === "normal") {
      return values.mode === "narrative" || values.mode === "narrative_with_images";
    }
    return false;
  };

  const syncSpeechifyAvailability = (host) => {
    const values = {
      engine: field(host, "engine")?.value || DEFAULTS.engine,
      mode: field(host, "mode")?.value || DEFAULTS.mode
    };
    const eligible = isNarrativeSpeechifyMode(values);
    const autoSend = field(host, "autoSendToSpeechify");
    const autoSave = field(host, "speechifyAutoSave");
    if (!autoSend || !autoSave) return;

    autoSend.disabled = !eligible;
    autoSave.disabled = !eligible;
    if (!eligible) {
      autoSend.checked = false;
      autoSave.checked = false;
    }
  };

  const applyNarrativeModeDefaults = (host) => {
    const values = {
      engine: field(host, "engine")?.value || DEFAULTS.engine,
      mode: field(host, "mode")?.value || DEFAULTS.mode
    };
    if (!isNarrativeSpeechifyMode(values)) return;

    field(host, "include").value = "all";
    field(host, "caseMap").value = "";
    field(host, "openChatGPT").checked = true;
    field(host, "autoSubmitChatGPT").checked = true;
    field(host, "autoSendToSpeechify").checked = true;
    field(host, "speechifyAutoSave").checked = true;
  };

  const openModal = async (host) => {
    const settings = await getStoredSettings();
    populateEngineSelect(host);
    writeModalSettings(host, settings);
    host.shadowRoot.querySelector(".backdrop").classList.add("open");
  };

  const closeModal = (host) => {
    host.shadowRoot.querySelector(".backdrop").classList.remove("open");
  };

  const writeModalSettings = (host, settings) => {
    const values = { ...DEFAULTS, ...settings };
    field(host, "engine").value = values.engine || DEFAULTS.engine;
    populateModeSelect(host, values.mode || DEFAULTS.mode);

    for (const key of Object.keys(DEFAULTS)) {
      const el = field(host, key);
      if (!el) continue;
      if (el.type === "checkbox") el.checked = Boolean(values[key]);
      else el.value = values[key] ?? "";
    }
    applyNarrativeModeDefaults(host);
    syncSpeechifyAvailability(host);
  };

  const readModalSettings = (host) => {
    const values = { ...DEFAULTS };
    for (const key of Object.keys(DEFAULTS)) {
      const el = field(host, key);
      if (!el) continue;
      values[key] = el.type === "checkbox" ? el.checked : el.value.trim();
    }

    if (values.autoSendToSpeechify) {
      values.openChatGPT = true;
      values.autoSubmitChatGPT = true;
    }
    if (isNarrativeSpeechifyMode(values)) {
      values.include = "all";
      values.caseMap = "";
      values.openChatGPT = true;
      values.autoSubmitChatGPT = true;
      values.autoSendToSpeechify = true;
      values.speechifyAutoSave = true;
    }
    if (!isNarrativeSpeechifyMode(values)) {
      values.autoSendToSpeechify = false;
      values.speechifyAutoSave = false;
    }

    return values;
  };

  const setStatus = (host, phase, message, isError = false) => {
    const shadow = host.shadowRoot;
    const status = shadow.querySelector(".status");
    status.classList.add("show");
    status.classList.toggle("error", Boolean(isError));
    shadow.querySelector(".phase").textContent = phase || "";
    shadow.querySelector(".msg").textContent = message || "";
  };

  const setRunning = (host, running) => {
    const quick = host.shadowRoot.querySelector(".quick-run");
    const config = host.shadowRoot.querySelector(".configure");
    const imageOnly = host.shadowRoot.querySelector(".image-only");
    quick.disabled = running;
    config.disabled = running;
    imageOnly.disabled = running;
    quick.querySelector(".label").textContent = running ? "Running..." : "Run lecture";
  };

  const runFromPage = (host) => {
    setRunning(host, true);
    setStatus(host, "Starting", "Starting RadPrimer workflow...");
    chrome.runtime.sendMessage({ type: "RUN_RADPRIMER_FROM_PAGE" }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        setStatus(host, "Error", err.message, true);
        setRunning(host, false);
        return;
      }
      if (!response?.ok) {
        setStatus(host, "Error", response?.error || "Workflow failed.", true);
        setRunning(host, false);
        return;
      }
      setStatus(host, "Done", response.message || "Workflow started.");
      setRunning(host, false);
    });
  };

  const downloadImagesOnly = (host) => {
    setRunning(host, true);
    setStatus(host, "Images", "Downloading images only...");
    chrome.runtime.sendMessage({ type: "RUN_RADPRIMER_IMAGE_DOWNLOAD_ONLY" }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        setStatus(host, "Image Error", err.message, true);
        setRunning(host, false);
        return;
      }
      if (!response?.ok) {
        setStatus(host, "Image Error", response?.error || "Image download failed.", true);
        setRunning(host, false);
        return;
      }
      setStatus(host, "Images Done", response.message || "Image download complete.");
      setRunning(host, false);
    });
  };

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "RADPRIMER_PAGE_RUN_STATUS") return;
    const host = ensureHost();
    setStatus(host, message.phase || "Status", message.message || "", Boolean(message.error));
    if (message.done || message.error) setRunning(host, false);
  });

  ensureHost();
})();
