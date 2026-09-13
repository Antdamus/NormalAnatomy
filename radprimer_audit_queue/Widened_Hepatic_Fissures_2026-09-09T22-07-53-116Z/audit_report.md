# Widened Hepatic Fissures — card-quality audit

Completed 2026-09-09T22:18:21+00:00. Result: **PASS with documented source and live-Anki limits**.

Imported the newest complete browser bundle using `edge_radprimer_extension/tools/import-latest-radprimer-audit-bundle.ps1`, then read `radprimer_audit_queue/_latest_radprimer_audit_bundle.txt`. The pointer resolved to this bundle. All six imported source/control files remain byte-identical to the staged Downloads bundle.

## Deliverables and counts

- `corrected_cards.tsv`: **27 notes**, 22 columns, UTF-8, no header row. Original: 23 notes.
- `corrected_cards_anki_import.tsv`: the same 27 rows and 22 columns, with HTML, separator, note-type, deck, and Tags-column directives.
- `corrected_cards_anki_create_deck.tsv`: optional automatic-deck-creation transport wrapper. It preserves the original 22 columns in order and appends only the deck control column as column 23.
- `_codex_audit_done.txt`: completion marker written after final validation.
- Final mix: **8 UNKNOWN, 2 Boards Trap, 17 High-Yield, 0 Mechanism, 0 Differential Drill**. These are intended card triggers, not a claim that a live Anki import was run.

Three original notes were removed/merged and seven focused notes added: two splits plus five missing source-supported pivots. All 20 retained original `Clinical_Context` fields, including their random-looking IDs, are unchanged. Seven new IDs were generated independently from random bytes. No missing or counter-style IDs were found in the input.

## Main corrections

1. Split focal confluent fibrosis location from venous-phase isoattenuation. Preserve the article's 90% and 80% figures as attributed frequencies, with the interpretive pivot explicit and no invented diagnostic cutoff.
2. Split schistosomiasis fissural distribution from septal/tortoise-shell calcification. Do not assert calcification in RP-08, whose caption does not document it.
3. Merge the age-only senescent-change question and its duplicate CT pitfall into the existing Boards Trap. Age over 70 remains a source-described association, not an absolute diagnostic threshold. Remove the generic four-domain checklist as a standalone High-Yield note; retain its organizing framework in the summary.
4. Remove the unsupported **T2-weighted** specificity from the cirrhosis MRI prompt. The captured Core report supports MRI morphology, but does not identify that sequence.
5. Add five omitted useful pivots: congenital hepatic fibrosis medial-segment preservation, associated renal/biliary abnormalities, PSC with inflammatory bowel disease context, resection/ablation as an iatrogenic mimic, and confluent fibrosis wedge shape with capsular retraction.
6. Replace absolute statements about absent portal hypertension with supportive, probabilistic wording. Source-case senescent change, metastatic pseudocirrhosis, and congenital hepatic fibrosis retain the need for clinical correlation.
7. Separate the general treated-breast-cancer association from RP-05, whose caption documents breast cancer metastases but no treatment interval. Do not claim that RP-05 specifically shows capsular retraction.
8. Improve source-supported mechanisms in UNKNOWN backs: fibrosis/parenchymal loss explains fissural widening; peripheral scarring with relative central hypertrophy explains PSC contour remodeling. No histology-specific claims or external medical explanations were added.

No standalone metadata/bookkeeping questions were present. No prohibited visible image-reference, source-URL, thumbnail-URL, or filename-list blocks were found in the generated learner-facing fields; final checks confirm none remain. Real image tags and useful captions, including the arrow icons, are preserved.

## Core and article evidence

`core_evidence.txt` is present, has `CORE_EVIDENCE_STATUS: USED`, identifies `junzi-shi-core-radiology-a-visual-approach-to.pdf`, GI/liver/biliary coverage on GI pp. 103–104, 109, 119, and 143–144, and enumerates the facts used. `metadata.json` agrees: provided=true and recoveredFromUnwrappedReport=false. The report is usable captured evidence under the bundle instructions; it is not a new direct review of the Core PDF.

Accepted Core support is limited to the enumerated facts: cirrhotic CT/MRI remodeling, ultrasound coarse heterogeneous echotexture/nodular contour, metastatic pseudocirrhosis and capsular retraction, wedge-shaped confluent fibrosis/capsular retraction, Caroli saccular intrahepatic duct dilatation, and PSC duct beading/cirrhotic remodeling. The captured report gives an aggregate page range, not a per-claim page image or verbatim excerpt. No wider Core coverage is claimed.

