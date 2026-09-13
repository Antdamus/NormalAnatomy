# Master-source synthesis report

Focal Liver Lesion With Hemorrhage

## Result

STATdx fully covers all 20 RadPrimer images. The master retains 23 STATdx images and archives 20 exact RadPrimer copies for optional recovery. All 43 source entries remain in the registry. Default download plan: 46 source-qualified files (plain and annotated variants for 23 selected images).

## Import and source comparison

- Ran edge_radprimer_extension/tools/import-latest-master-source-bundle.ps1 from the workspace. The newest completed Downloads bundle is the user-named bundle. Read the updated master_source_queue/_latest_master_source_bundle.txt pointer.
- Compared both source packages, both per-source metadata files, metadata.json, master_source_request.md and the image evidence manifest. Embedded and standalone metadata agree; all package captions match the corresponding source registries.
- RadPrimer supplies the common/less-common differential ordering. Both essential-information sections match exactly, so the master keeps one copy with [Both] attribution. STATdx contributes three extra image entries and their captions.
- Source annotation markup is preserved unchanged in registry caption fields. Clean teaching captions omit raw image-token markup; package marker lists retain the original order.
- No auditable Core pages are included. The extraction boilerplate requesting a Core cross-check does not establish Core support.

## Canonical routing

canonicalHierarchy: `["All Categories", "Basic", "Gastrointestinal", "Liver", "Focal Liver Lesion With Hemorrhage"]`

canonicalDeckPath: `Corebook::GI::Liver::Focal Liver Lesion With Hemorrhage`

Both values are copied exactly from metadata.json. STATdx top-level breadcrumbs and the unrelated cached manualDeckRoot do not influence routing. No IMAIOS chunks were generated.

## Visual evidence and coverage gate

Decoded and visually inspected all 43 actual staged images through five paired contact sheets and one supplemental-context sheet; STATdx images 2 and 3 were additionally opened individually at original size. File SHA-256, decoded RGB hashes, dimensions and filenames are recorded in _codex_review/image_file_audit.json and image_registry.json.
Every RadPrimer-to-STATdx exact decision has a shared stable publisher image ID plus matching anatomy, slice/view and finding configuration. RadPrimer exports are 900 x 900; STATdx exports are 1000 x 1000. None of the 20 pairs has identical file or decoded RGB hashes. Exact means the same source image/view in different source exports, not byte-identical content. Larger export dimensions do not prove additional intrinsic diagnostic resolution.

