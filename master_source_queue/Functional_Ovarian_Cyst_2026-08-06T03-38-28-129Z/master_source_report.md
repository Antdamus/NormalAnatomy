# Master Source Report: Functional Ovarian Cyst

## Import
- Imported bundle: Functional_Ovarian_Cyst_2026-08-06T03-38-28-129Z
- Active queue pointer: master_source_queue/_latest_master_source_bundle.txt
- Required source files compared: RadPrimer_source_package.txt, STATdx_source_package.txt, RadPrimer_metadata.json, STATdx_metadata.json, metadata.json, master_source_request.md.

## Canonical Routing
- Canonical hierarchy was copied exactly from metadata.json: All Categories > Basic > Ultrasound > Female Pelvis Basic > Functional Ovarian Cyst
- Canonical deck path: Corebook::Ultrasound::Female Pelvis Basic::Functional Ovarian Cyst
- STATdx breadcrumb was not used for deck routing.

## Text Synthesis
- RadPrimer is the canonical hierarchy/backbone and supplies the base terminology, imaging, differential, pathology, clinical issues, and management structure.
- STATdx is concordant for the core article and supplements with O-RADS 2022 wording and a stronger supplemental image set.
- No Core Radiology source text was present in the bundle, so no Core-supported claims were added.

## Image Evidence Review
- image_evidence_manifest.json and image_evidence/ were present and inspected using actual evidence images.
- Contact sheets generated for review: duplicate_pair_contact_sheet.jpg and statdx_supplement_contact_sheet.jpg.
- RadPrimer image coverage gate: STATdx fully covers the RadPrimer image set as exact duplicates for images 1-4.
- Exact duplicate evidence: each RadPrimer image 1-4 shares the same stable source image ID with the corresponding STATdx image 1-4, and the evidence images visually match.

## Image Selection
- Selected primary images: RP-01, RP-02, RP-03, RP-04, SDX-05, SDX-06, SDX-07, SDX-08, SDX-09, SDX-10, SDX-11, SDX-12, SDX-13, SDX-14.
- Archived optional duplicates: SDX-01, SDX-02, SDX-03, SDX-04.
- No images were archived for being unusable.
- No near duplicate or conceptual replacement was archived.

## Cluster Handling
- No explicit same-patient, follow-up, procedure, adjacent-slice, comparison-view, or time-lapse cluster was identified.
- No source case cluster was intentionally split.

## Output Files
- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt
