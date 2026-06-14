(() => {
  if (window.__radprimerRunnerPageButtonLoaded) return;
  window.__radprimerRunnerPageButtonLoaded = true;

  const HOST_ID = "radprimer-runner-page-button";
  const SOURCE_LABEL = location.hostname.includes("statdx") ? "STATdx" : "RadPrimer";

  const WORKFLOW_MODE_OPTIONS = [
    ["io_queue", "Build IO queue"],
    ["no_pictures", "Build cards without images"],
    ["chatgpt_cards", "Build cards with images"],
    ["narrative", "Narrative mode"]
  ];

  const MODE_OPTIONS = {
    pathology: WORKFLOW_MODE_OPTIONS,
    normal: WORKFLOW_MODE_OPTIONS
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
    cardModeDownloadImagesDisabled: false,
    downloadPlain: true,
    downloadAnnotated: true,
    keepCaptionHtml: true,
    autoGroupNonNarrative: true,
    captureCardAuditBundle: false,
    openChatGPT: true,
    autoSubmitChatGPT: true,
    chatgptUrl: "https://chatgpt.com/g/g-p-69e5418624448191a7a74b18f607688b-pediatrics/project",
    chatgptInstruction: "make sure you do not truncate the text and read the entire message",
    chatgptTimeoutSec: "900",
    cardAuditTimeoutSec: "3600",
    createAnkiImportFile: true,
    ankiDeckMode: "auto",
    ankiPathologyRoot: "Corebook",
    ankiNormalRoot: "RadprimerNormal",
    ankiDeckRoot: "Corebook::MSK::Trauma::Introduction to Osseous Trauma",
    ankiNoteType: "core_rad_notetype_v2",
    preferRadPrimerHierarchyForStatdx: true,
    useMasterSource: false,
    sourcePairingKey: "",
    autoSendToSpeechify: true,
    speechifyAutoSave: false,
    speechifyKeepAwake: false,
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
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }
        .root {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 16px;
          color: #0f172a;
          min-width: 0;
        }
        .dock {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }
        .actions {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 6px;
          border-radius: 999px;
          background: rgba(11, 17, 29, 0.86);
          border: 1px solid rgba(191, 219, 254, 0.22);
          box-shadow: 0 16px 46px rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(16px);
        }
        button {
          border: 0;
          cursor: pointer;
          font: inherit;
          letter-spacing: 0;
        }
        .primary, .icon {
          color: #fff;
          background: rgba(30, 41, 59, 0.86);
          transition: transform .16s ease, background .16s ease, opacity .16s ease, width .16s ease;
        }
        .primary {
          border-radius: 999px;
          width: 40px;
          height: 38px;
          padding: 0 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          font-size: 12px;
          font-weight: 850;
          overflow: hidden;
        }
        .icon {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          display: grid;
          place-items: center;
        }
        .primary:hover, .icon:hover {
          transform: translateY(-1px);
          background: rgba(51, 65, 85, 0.96);
        }
        .actions:hover .primary,
        .primary:focus-visible {
          width: 124px;
          gap: 8px;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.94), rgba(129, 140, 248, 0.96));
          box-shadow: 0 10px 26px rgba(59, 130, 246, 0.22);
        }
        .primary[disabled], .icon[disabled] {
          cursor: default;
          opacity: .76;
          transform: none;
        }
        .spark {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255,255,255,.18);
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }
        .quick-run .label {
          max-width: 0;
          opacity: 0;
          overflow: hidden;
          white-space: nowrap;
          transition: max-width .16s ease, opacity .16s ease;
        }
        .actions:hover .quick-run .label,
        .quick-run:focus-visible .label {
          max-width: 90px;
          opacity: 1;
        }
        svg { width: 16px; height: 16px; display: block; }
        .status {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 6;
          width: min(430px, calc(100vw - 48px));
          border-radius: 12px;
          padding: 10px 12px;
          background: rgba(14, 20, 30, .92);
          color: #edf4ff;
          box-shadow: 0 14px 42px rgba(0,0,0,.24);
          border: 1px solid rgba(255,255,255,.14);
          backdrop-filter: blur(16px);
          display: none;
          cursor: pointer;
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
          padding: 28px;
          background:
            radial-gradient(circle at 18% 12%, rgba(191, 219, 254, .34), transparent 30%),
            radial-gradient(circle at 84% 8%, rgba(167, 139, 250, .22), transparent 26%),
            rgba(6, 10, 18, .44);
          backdrop-filter: blur(14px);
          z-index: 4;
        }
        .backdrop.open { display: grid; }
        .modal {
          width: min(1120px, calc(100vw - 56px));
          max-height: min(88vh, 900px);
          overflow: auto;
          border-radius: 28px;
          background:
            linear-gradient(145deg, rgba(255,255,255,.98), rgba(246,249,255,.98));
          border: 1px solid rgba(191, 219, 254, .48);
          box-shadow: 0 38px 120px rgba(15, 23, 42, .36);
        }
        .modal-head {
          padding: 28px 30px 16px;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }
        .modal-head-actions {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          flex: 0 0 auto;
        }
        .modal-head > div:first-child {
          min-width: 0;
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
        .master-source-banner {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 9px;
          width: min(100%, 720px);
          min-height: 38px;
          padding: 9px 12px;
          border-radius: 999px;
          background: rgba(248, 250, 252, .9);
          border: 1px solid rgba(203, 213, 225, .86);
          color: #475569;
          font-size: 12.5px;
          font-weight: 750;
          line-height: 1.25;
          overflow: hidden;
        }
        .master-source-banner .dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          flex: 0 0 auto;
          background: #94a3b8;
          box-shadow: 0 0 0 4px rgba(148, 163, 184, .15);
        }
        .master-source-banner .copy {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .master-source-banner.active {
          background: linear-gradient(135deg, rgba(236, 253, 245, .96), rgba(239, 246, 255, .96));
          border-color: rgba(34, 197, 94, .32);
          color: #14532d;
        }
        .master-source-banner.active .dot {
          background: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, .14);
        }
        .master-source-banner.loaded {
          background: rgba(239, 246, 255, .96);
          border-color: rgba(147, 197, 253, .55);
          color: #1e3a8a;
        }
        .master-source-banner.loaded .dot {
          background: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, .14);
        }
        .master-source-banner.error {
          background: rgba(254, 242, 242, .96);
          border-color: rgba(248, 113, 113, .38);
          color: #7f1d1d;
        }
        .master-source-banner.error .dot {
          background: #ef4444;
          box-shadow: 0 0 0 4px rgba(239, 68, 68, .14);
        }
        .close {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: #eef2f7;
          color: #0f172a;
          font-weight: 900;
        }
        .top-master-source {
          border-radius: 999px;
          padding: 10px 14px;
          background: #dbeafe;
          color: #1e3a8a;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }
        .modal-status {
          display: none;
          position: sticky;
          top: 0;
          margin: 0 30px 16px;
          z-index: 7;
          border-radius: 16px;
          padding: 12px 14px;
          background: linear-gradient(135deg, rgba(15, 23, 42, .94), rgba(30, 41, 59, .92));
          border: 1px solid rgba(191, 219, 254, .28);
          color: #f8fbff;
          box-shadow: 0 16px 44px rgba(15, 23, 42, .18);
          cursor: pointer;
        }
        .modal-status.show { display: block; }
        .modal-status.error { background: linear-gradient(135deg, rgba(69, 10, 10, .94), rgba(127, 29, 29, .9)); }
        .modal-status .phase { margin-bottom: 4px; }
        .modal-status .msg { font-size: 13px; }
        .modal-body {
          padding: 0 30px 28px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, .9fr);
          gap: 16px;
          min-width: 0;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          min-width: 0;
        }
        .wide { grid-column: 1 / -1; }
        .spaced { margin-top: 14px; }
        .card {
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: rgba(255,255,255,.82);
          padding: 18px;
          margin-top: 0;
          box-shadow: 0 12px 34px rgba(15, 23, 42, .055);
          min-width: 0;
        }
        .card.master-card {
          grid-column: 1 / -1;
          background:
            linear-gradient(135deg, rgba(239, 246, 255, .98), rgba(255,255,255,.92));
          border-color: rgba(147, 197, 253, .7);
        }
        .card.anki-card { grid-column: 1 / -1; }
        .card.advanced-card { grid-column: 1 / -1; }
        details.card {
          padding: 0;
        }
        details.card .collapse-summary {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 18px;
          list-style: none;
        }
        details.card .collapse-summary h3 {
          margin: 0;
          font-size: 14px;
          color: #0f172a;
          flex: 0 0 auto;
        }
        details.card .collapse-summary .hint {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        details.card .collapse-summary::after {
          content: "+";
          color: #64748b;
          font-weight: 900;
          font-size: 16px;
          flex: 0 0 auto;
        }
        details.card[open] .collapse-summary::after {
          content: "-";
        }
        details.card .collapse-summary::-webkit-details-marker {
          display: none;
        }
        details.card .collapsible-body {
          padding: 0 18px 18px;
        }
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
          min-width: 0;
          overflow-wrap: anywhere;
        }
        input[type="text"], select, textarea {
          width: 100%;
          max-width: 100%;
          min-width: 0;
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
          min-width: 0;
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
          min-width: 0;
          overflow-wrap: anywhere;
          line-height: 1.25;
        }
        .check input {
          margin: 0;
          flex: 0 0 auto;
        }
        @media (max-width: 900px) {
          .modal-body {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .backdrop { padding: 14px; }
          .modal {
            width: calc(100vw - 28px);
            border-radius: 22px;
          }
          .modal-head {
            flex-direction: column;
          }
          .modal-head-actions {
            width: 100%;
            justify-content: space-between;
          }
          .modal-head,
          .modal-body {
            padding-left: 18px;
            padding-right: 18px;
          }
          .grid,
          .checks {
            grid-template-columns: 1fr;
          }
          details.card .collapse-summary {
            align-items: flex-start;
            flex-direction: column;
          }
          details.card .collapse-summary::after {
            position: absolute;
            right: 18px;
          }
        }
        details {
          grid-column: 1 / -1;
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
          grid-column: 1 / -1;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          flex-wrap: wrap;
          padding-top: 18px;
        }
        .ghost {
          border-radius: 10px;
          padding: 10px 13px;
          background: #eef2f7;
          color: #0f172a;
          font-size: 13px;
          font-weight: 850;
        }
        .file-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        input[type="file"] {
          width: 100%;
          margin-top: 5px;
          border: 1px dashed #bfdbfe;
          background: #f8fbff;
          color: #1e293b;
          border-radius: 12px;
          padding: 10px 11px;
          font: inherit;
          font-size: 12px;
        }
        input[type="file"]::file-selector-button {
          border: 0;
          border-radius: 10px;
          padding: 8px 11px;
          margin-right: 10px;
          background: #dbeafe;
          color: #0f172a;
          font-weight: 850;
          cursor: pointer;
        }
        .master-actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .master-actions .ghost {
          min-height: 42px;
          background: #e8f1ff;
          border: 1px solid rgba(147, 197, 253, .54);
        }
        .master-card .checks {
          grid-template-columns: minmax(0, 480px);
        }
        @media (max-width: 860px) {
          .modal-body { grid-template-columns: 1fr; }
          .master-actions { grid-template-columns: 1fr; }
          .checks { grid-template-columns: 1fr; }
        }
        .run-config {
          border-radius: 10px;
          padding: 10px 15px;
          background: #1f6feb;
          color: #fff;
          font-size: 13px;
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
            <button class="icon image-only" type="button" title="Download images only" hidden>
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
          <div class="modal" role="dialog" aria-modal="true" aria-label="Article runner settings">
            <div class="modal-head">
              <div>
                <h2>Run this ${SOURCE_LABEL} article</h2>
                <p class="sub">Choose the engine, mode, images, ChatGPT, and Speechify path for this run.</p>
                <div class="master-source-banner" data-role="masterSourceBanner" title="Master source status">
                  <span class="dot" aria-hidden="true"></span>
                  <span class="copy">Checking imported master source...</span>
                </div>
              </div>
              <div class="modal-head-actions">
                <button class="top-master-source master-source-config" type="button" hidden>Build master source</button>
                <button class="close" type="button" aria-label="Close">x</button>
              </div>
            </div>
            <div class="modal-status" role="status" aria-live="polite">
              <div class="phase">Ready</div>
              <div class="msg">Ready.</div>
            </div>
            <div class="modal-body">
              <section class="card mode-card">
                <div class="card-title">
                  <h3>Teaching Mode</h3>
                  <span class="hint">The only choice you usually need.</span>
                </div>
                <div class="grid">
                  <label>Engine<select data-field="engine"></select></label>
                  <label>Mode<select data-field="mode"></select></label>
                  <label class="check wide"><input data-field="downloadImages" type="checkbox"> Download selected images</label>
                  <label class="wide">ChatGPT project URL<input data-field="chatgptUrl" type="text"></label>
                  <label>Pathology root deck<input data-field="ankiPathologyRoot" type="text"></label>
                  <label>Normal root deck<input data-field="ankiNormalRoot" type="text"></label>
                  <span class="hint wide">Card modes download the curated image set by default. Auto deck routing attaches the article breadcrumb under the selected root deck.</span>
                </div>
              </section>

              <section class="card destination-card">
                <div class="card-title">
                  <h3>Destinations</h3>
                  <span class="hint">ChatGPT creates it. Speechify stores it.</span>
                </div>
                <div class="checks">
                  <label class="check"><input data-field="openChatGPT" type="checkbox"> Open ChatGPT</label>
                  <label class="check"><input data-field="autoSubmitChatGPT" type="checkbox"> Submit automatically</label>
                  <label class="check"><input data-field="captureCardAuditBundle" type="checkbox"> Capture card audit bundle</label>
                  <label class="check"><input data-field="autoSendToSpeechify" type="checkbox"> Send narrative to Speechify</label>
                  <label class="check"><input data-field="speechifyAutoSave" type="checkbox"> Auto-save Speechify (manual save)</label>
                  <label class="check"><input data-field="speechifyKeepAwake" type="checkbox"> Keep Speechify awake</label>
                </div>
                <div class="grid spaced">
                  <label class="wide">Speechify folder link<input data-field="speechifyFolderUrl" type="text"></label>
                  <span class="hint wide">Speechify runs only for narrative modes. Card audit capture is optional and waits for the generated TSV before staging a bundle.</span>
                </div>
              </section>

              <details class="card master-card collapsible-card">
                <summary class="collapse-summary">
                  <h3>Master source</h3>
                  <span class="hint">Use fused RadPrimer + STATdx packages.</span>
                </summary>
                <div class="collapsible-body">
                <div class="checks">
                  <label class="check"><input data-field="useMasterSource" type="checkbox"> Use imported master source</label>
                </div>
                <div class="grid spaced">
                  <label class="wide">Source pairing key<input data-field="sourcePairingKey" type="text" placeholder="Optional shared topic key"></label>
                  <label class="wide">Import master source files<input class="master-source-files" type="file" multiple accept=".json,.txt,.md"></label>
                  <div class="wide master-actions">
                    <button class="ghost import-master-source" type="button">Import master source</button>
                    <button class="ghost show-master-source" type="button">Show imported source</button>
                  </div>
                  <span class="hint wide">Best import is master_source_import.json. Once imported, narrative and card runs use the fused source instead of the live page extraction.</span>
                </div>
                </div>
              </details>

              <details class="card anki-card collapsible-card">
                <summary class="collapse-summary">
                  <h3>Anki import</h3>
                  <span class="hint">Audit output can carry the deck target.</span>
                </summary>
                <div class="collapsible-body">
                <div class="checks">
                  <label class="check"><input data-field="createAnkiImportFile" type="checkbox"> Create Anki import TSV after audit</label>
                  <label class="check"><input data-field="preferRadPrimerHierarchyForStatdx" type="checkbox"> Use saved RadPrimer hierarchy for matching STATdx topics</label>
                </div>
                <div class="grid spaced">
                  <label class="wide">Deck routing<select data-field="ankiDeckMode">
                    <option value="auto">Auto from article breadcrumb</option>
                    <option value="manual">Manual parent deck</option>
                  </select></label>
                  <label class="wide">Manual parent deck<input data-field="ankiDeckRoot" type="text"></label>
                  <label class="wide">Anki note type<input data-field="ankiNoteType" type="text"></label>
                  <span class="hint wide">Auto routing uses the article breadcrumb when available. STATdx can reuse the saved RadPrimer hierarchy for the same title. If RadPrimer and STATdx titles differ, use the same source pairing key on both pages.</span>
                </div>
                </div>
              </details>

              <details>
                <summary>Images and case grouping</summary>
                <div class="details-body">
                  <div class="grid">
                    <label>Include images<input data-field="include" type="text" placeholder="all, none, or 1,2,5"></label>
                    <label>Case map<input data-field="caseMap" type="text" placeholder="1,2; 5,6"></label>
                  </div>
                  <div class="checks" style="margin-top: 12px;">
                    <label class="check"><input data-field="autoGroupNonNarrative" type="checkbox"> Auto-group card modes first</label>
                    <label class="check"><input data-field="downloadPlain" type="checkbox"> Plain images</label>
                    <label class="check"><input data-field="downloadAnnotated" type="checkbox"> Annotated images</label>
                    <label class="check"><input data-field="keepCaptionHtml" type="checkbox"> Keep arrow HTML</label>
                  </div>
                  <span class="hint wide">Image files stage in Downloads\\RadPrimer. If the watcher window is open, it mirrors image files into Anki collection.media.</span>
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
                    <label class="wide">Composer instruction<textarea data-field="chatgptInstruction"></textarea></label>
                    <label>Wait timeout, seconds<input data-field="chatgptTimeoutSec" type="text"></label>
                    <label>Card audit timeout, seconds<input data-field="cardAuditTimeoutSec" type="text"></label>
                  </div>
                </div>
              </details>

              <div class="modal-actions">
                <button class="ghost save-only" type="button">Save settings</button>
                <button class="ghost download-config" type="button" hidden>Save and download images</button>
                <button class="ghost io-queue-config" type="button" hidden>Build IO queue</button>
                <button class="ghost audit-source-config" type="button" hidden>Export audit source</button>
                <button class="ghost compare-source-config" type="button" hidden>Export comparison source</button>
                <button class="run-config" type="button">Save and run selected workflow</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    shadow.querySelector(".quick-run").addEventListener("click", () => runFromPage(host));
    shadow.querySelector(".image-only").addEventListener("click", () => downloadImagesOnly(host));
    shadow.querySelector(".configure").addEventListener("click", () => openModal(host));
    shadow.querySelector(".status").addEventListener("click", () => dismissStatus(host));
    shadow.querySelector(".modal-status").addEventListener("click", () => dismissStatus(host));
    shadow.querySelector(".close").addEventListener("click", () => closeModal(host));
    shadow.querySelector(".backdrop").addEventListener("click", (event) => {
      if (event.target === event.currentTarget) closeModal(host);
    });
    shadow.querySelector('[data-field="engine"]').addEventListener("change", () => {
      populateModeSelect(host);
      applyNarrativeModeDefaults(host);
      applyIoQueueModeDefaults(host);
      applyNoPictureModeDefaults(host);
      applyCardModeDefaults(host);
      syncSpeechifyAvailability(host);
    });
    shadow.querySelector('[data-field="mode"]').addEventListener("change", () => {
      applyNarrativeModeDefaults(host);
      applyIoQueueModeDefaults(host);
      applyNoPictureModeDefaults(host);
      applyCardModeDefaults(host);
      syncSpeechifyAvailability(host);
    });
    shadow.querySelector('[data-field="downloadImages"]').addEventListener("change", () => {
      const values = {
        engine: field(host, "engine")?.value || DEFAULTS.engine,
        mode: field(host, "mode")?.value || DEFAULTS.mode
      };
      if (isCardCreationMode(values)) {
        host.__radprimerCardModeDownloadImagesDisabled = !field(host, "downloadImages").checked;
      }
    });
    shadow.querySelector('[data-field="useMasterSource"]').addEventListener("change", () => {
      refreshMasterSourceBanner(host);
    });
    shadow.querySelector('[data-field="autoSendToSpeechify"]').addEventListener("change", () => {
      const autoSend = field(host, "autoSendToSpeechify").checked;
      if (autoSend) {
        field(host, "openChatGPT").checked = true;
        field(host, "autoSubmitChatGPT").checked = true;
      }
    });
    shadow.querySelector('[data-field="captureCardAuditBundle"]').addEventListener("change", () => {
      const captureAudit = field(host, "captureCardAuditBundle").checked;
      if (captureAudit) {
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
    shadow.querySelector(".io-queue-config").addEventListener("click", async () => {
      await saveSettings(readModalSettings(host));
      closeModal(host);
      buildIoQueue(host);
    });
    shadow.querySelector(".audit-source-config").addEventListener("click", async () => {
      await saveSettings(readModalSettings(host));
      closeModal(host);
      exportAuditSourceOnly(host);
    });
    shadow.querySelector(".compare-source-config").addEventListener("click", async () => {
      await saveSettings(readModalSettings(host));
      closeModal(host);
      exportSourceComparisonOnly(host);
    });
    shadow.querySelector(".master-source-config").addEventListener("click", async () => {
      await saveSettings(readModalSettings(host));
      closeModal(host);
      buildMasterSource(host);
    });
    shadow.querySelector(".import-master-source").addEventListener("click", () => importMasterSource(host));
    shadow.querySelector(".show-master-source").addEventListener("click", () => showMasterSource(host));

    return host;
  };

  const field = (host, name) => host.shadowRoot.querySelector(`[data-field="${name}"]`);

  const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error(`Could not read ${file?.name || "file"}.`));
      reader.readAsText(file);
    });

  const readMasterSourceFileInput = async (host) => {
    const input = host.shadowRoot.querySelector(".master-source-files");
    const files = Array.from(input?.files || []);
    if (!files.length) {
      throw new Error("Choose master_source_import.json or the master source files first.");
    }
    return Promise.all(
      files.map(async (file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        text: await readFileAsText(file)
      }))
    );
  };

  const sendImportMasterSourceMessage = (files) =>
    new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "IMPORT_MASTER_SOURCE_CACHE", files }, (response) => {
        const err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(response);
      });
    });

  const sendGetMasterSourceMessage = () =>
    new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "GET_MASTER_SOURCE_CACHE" }, (response) => {
        const err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(response);
      });
    });

  const setMasterSourceBanner = (host, state, message) => {
    const banner = host.shadowRoot.querySelector('[data-role="masterSourceBanner"]');
    if (!banner) return;
    banner.classList.remove("active", "loaded", "error");
    if (state) banner.classList.add(state);
    const copy = banner.querySelector(".copy");
    if (copy) copy.textContent = message;
    banner.title = message;
  };

  const masterSourceTitle = (source) => {
    return String(source?.articleTitle || "imported master source").trim();
  };

  const refreshMasterSourceBanner = async (host) => {
    const active = Boolean(field(host, "useMasterSource")?.checked);
    setMasterSourceBanner(host, "", "Checking imported master source...");
    try {
      const response = await sendGetMasterSourceMessage();
      if (!response?.ok) {
        throw new Error(response?.error || "Could not read imported master source.");
      }
      const source = response.masterSource;
      if (!source) {
        setMasterSourceBanner(
          host,
          active ? "error" : "",
          active
            ? "Use imported master source is enabled, but no master source is imported yet."
            : "No master source imported. Narratives/cards will use the current article page."
        );
        return;
      }
      const title = masterSourceTitle(source);
      const imagePart =
        Number.isFinite(source.imageCount) && source.imageCount > 0
          ? ` ${source.imageCount} images.`
          : "";
      setMasterSourceBanner(
        host,
        active ? "active" : "loaded",
        active
          ? `Master source active: ${title}.${imagePart} Narratives/cards will use fused master-source information, not this live page.`
          : `Master source loaded: ${title}.${imagePart} This run will use the live article page unless master source is enabled.`
      );
    } catch (error) {
      setMasterSourceBanner(
        host,
        "error",
        `Could not check master source status: ${error?.message || error}`
      );
    }
  };

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
    select.value = normalizeVisibleMode(engine, selectedMode);
    syncSpeechifyAvailability(host);
  };

  const normalizeVisibleMode = (engine, mode) => {
    const allowed = MODE_OPTIONS[engine]?.map(([value]) => value) || [];
    if (allowed.includes(mode)) return mode;
    if (mode === "narrative_with_images") return "narrative";
    if (mode === "no_pictures") return "no_pictures";
    if (mode === "chatgpt_cards" || mode === "codex_cards" || mode === "captions_only") {
      return "chatgpt_cards";
    }
    return allowed.includes(DEFAULTS.mode) ? DEFAULTS.mode : allowed[0];
  };

  const isNarrativeSpeechifyMode = (values) => {
    if (!values) return false;
    if (values.engine === "pathology") return values.mode === "narrative";
    if (values.engine === "normal") {
      return values.mode === "narrative";
    }
    return false;
  };

  const shouldNarrativeDownloadImages = (values) => {
    return values?.engine === "normal" && values.mode === "narrative_with_images";
  };

  const isIoQueueMode = (values) => values?.mode === "io_queue";

  const isNoPictureCardMode = (values) => values?.mode === "no_pictures";

  const isCardCreationMode = (values) => {
    if (!values) return false;
    return !isNarrativeSpeechifyMode(values) && !isIoQueueMode(values);
  };

  const syncSpeechifyAvailability = (host) => {
    const values = {
      engine: field(host, "engine")?.value || DEFAULTS.engine,
      mode: field(host, "mode")?.value || DEFAULTS.mode
    };
    const eligible = isNarrativeSpeechifyMode(values);
    const auditEligible = !eligible && !isIoQueueMode(values);
    const autoSend = field(host, "autoSendToSpeechify");
    const autoSave = field(host, "speechifyAutoSave");
    const audit = field(host, "captureCardAuditBundle");
    if (!autoSend || !autoSave) return;

    autoSend.disabled = !eligible;
    autoSave.disabled = true;
    autoSave.checked = false;
    if (audit) audit.disabled = !auditEligible;
    if (!eligible) {
      autoSend.checked = false;
    }
    if (!auditEligible && audit) audit.checked = false;
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
    field(host, "captureCardAuditBundle").checked = false;
    field(host, "autoSendToSpeechify").checked = true;
    field(host, "speechifyAutoSave").checked = false;
    const downloadImages = field(host, "downloadImages");
    if (downloadImages) downloadImages.checked = shouldNarrativeDownloadImages(values);
    host.__radprimerCardModeDownloadImagesDisabled = false;
  };

  const applyIoQueueModeDefaults = (host) => {
    const values = {
      engine: field(host, "engine")?.value || DEFAULTS.engine,
      mode: field(host, "mode")?.value || DEFAULTS.mode
    };
    if (!isIoQueueMode(values)) return;

    field(host, "include").value = "all";
    field(host, "caseMap").value = "";
    field(host, "downloadImages").checked = true;
    field(host, "downloadPlain").checked = false;
    field(host, "downloadAnnotated").checked = true;
    field(host, "openChatGPT").checked = false;
    field(host, "autoSubmitChatGPT").checked = false;
    field(host, "captureCardAuditBundle").checked = false;
    field(host, "autoSendToSpeechify").checked = false;
    field(host, "speechifyAutoSave").checked = false;
    host.__radprimerCardModeDownloadImagesDisabled = false;
  };

  const applyNoPictureModeDefaults = (host) => {
    const values = {
      engine: field(host, "engine")?.value || DEFAULTS.engine,
      mode: field(host, "mode")?.value || DEFAULTS.mode
    };
    if (!isNoPictureCardMode(values)) return;

    field(host, "include").value = "none";
    field(host, "caseMap").value = "";
    field(host, "downloadImages").checked = false;
    field(host, "downloadPlain").checked = false;
    field(host, "downloadAnnotated").checked = false;
    host.__radprimerCardModeDownloadImagesDisabled = true;
  };

  const applyCardModeDefaults = (host) => {
    const values = {
      engine: field(host, "engine")?.value || DEFAULTS.engine,
      mode: field(host, "mode")?.value || DEFAULTS.mode
    };
    if (!isCardCreationMode(values)) return;
    if (isNoPictureCardMode(values)) {
      applyNoPictureModeDefaults(host);
      return;
    }
    if (host.__radprimerCardModeDownloadImagesDisabled) return;
    const downloadImages = field(host, "downloadImages");
    if (downloadImages) downloadImages.checked = true;
    const downloadPlain = field(host, "downloadPlain");
    const downloadAnnotated = field(host, "downloadAnnotated");
    if (downloadPlain) downloadPlain.checked = true;
    if (downloadAnnotated) downloadAnnotated.checked = true;
  };

  const openModal = async (host) => {
    const settings = await getStoredSettings();
    populateEngineSelect(host);
    writeModalSettings(host, settings);
    syncSourceCompareControls(host);
    await refreshMasterSourceBanner(host);
    host.shadowRoot.querySelector(".backdrop").classList.add("open");
  };

  const closeModal = (host) => {
    host.shadowRoot.querySelector(".backdrop").classList.remove("open");
  };

  const statusSurfaces = (host) =>
    Array.from(host.shadowRoot.querySelectorAll(".status, .modal-status"));

  const dismissStatus = (host) => {
    clearTimeout(host.__radprimerStatusTimer);
    for (const status of statusSurfaces(host)) {
      status.classList.remove("show");
      status.classList.remove("error");
    }
  };

  const shouldAutoDismissStatus = (phase) => {
    return /done|ready|saved|sent|complete|started/i.test(String(phase || ""));
  };

  const writeModalSettings = (host, settings) => {
    const values = { ...DEFAULTS, ...settings };
    const hasExplicitCardImagePreference = Object.prototype.hasOwnProperty.call(
      settings || {},
      "cardModeDownloadImagesDisabled"
    );
    field(host, "engine").value = values.engine || DEFAULTS.engine;
    values.mode = normalizeVisibleMode(values.engine || DEFAULTS.engine, values.mode || DEFAULTS.mode);
    populateModeSelect(host, values.mode);

    for (const key of Object.keys(DEFAULTS)) {
      const el = field(host, key);
      if (!el) continue;
      if (el.type === "checkbox") el.checked = Boolean(values[key]);
      else el.value = values[key] ?? "";
    }
    host.__radprimerCardModeDownloadImagesDisabled =
      hasExplicitCardImagePreference && Boolean(values.cardModeDownloadImagesDisabled);
    applyNarrativeModeDefaults(host);
    applyIoQueueModeDefaults(host);
    applyNoPictureModeDefaults(host);
    applyCardModeDefaults(host);
    syncSpeechifyAvailability(host);
  };

  const readModalSettings = (host) => {
    const values = { ...DEFAULTS };
    for (const key of Object.keys(DEFAULTS)) {
      const el = field(host, key);
      if (!el) continue;
      values[key] = el.type === "checkbox" ? el.checked : el.value.trim();
    }
    values.mode = normalizeVisibleMode(values.engine || DEFAULTS.engine, values.mode || DEFAULTS.mode);

    if (values.autoSendToSpeechify || values.captureCardAuditBundle) {
      values.openChatGPT = true;
      values.autoSubmitChatGPT = true;
    }
    if (isNarrativeSpeechifyMode(values)) {
      values.include = "all";
      values.caseMap = "";
      values.openChatGPT = true;
      values.autoSubmitChatGPT = true;
      values.autoSendToSpeechify = true;
      values.speechifyAutoSave = false;
      values.captureCardAuditBundle = false;
      values.downloadImages = shouldNarrativeDownloadImages(values);
      values.cardModeDownloadImagesDisabled = false;
    }
    if (isIoQueueMode(values)) {
      values.include = "all";
      values.caseMap = "";
      values.downloadImages = true;
      values.downloadPlain = false;
      values.downloadAnnotated = true;
      values.openChatGPT = false;
      values.autoSubmitChatGPT = false;
      values.autoSendToSpeechify = false;
      values.speechifyAutoSave = false;
      values.captureCardAuditBundle = false;
      values.cardModeDownloadImagesDisabled = false;
      values.useMasterSource = false;
    }
    if (isNoPictureCardMode(values)) {
      values.include = "none";
      values.caseMap = "";
      values.downloadImages = false;
      values.downloadPlain = false;
      values.downloadAnnotated = false;
      values.cardModeDownloadImagesDisabled = true;
    }
    if (!isNarrativeSpeechifyMode(values)) {
      values.autoSendToSpeechify = false;
      values.speechifyAutoSave = false;
      if (!isIoQueueMode(values) && !isNoPictureCardMode(values)) {
        values.cardModeDownloadImagesDisabled = !values.downloadImages;
      }
    }

    return values;
  };

  const setStatus = (host, phase, message, isError = false) => {
    const shadow = host.shadowRoot;
    const modalOpen = shadow.querySelector(".backdrop")?.classList.contains("open");
    clearTimeout(host.__radprimerStatusTimer);
    for (const status of statusSurfaces(host)) {
      const isModalStatus = status.classList.contains("modal-status");
      if ((isModalStatus && !modalOpen) || (!isModalStatus && modalOpen)) {
        status.classList.remove("show");
        status.classList.remove("error");
        continue;
      }
      status.classList.add("show");
      status.classList.toggle("error", Boolean(isError));
      status.title = "Click to dismiss";
      status.querySelector(".phase").textContent = phase || "";
      status.querySelector(".msg").textContent = message || "";
    }

    if (!isError && shouldAutoDismissStatus(phase)) {
      host.__radprimerStatusTimer = setTimeout(() => dismissStatus(host), 7000);
    }
  };

  const setRunning = (host, running) => {
    const quick = host.shadowRoot.querySelector(".quick-run");
    const config = host.shadowRoot.querySelector(".configure");
    const imageOnly = host.shadowRoot.querySelector(".image-only");
    quick.disabled = running;
    config.disabled = running;
    imageOnly.disabled = running;
    for (const selector of [
      ".io-queue-config",
      ".audit-source-config",
      ".compare-source-config",
      ".master-source-config"
    ]) {
      const button = host.shadowRoot.querySelector(selector);
      if (button) button.disabled = running;
    }
    quick.querySelector(".label").textContent = running ? "Running..." : "Run lecture";
  };

  const syncSourceCompareControls = (host) => {
    for (const selector of [".compare-source-config", ".master-source-config"]) {
      const button = host.shadowRoot.querySelector(selector);
      if (button) button.hidden = false;
    }
  };

  const normalizeTitleForChoice = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();

  const promptForMasterSourceTitleChoice = (response) => {
    const choices = Array.isArray(response?.titleChoices) ? response.titleChoices : [];
    if (!choices.length) return null;
    const lines = choices.map((choice, index) => (
      `${index + 1}. ${choice.sourceLabel || choice.sourceKind || "Source"}: ${choice.title || "[title not found]"}`
    ));
    const answer = window.prompt(
      [
        "RadPrimer and STATdx article titles differ.",
        "Cancel to stop the build, or enter the number/title to use as the shared master-source topic.",
        "",
        ...lines
      ].join("\n"),
      "1"
    );
    if (answer === null) return null;
    const trimmed = answer.trim();
    const index = Number(trimmed);
    if (Number.isInteger(index) && index >= 1 && index <= choices.length) {
      return choices[index - 1].title || "";
    }
    const exact = choices.find((choice) => normalizeTitleForChoice(choice.title) === normalizeTitleForChoice(trimmed));
    return exact?.title || "";
  };

  const runFromPage = (host) => {
    setRunning(host, true);
    setStatus(host, "Starting", `Starting ${SOURCE_LABEL} workflow...`);
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

  const buildIoQueue = (host) => {
    setRunning(host, true);
    setStatus(host, "IO Queue", "Downloading annotated images and building queue.json...");
    chrome.runtime.sendMessage({ type: "RUN_RADPRIMER_IO_QUEUE" }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        setStatus(host, "IO Queue Error", err.message, true);
        setRunning(host, false);
        return;
      }
      if (!response?.ok) {
        setStatus(host, "IO Queue Error", response?.error || "IO queue build failed.", true);
        setRunning(host, false);
        return;
      }
      setStatus(host, "IO Queue Ready", response.message || "Image Occlusion queue built.");
      setRunning(host, false);
    });
  };

  const exportAuditSourceOnly = (host) => {
    setRunning(host, true);
    setStatus(host, "Audit Source", "Exporting source-only audit bundle...");
    chrome.runtime.sendMessage({ type: "EXPORT_RADPRIMER_AUDIT_SOURCE_ONLY" }, async (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        setStatus(host, "Audit Source Error", err.message, true);
        setRunning(host, false);
        return;
      }
      if (!response?.ok) {
        setStatus(host, "Audit Source Error", response?.error || "Source-only export failed.", true);
        setRunning(host, false);
        return;
      }
      try {
        if (response.clipboardText) await navigator.clipboard.writeText(response.clipboardText);
      } catch {}
      setStatus(host, "Audit Source Ready", response.message || "Source-only audit bundle exported.");
      setRunning(host, false);
    });
  };

  const exportSourceComparisonOnly = (host) => {
    setRunning(host, true);
    setStatus(host, "Compare Source", "Exporting comparison source bundle...");
    chrome.runtime.sendMessage({ type: "EXPORT_ARTICLE_SOURCE_COMPARISON" }, async (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        setStatus(host, "Compare Source Error", err.message, true);
        setRunning(host, false);
        return;
      }
      if (!response?.ok) {
        setStatus(host, "Compare Source Error", response?.error || "Comparison source export failed.", true);
        setRunning(host, false);
        return;
      }
      try {
        if (response.clipboardText) await navigator.clipboard.writeText(response.clipboardText);
      } catch {}
      setStatus(host, "Compare Source Ready", response.message || "Comparison source bundle exported.");
      setRunning(host, false);
    });
  };

  const buildMasterSource = (host) => {
    setRunning(host, true);
    setStatus(host, "Master Source", "Exporting open RadPrimer + STATdx sources and building master source package...");
    const sendBuildMessage = (selectedPairingTitle = "") => {
      chrome.runtime.sendMessage({ type: "BUILD_MASTER_SOURCE_FROM_ARTICLE", selectedPairingTitle }, async (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        setStatus(host, "Master Source Error", err.message, true);
        setRunning(host, false);
        return;
      }
      if (!response?.ok && response?.errorCode === "MASTER_SOURCE_TITLE_MISMATCH") {
        const titleChoice = promptForMasterSourceTitleChoice(response);
        if (!titleChoice) {
          setStatus(host, "Master Source", "Build cancelled before exporting because the open article titles differ.");
          setRunning(host, false);
          return;
        }
        setStatus(host, "Master Source", `Using shared title: ${titleChoice}. Exporting both open sources...`);
        sendBuildMessage(titleChoice);
        return;
      }
      if (!response?.ok) {
        setStatus(host, "Master Source Error", response?.error || "Master source build failed.", true);
        setRunning(host, false);
        return;
      }
      try {
        if (response.clipboardText) await navigator.clipboard.writeText(response.clipboardText);
      } catch {}
      setStatus(host, "Master Source Ready", response.message || "Master source request bundle prepared.");
      setRunning(host, false);
      });
    };
    sendBuildMessage();
  };

  const importMasterSource = async (host) => {
    const button = host.shadowRoot.querySelector(".import-master-source");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Importing...";
    try {
      const files = await readMasterSourceFileInput(host);
      setStatus(host, "Master Source", "Importing master source into extension storage...");
      const response = await sendImportMasterSourceMessage(files);
      if (!response?.ok) {
        throw new Error(response?.error || "Master source import failed.");
      }

      field(host, "useMasterSource").checked = true;
      await saveSettings(readModalSettings(host));

      const source = response.masterSource || {};
      setStatus(
        host,
        "Master Source Imported",
        [
          "Imported master source.",
          `Title: ${source.articleTitle || "[unknown]"}`,
          `Images: ${source.imageCount ?? 0}`,
          `Downloadable image files: ${source.downloadFileCount ?? 0}`,
          `Characters: ${source.outputChars ?? 0}`,
          "Use imported master source is now enabled."
        ].join("\n")
      );
      await refreshMasterSourceBanner(host);
    } catch (error) {
      setStatus(host, "Master Source Error", error?.message || String(error), true);
      await refreshMasterSourceBanner(host);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  };

  const showMasterSource = async (host) => {
    const button = host.shadowRoot.querySelector(".show-master-source");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Checking...";
    try {
      const response = await sendGetMasterSourceMessage();
      if (!response?.ok) {
        throw new Error(response?.error || "Could not read imported master source.");
      }
      const source = response.masterSource;
      if (!source) {
        setStatus(host, "Master Source", "No master source is imported yet.");
        await refreshMasterSourceBanner(host);
        return;
      }
      setStatus(
        host,
        "Master Source Ready",
        [
          "Imported master source is available.",
          `Title: ${source.articleTitle || "[unknown]"}`,
          `Imported: ${source.importedAt || "[unknown]"}`,
          `Images: ${source.imageCount ?? 0}`,
          `Downloadable image files: ${source.downloadFileCount ?? 0}`,
          `Characters: ${source.outputChars ?? 0}`
        ].join("\n")
      );
      await refreshMasterSourceBanner(host);
    } catch (error) {
      setStatus(host, "Master Source Error", error?.message || String(error), true);
      await refreshMasterSourceBanner(host);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  };

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "RADPRIMER_PAGE_RUN_STATUS") return;
    const host = ensureHost();
    setStatus(host, message.phase || "Status", message.message || "", Boolean(message.error));
    if (message.done || message.error) setRunning(host, false);
  });

  ensureHost();
})();
