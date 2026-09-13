# Periportal Lesion — card-quality audit

**Passed.** The corrected import contains **45 notes: 35 image-recognition notes, 5 Mechanism notes, 1 Boards Trap note, and 4 High-Yield notes**. It preserves **47 distinct source images** and all 11 multi-image groups. No new notes were added; 24 redundant notes were omitted from the 69-note input.

The fresh retained-Corebook validation passed for the exact final TSV hashes. All final image references and caption icons resolve to verified files, and those same files are already present with matching hashes in the current Anki media folder. Anki notes, templates, scheduling, and decks were not modified.

## Import

Use `corrected_cards_anki_import.tsv`. Its headers select note type `core_rad_notetype_v2` and deck `Corebook::GI::Liver::Periportal Lesion`. The body exactly matches `corrected_cards.tsv`, with 22 columns in the original order and no field-header row. All retained Clinical_Context values and their random 12-character IDs are unchanged.

The bundle also contains a verified `media/` copy of all 96 staged diagnostic assets and all 9 auxiliary arrow icons. Only 94 diagnostic assets are referenced by the corrected cards, because the two versions of the already-owned CLL image remain archived with the source. All 105 copied assets already match the current Anki media files; no separate media transfer is needed for this checked collection.

## Repairs and preservation

- Restored the entirely missing Original_Caption and Image_Annotated fields on every retained image note. All 48 source captions were compared character-for-character against original RadPrimer/STATdx metadata and source text; the 47 retained captions occur unchanged in both final caption locations.
- Preserved exact HTML, spaces, punctuation, courtesy credit, and every inline arrow tag, including `arrow_CO.png`. All 9 icon assets were recovered from existing Anki media and checked separately from the diagnostic-image registry.
- Kept each retained Image field unchanged, including grouping and order. Added clean source labels outside the immutable captions. No group was split and no interval, treatment response, or shared patient was invented.
- Added compact differentials at the top of UNKNOWN backs. Both Differential_Q and Differentials remain blank on every note, preventing the legacy Differentials-triggered drill path without changing the installed note type.
- Reframed underdetermined image questions: an upstream duct image now tests ductal dilation/obstruction level rather than an unseen stone or pancreatic primary. The pseudotumor case teaches the malignant mimic with pathology as the documented outcome. Required source-provided treatment/surgical/oncologic context is included in the question where needed.
- Preserved the article-level summary exactly on every retained note. Its Core + RadPrimer + STATdx basis is auditable in this card bundle; the earlier master-source package itself had no Core evidence, which is a separate source-stage limitation.
- Removed cross-category and within-batch conceptual repeats. The duplicated stone text row also contained a literal less-than sign that could disrupt HTML; that redundant row was omitted. No counter-style or missing IDs required repair.
- Final learner fields contain no visible image-reference blocks, source URLs, or local filename lists. Actual image tags, original captions, and concise source attribution remain.

## Retained-bank review

The audit refreshed the live bank with the required prepare command before corrections and refreshed it again with validate afterward. The bank was unchanged between review and validation: **3,175 retained cards**, snapshot `d6eed8c905964106a30e710193675e4626f49e252264fe4c0feaa429c821c73d`.

Read all **526 liver entries across GI and US**, **106 additional global candidates**, and **135 further biliary/cross-topic entries** (767 distinct entries), comparing questions and answers across card categories. The entire snapshot was searched for relevant objectives; lexical scores were used only to retrieve candidates. Suspended retained cards remain owned. There are **0 recorded removed-history entries** in this snapshot; that does not establish an absence of deletions before the history baseline. Generated TSVs were never treated as accepted coverage.

`card_overlap_review.json` contains one explicit decision for each of the 45 final notes, existing-entry references for skipped coverage, and separate intra-batch consolidation records. No existing-note update or deletion was silently emitted.

## Omitted notes already covered by retained cards

