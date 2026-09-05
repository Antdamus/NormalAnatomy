import csv
import json
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path


BUNDLE = Path(__file__).resolve().parents[1]
GENERATED = BUNDLE / "generated_cards.tsv"
METADATA = BUNDLE / "metadata.json"
CORE = BUNDLE / "core_evidence.txt"


def read_tsv(path):
    with path.open("r", encoding="utf-8", newline="") as f:
        return list(csv.reader(f, delimiter="\t"))


def write_tsv(path, rows):
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter="\t", lineterminator="\n")
        writer.writerows(rows)


def now_utc():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


rows = read_tsv(GENERATED)
if not rows:
    raise SystemExit("generated_cards.tsv is empty")
column_count = len(rows[0])
if any(len(row) != column_count for row in rows):
    raise SystemExit("generated_cards.tsv has inconsistent column counts")
if column_count != 22:
    raise SystemExit(f"expected 22 columns, found {column_count}")

metadata = json.loads(METADATA.read_text(encoding="utf-8"))
anki = metadata.get("anki", {})
deck_name = anki.get("deckName", "")
note_type = anki.get("noteType", "core_rad_notetype_v2")
summary = rows[0][20]


def card_id(prefix):
    return f"TDR_AUDIT_{prefix}"


def blank_row(identifier):
    row = [""] * column_count
    row[0] = identifier
    row[20] = summary
    return row


def recall(identifier, question, answer):
    row = blank_row(identifier)
    row[14] = question
    row[15] = answer
    return row


def mechanism(identifier, question, answer):
    row = blank_row(identifier)
    row[5] = "Traumatic diaphragmatic rupture"
    row[10] = question
    row[11] = answer
    return row


def pitfall(identifier, question, answer):
    row = blank_row(identifier)
    row[5] = "Traumatic diaphragmatic rupture"
    row[12] = question
    row[13] = answer
    return row


remove_questions = {
    "What are the major CT signs of traumatic diaphragmatic rupture?",
    "What CT secondary clues should raise concern for an occult traumatic diaphragmatic rupture?",
    "What radiographic findings can suggest traumatic diaphragmatic rupture?",
    "What complications of traumatic diaphragmatic rupture are source-supported?",
}

corrected = []
removed = []
for row in rows:
    question = row[14]
    if question in remove_questions:
        removed.append(question)
        continue
    corrected.append(row)

