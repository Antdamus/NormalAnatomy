# RadPrimer Card Audit: Pelvis Stress Fractures

Bundle path: `C:\Users\josem.000\NormalAnatomy\radprimer_audit_queue\Pelvis_Stress_Fractures_2026-05-31T15-30-28-354Z`

## Result

- Original generated cards: 39
- Corrected cards: 43
- TSV schema: preserved at 22 columns, no header row, blank final Tags column.
- Outside clarification used: No. All card additions/corrections are supported by the recovered RadPrimer source package.

## High-Signal Changes

- Replaced the repeated summary/source-attribution block. The generated cards repeatedly claimed Core Radiology page support, but this recovered bundle did not contain auditable Core excerpts. The corrected deck uses RadPrimer-only attribution and explicitly notes that Core support was not auditable in this bundle.
- Replaced the femoral-neck medial-versus-lateral cortex card because that specific compressive/tensile teaching point was not present in the recovered source package. The replacement tests source-supported femoral-neck stress fracture features: athlete/runner setting, medial/basicervical location, subtle MRI fracture line, tumor mimic risk from rounded edema, and progression-to-complete-fracture risk.
- Added source-supported cards for clinical localization, microscopic/healing features, treatment/prognosis pivots, and DEXA use.
- Preserved all 15 image-recognition cards. They cover the selected images and grouped cases in `metadata.json`: `[2,3]`, `[5,6]`, `[8,9]`, `[11,12,13]`, `[14,15]`, `[17,18]`, and singleton images 1, 4, 7, 10, 16, 19, 20, 21, and 22.
- Preserved the existing differential drills because they test source-supported distinctions: tumor/myeloma/lymphoma, sacroiliitis, osteomyelitis, osteitis pubis, transient osteoporosis, osteonecrosis, and degenerative joint disease.

## Audit Notes

The deck was already strong on image recognition and modality-specific findings. The main problem was not card count or image coverage; it was source hygiene. Because the bundle lacked actual Core text, any Core-specific claim could not be verified during audit. I corrected that while keeping the cards clinically useful.

The added histology/mechanism card is source-supported and ties microscopic healing to imaging behavior, which should help prevent the common tumor-mimic confusion when a healing stress fracture has marked edema or periosteal reaction.
