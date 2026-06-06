#!/usr/bin/env python3
"""Cross-platform RadPrimer file watchers for macOS and Unix-like systems."""

from __future__ import annotations

import argparse
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ANKI_LOG_NAME = "_radprimer_anki_watcher.log"
AUDIT_LOG_NAME = "_radprimer_audit_watcher.log"


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def default_anki_media_dir() -> Path:
    return Path.home() / "Library" / "Application Support" / "Anki2" / "User 1" / "collection.media"


def log(source_dir: Path, log_name: str, message: str) -> None:
    source_dir.mkdir(parents=True, exist_ok=True)
    line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {message}"
    print(line, flush=True)
    with (source_dir / log_name).open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")


def wait_for_stable_file(path: Path, attempts: int = 30, delay: float = 0.25) -> bool:
    last_size = -1
    for _ in range(attempts):
        if not path.exists():
            time.sleep(delay)
            continue

        try:
            size = path.stat().st_size
        except OSError:
            time.sleep(delay)
            continue

        if size == last_size:
            try:
                with path.open("rb"):
                    return True
            except OSError:
                time.sleep(delay)
                continue

        last_size = size
        time.sleep(delay)

    return False


def is_image_file(path: Path) -> bool:
    return path.is_file() and path.name != ".DS_Store" and not path.name.endswith(".crdownload") and path.suffix.lower() in IMAGE_EXTENSIONS


def is_audit_copy_candidate(path: Path) -> bool:
    return path.is_file() and path.name not in {AUDIT_LOG_NAME, ".DS_Store"} and not path.name.endswith(".crdownload")


def signature(path: Path, relative: Path | None = None) -> str:
    stat = path.stat()
    key = str(relative) if relative is not None else path.name
    return f"{key}|{stat.st_size}|{stat.st_mtime_ns}"


def watch_anki_images(source_dir: Path, destination_dir: Path, polling_seconds: float) -> None:
    copied: dict[str, str] = {}
    source_dir.mkdir(parents=True, exist_ok=True)
    destination_dir.mkdir(parents=True, exist_ok=True)

    log(source_dir, ANKI_LOG_NAME, f"Watching RadPrimer images in: {source_dir}")
    log(source_dir, ANKI_LOG_NAME, f"Copying enabled runs into: {destination_dir}")
    log(source_dir, ANKI_LOG_NAME, "Leave this window open while running RadPrimer image downloads. Press Ctrl+C to stop.")

    while True:
        for file_path in sorted(source_dir.iterdir()):
            if not is_image_file(file_path):
                continue
            if not wait_for_stable_file(file_path):
                log(source_dir, ANKI_LOG_NAME, f"Skipped unstable file: {file_path.name}")
                continue

            fresh = file_path.resolve()
            current_signature = signature(fresh)
            destination = destination_dir / fresh.name
            if copied.get(fresh.name) == current_signature and destination.exists():
                continue

            shutil.copy2(fresh, destination)
            copied[fresh.name] = current_signature
            log(source_dir, ANKI_LOG_NAME, f"Copied to Anki media: {fresh.name}")

        time.sleep(polling_seconds)


def copy_audit_file(source_dir: Path, destination_dir: Path, file_path: Path, copied: dict[str, str]) -> None:
    if not is_audit_copy_candidate(file_path):
        return
    if not wait_for_stable_file(file_path):
        log(source_dir, AUDIT_LOG_NAME, f"Skipped unstable file: {file_path}")
        return

    fresh = file_path.resolve()
    relative = fresh.relative_to(source_dir.resolve())
    destination = destination_dir / relative
    current_signature = signature(fresh, relative)

    if copied.get(str(relative)) == current_signature and destination.exists():
        return

    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(fresh, destination)
    copied[str(relative)] = current_signature

    bundle_name = relative.parts[0] if relative.parts else ""
    complete_marker = destination_dir / bundle_name / "_bundle_complete.txt" if bundle_name else None
    if complete_marker and complete_marker.exists():
        (destination_dir / "_latest_radprimer_audit_bundle.txt").write_text(str(destination_dir / bundle_name), encoding="utf-8")

    log(source_dir, AUDIT_LOG_NAME, f"Copied audit file: {relative}")


