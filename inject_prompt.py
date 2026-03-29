#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
inject_prompt.py
----------------
Reads FULL_PROMPT.txt and injects it into the NORMAL-engine one-shot exporter JS,
replacing only the contents of:

  const PROMPT_TEXT = ` ... `;

This mirrors the pathology workflow pattern, but targets the NORMAL engine and
adds an optional no-images workflow header for image-optional articles.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys


PROMPT_BLOCK_RE = re.compile(
    r"""
    (const\s+PROMPT_TEXT\s*=\s*)
    (`)
    (.*?)
    (`\s*;)
    """,
    re.DOTALL | re.VERBOSE,
)

NORMAL_CORE_GAP_LINE = (
    "Core note: Core Radiology is not the primary anchor for this NORMAL workflow; "
    "use the NORMAL source hierarchy (RadPrimer -> STATdx -> Core -> Radiopaedia)."
)
NORMAL_CORE_REF_PREFIX = "Optional Core reference for tertiary cross-check: "
NO_IMAGES_LINE = (
    "Image workflow note: No usable source-supported images are available; "
    "Section A / NORMAL UNKNOWN cards may be absent."
)


def read_text(path: pathlib.Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8-sig")


def escape_for_js_template_literal(text: str) -> str:
    text = text.replace("`", "\\`")
    text = text.replace("${", "\\${")
    return text


def build_workflow_header(core_gap: bool, core_ref: str | None, no_images: bool) -> str:
    if core_gap and core_ref:
        raise ValueError("Choose only one: --core-gap or --core-ref.")

    lines: list[str] = []
    if core_gap:
        lines.append(NORMAL_CORE_GAP_LINE)
    elif core_ref and core_ref.strip():
        lines.append(f"{NORMAL_CORE_REF_PREFIX}{core_ref.strip()}")

    if no_images:
        lines.append(NO_IMAGES_LINE)

    if not lines:
        return ""

    return "\n".join(lines) + "\n\n"


def inject_prompt(js_code: str, prompt_text: str) -> str:
    match = PROMPT_BLOCK_RE.search(js_code)
    if not match:
        raise ValueError(
            "Could not find PROMPT_TEXT template literal block. "
            "Expected: const PROMPT_TEXT = `...`;"
        )

    prefix = match.group(1) + match.group(2)
    suffix = match.group(4)
    prompt_safe = escape_for_js_template_literal(prompt_text.rstrip() + "\n")

    start, end = match.span()
    return js_code[:start] + prefix + prompt_safe + suffix + js_code[end:]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--js", required=True, help="Path to the JS workflow file.")
    parser.add_argument("--prompt", required=True, help="Path to FULL_PROMPT.txt.")
    parser.add_argument(
        "--out",
        default=None,
        help="Output JS path. If omitted and not --inplace, adds _injected.js",
    )
    parser.add_argument("--inplace", action="store_true", help="Overwrite the input JS file in place.")
    parser.add_argument(
        "--core-gap",
        action="store_true",
        help="Prepend an optional normal-engine Core note for workflows not using Core as the anchor.",
    )
    parser.add_argument(
        "--core-ref",
        default=None,
        help='Prepend an optional Core cross-check reference, e.g. "US / Liver overview".',
    )
    parser.add_argument(
        "--no-images",
        action="store_true",
        help="Prepend an image-optional workflow note for articles with no usable images.",
    )

    args = parser.parse_args()

    js_path = pathlib.Path(args.js)
    prompt_path = pathlib.Path(args.prompt)

    if not js_path.exists():
        print(f"ERROR: JS file not found: {js_path}", file=sys.stderr)
        return 2
    if not prompt_path.exists():
        print(f"ERROR: Prompt file not found: {prompt_path}", file=sys.stderr)
        return 2

    js_code = read_text(js_path)
    prompt_text = read_text(prompt_path)

    try:
        header = build_workflow_header(
            core_gap=args.core_gap,
            core_ref=args.core_ref,
            no_images=args.no_images,
        )
        updated = inject_prompt(js_code, header + prompt_text)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 3

    if args.inplace:
        out_path = js_path
    else:
        out_path = pathlib.Path(args.out) if args.out else js_path.with_name(js_path.stem + "_injected.js")

    out_path.write_text(updated, encoding="utf-8")
    print(f"Injected prompt from '{prompt_path.name}' into '{out_path.name}'.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
