#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path


MARKER = "=== PROMPTTEXT ==="
DEFAULT_PROMPT = "FULL_PROMPT.txt"
NARRATIVE_PROMPT = "normalnarrative.txt"
DEFAULT_JS = "input_code.js"
SCRIPT_DIR = Path(__file__).resolve().parent

# Operating mode:
# "narrative"     -> uses normalnarrative.txt, all images, no downloads, no Codex workflow preamble
# "chatgpt_cards" -> uses FULL_PROMPT.txt with autonomous audit/run instructions, no Codex workflow preamble
# "codex_cards"   -> uses FULL_PROMPT.txt with Codex workflow preamble
# "no_pictures"   -> uses FULL_PROMPT.txt with autonomous audit/run instructions, no image selection, no downloads
MODE = "narrative"
VALID_MODES = {"narrative", "chatgpt_cards", "codex_cards", "no_pictures"}

# Single control surface for Edge injection.
FILE_PREFIX = " "
INCLUDE = ""
CASE_MAP = []
SOURCE_NOTE = ""
CORE_NOTE = ""
DOWNLOAD_IMAGES = False
DOWNLOAD_PLAIN = True
DOWNLOAD_ANNOTATED = True
DOWNLOAD_DELAY_MS = 1000
KEEP_CAPTION_HTML = True
STRIP_ARROW_TAGS_IN_CAPTION_TEXT = False
AUTO_FILE_PREFIX_FROM_TITLE = False

CHATGPT_AUTONOMOUS_PROMPT = r"""# Autonomous Execution Override

For this run, operate in autonomous batch mode.

Do not stop to ask for user permission between internal audits, repairs, section progression, or export steps after the initial source package has been provided.

If the embedded prompt suggests staged generation, previews, or manual pauses, treat those as internal validation checkpoints unless a true hard-stop failure or missing-source problem requires user clarification.

In autonomous batch mode:
- do not output user-facing section-by-section previews by default
- perform the required internal audits before export
- repair fixable structural failures before moving on
- stop on true hard-stop failures
- stop if required source information is missing or cannot be validated
- treat any "approved preview set" wording as the most recent internally validated section or deck snapshot that passed automatic checks
- treat "re-preview" as internal re-validation after repair, not a pause for user approval

Do not skip workflow steps.
Do not skip audits.
Do not silently export through a failed gate.

If all gates pass, continue autonomously through final TSV export in the same response.
"""