new_cards = [
    recall(
        card_id("CT_DIRECT_DEFECT"),
        "What is the direct CT sign of traumatic diaphragmatic rupture?",
        "A focal discontinuity or segmental defect in the hemidiaphragm.<br>Supportive detail: the free edge may look thickened or hypoenhancing from muscle retraction or hemorrhage.<br>Exam pivot: distinguish this from a chronic nontraumatic diaphragmatic defect by using the trauma context and adjacent injury pattern.",
    ),
    recall(
        card_id("DANGLING_SIGN"),
        "What is the dangling diaphragm sign?",
        "The free edge of the torn diaphragm curls inward on axial CT instead of continuing its normal course parallel to the chest wall.<br>Exam pivot: it is a direct sign of a torn, retracted diaphragmatic edge.",
    ),
    recall(
        card_id("ABSENT_SIGN"),
        "What is the absent diaphragm sign?",
        "Absence of the diaphragm in its expected location, even when a discrete tear is not directly seen.<br>Exam pivot: absence in the expected location is different from an intact but elevated diaphragm in eventration or paralysis.",
    ),
    recall(
        card_id("COLLAR_SIGN"),
        "What is the collar sign in traumatic diaphragmatic rupture?",
        "Waist-like narrowing of a herniated stomach, bowel loop, or other structure as it passes through the diaphragmatic tear.<br>Best display: coronal multiplanar reformats often show it better than axial images.<br>Related right-sided clue: a hepatic hump/band sign can occur when liver herniates through a defect.",
    ),
    recall(
        card_id("ORGAN_HERNIATION"),
        "Which organs most commonly herniate through traumatic diaphragmatic rupture?",
        "Source-supported order: stomach more often than omentum, colon, small bowel, spleen, or liver.<br>Exam pivot: stomach in the left thorax with collar or fallen-viscus behavior is the classic pattern.",
    ),
    recall(
        card_id("SECONDARY_PAIRINGS"),
        "Which paired thoracoabdominal findings are secondary CT clues to traumatic diaphragmatic rupture?",
        "Pneumothorax with pneumoperitoneum, or hemothorax with hemoperitoneum.<br>Other source-supported secondary clues include active extravasation near the diaphragm, asymmetric diaphragmatic elevation, nearby organ injury, pleural fluid tracking into the upper abdomen, and contiguous injuries above and below the diaphragm.",
    ),
    pitfall(
        card_id("CONTIGUOUS_INJURY"),
        "What safety check helps avoid missing an occult tear when the diaphragm defect is not obvious?",
        "Look for contiguous injury immediately above and below the diaphragm, then inspect the diaphragm on multiplanar CT.<br>Why it matters: STATdx specifically notes that injuries on both sides of the diaphragm should raise concern even if the discrete tear is not visible.",
    ),
    recall(
        card_id("RAD_NG_TUBE"),
        "What nasogastric-tube pattern on radiography suggests left traumatic diaphragmatic rupture?",
        "An NG tube above the left hemidiaphragm with an abnormal U-shaped course or tip directed back toward the left shoulder.<br>Exam pivot: in trauma, this implies the stomach is abnormally high/intrathoracic rather than normally subdiaphragmatic.",
    ),
    pitfall(
        card_id("HYDROPNEUMO_MIMIC"),
        "What radiographic mimic should not be confused with herniated hollow viscus in diaphragmatic rupture?",
        "A loculated hydropneumothorax can mimic herniated stomach or bowel with gas/fluid in the lower chest, and vice versa.<br>Safety check: use CT to determine whether the gas/fluid is pleural or represents abdominal viscera crossing a diaphragm defect.",
    ),
    recall(
        card_id("INTRAPERICARDIAL"),
        "What is intrapericardial herniation in traumatic diaphragmatic rupture?",
        "A rare injury pattern in which bowel or fat herniates through the central tendon of the diaphragm into the pericardial sac.<br>Imaging consequence: abdominal contents may sit within the pericardium and exert mass effect on the heart.<br>Source context: STATdx image examples show right diaphragmatic/pericardial disruption with omental fat and bowel adjacent to the heart.",
    ),
    recall(
        card_id("TENSION_GASTROTHORAX"),
        "What is tension gastrothorax as a complication of traumatic diaphragmatic rupture?",
        "A herniated intrathoracic stomach dilates with gas because of obstruction, causing ipsilateral lung collapse and mediastinal shift.<br>Source label: STATdx-supported complication.",
    ),
    recall(
        card_id("SIDE_ASSOC_INJURIES"),
        "Which associated injuries are source-supported by side in blunt diaphragmatic rupture?",
        "Left-sided blunt diaphragmatic injury is most associated with splenic injury.<br>Right-sided blunt injury is associated with liver, right kidney, aorta, heart, pelvis, ribs, and spine injuries.<br>Exam pivot: adjacent organ injury should trigger a deliberate diaphragm check.",
    ),
    pitfall(
        card_id("MASKING_FINDINGS"),
        "Which findings can mask traumatic diaphragmatic rupture?",
        "Pleural effusion, pulmonary contusion, atelectasis, pneumothorax, and phrenic nerve palsy can obscure or mimic the injury.<br>Safety check: do not stop at the thoracic finding; review multiplanar CT for diaphragm continuity and secondary signs.",
    ),
    mechanism(
        card_id("LATERAL_VS_FRONTAL"),
        "How do lateral versus frontal blunt impacts injure the diaphragm?",
        "Lateral impact is source-described as a shear mechanism.<br>Frontal impact increases intraabdominal pressure, which can rupture the diaphragm.<br>Exam pivot: both mechanisms can produce major associated thoracoabdominal injuries, so use the injury pattern to guide the diaphragm search.",
    ),
]

