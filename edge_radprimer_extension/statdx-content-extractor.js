(() => {
  if (window.__statdxPromptRunnerInstalled) return;
  window.__statdxPromptRunnerInstalled = true;

  const cleanText = (text) => String(text || "").replace(/\s+/g, " ").trim();

  const buildImaiosLabelRepositoryBlock = (repository, title, articleOutline) => {
    const modules = Object.values(repository?.moduleLabels || {})
      .filter((module) => module && Array.isArray(module.labels) && module.labels.length);
    if (!modules.length) return "";

    const haystack = `${title || ""} ${String(articleOutline || "").slice(0, 4000)}`.toLowerCase();
    const tokens = Array.from(new Set((haystack.match(/[a-z][a-z0-9-]{3,}/g) || [])
      .filter((token) => !/^(with|from|this|that|which|when|then|they|their|image|figure|radiograph|computed|tomography|magnetic|resonance)$/i.test(token))));

    const scored = modules.map((module) => {
      const moduleText = `${module.name || ""} ${module.key || ""} ${module.url || ""}`.toLowerCase();
      const labelText = module.labels.slice(0, 250).join(" ").toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (moduleText.includes(token)) score += 4;
        if (labelText.includes(token)) score += 1;
      }
      return { module, score };
    }).sort((a, b) => b.score - a.score);

    const moduleBlocks = scored.map(({ module, score }) => [
      `MODULE = ${module.name || module.key || "IMaios module"}`,
      `MODULE_KEY = ${module.key || ""}`,
      module.url ? `URL = ${module.url}` : "",
      `MATCH_SCORE = ${score}`,
      "AVAILABLE_LABELS:",
      ...module.labels
    ].filter(Boolean).join("\n"));

    return [
      "=== IMAIOS LABEL REPOSITORY ===",
      "Use this as the available IMaios label universe for the IMaios anatomy output.",
      "Choose exact labels from these lists when possible. If a needed anatomy concept has no usable exact/synonym/component match, put it in the gap-review block instead of inventing a label.",
      "",
      ...moduleBlocks
    ].join("\n\n");
  };

  const decodeHtml = (text) => {
    const ta = document.createElement("textarea");
    ta.innerHTML = text ?? "";
    return ta.value;
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const rewriteStatDxArrowSrcToAnki = (html) => {
    return (html || "").replace(
      /<img[^>]*src=['"]\/img\/arrows\/([A-Za-z0-9_]+)\.png['"][^>]*\/?>/g,
      '<img src="arrow_$1.png">'
    );
  };

  const getArticleTitle = () => {
    const candidates = [
      document.querySelector(".document-header__document-title")?.textContent,
      document.querySelector("h1[data-document-id]")?.textContent,
      document.querySelector("meta[name='description']")?.content,
      document.querySelector("head > title")?.textContent
    ];

    for (let title of candidates) {
      title = cleanText(title);
      if (!title) continue;
      title = title.replace(/\s*\|\s*STATdx.*$/i, "").replace(/^Document:\s*/i, "").trim();
      if (title) return title;
    }
    return "";
  };

  const getDocumentId = () => {
    const fromHeader = document.querySelector("[data-document-id]")?.getAttribute("data-document-id");
    if (fromHeader) return fromHeader;
    const match = location.pathname.match(/\/document(?:\/v2)?\/(?:[^/]+\/)?([0-9a-f-]{36})/i);
    return match?.[1] || "";
  };

  const getBreadcrumbTrail = (title) => {
    const selectors = [
      ".breadcrumbs button",
      ".breadcrumbs a",
      "[class*='breadcrumbs'] button",
      "[class*='breadcrumbs'] a"
    ];

    const seen = new Set();
    const trail = [];
    for (const selector of selectors) {
      for (const node of document.querySelectorAll(selector)) {
        let text = cleanText(node.textContent);
        text = text.replace(/\s*\([^)]*\)\s*$/g, "").trim();
        const key = text.toLowerCase();
        if (!text || seen.has(key)) continue;
        if (/return to|breadcrumb|menu/i.test(text)) continue;
        seen.add(key);
        trail.push(text);
      }
      if (trail.length) break;
    }

    if (!trail.length) {
      const keywords = cleanText(document.querySelector("meta[name='keywords']")?.content || "");
      const parts = keywords
        .split(",")
        .map((part) => cleanText(part))
        .filter(Boolean);
      const idx = parts.findIndex((part) => part.toLowerCase() === cleanText(title).toLowerCase());
      if (idx >= 0) trail.push(...parts.slice(Math.max(0, idx - 5), idx + 1));
    }

    const cleanTitle = cleanText(title);
    if (cleanTitle && cleanText(trail.at(-1)).toLowerCase() !== cleanTitle.toLowerCase()) {
      trail.push(cleanTitle);
    }

    return trail;
  };

  const slugifyFilePrefix = (text) => {
    const cleaned = cleanText(text)
      .replace(/^Document:\s*/i, "")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    return cleaned || "statdx_image";
  };

  const parseInclude = (includeValue, maxN, defaultAll = true) => {
    if (Array.isArray(includeValue)) includeValue = includeValue.join(",");
    const raw = String(includeValue ?? "").trim().toLowerCase();
    if (raw === "all" || (defaultAll && !raw)) {
      return Array.from({ length: maxN }, (_, i) => i + 1);
    }
    if (raw === "none" || !raw) return [];

    const includeMatch = raw.match(/include\s*=\s*\[([\s\S]*?)\]/i);
    const numberSource = includeMatch ? includeMatch[1] : raw;
    const nums = (numberSource.match(/\d+/g) || [])
      .map((x) => parseInt(x, 10))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= maxN);

    const seen = new Set();
    return nums.filter((n) => (seen.has(n) ? false : (seen.add(n), true)));
  };

  const parseCaseMap = (value) => {
    if (Array.isArray(value)) return value;
    const raw = String(value || "");
    const caseStart = raw.search(/case_map\s*=/i);
    if (caseStart >= 0 || raw.includes("[[")) {
      const source = caseStart >= 0 ? raw.slice(caseStart) : raw;
      const groups = (source.match(/\[[^\[\]]+\]/g) || [])
        .map((group) =>
          (group.match(/\d+/g) || [])
            .map((n) => parseInt(n, 10))
            .filter((n) => Number.isFinite(n))
        )
        .filter((group) => group.length >= 2);
      if (groups.length) return groups;
    }

    return raw
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

      if (/^h[1-4]$/.test(tag)) {
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

  const getArticleOutline = () => {
    const articleRoot =
      document.querySelector(".sanitized-html.document-text") ||
      document.querySelector(".document-text") ||
      document.querySelector("main #pss-main-content") ||
      document.querySelector("#pss-main-content") ||
      document.querySelector("main");

    if (!articleRoot) throw new Error("Could not find STATdx article text for extraction.");
    const clone = articleRoot.cloneNode(true);
    clone
      .querySelectorAll(
        [
          "script",
          "style",
          "noscript",
          "button",
          "svg",
          ".document-nav",
          ".doc-nav",
          ".media-group",
          ".qa-media-group",
          "#mediaModal",
          "[role='dialog']"
        ].join(",")
      )
      .forEach((el) => el.remove());
    return domToOutline(clone);
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

  const buildBreadcrumbBlock = (breadcrumbTrail) => {
    if (!Array.isArray(breadcrumbTrail) || !breadcrumbTrail.length) return "";
    return ["=== STATDX BREADCRUMB ===", breadcrumbTrail.join(" > ")].join("\n");
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
      "Use Core information only if it is actually supplied in this prompt/user context or retrievable from ChatGPT project/source files in the current run.",
      "If ChatGPT can find the relevant Core pages/section in project/source files, it may use them without asking the user to provide page numbers; it must state the retrieved Core source basis when visible.",
      "If Core cannot be retrieved, proceed from the provided article only and label the deck RadPrimer-only/STATdx-only; do not fabricate Core details or Core + article synthesis."
    ].join("\n");
  };

  const isNarrativeMode = (config) =>
    config?.mode === "narrative" || config?.mode === "narrative_with_images";

  const buildNarrativeSourceModeBlock = (config) => {
    if (!isNarrativeMode(config)) return "";
    return [
      "=== NARRATIVE SOURCE MODE ===",
      "Build this lecture from the current article outline and selected image captions as the authoritative source material.",
      "Hold the article-only narrative to the same craft standard as a fused-source narrative: full source review, image-complete walkthrough, clean organizing spine, source-faithful synthesis, and no unsupported filler.",
      "If the source is thin, be concise and transparent rather than padding the lecture with outside facts."
    ].join("\n");
  };

  const buildSourceAttributionBlock = (config) => {
    const lines = ["=== SOURCE ATTRIBUTION ==="];
    lines.push("Primary source label: STATdx");

    if (isNarrativeMode(config)) {
      if (cleanText(config.sourceNote)) lines.push(`Source note: ${cleanText(config.sourceNote)}`);
      return lines.join("\n");
    }

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

  const buildWorkflowContext = (config, hasImagesOnPage, selectedCount, captionsCaptured) => {
    const lines = ["=== WORKFLOW CONTEXT ==="];
    if (cleanText(config.sourceNote)) lines.push(`Source note: ${cleanText(config.sourceNote)}`);
    if (!isNarrativeMode(config) && cleanText(config.coreNote)) {
      lines.push(`Optional Core note: ${cleanText(config.coreNote)}`);
    }

    if (config.mode === "captions_only") {
      lines.push(
        `Image workflow: captions extracted as supplemental source text only from ${selectedCount} selected STATdx gallery item(s).`
      );
    } else if (hasImagesOnPage && selectedCount > 0) {
      lines.push(`Image workflow: ${selectedCount} STATdx image(s) selected for optional image-based extraction.`);
    } else {
      lines.push("Image workflow: No usable images selected or available.");
    }

    lines.push(
      captionsCaptured
        ? "STATdx caption state: caption cards were visible/captured from the page."
        : "STATdx caption state: full caption cards were not visible; image captions may be missing unless the page is switched to Caption view."
    );

    return lines.join("\n");
  };

  const extractIdFromUrl = (url) => {
    const match = String(url || "").match(/\/image(?:\/thumbnail)?\/([0-9a-f-]{36})/i);
    return match?.[1] || "";
  };

  const normalizeCaption = (rawHtml, config) => {
    let caption = rewriteStatDxArrowSrcToAnki(rawHtml || "").trim();
    caption = decodeHtml(caption);
    if (!config.keepCaptionHtml) {
      if (config.stripArrowTags) caption = caption.replace(/<img[^>]*\/?>/gi, "");
      caption = cleanText(caption);
    }
    return caption;
  };

  const clickCaptionViewIfAvailable = async () => {
    if (document.querySelectorAll(".qa-media-card__caption, .media-card__caption").length > 1) {
      return true;
    }

    const buttons = Array.from(document.querySelectorAll("button"));
    const captionButton = buttons.find((button) => cleanText(button.textContent).toLowerCase() === "caption");
    if (!captionButton) return false;

    captionButton.click();
    const start = Date.now();
    while (Date.now() - start < 3000) {
      if (document.querySelectorAll(".qa-media-card__caption, .media-card__caption").length > 1) {
        return true;
      }
      await sleep(150);
    }
    return document.querySelectorAll(".qa-media-card__caption, .media-card__caption").length > 0;
  };

  const buildCaptionMapFromMediaCards = (config) => {
    const map = new Map();
    const cards = Array.from(document.querySelectorAll(".media-card, .qa-media-card"));
    for (const card of cards) {
      const id =
        (card.querySelector("[id^='media-']")?.id || "").replace(/^media-/, "") ||
        extractIdFromUrl(card.querySelector("img[src*='/image/']")?.getAttribute("src"));
      if (!id) continue;

      const captionEl = card.querySelector(".qa-media-card__caption, .media-card__caption");
      const rawCaption = captionEl?.innerHTML || "";
      if (cleanText(rawCaption)) map.set(id, normalizeCaption(rawCaption, config));
    }
    return map;
  };

  const buildCaptionMapFromModal = (config) => {
    const map = new Map();
    const infoBlocks = Array.from(document.querySelectorAll("[id^='imageCaptionId-']"));
    for (const block of infoBlocks) {
      const id = block.id.replace(/^imageCaptionId-/, "");
      const captionEl = block.querySelector(".qa-imageCaption, .image-overlay-caption") || block;
      const rawCaption = captionEl?.innerHTML || "";
      if (id && cleanText(rawCaption)) map.set(id, normalizeCaption(rawCaption, config));
    }
    return map;
  };

  const getImageIdsInOrder = (config = {}) => {
    const ids = [];
    const add = (id) => {
      if (!id || ids.includes(id)) return;
      ids.push(id);
    };

    document.querySelectorAll(".media-card img[src*='/image/'], .qa-media-card img[src*='/image/']").forEach((img) => {
      add(extractIdFromUrl(img.getAttribute("src")));
    });

    document.querySelectorAll(config.sourceLibrary ? ".case img[src*='/image/'], .qa-case img[src*='/image/']" : "img[src*='/image/thumbnail/'], img[src^='/image/']").forEach((img) => {
      add(extractIdFromUrl(img.getAttribute("src")));
    });

    return ids;
  };

  const getImages = async (config, title) => {
    const captionViewReady = await clickCaptionViewIfAvailable();
    const captionMap = new Map([
      ...buildCaptionMapFromMediaCards(config),
      ...buildCaptionMapFromModal(config)
    ]);
    const ids = getImageIdsInOrder(config);
    const resolvedFilePrefix = slugifyFilePrefix(title);

    return {
      captionViewReady,
      images: ids.map((imageId, idx0) => {
        const originalIndex = idx0 + 1;
        const baseName = `${resolvedFilePrefix}${originalIndex}`;
        const caption =
          captionMap.get(imageId) ||
          "[STATdx caption not captured. Switch the article image panel to Caption view, then run extraction again if captions are needed.]";

        return {
          originalIndex,
          imageId,
          caption,
          baseName,
          plainFilename: `${baseName}.jpg`,
          annotFilename: `${baseName}_annot.jpg`,
          plainUrl: new URL(`/image/thumbnail/${imageId}?size=1000&quality=90`, location.origin).href,
          annotUrl: new URL(`/image/thumbnail/${imageId}?annotated=true&size=1000&quality=90`, location.origin).href
        };
      })
    };
  };

  const buildImagesBlock = (config, cases, byIndex) => {
    const optional = config.engine === "normal" ? "optional; " : "";
    const lines = [`=== IMAGES (${optional}selected; original numbering preserved) ===`];
    if (!cases.length) {
      lines.push("No image blocks selected for this run.");
      return lines.join("\n");
    }

    const hasExplicitCaseMap = parseCaseMap(config.caseMap).some((group) => group.length >= 2);
    const labelPrefix =
      config.engine === "normal" && (config.forceCaseLabels || hasExplicitCaseMap)
        ? "CASE"
        : hasExplicitCaseMap
          ? "CASE"
          : "IMAGE";

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

  const buildOutput = async (rawConfig) => {
    const config = {
      ...rawConfig,
      primarySourceLabel: "STATdx"
    };
    const title = getArticleTitle();
    const documentId = getDocumentId();
    const breadcrumbTrail = getBreadcrumbTrail(title);
    const headerBlock = [buildTopicBlock(title), buildBreadcrumbBlock(breadcrumbTrail)]
      .filter(Boolean)
      .join("\n\n");
    const articleOutline = getArticleOutline();
    const { images: allImages, captionViewReady } = await getImages(config, title);

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
    const imaiosLabelRepositoryBlock = buildImaiosLabelRepositoryBlock(
      config.imaiosLabelRepository,
      title,
      articleOutline
    );
    if (config.engine === "normal") {
      const imageBlock =
        config.mode === "captions_only"
          ? buildCaptionsOnlyBlock(selectedImages)
          : buildImagesBlock(config, cases, byIndex);

      output = `${headerBlock}

${buildNarrativeSourceModeBlock(config)}

${buildWorkflowContext(config, allImages.length > 0, selectedImages.length, captionViewReady)}

=== PROMPT ===
${config.promptText}

=== ARTICLE ===
${title ? `TITLE: ${title}\n\n` : ""}${articleOutline || "[Article extraction failed]"}

${imaiosLabelRepositoryBlock ? `${imaiosLabelRepositoryBlock}\n\n` : ""}
${imageBlock}

${buildSourceAttributionBlock(config)}
`;
    } else {
      const coreValidationBlock =
        config.mode === "narrative" ? "" : `\n\n=== CORE VALIDATION INPUT ===\n${buildCoreGatePreamble(config)}`;

      output = `${headerBlock}

${buildNarrativeSourceModeBlock(config)}${coreValidationBlock}

=== PROMPT ===
${config.promptText}

=== ARTICLE ===
${title ? `TITLE: ${title}\n\n` : ""}${articleOutline || "[Article extraction failed]"}

${imaiosLabelRepositoryBlock ? `${imaiosLabelRepositoryBlock}\n\n` : ""}
${buildImagesBlock(config, cases, byIndex)}

${buildSourceAttributionBlock(config)}
`;
    }

    const downloadFiles = [];
    if (config.downloadImages) {
      const ordered = cases.flat().map((n) => byIndex.get(n)).filter(Boolean);
      for (const image of ordered) {
        if (config.downloadPlain) {
          downloadFiles.push({
            url: image.plainUrl,
            filename: image.plainFilename,
            imageNumber: image.originalIndex,
            imageId: image.imageId,
            baseName: image.baseName,
            variant: "plain",
            sourceKind: "statdx",
            sourceLabel: "STATdx",
            caption: image.caption
          });
        }
        if (config.downloadAnnotated) {
          downloadFiles.push({
            url: image.annotUrl,
            filename: image.annotFilename,
            imageNumber: image.originalIndex,
            imageId: image.imageId,
            baseName: image.baseName,
            variant: "annotated",
            sourceKind: "statdx",
            sourceLabel: "STATdx",
            caption: image.caption
          });
        }
      }
    }

    return {
      output,
      downloadFiles,
      meta: {
        title,
        documentId,
        sourceKind: "statdx",
        primarySourceLabel: "STATdx",
        breadcrumbTrail,
        totalImagesOnPage: allImages.length,
        selectedImages: selectedNums,
        cases,
        captionsCaptured: captionViewReady,
        outputChars: output.length
      }
    };
  };

  // Source-library mode uses the same title, breadcrumb, image ordering, Caption
  // view and full-size image URL helpers as the existing prompt/export workflow.
  // It adds lossless source HTML and section bookkeeping without Anki rewrites.
  const buildSourceLibraryCapture = async (metadataOnly = false) => {
    const header = document.querySelector('h1[data-document-id], .document-header__document-title');
    const id = header?.getAttribute('data-document-id') || getDocumentId();
    const title = getArticleTitle();
    const section = location.pathname.match(/\/(references|cases|anatomy|ddx)\/?$/)?.[1] || 'article';
    const result = {kind:'article',sourceKind:'statdx',id,title,url:location.href,section,collectedAt:new Date().toISOString(),
      breadcrumbs:getBreadcrumbTrail(title),authors:[...document.querySelectorAll('.document-header__author-link, .qa-document-author-link')].map(n=>cleanText(n.textContent)),
      images:[],resources:[],headings:[],relatedArticles:[],errors:[],expectedImages:0};
    if(!header || !id || !title || document.querySelector('.document-page__content--desktop [role="alert"]')?.textContent.includes('Loading'))return {...result,kind:'unavailable'};
    if(metadataOnly)return result;
    const roots = [...document.querySelectorAll(section==='references'?'.selected-references':section==='cases'?'.case-group, .qa-case-group':section==='anatomy'||section==='ddx'?'.document-related':'.sanitized-html.document-text, .document-text')];
    let root=roots[0];
    // Case categories can occupy separate sibling groups; archive their common
    // container so none disappear merely because they are in a later category.
    if(root)while(!roots.every(n=>root.contains(n)))root=root.parentElement;
    if(!root)return {...result,kind:'unavailable'};
    const mainUrl = new URL('/document/v2/'+id,location.origin).href;
    result.sectionLinks=[...new Map([...document.querySelectorAll('a[href]')].flatMap(a=>{
      const match=new URL(a.href).pathname.match(new RegExp('^/document/(?:v2/|[^/]+/)?'+id+'/(references|cases|anatomy|ddx)/?$','i'));
      return match?[[match[1],{section:match[1],url:mainUrl+'/'+match[1],count:Number(cleanText(a.textContent).match(/\((\d+)\)/)?.[1]) || 0}]]:[];
    })).values()];
    const resources=new Map();
    const cleanHtml=html=>{
      const box=document.createElement('div');box.innerHTML=html;
      box.querySelectorAll('script,style,noscript,iframe,object,embed,form,input,select,textarea,link,meta,svg,canvas').forEach(n=>n.remove());
      box.querySelectorAll('button').forEach(n=>n.replaceWith(document.createTextNode(n.textContent)));
      for(const n of box.querySelectorAll('*')){
        for(const a of [...n.attributes])if(!['href','src','alt','title','colspan','rowspan','id'].includes(a.name))n.removeAttribute(a.name);
        if(n.hasAttribute('href')){try{const u=new URL(n.getAttribute('href'),location.href);if(!['http:','https:'].includes(u.protocol))throw Error();n.setAttribute('href',u.href);n.setAttribute('rel','noreferrer');}catch{n.removeAttribute('href');}}
        if(n.hasAttribute('src')){try{const u=new URL(n.getAttribute('src'),location.href);if(n.tagName!=='IMG'||u.origin!==location.origin||!/^\/(img|image)\//.test(u.pathname))throw Error();n.setAttribute('src',u.href);resources.set(u.href,{url:u.href,alt:n.alt || 'Inline source image'});}catch{n.replaceWith(document.createTextNode('[Source image unavailable]'));}}
      }
      return box.innerHTML;
    };
    const textOf=html=>{const box=document.createElement('div');box.innerHTML=html;box.querySelectorAll('img').forEach(n=>n.replaceWith(document.createTextNode(' ['+(n.alt || 'image')+'] ')));box.querySelectorAll('li,p,h1,h2,h3,h4,h5,h6,div,tr,br').forEach(n=>{n.prepend('\n');n.append('\n');});return box.textContent.replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();};
    const totals=[...document.querySelectorAll('.gallery-aria-live-announcement')].map(n=>Number(n.textContent.match(/of\s+(\d+)/i)?.[1])).filter(Number.isFinite);
    if(section==='cases'){
      for(const c of root.querySelectorAll('.case, .qa-case'))if(!c.querySelector('.case__information'))c.querySelector('.case__toggle-button')?.click();
      const until=Date.now()+5000;
      while(Date.now()<until && [...root.querySelectorAll('.case, .qa-case')].some(c=>!c.querySelector('.case__information')))await sleep(100);
    }
    if(section==='article'||section==='cases'){
      const captured=await getImages({keepCaptionHtml:true,sourceLibrary:true},title);
      const byId=new Map(captured.images.map(i=>[i.imageId,i]));
      const occurrences=[...document.querySelectorAll(section==='cases'?'.case img[src*="/image/"], .qa-case img[src*="/image/"]':'.media-card img[src*="/image/"], .qa-media-card img[src*="/image/"]')].filter(img=>!img.closest('.document-card') && byId.has(extractIdFromUrl(img.getAttribute('src'))));
      result.images=occurrences.map((img,index)=>{
        const i=byId.get(extractIdFromUrl(img.getAttribute('src')));
        const card=img?.closest('.media-card, .qa-media-card'),c=img?.closest('.case, .qa-case');
        const caption=card?.querySelector('.qa-media-card__caption, .media-card__caption') || c?.querySelector('.qa-case__data--description .sanitized-html, .qa-case__data--description');
        const rawCaption=caption?.innerHTML || '',captionHtml=cleanHtml(rawCaption);
        const group=cleanText(card?.querySelector('.media-card__title')?.textContent || c?.querySelector('.case__name')?.textContent || img?.closest('.media-group, .qa-media-group')?.querySelector('h2,h3,h4')?.textContent);
        return {number:index+1,id:i.imageId,group,groupImageNumber:Number(img?.alt?.match(/image\s+(\d+)\s+of/i)?.[1]) || index+1,
          captionScope:c?'case':'image',rawCaption,captionHtml,captionText:textOf(captionHtml),plainUrl:i.plainUrl,annotatedUrl:i.annotUrl};
      });
      result.expectedImages=section==='article' && totals.length?totals.reduce((a,b)=>a+b,0):result.images.length;
      result.countBasis=totals.length&&section==='article'?'native gallery totals':'all image IDs exposed by the source Caption/case view';
      if(result.images.length!==result.expectedImages)result.errors.push('Gallery count mismatch: '+result.images.length+' of '+result.expectedImages+' images captured.');
      for(const i of result.images)if(!i.captionText)result.errors.push('Image '+i.number+' has no captured caption.');
    }
    const copy=root.cloneNode(true);
    // Gallery images are saved as full-size pairs below, not inline thumbnails.
    copy.querySelectorAll('.image-gallery, .media-card, .qa-media-card, .Gallery, .gallery, .document-card img').forEach(n=>n.remove());
    result.sourceHtml=root.innerHTML;
    result.articleHtml=cleanHtml(copy.innerHTML);result.articleText=textOf(result.articleHtml);
    result.headings=[...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(n=>({level:Number(n.tagName[1]),text:cleanText(n.textContent)}));
    if(!result.articleText)result.errors.push('No source text was captured.');
    if(section==='cases'){
      const cases=[...root.querySelectorAll('.case, .qa-case')];
      const expected=result.sectionLinks.find(l=>l.section===section)?.count;
      if(expected && expected!==cases.length)result.errors.push('Case count mismatch: '+cases.length+' of '+expected+'.');
      for(const c of cases){const images=[...c.querySelectorAll('img[src*="/image/"]')];const expectedImages=Number(images[0]?.alt?.match(/of\s+(\d+)/)?.[1]);if(expectedImages && expectedImages!==images.length)result.errors.push('Incomplete images for '+cleanText(c.querySelector('.case__name')?.textContent));if(!c.querySelector('.case__information'))result.errors.push('Case details did not open.');}
    }
    if(section==='references'){
      const expected=result.sectionLinks.find(l=>l.section===section)?.count;
      if(expected && root.querySelectorAll('ol > li').length!==expected)result.errors.push('Reference count mismatch.');
    }
    for(const card of root.querySelectorAll('.document-card')){
      const a=card.querySelector('.document-card__title-link');if(a)result.relatedArticles.push({id:a.getAttribute('data-document-id'),title:cleanText(a.textContent),url:a.href,section,imageCount:Number(card.querySelector('[data-image-count]')?.getAttribute('data-image-count')) || 0});
    }
    if(section==='anatomy'||section==='ddx'){
      const expected=result.sectionLinks.find(l=>l.section===section)?.count;
      if(expected && expected!==result.relatedArticles.length)result.errors.push('Related article count mismatch.');
    }
    result.resources=[...resources.values()];return result;
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if(message?.type==='SOURCE_LIBRARY_STATDX_CAPTURE'){
      buildSourceLibraryCapture(Boolean(message.metadataOnly)).then(result=>sendResponse({ok:true,result})).catch(error=>sendResponse({ok:false,error:error.message}));
      return true;
    }
    if (message?.type !== "RADPRIMER_EXTRACT") return false;

    (async () => {
      try {
        sendResponse({ ok: true, ...(await buildOutput(message.config || {})) });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();

    return true;
  });
})();
