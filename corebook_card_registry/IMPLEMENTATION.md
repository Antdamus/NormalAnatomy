# Corebook repetition prevention

Implemented and installed. The Anki bridge is active: a fresh live snapshot was
verified on September 13, 2026 (UTC), with 3,175 retained cards. Reload RadPrimer
Prompt Runner in Edge to activate the large-context fix described below.
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
