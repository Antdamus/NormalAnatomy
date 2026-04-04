#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
inject_prompt.py (v3)
---------------------
Reads a selected prompt file and injects it into the pathology JS exporter,
replacing ONLY the contents of:

  const PROMPT_TEXT = ` ... `;

Prompt selection:
- Default prompt remains FULL_PROMPT.txt
- --prompt <file> selects any prompt file explicitly
- --narrative selects pathologynarrative.txt when --prompt is omitted

Optional Core status header injection:
- --core-gap            -> prepends a Core GAP declaration line
- --core-ref "..."      -> prepends a Core coverage reference line

Usage examples:

1) Standard prompt:
  python inject_prompt.py --js input_code.js --inplace

2) Narrative prompt:
  python inject_prompt.py --js input_code.js --narrative --inplace

3) Explicit prompt path:
  python inject_prompt.py --js input_code.js --prompt pathologynarrative.txt --out input_code_injected.js

4) Core covered (pages/section):
  python inject_prompt.py --js input_code.js --core-ref "GI / Colon - p213-222 (IBD section)" --inplace
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys


DEFAULT_PROMPT = "FULL_PROMPT.txt"
NARRATIVE_PROMPT = "pathologynarrative.txt"
SCRIPT_DIR = pathlib.Path(__file__).resolve().parent

PROMPT_BLOCK_RE = re.compile(
    r"""
    (const\s+PROMPT_TEXT\s*=\s*)      # group 1: assignment start
    (`)                               # group 2: opening backtick
    (.*?)                             # group 3: template literal contents (non-greedy)
    (`\s*;)                           # group 4: closing backtick + semicolon
    """,
    re.DOTALL | re.VERBOSE,
)
CORE_VALIDATION_FLAG_RE = re.compile(
    r"(const\s+INCLUDE_CORE_VALIDATION_INPUT\s*=\s*)(true|false)(\s*;)"
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

    start, end = m.span()
    return js_code[:start] + prefix + new_prompt_safe + suffix + js_code[end:]


def set_core_validation_visibility(js_code: str, include_core_validation: bool) -> str:
    replacement = rf"\g<1>{'true' if include_core_validation else 'false'}\g<3>"
    if CORE_VALIDATION_FLAG_RE.search(js_code):
        return CORE_VALIDATION_FLAG_RE.sub(replacement, js_code, count=1)
    return js_code


def resolve_prompt_path(prompt_arg: str | None, narrative: bool) -> pathlib.Path:
    if prompt_arg:
        raw = pathlib.Path(prompt_arg)
    elif narrative:
        raw = pathlib.Path(NARRATIVE_PROMPT)
    else:
        raw = pathlib.Path(DEFAULT_PROMPT)

    if raw.is_absolute() or raw.exists():
        return raw

    fallback = SCRIPT_DIR / raw
    return fallback if fallback.exists() else raw


def resolve_js_path(js_arg: str) -> pathlib.Path:
    raw = pathlib.Path(js_arg)
    if raw.is_absolute() or raw.exists():
        return raw

    fallback = SCRIPT_DIR / raw
    return fallback if fallback.exists() else raw


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--js", required=True, help="Path to the JS file containing the exporter code.")
    ap.add_argument(
        "--prompt",
        default=None,
        help=f"Prompt file to inject. Defaults to {DEFAULT_PROMPT}; use --narrative for {NARRATIVE_PROMPT}.",
    )
    ap.add_argument(
        "--narrative",
        action="store_true",
        help=f"Use {NARRATIVE_PROMPT} when --prompt is not provided.",
    )
    ap.add_argument("--out", default=None, help="Output JS path. If omitted and not --inplace, adds _injected.js")
    ap.add_argument("--inplace", action="store_true", help="Overwrite the input JS file in place.")

    ap.add_argument("--core-gap", action="store_true", help="Prepend Core GAP declaration line to the prompt.")
    ap.add_argument("--core-ref", default=None, help='Prepend Core coverage reference, e.g. "GI / Colon - p213-222".')

    args = ap.parse_args()

    js_path = resolve_js_path(args.js)
    prompt_path = resolve_prompt_path(args.prompt, args.narrative)

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
        updated = set_core_validation_visibility(
            updated,
            include_core_validation=(prompt_path.name != NARRATIVE_PROMPT),
        )
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

    prompt_mode = "narrative" if prompt_path.name == NARRATIVE_PROMPT else "standard"
    print(f"Injected {prompt_mode} prompt from '{prompt_path.name}' into '{out_path.name}'. {core_msg}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