def watch_audit_bundles(source_dir: Path, destination_dir: Path, polling_seconds: float) -> None:
    copied: dict[str, str] = {}
    source_dir.mkdir(parents=True, exist_ok=True)
    destination_dir.mkdir(parents=True, exist_ok=True)

    log(source_dir, AUDIT_LOG_NAME, f"Watching RadPrimer audit bundles in: {source_dir}")
    log(source_dir, AUDIT_LOG_NAME, f"Mirroring audit bundles into: {destination_dir}")
    log(source_dir, AUDIT_LOG_NAME, "Leave this window open while running card audit capture. Press Ctrl+C to stop.")

    while True:
        for file_path in sorted(source_dir.rglob("*")):
            copy_audit_file(source_dir, destination_dir, file_path, copied)
        time.sleep(polling_seconds)


def import_latest_audit_bundle(source_dir: Path, destination_dir: Path) -> int:
    destination_dir.mkdir(parents=True, exist_ok=True)

    if not source_dir.exists():
        print("NO_SOURCE")
        return 0

    complete_bundles = [
        path
        for path in source_dir.iterdir()
        if path.is_dir() and (path / "_bundle_complete.txt").exists()
    ]

    if not complete_bundles:
        print("NO_COMPLETE_BUNDLE")
        return 0

    latest = max(complete_bundles, key=lambda path: path.stat().st_mtime_ns)
    source_files = [
        path
        for path in latest.rglob("*")
        if path.is_file() and not path.name.endswith(".crdownload")
    ]

    for file_path in source_files:
        if not wait_for_stable_file(file_path):
            print("UNSTABLE_BUNDLE")
            return 0

    destination_bundle = destination_dir / latest.name
    destination_bundle.mkdir(parents=True, exist_ok=True)

    for file_path in source_files:
        relative = file_path.relative_to(latest)
        destination_file = destination_bundle / relative
        destination_file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, destination_file)

    (destination_dir / "_latest_radprimer_audit_bundle.txt").write_text(str(destination_bundle), encoding="utf-8")
    print(destination_bundle)
    return 0


def positive_float(value: str) -> float:
    parsed = float(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("value must be greater than zero")
    return parsed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="RadPrimer macOS-compatible watchers.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    anki = subparsers.add_parser("watch-anki-images", help="Mirror RadPrimer image downloads into Anki media.")
    anki.add_argument("--source-dir", type=Path, default=Path.home() / "Downloads" / "RadPrimer")
    anki.add_argument("--destination-dir", type=Path, default=default_anki_media_dir())
    anki.add_argument("--polling-seconds", type=positive_float, default=1.0)

    audit = subparsers.add_parser("watch-audit-bundles", help="Mirror RadPrimer audit bundles into the local queue.")
    audit.add_argument("--source-dir", type=Path, default=Path.home() / "Downloads" / "RadPrimerAudit")
    audit.add_argument("--destination-dir", type=Path, default=repo_root() / "radprimer_audit_queue")
    audit.add_argument("--polling-seconds", type=positive_float, default=1.0)

    importer = subparsers.add_parser("import-latest-audit-bundle", help="Import the newest complete RadPrimer audit bundle once.")
    importer.add_argument("--source-dir", type=Path, default=Path.home() / "Downloads" / "RadPrimerAudit")
    importer.add_argument("--destination-dir", type=Path, default=repo_root() / "radprimer_audit_queue")

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    try:
        if args.command == "watch-anki-images":
            watch_anki_images(args.source_dir.expanduser(), args.destination_dir.expanduser(), args.polling_seconds)
            return 0
        if args.command == "watch-audit-bundles":
            watch_audit_bundles(args.source_dir.expanduser(), args.destination_dir.expanduser(), args.polling_seconds)
            return 0
        if args.command == "import-latest-audit-bundle":
            return import_latest_audit_bundle(args.source_dir.expanduser(), args.destination_dir.expanduser())
    except KeyboardInterrupt:
        print("\nStopped.")
        return 130

    return 2


if __name__ == "__main__":
    sys.exit(main())
