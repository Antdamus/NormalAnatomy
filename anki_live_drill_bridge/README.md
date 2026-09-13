# IMAIOS Live Drill Bridge

This Anki add-on exposes a local-only bridge at `http://127.0.0.1:8765` so the Edge extension can run Anki review from the IMAIOS floating panel.

The browser extension reads the current Anki reviewer card, extracts any `#imaiosDrill=...` link, restores the drill inside IMAIOS, and sends normal Anki review commands back to Anki:

- `GET /state`
- `POST /show-answer`
- `POST /answer` with `{"ease": 1|2|3|4}`

The add-on does not edit notes directly. It uses Anki's reviewer actions, so Anki remains the scheduler and source of truth.

## Corebook retained-card bank

The updated add-on also exposes `POST /corebook/snapshot` for local clients and
browser extensions. It reads all cards currently in Corebook, including
suspended cards and their original membership while in filtered decks. It keeps
an external removal/edit history in `corebook_card_registry/data/` and never
writes to the Anki collection. See `../corebook_card_registry/README.md`.
The installer backs up the prior add-on code. Restart Anki after installation.