| Input row | Stable ID | Retained entry IDs | Decision |
|---|---|---|---|
| 35 | FCJU6SXNCLKS | 1773604534753 | STATdx image 33 is the identical MR slice already owned as HepaticMetastasesandLymphoma25.jpg: visually matched vessel branching, periportal mass, spine and liver margins, despite 1000 versus 900 pixel raster sizes. No atomic companion is lost. |
| 40 | CUMPSBDXDES7 | 1788912163477, 1788912163444 | The retained allograft biloma/necrosis objective already triggers hepatic-arterial assessment. Keep the distinct CT case, but do not add another text card for the same pivot. |
| 44 | O88GSXMGCYIR | 1774482104541, 1774265241596 | The retained portal-occlusion/biliary-dilation cards already teach the vascular-versus-duct mimic and Doppler/anatomic check. Reversing the direction is not a new objective; the distinct two-slice CT case remains. |
| 53 | 76D8D4EKG18D | 1788991063068 | The retained hepatitis card already teaches nonspecific periportal and gallbladder edema on cross-sectional imaging. New ultrasound starry-sky detail is retained separately. |
| 56 | 8SZUUKB104BZ | 1773977424082, 1773977424083, 1773977424098, 1773745498079 | Owned CBD-stone recognition and Doppler cards plus the small-stone shadowing caveat cover this objective. Preserve the distinct source image; remove the redundant text row, including its malformed literal less-than HTML. |
| 65 | NHJ6UD8XSH27 | 1774488691690 | The retained image note already identifies direct portal-to-hepatic-vein shunting. Preserve the distinct RadPrimer ultrasound example; a matching text recognition question adds no different objective. |

The CLL image omission is based on actual image comparison, not captions: STATdx image 33 and the retained `HepaticMetastasesandLymphoma25.jpg` show the same slice, vessel branching, periportal mass, spine, and liver margins. The rasters differ in size (1000 versus 900 pixels) and encoding; they are not byte-identical. See `_codex_review/live_comparison_1.jpg`. It is a standalone case, so no companion was lost.

## Consolidated within this batch

| Omitted input row | Retained input row(s) | Reason |
|---|---|---|
| 43 | 37 | Circumferential edema versus a one-sided duct is already explained in the retained edema mechanism. |
| 45 | 39 | Expected postoperative lymphatic edema is retained once with its mechanism and interpretation. |
| 46 | 42 | Noncommunicating portal-parallel cysts are retained once with their glandular origin. |
| 48 | 38 | Resuscitation edema versus focal injury-related blood is integrated into the volume-expansion mechanism. |
| 49 | 36 | The malignant mimic and pathology limitation are taught on the image back; no separate paraphrased trap. |
| 50 | 1 | The same thick-walled, debris-containing duct recognition objective is retained with the actual ultrasound. |
| 55 | 47 | Central versus peripheral gas and the portal-venous spiky waveform remain one structured comparison. |
| 57 | 9, 42 | Actual US recognition and the single gland-origin/noncommunication mechanism cover the proposed text objective. |
| 58 | 30, 42 | Actual CT/MR recognition and the single gland-origin/noncommunication mechanism cover this repeat. |
| 59 | 10, 41 | US fibrotic mantle recognition and its egg-related mechanism remain; additional descriptive synonyms do not require another card. |
| 60 | 11 | The intact grayscale/Doppler case already tests stones/sludge in avascular dilated intrahepatic ducts. |
| 61 | 23, 24 | The intact MR stone case and CT complication case already test these patterns. |
| 63 | 12 | Fixed branching arterial calcification is retained on the source ultrasound with renal-disease context. |
| 64 | 13 | The cystic-duct remnant recognition objective is retained with the actual postoperative ultrasound. |
| 66 | 38 | The edema collar plus distended IVC is incorporated into the retained resuscitation mechanism. |
| 67 | 26 | The preserved treatment-related CT group already teaches the arterial-chemotherapy pretest clue and PSC mimic. |
| 68 | 39 | Expected postoperative edema and the graft-injury pitfall are retained once with the lymphatic mechanism. |
| 69 | 37 | The duct/portal-vein relationship is already taught in the retained edema mechanism. |

## Text-card usefulness gate

All 20 input High-Yield rows were reviewed. Four remain, each with a source-supported radiology pivot; none was kept simply for a broad frequency or demographic fact. The retained text objectives below add causal or modality-specific content beyond their related image cases. No quota was used.