CODEX_WORKFLOW_PROMPT = r"""# Codex Master Workflow Prompt for Sectioned NORMAL-Engine Anki Card Generation

You are operating as a workflow engine + validation engine for a sectioned NORMAL anatomy Anki deck build.

Your job is not to jump directly from source article to final TSV.
Your job is to execute the staged workflow carefully, audit each stage, repair fixable failures, and emit final TSV only when all export gates pass.

You must behave conservatively, transparently, and deterministically.

---

## PRIMARY ROLE

You are responsible for:

1. Reading the full extracted input block
2. Respecting the embedded NORMAL-engine prompt exactly
3. Following the staged workflow intentionally
4. Running section-level and deck-level checks before export
5. Stopping when a structural or source-discipline failure occurs
6. Repairing fixable failures before moving on
7. Running a final whole-deck audit before TSV export
8. Emitting TSV only if all gates pass

Do not silently skip steps, silently drop cards, or silently reinterpret the engine architecture.

---

## SOURCE OF TRUTH

The governing inputs are, in descending order of authority:

1. The embedded FULL PROMPT / card-generation rules included in the extracted input
2. The extracted workflow context
3. The extracted article text
4. The extracted image block, if present
5. Any explicit user clarifications provided in the same task

Treat the embedded FULL PROMPT and its section files as the procedural source of truth for architecture and export rules.

---

## GLOBAL OPERATING MODE

You must work in staged build mode when the article complexity or the embedded rules indicate staged generation is preferable.

At minimum, you must proceed in this order:

* Whole-source coverage audit
* Complexity assessment
* Intentional generation-mode choice
* Sectioned or staged card generation as required by the rules
* Final deck audit
* TSV export

Do not export early.

---

## INGESTION AND STRUCTURE CHECK

At the start of the task, confirm that the input contains:

* `=== WORKFLOW CONTEXT ===`
* `=== PROMPT ===`
* `=== ARTICLE ===`
* `=== IMAGES` block when images were extracted

If a required structural block is missing and the workflow cannot proceed safely:

* stop
* explain what is missing
* do not generate cards

---

## WHOLE-SOURCE COVERAGE AUDIT

Before generating cards, explicitly perform the whole-source coverage audit required by the embedded rules.

Review the article for all relevant buckets, including when source-supported:

* named structures
* spatial relationships
* landmark identifiers
* modality-specific normal appearance anchors
* exam approach or review-order rules
* relevant planes, sequences, or phases
* completeness checklist items
* measurement or morphology concepts
* normal variants
* pseudolesions or mimics
* pitfalls or overcall risks
* discriminator points between normal, variant, and abnormal
* mechanism-style explanations for normal appearance
* board-relevant pivots or classic traps

If full-source review cannot be confirmed:

* stop
* do not generate cards

---

## COMPLEXITY AND MODE CHOICE

After the coverage audit, classify the article workflow as either:

* one-shot appropriate
* staged generation preferred

Use staged generation when the article is long, multi-bucket, multi-modality, image-heavy, variant-rich, trap-rich, or dependent on pedagogic sequencing.

Do not default every full article to one-shot generation.

---

## IMAGE-OPTIONAL RULE

The NORMAL engine is image-optional.

You must not force Section A / NORMAL UNKNOWN if usable images are absent.
Zero UNKNOWN cards is valid when the source supports concept-driven extraction without usable images.

---

## FAILURE HANDLING

If you detect a rule violation, classify it as:

1. Hard stop failure
2. Repairable structural failure
3. Coverage gap

Repair fixable failures before moving on.
Stop on hard-stop failures.

---

## FINAL AUDIT

Before TSV export, explicitly check:

* trigger integrity
* dependency integrity
* forbidden-field integrity
* image dependency integrity
* source and summary integrity
* image-optional article integrity
* mastery progression integrity
* adaptive generation integrity
* front-side blinding
* field hygiene
* TSV structural integrity

State:

* total cards to export
* expected TSV lines

If the counts cannot be guaranteed, stop.

---

## TSV EXPORT RULE

Emit TSV only if every gate passes.

Requirements:

* no header row
* exactly 22 columns per note
* one note per line
* no literal newlines inside fields
* `<br>` only for internal formatting
* exported content must match the final internally validated deck content except minimal TSV-safe normalization
"""

JS_SETTINGS_BLOCK_RE = re.compile(
    r"(const\s+FILE_PREFIX\s*=\s*.*?"
    r"const\s+AUTO_FILE_PREFIX_FROM_TITLE\s*=\s*.*?;\s*)"
    r"(\n\s*/\*{22,}\n\s+\* YOUR PROMPT)",
    re.S,
)


def escape_for_js_template_literal(text: str) -> str:
    text = text.replace("\\", "\\\\")
    text = text.replace("`", "\\`")
    text = text.replace("${", "\\${")
    return text


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


def resolve_mode(prompt_arg: str | None, narrative_flag: bool) -> str:
    mode = MODE.strip().lower()
    if mode not in VALID_MODES:
        raise SystemExit(
            f"ERROR: Invalid MODE '{MODE}'. Use one of: narrative, chatgpt_cards, codex_cards, no_pictures."
        )

    if narrative_flag:
        return "narrative"

    if prompt_arg:
        prompt_name = Path(prompt_arg).name.lower()
        if prompt_name == NARRATIVE_PROMPT.lower():
            return "narrative"
        return mode if mode in {"codex_cards", "no_pictures"} else "chatgpt_cards"

    return mode


def resolve_prompt_path(prompt_arg: str | None, narrative_mode: bool) -> Path:
    if prompt_arg:
        raw = Path(prompt_arg)
    elif narrative_mode:
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


