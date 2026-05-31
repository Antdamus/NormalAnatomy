(() => {
  if (window.__radprimerImageToolsInstalled) return;
  window.__radprimerImageToolsInstalled = true;

  const STYLE_ID = "radprimer-image-tools-style";
  const HOST_ID = "radprimer-image-zoom-host";

  let zoomState = {
    open: false,
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0
  };

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

      #docLB .large-image {
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
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return String(value || "").replace(/["\\]/g, "\\$&");
  }

  function getActiveImageElement() {
    return document.querySelector("#docLB .large-image .active-image-js");
  }

  function getThumbForImageId(imageId) {
    if (!imageId) return null;
    return (
      document.querySelector(`#docLB a[rel="${cssEscape(imageId)}"] img[data-figureno]`) ||
      document.querySelector(`#gallery a[rel="${cssEscape(imageId)}"] img[data-figureno]`)
    );
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
    return {
      active,
      imageId,
      imageNumber,
      total: Number.isFinite(total) ? total : null,
      caption: cleanCaption(activeThumb?.dataset?.caption || "")
    };
  }

  function updateActiveImageBadge() {
    const large = document.querySelector("#docLB .large-image");
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

  function cleanCaption(caption) {
    const holder = document.createElement("div");
    holder.innerHTML = String(caption || "");
    holder.querySelectorAll("img").forEach((img) => {
      const alt = img.getAttribute("alt") || "arrow";
      img.replaceWith(` ${alt} `);
    });
    return (holder.textContent || holder.innerText || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractBackgroundUrl(el) {
    if (!el) return "";
    const bg = el.style.backgroundImage || getComputedStyle(el).backgroundImage || "";
    const match = bg.match(/url\((["']?)(.*?)\1\)/i);
    if (!match) return "";
    try {
      const url = new URL(match[2].replace(/&amp;/g, "&"), location.href);
      url.searchParams.set("style", "xlarge");
      return url.href;
    } catch {
      return match[2];
    }
  }

  function ensureZoomHost() {
    let host = document.getElementById(HOST_ID);
    if (host?.shadowRoot) return host;

    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.position = "fixed";
    host.style.inset = "0";
    host.style.zIndex = "2147483647";
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

        img {
          max-width: 94vw;
          max-height: 88vh;
          transform-origin: center center;
          will-change: transform;
          pointer-events: none;
          image-rendering: auto;
          box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.22), 0 30px 90px rgba(0, 0, 0, 0.45);
        }

        .footer {
          position: absolute;
          left: 18px;
          bottom: 18px;
          max-width: min(980px, calc(100vw - 36px));
          z-index: 3;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.82);
          border: 1px solid rgba(148, 163, 184, 0.28);
          color: rgba(248, 250, 252, 0.88);
          font-size: 13px;
          line-height: 1.35;
        }
      </style>

      <div class="viewer" role="dialog" aria-modal="true" aria-label="RadPrimer zoom viewer">
        <div class="topbar">
          <div class="title"><span class="image-number"></span><span class="caption"></span></div>
          <div class="tools">
            <button class="zoom-out" type="button" title="Zoom out">-</button>
            <button class="zoom-in" type="button" title="Zoom in">+</button>
            <button class="reset" type="button" title="Reset">1:1</button>
            <button class="close" type="button" title="Close">x</button>
          </div>
        </div>
        <div class="stage">
          <img alt="RadPrimer image">
        </div>
        <div class="footer">Wheel or buttons to zoom. Drag to pan. Double-click to toggle zoom. Esc closes.</div>
      </div>
    `;

    shadow.querySelector(".close").addEventListener("click", closeZoomViewer);
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

    return host;
  }

  function openZoomViewer() {
    const info = getActiveImageInfo();
    const src = extractBackgroundUrl(info.active);
    if (!src) return;

    const host = ensureZoomHost();
    const shadow = host.shadowRoot;
    const imageLabel = info.imageNumber
      ? info.total
        ? `image ${info.imageNumber}/${info.total}`
        : `image ${info.imageNumber}`
      : "image";

    shadow.querySelector("img").src = src;
    shadow.querySelector(".image-number").textContent = imageLabel;
    shadow.querySelector(".caption").textContent = info.caption || "RadPrimer image";
    host.style.display = "block";
    zoomState = {
      ...zoomState,
      open: true,
      scale: 1,
      x: 0,
      y: 0,
      dragging: false
    };
    applyTransform();
  }

  function closeZoomViewer() {
    const host = document.getElementById(HOST_ID);
    if (!host) return;
    host.style.display = "none";
    zoomState.open = false;
    zoomState.dragging = false;
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
    const img = document.getElementById(HOST_ID)?.shadowRoot?.querySelector("img");
    if (!img) return;
    img.style.transform = `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`;
  }

  function onZoomWheel(event) {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.14 : 1 / 1.14);
  }

  function onPointerDown(event) {
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
    const zoomButton = event.target.closest("#docLB .view-large-js, #docLB #image-zoom");
    const activeImage = event.target.closest("#docLB .large-image .active-image-js");
    if (!zoomButton && !activeImage) return;

    event.preventDefault();
    event.stopPropagation();
    openZoomViewer();
  }

  function handleKeydown(event) {
    if (!zoomState.open) return;
    if (event.key === "Escape") closeZoomViewer();
    if (event.key === "+" || event.key === "=") zoomBy(1.25);
    if (event.key === "-") zoomBy(1 / 1.25);
    if (event.key === "0") resetZoom();
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

  const observer = new MutationObserver(scheduleEnhancement);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "id", "hidden"]
  });

  scheduleEnhancement();
})();
