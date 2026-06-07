# Master Source Report: Charcot (Neuropathic) / Neuropathic (Charcot) Arthropathy

Bundle: `C:\Users\josem.000\NormalAnatomy\master_source_queue\Neuropathic_(Charcot)_Arthropathy_2026-06-07T02-58-53-549Z`
Created: 2026-06-07T03:16:17.014011+00:00

## Recommendation

Use RadPrimer as the canonical hierarchy/backbone and STATdx as supplemental depth. STATdx does not fully cover the RadPrimer image set, so all RadPrimer images remain in the primary teaching set. Duplicate STATdx images were archived; high-value nonduplicate STATdx images were added as supplemental primary images.

## Image Coverage Gate

STATdx fully covers RadPrimer image set: **No**.

- RP-01: exact duplicate; STATdx match(es): SDX-23; decision: Keep RadPrimer map as canonical; archive STATdx duplicate.
- RP-02: near duplicate; STATdx match(es): SDX-19; decision: Keep RadPrimer atomic diabetic-foot MR cluster RP-02..RP-04; archive STATdx alternate cluster.
- RP-03: near duplicate; STATdx match(es): SDX-20; decision: Keep RadPrimer same-patient cluster; archive STATdx alternate.
- RP-04: near duplicate; STATdx match(es): SDX-21, SDX-22; decision: Keep RadPrimer adjacent-slice talar ON/infection problem-solving cluster intact; archive STATdx alternate cluster.
- RP-05: conceptual replacement; STATdx match(es): SDX-34, SDX-35, SDX-36; decision: Keep RadPrimer radiograph/CT TMT cluster; add STATdx Lisfranc/TMT cluster as primary supplement, not replacement.
- RP-06: conceptual replacement; STATdx match(es): SDX-36; decision: Keep RadPrimer CT proof with RP-05; add STATdx CT as separate supplemental diabetic-foot example.
- RP-07: near duplicate; STATdx match(es): SDX-15; decision: Keep RadPrimer talonavicular early/progression pair RP-07..RP-08; archive STATdx duplicate pair.
- RP-08: near duplicate; STATdx match(es): SDX-16; decision: Keep RadPrimer follow-up pair; archive STATdx duplicate pair.
- RP-09: not covered; STATdx match(es): none; decision: Keep RadPrimer because it teaches neuropathic fluid collections/reactive change vs infection.
- RP-10: not covered; STATdx match(es): none; decision: Keep RadPrimer with RP-09 because same-patient biopsy-negative infection mimic cluster.
- RP-11: near duplicate; STATdx match(es): SDX-05; decision: Keep RadPrimer shoulder radiograph + syrinx pair; archive STATdx duplicate radiograph.
- RP-12: near duplicate; STATdx match(es): SDX-06; decision: Keep RadPrimer syrinx proof; archive STATdx duplicate spine MR.
- RP-13: near duplicate; STATdx match(es): SDX-11; decision: Keep RadPrimer paraplegic spine pair; archive STATdx duplicate.
- RP-14: near duplicate; STATdx match(es): SDX-12; decision: Keep RadPrimer paraplegic spine pair; archive STATdx duplicate.
- RP-15: near duplicate; STATdx match(es): SDX-09; decision: Keep RadPrimer congenital-insensitivity knee pair; archive STATdx duplicate.
- RP-16: near duplicate; STATdx match(es): SDX-10; decision: Keep RadPrimer knee MR with same-patient radiograph; archive STATdx duplicate.
- RP-17: conceptual replacement; STATdx match(es): SDX-07, SDX-08; decision: Keep RadPrimer polyarticular congenital-indifference example; add STATdx knee/ankle examples as primary supplements.
- RP-18: conceptual replacement; STATdx match(es): SDX-08; decision: Keep RadPrimer contralateral limb pair; add STATdx atrophic ankle as separate primary supplement.
- RP-19: near duplicate; STATdx match(es): SDX-24; decision: Keep RadPrimer hip time-lapse/alcohol-cirrhosis cluster RP-19..RP-22; archive STATdx alternate.
- RP-20: exact duplicate; STATdx match(es): SDX-25; decision: Keep RadPrimer time-lapse cluster; archive STATdx duplicate CT.
- RP-21: near duplicate; STATdx match(es): SDX-26; decision: Keep RadPrimer 7-month hip progression and hatchet sign; archive STATdx 2-month alternate to avoid timeline confusion.
- RP-22: not covered; STATdx match(es): none; decision: Keep RadPrimer because cirrhosis CT proves alcoholism etiology for Charcot hip.

## Curated Image Counts

- RadPrimer images available: 22
- STATdx images available: 36
- Primary teaching images selected: 42
- Archive optional images: 16
- Primary RadPrimer images: 22
- Primary STATdx images: 20

## Primary STATdx Supplements

Selected STATdx primary images: SDX-01, SDX-02, SDX-03, SDX-04, SDX-07, SDX-08, SDX-13, SDX-14, SDX-17, SDX-18, SDX-27, SDX-28, SDX-29, SDX-30, SDX-31, SDX-32, SDX-33, SDX-34, SDX-35, SDX-36

These were kept because they add diabetic TMT/Lisfranc breadth, weight-bearing/CT detail, congenital pain atrophic ankle, tabes/syphilis hip and knee examples, diabetic wrist, shoulder MR/CT mass-mimic detail, severe hindfoot/midfoot examples, and additional Charcot foot recognition patterns.

## Archived STATdx Duplicates

Archived optional STATdx images: SDX-05, SDX-06, SDX-09, SDX-10, SDX-11, SDX-12, SDX-15, SDX-16, SDX-19, SDX-20, SDX-21, SDX-22, SDX-23, SDX-24, SDX-25, SDX-26

These are preserved in the registry but excluded from the default download plan because they duplicate RadPrimer images or duplicate an already stronger RadPrimer cluster.

## Atomic Cluster Guardrails

- Keep same-patient, follow-up, procedure, adjacent-slice, time-lapse, and etiology-proof clusters atomic unless a later prompt explicitly documents a safe split.
- When a selected cluster contains multiple sources, source-qualify every image label: e.g. RadPrimer image 5 / RP-05 or STATdx image 34 / SDX-34.
- Do not mix duplicate timeline clusters as if they are the same patient unless the captions explicitly say they are the same patient within one source.
- RP-19..RP-22 is an atomic time-lapse plus etiology-proof cluster; RP-22 should not be omitted if using that hip case.
- SDX-01..SDX-04 and SDX-34..SDX-36 are distinct diabetic foot/TMT-Lisfranc clusters; do not merge them into the RadPrimer RP-05..RP-06 patient.

## Files Written

- `master_source_package.txt`
- `master_source_manifest.json`
- `image_registry.json`
- `master_source_import.json`
- `master_source_report.md`
- `_codex_master_source_done.txt`
