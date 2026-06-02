from __future__ import annotations

import json
import re
from pathlib import Path

from aqt import mw


BACKUP_PATH = Path(r"C:\Users\josem.000\Documents\anki_image_occlusion_notetypes_backup_before_lightbox_patch.json")


IO_LIGHTBOX_CSS = r"""
/* ---------- Image Occlusion Lightbox / Zoom Modal ---------- */
.ankiIoZoomButton {
  display: inline-block;
  margin: 10px auto 0;
  padding: 7px 13px;
  border: 1px solid rgba(0,0,0,0.18);
  border-radius: 999px;
  background: rgba(0,0,0,0.08);
  color: inherit;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: zoom-in;
}

.nightMode .ankiIoZoomButton,
.card.night_mode .ankiIoZoomButton {
  border-color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.1);
}

.ankiIoLightboxOverlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483647 !important;
  display: none;
  align-items: center;
  justify-content: center;
  width: 100vw !important;
  height: 100vh !important;
  overflow: hidden !important;
  background: rgba(0, 0, 0, 0.94);
  padding: 18px;
  contain: layout paint style;
}

.ankiIoLightboxOverlay.open {
  display: flex !important;
}

.ankiIoLightboxStage {
  position: relative;
  max-width: none !important;
  max-height: none !important;
  transform-origin: center center;
  cursor: grab;
  will-change: transform;
  backface-visibility: hidden;
}

.ankiIoLightboxStage.dragging {
  cursor: grabbing;
}

.ankiIoLightboxContent {
  position: relative !important;
  display: block !important;
  margin: 0 auto !important;
  max-width: none !important;
  max-height: none !important;
  overflow: hidden !important;
}

.ankiIoLightboxContent img,
.ankiIoLightboxContent svg,
.ankiIoLightboxContent canvas {
  max-width: none !important;
  max-height: none !important;
  margin: 0 !important;
}

.ankiIoLightboxControls {
  position: fixed;
  right: 14px;
  bottom: 14px;
  display: flex;
  gap: 8px;
  z-index: 2147483647;
}

.ankiIoLightboxControls button {
  min-width: 44px;
  min-height: 40px;
  border: 1px solid rgba(255,255,255,0.22);
  border-radius: 999px;
  background: rgba(255,255,255,0.14);
  color: white;
  font-size: 18px;
  font-weight: 700;
}

#io-wrapper,
#image-occlusion-container {
  cursor: zoom-in;
}
"""


