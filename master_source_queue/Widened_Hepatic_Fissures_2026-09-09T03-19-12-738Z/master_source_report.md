# Widened Hepatic Fissures — master source report

Imported the newest complete browser request using the repository importer. The queue pointer identifies this bundle. All 19 actual staged JPEGs were individually viewed before the coverage gate and synthesis.

## Outcome

STATdx fully covers all eight RadPrimer source images as exact same-image counterparts. Select 11 images (6 RadPrimer, 5 STATdx); retain 8 exact duplicate copies as optional archives. All three distinct STATdx additions remain primary. No evidence image is deleted or moved. The extension plan contains 22 downloads: plain and annotated variants for the 11 selected images.

Canonical hierarchy: `["All Categories", "Basic", "Gastrointestinal", "Liver", "Widened Hepatic Fissures"]`.

Supplied deck path: `Corebook::GI::Liver::Widened Hepatic Fissures`. Both are copied from metadata.json. STATdx navigation and the stale manual MSK deck setting are retained only as source audit data, never as master routing. Corebook is a deck-root label, not a claim of Core Radiology verification.

## Source comparison

RadPrimer supplies the explicit Common / Less Common differential list and canonical article order. Essential-information text in the two packages is identical. STATdx adds captions and distinct images 5, 9 and 10, but no additional mechanism, management, ultrasound, nuclear-medicine or histology section. Source captions and IDs agree with both standalone source metadata and embedded metadata.json source records. The image evidence manifest agrees with metadata.json.

Fused text retains the diagnostic distinctions, source-reported percentages and CT/MRI context once. Neither a new lecture nor cards are generated. Every original caption, URL and source number is preserved in the registry.

## Image coverage gate

Classification totals for RadPrimer: 8 exact duplicate; 0 near duplicate; 0 conceptual replacement; 0 not covered. Matching captions were not used as proof. Every pair has the same stable source UUID and visually identical source image/slice/montage. Files have different bytes and export dimensions; hashes identify each evidence file rather than falsely implying byte identity.

| RadPrimer | STATdx counterpart | Classification | Primary representative | Evidence observation |
|---|---|---|---|---|
| RP-01 | SDX-01 | exact duplicate | RP-01 | Same axial slice: identical caudate contour, fissure geometry, portal branching, right kidney, spleen and vertebral landmarks; only export size/compression differs. |
| RP-02 | SDX-02 | exact duplicate | RP-02 | Same complete A–D MRI montage: identical precontrast, arterial, venous and delayed panels, letter positions, dividers and fibrotic region. No panel or phase is missing. |
| RP-03 | SDX-03 | exact duplicate | RP-03 | Same axial CT crop: identical medial segment, deep gallbladder, falciform fissure, aortic calcification and rib/vertebral landmarks. |
| RP-04 | SDX-04 | exact duplicate | SDX-04 | Same axial CECT slice: identical gallbladder, interposed colon and omental fat, portal branching, liver margin and vertebral outline. |
| RP-05 | SDX-06 | exact duplicate | RP-05 | Same axial CECT slice: identical lobulated contour, hypodense foci, stomach gas, left-lobe outline and posterior vertebral landmarks. |
| RP-06 | SDX-07 | exact duplicate | RP-06 | Same axial CECT slice: identical beaded duct pattern, peripheral hepatic contour, fissure, gastric/variceal structures and thoracic cross-section. |
| RP-07 | SDX-08 | exact duplicate | SDX-08 | Same axial CECT slice: identical ectatic duct distribution, caudate/IVC configuration, stomach, spleen and rib/vertebral landmarks. |
| RP-08 | SDX-11 | exact duplicate | RP-08 | Same axial CECT slice: identical deeply branching fissures, portal structures, large perigastric varices, spleen and vertebral landmarks. |

Detailed UUIDs, evidence paths, dimensions, SHA-256 values and pairwise decisions are in image_registry.json, the manifest and _codex_review/image_visual_review.json. All decisions refer to the actual staged plain JPEGs. Annotated images were not staged or visually inspected; their original source URLs are retained for future downloads.

