# RadPrimer Card Audit Report - Adnexal/Ovarian Torsion

Bundle audited: `C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Adnexal_Ovarian_Torsion_2026-08-16T01-12-02-482Z`

## Inputs compared
- `source_package.txt`
- `generated_cards.tsv`
- `metadata.json`
- `audit_instructions.md`
- `core_evidence.txt`

## Output files
- `corrected_cards.tsv`
- `corrected_cards_anki_import.tsv`
- `_codex_audit_done.txt`

## Summary
- Original card count: 45
- Corrected card count: 58
- TSV schema preserved: 22 columns, no header row in `corrected_cards.tsv`
- Anki target detected: `Corebook::Ultrasound::Female Pelvis Basic::Adnexal/Ovarian Torsion` using note type `core_rad_notetype_v2`

## Major audit actions
- Kept all 20 image-recognition cards because the fused source explicitly says RadPrimer/STATdx near-duplicates are recognition reinforcement and no exact duplicate images were proven.
- Removed the generated five-part framework card because it tested an organizing mnemonic rather than a source-stated fact.
- Split overloaded modality cards into cleaner retrieval targets for twisted-pedicle specificity, CT pedicle visibility limits, CT morphology, CT infarction/necrosis, T1 hemorrhage, T2 edema/peripheral follicles, and absent enhancement.
- Replaced unsupported `Model-inferred` differential labels on necrosis/infarction image cards and one differential drill with source-supported mimics from the differential section; removed the unsupported neonatal abdominal-mass mimic list rather than preserving a controlled inference.
- Added missing source-supported cards for first-line ultrasound technique, ovarian size/volume thresholds, venous-first Doppler abnormality, abnormal arterial waveforms, pregnancy timing/up-to-20% association, classic clinical presentation, isolated fallopian tube torsion, and key differentials.
- Cleaned wording issues including `Trace-free fluid` and `displaced in to`, and removed unsupported `hydrosalpinx` wording from the isolated tubal torsion drill.

## Core evidence handling
- `source_package.txt` states that no auditable Core text was supplied in that fused package.
- `core_evidence.txt` is present and marked `CORE_EVIDENCE_STATUS: USED`, so Core-specific support was accepted only for facts listed in that evidence ledger: definition/vascular pedicle, reproductive-age and pregnancy association, dermoid lead point, dual arterial supply/preserved Doppler flow, enlarged edematous ovary/peripheral follicles/free fluid, >4 cm enlargement clue, and pathognomonic twisted pedicle when seen.
- More detailed venous-first physiology, CT/MR features, >50 HU hemorrhage, neonatal torsion, isolated tubal torsion, viability indicators, and lead-point breadth remain attributed to RadPrimer/STATdx rather than Core.

## Outside clarification
No outside medical literature was added. Mechanism and modality explanations were kept within `source_package.txt` plus the auditable `core_evidence.txt` ledger.

## Remaining uncertainty
The source package and separate Core evidence ledger disagree on whether Core evidence was available inside the fused package. The corrected deck resolves this by labeling Core use as coming from `core_evidence.txt`, not from `source_package.txt`.
