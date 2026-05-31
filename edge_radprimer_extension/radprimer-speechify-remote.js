(() => {
  if (window.__radprimerSpeechifyRemoteLoaded) return;
  window.__radprimerSpeechifyRemoteLoaded = true;

  const HOST_ID = "radprimer-speechify-remote-host";
  const POLL_MS = 2500;
  const SHORTCUT_STORAGE_KEY = "radprimerZoomShortcutSettings";
  const DEFAULT_PLAYER_SHORTCUTS = {
    playerPlayPause: "p",
    playerBack10: "ArrowLeft",
    playerForward10: "ArrowRight"
  };

  let lastState = null;
  let busy = false;
  let playerShortcutSettings = { ...DEFAULT_PLAYER_SHORTCUTS };

  function normalizeShortcutKey(value) {
    const raw = String(value || "");
    if (raw === " " || raw.toLowerCase() === "spacebar") return "Space";
    if (raw.length === 1) return raw.toLowerCase();
    return raw;
  }

  async function loadPlayerShortcutSettings() {
    try {
      const stored = await chrome.storage.local.get(SHORTCUT_STORAGE_KEY);
      const saved = stored?.[SHORTCUT_STORAGE_KEY] || {};
      playerShortcutSettings = { ...DEFAULT_PLAYER_SHORTCUTS, ...saved };
    } catch {
      playerShortcutSettings = { ...DEFAULT_PLAYER_SHORTCUTS };
    }
  }

  function shortcutMatches(event, actionId) {
    const saved = normalizeShortcutKey(playerShortcutSettings[actionId]);
    const pressed = normalizeShortcutKey(event.key);
    if (!saved || !pressed) return false;
    if (saved === pressed) return true;
    return saved === "+" && pressed === "=";
  }

  function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (host?.shadowRoot) return host;

    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.position = "fixed";
    host.style.left = "18px";
    host.style.bottom = "18px";
    host.style.zIndex = "2147483647";
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .root {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #f8fafc;
          position: relative;
        }
        button {
          border: 0;
          cursor: pointer;
          font: inherit;
          letter-spacing: 0;
        }
        .bubble {
          height: 42px;
          min-width: 92px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 999px;
          background: rgba(11, 17, 29, 0.86);
          color: #f8fafc;
          border: 1px solid rgba(191, 219, 254, 0.24);
          box-shadow: 0 14px 42px rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(16px);
          font-size: 12px;
          font-weight: 900;
          transition: transform .14s ease, background .14s ease, opacity .14s ease;
        }
        .bubble:hover {
          transform: translateY(-1px);
          background: rgba(15, 23, 42, 0.96);
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #64748b;
          box-shadow: 0 0 0 4px rgba(100, 116, 139, 0.14);
          flex: 0 0 auto;
        }
        .dot.playing {
          background: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16);
        }
        .bubble-label {
          line-height: 1;
        }
        .bubble-time {
          color: rgba(226, 232, 240, 0.72);
          font-weight: 800;
        }
        .panel {
          position: absolute;
          left: 0;
          bottom: 50px;
          width: 302px;
          max-width: calc(100vw - 36px);
          border-radius: 16px;
          padding: 11px;
          background: rgba(11, 17, 29, 0.94);
          border: 1px solid rgba(191, 219, 254, 0.26);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.34);
          backdrop-filter: blur(18px);
          opacity: 0;
          transform: translateY(8px) scale(.985);
          transform-origin: bottom left;
          pointer-events: none;
          transition: opacity .14s ease, transform .14s ease;
        }
        .root:hover .panel,
        .root:focus-within .panel {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }
        .title {
          min-width: 0;
          font-size: 12px;
          line-height: 1.2;
          font-weight: 850;
          color: rgba(248, 250, 252, 0.9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .time {
          flex: 0 0 auto;
          font-size: 11px;
          font-weight: 850;
          color: rgba(226, 232, 240, 0.72);
        }
        .bar {
          height: 3px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.22);
          margin-bottom: 9px;
        }
        .fill {
          width: 0%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #bae6fd, #a5b4fc);
          transition: width .22s ease;
        }
        .controls {
          display: grid;
          grid-template-columns: 52px 1fr 52px 42px;
          gap: 7px;
          align-items: center;
          margin-bottom: 8px;
        }
        .control, .open {
          height: 34px;
          border-radius: 999px;
          background: rgba(30, 41, 59, 0.9);
          color: #f8fafc;
          font-size: 12px;
          font-weight: 900;
          border: 1px solid rgba(191, 219, 254, 0.18);
        }
        .control:hover, .open:hover, .speed:hover {
          background: rgba(51, 65, 85, 0.98);
        }
        .play {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.94), rgba(129, 140, 248, 0.96));
          box-shadow: 0 10px 26px rgba(59, 130, 246, 0.22);
        }
        .speed-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 5px;
        }
        .speed {
          height: 28px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.72);
          color: rgba(226, 232, 240, 0.86);
          border: 1px solid rgba(191, 219, 254, 0.15);
          font-size: 11px;
          font-weight: 850;
        }
        .speed.active {
          color: #0f172a;
          background: #bfdbfe;
          border-color: rgba(255, 255, 255, 0.54);
        }
        .status {
          margin-top: 7px;
          min-height: 14px;
          font-size: 10.5px;
          line-height: 1.28;
          color: rgba(226, 232, 240, 0.62);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .busy button {
          opacity: .7;
          pointer-events: none;
        }
      </style>
      <div class="root">
        <button class="bubble" type="button" data-action="playPause" title="Speechify play/pause">
          <span class="dot"></span>
          <span class="bubble-label">Audio</span>
          <span class="bubble-time">--:--</span>
        </button>
        <div class="panel" role="group" aria-label="Speechify remote">
          <div class="top">
            <div class="title">Speechify</div>
            <div class="time">--:-- / --:--</div>
          </div>
          <div class="bar" aria-hidden="true"><div class="fill"></div></div>
          <div class="controls">
            <button class="control" type="button" data-action="back10" title="Back 10 seconds">-10</button>
            <button class="control play" type="button" data-action="playPause" title="Play or pause">Play</button>
            <button class="control" type="button" data-action="forward10" title="Forward 10 seconds">+10</button>
            <button class="open" type="button" data-action="focus" title="Open Speechify tab">Open</button>
          </div>
          <div class="speed-row" aria-label="Speechify speed">
            <button class="speed" type="button" data-speed="0.8x">0.8</button>
            <button class="speed" type="button" data-speed="1x">1</button>
            <button class="speed" type="button" data-speed="1.2x">1.2</button>
            <button class="speed" type="button" data-speed="1.5x">1.5</button>
            <button class="speed" type="button" data-speed="1.7x">1.7</button>
            <button class="speed" type="button" data-speed="2x">2</button>
          </div>
          <div class="status">Looking for Speechify...</div>
        </div>
      </div>
    `;

    shadow.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => handleAction(host, button.dataset.action));
    });

    shadow.querySelectorAll("[data-speed]").forEach((button) => {
      button.addEventListener("click", () => handleAction(host, "setSpeed", button.dataset.speed));
    });

    return host;
  }

  function normalizeSpeed(value) {
    return String(value || "")
      .replace(/\u00A0/g, " ")
      .replace(/Ã—/g, "x")
      .replace(/×/g, "x")
      .replace(/\s+/g, "")
      .replace(/\.0x$/i, "x")
      .toLowerCase();
  }

  function sendRemoteMessage(payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "SPEECHIFY_PLAYER_REMOTE", payload }, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error || "Speechify remote failed."));
          return;
        }
        resolve(response.result || {});
      });
    });
  }

  function renderState(host, state, errorMessage = "") {
    const shadow = host.shadowRoot;
    const root = shadow.querySelector(".root");
    const title = shadow.querySelector(".title");
    const time = shadow.querySelector(".time");
    const bubbleTime = shadow.querySelector(".bubble-time");
    const fill = shadow.querySelector(".fill");
    const playButtons = shadow.querySelectorAll(".panel .play");
    const status = shadow.querySelector(".status");
    const dot = shadow.querySelector(".dot");
    const speed = normalizeSpeed(state?.speed || "");

    root.classList.toggle("busy", busy);
    title.textContent = state?.title || "Speechify";
    time.textContent = state?.elapsed && state?.duration ? `${state.elapsed} / ${state.duration}` : "--:-- / --:--";
    bubbleTime.textContent = state?.elapsed || "--:--";
    fill.style.width = `${Math.max(0, Math.min(100, Number(state?.progress || 0)))}%`;
    playButtons.forEach((button) => {
      button.textContent = state?.isPlaying ? "Pause" : "Play";
    });
    dot.classList.toggle("playing", Boolean(state?.isPlaying));

    shadow.querySelectorAll("[data-speed]").forEach((button) => {
      button.classList.toggle("active", normalizeSpeed(button.dataset.speed) === speed);
    });

    if (errorMessage) {
      status.textContent = errorMessage;
    } else if (state?.available) {
      status.textContent = state.speed ? `${state.speed} speed` : "Connected";
    } else {
      status.textContent = "Open a Speechify lecture tab first.";
    }
  }

  async function refreshState({ quiet = false } = {}) {
    const host = ensureHost();
    try {
      const state = await sendRemoteMessage({ action: "state" });
      lastState = state;
      renderState(host, state);
    } catch (error) {
      if (!quiet) renderState(host, lastState, String(error?.message || error));
    }
  }

  async function handleAction(host, action, speed = "") {
    busy = true;
    renderState(host, lastState);

    try {
      const state = await sendRemoteMessage({ action, speed });
      lastState = state;
      renderState(host, state);
    } catch (error) {
      renderState(host, lastState, String(error?.message || error));
    } finally {
      busy = false;
      renderState(host, lastState);
    }
  }

  function isEditableTarget(target) {
    const el = target instanceof Element ? target : target?.parentElement;
    if (!el) return false;
    return Boolean(
      el.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')
    );
  }

  function handleKeyboardShortcuts(event) {
    if (document.documentElement.dataset.radprimerShortcutCapture === "true") return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isEditableTarget(event.target)) return;

    const key = String(event.key || "").toLowerCase();
    let action = "";

    if (shortcutMatches(event, "playerBack10")) action = "back10";
    else if (shortcutMatches(event, "playerForward10")) action = "forward10";
    else if (shortcutMatches(event, "playerPlayPause") || key === "mediaplaypause") {
      action = "playPause";
    }

    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    handleAction(ensureHost(), action);
  }

  ensureHost();
  loadPlayerShortcutSettings();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[SHORTCUT_STORAGE_KEY]) return;
    loadPlayerShortcutSettings();
  });
  document.addEventListener("keydown", handleKeyboardShortcuts, true);
  refreshState({ quiet: true });
  setInterval(() => refreshState({ quiet: true }), POLL_MS);
})();