IO_LIGHTBOX_SCRIPT = r"""
<!-- ANKI IO LIGHTBOX START -->
<span data-anki-io-lightbox-scope="1" style="display:none"></span>
<script>
(function() {
  if (window.__ankiIoLightboxV1Installed) return;
  window.__ankiIoLightboxV1Installed = true;

  var overlay, stage, controls;
  var scale = 1, tx = 0, ty = 0;
  var fitScale = 1;
  var dragging = false, lastX = 0, lastY = 0;

  function getIoContainer() {
    return document.querySelector("#io-wrapper") ||
      document.querySelector("#image-occlusion-container");
  }

  function isActiveIoCard() {
    return !!document.querySelector("[data-anki-io-lightbox-scope]") && !!getIoContainer();
  }

  function ensureOverlay() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.className = "ankiIoLightboxOverlay";
    overlay.innerHTML =
      '<div class="ankiIoLightboxStage"></div>' +
      '<div class="ankiIoLightboxControls">' +
        '<button type="button" data-action="out">-</button>' +
        '<button type="button" data-action="reset">Reset</button>' +
        '<button type="button" data-action="in">+</button>' +
        '<button type="button" data-action="close">x</button>' +
      '</div>';
    document.body.appendChild(overlay);

    stage = overlay.querySelector(".ankiIoLightboxStage");
    controls = overlay.querySelector(".ankiIoLightboxControls");

    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) closeLightbox();
    });

    controls.addEventListener("click", function(e) {
      var btn = e.target && e.target.closest ? e.target.closest("button") : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var action = btn.getAttribute("data-action");
      if (action === "close") closeLightbox();
      if (action === "in") changeZoom(0.25);
      if (action === "out") changeZoom(-0.25);
      if (action === "reset") resetView();
    });

    overlay.addEventListener("wheel", function(e) {
      if (!overlay.classList.contains("open")) return;
      e.preventDefault();
      changeZoom(e.deltaY < 0 ? 0.25 : -0.25);
    }, { passive: false });

    stage.addEventListener("mousedown", function(e) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      stage.classList.add("dragging");
      e.preventDefault();
    });

    document.addEventListener("mousemove", function(e) {
      if (!dragging) return;
      tx += e.clientX - lastX;
      ty += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      applyTransform();
    });

    document.addEventListener("mouseup", function() {
      dragging = false;
      if (stage) stage.classList.remove("dragging");
    });
  }

  function applyTransform() {
    if (!stage) return;
    stage.style.transform =
      "translate3d(" + tx + "px, " + ty + "px, 0) scale(" + scale + ")";
  }

  function resetView() {
    scale = fitScale || 1;
    tx = 0;
    ty = 0;
    applyTransform();
  }

  function changeZoom(delta) {
    scale = Math.max(0.5, Math.min(8, scale + delta));
    applyTransform();
  }

  function copyCanvasPixels(src, dst) {
    try {
      dst.width = src.width;
      dst.height = src.height;
      var ctx = dst.getContext("2d");
      if (ctx) ctx.drawImage(src, 0, 0);
    } catch (err) {}
  }

  function layerZ(el, fallback) {
    if (el.closest && el.closest("#io-overlay")) return 30;
    if (el.closest && el.closest("#io-original")) return 20;
    var z = window.getComputedStyle(el).zIndex;
    var parsed = parseInt(z, 10);
    return isNaN(parsed) ? fallback : parsed;
  }

  function cloneVisualNode(el) {
    if (el.tagName && el.tagName.toLowerCase() === "canvas") {
      var canvas = document.createElement("canvas");
      copyCanvasPixels(el, canvas);
      return canvas;
    }
    return el.cloneNode(true);
  }

  function buildPixelLockedSnapshot(source) {
    var sourceRect = source.getBoundingClientRect();
    var width = Math.max(1, sourceRect.width);
    var height = Math.max(1, sourceRect.height);
    var snapshot = document.createElement("div");
    snapshot.className = "ankiIoLightboxContent";
    snapshot.style.width = width + "px";
    snapshot.style.height = height + "px";

    var nodes = source.querySelectorAll("img, canvas, svg");
    for (var i = 0; i < nodes.length; i++) {
      var srcNode = nodes[i];
      var rect = srcNode.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;

      var clone = cloneVisualNode(srcNode);
      clone.removeAttribute && clone.removeAttribute("id");
      clone.style.position = "absolute";
      clone.style.left = (rect.left - sourceRect.left) + "px";
      clone.style.top = (rect.top - sourceRect.top) + "px";
      clone.style.width = rect.width + "px";
      clone.style.height = rect.height + "px";
      clone.style.maxWidth = "none";
      clone.style.maxHeight = "none";
      clone.style.margin = "0";
      clone.style.transform = "none";
      clone.style.objectFit = "fill";
      clone.style.zIndex = String(layerZ(srcNode, i + 1));
      clone.style.pointerEvents = "none";
      snapshot.appendChild(clone);
    }

    var maxW = Math.max(80, window.innerWidth - 72);
    var maxH = Math.max(80, window.innerHeight - 96);
    fitScale = Math.min(1, maxW / width, maxH / height);
    if (!isFinite(fitScale) || fitScale <= 0) fitScale = 1;

    stage.style.width = width + "px";
    stage.style.height = height + "px";

    return snapshot;
  }

  function openLightbox() {
    if (!isActiveIoCard()) return;
    ensureOverlay();

    var source = getIoContainer();
    if (!source) return;

    stage.innerHTML = "";
    stage.appendChild(buildPixelLockedSnapshot(source));
    resetView();
    overlay.classList.add("open");

    requestAnimationFrame(function() {
      applyTransform();
      void stage.offsetHeight;
      requestAnimationFrame(function() {
        applyTransform();
      });
    });
  }

  function closeLightbox() {
    if (!overlay) return;
    overlay.classList.remove("open");
    dragging = false;
    if (stage) {
      stage.classList.remove("dragging");
      stage.innerHTML = "";
    }
  }

  function ensureZoomButton() {
    if (!isActiveIoCard()) return;
    var source = getIoContainer();
    if (!source || source.getAttribute("data-anki-io-zoom-button")) return;
    source.setAttribute("data-anki-io-zoom-button", "1");

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ankiIoZoomButton";
    btn.textContent = "Zoom";
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      openLightbox();
    });

    if (source.parentNode) {
      source.parentNode.insertBefore(btn, source.nextSibling);
    }
  }

  document.addEventListener("dblclick", function(e) {
    if (!isActiveIoCard()) return;
    var source = e.target && e.target.closest ?
      e.target.closest("#io-wrapper, #image-occlusion-container") : null;
    if (!source) return;
    e.preventDefault();
    e.stopPropagation();
    openLightbox();
  }, true);

  document.addEventListener("keydown", function(e) {
    var key = (e.key || "").toLowerCase();
    if (overlay && overlay.classList.contains("open")) {
      if (key === "escape") closeLightbox();
      if (key === "+" || key === "=") changeZoom(0.25);
      if (key === "-" || key === "_") changeZoom(-0.25);
      if (key === "r") resetView();
      return;
    }
    if (key === "z" && isActiveIoCard()) openLightbox();
  });

  ensureZoomButton();
  setTimeout(ensureZoomButton, 150);
  setTimeout(ensureZoomButton, 500);
})();
</script>
<!-- ANKI IO LIGHTBOX END -->
"""