The older fused source section says no Core pages/excerpts were supplied at that stage. The later generation-stage captured Core report supplies the specific additional evidence for this audit. The summary's source-basis label now states that distinction. Senescent change, congenital segment absence, specific congenital hepatic fibrosis and schistosomiasis clues, and the 90%/80% statistics remain **RadPrimer/STATdx-derived**, not Core-verified claims. Primary studies supporting the statistics were not supplied.

The article-level summary is preserved on every note with its original topic, differential, pearls/pitfalls, and concluding synthesis structure. Corrections clarify the captured Core basis, label article statistics, and restore useful congenital-fibrosis and confluent-fibrosis distinctions. Repetition was not treated as a defect.

The source package already records an editorial correction of an organism-name error in the upstream extracts. No organism-taxonomy or generic frequency trivia was added. An external literature search did not provide an accessible primary full-text verification, and no medical content from it was imported into the cards. All retained/added medical claims are grounded in the supplied article and captured Core report; there is no unlabeled outside clarification.

## Differential Drill prevention and image groups

Both `Differential_Q` and `Differentials` are blank on all 27 notes. Each UNKNOWN mini-differential is at the **top of `Imaging_Differentiation`**. This is the user-authorized compatibility fallback for a note type that could still gate Differential Drill on `Differentials`.

The installed template was not successfully inspected: the local endpoint returned HTTP 404 and the collection database was locked. No live note-type patch or note import was performed, and none was required for this field-level fallback. Actual live card rendering, model field order, and template deck overrides were not changed or independently validated.

- RP-02 remains one complete A–D precontrast/arterial/venous/delayed MRI montage.
- SDX-04 and SDX-05 remain together as distinct examples; the front/back no longer imply a confirmed shared patient.
- SDX-09 and SDX-10 remain paired CT levels in the caption-implied 22-year-old man's case, without progression or treatment claims. SDX-08 stays in the teaching cluster as a separately sourced example with no established patient link.
- All 11 selected source-image IDs are retained. Front labels are source-qualified display labels; no filenames or URLs are exposed as visible bookkeeping.

## Media integrity

The imported audit bundle initially contained six text/control files and **no media directory**. Media were therefore verified in `Downloads/RadPrimer` and `AppData/Roaming/Anki2/User 1/collection.media`, rather than pretending they were included in the bundle.

- All **22 scan files** exist, decode successfully, and match the Anki media copies byte-for-byte by SHA-256.
- All **11 plain-image hashes** exactly match `metadata.json` registry evidence. The registry did not supply annotated hashes; those 11 files were decoded, visually checked, and matched against Anki's copies.
- All **five caption icon files** exist in Anki media under the exact referenced filenames with nonzero bytes. They are listed in registry `captionMarkerAssets`; no independent source icon checksum was supplied.
- The **37 image-tag occurrences / 27 unique filenames** are identical as a multiset before and after audit. No actual image or caption icon was removed.
- All plain and annotated scans were reviewed in separate contact sheets. RP-03 and SDX-10 have byte-identical plain/annotated variants; their captions do not require an arrow overlay. Both exact filenames remain valid.

Full checksums, sizes, dimensions, and comparison outcomes are in `_codex_review/download_media_integrity.json` and `_codex_review/anki_media_integrity.json`. The shortened hashes below are an index, not a substitute for those full records.

