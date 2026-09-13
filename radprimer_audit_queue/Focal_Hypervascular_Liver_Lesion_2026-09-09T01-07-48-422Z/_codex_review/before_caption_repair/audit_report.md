# Card-quality audit — Focal Hypervascular Liver Lesion

**64 corrected notes** from 62 original notes: 2 removed, 2 additional notes from splitting, and 2 new source-supported interpretation notes. The original 22-column order is unchanged. The corrected set contains 26 UNKNOWN, 5 Mechanism, 4 Boards Trap and 29 High-Yield notes.

## Source basis

Imported the newest complete bundle with the repository importer and read the latest-bundle pointer. Compared source_package.txt, generated_cards.tsv, metadata.json, audit_instructions.md and core_evidence.txt. The fused article agrees with the previously reviewed RadPrimer/STATdx master package; RadPrimer hierarchy and the supplied Anki deck routing are preserved.
The captured Core report is `CORE_EVIDENCE_STATUS: USED`, names `junzi-shi-core-radiology-a-visual-approach-to.pdf`, cites PDF pages 117–127 and 133–134 / printed pages 105–115 and 121–122, and lists the facts used. It was not recovered from an unwrapped fallback report. Those explicit facts are accepted as the audit’s Core evidence. The underlying textbook PDF was not independently reopened in this task. A card-family label in CORE_DERIVED_CARDS is not treated as support for an unlisted fact.

## Principal corrections

- Preserved the 26 image-recognition cases with all 40 selected images, their 80 plain/annotated references and original case/phase order.
- Removed 122 references to seven unstaged arrow-icon files from captions. Actual diagnostic images and the useful caption text remain. All remaining `<img src>` values are exact metadata/media filenames.
- Moved all 26 mini-differentials to the top of Imaging_Differentiation and left both Differentials and Differential_Q blank. This avoids unsolicited Differential Drill cards even with a legacy note type; no installed note type was modified.
- Corrected the regenerative-nodule explanation: persistence of enhancement distinguishes the illustrated large regenerative nodules; the source did not mean that this behavior is rare within those nodules.
- Removed the HCC mechanism’s unsupported inference that arterial remodeling itself explains venous invasion. Narrowed it to increasing neovascularity and arterial enhancement.
- Removed unsupported ultrasound, nuclear-medicine, MRI and histology embellishments unless retained as a specifically labeled outside clarification.
- Replaced pure HHT numerical recall with an interpretation-changing FNH pretest question. Reframed hormonal associations and adenoma size around their imaging/reporting implications.
- Split hemangioma dynamic enhancement from T2 signal and adenoma sulfur-colloid behavior from HIDA behavior.
- Added a large mosaic HCC/washout pitfall and a Fontan/regenerative-nodule pretest note, both supported by the supplied article/captions.
- All retained original IDs are unchanged. Four new notes received independently random 12-character identifiers; no counter or row-derived IDs were introduced.
- Preserved the complete repeated article summary and its Common/Less Common content. Only its source-basis sentence was adjusted to limit Core support to captured facts and acknowledge labeled outside clarification.
- No pure metadata/bookkeeping cards or visible image-link/URL/filename-list blocks were present. The two removed notes failed on redundancy/inaccuracy or unsupported content, as detailed below.

## Outside clarifications

These are explicitly labeled in the affected answers and are not presented as Core facts.