## Primary selection and atomic groups

Singleton teaching examples retain the RadPrimer copy because it is adequate and matches the canonical backbone. Full STATdx groups are selected for absent medial segment and congenital hepatic fibrosis/Caroli disease; the equivalent RadPrimer singleton is archived, preserving its exact visual information in the selected STATdx copy.

- RP-02 is the entire A–D multiphase MRI composite; no panel is separated or lost.
- SDX-04 and SDX-05 are distinct CT views, conservatively retained together. Same patient and time interval are not explicitly documented. SDX-05 is not an exact duplicate merely because it teaches the same pattern.
- SDX-09 and SDX-10 have matching age, sex and disease captions, implying a companion case; the different levels are retained together. No follow-up interval or progression is asserted.
- SDX-08 remains selected with that topic group as a distinct example. Its identity as the same patient is unconfirmed; the grouping is a conservative teaching decision.
- No source case cluster was intentionally split. Intentional selected/archive cluster splits: none. Shared singleton copies and the complete duplicate MRI composite are represented in full by their selected equivalents.

| Archived copy | Retained equivalent | Concrete exclusion reason |
|---|---|---|
| RP-04 | SDX-04 | Exact duplicate: same source UUID and visually confirmed same image/slice/montage; export-size/compression variant only. |
| RP-07 | SDX-08 | Exact duplicate: same source UUID and visually confirmed same image/slice/montage; export-size/compression variant only. |
| SDX-01 | RP-01 | Exact duplicate: same source UUID and visually confirmed same image/slice/montage; export-size/compression variant only. |
| SDX-02 | RP-02 | Exact duplicate: same source UUID and visually confirmed same image/slice/montage; export-size/compression variant only. |
| SDX-03 | RP-03 | Exact duplicate: same source UUID and visually confirmed same image/slice/montage; export-size/compression variant only. |
| SDX-06 | RP-05 | Exact duplicate: same source UUID and visually confirmed same image/slice/montage; export-size/compression variant only. |
| SDX-07 | RP-06 | Exact duplicate: same source UUID and visually confirmed same image/slice/montage; export-size/compression variant only. |
| SDX-11 | RP-08 | Exact duplicate: same source UUID and visually confirmed same image/slice/montage; export-size/compression variant only. |

## Source correction and limitations

Both source packages contain “Saccharina japonica” in the schistosomiasis paragraph. This appears to be an organism-name substitution error. The master teaching text uses Schistosoma japonicum; the intended substitution is inferred from context. [CDC — Clinical Overview of Schistosomiasis](https://www.cdc.gov/schistosomiasis/hcp/clinical-overview/index.html) confirms S. japonicum hepatic involvement and that heavy infection can cause fibrosis and portal hypertension (page dated March 11, 2024, checked during synthesis). ERR-01 records the original text, correction and verification scope. The original source files are unchanged.

The 90% and 80% confluent-fibrosis figures remain source-attributed; underlying primary studies were not supplied. The source contrast with HCC washout is presented as a pattern discriminator, not a universal exclusion rule. No unsupported Core claim is added. Arrow asset names are preserved exactly in registry captions and as source-marker tokens in the teaching text; arrow shape/location is not invented.

## Extension handoff and validation

Import master_source_import.json. It contains exactly the same packageText as master_source_package.txt, embeds the manifest and full 19-record registry, and repeats the identical selected/archive sets and sourceSelectionPlan. Human-facing captions use one source-qualified display label; short IDs remain in metadata, traceability and planned filenames.

The validation script checks preserved input hashes, the exact canonical hierarchy/deck path, all source records, coverage decisions, complete cluster selection, 11/8 partition, unique filenames and the installed extension's actual import/download helpers. Results are recorded in _codex_review/validation_results.json. The completion marker is written only after those checks pass. This is local compatibility validation; no live browser import or remote image download is claimed.
