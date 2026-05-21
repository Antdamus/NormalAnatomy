from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXTENSION_DIR = Path(__file__).resolve().parent
PROMPTS_DIR = EXTENSION_DIR / "prompts"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(name: str, text: str) -> None:
    PROMPTS_DIR.mkdir(parents=True, exist_ok=True)
    target = PROMPTS_DIR / name
    target.write_text(text, encoding="utf-8")
    print(f"Built {target.relative_to(ROOT)} ({len(text)} chars)")


def main() -> int:
    pathology_dir = ROOT / "pathology"
    normal_dir = ROOT / "Normal"

    pathology_injector = load_module(
        pathology_dir / "inject_prompt_intoedgescript.py", "pathology_edge_injector"
    )
    normal_injector = load_module(
        normal_dir / "inject_prompt_intoedgescript.py", "normal_edge_injector"
    )

    pathology_full = read(pathology_dir / "FULL_PROMPT.txt")
    pathology_narrative = read(pathology_dir / "pathologynarrative.txt")
    normal_full = read(normal_dir / "FULL_PROMPT.txt")
    normal_narrative = read(normal_dir / "normalnarrative.txt")

    write("pathology_narrative.txt", pathology_narrative)
    write(
        "pathology_chatgpt_cards.txt",
        f"{pathology_injector.CHATGPT_AUTONOMOUS_PROMPT}\n\n{pathology_full}",
    )
    write(
        "pathology_codex_cards.txt",
        (
            f"{pathology_injector.CHATGPT_AUTONOMOUS_PROMPT}\n\n"
            f"{pathology_injector.CODEX_WORKFLOW_PROMPT}\n\n"
            f"{pathology_full}"
        ),
    )

    write("normal_narrative.txt", normal_narrative)
    write(
        "normal_chatgpt_cards.txt",
        (
            f"{normal_injector.CHATGPT_AUTONOMOUS_PROMPT}\n\n"
            f"{normal_injector.CHATGPT_CASE_ACCOUNTING_PROMPT}\n\n"
            f"{normal_full}"
        ),
    )
    write(
        "normal_codex_cards.txt",
        (
            f"{normal_injector.CHATGPT_AUTONOMOUS_PROMPT}\n\n"
            f"{normal_injector.CODEX_WORKFLOW_PROMPT}\n\n"
            f"{normal_full}"
        ),
    )
    write(
        "normal_no_pictures.txt",
        (
            f"{normal_injector.CHATGPT_AUTONOMOUS_PROMPT}\n\n"
            f"{normal_injector.NO_PICTURES_MODE_PROMPT}\n\n"
            f"{normal_full}"
        ),
    )
    write(
        "normal_captions_only.txt",
        (
            f"{normal_injector.CHATGPT_AUTONOMOUS_PROMPT}\n\n"
            f"{normal_injector.CAPTIONS_ONLY_MODE_PROMPT}\n\n"
            f"{normal_full}"
        ),
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