| RadPrimer ID | Selected counterpart | Classification | Visual observation |
|---|---|---|---|
| RP-01 | SDX-01 | exact duplicate | Same axial CT slice: broad hepatic defect, bright central extravasation, rib fragments, gastric contents and vertebral landmarks match. |
| RP-02 | SDX-02 | exact duplicate | Same axial NECT slice: oblique dense biopsy tract, lateral subcapsular collection, spleen contour, gastric staples and vertebra match. |
| RP-03 | SDX-04 | exact duplicate | Same axial contrast CT slice: right-lobe hypervascular mass, large crescentic subcapsular collection and renal/vascular landmarks match. |
| RP-04 | SDX-05 | exact duplicate | Same axial NECT slice: lateral-segment mass with central dense component, contrast-filled stomach and splenic landmarks match. |
| RP-05 | SDX-06 | exact duplicate | Same axial T1 MR slice: round right-lobe mass, central bright hemorrhagic focus, rim and surrounding organ contours match. |
| RP-06 | SDX-08 | exact duplicate | Same superior arterial CT slice: branching tumor vessels, peripheral clot, ascites and diaphragmatic landmarks match. |
| RP-07 | SDX-09 | exact duplicate | Same lower arterial CT slice: mass portion, dense sentinel clot, splenic contour, aorta and vertebral landmarks match; distinct from the preceding slice. |
| RP-08 | SDX-10 | exact duplicate | Same axial NECT slice: hepatic mass and adjacent hyperdense clot, liver dome, spleen and vertebral contours match. |
| RP-09 | SDX-11 | exact duplicate | Same coronal CT reconstruction: encapsulated inferior right-lobe mass, perihepatic clot, ascites, surgical clips and bowel landmarks match. |
| RP-10 | SDX-12 | exact duplicate | Same axial CT slice: huge thin-walled right-lobe cyst, dependent denser material, vessels and left renal landmarks match. |
| RP-11 | SDX-13 | exact duplicate | Same ultrasound frame: internal organizing clot and fibrin pattern, cyst outline, overlying tissue and acoustic field match. |
| RP-12 | SDX-14 | exact duplicate | Same fat-suppressed T2 MR slice: bright complex cystic lesion, dependent dark layer, septal contours and spine match. |
| RP-13 | SDX-15 | exact duplicate | Same opposed-phase T1 MR slice: multiple dark and bright hepatic cysts, dominant anterior bright cyst and splenic contours match. |
| RP-14 | SDX-16 | exact duplicate | Same axial contrast CT slice: hepatic hematocrit level, hyperdense bleeding focus, associated renal hemorrhage and bowel landmarks match. |
| RP-15 | SDX-17 | exact duplicate | Same axial contrast CT slice: fracture-like hepatic defects, rounded central collection, subcapsular blood and gastric/splenic landmarks match. |
| RP-16 | SDX-18 | exact duplicate | Same axial contrast CT slice: right-lobe metastatic mass, subcapsular collection, aortic enhancement and renal landmarks match. |
| RP-17 | SDX-19 | exact duplicate | Same axial contrast CT slice: heterogeneous melanoma metastasis, lesion contour, perihepatic fluid, spleen and gastric contents match. |
| RP-18 | SDX-20 | exact duplicate | Same adjacent-level contrast CT slice: melanoma lesion, surrounding sentinel clot, hemoperitoneum and splenic landmarks match; distinct from the preceding image. |
| RP-19 | SDX-21 | exact duplicate | Same axial contrast CT slice: massive subcapsular/perihepatic collection, bleeding focus, heterogeneously enhancing liver and distended stomach match. |
| RP-20 | SDX-22 | exact duplicate | Same axial contrast CT slice: postpartum subcapsular hematoma, geographic hepatic infarcts, gastric and splenic contours match. |

Coverage counts: exact duplicate 20; near duplicate 0; conceptual replacement 0; not covered 0. This count is for the RadPrimer-to-STATdx coverage gate; supplemental relationships below are a separate assessment.

## Supplemental curation

- SDX-03 remains primary as a near duplicate of the post-biopsy view represented by RP-02/SDX-02. Full-size review shows highly similar anatomy with differing rendering/contrast and a different stable ID. Literal same-slice identity is uncertain. No unique patient, slice level or timepoint is asserted; conservative retention follows the requested reinforcement policy.
- SDX-07 remains primary as a conceptual replacement/supplement to the hemorrhagic-adenoma teaching need, with clearly different fat-suppressed T1 appearance. SDX-06 is also retained. Patient linkage is not established.
- SDX-23 remains primary as additional HELLP selective angiography/procedure context not illustrated in RadPrimer. Preserve the reported embolization without inventing a post-treatment image.
- Every alternate HCC, cyst, coagulopathy, metastatic and obstetric example remains selected. No unusable images were identified. Nothing was excluded merely because its diagnosis or caption resembled another image.

## Cluster integrity and procedure context

No source case cluster was intentionally split. All STATdx members remain selected; RadPrimer members are replaced with complete equivalent STATdx sets. Each registry entry records original grouping fields and the qualified synthesized group.

