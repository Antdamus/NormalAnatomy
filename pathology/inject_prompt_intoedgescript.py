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

# Single control surface for Edge injection.
FILE_PREFIX = "rectalCancer"
INCLUDE = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22]
CASE_MAP = [[5,6],[7,8],[9,10],[11,12],[13,14],[15,16],[17,18],[19,20]]

CORE_GAP = False
CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"
CORE_PAGES = ""
DOWNLOAD_IMAGES = True
DOWNLOAD_PLAIN = True
DOWNLOAD_ANNOTATED = True
DOWNLOAD_DELAY_MS = 1000
STRIP_ARROW_TAGS_IN_CAPTION_TEXT = False
KEEP_CAPTION_HTML = True
AUTO_FILE_PREFIX_FROM_TITLE = False
CORE_VALIDATION_FLAG_RE = re.compile(
    r"(const\s+INCLUDE_CORE_VALIDATION_INPUT\s*=\s*)(true|false)(\s*;)"
)
JS_SETTINGS_BLOCK_RE = re.compile(
    r"(const\s+FILE_PREFIX\s*=\s*.*?"
    r"const\s+AUTO_FILE_PREFIX_FROM_TITLE\s*=\s*.*?;\s*)"
    r"(\n\s*/\*{70,}\n\s+\* CORE VALIDATION / GAP TOGGLES)",
    re.S,
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
        pyperclip.copy(text)
        return
    except Exception:
        pass

    if sys.platform.startswith("win"):
        try:
            subprocess.run(["clip"], input=text, text=True, check=True)
            return
        except Exception:
            pass

    try:
        import tkinter as tk

        root = tk.Tk()
        root.withdraw()
        root.clipboard_clear()
        root.clipboard_append(text)
        root.update()
        root.destroy()
        return
    except Exception as exc:
        raise RuntimeError("Unable to copy the injected Edge script to the clipboard.") from exc


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


def format_js_value(value) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'
    if isinstance(value, list):
        return "[" + ",".join(format_js_value(item) for item in value) + "]"
    return str(value)


def build_settings_block(include_core_validation: bool, narrative_mode: bool) -> str:
    file_prefix = FILE_PREFIX
    include = INCLUDE
    case_map = CASE_MAP
    download_images = DOWNLOAD_IMAGES
    auto_file_prefix_from_title = AUTO_FILE_PREFIX_FROM_TITLE

    if narrative_mode:
        file_prefix = ""
        include = "all"
        case_map = []
        download_images = False
        auto_file_prefix_from_title = True

    lines = [
        f"  const FILE_PREFIX = {format_js_value(file_prefix)};",
        f"const INCLUDE = {format_js_value(include)};",
        f"const CASE_MAP = {format_js_value(case_map)};",
        "",
        f"  const CORE_GAP = {format_js_value(CORE_GAP)}; // true = Pathway B (Core GAP), false = Pathway A (Core covered)",
        f"  const CORE_SECTION = {format_js_value(CORE_SECTION)};",
        f"  const CORE_PAGES = {format_js_value(CORE_PAGES)};",
        f"  const INCLUDE_CORE_VALIDATION_INPUT = {format_js_value(include_core_validation)}; // auto-set by injector; true for card/full-prompt workflows, false for narrative workflows",
        f"  const DOWNLOAD_IMAGES = {format_js_value(download_images)}; // set false if you only want copy-to-clipboard",
        f"  const DOWNLOAD_PLAIN = {format_js_value(DOWNLOAD_PLAIN)}; // plain (no arrows)",
        f"  const DOWNLOAD_ANNOTATED = {format_js_value(DOWNLOAD_ANNOTATED)}; // annotated (with arrows)",
        f"  const DOWNLOAD_DELAY_MS = {format_js_value(DOWNLOAD_DELAY_MS)}; // 1 second delay between downloads",
        "",
        "  // Captions: remove inline arrow <img> tags from caption text?",
        f"  const STRIP_ARROW_TAGS_IN_CAPTION_TEXT = {format_js_value(STRIP_ARROW_TAGS_IN_CAPTION_TEXT)};",
        f"  const KEEP_CAPTION_HTML = {format_js_value(KEEP_CAPTION_HTML)};",
        f"  const AUTO_FILE_PREFIX_FROM_TITLE = {format_js_value(auto_file_prefix_from_title)};",
    ]
    return "\n".join(lines)


def inject_settings_block(js_code: str, include_core_validation: bool, narrative_mode: bool) -> str:
    settings_block = build_settings_block(include_core_validation, narrative_mode)
    if not JS_SETTINGS_BLOCK_RE.search(js_code):
        raise SystemExit("ERROR: Could not locate the JS settings block in input_code.js")
    return JS_SETTINGS_BLOCK_RE.sub(
        lambda m: settings_block + m.group(2),
        js_code,
        count=1,
    )


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

    narrative_mode = (prompt_path.name == NARRATIVE_PROMPT)
    include_core_validation = not narrative_mode
    js_code = inject_settings_block(
        js_code,
        include_core_validation=include_core_validation,
        narrative_mode=narrative_mode,
    )
    js_code = set_core_validation_visibility(js_code, include_core_validation)
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
