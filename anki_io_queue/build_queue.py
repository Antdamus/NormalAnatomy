#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

DEFAULT_REPOSITORY_DIR = Path(r"C:\Users\josem.000\Documents\repository")
DEFAULT_OUTPUT_PATH = Path(__file__).resolve().parent / "queue.json"

TOPIC_RE = re.compile(r"^PRIMARY TOPIC:\s*(.+?)\s*$")
TITLE_RE = re.compile(r"^TITLE:\s*(.+?)\s*$")
BLOCK_RE = re.compile(r"^(CASE|IMAGE)_(\d+):\s*(.*)$")
IMAGE_RE = re.compile(r"^\s*Image:\s*(.+?)\s*$")
IMAGE_ANNOT_RE = re.compile(r"^\s*Image_Annotated:\s*(.+?)\s*$")
CAPTION_RE = re.compile(r"^\s*Caption:\s*(.*)$")
BASE_RE = re.compile(r"^\s{2,}([^\s].*?)\s*$")


@dataclass
class QueueItem:
    queue_id: str
    article_title: str
    topic: str
    block_label: str
    block_kind: str
    block_index: int
    group_numbers: list[int]
    source_number: int
    base_name: str
    image_filename: str
    annotated_filename: str
    caption: str
    image_path: str
    annotated_path: str
    preferred_path: str
    status: str = "pending"
    notes: str = ""


def parse_number_list(raw: str) -> list[int]:
    if not raw.strip():
        return []
    out: list[int] = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            out.append(int(part))
        except ValueError:
            continue
    return out


def first_match(lines: Iterable[str], regex: re.Pattern[str]) -> str:
    for line in lines:
        m = regex.match(line.strip())
        if m:
            return m.group(1).strip()
    return ""


def resolve_path(images_dir: Path | None, filename: str) -> str:
    if not filename:
        return ""
    if images_dir is None:
        return filename
    return str((images_dir / filename).resolve())


def read_clipboard_text() -> str:
    if sys.platform.startswith("win"):
        try:
            result = subprocess.run(
                ["powershell", "-NoProfile", "-Command", "Get-Clipboard -Raw"],
                capture_output=True,
                text=True,
                check=True,
            )
            text = result.stdout
            if text.strip():
                return text
        except Exception:
            pass

    try:
        import tkinter as tk

        root = tk.Tk()
        root.withdraw()
        text = root.clipboard_get()
        root.destroy()
        if str(text).strip():
            return str(text)
    except Exception:
        pass

    raise RuntimeError("Could not read extracted text from the clipboard.")


