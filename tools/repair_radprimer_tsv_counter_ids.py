from __future__ import annotations

import argparse
import base64
import csv
import hashlib
import json
import re
from pathlib import Path


FIELDS_PER_ROW = 22
COUNTER_CODE_RE = re.compile(r"(?:(?<=\s)|^)(Q\d{11}|CASE\d{6,}|ROW\d{6,}|UNKNOWN\d{6,})$")
PREFERRED_CODE_RE = re.compile(r"^[A-Z0-9]{12}$")
COUNTER_ONLY_RE = re.compile(r"^(Q\d{11}|CASE\d{6,}|ROW\d{6,}|UNKNOWN\d{6,})$")


def make_code(seed: str, used: set[str]) -> str:
    nonce = 0
    while True:
        digest = hashlib.sha256(f"{seed}|{nonce}".encode("utf-8")).digest()
        code = base64.b32encode(digest).decode("ascii").rstrip("=")[:12]
        if PREFERRED_CODE_RE.match(code) and code not in used and not COUNTER_ONLY_RE.match(code):
            used.add(code)
            return code
        nonce += 1


def repair_context(value: str, row_index: int, row_text: str, used: set[str]) -> tuple[str, bool]:
    stripped = value.strip()
    if PREFERRED_CODE_RE.match(stripped) and not COUNTER_ONLY_RE.match(stripped):
        used.add(stripped)
        return value, False

    trailing = re.search(r"([A-Z0-9]{12})$", stripped)
    if trailing and not COUNTER_ONLY_RE.match(trailing.group(1)):
        used.add(trailing.group(1))
        return value, False

    match = COUNTER_CODE_RE.search(value)
    if not match:
        return value, False

    code = make_code(f"{row_index}|{row_text}", used)
    start, end = match.span(1)
    return value[:start] + code + value[end:], True


def read_rows(path: Path) -> list[list[str]]:
    return list(csv.reader(path.open(encoding="utf-8-sig", newline=""), delimiter="\t"))


def write_rows(path: Path, rows: list[list[str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t", lineterminator="\n")
        writer.writerows(rows)


def write_anki_import(bundle: Path, rows: list[list[str]]) -> None:
    metadata_path = bundle / "metadata.json"
    if not metadata_path.exists():
        return

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    anki = metadata.get("anki") or {}
    note_type = anki.get("noteType") or anki.get("ankiNoteType") or "core_rad_notetype_v2"
    deck_name = anki.get("deckName") or metadata.get("ankiDeckName")
    if not deck_name:
        return

    out = bundle / "corrected_cards_anki_import.tsv"
    with out.open("w", encoding="utf-8", newline="") as handle:
        handle.write("#separator:tab\n")
        handle.write("#html:true\n")
        handle.write(f"#notetype:{note_type}\n")
        handle.write(f"#deck:{deck_name}\n")
        writer = csv.writer(handle, delimiter="\t", lineterminator="\n")
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Replace sequential Clinical_Context IDs in a RadPrimer corrected TSV.")
    parser.add_argument("bundle", type=Path, help="Bundle directory containing corrected_cards.tsv.")
    args = parser.parse_args()

    bundle = args.bundle
    tsv = bundle / "corrected_cards.tsv"
    rows = read_rows(tsv)
    used: set[str] = set()
    changed = 0

    for i, row in enumerate(rows, 1):
        if len(row) != FIELDS_PER_ROW:
            raise ValueError(f"Row {i} has {len(row)} columns, expected {FIELDS_PER_ROW}.")
        row_text = "\t".join(row)
        repaired, did_change = repair_context(row[0], i, row_text, used)
        if did_change:
            row[0] = repaired
            changed += 1

    write_rows(tsv, rows)
    write_anki_import(bundle, rows)
    print(f"rows: {len(rows)}")
    print(f"ids_repaired: {changed}")
    print(f"columns_per_row: {FIELDS_PER_ROW}")


if __name__ == "__main__":
    main()