| Cluster | Selected members | Relationship and context |
|---|---|---|
| CL-trauma | SDX-01 | singleImage: Traumatic laceration, active bleeding, hemoperitoneum and rib fractures. |
| CL-post_biopsy | SDX-02, SDX-03 | probableSameCase: Very similar anatomy and biopsy-related hemorrhage; exact slice identity is uncertain. Keep both views. Biopsy and falling hematocrit are source history, not an imaged time-lapse. |
| CL-adenoma_ct_subcapsular | SDX-04 | singleImage: Hypervascular mass with spontaneous subcapsular hemorrhage in a young woman. |
| CL-adenoma_ct_intratumoral | SDX-05 | singleImage: Acute central high-attenuation hematoma in a lateral-segment mass. |
| CL-adenoma_mr | SDX-06, SDX-07 | conservativeModalityCompanions: Distinct T1 and fat-suppressed T1 examples; patient identity and acquisition relationship are not established. Preserve both for comparison without asserting a same-patient sequence. |
| CL-hcc_rupture | SDX-08, SDX-09 | explicitSamePatient: Caption explicitly states same patient. Two different arterial-phase slices show ruptured HCC and sentinel clot. Angiographic confirmation and coil embolization are reported, but no HCC angiogram or post-treatment frame is staged. |
| CL-hcc_nect | SDX-10 | singleImage: Separate 60-year-old man with alcoholic liver disease, mass and sentinel clot on NECT. |
| CL-hcc_coronal | SDX-11 | singleImage: Separate woman with cirrhosis: coronal view of mass, clot and ascites. |
| CL-cyst_ct | SDX-12 | singleImage: Hemorrhage in a thin-walled cyst; hemorrhagic ascites on other sections is caption-only context, with those additional sections absent. |
| CL-cyst_us | SDX-13 | singleImage: Organizing clot and fibrin strands on ultrasound; no same-patient link to the CT or MR cyst examples supplied. |
| CL-cyst_mr | SDX-14 | singleImage: Dependent T2-dark material in a complex cystic lesion, described as subacute hemorrhage. |
| CL-polycystic | SDX-15 | singleImage: T1-dark simple-fluid cysts and T1-bright hemorrhagic cysts in an enlarged liver. |
| CL-coagulopathy_multisite | SDX-16 | singleImage: Hematocrit level, active bleeding and simultaneous hepatic/renal hemorrhage. |
| CL-anticoagulant | SDX-17 | singleImage: Anticoagulant-associated fracture-like defects without trauma. Resolution after medication withdrawal and absence of underlying mass are source-reported follow-up; no follow-up image is staged. |
| CL-net_metastasis | SDX-18 | singleImage: Pancreatic neuroendocrine metastasis with spontaneous subcapsular hemorrhage. |
| CL-melanoma | SDX-19, SDX-20 | probableAdjacentSlices: Closely matching lesion/organ anatomy suggests companion levels, but captions do not explicitly confirm same patient. Keep together without assigning a verified patient identity. Possible intratumoral bleeding in the first view remains qualified; the second shows stronger sentinel-clot/hemoperitoneum evidence. |
| CL-hellp | SDX-21, SDX-22, SDX-23 | ambiguousProcedureCompanions: Keep both obstetric CT examples and the selective hepatic arteriogram together. The angiogram caption says this woman, but its exact CT patient link is unspecified; do not assert that all three images show one patient. Active hemorrhage and coil embolization are source-reported; no post-embolization endpoint image is supplied. |

No completed follow-up/time-lapse sequence is present. The HCC angiogram, cyst other sections, adenoma T2 companions, anticoagulant-resolution follow-up and post-embolization endpoints are caption references, not additional staged images.

## Source qualifications retained

- The possible >60-HU NECT appearance and the melanoma case with 35-HU hemoperitoneum concern different contexts; neither is silently converted to a universal cutoff.
- T1/T2-bright hemorrhagic foci and T2-dark dependent cyst contents retain their sequence/case wording. The adenoma fat-versus-blood caption inference and almost-diagnostic wording are not promoted to independently verified universal rules.
- The melanoma SDX-19 caption remains uncertain (perhaps hemorrhage), while SDX-20 describes stronger sentinel-clot/hemoperitoneum evidence. These remain separate selected views.
- Amyloidosis remains in the differential but lacks a labeled source image. No image or clinical fact was invented to fill that gap.

## Extension handoff and verification

Import master_source_import.json. It embeds packageText exactly matching master_source_package.txt, plus the manifest, all 43 registry entries, explicit primary/archive IDs and the complete sourceSelectionPlan.imageDownloadPlan.
The validation script checks serialized artifact agreement, source preservation, exact routing, all evidence hashes, duplicate decisions, cluster completeness, source-qualified labels/filenames, source-copy fidelity and the installed extension import/download helpers. Its results are written to _codex_review/validation_results.json; the done marker is written only after all checks pass.
The intended default plan is 23 selected images / 46 variant URLs and 20 archived recovery records. Actual authenticated image downloads and live browser import are later extension operations. Annotated variants have preserved URLs but were not visually inspected in this synthesis.

## Deliverables

- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt (written after validation)

No cards or lecture were generated.
