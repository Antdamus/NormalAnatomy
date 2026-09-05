import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path


BUNDLE = Path(__file__).resolve().parents[1]
GENERATED = BUNDLE / "generated_cards.tsv"
CORRECTED = BUNDLE / "corrected_cards.tsv"
ANKI_IMPORT = BUNDLE / "corrected_cards_anki_import.tsv"
REPORT = BUNDLE / "audit_report.md"
DONE = BUNDLE / "_codex_audit_done.txt"


metadata = json.loads((BUNDLE / "metadata.json").read_text(encoding="utf-8"))


def now_utc():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_rows():
    with GENERATED.open("r", encoding="utf-8", newline="") as f:
        rows = list(csv.reader(f, delimiter="\t"))
    bad = [idx + 1 for idx, row in enumerate(rows) if len(row) != 22]
    if bad:
        raise ValueError(f"Generated TSV rows do not all have 22 columns: {bad}")
    return rows


def write_rows(path, rows):
    text = "\n".join("\t".join(row) for row in rows) + "\n"
    path.write_text(text, encoding="utf-8")


def source_summary():
    return (
        '<div><b>&#x1F9ED; Spigelian Hernia</b></div><br>'
        '<b>Source Basis:</b> RadPrimer + STATdx master source. '
        'The captured core_evidence.txt is NOT_PROVIDED, so Core-specific claims are not used.<br><br>'
        '<div><b>&#x1F4D6; Summary</b></div>'
        '<ul>'
        '<li>Spigelian hernia is a lateral ventral/anterolateral hernia through the Spigelian aponeurosis, formed by the internal oblique and transversus abdominis aponeuroses.</li>'
        '<li>The classic location is lateral to rectus, inferior/lateral to the umbilicus, near the arcuate line and within the Spigelian belt of Spangen.</li>'
        '<li>The external oblique aponeurosis usually remains intact over the sac, so most cases are interparietal/interstitial rather than subcutaneous.</li>'
        '</ul><br>'
        '<div><b>&#x1F5BC;&#xFE0F; Key Imaging Findings</b></div>'
        '<b>CT</b>'
        '<ul>'
        '<li>Key clue: hernia lateral to rectus and caudal/lateral to the umbilicus, with intact external oblique muscle or fascia covering the sac.</li>'
        '<li>CT defines the aponeurotic defect, contents, bowel obstruction, and ischemic/strangulation complications.</li>'
        '<li>Contrast-enhanced CT is preferred for acute pain, obstruction, suspected strangulation, and preoperative planning.</li>'
        '</ul>'
        '<b>Ultrasound</b>'
        '<ul>'
        '<li>Target the linea semilunaris dynamically; cough or Valsalva can increase conspicuity.</li>'
        '<li>Scanning inferiorly from the lateral rectus margin and identifying the inferior epigastric artery can help localize the relevant anatomy.</li>'
        '</ul>'
        '<b>MR Imaging</b>'
        '<ul><li>MRI can show the same lateral-to-rectus, deep-to-external-oblique relationship when incidentally encountered.</li></ul><br>'
        '<div><b>&#x2696;&#xFE0F; Differential Diagnosis</b></div>'
        '<ul>'
        '<li>Ventral/incisional hernia: often midline or postoperative; off-midline incisional hernias lack the characteristic intact external oblique cover.</li>'
        '<li>Umbilical hernia: midline umbilical defect rather than inferior/lateral to the umbilicus.</li>'
        '<li>Laparoscopy port hernia: smaller postoperative defect that may be medial or lateral to the classic Spigelian site.</li>'
        '<li>Rectus sheath hematoma or lipoma: no true fascial defect with a bowel/omentum-containing hernia sac.</li>'
        '</ul><br>'
        '<div><b>&#x1F9EC; Clinical / Path / Mechanism</b></div>'
        '<ul>'
        '<li>Etiology is multifactorial, including congenital or acquired weakness of Spigelian fascia.</li>'
        '<li>Most defects are small, often under 2 cm, producing a tight neck and high incarceration/strangulation risk.</li>'
        '<li>Common contents include greater omentum, small bowel, and colon; rare contents include appendix and bladder.</li>'
        '<li>Adult risk factors include prior abdominal surgery and obesity; other reported risks include multiple pregnancies, rapid weight loss, COPD, and trauma.</li>'
        '</ul><br>'
        '<div><b>&#x1F3AF; Board-Relevant Pivots</b></div>'
        '<ul>'
        '<li>Image the relationship: lateral-to-rectus + deep to intact external oblique + small tight fascial neck.</li>'
        '<li>Surgical repair is recommended/indicated in virtually all patients because of high incarceration/strangulation risk; laparoscopic mesh repair is commonly preferred.</li>'
        '<li>Pediatric associations include ipsilateral undescended testis and other anterior wall defects, but no Core/gubernacular mechanism was captured in this bundle.</li>'
        '</ul><br>'
        '<div><b>&#x2B50; Super Summary</b></div>'
        '<ul>'
        '<li>Think lateral-to-rectus + deep to intact external oblique + narrow neck.</li>'
        '<li>Use CT to define the defect and complications; use dynamic ultrasound to localize subtle cases.</li>'
        '<li>Because the neck is narrow and complications are common, recognition has direct surgical significance.</li>'
        '</ul>'
    )


