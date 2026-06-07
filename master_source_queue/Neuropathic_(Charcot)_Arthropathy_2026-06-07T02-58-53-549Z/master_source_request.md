# Master Source Request Bundle

Purpose: this bundle contains paired source packages that Codex should fuse into one master source artifact.

Expected Codex outputs in the imported queue bundle:
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt

Rules:
- Use RadPrimer as the canonical hierarchy/backbone when a RadPrimer source is present.
- Use STATdx as supplemental depth when it is stronger for image examples, modality-specific detail, mechanisms, management, or differential nuance.
- Preserve source attribution with labels such as [RadPrimer], [STATdx], or [Both].
- Do not invent Core Radiology support. Treat Core-specific claims as verified only if the provided source packages contain auditable Core evidence.
- Do not create cards or a lecture yet. Create only the fused master source package and report.
- First run an image coverage gate: determine which RadPrimer images are exact duplicates, near duplicates, conceptual replacements, or not covered by STATdx.
- Do not discard a RadPrimer image unless STATdx clearly replaces the same teaching need. If unsure, keep the RadPrimer image in the primary teaching set.
- Do not omit images from the registry. Separate images into a primaryTeachingSet for future narrative/cards and archiveOptionalDuplicates for recovery/complete-source review.
- Treat same-patient, follow-up, adjacent-slice, procedure, comparison-view, and time-lapse image groups as atomic teaching clusters. If one image from that cluster is selected, include the companion images needed to understand the case.
- Do not replace or archive a single image inside a source case cluster unless the whole cluster is replaced by an equivalent cluster from the other source, or unless master_source_report.md explicitly explains why splitting the cluster is safe.
- master_source_report.md must list any selected/archived case-cluster splits and the reason. If there are no intentional splits, say that no source case cluster was intentionally split.
- Preserve grouping, time-lapse, procedure, or follow-up context when captions imply it.
- Use source-qualified image labels throughout the fused package. Prefer labels like RadPrimer image 5, STATdx image 4, RP-05, and SDX-04 over bare image numbers when images from both sources are present.
- The fused package must be directly usable as the article/source package for later narrative and card generation.

Required image registry contract:
- image_registry.json must be a JSON array.
- Each image object must include masterImageId, sourceKind, sourceLabel, sourceImageNumber, caption, usedFor, downloadRecommendation, plainFilename/annotatedFilename when known, and plainUrl/annotatedUrl when known.
- masterImageId should be RP-01, RP-02, etc. for RadPrimer and SDX-01, SDX-02, etc. for STATdx unless a clearer stable source code exists.
- downloadRecommendation must be primaryTeachingSet for images to download/use by default and archiveOptionalDuplicate for duplicate/recovery images that should not drive default cards/lecture.
- Downloadable filenames should be source-qualified, for example RP-05_RadPrimer_plain_<original>.jpg and SDX-04_STATdx_plain_<original>.jpg, so Anki fields can reference the exact source image.
- If a source image should be excluded from future teaching, keep it in the registry with downloadRecommendation: archiveOptionalDuplicate or usedFor: [] and explain why in master_source_report.md.

Required manifest/import contract:
- master_source_manifest.json must include articleTitle, canonicalHierarchy, sourcePriority, sourceCoverage, imageCountBySource, sourceAttributionRules, selectedPrimaryImageIds, archiveOptionalImageIds, and sourceSelectionPlan.
- sourceSelectionPlan must state what text to keep from each source, what to downweight/skip, the primary image download/use set, archive duplicates, and generator instructions for narrative/cards.
- sourceSelectionPlan must include a caseClusterGuardrails section describing atomic cluster rules and any intentional cluster splits.
- master_source_import.json must be a single JSON object with: version, articleTitle, createdAt, packageText, manifest, imageRegistry, sourceSelectionPlan, selectedPrimaryImageIds, and archiveOptionalImageIds.
- packageText in master_source_import.json must be exactly the same text written to master_source_package.txt.

Topic: Neuropathic (Charcot) Arthropathy
Created: 2026-06-07T02:58:53.549Z
Source pairing key: charcot_neuropathic
Source pairing match: exact/manual cache
Sources: RadPrimer, STATdx