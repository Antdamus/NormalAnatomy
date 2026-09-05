# Tuboovarian Abscess Card Audit

Bundle: Tuboovarian_Abscess_2026-08-16T01-34-45-461Z

## Source Basis
- Compared generated_cards.tsv against source_package.txt, metadata.json, audit_instructions.md, and core_evidence.txt.
- core_evidence.txt reports CORE_EVIDENCE_STATUS: NOT_PROVIDED.
- Corrected output therefore treats the deck as RadPrimer + STATdx article synthesis only. No Core-specific claims are treated as verified.

## Output Summary
- Wrote corrected_cards.tsv with the original 22-column schema and column order preserved.
- Wrote corrected_cards_anki_import.tsv with Anki import directives for core_rad_notetype_v2 and deck Corebook::Ultrasound::Female Pelvis Basic::Tuboovarian Abscess.
- Wrote _codex_audit_done.txt completion marker.

## Major Corrections
- Replaced the repeated bloated card summary with a compact article-only RadPrimer + STATdx summary.
- Removed misleading "Core GAP invoked" attribution from the repeated summary and replaced it with explicit "Core evidence was not provided" provenance.
- Populated Image_Annotated from metadata.imageRegistry for every image-bearing card using the usual image-plus-caption stack format: <div class="stackItem"><img ...><div class="stackCap">caption</div></div>. All 32 image rows now include captions directly under annotated images. Note: this browser audit bundle contains metadata references but does not contain the actual JPG media files.
- Populated Original_Caption from metadata.imageRegistry for every image-bearing card; multi-image cards preserve image order and join captions with <br><br>.
- Preserved 27 image-recognition cards covering RadPrimer images 1-10 and STATdx images 1-48 through individual cards and same-patient clusters.
- Preserved source-supported differential drill cards, but repaired bracketed differential-drill bookkeeping suffixes in Clinical_Context into plain alphanumeric uniqueness codes.
- Kept high-yield and mechanism cards only where supported by the fused source package; no outside-literature clarification was added.

## Quality Notes
- Tubo-ovarian complex vs tubo-ovarian abscess distinction is source-supported by RadPrimer: TOC preserves a distinguishable ovary; TOA loses recognizable separate ovarian anatomy.
- DWI/ADC teaching is STATdx-supported, with the key pitfall that endometrioma and dermoid may also restrict.
- Fitz-Hugh-Curtis findings and secondary spread from diverticulitis/appendicitis/colitis are STATdx-supported.
- Management escalation cards are source-supported by the fused package, not by auditable Core evidence.

## Remaining Uncertainty
- No Core Radiology text was captured in this bundle. Any future Core-labeled deck should be regenerated or re-audited only after auditable Core excerpts/pages are present.
