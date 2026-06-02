from __future__ import annotations

import json
import re
from pathlib import Path

from aqt import mw


MODEL_NAME = "core_rad_notetype_v2"
BACKUP_PATH = Path(r"C:\Users\josem.000\Documents\core_rad_notetype_v2_backup_before_lightbox_fix.json")


LIGHTBOX_CSS = r"""
/* ---------- Image Lightbox / Zoom Modal ---------- */
.ankiLightboxOverlay {
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

.ankiLightboxOverlay.open {
  display: flex !important;
}

.ankiLightboxOverlay.preparing .ankiLightboxImage {
  opacity: 0;
  visibility: hidden;
}

.ankiLightboxOverlay.error .ankiLightboxImage {
  display: none !important;
}

.ankiLightboxError {
  display: none;
  max-width: min(720px, calc(100vw - 48px));
  padding: 14px 18px;
  border-radius: 12px;
  background: rgba(30, 30, 30, 0.96);
  border: 1px solid rgba(255,255,255,0.18);
  color: white;
  font-size: 18px;
  text-align: center;
}

.ankiLightboxOverlay.error .ankiLightboxError {
  display: block;
}

.ankiLightboxImage {
  display: block !important;
  margin: auto !important;
  max-width: calc(100vw - 36px) !important;
  max-height: calc(100vh - 72px) !important;
  width: auto !important;
  height: auto !important;
  object-fit: contain !important;
  border-radius: 10px;
  transform-origin: center center;
  cursor: grab;
  user-select: none;
  -webkit-user-drag: none;
  will-change: transform;
  backface-visibility: hidden;
}

.ankiLightboxImage.dragging {
  cursor: grabbing;
}

.ankiLightboxControls {
  position: fixed;
  top: 14px;
  right: 14px;
  display: flex;
  gap: 8px;
  z-index: 2147483647;
}

.ankiLightboxControls button {
  min-width: 42px;
  min-height: 38px;
  border: 1px solid rgba(255,255,255,0.22);
  border-radius: 10px;
  background: rgba(255,255,255,0.14);
  color: white;
  font-size: 20px;
  font-weight: 700;
}

.ankiLightboxHint {
  position: fixed;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  color: rgba(255,255,255,0.72);
  font-size: 13px;
  text-align: center;
  z-index: 2147483647;
  pointer-events: none;
}

.imgStack img:not(.ankiLightboxImage),
.card > img {
  cursor: zoom-in;
}
"""


