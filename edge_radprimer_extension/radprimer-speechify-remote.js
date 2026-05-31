(() => {
  if (window.__radprimerSpeechifyRemoteLoaded) return;
  window.__radprimerSpeechifyRemoteLoaded = true;

  const HOST_ID = "radprimer-speechify-remote-host";
  const COLLAPSED_KEY = "radprimerSpeechifyRemoteCollapsed";
  const POLL_MS = 2500;

  let lastState = null;
  let busy = false;

  function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (host?.shadowRoot) return host;

    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.position = "fixed";
    host.style.left = "22px";
    host.style.bottom = "24px";
    host.style.zIndex = "2147483647";
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .root {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #f8fafc;
        }
        button {
          border: 0;
          cursor: pointer;
          font: inherit;
          letter-spacing: 0;
        }
        .remote {
          width: 390px;
          max-width: calc(100vw - 44px);
          border-radius: 18px;
          padding: 12px 14px 13px;
          background: rgba(13, 18, 29, 0.92);
          border: 1px solid rgba(191, 219, 254, 0.28);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.34);
          backdrop-filter: blur(18px);
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
          color: rgba(248, 250, 252, 0.92);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .time {
          flex: 0 0 auto;
          font-size: 12px;
          font-weight: 800;
          color: rgba(226, 232, 240, 0.78);
        }
        .bar {
          height: 4px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.23);
          margin-bottom: 11px;
        }
        .fill {
          width: 0%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #93c5fd, #818cf8);
          transition: width .22s ease;
        }
        .controls {
          display: grid;
          grid-template-columns: 54px 1fr 54px 58px 34px;
          gap: 8px;
          align-items: center;
        }
        .control {
          height: 38px;
          border-radius: 999px;
          background: rgba(30, 41, 59, 0.92);
          color: #f8fafc;
          font-size: 13px;
          font-weight: 900;
          border: 1px solid rgba(191, 219, 254, 0.18);
        }
        .control:hover {
          background: rgba(51, 65, 85, 0.98);
        }
        .play {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.98), rgba(99, 102, 241, 0.98));
          box-shadow: 0 12px 30px rgba(59, 130, 246, 0.24);
        }
        .mini {
          height: 38px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.74);
          color: rgba(226, 232, 240, 0.9);
          border: 1px solid rgba(191, 219, 254, 0.18);
          font-size: 12px;
          font-weight: 850;
        }
        .status {
          margin-top: 8px;
          min-height: 16px;
          font-size: 11px;
          line-height: 1.3;
          color: rgba(226, 232, 240, 0.7);
        }
        .bubble {
          display: none;
          height: 46px;
          padding: 0 15px;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          background: rgba(13, 18, 29, 0.92);
          color: #f8fafc;
          border: 1px solid rgba(191, 219, 254, 0.28);
          box-shadow: 0 16px 46px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(18px);
          font-size: 13px;
          font-weight: 900;
        }
        .collapsed .remote { display: none; }
        .collapsed .bubble { display: inline-flex; }
        .dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #64748b;
          box-shadow: 0 0 0 4px rgba(100, 116, 139, 0.16);
        }
        .dot.playing {
          background: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16);
        }
        .busy button {
          opacity: .72;
          pointer-events: none;
        }
      </style>
      <div class="root">
        <div class="remote" role="group" aria-label="Speechify remote">
          <div class="top">
            <div class="title">Speechify</div>
            <div class="time">--:-- / --:--</div>
          </div>
          <div class="bar" aria-hidden="true"><div class="fill"></div></div>
          <div class="controls">
            <button class="control" type="button" data-action="back10" title="Back 10 seconds">-10</button>
            <button class="control play" type="button" data-action="playPause" title="Play or pause">Play</button>
            <button class="control" type="button" data-action="forward10" title="Forward 10 seconds">+10</button>
            <button class="mini" type="button" data-action="focus" title="Open Speechify tab">Open</button>
            <button class="mini" type="button" data-action="collapse" title="Collapse">x</button>
          </div>
          <div class="status">Looking for Speechify...</div>
        </div>
        <button class="bubble" type="button" title="Show Speechify remote">
          <span class="dot"></span>
          <span>Audio</span>
        </button>
      </div>
    `;

    shadow.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => handleAction(host, button.dataset.action));
    });
    shadow.querySelector(".bubble").addEventListener("click", () => setCollapsed(host, false));

    setCollapsed(host, localStorage.getItem(COLLAPSED_KEY) === "true");
    return host;
  }

  function setCollapsed(host, collapsed) {
    const root = host.shadowRoot.querySelector(".root");
    root.classList.toggle("collapsed", collapsed);
    localStorage.setItem(COLLAPSED_KEY, String(collapsed));
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
    const fill = shadow.querySelector(".fill");
    const play = shadow.querySelector('[data-action="playPause"]');
    const status = shadow.querySelector(".status");
    const dot = shadow.querySelector(".dot");

    root.classList.toggle("busy", busy);
    title.textContent = state?.title || "Speechify";
    time.textContent = state?.elapsed && state?.duration ? `${state.elapsed} / ${state.duration}` : "--:-- / --:--";
    fill.style.width = `${Math.max(0, Math.min(100, Number(state?.progress || 0)))}%`;
    play.textContent = state?.isPlaying ? "Pause" : "Play";
    dot.classList.toggle("playing", Boolean(state?.isPlaying));

    if (errorMessage) {
      status.textContent = errorMessage;
    } else if (state?.available) {
      status.textContent = state.speed ? `${state.speed} speed` : "Connected";
    } else {
      status.textContent = "Open a Speechify lecture tab, then press refresh.";
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

  async function handleAction(host, action) {
    if (action === "collapse") {
      setCollapsed(host, true);
      return;
    }

    busy = true;
    renderState(host, lastState);

    try {
      const state = await sendRemoteMessage({ action });
      lastState = state;
      renderState(host, state);
    } catch (error) {
      renderState(host, lastState, String(error?.message || error));
    } finally {
      busy = false;
      renderState(host, lastState);
    }
  }

  ensureHost();
  refreshState({ quiet: true });
  setInterval(() => refreshState({ quiet: true }), POLL_MS);
})();
