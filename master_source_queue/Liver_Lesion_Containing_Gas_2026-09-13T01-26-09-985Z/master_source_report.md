# Master source synthesis — Liver Lesion Containing Gas

Completed the staged source comparison and retained 14 distinct visual examples. All 14 RadPrimer images have exact same-image/slice/composite matches in STATdx. The selected set is STATdx images 1–14; RadPrimer images 1–14 remain as optional duplicate recovery records. All 28 source records, original captions, URLs, stable IDs and evidence paths are preserved.

## Import and canonical routing

- Browser bundle: `C:\Users\josem.000\Downloads\RadiologyMasterSource\Liver_Lesion_Containing_Gas_2026-09-13T01-26-09-985Z`.
- Imported using the supplied `import-latest-master-source-bundle.ps1` and read `master_source_queue/_latest_master_source_bundle.txt`; both initially identified this exact user-named bundle. The shared latest pointer advanced to another bundle during synthesis. Work remained pinned to this folder, and the newer pointer was left unchanged.
- Canonical hierarchy copied exactly from metadata.json: `["All Categories", "Basic", "Gastrointestinal", "Liver", "Liver Lesion Containing Gas"]`.
- Canonical deck: `Corebook::GI::Liver::Liver Lesion Containing Gas`.
- STATdx breadcrumbs and the inherited manual MSK deck setting are not used for routing. The null pairing-match field is not treated as proof of a manual match. Actual source title, article text, caption and UUID agreement establish the pairing.

## Source comparison and text selection

RadPrimer provides the Common/Less Common differential hierarchy, including its nested tumor categories. STATdx omits that list in this extraction. ESSENTIAL INFORMATION is identical between sources, and all 14 captions match exactly. The shared material is included once with [Both] attribution. There are no unique STATdx mechanisms, management sections, captions or visual examples to claim as additional depth in this bundle.

The package retains all supplied pathways, routes of infection, double-target layers, CT/MR/US findings, treatment effects, vascular/ductal gas patterns, transplant/biloma mechanisms, uncommon infection patterns and procedure/trauma context. Surgicel material terminology is the sole factual text correction; its provenance is recorded below. No lecture, cards, Anki imports or live bank changes were made. No auditable Core Radiology evidence was supplied; Core validation is not claimed.

## Image coverage gate

Every staged plain image was decoded, hashed and visually inspected in paired comparison sheets before the merge. Each pair shares a stable image UUID and the same observed slice or full composite. RadPrimer files are 900 × 900 and STATdx files are 1000 × 1000. Their JPEG/RGB hashes differ, so they are not claimed to be byte-identical. The archive decision rests on verified visual identity plus UUID, not captions, and the selected size does not imply new anatomic information.

| RadPrimer | STATdx retained | Classification | Visual identity evidence |
|---|---|---|---|
| RP-01 | SDX-01 | Exact duplicate | Same axial CT slice, right hepatic gas-fluid cavity, three bright portions of the drainage catheter, rib profiles and vertebra. |
| RP-02 | SDX-02 | Exact duplicate | Same cropped axial CT slice, two low-attenuation foci, small posterior gas pocket, hilar vascular configuration and vertebral level. |
| RP-03 | SDX-03 | Exact duplicate | Same axial CT slice, nonenhancing left lobe with identical branching gas, bright operative material and right-lobe perfusion pattern. |
| RP-04 | SDX-04 | Exact duplicate | Same axial CT slice, large devascularized right-lobe region, isolated tiny gas bubble, contrast-filled stomach and pleural fluid. |
| RP-05 | SDX-05 | Exact duplicate | Same axial CT slice, clustered gas in the treated right-lobe lesion, bright clip, adjacent low-attenuation lesion and hilar vessels. |
| RP-06 | SDX-06 | Exact duplicate | Same axial CT slice, very large gas-filled right hepatic mass, smaller heterogeneous left-sided mass and spleen outline. |
| RP-07 | SDX-07 | Exact duplicate | Same four-panel MR composite in the same arrangement; matching gas-fluid focus, liver contours and vessels in every panel. |
| RP-08 | SDX-08 | Exact duplicate | Same coronal CT reconstruction, peripheral branching hepatic gas, extensive bowel pneumatosis, distended stomach and aortic calcification. |
| RP-09 | SDX-09 | Exact duplicate | Same two-panel ultrasound composite with identical portal branching, echogenic gas foci and speckle configuration in each panel. |
| RP-10 | SDX-10 | Exact duplicate | Same axial upper-abdominal CT slice, tightly packed gas adjacent to a bright clip, little local fluid and identical kidney/vessel contours. |
| RP-11 | SDX-11 | Exact duplicate | Same axial pelvic CT slice, large fluid collection, compact cluster of gas bubbles, bright focus and identical pelvic bones; liver is not shown. |
| RP-12 | SDX-12 | Exact duplicate | Same axial CT slice, wedge-shaped gas/fluid collection, branching gas, portal structures, kidneys and enlarged spleen. |
| RP-13 | SDX-13 | Exact duplicate | Same axial CT slice, left-lobe fluid/gas cavity, adjacent surgical material, stomach and splenic contours. |
| RP-14 | SDX-14 | Exact duplicate | Same axial CT slice, rounded subcapsular fluid collection with one gas pocket and identical diaphragm, spleen and vertebra. |