LIGHTBOX_SCRIPT = r"""
<span data-anki-rad-lightbox-scope="core_rad_notetype_v2" style="display:none"></span>
<script>
(function() {
  if (window.__ankiRadLightboxV6Installed) return;
  window.__ankiRadLightboxV6Installed = true;

  var overlay, zoomImg, errorBox;
  var scale = 1, tx = 0, ty = 0;
  var dragging = false, lastX = 0, lastY = 0;
  var openToken = 0;
  var scopeSelector = '[data-anki-rad-lightbox-scope="core_rad_notetype_v2"]';
  var observerInstalled = false;

  function isScopeActive() {
    return !!document.querySelector(scopeSelector);
  }

  function isIoScopeActive() {
    return !!document.querySelector("[data-anki-io-lightbox-scope]");
  }

  function closeAnyLightboxes() {
    var overlays = document.querySelectorAll(".ankiLightboxOverlay");
    for (var i = 0; i < overlays.length; i++) {
      overlays[i].classList.remove("open");
      overlays[i].classList.remove("preparing");
      overlays[i].classList.remove("error");
      var img = overlays[i].querySelector(".ankiLightboxImage");
      if (img) img.removeAttribute("src");
      if (!isScopeActive() && overlays[i].parentNode) {
        overlays[i].parentNode.removeChild(overlays[i]);
      }
    }

    if (overlay && !document.documentElement.contains(overlay)) {
      overlay = null;
      zoomImg = null;
      errorBox = null;
    }
    dragging = false;
  }

  function installGlobalFirewall() {
    if (window.__ankiRadLightboxGlobalFirewallInstalled) return;
    window.__ankiRadLightboxGlobalFirewallInstalled = true;

    window.addEventListener("click", function(e) {
      var img = closestImage(e.target);

      if (isIoScopeActive()) return;

      if (isScopeActive()) {
        if (!img) return;
        if (img.classList && img.classList.contains("ankiLightboxImage")) return;
        if (img.closest && img.closest(".stackCap")) return;
        if (typeof window.__ankiRadLightboxOpenFromFirewall === "function") {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          window.__ankiRadLightboxOpenFromFirewall(img.currentSrc || img.src);
        }
        return;
      }

      if (!img) {
        closeAnyLightboxes();
        return;
      }

      closeAnyLightboxes();
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }, true);
  }

  function installScopeObserver() {
    if (observerInstalled) return;
    observerInstalled = true;
    installGlobalFirewall();

    var root = document.body || document.documentElement;
    if (!root || !window.MutationObserver) return;

    var observer = new MutationObserver(function() {
      if (!isScopeActive()) closeAnyLightboxes();
    });

    observer.observe(root, { childList: true, subtree: true });
  }

  function ensureOverlay() {
    if (overlay) return;
    installScopeObserver();
    installGlobalFirewall();

    overlay = document.createElement("div");
    overlay.className = "ankiLightboxOverlay";
    overlay.innerHTML =
      '<div class="ankiLightboxControls">' +
        '<button type="button" data-action="out">-</button>' +
        '<button type="button" data-action="reset">Reset</button>' +
        '<button type="button" data-action="in">+</button>' +
        '<button type="button" data-action="close">x</button>' +
      '</div>' +
      '<img class="ankiLightboxImage" alt="" draggable="false">' +
      '<div class="ankiLightboxError">Unable to load the larger image. Close this modal and try the image again.</div>' +
      '<div class="ankiLightboxHint">Wheel or +/- to zoom. Drag to pan. Esc closes.</div>';

    document.body.appendChild(overlay);
    zoomImg = overlay.querySelector(".ankiLightboxImage");
    errorBox = overlay.querySelector(".ankiLightboxError");

    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) closeLightbox();
    });

    var buttons = overlay.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function(e) {
        e.stopPropagation();
        var action = this.getAttribute("data-action");
        if (action === "close") closeLightbox();
        if (action === "in") changeZoom(0.25);
        if (action === "out") changeZoom(-0.25);
        if (action === "reset") resetView();
      });
    }

    overlay.addEventListener("wheel", function(e) {
      if (!overlay.classList.contains("open")) return;
      e.preventDefault();
      changeZoom(e.deltaY < 0 ? 0.25 : -0.25);
    }, { passive: false });

    zoomImg.addEventListener("mousedown", function(e) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      zoomImg.classList.add("dragging");
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
      if (zoomImg) zoomImg.classList.remove("dragging");
    });

    document.addEventListener("keydown", function(e) {
      if (!overlay || !overlay.classList.contains("open")) return;
      if (!isScopeActive()) {
        closeAnyLightboxes();
        return;
      }
      if (e.key === "Escape") closeLightbox();
      if (e.key === "+") changeZoom(0.25);
      if (e.key === "-") changeZoom(-0.25);
      if ((e.key || "").toLowerCase() === "r") resetView();
    });
  }

  function applyTransform() {
    if (!zoomImg) return;
    zoomImg.style.transform =
      "translate3d(" + tx + "px, " + ty + "px, 0) scale(" + scale + ")";
  }

  function forcePaint() {
    if (!overlay || !zoomImg) return;
    applyTransform();
    void overlay.offsetHeight;
    void zoomImg.offsetHeight;
  }

  function resetView() {
    scale = 1;
    tx = 0;
    ty = 0;
    applyTransform();
  }

  function revealAfterLayout(token) {
    if (!overlay || !zoomImg || token !== openToken) return;
    if (!zoomImg.complete && !zoomImg.naturalWidth) return;
    overlay.classList.remove("error");
    resetView();
    forcePaint();
    requestAnimationFrame(function() {
      forcePaint();
      requestAnimationFrame(function() {
        if (token !== openToken) return;
        forcePaint();
        overlay.classList.remove("preparing");
      });
    });
  }

  function openLightbox(src) {
    ensureOverlay();
    if (!isScopeActive()) {
      closeAnyLightboxes();
      return;
    }
    if (!src) return;

    openToken += 1;
    var token = openToken;

    overlay.classList.add("open");
    overlay.classList.add("preparing");
    overlay.classList.remove("error");
    if (errorBox) {
      errorBox.textContent = "Unable to load the larger image. Close this modal and try the image again.";
    }
    resetView();

    zoomImg.onload = function() {
      revealAfterLayout(token);
    };
    zoomImg.onerror = function() {
      if (token !== openToken) return;
      overlay.classList.remove("preparing");
      overlay.classList.add("error");
    };

    zoomImg.removeAttribute("src");
    forcePaint();
    zoomImg.src = src;

    if (zoomImg.decode) {
      zoomImg.decode().then(function() {
        revealAfterLayout(token);
      }).catch(function() {
        if (token !== openToken) return;
        if (zoomImg.complete && zoomImg.naturalWidth) revealAfterLayout(token);
      });
    }

    if (zoomImg.complete && zoomImg.naturalWidth) {
      setTimeout(function() { revealAfterLayout(token); }, 0);
    }

    setTimeout(function() {
      if (token !== openToken) return;
      if (zoomImg.complete && zoomImg.naturalWidth) revealAfterLayout(token);
    }, 220);
  }

  window.__ankiRadLightboxOpenFromFirewall = openLightbox;

  function closeLightbox() {
    if (!overlay) return;
    openToken += 1;
    overlay.classList.remove("open");
    overlay.classList.remove("preparing");
    overlay.classList.remove("error");
    dragging = false;
    if (zoomImg) {
      zoomImg.classList.remove("dragging");
      zoomImg.removeAttribute("src");
    }
  }

  function changeZoom(delta) {
    scale = Math.max(0.5, Math.min(6, scale + delta));
    applyTransform();
  }

  function closestImage(el) {
    if (!el) return null;
    if (el.closest) return el.closest(".card img");
    while (el && el !== document) {
      if (el.tagName && el.tagName.toLowerCase() === "img") return el;
      el = el.parentNode;
    }
    return null;
  }

  document.addEventListener("click", function(e) {
    installGlobalFirewall();
    if (!isScopeActive()) {
      closeAnyLightboxes();
      return;
    }

    var img = closestImage(e.target);
    if (!img) return;
    if (img.classList && img.classList.contains("ankiLightboxImage")) return;
    if (img.closest && img.closest(".stackCap")) return;

    e.preventDefault();
    e.stopPropagation();

    openLightbox(img.currentSrc || img.src);
  }, true);
})();
</script>
"""


