# RadPrimer Card Audit Report

Bundle: `C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Splenic_Trauma_2026-06-03T03-38-25-500Z`

Title: Splenic Trauma

## Inputs Reviewed

- `source_package.txt`
- `generated_cards.tsv`
- `metadata.json`
- `audit_instructions.md`
- `core_evidence.txt`

## Output Files

- `corrected_cards.tsv`
- `corrected_cards_anki_import.tsv`
- `audit_report.md`
- `_codex_audit_done.txt`

## Card Counts

- Original generated cards: 39
- Corrected cards: 41
- TSV schema preserved: 22 columns, original column order
- Tags column: preserved blank
- Anki import file: created with `#separator:tab`, `#html:true`, `#notetype:core_rad_notetype_v2`, and `#deck:Corebook::GI::Spleen::Splenic Trauma`

## Core Evidence Handling

Core-specific claims were treated as verified only when supported by `core_evidence.txt` or the supplied source package. The Core evidence file supports the main Core pivots: portal venous phase evaluation for parenchymal splenic injury, laceration as linear or branching decreased attenuation, delayed-phase enlargement or change for active extravasation, contained pseudoaneurysm/AVF behavior, pseudoaneurysm rupture risk, and the 2018 AAST incorporation of vascular injury and active bleeding.

No outside literature was used.

## Highest-Signal Corrections

- Populated the empty `summary` field on all corrected cards with a concise Core plus STATdx synthesis, including clear attribution boundaries for Core-supported facts versus STATdx-specific thresholds and image/caption details.
- Replaced a low-yield generic definition card with a source-supported traumatic splenic infarction card covering rarity, wedge-shaped hypoattenuation, arterial intimal injury mechanism, and delayed rupture or abscess risk.
- Reworked the splenic fracture card so it tests the key distinction from superficial laceration or cleft: a deep laceration extending from capsule through hilum.
- Split overloaded management content into focused cards for intervention-predicting vascular findings, embolization strategy, nonoperative management eligibility, and nonoperative failure predictors.
- Corrected AAST wording to distinguish contained-within-capsule active bleeding from beyond-capsule intraperitoneal active bleeding.
- Added same-patient stack labels before paired images where timing, axial level, or gross-pathology correlation could otherwise confuse the learner.
- Cleaned differential-drill phrasing to remove generator-style/meta language and make each card ask about the actual diagnostic distinction.

## Validation

- `generated_cards.tsv`: 39 rows, 22 columns per row.
- `corrected_cards.tsv`: 41 rows, 22 columns per row.
- `corrected_cards_anki_import.tsv`: 4 Anki directive rows plus 41 data rows.
- Post-import fix: two added high-yield split cards initially had empty first fields; both now have stable first-field IDs, with no empty first fields or duplicate IDs remaining.
- No prompt metadata, generator bookkeeping, vague audit statements, or unsupported Core claims were intentionally retained.

## Residual Notes

The Core evidence file cites visible Core Radiology page markers `GI:170-171`, but exact PDF absolute page numbers were not exposed. STATdx-specific numeric thresholds, FAST/DPL limitations, delayed reimaging timing, and nonoperative management failure statistics were kept only where supported by the supplied source package.
