# Repository Audit and Reference

## Purpose

This repository is a local workflow for turning RadPrimer-style article content into:

1. structured extracted source packages from browser pages
2. LLM-ready prompts for summary/card generation
3. generated TSV-style Anki card output
4. image queues for Image Occlusion workflows in Anki

It is not a conventional Python package or service. It is a toolchain of prompt assets, browser scripts, Python inject/build helpers, and an Anki add-on.

## High-Level Architecture

There are three main subsystems:

### 1. `Normal/`

The normal-anatomy engine.

- Source prompt rules are split across many `.txt` files.
- [`Normal/prompt_builder.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/Normal/prompt_builder.py) concatenates those files into [`Normal/FULL_PROMPT.txt`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/Normal/FULL_PROMPT.txt).
- [`Normal/inject_prompt.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/Normal/inject_prompt.py) injects the built prompt into the browser extraction script.
- [`Normal/inject_prompt_intoedgescript.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/Normal/inject_prompt_intoedgescript.py) is a higher-level helper that combines prompt choice, mode selection, and Edge-script injection behavior.
- [`Normal/input_code.js`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/Normal/input_code.js) is the page-side extractor/exporter that pulls topic, article outline, image metadata, and workflow context from the browser DOM.

### 2. `pathology/`

The pathology engine follows the same pattern, but adds a Core-validation workflow.

- Prompt sections are assembled by [`pathology/prompt_builder.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/prompt_builder.py) into [`pathology/FULL_PROMPT.txt`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/FULL_PROMPT.txt).
- Prompt injection is handled by [`pathology/inject_prompt.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/inject_prompt.py) and [`pathology/inject_prompt_intoedgescript.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/inject_prompt_intoedgescript.py).
- [`pathology/input_code.js`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/input_code.js) performs browser extraction and can optionally download plain and annotated images.
- The pathology prompt stack is more prescriptive about staged generation and validation gates.

### 3. `anki_io_queue/`

This is the downstream bridge from extracted image blocks to Anki Image Occlusion.

- [`anki_io_queue/build_queue.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/build_queue.py) parses extracted text and emits queue JSON.
- [`anki_io_queue/anki_addon/__init__.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/anki_addon/__init__.py) is an Anki add-on that steps through queue items, copies images to the clipboard, and tries to prefill/apply captions.
- [`anki_io_queue/README.md`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/README.md) describes the intended manual-assisted Image Occlusion workflow.

## End-to-End Workflow

### Normal or pathology card workflow

1. Edit prompt section files in `Normal/` or `pathology/`.
2. Run the corresponding `prompt_builder.py` to rebuild `FULL_PROMPT.txt`.
3. Inject the built prompt into the relevant `input_code.js`.
4. Run the JS in the browser on a RadPrimer article page.
5. Copy the extracted package from the browser clipboard into ChatGPT/Codex.
6. Use the generated prompt package to produce summaries/cards/TSV output.

### Image Occlusion workflow

1. Use `input_code.js` to extract article text plus image/caption blocks.
2. Run [`anki_io_queue/build_queue.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/build_queue.py) on that extracted text or clipboard contents.
3. Load the produced `queue.json` in the Anki add-on.
4. Advance through images one item at a time while creating Image Occlusion notes.

## Key Files Worth Knowing

### Core builders and injectors

- [`Normal/prompt_builder.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/Normal/prompt_builder.py)
- [`Normal/inject_prompt.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/Normal/inject_prompt.py)
- [`Normal/inject_prompt_intoedgescript.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/Normal/inject_prompt_intoedgescript.py)
- [`Normal/input_code.js`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/Normal/input_code.js)
- [`pathology/prompt_builder.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/prompt_builder.py)
- [`pathology/inject_prompt.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/inject_prompt.py)
- [`pathology/inject_prompt_intoedgescript.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/inject_prompt_intoedgescript.py)
- [`pathology/input_code.js`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/input_code.js)

### Queue/import layer

- [`anki_io_queue/build_queue.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/build_queue.py)
- [`anki_io_queue/anki_addon/__init__.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/anki_addon/__init__.py)
- [`anki_io_queue/README.md`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/README.md)

### Generated or example artifacts currently committed

- [`Normal/FULL_PROMPT.txt`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/Normal/FULL_PROMPT.txt)
- [`pathology/FULL_PROMPT.txt`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/FULL_PROMPT.txt)
- [`anki_io_queue/queue.json`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/queue.json)
- [`pathology/colonic_polyps_mode2_REDO.tsv`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/colonic_polyps_mode2_REDO.tsv)
- [`pathology/usedprompts.js`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/usedprompts.js)

## Audit Findings

### 1. The repo is functional, but it behaves like a personal workstation toolkit rather than a portable project

Evidence:

- Hard-coded Windows repository defaults in [`anki_io_queue/build_queue.py:13`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/build_queue.py#L13) and [`anki_io_queue/anki_addon/__init__.py:28`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/anki_addon/__init__.py#L28)
- User-specific Windows paths are also documented in [`anki_io_queue/README.md`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/README.md) and [`Normal/memory.md`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/Normal/memory.md)

Impact:

- A new machine or collaborator will not get a clean start without manual path edits.
- Queue resolution depends on local image folder conventions.

### 2. The repository has no automated tests

Evidence:

- No test files or test framework references were found in the repo scan.

Impact:

- Prompt-builder and queue-parser regressions would be caught only through manual runs.
- The Anki add-on depends on UI hooks and note-type assumptions that are currently unverified outside live usage.

### 3. A large amount of generated or machine-local state is committed

Examples:

- `__pycache__/` files at repo root and inside engine folders
- [`anki_io_queue/queue.json`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/queue.json)
- [`pathology/colonic_polyps_mode2_REDO.tsv`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/colonic_polyps_mode2_REDO.tsv)
- [`pathology/usedprompts.js`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/usedprompts.js)
- untracked `.DS_Store`

Impact:

- It is harder to distinguish source-of-truth code from output/examples.
- Git diffs become noisier and easier to corrupt with machine-specific artifacts.

### 4. The normal and pathology stacks duplicate a lot of logic

Examples:

- prompt assembly is duplicated between [`Normal/prompt_builder.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/Normal/prompt_builder.py) and [`pathology/prompt_builder.py`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/pathology/prompt_builder.py)
- prompt injection logic is duplicated between the two engines
- browser extraction logic in the JS files is highly similar

