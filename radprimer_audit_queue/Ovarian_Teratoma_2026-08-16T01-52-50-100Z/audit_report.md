# RadPrimer Card Audit Report: Ovarian Teratoma

Bundle: `C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Ovarian_Teratoma_2026-08-16T01-52-50-100Z`
Audit completed: 2026-08-16T01:56:35+00:00

## Source Basis

- Compared `source_package.txt`, `generated_cards.tsv`, `metadata.json`, `audit_instructions.md`, and `core_evidence.txt`.
- `core_evidence.txt` status is `NOT_PROVIDED`; Core-specific claims were treated as unverified unless independently present in `source_package.txt`.
- Active auditable source for corrected cards: RadPrimer + STATdx master source in `source_package.txt`.
- Anki target from `metadata.json`: `core_rad_notetype_v2` into `Corebook::Ultrasound::Female Pelvis Basic::Ovarian Teratoma`.

## Major Corrections

- Preserved the no-header 22-column TSV schema and column order.
- Replaced the repeated bulky summary block on all cards with concise RadPrimer/STATdx provenance; the missing-Core caveat is documented in this audit report rather than repeated on every card.
- Removed unsupported Core wording from image cards, high-yield cards, and paraneoplastic/epidemiology phrasing.
- Corrected the unsupported Core-only card asking for the "most common ovarian neoplasm" to the source-supported "most common ovarian germ cell tumor."
- Replaced the unsupported Core-only `>4 cm` torsion threshold card with a source-supported torsion lead-point card.
- Reworked the torsion Doppler trap card so it tests source-supported torsion search findings rather than unsupported preserved-flow exclusion logic.
- Labeled outside clarifications where explanatory physics/mechanism language extended beyond explicit source phrasing.

## Added Source-Supported Cards

- Tip-of-the-iceberg attenuation and why size measurement can be limited.
- Hair echo patterns: punctate/linear/dot-dash-dot.
- Torsion search findings in acute pain with dermoid.
- Extraovarian immature-teratoma/glial implantation clues: omental caking, peritoneal nodules, ascites/gliomatosis peritonei.
- Monodermal endocrine syndromes: struma ovarii/hyperthyroidism and ovarian carcinoid/carcinoid syndrome.

## Removed / Not Carried Forward

- No metadata/bookkeeping-only cards were present as standalone rows.
- Unsupported Core-only wording was not carried forward.
- The `>4 cm` torsion threshold was not retained because it was not auditable in `core_evidence.txt` or `source_package.txt`.

## Output Counts

- Original rows: 55
- Corrected rows: 60
- Added rows: 5
- Removed rows: 0

## Remaining Uncertainties

- No independent Core Radiology text was captured in this bundle, so the corrected deck should not be considered Core-verified.
- Image content was audited against captions and selected-image metadata; no separate pixel-level image review was performed during this pass.
