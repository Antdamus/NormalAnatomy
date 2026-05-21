(() => {
  if (window.__radprimerPromptRunnerInstalled) return;
  window.__radprimerPromptRunnerInstalled = true;

  const cleanText = (text) => String(text || "").replace(/\s+/g, " ").trim();

  const decodeHtml = (text) => {
    const ta = document.createElement("textarea");
    ta.innerHTML = text ?? "";
    return ta.value;
  };

  const rewriteRadPrimerArrowSrcToAnki = (html) => {
    return (html || "").replace(
      /<img[^>]*src=['"]\/img\/arrows\/([A-Za-z0-9_]+)\.png['"][^>]*\/?>/g,
      '<img src="arrow_$1.png">'
    );
  };

  const extractTitleFromImageParams = (selector) => {
    const el = document.querySelector(selector);
    const raw = el?.getAttribute("imageparams") || "";
    if (!raw) return "";

    const query = raw.startsWith("?") ? raw.slice(1) : raw;
    const params = new URLSearchParams(query);
    return cleanText(params.get("parentTitle") || "");
  };

  const getArticleTitle = () => {
    const candidates = [
      document.querySelector("h1.document-name-js.page-heading-js")?.textContent,
      document.querySelector("#content .page-heading h1")?.textContent,
      document.querySelector(".page-heading h1")?.textContent,
      document.querySelector("head > title")?.textContent,
      extractTitleFromImageParams("#focusImageData"),
      extractTitleFromImageParams("#imageData")
    ];

    for (let title of candidates) {
      title = cleanText(title);
      if (!title) continue;
      title = title.replace(/^Document:\s*/i, "");
      if (title) return title;
    }
    return "";
  };

  const slugifyFilePrefix = (text) => {
    const cleaned = cleanText(text)
      .replace(/^Document:\s*/i, "")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    return cleaned || "image";
  };

  const parseInclude = (includeValue, maxN, defaultAll = true) => {
    if (Array.isArray(includeValue)) includeValue = includeValue.join(",");
    const raw = String(includeValue ?? "").trim().toLowerCase();
    if (raw === "all" || (defaultAll && !raw)) {
      return Array.from({ length: maxN }, (_, i) => i + 1);
    }
    if (raw === "none" || !raw) return [];

    const nums = raw
      .split(/[,\s]+/)
      .map((x) => parseInt(x, 10))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= maxN);

    const seen = new Set();
    return nums.filter((n) => (seen.has(n) ? false : (seen.add(n), true)));
  };

  const parseCaseMap = (value) => {
    if (Array.isArray(value)) return value;
    return String(value || "")
      .split(";")
      .map((group) =>
        group
          .split(/[,\s]+/)
          .map((n) => parseInt(n, 10))
          .filter((n) => Number.isFinite(n))
      )
      .filter((group) => group.length >= 2);
  };

  const buildCases = (selectedNums, caseMap) => {
    if (!selectedNums.length) return [];

    const selectedSet = new Set(selectedNums);
    const normalizedGroups = parseCaseMap(caseMap)
      .map((group) => group.filter((n) => selectedSet.has(n)))
      .filter((group) => group.length >= 2);

    const used = new Set();
    normalizedGroups.forEach((group) => group.forEach((n) => used.add(n)));

    const singles = selectedNums.filter((n) => !used.has(n)).map((n) => [n]);
    const groups = [...normalizedGroups, ...singles];

    const seen = new Set();
    const deduped = [];
    for (const group of groups) {
      const cleaned = group.filter((n) => {
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
      });
      if (cleaned.length) deduped.push(cleaned);
    }
    return deduped;
  };

  const domToOutline = (root) => {
    const lines = [];

    const walk = (node, depth = 0) => {
      if (!node || node.nodeType !== 1) return;
      const tag = node.tagName.toLowerCase();

      if (tag === "h1" || tag === "h2" || tag === "h3") {
        const text = cleanText(node.textContent);
        if (text) {
          lines.push("");
          lines.push(text);
        }
        return;
      }

      if (tag === "li") {
        const clone = node.cloneNode(true);
        clone.querySelectorAll("ul, ol").forEach((el) => el.remove());
        const text = cleanText(clone.textContent);
        if (text) lines.push(`${"  ".repeat(depth)}- ${text}`);
        node.querySelectorAll(":scope > ul > li, :scope > ol > li").forEach((li) =>
          walk(li, depth + 1)
        );
        return;
      }

      Array.from(node.children).forEach((child) => walk(child, depth));
    };

    Array.from(root.children).forEach((child) => walk(child, 0));
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  };

  const stripRefsSectionIfPresent = (clone) => {
    clone
      .querySelectorAll(
        [
          "#Selected-References",
          "#reference-list",
          "ol#reference-list",
          '[id*="Selected-References"]',
          '[rel="Selected-References"]'
        ].join(",")
      )
      .forEach((el) => el.remove());

    const headings = Array.from(clone.querySelectorAll("h1, h2, h3"));
    const refHeading = headings.find((h) => /selected references/i.test(h.textContent || ""));
    if (!refHeading) return;

    const headerContainer =
      refHeading.closest(".headline") ||
      refHeading.closest(".headline.sections") ||
      refHeading.parentElement;

    if (!headerContainer) {
      refHeading.remove();
      return;
    }

    let node = headerContainer;
    while (node) {
      const next = node.nextSibling;
      node.remove();
      node = next;
    }
  };

  const buildTopicBlock = (title) => {
    const topic = cleanText(title) || "[TOPIC NOT FOUND]";
    return [
      "=== TOPIC ===",
      `PRIMARY TOPIC: ${topic}`,
      `CENTERING TOPIC FOR THIS CHAT: ${topic}`,
      `USE THIS AS THE CHAT TITLE / WORKING TOPIC LABEL: ${topic}`
    ].join("\n");
  };

  const buildCoreGatePreamble = (config) => {
    if (config.coreGap) {
      return [
        "Pathway B - Core GAP explicitly invoked.",
        "Core GAP: Topic not explicitly covered in Core Radiology; cards derived from RadPrimer/STATdx only.",
        "Core Summary: OMIT. Do not fabricate Core coverage."
      ].join("\n");
    }

    const section = cleanText(config.coreSection);
    const pages = cleanText(config.corePages);
    return [
      "Pathway A - Core Radiology cross-check available or requested.",
      `Core section/chapter/pages: ${section || "[SECTION NOT PROVIDED]"}${pages ? ` | pages: ${pages}` : ""}`,
      "Use the provided Core information only if actually supplied in the prompt or user context. Do not fabricate Core details."
    ].join("\n");
  };

  const buildSourceAttributionBlock = (config) => {
    const lines = ["=== SOURCE ATTRIBUTION ==="];
    lines.push(`Primary source label: ${config.primarySourceLabel || "RadPrimer"}`);

    if (config.engine === "pathology") {
      if (!config.coreGap && (cleanText(config.coreSection) || cleanText(config.corePages))) {
        lines.push(
          `Core cross-check: ${cleanText(config.coreSection) || "[SECTION NOT PROVIDED]"}${
            cleanText(config.corePages) ? ` | pages: ${cleanText(config.corePages)}` : ""
          }`
        );
      } else if (config.coreGap) {
        lines.push("Core cross-check: Core GAP explicitly invoked; no Core coverage claimed.");
      }
    } else {
      if (cleanText(config.sourceNote)) lines.push(`Source note: ${cleanText(config.sourceNote)}`);
      if (cleanText(config.coreNote)) lines.push(`Core cross-check note: ${cleanText(config.coreNote)}`);
    }

    return lines.join("\n");
  };

  const buildWorkflowContext = (config, hasImagesOnPage, selectedCount) => {
    const lines = ["=== WORKFLOW CONTEXT ==="];
    if (cleanText(config.sourceNote)) lines.push(`Source note: ${cleanText(config.sourceNote)}`);
    if (cleanText(config.coreNote)) lines.push(`Optional Core note: ${cleanText(config.coreNote)}`);

    if (config.mode === "captions_only") {
      lines.push(
        `Image workflow: captions extracted as supplemental source text only from ${selectedCount} selected gallery item(s); image-based NORMAL UNKNOWN cards may be absent and are not expected by default.`
      );
    } else if (hasImagesOnPage && selectedCount > 0) {
      lines.push(`Image workflow: ${selectedCount} image(s) selected for optional image-based extraction.`);
    } else {
      lines.push(
        "Image workflow: No usable images selected or available. This is valid for the NORMAL engine; Section A / NORMAL UNKNOWN cards may be absent."
      );
    }

    return lines.join("\n");
  };

  const buildImagesBlock = (config, cases, byIndex) => {
    if (config.engine === "normal") {
      const lines = ["=== IMAGES (optional; original numbering preserved when present) ==="];
      if (!cases.length) {
        lines.push("No image blocks selected for this run.");
        return lines.join("\n");
      }

      const hasExplicitCaseMap = parseCaseMap(config.caseMap).some((group) => group.length >= 2);
      const labelPrefix = config.forceCaseLabels || hasExplicitCaseMap ? "CASE" : "IMAGE";
      cases.forEach((group, idx) => {
        lines.push("");
        lines.push(`${labelPrefix}_${String(idx + 1).padStart(2, "0")}: ${group.join(", ")}`);
        group.forEach((n) => {
          const item = byIndex.get(n);
          if (!item) return;
          lines.push(`  ${item.baseName}`);
          if (config.downloadPlain) lines.push(`    Image: ${item.plainFilename}`);
          if (config.downloadAnnotated) lines.push(`    Image_Annotated: ${item.annotFilename}`);
          lines.push(`    Caption: ${item.caption}`);
        });
      });
      return lines.join("\n").trim();
    }

    const lines = ["=== IMAGES (selected; original numbering preserved) ==="];
    const hasExplicitCaseMap = parseCaseMap(config.caseMap).some((group) => group.length >= 2);
    const labelPrefix = hasExplicitCaseMap ? "CASE" : "IMAGE";
    cases.forEach((group, idx) => {
      lines.push("");
      lines.push(`${labelPrefix}_${String(idx + 1).padStart(2, "0")}: ${group.join(", ")}`);
      group.forEach((n) => {
        const item = byIndex.get(n);
        if (!item) return;
        lines.push(`  ${item.baseName}`);
        if (config.downloadPlain) lines.push(`    Image: ${item.plainFilename}`);
        if (config.downloadAnnotated) lines.push(`    Image_Annotated: ${item.annotFilename}`);
        lines.push(`    Caption: ${item.caption}`);
      });
    });
    return lines.join("\n").trim();
  };

  const buildCaptionsOnlyBlock = (selectedImages) => {
    const lines = ["=== CAPTIONS ONLY (supplemental source text; no image files provided) ==="];
    if (!selectedImages.length) {
      lines.push("No captions selected.");
      return lines.join("\n");
    }
    selectedImages.forEach((item, idx0) => {
      lines.push("");
      lines.push(`CAPTION_${String(idx0 + 1).padStart(2, "0")}: original image ${item.originalIndex}`);
      lines.push(`  Caption: ${item.caption}`);
    });
    return lines.join("\n");
  };

  const getArticleOutline = () => {
    const articleRoot =
      document.querySelector(".col-lft .document-data") ||
      document.querySelector("#content .document-data") ||
      document.querySelector(".document-data");

    if (!articleRoot) throw new Error("Could not find .document-data for article extraction.");
    const clone = articleRoot.cloneNode(true);
    clone.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
    stripRefsSectionIfPresent(clone);
    return domToOutline(clone);
  };

  const getImages = (config, title) => {
    const thumbs = Array.from(document.querySelectorAll("#gallery img[data-caption]"));
    const resolvedFilePrefix = slugifyFilePrefix(title);

    return thumbs.map((img, idx0) => {
      const originalIndex = idx0 + 1;
      const anchor = img.closest("a[rel]");
      const imageId = anchor ? anchor.getAttribute("rel") : "";
      const raw = img.getAttribute("data-caption") || "";

      let caption = decodeHtml(raw).trim();
      caption = rewriteRadPrimerArrowSrcToAnki(caption);
      if (!config.keepCaptionHtml) {
        if (config.stripArrowTags) caption = caption.replace(/<img[^>]*\/?>/gi, "");
        caption = cleanText(caption);
      }

      const baseName = `${resolvedFilePrefix}${originalIndex}`;
      return {
        originalIndex,
        imageId,
        caption,
        baseName,
        plainFilename: `${baseName}.jpg`,
        annotFilename: `${baseName}_annot.jpg`,
        plainUrl: new URL(`/images/${imageId}?style=xlarge&annotated=false`, location.origin).href,
        annotUrl: new URL(`/images/${imageId}?style=xlarge&annotated=true`, location.origin).href
      };
    });
  };

  const buildOutput = (config) => {
    const title = getArticleTitle();
    const articleOutline = getArticleOutline();
    const allImages = getImages(config, title);

    const defaultAll = !(config.engine === "normal" && config.mode === "no_pictures");
    let selectedNums = parseInclude(config.include, allImages.length, defaultAll);
    if (config.engine === "normal" && config.mode === "captions_only" && !selectedNums.length) {
      selectedNums = Array.from({ length: allImages.length }, (_, i) => i + 1);
    }

    const selectedSet = new Set(selectedNums);
    const selectedImages = allImages.filter((image) => selectedSet.has(image.originalIndex));
    const cases = buildCases(selectedNums, config.caseMap);
    const byIndex = new Map(allImages.map((image) => [image.originalIndex, image]));

    let output;
    if (config.engine === "normal") {
      const imageBlock =
        config.mode === "captions_only"
          ? buildCaptionsOnlyBlock(selectedImages)
          : buildImagesBlock(config, cases, byIndex);

      output = `${buildTopicBlock(title)}

${buildWorkflowContext(config, allImages.length > 0, selectedImages.length)}

=== PROMPT ===
${config.promptText}

=== ARTICLE ===
${title ? `TITLE: ${title}\n\n` : ""}${articleOutline || "[Article extraction failed]"}

${imageBlock}

${buildSourceAttributionBlock(config)}
`;
    } else {
      const coreValidationBlock =
        config.mode === "narrative" ? "" : `\n\n=== CORE VALIDATION INPUT ===\n${buildCoreGatePreamble(config)}`;

      output = `${buildTopicBlock(title)}${coreValidationBlock}

=== PROMPT ===
${config.promptText}

=== ARTICLE ===
${title ? `TITLE: ${title}\n\n` : ""}${articleOutline || "[Article extraction failed]"}

${buildImagesBlock(config, cases, byIndex)}

${buildSourceAttributionBlock(config)}
`;
    }

    const downloadFiles = [];
    if (config.downloadImages) {
      const ordered = cases.flat().map((n) => byIndex.get(n)).filter(Boolean);
      for (const image of ordered) {
        if (config.downloadPlain) downloadFiles.push({ url: image.plainUrl, filename: image.plainFilename });
        if (config.downloadAnnotated) downloadFiles.push({ url: image.annotUrl, filename: image.annotFilename });
      }
    }

    return {
      output,
      downloadFiles,
      meta: {
        title,
        totalImagesOnPage: allImages.length,
        selectedImages: selectedNums,
        cases,
        outputChars: output.length
      }
    };
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "RADPRIMER_EXTRACT") return false;

    try {
      sendResponse({ ok: true, ...buildOutput(message.config || {}) });
    } catch (error) {
      sendResponse({ ok: false, error: String(error?.message || error) });
    }

    return false;
  });
})();
