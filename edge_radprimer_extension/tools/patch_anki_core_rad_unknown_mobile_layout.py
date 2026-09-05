from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

from aqt import mw


MODEL_NAME = "core_rad_notetype_v2"
BACKUP_PATH = Path(
    r"C:\Users\josem.000\Documents\core_rad_notetype_v2_backup_before_unknown_mobile_layout.json"
)

CLEAN_FIELDS = [
    "Image",
    "Image_Annotated",
    "Most_Likely_Diagnosis",
    "Differentials",
    "Imaging_Differentiation",
    "Original_Caption",
    "Mechanism",
    "Boards_Trap",
    "High_Yield_A",
]


UNKNOWN_BACK_BODY = r"""{{#Question}}
{{#Image}}
<style>
.radBackUnknown {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  line-height: 1.35;
  text-align: left;
}
.radSection {
  margin: 0 0 14px;
}
.radLabel {
  font-weight: 700;
  margin-bottom: 4px;
}
.radAnswer {
  font-size: 1rem;
}
.radDifferential {
  padding-top: 4px;
}
.radDifferential .radAnswer {
  font-size: 0.98rem;
}
.radKeyFindings {
  margin-top: 2px;
}
.radDetails {
  margin: 12px 0;
}
.radDetails summary {
  cursor: pointer;
  font-weight: 700;
  margin-bottom: 8px;
}
.radDetailsBody {
  margin-top: 8px;
}
.radHidden {
  display: none;
}
.radImages {
  margin-top: 16px;
  text-align: center;
}
.radImages img {
  max-width: 100%;
  height: auto;
}
.radImages .stackCap {
  font-size: 0.88rem;
  line-height: 1.3;
  text-align: left;
  margin: 6px 0 14px;
  opacity: 0.9;
}
.radImages .imgRef {
  display: none !important;
}
</style>

<div class="radBackUnknown" data-rad-unknown-back="1">
  <div class="radSection">
    <div class="radLabel">Most Likely Diagnosis:</div>
    <div id="rad-ml-source" class="radHidden">{{Most_Likely_Diagnosis}}</div>
    <div id="rad-dx-clean" class="radAnswer"></div>
  </div>

  {{#Differentials}}
  <div class="radSection radDifferential">
    <div class="radLabel">Differential:</div>
    <div id="rad-diff-source" class="radHidden">{{Differentials}}</div>
    <div id="rad-diff-clean" class="radAnswer"></div>
  </div>
  {{/Differentials}}

  <div id="rad-key-section" class="radSection radKeyFindings" style="display:none;">
    <div class="radLabel">Key Imaging Findings:</div>
    <div id="rad-key-clean" class="radAnswer"></div>
  </div>

  <details id="rad-reason-section" class="radDetails" style="display:none;">
    <summary>Case Reasoning</summary>
    <div id="rad-reason-clean" class="radDetailsBody"></div>
  </details>

  {{#Imaging_Differentiation}}
  <details id="rad-imgdiff-section" class="radDetails">
    <summary>Imaging Differentiation / Pattern</summary>
    <div id="rad-imgdiff-source" class="radHidden">{{Imaging_Differentiation}}</div>
    <div id="rad-imgdiff-clean" class="radDetailsBody"></div>
  </details>
  {{/Imaging_Differentiation}}

  <div class="radImages">
    {{#Image_Annotated}}
      <div id="rad-annotated-source" class="imgStack">
        {{Image_Annotated}}
      </div>
    {{/Image_Annotated}}

    {{^Image_Annotated}}
      <div class="imgStack">
        {{Image}}
      </div>
    {{/Image_Annotated}}
  </div>

  {{#Radiopaedia_Link}}
  <details class="radDetails">
    <summary>Supplement</summary>
    <a href="{{Radiopaedia_Link}}" target="_blank" rel="noopener">Open Radiopaedia case</a>
  </details>
  {{/Radiopaedia_Link}}

  {{#summary}}
  <details class="radDetails">
    <summary>Article Summary</summary>
    <div class="radDetailsBody">
      {{summary}}
    </div>
  </details>
  {{/summary}}
</div>

<script>
(function() {
  function byId(id) {
    return document.getElementById(id);
  }

  function trimBreaks(html) {
    var s = html || "";
    s = s.replace(/^(?:\s|&nbsp;|<br\s*\/?>)+/gi, "");
    s = s.replace(/(?:\s|&nbsp;|<br\s*\/?>)+$/gi, "");
    s = s.replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br><br>");
    return s.trim();
  }

  function stripVisibleRefs(html) {
    var s = html || "";
    s = s.replace(/<div\b[^>]*class=(["'])[^"']*\bimgRef\b[^"']*\1[^>]*>[\s\S]*?<\/div>/gi, "");
    s = s.replace(/(^|<br\s*\/?>|\s)(?:<b>|<strong>)?\s*Image reference:\s*[\s\S]{0,800}?\.(?:jpg|jpeg|png)\s*(?:<\/b>|<\/strong>)?\s*/gi, "$1");
    s = s.replace(/(?:^|<br\s*\/?>|\s)(?:<b>|<strong>)?\s*(?:Image references?|Source image link\(s\)):\s*(?:<\/b>|<\/strong>)?[\s\S]*$/gi, "");
    s = s.replace(/https?:\/\/app\.statdx\.com\/image\/thumbnail\/[^<\s]+/gi, "");
    s = s.replace(/https?:\/\/[^<\s]*(?:statdx|radprimer)[^<\s]*/gi, "");
    return trimBreaks(s);
  }

  function setClean(sourceId, targetId) {
    var source = byId(sourceId);
    var target = byId(targetId);
    if (!source || !target) return "";
    var cleaned = stripVisibleRefs(source.innerHTML);
    target.innerHTML = cleaned;
    return cleaned;
  }

  function findHeading(html, headings) {
    var lower = html.toLowerCase();
    for (var i = 0; i < headings.length; i++) {
      var label = headings[i].toLowerCase();
      var idx = lower.indexOf(label);
      if (idx !== -1) {
        return { index: idx, end: idx + label.length };
      }
    }
    return null;
  }

  function stripLeadHeading(html, headings) {
    var s = trimBreaks(html);
    for (var i = 0; i < headings.length; i++) {
      var escaped = headings[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var re = new RegExp("^(?:<b>|<strong>)?\\s*" + escaped + "\\s*(?:</b>|</strong>)?\\s*", "i");
      s = s.replace(re, "");
    }
    return trimBreaks(s);
  }

  function setVisibleIfHas(sectionId, html) {
    var section = byId(sectionId);
    if (!section) return;
    section.style.display = trimBreaks(html) ? "" : "none";
  }

  function splitMostLikelyDiagnosis() {
    var source = byId("rad-ml-source");
    var dx = byId("rad-dx-clean");
    var key = byId("rad-key-clean");
    var reason = byId("rad-reason-clean");
    if (!source || !dx) return;

    var html = stripLeadHeading(stripVisibleRefs(source.innerHTML), ["Most Likely Diagnosis:"]);
    var keyHit = findHeading(html, ["Keyword findings:", "Key imaging findings:"]);
    var reasonHit = findHeading(html, ["Reasoning:"]);

    var dxHtml = html;
    var keyHtml = "";
    var reasonHtml = "";

    if (keyHit && (!reasonHit || keyHit.index < reasonHit.index)) {
      dxHtml = html.slice(0, keyHit.index);
      if (reasonHit && reasonHit.index > keyHit.index) {
        keyHtml = html.slice(keyHit.end, reasonHit.index);
        reasonHtml = html.slice(reasonHit.end);
      } else {
        keyHtml = html.slice(keyHit.end);
      }
    } else if (reasonHit) {
      dxHtml = html.slice(0, reasonHit.index);
      reasonHtml = html.slice(reasonHit.end);
    }

    dx.innerHTML = trimBreaks(dxHtml) || html;
    if (key && trimBreaks(keyHtml)) {
      key.innerHTML = trimBreaks(keyHtml);
      setVisibleIfHas("rad-key-section", key.innerHTML);
    }
    if (reason && trimBreaks(reasonHtml)) {
      reason.innerHTML = trimBreaks(reasonHtml);
      setVisibleIfHas("rad-reason-section", reason.innerHTML);
    }
  }

  function splitImagingDifferentiation() {
    var source = byId("rad-imgdiff-source");
    var target = byId("rad-imgdiff-clean");
    if (!source || !target) return;

    var html = stripVisibleRefs(source.innerHTML);
    var key = byId("rad-key-clean");
    var keyHit = findHeading(html, ["Key imaging findings:", "Keyword findings:"]);
    var nextHit = findHeading(html, [
      "Key differentiators:",
      "Imaging specificity:",
      "How to read:",
      "Typical imaging appearance:",
      "Report-critical findings:",
      "Management pivot:"
    ]);

    if (keyHit && keyHit.index < 40 && (!nextHit || nextHit.index > keyHit.index)) {
      var keyHtml = nextHit ? html.slice(keyHit.end, nextHit.index) : html.slice(keyHit.end);
      var restHtml = nextHit ? html.slice(nextHit.index) : "";
      if (key && !trimBreaks(key.innerHTML) && trimBreaks(keyHtml)) {
        key.innerHTML = trimBreaks(keyHtml);
        setVisibleIfHas("rad-key-section", key.innerHTML);
      }
      target.innerHTML = trimBreaks(restHtml);
    } else {
      target.innerHTML = html;
    }

    var details = byId("rad-imgdiff-section");
    if (details && !trimBreaks(target.innerHTML)) {
      details.style.display = "none";
    }
  }

  function cleanRenderedImageStack() {
    var root = document.querySelector("[data-rad-unknown-back]");
    if (!root) return;

    var refs = root.querySelectorAll(".imgRef");
    for (var i = 0; i < refs.length; i++) {
      if (refs[i].parentNode) refs[i].parentNode.removeChild(refs[i]);
    }

    var caps = root.querySelectorAll(".stackCap");
    for (var j = 0; j < caps.length; j++) {
      caps[j].innerHTML = stripVisibleRefs(caps[j].innerHTML);
    }
  }

  splitMostLikelyDiagnosis();
  setClean("rad-diff-source", "rad-diff-clean");
  splitImagingDifferentiation();
  cleanRenderedImageStack();
})();
</script>
{{/Image}}
{{/Question}}
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


def find_template(model, template_name: str) -> dict:
    wanted = template_name.strip().upper()
    for template in model.get("tmpls", []):
        if template.get("name", "").strip().upper() == wanted:
            return template
    raise RuntimeError(f"Could not find template: {template_name}")


def existing_script_tail(afmt: str) -> str:
    for marker in ("\n<script>\n  setTimeout(function()", "\n<span data-anki-rad-lightbox-scope"):
        idx = afmt.find(marker)
        if idx != -1:
            return afmt[idx:]
    return ""


def patch_unknown_back(model) -> bool:
    template = find_template(model, "UNKNOWN")
    current = template.get("afmt", "")
    if "data-rad-unknown-back" in current:
        return False

    template["afmt"] = UNKNOWN_BACK_BODY + "\n" + existing_script_tail(current)
    return True


def patch_differential_trigger(model) -> int:
    template = find_template(model, "DIFFERENTIAL DRILL")
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


def strip_visible_references(value: str) -> str:
    if not value:
        return value

    cleaned = value
    cleaned = re.sub(
        r'<div\b[^>]*class=(["\'])[^"\']*\bimgRef\b[^"\']*\1[^>]*>[\s\S]*?</div>',
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r'(^|<br\s*/?>|\s)(?:<b>|<strong>)?\s*Image reference:\s*[\s\S]{0,800}?\.(?:jpg|jpeg|png)\s*(?:</b>|</strong>)?\s*',
        r"\1",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r'(?:^|<br\s*/?>|\s)(?:<b>|<strong>)?\s*(?:Image references?|Source image link\(s\)):\s*(?:</b>|</strong>)?[\s\S]*$',
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"https?://app\.statdx\.com/image/thumbnail/[^\s<]+",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"https?://[^\s<]*(?:statdx|radprimer)[^\s<]*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"(?:<br\s*/?>\s*){3,}", "<br><br>", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def note_ids_for_model(model_name: str) -> list[int]:
    if hasattr(mw.col, "find_notes"):
        return list(mw.col.find_notes(f'note:"{model_name}"'))
    if hasattr(mw.col, "findNotes"):
        return list(mw.col.findNotes(f'note:"{model_name}"'))
    raise RuntimeError("Could not find a compatible note search method.")


def update_note(note) -> None:
    if hasattr(mw.col, "update_note"):
        mw.col.update_note(note)
        return
    if hasattr(note, "flush"):
        note.flush()
        return
    raise RuntimeError("Could not find a compatible note update method.")


def clean_existing_notes(model) -> tuple[int, int]:
    field_names = {field["name"] for field in model.get("flds", [])}
    cleanable = [name for name in CLEAN_FIELDS if name in field_names]

    notes_seen = 0
    notes_changed = 0
    for nid in note_ids_for_model(MODEL_NAME):
        note = mw.col.get_note(nid) if hasattr(mw.col, "get_note") else mw.col.getNote(nid)
        notes_seen += 1
        changed = False

        for field_name in cleanable:
            before = note[field_name]
            after = strip_visible_references(before)
            if after != before:
                note[field_name] = after
                changed = True

        if changed:
            update_note(note)
            notes_changed += 1

    return notes_seen, notes_changed


def main() -> None:
    mm = get_model_manager()
    model = get_model(mm, MODEL_NAME)
    if not model:
        raise RuntimeError("Could not find note type: " + MODEL_NAME)

    backup_path = BACKUP_PATH.with_name(
        BACKUP_PATH.stem + "_" + datetime.now().strftime("%Y%m%d_%H%M%S") + BACKUP_PATH.suffix
    )
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    backup_path.write_text(json.dumps(model, ensure_ascii=False, indent=2), encoding="utf-8")

    unknown_changed = patch_unknown_back(model)
    diff_trigger_changes = patch_differential_trigger(model)
    save_model(mm, model)

    notes_seen, notes_changed = clean_existing_notes(model)

    try:
        mw.reset()
    except Exception:
        pass

    print("Patched", MODEL_NAME)
    print("Backup:", str(backup_path))
    print("UNKNOWN mobile layout changed:", unknown_changed)
    print("Differential Drill trigger replacements:", diff_trigger_changes)
    print("Notes scanned:", notes_seen)
    print("Notes cleaned of visible image-reference/source-link text:", notes_changed)
    print("UNKNOWN back order is now diagnosis -> differential -> key imaging findings -> collapsible explanations.")


main()
