# Card-quality audit: Widespread Low Attenuation Within Liver

**43 corrected notes** from 38 originals: one unsupported note removed, one extra note from splitting a CT criterion card, four omitted image-recognition cases restored and one treatment-history interpretation card added. The corrected set contains 18 UNKNOWN/image-recognition notes, 2 Mechanism notes and 23 High-Yield notes. The 22-column schema and order are unchanged.

## Source basis and comparison

Imported the newest completed browser bundle using the repository importer and read the latest-bundle pointer. Compared source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md and core_evidence.txt. The fused article is exactly the previously reviewed master source for this topic; the surrounding generation prompt is not medical evidence. The canonical RadPrimer hierarchy and supplied target deck are preserved.

The captured Core report says USED, names `junzi-shi-core-radiology-a-visual-approach-to.pdf`, identifies Gastrointestinal Imaging / Liver pages 97–100, 102–109, 116–117 and 121–123, and lists the facts used. It was not recovered through the unwrapped-report fallback. Its explicit facts are accepted as this audit's Core evidence; the underlying textbook PDF was not independently reopened. A card-family label or a statement that appearances were used does not verify an unlisted detail.

## Principal repairs

- Preserved every retained original Clinical_Context and its random-looking unique ID. Six new notes have independent random 12-character IDs. No missing, duplicate or counter-style original ID required repair.
- Removed original row 27's generic metastasis MRI signal recall. The stated T1/T2 and melanin/blood-product details were not explicit in the captured evidence. Supported metastatic CT and ultrasound teaching remains.
- Split original row 18 into unenhanced and portal-venous attenuation interpretation cards. Preserved the captured 10-HU and 25-HU comparisons, with phase/reliability caveats. Removed the uncaptured 1-HU claim from cards and summary.
- Removed uncaptured renal-cortex/acoustic-attenuation, focal-fat location-list, starry-sky, ultrasound target-sign, hypervascular-metastatic-primary list and fungal diffusion/ultrasound embellishments.
- Corrected the claim that ultrasound appearance alone establishes melanoma metastases; separated case-established diagnosis from imaging specificity.
- Clarified opposed-phase fat/water cancellation and conditional caudate preservation. Kept gross explant pathology and the transplant outcome as case-specific evidence.
- Restored four omitted case groups comprising five images: SDX-17/18 together, SDX-19, SDX-20 and SDX-24. Unspecified nodule etiology, unconfirmed HCC and caption-based adenoma remain explicitly qualified. No case was forced into an unsupported diagnosis.
- Added the article-supported chemotherapy/pancreatic-resection clue because it changes interpretation of new low attenuation.
- Moved all 14 original mini-differentials to the top of Imaging_Differentiation; the four new image cases use the same arrangement. Differentials and Differential_Q are blank throughout, preventing unsolicited Differential Drill cards even with the legacy gate. No installed note type was modified.
- Kept the complete repeated summary. Repaired its unsupported statements/source scope and restored the canonical Common/Less Common differential, toxin/explant context and Wilson/glycogen-source disagreement.
- No standalone bookkeeping notes or visible image-reference/URL/filename-list blocks were present. Diagnostic images and useful captions remain; caption punctuation left by stripped arrow icons was repaired.

## Outside clarification

Only two bounded clarifications were added, and both are labeled on the affected answers:

