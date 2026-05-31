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
    navFileActionButton: 'button[data-testid="nav-file-action-button"]'
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

    return {
      available: Boolean(playButton),
      isPlaying: /^pause\b/i.test(playLabel),
      playLabel,
      elapsed: cleanDisplayText(timeButton?.innerText || ""),
      duration: cleanDisplayText(durationButton?.innerText || ""),
      progress: Number.isFinite(progress) ? progress : 0,
      speed: cleanDisplayText(
        speedButton?.innerText ||
          (speedButton?.getAttribute("aria-label") || "").replace(/^Speed:\s*/i, "")
      ),
      voice: cleanDisplayText(
        voiceButton?.dataset?.voiceName ||
          (voiceButton?.getAttribute("aria-label") || "").replace(/^Voice:\s*/i, "")
      ),
      title: cleanDisplayText(titleButton?.innerText || document.title.replace(/\s*\|\s*Speechify\s*$/i, "")),
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
      await sleep(220);
    } else if (normalizedAction === "forward10") {
      clickVisible(SPEECHIFY_SELECTORS.playerForwardButton, "forward 10 seconds");
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