def build_settings_block(narrative_mode: bool) -> str:
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
    elif MODE == "no_pictures":
        file_prefix = ""
        include = "none"
        case_map = []
        download_images = False
        auto_file_prefix_from_title = True

    lines = [
        f"  const FILE_PREFIX = {format_js_value(file_prefix)}; // change per document",
        f"  const INCLUDE = {format_js_value(include)}; // \"all\", \"none\", \"2,4,5\", or [2,4,5]",
        f"  const CASE_MAP = {format_js_value(case_map)}; // e.g. [[2,3],[8,9]] ; leave [] for auto-solo grouping",
        f"  const SOURCE_NOTE = {format_js_value(SOURCE_NOTE)}; // optional free-text note about source/article context",
        f"  const CORE_NOTE = {format_js_value(CORE_NOTE)}; // optional tertiary Core cross-check note",
        f"  const DOWNLOAD_IMAGES = {format_js_value(download_images)}; // set true if you want browser downloads",
        f"  const DOWNLOAD_PLAIN = {format_js_value(DOWNLOAD_PLAIN)};",
        f"  const DOWNLOAD_ANNOTATED = {format_js_value(DOWNLOAD_ANNOTATED)};",
        f"  const DOWNLOAD_DELAY_MS = {format_js_value(DOWNLOAD_DELAY_MS)};",
        f"  const KEEP_CAPTION_HTML = {format_js_value(KEEP_CAPTION_HTML)};",
        f"  const STRIP_ARROW_TAGS_IN_CAPTION_TEXT = {format_js_value(STRIP_ARROW_TAGS_IN_CAPTION_TEXT)};",
        f"  const AUTO_FILE_PREFIX_FROM_TITLE = {format_js_value(auto_file_prefix_from_title)};",
    ]
    return "\n".join(lines)


def inject_settings_block(js_code: str, narrative_mode: bool) -> str:
    settings_block = build_settings_block(narrative_mode)
    if not JS_SETTINGS_BLOCK_RE.search(js_code):
        raise SystemExit("ERROR: Could not locate the JS settings block in input_code.js")
    return JS_SETTINGS_BLOCK_RE.sub(lambda m: settings_block + m.group(2), js_code, count=1)


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Inject a selected NORMAL-engine prompt file into input_code.js and copy the final JS to the clipboard."
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

    selected_mode = resolve_mode(args.prompt, args.narrative)
    narrative_mode = selected_mode == "narrative"
    prompt_path = resolve_prompt_path(args.prompt, narrative_mode)
    input_js_path = resolve_js_path(args.js)

    if not prompt_path.exists():
        raise SystemExit(f"ERROR: Prompt file not found: {prompt_path}")
    if not input_js_path.exists():
        raise SystemExit(f"ERROR: JS file not found: {input_js_path}")

    prompt_text = prompt_path.read_text(encoding="utf-8")
    js_code = input_js_path.read_text(encoding="utf-8")

    if MARKER not in js_code:
        raise SystemExit(f"ERROR: Marker '{MARKER}' not found in {input_js_path.name}")

    js_code = inject_settings_block(js_code, narrative_mode=narrative_mode)

    final_prompt_text = prompt_text
    if selected_mode in {"chatgpt_cards", "no_pictures"} and not narrative_mode:
        final_prompt_text = f"{CHATGPT_AUTONOMOUS_PROMPT}\n\n{prompt_text}"
    elif selected_mode == "codex_cards" and not narrative_mode:
        final_prompt_text = f"{CHATGPT_AUTONOMOUS_PROMPT}\n\n{CODEX_WORKFLOW_PROMPT}\n\n{prompt_text}"

    safe_prompt = escape_for_js_template_literal(final_prompt_text)
    final_js = js_code.replace(MARKER, safe_prompt)

    copy_to_clipboard(final_js)

    prompt_mode = "narrative" if narrative_mode else "standard"
    print("Final code copied to clipboard.")
    print(f"Injected {prompt_mode} prompt from '{prompt_path.name}' into '{input_js_path.name}'.")
    print(f"Mode: {selected_mode}")
    if selected_mode == "codex_cards" and not narrative_mode:
        print("Codex workflow preamble enabled.")
    print(f"Inserted {len(final_prompt_text)} characters into template.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