- Original row 16: caudate drainage anatomy explains relative preservation when that route remains patent. [Daza et al., 2026, primary multicenter ultrasound study](https://karger.com/ddi/article/44/2/192/945160/Ultrasound-Characteristics-of-Budd-Chiari-Syndrome).
- Original row 37: definite enhancing soft tissue in a vein establishes tumor in vein; occlusion alone is insufficient. [ACR LI-RADS CT/MRI v2018, printed page 21](https://edge.sitecorecloud.io/americancoldf5f-acrorgf92a-productioncb02-3650/media/ACR/Files/RADS/LI-RADS/LI-RADS-CT-MRI-2018-Core.pdf). This is not labeled Core Radiology evidence.

No outside microscopic histology, therapeutic threshold or transplant-selection algorithm was added. The inherited Core report conflicts with the article's Wilson/glycogen low-attenuation framing; the summary describes that disagreement rather than creating a universal disease-attenuation rule.

## Media and case integrity

All 46 selected media files (23 plain and 23 annotated) are present and decode under `C:\Users\josem.000\Downloads\RadPrimer`. The 23 plain files have the same SHA256 hashes as the master-source evidence already visually reviewed in this task. All 23 annotated renditions were also visually inspected in four review sheets. Every exported image src is an exact, source-qualified filename in metadata.downloadFiles. No optional archive image or unstaged arrow icon is referenced.

The original 14 cases used 18 of the 23 selected images. The corrected 18 cases cover all 23. The CT/MR steatosis and nodules pairs, CT/US melanoma pair, noncontrast/contrast lymphoma pair, CT/explant toxicity pair and every multipanel composite remain intact. Restoring the nodules pair does not make its uncertain etiology certain. The HCC-pattern composite remains a differential teaching example; the glycogen-storage mass is not a universal disease-subtype rule.

The audit bundle itself contains no media folder. Validation uses the staged Downloads media and metadata; presence in Anki's collection.media was not established. No live Anki import or media copying was performed.

## Anki routing and template compatibility

The import file has tab/HTML/note-type/deck headers and `#tags column:22`, followed directly by the corrected data with no field-header row. Target note type: `core_rad_notetype_v2`. Target deck: `Corebook::GI::Liver::Widespread Low Attenuation Within Liver`.

The installed templates could not be verified: the local service is a review bridge rather than AnkiConnect and returned HTTP 404 to the model request; the profile directory was not readable. The explicit user-approved fallback was therefore used: blank both Differential fields and retain the mini-differential at the top of Imaging_Differentiation. This requires no template mutation or additional approval.

The headers preset import routing; installed template deck overrides or updating existing notes in their current decks can affect the final destination. [Anki text-import documentation](https://docs.ankiweb.net/importing/text-files.html).

If the uncorrected file was already imported, omitting original row 27 from this corrected TSV will not delete that existing note. Its first-field ID is **B4M8Q2V7T9RK**. The corrected export preserves all other first fields to support matching updates.

## High-Yield usefulness gate

Every retained or added High-Yield note has a source-supported appearance, contrast behavior, differential discriminator, pitfall, reporting pivot or interpretation-changing pretest clue. Normal hepatitis appearance and the predominance of hypovascular metastases are retained only with their imaging implications; no prevalence-only trivia was added.

| Original row / new ID | Gate | Evidence |
|---|---|---|
| 17 | differential discriminator | Both article: mass effect and traversing vessels |
| 18 | modality appearance / interpretation threshold | Captured Core evidence: core_evidence.txt, CORE_FACTS_USED: unenhanced liver-spleen difference of at least 10 HU |
| 19 | modality appearance | Both article and Core: opposed-phase signal loss |
| 20 | modality appearance / discriminator | Core: increased echogenicity; STATdx images 12-13 |
| 21 | differential discriminator | Both article: fissures/hepatic veins, no mass effect |
| 22 | modality appearance / pitfall | Both article and Core: hepatitis can be normal; edema and massive-necrosis caveat |
| 23 | contrast behavior | Both article and Core: early reflux, dilated veins and nutmeg enhancement |
| 24 | modality appearance | STATdx image 8: Doppler and wedge-shaped CT infarcts |
| 25 | pitfall | Both article; STATdx images 9-11: toxic injury can mimic fat |
| 26 | contrast behavior | Captured Core evidence: core_evidence.txt, CORE_FACTS_USED: most metastases hypovascular and best on portal venous phase |
| 28 | modality appearance / discriminator | STATdx images 12-13: melanoma CT/US pair |
| 29 | modality appearance / discriminator | Core explicit hypoenhancement/diffusion restriction; article lymphoma |
| 30 | modality appearance | Captured Core evidence: core_evidence.txt, CORE_FACTS_USED: hypoechoic hepatic lymphoma |
| 31 | differential discriminator | Both article: sarcoidosis with liver/spleen granulomas and nodes |
| 32 | pretest clue / modality appearance | Both article: immunocompromised host, hypodense CT/T2-bright microabscess-like lesions |
| 33 | contrast behavior / pitfall | Both article infiltrative HCC and Core arterial enhancement/washout |
| 34 | differential discriminator | Both article; STATdx image 22: radiation-field boundary |
| 35 | modality appearance | Both article and Core: Budd-Chiari obstruction, caudate and peripheral injury |
| 36 | modality appearance | Core: absent hepatic venous flow; article outflow obstruction |
| 37 | report-critical discriminator | Core vascular invasion; labeled ACR LI-RADS outside clarification |
| 38 | report-critical pivot | STATdx image 6: capsular retraction and ascites in fulminant hepatitis |
| JE4AYQ6DIY2V | contrast-phase interpretation pitfall | Captured Core evidence: core_evidence.txt, CORE_FACTS_USED: 25-HU portal criterion and reduced contrast reliability |
| LD7SVXIS2TNR | pretest clue that changes interpretation | Both article: chemotherapy and pancreatic-resection association with steatosis |

## Row-by-row changes

| Original row / new ID | Disposition | Reason |
|---|---|---|
| 1 | revised | Retained the imaging target and case group; moved mini-differential to UNKNOWN back and cleaned caption punctuation. |
| 2 | revised | Retained the imaging target and case group; moved mini-differential to UNKNOWN back and cleaned caption punctuation. |
| 3 | revised | Distinguish the displayed opposed-phase image from the normal in-phase image described but not staged. |
| 4 | revised | Retained the imaging target and case group; moved mini-differential to UNKNOWN back and cleaned caption punctuation. |
| 5 | revised | Retained the imaging target and case group; moved mini-differential to UNKNOWN back and cleaned caption punctuation. |
| 6 | revised | Preserve the pancreatic-cancer case context without changing the first-field identifier. |
| 7 | revised | Separate the case-established exposure from the nonspecific imaging appearance. |
| 8 | revised | Retained the imaging target and case group; moved mini-differential to UNKNOWN back and cleaned caption punctuation. |
| 9 | revised | Remove the claim that ultrasound alone definitively establishes melanoma metastases. |
| 10 | revised | Retained the imaging target and case group; moved mini-differential to UNKNOWN back and cleaned caption punctuation. |
| 11 | revised | Retained the imaging target and case group; moved mini-differential to UNKNOWN back and cleaned caption punctuation. |
| 12 | revised | Retained the imaging target and case group; moved mini-differential to UNKNOWN back and cleaned caption punctuation. |
| 13 | revised | Retained the imaging target and case group; moved mini-differential to UNKNOWN back and cleaned caption punctuation. |
| 14 | revised | Retained the imaging target and case group; moved mini-differential to UNKNOWN back and cleaned caption punctuation. |
| 15 | revised | Clarify that opposed-phase cancellation occurs when fat and water coexist in the same voxel. |
| 16 | revised | The captured Core report lists caudate sparing but not the drainage anatomy. Verify and label the mechanism as outside clarification; make sparing conditional. |
| 17 | retained | Passes source support and single-target review. |
| 18 | revised | Split noncontrast attenuation assessment from the independent portal-phase criterion; remove the uncaptured 1-HU claim. |
| 19 | retained | Passes source support and single-target review. |
| 20 | revised | Remove uncaptured renal-cortex comparison, sound-attenuation and deep-visualization elaborations. |
| 21 | revised | Use the article-supported fissural/hepatic-vein distribution rather than an uncaptured list of focal-fat locations. |
| 22 | revised | Remove starry-sky ultrasound appearance, which is not explicitly stated in the captured evidence. |
| 23 | retained | Passes source support and single-target review. |
| 24 | retained | Passes source support and single-target review. |
| 25 | retained | Passes source support and single-target review. |
| 26 | revised | Keep the useful portal-phase detection fact and remove a separate unsupported list of hypervascular metastatic primaries. |
| 27 | deleted | Delete the generic metastasis-MRI signal card: T1-low/T2-high, melanin and blood-product details are not explicitly given in the captured Core facts or article. A statement that MRI appearances were used is not fact-level evidence. The supported CT/US metastatic recognition teaching remains. |
| 28 | revised | Remove the uncaptured generic target-sign assertion; retain the directly documented melanoma ultrasound discriminator. |
| 29 | retained | Passes source support and single-target review. |
| 30 | revised | Keep captured hypoechoic lymphoma appearance and remove the uncaptured target sign. |
| 31 | retained | Passes source support and single-target review. |
| 32 | revised | Constrain this card to the explicit article microabscess pattern; remove uncaptured fungal diffusion and ultrasound details. |
| 33 | revised | Keep HCC contrast discriminators while distinguishing them from an unconfirmed case diagnosis and unstaged ADC verification. |
| 34 | retained | Passes source support and single-target review. |
| 35 | revised | Remove the uncaptured acute edematous-mottled timeline; retain direct outflow obstruction and the documented parenchymal pattern. |
| 36 | revised | Avoid a cross-modality binary rule or treating nonvisualized Doppler flow as sufficient in isolation. |
| 37 | revised | Narrow the card to the contrast-imaging vascular discriminator and label the exact diagnostic definition as outside clarification. |
| 38 | retained | Passes source support and single-target review. |
| JE4AYQ6DIY2V | split | Split from original row 18 so a portal-phase threshold is not confused with the unenhanced criterion. |
| U3ODR250RQMH | added | Restore the omitted CT/MR pair without assigning an unsupported infectious or granulomatous diagnosis. |
| 9L7DC5QNH2NT | added | Restore the omitted hepatosplenic granulomatous example; retain diagnostic uncertainty. |
| EFSI8OOIIBY6 | added | Restore the omitted multipanel tumor-pattern example without asserting a caption-confirmed HCC or inventing an ADC panel. |
| 588L3I3HFY8J | added | Restore the omitted focal-mass example within the diffusely abnormal liver; do not test an unsupported universal glycogen-storage attenuation rule. |
| LD7SVXIS2TNR | added | Add the missing treatment-history clue because it changes the ranking of new low attenuation versus tumor infiltration. |

## Validation and outputs

Machine-readable row decisions, source evidence, IDs and media hashes are retained under _codex_review. validation_results.json records schema/round-trip, import-body, source preservation, unique-ID, one-family-per-note, differential suppression, source-qualified media, summary and complete case-group checks. The completion marker is written only after these checks pass. Validation does not claim to render the installed Anki template.

- corrected_cards.tsv
- corrected_cards_anki_import.tsv
- audit_report.md
- _codex_audit_done.txt
