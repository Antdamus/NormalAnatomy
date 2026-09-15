# Corebook repetition prevention

Implemented and installed. The Anki bridge is active: a fresh live snapshot was
verified on September 13, 2026 (UTC). The latest check read 3,248 retained cards.
Reload RadPrimer Prompt Runner in Edge and refresh ChatGPT to activate the
attachment fallback described at the end of this document.
No existing Anki notes, cards, decks or review history were modified.

## Implemented

- Read-only collection snapshot through the existing local Anki bridge.
- Current retained cards are authoritative, including suspended/filtered cards.
- Separate observed deletion, revision and moved-card history. Generated files
  never become accepted-card records. Earlier unobserved deletions are unknown.
- Separate histories for each profile/collection identity; failed reads preserve
  the previous history instead of classifying missing data as deletion.
- Fresh retained-card context in page-runner, grouped/master-source, popup-copy
  and Codex card modes. Related organ cards and global lexical candidates are
  compared by learning objective across question categories.
- Current snapshot/context in both inline and downloaded audit-bundle paths.
- Per-note semantic review and a validator that refreshes Anki, checks the
  reviewed snapshot, rejects exact conceptual repeats, and records final hashes.
- Existing-note corrections require the complete original Clinical_Context and
  matching note type. Repeated summaries do not drive concept matching.
- Distinct useful images and atomic clusters remain protected; text similarity
  cannot establish an image duplicate. The TSV schema is unchanged.
- Source prompt modules rebuilt; repository guidance covers future local audits.

## Validation

Passed 14 Python regression tests covering history reconciliation, restoration,
suspension, collection boundaries, field selection, failed/stale reads, exact
cross-category repeats, removed questions, existing-note identity, import schema
and preserving distinct images.

Passed browser guard and full service-worker integration suites covering captured
and noncaptured prompts, popup messages, metadata/wake-up instructions, all three
audit staging routes, source preservation and interrupted Anki connections.
JavaScript and Python syntax checks and git diff whitespace checks passed.

The installed add-on matched the repository baseline before updating. Its prior
code was backed up in install_backup/20260912-211840. The installed new files
were verified against their workspace SHA-256 hashes.

## Activation and scope

Restart Anki once, then use Reload for RadPrimer Prompt Runner at edge://extensions.
The first successful collection read establishes the retained-card baseline.
Keep Anki open for card generation. Future audits use the commands in README.md.

Lexical retrieval is a candidate finder, not a semantic proof. The required
agent/human review judges each question's distinct contribution. This change
prevents future duplication; it does not automatically delete existing repeats.

API references: https://addon-docs.ankiweb.net/the-anki-module.html and
https://docs.ankiweb.net/searching.html.

Recorded: 2026-09-13T01:21:33.818087+00:00


## Large-context correction — September 13, 2026 (UTC)

The old caption query matched any two words from all captions pooled together,
selecting almost the entire collection for the Periportal Lesion source. Global
retrieval now uses title/deck terms and uncommon term pairs within individual
captions. Complete target-scope cards and exact organ deck labels across
specialties stay mandatory. Large contexts factor out repeated field names and
deck paths without truncating Q/A text, IDs or selected rows. The original
350,000-character data limit remains enforced after packing. Full audit
snapshots are staged before attempting to build the bounded prompt context.

Live verification preserved all 526 cards under Liver organ labels. The recent
Periportal Lesion source selected 564 cards in 347,341 characters; Liver Lesion
Containing Gas selected 554 cards in 342,388 characters. Both fit. This is a
retrieval/packaging check, not a completed semantic or source/media card audit.
Private verification details are in data/large_context_verification.json.

The added test_large_context.cjs suite covers common caption noise, caption
boundaries, cross-specialty organ coverage, removed history, global candidates,
lossless round-trip packing, size/freshness gates and audit snapshot preservation.
It passed alongside the existing guard/routes suites and all 14 Python tests.
Edge's browser automation policy blocks extension settings, so extension reload
and a user-facing generation retry remain manual activation steps.

## Additional lossless packing — September 13, 2026 (21:49 UTC)

The live Liver Lesion Containing Gas run reproduced the reported failure exactly:
599 candidates, including all 571 related-organ records, occupied 375,303
characters in deck-grouped rows. The bank had grown to 3,218 retained cards and
two removal-history entries; changing the deck scope was not appropriate.

