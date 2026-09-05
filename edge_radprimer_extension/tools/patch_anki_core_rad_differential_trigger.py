from __future__ import annotations

import json
from pathlib import Path

from aqt import mw


MODEL_NAME = "core_rad_notetype_v2"
BACKUP_PATH = Path(r"C:\Users\josem.000\Documents\core_rad_notetype_v2_backup_before_differential_trigger_fix.json")


UNKNOWN_DIFF_BLOCK = """{{#Differentials}}
<br><br>
<div style="font-weight:700;">Differential:</div>
{{Differentials}}
{{/Differentials}}
"""


def get_model_manager():
    if not mw or not getattr(mw, "col", None):
        raise RuntimeError("Anki collection is not loaded.")
    return mw.col.models


def get_model(mm, name: str):
    if hasattr(mm, "by_name"):
        return mm.by_name(name)
    if hasattr(mm, "byName"):
        return mm.byName(name)
    raise RuntimeError("Could not find a compatible Anki model lookup method.")


def save_model(mm, model) -> None:
    if hasattr(mm, "save"):
        try:
            mm.save(model)
            return
        except TypeError:
            try:
                mm.save(model, True)
                return
            except TypeError:
                pass

    if hasattr(mm, "update_dict"):
        mm.update_dict(model)
        return

    if hasattr(mm, "flush"):
        mm.flush(model)
        return

    raise RuntimeError("Could not find a compatible Anki model-save method.")


def patch_unknown_template(template: dict) -> bool:
    afmt = template.get("afmt", "")
    if "{{Differentials}}" in afmt:
        return False

    marker = "{{Most_Likely_Diagnosis}}\n\n<br><br>\n\n{{#Imaging_Differentiation}}"
    replacement = "{{Most_Likely_Diagnosis}}\n\n" + UNKNOWN_DIFF_BLOCK + "\n<br><br>\n\n{{#Imaging_Differentiation}}"
    if marker in afmt:
        template["afmt"] = afmt.replace(marker, replacement, 1)
        return True

    fallback = "{{Most_Likely_Diagnosis}}"
    if fallback in afmt:
        template["afmt"] = afmt.replace(fallback, fallback + "\n\n" + UNKNOWN_DIFF_BLOCK, 1)
        return True

    raise RuntimeError("Could not locate Most_Likely_Diagnosis in UNKNOWN back template.")


def patch_differential_template(template: dict) -> int:
    changes = 0
    for key in ("qfmt", "afmt"):
        value = template.get(key, "")
        updated = value
        if "{{#Differentials}}" in updated:
            updated = updated.replace("{{#Differentials}}", "{{#Differential_Q}}", 1)
            changes += 1
        if "{{/Differentials}}" in updated:
            updated = updated.rsplit("{{/Differentials}}", 1)
            updated = "{{/Differential_Q}}".join(updated)
            changes += 1
        if updated != value:
            template[key] = updated
    return changes


def main() -> None:
    mm = get_model_manager()
    model = get_model(mm, MODEL_NAME)
    if not model:
        raise RuntimeError("Could not find note type: " + MODEL_NAME)

    BACKUP_PATH.parent.mkdir(parents=True, exist_ok=True)
    BACKUP_PATH.write_text(json.dumps(model, ensure_ascii=False, indent=2), encoding="utf-8")

    unknown_changed = False
    diff_changes = 0

    for template in model.get("tmpls", []):
        name = template.get("name", "").strip().upper()
        if name == "UNKNOWN":
            unknown_changed = patch_unknown_template(template)
        elif name == "DIFFERENTIAL DRILL":
            diff_changes += patch_differential_template(template)

    if diff_changes == 0:
        raise RuntimeError("Differential Drill template was not changed; expected {{#Differentials}} gate was not found.")

    save_model(mm, model)

    try:
        mw.col.setMod()
    except Exception:
        pass

    try:
        mw.reset()
    except Exception:
        pass

    print("Patched", MODEL_NAME)
    print("Backup:", str(BACKUP_PATH))
    print("UNKNOWN back Differentials block added:", unknown_changed)
    print("Differential Drill gate replacements:", diff_changes)
    print("After this, Differentials can stay on UNKNOWN backs without creating extra Differential Drill cards.")


main()
