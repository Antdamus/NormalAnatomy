# Gastric Motility Card Audit

Bundle: `C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Gastric_Motility_2026-07-16T23-21-54-254Z`
Audit completed: 2026-07-16T19:27:15

## Source Review

- Compared `source_package.txt`, `generated_cards.tsv`, `metadata.json`, `audit_instructions.md`, and `core_evidence.txt`.
- `core_evidence.txt` status: `NOT_PROVIDED`. The generated file claimed Core + RadPrimer synthesis, but the bundle did not contain auditable Core text.
- Corrected cards are therefore labeled as RadPrimer/source-package supported. Core-only claims were removed unless independently present in `source_package.txt`.
- Metadata contains Anki target deck `Corebook::Nuclear Medicine::Gastrointestinal Basic::Gastric Motility`, so `corrected_cards_anki_import.tsv` was created with Anki import directives.

## Card Changes

- Preserved all 18 selected image/case cards, including the grouped case using images 18 and 19.
- Replaced the repeated unsupported Core + RadPrimer summary block on every card with concise RadPrimer-only source basis and high-yield framing.
- Removed metadata/bookkeeping content: Core-only 4-hour adult threshold card, IMaios repository-label bookkeeping card.
- Split overloaded cards: combined pediatric milk/solid Tc-99m dose card, combined pediatric delayed-emptying criteria card, combined milk-study normal-ranges card.
- Added source-supported high-yield cards covering reflux mechanisms, symptoms, complications, severe-treatment options, milk-study acquisition, and nonstandard meal/formula reporting.
- Labeled outside clarification on geometric-mean mechanism explanations where the source states the recommendation but not the physics explanation.
- Normalized source-capture encoding artifacts in corrected fields.

## Output Summary

- Corrected TSV rows: 58
- Primary unknown/image cards: 18
- Differential drill cards: 4
- Mechanism cards: 3
- Boards-trap cards: 3
- General high-yield Q/A cards: 30
- TSV schema: 22 columns per row, no header row in `corrected_cards.tsv`.

## Remaining Uncertainties

- Core Radiology adult 4-hour residual activity threshold was removed because no auditable Core evidence was captured in this bundle.
- Source lists published pediatric and infant ranges as examples with variable methodology; corrected cards preserve the source wording and explicitly caution against treating them as universal cutoffs.
