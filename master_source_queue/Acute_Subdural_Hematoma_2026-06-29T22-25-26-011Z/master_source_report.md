# Master Source Report: Acute Subdural Hematoma

## Bundle

Imported bundle: C:\Users\josem.000\NormalAnatomy\master_source_queue\Acute_Subdural_Hematoma_2026-06-29T22-25-26-011Z
Created: 2026-06-29T22:32:43.003073Z
Canonical hierarchy source: metadata.json canonicalHierarchy copied exactly.
Canonical hierarchy: All Categories > Basic > Neuroradiology > Brain > Primary Effects of CNS Trauma > Acute Subdural Hematoma
Canonical deck path: Corebook::Neuro::Brain::Primary Effects of CNS Trauma::Acute Subdural Hematoma

## Source Review

Reviewed required files: RadPrimer_source_package.txt, STATdx_source_package.txt, RadPrimer_metadata.json, STATdx_metadata.json, metadata.json, master_source_request.md, image_evidence_manifest.json, and actual staged image_evidence files.

RadPrimer provides the canonical hierarchy/backbone and the core article organization. STATdx overlaps most core text and adds useful supplemental detail: hematohygroma/arachnoid tear nuance, skull metastasis in differential, cerebral amyloid angiopathy among spontaneous causes, CTA spot-sign/active extravasation examples, MR variants, subtle tentorial clusters, and severe herniation examples. No Core Radiology evidence was available in the bundle, so no Core-specific claims were asserted.

## Image Evidence Gate

Actual image_evidence files were present and inspected. RadPrimer files are 900 x 900; STATdx files are 1000 x 1000. SHA-256 hashes differ across every mapped pair because the exports differ in size/compression, but visual inspection of contact sheets and individual pair layouts showed same screenshot/slice/graphic equivalence for all RadPrimer images.

| RadPrimer image | STATdx coverage | Classification | Action |
| --- | --- | --- | --- |
| RadPrimer image 1 | STATdx image 1 | exact duplicate | archive RadPrimer copy; keep STATdx copy |
| RadPrimer image 2 | STATdx image 2 | exact duplicate | archive RadPrimer copy; keep STATdx copy |
| RadPrimer image 3 | STATdx image 3 | exact duplicate | archive RadPrimer copy; keep STATdx copy |
| RadPrimer image 4 | STATdx image 10 | exact duplicate | archive RadPrimer copy; keep STATdx copy |
| RadPrimer image 5 | STATdx image 5 | exact duplicate | archive RadPrimer copy; keep STATdx copy |
| RadPrimer image 6 | STATdx image 21 | exact duplicate | archive RadPrimer copy; keep STATdx copy |
| RadPrimer image 7 | STATdx image 22 | exact duplicate | archive RadPrimer copy; keep STATdx copy |
| RadPrimer image 8 | STATdx image 23 | exact duplicate | archive RadPrimer copy; keep STATdx copy |
| RadPrimer image 9 | STATdx image 24 | exact duplicate | archive RadPrimer copy; keep STATdx copy |
| RadPrimer image 10 | STATdx image 25 | exact duplicate | archive RadPrimer copy; keep STATdx copy |

No RadPrimer image was classified as near duplicate, conceptual replacement, or not covered. No source case cluster was intentionally split. Whole RadPrimer same-patient/time-lapse clusters were replaced only by equivalent whole STATdx exact-duplicate clusters.

## Output Files

- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt

## Import Contract Checks

- master_source_manifest.json canonicalHierarchy equals metadata.json canonicalHierarchy exactly.
- master_source_import.json manifest.canonicalHierarchy equals master_source_manifest.json canonicalHierarchy exactly.
- master_source_import.json packageText equals master_source_package.txt exactly.
- image_registry.json is a JSON array and includes all 35 source images.
- selectedPrimaryImageIds contains STATdx images 1-25 for default curated downloads.
- archiveOptionalImageIds contains RadPrimer images 1-10 as exact duplicate audit records.
- sourceSelectionPlan.imageDownloadPlan is present and source-qualified for extension download routing.
