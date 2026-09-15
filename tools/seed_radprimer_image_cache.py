"""Reuse an existing master-source bundle and its named downloads without network I/O."""
import argparse
import hashlib
import io
import json
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image


def inside(root, relative):
    target = (root / relative).resolve()
    if not target.is_relative_to(root.resolve()):
        raise ValueError(f"Image path leaves its bundle: {relative}")
    return target


def seed(bundle, downloads, destination):
    imported = json.loads((bundle / "master_source_import.json").read_text(encoding="utf-8-sig"))
    index_path = destination / "index.json"
    previous = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {"version": 1, "entries": []}
    entries = {row["url"]: row for row in previous.get("entries", [])}
    added, missing, rejected = [], [], []
    destination.mkdir(parents=True, exist_ok=True)
    for entry in imported.get("imageRegistry", []):
        for variant in ("plain", "annotated"):
            url = entry.get(variant + "Url", "")
            parsed = urlparse(url)
            if parsed.scheme != "https" or not (parsed.hostname == "app.radprimer.com" or parsed.hostname == "statdx.com" or (parsed.hostname or "").endswith(".statdx.com")):
                continue
            candidates = []
            evidence = entry.get("visualEvidence") or {}
            if evidence.get("evidenceUrl") == url and evidence.get("evidenceVariant") == variant and evidence.get("evidenceFilename"):
                candidates.append((inside(bundle, evidence["evidenceFilename"]), evidence.get("sha256")))
            filename = entry.get(variant + "Filename", "")
            # Only the exact source-qualified filename is eligible. Never infer a
            # duplicate from its title, diagnosis, caption or image number alone.
            if filename and Path(filename).name == filename and entry.get("masterImageId") and filename.startswith(entry["masterImageId"] + "_"):
                candidates.append((inside(downloads, filename), None))
            accepted = False
            for image_path, expected_hash in candidates:
                if not image_path.is_file():
                    continue
                try:
                    data = image_path.read_bytes()
                    digest = hashlib.sha256(data).hexdigest()
                    if expected_hash and digest != expected_hash:
                        raise ValueError("Source evidence checksum changed")
                    with Image.open(io.BytesIO(data)) as image:
                        extension = {"JPEG": "jpg", "PNG": "png", "GIF": "gif", "WEBP": "webp"}[image.format]
                        image.load()
                        dimensions = list(image.size)
                    cached_name = f"{digest}.{extension}"
                    cached_path = destination / cached_name
                    if not cached_path.exists() or hashlib.sha256(cached_path.read_bytes()).hexdigest() != digest:
                        cached_path.write_bytes(data)
                    row = {"url": url, "filename": cached_name, "sha256": digest, "size": len(data),
                           "dimensions": dimensions, "sourceKind": entry.get("sourceKind"), "variant": variant}
                    entries[url] = row
                    added.append(row)
                    accepted = True
                    break
                except (OSError, ValueError, KeyError) as error:
                    rejected.append({"image": entry.get("masterImageId"), "variant": variant, "reason": str(error)})
            if not accepted:
                missing.append({"image": entry.get("masterImageId"), "variant": variant})
    index_path.write_text(json.dumps({"version": 1, "entries": list(entries.values())}, indent=2), encoding="utf-8")
    return {"seeded": len(added), "plain": sum(row["variant"] == "plain" for row in added),
            "annotated": sum(row["variant"] == "annotated" for row in added),
            "bytes": sum(row["size"] for row in added), "missing": missing, "rejected": rejected,
            "networkRequests": 0, "index": str(index_path)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", required=True, type=Path)
    parser.add_argument("--downloads", type=Path, default=Path.home() / "Downloads" / "RadPrimer")
    parser.add_argument("--destination", type=Path, default=Path(__file__).resolve().parents[1] / "edge_radprimer_extension" / "local-image-cache")
    args = parser.parse_args()
    print(json.dumps(seed(args.bundle.resolve(), args.downloads.resolve(), args.destination.resolve()), indent=2))
