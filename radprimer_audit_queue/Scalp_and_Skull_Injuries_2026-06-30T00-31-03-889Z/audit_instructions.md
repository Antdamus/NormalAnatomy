# RadPrimer Card Audit Bundle

Audit goal: compare `generated_cards.tsv` against `source_package.txt` and `core_evidence.txt` when present, then produce a corrected, higher-yield TSV when needed.

Checklist:
- Preserve the existing TSV schema and column order.
- Remove cards that test prompt metadata, source-review bookkeeping, generator decisions, or vague audit statements.
- Split overloaded cards when one front is asking for too many independent facts.
- Add missing high-yield cards only when the source package or captured Core evidence supports them.
- Improve mechanism and histology explanations when they are unclear; explicitly label any outside clarification added during review.
- Keep one main concept per card unless the card is intentionally testing a pathway or structured comparison.
- Check image-based cards against the selected image list and grouped cases in `metadata.json`.
- Keep source attribution on the back of cards when the note type supports it.
- Treat Core-specific claims as auditable only if supported by `core_evidence.txt` or direct Core text inside `source_package.txt`.
- If `core_evidence.txt` says NOT_PROVIDED, EMPTY, or CLARIFICATION_NEEDED, remove or relabel Core-only claims unless independently supported by the visible bundle files.

Suggested final outputs:
- `corrected_cards.tsv`
- `corrected_cards_anki_import.tsv` with Anki import headers for the target deck
- `audit_report.md` with high-signal changes and remaining uncertainties

Anki import file rule:
- Target note type: `core_rad_notetype_v2`
- Target deck: `Corebook::Neuro::Brain::Primary Effects of CNS Trauma::Scalp and Skull Injuries`
- Create `corrected_cards_anki_import.tsv` by prepending these lines to the corrected TSV rows:
  `#separator:tab`
  `#html:true`
  `#notetype:core_rad_notetype_v2`
  `#deck:Corebook::Neuro::Brain::Primary Effects of CNS Trauma::Scalp and Skull Injuries`
- Do not add a field header row after those import directives.
- Keep `corrected_cards.tsv` as the clean no-header 22-column audit output.

Topic: Scalp and Skull Injuries
Engine/mode: pathology/chatgpt_cards
Created: 2026-06-30T00:31:03.889Z