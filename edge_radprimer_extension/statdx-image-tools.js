(() => {
  if (window.__statdxImageToolsInstalled) return;
  window.__statdxImageToolsInstalled = true;

  const STYLE_ID = "statdx-image-tools-style";
  const HOST_ID = "statdx-image-zoom-host";
  const STORAGE_KEY = "statdxZoomShortcutSettings";
  const MIN_DISPLAY_VALUE = 0.2;
  const MAX_DISPLAY_VALUE = 4;
  const DEFAULT_SHORTCUTS = {
    close: "s",
    previous: "k",
    next: "l",
    caption: "t",
    source: "a",
    zoomIn: "+",
    zoomOut: "-",
    reset: "0",
    resetWindow: "w",
    invertWindow: "i",
    playerPlayPause: "p",
    playerBack10: "ArrowLeft",
    playerForward10: "ArrowRight",
    playerJumpImage: "x"
  };

  let shortcuts = { ...DEFAULT_SHORTCUTS };
  let captureAction = "";
  let lastOpenAt = 0;
  let articleMediaRegistry = { key: "", infos: [] };
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
    windowBrightness: 1,
    windowContrast: 1,
    inverted: false,
    windowing: false,
    windowOriginBrightness: 1,
    windowOriginContrast: 1,
    captionCollapsed: false,
    sourceMode: "large",
    imageId: "",
    imageNumber: null,
    total: null,
    imageOrder: [],
    imageCursor: -1,
    orderKey: ""
  };

  const SHORTCUT_ACTIONS = [
    ["close", "Close zoom"],
    ["previous", "Previous image"],
    ["next", "Next image"],
    ["caption", "Hide/show caption"],
    ["source", "Large/thumbnail source"],
    ["zoomIn", "Zoom in"],
    ["zoomOut", "Zoom out"],
    ["reset", "Reset zoom"],
    ["resetWindow", "Reset window/level"],
    ["invertWindow", "Invert display"],
    ["playerPlayPause", "Audio play/pause"],
    ["playerBack10", "Audio back 10 sec"],
    ["playerForward10", "Audio forward 10 sec"],
    ["playerJumpImage", "Audio jump to image"]
  ];

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #mediaModal .gallery-thumbnail-btn,
      #mediaModal .ThumbnailImage,
      #mediaModal .large-media {
        position: relative !important;
      }

      #mediaModal .thumbnail-image__img,
      #mediaModal .large-media__image__img {
        cursor: zoom-in !important;
      }

      #mediaModal .sdx-image-number-badge,
      #mediaModal .sdx-active-image-number {
        position: absolute;
        z-index: 2147483000;
        min-width: 26px;
        height: 26px;
        padding: 0 8px;
        border-radius: 999px;
        background: rgba(12, 18, 31, 0.9);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.86);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.42);
        font: 900 14px/24px Arial, Helvetica, sans-serif;
        text-align: center;
        pointer-events: none;
      }

      #mediaModal .sdx-image-number-badge {
        top: 4px;
        left: 4px;
      }

      #mediaModal .sdx-active-image-number {
        top: 12px;
        left: 12px;
        height: auto;
        padding: 7px 11px;
        font-size: 18px;
        line-height: 1;
      }

      #mediaModal .sdx-open-zoom-zone {
        position: absolute;
        z-index: 2147482999;
        border: 0;
        padding: 0;
        margin: 0;
        background: transparent;
        cursor: zoom-in;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return String(value || "").replace(/["\\]/g, "\\$&");
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
    if (key.length === 1) return key.toUpperCase();
    return key;
  }

  async function loadShortcuts() {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      shortcuts = { ...DEFAULT_SHORTCUTS, ...(stored?.[STORAGE_KEY] || {}) };
    } catch {
      shortcuts = { ...DEFAULT_SHORTCUTS };
    }
    renderShortcutPanel();
  }

  async function saveShortcuts() {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: shortcuts });
    } catch {}
  }

  function imageIdFromString(value) {
    const match = String(value || "").match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    );
    return match?.[0] || "";
  }

  function imageIdFromElement(el) {
    if (!el) return "";
    return (
      el.getAttribute("data-image-id") ||
      el.closest("[data-media-id]")?.getAttribute("data-media-id") ||
      imageIdFromString(el.id) ||
      imageIdFromString(el.getAttribute("src")) ||
      imageIdFromString(el.closest("[id*='thumbnail-button-']")?.id)
    );
  }

  function explicitImageNumberFromElement(el) {
    const container = el?.closest(".gallery-thumbnail-btn, .gallery-thumbnail-container, .ThumbnailImage");
    const visibleNumber = parseInt(container?.querySelector(".thumbnail-image__number")?.textContent || "", 10);
    if (Number.isFinite(visibleNumber)) return visibleNumber;

    const label =
      el?.getAttribute("aria-label") ||
      el?.closest("[aria-label]")?.getAttribute("aria-label") ||
      "";
    const labelMatch = label.match(/image\s+(\d+)\s+of\s+(\d+)/i);
    if (labelMatch) return parseInt(labelMatch[1], 10);

    return null;
  }

  function imageNumberFromElement(el, fallbackIndex = 0) {
    const explicitNumber = explicitImageNumberFromElement(el);
    if (Number.isFinite(explicitNumber)) return explicitNumber;
    return fallbackIndex + 1;
  }

  function getTotalImages() {
    const overlayTotal = parseInt(
      document.querySelector("#mediaModal .qa-imageOverlay[data-media-count]")?.getAttribute("data-media-count") || "",
      10
    );
    if (Number.isFinite(overlayTotal)) return overlayTotal;

    const galleryTotal = parseInt(
      document.querySelector("#mediaModal .qa-gallery[data-number-of-media]")?.getAttribute("data-number-of-media") ||
        "",
      10
    );
    if (Number.isFinite(galleryTotal)) return galleryTotal;

    return null;
  }

  function getArticleTitle() {
    return document.title.replace(/\s+\|\s+STATdx\s*$/i, "").trim();
  }

  function getMediaGroupName(card) {
    const group = card?.closest(".media-group, .qa-media-group");
    return (
      group?.querySelector(".media-group__name, .qa-media-group__name")?.textContent?.trim() || ""
    );
  }

  function getMediaCardImageId(card) {
    if (!card) return "";
    return (
      imageIdFromString(card.id) ||
      imageIdFromString(card.querySelector(".ThumbnailImage[id], [id^='media-'], button[id]")?.id) ||
      imageIdFromString(
        card
          .querySelector("img[src*='/image/thumbnail/'], img[src*='/image/']")
          ?.getAttribute("src")
      )
    );
  }

  function getArticleMediaCards() {
    return Array.from(
      document.querySelectorAll(
        [
          ".media-group .media-card",
          ".qa-media-group .qa-media-card",
          ".media-card.qa-media-card"
        ].join(",")
      )
    ).filter((card) => !card.closest("#mediaModal"));
  }

  function buildArticleMediaRegistry() {
    const key = getOrderKey();
    const seen = new Map();

    getArticleMediaCards().forEach((card) => {
      const imageId = getMediaCardImageId(card);
      if (!imageId || seen.has(imageId)) return;
      const captionNode = card.querySelector(".qa-media-card__caption, .media-card__caption");
      const img = card.querySelector("img[src*='/image/thumbnail/'], img[src*='/image/']");
      seen.set(imageId, {
        imageId,
        imageNumber: seen.size + 1,
        total: null,
        captionHtml: captionNode?.innerHTML?.trim() || "",
        title: getArticleTitle(),
        groupName: getMediaGroupName(card),
        hasExplicitNumber: true,
        isArticleCanonical: true,
        imageSrc: img?.getAttribute("src") || "",
        domOrder: seen.size
      });
    });

    const infos = Array.from(seen.values());
    infos.forEach((info) => {
      info.total = infos.length || null;
    });
    articleMediaRegistry = { key, infos };
    return infos;
  }

  function getArticleMediaRegistry({ force = false } = {}) {
    if (!force && articleMediaRegistry.key === getOrderKey() && articleMediaRegistry.infos.length) {
      return articleMediaRegistry.infos;
    }
    return buildArticleMediaRegistry();
  }

  function getCaptionTabButton() {
    return Array.from(document.querySelectorAll("button")).find((button) => {
      const text = button.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
      return text === "caption" && isVisible(button);
    });
  }

  async function ensureArticleCaptionView(timeoutMs = 1800) {
    const existing = getArticleMediaRegistry({ force: true });
    if (existing.some((info) => info.captionHtml)) return true;

    const captionButton = getCaptionTabButton();
    if (captionButton && captionButton.getAttribute("aria-current") !== "true") {
      captionButton.click();
    }

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const infos = getArticleMediaRegistry({ force: true });
      if (infos.some((info) => info.captionHtml)) return true;
      await sleep(80);
    }

    getArticleMediaRegistry({ force: true });
    return false;
  }

  function getImageInfos() {
    const seen = new Map();
    const explicitTotal = getTotalImages();
    const articleInfos = getArticleMediaRegistry();

    articleInfos.forEach((info) => {
      seen.set(info.imageId, { ...info });
    });

    const candidates = Array.from(
      document.querySelectorAll(
        [
          "#mediaModal img[src*='/image/thumbnail/']",
          "#mediaModal img[src*='/image/']",
          "#mediaModal [data-media-id]",
          "main img[src*='/image/thumbnail/']",
          "article img[src*='/image/thumbnail/']",
          "img[src*='/image/thumbnail/']"
        ].join(",")
      )
    );

    candidates.forEach((el, index) => {
      const imageId = imageIdFromElement(el);
      if (!imageId) return;
      const explicitNumber = explicitImageNumberFromElement(el);
      const existing = seen.get(imageId);
      const candidate = {
        imageId,
        imageNumber: Number.isFinite(explicitNumber) ? explicitNumber : null,
        total: explicitTotal || articleInfos.length || null,
        captionHtml: getCaptionHtmlForImage(imageId),
        title: getTitleForImage(imageId),
        hasExplicitNumber: Number.isFinite(explicitNumber),
        isNativeLargeImage: Boolean(el.closest("#mediaModal .large-media")),
        domOrder: index
      };

      if (!existing) {
        seen.set(imageId, candidate);
        return;
      }

      const shouldUseCandidateNumber =
        !existing.isArticleCanonical && !existing.hasExplicitNumber && candidate.hasExplicitNumber;
      const shouldUseCandidateOrdering =
        !existing.isArticleCanonical &&
        !existing.hasExplicitNumber &&
        !candidate.hasExplicitNumber &&
        existing.isNativeLargeImage &&
        !candidate.isNativeLargeImage;

      seen.set(imageId, {
        ...existing,
        imageNumber: shouldUseCandidateNumber ? candidate.imageNumber : existing.imageNumber,
        total: existing.total || candidate.total,
        captionHtml: existing.captionHtml || candidate.captionHtml,
        title: existing.title || candidate.title,
        hasExplicitNumber: existing.hasExplicitNumber || candidate.hasExplicitNumber,
        isArticleCanonical: existing.isArticleCanonical || false,
        isNativeLargeImage: existing.isNativeLargeImage && candidate.isNativeLargeImage,
        domOrder: shouldUseCandidateOrdering ? candidate.domOrder : Math.min(existing.domOrder ?? index, candidate.domOrder ?? index)
      });
    });

    const infos = Array.from(seen.values());
    infos.sort((a, b) => {
      const aNumber = Number.isFinite(Number(a.imageNumber)) ? Number(a.imageNumber) : null;
      const bNumber = Number.isFinite(Number(b.imageNumber)) ? Number(b.imageNumber) : null;
      if (aNumber !== null && bNumber !== null && aNumber !== bNumber) return aNumber - bNumber;
      return (Number(a.domOrder) || 0) - (Number(b.domOrder) || 0);
    });
    const inferredTotal = explicitTotal || infos.length || null;
    infos.forEach((info, index) => {
      if (!Number.isFinite(info.imageNumber)) info.imageNumber = index + 1;
      info.total = info.total || inferredTotal;
    });
    return infos;
  }

  function getOrderKey() {
    return `${location.origin}${location.pathname}${location.search}`;
  }

  function mergeImageInfo(base, incoming) {
    const next = { ...(base || {}), ...(incoming || {}) };
    const incomingNumber = Number(incoming?.imageNumber);
    const baseNumber = Number(base?.imageNumber);
    const incomingTotal = Number(incoming?.total);
    const baseTotal = Number(base?.total);
    const incomingHasExplicitNumber = incoming?.hasExplicitNumber === true;
    const baseIsArticleCanonical = base?.isArticleCanonical === true;
    next.imageNumber =
      Number.isFinite(incomingNumber) &&
      !baseIsArticleCanonical &&
      (incomingHasExplicitNumber || !Number.isFinite(baseNumber))
        ? incomingNumber
        : Number.isFinite(baseNumber)
          ? baseNumber
          : null;
    next.total = Number.isFinite(incomingTotal) ? incomingTotal : Number.isFinite(baseTotal) ? baseTotal : null;
    next.captionHtml = incoming?.captionHtml || base?.captionHtml || "";
    next.title = incoming?.title || base?.title || "";
    next.hasExplicitNumber = base?.hasExplicitNumber || incoming?.hasExplicitNumber || false;
    next.isArticleCanonical = base?.isArticleCanonical || incoming?.isArticleCanonical || false;
    return next;
  }

  function refreshZoomImageOrder(extraInfos = []) {
    const key = getOrderKey();
    const previous = zoomState.orderKey === key && Array.isArray(zoomState.imageOrder) ? zoomState.imageOrder : [];
    const byId = new Map();

    const add = (info) => {
      if (!info?.imageId) return;
      byId.set(info.imageId, mergeImageInfo(byId.get(info.imageId), info));
    };

    const currentInfos = getImageInfos();
    (currentInfos.length ? currentInfos : previous).forEach(add);
    extraInfos.forEach(add);

    const ordered = Array.from(byId.values()).sort((a, b) => {
      const aNumber = Number.isFinite(Number(a.imageNumber)) ? Number(a.imageNumber) : Number.POSITIVE_INFINITY;
      const bNumber = Number.isFinite(Number(b.imageNumber)) ? Number(b.imageNumber) : Number.POSITIVE_INFINITY;
      if (aNumber !== bNumber) return aNumber - bNumber;
      return String(a.imageId).localeCompare(String(b.imageId));
    });

    const inferredTotal =
      Math.max(
        0,
        ...ordered.map((info) => Number(info.total) || 0),
        ...ordered.map((info) => Number(info.imageNumber) || 0),
        ordered.length
      ) || null;

    ordered.forEach((info, index) => {
      if (!Number.isFinite(Number(info.imageNumber))) info.imageNumber = index + 1;
      info.total = info.total || inferredTotal;
    });

    zoomState.imageOrder = ordered;
    zoomState.orderKey = key;
    return ordered;
  }

  function findImageInfoInOrder(imageNumberOrId, ordered = refreshZoomImageOrder()) {
    if (typeof imageNumberOrId === "string") {
      return ordered.find((info) => info.imageId === imageNumberOrId) || null;
    }
    return ordered.find((info) => Number(info.imageNumber) === Number(imageNumberOrId)) || null;
  }

  function getImageCursor(info, ordered = refreshZoomImageOrder()) {
    if (!info) return -1;
    let index = ordered.findIndex((candidate) => candidate.imageId === info.imageId);
    if (index < 0) index = ordered.findIndex((candidate) => Number(candidate.imageNumber) === Number(info.imageNumber));
    return index;
  }

  function getActiveImageElement() {
    const active =
      document.querySelector("#mediaModal .large-media[data-media-id] img.large-media__image__img") ||
      document.querySelector("#mediaModal .large-media[data-media-id] img[src*='/image/']") ||
      document.querySelector("#mediaModal .large-media__image__img");
    return active && isVisible(active) ? active : active;
  }

  function getActiveInfo(sourceElement = null) {
    const active = sourceElement || getActiveImageElement();
    const imageId = imageIdFromElement(active);
    const infos = getImageInfos();
    const byId = infos.find((info) => info.imageId === imageId);
    const imageNumber =
      byId?.imageNumber ||
      imageNumberFromElement(
        document.querySelector(`#mediaModal #thumbnail-button-${cssEscape(imageId)} img`) ||
          document.querySelector(`#mediaModal #thumbnail-button-${cssEscape(imageId)}`),
        infos.findIndex((info) => info.imageId === imageId)
      );

    return {
      imageId,
      imageNumber,
      total: getTotalImages(),
      captionHtml: getCaptionHtmlForImage(imageId) || byId?.captionHtml || "",
      title: getTitleForImage(imageId) || byId?.title || "",
      active
    };
  }

  function getArticleMediaCardForImage(imageId) {
    if (!imageId) return null;
    const directCard = document.querySelector(`#media-${cssEscape(imageId)}`)?.closest(".media-card");
    if (directCard) return directCard;

    return (
      Array.from(document.querySelectorAll(`img[src*="${imageId}"]`))
        .map((img) => img.closest(".media-card"))
        .find(Boolean) || null
    );
  }

  function getTitleForImage(imageId) {
    const title = document.querySelector(`#imageTitleId-${cssEscape(imageId)} .qa-imageTitle`);
    return title?.textContent?.trim() || document.title.replace(/\s+\|\s+STATdx\s*$/i, "").trim();
  }

  function getCaptionHtmlForImage(imageId) {
    const node =
      document.querySelector(`#imageCaptionId-${cssEscape(imageId)} .qa-imageCaption`) ||
      document.querySelector(`#imageCaptionId-${cssEscape(imageId)} .image-overlay-caption`);
    if (node?.innerHTML?.trim()) return node.innerHTML.trim();

    const mediaCard = getArticleMediaCardForImage(imageId);
    const articleCaption = mediaCard?.querySelector(".qa-media-card__caption, .media-card__caption");
    return articleCaption?.innerHTML?.trim() || "";
  }

  function makeLargeUrl(imageId) {
    return imageId ? new URL(`/image/${imageId}`, location.origin).href : "";
  }

  function makeThumbnailUrl(imageId, size = 1000) {
    if (!imageId) return "";
    const url = new URL(`/image/thumbnail/${imageId}`, location.origin);
    url.searchParams.set("size", String(size));
    url.searchParams.set("quality", "90");
    return url.href;
  }

  function imageUrlFor(info, mode = zoomState.sourceMode) {
    return mode === "thumbnail" ? makeThumbnailUrl(info.imageId) : makeLargeUrl(info.imageId);
  }

  function enhanceStatDxModal() {
    injectStyle();
    const modal = document.querySelector("#mediaModal");
    if (!modal) return;

    const thumbs = Array.from(modal.querySelectorAll(".gallery-thumbnail-btn, .ThumbnailImage[id^='thumbnail-button-']"));
    thumbs.forEach((thumb, index) => {
      const img = thumb.querySelector("img");
      const num = imageNumberFromElement(img || thumb, index);
      let badge = thumb.querySelector(":scope > .sdx-image-number-badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "sdx-image-number-badge";
        thumb.appendChild(badge);
      }
      badge.textContent = String(num);
    });

    updateActiveBadge();
  }

  function updateActiveBadge() {
    const large = document.querySelector("#mediaModal .large-media[data-media-id]");
    const info = getActiveInfo();
    if (!large || !info.imageId) return;
    let badge = large.querySelector(":scope > .sdx-active-image-number");
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "sdx-active-image-number";
      large.appendChild(badge);
    }
    badge.textContent = info.total ? `image ${info.imageNumber}/${info.total}` : `image ${info.imageNumber}`;
    ensureZoomHitZone();
  }

  function ensureZoomHitZone() {
    const large = document.querySelector("#mediaModal .large-media[data-media-id]");
    const img = getActiveImageElement();
    if (!large || !img || !isVisible(img)) return;

    let zone = large.querySelector(":scope > .sdx-open-zoom-zone");
    if (!zone) {
      zone = document.createElement("button");
      zone.type = "button";
      zone.className = "sdx-open-zoom-zone";
      zone.title = "Open image zoom viewer";
      zone.setAttribute("aria-label", "Open image zoom viewer");
      zone.addEventListener("click", (event) => openViewerFromEvent(event, img), true);
      large.appendChild(zone);
    }

    const largeRect = large.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    zone.style.left = `${Math.max(0, imgRect.left - largeRect.left)}px`;
    zone.style.top = `${Math.max(0, imgRect.top - largeRect.top)}px`;
    zone.style.width = `${Math.max(1, imgRect.width)}px`;
    zone.style.height = `${Math.max(1, imgRect.height)}px`;
  }

  function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (host) return host;

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
        * { box-sizing: border-box; }
        .viewer {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: rgba(3, 7, 18, 0.92);
          color: #f8fafc;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .topbar {
          position: absolute;
          inset: 18px 18px auto 18px;
          z-index: 3;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          pointer-events: none;
        }
        .title {
          max-width: min(980px, calc(100vw - 260px));
          padding: 12px 16px;
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.88);
          border: 1px solid rgba(191, 219, 254, 0.38);
          box-shadow: 0 18px 46px rgba(0,0,0,.35);
          font-size: 20px;
          line-height: 1.35;
          pointer-events: auto;
        }
        .image-number {
          font-weight: 900;
          margin-right: 14px;
          white-space: nowrap;
        }
        .caption img {
          display: inline-block !important;
          width: 1.45em !important;
          height: 1.45em !important;
          max-width: 1.45em !important;
          max-height: 1.45em !important;
          object-fit: contain !important;
          margin: 0 .15em !important;
          vertical-align: -0.32em !important;
          box-shadow: none !important;
        }
        .tools {
          position: relative;
          margin-left: auto;
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: nowrap;
          justify-content: flex-end;
          pointer-events: auto;
          padding: 8px;
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.74);
          border: 1px solid rgba(191, 219, 254, 0.26);
        }
        button, select {
          height: 42px;
          border: 1px solid rgba(191, 219, 254, 0.38);
          border-radius: 13px;
          background: rgba(30, 41, 59, 0.9);
          color: #f8fafc;
          font: 900 16px/1 Inter, system-ui, sans-serif;
          cursor: pointer;
          padding: 0 13px;
        }
        button:hover, select:hover { background: rgba(51, 65, 85, 0.98); }
        select { min-width: 90px; }
        .control-panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          display: grid;
          grid-template-columns: repeat(3, minmax(58px, auto));
          gap: 8px;
          width: max-content;
          max-width: min(420px, calc(100vw - 36px));
          padding: 10px;
          border-radius: 16px;
          background: rgba(11, 17, 29, 0.95);
          border: 1px solid rgba(191, 219, 254, 0.28);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(16px);
        }
        .control-panel[hidden] { display: none; }
        .control-panel .image-jump {
          grid-column: 1 / -1;
          width: 100%;
          max-width: none;
        }
        .caption-pill { display: none; }
        .viewer.captions-collapsed .title { display: none; }
        .viewer.captions-collapsed .caption-pill {
          display: block;
          position: absolute;
          left: 18px;
          top: 18px;
          z-index: 4;
        }
        .shortcut-panel {
          position: absolute;
          top: 78px;
          right: 18px;
          z-index: 5;
          width: min(360px, calc(100vw - 36px));
          border-radius: 18px;
          padding: 14px;
          background: rgba(15, 23, 42, 0.94);
          border: 1px solid rgba(191, 219, 254, 0.32);
          box-shadow: 0 24px 70px rgba(0,0,0,.45);
        }
        .shortcut-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 900;
          margin-bottom: 10px;
        }
        .shortcut-head button { height: 34px; font-size: 13px; }
        .shortcut-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
          padding: 6px 0;
          font-size: 14px;
        }
        .shortcut-key {
          min-width: 104px;
          height: 34px;
          font-size: 13px;
          background: rgba(37, 99, 235, 0.28);
        }
        .shortcut-key.listening { background: #bfdbfe; color: #0f172a; }
        .stage {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          cursor: grab;
        }
        .stage.dragging { cursor: grabbing; }
        .stage.windowing { cursor: crosshair; }
        .stage > img {
          max-width: 94vw;
          max-height: 90vh;
          transform-origin: center center;
          will-change: transform, filter;
          pointer-events: none;
          box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.22), 0 30px 90px rgba(0, 0, 0, 0.45);
        }
      </style>
      <div class="viewer" role="dialog" aria-modal="true" aria-label="STATdx zoom viewer">
        <div class="topbar">
          <div class="title"><span class="image-number"></span><span class="caption"></span></div>
          <button class="caption-pill" type="button">Caption</button>
          <div class="tools">
            <button class="control-toggle" type="button" title="Image controls" aria-expanded="false">Controls</button>
            <button class="keys" type="button" title="Keyboard shortcuts">Keys</button>
            <div class="control-panel" hidden>
              <select class="image-jump" title="Jump to image"></select>
              <button class="zoom-out" type="button" title="Zoom out">-</button>
              <button class="zoom-in" type="button" title="Zoom in">+</button>
              <button class="reset" type="button" title="Reset zoom">1:1</button>
              <button class="window-down" type="button" title="Decrease window contrast">W-</button>
              <button class="window-up" type="button" title="Increase window contrast">W+</button>
              <button class="level-down" type="button" title="Decrease brightness">L-</button>
              <button class="level-up" type="button" title="Increase brightness">L+</button>
              <button class="invert-window" type="button" title="Invert display">Inv</button>
              <button class="reset-window" type="button" title="Reset window/level">WL 0</button>
              <button class="source" type="button" title="Toggle large/thumbnail source">Src</button>
              <button class="close" type="button" title="Close">x</button>
            </div>
          </div>
        </div>
        <div class="shortcut-panel" hidden>
          <div class="shortcut-head"><span>Study shortcuts</span><button class="shortcut-reset" type="button">Reset</button></div>
          <div class="shortcut-list"></div>
        </div>
        <div class="stage"><img alt="STATdx image"></div>
      </div>
    `;

    const stage = shadow.querySelector(".stage");
    shadow.querySelector(".close").addEventListener("click", closeViewer);
    shadow.querySelector(".caption-pill").addEventListener("click", toggleCaption);
    shadow.querySelector(".image-jump").addEventListener("change", (event) =>
      navigateToNumber(parseInt(event.currentTarget.value || "", 10))
    );
    shadow.querySelector(".zoom-in").addEventListener("click", () => zoomBy(1.25));
    shadow.querySelector(".zoom-out").addEventListener("click", () => zoomBy(1 / 1.25));
    shadow.querySelector(".reset").addEventListener("click", resetZoom);
    shadow.querySelector(".window-down").addEventListener("click", () => adjustWindowing({ contrastMultiplier: 1 / 1.15 }));
    shadow.querySelector(".window-up").addEventListener("click", () => adjustWindowing({ contrastMultiplier: 1.15 }));
    shadow.querySelector(".level-down").addEventListener("click", () => adjustWindowing({ brightnessDelta: -0.08 }));
    shadow.querySelector(".level-up").addEventListener("click", () => adjustWindowing({ brightnessDelta: 0.08 }));
    shadow.querySelector(".invert-window").addEventListener("click", toggleWindowInvert);
    shadow.querySelector(".reset-window").addEventListener("click", resetWindowing);
    shadow.querySelector(".source").addEventListener("click", toggleSourceMode);
    shadow.querySelector(".control-toggle").addEventListener("click", toggleControlPanel);
    shadow.querySelector(".keys").addEventListener("click", toggleShortcutPanel);
    shadow.querySelector(".shortcut-reset").addEventListener("click", resetShortcuts);
    shadow.querySelector(".shortcut-list").addEventListener("click", (event) => {
      const button = event.target?.closest?.("[data-shortcut-action]");
      if (button) startShortcutCapture(button.dataset.shortcutAction);
    });
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    stage.addEventListener("dblclick", () => {
      if (zoomState.scale < 1.75) {
        zoomState.scale = 2.5;
        applyTransform();
      } else {
        resetZoom();
      }
    });

    renderShortcutPanel();
    return host;
  }

  function imageLabel(info) {
    return info?.total ? `image ${info.imageNumber}/${info.total}` : `image ${info?.imageNumber || ""}`;
  }

  function updateJumpSelect(currentNumber, orderedInfos = null) {
    const select = document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".image-jump");
    if (!select) return;
    const infos = orderedInfos || refreshZoomImageOrder();
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

  function setViewerImage(info, options = {}) {
    if (!info?.imageId) return false;
    const host = ensureHost();
    const shadow = host.shadowRoot;
    const mode = options.sourceMode || zoomState.sourceMode || "large";
    const ordered = refreshZoomImageOrder([info]);
    const orderedInfo = findImageInfoInOrder(info.imageId, ordered) || info;
    const finalInfo = {
      ...orderedInfo,
      ...info,
      imageNumber: Number.isFinite(Number(orderedInfo.imageNumber)) ? orderedInfo.imageNumber : info.imageNumber,
      total: info.total || orderedInfo.total || ordered.length || null,
      captionHtml: info.captionHtml || orderedInfo.captionHtml || "",
      title: info.title || orderedInfo.title || ""
    };
    const cursor = getImageCursor(finalInfo, ordered);
    const url = imageUrlFor(finalInfo, mode);

    shadow.querySelector(".stage > img").src = url;
    shadow.querySelector(".image-number").textContent = imageLabel(finalInfo);
    shadow.querySelector(".caption").innerHTML = sanitizeCaptionHtml(finalInfo.captionHtml) || finalInfo.title || "STATdx image";
    shadow.querySelector(".source").textContent = mode === "thumbnail" ? "Thumb" : "Large";
    updateJumpSelect(finalInfo.imageNumber, ordered);

    host.style.display = "block";
    zoomState = {
      ...zoomState,
      open: true,
      dragging: false,
      imageId: finalInfo.imageId,
      imageNumber: finalInfo.imageNumber,
      total: finalInfo.total,
      sourceMode: mode,
      imageOrder: ordered,
      imageCursor: cursor,
      orderKey: getOrderKey()
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

  function sanitizeCaptionHtml(html) {
    const holder = document.createElement("div");
    holder.innerHTML = String(html || "");
    holder.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      const match = src.match(/\/img\/arrows\/([A-Za-z0-9_]+)\.png/i);
      if (!match) {
        img.remove();
        return;
      }
      img.setAttribute("src", new URL(`/img/arrows/${match[1]}.png`, location.origin).href);
      img.removeAttribute("class");
      img.removeAttribute("style");
    });
    holder.querySelectorAll("*").forEach((el) => {
      if (el.tagName.toLowerCase() === "img") return;
      el.replaceWith(...Array.from(el.childNodes));
    });
    return holder.innerHTML.replace(/\s+/g, " ").trim();
  }

  async function openViewer(sourceElement = null) {
    await ensureArticleCaptionView();
    const info = getActiveInfo(sourceElement);
    if (!info.imageId) return;
    setViewerImage(info, { resetView: true });
  }

  function openViewerFromEvent(event, sourceElement = null) {
    const now = Date.now();
    if (now - lastOpenAt < 250) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return;
    }
    lastOpenAt = now;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    openViewer(sourceElement || event.target).catch((error) => {
      console.warn("[STATdx image tools] Could not open zoom viewer.", error);
    });
  }

  function closeViewer() {
    const host = document.getElementById(HOST_ID);
    if (host) host.style.display = "none";
    zoomState.open = false;
    zoomState.dragging = false;
    zoomState.windowing = false;
    captureAction = "";
    setControlPanelOpen(false);
  }

  function applyCaptionState() {
    const viewer = document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".viewer");
    viewer?.classList.toggle("captions-collapsed", Boolean(zoomState.captionCollapsed));
  }

  function toggleCaption() {
    if (!zoomState.open) return;
    zoomState.captionCollapsed = !zoomState.captionCollapsed;
    applyCaptionState();
  }

  function setControlPanelOpen(open) {
    const shadow = document.getElementById(HOST_ID)?.shadowRoot;
    const panel = shadow?.querySelector(".control-panel");
    const toggle = shadow?.querySelector(".control-toggle");
    if (!panel || !toggle) return;
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  }

  function toggleControlPanel() {
    const panel = document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".control-panel");
    if (!panel) return;
    setControlPanelOpen(panel.hidden);
  }

  function toggleSourceMode() {
    if (!zoomState.open) return;
    const nextMode = zoomState.sourceMode === "large" ? "thumbnail" : "large";
    const info = getImageInfos().find((candidate) => candidate.imageId === zoomState.imageId) || {
      imageId: zoomState.imageId,
      imageNumber: zoomState.imageNumber,
      total: zoomState.total,
      captionHtml: getCaptionHtmlForImage(zoomState.imageId),
      title: getTitleForImage(zoomState.imageId)
    };
    setViewerImage(info, { sourceMode: nextMode, resetView: false });
  }

  function enrichImageInfo(info, options = {}) {
    if (!info?.imageId) return info;
    const forcedNumber = Number(options.forceImageNumber);
    const activeInfo = getActiveInfo();
    const activeMatches = activeInfo?.imageId === info.imageId;

    return {
      ...info,
      imageNumber: Number.isFinite(forcedNumber) ? forcedNumber : info.imageNumber || activeInfo?.imageNumber,
      total: info.total || activeInfo?.total || getTotalImages(),
      captionHtml:
        getCaptionHtmlForImage(info.imageId) ||
        (activeMatches ? activeInfo.captionHtml : "") ||
        info.captionHtml ||
        "",
      title: getTitleForImage(info.imageId) || (activeMatches ? activeInfo.title : "") || info.title || ""
    };
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function navigateBy(delta) {
    await ensureArticleCaptionView();
    const infos = refreshZoomImageOrder();
    if (!infos.length) return;
    let index = getImageCursor(
      {
        imageId: zoomState.imageId,
        imageNumber: zoomState.imageNumber
      },
      infos
    );
    if (index < 0) index = 0;
    const next = infos[(index + delta + infos.length) % infos.length];
    setViewerImage(enrichImageInfo(next), { resetView: true });
  }

  async function navigateToNumber(imageNumber) {
    if (!Number.isFinite(imageNumber)) return;
    await ensureArticleCaptionView();
    const ordered = refreshZoomImageOrder();
    const targetInfo = findImageInfoInOrder(imageNumber, ordered);
    if (targetInfo?.imageId) {
      setViewerImage(enrichImageInfo(targetInfo, { forceImageNumber: imageNumber }), { resetView: true });
      return;
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function zoomBy(multiplier) {
    zoomState.scale = clamp(zoomState.scale * multiplier, 0.25, 14);
    applyTransform();
  }

  function resetZoom() {
    zoomState.scale = 1;
    zoomState.x = 0;
    zoomState.y = 0;
    applyTransform();
  }

  function displayFilter() {
    const filters = [
      `brightness(${zoomState.windowBrightness})`,
      `contrast(${zoomState.windowContrast})`
    ];
    if (zoomState.inverted) filters.push("invert(1)");
    return filters.join(" ");
  }

  function adjustWindowing({ brightnessDelta = 0, contrastMultiplier = 1 } = {}) {
    zoomState.windowBrightness = clamp(
      zoomState.windowBrightness + brightnessDelta,
      MIN_DISPLAY_VALUE,
      MAX_DISPLAY_VALUE
    );
    zoomState.windowContrast = clamp(
      zoomState.windowContrast * contrastMultiplier,
      MIN_DISPLAY_VALUE,
      MAX_DISPLAY_VALUE
    );
    applyTransform();
  }

  function resetWindowing() {
    zoomState.windowBrightness = 1;
    zoomState.windowContrast = 1;
    zoomState.inverted = false;
    applyTransform();
  }

  function toggleWindowInvert() {
    zoomState.inverted = !zoomState.inverted;
    applyTransform();
  }

  function applyTransform() {
    const img = document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".stage > img");
    if (!img) return;
    img.style.transform = `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`;
    img.style.filter = displayFilter();
  }

  function onWheel(event) {
    event.preventDefault();
    if (event.shiftKey) {
      adjustWindowing({ contrastMultiplier: event.deltaY < 0 ? 1.08 : 1 / 1.08 });
      return;
    }
    zoomBy(event.deltaY < 0 ? 1.14 : 1 / 1.14);
  }

  function isPointInsideImage(event) {
    const img = document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".stage > img");
    if (!img) return false;
    const rect = img.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  }

  function onPointerDown(event) {
    if (!isPointInsideImage(event)) {
      closeViewer();
      return;
    }
    if (event.shiftKey) {
      zoomState.windowing = true;
      zoomState.startX = event.clientX;
      zoomState.startY = event.clientY;
      zoomState.windowOriginBrightness = zoomState.windowBrightness;
      zoomState.windowOriginContrast = zoomState.windowContrast;
      event.currentTarget.classList.add("windowing");
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }
    zoomState.dragging = true;
    zoomState.startX = event.clientX;
    zoomState.startY = event.clientY;
    zoomState.originX = zoomState.x;
    zoomState.originY = zoomState.y;
    event.currentTarget.classList.add("dragging");
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (zoomState.windowing) {
      const dx = event.clientX - zoomState.startX;
      const dy = event.clientY - zoomState.startY;
      zoomState.windowContrast = clamp(
        zoomState.windowOriginContrast * Math.exp(dx / 260),
        MIN_DISPLAY_VALUE,
        MAX_DISPLAY_VALUE
      );
      zoomState.windowBrightness = clamp(
        zoomState.windowOriginBrightness - dy / 260,
        MIN_DISPLAY_VALUE,
        MAX_DISPLAY_VALUE
      );
      applyTransform();
      return;
    }

    if (!zoomState.dragging) return;
    zoomState.x = zoomState.originX + event.clientX - zoomState.startX;
    zoomState.y = zoomState.originY + event.clientY - zoomState.startY;
    applyTransform();
  }

  function onPointerUp(event) {
    zoomState.dragging = false;
    zoomState.windowing = false;
    event.currentTarget.classList.remove("dragging", "windowing");
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function shortcutMatches(event, action) {
    const saved = normalizeShortcutKey(shortcuts[action]);
    const pressed = normalizeShortcutKey(event.key);
    if (!saved || !pressed) return false;
    if (saved === pressed) return true;
    return action === "zoomIn" && saved === "+" && pressed === "=";
  }

  function sendSpeechifyPlayerAction(action) {
    try {
      chrome.runtime.sendMessage({
        type: "SPEECHIFY_PLAYER_REMOTE",
        payload: { action }
      });
    } catch {}
  }

  function dispatchSpeechifyJumpToCurrentImage() {
    try {
      document.dispatchEvent(new CustomEvent("radprimer-speechify-jump-current-image"));
    } catch {}
  }

  function handleNavigateImageEvent(event) {
    const imageNumber = Number(event?.detail?.imageNumber);
    navigateToNumber(imageNumber);
  }

  async function assignShortcutFromEvent(event) {
    if (!captureAction) return false;
    event.preventDefault();
    event.stopPropagation();
    const key = normalizeShortcutKey(event.key);
    if (key === "Escape") {
      captureAction = "";
      renderShortcutPanel();
      return true;
    }
    shortcuts = { ...shortcuts, [captureAction]: key };
    captureAction = "";
    await saveShortcuts();
    renderShortcutPanel();
    return true;
  }

  async function performShortcut(action) {
    if (action === "close") closeViewer();
    else if (action === "previous") await navigateBy(-1);
    else if (action === "next") await navigateBy(1);
    else if (action === "caption") toggleCaption();
    else if (action === "source") toggleSourceMode();
    else if (action === "zoomIn") zoomBy(1.25);
    else if (action === "zoomOut") zoomBy(1 / 1.25);
    else if (action === "reset") resetZoom();
    else if (action === "resetWindow") resetWindowing();
    else if (action === "invertWindow") toggleWindowInvert();
    else if (action === "playerPlayPause") sendSpeechifyPlayerAction("playPause");
    else if (action === "playerBack10") sendSpeechifyPlayerAction("back10");
    else if (action === "playerForward10") sendSpeechifyPlayerAction("forward10");
    else if (action === "playerJumpImage") dispatchSpeechifyJumpToCurrentImage();
  }

  async function handleKeydown(event) {
    if (await assignShortcutFromEvent(event)) return;
    if (event.defaultPrevented) return;
    if (!zoomState.open) return;
    if (event.key === "Escape") {
      closeViewer();
      return;
    }
    for (const [action] of SHORTCUT_ACTIONS) {
      if (!shortcutMatches(event, action)) continue;
      event.preventDefault();
      event.stopPropagation();
      await performShortcut(action);
      return;
    }
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
      button.textContent = captureAction === id ? "Press key..." : displayShortcutKey(shortcuts[id]);
      button.classList.toggle("listening", captureAction === id);
      row.append(labelEl, button);
      list.appendChild(row);
    });
  }

  function toggleShortcutPanel() {
    const panel = document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".shortcut-panel");
    if (!panel) return;
    setControlPanelOpen(false);
    panel.hidden = !panel.hidden;
    captureAction = "";
    renderShortcutPanel();
  }

  function startShortcutCapture(action) {
    if (!SHORTCUT_ACTIONS.some(([id]) => id === action)) return;
    captureAction = action;
    renderShortcutPanel();
  }

  async function resetShortcuts() {
    shortcuts = { ...DEFAULT_SHORTCUTS };
    captureAction = "";
    await saveShortcuts();
    renderShortcutPanel();
  }

  function getZoomOpenTarget(target) {
    const el = target instanceof Element ? target : target?.parentElement;
    if (!el || !el.closest("#mediaModal")) return null;
    if (
      el.closest(
        [
          ".gallery-thumbnails",
          ".gallery-btn-container",
          ".large-media__button-container",
          ".large-media__button",
          ".qa-imageScrollLeftLink",
          ".qa-imageScrollRightLink",
          ".image-overlay-info-container",
          ".c-els-modal__close"
        ].join(",")
      )
    ) {
      return null;
    }
    return el.closest(
      ".sdx-open-zoom-zone, .large-media__image__img, .large-media__image, .large-media .ThumbnailImage, .large-media .thumbnail-image__button"
    );
  }

  function handleDocumentClick(event) {
    const target = getZoomOpenTarget(event.target);
    if (!target) return;
    openViewerFromEvent(event, target);
  }

  function scheduleEnhance() {
    window.clearTimeout(scheduleEnhance.timer);
    scheduleEnhance.timer = window.setTimeout(enhanceStatDxModal, 80);
  }

  window.addEventListener("resize", scheduleEnhance);

  injectStyle();
  loadShortcuts();
  enhanceStatDxModal();
  document.addEventListener("click", handleDocumentClick, true);
  document.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("radprimer-navigate-image", handleNavigateImageEvent);
  new MutationObserver(scheduleEnhance).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "class", "data-media-id", "aria-current"]
  });
})();
