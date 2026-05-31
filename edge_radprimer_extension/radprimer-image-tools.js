(() => {
  if (window.__radprimerImageToolsInstalled) return;
  window.__radprimerImageToolsInstalled = true;

  const STYLE_ID = "radprimer-image-tools-style";
  const HOST_ID = "radprimer-image-zoom-host";
  const FLOATING_CONTROL_ID = "radprimer-floating-zoom-control";
  const SHORTCUT_STORAGE_KEY = "radprimerZoomShortcutSettings";
  const DEFAULT_SHORTCUTS = {
    close: "s",
    previous: "k",
    next: "l",
    caption: "t",
    annotation: "a",
    zoomIn: "+",
    zoomOut: "-",
    reset: "0"
  };
  const SHORTCUT_ACTIONS = [
    ["close", "Close zoom"],
    ["previous", "Previous image"],
    ["next", "Next image"],
    ["caption", "Hide/show caption"],
    ["annotation", "Arrows on/off"],
    ["zoomIn", "Zoom in"],
    ["zoomOut", "Zoom out"],
    ["reset", "Reset zoom"]
  ];

  let zoomState = {
    open: false,
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    captionCollapsed: false,
    annotated: true,
    imageId: "",
    imageUrl: "",
    imageNumber: null,
    total: null
  };
  let lastOpenAt = 0;
  let shortcutSettings = { ...DEFAULT_SHORTCUTS };
  let shortcutCaptureAction = "";

  function injectPageStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #docLB a.trigger,
      #docLB a.image-thumb-js,
      #gallery a.image-thumb-js {
        position: relative !important;
        display: inline-block !important;
      }

      #docLB .rp-image-number-badge {
        position: absolute;
        top: 4px;
        left: 4px;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border-radius: 999px;
        background: rgba(8, 13, 24, 0.9);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.88);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
        font: 800 13px/20px Arial, Helvetica, sans-serif;
        text-align: center;
        z-index: 9999;
        pointer-events: none;
      }

      #docLB .large-image,
      #docLB .right {
        position: relative !important;
      }

      #docLB .rp-active-image-number {
        position: absolute;
        top: 12px;
        left: 12px;
        z-index: 9999;
        padding: 7px 11px;
        border-radius: 999px;
        background: rgba(8, 13, 24, 0.88);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.8);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.42);
        font: 800 16px/1 Arial, Helvetica, sans-serif;
        pointer-events: none;
      }

      #docLB .active-image-js {
        cursor: zoom-in !important;
      }

      #docLB .rp-open-zoom-control,
      #radprimer-floating-zoom-control {
        display: none !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function imageNumberFromThumb(img, fallbackIndex) {
    const figNo = parseInt(img?.dataset?.figureno ?? "", 10);
    if (Number.isFinite(figNo)) return figNo + 1;
    return fallbackIndex + 1;
  }

  function enhanceThumbnails() {
    injectPageStyle();

    const thumbs = Array.from(
      document.querySelectorAll(
        [
          "#docLB a.trigger img[data-figureno]",
          "#docLB a.image-thumb-js img[data-figureno]",
          "#gallery a.image-thumb-js img[data-figureno]"
        ].join(",")
      )
    );

    thumbs.forEach((img, index) => {
      const anchor = img.closest("a");
      if (!anchor) return;
      const imageNumber = imageNumberFromThumb(img, index);
      anchor.dataset.radprimerImageNumber = String(imageNumber);
      anchor.title = `image ${imageNumber}`;

      let badge = anchor.querySelector(":scope > .rp-image-number-badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "rp-image-number-badge";
        anchor.appendChild(badge);
      }
      badge.textContent = String(imageNumber);
    });

    updateActiveImageBadge();
    ensureInlineZoomControl();
    ensureFloatingZoomControl();
    bindZoomOpenTargets();
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return String(value || "").replace(/["\\]/g, "\\$&");
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
      style.opacity !== "0"
    );
  }

  function normalizeShortcutKey(value) {
    const raw = String(value || "");
    if (raw === " " || raw.toLowerCase() === "spacebar") return "Space";
    if (raw.length === 1) return raw.toLowerCase();
    return raw;
  }

  function displayShortcutKey(value) {
    const key = normalizeShortcutKey(value);
    if (!key) return "Unassigned";
    if (key === "Space") return "Space";
    if (key === "ArrowLeft") return "Left arrow";
    if (key === "ArrowRight") return "Right arrow";
    if (key === "ArrowUp") return "Up arrow";
    if (key === "ArrowDown") return "Down arrow";
    if (key === "+") return "+";
    if (key.length === 1) return key.toUpperCase();
    return key;
  }

  async function loadShortcutSettings() {
    try {
      const stored = await chrome.storage.local.get(SHORTCUT_STORAGE_KEY);
      const saved = stored?.[SHORTCUT_STORAGE_KEY] || {};
      shortcutSettings = { ...DEFAULT_SHORTCUTS, ...saved };
    } catch {
      shortcutSettings = { ...DEFAULT_SHORTCUTS };
    }
    renderShortcutPanel();
  }

  async function saveShortcutSettings() {
    try {
      await chrome.storage.local.set({ [SHORTCUT_STORAGE_KEY]: shortcutSettings });
    } catch {}
  }

  function getActiveImageElement() {
    const candidates = Array.from(
      document.querySelectorAll(
        [
          "#docLB .right .active-image-js",
          "#docLB .large-image .active-image-js",
          "#docLB .active-image-js"
        ].join(",")
      )
    );
    return candidates.find(isVisible) || candidates[0] || null;
  }

  function getActiveImageContainer() {
    const active = getActiveImageElement();
    return active?.closest(".right") || active?.closest(".large-image") || active?.parentElement || null;
  }

  function getVisibleCaptionHtml(active) {
    const containers = [
      active?.closest(".right"),
      active?.closest(".large-image"),
      document.querySelector("#docLB")
    ].filter(Boolean);

    const selectors = [
      ".imageCaption [class*='caption-text']",
      ".imageCaption .inner",
      ".imageCaption"
    ];

    for (const container of containers) {
      for (const selector of selectors) {
        const nodes = Array.from(container.querySelectorAll(selector));
        const node = nodes.find(isVisible) || nodes[0];
        if (node?.innerHTML?.trim()) return node.innerHTML;
      }
    }

    return "";
  }

  function getThumbForImageId(imageId) {
    if (!imageId) return null;
    return (
      document.querySelector(`#docLB a[rel="${cssEscape(imageId)}"] img[data-figureno]`) ||
      document.querySelector(`#gallery a[rel="${cssEscape(imageId)}"] img[data-figureno]`)
    );
  }

  function getImageThumbs() {
    const thumbs = Array.from(
      document.querySelectorAll(
        [
          "#docLB a.trigger img[data-figureno]",
          "#docLB a.image-thumb-js img[data-figureno]",
          "#gallery a.image-thumb-js img[data-figureno]"
        ].join(",")
      )
    );
    const seen = new Map();

    thumbs.forEach((thumb, index) => {
      const anchor = thumb.closest("a");
      const imageId = anchor?.getAttribute("rel") || "";
      const key = imageId || `thumb-${index}`;
      if (!seen.has(key)) seen.set(key, thumb);
    });

    return Array.from(seen.values()).sort((a, b) => imageNumberFromThumb(a, 0) - imageNumberFromThumb(b, 0));
  }

  function getInfoFromThumb(thumb, fallbackIndex = 0) {
    const anchor = thumb?.closest("a");
    const imageId = anchor?.getAttribute("rel") || "";
    const imageNumber = thumb ? imageNumberFromThumb(thumb, fallbackIndex) : null;
    const total = parseInt(thumb?.dataset?.groupcount || "", 10);

    return {
      active: null,
      thumb,
      imageId,
      imageNumber,
      total: Number.isFinite(total) ? total : getImageThumbs().length || null,
      captionHtml: buildCaptionHtml(thumb?.dataset?.caption || "")
    };
  }

  function getActiveImageInfo() {
    const active = getActiveImageElement();
    const imageId = active?.id || "";
    const thumb = getThumbForImageId(imageId);
    const activeThumb =
      thumb ||
      document.querySelector("#docLB a.active img[data-figureno]") ||
      document.querySelector("#docLB li.active a.image-thumb-js img[data-figureno]");

    const imageNumber = activeThumb ? imageNumberFromThumb(activeThumb, 0) : null;
    const total = parseInt(activeThumb?.dataset?.groupcount || "", 10);
    const liveCaptionHtml = getVisibleCaptionHtml(active);
    const thumbCaptionHtml = activeThumb?.dataset?.caption || "";

    return {
      active,
      imageId,
      imageNumber,
      total: Number.isFinite(total) ? total : null,
      captionHtml: buildCaptionHtml(liveCaptionHtml || thumbCaptionHtml)
    };
  }

  function updateActiveImageBadge() {
    const large = getActiveImageContainer();
    const info = getActiveImageInfo();
    if (!large || !info.active || !info.imageNumber) return;

    let badge = large.querySelector(":scope > .rp-active-image-number");
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "rp-active-image-number";
      large.appendChild(badge);
    }
    badge.textContent = info.total ? `image ${info.imageNumber}/${info.total}` : `image ${info.imageNumber}`;
  }

  const ARROW_ALT = {
    BO: "Black open arrow",
    BS: "Black solid arrow",
    BC: "Black curved arrow",
    CC: "Cyan curved arrow",
    CO: "Cyan open arrow",
    CS: "Cyan solid arrow",
    WO: "White open arrow",
    WS: "White solid arrow",
    WC: "White curved arrow"
  };

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function arrowSrc(code) {
    return new URL(`/img/arrows/${code}.png`, location.origin).href;
  }

  function makeArrowImage(code) {
    const img = document.createElement("img");
    img.setAttribute("src", arrowSrc(code));
    img.setAttribute("alt", ARROW_ALT[code] || `${code} arrow`);
    return img;
  }

  function replaceArrowPhraseTextNodes(root) {
    const phrases = Object.entries(ARROW_ALT).map(([code, phrase]) => ({ code, phrase }));
    const phrasePattern = new RegExp(phrases.map(({ phrase }) => escapeRegExp(phrase)).join("|"), "g");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];

    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((node) => {
      const text = node.nodeValue || "";
      if (!phrasePattern.test(text)) {
        phrasePattern.lastIndex = 0;
        return;
      }

      phrasePattern.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match;

      while ((match = phrasePattern.exec(text))) {
        if (match.index > lastIndex) {
          fragment.append(document.createTextNode(text.slice(lastIndex, match.index)));
        }

        const phrase = match[0];
        const arrow = phrases.find((entry) => entry.phrase === phrase);
        if (arrow) fragment.append(makeArrowImage(arrow.code));
        lastIndex = match.index + phrase.length;
      }

      if (lastIndex < text.length) fragment.append(document.createTextNode(text.slice(lastIndex)));
      node.replaceWith(fragment);
    });
  }

  function buildCaptionHtml(caption) {
    const holder = document.createElement("div");
    holder.innerHTML = String(caption || "");

    holder.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      const match = src.match(/\/img\/arrows\/([A-Za-z0-9_]+)\.png/i);
      if (!match) {
        img.remove();
        return;
      }
      const code = match[1].toUpperCase();
      img.setAttribute("src", arrowSrc(code));
      img.setAttribute("alt", img.getAttribute("alt") || ARROW_ALT[code] || `${code} arrow`);
      img.removeAttribute("style");
      img.removeAttribute("class");
    });

    holder.innerHTML = holder.innerHTML.replace(/#([A-Za-z]{2})#/g, (_full, rawCode) => {
      const code = rawCode.toUpperCase();
      if (!ARROW_ALT[code]) return _full;
      return `<img src="${arrowSrc(code)}" alt="${ARROW_ALT[code]}">`;
    });

    replaceArrowPhraseTextNodes(holder);

    holder.querySelectorAll("*").forEach((el) => {
      if (el.tagName.toLowerCase() === "img") return;
      el.replaceWith(...Array.from(el.childNodes));
    });

    return holder.innerHTML
      .replace(/\s+/g, " ")
      .replace(/\s+(<img\b)/g, " $1")
      .replace(/(<\/img>|>)\s+/g, "$1 ")
      .trim();
  }

  function extractBackgroundUrl(el) {
    const info = getActiveImageInfo();
    const active = el || info.active;
    const bg = active?.style?.backgroundImage || (active ? getComputedStyle(active).backgroundImage : "") || "";
    const match = bg.match(/url\((["']?)(.*?)\1\)/i);
    const rawUrl =
      match?.[2] ||
      (info.imageId ? `/images/${info.imageId}?style=xlarge&annotated=true` : "") ||
      "";
    if (!rawUrl) return "";
    try {
      const url = new URL(rawUrl.replace(/&amp;/g, "&"), location.href);
      url.searchParams.set("style", "xlarge");
      return url.href;
    } catch {
      return rawUrl;
    }
  }

  function buildImageUrl(imageId, annotated) {
    if (!imageId) return "";
    return new URL(
      `/images/${imageId}?style=xlarge&annotated=${annotated ? "true" : "false"}`,
      location.origin
    ).href;
  }

  function setImageUrlAnnotated(src, annotated) {
    if (!src) return "";
    try {
      const url = new URL(src.replace(/&amp;/g, "&"), location.href);
      url.searchParams.set("style", "xlarge");
      url.searchParams.set("annotated", annotated ? "true" : "false");
      return url.href;
    } catch {
      return src;
    }
  }

  function imageUrlIsAnnotated(src) {
    try {
      const value = new URL(src.replace(/&amp;/g, "&"), location.href).searchParams.get("annotated");
      return value !== "false";
    } catch {
      return true;
    }
  }

  function getZoomImageUrl(annotated) {
    return buildImageUrl(zoomState.imageId, annotated) || setImageUrlAnnotated(zoomState.imageUrl, annotated);
  }

  function ensureZoomHost() {
    let host = document.getElementById(HOST_ID);
    if (host?.shadowRoot) return host;

    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.position = "fixed";
    host.style.inset = "0";
    host.style.zIndex = "2147483646";
    host.style.display = "none";
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .viewer {
          position: fixed;
          inset: 0;
          background: rgba(3, 5, 10, 0.96);
          color: #f8fafc;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          overflow: hidden;
          user-select: none;
        }

        .topbar {
          position: absolute;
          top: 18px;
          left: 18px;
          right: 18px;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          pointer-events: none;
        }

        .title {
          max-width: min(860px, calc(100vw - 430px));
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.82);
          border: 1px solid rgba(148, 163, 184, 0.34);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35);
          font-size: 15px;
          line-height: 1.35;
          pointer-events: auto;
        }

        .caption-pill {
          display: none;
          align-items: center;
          gap: 8px;
          max-width: min(340px, calc(100vw - 180px));
          height: 38px;
          padding: 0 13px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.82);
          border: 1px solid rgba(148, 163, 184, 0.34);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35);
          color: rgba(248, 250, 252, 0.92);
          font-size: 13px;
          font-weight: 850;
          pointer-events: auto;
        }

        .caption-pill-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .viewer.captions-collapsed .title {
          display: none;
        }

        .viewer.captions-collapsed .caption-pill {
          display: inline-flex;
        }

        .image-number {
          font-weight: 850;
          color: #bfdbfe;
          margin-right: 10px;
          white-space: nowrap;
        }

        .tools {
          display: flex;
          gap: 8px;
          pointer-events: auto;
        }

        .image-jump {
          height: 42px;
          min-width: 92px;
          max-width: 128px;
          border: 1px solid rgba(191, 219, 254, 0.38);
          border-radius: 999px;
          background: rgba(30, 41, 59, 0.9);
          color: #f8fafc;
          padding: 0 10px;
          font: 850 14px/1 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          cursor: pointer;
          outline: none;
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.36);
        }

        .image-jump:hover,
        .image-jump:focus {
          background: rgba(51, 65, 85, 0.96);
        }

        .shortcut-panel {
          position: absolute;
          top: 70px;
          right: 18px;
          z-index: 4;
          width: 286px;
          max-width: calc(100vw - 36px);
          padding: 12px;
          border-radius: 16px;
          background: rgba(11, 17, 29, 0.94);
          border: 1px solid rgba(191, 219, 254, 0.28);
          box-shadow: 0 24px 76px rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(16px);
          pointer-events: auto;
        }

        .shortcut-panel[hidden] {
          display: none;
        }

        .shortcut-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 9px;
          color: rgba(248, 250, 252, 0.9);
          font-size: 13px;
          font-weight: 850;
        }

        .shortcut-reset {
          min-width: auto;
          width: auto;
          height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 11px;
          box-shadow: none;
        }

        .shortcut-list {
          display: grid;
          gap: 7px;
        }

        .shortcut-row {
          display: grid;
          grid-template-columns: 1fr 86px;
          align-items: center;
          gap: 8px;
          color: rgba(226, 232, 240, 0.86);
          font-size: 12px;
        }

        .shortcut-key {
          min-width: 0;
          height: 30px;
          border-radius: 999px;
          font-size: 12px;
          box-shadow: none;
        }

        .shortcut-key.listening {
          color: #0f172a;
          background: #bfdbfe;
        }

        button {
          min-width: 42px;
          height: 42px;
          border: 1px solid rgba(191, 219, 254, 0.38);
          border-radius: 12px;
          background: rgba(30, 41, 59, 0.9);
          color: #f8fafc;
          font-size: 17px;
          font-weight: 850;
          cursor: pointer;
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.36);
        }

        button:hover {
          background: rgba(51, 65, 85, 0.96);
        }

        .stage {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          overflow: hidden;
        }

        .stage.dragging {
          cursor: grabbing;
        }

        .stage > img {
          max-width: 94vw;
          max-height: 88vh;
          transform-origin: center center;
          will-change: transform;
          pointer-events: none;
          image-rendering: auto;
          box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.22), 0 30px 90px rgba(0, 0, 0, 0.45);
        }

        .caption img {
          display: inline-block !important;
          width: 1.45em !important;
          height: 1.45em !important;
          max-width: 1.45em !important;
          max-height: 1.45em !important;
          object-fit: contain !important;
          margin: 0 0.16em !important;
          vertical-align: -0.32em !important;
          box-shadow: none !important;
          pointer-events: none;
        }

        .footer {
          display: none;
        }
      </style>

      <div class="viewer" role="dialog" aria-modal="true" aria-label="RadPrimer zoom viewer">
        <div class="topbar">
          <div class="title"><span class="image-number"></span><span class="caption"></span></div>
          <button class="caption-pill" type="button" title="Show caption">
            <span class="caption-pill-label">Caption hidden</span>
          </button>
          <div class="tools">
            <select class="image-jump" title="Jump to image"></select>
            <button class="zoom-out" type="button" title="Zoom out">-</button>
            <button class="zoom-in" type="button" title="Zoom in">+</button>
            <button class="reset" type="button" title="Reset">1:1</button>
            <button class="shortcut-toggle" type="button" title="Keyboard shortcuts">Keys</button>
            <button class="close" type="button" title="Close">x</button>
          </div>
        </div>
        <div class="shortcut-panel" hidden>
          <div class="shortcut-head">
            <span>Zoom shortcuts</span>
            <button class="shortcut-reset" type="button">Reset</button>
          </div>
          <div class="shortcut-list"></div>
        </div>
        <div class="stage">
          <img alt="RadPrimer image">
        </div>
        <div class="footer">Wheel or buttons to zoom. Drag to pan. Double-click to toggle zoom. Esc closes.</div>
      </div>
    `;

    shadow.querySelector(".close").addEventListener("click", closeZoomViewer);
    shadow.querySelector(".caption-pill").addEventListener("click", toggleCaption);
    shadow.querySelector(".image-jump").addEventListener("change", (event) => {
      navigateZoomToImageNumber(parseInt(event.currentTarget.value || "", 10));
    });
    shadow.querySelector(".shortcut-toggle").addEventListener("click", toggleShortcutPanel);
    shadow.querySelector(".shortcut-reset").addEventListener("click", resetShortcutSettings);
    shadow.querySelector(".shortcut-list").addEventListener("click", (event) => {
      const button = event.target?.closest?.("[data-shortcut-action]");
      if (!button) return;
      startShortcutCapture(button.dataset.shortcutAction);
    });
    shadow.querySelector(".zoom-in").addEventListener("click", () => zoomBy(1.25));
    shadow.querySelector(".zoom-out").addEventListener("click", () => zoomBy(1 / 1.25));
    shadow.querySelector(".reset").addEventListener("click", resetZoom);

    const stage = shadow.querySelector(".stage");
    stage.addEventListener("wheel", onZoomWheel, { passive: false });
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    stage.addEventListener("dblclick", () => {
      if (zoomState.scale < 1.75) {
        zoomState.scale = 2.5;
      } else {
        resetZoom();
        return;
      }
      applyTransform();
    });

    renderShortcutPanel();
    return host;
  }

  function imageLabelFromInfo(info) {
    if (!info?.imageNumber) return "image";
    return info.total ? `image ${info.imageNumber}/${info.total}` : `image ${info.imageNumber}`;
  }

  function updateImageJump(shadow, currentNumber) {
    const select = shadow.querySelector(".image-jump");
    if (!select) return;

    const infos = getImageThumbs()
      .map((thumb, index) => getInfoFromThumb(thumb, index))
      .filter((info) => info.imageNumber);

    select.innerHTML = "";
    infos.forEach((info) => {
      const option = document.createElement("option");
      option.value = String(info.imageNumber);
      option.textContent = info.total ? `${info.imageNumber}/${info.total}` : `image ${info.imageNumber}`;
      select.appendChild(option);
    });

    select.value = currentNumber ? String(currentNumber) : "";
    select.style.display = infos.length > 1 ? "" : "none";
  }

  function syncUnderlyingThumbnail(info) {
    const anchor = info?.thumb?.closest("a");
    if (!anchor) return;
    try {
      anchor.click();
      scheduleEnhancement();
    } catch {}
  }

  function setZoomViewerImage(info, options = {}) {
    const host = ensureZoomHost();
    const shadow = host.shadowRoot;
    const annotated =
      typeof options.annotated === "boolean"
        ? options.annotated
        : imageUrlIsAnnotated(options.sourceUrl || zoomState.imageUrl);
    const imageUrl =
      buildImageUrl(info.imageId, annotated) ||
      setImageUrlAnnotated(options.sourceUrl || zoomState.imageUrl, annotated);

    if (!imageUrl) return false;

    const imageLabel = imageLabelFromInfo(info);
    shadow.querySelector(".stage > img").src = imageUrl;
    shadow.querySelector(".image-number").textContent = imageLabel;
    shadow.querySelector(".caption").innerHTML = info.captionHtml || "RadPrimer image";
    shadow.querySelector(".caption-pill-label").textContent = `${imageLabel} caption`;
    updateImageJump(shadow, info.imageNumber);

    if (options.syncThumb) syncUnderlyingThumbnail(info);

    host.style.display = "block";
    zoomState = {
      ...zoomState,
      open: true,
      dragging: false,
      annotated,
      imageId: info.imageId,
      imageUrl,
      imageNumber: info.imageNumber,
      total: info.total || null,
      captionCollapsed: options.resetCaption ? false : zoomState.captionCollapsed
    };

    if (options.resetView) {
      zoomState.scale = 1;
      zoomState.x = 0;
      zoomState.y = 0;
    }

    applyCaptionState();
    applyTransform();
    return true;
  }

  function openZoomViewer() {
    const info = getActiveImageInfo();
    const src = extractBackgroundUrl(info.active);
    if (!src) {
      console.warn("[RadPrimer image tools] Could not find active image URL for zoom viewer.");
      return;
    }

    setZoomViewerImage(info, {
      sourceUrl: src,
      annotated: imageUrlIsAnnotated(src),
      resetView: true,
      resetCaption: true
    });
  }

  function openZoomViewerFromEvent(event) {
    const now = Date.now();
    if (now - lastOpenAt < 250) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.stopImmediatePropagation?.();
      return;
    }
    lastOpenAt = now;

    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    openZoomViewer();
  }

  function closeZoomViewer() {
    const host = document.getElementById(HOST_ID);
    if (!host) return;
    host.style.display = "none";
    zoomState.open = false;
    zoomState.dragging = false;
  }

  function applyCaptionState() {
    const viewer = document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".viewer");
    if (!viewer) return;
    viewer.classList.toggle("captions-collapsed", Boolean(zoomState.captionCollapsed));
  }

  function toggleCaption() {
    if (!zoomState.open) return;
    zoomState.captionCollapsed = !zoomState.captionCollapsed;
    applyCaptionState();
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
        shortcutCaptureAction === id ? "Press key..." : displayShortcutKey(shortcutSettings[id]);
      button.classList.toggle("listening", shortcutCaptureAction === id);
      row.append(labelEl, button);
      list.appendChild(row);
    });
  }

  function toggleShortcutPanel() {
    const panel = getShortcutPanel();
    if (!panel) return;
    panel.hidden = !panel.hidden;
    shortcutCaptureAction = "";
    renderShortcutPanel();
  }

  function startShortcutCapture(actionId) {
    if (!SHORTCUT_ACTIONS.some(([id]) => id === actionId)) return;
    shortcutCaptureAction = actionId;
    const panel = getShortcutPanel();
    if (panel) panel.hidden = false;
    renderShortcutPanel();
  }

  async function assignShortcutFromEvent(event) {
    if (!shortcutCaptureAction) return false;
    event.preventDefault();
    event.stopPropagation();

    const key = normalizeShortcutKey(event.key);
    if (key === "Escape") {
      shortcutCaptureAction = "";
      renderShortcutPanel();
      return true;
    }

    if (key) {
      shortcutSettings = {
        ...shortcutSettings,
        [shortcutCaptureAction]: key
      };
      shortcutCaptureAction = "";
      await saveShortcutSettings();
      renderShortcutPanel();
    }

    return true;
  }

  async function resetShortcutSettings() {
    shortcutSettings = { ...DEFAULT_SHORTCUTS };
    shortcutCaptureAction = "";
    await saveShortcutSettings();
    renderShortcutPanel();
  }

  function toggleAnnotation() {
    if (!zoomState.open) return;
    const nextAnnotated = !zoomState.annotated;
    const nextUrl = getZoomImageUrl(nextAnnotated);
    if (!nextUrl) return;

    const img = document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".stage > img");
    if (!img) return;
    zoomState.annotated = nextAnnotated;
    zoomState.imageUrl = nextUrl;
    img.src = nextUrl;
    applyTransform();
  }

  function getZoomNavigationInfos() {
    return getImageThumbs()
      .map((thumb, index) => getInfoFromThumb(thumb, index))
      .filter((info) => info.imageId && info.imageNumber);
  }

  function getCurrentZoomIndex(infos) {
    let index = infos.findIndex((info) => info.imageId === zoomState.imageId);
    if (index >= 0) return index;
    index = infos.findIndex((info) => info.imageNumber === zoomState.imageNumber);
    return index >= 0 ? index : 0;
  }

  function navigateZoomBy(delta) {
    if (!zoomState.open) return;
    const infos = getZoomNavigationInfos();
    if (!infos.length) return;

    const currentIndex = getCurrentZoomIndex(infos);
    const nextIndex = (currentIndex + delta + infos.length) % infos.length;
    setZoomViewerImage(infos[nextIndex], {
      annotated: zoomState.annotated,
      resetView: true,
      syncThumb: true
    });
  }

  function navigateZoomToImageNumber(imageNumber) {
    if (!zoomState.open || !Number.isFinite(imageNumber)) return;
    const info = getZoomNavigationInfos().find((candidate) => candidate.imageNumber === imageNumber);
    if (!info) return;

    setZoomViewerImage(info, {
      annotated: zoomState.annotated,
      resetView: true,
      syncThumb: true
    });
  }

  function shortcutMatches(event, actionId) {
    const saved = normalizeShortcutKey(shortcutSettings[actionId]);
    const pressed = normalizeShortcutKey(event.key);
    if (!saved || !pressed) return false;
    if (saved === pressed) return true;
    return actionId === "zoomIn" && saved === "+" && pressed === "=";
  }

  function performShortcutAction(actionId) {
    if (actionId === "close") closeZoomViewer();
    else if (actionId === "previous") navigateZoomBy(-1);
    else if (actionId === "next") navigateZoomBy(1);
    else if (actionId === "caption") toggleCaption();
    else if (actionId === "annotation") toggleAnnotation();
    else if (actionId === "zoomIn") zoomBy(1.25);
    else if (actionId === "zoomOut") zoomBy(1 / 1.25);
    else if (actionId === "reset") resetZoom();
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function zoomBy(multiplier) {
    zoomState.scale = clamp(zoomState.scale * multiplier, 0.25, 12);
    applyTransform();
  }

  function resetZoom() {
    zoomState.scale = 1;
    zoomState.x = 0;
    zoomState.y = 0;
    applyTransform();
  }

  function applyTransform() {
    const img = document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".stage > img");
    if (!img) return;
    img.style.transform = `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`;
  }

  function onZoomWheel(event) {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.14 : 1 / 1.14);
  }

  function isPointInsideZoomImage(event) {
    const img = document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".stage > img");
    if (!img) return false;
    const rect = img.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  function onPointerDown(event) {
    if (!isPointInsideZoomImage(event)) {
      closeZoomViewer();
      return;
    }

    const stage = event.currentTarget;
    zoomState.dragging = true;
    zoomState.startX = event.clientX;
    zoomState.startY = event.clientY;
    zoomState.originX = zoomState.x;
    zoomState.originY = zoomState.y;
    stage.classList.add("dragging");
    stage.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!zoomState.dragging) return;
    zoomState.x = zoomState.originX + event.clientX - zoomState.startX;
    zoomState.y = zoomState.originY + event.clientY - zoomState.startY;
    applyTransform();
  }

  function onPointerUp(event) {
    const stage = event.currentTarget;
    zoomState.dragging = false;
    stage.classList.remove("dragging");
    stage.releasePointerCapture?.(event.pointerId);
  }

  function handleDocumentClick(event) {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target) return;
    const zoomButton = target.closest("#docLB .view-large-js, #docLB #image-zoom");
    const activeImage = target.closest("#docLB .active-image-js");
    if (!zoomButton && !activeImage) return;

    openZoomViewerFromEvent(event);
  }

  function bindZoomOpenTargets() {
    const targets = document.querySelectorAll(
      "#docLB .active-image-js, #docLB .view-large-js, #docLB #image-zoom"
    );

    targets.forEach((target) => {
      if (target.dataset.radprimerZoomBound === "true") return;
      target.dataset.radprimerZoomBound = "true";
      target.addEventListener("click", openZoomViewerFromEvent, true);
      target.addEventListener("pointerup", openZoomViewerFromEvent, true);
    });
  }

  function ensureInlineZoomControl() {
    const large = getActiveImageContainer();
    if (!large) return;

    let button = large.querySelector(":scope > .rp-open-zoom-control");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "rp-open-zoom-control";
      button.textContent = "Zoom image";
      button.title = "Open full-screen zoom viewer";
      large.appendChild(button);
    }

    if (button.dataset.radprimerZoomBound === "true") return;
    button.dataset.radprimerZoomBound = "true";
    button.addEventListener("click", openZoomViewerFromEvent, true);
    button.addEventListener("pointerup", openZoomViewerFromEvent, true);
  }

  function ensureFloatingZoomControl() {
    const info = getActiveImageInfo();
    let button = document.getElementById(FLOATING_CONTROL_ID);

    if (!info.active) {
      if (button) button.style.display = "none";
      return;
    }

    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.id = FLOATING_CONTROL_ID;
      button.title = "Open full-screen zoom viewer";
      document.documentElement.appendChild(button);
      button.addEventListener("click", openZoomViewerFromEvent, true);
      button.addEventListener("pointerup", openZoomViewerFromEvent, true);
    }

    button.textContent = info.imageNumber ? `Zoom image ${info.imageNumber}` : "Zoom image";
    button.style.display = "inline-flex";
  }

  async function handleKeydown(event) {
    if (!zoomState.open) return;

    if (shortcutCaptureAction) {
      await assignShortcutFromEvent(event);
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const key = String(event.key || "").toLowerCase();
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const inControl = Boolean(target?.closest?.("select, input, textarea, button, [contenteditable='true']"));

    if (key === "escape") {
      event.preventDefault();
      closeZoomViewer();
      return;
    }

    if (inControl) return;

    const action = SHORTCUT_ACTIONS.find(([id]) => shortcutMatches(event, id))?.[0] || "";
    if (!action) return;

    event.preventDefault();
    performShortcutAction(action);
  }

  let scheduled = false;
  function scheduleEnhancement() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhanceThumbnails();
    });
  }

  document.addEventListener("click", handleDocumentClick, true);
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("radprimer-open-image-zoom", openZoomViewer);
  loadShortcutSettings();

  const observer = new MutationObserver(scheduleEnhancement);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "id", "hidden"]
  });

  scheduleEnhancement();
})();