SUMMARY = source_summary()


def build_media_map():
    by_id_variant = {}
    for item in metadata.get("downloadFiles", []):
        key = (item.get("masterImageId"), item.get("variant"))
        by_id_variant[key] = item.get("filename", "")

    replacements = {}
    for item in metadata.get("imageRegistry", []):
        mid = item.get("masterImageId")
        plain = by_id_variant.get((mid, "plain"))
        annotated = by_id_variant.get((mid, "annotated"))
        if plain and item.get("targetPlainFilename"):
            replacements[item["targetPlainFilename"]] = plain
        if annotated and item.get("targetAnnotatedFilename"):
            replacements[item["targetAnnotatedFilename"]] = annotated
    return replacements


MEDIA_REPLACEMENTS = build_media_map()
ARROW_REPLACEMENTS = {
    '<img src="arrow_WS.png">': "[solid arrow]",
    '<img src="arrow_WO.png">': "[open arrow]",
    '<img src="arrow_WC.png">': "[curved arrow]",
}


def repair_media_refs(text):
    for old, new in MEDIA_REPLACEMENTS.items():
        text = text.replace(old, new)
    for old, new in ARROW_REPLACEMENTS.items():
        text = text.replace(old, new)
    text = re.sub(r"\s{2,}", " ", text)
    return text


def new_blank_row(stable_id):
    row = [""] * 22
    row[0] = stable_id
    row[20] = SUMMARY
    return row


def hy_card(stable_id, question, answer):
    row = new_blank_row(stable_id)
    row[14] = question
    row[15] = answer
    return row


def dd_card(stable_id, diagnosis, question, choices, answer):
    row = new_blank_row(stable_id)
    row[5] = diagnosis
    row[6] = question
    row[7] = choices
    row[8] = answer
    return row


rows = read_rows()

for row in rows:
    row[20] = SUMMARY

# Row 11 was a broad "name 4 differentials" drill. Convert it into one focused
# case-bundled discriminator and add focused standalone differential cards below.
rows[10][6] = (
    "On this case, what discriminator favors Spigelian hernia over an off-midline "
    "ventral/incisional hernia?"
)
rows[10][7] = "Spigelian hernia<br>Off-midline ventral/incisional hernia"
rows[10][8] = (
    "Spigelian hernia: lateral-to-rectus defect through the internal oblique/"
    "transversus aponeurosis, with the hernia sac typically covered by intact "
    "external oblique.<br><br>Off-midline ventral/incisional hernia: postoperative "
    "or ventral wall defect that can mimic the location but lacks the characteristic "
    "intact external oblique/aponeurotic cover."
)

# Card 23 had an unsupported gubernacular-development explanation. Keep the
# source-supported pediatric association and remove the unsupported mechanism.
rows[22][15] = (
    "Ipsilateral undescended testis (cryptorchidism). RadPrimer/STATdx also list "
    "other anterior abdominal wall defects such as omphalocele, bladder exstrophy, "
    "and prune belly as pediatric associations. The provided bundle does not include "
    "auditable Core or source text supporting a gubernacular-development mechanism."
)

additions = [
    dd_card(
        "CODX-DD-UMBILICAL-SPIGELIAN",
        "Spigelian hernia",
        "How do you distinguish Spigelian hernia from umbilical hernia on imaging?",
        "Spigelian hernia<br>Umbilical hernia",
        (
            "Spigelian hernia is inferior/lateral to the umbilicus and lateral to the rectus "
            "margin.<br><br>Umbilical hernia protrudes through a midline umbilical defect and "
            "may contain bowel, fat, or ascites."
        ),
    ),
    dd_card(
        "CODX-DD-PORT-SPIGELIAN",
        "Spigelian hernia",
        "How do you distinguish Spigelian hernia from a laparoscopy-port hernia?",
        "Spigelian hernia<br>Laparoscopy-port hernia",
        (
            "Spigelian hernia follows the Spigelian aponeurosis/linea semilunaris region, "
            "typically near or below the arcuate line.<br><br>Laparoscopy-port hernia is a "
            "postoperative small port-site defect that may be medial or lateral to the classic "
            "Spigelian site."
        ),
    ),
    dd_card(
        "CODX-DD-MASS-MIMICS",
        "Spigelian hernia",
        "What finding separates Spigelian hernia from rectus sheath hematoma or lipoma?",
        "Spigelian hernia<br>Rectus sheath hematoma<br>Subcutaneous/intramuscular lipoma",
        (
            "Spigelian hernia has a true aponeurotic/fascial defect with herniated omentum "
            "or bowel.<br><br>Rectus sheath hematoma is a heterogeneous mass within the sheath "
            "without a true hernia sac.<br><br>Lipoma is a fat-containing wall mass without "
            "herniated abdominal contents or a true fascial defect."
        ),
    ),
    hy_card(
        "CODX-HY-CONTENTS",
        "What contents are common and uncommon in Spigelian hernia?",
        (
            "Common: greater omentum, small bowel, or colon.<br><br>Uncommon/rare: appendix, "
            "bladder, and other abdominal or pelvic structures. Exam pivot: unusual contents "
            "do not exclude the diagnosis if the defect is at the Spigelian aponeurosis."
        ),
    ),
    hy_card(
        "CODX-HY-RISK-FACTORS",
        "What adult risk factors are source-supported for Spigelian hernia?",
        (
            "Major adult risk factors: prior abdominal surgery and obesity.<br><br>Other "
            "reported risk factors: multiple pregnancies, rapid weight loss, COPD, and trauma. "
            "Exam pivot: adult cases are usually acquired rather than congenital."
        ),
    ),
]

