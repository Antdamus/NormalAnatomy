#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
inject_prompt.py (v2)
---------------------
Reads FULL_PROMPT.txt and injects it into the RADPrimer One Shot Exporter JS,
replacing ONLY the contents of:

  const PROMPT_TEXT = ` ... `;

NEW:
- Optional Core status header injection:
    * --core-gap            -> prepends a Core GAP declaration line
    * --core-ref "..."      -> prepends a Core coverage reference line
  (If neither is provided, prompt text is injected unchanged.)

Usage examples:

1) Core GAP:
  python inject_prompt.py --js radprimer_one_shot.js --prompt FULL_PROMPT.txt --core-gap --out radprimer_one_shot_injected.js

2) Core covered (pages/section):
  python inject_prompt.py --js radprimer_one_shot.js --prompt FULL_PROMPT.txt --core-ref "GI / Colon — p213–222 (IBD section)" --out radprimer_one_shot_injected.js

3) In-place overwrite:
  python inject_prompt.py --js radprimer_one_shot.js --prompt FULL_PROMPT.txt --core-gap --inplace
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys


PROMPT_BLOCK_RE = re.compile(
    r"""
    (const\s+PROMPT_TEXT\s*=\s*)      # group 1: assignment start
    (`)                               # group 2: opening backtick
    (.*?)                             # group 3: template literal contents (non-greedy)
    (`\s*;)                           # group 4: closing backtick + semicolon
    """,
    re.DOTALL | re.VERBOSE,
)

CORE_GAP_LINE = "Core GAP: Topic not explicitly covered in Core Radiology; cards derived from RadPrimer/STATdx only."
CORE_REF_PREFIX = "Core covered in Core Radiology: "


def read_text(path: pathlib.Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8-sig")


def escape_for_js_template_literal(s: str) -> str:
    """
    Put raw prompt into a JS template literal safely.
    We must escape:
      - backticks `   (breaks template literal)
      - ${           (starts interpolation)
    We do NOT escape newlines (template literal supports them).
    """
    s = s.replace("`", "\\`")
    s = s.replace("${", "\\${")
    return s


def build_core_header(core_gap: bool, core_ref: str | None) -> str:
    """
    Returns a header string (with trailing blank line) or "".
    Priority:
      - If core_gap is True -> Core GAP line.
      - Else if core_ref provided -> Core covered line.
      - Else -> no header.
    """
    if core_gap and core_ref:
        raise ValueError("Choose ONLY one: --core-gap OR --core-ref (not both).")

    if core_gap:
        return CORE_GAP_LINE + "\n\n"
    if core_ref and core_ref.strip():
        return f"{CORE_REF_PREFIX}{core_ref.strip()}\n\n"
    return ""


def inject_prompt(js_code: str, new_prompt_raw: str) -> str:
    m = PROMPT_BLOCK_RE.search(js_code)
    if not m:
        raise ValueError(
            "Could not find PROMPT_TEXT template literal block.\n"
            "Expected something like: const PROMPT_TEXT = `...`;"
        )

    prefix = m.group(1) + m.group(2)
    suffix = m.group(4)

    new_prompt_safe = escape_for_js_template_literal(new_prompt_raw.rstrip() + "\n")

    # Replace ONLY the matched block (first occurrence)
    start, end = m.span()
    return js_code[:start] + prefix + new_prompt_safe + suffix + js_code[end:]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--js", required=True, help="Path to the JS file containing the exporter code.")
    ap.add_argument("--prompt", required=True, help="Path to FULL_PROMPT.txt (the generated prompt).")
    ap.add_argument("--out", default=None, help="Output JS path. If omitted and not --inplace, adds _injected.js")
    ap.add_argument("--inplace", action="store_true", help="Overwrite the input JS file in place.")

    # NEW controls
    ap.add_argument("--core-gap", action="store_true", help="Prepend Core GAP declaration line to the prompt.")
    ap.add_argument("--core-ref", default=None, help='Prepend Core coverage reference, e.g. "GI / Colon — p213–222".')

    args = ap.parse_args()

    js_path = pathlib.Path(args.js)
    prompt_path = pathlib.Path(args.prompt)

    if not js_path.exists():
        print(f"ERROR: JS file not found: {js_path}", file=sys.stderr)
        return 2
    if not prompt_path.exists():
        print(f"ERROR: Prompt file not found: {prompt_path}", file=sys.stderr)
        return 2

    js_code = read_text(js_path)
    prompt_raw = read_text(prompt_path)

    try:
        header = build_core_header(core_gap=args.core_gap, core_ref=args.core_ref)
        prompt_with_header = header + prompt_raw
        updated = inject_prompt(js_code, prompt_with_header)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 3

    if args.inplace:
        out_path = js_path
    else:
        out_path = pathlib.Path(args.out) if args.out else js_path.with_name(js_path.stem + "_injected.js")

    out_path.write_text(updated, encoding="utf-8")

    if args.core_gap:
        core_msg = "Core GAP header injected."
    elif args.core_ref and args.core_ref.strip():
        core_msg = f"Core reference header injected: {args.core_ref.strip()}"
    else:
        core_msg = "No Core header injected."

    print(f"✅ Injected prompt from '{prompt_path.name}' into '{out_path.name}'. {core_msg}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())