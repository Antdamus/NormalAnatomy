from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path


FIELDS_PER_ROW = 22
CLEAN_FIELD_INDEXES = [1, 2, 4, 7, 8, 9, 11, 13, 15]


def strip_visible_references(value: str) -> str:
    if not value:
        return value

    cleaned = value
    cleaned = re.sub(
        r'<div\b[^>]*class=(["\'])[^"\']*\bimgRef\b[^"\']*\1[^>]*>[\s\S]*?</div>',
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r'(^|<br\s*/?>|\s)(?:<b>|<strong>)?\s*Image reference:\s*[\s\S]{0,800}?\.(?:jpg|jpeg|png)\s*(?:</b>|</strong>)?\s*',
        r"\1",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r'(?:^|<br\s*/?>|\s)(?:<b>|<strong>)?\s*(?:Image references?|Source image link\(s\)):\s*(?:</b>|</strong>)?[\s\S]*$',
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"https?://app\.statdx\.com/image/thumbnail/[^\s<]+",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"https?://[^\s<]*(?:statdx|radprimer)[^\s<]*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"(?:<br\s*/?>\s*){3,}", "<br><br>", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


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


def repair_bundle(bundle: Path) -> tuple[int, int, int]:
    tsv = bundle / "corrected_cards.tsv"
    rows = read_rows(tsv)
    changed_rows = 0
    changed_fields = 0

    for row_index, row in enumerate(rows, 1):
        if len(row) != FIELDS_PER_ROW:
            raise ValueError(f"Row {row_index} has {len(row)} columns, expected {FIELDS_PER_ROW}.")

        row_changed = False
        for field_index in CLEAN_FIELD_INDEXES:
            before = row[field_index]
            after = strip_visible_references(before)
            if after != before:
                row[field_index] = after
                row_changed = True
                changed_fields += 1

        if row_changed:
            changed_rows += 1

    write_rows(tsv, rows)
    write_anki_import(bundle, rows)
    return len(rows), changed_rows, changed_fields


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Remove visible image-reference/source-link bookkeeping from a RadPrimer corrected TSV."
    )
    parser.add_argument("bundle", type=Path, help="Bundle directory containing corrected_cards.tsv.")
    args = parser.parse_args()

    rows, changed_rows, changed_fields = repair_bundle(args.bundle)
    print(f"rows: {rows}")
    print(f"rows_changed: {changed_rows}")
    print(f"fields_changed: {changed_fields}")
    print("preserved: 22-column TSV schema and Anki import header file")


if __name__ == "__main__":
    main()