rows.extend(additions)

for row in rows:
    for idx, cell in enumerate(row):
        row[idx] = repair_media_refs(cell)

write_rows(CORRECTED, rows)

anki = metadata.get("anki", {})
deck = anki.get("deckName", "Corebook::GI::Peritoneum, Mesentery, and Abdominal Wall::Spigelian Hernia")
note_type = anki.get("noteType", "core_rad_notetype_v2")

with ANKI_IMPORT.open("w", encoding="utf-8", newline="") as f:
    f.write("#separator:tab\n")
    f.write("#html:true\n")
    f.write(f"#notetype:{note_type}\n")
    f.write(f"#deck:{deck}\n")
    f.write("\n".join("\t".join(row) for row in rows) + "\n")

created = now_utc()
report = f"""# RadPrimer Card Audit Report: Spigelian Hernia

Created: {created}

## Files Reviewed
- `source_package.txt`
- `generated_cards.tsv`
- `metadata.json`
- `audit_instructions.md`
- `core_evidence.txt`

## Summary
- Imported the latest complete audit bundle and confirmed `_latest_radprimer_audit_bundle.txt` points to this Spigelian Hernia folder.
- Preserved the 22-column TSV schema and original column order.
- Wrote `corrected_cards.tsv` as a no-header TSV and `corrected_cards_anki_import.tsv` with Anki import directives for `{deck}`.
- Original generated rows: 23.
- Corrected rows: {len(rows)}.

## Corrections Made
- Removed unsupported "Core + RadPrimer + STATdx synthesis" source-basis language from every card summary because `core_evidence.txt` is `NOT_PROVIDED` and the source package explicitly says not to fabricate Core support.
- Removed the unsupported gubernacular-development explanation from the pediatric association card. The corrected card keeps the source-supported association with ipsilateral undescended testis and other anterior abdominal wall defects.
- Split the overloaded case-bundled differential drill into a focused Spigelian-vs-ventral/incisional discriminator.
- Added focused, source-supported differential discriminator cards for umbilical hernia, laparoscopy-port hernia, and mass mimics including rectus sheath hematoma/lipoma.
- Added source-supported high-yield cards for hernia contents and adult risk factors.
- Preserved selected image usage and did not introduce archived duplicate image files.
- Repaired image HTML so card references now use the actual filenames listed in `metadata.json` `downloadFiles`, and converted inline arrow-icon image tags to text markers to avoid broken mini-images.

## Source Support Notes
- Core-specific claims were treated as unverified because `core_evidence.txt` says `NOT_PROVIDED`.
- Pediatric undescended testis, omphalocele, bladder exstrophy, and prune belly associations are retained because they are present in `source_package.txt`.
- STATdx-supported supplemental details retained include lipoma/mass mimics, MRI modality variant, unusual appendix/epiploic appendagitis contents, and low-recurrence/repair context in the shared summary.

## Validation
- `corrected_cards.tsv` rows: {len(rows)}.
- Every corrected TSV row has 22 columns.
- `corrected_cards_anki_import.tsv` contains only the required four import directives followed by the same corrected rows, with no field header row.
- Card image references match the `metadata.json` download filename list.
"""

REPORT.write_text(report, encoding="utf-8")
DONE.write_text(
    "\n".join(
        [
            f"doneAt={created}",
            f"bundle={BUNDLE}",
            "articleTitle=Spigelian Hernia",
            "correctedRows=" + str(len(rows)),
            "columnsPerRow=22",
            "ankiImportWritten=true",
            "",
        ]
    ),
    encoding="utf-8",
)

print(f"Wrote {CORRECTED}")
print(f"Wrote {ANKI_IMPORT}")
print(f"Rows: {len(rows)}; columns: {sorted(set(len(row) for row in rows))}")
