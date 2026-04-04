#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path


MARKER = "=== PROMPTTEXT ==="
DEFAULT_PROMPT = "FULL_PROMPT.txt"
NARRATIVE_PROMPT = "pathologynarrative.txt"
DEFAULT_JS = "input_code.js"
SCRIPT_DIR = Path(__file__).resolve().parent

# Daily default toggle:
# False -> FULL_PROMPT.txt
# True  -> pathologynarrative.txt
USE_NARRATIVE_PROMPT = False
CORE_VALIDATION_FLAG_RE = re.compile(
    r"(const\s+INCLUDE_CORE_VALIDATION_INPUT\s*=\s*)(true|false)(\s*;)"
)


def escape_for_js_template_literal(s: str) -> str:
    # Keep text exact but safe inside JS backtick template literals
    s = s.replace("\\", "\\\\")
    s = s.replace("`", "\\`")
    s = s.replace("${", "\\${")
    return s


def copy_to_clipboard(text: str) -> None:
    try:
        import pyperclip
    except ImportError:
        print("Installing pyperclip...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyperclip"])
        import pyperclip

    pyperclip.copy(text)


def set_core_validation_visibility(js_code: str, include_core_validation: bool) -> str:
    replacement = rf"\g<1>{'true' if include_core_validation else 'false'}\g<3>"
    if CORE_VALIDATION_FLAG_RE.search(js_code):
        return CORE_VALIDATION_FLAG_RE.sub(replacement, js_code, count=1)
    return js_code


def resolve_prompt_path(prompt_arg: str | None, narrative: bool) -> Path:
    if prompt_arg:
        raw = Path(prompt_arg)
    elif narrative:
        raw = Path(NARRATIVE_PROMPT)
    elif USE_NARRATIVE_PROMPT:
        raw = Path(NARRATIVE_PROMPT)
    else:
        raw = Path(DEFAULT_PROMPT)

    if raw.is_absolute() or raw.exists():
        return raw

    fallback = SCRIPT_DIR / raw
    return fallback if fallback.exists() else raw


def resolve_js_path(js_arg: str) -> Path:
    raw = Path(js_arg)
    if raw.is_absolute() or raw.exists():
        return raw

    fallback = SCRIPT_DIR / raw
    return fallback if fallback.exists() else raw


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Inject a selected pathology prompt file into input_code.js and copy the final JS to the clipboard."
    )
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
    ap.add_argument(
        "--js",
        default=DEFAULT_JS,
        help=f"JS snippet file containing the {MARKER} marker. Defaults to {DEFAULT_JS}.",
    )
    args = ap.parse_args()

    prompt_path = resolve_prompt_path(args.prompt, args.narrative)
    input_js_path = resolve_js_path(args.js)

    if not prompt_path.exists():
        raise SystemExit(f"ERROR: Prompt file not found: {prompt_path}")
    if not input_js_path.exists():
        raise SystemExit(f"ERROR: JS file not found: {input_js_path}")

    prompt_text = prompt_path.read_text(encoding="utf-8")
    js_code = input_js_path.read_text(encoding="utf-8")

    if MARKER not in js_code:
        raise SystemExit(f"ERROR: Marker '{MARKER}' not found in {input_js_path.name}")

    js_code = set_core_validation_visibility(
        js_code,
        include_core_validation=(prompt_path.name != NARRATIVE_PROMPT),
    )
    safe_prompt = escape_for_js_template_literal(prompt_text)
    final_js = js_code.replace(MARKER, safe_prompt)

    copy_to_clipboard(final_js)

    prompt_mode = "narrative" if prompt_path.name == NARRATIVE_PROMPT else "standard"
    print("Final code copied to clipboard.")
    print(f"Injected {prompt_mode} prompt from '{prompt_path.name}' into '{input_js_path.name}'.")
    print(f"Inserted {len(prompt_text)} characters into template.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
