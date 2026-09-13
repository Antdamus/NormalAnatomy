from __future__ import annotations

import csv
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "master_source_queue" / "Tuboovarian_Abscess_2026-08-09T20-51-40-144Z"
IMAGE_ROOT = SOURCE_ROOT / "image_evidence"
OUT_DIR = ROOT / "anki_pyosalpinx"
OUT_TSV = OUT_DIR / "anki_pyosalpinx.tsv"

DECK = "Corebook::Ultrasound::Female Pelvis Basic::Tuboovarian Abscess"
NOTE_TYPE = "core_rad_notetype_v2"

FIELD_COUNT = 22

IMAGES = {
    "rp03": IMAGE_ROOT / "RadPrimer" / "RP-03_RadPrimer_image_03_plain_255f4e15.jpg",
    "rp04": IMAGE_ROOT / "RadPrimer" / "RP-04_RadPrimer_image_04_plain_dcb81349.jpg",
    "rp05": IMAGE_ROOT / "RadPrimer" / "RP-05_RadPrimer_image_05_plain_54c28f34.jpg",
    "rp06": IMAGE_ROOT / "RadPrimer" / "RP-06_RadPrimer_image_06_plain_464866e5.jpg",
    "sdx02": IMAGE_ROOT / "STATdx" / "SDX-02_STATdx_image_02_plain_6d120663.jpg",
    "sdx07": IMAGE_ROOT / "STATdx" / "SDX-07_STATdx_image_07_plain_0215a513.jpg",
    "sdx08": IMAGE_ROOT / "STATdx" / "SDX-08_STATdx_image_08_plain_8d5fef9a.jpg",
}


def br(items: list[str]) -> str:
    return "<br>".join(items)


def stack(items: list[tuple[str, str | None]]) -> str:
    total = len(items)
    html: list[str] = []
    for index, (filename, caption) in enumerate(items, start=1):
        parts = [
            '<div class="stackItem">',
            f'<div class="stackIdx">Image {index}/{total}</div>',
            f'<img src="{filename}">',
        ]
        if caption:
            parts.append(f'<div class="stackCap">{caption}</div>')
        parts.append("</div>")
        html.append("".join(parts))
    return "".join(html)


def blank_row() -> list[str]:
    return [""] * FIELD_COUNT


def unknown_row(
    *,
    context: str,
    image_keys: list[str],
    captions: list[str],
    diagnosis: str,
    entity: str,
    differentials: list[str],
    imaging: str,
    tags: str,
) -> list[str]:
    row = blank_row()
    filenames = [IMAGES[key].name for key in image_keys]
    row[0] = context
    row[1] = stack([(filename, None) for filename in filenames])
    row[2] = stack(list(zip(filenames, captions)))
    row[3] = "Most likely diagnosis?"
    row[4] = diagnosis
    row[5] = entity
    row[7] = br(differentials)
    row[8] = imaging
    row[21] = tags
    return row


def mechanism_row() -> list[str]:
    row = blank_row()
    filenames = [IMAGES["sdx02"].name, IMAGES["rp05"].name]
    row[0] = "Entity: Pyosalpinx M6Q9T2X7LCPA"
    row[1] = stack([(filename, None) for filename in filenames])
    row[2] = stack(
        [
            (
                filenames[0],
                "Transvaginal US example of a dilated tube with echogenic debris and nodular mucosal-fold thickening.",
            ),
            (
                filenames[1],
                "Transvaginal US example of a dilated tube with low-level echoes and incomplete septa.",
            ),
        ]
    )
    row[5] = "Pyosalpinx"
    row[10] = (
        "Why do active salpingitis and pyosalpinx produce the cogwheel appearance "
        "and incomplete septa on ultrasound?"
    )
    row[11] = (
        "Active tubal infection causes edema and thickening of the endosalpingeal or longitudinal mucosal folds. "
        "When those folds project into a dilated pus/debris-filled tubal lumen, the tube can look nodular or "
        "cogwheel-like in cross-section.<br><br>"
        "The incomplete septa are not true ovarian-cyst septations. They are produced by the folded or tortuous "
        "fallopian tube and its apposed mucosal folds, so the bands do not traverse the entire lumen.<br><br>"
        "The low-level internal echoes reflect purulent/cellular debris. Doppler hyperemia reflects active "
        "inflammatory wall and fold vascularity."
    )
    row[21] = "FemalePelvis PID Pyosalpinx Salpingitis Ultrasound Mechanism"
    return row


