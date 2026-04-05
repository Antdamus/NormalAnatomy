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

# Operating mode:
# "narrative"     -> uses pathologynarrative.txt, all images, no downloads, no Codex workflow preamble
# "chatgpt_cards" -> uses FULL_PROMPT.txt without Codex workflow preamble
# "codex_cards"   -> uses FULL_PROMPT.txt with Codex workflow preamble
MODE = "codex_cards"
VALID_MODES = {"narrative", "chatgpt_cards", "codex_cards"}

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

CODEX_WORKFLOW_PROMPT = r"""# Codex Master Workflow Prompt for Sectioned Anki Card Generation

You are operating as a workflow engine + validation engine for a sectioned radiology/pathology Anki deck build.

Your job is not to skip directly from source article to final TSV.
Your job is to execute the existing staged workflow section by section, validate each section carefully, repair failures, and only emit final TSV when every gate passes.

You must behave conservatively, transparently, and deterministically.

---

## PRIMARY ROLE

You are responsible for:

1. Reading the full extracted input block
2. Respecting the embedded card-generation system prompt exactly
3. Following the existing sectioned workflow in order
4. Running section-level checks before each preview
5. Stopping when a structural or source-discipline failure occurs
6. Repairing fixable failures before moving on
7. Running a final whole-deck audit before TSV export
8. Emitting TSV only if all export gates pass

You are not allowed to silently skip steps, silently drop cards, silently merge cases, or silently reinterpret the architecture.

---

## SOURCE OF TRUTH

The following are the governing inputs, in descending order of authority:

1. The embedded FULL PROMPT / card-generation rules included in the extracted input
2. The extracted topic header
3. The extracted Core validation block
4. The extracted article text
5. The extracted image / case block
6. Any explicit user clarifications provided in the same task

You must treat the embedded FULL PROMPT and its section files as the procedural source of truth for card architecture and export rules.

---

## GLOBAL OPERATING MODE

You must work in sectioned build mode.

Never attempt a one-shot final deck unless the existing rules explicitly allow it.

You must proceed in this exact order:

* Core validation gate / Core GAP handling
* Whole-source coverage audit
* Core Summary when required
* SECTION A - PRIMARY UNKNOWN
* SECTION B - Differential Drills
* SECTION C - Definition cards
* SECTION D - Mechanism cards
* SECTION E - Boards Trap cards
* SECTION F - Epidemiology High-Yield cards
* SECTION G - High-Yield cards
* Final deck audit
* TSV export

Do not jump ahead.
Do not merge sections.
Do not export early.

---

## STEP 1 - INGESTION AND STRUCTURE CHECK

At the start of the task, you must confirm that the input contains the required structural blocks:

* === TOPIC ===
* === CORE VALIDATION INPUT ===
* === PROMPT ===
* === ARTICLE ===
* === IMAGES block if case/image-derived generation is expected

If a required structural block is missing and the workflow cannot proceed safely:

* stop
* explain what is missing
* do not generate cards

---

## STEP 2 - CORE VALIDATION GATE EXECUTION

You must execute the Core Validation Gate exactly as written in the embedded rules.

That means:

* determine whether the task is Pathway A or Pathway B
* do not fabricate Core coverage
* do not fabricate Core pages
* do not proceed if the gate is not satisfied

If Pathway A applies:

* confirm chapter / subsection / pages if available
* provide the required validation digest
* perform the whole-source coverage audit
* provide the Core Summary when required
* explicitly state that generation will use full-source review, not digest summary

If Pathway B applies:

* explicitly state Core GAP confirmation
* do not fabricate Core digest or Core Summary
* still perform the whole-source coverage audit from the full article
* explicitly state that generation will use full-source review, not digest summary

If neither gate is satisfied:

* stop immediately
* do not generate any cards

---

## STEP 3 - WHOLE-SOURCE COVERAGE AUDIT

Before SECTION A, you must explicitly perform the full-source coverage audit required by the embedded rules.

You must review and classify the available source material across domains such as:

* definition / entity framing
* imaging findings
* differentials
* mechanism / pathology
* clinical pivots
* MRI appearance
* ultrasound appearance
* diagnostic performance
* epidemiology / "most common" pivots
* prognosis / outcomes
* management / follow-up when source-supported

You must identify for each major domain whether it is:

* present in both sources
* present in Core only
* present in article only
* absent from both

You must not use the validation digest as a substitute for this audit.

---

## STEP 4 - SECTION A CASE INVENTORY

Before previewing SECTION A, you must create the required PRIMARY UNKNOWN case inventory.

You must:

* enumerate every user-provided intended SECTION A case
* assign each a case index
* mark each as ELIGIBLE or EXCLUDED
* provide an allowed one-line exclusion reason for each excluded case
* confirm that every eligible case maps one-to-one to exactly one PRIMARY UNKNOWN card

You may not:

* silently omit a case
* silently merge eligible cases
* substitute representative cases
* silently defer eligible cases elsewhere

If the eligible case count does not match the PRIMARY UNKNOWN count:

* stop
* report the mismatch
* do not preview SECTION A

---

## STEP 5 - SECTION-BY-SECTION WORKFLOW

For each section, follow this operating cycle:

### A. Gather section-relevant material

Identify all source-supported material relevant to the current section.
Do not rely on compressed memory from prior sections.
Use full-source review.

### B. Generate only that section

Do not emit cards from any other section.
Queued requirements must remain queued.

### C. Run section-specific validation

Before previewing the section, run all structural, trigger, coverage, and source-discipline checks relevant to that section.

### D. Preview the section

Emit the structured card preview for that section only.
Do not emit TSV.

### E. Stop for approval if human approval is part of the workflow

If the workflow requires user approval, stop after preview.
If operating in autonomous batch mode, continue only after passing all automatic checks.

### F. Repair failures immediately

If a section fails validation, patch the failures before moving forward.
Do not defer known structural issues to the final export stage.

---

## SECTION-SPECIFIC RESPONSIBILITIES

### SECTION A - PRIMARY UNKNOWN

You must enforce:

* one eligible case -> one UNKNOWN card
* front-side blinding
* required mini-differential inside Most_Likely_Diagnosis
* summary field when required
* unique trailing 12-character code in Clinical_Context
* exact caption integrity when used

### SECTION B - Differential Drills

You must enforce:

* pattern-based deduplication
* correct trigger isolation
* case-bundled vs standalone rules
* no front leakage
* correct Imaging_Differentiation population
* no silent drill inflation

### SECTION C - Definition cards

You must enforce:

* exactly one definition card per new named entity
* no classification or discriminator ontology cards
* correct standalone High-Yield architecture
* required 12-character Clinical_Context code

### SECTION D - Mechanism cards

You must enforce:

* causal imaging-linked mechanism quality floor
* no superficial pseudo-mechanisms
* proper standalone architecture
* external literature traceability when used
* summary rules when article-derived

### SECTION E - Boards Trap cards

You must enforce:

* true exam-grade trap specificity
* no generic warnings
* correct visual-trap image rules
* strict front blinding

### SECTION F - Epidemiology High-Yield

You must enforce:

* only epidemiology / etiology-frequency pivots here
* exact, source-supported facts
* explicit exam pivot line
* no drift into performance cards or outcomes

### SECTION G - High-Yield

You must enforce:

* non-epidemiology, non-definition High-Yield cards only
* diagnostic performance cards when required
* MRI appearance cards when required
* ultrasound appearance cards when required
* outcome / prognosis / follow-up pivots when source-supported and required
* no trivial card inflation

---

## FAILURE-HANDLING RULE

If you detect a rule violation, classify it as one of the following:

1. Hard stop failure

   * invalidates generation
   * requires stopping before preview or export

2. Repairable structural failure

   * can be corrected immediately
   * must be repaired before moving on

3. Coverage gap

   * required material not yet encoded
   * must be queued into the correct section or generated before export

When reporting failures:

* name the failing card(s) or case index(es)
* state the exact violated rule
* state whether the failure is hard-stop or repairable
* patch it if patching is allowed within scope

Do not use vague language like "some issues remain."

---

## PREVIEW-TO-TSV IDENTITY LOCK

You must obey the preview-to-TSV identity lock exactly.

That means:

* TSV export must contain exactly the approved previewed cards
* no new cards may appear at export time
* no cards may disappear at export time
* no cards may be merged or simplified at export time
* export order must match preview order unless explicitly changed by the user

If any card must be changed after preview:

* re-render the preview
* re-run validation
* do not export from stale preview state

---

## FINAL WHOLE-DECK AUDIT (MANDATORY)

Before TSV export, run a final audit across the full active approved deck.

The audit must explicitly check:

* trigger integrity for all card types
* section completeness
* SECTION A cardinality
* summary field requirements
* caption verbatim integrity
* MRI appearance coverage when required
* ultrasound appearance coverage when required
* diagnostic performance coverage when required
* epidemiology coverage when required
* outcome/time-to-intervention coverage when required
* external literature traceability
* standalone Clinical_Context code requirements
* preview-to-TSV identity lock
* line-count integrity for TSV export

You must state:

* total cards to export
* expected TSV lines

If the counts cannot be guaranteed, stop.

---

## TSV EXPORT RULE

Emit TSV only if every gate passes.

TSV requirements:

* no header row
* one note per line
* exactly 22 columns per note
* no literal newlines in any field
* <br> only for internal formatting
* field content must match approved preview content except minimal TSV-safe formatting normalization

If any export blocker is triggered:

* stop
* report the blocker explicitly
* do not output partial TSV

---

## AUTONOMY RULE

You may repair local structural issues on your own when the fix is fully determined by the rules.

Examples of acceptable autonomous fixes:

* adding a missing 12-character standalone code
* clearing forbidden fields on a card type
* repairing section isolation
* moving a required High-Yield fact into the correct section
* deduplicating redundant Differential Drills based on the stated rules

Examples of unacceptable autonomous assumptions:

* inventing missing source facts
* inventing Core coverage
* inventing MRI/US findings
* inventing differentials beyond allowed controlled inference
* inventing thresholds, management rules, or epidemiology
* silently excluding or merging cases

When content judgment is genuinely uncertain, prefer transparent stopping over fabricated completion.

---

## WORK PRODUCT FORMAT

When executing this workflow, structure your output clearly in phases:

1. Core Validation / Core GAP Report
2. Whole-Source Coverage Audit
3. Core Summary if required
4. Section preview currently being generated
5. Validation result for that section
6. Final deck audit before TSV
7. TSV export only after all checks pass

Do not collapse all of this into one undifferentiated answer.

---

## FINAL OPERATING INSTRUCTION

Execute the embedded radiology card-generation system as a strict staged workflow.

Do not optimize for speed at the expense of structural integrity.
Do not optimize for brevity at the expense of coverage enforcement.
Do not optimize for convenience at the expense of source discipline.

Your priorities are:

1. rule compliance
2. source fidelity
3. section completeness
4. validation transparency
5. preview-to-export identity
6. TSV structural correctness

If a rule blocks export, stop and say so.
If a repair is possible within scope, repair it and continue.
If a section is incomplete, do not move to the next section.
If the deck passes every gate, then and only then emit the final TSV.
"""
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
    elif MODE == "narrative":
        raw = Path(NARRATIVE_PROMPT)
    else:
        raw = Path(DEFAULT_PROMPT)

    if raw.is_absolute() or raw.exists():
        return raw

    fallback = SCRIPT_DIR / raw
    return fallback if fallback.exists() else raw