| Exact media filename | Bytes | SHA-256 prefix |
| --- | ---: | --- |
| RP-01_RadPrimer_plain_Widened_Hepatic_Fissures1.jpg | 146429 | 6241915f4e684a9a… |
| RP-01_RadPrimer_annotated_Widened_Hepatic_Fissures1_annot.jpg | 149334 | 22a3ed74196106ec… |
| RP-02_RadPrimer_plain_Widened_Hepatic_Fissures2.jpg | 117112 | c34fec8aa5a2a1b5… |
| RP-02_RadPrimer_annotated_Widened_Hepatic_Fissures2_annot.jpg | 123589 | f047f64d84943045… |
| RP-03_RadPrimer_plain_Widened_Hepatic_Fissures3.jpg | 126165 | 0f7e07cf510302eb… |
| RP-03_RadPrimer_annotated_Widened_Hepatic_Fissures3_annot.jpg | 126165 | 0f7e07cf510302eb… |
| RP-05_RadPrimer_plain_Widened_Hepatic_Fissures5.jpg | 123750 | 78702dc425cc94a7… |
| RP-05_RadPrimer_annotated_Widened_Hepatic_Fissures5_annot.jpg | 125906 | 50412813b7ea0649… |
| RP-06_RadPrimer_plain_Widened_Hepatic_Fissures6.jpg | 126088 | dad48918297ae41e… |
| RP-06_RadPrimer_annotated_Widened_Hepatic_Fissures6_annot.jpg | 127495 | a8e6e46b66565a13… |
| RP-08_RadPrimer_plain_Widened_Hepatic_Fissures8.jpg | 115146 | b4b5416f7de0883f… |
| RP-08_RadPrimer_annotated_Widened_Hepatic_Fissures8_annot.jpg | 115852 | d683790fccc71f90… |
| SDX-04_STATdx_plain_Widened_Hepatic_Fissures4.jpg | 118699 | 79b942f9d127bc49… |
| SDX-04_STATdx_annotated_Widened_Hepatic_Fissures4_annot.jpg | 119818 | 5fbc4ef24e15b6f1… |
| SDX-05_STATdx_plain_Widened_Hepatic_Fissures5.jpg | 147906 | dd186dd152f41d9c… |
| SDX-05_STATdx_annotated_Widened_Hepatic_Fissures5_annot.jpg | 148943 | cf4f514137db6e03… |
| SDX-08_STATdx_plain_Widened_Hepatic_Fissures8.jpg | 157049 | 36aba2ceab1896ed… |
| SDX-08_STATdx_annotated_Widened_Hepatic_Fissures8_annot.jpg | 158016 | a3b7c1514b737c8c… |
| SDX-09_STATdx_plain_Widened_Hepatic_Fissures9.jpg | 163282 | 2100cee63e926ab3… |
| SDX-09_STATdx_annotated_Widened_Hepatic_Fissures9_annot.jpg | 164195 | dc87d9a096ac79b8… |
| SDX-10_STATdx_plain_Widened_Hepatic_Fissures10.jpg | 193874 | f0f6e93cbf28d239… |
| SDX-10_STATdx_annotated_Widened_Hepatic_Fissures10_annot.jpg | 193874 | f0f6e93cbf28d239… |
| arrow_WS.png | 522 | 143f942bc894ba06… |
| arrow_WO.png | 708 | 3bef0e607f892e60… |
| arrow_WC.png | 642 | 06b8711689fda5d3… |
| arrow_CS.png | 1319 | d180be252c1c250d… |
| arrow_BS.png | 546 | 38a54de980739ce7… |

## Anki import routing

Target note type: `core_rad_notetype_v2`.

Target deck: `Corebook::GI::Liver::Widened Hepatic Fissures`.

Use **`corrected_cards_anki_create_deck.tsv`** when the target subdeck may not exist. Its `#deck column:23` directive instructs Anki to create the named deck when needed. Use `corrected_cards_anki_import.tsv` for the requested strict 22-column import when the target deck already exists. The standard global `#deck` header presets an existing deck; it does not guarantee creation. The automatic-creation wrapper adds a transport control column only; the note's 21 fields plus Tags remain identical and in the original order. This behavior follows the [official Anki text-import manual](https://docs.ankiweb.net/importing/text-files.html#file-headers).

The existing note type must be available. A TSV header does not create a missing note type. Template deck overrides or updating existing notes can affect placement; those live settings were not changed. This task prepares and verifies the files; it does not import notes or delete any previously imported versions.

## Row-by-row decisions

Original/output numbers are audit references only; they were never used to generate learner-facing IDs. Source bases and gate results are also recorded in `_codex_review/validation_results.json`.