def high_yield_row() -> list[str]:
    row = blank_row()
    row[0] = "Entity: Pyosalpinx H3V8N5L2QKRD"
    row[5] = "Pyosalpinx"
    row[14] = "What imaging pattern should make pyosalpinx more likely than uncomplicated hydrosalpinx?"
    row[15] = (
        "<b>US:</b> Thickened dilated fallopian tube with complex intraluminal fluid, low-level debris, "
        "fluid-debris level, incomplete septa from a folded tube, cogwheel-type thickened folds, wall/fold "
        "hyperemia, and focal probe tenderness.<br><br>"
        "<b>CT with IV contrast:</b> Thickened or enhancing fallopian tube, hyperenhancing wall/folds, pelvic "
        "fat stranding, free fluid, and associated endometritis, oophoritis, or abscess when present.<br><br>"
        "<b>MRI:</b> Dilated tube with complex T2 fluid or debris level. T1 signal can increase with "
        "proteinaceous, purulent, or hemorrhagic contents; wall/septal/inflammatory enhancement supports "
        "infection. In abscess-stage PID, restricted diffusion can support purulent content but must be read "
        "with morphology and clinical context.<br><br>"
        "<b>Differential pivot:</b> Hydrosalpinx is simpler tubal fluid without active inflammatory wall "
        "hyperemia or surrounding fat inflammation. Hematosalpinx depends on blood-product signal and clinical "
        "context. Tubo-ovarian abscess is favored once the separate tube/ovary architecture is lost or a "
        "thick-walled complex abscess dominates."
    )
    row[21] = "FemalePelvis PID Pyosalpinx Hydrosalpinx CT MRI Ultrasound"
    return row