Result: exactDuplicate 14; nearDuplicate 0; conceptualReplacement 0; notCovered 0. STATdx fully covers the staged RadPrimer image set. No distinct patient, alternate slice, modality, severity or stage was archived. Full UUIDs, original filenames, both hashes, evidence paths, decisions and selected counterparts are in the registry and manifest.

## Atomic groups and reinforcement

No source case cluster was intentionally split. Each source image was replaced as a whole by its equivalent STATdx image. The four-panel MR composite (image 7) and two-panel ultrasound composite (image 9) remain intact. Other captions describe a single supplied image with procedure or clinical context; there is no documented cross-number same-patient/follow-up linkage.

Keep distinct examples selected: drained versus cholangitic abscess and MR abscess; postoperative versus traumatic infarction; ablation versus chemotherapy effects; CT versus US portal gas; hemostatic material with little fluid versus within a large abscess; both transplant biloma morphologies; and the delayed post-laceration example. Shared topics are teaching comparisons, not evidence that these are identical patients. The registry includes recognitionReinforcement and modality/alternate-example roles.

## Source quality notes

- **Surgicel:** both inputs call it “oxidized surgical gelatin” in the article and image 10 caption, while image 11 says cellulose. The manufacturer identifies it as oxidized regenerated cellulose. The teaching wording is corrected; original caption fields and source files remain verbatim. [J&J MedTech / Ethicon product page](https://www.jnjmedtech.com/en-US/products/surgery/biosurgery/surgicel-original-absorbable-hemostat/).
- **Image 11 anatomy:** actual evidence is pelvic. The source caption says postoperative abscess without specifying liver. It stays selected as a visual analogy for hemostatic material within an abscess and must not be presented as hepatic localization.
- **Duplicated differential entry:** RadPrimer lists Hepatic Venous Gas under both Common and Less Common. Preserve the source hierarchy but do not generate competing prevalence claims or duplicate objectives from that editorial duplication.
- **MR composite:** preserve all four panels and the case-specific fluid signal. The absence of content enhancement does not negate the article's rim/capsule enhancement description.
- **Clinical qualifiers:** preserve often/usually and procedure timing. Do not generalize source examples of sterile gas or frequently insignificant findings into an unconditional exclusion of infection/ischemia.
- **Missing companions:** the CT described in image 9's caption and any prior image of image 14's injury were not staged. Do not invent them or link other numbered images as the same patient.

## Import and media handoff

- `master_source_import.json` embeds packageText exactly matching `master_source_package.txt`, plus the manifest, complete registry, source selection plan and explicit primary/archive ID lists.
- Default download plan: **14 selected images × 2 variants = 28 files**, all named with source, short ID and variant. Optional RadPrimer duplicates are excluded from the default plan.
- Narrative-facing labels are clean, such as “STATdx image 5”; short IDs remain in filenames and structured traceability.
- Caption HTML and arrow icon tokens are preserved. The bundle contains plain evidence only; annotated URLs are preserved but their files were not visually verified, and separate caption icon files were not supplied. Those are later media retrieval steps, not missing duplicate evidence.
- Source-copy fidelity, all registry records, canonical routing, case completeness, JSON/text equality, and installed extension import/download helpers are validated in `_codex_review/validation_results.json`. The done marker is written only after these checks pass.
- No live browser import or remote image download is performed by this handoff.

## Deliverables

`master_source_package.txt`, `master_source_manifest.json`, `image_registry.json`, `master_source_import.json`, `master_source_report.md`, and `_codex_master_source_done.txt`. The completion marker records hashes for the five substantive artifacts. Paired review sheets, evidence audit and validation results are retained under `_codex_review/`.