# Keep the added cards after the existing text/differential cards so the image set remains first.
corrected.extend(new_cards)

corrected_path = BUNDLE / "corrected_cards.tsv"
write_tsv(corrected_path, corrected)

anki_path = BUNDLE / "corrected_cards_anki_import.tsv"
directives = [
    ["#separator:tab"],
    ["#html:true"],
    [f"#notetype:{note_type}"],
    [f"#deck:{deck_name}"],
]
with anki_path.open("w", encoding="utf-8", newline="") as f:
    for directive in directives:
        f.write(directive[0] + "\n")
    writer = csv.writer(f, delimiter="\t", lineterminator="\n")
    writer.writerows(corrected)

created_at = now_utc()
core_text = CORE.read_text(encoding="utf-8") if CORE.exists() else "NOT_PROVIDED"
core_status = "USED AS CORE GAP ONLY" if "CORE_GAP" in core_text else "PRESENT"

image_rows = [r for r in corrected if r[1]]
selected_images = metadata.get("masterImageIds", [])

report = f"""# RadPrimer Card Audit Report: Traumatic Diaphragmatic Rupture

## Bundle
- Imported bundle: {BUNDLE}
- Compared: source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md, and core_evidence.txt.
- Core evidence status: {core_status}. core_evidence.txt explicitly says this is a Core GAP; no Core-derived cards were added.

## Summary
- Input TSV: {len(rows)} rows, {column_count} columns.
- Corrected TSV: {len(corrected)} rows, {column_count} columns.
- Image cards retained: {len([r for r in corrected if r[1] and r[3] == "Most likely diagnosis?"])} diagnosis cards plus {len([r for r in corrected if r[1] and r[6]])} image differential drills.
- Anki import file written for note type {note_type} and deck {deck_name}.

## Major Corrections
- Preserved the no-header 22-column TSV schema and column order.
- Preserved all {len(selected_images)} selected primary image diagnosis cards from metadata.masterImageIds.
- Removed no image rows; no metadata/bookkeeping prompt cards were found.
- Split overloaded cards covering all major CT signs, secondary CT clues, radiographic findings, and complications into focused one-concept cards.
- Added source-supported high-yield cards for direct diaphragmatic defect, dangling diaphragm sign, absent diaphragm sign, collar sign, herniated-organ order, paired thoracoabdominal secondary signs, radiographic NG-tube pattern, hydropneumothorax mimic, intrapericardial herniation, tension gastrothorax, side-specific associated injuries, masking findings, and lateral-versus-frontal blunt mechanism.
- Kept mechanism explanations tied to the RadPrimer + STATdx source package. No outside clarification was added as a verified source fact.

## Removed Or Replaced Cards
"""

for item in sorted(removed):
    report += f"- Replaced overloaded card: {item}\n"

report += """
## Remaining Notes
- Core Radiology is treated as a documented gap for this entity; the deck remains RadPrimer + STATdx source-supported.
- Differential drill content remains tied to source-listed differentials and source-described image patterns.
- The repeated summary field was preserved because it is part of the note type, not a bookkeeping card.
"""

(BUNDLE / "audit_report.md").write_text(report, encoding="utf-8", newline="\n")
(BUNDLE / "_codex_audit_done.txt").write_text(
    f"done\ncreatedAt={created_at}\narticleTitle=Traumatic Diaphragmatic Rupture\ninputRows={len(rows)}\ncorrectedRows={len(corrected)}\ncolumns={column_count}\n",
    encoding="utf-8",
    newline="\n",
)

print(f"Wrote corrected audit outputs to {BUNDLE}")
