(() => {
  /**********************************************************************
   RADPrimer → “One Shot” Exporter (Article + Captions + Optional Downloads)
   ----------------------------------------------------------------------
   ✅ Copies to clipboard:
      1) CORE VALIDATION INPUT (auto from toggles below)
      2) YOUR PROMPT (customizable below)
      3) ARTICLE (structured outline, page-like hierarchy)
      4) IMAGES (your selected original image numbers, with filenames + captions)
         - Includes BOTH plain + annotated filenames per image (if enabled)
  **********************************************************************/

  /**********************
   * SETTINGS YOU EDIT
   **********************/
  const FILE_PREFIX = "KidneyRCC"; // <-- change per document
  const INCLUDE = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]; // "all" OR "2,4,5,8"
  const CASE_MAP = [[5,6],[7,8],[9,10,11,12],[13,14],[15,16]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)
  const DOWNLOAD_IMAGES = true; // set false if you only want copy-to-clipboard
  const DOWNLOAD_PLAIN = true; // plain (no arrows)
  const DOWNLOAD_ANNOTATED = true; // annotated (with arrows)
  const DOWNLOAD_DELAY_MS = 1000; // 1 second delay between downloads

  // Captions: remove inline arrow <img> tags from caption text?
  const STRIP_ARROW_TAGS_IN_CAPTION_TEXT = false;
  const KEEP_CAPTION_HTML = true;

  /**********************************************************************
   * ✅ NEW: CORE VALIDATION / GAP TOGGLES (EDIT THESE EACH RUN)
   *
   * If CORE_GAP = true:
   *   Script injects your required Pathway B line:
   *   “Core GAP: Topic not explicitly covered in Core Radiology; cards derived from RadPrimer/STATdx only.”
   *
   * If CORE_GAP = false:
   *   Script injects your Pathway A coverage line using CORE_SECTION + CORE_PAGES.
   **********************************************************************/


  /**********************
   * YOUR PROMPT (AUTO-INJECTED BY YOUR PYTHON BUILDER)
   **********************/
  const PROMPT_TEXT =
`=== PROMPTTEXT ===`;

  /**********************
   * HELPERS
   **********************/
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const decodeHtml = (s) => {
    const ta = document.createElement("textarea");
    ta.innerHTML = s ?? "";
    return ta.value;
  };

  const rewriteRadPrimerArrowSrcToAnki = (html) => {
    return (html || "").replace(
      /<img[^>]*src=['"]\/img\/arrows\/([A-Za-z0-9_]+)\.png['"][^>]*\/?>/g,
      '<img src="arrow_$1.png">'
    );
  };

  const parseInclude = (includeStr, maxN) => {
    const s = String(includeStr || "").trim().toLowerCase();
    if (!s || s === "all") return Array.from({ length: maxN }, (_, i) => i + 1);

    const nums = s
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

  const buildCases = (selectedNums) => {
    const selectedSet = new Set(selectedNums);

    const normalizedGroups = (Array.isArray(CASE_MAP) ? CASE_MAP : [])
      .map((grp) =>
        (Array.isArray(grp) ? grp : [])
          .map((n) => parseInt(n, 10))
          .filter((n) => selectedSet.has(n))
      )
      .filter((grp) => grp.length >= 2);

    const used = new Set();
    normalizedGroups.forEach((grp) => grp.forEach((n) => used.add(n)));

    const singles = selectedNums.filter((n) => !used.has(n)).map((n) => [n]);

    const cases = [...normalizedGroups, ...singles];

    const seen = new Set();
    const deduped = [];
    for (const grp of cases) {
      const cleaned = grp.filter((n) => (seen.has(n) ? false : (seen.add(n), true)));
      if (cleaned.length) deduped.push(cleaned);
    }

    return deduped;
  };

  const safeCopy = (text) => {
    try {
      copy(text);
      return true;
    } catch (e) {
      console.warn("copy() failed; you can manually copy from console output.", e);
      return false;
    }
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
        let n = headerContainer;
        while (n) {
          const next = n.nextSibling;
          n.remove();
          n = next;
        }
      } else {
        refHeading.remove();
      }
    }
  };

  /**********************
   * ✅ NEW: CORE PREAMBLE BUILDER (AUTO-INJECTED)
   **********************/
  const buildCoreGatePreamble = () => {
    if (CORE_GAP) {
      return [
        "Core GAP: Topic not explicitly covered in Core Radiology; cards derived from RadPrimer/STATdx only."
      ].join("\n");
    }

    // Pathway A: user declares pages/section
    const section = String(CORE_SECTION || "").trim();
    const pages = String(CORE_PAGES || "").trim();

    // Keep it simple + explicit.
    // (Even if left blank, it won’t break the script; you’ll just see blanks in the output.)
    return [
      `Core coverage confirmed by user: ${section || "[SECTION NOT PROVIDED]"}`,
      `Core pages (user-provided): ${pages || "[PAGES NOT PROVIDED]"}`
    ].join("\n");
  };

  /**********************
   * 1) CAPTIONS + IMAGE IDS (from thumbnails)
   **********************/
  const thumbs = Array.from(document.querySelectorAll("#gallery img[data-caption]"));
  if (!thumbs.length) {
    console.warn("No #gallery img[data-caption] found. Make sure you're on the document page with the image rail loaded.");
    return;
  }

  const allImages = thumbs.map((img, idx0) => {
    const originalIndex = idx0 + 1;
    const a = img.closest("a[rel]");
    const imageId = a ? a.getAttribute("rel") : "";
    const raw = img.getAttribute("data-caption") || "";

    let captionDecoded = decodeHtml(raw).trim();
    captionDecoded = rewriteRadPrimerArrowSrcToAnki(captionDecoded);

    if (!KEEP_CAPTION_HTML) {
      if (STRIP_ARROW_TAGS_IN_CAPTION_TEXT) {
        captionDecoded = captionDecoded.replace(/<img[^>]*\/?>/gi, "");
      }
      captionDecoded = captionDecoded.replace(/\s+/g, " ").trim();
    }

    const baseName = `${FILE_PREFIX}${originalIndex}`;
    const plainFilename = `${baseName}.jpg`;
    const annotFilename = `${baseName}_annot.jpg`;

    const plainUrl = `/images/${imageId}?style=xlarge&annotated=false`;
    const annotUrl = `/images/${imageId}?style=xlarge&annotated=true`;

    return {
      originalIndex,
      imageId,
      caption: captionDecoded,
      baseName,
      plainFilename,
      annotFilename,
      plainUrl,
      annotUrl
    };
  });

  const selectedNums = parseInclude(INCLUDE, allImages.length);
  const selectedSet = new Set(selectedNums);

  const selectedImages = allImages.filter((x) => selectedSet.has(x.originalIndex));
  if (!selectedImages.length) {
    console.warn("Selection resulted in 0 images. Check INCLUDE setting.");
    return;
  }

  /**********************
   * 2) ARTICLE (structured outline, no references/links section)
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

  const articleOutline = domToOutline(clone);

  /**********************
   * 3) GROUP CASES
   **********************/
  const cases = buildCases(selectedNums);
  const byIndex = new Map(allImages.map((x) => [x.originalIndex, x]));

  const buildImagesBlock = () => {
    const lines = [];
    lines.push("=== IMAGES (selected; original numbering preserved) ===");

    cases.forEach((grp, caseIdx) => {
      const caseLabel = `CASE_${String(caseIdx + 1).padStart(2, "0")}`;
      lines.push("");
      lines.push(`${caseLabel}: ${grp.join(", ")}`);

      grp.forEach((n) => {
        const item = byIndex.get(n);
        if (!item) return;

        lines.push(`  ${item.baseName}`);
        if (DOWNLOAD_PLAIN) lines.push(`    Image: ${item.plainFilename}`);
        if (DOWNLOAD_ANNOTATED) lines.push(`    Image_Annotated: ${item.annotFilename}`);
        lines.push(`    Caption: ${item.caption}`);
      });
    });

    return lines.join("\n").trim();
  };

  /**********************
   * 4) BUILD ONE-SHOT OUTPUT (Core Gate + Prompt + Article + Images)
   **********************/
  const out =
`=== CORE VALIDATION INPUT ===
${buildCoreGatePreamble()}

=== PROMPT ===
${PROMPT_TEXT}

=== ARTICLE ===
${articleOutline || "[Article extraction failed]"}

${buildImagesBlock()}
`;

  safeCopy(out);

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

  console.log("✅ Copied to clipboard: CORE VALIDATION INPUT + PROMPT + ARTICLE (no references) + IMAGES (selected, original numbering preserved).");

  /**********************
   * 5) OPTIONAL: DOWNLOAD IMAGES (with delay)
   **********************/
  const downloadOne = async (href, filename) => {
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    await sleep(DOWNLOAD_DELAY_MS);
  };

  const runDownloads = async () => {
    const ordered = cases.flat().map((n) => byIndex.get(n)).filter(Boolean);

    for (const img of ordered) {
      if (DOWNLOAD_PLAIN) await downloadOne(img.plainUrl, img.plainFilename);
      if (DOWNLOAD_ANNOTATED) await downloadOne(img.annotUrl, img.annotFilename);
    }
    console.log(`✅ Download complete. Files named like ${FILE_PREFIX}2.jpg and ${FILE_PREFIX}2_annot.jpg (original numbering preserved).`);
  };

  if (DOWNLOAD_IMAGES) runDownloads();

  return {
    copiedChars: out.length,
    totalImagesOnPage: allImages.length,
    selected: selectedNums,
    cases,
    downloadsEnabled: DOWNLOAD_IMAGES,
    downloadDelayMs: DOWNLOAD_DELAY_MS,
    coreGap: CORE_GAP,
    coreSection: CORE_SECTION,
    corePages: CORE_PAGES
  };
})();