# Master Source Report: Varicocele

Bundle: C:\Users\josem.000\NormalAnatomy\master_source_queue\Varicocele_2026-07-28T03-16-30-014Z
Created: 2026-07-28T03:25:06Z

## Import
- Imported bundle confirmed as the latest master source queue item.
- Compared RadPrimer_source_package.txt, STATdx_source_package.txt, RadPrimer_metadata.json, STATdx_metadata.json, metadata.json, master_source_request.md, image_evidence_manifest.json, and downloaded image_evidence files.

## Canonical Hierarchy
- Used metadata.json canonicalHierarchy exactly: ["All Categories", "Basic", "Ultrasound", "Scrotum Basic", "Varicocele"]
- Canonical deck path: Corebook::Ultrasound::Scrotum Basic::Varicocele

## Image Coverage Gate
- RadPrimer image 1: conceptualReplacement via SDX-04; exact duplicate: no. Keep RadPrimer image 1 and STATdx image 4. The actual files show different graphics/source images; STATdx adds normal-versus-dilated comparison but does not duplicate the RadPrimer illustration.
- RadPrimer image 2: nearDuplicate via SDX-01, SDX-14, SDX-15, SDX-17; exact duplicate: no. Keep all. STATdx supplies similar grayscale varicocele patterns in different views/patients, including bilateral and right-sided examples, but none is the same screenshot or slice.
- RadPrimer image 3: nearDuplicate via SDX-02, SDX-03, SDX-10, SDX-11, SDX-16, SDX-18; exact duplicate: no. Keep all. STATdx overlaps the Doppler/Valsalva teaching target but uses visually distinct screenshots, composites, severities, and cases.
- RadPrimer image 4: conceptualReplacement via SDX-12; exact duplicate: no. Keep both. RadPrimer image 4 shows a prominent gonadal vein before/around treatment context, while STATdx image 12 shows post-coil lack of reflux; together they preserve procedure context.
- STATdx conceptually covers the RadPrimer image teaching needs, but no RadPrimer image is exactly duplicated by STATdx.
- Exact duplicate evidence reviewed: downloaded image_evidence files, stable source image IDs, and SHA-256 hashes. No same-image/same-slice/same-screenshot duplicate was found.

## Selection
- Selected primary images (22): RP-01, RP-02, RP-03, RP-04, SDX-01, SDX-02, SDX-03, SDX-04, SDX-05, SDX-06, SDX-07, SDX-08, SDX-09, SDX-10, SDX-11, SDX-12, SDX-13, SDX-14, SDX-15, SDX-16, SDX-17, SDX-18
- Archive optional images: none.
- No images were classified as exact duplicate or unusable.

## Case Clusters
- Preserved STATdx images 1-2 as a same-patient rest/Valsalva ultrasound cluster.
- Preserved STATdx images 7-9 as a CT secondary-cause cluster.
- Preserved STATdx images 10-12 as a symptomatic patient pre/post Valsalva and post-embolization cluster.
- Preserved STATdx images 14-16 as a same-patient grayscale/longitudinal/Valsalva Doppler cluster.
- No source case cluster was intentionally split.

## Source Synthesis
- RadPrimer used as article backbone and hierarchy source.
- STATdx used for reflux-duration detail, right-sided varicocele nuance, slow-flow/thrombus pitfalls, CT secondary causes, intratesticular variant, and treatment guidance.
- Core Radiology claims were not added because no auditable Core source passage was present in this bundle.

## Outputs
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