ROWS = [
    unknown_row(
        context="28-year-old woman with pelvic pain and cervical motion tenderness R7K4M2D9QXFA",
        image_keys=["rp03", "rp04"],
        captions=[
            "Grayscale transvaginal US shows a thickened tender fallopian tube adjacent to a separately recognizable ovary.",
            "Color Doppler from the same patient shows hyperemia of the thickened tube with tubal fluid and ovarian hyperemia.",
        ],
        diagnosis="Acute salpingitis",
        entity="Salpingitis / pyosalpinx spectrum",
        differentials=[
            "Pyosalpinx",
            "Hydrosalpinx",
            "Hematosalpinx",
            "Ectopic pregnancy",
            "Isolated fallopian tube torsion",
        ],
        imaging=(
            "<b>Key imaging findings:</b><br>"
            "Thickened fallopian tube, tubal fluid, wall/fold hyperemia on color Doppler, and a separately "
            "recognizable ovary.<br><br>"
            "<b>Key differentiators:</b><br>"
            "Pyosalpinx adds purulent internal low-level echoes, debris, or a fluid-debris level. Hydrosalpinx "
            "has simpler tubal fluid without marked inflammatory wall thickening or hyperemia. Hematosalpinx "
            "is blood-filled tube, often clarified by blood-product signal on MRI. Ectopic pregnancy depends "
            "on beta-hCG context and an extraovarian tubal ring or gestational contents. Isolated tubal torsion "
            "may show a dilated tube with normal ovary and twisted pedicle rather than ascending inflammatory signs.<br><br>"
            "<b>Reasoning:</b><br>"
            "Tubal wall thickening plus Doppler hyperemia and tubal fluid is active tubal inflammation. The ovary "
            "is not fused into a complex abscess mass, so this remains earlier than tubo-ovarian abscess."
        ),
        tags="FemalePelvis PID Salpingitis Pyosalpinx Ultrasound Doppler",
    ),
    unknown_row(
        context="31-year-old woman with fever and pelvic pain B4H8P2Z6LMQD",
        image_keys=["rp05", "rp06"],
        captions=[
            "Longitudinal transvaginal US shows a dilated tubular adnexal structure with low-level internal echoes and incomplete septa.",
            "Sagittal T2-weighted MRI from the same patient shows a dependent debris level in the dilated tube.",
        ],
        diagnosis="Pyosalpinx",
        entity="Pyosalpinx",
        differentials=[
            "Hydrosalpinx",
            "Hematosalpinx",
            "Tubo-ovarian abscess",
            "Ectopic pregnancy",
            "Paraovarian or ovarian cystic lesion",
        ],
        imaging=(
            "<b>Key imaging findings:</b><br>"
            "Dilated tubular fallopian tube containing low-level echoes/debris, incomplete septa from a folded "
            "tube, and a debris level on MRI when anatomy is difficult on ultrasound.<br><br>"
            "<b>Key differentiators:</b><br>"
            "Hydrosalpinx should be cleaner/simple fluid and lacks active inflammatory hyperemia. Hematosalpinx "
            "is favored by blood-product signal, especially T1 hyperintensity on MRI. Tubo-ovarian abscess is "
            "favored when the tube and ovary are no longer separable or a thick-walled complex abscess dominates. "
            "Ectopic pregnancy requires beta-hCG correlation and may show a tubal ring or gestational contents. "
            "Paraovarian/ovarian cystic lesions are less tubular and lack folded-tube incomplete septa.<br><br>"
            "<b>Reasoning:</b><br>"
            "The important visual move is to call the structure tubular and inflamed rather than treating it as a "
            "septated ovarian cyst."
        ),
        tags="FemalePelvis PID Pyosalpinx Ultrasound MRI Debris IncompleteSepta",
    ),
    unknown_row(
        context="Young woman with acute pelvic pain and fever N9C2R7V5KTLA",
        image_keys=["sdx02"],
        captions=[
            "Transvaginal US shows a debris-filled dilated tube with nodular thickened mucosal folds producing the cogwheel pattern.",
        ],
        diagnosis="Pyosalpinx with cogwheel appearance",
        entity="Pyosalpinx",
        differentials=[
            "Hydrosalpinx",
            "Hematosalpinx",
            "Ectopic pregnancy",
            "Tubo-ovarian abscess",
        ],
        imaging=(
            "<b>Key imaging findings:</b><br>"
            "Dilated fallopian tube, echogenic intraluminal debris, and nodular thickened endosalpingeal folds "
            "projecting into the lumen, producing a cogwheel-like appearance.<br><br>"
            "<b>Key differentiators:</b><br>"
            "Hydrosalpinx may be tubular but should have simple fluid and much less active inflammatory wall/fold "
            "thickening. Hematosalpinx can be complex but should be interpreted through hemorrhage context and "
            "MRI blood-product signal. Ectopic pregnancy needs beta-hCG correlation and a tubal ring or gestational "
            "contents. Tubo-ovarian abscess is favored when normal tube/ovary architecture is destroyed.<br><br>"
            "<b>Reasoning:</b><br>"
            "Cogwheel is a wall/fold sign of active tubal inflammation, not just debris inside a cyst."
        ),
        tags="FemalePelvis PID Pyosalpinx Cogwheel Ultrasound",
    ),
    unknown_row(
        context="Woman with pelvic pain and fever; CT obtained for nonspecific lower abdominal pain T8W3K6Q1VNPL",
        image_keys=["sdx07", "sdx08"],
        captions=[
            "Axial contrast CT shows a tubular left adnexal structure with thick enhancing walls and adjacent pelvic fat inflammation.",
            "Coronal contrast CT shows the dilated tube in short axis with wall/fold thickening and hyperenhancement.",
        ],
        diagnosis="Pyosalpinx / salpingitis on CT",
        entity="Pyosalpinx",
        differentials=[
            "Hydrosalpinx or hematosalpinx",
            "Tubo-ovarian abscess",
            "Appendicitis, diverticulitis, or Crohn-related pelvic abscess",
            "Ovarian cystic neoplasm",
        ],
        imaging=(
            "<b>Key imaging findings:</b><br>"
            "Tubular adnexal structure with thick enhancing wall/folds, pelvic fat inflammation, and no separate "
            "left ovary shown on this CT example.<br><br>"
            "<b>Key differentiators:</b><br>"
            "Uncomplicated hydrosalpinx lacks inflammatory fat stranding and avid wall/fold enhancement. "
            "Hematosalpinx may be higher attenuation before contrast or have hemorrhagic MRI signal. "
            "Tubo-ovarian abscess is favored by a dominant thick-walled complex adnexal collection with loss of "
            "separable tube/ovary architecture. Appendicitis, diverticulitis, and Crohn disease require tracing "
            "the inflammatory epicenter to bowel rather than the tube. Neoplasm usually lacks the acute PID "
            "clinical and inflammatory pattern.<br><br>"
            "<b>Reasoning:</b><br>"
            "CT is less about seeing pus directly and more about proving a thick-walled inflamed tubular adnexal "
            "structure and mapping surrounding inflammatory disease."
        ),
        tags="FemalePelvis PID Pyosalpinx CT Salpingitis",
    ),
    mechanism_row(),
    high_yield_row(),
]


