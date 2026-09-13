# Periportal Lesion — master-source report

Completed the source and actual-image review for the imported browser bundle. **All 48 images are selected: 14 RadPrimer and 34 STATdx. No image is archived.** STATdx does not fully cover the RadPrimer image set. No cards or lecture were generated.

## Canonical source and routing

Canonical hierarchy, copied exactly from metadata.json: `["All Categories", "Basic", "Gastrointestinal", "Liver", "Periportal Lesion"]`.
Canonical deck path: `Corebook::GI::Liver::Periportal Lesion`.
RadPrimer remains the title, hierarchy and differential-order authority. STATdx’s manually paired title, “Periportal Lucency or Edema,” is a complementary, narrower topic. Its hierarchy is retained only as source provenance. The stale configured manual MSK deck is not used.

## Source comparison

Both source metadata files exactly match their copies embedded in metadata.json. Image numbers and all 48 captions agree between source packages, metadata registries and the evidence manifest. The evidence manifest matches metadata.json. The six requested input documents were compared; originals remain unchanged.

| Source | Text retained | Image role |
|---|---|---|
| RadPrimer | All 17 differential diagnoses in their original Common/Less Common order; ultrasound/Doppler patterns, locations, temporal descriptions and case histories. | 14 canonical examples, including vascular channels, lymphoma/metastasis, gas/stones, cysts, schistosomiasis, arterial calcification and postoperative remnant. |
| STATdx | Edema mechanism and mimics; added CT/MR/ductal/procedure detail, congestion, hypervolemia, cholangitis variants, transplant changes and malignant/inflammatory mimics. | 34 distinct CT/MR/cholangiography examples, all retained as supplemental depth and recognition reinforcement. |

The synthesis integrates overlap within RadPrimer’s diagnosis order, then places genuinely additional STATdx topics under the same root. Export prompt boilerplate is removed. The source package remains a reference outline and image library, not a lecture.

## Image coverage gate

Performed before writing the fused package. Each RadPrimer image was compared with the 34 STATdx evidence images. There are **0 cross-source exact duplicates, 0 cross-source near duplicates, 8 partial conceptual replacements, and 6 not covered**. A conceptual replacement here only covers part of the topic; it neither reproduces the RadPrimer image nor permits archiving it.

