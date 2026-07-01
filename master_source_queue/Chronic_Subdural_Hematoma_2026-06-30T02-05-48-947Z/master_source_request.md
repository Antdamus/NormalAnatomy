# Master Source Request Bundle

Purpose: this bundle contains paired source packages that Codex should fuse into one master source artifact.

Canonical hierarchy for this synthesis:
- canonicalHierarchySource: RadPrimer_metadata.json breadcrumbTrail (RadPrimer breadcrumbTrail is the canonical hierarchy/backbone.)
- canonicalHierarchy JSON: ["All Categories","Basic","Neuroradiology","Brain","Primary Effects of CNS Trauma","Chronic Subdural Hematoma"]
- canonicalDeckPath: Corebook::Neuro::Brain::Primary Effects of CNS Trauma::Chronic Subdural Hematoma
- If RadPrimer is present, master_source_manifest.json canonicalHierarchy MUST exactly equal the canonicalHierarchy JSON above, preserving RadPrimer segment wording and order.
- Do not replace the RadPrimer hierarchy with STATdx breadcrumbs, source-pairing titles, ChatGPT project folders, IMAIOS module names, or a model-generated deck path.
- If packageText or an IMAIOS chunk library contains breadcrumb/deckPath/tags, derive them from this canonicalHierarchy plus the chunk's local parent group only; do not invent a different root hierarchy.

Expected Codex outputs in the imported queue bundle:
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt

Rules:
- Use RadPrimer as the canonical hierarchy/backbone when a RadPrimer source is present; in this bundle, that means using metadata.json canonicalHierarchy exactly.
- Use STATdx as supplemental depth when it is stronger for image examples, modality-specific detail, mechanisms, management, or differential nuance.
- Preserve source attribution with labels such as [RadPrimer], [STATdx], or [Both].
- Do not invent Core Radiology support. Treat Core-specific claims as verified only if the provided source packages contain auditable Core evidence.
- Do not create cards or a lecture yet. Create only the fused master source package and report.
- First run an image coverage gate: determine which RadPrimer images are exact duplicates, near duplicates, conceptual replacements, or not covered by STATdx.
- If image_evidence files are present, use those actual image files for visual duplicate classification. Caption similarity, matching diagnosis, or matching case wording is not enough to call an image an exact duplicate.
- Exact duplicate status requires visual evidence: same image file/source image ID, same pixel/perceptual appearance, same slice/screenshot, or a direct manual/source note. If that evidence is absent or uncertain, label the relationship near duplicate or conceptual replacement and keep the image primary.
- Do not discard a RadPrimer image unless STATdx clearly replaces the same teaching need. If unsure, keep the RadPrimer image in the primary teaching set.
- For image-recognition learning, near duplicates are valuable reinforcement, not waste. If a source image is a different patient, projection, slice, stage, severity, modality, or visually distinct example of the same disease pattern, keep it in the primaryTeachingSet and label its role as recognitionReinforcement.
- Conceptual replacements should not remove images by default. If two images teach the same diagnosis but look different, keep both in the primaryTeachingSet unless one is a literal duplicate or unusable.
- Archive only true duplicate/recovery images by default: same image, same slice, same screenshot, trivial size variant, or same visual content with only caption/source differences. If exact duplicate status is uncertain, keep the image primary.
- Do not omit images from the registry. Separate images into a primaryTeachingSet for future narrative/cards, recognitionReinforcement images within that primary set, and archiveOptionalDuplicates for literal duplicate/recovery/complete-source review.
- Treat same-patient, follow-up, adjacent-slice, procedure, comparison-view, and time-lapse image groups as atomic teaching clusters. If one image from that cluster is selected, include the companion images needed to understand the case.
- Do not replace or archive a single image inside a source case cluster unless the whole cluster is replaced by an equivalent cluster from the other source, or unless master_source_report.md explicitly explains why splitting the cluster is safe.
- master_source_report.md must list any selected/archived case-cluster splits and the reason. If there are no intentional splits, say that no source case cluster was intentionally split.
- Preserve grouping, time-lapse, procedure, or follow-up context when captions imply it.
- Use source-qualified image labels throughout the fused package. For human-facing prose, prefer one clean display label such as RadPrimer image 5 or STATdx image 4. Keep short labels such as RP-05 and SDX-04 in registry fields, filenames, metadata, and traceability notes rather than repeating both labels in the same prose sentence.
- The fused package must be directly usable as the article/source package for later narrative and card generation.