| Input row | Type | Distinct contribution |
|---|---|---|
| 37 | Mechanism | Explain lymphatic/interstitial expansion producing a circumferential periportal collar and distinguish its geometry from a duct. |
| 38 | Mechanism | Explain resuscitation-related lymph overload and interpret diffuse edema with IVC distention against focal traumatic blood. |
| 39 | Mechanism | Explain expected early posttransplant edema through disrupted lymphatic drainage while connections reform. |
| 41 | Mechanism | Explain embolized schistosomal eggs causing periportal fibrosis and echogenic portal-tract mantling on ultrasound. |
| 42 | Mechanism | Explain dilated peribiliary glands as the origin of noncommunicating portal-parallel cysts. |
| 47 | Boards Trap | Differentiate central pneumobilia from peripheral portal venous gas and identify the portal-venous spiky waveform. |
| 51 | High-Yield | Recognize contrast enhancement and thickening of bile-duct walls as supportive, nonexclusive evidence of ascending cholangitis. |
| 52 | High-Yield | Recognize nonspecific starry-sky portal-triad echogenicity with gallbladder edema on ultrasound in acute hepatitis. |
| 54 | High-Yield | Distinguish focal fatty sparing as a hypoechoic area within echogenic fatty liver with preserved vessel course on ultrasound. |
| 62 | High-Yield | Recognize smooth highly reflective periportal hardware on ultrasound using procedure history. |

## Source and media evidence

The imported `source_package.txt`, `generated_cards.tsv`, `metadata.json`, `audit_instructions.md`, and `core_evidence.txt` were compared. Source packages and metadata were preserved. Core evidence is `USED`, with a named book and printed-page references; it was not merely a claim in generation metadata.

Direct checks of the local Core Radiology PDF corroborated GI 109, 116, 121, 125, and 142–144. The original table on GI 142 was visually inspected and confirms the generated spiky-waveform attribution was already correct. Additional direct checks of GI 100 and 122 verify the existing chemical-shift fat clarification and cardiac-congestion claims; GI 122 is the precise cardiac-hepatopathy page. Verification and source-file hash are recorded in `_codex_review/core_source_verification.json`. New mechanism explanations use RadPrimer/STATdx support; no outside clarification or external guideline was added.

All 48 plain files exactly match the original staged master-source image-evidence hashes. All 96 plain/annotated files decode, have the exact registered filenames, and were checked against the visible source examples. Current Anki-image comparison used byte/decoded-pixel checks, perceptual retrieval, and visual confirmation of the one established same-image match. The other 47 source images remain selected as recognition reinforcement; shared diagnoses alone were not grounds for exclusion. This is a targeted media comparison, not an audit of every unrelated image in Anki.

Caption icon set: `arrow_BC.png`, `arrow_BO.png`, `arrow_BS.png`, `arrow_CC.png`, `arrow_CO.png`, `arrow_CS.png`, `arrow_WC.png`, `arrow_WO.png`, `arrow_WS.png`. **Missing referenced media: none.**

## Group and interpretation limits

All 11 multi-image groups remain intact: RadPrimer 11–12; STATdx 4–5, 6–7, 8–9, 10–11, 12–13, 14–16, 17–18, 21–22, 26–27, and 28–29. Explicit same-patient links are preserved. Matching age/context or procedure context is not treated as proof of shared identity. In particular, the CT/cholangiography abscess examples, the ERCP appended to the same-patient PSC MR pair, and the chemotherapy examples retain that uncertainty. No time-lapse or follow-up interval is supplied.

The pseudotumor CT does not prove inflammatory histology or IgG4-related disease. The hepatitis pattern remains nonspecific. The biliary-necrosis image raises concern for arterial compromise without pretending to directly show the artery. Expected transplant edema does not exclude a separate graft complication.

## Validation files

- `corebook_validation.json`: fresh retained-bank gate passed, bound to final TSV/review hashes.
- `_codex_review/source_media_validation.json`: schema, random IDs, raw captions, image ordering/grouping, media, summary preservation, and learner-field checks passed.
- `_codex_review/field_change_log.json`: changed fields for each retained note.
- `_codex_review/caption_source_comparison.json`, `source_image_hash_comparison.json`, `media_audit.json`, and `anki_media_presence.json`: source and asset traceability.
- `_codex_review/image_selection_review.json`: 47 selected source IDs and the one already-owned archived image.

Completed UTC: 2026-09-13T03:01:49.104528+00:00
