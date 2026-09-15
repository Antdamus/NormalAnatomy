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
Large contexts use lossless rows grouped by deck. If needed, a second layout
stores repeated group values once, aliases identical ID fields and references
exactly repeated complete Q/A strings in a text table. Every selected record,
Q/A string, ID, card type, suspension/image flag and removal state is preserved.
The 350,000-character budget applies to inline data only. Comparisons that still
exceed it use `entries-file-v1`: complete, ordinary records in a JSON attachment
to the configured ChatGPT conversation. The prompt carries the snapshot identity,
scope and counts and requires reading every full Q/A with file/code tools before
drafting. No rows or answers are trimmed to fit. The extension verifies the
attachment has finished uploading before any send attempt; an unavailable upload
or missing/incomplete file blocks generation. Multipart source prompts attach the
bank with the final message. Clipboard/source packages keep the full comparison,
so local readers never depend on an uploaded file. Audit snapshots and comparison
files are always complete, regardless of the inline budget.

Composer readiness compares the full text while ignoring presentation-only
whitespace differences from browser paragraphs. It waits for the current live
editor to remain complete, retries once using native edit events if needed, and
rechecks before each send attempt. A partial prompt cannot satisfy this check.

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

## Browser regression fixtures

Run `node corebook_card_registry/tests/browser-fixture-server.cjs`. Open the
printed local URL for attachment tests and its `/composer` page for prompt
readiness tests. Both run the production helpers against a local test composer;
they never upload to ChatGPT or modify Anki. Stop the server after testing.