| Original row | Output row | Preserved or new ID | Decision |
| ---: | ---: | --- | --- |
| 1 | 1 | A7K2M9Q4T1XZ | Move mini-differential to the back; clarify the source-supported fibrosis-to-volume-loss mechanism. |
| 2 | 2 | H3P8L2N6R5YW | Retain complete A-D series and qualify the enhancement discriminator. |
| 3 | 3 | M8R4V1K7Q2PL | Do not imply that nonspecific CT morphology proves senescence or that the image establishes absent portal hypertension. |
| 4 | 4 | Q6T1B9M3X8CZ | Keep SDX-04 and SDX-05 together without claiming one patient. |
| 5 | 5 | N4Y8C2P7L5WK | Separate general Core treatment associations from this image history. |
| 6 | 6 | C9L3W7R2F6MX | Explain the remodeling mechanism and distinguish image findings from general duct distribution. |
| 7 | 7 | V2K7D9Q4M1HT | Preserve all three views while distinguishing SDX-08 from the SDX-09/10 companion case. |
| 8 | 8 | T5X9P2R7K4BN | Keep general calcification clues separate from what this image demonstrates. |
| 9 | 9 | J8Q2V5M9C1RL | Merge redundant original High-Yield rows 11 and 18 into one imaging pitfall; avoid an absolute age rule. |
| 10 | 10 | R4M7K2X9P6DV | Retain a focused differential pitfall and make lack of portal hypertension a supportive clue, not a requirement. |
| 11 | removed | B6N1Q8T4W9KC | Redundant age-recall card; source-supported interpretive safeguard merged into Boards Trap row 9. |
| 12 | removed | X7C2M9L4Q1PV | Generic four-domain checklist lacked a concrete discriminator; retained as article-summary framework rather than an independent High-Yield card. |
| 13 | 11 | P3V8K1M7T5QX | Retain one structured morphology-recognition target. |
| 14 | 12 | K9R2F6W4M8CZ | Remove unsupported T2 sequence specificity while retaining captured Core-supported MRI morphology. |
| 15 | 13 | D5Q8L2V7N1MX | Retain source-supported ultrasound appearance with appropriate nonspecificity qualifier. |
| 16 | 14 | M2T7C9Q4L6VK | Keep an integrated signal-and-enhancement pattern; reinforce nonabsolute HCC distinction. |
| 17 | 15 | Q1W6P8R3K9MX | Split location from the independent venous-phase fact; preserve original ID for the location target. |
| 18 | removed | C4M9V2K7T1RX | CT senescent-change pitfall duplicates row 9; unique wording consolidated there. |
| 19 | 16 | V8L3Q1M6P9KT | Replace absolute "should be absent" with a probabilistic discriminator. |
| 20 | 17 | T2K8N5R1Q7MC | Retain metastatic-setting CT morphology; capsular retraction is general Core support, not a new claim about RP-05. |
| 21 | 18 | L6P1X9C4M8QV | Tie beading to strictures and clarify CT example versus general duct distribution. |
| 22 | 19 | R9C5M2V7K1QX | Make the duct discriminator clearer without implying CT proves congenital fibrosis histology. |
| 23 | 20 | N7Q3T8L1P5KV | Split independent calcification recognition into a separate card. |
| new | 21 | BRACWPRK88OA | Separate the second retrieval target from original row 17. |
| new | 22 | 5RMN6RVPAEK2 | Separate calcification recognition from the fissural-distribution card. |
| new | 23 | H7BPCNER4R7B | Add an omitted, explicit source discriminator. |
| new | 24 | IEX6ASV1A4HI | Add an omitted clinical-to-imaging discriminator, without asserting an IBD history in the source image. |
| new | 25 | L8LYDADRQ61J | Give the article-listed postsurgical mimic a focused interpretive card; no procedural images or follow-up are invented. |
| new | 26 | V6LWGFWV88CC | Add omitted wedge-shape/capsular-retraction support from the captured Core report. |
| new | 27 | ZEVKQP6RLLRX | Add source-supported cross-organ clue without asserting unshown renal findings. |

## High-Yield usefulness gate — all 17 rows

Each final High-Yield note teaches a modality appearance, contrast behavior, discriminator, pitfall, or pretest clue that changes interpretation. None relies on a bare prevalence ranking or generic checklist.

