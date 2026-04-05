(() => {
  /**********************************************************************
   NORMAL Engine -> "One Shot" Exporter
   ----------------------------------------------------------------------
   Copies to clipboard:
     1) WORKFLOW CONTEXT
     2) YOUR PROMPT
     3) ARTICLE (structured outline)
     4) IMAGES (optional; selected image numbers with filenames + captions)

   This mirrors the pathology workflow pattern, but the NORMAL engine is
   image-optional:
   - Articles may have zero usable images
   - Section A / NORMAL UNKNOWN may be absent
   - The workflow must still succeed for concept-driven extraction
  **********************************************************************/

  /**********************
   * SETTINGS YOU EDIT
   **********************/
  const FILE_PREFIX = "ScalpandCalvarialVault"; // change per document
  const INCLUDE = ""; // "all", "none", "2,4,5", or [2,4,5]
  const CASE_MAP = []; // e.g. [[2,3],[8,9]] ; leave [] for auto-solo grouping
  const SOURCE_NOTE = ""; // optional free-text note about source/article context
  const CORE_NOTE = ""; // optional tertiary Core cross-check note
  const DOWNLOAD_IMAGES = false; // set true if you want browser downloads
  const DOWNLOAD_PLAIN = true;
  const DOWNLOAD_ANNOTATED = true;
  const DOWNLOAD_DELAY_MS = 1000;
  const KEEP_CAPTION_HTML = true;
  const STRIP_ARROW_TAGS_IN_CAPTION_TEXT = false;
  const AUTO_FILE_PREFIX_FROM_TITLE = false;
  const FORCE_CASE_LABELS = false;

  /**********************
   * YOUR PROMPT (AUTO-INJECTED)
   **********************/
  const PROMPT_TEXT =
`=== PROMPTTEXT ===`;

  /**********************
   * HELPERS
   **********************/
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const decodeHtml = (text) => {
    const ta = document.createElement("textarea");
    ta.innerHTML = text ?? "";
    return ta.value;
  };

  const cleanText = (text) => String(text || "").replace(/\s+/g, " ").trim();

  const rewriteRadPrimerArrowSrcToAnki = (html) => {
    return (html || "").replace(
      /<img[^>]*src=['"]\/img\/arrows\/([A-Za-z0-9_]+)\.png['"][^>]*\/?>/g,
      '<img src="arrow_$1.png">'
    );
  };

  const getArticleTitle = () => {
    const candidates = [
      document.querySelector("h1.document-name-js.page-heading-js")?.textContent,
      document.querySelector("#content .page-heading h1")?.textContent,
      document.querySelector(".page-heading h1")?.textContent,
      document.querySelector("head > title")?.textContent
    ];

    for (let title of candidates) {
      title = cleanText(title);
      if (!title) continue;
      title = title.replace(/^Document:\s*/i, "");
      if (title) return title;
    }

    return "";
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

  const slugifyFilePrefix = (text) => {
    const cleaned = cleanText(text)
      .replace(/^Document:\s*/i, "")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    return cleaned || "image";
  };

  const normalizeIncludeInput = (includeValue) => {
    if (Array.isArray(includeValue)) {
      return includeValue.join(",");
    }
    return String(includeValue ?? "").trim().toLowerCase();
  };

  const parseInclude = (includeValue, maxN) => {
    const raw = normalizeIncludeInput(includeValue);
    if (raw === "all") {
      return Array.from({ length: maxN }, (_, i) => i + 1);
    }
    if (!raw || raw === "none") {
      return [];
    }

    const nums = raw
      .split(/[,\s]+/)
      .map((x) => parseInt(x, 10))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= maxN);

    const seen = new Set();
    return nums.filter((n) => (seen.has(n) ? false : (seen.add(n), true)));
  };

  const domToOutline = (root) => {
    const lines = [];

    const walk = (node, depth = 0) => {
      if (!node || node.nodeType !== 1) return;
      const tag = node.tagName.toLowerCase();

      if (tag === "h1" || tag === "h2" || tag === "h3") {
        const text = node.textContent.trim();
        if (text) {
          lines.push("");
          lines.push(text);
        }
        return;
      }

      if (tag === "li") {
        const clone = node.cloneNode(true);
        clone.querySelectorAll("ul, ol").forEach((el) => el.remove());
        const text = clone.textContent.replace(/\s+/g, " ").trim();
        if (text) {
          const indent = "  ".repeat(depth);
          lines.push(`${indent}- ${text}`);
        }
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
    clone.querySelectorAll(
      [
        "#Selected-References",
        "#reference-list",
        "ol#reference-list",
        '[id*="Selected-References"]',
        '[rel="Selected-References"]'
      ].join(",")
    ).forEach((el) => el.remove());

    const headings = Array.from(clone.querySelectorAll("h1, h2, h3"));
    const refHeading = headings.find((h) =>
      /selected references/i.test(h.textContent || "")
    );
    if (refHeading) {
      const headerContainer =
        refHeading.closest(".headline") ||
        refHeading.closest(".headline.sections") ||
        refHeading.parentElement;

      if (headerContainer) {
        let node = headerContainer;
        while (node) {
          const next = node.nextSibling;
          node.remove();
          node = next;
        }
      } else {
        refHeading.remove();
      }
    }
  };

  const buildCases = (selectedNums) => {
    if (!selectedNums.length) return [];

    const selectedSet = new Set(selectedNums);
    const normalizedGroups = (Array.isArray(CASE_MAP) ? CASE_MAP : [])
      .map((group) =>
        (Array.isArray(group) ? group : [])
          .map((n) => parseInt(n, 10))
          .filter((n) => selectedSet.has(n))
      )
      .filter((group) => group.length >= 2);

    const used = new Set();
    normalizedGroups.forEach((group) => group.forEach((n) => used.add(n)));

    const singles = selectedNums.filter((n) => !used.has(n)).map((n) => [n]);
    const cases = [...normalizedGroups, ...singles];

    const seen = new Set();
    const deduped = [];
    for (const group of cases) {
      const cleaned = group.filter((n) => (seen.has(n) ? false : (seen.add(n), true)));
      if (cleaned.length) deduped.push(cleaned);
    }
    return deduped;
  };

  const safeCopy = (text) => {
    try {
      copy(text);
      return true;
    } catch (err) {
      console.warn("copy() failed; you can manually copy from console output.", err);
      return false;
    }
  };

  const buildWorkflowContext = ({ hasImagesOnPage, selectedCount }) => {
    const lines = ["=== WORKFLOW CONTEXT ==="];

    if (SOURCE_NOTE.trim()) {
      lines.push(`Source note: ${SOURCE_NOTE.trim()}`);
    }
    if (CORE_NOTE.trim()) {
      lines.push(`Optional Core note: ${CORE_NOTE.trim()}`);
    }

    if (hasImagesOnPage && selectedCount > 0) {
      lines.push(`Image workflow: ${selectedCount} image(s) selected for optional image-based extraction.`);
    } else {
      lines.push(
        "Image workflow: No usable images selected or available. This is valid for the NORMAL engine; Section A / NORMAL UNKNOWN cards may be absent."
      );
    }

    return lines.join("\n");
  };

  const buildImagesBlock = (cases, byIndex) => {
    const lines = ["=== IMAGES (optional; original numbering preserved when present) ==="];

    if (!cases.length) {
      lines.push(
        "[No usable images selected or available. Do not force image placeholders, UNKNOWN cards, or Section A.]"
      );
      return lines.join("\n");
    }

    const hasExplicitCaseMap =
      Array.isArray(CASE_MAP) &&
      CASE_MAP.some((group) => Array.isArray(group) && group.length >= 2);

    const labelPrefix = (FORCE_CASE_LABELS || hasExplicitCaseMap) ? "CASE" : "IMAGE";

    cases.forEach((group, caseIdx) => {
      const caseLabel = `${labelPrefix}_${String(caseIdx + 1).padStart(2, "0")}`;
      lines.push("");
      lines.push(`${caseLabel}: ${group.join(", ")}`);

      group.forEach((n) => {
        const item = byIndex.get(n);
        if (!item) return;

        lines.push(`  ${item.baseName}`);
        if (DOWNLOAD_PLAIN) lines.push(`    Image: ${item.plainFilename}`);
        if (DOWNLOAD_ANNOTATED) lines.push(`    Image_Annotated: ${item.annotFilename}`);
        lines.push(`    Caption: ${item.caption}`);
      });
    });

    return lines.join("\n");
  };

  const downloadOne = async (href, filename) => {
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    await sleep(DOWNLOAD_DELAY_MS);
  };

  /**********************
   * 1) ARTICLE
   **********************/
  const articleRoot =
    document.querySelector(".col-lft .document-data") ||
    document.querySelector("#content .document-data") ||
    document.querySelector(".document-data");

  if (!articleRoot) {
    console.warn("Couldn't find .document-data for article extraction.");
    return;
  }

  const clone = articleRoot.cloneNode(true);
  clone.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
  stripRefsSectionIfPresent(clone);
  const articleTitle = getArticleTitle();
  const articleOutline = domToOutline(clone);

  /**********************
   * 2) IMAGES (OPTIONAL)
   **********************/
  const thumbs = Array.from(document.querySelectorAll("#gallery img[data-caption]"));
  const resolvedFilePrefix = slugifyFilePrefix(
    AUTO_FILE_PREFIX_FROM_TITLE ? getArticleTitle() : FILE_PREFIX
  );
  const allImages = thumbs.map((img, idx0) => {
    const originalIndex = idx0 + 1;
    const anchor = img.closest("a[rel]");
    const imageId = anchor ? anchor.getAttribute("rel") : "";
    const raw = img.getAttribute("data-caption") || "";

    let captionDecoded = decodeHtml(raw).trim();
    captionDecoded = rewriteRadPrimerArrowSrcToAnki(captionDecoded);

    if (!KEEP_CAPTION_HTML) {
      if (STRIP_ARROW_TAGS_IN_CAPTION_TEXT) {
        captionDecoded = captionDecoded.replace(/<img[^>]*\/?>/gi, "");
      }
      captionDecoded = captionDecoded.replace(/\s+/g, " ").trim();
    }

    const baseName = `${resolvedFilePrefix}${originalIndex}`;
    const plainFilename = `${baseName}.jpg`;
    const annotFilename = `${baseName}_annot.jpg`;

    return {
      originalIndex,
      imageId,
      caption: captionDecoded,
      baseName,
      plainFilename,
      annotFilename,
      plainUrl: `/images/${imageId}?style=xlarge&annotated=false`,
      annotUrl: `/images/${imageId}?style=xlarge&annotated=true`
    };
  });

  const selectedNums = parseInclude(INCLUDE, allImages.length);
  const selectedSet = new Set(selectedNums);
  const selectedImages = allImages.filter((x) => selectedSet.has(x.originalIndex));
  const cases = buildCases(selectedNums);
  const byIndex = new Map(allImages.map((x) => [x.originalIndex, x]));

  /**********************
   * 3) BUILD OUTPUT
   **********************/
  const out =
`${buildTopicBlock(articleTitle)}

${buildWorkflowContext({
  hasImagesOnPage: allImages.length > 0,
  selectedCount: selectedImages.length
})}

=== PROMPT ===
${PROMPT_TEXT}

=== ARTICLE ===
${articleTitle ? `TITLE: ${articleTitle}\n\n` : ""}${articleOutline || "[Article extraction failed]"}

${buildImagesBlock(cases, byIndex)}
`;

  safeCopy(out);

  if (selectedImages.length) {
    console.table(
      selectedImages.map((x) => ({
        originalIndex: x.originalIndex,
        baseName: x.baseName,
        plain: x.plainFilename,
        annot: x.annotFilename,
        captionLength: (x.caption || "").length,
        imageId: x.imageId
      }))
    );
  }

  console.log(
    "Copied to clipboard: WORKFLOW CONTEXT + PROMPT + ARTICLE + optional IMAGES block."
  );

  /**********************
   * 4) OPTIONAL DOWNLOADS
   **********************/
  const runDownloads = async () => {
    const ordered = cases.flat().map((n) => byIndex.get(n)).filter(Boolean);
    if (!ordered.length) {
      console.log("No images selected for download. NORMAL engine workflow continues without image assets.");
      return;
    }

    for (const img of ordered) {
      if (DOWNLOAD_PLAIN) await downloadOne(img.plainUrl, img.plainFilename);
      if (DOWNLOAD_ANNOTATED) await downloadOne(img.annotUrl, img.annotFilename);
    }
    console.log(
      `Download complete. Files named like ${resolvedFilePrefix}2.jpg and ${resolvedFilePrefix}2_annot.jpg.`
    );
  };

  if (DOWNLOAD_IMAGES) {
    runDownloads();
  }

  return {
    copiedChars: out.length,
    totalImagesOnPage: allImages.length,
    selectedImages: selectedNums,
    cases,
    downloadsEnabled: DOWNLOAD_IMAGES,
    autoFilePrefixFromTitle: AUTO_FILE_PREFIX_FROM_TITLE,
    articleTitle,
    sourceNote: SOURCE_NOTE,
    coreNote: CORE_NOTE
  };
})();
