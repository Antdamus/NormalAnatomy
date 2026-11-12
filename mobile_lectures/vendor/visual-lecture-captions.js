/* Render a safe copy of source HTML; never rewrite the stored caption or fetch its URLs. */
(function (root) {
  "use strict";
  function render(raw) {
    const parsed = new DOMParser().parseFromString(String(raw || ""), "text/html");
    const target = document.createElement("div");
    target.className = "source-caption";
    function unavailable(source, code = "") {
      const notice = document.createElement("span");
      const label = source.getAttribute("alt") || root.VisualLecture.arrowLabel(code) || "Source annotation";
      notice.className = "caption-icon-missing";
      notice.textContent = `[${label} — icon unavailable]`;
      notice.title = source.getAttribute("src") || "Missing source annotation file";
      target.dataset.missingAnnotations = "true";
      return notice;
    }
    function walk(source, dest) {
      for (const node of source.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) { dest.append(document.createTextNode(node.textContent)); continue; }
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.tagName === "IMG") {
          const code = root.VisualLecture.captionArrowCode(node.getAttribute("src"));
          if (!code || !root.VisualLecture.arrowLabel(code)) { dest.append(unavailable(node, code)); continue; }
          const icon = document.createElement("img");
          icon.className = "caption-icon"; icon.dataset.arrow = code;
          icon.src = `assets/caption-icons/arrow_${code}.png`;
          icon.alt = node.getAttribute("alt") || root.VisualLecture.arrowLabel(code);
          icon.title = node.getAttribute("title") || icon.alt;
          icon.onerror = () => icon.replaceWith(unavailable(node, code));
          dest.append(icon);
        } else if (["STRONG", "B", "EM", "I", "U", "S", "SMALL", "SUB", "SUP", "BR", "SPAN", "P", "DIV", "UL", "OL", "LI"].includes(node.tagName)) {
          const child = document.createElement(node.tagName.toLowerCase());
          walk(node, child); dest.append(child);
        } else if (node.tagName === "A") {
          let child = document.createElement("span");
          try {
            const url = new URL(node.getAttribute("href"));
            if (["https:", "http:"].includes(url.protocol)) {
              child = document.createElement("a"); child.href = url.href;
              child.target = "_blank"; child.rel = "noreferrer noopener";
            }
          } catch {}
          walk(node, child); dest.append(child);
        } else if (!["SCRIPT", "STYLE", "IFRAME", "OBJECT", "TEMPLATE", "SVG"].includes(node.tagName)) walk(node, dest);
      }
    }
    walk(parsed.body, target);
    return target;
  }
  root.VisualLectureCaptions = { render };
})(globalThis);