def write_outputs() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for source in IMAGES.values():
        if not source.exists():
            raise FileNotFoundError(source)
        shutil.copy2(source, OUT_DIR / source.name)

    with OUT_TSV.open("w", encoding="utf-8", newline="") as handle:
        handle.write("#separator:tab\n")
        handle.write("#html:true\n")
        handle.write(f"#notetype:{NOTE_TYPE}\n")
        handle.write(f"#deck:{DECK}\n")
        writer = csv.writer(
            handle,
            delimiter="\t",
            lineterminator="\n",
            quoting=csv.QUOTE_NONE,
            quotechar=None,
        )
        writer.writerows(ROWS)

    attribution = OUT_DIR / "source_basis.txt"
    attribution.write_text(
        "\n".join(
            [
                "Pyosalpinx image-card source basis",
                f"Master source package: {SOURCE_ROOT / 'master_source_package.txt'}",
                f"Image registry: {SOURCE_ROOT / 'image_registry.json'}",
                "",
                "Images used:",
                *[f"- {source.name}" for source in IMAGES.values()],
                "",
                "Learner-facing card fields intentionally omit visible image-reference bookkeeping and URLs.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def validate() -> str:
    raw = OUT_TSV.read_text(encoding="utf-8")
    data_lines = [line for line in raw.splitlines() if line and not line.startswith("#")]
    rows = list(csv.reader(data_lines, delimiter="\t"))

    errors: list[str] = []
    if len(rows) != len(ROWS):
        errors.append(f"Expected {len(ROWS)} rows, found {len(rows)}")
    for index, row in enumerate(rows, start=1):
        if len(row) != FIELD_COUNT:
            errors.append(f"Row {index}: expected {FIELD_COUNT} fields, found {len(row)}")
        if not row[0].strip():
            errors.append(f"Row {index}: Clinical_Context is empty")
        if row[6].strip():
            errors.append(f"Row {index}: Differential_Q is populated")
        if re.search(r"\bQ0{4,}\d+\b", row[0]):
            errors.append(f"Row {index}: counter-style ID found")

    image_refs = re.findall(r'<img\s+src="([^"]+)"', raw)
    for filename in image_refs:
        if not (OUT_DIR / filename).exists():
            errors.append(f"Missing image file: {filename}")

    visible_text = re.sub(r'<img\s+[^>]*>', "", raw)
    forbidden_visible = [
        "Image reference:",
        "Image references:",
        "Source image link",
        "Reference:",
        "https://app.statdx.com",
        "https://app.radprimer.com",
    ]
    for token in forbidden_visible:
        if token.lower() in visible_text.lower():
            errors.append(f"Forbidden visible token found: {token}")

    report = [
        "Validation report",
        f"TSV: {OUT_TSV}",
        f"Rows: {len(rows)}",
        f"Columns per row: {FIELD_COUNT}",
        f"Image refs: {len(image_refs)}",
        f"Unique image files referenced: {len(set(image_refs))}",
        f"Differential_Q populated rows: {sum(1 for row in rows if row[6].strip())}",
        f"Errors: {len(errors)}",
    ]
    report.extend(errors)
    return "\n".join(report) + "\n"


def main() -> None:
    write_outputs()
    report = validate()
    (OUT_DIR / "validation_report.txt").write_text(report, encoding="utf-8")
    print(report)


if __name__ == "__main__":
    main()
