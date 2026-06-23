(() => {
  if (window.__radprimerImageToolsInstalled) return;
  window.__radprimerImageToolsInstalled = true;

  const STYLE_ID = "radprimer-image-tools-style";
  const HOST_ID = "radprimer-image-zoom-host";
  const FLOATING_CONTROL_ID = "radprimer-floating-zoom-control";
  const SHORTCUT_STORAGE_KEY = "radprimerZoomShortcutSettings";
  const RUNNER_SETTINGS_KEY = "radprimerRunnerSettings";
  const ZOOM_BIND_VERSION = "2026-05-31-large-image-click";
  const MIN_DISPLAY_VALUE = 0.2;
  const MAX_DISPLAY_VALUE = 4;
  const RUNNER_DEFAULTS = {
    engine: "pathology",
    ankiDeckMode: "auto",
    ankiPathologyRoot: "Corebook",
    ankiNormalRoot: "RadprimerNormal",
    ankiDeckRoot: "Corebook::MSK::Trauma::Introduction to Osseous Trauma"
  };
  const ANKI_BREADCRUMB_SKIP = new Set(["all categories", "basic"]);
  const ANKI_BREADCRUMB_ALIASES = new Map(
    [
      ["Musculoskeletal", "MSK"],
      ["Gastrointestinal", "GI"],
      ["Genitourinary", "GU"],
      ["Neuroradiology", "Neuro"],
      ["Pediatric", "Pediatrics"],
      ["Interventional Radiology", "IR"]
    ].map(([from, to]) => [from.toLowerCase(), to])
  );
  const DEFAULT_SHORTCUTS = {
    close: "s",
    previous: "k",
    next: "l",
    caption: "t",
    annotation: "a",
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
  const SHORTCUT_ACTIONS = [
    ["close", "Close zoom"],
    ["previous", "Previous image"],
    ["next", "Next image"],
    ["caption", "Hide/show caption"],
    ["annotation", "Arrows on/off"],
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
    annotated: true,
    imageId: "",
    imageUrl: "",
    imageNumber: null,
    total: null
  };
  let lastOpenAt = 0;
  let shortcutSettings = { ...DEFAULT_SHORTCUTS };
  let shortcutCaptureAction = "";

  function cleanText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function injectPageStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #docLB a.trigger,
      #docLB a.image-thumb-js,
      #gallery a.image-thumb-js,
      #gallery button.noSelect.img,
      #image-group-selector button.thumbnail-selector,
      button.noSelect.img[rel],
      button.thumbnail-selector[imageid] {
        position: relative !important;
        display: inline-block !important;
      }

      #docLB .rp-image-number-badge,
      #gallery .rp-image-number-badge,
      #image-group-selector .rp-image-number-badge,
      button.noSelect.img .rp-image-number-badge,
      button.thumbnail-selector .rp-image-number-badge {
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
      #docLB .right,
      .large-image,
      .right {
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

      #docLB .active-image-js,
      #docLB .right .image,
      #docLB .large-image .image,
      #docLB .right [style*="background-image"],
      #docLB .large-image [style*="background-image"],
      .large-image .image,
      .large-image-js,
      .right .image,
      .right [style*="background-image"],
      .image-zoom-button {
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
    const carrier = getImageCarrier(img);
    const categoryIndex = parseInt(carrier?.dataset?.imageIndexInCategory || "", 10);
    if (Number.isFinite(categoryIndex)) return categoryIndex;
    return fallbackIndex + 1;
  }

  function enhanceThumbnails() {
    injectPageStyle();

    const thumbs = Array.from(
      document.querySelectorAll(
        [
          "#docLB a.trigger img[data-figureno]",
          "#docLB a.image-thumb-js img[data-figureno]",
          "#gallery a.image-thumb-js img[data-figureno]",
          "#gallery button[rel] img[data-figureno]",
          "button.noSelect.img[rel] img[data-figureno]",
          "button.thumbnail-selector[imageid] img"
        ].join(",")
      )
    );

    thumbs.forEach((img, index) => {
      const anchor = getImageCarrier(img);
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

  function getImageCarrier(el) {
    if (!(el instanceof Element)) return null;
    return el.closest("a[rel], button[rel], button[imageid], .thumbnail-selector[imageid]");
  }

  function getImageIdFromElement(el) {
    if (!(el instanceof Element)) return "";
    const carrier = getImageCarrier(el);
    const raw =
      el.getAttribute("imageid") ||
      el.getAttribute("rel") ||
      carrier?.getAttribute("imageid") ||
      carrier?.getAttribute("rel") ||
      el.dataset?.imageId ||
      carrier?.dataset?.imageId ||
      "";
    if (raw) return raw;

    const id = el.id || "";
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id;

    const src = el.getAttribute("src") || "";
    return src.match(/\/images\/([^/?#]+)/i)?.[1] || "";
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

  function extractTitleFromImageParams(selector) {
    const raw = document.querySelector(selector)?.getAttribute("imageparams") || "";
    if (!raw) return "";

    try {
      const query = raw.startsWith("?") ? raw.slice(1) : raw;
      return cleanText(new URLSearchParams(query).get("parentTitle") || "");
    } catch {
      return "";
    }
  }

  function getArticleTitle() {
    const candidates = [
      document.querySelector("h1.document-name-js.page-heading-js")?.textContent,
      document.querySelector("#content .page-heading h1")?.textContent,
      document.querySelector(".page-heading h1")?.textContent,
      extractTitleFromImageParams("#focusImageData"),
      extractTitleFromImageParams("#imageData"),
      document.querySelector("head > title")?.textContent
    ];

    for (let title of candidates) {
      title = cleanText(title).replace(/^Document:\s*/i, "");
      if (title) return title;
    }
    return "";
  }

  function sanitizeAnkiBreadcrumbPart(value) {
    return cleanText(value)
      .replace(/::/g, " ")
      .replace(/[\\/\t\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sanitizeAnkiDeckPath(value) {
    return String(value || "")
      .split("::")
      .map((part) => sanitizeAnkiBreadcrumbPart(part))
      .filter(Boolean)
      .join("::");
  }

  function normalizeAnkiDeckPartForCompare(value) {
    return sanitizeAnkiBreadcrumbPart(value).toLowerCase();
  }

  function mapAnkiBreadcrumbPart(value) {
    const part = sanitizeAnkiBreadcrumbPart(value);
    if (!part) return "";
    return ANKI_BREADCRUMB_ALIASES.get(part.toLowerCase()) || part;
  }

  function pushUniqueDeckPart(parts, part) {
    const cleaned = sanitizeAnkiBreadcrumbPart(part);
    if (!cleaned) return;
    const last = parts.at(-1);
    if (last && normalizeAnkiDeckPartForCompare(last) === normalizeAnkiDeckPartForCompare(cleaned)) return;
    parts.push(cleaned);
  }

  function getBreadcrumbTrail() {
    const selectors = [
      ".breadcrumbs-js .nav-node-link-js",
      ".breadcrumbs .nav-node-link-js",
      ".breadcrumbs-js li",
      ".breadcrumbs li",
      ".breadcrumb .nav-node-link-js",
      ".breadcrumb li",
      "[class*='breadcrumb'] .nav-node-link-js",
      "[class*='breadcrumb'] li"
    ];

    let nodes = [];
    for (const selector of selectors) {
      nodes = Array.from(document.querySelectorAll(selector)).filter(isVisible);
      if (nodes.length) break;
    }

    const seen = new Set();
    const trail = [];
    nodes.forEach((node) => {
      const text = sanitizeAnkiBreadcrumbPart(node.textContent);
      const key = text.toLowerCase();
      if (!text || seen.has(key)) return;
      seen.add(key);
      trail.push(text);
    });

    const title = sanitizeAnkiBreadcrumbPart(getArticleTitle());
    if (title && trail.at(-1)?.toLowerCase() !== title.toLowerCase()) {
      trail.push(title);
    }
    return trail;
  }

  function getAnkiBreadcrumbText() {
    return getBreadcrumbTrail()
      .map(sanitizeAnkiBreadcrumbPart)
      .filter(Boolean)
      .join("::");
  }

  async function getRunnerSettings() {
    try {
      const stored = await chrome.storage.local.get(RUNNER_SETTINGS_KEY);
      return { ...RUNNER_DEFAULTS, ...(stored?.[RUNNER_SETTINGS_KEY] || {}) };
    } catch {
      return { ...RUNNER_DEFAULTS };
    }
  }

  function getSelectedAnkiRoot(settings) {
    if (String(settings?.ankiDeckMode || "auto").toLowerCase() === "manual") {
      return sanitizeAnkiDeckPath(settings.ankiDeckRoot || RUNNER_DEFAULTS.ankiDeckRoot);
    }
    if (settings?.engine === "normal") {
      return sanitizeAnkiDeckPath(settings.ankiNormalRoot || RUNNER_DEFAULTS.ankiNormalRoot);
    }
    return sanitizeAnkiDeckPath(settings?.ankiPathologyRoot || RUNNER_DEFAULTS.ankiPathologyRoot);
  }

  function buildRootedBreadcrumbText(breadcrumbTrail, root) {
    const parts = sanitizeAnkiDeckPath(root).split("::").filter(Boolean);
    const title = sanitizeAnkiBreadcrumbPart(getArticleTitle());

    for (const rawPart of Array.isArray(breadcrumbTrail) ? breadcrumbTrail : []) {
      const cleaned = sanitizeAnkiBreadcrumbPart(rawPart);
      if (!cleaned || ANKI_BREADCRUMB_SKIP.has(cleaned.toLowerCase())) continue;

      const colonMatch = cleaned.match(/^(.+?)\s*:\s*(.+)$/);
      if (colonMatch) {
        pushUniqueDeckPart(parts, mapAnkiBreadcrumbPart(colonMatch[1]));
        pushUniqueDeckPart(parts, sanitizeAnkiBreadcrumbPart(colonMatch[2]));
        continue;
      }

      pushUniqueDeckPart(parts, mapAnkiBreadcrumbPart(cleaned));
    }

    if (title && normalizeAnkiDeckPartForCompare(parts.at(-1)) !== normalizeAnkiDeckPartForCompare(title)) {
      pushUniqueDeckPart(parts, title);
    }

    return parts.join("::");
  }

  async function getRootedAnkiBreadcrumbText() {
    const settings = await getRunnerSettings();
    const root = getSelectedAnkiRoot(settings);
    return buildRootedBreadcrumbText(getBreadcrumbTrail(), root);
  }

  async function copyTextToClipboard(text) {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    } finally {
      textarea.remove();
    }
    return copied;
  }

  async function copyAnkiBreadcrumb() {
    const button = document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".copy-breadcrumb");
    const previousText = button?.textContent || "Crumb";
    const breadcrumb = getAnkiBreadcrumbText();
    const copied = await copyTextToClipboard(breadcrumb);

    if (button) {
      button.textContent = copied ? "Copied" : "No crumb";
      button.title = breadcrumb || "No RadPrimer breadcrumb found";
      window.setTimeout(() => {
        button.textContent = previousText;
      }, 1200);
    }

    if (!copied && breadcrumb) {
      console.warn("[RadPrimer image tools] Could not copy breadcrumb to clipboard.", breadcrumb);
    }
    return copied;
  }

  async function copyRootedAnkiBreadcrumb() {
    const button = document.getElementById(HOST_ID)?.shadowRoot?.querySelector(".copy-root-breadcrumb");
    const previousText = button?.textContent || "Root";
    const breadcrumb = await getRootedAnkiBreadcrumbText();
    const copied = await copyTextToClipboard(breadcrumb);

    if (button) {
      button.textContent = copied ? "Copied" : "No root";
      button.title = breadcrumb || "No RadPrimer breadcrumb found";
      window.setTimeout(() => {
        button.textContent = previousText;
      }, 1200);
    }

    if (!copied && breadcrumb) {
      console.warn("[RadPrimer image tools] Could not copy rooted breadcrumb to clipboard.", breadcrumb);
    }
    return copied;
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

  function setShortcutCaptureState(active) {
    if (active) {
      document.documentElement.dataset.radprimerShortcutCapture = "true";
    } else {
      delete document.documentElement.dataset.radprimerShortcutCapture;
    }
  }

  function getActiveImageElement() {
    const candidates = Array.from(
      document.querySelectorAll(
        [
          "#docLB .right .active-image-js",
          "#docLB .large-image .active-image-js",
          "#docLB .active-image-js",
          "#docLB .right .image[id]",
          "#docLB .large-image .image[id]",
          "#docLB .right [style*='background-image']",
          "#docLB .large-image [style*='background-image']",
          "#docLB [style*='background-image'][id]",
          ".large-image .image[id]",
          ".large-image-js[id]",
          ".right .image[imageid]",
          ".right [style*='background-image']",
          "[style*='background-image'][imageid]"
        ].join(",")
      )
    );
    return candidates.find(isVisible) || candidates[0] || null;
  }

  function getBackgroundImageElementFrom(target) {
    const el = target instanceof Element ? target : null;
    if (!el) return null;
    if (el.matches("[style*='background-image']")) return el;
    return el.closest("[style*='background-image']") || el.querySelector?.("[style*='background-image']") || null;
  }

  function getActiveImageContainer() {
    const active = getActiveImageElement();
    return active?.closest(".right") || active?.closest(".large-image") || active?.parentElement || null;
  }

  function getVisibleCaptionHtml(active) {
    const containers = [
      active?.closest(".right"),
      active?.closest(".large-image"),
      document.querySelector("#image-zoom-dialog-selector"),
      document.querySelector(".large-image"),
      document.querySelector("#docLB")
    ].filter(Boolean);

    const selectors = [
      ".inline-caption [class*='caption-text']",
      ".inline-caption",
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
      document.querySelector(`#gallery a[rel="${cssEscape(imageId)}"] img[data-figureno]`) ||
      document.querySelector(`#gallery button[rel="${cssEscape(imageId)}"] img[data-figureno]`) ||
      document.querySelector(`button[rel="${cssEscape(imageId)}"] img[data-figureno]`) ||
      document.querySelector(`button[imageid="${cssEscape(imageId)}"] img`) ||
      document.querySelector(`.thumbnail-selector[imageid="${cssEscape(imageId)}"] img`)
    );
  }

  function getImageThumbs() {
    const thumbs = Array.from(
      document.querySelectorAll(
        [
          "#docLB a.trigger img[data-figureno]",
          "#docLB a.image-thumb-js img[data-figureno]",
          "#gallery a.image-thumb-js img[data-figureno]",
          "#gallery button[rel] img[data-figureno]",
          "button.noSelect.img[rel] img[data-figureno]",
          "button.thumbnail-selector[imageid] img"
        ].join(",")
      )
    );
    const seen = new Map();

    thumbs.forEach((thumb, index) => {
      const carrier = getImageCarrier(thumb);
      const imageId = getImageIdFromElement(carrier || thumb);
      const key = imageId || `thumb-${index}`;
      if (!seen.has(key)) seen.set(key, thumb);
    });

    return Array.from(seen.values()).sort((a, b) => imageNumberFromThumb(a, 0) - imageNumberFromThumb(b, 0));
  }

  function getInfoFromThumb(thumb, fallbackIndex = 0) {
    const carrier = getImageCarrier(thumb);
    const imageId = getImageIdFromElement(carrier || thumb);
    const imageNumber = thumb ? imageNumberFromThumb(thumb, fallbackIndex) : null;
    const total = parseInt(thumb?.dataset?.groupcount || carrier?.dataset?.categoryTotal || "", 10);

    return {
      active: null,
      thumb,
      imageId,
      imageNumber,
      total: Number.isFinite(total) ? total : getImageThumbs().length || null,
      captionHtml: buildCaptionHtml(thumb?.dataset?.caption || carrier?.dataset?.caption || "")
    };
  }

  function getActiveImageInfo(sourceElement = null) {
    const sourceImage = getBackgroundImageElementFrom(sourceElement);
    const sourceActive =
      sourceImage ||
      (sourceElement instanceof Element &&
      sourceElement.matches(
        ".large-image .image, .large-image-js, .right .image, .right [style*='background-image'], [imageid], img[src*='/images/']"
      )
        ? sourceElement
        : null);
    const active = sourceActive || getActiveImageElement();
    const imageId = getImageIdFromElement(sourceElement) || getImageIdFromElement(active);
    const thumb = getThumbForImageId(imageId);
    const activeThumb =
      thumb ||
      document.querySelector("#docLB a.active img[data-figureno]") ||
      document.querySelector("#docLB li.active a.image-thumb-js img[data-figureno]") ||
      document.querySelector("#gallery li.active button[rel] img[data-figureno]") ||
      document.querySelector("#gallery li.currently-selected button[rel] img[data-figureno]") ||
      document.querySelector("button.thumbnail-selector.active img") ||
      document.querySelector("button.thumbnail-selector[aria-current='true'] img");

    const imageNumber = activeThumb ? imageNumberFromThumb(activeThumb, 0) : null;
    const activeCarrier = getImageCarrier(activeThumb);
    const total = parseInt(activeThumb?.dataset?.groupcount || activeCarrier?.dataset?.categoryTotal || "", 10);
    const liveCaptionHtml = getVisibleCaptionHtml(active);
    const thumbCaptionHtml = activeThumb?.dataset?.caption || activeCarrier?.dataset?.caption || "";

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
    const imageId = getImageIdFromElement(active) || info.imageId;
    const rawUrl =
      match?.[2] ||
      active?.getAttribute?.("src") ||
      (imageId ? `/images/${imageId}?style=xlarge&annotated=true` : "") ||
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
          position: relative;
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: nowrap;
          justify-content: flex-end;
          pointer-events: auto;
        }

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

        .control-panel[hidden] {
          display: none;
        }

        .control-panel .image-jump {
          grid-column: 1 / -1;
          width: 100%;
          max-width: none;
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

        .stage.windowing {
          cursor: crosshair;
        }

        .stage > img {
          max-width: 94vw;
          max-height: 88vh;
          transform-origin: center center;
          will-change: transform, filter;
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
            <button class="control-toggle" type="button" title="Image controls" aria-expanded="false">Controls</button>
            <button class="shortcut-toggle" type="button" title="Keyboard shortcuts">Keys</button>
            <div class="control-panel" hidden>
              <select class="image-jump" title="Jump to image"></select>
              <button class="zoom-out" type="button" title="Zoom out">-</button>
              <button class="zoom-in" type="button" title="Zoom in">+</button>
              <button class="reset" type="button" title="Reset">1:1</button>
              <button class="window-down" type="button" title="Decrease window contrast">W-</button>
              <button class="window-up" type="button" title="Increase window contrast">W+</button>
              <button class="level-down" type="button" title="Decrease brightness">L-</button>
              <button class="level-up" type="button" title="Increase brightness">L+</button>
              <button class="invert-window" type="button" title="Invert display">Inv</button>
              <button class="reset-window" type="button" title="Reset window/level">WL 0</button>
              <button class="copy-breadcrumb" type="button" title="Copy RadPrimer breadcrumb as Anki hierarchy">Crumb</button>
              <button class="copy-root-breadcrumb" type="button" title="Copy breadcrumb under selected Anki root">Root</button>
              <button class="close" type="button" title="Close">x</button>
            </div>
          </div>
        </div>
        <div class="shortcut-panel" hidden>
          <div class="shortcut-head">
            <span>Study shortcuts</span>
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
    shadow.querySelector(".control-toggle").addEventListener("click", toggleControlPanel);
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
    shadow.querySelector(".window-down").addEventListener("click", () => adjustWindowing({ contrastMultiplier: 1 / 1.15 }));
    shadow.querySelector(".window-up").addEventListener("click", () => adjustWindowing({ contrastMultiplier: 1.15 }));
    shadow.querySelector(".level-down").addEventListener("click", () => adjustWindowing({ brightnessDelta: -0.08 }));
    shadow.querySelector(".level-up").addEventListener("click", () => adjustWindowing({ brightnessDelta: 0.08 }));
    shadow.querySelector(".invert-window").addEventListener("click", toggleWindowInvert);
    shadow.querySelector(".reset-window").addEventListener("click", resetWindowing);
    shadow.querySelector(".copy-breadcrumb").addEventListener("click", copyAnkiBreadcrumb);
    shadow.querySelector(".copy-root-breadcrumb").addEventListener("click", copyRootedAnkiBreadcrumb);

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

  function openZoomViewer(sourceElement = null) {
    const info = getActiveImageInfo(sourceElement);
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

  function openZoomViewerFromEvent(event, sourceElement = null) {
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
    const target = sourceElement || (event?.target instanceof Element ? event.target : null);
    openZoomViewer(target);
  }

  function closeZoomViewer() {
    const host = document.getElementById(HOST_ID);
    if (!host) return;
    host.style.display = "none";
    zoomState.open = false;
    zoomState.dragging = false;
    zoomState.windowing = false;
    shortcutCaptureAction = "";
    setControlPanelOpen(false);
    setShortcutCaptureState(false);
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
    setControlPanelOpen(false);
    panel.hidden = !panel.hidden;
    shortcutCaptureAction = "";
    setShortcutCaptureState(false);
    renderShortcutPanel();
  }

  function startShortcutCapture(actionId) {
    if (!SHORTCUT_ACTIONS.some(([id]) => id === actionId)) return;
    shortcutCaptureAction = actionId;
    setShortcutCaptureState(true);
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
      setShortcutCaptureState(false);
      renderShortcutPanel();
      return true;
    }

    if (key) {
      shortcutSettings = {
        ...shortcutSettings,
        [shortcutCaptureAction]: key
      };
      shortcutCaptureAction = "";
      setShortcutCaptureState(false);
      await saveShortcutSettings();
      renderShortcutPanel();
    }

    return true;
  }

  async function resetShortcutSettings() {
    shortcutSettings = { ...DEFAULT_SHORTCUTS };
    shortcutCaptureAction = "";
    setShortcutCaptureState(false);
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
    if (!Number.isFinite(imageNumber)) return;
    const info = getZoomNavigationInfos().find((candidate) => candidate.imageNumber === imageNumber);
    if (!info) return;

    setZoomViewerImage(info, {
      annotated: zoomState.open ? zoomState.annotated : true,
      resetView: true,
      syncThumb: true
    });
  }

  function handleNavigateImageEvent(event) {
    const imageNumber = Number(event?.detail?.imageNumber);
    navigateZoomToImageNumber(imageNumber);
  }

  function shortcutMatches(event, actionId) {
    const saved = normalizeShortcutKey(shortcutSettings[actionId]);
    const pressed = normalizeShortcutKey(event.key);
    if (!saved || !pressed) return false;
    if (saved === pressed) return true;
    return actionId === "zoomIn" && saved === "+" && pressed === "=";
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

  function performShortcutAction(actionId) {
    if (actionId === "close") closeZoomViewer();
    else if (actionId === "previous") navigateZoomBy(-1);
    else if (actionId === "next") navigateZoomBy(1);
    else if (actionId === "caption") toggleCaption();
    else if (actionId === "annotation") toggleAnnotation();
    else if (actionId === "zoomIn") zoomBy(1.25);
    else if (actionId === "zoomOut") zoomBy(1 / 1.25);
    else if (actionId === "reset") resetZoom();
    else if (actionId === "resetWindow") resetWindowing();
    else if (actionId === "invertWindow") toggleWindowInvert();
    else if (actionId === "playerPlayPause") sendSpeechifyPlayerAction("playPause");
    else if (actionId === "playerBack10") sendSpeechifyPlayerAction("back10");
    else if (actionId === "playerForward10") sendSpeechifyPlayerAction("forward10");
    else if (actionId === "playerJumpImage") dispatchSpeechifyJumpToCurrentImage();
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

  function onZoomWheel(event) {
    event.preventDefault();
    if (event.shiftKey) {
      adjustWindowing({ contrastMultiplier: event.deltaY < 0 ? 1.08 : 1 / 1.08 });
      return;
    }
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
    if (event.shiftKey) {
      zoomState.windowing = true;
      zoomState.startX = event.clientX;
      zoomState.startY = event.clientY;
      zoomState.windowOriginBrightness = zoomState.windowBrightness;
      zoomState.windowOriginContrast = zoomState.windowContrast;
      stage.classList.add("windowing");
      stage.setPointerCapture?.(event.pointerId);
      return;
    }

    zoomState.dragging = true;
    zoomState.startX = event.clientX;
    zoomState.startY = event.clientY;
    zoomState.originX = zoomState.x;
    zoomState.originY = zoomState.y;
    stage.classList.add("dragging");
    stage.setPointerCapture?.(event.pointerId);
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
    const stage = event.currentTarget;
    zoomState.dragging = false;
    zoomState.windowing = false;
    stage.classList.remove("dragging", "windowing");
    stage.releasePointerCapture?.(event.pointerId);
  }

  function getZoomOpenTarget(target) {
    const el = target instanceof Element ? target : target?.parentElement;
    if (!el) return null;

    const directControl = el.closest(
      [
        "#docLB .rp-open-zoom-control",
        "#radprimer-floating-zoom-control",
        "#docLB .view-large-js",
        "#docLB #image-zoom",
        ".image-zoom-button",
        "#image-zoom-selector"
      ].join(",")
    );
    if (directControl) return getActiveImageElement() || directControl;

    if (
      el.closest(
        [
          "#docLB .left",
          "#docLB .imageGroupContainer",
          "#docLB a.trigger",
          "#docLB a.image-thumb-js",
          "#docLB .imageCaption",
          "#gallery button.noSelect.img",
          "#image-group-selector",
          ".thumbnail-selector-list",
          ".imageCaption",
          ".inline-caption"
        ].join(",")
      )
    ) {
      return null;
    }

    return el.closest(
      [
        "#docLB .active-image-js",
        "#docLB .right .image",
        "#docLB .large-image .image",
        "#docLB .right [style*='background-image']",
        "#docLB .large-image [style*='background-image']",
        ".large-image .image",
        ".large-image-js",
        ".right .image",
        ".right [style*='background-image']"
      ].join(",")
    );
  }

  function handleDocumentClick(event) {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const opener = getZoomOpenTarget(target);
    if (!opener) return;

    openZoomViewerFromEvent(event, opener);
  }

  function bindZoomOpenTargets() {
    const targets = document.querySelectorAll(
      [
        "#docLB .active-image-js",
        "#docLB .right .image",
        "#docLB .large-image .image",
        "#docLB .right [style*='background-image']",
        "#docLB .large-image [style*='background-image']",
        "#docLB .view-large-js",
        "#docLB #image-zoom",
        ".large-image .image",
        ".large-image-js",
        ".right .image",
        ".right [style*='background-image']",
        ".image-zoom-button",
        "#image-zoom-selector"
      ].join(",")
    );

    targets.forEach((target) => {
      if (target.dataset.radprimerZoomBound === ZOOM_BIND_VERSION) return;
      target.dataset.radprimerZoomBound = ZOOM_BIND_VERSION;
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
  document.addEventListener("radprimer-navigate-image", handleNavigateImageEvent);
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