| RadPrimer image | Classification | STATdx conceptual comparators | Decision and evidence |
|---|---|---|---|
| RP-01 | conceptualReplacement | SDX-10, SDX-11, SDX-12, SDX-13 | Retain primary. US shows a thick-walled CBD with echogenic debris beside colored vessels. STATdx shows CT abscess/edema and direct cholangiography; it supplies complication detail but no equivalent ultrasound wall/debris view. |
| RP-02 | conceptualReplacement | SDX-28, SDX-29 | Retain primary. Tortuous brightly colored hilar channels on US differ from the two CT slices showing portal thrombosis and collateral veins. STATdx partially covers obstruction/collaterals but cannot replace Doppler flow-direction recognition. |
| RP-03 | notCovered | None | Retain primary. US shows a discrete color-flow communication to a hepatic vein. No STATdx image is labeled or visually demonstrates this specific portosystemic shunt. |
| RP-04 | notCovered | None | Retain primary. US shows an anteriorly directed colored vessel from the left portal system. No matching paraumbilical-route demonstration exists in the STATdx set. |
| RP-05 | conceptualReplacement | SDX-33 | Retain primary. US shows dark nodules adjacent to colored portal branches. STATdx shows intermediate-signal periportal CLL tissue on MR in a different source case; retain both distinct malignancy examples. |
| RP-06 | conceptualReplacement | SDX-13, SDX-19 | Retain primary. US shows bright linear biliary foci with posterior artifact. STATdx CTs show low-attenuation ductal gas with infection/abscess; the acoustic recognition pattern is not replaced. |
| RP-07 | conceptualReplacement | SDX-01, SDX-17, SDX-18 | Retain primary. US directly shows bright stones in a duct alongside Doppler-positive vessels. STATdx adds MR duct dilation in a stone case and intrahepatic stones; it does not duplicate the common-duct Doppler view or stone location. |
| RP-08 | notCovered | None | Retain primary. US shows an ill-defined left periportal hypoechoic lesion and absent expected left portal vein. The STATdx malignant examples are HCC/CLL/cholangiocarcinoma, and its metastasis history accompanies postoperative chemotherapy injury rather than an active periportal metastasis. |
| RP-09 | conceptualReplacement | SDX-26, SDX-27 | Retain primary. US shows small anechoic cysts alongside flowing portal branches. STATdx shows larger clustered water-density/water-signal lesions on CT/MR in a cirrhotic patient. The different appearances and modalities are useful reinforcement. |
| RP-10 | notCovered | None | Retain primary. US shows thick bright tissue encasing portal structures. No STATdx image is attributed to schistosomiasis; PSC fibrosis is a different diagnosis and is not an image substitute. |
| RP-11 | conceptualReplacement | SDX-17, SDX-18, SDX-19 | Retain primary. Grayscale US shows bright stones/debris within ducts and surrounding echogenic tissue. STATdx MR/CT examples supply distinct intrahepatic stone and infection patterns. Preserve the RP-11/RP-12 same-patient grayscale/Doppler pair. |
| RP-12 | conceptualReplacement | SDX-17, SDX-18, SDX-19 | Retain primary. The Doppler companion shows colored neighboring vessels while the duct remains uncolored. STATdx MR/CT cannot demonstrate this Doppler distinction; conceptual coverage is partial and both ultrasound companions remain primary. |
| RP-13 | notCovered | None | Retain primary. US shows bright branching arterial walls with neighboring color flow. STATdx has no hepatic-artery-calcification example. |
| RP-14 | notCovered | None | Retain primary. US shows a rounded cystic structure beside vascular flow at the porta hepatis. STATdx peribiliary cyst/dilated-duct images do not demonstrate a postoperative cystic-duct remnant. |

All six uncovered images remain: RP-03, RP-04, RP-08, RP-10, RP-13 and RP-14. RP-12’s conceptual comparators do not supply its absent-flow Doppler finding; that unique teaching need is explicitly retained.

## Actual-media evidence

All 48 staged plain-image files decoded successfully and were visually inspected in seven labeled contact sheets built from those actual files. File SHA-256, decoded RGB SHA-256, dimensions and stable source IDs are recorded in `_codex_review/image_evidence_audit.json` and in each registry entry. None share a stable image ID, exact file hash or decoded RGB hash. A perceptual-difference screen was used only to identify candidates for visual review, never as proof of duplication.

No literal duplicate or unusable image was found. RP-11/RP-12 retain different grayscale/Doppler information. SDX-04/SDX-05 and SDX-12/SDX-13 are related but different slices. Their near-duplicate status is within-source reinforcement and is separate from the RadPrimer-versus-STATdx coverage counts.

The review used staged plain previews. Annotated URLs and all original caption HTML/icon references are preserved, but remote annotated variants and arrow icon asset files were not staged, downloaded or visually verified. This limitation does not justify dropping a plain image.

## Atomic case and procedure groups

**No source case cluster was intentionally split.** All companions are selected. The following multi-image groups are explicit or conservatively protected; all other images have standalone atomic registry groups. No unsupported interval, follow-up progression or treatment response has been added.

