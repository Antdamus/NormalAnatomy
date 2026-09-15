/* Shared contract for the organizer, narrator, study page and live reader. */
(function (root) {
  "use strict";
  const normalized = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const requireText = (value, label) => {
    if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${label}.`);
    return value.trim();
  };
  function parseJSON(text) {
    const raw = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try { return JSON.parse(raw); } catch { throw new Error("The response is not complete JSON. The saved draft can be retried."); }
  }
  function normalizeRelationship(item) {
    const original = String(item.relationship || "").trim();
    const label = normalized(original);
    if (["single image", "same patient", "comparison"].includes(label)) return label;
    // Descriptions of distinct/unlinked cases are still comparisons. Never turn
    // a negative same-patient statement into a positive patient-identity claim.
    if (/^(?:conceptual )?(?:modality )?comparison\b/.test(label) &&
        (!/same patient/.test(label) || /same patient (?:relationship )?(?:not |is not |unknown|unconfirmed)/.test(label))) return "comparison";
    if (item.imageIds?.length === 1 && /^(?:single|one)\b/.test(label) && /\b(?:image|composite)\b/.test(label)) return "single image";
    if (/^same patient\b/.test(label) && !/\b(?:not|unknown|unconfirmed|uncertain)\b/.test(label)) return "same patient";
    return original;
  }
  function captionModalityLabel(image) {
    // Recover only a modality explicitly named in this image's caption. A list
    // of modalities for a whole comparison does not establish their mapping.
    const text = spokenCaption(image?.caption || image?.captionHtml);
    const lead = text.split(/\b(?:shows?|demonstrates?|illustrates?|depicts?|reveals?|confirms?)\b/i)[0].trim();
    if (lead.length <= 150 && /\b(?:CECT|NECT|CT|MR|MRI|MRCP|ERCP|GRE|ultrasound|sonograph\w*|angiogra\w*|graphic|illustration)\b/i.test(lead)) return lead;
    return "See original caption for modality";
  }
  function validatePlan(plan, registry, sourceText) {
    if (plan?.schemaVersion !== 1) throw new Error("Unsupported visual lecture plan version.");
    requireText(plan.title, "topic title");
    requireText(plan.orientation, "orientation");
    if (!Array.isArray(plan.patterns) || !plan.patterns.length || !Array.isArray(plan.cases) || !plan.cases.length) {
      throw new Error("The organizer must include patterns and illustrated cases.");
    }
    const images = new Map(registry.map(image => [image.masterImageId, image]));
    const unique = (items, label) => {
      const ids = items.map(item => requireText(item.id, `${label} id`));
      if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${label} ids.`);
      return new Set(ids);
    };
    const patterns = unique(plan.patterns, "pattern");
    const cases = unique(plan.cases, "case");
    const checkImages = (ids, label) => {
      if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) throw new Error(`${label} needs distinct image references.`);
      for (const id of ids) if (!images.has(id)) throw new Error(`Unknown image ${id} in ${label}.`);
    };
    for (const pattern of plan.patterns) {
      requireText(pattern.label, "pattern label");
      requireText(pattern.cue, "visible pattern cue");
      checkImages(pattern.overviewImageIds, pattern.label);
      if (!plan.cases.some(c => c.patternId === pattern.id)) throw new Error(`${pattern.label} has no cases.`);
      // The same ductal or normal-anatomy image can orient several branches.
      // It must still have a full illustrated case somewhere in the lesson.
      if (pattern.overviewImageIds.some(id => !plan.cases.some(c => c.imageIds?.includes(id)))) throw new Error(`Overview images in ${pattern.label} need an illustrated case in this lesson.`);
    }
    const covered = new Set();
    for (const item of plan.cases) {
      if (!patterns.has(item.patternId)) throw new Error(`Unknown pattern for ${item.id}.`);
      for (const field of ["label", "focus", "discriminator", "sourceBasis"]) requireText(item[field], `case ${field}`);
      checkImages(item.imageIds, item.label);
      const relationship = normalizeRelationship(item);
      if (relationship !== item.relationship) {
        item.relationshipDescription = item.relationship;
        item.relationship = relationship;
      }
      if (!["single image", "same patient", "comparison"].includes(item.relationship)) throw new Error(`Unknown case relationship in ${item.label}.`);
      if (item.relationship === "single image" && item.imageIds.length !== 1) throw new Error("A single-image case cannot contain several images.");
      if (Array.isArray(item.modalityLabels)) {
        if (!item.modalityLabels.length || item.modalityLabels.some(label => typeof label !== "string" || !label.trim())) throw new Error(`Missing modality labels in ${item.label}.`);
        item.modalitySummary = [...item.modalityLabels];
        item.modalityLabelRecovery = "Per-image labels recovered from each original caption; the unassigned model list is retained in modalitySummary.";
        item.modalityLabels = Object.fromEntries(item.imageIds.map(id => [id, captionModalityLabel(images.get(id))]));
      }
      if (!item.modalityLabels || item.imageIds.some(id => typeof item.modalityLabels[id] !== "string" || !item.modalityLabels[id].trim())) throw new Error(`Missing modality labels in ${item.label}.`);
      if (item.relationship === "same patient") {
        const evidence = requireText(item.relationshipEvidence, "same-patient source evidence");
        // Do not let a disease label or an invented grouping establish patient identity.
        const inCaption = item.imageIds.some(id => normalized(images.get(id).caption).includes(normalized(evidence)));
        if (!inCaption || !normalized(sourceText).includes(normalized(evidence)) || !/same patient|same case|this patient|follow.up/i.test(evidence)) {
          throw new Error(`Same-patient evidence for ${item.label} must quote an explicit relationship in the supplied source.`);
        }
      }
      item.imageIds.forEach(id => covered.add(id));
    }
    const omitted = registry.filter(image => image.required !== false && !covered.has(image.masterImageId));
    if (omitted.length) throw new Error(`The map omitted teaching images: ${omitted.map(i => i.masterImageId).join(", ")}.`);
    // A primary atomic group must remain available together in at least one illustrated case.
    for (const image of registry.filter(i => i.required !== false && i.atomicCluster)) {
      const group = (image.clusterImageIds || []).filter(id => images.has(id) && images.get(id).required !== false);
      if (group.length > 1 && !plan.cases.some(c => group.every(id => c.imageIds.includes(id)))) throw new Error(`Atomic group ${group.join(", ")} was split.`);
    }
    if (!Array.isArray(plan.lectureOrder) || plan.lectureOrder.length !== cases.size || new Set(plan.lectureOrder).size !== cases.size || plan.lectureOrder.some(id => !cases.has(id))) {
      throw new Error("Lecture order must include every case exactly once.");
    }
    return plan;
  }
  const ARROW_LABELS = {
    WO: "white open arrow", WS: "white solid arrow", WC: "white curved arrow",
    BO: "black open arrow", BS: "black solid arrow", BC: "black curved arrow",
    CO: "cyan open arrow", CS: "cyan solid arrow", CC: "cyan curved arrow"
  };
  const arrowLabel = code => ARROW_LABELS[String(code || "").toUpperCase()] || "";
  function captionArrowCodes(caption) {
    return [...new Set((String(caption || "").match(/<img\b[^>]*>/gi) || [])
      .map(tag => tag.match(/arrow_([a-z0-9]+)\.png/i)?.[1]?.toUpperCase()).filter(Boolean))];
  }
  function spokenCaption(caption) {
    return String(caption || "").replace(/<img\b[^>]*>/gi, tag => {
      const code = tag.match(/arrow_([a-z0-9]+)\.png/i)?.[1];
      return code ? ` (${arrowLabel(code) || "marked callout"}) ` : " ";
    }).replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
      .replace(/\s+/g, " ").trim();
  }
  const imageReference = image => `${image.sourceLabel} image ${image.sourceImageNumber}`;
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function imageReferences(text, registry) {
    return registry.flatMap(image => [...String(text || "").matchAll(new RegExp(`\\b${escapeRegex(imageReference(image))}\\b`, "gi"))]
      .map(match => ({ imageId: image.masterImageId, index: match.index, end: match.index + match[0].length })))
      .sort((a, b) => a.index - b.index);
  }
  function locateLiveImage(registry, segment, state) {
    if (!segment) return "";
    const references = state.liveContext?.live ? imageReferences(state.liveContext.text, registry) : [];
    const last = references.at(-1);
    const lastImage = registry.find(image => image.masterImageId === last?.imageId);
    // Full article references resolve ambiguity that the legacy source+number
    // pointer cannot express. Its explicit pointer remains authoritative for
    // ordinary single-article narration, where context can contain several refs.
    if (lastImage && !/^(?:RadPrimer|STATdx)$/i.test(lastImage.sourceLabel) && segment.imageIds.includes(last.imageId)) return last.imageId;
    const section = state.lectureSection;
    if (section?.highlightAvailable && /explicit-(live|held)-image/.test(section.source || "")) {
      const candidates = registry.filter(image => segment.imageIds.includes(image.masterImageId) &&
        Number(image.sourceImageNumber) === Number(section.imageNumber) && image.sourceKind === section.sourceKind);
      if (candidates.length === 1) return candidates[0].masterImageId;
      return candidates.some(image => image.masterImageId === last?.imageId) ? last.imageId : "";
    }
    return !section && last && segment.imageIds.includes(last.imageId) ? last.imageId : "";
  }
  function validateArrowCues(text, item, images) {
    if (/<img\b|arrow_[a-z0-9]+\.png/i.test(text)) throw new Error("Narrate arrow color/style in words, not HTML or filenames.");
    const references = imageReferences(text, [...images.values()]);
    for (const id of item.imageIds) {
      const image = images.get(id), codes = captionArrowCodes(image.captionHtml || image.caption);
      if (!codes.length) continue;
      const passages = references.flatMap((match, index) => match.imageId === id
        ? [normalized(text.slice(match.end, references[index + 1]?.index ?? text.length))] : []);
      for (const code of codes) {
        const label = arrowLabel(code);
        const covered = passages.some(passage => {
          if (!label) return /\b(?:callout|marker|arrow)s?\b/.test(passage);
          const [color, style] = label.split(" ");
          // Accept either adjective order, but keep each color/style tied to a nearby arrow.
          return passage.split(" ").some((word, index, words) => /^arrows?$/.test(word) &&
            words.slice(Math.max(0, index - 6), index).includes(color) && words.slice(Math.max(0, index - 6), index).includes(style));
        });
        if (!covered) throw new Error(`${image.sourceLabel} image ${image.sourceImageNumber}: explain the ${label || "source-marked callout"} in that image's narration before moving to the next image.`);
      }
    }
  }
  function validateNarration(value, plan, registry, { requireArrowCues = false } = {}) {
    if (value?.schemaVersion !== 1 || !Array.isArray(value.segments)) throw new Error("Missing structured narration.");
    if (value.segments.length !== plan.lectureOrder.length) throw new Error("Narration does not cover every planned case.");
    const images = new Map(registry.map(i => [i.masterImageId, i]));
    const cases = new Map(plan.cases.map(c => [c.id, c]));
    const patterns = new Map(plan.patterns.map(p => [p.id, p]));
    const segments = value.segments.map((segment, index) => {
      if (segment.caseId !== plan.lectureOrder[index]) throw new Error("Narration changed the planned case order.");
      const item = cases.get(segment.caseId);
      const text = requireText(segment.text, "case narration");
      const references = imageReferences(text, registry);
      for (const id of item.imageIds) {
        const image = images.get(id);
        const label = imageReference(image);
        if (!references.some(reference => reference.imageId === id)) throw new Error(`Narration must explicitly introduce ${label}.`);
      }
      if (references.some(reference => !item.imageIds.includes(reference.imageId))) throw new Error(`Narration references an image outside case ${item.label}.`);
      for (const match of text.matchAll(/\b(RadPrimer|STATdx)\s+image\s+(\d+)\b/gi)) {
        if (!item.imageIds.some(id => {
          const image = images.get(id);
          return image.sourceLabel.toLowerCase() === match[1].toLowerCase() && Number(image.sourceImageNumber) === Number(match[2]);
        })) throw new Error(`Narration references an image outside case ${item.label}.`);
      }
      if (requireArrowCues) validateArrowCues(text, item, images);
      const cue = `${patterns.get(item.patternId).label}. ${item.label}.`;
      return { caseId: item.id, patternId: item.patternId, imageIds: item.imageIds, cue, text: `${cue}\n\n${text}` };
    });
    return { schemaVersion: 1, ...(requireArrowCues ? { arrowCuesVersion: 1 } : {}), segments, text: segments.map(s => s.text).join("\n\n") };
  }
  function locateLiveCase(segments, liveContext) {
    if (!liveContext?.live || !liveContext.text) return null;
    const text = normalized(liveContext.text);
    // Match only text observed at/before the real reader cursor. Never estimate using time.
    for (const length of [220, 140, 80, 40]) {
      if (text.length < length) continue;
      const suffix = text.slice(-length).replace(/^\S*\s/, "");
      const matches = segments.filter(s => normalized(s.text).includes(suffix));
      if (matches.length === 1) return matches[0];
    }
    return null;
  }
  function matchesLectureReader(lesson, state) {
    if (!state?.available || !lesson.narration) return false;
    const title = normalized(state.title);
    if (title && title === normalized(lesson.speechifyTitle)) return true;
    if (state.url && state.url === lesson.speechify?.readerUrl && title && title === normalized(lesson.speechify.boundTitle)) return true;
    if (Number(lesson.narrationRevision || 1) > 1 || !title || title !== normalized(lesson.title)) return false;
    // Legacy notes have no lesson suffix. Require a substantial prose match;
    // a shared topic name or image number alone cannot bind a different lecture.
    const sample = normalized(state.readerTextSample);
    if (lesson.narration.segments.some(segment => {
      const body = segment.cue && segment.text.startsWith(segment.cue + "\n\n") ? segment.text.slice(segment.cue.length + 2) : segment.text;
      const start = normalized(body).slice(0, 220);
      return start.length >= 160 && sample.includes(start);
    })) return true;
    const live = state.liveContext?.live ? normalized(state.liveContext.text) : "";
    if (live.length < 180) return false;
    const suffix = live.slice(-180).replace(/^\S*\s/, "");
    return lesson.narration.segments.filter(segment => normalized(segment.text).includes(suffix)).length === 1;
  }
  const schema = {
    schemaVersion: 1, title: "Topic", orientation: "One sentence: what to look for first.",
    patterns: [{ id: "pattern-a", label: "Visible radiological pattern", cue: "Short observation", overviewImageIds: ["RP-01"] }],
    cases: [{ id: "case-a", patternId: "pattern-a", label: "Case or useful look-alike comparison", relationship: "single image", relationshipEvidence: "", imageIds: ["RP-01"], modalityLabels: { "RP-01": "Modality / sequence" }, focus: "What to look at", discriminator: "What separates it from its closest mimic", sourceBasis: "Source caption / article section" }],
    lectureOrder: ["case-a"]
  };
  function sourceDocument(lesson) {
    const original = String(lesson.sourceText || "");
    const fallback = { text: original, manifest: lesson.sourceMetadata?.masterSource?.manifest || null, compacted: false };
    // Older saved lessons contain the runner's whole envelope: original article
    // text followed by a second image registry and its download/file metadata.
    // Unwrap only our exact envelope, and only after matching its registry to
    // this saved lesson. Never summarize or truncate the original article text.
    if (!original.startsWith("=== MASTER SOURCE MODE ===")) return fallback;
    const sourceMarker = "=== FUSED MASTER SOURCE PACKAGE ===\n";
    const registryMarker = "\n=== MASTER IMAGE REGISTRY ===\n";
    const manifestMarker = "\n=== MASTER SOURCE MANIFEST ===\n";
    const attributionMarker = "\n=== SOURCE ATTRIBUTION ===\n";
    const start = original.indexOf(sourceMarker), registryStart = original.lastIndexOf(registryMarker);
    const manifestStart = original.lastIndexOf(manifestMarker), attributionStart = original.lastIndexOf(attributionMarker);
    if (start < 0 || registryStart <= start || manifestStart <= registryStart || attributionStart <= manifestStart) return fallback;
    try {
      const embedded = JSON.parse(original.slice(registryStart + registryMarker.length, manifestStart));
      const saved = new Map(lesson.registry.map(image => [image.masterImageId, image]));
      if (!Array.isArray(embedded) || embedded.length !== saved.size || new Set(embedded.map(image => image.masterImageId)).size !== saved.size ||
          embedded.some(image => !saved.has(image.masterImageId) || ["caption", "captionHtml"].some(field => String(image[field] || "") !== String(saved.get(image.masterImageId)[field] || "")))) return fallback;
      const manifest = JSON.parse(original.slice(manifestStart + manifestMarker.length, attributionStart));
      const text = original.slice(start + sourceMarker.length, registryStart).trim();
      return text ? { text, manifest, compacted: true } : fallback;
    } catch { return fallback; }
  }
  function sourceContext(lesson) {
    const document = sourceDocument(lesson), manifest = document.manifest;
    if (!manifest) return document.text;
    const context = {};
    for (const field of ["articleTitle", "rationale", "teachingFramework", "coverage", "learningObjectives", "editorialCorrections", "unavailableOrUninspected"]) {
      if (manifest[field] !== undefined) context[field] = manifest[field];
    }
    context.sources = (manifest.sources || []).map(source => Object.fromEntries(
      ["alias", "id", "title", "sourceKind", "sourceLabel", "url", "authors", "addedFor", "relatedArticles", "teachingRole"]
        .filter(field => source[field] !== undefined).map(field => [field, source[field]])));
    return document.text + "\n\n=== SOURCE CONTEXT AND EDITORIAL NOTES ===\n" + JSON.stringify(context);
  }
  function teachingImage(image, narrated = false) {
    // Project only teaching evidence into the model request. The saved registry
    // remains authoritative and keeps every file, hash, URL, variant and caption.
    const record = Object.fromEntries(["masterImageId", "sourceLabel", "sourceArticleId", "sourceImageNumber", "caption", "required", "atomicCluster", "clusterImageIds", "teachingRole"]
      .filter(field => image[field] !== undefined).map(field => [field, image[field]]));
    if (image.captionEditoriallyUpdated) {
      record.captionEditoriallyUpdated = true;
      record.originalCaption = image.captionOriginal || spokenCaption(image.captionHtml);
    }
    if (narrated) {
      record.spokenReference = imageReference(image);
      // The spoken reference retains the full article label and image number.
      delete record.sourceLabel;
      delete record.sourceImageNumber;
      record.arrowCallouts = captionArrowCodes(image.captionHtml || image.caption).map(code => ({ code, label: arrowLabel(code) || "marked callout" }));
      // Plain source captions already include the named inline arrow meanings.
      // Keep HTML captions verbatim when that is the source's only caption form.
      record.spokenCaption = /<img\b/i.test(image.caption || "") ? spokenCaption(image.caption) : undefined;
    }
    return record;
  }
  function planPrompt(lesson) {
    return [
      root.TeachingFramework?.prompt(lesson) || "Use the anatomy/pathology framework recorded in the source.",
      "Create an English visual organizer for a first-exposure radiology lesson. Output ONLY complete JSON, no markdown, no cards and no lecture yet.",
      "Organize by visible radiological appearance first, then modality/sequence behavior, real illustrated cases, and distinctions between look-alikes. For normal anatomy use visible structures, spatial relationships and their modality appearances. Derive the number and names of branches from this topic; do not impose a fixed taxonomy or force a decision algorithm where findings overlap.",
      "The learner previews this map instead of hearing a narrated opening outline. Keep orientation to one sentence, branch labels to a few words, focus/discriminator to one short sentence each. Put detailed reasoning into the later lecture, not the map.",
      'STRICT FIELD CONTRACT: cases[].relationship must be EXACTLY one of "single image", "same patient", or "comparison". Never put a descriptive sentence in this field. Put any additional grouping description in relationshipDescription. A composite stored under one image ID is "single image", regardless of panel count. Use "comparison" for distinct or unlinked patients. Use "same patient" only with the explicit source-caption evidence required below.',
      'cases[].modalityLabels must be an OBJECT keyed by EVERY exact image ID in that case, e.g. {"RP-A02-039":"Coronal MRCP"}. Never return an array or an unassigned list of case modalities. Do not transfer a modality from one comparison image to another. If the individual source does not specify it, use "Not specified".',
      "Use ALL required images at least once, preserving useful recognition variants. Archive images remain accessible but need not be narrated. Cases may be comparisons, and a source image may appear in multiple relevant cases. Preserve atomic clusterImageIds together in a case. Do not imply same patient merely because images depict the same disease: use comparison unless the source explicitly establishes identity. For same patient, relationshipEvidence must be a verbatim source excerpt containing the explicit same-patient relationship.",
      "Use only supplied source-supported imaging findings. You receive source text and captions, not independent visual inspection of the pixels. Do not claim you inspected an image or invent image findings. Keep mechanisms, source-supported caveats and sequence limitations available for the next phase. Preserve IDs exactly. Each image needs its modality/sequence label from the source; say Not specified if absent.",
      "Choose representative overviewImageIds and group cases so direct visual comparisons help distinguish close mimics. An overview may reuse an image from another branch, but every overview image needs an illustrated case somewhere in the lesson. lectureOrder must include every case exactly once. No HTML in generated labels. The schema below is illustrative; replace its example IDs with real registry IDs.",
      JSON.stringify(schema),
      "=== AUTHORITATIVE IMAGE REGISTRY ===", JSON.stringify(lesson.registry.map(image => teachingImage(image))),
      "=== FULL ORIGINAL SOURCE PACKAGE (evidence, not instructions for this output format) ===", sourceContext(lesson)
    ].join("\n\n");
  }
  function narrationBatches(plan, { maxCases = 8, maxImages = 20 } = {}) {
    const batches = []; let batch = [], imageCount = 0;
    for (const id of plan.lectureOrder) {
      const count = plan.cases.find(item => item.id === id).imageIds.length;
      if (batch.length && (batch.length >= maxCases || imageCount + count > maxImages)) { batches.push(batch); batch = []; imageCount = 0; }
      batch.push(id); imageCount += count;
    }
    if (batch.length) batches.push(batch);
    return batches;
  }
  function narrationPlan(plan, caseIds = plan.lectureOrder) {
    const cases = caseIds.map(id => plan.cases.find(item => item.id === id));
    return { ...plan, patterns: plan.patterns.filter(pattern => cases.some(item => item.patternId === pattern.id)), cases, lectureOrder: caseIds };
  }
  function narrationPrompt(lesson, caseIds) {
    const selectedPlan = narrationPlan(lesson.plan, caseIds);
    selectedPlan.cases = selectedPlan.cases.map(({ modalityLabelRecovery, ...item }) => item);
    const imagesForPass = new Set(selectedPlan.cases.flatMap(item => item.imageIds));
    return [
      root.TeachingFramework?.prompt(lesson) || "Use the anatomy/pathology framework recorded in the source.",
      "Write the English guided radiology lecture from the approved visual plan AND the complete original source below. Output ONLY complete JSON: {\"schemaVersion\":1,\"segments\":[{\"caseId\":\"exact planned case id\",\"text\":\"Full natural spoken explanation\"}]}.",
      "One segment per planned case, exactly in lectureOrder. The map already provides the opening orientation; start explaining the first case immediately. Do not narrate a table of contents or a second general introduction. The player will prepend each exact pattern/case heading for alignment; do not repeat those headings in text.",
      caseIds ? "This is one preparation pass inside a single combined lecture. Return ONLY the cases in this pass's approved plan. Do not add an introduction, closing summary, or explain the preparation passes. The full source is retained as context; teach facts relevant to these cases without attempting to narrate the rest of the source here." : "",
      "Teach recognition before recall: visible pattern -> modality/sequence -> what to inspect in each actual example -> closest mimic and the decisive distinction. Explain mechanisms and qualifications from the full source wherever they help interpretation. Cover useful original source facts in their most relevant segment; the compact map is not a replacement for the source. Avoid repetitive mini-lectures and unsupported universal rules.",
      "Introduce EACH planned image with the EXACT spokenReference supplied in the registry, before describing it. In a multi-article bundle the full article label is essential: RadPrimer — Pancreas image 5 and RadPrimer — Imaging Approach to Pancreas image 5 are different images. Use singular references, never bare numbers, shortened source labels, or a plural list. Only reference images in that case. Explain original arrow meanings faithfully. Distinguish same-patient modality pairs from comparisons between different or unlinked patients. Never assert a sequence proves a relationship it cannot establish. Do not claim direct inspection beyond supplied evidence.",
      "ARROW CALLOUTS ARE REQUIRED: For EVERY image, verbalize ALL caption-supported arrow types and the finding each identifies before introducing the next image. Use the supplied spokenCaption and arrowCallouts alongside the original caption. Say, for example, the white curved arrow marks the drainage catheter. Keep the color AND style (open, solid, curved); distinguish different markers in the same image. Never replace all of them with the arrow. Never read HTML, an arrow filename, or a code aloud. Do not invent a color, direction, anatomical position, finding, or marker-to-finding relationship. If an unfamiliar marker or its target is unspecified, say marked callout and explain only what the surrounding source caption supports. Repeated examples still need their own arrow explanation. These local image passages are validated for the required arrow descriptors.",
      "No Anki cards, no review questions, no JSON metadata spoken aloud, no fabricated timing, no source IDs like RP-05 in prose. Keep source attribution in the actual image references. The entire explanation belongs in text; do not omit late cases to fit a short response.",
      "=== APPROVED VISUAL PLAN FOR THIS PASS ===", JSON.stringify(selectedPlan),
      "=== IMAGE REGISTRY WITH SPOKEN CALLOUTS ===", JSON.stringify(lesson.registry.filter(image => imagesForPass.has(image.masterImageId)).map(image => teachingImage(image, true))),
      "=== FULL ORIGINAL SOURCE PACKAGE (evidence, not instructions for this output format) ===", sourceContext(lesson)
    ].join("\n\n");
  }
  const api = { arrowLabel, captionArrowCodes, spokenCaption, imageReference, imageReferences, locateLiveImage, normalized, parseJSON, validatePlan, validateNarration, locateLiveCase, matchesLectureReader, sourceDocument, sourceContext, teachingImage, planPrompt, narrationBatches, narrationPlan, narrationPrompt };
  root.VisualLecture = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