| Output row | Retrieval target | Gate passed | Auditable basis |
| ---: | --- | --- | --- |
| 11 | On CT, which volume-redistribution pattern supports cirrhosis when hepatic fissures are widened? | CT appearance / discriminator | core_evidence.txt, CORE_FACTS_USED; GI pp. 103-104, 109, 119, 143-144 (captured report); source_package.txt, fused article lines 5003-5066 |
| 12 | On MRI, which morphologic pattern supports cirrhosis? | MRI appearance | core_evidence.txt, CORE_FACTS_USED; GI pp. 103-104, 109, 119, 143-144 (captured report) |
| 13 | For cirrhosis, what ultrasound morphology should be recognized? | Ultrasound appearance | core_evidence.txt, CORE_FACTS_USED; GI pp. 103-104, 109, 119, 143-144 (captured report) |
| 14 | For focal confluent fibrosis, what MRI signal and dynamic enhancement pattern should be recognized? | MRI signal / contrast behavior | source_package.txt, fused article lines 5003-5066; RP-02 caption |
| 15 | Which distribution favors focal confluent fibrosis in an advanced cirrhotic liver? | Distribution / differential discriminator | source_package.txt, fused article lines 5003-5066 lines 5019-5023 |
| 16 | For congenital absence of hepatic segments, what CT clues favor a congenital explanation over cirrhosis? | CT appearance / discriminator | source_package.txt, fused article lines 5003-5066 |
| 17 | For metastatic pseudocirrhosis, what CT morphology should be recognized? | CT appearance / pretest context | core_evidence.txt, CORE_FACTS_USED; GI pp. 103-104, 109, 119, 143-144 (captured report); source_package.txt, fused article lines 5003-5066 |
| 18 | For primary sclerosing cholangitis, what biliary and hepatic CT pattern should be recognized when fissures are widened? | CT duct appearance / discriminator | source_package.txt, fused article lines 5003-5066; core_evidence.txt, CORE_FACTS_USED; GI pp. 103-104, 109, 119, 143-144 (captured report) |
| 19 | For congenital hepatic fibrosis with Caroli disease, what CT pattern should be recognized? | CT appearance / duct discriminator | source_package.txt, fused article lines 5003-5066; SDX-08/09/10 captions; core_evidence.txt, CORE_FACTS_USED; GI pp. 103-104, 109, 119, 143-144 (captured report) |
| 20 | Which pattern of hepatic fissural widening on CT favors schistosomiasis? | CT distribution / discriminator | source_package.txt, fused article lines 5003-5066; RP-08 caption |
| 21 | Why can focal confluent fibrosis be inconspicuous on venous-phase CT, and which phase can clarify the pattern? | CT contrast behavior / pitfall | source_package.txt, fused article lines 5003-5066 lines 5021-5023 |
| 22 | Which hepatic calcification pattern on CT supports schistosomiasis when the liver is fibrotic? | CT appearance / discriminator | source_package.txt, fused article lines 5003-5066 lines 5058-5061 |
| 23 | In a liver with widened fissures, which medial-segment volume pattern favors congenital hepatic fibrosis over viral/alcohol-related cirrhosis? | Volume-distribution discriminator | source_package.txt, fused article lines 5003-5066 lines 5050-5055 |
| 24 | How does inflammatory bowel disease history change interpretation of beaded bile ducts with widened hepatic fissures? | Pretest clue that changes differential ranking | source_package.txt, fused article lines 5003-5066 lines 5044-5048 |
| 25 | What procedure history can explain localized hepatic volume loss and widened fissures without spontaneous atrophy? | Pretest / reporting pitfall | source_package.txt, fused article lines 5003-5066 lines 5029-5032 |
| 26 | What focal morphology can suggest confluent fibrosis as a cause of hepatic capsular retraction in cirrhosis? | Morphology / differential discriminator | core_evidence.txt, CORE_FACTS_USED; GI pp. 103-104, 109, 119, 143-144 (captured report); source_package.txt, fused article lines 5003-5066 |
| 27 | Which associated organ findings support a fibropolycystic cause of hepatic remodeling with widened fissures? | Associated imaging / pretest discriminator | source_package.txt, fused article lines 5003-5066 lines 5050-5053 |

## Final validation

Independent Python TSV parsing and HTML parsing passed after the authoring checks: 27 rows, exactly 22 clean-data columns in original order, no field header row, no embedded raw tabs/newlines, balanced HTML, one intended card trigger per row, paired questions/answers, unique nonsequential IDs, 17/17 High-Yield gates documented, all 27 repeated summaries present, blank differential triggers, and all image references preserved. Both import variants reproduce the clean 22 columns exactly; the optional wrapper's final column contains only the exact target deck.

Input hashes and output validation details are recorded in `_codex_review/validation_results.json`. Completion does not imply that the live Anki collection or a Core PDF was directly reviewed beyond the explicit limits above.