Required image registry contract:
- image_registry.json must be a JSON array.
- Each image object must include masterImageId, sourceKind, sourceLabel, sourceImageNumber, caption, usedFor, downloadRecommendation, plainFilename/annotatedFilename when known, and plainUrl/annotatedUrl when known.
- When provided, carry visualEvidence.evidenceFilename/evidenceVariant/downloaded into each image object so future repairs can audit duplicate decisions against the actual staged images.
- masterImageId should be RP-01, RP-02, etc. for RadPrimer and SDX-01, SDX-02, etc. for STATdx unless a clearer stable source code exists.
- downloadRecommendation must be primaryTeachingSet for images to download/use by default and archiveOptionalDuplicate only for exact duplicate/recovery images that should not drive default cards/lecture.
- For retained near duplicates or alternate same-pattern examples, set downloadRecommendation: primaryTeachingSet and include usedFor values such as recognitionReinforcement, alternateExample, modalityVariant, stageVariant, or severityVariant as appropriate.
- Downloadable filenames should be source-qualified, for example RP-05_RadPrimer_plain_<original>.jpg and SDX-04_STATdx_plain_<original>.jpg, so Anki fields can reference the exact source image.
- If a source image should be excluded from future teaching, keep it in the registry with downloadRecommendation: archiveOptionalDuplicate or usedFor: [] and explain why in master_source_report.md. The reason must explicitly say exact duplicate, same image/slice/screenshot, unusable, or another concrete non-teaching reason.

Required manifest/import contract:
- master_source_manifest.json must include articleTitle, canonicalHierarchy, canonicalDeckPath when provided, sourcePriority, sourceCoverage, imageCountBySource, sourceAttributionRules, selectedPrimaryImageIds, archiveOptionalImageIds, and sourceSelectionPlan.
- master_source_manifest.json canonicalHierarchy must be copied exactly from metadata.json canonicalHierarchy. Do not use STATdx_metadata.json breadcrumbTrail when RadPrimer_metadata.json is present.
- master_source_import.json manifest.canonicalHierarchy must match master_source_manifest.json canonicalHierarchy exactly.
- sourceSelectionPlan must state what text to keep from each source, what to downweight/skip, the primary image download/use set, archive duplicates, and generator instructions for narrative/cards.
- sourceSelectionPlan must include imageCurationPolicy: exact duplicates may be archived; near duplicates and conceptual replacements remain selected as recognition reinforcement unless visually identical or unusable.
- sourceSelectionPlan must include duplicateEvidencePolicy: exactDuplicate decisions require visual evidence from image_evidence files, same stable source image ID, image hashes, or explicit manual/source confirmation. Caption-only or topic-only similarity must be marked uncertain/nearDuplicate and kept primary.
- sourceSelectionPlan must include a caseClusterGuardrails section describing atomic cluster rules and any intentional cluster splits.
- master_source_import.json must be a single JSON object with: version, articleTitle, createdAt, packageText, manifest, imageRegistry, sourceSelectionPlan, selectedPrimaryImageIds, and archiveOptionalImageIds.
- packageText in master_source_import.json must be exactly the same text written to master_source_package.txt.

Topic: Chronic Subdural Hematoma
Created: 2026-06-30T02:05:48.947Z
Source pairing key: chronic_subdural_hematoma
Source pairing match: exact/manual cache
Sources: RadPrimer, STATdx
Image evidence files: 58