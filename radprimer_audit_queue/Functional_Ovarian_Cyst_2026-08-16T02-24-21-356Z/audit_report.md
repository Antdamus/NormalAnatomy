# Functional Ovarian Cyst Card Audit Report

Bundle audited: `Functional_Ovarian_Cyst_2026-08-16T02-24-21-356Z`

## Source Basis

- Compared `generated_cards.tsv` against `source_package.txt`, `metadata.json`, `audit_instructions.md`, and `core_evidence.txt`.
- `core_evidence.txt` status is `NOT_PROVIDED`; corrected cards therefore use RadPrimer + STATdx fused master source support only.
- Anki target found in `metadata.json`: `core_rad_notetype_v2` into `Corebook::Ultrasound::Female Pelvis Basic::Functional Ovarian Cyst`.

## Major Corrections

- Replaced the repeated card-level `Core + RadPrimer + STATdx synthesis` block with article-only provenance and an explicit note that no Core-specific claims are verified in this bundle.
- Removed or rewrote unsupported Core threshold language for follicular/corpus luteal cyst definitions.
- Corrected the simple-cyst SRU management card to match the RadPrimer source-package wording: up to 5 cm no follow-up; >5 to <=7 cm annual follow-up can be used if confidently characterized, stopping if stable at 2 years; suboptimal or >7 cm gets short-interval characterization/resolution imaging and later growth-rate evaluation.
- Replaced the unsupported ectopic-pregnancy PPV card with a source-supported ring-of-fire versus ectopic-location discriminator.
- Tightened hemorrhagic-cyst and torsion-pitfall wording to avoid uncaptured details such as posterior enhancement, concave clot margins, absent/reversed diastolic flow, dual/intermittent perfusion, and the unsupported PPV statistic.
- Removed theca-lutein and Core-threshold framework claims from the subtype framework because they are not auditable in the bundle.
- Added three source-supported high-yield cards covering natural history/symptoms, corpus luteum behavior in pregnancy, and symptomatic/recurrent cyst management.

## Output Summary

- Original rows: 43, all with 22 columns.
- Corrected rows: 46, all with 22 columns.
- Preserved image diagnosis cards and selected-image references from `metadata.json`.
- Added `corrected_cards_anki_import.tsv` with Anki import directives for the target note type and subdeck.

## Remaining Uncertainties

- No Core Radiology evidence was captured, so no Core-only cards or Core-specific thresholds were retained as verified.
- Some differentials remain source-supported at the category level from the fused source package; where a differential was model-inferred from image pattern in the draft, the corrected explanations avoid presenting it as a Core fact.
