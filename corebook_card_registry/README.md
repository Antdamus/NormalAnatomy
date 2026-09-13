# Corebook card registry

The current Anki collection is authoritative. This directory stores an external
snapshot and observed removal history, never a ledger of accepted generated TSVs.
The Anki bridge reads the collection; it never imports, edits, deletes, suspends
or reschedules notes/cards. Local data is in `data/` and excluded from Git.

The first successful read establishes a baseline. Earlier deletions cannot be
inferred from generated bundles. Subsequent reads distinguish deleted notes,
removed cards, revised questions and moves out of Corebook. Suspended cards and
cards temporarily in filtered decks remain owned. A restored identical card
overrides its old removal record. Profiles/collection identities have separate
histories; failed reads never erase history or turn missing data into deletions.

The bridge refreshes after profile opening, synchronization and note/deck edits.
Generation and audit also request a fresh read. Only related questions/answers
are inserted into the configured ChatGPT prompt. The complete local snapshot is
saved with audit bundles. The context contains the complete target scope and
matching organ deck labels across specialties, plus focused lexical candidates
across Corebook; it does not claim perfect semantic retrieval. Title/deck terms
and uncommon term pairs within individual captions drive global retrieval.
Common words pooled across all captions must not select the whole collection.
Large contexts use lossless rows grouped by deck: all selected Q/A text, IDs,
card types, suspension/image flags and removal states are preserved. The 350,000
character data limit still applies after packing; no rows or answers are trimmed
to fit. A complete snapshot is saved for audit even if prompt packing fails.

## Installation

Run `anki_live_drill_bridge/install_to_anki.ps1`, restart Anki once, and reload the
unpacked RadPrimer extension. The installer sets the registry location here.
The local endpoint is `POST http://127.0.0.1:8765/corebook/snapshot` with `{}`.
It accepts local clients and browser-extension origins; it exposes no write API.

## Generation and audit

Card generation requires a current snapshot. Image-only downloads, master-source
synthesis and narratives do not require it. Keep Anki open for card runs.

For an imported audit bundle:

1. Run `python tools/corebook_card_guard.py prepare --bundle "<folder>"`.
2. Review full related-organ entries and cross-category candidates, and inspect
   `corebook_snapshot.json` when broader conceptual overlap is plausible.
3. Produce corrected TSVs and `card_overlap_review.json`. Each final note needs
   `clinicalContext`, `disposition`, `learningObjective`, `rationale` and
   `matchedEntryIds`. Allowed final dispositions: `newConcept`, `distinctImage`,
   `existingNoteCorrection`. Record skipped questions separately.
4. Run `python tools/corebook_card_guard.py validate --bundle "<folder>"`.
5. Write the normal completion marker only after this and the source/media audit
   pass. `corebook_validation.json` binds the result to final file hashes.

The validator refreshes Anki again. Changed content requires a new review. Exact
Q/A repeats are rejected automatically; semantic equivalence requires the
explicit review and cannot be certified by a similarity score. No automatic
deletion or merging of existing Anki notes is performed.

Existing duplicate cards can be identified from the bank during future audits;
this change prevents new duplication but does not clean the live collection.
