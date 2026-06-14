from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
LABELS_FILE = ROOT / "labels.json"


def as_list(value):
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if value:
        return [str(value).strip()]
    return []


def main() -> int:
    data = json.loads(LABELS_FILE.read_text(encoding="utf-8"))
    labels = data.get("labels") or []
    modalities = data.get("modalities") or []

    print("=== IMAIOS LABEL REPOSITORY ===")
    print(f"version: {data.get('version', '')}")
    if data.get("updatedAt"):
      print(f"updatedAt: {data.get('updatedAt')}")
    print("")

    if modalities:
        print("MODALITIES")
        for modality in modalities:
            if isinstance(modality, dict):
                key = modality.get("key") or modality.get("name") or ""
                name = modality.get("name") or key
                aliases = " | ".join(as_list(modality.get("aliases")))
                line = f"- {name}"
                if key and key != name:
                    line += f" ({key})"
                if aliases:
                    line += f"; aliases: {aliases}"
                print(line)
            else:
                print(f"- {modality}")
        print("")

    print("LABELS")
    if not labels:
        print("[No verified labels recorded yet.]")
        return 0

    for item in labels:
        preferred = str(item.get("preferredLabel") or "").strip()
        if not preferred:
            continue
        print(f"- preferredLabel: {preferred}")
        aliases = " | ".join(as_list(item.get("aliases")))
        modalities_text = " | ".join(as_list(item.get("modalities")))
        regions = " | ".join(as_list(item.get("regions")))
        status = str(item.get("status") or "verified").strip()
        notes = str(item.get("notes") or "").strip()
        if aliases:
            print(f"  aliases: {aliases}")
        if modalities_text:
            print(f"  modalities: {modalities_text}")
        if regions:
            print(f"  regions: {regions}")
        if status:
            print(f"  status: {status}")
        if notes:
            print(f"  notes: {notes}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