CSS_RE = re.compile(
    r"/\* ---------- Image Lightbox / Zoom Modal ---------- \*/[\s\S]*?\.card > img\s*\{\s*cursor:\s*zoom-in;\s*\}\s*",
    re.MULTILINE,
)

SCRIPT_RE = re.compile(
    r"(?:<span\s+data-anki-rad-lightbox-scope=[\"']core_rad_notetype_v2[\"'][^>]*></span>\s*)?<script>\s*\(function\(\)\s*\{\s*if\s*\(window\.__ankiRadLightboxV[23456]Installed\)[\s\S]*?\}\)\(\);\s*</script>",
    re.MULTILINE,
)


IMMEDIATE_FIREWALL_JS = r"""
(function() {
  if (window.__ankiRadLightboxImmediateFirewallInstalled) return;
  window.__ankiRadLightboxImmediateFirewallInstalled = true;

  function isScopeActive() {
    return !!document.querySelector('[data-anki-rad-lightbox-scope="core_rad_notetype_v2"]');
  }

  function isIoScopeActive() {
    return !!document.querySelector("[data-anki-io-lightbox-scope]");
  }

  function closestImage(el) {
    if (!el) return null;
    if (el.closest) return el.closest("img");
    while (el && el !== document) {
      if (el.tagName && el.tagName.toLowerCase() === "img") return el;
      el = el.parentNode;
    }
    return null;
  }

  function removeLightboxOverlays() {
    var overlays = document.querySelectorAll(".ankiLightboxOverlay");
    for (var i = 0; i < overlays.length; i++) {
      if (overlays[i].parentNode) overlays[i].parentNode.removeChild(overlays[i]);
    }
  }

  removeLightboxOverlays();

  window.addEventListener("click", function(e) {
    var img = closestImage(e.target);

    if (isIoScopeActive()) return;

    if (isScopeActive()) {
      if (!img) return;
      if (img.classList && img.classList.contains("ankiLightboxImage")) return;
      if (img.closest && img.closest(".stackCap")) return;
      if (typeof window.__ankiRadLightboxOpenFromFirewall === "function") {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        window.__ankiRadLightboxOpenFromFirewall(img.currentSrc || img.src);
      } else {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
      return;
    }

    if (!img) {
      removeLightboxOverlays();
      return;
    }
    removeLightboxOverlays();
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  }, true);
})();
"""


def get_model_manager():
    return mw.col.models


def get_model(mm, name):
    if hasattr(mm, "by_name"):
        return mm.by_name(name)
    return mm.byName(name)


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
    mm = get_model_manager()
    model = get_model(mm, MODEL_NAME)
    if not model:
        raise RuntimeError("Could not find note type: " + MODEL_NAME)

    BACKUP_PATH.parent.mkdir(parents=True, exist_ok=True)
    BACKUP_PATH.write_text(json.dumps(model, ensure_ascii=False, indent=2), encoding="utf-8")

    original_css = model.get("css", "")
    new_css, css_count = CSS_RE.subn(LIGHTBOX_CSS.strip() + "\n", original_css)
    if css_count == 0:
        new_css = original_css.rstrip() + "\n\n" + LIGHTBOX_CSS.strip() + "\n"
    model["css"] = new_css

    script_count = 0
    for tmpl in model.get("tmpls", []):
        for key in ("qfmt", "afmt"):
            if key not in tmpl:
                continue
            updated, count = SCRIPT_RE.subn(LIGHTBOX_SCRIPT.strip(), tmpl.get(key, ""))
            tmpl[key] = updated
            script_count += count

    if script_count == 0:
        raise RuntimeError(
            "No existing lightbox scripts were found, so I did not save. "
            "The note type may have changed or the script pattern is different."
        )

    save_model(mm, model)

    try:
        reviewer = getattr(mw, "reviewer", None)
        web = getattr(reviewer, "web", None)
        if web is not None and hasattr(web, "eval"):
            web.eval(IMMEDIATE_FIREWALL_JS)
    except Exception as exc:
        print("Warning: saved template, but could not patch the currently open reviewer webview:", exc)

    try:
        mw.col.setMod()
    except Exception:
        pass

    try:
        mw.reset()
    except Exception:
        pass

    print("Patched", MODEL_NAME)
    print("Backup:", str(BACKUP_PATH))
    print("CSS blocks replaced:", css_count, "(0 means appended)")
    print("Lightbox scripts replaced:", script_count)
    print("Close/reopen the reviewer card, or move to another card and back, then test image zoom.")


main()
