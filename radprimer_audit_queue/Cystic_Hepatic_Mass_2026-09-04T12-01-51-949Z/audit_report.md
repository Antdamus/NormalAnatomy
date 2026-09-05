# Card Audit Report: Cystic Hepatic Mass

## Bundle
- Imported bundle: C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Cystic_Hepatic_Mass_2026-09-04T12-01-51-949Z
- Compared: source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md, and core_evidence.txt.
- Core evidence status: USED. Core-specific claims were retained only when supported by core_evidence.txt or direct source_package text.

## Main Corrections
- Preserved the 22-column TSV schema and original column order.
- Kept the 53 generated cards and added 4 focused source-supported cards, for 57 corrected rows total.
- Removed no rows as pure metadata/bookkeeping; the generated set did not contain prompt-audit or source-review bookkeeping cards.
- Repaired all image src filenames to match metadata.json downloadFiles exactly, replacing short-hash filenames with the bundle media names.
- Added annotated-image backs and source captions for the 22 image diagnosis cards.
- Replaced the unsupported Core-specific biliary cystadenoma 15% malignant-degeneration claim with the source-supported complete-resection/recurrence management point.
- Removed an unsupported reactive perilesional hyperenhancement phrase from the pyogenic abscess MRI card.
- Labeled limited mechanism explanation as outside clarification for biliary hamartomas and opposed-phase focal-fat discrimination.

## Added High-Yield Coverage
- Double-target sign for hepatic pyogenic abscess.
- Ductal communication framework for biliary IPMN and Caroli disease.
- Undifferentiated hepatic sarcoma paradoxical US versus CT/MR appearance from myxoid stroma.
- Biloma/seroma management context: routine post-traumatic/post-procedural collection versus ominous transplant biloma from hepatic artery thrombosis.

## Core Evidence Handling
- Retained Core-supported cards for simple cyst CT/MR/US features, ADPKD/ADPLD association, amebic abscess pain, hepatic artery thrombosis after transplant, pyogenic abscess MRI/US features, hydatid signs, cystic-metastasis primaries, choledochal-cyst malignancy risk, and bile-leak imaging.
- Core was not used to support the replaced cystadenoma 15% figure because that percentage is not present in core_evidence.txt.
- No external literature search was performed.

## Outputs
- corrected_cards.tsv
- corrected_cards_anki_import.tsv
- audit_report.md
- _codex_audit_done.txt