def resolve_mode(prompt_arg: str | None, narrative_flag: bool) -> str:
    mode = MODE.strip().lower()
    if mode not in VALID_MODES:
        raise SystemExit(
            f"ERROR: Invalid MODE '{MODE}'. Use one of: narrative, chatgpt_cards, codex_cards."
        )

    if narrative_flag:
        return "narrative"

    if prompt_arg:
        prompt_name = Path(prompt_arg).name.lower()
        if prompt_name == NARRATIVE_PROMPT.lower():
            return "narrative"
        return "codex_cards" if mode == "codex_cards" else "chatgpt_cards"

    return mode


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

    selected_mode = resolve_mode(args.prompt, args.narrative)
    prompt_path = resolve_prompt_path(args.prompt, selected_mode == "narrative")
    input_js_path = resolve_js_path(args.js)

    if not prompt_path.exists():
        raise SystemExit(f"ERROR: Prompt file not found: {prompt_path}")
    if not input_js_path.exists():
        raise SystemExit(f"ERROR: JS file not found: {input_js_path}")

    prompt_text = prompt_path.read_text(encoding="utf-8")
    js_code = input_js_path.read_text(encoding="utf-8")

    if MARKER not in js_code:
        raise SystemExit(f"ERROR: Marker '{MARKER}' not found in {input_js_path.name}")

    narrative_mode = (selected_mode == "narrative") or (prompt_path.name == NARRATIVE_PROMPT)
    include_core_validation = not narrative_mode
    js_code = inject_settings_block(
        js_code,
        include_core_validation=include_core_validation,
        narrative_mode=narrative_mode,
    )
    js_code = set_core_validation_visibility(js_code, include_core_validation)
    final_prompt_text = prompt_text
    codex_workflow_enabled = (selected_mode == "codex_cards") and not narrative_mode
    if codex_workflow_enabled:
        final_prompt_text = f"{CODEX_WORKFLOW_PROMPT}\n\n{prompt_text}"

    safe_prompt = escape_for_js_template_literal(final_prompt_text)
    final_js = js_code.replace(MARKER, safe_prompt)

    copy_to_clipboard(final_js)

    prompt_mode = "narrative" if prompt_path.name == NARRATIVE_PROMPT else "standard"
    print("Final code copied to clipboard.")
    print(f"Injected {prompt_mode} prompt from '{prompt_path.name}' into '{input_js_path.name}'.")
    print(f"Mode: {selected_mode}")
    if codex_workflow_enabled:
        print("Codex workflow preamble enabled.")
    print(f"Inserted {len(final_prompt_text)} characters into template.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