| Cluster | Images | Evidence and protection |
|---|---|---|
| RP-RPC-US | RP-11, RP-12 | RadPrimer image 12 explicitly says same patient. Preserve grayscale stones/sludge and the Doppler no-flow companion. |
| SDX-HYPERVOLEMIA-18 | SDX-04, SDX-05 | Matching age/sex and post-trauma resuscitation context plus related CT anatomy. Shared patient is inferred conservatively, not explicitly documented; slices are distinct. |
| SDX-CHF-78 | SDX-06, SDX-07 | Both captions describe a 78-year-old woman with CHF; image 7 says this woman. Preserve both distinct CT levels. |
| SDX-HEPATITIS | SDX-08, SDX-09 | Image 9 explicitly says same patient. No acquisition interval or treatment response is provided. |
| SDX-ABSCESS-PROCEDURE | SDX-10, SDX-11 | Adjacent captions link abscesses with ducts and contrast filling of abscess cavities; retain as a procedure group without claiming proven patient identity or an undocumented outcome. |
| SDX-WHIPPLE | SDX-12, SDX-13 | Matching Whipple/pancreatic-cancer/cholangitis/abscess history and related CT anatomy support a conservative case group; distinct slices preserve gas and edema. |
| SDX-PSC-PROCEDURE | SDX-14, SDX-15, SDX-16 | Images 14–15 are explicitly the same PSC/ulcerative-colitis patient. Image 16 is conservatively retained as an adjacent ERCP companion; its patient identity is not confirmed. |
| SDX-RPC-MR | SDX-17, SDX-18 | Adjacent MR captions show similar intrahepatic stone burden in complementary planes; shared patient is not explicitly documented. |
| SDX-CHEMO | SDX-21, SDX-22 | Adjacent captions share the chemotherapy mechanism. Image 21 includes lobectomy/clips; shared patient and interval are not asserted. |
| SDX-PERIBILIARY-CYSTS | SDX-26, SDX-27 | Image 27 explicitly identifies the same patient and another modality/view. |
| SDX-PVT | SDX-28, SDX-29 | Image 29 explicitly identifies the same patient. Both CT levels and the hypercoagulable history remain together. |

Conservative grouping protects context; it does not prove patient identity. In particular, the explicit PSC pair is SDX-14/SDX-15, while the adjoining ERCP SDX-16 is protected without a confirmed same-patient claim. SDX-23 and SDX-24 remain different transplant examples rather than an invented before/after pair.

## Source qualifications

- No auditable Core excerpt or page evidence is present. RadPrimer + STATdx attribution is explicit; the Corebook route does not establish textbook validation.
- RadPrimer’s direct-systemic-drainage sentence for fatty sparing is uncorroborated/ambiguous in the paired extraction. The original is preserved, while the master retains supported imaging patterns and drainage-site associations without promoting that isolated mechanism.
- STATdx’s AIDS-related MR/MRCP sensitivity/specificity ranges remain in the raw input. They are not generalized without an auditable study/population basis.
- Caroli disease has text support but no specifically labeled central-dot image in the staged sets. Generic iatrogenic-material US morphology is text-only; postoperative clips in a STATdx CT have their own treatment context.
- The metastasis, HCC, CLL, PSC, schistosomiasis and cystic-duct-remnant examples retain their source diagnoses. Related findings are not relabeled to fill gaps.
- Expected transplant edema is distinguished from the separate biliary-necrosis complication. The pseudotumor case retains its pathology outcome without an invented confirmed IgG4 diagnosis.

## Extension handoff

Import **master_source_import.json**. It contains the exact package text, manifest, complete registry, selection plan and selected/archive lists. Narrative-facing image labels use “RadPrimer image N” or “STATdx image N”; short identifiers remain in filenames and traceability fields.

The primary plan lists 48 image IDs and 96 source-qualified variant downloads: one plain and one annotated file per image. The optional archive list is empty. This is curated retention after inspection, not unreviewed bulk selection. No browser import or remote image download was performed.

Validation checks the actual installed extension’s single-file and separate-file import helpers and its download selection/naming functions, along with source fidelity, canonical routing, captions, hashes and group completeness. Results are saved in `_codex_review/validation_results.json`; the done marker is written only after these checks pass.

## Deliverables

- master_source_package.txt
- master_source_manifest.json
- image_registry.json
- master_source_import.json
- master_source_report.md
- _codex_master_source_done.txt (written by successful validation)

No Anki edits, cards, lecture, image deletions or downstream generation were performed.