Impact:

- Fixes must be repeated in multiple places.
- Behavior drift between engines is likely over time.

### 5. The Anki add-on is intentionally best-effort and tightly coupled to local Anki/UI assumptions

Evidence:

- It searches for note types by specific names in [`anki_io_queue/anki_addon/__init__.py:41`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/anki_addon/__init__.py#L41)
- It tries to find buttons by text in [`anki_io_queue/anki_addon/__init__.py:393`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/anki_addon/__init__.py#L393)
- The README explicitly describes this as a phase-1 workflow rather than full automation

Impact:

- Changes in Anki, the Image Occlusion add-on, field names, or button labels could break the workflow.
- This is workable for a single operator, but brittle for wider reuse.

### 6. The queue builder is more rigid than the normal-engine extraction model

Evidence:

- [`anki_io_queue/build_queue.py:112`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/build_queue.py#L112) requires an `=== IMAGES` block
- [`anki_io_queue/build_queue.py:200`](/Users/rafa2093/Library/CloudStorage/OneDrive-Personal/Desktop/Programming/Anki Engine Jose/NormalAnatomy/anki_io_queue/build_queue.py#L200) fails if no image entries are parsed

Impact:

- This is fine for the Image Occlusion path, but it means the queue builder cannot reuse normal-engine image-optional output unless that output still carries an explicit images block.

## Strengths

- The prompt architecture is explicit and readable.
- `ORDER` lists in the builders make prompt construction deterministic.
- The browser scripts preserve article structure, image numbering, and captions in a way that is practical for downstream LLM use.
- The queue item schema is straightforward and inspectable.
- The repository already contains a clear conceptual split between prompt authoring, browser extraction, and Anki import.

## Verification Notes

I verified that the main Python entry points compile successfully with:

```bash
PYTHONPYCACHEPREFIX=/tmp python3 -m py_compile \
  anki_io_queue/build_queue.py \
  anki_io_queue/anki_addon/__init__.py \
  Normal/prompt_builder.py \
  Normal/inject_prompt.py \
  Normal/inject_prompt_intoedgescript.py \
  pathology/prompt_builder.py \
  pathology/inject_prompt.py \
  pathology/inject_prompt_intoedgescript.py
```

The redirected `PYTHONPYCACHEPREFIX` was necessary because the default macOS Python cache location was sandbox-blocked during validation.

## Recommended Next Steps

### Short-term

- Add a root `README.md` that explains the overall workflow and points to this file.
- Add a `.gitignore` for `__pycache__/`, `.DS_Store`, generated queue/output files, and optionally built prompts if they are reproducible.
- Move hard-coded paths into config constants or environment variables.
- Separate clearly between source files and generated/example artifacts.

### Medium-term

- Extract shared builder/injector utilities used by both `Normal/` and `pathology/`.
- Add a few smoke tests for:
  - prompt build ordering
  - JS prompt injection
  - queue parsing from extracted text
- Add sample input fixtures so the parsing pipeline can be regression-tested.

### Long-term

- Formalize the browser extraction format as a versioned schema.
- Add a small CLI wrapper that makes the normal/pathology workflows less manual.
- Decide whether this repo is meant to stay a personal toolkit or become a reusable system; that choice should drive how much packaging and abstraction is worth doing.

## Practical Summary

The repository already does something useful: it captures a real article-to-prompt-to-Anki workflow and encodes a lot of domain-specific thinking. Its main weaknesses are portability, duplicated logic, committed generated artifacts, and the lack of tests. If those four areas are tightened up, this can become a much easier system to maintain without changing the core workflow design.
