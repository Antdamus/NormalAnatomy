/* Shared by saved lectures on this extension origin. No source-page keys are changed. */
(function (root) {
  "use strict";
  const storageKey = "visualLectureShortcuts.v1";
  const actions = [
    ["openImage", "Enlarge current or first image", "Study page", "e"],
    ["previousCase", "Previous case", "Study page", "["],
    ["nextCase", "Next case", "Study page", "]"],
    ["overview", "Show pattern overview", "Study page", "o"],
    ["follow", "Follow lecture on / off", "Lecture", "f"],
    ["playPause", "Play / pause lecture", "Lecture", "p"],
    ["back10", "Rewind ten seconds", "Lecture", "ArrowLeft"],
    ["forward10", "Forward ten seconds", "Lecture", "ArrowRight"],
    ["extraLarge", "Extra-large image on / off", "Image viewer", "a"],
    ["toggleControls", "Controls on / off", "Image viewer", ""],
    ["arrows", "Annotations on / off", "Image viewer", "r"],
    ["caption", "Caption on / off", "Image viewer", "t"],
    ["closeImage", "Close enlarged image", "Image viewer", "s"],
    ["previousImage", "Previous image", "Image viewer", "k"],
    ["nextImage", "Next image", "Image viewer", "l"],
    ["zoomIn", "Zoom in", "Image viewer", "+"],
    ["zoomOut", "Zoom out", "Image viewer", "-"],
    ["fit", "Fit image", "Image viewer", "0"],
    ["resetDisplay", "Reset brightness, contrast and inversion", "Image viewer", "w"],
    ["invert", "Invert image", "Image viewer", "i"],
    ["brighter", "Increase brightness", "Image viewer", ""],
    ["darker", "Decrease brightness", "Image viewer", ""],
    ["moreContrast", "Increase contrast", "Image viewer", ""],
    ["lessContrast", "Decrease contrast", "Image viewer", ""],
    // Append new defaults so an existing user assignment to C keeps priority.
    ["toggleCard", "Use image for cards on / off", "Image viewer", "c"]
  ];
  const modifiers = ["ctrl", "alt", "shift", "meta"];
  const reserved = new Set(["Escape", "Tab", "Control", "Alt", "Shift", "Meta", "Unidentified", "Dead"]);
  function binding(value) {
    if (!value || typeof value.key !== "string" || !value.key || reserved.has(value.key)) return null;
    let key = value.key === " " ? "Space" : value.key;
    if (key.length === 1) key = key.toLowerCase();
    // The +/= key remains usable without Shift, as in the source image viewers.
    if (key === "=") key = "+";
    return { key, ctrl: !!value.ctrl, alt: !!value.alt, shift: !!value.shift && !/^[^a-z0-9]$/.test(key), meta: !!value.meta };
  }
  const defaults = () => Object.fromEntries(actions.map(([id, , , key]) => [id, binding({ key })]));
  const signature = value => value ? JSON.stringify([value.key, ...modifiers.map(m => !!value[m])]) : "";
  function normalize(saved) {
    const result = defaults(), used = new Set();
    for (const [id] of actions) {
      if (saved && Object.hasOwn(saved, id)) result[id] = binding(saved[id]);
      const key = signature(result[id]);
      if (key && used.has(key)) result[id] = null;
      else if (key) used.add(key);
    }
    return result;
  }
  function display(value) {
    if (!value) return "Unassigned";
    const key = ({ArrowLeft:"←", ArrowRight:"→", ArrowUp:"↑", ArrowDown:"↓"})[value.key] || (value.key.length === 1 ? value.key.toUpperCase() : value.key);
    return [...modifiers.filter(m => value[m]).map(m => ({ctrl:"Ctrl", alt:"Alt", shift:"Shift", meta:"Meta"})[m]), key].join(" + ");
  }
  root.createVisualLectureShortcuts = function ({ onAction, onChange, isViewerOpen }) {
    const $ = id => document.getElementById(id), dialog = $("shortcuts-dialog"), list = $("shortcut-list"), status = $("shortcut-status");
    let settings = defaults(), draft, capture = "", opener;
    try { settings = normalize(JSON.parse(localStorage.getItem(storageKey))); } catch {}
    function render() {
      list.replaceChildren();
      let group = "";
      for (const [id, label, section] of actions) {
        if (section !== group) {
          group = section; const heading = document.createElement("h3"); heading.textContent = group; list.append(heading);
        }
        const row = document.createElement("div"); row.className = "shortcut-row";
        const name = document.createElement("span"); name.textContent = label;
        const key = document.createElement("button"); key.type = "button"; key.dataset.shortcut = id;
        key.textContent = capture === id ? "Press a key…" : display(draft[id]);
        key.setAttribute("aria-label", `${label}: ${capture === id ? "press a key" : display(draft[id])}`);
        key.classList.toggle("listening", capture === id);
        key.onclick = () => {
          capture = id; status.textContent = `Press a key or combination for ${label.toLowerCase()}. Esc cancels.`;
          render(); list.querySelector(`[data-shortcut="${id}"]`).focus();
        };
        const clear = document.createElement("button"); clear.type = "button"; clear.textContent = "Clear";
        clear.setAttribute("aria-label", `Clear ${label.toLowerCase()} shortcut`); clear.disabled = !draft[id];
        clear.onclick = () => { draft[id] = null; capture = ""; status.textContent = "Shortcut cleared. Save to apply."; render(); list.querySelector(`[data-shortcut="${id}"]`).focus(); };
        row.append(name, key, clear); list.append(row);
      }
    }
    function open(event) {
      opener = event.currentTarget; draft = structuredClone(settings); capture = ""; status.textContent = "";
      render(); dialog.showModal();
    }
    $("shortcuts").onclick = open; $("viewer-shortcuts").onclick = open;
    $("shortcut-cancel").onclick = () => dialog.close();
    $("shortcut-reset").onclick = () => { draft = defaults(); capture = ""; render(); status.textContent = "Defaults restored. Save to apply."; };
    $("shortcut-save").onclick = () => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(draft));
        settings = structuredClone(draft); onChange(); dialog.close();
        $("shortcut-saved").hidden = false; $("shortcut-saved").textContent = "Keyboard shortcuts saved for all visual lectures.";
      } catch { status.textContent = "The shortcuts could not be saved. Try again."; }
    };
    dialog.addEventListener("close", () => { capture = ""; opener?.focus(); });
    dialog.addEventListener("cancel", event => {
      if (capture) { event.preventDefault(); capture = ""; render(); status.textContent = "Assignment canceled."; }
    });
    document.addEventListener("keydown", event => {
      if (event.defaultPrevented || event.isComposing) return;
      if (dialog.open) {
        if (!capture) return;
        if (event.key === "Tab") { const id = capture; capture = ""; render(); list.querySelector(`[data-shortcut="${id}"]`).focus(); status.textContent = "Assignment canceled."; return; }
        event.preventDefault(); event.stopPropagation();
        if (event.key === "Escape") { const id = capture; capture = ""; render(); list.querySelector(`[data-shortcut="${id}"]`).focus(); status.textContent = "Assignment canceled."; return; }
        const pressed = binding({key:event.key, ctrl:event.ctrlKey, alt:event.altKey, shift:event.shiftKey, meta:event.metaKey});
        if (!pressed || event.repeat) return;
        const duplicate = actions.find(([id]) => id !== capture && signature(draft[id]) === signature(pressed));
        if (duplicate) { status.textContent = `${display(pressed)} is already assigned to ${duplicate[1].toLowerCase()}. Choose another key or clear that shortcut first.`; return; }
        const id = capture; draft[id] = pressed; capture = ""; render(); list.querySelector(`[data-shortcut="${id}"]`).focus(); status.textContent = "Shortcut assigned. Save to apply.";
        return;
      }
      if (document.getElementById("study").hidden || event.key === "Escape" || event.target.closest("input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=textbox]")) return;
      if (["Enter", " "].includes(event.key) && event.target.closest("button, a[href], summary")) return;
      const pressed = binding({key:event.key, ctrl:event.ctrlKey, alt:event.altKey, shift:event.shiftKey, meta:event.metaKey});
      if (!pressed) return;
      const action = actions.find(([id]) => signature(settings[id]) === signature(pressed));
      if (!action || (action[2] === "Image viewer" && !isViewerOpen()) || (action[2] === "Study page" && isViewerOpen())) return;
      event.preventDefault(); event.stopPropagation();
      if (event.repeat && !["zoomIn", "zoomOut", "brighter", "darker", "moreContrast", "lessContrast"].includes(action[0])) return;
      onAction(action[0]);
    }, true);
    window.addEventListener("storage", event => {
      if (event.storageArea !== localStorage || event.key !== storageKey) return;
      try { settings = normalize(JSON.parse(event.newValue)); onChange(); } catch {}
    });
    return { label: (id, text) => settings[id] ? `${text} (${display(settings[id])})` : text };
  };
})(globalThis);
