/* Image display controls use cached originals; display adjustments never alter source files. */
(function (root) {
  "use strict";
  root.createVisualLectureViewer = function ({ getImage, getImages, getURL, hasVariant, renderCaption, onVariant, onToggleFollow, onAudio, onError, onImageChange = () => {}, getCardState = () => ({}), onToggleCard = () => {}, shortcutLabel = (action, text) => text }) {
    const $ = id => document.getElementById(id), dialog = $("viewer"), stage = $("viewer-stage"), img = $("viewer-image");
    let imageId = "", annotated = true, scale = 1, x = 0, y = 0, brightness = 1, contrast = 1, inverted = false, drag = null;
    let audioPlaying = false, following = true;
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    function paint() {
      img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      img.style.filter = `brightness(${brightness}) contrast(${contrast})${inverted ? " invert(1)" : ""}`;
      $("viewer-zoom").textContent = `${Math.round(scale * 100)}%`;
      $("viewer-brightness").value = brightness; $("viewer-contrast").value = contrast;
      $("viewer-invert").setAttribute("aria-pressed", String(inverted));
      $("viewer-large").setAttribute("aria-pressed", String(dialog.classList.contains("extra-large")));
    }
    function resetView() { scale = 1; x = y = 0; paint(); }
    function resetDisplay() { brightness = contrast = 1; inverted = false; paint(); }
    function zoom(factor) { scale = clamp(scale * factor, .25, 12); paint(); }
    function updateImage() {
      const entry = getImage(imageId); if (!entry) return;
      const preferred = annotated ? "annotated" : "plain";
      const actual = hasVariant(imageId, preferred) ? preferred : preferred === "plain" ? "annotated" : "plain";
      const url = getURL(imageId, actual); if (!url) return;
      if (img.getAttribute("src") !== url) img.src = url;
      img.alt = `${entry.sourceLabel} image ${entry.sourceImageNumber}`;
      $("viewer-label").textContent = img.alt;
      $("viewer-caption").replaceChildren(renderCaption(entry.captionHtml || entry.caption));
      onImageChange(imageId);
      const both = hasVariant(imageId, "plain") && hasVariant(imageId, "annotated");
      $("viewer-arrows").disabled = !both;
      $("viewer-arrows").setAttribute("aria-pressed", String(actual === "annotated"));
      $("viewer-variant-note").textContent = both ? "" : actual === "annotated" ? "Only the annotated image is available." : "Only the image without annotations is available.";
      const ids = getImages(imageId), index = ids.indexOf(imageId);
      $("viewer-previous").disabled = index <= 0;
      $("viewer-next").disabled = index < 0 || index >= ids.length - 1;
      $("viewer-position").textContent = `${index + 1} / ${ids.length}`;
      paint(); refreshShortcuts();
    }
    function open(id, arrows = true) {
      if (!getURL(id, arrows ? "annotated" : "plain") && !getURL(id, arrows ? "plain" : "annotated")) return;
      imageId = id; annotated = arrows;
      scale = brightness = contrast = 1; x = y = 0; inverted = false; drag = null;
      dialog.classList.remove("extra-large");
      setControlsHidden(false);
      updateImage(); if (!dialog.open) dialog.showModal(); stage.focus();
    }
    function followImage(id) {
      if (!dialog.open) return false;
      if (!getURL(id, "annotated") && !getURL(id, "plain")) {
        const entry = getImage(id);
        if (entry) $("viewer-variant-note").textContent = `The lecture has moved to ${entry.sourceLabel} image ${entry.sourceImageNumber}, which is not available yet.`;
        return false;
      }
      if (id !== imageId) {
        if (drag && stage.hasPointerCapture(drag.id)) stage.releasePointerCapture(drag.id);
        endDrag(); imageId = id;
        scale = dialog.classList.contains("extra-large") ? 2.5 : 1;
        x = y = 0; brightness = contrast = 1; inverted = false;
      }
      updateImage();
      return true;
    }
    function navigate(delta) {
      const ids = getImages(imageId), next = ids[ids.indexOf(imageId) + delta];
      if (!next) return;
      imageId = next; resetView(); resetDisplay(); updateImage();
    }
    function toggleArrows() {
      if ($("viewer-arrows").disabled) return;
      annotated = !annotated; onVariant(annotated); updateImage();
    }
    function extraLarge() {
      const large = dialog.classList.toggle("extra-large");
      scale = large ? 2.5 : 1; x = y = 0; paint();
    }
    function toggleCaption() {
      $("viewer-caption").hidden = !$("viewer-caption").hidden;
      $("viewer-caption-toggle").setAttribute("aria-pressed", String(!$("viewer-caption").hidden));
    }
    function setControlsHidden(hidden) {
      dialog.classList.toggle("controls-hidden", hidden);
      $("viewer-show-controls").hidden = !hidden;
      $("viewer-hide-controls").setAttribute("aria-expanded", String(!hidden));
      $("viewer-show-controls").setAttribute("aria-expanded", String(!hidden));
    }
    function toggleControls() {
      const hidden = !dialog.classList.contains("controls-hidden");
      setControlsHidden(hidden);
      if (hidden) stage.focus();
      else $("viewer-hide-controls").focus();
    }
    function audio(action) { Promise.resolve(onAudio(action)).catch(onError); }
    function refreshCardState() {
      const state = imageId ? getCardState(imageId) : {}, decision = state.decision || "later";
      const button = $("viewer-card-toggle"), status = $("viewer-card-status");
      button.dataset.decision = decision;
      button.setAttribute("aria-pressed", String(decision === "cards"));
      button.setAttribute("aria-label", shortcutLabel("toggleCard", "Use image for cards"));
      button.setAttribute("aria-busy", String(!!state.pending));
      // Keep keyboard focus on the button while saving; ignore repeat actions below.
      button.setAttribute("aria-disabled", String(!imageId || !!state.pending));
      button.textContent = shortcutLabel("toggleCard", decision === "cards" ? "✓ For cards" : "+ Add to cards");
      button.title = `${decision === "cards" ? "Remove from card selection." : "Select for cards."} Plain and annotated versions stay together.${state.groupSize > 1 ? ` Applies to all ${state.groupSize} linked images.` : ""}`;
      const note = state.pending ? "Saving…" : state.error ? `Not saved: ${state.error}` : decision === "cards" ? "Selected for cards" : "Not selected for cards";
      status.textContent = note + (state.groupSize > 1 ? ` · ${state.groupSize} linked images` : "");
      status.dataset.error = String(!!state.error);
    }
    function toggleCard() {
      if (!imageId || getCardState(imageId).pending) return;
      // Capture the viewed ID before a save; navigation and audio cues may continue.
      Promise.resolve(onToggleCard(imageId)).catch(onError);
    }
    function refreshCardReview() {
      if (dialog.open) onImageChange(imageId);
      refreshCardState();
    }
    function refreshShortcuts() {
      const labels = {
        "viewer-hide-controls": ["toggleControls", "Hide controls"], "viewer-show-controls": ["toggleControls", "Show controls"],
        "viewer-follow": ["follow", `Follow lecture: ${following ? "on" : "off"}`],
        "viewer-arrows": ["arrows", `Arrows: ${$("viewer-arrows").getAttribute("aria-pressed") === "true" ? "on" : "off"}`],
        "viewer-large": ["extraLarge", "Extra large"], "viewer-caption-toggle": ["caption", "Caption"],
        "viewer-close": ["closeImage", "Close"], "viewer-previous": ["previousImage", "←"], "viewer-next": ["nextImage", "→"],
        "viewer-zoom-in": ["zoomIn", "+"], "viewer-zoom-out": ["zoomOut", "−"], "viewer-fit": ["fit", "Fit"],
        "viewer-reset": ["resetDisplay", "Reset display"], "viewer-invert": ["invert", "Invert"],
        "viewer-play": ["playPause", audioPlaying ? "Pause" : "Play"], "viewer-back": ["back10", "−10 s"], "viewer-forward": ["forward10", "+10 s"]
      };
      for (const [id, [action, text]] of Object.entries(labels)) $(id).textContent = shortcutLabel(action, text);
      $("viewer-close").title = "Esc also closes the image viewer.";
      refreshCardState();
    }
    const actions = {
      toggleControls, toggleCard,
      follow: onToggleFollow,
      extraLarge, arrows: toggleArrows, caption: toggleCaption, closeImage: () => dialog.close(),
      previousImage: () => navigate(-1), nextImage: () => navigate(1), zoomIn: () => zoom(1.25), zoomOut: () => zoom(1 / 1.25),
      fit: resetView, resetDisplay, invert: () => { inverted = !inverted; paint(); },
      brighter: () => { brightness = clamp(brightness + .1, .2, 4); paint(); },
      darker: () => { brightness = clamp(brightness - .1, .2, 4); paint(); },
      moreContrast: () => { contrast = clamp(contrast + .1, .2, 4); paint(); },
      lessContrast: () => { contrast = clamp(contrast - .1, .2, 4); paint(); },
      playPause: () => audio("playPause"), back10: () => audio("back10"), forward10: () => audio("forward10")
    };
    $("viewer-close").onclick = () => dialog.close();
    $("viewer-hide-controls").onclick = toggleControls;
    $("viewer-show-controls").onclick = toggleControls;
    $("viewer-card-toggle").onclick = toggleCard;
    $("viewer-follow").onclick = onToggleFollow;
    $("viewer-arrows").onclick = toggleArrows;
    $("viewer-large").onclick = extraLarge;
    $("viewer-caption-toggle").onclick = toggleCaption;
    $("viewer-previous").onclick = () => navigate(-1); $("viewer-next").onclick = () => navigate(1);
    $("viewer-zoom-in").onclick = () => zoom(1.25); $("viewer-zoom-out").onclick = () => zoom(1 / 1.25);
    $("viewer-fit").onclick = resetView;
    $("viewer-reset").onclick = resetDisplay;
    $("viewer-invert").onclick = () => { inverted = !inverted; paint(); };
    $("viewer-brightness").oninput = event => { brightness = Number(event.target.value); paint(); };
    $("viewer-contrast").oninput = event => { contrast = Number(event.target.value); paint(); };
    $("viewer-play").onclick = () => audio("playPause");
    $("viewer-back").onclick = () => audio("back10"); $("viewer-forward").onclick = () => audio("forward10");
    stage.addEventListener("wheel", event => {
      event.preventDefault();
      if (event.shiftKey) { contrast = clamp(contrast * (event.deltaY < 0 ? 1.08 : 1 / 1.08), .2, 4); paint(); }
      else zoom(event.deltaY < 0 ? 1.14 : 1 / 1.14);
    }, { passive: false });
    stage.addEventListener("dblclick", () => { scale = scale < 1.75 ? 2.5 : 1; x = y = 0; paint(); });
    stage.addEventListener("contextmenu", event => event.preventDefault());
    stage.addEventListener("pointerdown", event => {
      if (![0, 2].includes(event.button)) return;
      event.preventDefault(); stage.focus();
      drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x, y, brightness, contrast, windowing: event.shiftKey || event.button === 2 };
      stage.setPointerCapture(event.pointerId); stage.classList.add(drag.windowing ? "windowing" : "dragging");
    });
    stage.addEventListener("pointermove", event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
      if (drag.windowing) { contrast = clamp(drag.contrast * Math.exp(dx / 260), .2, 4); brightness = clamp(drag.brightness - dy / 260, .2, 4); }
      else { x = drag.x + dx; y = drag.y + dy; }
      paint();
    });
    function endDrag() { drag = null; stage.classList.remove("dragging", "windowing"); }
    stage.addEventListener("pointerup", endDrag); stage.addEventListener("pointercancel", endDrag); stage.addEventListener("lostpointercapture", endDrag);
    dialog.addEventListener("close", () => { endDrag(); dialog.classList.remove("extra-large"); });
    return { open, refresh: () => { if (dialog.open) updateImage(); }, setAnnotated: value => { annotated = value; if (dialog.open) updateImage(); },
      isOpen: () => dialog.open, refreshShortcuts, refreshCardState, refreshCardReview, followImage,
      updateFollow: value => { following = value; $("viewer-follow").setAttribute("aria-pressed", String(value)); refreshShortcuts(); },
      perform: action => { if (!dialog.open || !actions[action]) return false; actions[action](); return true; },
      updateAudio: state => { $("viewer-play").disabled = !state?.available; audioPlaying = !!state?.isPlaying; refreshShortcuts(); } };
  };
})(globalThis);