IO_CSS_RE = re.compile(
    r"\s*/\* ---------- Image Occlusion Lightbox / Zoom Modal ---------- \*/[\s\S]*?(?=\n/\*|\Z)",
    re.MULTILINE,
)

IO_SCRIPT_RE = re.compile(
    r"\s*<!-- ANKI IO LIGHTBOX START -->[\s\S]*?<!-- ANKI IO LIGHTBOX END -->",
    re.MULTILINE,
)


def model_looks_like_image_occlusion(model):
    name = (model.get("name") or "").lower()
    fields = [f.get("name", "") for f in model.get("flds", [])]
    field_text = " ".join(fields).lower()
    templates = " ".join(
        (t.get("qfmt", "") + " " + t.get("afmt", ""))
        for t in model.get("tmpls", [])
    ).lower()

    return (
        "image occlusion" in name
        or "question mask" in field_text
        or "answer mask" in field_text
        or "#image-occlusion-container" in templates
        or "#io-wrapper" in templates
    )


def save_model(mm, model):
    if hasattr(mm, "save"):
        try:
            mm.save(model)
            return
        except TypeError:
            try:
                mm.save(model, True)
                return
            except TypeError:
                pass

    if hasattr(mm, "update_dict"):
        mm.update_dict(model)
        return

    if hasattr(mm, "flush"):
        mm.flush(model)
        return

    raise RuntimeError("Could not find a compatible Anki model-save method.")


def main():
    mm = mw.col.models
    models = [m for m in mm.all() if model_looks_like_image_occlusion(m)]
    if not models:
        raise RuntimeError("No Image Occlusion note types were found.")

    BACKUP_PATH.parent.mkdir(parents=True, exist_ok=True)
    BACKUP_PATH.write_text(json.dumps(models, ensure_ascii=False, indent=2), encoding="utf-8")

    patched = []
    for model in models:
        css = model.get("css", "")
        css = IO_CSS_RE.sub("", css).rstrip() + "\n\n" + IO_LIGHTBOX_CSS.strip() + "\n"
        model["css"] = css

        template_count = 0
        for tmpl in model.get("tmpls", []):
            for key in ("qfmt", "afmt"):
                if key not in tmpl:
                    continue
                body = IO_SCRIPT_RE.sub("", tmpl.get(key, "")).rstrip()
                tmpl[key] = body + "\n\n" + IO_LIGHTBOX_SCRIPT.strip() + "\n"
                template_count += 1

        save_model(mm, model)
        patched.append((model.get("name"), template_count))

    try:
        mw.col.setMod()
    except Exception:
        pass

    try:
        mw.reset()
    except Exception:
        pass

    print("Patched Image Occlusion zoom support.")
    print("Backup:", str(BACKUP_PATH))
    for name, template_count in patched:
        print("-", name, "templates touched:", template_count)
    print("Use the Zoom button, double-click the occlusion image, or press z. Wheel zooms; drag pans; Esc closes.")
    print("If the old core-card lightbox guard was already loaded, close and reopen the reviewer once.")


main()
