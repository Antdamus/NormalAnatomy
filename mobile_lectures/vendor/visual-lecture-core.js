/* Shared contract for the organizer, narrator, study page and live reader. */
(function (root) {
  "use strict";
  const normalized = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const requireText = (value, label) => {
    if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${label}.`);
    return value.trim();
  };
  function copiedJsonWhitespace(raw) {
    // Native Copy can export an unfenced JSON answer as Markdown: hard line
    // breaks and encoded indentation. Decode only that whitespace OUTSIDE JSON
    // strings. Never HTML-decode prose, repair quotes or complete missing JSON.
    let text = '', inString = false, escaped = false, indent = true, breaks = 0, spaces = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw[i];
      if (inString) {
        text += char;
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '\\' && (raw[i + 1] === '\n' || raw.slice(i + 1, i + 3) === '\r\n')) {
        text += '\n'; i += raw[i + 1] === '\r' ? 2 : 1;
        indent = true; breaks++; continue;
      }
      if (indent && raw.slice(i, i + 6).toLowerCase() === '&#x20;') {
        text += ' '; i += 5; spaces++; continue;
      }
      text += char;
      if (char === '"') inString = true;
      if (char === '\n') indent = true;
      else if (!/\s/.test(char)) indent = false;
    }
    return breaks && spaces ? {text, breaks, spaces} : null;
  }
  function parseJSON(text, registry = []) {
    const raw = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try { return JSON.parse(raw); } catch {}
    const copied = copiedJsonWhitespace(raw);
    if (copied) {
      try {
        const value = JSON.parse(copied.text);
        if (value?.schemaVersion === 1 && !Object.hasOwn(value, 'jsonSyntaxRecovery') &&
            (Array.isArray(value.segments) || Array.isArray(value.cases) && Array.isArray(value.patterns))) {
          value.jsonSyntaxRecovery = {method:'decode-markdown-json-whitespace',
            hardBreaks:copied.breaks, indentationSpaces:copied.spaces};
          return value;
        }
      } catch {}
    }
    // Recover only literal caption excerpts in this one evidence field. The
    // model sometimes copies a caption's quoted word without JSON escaping it.
    // Never guess missing text, repair arbitrary prose, or change source wording.
    const repairedQuotes = [];
    const repaired = raw.replace(/("relationshipEvidence"\s*:\s*)"([\s\S]*?)"(?=\s*(?:,\s*"[A-Za-z]\w*"\s*:|}))/g, (whole, prefix, body) => {
      try { JSON.parse('"' + body + '"'); return whole; } catch {}
      let encoded = "", escaped = false;
      for (const char of body) {
        if (char === '"' && !escaped) encoded += "\\";
        encoded += char;
        escaped = char === "\\" && !escaped;
      }
      let quote;
      try { quote = JSON.parse('"' + encoded + '"'); } catch { return whole; }
      if (!quote.includes('"') || !registry.some(image => sourceCaptions(image).some(caption => caption.includes(quote)))) return whole;
      repairedQuotes.push(quote);
      return prefix + JSON.stringify(quote);
    });
    try {
      if (!repairedQuotes.length) throw new Error();
      const value = JSON.parse(repaired);
      if (value?.schemaVersion !== 1 || !Array.isArray(value.cases) || !Array.isArray(value.patterns)) throw new Error();
      const fields = [];
      for (const quote of new Set(repairedQuotes)) {
        const cases = value.cases.filter(item => item.relationshipEvidence === quote);
        if (!cases.length) throw new Error();
        for (const item of cases) {
          const image = registry.find(image => item.imageIds?.includes(image.masterImageId) && sourceCaptions(image).some(caption => caption.includes(quote)));
          if (!image) throw new Error();
          fields.push({ caseId: item.id, field: "relationshipEvidence", imageId: image.masterImageId, quote });
        }
      }
      value.jsonSyntaxRecovery = { method: "escape-exact-source-caption-quotes", fields };
      return value;
    } catch { throw new Error("The response is not complete JSON or contains invalid quotation marks or punctuation. The original draft is saved for recovery."); }
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
  function sourceCaptions(image) {
    return [...new Set([image.caption, image.captionOriginal, image.captionHtml]
      .filter(value => typeof value === "string" && value.trim()))];
  }
  function explicitPatientLink(value) {
    const text = normalized(value);
    if (/\b(?:not|never) (?:from |of |in |the )*same (?:patient|case)\b/.test(text) ||
        /\bsame (?:patient|case) (?:relationship |identity )?(?:is |was |has |cannot be )?(?:not|unknown|unconfirmed|uncertain|different)\b/.test(text)) return false;
    return /\b(?:same patient|same case|this patient|follow up)\b/.test(text);
  }
  const sourceArticleKey = image => image.sourceArticleId || image.sourceArticleUrl || image.sourceFolder || image.sourceUrl || "";
  function captionFigureNumbers(caption) {
    const numbers = new Set();
    const text = String(caption || "").replace(/[\u2013\u2014]/g, "-");
    const pattern = /\bfig(?:ure)?s?\.?\s*#?\s*(\d+(?:\s*-\s*\d+)?(?:\s*(?:,|and|&)\s*\d+(?:\s*-\s*\d+)?)*)/gi;
    for (const match of text.matchAll(pattern)) {
      for (const part of match[1].matchAll(/(\d+)(?:\s*-\s*(\d+))?/g)) {
        const first = Number(part[1]), last = Number(part[2] || part[1]);
        if (first < 1 || last < first || last > 1000) continue;
        for (let n = first; n <= last; n++) numbers.add(n);
      }
    }
    return numbers;
  }
  function sharedCaseCaptionEvidence(caseImages, images) {
    if (caseImages.length < 2) return null;
    const first = caseImages[0], article = sourceArticleKey(first), group = String(first.group || "").trim();
    if (!article || !first.sourceKind || !group || /^(?:images?|gallery|cases?|clinical cases|diagnosis|general)$/i.test(group)) return null;
    const sameGroup = image => sourceArticleKey(image) === article && image.sourceKind === first.sourceKind &&
      String(image.group || "").trim() === group && String(image.groupId || "") === String(first.groupId || "");
    if (!caseImages.every(image => sameGroup(image) && (!image.captionScope || image.captionScope === "case"))) return null;
    const figures = caseImages.map(image => Number(image.groupImageNumber));
    if (figures.some(n => !Number.isInteger(n) || n < 1) || new Set(figures).size !== figures.length) return null;
    // A reused case title/figure number is ambiguous; do not infer identity from it.
    if (figures.some(n => [...images.values()].filter(image => sameGroup(image) && Number(image.groupImageNumber) === n).length !== 1)) return null;
    const quote = sourceCaptions(first).find(caption => {
      const text = normalized(caption), referenced = captionFigureNumbers(caption);
      return /\b(?:the|this) patient\b/.test(text) &&
        !/\b(?:different|separate|unrelated|multiple|various) (?:patients|cases)\b|\banother patient\b|\bnot (?:from |of |in |the )*same patient\b|\bsame patient (?:relationship |identity )?(?:is |was )?(?:not|unknown|unconfirmed|uncertain)\b/.test(text) &&
        figures.every(n => referenced.has(n)) && caseImages.every(image => sourceCaptions(image).some(value => normalized(value) === text));
    });
    return quote ? { quote, group, article, quotes: caseImages.map(image => ({ imageId: image.masterImageId, groupImageNumber: Number(image.groupImageNumber), quote })) } : null;
  }
  function countedPatientSequenceEvidence(item, caseImages, images) {
    // A source may introduce "Four images ... in a ... patient" or "the first
    // of 3 ... images of a patient", without repeating "same patient" later.
    // Link only that complete, explicitly counted run at the start of its
    // source group. Other views in the gallery are not part of this evidence.
    if (caseImages.length < 2) return null;
    const ordered = [...caseImages].sort((a, b) => Number(a.sourceImageNumber) - Number(b.sourceImageNumber));
    const first = ordered[0], article = sourceArticleKey(first), group = String(first.group || "").trim();
    const supplied = String(item.relationshipEvidence || "").trim();
    if (!article || !first.sourceKind || !group || !String(first.groupId || "").trim() ||
        !supplied || !sourceCaptions(first).some(caption => caption.trim().startsWith(supplied))) return null;
    const sentence = normalized(supplied.split(/[.!?]/)[0]);
    const declaration = sentence.match(/^(?:(?:this is )?(?:the )?(?:first|1st) of )?(two|three|four|five|six|seven|eight|nine|ten|[2-9]|10) (?:[a-z0-9]+ ){0,8}(?:images|radiographs) (.+)$/);
    if (!declaration || /\b(?:not|unknown|uncertain|unconfirmed|may|might|could|example|examples|comparison|hypothetical|patients|cases)\b/.test(sentence)) return null;
    const patient = "a (?:[0-9]+ year old )?patient\\b";
    const patientClause = new RegExp("^(?:(?:in|of|show|shows) " + patient +
      "|show [a-z ]{1,100} obtained during [a-z ]{1,60} in " + patient + ")");
    if (!patientClause.test(declaration[2])) return null;
    const words = {two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10};
    const count = words[declaration[1]] || Number(declaration[1]);
    if (count !== ordered.length) return null;
    const sameArticle = image => sourceArticleKey(image) === article && image.sourceKind === first.sourceKind;
    const sameGroup = image => sameArticle(image) && String(image.group || "").trim() === group &&
      String(image.groupId || "") === String(first.groupId);
    const all = [...images.values()];
    if (!ordered.every((image, index) => sameGroup(image) &&
      Number(image.groupImageNumber) === index + 1 &&
      Number.isInteger(Number(image.sourceImageNumber)) && Number(image.sourceImageNumber) > 0 &&
      Number(image.sourceImageNumber) === Number(first.sourceImageNumber) + index &&
      all.filter(other => sameGroup(other) && Number(other.groupImageNumber) === index + 1).length === 1 &&
      all.filter(other => sameArticle(other) && Number(other.sourceImageNumber) === Number(image.sourceImageNumber)).length === 1
    )) return null;
    const contrary = /\b(?:another|different|separate|unrelated|multiple) (?:patient|case)s?\b|\bnot (?:from |of |in |the )*same (?:patient|case)\b|\b(?:patient identity|same patient(?: relationship| identity)?) (?:is |was )?(?:not|unknown|unconfirmed|uncertain)\b|\b(?:diagram|graphic|illustration|schematic|drawing)\b/;
    if (ordered.some(image => !sourceCaptions(image).length ||
      sourceCaptions(image).some(caption => contrary.test(normalized(caption))))) return null;
    return {method: "counted-source-patient-sequence",
      basis: "Exact source caption explicitly describes a counted set of images of one patient, mapped to the complete consecutive opening run of one source group. Patient identity does not establish a shared examination time.",
      sourceArticleId: article, sourceGroup: group, imageCount: count,
      imageIds: ordered.map(image => image.masterImageId), quoteImageId: first.masterImageId, quote: supplied};
  }
  function samePatientEvidence(item, images) {
    const supplied = String(item.relationshipEvidence || "");
    const caseImages = item.imageIds.map(id => images.get(id));
    // The captured registry is source evidence in its own right. Captions need
    // not be duplicated in article prose or survive JSON serialization there.
    if (explicitPatientLink(supplied) && caseImages.some(image => sourceCaptions(image)
      .some(caption => normalized(caption).includes(normalized(supplied))))) return;

    const countedSequence = countedPatientSequenceEvidence(item, caseImages, images);
    if (countedSequence) {
      item.relationshipEvidenceRecovery = countedSequence;
      return;
    }

    // STATdx may store one shared multi-figure patient description instead of
    // saying "same patient" in every caption. Require the source case and exact
    // figure mapping as well as that description; matching captions alone fail.
    const shared = sharedCaseCaptionEvidence(caseImages, images);
    if (shared) {
      if (!Object.hasOwn(item, "relationshipEvidenceOriginal")) item.relationshipEvidenceOriginal = supplied;
      item.relationshipEvidence = shared.quote;
      item.relationshipEvidenceRecovery = {
        method: "shared-source-case-caption",
        basis: "One named source case with a shared patient description and explicit references to each supplied case figure. This establishes patient identity, not a common examination time.",
        sourceArticleId: shared.article, sourceCase: shared.group, imageIds: [...item.imageIds], quotes: shared.quotes
      };
      return;
    }

    // A reviewed atomic source sequence can also link views with literal
    // "Corresponding ..." / "Subsequent ..." captions. These words alone in a
    // general gallery are insufficient: require the complete source-defined
    // cluster, one article/gallery, consecutive source positions and a caption
    // link at every step. Preserve the quoted evidence and chronology verbatim.
    const linkedSequence = correspondingSequenceEvidence(item, caseImages, images);
    if (linkedSequence) {
      item.relationshipEvidenceRecovery = linkedSequence;
      return;
    }

    // A paraphrased quote is recoverable only from an explicit source chain.
    // Adjacency alone, a common disease, or a quote from another article is not
    // patient identity. Each subsequent source caption must link to the prior
    // image; retain the original response and exact replacement quotes.
    const articleKey = sourceArticleKey;
    const ordered = [...caseImages].sort((a, b) => Number(a.sourceImageNumber) - Number(b.sourceImageNumber));
    const key = articleKey(ordered[0]);
    const chain = ordered.length > 1 && key && ordered.every((image, index) =>
      articleKey(image) === key && image.sourceKind === ordered[0].sourceKind &&
      Number.isInteger(Number(image.sourceImageNumber)) && Number(image.sourceImageNumber) > 0 &&
      (!index || Number(image.sourceImageNumber) === Number(ordered[index - 1].sourceImageNumber) + 1) &&
      (!image.groupId || !ordered[0].groupId || image.groupId === ordered[0].groupId));
    const quotes = chain ? ordered.slice(1).map(image => {
      const quote = sourceCaptions(image).find(caption => explicitPatientLink(caption) &&
        /\bsame (?:patient|case)\b/.test(normalized(caption)));
      return quote ? { imageId: image.masterImageId, quote } : null;
    }) : [];
    if (!chain || quotes.some(quote => !quote)) {
      throw new Error(`Same-patient evidence for ${item.label} must quote an explicit relationship in the supplied source captions. Copy an exact caption excerpt, or use comparison if the images are not explicitly linked.`);
    }
    item.relationshipEvidenceOriginal = supplied;
    item.relationshipEvidence = quotes[0].quote;
    item.relationshipEvidenceRecovery = {
      basis: "Consecutive images from the same source article; each subsequent caption explicitly identifies the same patient/case.",
      imageIds: ordered.map(image => image.masterImageId), quotes
    };
  }
  function namedAtomicGroups(images) {
    const groups = new Map();
    for (const image of images.values()) {
      if (!Array.isArray(image.atomicGroupIds)) continue;
      for (const id of new Set(image.atomicGroupIds)) {
        if (typeof id !== "string" || !id.trim()) continue;
        if (!groups.has(id)) groups.set(id, []);
        groups.get(id).push(image.masterImageId);
      }
    }
    return groups;
  }
  function correspondingSequenceEvidence(item, caseImages, images) {
    if (caseImages.length < 2) return null;
    const supplied = normalized(item.relationshipEvidence);
    if (supplied.length < 32 || !/^(?:corresponding|subsequent)\b/.test(supplied) || !caseImages.some(image => sourceCaptions(image)
      .some(caption => normalized(caption).includes(supplied)))) return null;
    const ordered = [...caseImages].sort((a, b) => Number(a.sourceImageNumber) - Number(b.sourceImageNumber));
    const first = ordered[0], article = sourceArticleKey(first), ids = new Set(item.imageIds);
    // Fused master sources retain named atomic-group memberships instead of
    // expanding legacy clusterImageIds onto every image. Resolve membership
    // from the entire source registry, never from the model's selected subset.
    // A named group must not mask inconsistent legacy cluster metadata.
    const legacy = caseImages.some(image => image.atomicCluster !== undefined || image.clusterImageIds !== undefined);
    const namedGroup = !legacy && [...namedAtomicGroups(images)].find(([, members]) =>
      members.length === ids.size && members.every(id => ids.has(id)));
    if (!article || !first.sourceKind || !ordered.every((image, index) => {
      const cluster = image.clusterImageIds;
      return sourceArticleKey(image) === article && image.sourceKind === first.sourceKind &&
        String(image.groupId || "") === String(first.groupId || "") &&
        String(image.group || "") === String(first.group || "") &&
        Number.isInteger(Number(image.sourceImageNumber)) && Number(image.sourceImageNumber) > 0 &&
        (!index || Number(image.sourceImageNumber) === Number(ordered[index - 1].sourceImageNumber) + 1) &&
        (namedGroup || image.atomicCluster === true && Array.isArray(cluster) && cluster.length === ids.size &&
        new Set(cluster).size === ids.size && cluster.every(id => ids.has(id)));
    })) return null;
    const contraryIdentity = value => /\b(?:different|separate|unrelated|another) (?:patient|case)s?\b|\bnot (?:from |of |in |the )*same (?:patient|case)\b|\bsame (?:patient|case) (?:relationship |identity )?(?:is |was )?(?:not|unknown|unconfirmed|uncertain)\b/.test(normalized(value));
    if (caseImages.some(image => sourceCaptions(image).some(caption => contraryIdentity(caption) ||
      /\b(?:graphic|diagram|illustration|schematic|drawing)\b/.test(normalized(caption))))) return null;
    const quotes = ordered.slice(1).map((image, index) => {
      const quote = sourceCaptions(image).find(caption => {
        const text = normalized(caption);
        return index === 0 ? /^corresponding\b/.test(text) :
          /^(?:corresponding|subsequent)\b/.test(text) || /\bsame (?:patient|case)\b/.test(text);
      });
      return quote ? { imageId: image.masterImageId, quote } : null;
    });
    if (quotes.some(quote => !quote)) return null;
    return {
      method: "corresponding-source-sequence",
      ...(namedGroup ? { atomicGroupId: namedGroup[0] } : {}),
      basis: "Complete atomic group from one source article/gallery, in consecutive source positions; the first linked caption says Corresponding and every later caption continues that source sequence. Patient linkage does not imply simultaneous examinations.",
      sourceArticleId: article, imageIds: ordered.map(image => image.masterImageId), quotes
    };
  }
  function completeLectureOrder(plan, caseIds) {
    const original = plan.lectureOrder;
    if (!Array.isArray(original) || !original.length || original.some(id => typeof id !== "string" || !caseIds.has(id))) {
      throw new Error("Lecture order must include every case exactly once. It contains missing or unknown case references; a corrected order is required.");
    }
    const order = [...new Set(original)];
    const duplicates = [...new Set(original.filter((id, index) => original.indexOf(id) !== index))];
    const missing = plan.cases.filter(item => !order.includes(item.id));
    if (!duplicates.length && !missing.length) return;
    const caseById = new Map(plan.cases.map(item => [item.id, item]));
    const insertions = [];
    // Only schedule cases that have already passed source, relationship, image
    // coverage and atomic-group checks. Keep the relative order of every listed
    // case. Place an omitted case after its branch's last case, or at the end if
    // the branch has no scheduled case. Never fabricate or discard case content.
    for (const item of missing) {
      let index = -1;
      for (let i = 0; i < order.length; i++) if (caseById.get(order[i]).patternId === item.patternId) index = i;
      const position = index < 0 ? order.length : index + 1;
      insertions.push({ caseId: item.id, patternId: item.patternId, afterCaseId: order[position - 1] || null,
        placement: index < 0 ? "end-of-lecture" : "after-last-case-in-pattern" });
      order.splice(position, 0, item.id);
    }
    if (order.length !== caseIds.size || new Set(order).size !== caseIds.size || order.some(id => !caseIds.has(id))) {
      throw new Error("Lecture order must include every case exactly once. Case IDs need correction before recovery.");
    }
    plan.lectureOrderOriginal = [...original];
    plan.lectureOrderRecovery = { method: "complete-validated-case-order", removedDuplicateCaseIds: duplicates, insertions,
      basis: "Keep the first occurrence of each known case and add omitted validated cases after their map branch. Case content, image groups and listed relative order are preserved." };
    plan.lectureOrder = order;
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
        samePatientEvidence(item, images);
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
    for (const [id, members] of namedAtomicGroups(images)) {
      const group = members.filter(id => images.get(id).required !== false);
      if (group.length > 1 && !plan.cases.some(c => group.every(id => c.imageIds.includes(id)))) throw new Error(`Atomic group ${id} was split.`);
    }
    completeLectureOrder(plan, cases);
    return plan;
  }
  const ARROW_LABELS = {
    WO: "white open arrow", WS: "white solid arrow", WC: "white curved arrow",
    BO: "black open arrow", BS: "black solid arrow", BC: "black curved arrow",
    CO: "cyan open arrow", CS: "cyan solid arrow", CC: "cyan curved arrow"
  };
  const arrowLabel = code => ARROW_LABELS[String(code || "").toUpperCase()] || "";
  function captionArrowCode(src) {
    try {
      const url = new URL(String(src || ""), "https://caption.invalid/");
      if (!["https:", "http:", "file:", "chrome-extension:"].includes(url.protocol)) return "";
      const path = decodeURIComponent(url.pathname);
      const match = path.match(/(?:^|\/)arrow_([a-z0-9]+)\.png$/i) || path.match(/\/arrows\/([a-z0-9]+)\.png$/i);
      if (match) return match[1].toUpperCase();
      const shortName = path.match(/^\/([a-z0-9]{2})\.png$/i)?.[1];
      return shortName && arrowLabel(shortName) ? shortName.toUpperCase() : "";
    } catch { return ""; }
  }
  function captionImageAttribute(tag, name) {
    const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\x60]+))`, "i"));
    return match ? match[1] ?? match[2] ?? match[3] ?? "" : "";
  }
  function originalCaption(image) {
    return [image?.captionHtml, image?.captionOriginal, image?.caption]
      .find(value => typeof value === "string" && value.trim()) || "";
  }
  function captionArrowCodes(caption) {
    return [...new Set((String(caption || "").match(/<img\b[^>]*>/gi) || [])
      .map(tag => captionArrowCode(captionImageAttribute(tag, "src"))).filter(Boolean))];
  }
  function imageArrowCallouts(image) {
    const caption = originalCaption(image), all = captionArrowCodes(caption);
    const figure = Number(image.groupImageNumber);
    const fallback = { codes: all, scope: "image-caption" };
    // A source case's local Fig. N is distinct from the collection image number.
    // Do not infer it from adjacency, matching captions, or the spoken reference.
    if (!sourceArticleKey(image) || !image.sourceKind || !String(image.group || "").trim() ||
        /^(?:images?|gallery|cases?|clinical cases|diagnosis|general)$/i.test(image.group) ||
        (image.captionScope && image.captionScope !== "case") || !Number.isInteger(figure) || figure < 1 ||
        !captionFigureNumbers(caption).has(figure)) return fallback;
    const occurrences = [];
    const marked = caption.replace(/<img\b[^>]*>/gi, tag => {
      const code = captionArrowCode(captionImageAttribute(tag, "src"));
      if (!code) return "";
      const index = occurrences.push({ code, figures: null }) - 1;
      return `\uE000${index}\uE001`;
    }).replace(/<[^>]*>/g, " ");
    // Bind only explicit local references in the SAME flat parentheses as the
    // marker: (<arrow>, Figs. 3-4). A lead-in "Figs. 1-4" cannot assign all arrows
    // to every image. Multiple separate figure references are ambiguous.
    for (const match of marked.matchAll(/\([^()]*\)/g)) {
      const text = match[0];
      if ([...text.matchAll(/\bfig(?:ure)?s?\.?\s*#?\s*\d/gi)].length !== 1) continue;
      const figures = [...captionFigureNumbers(text)];
      if (!figures.length) continue;
      for (const token of text.matchAll(/\uE000(\d+)\uE001/g)) occurrences[Number(token[1])].figures = figures;
    }
    if (!occurrences.some(item => item.figures)) return fallback;
    return { codes: [...new Set(occurrences.filter(item => !item.figures || item.figures.includes(figure)).map(item => item.code))],
      scope: "source-figure", figure,
      unassignedCodes: [...new Set(occurrences.filter(item => !item.figures).map(item => item.code))] };
  }
  function spokenCaption(caption) {
    return String(caption || "").replace(/<img\b[^>]*>/gi, tag => {
      const code = captionArrowCode(captionImageAttribute(tag, "src"));
      return ` (${arrowLabel(code) || captionImageAttribute(tag, "alt") || "marked callout"}) `;
    }).replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
      .replace(/\s+/g, " ").trim();
  }
  function imageReferenceLabels(image) {
    const labels = [image.sourceLabel];
    if (/^(?:RadPrimer|STATdx)$/i.test(image.sourceLabel) && image.sourceArticleTitle?.trim()) {
      labels.push(`${image.sourceLabel} — ${image.sourceArticleTitle.trim()}`);
    }
    return labels;
  }
  function imageReference(image, registry = []) {
    // Derive spoken names without renaming immutable registry labels or IDs.
    // Use the whole lesson to keep references stable across preparation passes.
    const labels = imageReferenceLabels(image);
    const collision = labels.length > 1 && registry.some(other => other.masterImageId !== image.masterImageId &&
      other.sourceLabel?.toLowerCase() === image.sourceLabel.toLowerCase() &&
      Number(other.sourceImageNumber) === Number(image.sourceImageNumber));
    return `${collision ? labels.at(-1) : labels[0]} image ${image.sourceImageNumber}`;
  }
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function imageReferences(text, registry, caseImageIds) {
    // Accept saved legacy names as well as article-qualified references. A
    // legacy collision still needs exactly one owner in the approved case.
    const references = registry.flatMap(image => imageReferenceLabels(image).flatMap(label =>
      [...String(text || "").matchAll(new RegExp(`\\b${escapeRegex(`${label} image ${image.sourceImageNumber}`)}\\b`, "gi"))]
        .map(match => ({ imageId: image.masterImageId, index: match.index, end: match.index + match[0].length }))))
      .sort((a, b) => a.index - b.index);
    if (!caseImageIds) return references;
    const allowed = new Set(caseImageIds), occurrences = new Map();
    for (const reference of references) {
      const key = `${reference.index}:${reference.end}`;
      if (!occurrences.has(key)) occurrences.set(key, []);
      occurrences.get(key).push(reference);
    }
    return [...occurrences.values()].flatMap(matches => {
      // Separate source articles can share both their title and image number.
      // Resolve only when the approved case owns exactly one matching ID. Keep
      // other matches visible so wrong-case and ambiguous references still fail.
      const owned = matches.filter(match => allowed.has(match.imageId));
      return owned.length === 1 ? owned : matches;
    });
  }
  function locateLiveImage(registry, segment, state) {
    if (!segment) return "";
    const references = state.liveContext?.live ? imageReferences(state.liveContext.text, registry, segment.imageIds) : [];
    const last = references.at(-1);
    if (last && references.some(reference => reference !== last && reference.index === last.index && reference.end === last.end)) return "";
    const lastImage = registry.find(image => image.masterImageId === last?.imageId);
    // Full article references resolve ambiguity that the legacy source+number
    // pointer cannot express. Its explicit pointer remains authoritative for
    // ordinary single-article narration, where context can contain several refs.
    const qualified = lastImage && imageReferenceLabels(lastImage).slice(1).some(label =>
      state.liveContext.text.slice(last.index, last.end).toLowerCase() === `${label} image ${lastImage.sourceImageNumber}`.toLowerCase());
    if (lastImage && (qualified || !/^(?:RadPrimer|STATdx)$/i.test(lastImage.sourceLabel)) && segment.imageIds.includes(last.imageId)) return last.imageId;
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
    const references = imageReferences(text, [...images.values()], item.imageIds);
    for (const id of item.imageIds) {
      const image = images.get(id), { codes } = imageArrowCallouts(image);
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
        if (!covered) throw new Error(`${imageReference(image, [...images.values()])}: explain the ${label || "source-marked callout"} in that image's narration before moving to the next image.`);
      }
    }
  }
  function validateNarration(value, plan, registry, { requireArrowCues = false, integratedCines = false, cineRegistry = [] } = {}) {
    if (value?.schemaVersion !== 1 || !Array.isArray(value.segments)) throw new Error("Missing structured narration.");
    if (value.segments.length !== plan.lectureOrder.length) throw new Error("Narration does not cover every planned case.");
    const images = new Map(registry.map(i => [i.masterImageId, i]));
    const cases = new Map(plan.cases.map(c => [c.id, c]));
    const patterns = new Map(plan.patterns.map(p => [p.id, p]));
    const segments = value.segments.map((segment, index) => {
      if (segment.caseId !== plan.lectureOrder[index]) throw new Error("Narration changed the planned case order.");
      const item = cases.get(segment.caseId);
      const text = requireText(segment.text, "case narration");
      const references = imageReferences(text, registry, item.imageIds);
      const spans = new Set();
      for (const reference of references) {
        const span = `${reference.index}:${reference.end}`;
        if (spans.has(span)) throw new Error(`Ambiguous image reference in case ${item.label}: multiple source images share this label and number.`);
        spans.add(span);
      }
      for (const id of item.imageIds) {
        const image = images.get(id);
        const label = imageReference(image, registry);
        if (!references.some(reference => reference.imageId === id)) throw new Error(`Narration must explicitly introduce ${label}.`);
      }
      if (references.some(reference => !item.imageIds.includes(reference.imageId))) throw new Error(`Narration references an image outside case ${item.label}.`);
      const referenceLabels = new Set(['RadPrimer', 'STATdx', ...registry.flatMap(imageReferenceLabels)].filter(label => typeof label === 'string'));
      for (const label of referenceLabels) {
        for (const match of text.matchAll(new RegExp(`\\b${escapeRegex(label)}\\s+image\\s+(\\d+)\\b`, 'gi'))) {
          if (!item.imageIds.some(id => {
            const image = images.get(id);
            return imageReferenceLabels(image).some(value => value.toLowerCase() === label.toLowerCase()) &&
              Number(image.sourceImageNumber) === Number(match[1]);
          })) throw new Error(`Narration references an image outside case ${item.label}.`);
        }
      }
      if (requireArrowCues) validateArrowCues(text, item, images);
      const cue = `${patterns.get(item.patternId).label}. ${item.label}.`;
      const result = { caseId: item.id, patternId: item.patternId, imageIds: item.imageIds, cue, text: `${cue}\n\n${text}` };
      if(integratedCines) {
        if(!root.VisualLectureCine)throw new Error('Reload the extension to enable cine narration validation.');
        return root.VisualLectureCine.enrich(result,segment,plan,cineRegistry,registry);
      }
      if(segment.cineSegments?.length)throw new Error('Enable integrated cine narration before importing cine passages.');
      return result;
    });
    return { schemaVersion: 1, ...(requireArrowCues ? { arrowCuesVersion: 1 } : {}), ...(integratedCines ? {cineNarrationVersion:1} : {}), segments, text: segments.map(s => s.text).join("\n\n") };
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
  function teachingImage(image, narrated = false, registry = []) {
    // Project only teaching evidence into the model request. The saved registry
    // remains authoritative and keeps every file, hash, URL, variant and caption.
    // The HTML stays untouched in the saved registry and is rendered locally.
    // Do not duplicate it in large model requests; supply exact arrow meanings
    // alongside the text caption for narration instead.
    const record = Object.fromEntries(["masterImageId", "sourceLabel", "sourceArticleId", "sourceImageNumber", "caption", "required", "atomicCluster", "clusterImageIds", "teachingRole"]
      .filter(field => image[field] !== undefined).map(field => [field, image[field]]));
    // Keep case-local figure provenance where it applies, without copying broad
    // gallery labels into every ordinary image record and overflowing narration.
    const figure = Number(image.groupImageNumber);
    if (image.group && Number.isInteger(figure) && figure > 0 && sourceCaptions(image).some(caption => captionFigureNumbers(caption).has(figure))) {
      for (const field of ["sourceKind", "group", "groupId", "groupImageNumber", "captionScope"]) {
        if (image[field] !== undefined && image[field] !== "") record[field] = image[field];
      }
    }
    if (image.captionEditoriallyUpdated) {
      record.captionEditoriallyUpdated = true;
      record.originalCaption = image.captionOriginal || spokenCaption(image.captionHtml);
    }
    if (narrated) {
      record.spokenReference = imageReference(image, registry);
      // The spoken reference retains the full article label and image number.
      delete record.sourceLabel;
      delete record.sourceImageNumber;
      const callouts = imageArrowCallouts(image);
      record.arrowCallouts = callouts.codes.map(code => ({ code, label: arrowLabel(code) || "marked callout" }));
      if (callouts.scope === "source-figure") record.arrowCalloutScope = { sourceFigure: callouts.figure, unassignedCodes: callouts.unassignedCodes };
      // Plain source captions already include the named inline arrow meanings.
      // Keep HTML captions verbatim when that is the source's only caption form.
      record.spokenCaption = /<img\b/i.test(image.caption || "") ? spokenCaption(image.caption) : undefined;
    }
    return record;
  }
  const captionPreservationInstruction = "ORIGINAL CAPTIONS ARE IMMUTABLE SOURCE DATA. The review displays the saved captionHtml verbatim through safe local rendering, including every inline arrow image, its position, original wording, punctuation, spacing and emphasis. Both /img/arrows/WC.png and arrow_WC.png refer to source annotations; never omit their meaning. Do not return replacement captions, rewrite or summarize them, or put teaching corrections inside them. Put explanations and corrections in separate generated fields. Narration may describe the arrows in words for audio; that spoken version must never replace the displayed original caption.";
  function planPrompt(lesson) {
    return [
      root.TeachingFramework?.prompt(lesson) || "Use the anatomy/pathology framework recorded in the source.",
      "Create an English visual organizer for a first-exposure radiology lesson. Output ONLY complete JSON, no markdown, no cards and no lecture yet.",
      "Escape embedded quotation marks and backslashes in every JSON string, including relationshipEvidence. Preserve the exact caption wording after JSON decoding.",
      "Image IDs in cases and overviews must come ONLY from the AUTHORITATIVE IMAGE REGISTRY below. Source-package repeat groups and cross-references may mention images archived in other lessons; those mentions do not make an image available here. Do not add an absent image or claim its pixels are included.",
      captionPreservationInstruction,
      "Organize by visible radiological appearance first, then modality/sequence behavior, real illustrated cases, and distinctions between look-alikes. For normal anatomy use visible structures, spatial relationships and their modality appearances. Derive the number and names of branches from this topic; do not impose a fixed taxonomy or force a decision algorithm where findings overlap.",
      "The learner previews this map instead of hearing a narrated opening outline. Keep orientation to one sentence, branch labels to a few words, focus/discriminator to one short sentence each. Put detailed reasoning into the later lecture, not the map.",
      'STRICT FIELD CONTRACT: cases[].relationship must be EXACTLY one of "single image", "same patient", or "comparison". Never put a descriptive sentence in this field. Put any additional grouping description in relationshipDescription. A composite stored under one image ID is "single image", regardless of panel count. Use "comparison" for distinct or unlinked patients. Use "same patient" only with the explicit source-caption evidence required below.',
      'cases[].modalityLabels must be an OBJECT keyed by EVERY exact image ID in that case, e.g. {"RP-A02-039":"Coronal MRCP"}. Never return an array or an unassigned list of case modalities. Do not transfer a modality from one comparison image to another. If the individual source does not specify it, use "Not specified".',
      "Use ALL required images at least once, preserving useful recognition variants. Archive images remain accessible but need not be narrated. Cases may be comparisons, and a source image may appear in multiple relevant cases. Preserve atomic clusterImageIds together in a case. Do not imply same patient merely because images depict the same disease: use comparison unless the source explicitly establishes identity. For same patient, relationshipEvidence must be one verbatim excerpt from a caption of an image in that case, containing the explicit same-patient relationship. Copy that excerpt exactly; do not paraphrase it, concatenate separate captions, or add an image number/citation inside the quote. The authoritative registry captions are source evidence even when the article body does not repeat them. Image-number adjacency alone is not evidence.",
      "A source may provide one shared multi-figure patient description instead of the literal words same patient. For that format, use same patient only when all images belong to the same named source case (same sourceArticleId/sourceKind and group/groupId), have distinct groupImageNumber values explicitly referenced as figures in that shared caption, and the caption describes one patient. Quote that original case caption without rewriting it. Matching captions, a common topic/gallery or adjacent image numbers alone do not establish identity. groupImageNumber maps local Fig. 1/2/3 to the global image IDs; preserve this mapping. Same patient does not mean same examination: keep the initial-scan, follow-up and treatment intervals attached to their exact figures, and never use hospital length of stay as a scan interval.",
      "Use only supplied source-supported imaging findings. You receive source text and captions, not independent visual inspection of the pixels. Do not claim you inspected an image or invent image findings. Keep mechanisms, source-supported caveats and sequence limitations available for the next phase. Preserve IDs exactly. Each image needs its modality/sequence label from the source; say Not specified if absent.",
      "Choose representative overviewImageIds and group cases so direct visual comparisons help distinguish close mimics. An overview may reuse an image from another branch, but every overview image needs an illustrated case somewhere in the lesson. lectureOrder must include every case exactly once. Build the final playback list from the exact cases[].id values; compare both its length and its unique ID set with cases before returning. Do not repeat an introductory case later in the list, and do not leave an existing case out of playback. No HTML in generated labels. The schema below is illustrative; replace its example IDs with real registry IDs.",
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
    return { ...plan, ...(plan.cineWatchPoints ? {cineWatchPoints:plan.cineWatchPoints.filter(p=>caseIds.includes(p.caseId))} : {}), patterns: plan.patterns.filter(pattern => cases.some(item => item.patternId === pattern.id)), cases, lectureOrder: caseIds };
  }
  function narrationPrompt(lesson, caseIds) {
    const selectedPlan = narrationPlan(lesson.plan, caseIds);
    delete selectedPlan.lectureOrderOriginal;
    delete selectedPlan.lectureOrderRecovery;
    delete selectedPlan.jsonSyntaxRecovery;
    delete selectedPlan.manualRecovery;
    // Recovery provenance stays in the saved plan. Narration receives the exact
    // approved evidence and all source captions, without duplicate audit copies.
    selectedPlan.cases = selectedPlan.cases.map(({ modalityLabelRecovery, relationshipEvidenceOriginal, relationshipEvidenceRecovery, ...item }) => item);
    const imagesForPass = new Set(selectedPlan.cases.flatMap(item => item.imageIds));
    return [
      root.TeachingFramework?.prompt(lesson) || "Use the anatomy/pathology framework recorded in the source.",
      "Write the English guided radiology lecture from the approved visual plan AND the complete original source below. Output ONLY complete JSON: {\"schemaVersion\":1,\"segments\":[{\"caseId\":\"exact planned case id\",\"text\":\"Full natural spoken explanation\"}]}.",
      "Escape embedded quotation marks and backslashes in every JSON string. Check that the entire response parses as valid JSON.",
      captionPreservationInstruction,
      "One segment per planned case, exactly in lectureOrder. The map already provides the opening orientation; start explaining the first case immediately. Do not narrate a table of contents or a second general introduction. The player will prepend each exact pattern/case heading for alignment; do not repeat those headings in text.",
      caseIds ? "This is one preparation pass inside a single combined lecture. Return ONLY the cases in this pass's approved plan. Do not add an introduction, closing summary, or explain the preparation passes. The full source is retained as context; teach facts relevant to these cases without attempting to narrate the rest of the source here." : "",
      "Teach recognition before recall: visible pattern -> modality/sequence -> what to inspect in each actual example -> closest mimic and the decisive distinction. Explain mechanisms and qualifications from the full source wherever they help interpretation. Cover useful original source facts in their most relevant segment; the compact map is not a replacement for the source. Avoid repetitive mini-lectures and unsupported universal rules.",
      "Introduce EACH planned image with the EXACT spokenReference supplied in the registry, before describing it. In a multi-article bundle the full article label is essential: RadPrimer — Pancreas image 5 and RadPrimer — Imaging Approach to Pancreas image 5 are different images. Use singular references, never bare numbers, shortened source labels, or a plural list. Only reference images in that case. Explain original arrow meanings faithfully. Distinguish same-patient modality pairs from comparisons between different or unlinked patients. Never assert a sequence proves a relationship it cannot establish. Do not claim direct inspection beyond supplied evidence.",
      "IMAGE FOCUS: Every exact spokenReference switches the displayed image and starts that image's arrow passage, even inside a comparison or a negated sentence. Finish the current image's findings and all arrow explanations before using another exact reference. When merely comparing with an earlier example or denying a follow-up relationship, say the preceding example rather than repeating its exact image reference. Use an exact reference again only when deliberately returning to that image and explaining its own findings. Preserve the approved relationshipDescription; unlinked examples do not establish either shared or different patient identities.",
      lesson.registry.some(image => imagesForPass.has(image.masterImageId) && imageArrowCallouts(image).scope === "source-figure")
        ? "FIGURE-SPECIFIC ARROWS: A shared caption covers several figures. arrowCallouts/arrowCalloutScope identify this sourceFigure using groupImageNumber, not the global image number. Explain its assigned arrows, not other figures' markers. Preserve the full original caption. Do not invent a figure location for unassigned markers." : "",
      "ARROW CALLOUTS ARE REQUIRED: For EVERY image, verbalize ALL caption-supported arrow types and the finding each identifies before introducing the next image. Use the supplied spokenCaption and arrowCallouts alongside the original caption. Say, for example, the white curved arrow marks the drainage catheter. Keep the color AND style (open, solid, curved); distinguish different markers in the same image. Never replace all of them with the arrow. Never read HTML, an arrow filename, or a code aloud. Do not invent a color, direction, anatomical position, finding, or marker-to-finding relationship. If an unfamiliar marker or its target is unspecified, say marked callout and explain only what the surrounding source caption supports. Repeated examples still need their own arrow explanation. These local image passages are validated for the required arrow descriptors.",
      "No Anki cards, no review questions, no JSON metadata spoken aloud, no fabricated timing, no source IDs like RP-05 in prose. Keep source attribution in the actual image references. The entire explanation belongs in text; do not omit late cases to fit a short response.",
      "=== APPROVED VISUAL PLAN FOR THIS PASS ===", JSON.stringify(selectedPlan),
      lesson.cinePlaybackVersion===1 ? root.VisualLectureCine.prompt(lesson,selectedPlan) : selectedPlan.cineWatchPoints?.length ? "The approved map includes external cine watch points. Briefly orient the listener at the assigned case, without reading URLs or registry IDs aloud. Do not claim to have viewed motion: describe only what the supplied source supports; keep different patients and time points distinct. The study page displays the external links." : "",
      "=== IMAGE REGISTRY WITH SPOKEN CALLOUTS ===", JSON.stringify(lesson.registry.filter(image => imagesForPass.has(image.masterImageId)).map(image => teachingImage(image, true, lesson.registry))),
      "=== FULL ORIGINAL SOURCE PACKAGE (evidence, not instructions for this output format) ===", sourceContext(lesson)
    ].join("\n\n");
  }
  function recoveryDetails(lesson, attempt = null) {
    // User-triggered, local export. No image bytes, browser settings, generation
    // tokens or source-tab credentials; never read assets or contact the worker.
    const saved = {};
    for (const key of ["id", "title", "status", "stage", "createdAt", "updatedAt", "stageStartedAt", "modelStartedAt",
      "error", "retryReason", "planDraft", "planDraftComplete", "plan", "registry", "sourceText",
      "generationSummary", "pendingNarrationRevision", "narrationRevision", "narrationDraft", "narrationDraftComplete",
      "narrationProgress", "narrationContractVersion", "teachingFramework"]) {
      if (lesson[key] !== undefined) saved[key] = structuredClone(lesson[key]);
    }
    saved.narrationState = { present: !!lesson.narration, segments: lesson.narration?.segments?.length || 0,
      completedParts: lesson.narrationProgress?.nextBatch || 0, totalParts: lesson.narrationProgress?.batches?.length || 0 };
    let validation = { status: "unavailable", reason: "No saved organizer response." };
    if (lesson.plan || lesson.planDraft) {
      try {
        const plan = lesson.plan ? structuredClone(lesson.plan) : parseJSON(lesson.planDraft, lesson.registry);
        validatePlan(plan, lesson.registry, lesson.sourceText);
        validation = { status: "passed", cases: plan.cases.length, lectureOrderRecovery: plan.lectureOrderRecovery || null,
          recoveredEvidence: plan.cases.filter(item => item.relationshipEvidenceRecovery).map(item => ({
            id: item.id, imageIds: item.imageIds, recovery: item.relationshipEvidenceRecovery })) };
      } catch (error) { validation = { status: "failed", error: error.message }; }
    }
    let narrationValidation = { status: "unavailable", reason: "No saved narration response." };
    if (lesson.plan && lesson.narrationDraft) {
      try {
        const passPlan = lesson.narrationProgress ? narrationPlan(lesson.plan, lesson.narrationProgress.batches[lesson.narrationProgress.nextBatch]) : lesson.plan;
        const draft=parseJSON(lesson.narrationDraft,lesson.registry);
        const narration = validateNarration(lesson.cineUpgradeOnly?root.VisualLectureCine.mergeUpgrade(draft,lesson):draft, passPlan, lesson.registry, root.VisualLectureCine?.options(lesson) || { requireArrowCues: lesson.narrationContractVersion >= 2 });
        narrationValidation = { status: "passed", segments: narration.segments.length };
      } catch (error) { narrationValidation = { status: "failed", error: error.message }; }
    }
    return { format: "radiology-visual-lecture-recovery", version: 1, exportedAt: new Date().toISOString(),
      recoveryBuild: "2026-09-19-figure-arrow-recovery", attempt: structuredClone(attempt), validation, narrationValidation, lesson: saved };
  }
  const api = { copyJsonRecoveryVersion:1, recoveryDetails, imageArrowCallouts, arrowLabel, captionArrowCode, captionArrowCodes, originalCaption, spokenCaption, imageReference, imageReferences, locateLiveImage, normalized, parseJSON, validatePlan, validateNarration, locateLiveCase, matchesLectureReader, sourceDocument, sourceContext, teachingImage, planPrompt, narrationBatches, narrationPlan, narrationPrompt };
  root.VisualLecture = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