def parse_extracted_text(text: str, images_dir: Path | None = None, prefer_annotated: bool = True) -> dict:
    lines = text.splitlines()
    topic = first_match(lines, TOPIC_RE)
    article_title = first_match(lines, TITLE_RE) or topic

    images_start = next((i for i, line in enumerate(lines) if line.startswith("=== IMAGES")), -1)
    if images_start == -1:
        raise ValueError("Could not find an `=== IMAGES` block in the extracted text.")

    items: list[QueueItem] = []
    current_block_kind = ""
    current_block_index = 0
    current_block_label = ""
    current_group_numbers: list[int] = []
    pending_base = ""
    pending_image = ""
    pending_annot = ""
    pending_caption = ""
    pending_source_number = 0

    def flush_pending() -> None:
        nonlocal pending_base, pending_image, pending_annot, pending_caption, pending_source_number
        if not pending_base:
            return

        preferred_filename = pending_annot if prefer_annotated and pending_annot else pending_image
        queue_id = f"{current_block_label}:{pending_source_number or len(items) + 1}"
        items.append(
            QueueItem(
                queue_id=queue_id,
                article_title=article_title,
                topic=topic,
                block_label=current_block_label,
                block_kind=current_block_kind,
                block_index=current_block_index,
                group_numbers=list(current_group_numbers),
                source_number=pending_source_number,
                base_name=pending_base,
                image_filename=pending_image,
                annotated_filename=pending_annot,
                caption=pending_caption,
                image_path=resolve_path(images_dir, pending_image),
                annotated_path=resolve_path(images_dir, pending_annot),
                preferred_path=resolve_path(images_dir, preferred_filename),
            )
        )

        pending_base = ""
        pending_image = ""
        pending_annot = ""
        pending_caption = ""
        pending_source_number = 0

    for raw_line in lines[images_start + 1 :]:
        line = raw_line.rstrip()
        block_match = BLOCK_RE.match(line.strip())
        if block_match:
            flush_pending()
            current_block_kind = block_match.group(1)
            current_block_index = int(block_match.group(2))
            current_block_label = f"{current_block_kind}_{block_match.group(2)}"
            current_group_numbers = parse_number_list(block_match.group(3))
            continue

        if not current_block_label:
            continue

        image_match = IMAGE_RE.match(line)
        if image_match:
            pending_image = image_match.group(1).strip()
            continue

        annot_match = IMAGE_ANNOT_RE.match(line)
        if annot_match:
            pending_annot = annot_match.group(1).strip()
            continue

        caption_match = CAPTION_RE.match(line)
        if caption_match:
            pending_caption = caption_match.group(1)
            continue

        base_match = BASE_RE.match(line)
        if base_match:
            flush_pending()
            pending_base = base_match.group(1).strip()
            if current_group_numbers:
                used = {item.source_number for item in items if item.block_label == current_block_label}
                pending_source_number = next((n for n in current_group_numbers if n not in used), 0)
            continue

    flush_pending()

    if not items:
        raise ValueError("No image entries were parsed from the `=== IMAGES` block.")

    return {
        "article_title": article_title,
        "topic": topic,
        "total_items": len(items),
        "items": [asdict(item) for item in items],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build an Image Occlusion queue JSON from extracted article text.")
    parser.add_argument("input", nargs="?", help="Path to the extracted text file generated from the Edge workflow.")
    parser.add_argument("output", nargs="?", help="Path to write the queue JSON.")
    parser.add_argument(
        "--from-clipboard",
        action="store_true",
        help="Read the extracted text directly from the clipboard instead of a file.",
    )
    parser.add_argument(
        "--images-dir",
        default=None,
        help=(
            "Directory containing the downloaded image files. "
            f"Defaults to {DEFAULT_REPOSITORY_DIR} when available."
        ),
    )
    parser.add_argument(
        "--prefer-annotated",
        action="store_true",
        help="Use the annotated image as the preferred image path when available.",
    )
    parser.add_argument(
        "--prefer-plain",
        action="store_true",
        help="Use the plain image as the preferred image path even if an annotated image exists.",
    )
    args = parser.parse_args()

    use_clipboard = args.from_clipboard or not args.input
    output_path = Path(args.output) if args.output else DEFAULT_OUTPUT_PATH
    if args.images_dir:
        images_dir = Path(args.images_dir)
    elif DEFAULT_REPOSITORY_DIR.exists():
        images_dir = DEFAULT_REPOSITORY_DIR
    else:
        images_dir = None

    if use_clipboard:
        source_text = read_clipboard_text()
    else:
        input_path = Path(args.input)
        if not input_path.exists():
            raise SystemExit(f"ERROR: Input file not found: {input_path}")
        source_text = input_path.read_text(encoding="utf-8")

    if images_dir is not None and not images_dir.exists():
        raise SystemExit(f"ERROR: Images directory not found: {images_dir}")

    payload = parse_extracted_text(
        source_text,
        images_dir=images_dir,
        prefer_annotated=(False if args.prefer_plain else True),
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Wrote queue JSON: {output_path.resolve()}")
    if use_clipboard:
        print("Input source: clipboard")
    else:
        print(f"Input source: file ({input_path.resolve()})")
    print(f"Article title: {payload['article_title']}")
    print(f"Items: {payload['total_items']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
