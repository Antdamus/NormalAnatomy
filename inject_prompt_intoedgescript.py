#!/usr/bin/env python3

from pathlib import Path
import sys

MARKER = "=== PROMPTTEXT ==="


def escape_for_js_template_literal(text: str) -> str:
    text = text.replace("\\", "\\\\")
    text = text.replace("`", "\\`")
    text = text.replace("${", "\\${")
    return text


def copy_to_clipboard(text: str) -> None:
    try:
        import pyperclip
    except ImportError:
        print("Installing pyperclip...")
        import subprocess

        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyperclip"])
        import pyperclip

    pyperclip.copy(text)


def main() -> None:
    prompt_path = Path("FULL_PROMPT.txt")
    input_js_path = Path("input_code.js")

    if not prompt_path.exists():
        raise SystemExit("ERROR: FULL_PROMPT.txt not found.")
    if not input_js_path.exists():
        raise SystemExit("ERROR: input_code.js not found.")

    prompt_text = prompt_path.read_text(encoding="utf-8")
    js_code = input_js_path.read_text(encoding="utf-8")

    if MARKER not in js_code:
        raise SystemExit(f"ERROR: Marker '{MARKER}' not found in input_code.js")

    safe_prompt = escape_for_js_template_literal(prompt_text)
    final_js = js_code.replace(MARKER, safe_prompt)

    copy_to_clipboard(final_js)

    print("Final code copied to clipboard.")
    print(f"Inserted {len(prompt_text)} characters into template.")


if __name__ == "__main__":
    main()
