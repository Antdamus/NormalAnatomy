# Corebook card work

For Corebook card generation or card-quality audits, read
`corebook_card_registry/README.md` and apply the retained-card gate. The user's
current Anki collection is authoritative; never treat generated TSVs as accepted
cards or infer historical deletions from them.

Before generation, obtain a fresh `POST /corebook/snapshot` from the local Anki
bridge and compare learning objectives across the related organ and card types.
Preserve distinct useful images, caption HTML/icons, atomic groups and existing
IDs. Remember removed questions without banning their entire disease/topic.

For audits run `python tools/corebook_card_guard.py prepare --bundle <folder>`;
review `corebook_snapshot.json` and `card_overlap_candidates.json`; write explicit
per-note decisions to `card_overlap_review.json`; then run its `validate`
command. Complete the normal source/media audit as well. Write the audit done
marker only after `corebook_validation.json` passes for the final TSV hashes.

If the live bank is unavailable, preserve drafts and state what remains
unchecked. Do not silently substitute old bundles or claim no existing overlap.
These steps are read-only with respect to Anki. Live edits/deletions are outside
this prevention workflow unless the user requests them.