An additional `deck-grouped-defaults-v2` fallback factors shared group values,
aliases equal ID fields, and references exactly repeated whole Q/A strings in a
text table. Prompt instructions specify how to read it. Retained and removed
states remain separate; no records are merged and no Q/A text is shortened.
The 350,000-character limit and fresh-snapshot requirements remain in place.

Fresh live verification through the actual master-source extraction and all
four card modes retained the same 599 candidates in 349,104 characters. An
independent decoder reconstructed every selected field exactly. The canonical
Liver Lesion Containing Gas deck and all 14 selected images remained intact.
The expanded large-context tests cover exact round trips, different answers to
shared questions, matching ID aliases, removal IDs, and runtime metadata. The
guard and service-worker route regression suites also pass.

Verification is stored in `data/gas_context_review/verification.json`. This was
generation-context preparation, not card generation or a semantic card audit.
Anki notes, cards and decks were not changed. Reload the unpacked extension and
refresh the RadPrimer page to activate the updated helper.

## File transport for growing comparisons — September 13, 2026 (22:54 UTC)

The Multiple Hypointense Liver Lesions (T2WI) master source reproduced the next
failure exactly: 643 candidates, including all 601 related-organ records, occupied
374,576 characters after both lossless packing steps. Further packing alone would
only postpone recurrence as the collection grows.

The inline budget is now a transport threshold. Above it, `entries-file-v1`
preserves all selected records as ordinary JSON objects in an attachment, with an
`attached-entries-v1` manifest in the prompt. The model must verify the snapshot,
scope and count and read every full Q/A using file/code tools before drafting.
The complete source/clipboard and local audit comparison remain self-contained.
Existing Anki freshness and final per-note audit gates are unchanged.

The ChatGPT helper verifies the exact, uniquely named attachment in the composer,
waits for uploading/processing to finish and Send to become available, and checks
again before each send fallback. Prompt text mentioning a filename cannot satisfy
this check. A failed/missing upload prevents submission. Multipart prompts carry
the attachment with FINALIZE; manual-fill and send-only modes also attach it.

Fresh verification through the real master-source extraction and all four card
modes retained exactly 643 records in a 504,056-character JSON attachment. All 23
selected images, their groups, raw source output and canonical Liver deck route
were preserved. Regression tests cover multi-megabyte bank growth, exact file
contents, retained/removal identities, malformed data, all send routes and failed
or removed attachments. Private live results are in
`data/hypointense_context_review/verification.json`.

All five Corebook JavaScript suites, 14 Python tests and 47 visual-lecture tests
passed. The local browser fixture in Edge passed real File/DataTransfer delivery,
progress, failure, missing-control, missing-chip and removed-file checks. The
live ChatGPT composer exposes the expected file input; a live upload/generation
retry is still pending activation. Edge's automation interface cannot claim its
extension settings tab, so extension reload remains a manual step.

This verifies generation preparation and transport, not semantic card review or
medical source/media auditing. No Anki cards, notes or decks were changed.

## Composer readiness correction — September 13, 2026

The first live attachment run exposed a short-message verification bug at the
multipart FINALIZE step. Fast insertion creates one paragraph per input line;
the browser's `innerText` adds paragraph spacing. The old start/end comparison
preserved those extra newlines and rejected complete short messages. A real Edge
fixture reproduced this with 226 expected characters rendered as 235 characters.
This failure occurred before the comparison upload.

Verification now normalizes whitespace for comparison only and checks the entire
prompt, replacing the old permissive long-text heuristic as well. It reacquires
the current editor, waits for 600 ms of complete content, and retries once through
native edit events after an eight-second readiness timeout. A stale/detached
editor, truncated text or changed text cannot authorize uploading or sending.
The text is checked again before each submission attempt, including fallbacks.

The Edge fixture now passes the exact paragraph-spacing reproduction, complete
large text, rejection of truncated/changed text, delayed editor replacement and
native-input recovery. Six Corebook JavaScript suites, 47 visual-lecture tests
and 14 Python tests pass. The attachment routing suite also checks that a prompt
readiness failure never reaches upload/send. Reload the extension and refresh
ChatGPT to activate; the corrected live ChatGPT generation retry remains pending.
