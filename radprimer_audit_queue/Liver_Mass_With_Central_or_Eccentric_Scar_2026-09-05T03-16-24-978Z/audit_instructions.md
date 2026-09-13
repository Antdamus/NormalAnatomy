# RadPrimer Card Audit Bundle

Audit goal: compare `generated_cards.tsv` against `source_package.txt` and `core_evidence.txt` when present, then produce a corrected, higher-yield TSV when needed.

Checklist:
- Preserve the existing TSV schema and column order.
- Remove cards that test prompt metadata, source-review bookkeeping, generator decisions, or vague audit statements.
- Split overloaded cards when one front is asking for too many independent facts.
- Add missing high-yield cards only when the source package or captured Core evidence supports them and they improve real radiology interpretation.
- Audit every High-Yield row against the radiologist-usefulness gate: keep or add it only if it teaches a modality-specific appearance, contrast/tracer behavior, differential discriminator, pitfall, report-critical/management pivot, or pretest clue that changes interpretation.
- Delete or rewrite generic High-Yield trivia, including broad 'most common' cards, unless the answer explicitly states how the fact changes image interpretation, differential ranking, reporting, or management.
- Improve mechanism and histology explanations when they are unclear; explicitly label any outside clarification added during review.
- Keep one main concept per card unless the card is intentionally testing a pathway or structured comparison.
- If `core_evidence.txt` is `NOT_PROVIDED` or `CLAIMED_BUT_UNSTRUCTURED`, treat Core-specific claims as unverified even when `metadata.json` or the TSV says Core validation passed.
- Preserve short non-diagnostic unique IDs in `Clinical_Context`; do not remove them solely because they are visible.
- Check image-based cards against the selected image list and grouped cases in `metadata.json`.
- Keep source attribution on the back of cards when the note type supports it.
- Treat Core-specific claims as auditable only if supported by `core_evidence.txt` or direct Core text inside `source_package.txt`.
- If `metadata.json` marks `coreEvidence.recoveredFromUnwrappedReport: true` and `core_evidence.txt` says `CORE_EVIDENCE_STATUS: USED`, treat the recovered Core validation report as usable audit evidence while noting that it came from the fallback parser.
- If `core_evidence.txt` says NOT_PROVIDED, EMPTY, or CLARIFICATION_NEEDED, remove or relabel Core-only claims unless independently supported by the visible bundle files.
- Do not remove or penalize the article-level summary field merely because it is repeated across rows; the user's Anki template may hide it by default. Correct the summary only when it is inaccurate, source-contaminated, overcompressed, missing important article structure, or inconsistent with the auditable source basis.
- If the summary or any card says Core + article synthesis but `core_evidence.txt` is missing/not provided, downgrade the source basis to article-only and remove unsupported Core-only details unless direct Core text is visible in `source_package.txt`.

Suggested final outputs:
- `corrected_cards.tsv`
- `corrected_cards_anki_import.tsv` with Anki import headers for the target deck
- `audit_report.md` with high-signal changes and remaining uncertainties

Anki import file rule:
- Target note type: `core_rad_notetype_v2`
- Target deck: `Corebook::GI::Liver::Liver Mass With Central or Eccentric Scar`
- Create `corrected_cards_anki_import.tsv` by prepending these lines to the corrected TSV rows:
  `#separator:tab`
  `#html:true`
  `#notetype:core_rad_notetype_v2`
  `#deck:Corebook::GI::Liver::Liver Mass With Central or Eccentric Scar`
- Do not add a field header row after those import directives.
- Keep `corrected_cards.tsv` as the clean no-header 22-column audit output.

Topic: Liver Mass With Central or Eccentric Scar
Engine/mode: pathology/chatgpt_cards
Created: 2026-09-05T03:16:24.978Z