- Original rows 29 and 43: hepatocyte transporters explain hepatobiliary uptake; some adenomas also retain contrast, so retention is not exclusive to FNH. [Sciarra et al., 2019, primary radiology-pathology study](https://pubmed.ncbi.nlm.nih.gov/30218633/).
- Original row 30: hemangioma’s endothelial-lined vascular spaces connect histology to its blood-pool behavior. Original row 54: adenoma management depends on sex, growth and size, with a period of lifestyle modification in women; the Core >5 cm shorthand is not a universal rule. [EASL benign liver tumour guideline, 2016](https://easl.eu/wp-content/uploads/2016/10/EASL-CPG-on-Management-of-benign-liver-tumours.pdf).

Only these bounded clarifications were added; this was not a full update of all clinical guidelines or a new Core-textbook review.

## Removed and split notes

| Original row / ID | Action | Reason |
|---|---|---|
| 39 / BQYCNCP7RLMW | Remove | Redundant four-pattern omnibus that conflates blood-pool behavior of vessels/vascular lesions with transient parenchymal arterioportal perfusion. The discrete hemangioma, FNH, HCC, shunt and cholangiocarcinoma notes retain the supported teaching. |
| 44 / MKGVSEK3I3DB | Remove | Overloaded FNH ultrasound/sulfur-colloid/HIDA card. Spoke-wheel flow, one-third sulfur-colloid yield and FNH HIDA visualization are not stated in the captured Core fact list or the article. Listing a card family in CORE_DERIVED_CARDS is not fact-level support. |
| Original 40 / new ID 3W2POMYKJK27 | Split | For a suspected hepatic hemangioma, what unenhanced MRI signal feature is supportive? Captured Core fact: hemangioma is typically T2 hyperintense. |
| Original 53 / new ID WJZBUMGGOKWV | Split | What HIDA uptake behavior is typical of hepatic adenoma? Captured Core fact: adenoma generally lacks HIDA uptake. |
| Original 47 / new ID IMYXY7U2X5AH | Added | Does portal-phase near-isodensity exclude HCC in a large mosaic hypervascular liver mass? STATdx images 20 and 21 and their captions. |
| Original 56 / new ID XICKE7L6OAAF | Added | After Fontan palliation, what benign explanation should remain in the differential for multiple FNH-like hypervascular liver nodules? Article: Nodular Regenerative Hyperplasia; congenital heart disease after Fontan procedure and FNH-like large regenerative nodules. |

If the uncorrected notes were already imported into Anki, omission from a later TSV does not delete them. The two removed IDs above identify the notes to retire. No live Anki import, deletion or template change was performed.

## High-Yield usefulness gate

Every retained or added High-Yield note teaches a modality appearance, contrast/tracer behavior, differential discriminator, pitfall, report-critical/management pivot, or pretest clue that changes interpretation. Broad prevalence recall was not accepted without the radiology implication.

| Original row / new ID | Gate | Source basis |
|---|---|---|
| 36 / BUGNIG2WLDEZ | pretest clue | Core fact: fibrolamellar HCC in young noncirrhotic patients; article FL-HCC |
| 37 / PMBVSI3VWDVZ | pretest clue | Article: Hepatic Adenoma |
| 38 / WL3ET66DPBLJ | pretest clue | Article: HHT and FNH enrichment |
| 40 / L2RPLMVGKBR6 | contrast behavior | Both article and Core: hemangioma enhancement |
| 41 / PPO3ANWKOUZB | modality appearance | Core fact: hemangioma ultrasound |
| 42 / FSCS3LRMIUZG | contrast behavior | Both article and Core: FNH enhancement |
| 43 / 2FM5SYPUIBHK | differential discriminator | Core fact: typical FNH hepatobiliary retention; outside exception Sciarra 2019 |
| 45 / SDDRELIC2YTM | differential discriminator | Article: Arterioportal Shunt |
| 46 / WWI4H7VFGBGB | report-critical pivot | Article: THAD and portal-flow obstruction |
| 47 / 3KBLYIZJVT4W | contrast behavior | Both article and Core: HCC enhancement |
| 48 / LBIDON5GN223 | modality appearance | Core HCC T2/diffusion fact and STATdx image 19 |
| 49 / NC3BIGKTOTBI | report-critical pivot | Core fact: HCC tumor in vein |
| 50 / IZG7HFCLKNHD | pretest clue | Core hypervascular metastatic primaries and article endocrine/melanoma/RCC |
| 51 / I3J2ZONN3VPS | differential discriminator | Article: Hepatic Metastases; STATdx images 22/23 |
| 52 / T5DJQQT2YKDD | modality appearance | Article Adenoma and Core dynamic enhancement fact |
| 53 / HDOC4HKXG4VD | tracer behavior | Core fact: adenoma sulfur-colloid photopenia |
| 54 / K6AXR6L7TMNS | management/reporting pivot | Core >5 cm hemorrhage threshold; outside EASL management nuance |
| 55 / T62UOPYMM2LE | modality appearance | Article HHT and STATdx 26/27 |
| 56 / MJEFHTGFJTPD | differential discriminator | Article NRH and STATdx 28-31 |
| 57 / ITEVRIOOG2WZ | modality appearance | Article FL-HCC and Core fibrotic-scar signal |
| 58 / R6AYKFJF2XNJ | differential discriminator | Article peripheral cholangiocarcinoma and Core delayed enhancement |
| 59 / PUMVTEL7SCBL | modality appearance | Article Hepatic Angiomyolipoma |
| 60 / GUO37P5H5XZO | pitfall | Article Angiosarcoma and STATdx 37 |
| 61 / KL66TPSR3MMN | pitfall | Article SVC obstruction and STATdx 38/39 |
| 62 / ZQEZ4VQIXLBM | contrast behavior | Article Peliosis and STATdx 40/41 |
| 3W2POMYKJK27 | modality appearance | Captured Core fact: hemangioma is typically T2 hyperintense. |
| WJZBUMGGOKWV | tracer behavior | Captured Core fact: adenoma generally lacks HIDA uptake. |
| IMYXY7U2X5AH | pitfall | STATdx images 20 and 21 and their captions. |
| XICKE7L6OAAF | pretest clue | Article: Nodular Regenerative Hyperplasia; congenital heart disease after Fontan procedure and FNH-like large regenerative nodules. |

## Media, import and validation

All 80 declared primary media files are present under `C:\Users\josem.000\Downloads\RadPrimer` and decode successfully. The 40 plain files are SHA-256-identical to the already visually reviewed master-source evidence. All 40 annotated files also decode, and filenames map to the corresponding image IDs. No archived image was substituted or selected.
The audit bundle itself contains no media folder. Verification was against metadata plus the staged Downloads media. Presence in an installed Anki collection.media folder was not established; this audit did not copy or import media into Anki.
The Anki import TSV includes the requested tab/HTML/note-type/deck directives and `#tags column:22`, followed directly by data rows. It targets `core_rad_notetype_v2` and `Corebook::GI::Liver::Focal Hypervascular Liver Lesion`. Headers guide import routing; an installed template deck override can still affect the final destination. [Anki text-import documentation](https://docs.ankiweb.net/importing/text-files.html).

Validation passed:

- 64 notes each have 22 fields in the original order
- TSV quote escaping round-trips through a standard reader
- Anki body exactly equals corrected TSV; no field header row
- Anki note-type/deck/tags headers match metadata
- One front-driving card family per note
- All 26 UNKNOWN mini-differentials retained on back; Differential fields blank
- All retained original Clinical_Context values unchanged; all 64 IDs unique
- Full repeated article summary retained except limited source-basis amendment
- No learner-visible image reference, URL or filename-list bookkeeping
- All 80 <img src> references exactly match primary bundle media entries
- Every primary case cluster and phase order preserved
- All 80 staged media files decode; all 40 plain hashes match master evidence
- All original bundle files unchanged from the browser source
- All 29 High-Yield notes have a specific usefulness gate and source basis
- Fused master-source article exactly matches the reviewed master package
- All 64 HTML previews load and all 80 diagnostic images render; four representative screenshots visually inspected

A detailed machine-readable row audit and file/media hashes are retained in `_codex_review`. Representative HTML/media previews passed, with all 80 images loading. These previews test the exported content, not the installed Anki template. The completion marker records the validated output hashes.

## Row-by-row audit

| Original row / preserved context | Disposition | Content changes |
|---|---|---|
| 1 / Adult patient XEY35OPVHDWV | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 2 / Adult patient TA6KW5MFZV23 | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 3 / Young woman 6EBAJPBUBUH5 | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 4 / Young woman 4TPXY4M32JMY | revised | Keep the explanation focused on the displayed dynamic MRI; remove the oversimplified bile-duct explanation and unshown hepatobiliary behavior. |
| 5 / Adult patient GWQ72FOTK5NR | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 6 / Adult patient QQ7JFHMGTL6Q | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 7 / Adult patient 3QTL2B7CXPPI | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 8 / Adult patient K5WIDGLHOA3I | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 9 / Adult patient YIGLBI4LS7L5 | revised | Avoid excessive certainty from a single arterial image; distinguish described companion findings from findings actually shown. |
| 10 / Adult patient UYK2CTHPDSKP | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 11 / Adult man XTSJZC266LNH | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 12 / Adult man UEJ5Q5SKXULD | revised | Remove imaging-only diagnostic overclaim without complete study criteria. |
| 13 / Adult patient RTO2Y5PTRA3X | revised | Remove imaging-only diagnostic overclaim without complete study criteria. |
| 14 / Adult patient ZZHFSGWBBJGC | revised | Mosaic appearance is supported by the STATdx case caption; the captured Core fact list does not establish the claimed Core attribution. |
| 15 / Adult man LO72HBE7EYZG | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 16 / Adult patient MQHS5MZNCDEL | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 17 / Young woman LN3AUCN7WS6Z | revised | Remove unrelated nuclear-medicine facts and avoid equating a generic delayed image with a timed hepatobiliary acquisition or imaging-proven subtype. |
| 18 / Middle-aged man NJG24I4TQXGA | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 19 / Adult patient XGAIYZPY6G42 | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 20 / Adult patient RWFL2ZH3Z7NS | revised | Correct the reversed reading of the source phrase: the nodules are distinctive in retaining enhancement, not unusually unlikely to retain it. |
| 21 / 22-year-old man GY3KMMWRAZKV | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 22 / 67-year-old woman 27KKCD7T2XYK | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 23 / Adult patient 436MHQJOFNCJ | revised | Remove lipoma, which is not supported in the captured differential and does not explain the hypervascular soft-tissue component. |
| 24 / Adult patient NUOFRO23U5F4 | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 25 / 60-year-old woman RTE577M2VRWZ | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 26 / Adult patient 4PREBW2WPELY | revised | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 27 / 46R7FZO3MOCQ | revised | Focus on a single supported vascular mechanism. Remove unsupported nodule-supply details and the incorrect causal claim that the same vascular remodeling explains venous invasion. |
| 28 / XJSFJM6QX3YN | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 29 / FVUDDPSUC5EG | revised | Separate the uptake mechanism from unrelated HIDA behavior. Clarify the biological link using a cited primary radiology-pathology study; remove unsupported hamartoma labeling and avoid an absolute FNH-versus-adenoma rule. |
| 30 / DOUEJUEBO6TU | revised | Label the histology as outside clarification; preserve the source-supported enhancement explanation without unsupported detailed feeder-artery anatomy. |
| 31 / SUTGCZOMKW3Z | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 32 / XXJD6ZXNTIMC | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 33 / D5RDH4CNJVR4 | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 34 / 3Z3HNK3L3CA4 | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 35 / QDBT35E6AEVW | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 36 / BUGNIG2WLDEZ | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 37 / PMBVSI3VWDVZ | revised | Make the pretest clue, not general sex-prevalence trivia, the learning target. Use the exact article-supported associations without adding duration or unsupported prevalence strength. |
| 38 / WL3ET66DPBLJ | revised | Replace pure numerical recall with an interpretation-changing pretest clue. Retain the source-specific statistic as context rather than the answer target. |
| 39 / BQYCNCP7RLMW | deleted | Redundant four-pattern omnibus that conflates blood-pool behavior of vessels/vascular lesions with transient parenchymal arterioportal perfusion. The discrete hemangioma, FNH, HCC, shunt and cholangiocarcinoma notes retain the supported teaching. |
| 40 / L2RPLMVGKBR6 | revised | Split dynamic enhancement from unenhanced MRI signal. Preserve the central blood-pool discriminator; move T2 signal to a separate note and remove unsupported fat-saturation elaboration. |
| 41 / PPO3ANWKOUZB | revised | Remove the uncaptured target/halo assertion and replace the misleading avascular label with no detectable Doppler flow. |
| 42 / FSCS3LRMIUZG | revised | Keep the supported phase pattern; remove late scar-enhancement detail not documented among the captured Core facts. |
| 43 / 2FM5SYPUIBHK | revised | Keep the contrast discriminator separate from the detailed mechanism card. Avoid a categorical duct-based distinction or an absolute retention rule. |
| 44 / MKGVSEK3I3DB | deleted | Overloaded FNH ultrasound/sulfur-colloid/HIDA card. Spoke-wheel flow, one-third sulfur-colloid yield and FNH HIDA visualization are not stated in the captured Core fact list or the article. Listing a card family in CORE_DERIVED_CARDS is not fact-level support. |
| 45 / SDDRELIC2YTM | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 46 / WWI4H7VFGBGB | revised | Focus the card on the report-critical search; remove the easily overgeneralized instruction to ignore subcapsular findings. |
| 47 / 3KBLYIZJVT4W | revised | Remove mandatory encapsulation and unsupported phase-detection claims; retain the characteristic pattern without implying all HCCs are identical. |
| 48 / LBIDON5GN223 | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 49 / NC3BIGKTOTBI | revised | Focus the front on one report-critical discriminator. Keep the captured Core vascular discriminator; remove bile ducts from a question describing vascular structures. |
| 50 / IZG7HFCLKNHD | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 51 / I3J2ZONN3VPS | revised | Remove generic MRI signal and ultrasound target assertions not supported by the captured source evidence. |
| 52 / T5DJQQT2YKDD | revised | Remove uncaptured fibrous pseudocapsule and late-enhancement detail; keep source-backed appearance. |
| 53 / HDOC4HKXG4VD | revised | Split independent tracer findings and remove unsupported nonspecific ultrasound content. Keep only the tracer fact explicitly documented in the Core evidence report. |
| 54 / K6AXR6L7TMNS | revised | Reframe textbook threshold recall as a report-critical management pivot. Preserve the Core risk threshold while preventing an unconditional size-only management rule; clearly label the guideline clarification. |
| 55 / T62UOPYMM2LE | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 56 / MJEFHTGFJTPD | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 57 / ITEVRIOOG2WZ | revised | Remove capsular-retraction claim not documented in the captured Core facts. |
| 58 / R6AYKFJF2XNJ | revised | Remove the absolute implication that retraction excludes HCC and unsupported tissue-mechanism wording. |
| 59 / PUMVTEL7SCBL | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 60 / GUO37P5H5XZO | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 61 / KL66TPSR3MMN | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |
| 62 / ZQEZ4VQIXLBM | retained | Content reviewed and retained; universal media/differential cleanup applied where relevant. |

## Deliverables

- [corrected_cards.tsv](corrected_cards.tsv)
- [corrected_cards_anki_import.tsv](corrected_cards_anki_import.tsv)
- [audit_report.md](audit_report.md)
- [_codex_audit_done.txt](_codex_audit_done.txt)
