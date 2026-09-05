# RadPrimer Card Audit Report: Abdominal Abscess

## Bundle
- Imported bundle: C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Abdominal_Abscess_2026-08-25T02-27-59-708Z
- Compared: source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md, and core_evidence.txt.
- Core evidence status: USED. Core-specific cards were retained only when supported by core_evidence.txt or the fused source package.

## Summary
- Input TSV: 68 rows, 22 columns.
- Corrected TSV: 77 rows, 22 columns.
- Anki import file written because metadata.json specifies note type core_rad_notetype_v2 and deck Corebook::GI::Peritoneum, Mesentery, and Abdominal Wall::Abdominal Abscess.

## Major Corrections
- Preserved all 34 selected primary image cards and kept the selected image set aligned with metadata.masterImageIds.
- Rewrote the 34 image-card diagnosis backs to replace generic boilerplate with source-specific discriminators and concise differentials.
- Revised mechanism cards for appendicitis and diverticulitis to remove unsupported detailed pathophysiology and keep only source-supported contained-perforation/localization framing.
- Labeled the rim-enhancement explanation as source-derived clarification from the source-described fibrocapillary capsule.
- Corrected splenic fungal abscess wording from "almost all" to the supported "typically small, multiple, and immunocompromised."
- Split the overloaded drainage-framework card into separate cards for good drainage target criteria, patient coagulopathy limits, and collection-related poor targets/contraindications.
- Added missing source-supported high-yield cards covering postoperative correlation/aspiration, ultrasound complexity and drainage difficulty, DWI caveat, loculated ascites, pancreatic pseudocyst, hematoma, and abscess-versus-phlegmon management impact.

## Removed Cards
- No full rows were removed. I did not find prompt-metadata or bookkeeping cards in the generated TSV; the repeated summary field is part of the note type and was preserved.

## Remaining Notes
- Some Differential Drill cards retain explicitly labeled model-inferred differentials where the source package did not list a complete image-specific differential. These labels were left visible rather than silently presenting them as Core/RadPrimer/STATdx facts.
- No cards or claims were added from unaudited Core material beyond core_evidence.txt and the fused source_package.txt.
