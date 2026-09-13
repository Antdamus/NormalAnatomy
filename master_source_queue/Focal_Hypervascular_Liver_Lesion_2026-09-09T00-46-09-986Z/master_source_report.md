# Master source report — Focal Hypervascular Liver Lesion

Completed the source comparison, actual-image evidence review and master-source synthesis. RadPrimer remains the canonical hierarchy and text backbone. The primary set contains **40 STATdx images**; **29 exact duplicate source entries** remain available for optional recovery (28 RadPrimer copies and STATdx image 5). All 69 source entries remain in the registry. No cards or lecture were generated.

## Import and source comparison

Imported the newest complete browser request with `edge_radprimer_extension/tools/import-latest-master-source-bundle.ps1`; then read `master_source_queue/_latest_master_source_bundle.txt`. Imported folder: `Focal_Hypervascular_Liver_Lesion_2026-09-09T00-46-09-986Z`.

Canonical hierarchy copied exactly from metadata.json: `["All Categories", "Basic", "Gastrointestinal", "Liver", "Focal Hypervascular Liver Lesion"]`.
Canonical deck path copied exactly: `Corebook::GI::Liver::Focal Hypervascular Liver Lesion`.

- Compared both source packages, both standalone source metadata files, combined metadata, the request, the evidence manifest and actual images.
- Both embedded source metadata and image registries exactly match their standalone files; package image numbering/captions match source metadata.
- RadPrimer uniquely supplies the explicit Common/Less Common differential list in this export. The Essential Information sections otherwise match exactly. That text is retained once with [Both] attribution.
- STATdx contributes 13 additional source entries; 12 remain primary after removal of its internal repeated slice. These supply multiphase hemangioma, central-scar/early-vein FNH, arterioportal shunts, mosaic HCC and regenerative-nodule MR examples.
- STATdx provides no additional standalone management or mechanism section in this bundle. No unsupported management detail was added.
- STATdx article breadcrumbs are retained as source provenance only. The unrelated saved manualDeckRoot was not used. No IMAIOS artifact was requested or generated.
- Core cross-check boilerplate is not auditable Core evidence; Core support remains unverified.

## Image evidence and coverage gate

All 69 staged plain JPEG files decoded successfully and were visually inspected in 10 labeled contact sheets derived from those files. STATdx images 4 and 5 were also viewed individually at their native 1000 × 1000 size. No caption-only duplicate decision was used.
All 28 RadPrimer entries have a one-to-one STATdx counterpart with the **same stable publisher image UUID and the same visually observed slice or composite**. RadPrimer renditions are 900 × 900 and STATdx renditions are 1000 × 1000. These are exact image-content duplicates, not byte-identical files; all file hashes differ. The larger supplied rendition is selected consistently, and each whole RadPrimer cluster is replaced by the corresponding STATdx cluster.
Coverage counts: exact duplicate 28; near duplicate 0; conceptual replacement 0; not covered 0. STATdx fully covers the RadPrimer image set. Hashes, dimensions, source IDs, evidence paths and per-pair observations are recorded in the manifest and registry.

| RadPrimer entry | Selected counterpart | Classification | Visual content confirmed |
|---|---|---|---|
| RP-01 | SDX-01 | Exact duplicate | Identical two-panel hepatic-dome hemangioma/venous-retention composite and divider. |
| RP-02 | SDX-06 | Exact duplicate | Identical two-panel right-lobe FNH arterial/portal CT composite. |
| RP-03 | SDX-07 | Exact duplicate | Identical arterial MR slice with avid FNH and central scar. |
| RP-04 | SDX-08 | Exact duplicate | Identical portal-phase MR slice with near-isointense FNH and visible scar. |
| RP-05 | SDX-12 | Exact duplicate | Identical CT slice with early left portal-vein filling and left-lobe enhancement after biopsy. |
| RP-06 | SDX-13 | Exact duplicate | Identical two-panel peripheral arterial hyperenhancement/venous normalization MR composite. |
| RP-07 | SDX-16 | Exact duplicate | Identical arterial CT slice with wedge-shaped peripheral hyperperfusion. |
| RP-08 | SDX-17 | Exact duplicate | Identical portal CT slice showing metastases in the same THAD case. |
| RP-09 | SDX-18 | Exact duplicate | Identical arterial CT slice of the heterogeneous HCC. |
| RP-10 | SDX-19 | Exact duplicate | Identical four-panel T2/diffusion/arterial/venous HCC MR composite. |
| RP-11 | SDX-22 | Exact duplicate | Identical CT slice with numerous hypervascular and ring-enhancing metastases. |
| RP-12 | SDX-23 | Exact duplicate | Identical CT slice showing the pancreatic primary and hepatic metastases. |
| RP-13 | SDX-24 | Exact duplicate | Identical arterial gadoxetate MR slice with enhancing encapsulated adenoma. |
| RP-14 | SDX-25 | Exact duplicate | Identical delayed gadoxetate MR slice of the inflammatory adenoma. |
| RP-15 | SDX-26 | Exact duplicate | Identical arterial CT slice with enlarged HHT vessels and heterogeneous enhancement. |
| RP-16 | SDX-27 | Exact duplicate | Identical portal CT slice with homogeneous liver and dilated hepatic veins/IVC. |
| RP-17 | SDX-28 | Exact duplicate | Identical arterial CT slice with regenerative nodules, ascites and occluded IVC. |
| RP-18 | SDX-29 | Exact duplicate | Identical portal CT slice with persistent regenerative-nodule enhancement and collaterals. |
| RP-19 | SDX-32 | Exact duplicate | Identical arterial CT slice with lobulated fibrolamellar tumor and calcified scar. |
| RP-20 | SDX-33 | Exact duplicate | Identical portal CT slice of the same heterogeneous fibrolamellar tumor. |
| RP-21 | SDX-34 | Exact duplicate | Identical arterial CT slice of the large mass and enhancing porta-hepatis nodes. |
| RP-22 | SDX-35 | Exact duplicate | Identical delayed CT slice with persistent enhancement in proven cholangiocarcinoma. |
| RP-23 | SDX-36 | Exact duplicate | Identical CT slice showing fat and hypervascular tissue in hepatic angiomyolipoma. |
| RP-24 | SDX-37 | Exact duplicate | Identical CT slice of multiple irregularly enhancing angiosarcoma lesions. |
| RP-25 | SDX-38 | Exact duplicate | Identical axial CT slice with focal left-lobe enhancement and chest-wall collaterals. |
| RP-26 | SDX-39 | Exact duplicate | Identical coronal CT reconstruction demonstrating SVC occlusion and collateral routes. |
| RP-27 | SDX-40 | Exact duplicate | Identical arterial CT slice with continuous ring enhancement in peliosis. |
| RP-28 | SDX-41 | Exact duplicate | Identical later CT slice showing progressive peliosis fill-in. |

## Additional STATdx examples retained

| IDs | Contribution |
|---|---|
| SDX-02, SDX-03, SDX-04 | Hemangioma NECT/arterial/portal sequence; SDX-05 caption retained with SDX-04. |
| SDX-09, SDX-10, SDX-11 | Additional FNH CT phase pair and distinct scar/early-draining-vein example. |
| SDX-14, SDX-15 | Small arterial-only focus and capsular wedge-shaped shunt examples. |
| SDX-20, SDX-21 | Large mosaic HCC and portal-phase necrosis/near-isodensity. |
| SDX-30, SDX-31 | Regenerative-nodule MR phase/slice pair with halos and persistent enhancement. |

These distinct examples and phase/slice companions are recognition reinforcement, not a reason to discard other examples. No unusable images were found.

## Case clusters and the one documented safe split

Source group fields were empty. Case groups were reconstructed conservatively from captions and actual image anatomy; the registry/manifest distinguish explicit same-patient language from inferred pairing. All composite panels remain intact. No RadPrimer source case cluster was partially replaced.

**One intentional selected/archived split:** SDX-02/03/04/05. SDX-05 is archived as the same portal-venous slice shown by SDX-04. Native-image review confirmed matching lesion texture/contour, hepatic vessels, portal confluence, pancreas, bowel contents and vertebral details. The image UUIDs and hashes differ and brightness/contrast differs, but there is no new slice, phase or view. Pixel correlation (0.9853) corroborates visual review and is not used alone to declare identity.

The split is safe because SDX-02/03/04 preserve the entire supplied NECT → arterial → portal sequence. The more comprehensive SDX-05 phase-comparison caption is retained in SDX-04 teachingCaption and packageText. SDX-05 original caption, plain/annotated URLs, evidence and source-qualified filenames remain available in the registry for recovery. Annotated variants were not staged; no claim is made that their annotation overlays match.

Every other source case cluster remains selected in full or is replaced in full by exact counterparts. No longitudinal time-lapse/follow-up image series was supplied; contrast phases, biopsy context, comparison views and source-described clinical outcomes are preserved.

| Case group | Selected images | Archived counterparts | Grouping basis |
|---|---|---|---|
| hemangioma_dome | SDX-01 | RP-01 | source composite and caption |
| hemangioma_multiphase | SDX-02, SDX-03, SDX-04 | SDX-05 | visual review and sequential source captions; same-case grouping inferred conservatively |
| fnh_ct_composite | SDX-06 | RP-02 | source composite and caption |
| fnh_mr | SDX-07, SDX-08 | RP-03, RP-04 | sequential captions and corresponding anatomy; same-case grouping inferred conservatively |
| fnh_ct_scar | SDX-09, SDX-10 | None | sequential captions and matching lesion; same-case grouping inferred conservatively |
| fnh_ct_draining_veins | SDX-11 | None | source caption and visually distinct example |
| ap_shunt_biopsy | SDX-12 | RP-05 | source caption |
| ap_shunt_mr_composite | SDX-13 | RP-06 | source composite and caption |
| ap_shunt_small_focus | SDX-14 | None | source caption; diagnostic grouping inferred from article placement |
| ap_shunt_wedge | SDX-15 | None | source caption |
| thad_metastases | SDX-16, SDX-17 | RP-07, RP-08 | explicit same-patient caption |
| hcc_ct | SDX-18 | RP-09 | source caption |
| hcc_mr_composite | SDX-19 | RP-10 | source composite and caption |
| hcc_mosaic | SDX-20, SDX-21 | None | sequential captions and corresponding anatomy; same-case grouping inferred conservatively |
| metastases_endocrine | SDX-22 | RP-11 | source caption |
| metastases_glucagonoma | SDX-23 | RP-12 | source caption |
| adenoma_gadoxetate | SDX-24, SDX-25 | RP-13, RP-14 | explicit same-patient caption |
| hht_ct | SDX-26, SDX-27 | RP-15, RP-16 | explicit same-patient caption |
| regenerative_ct | SDX-28, SDX-29 | RP-17, RP-18 | explicit same-patient caption |
| regenerative_mr | SDX-30, SDX-31 | None | sequential captions and corresponding disease/anatomy; same-case grouping inferred conservatively |
| fibrolamellar_ct | SDX-32, SDX-33 | RP-19, RP-20 | explicit same-patient caption |
| cholangiocarcinoma_ct | SDX-34, SDX-35 | RP-21, RP-22 | explicit same-patient caption |
| aml_ct | SDX-36 | RP-23 | source caption |
| angiosarcoma_ct | SDX-37 | RP-24 | source caption |
| svc_collaterals | SDX-38, SDX-39 | RP-25, RP-26 | explicit same-patient caption |
| peliosis_ct | SDX-40, SDX-41 | RP-27, RP-28 | sequential captions and matching lesion; same-case grouping inferred conservatively |

## Extension handoff and validation

- Import `master_source_import.json`. It contains the exact package text, manifest, complete 69-entry array, curation plan and explicit selected/archive ID lists.
- Download plan selects 40 primary images and 80 variant files (plain plus annotated), with source-qualified filenames such as `SDX-04_STATdx_plain_Focal_Hypervascular_Liver_Lesion4.jpg`.
- Primary and archive sets are disjoint and exhaustive. Download URLs and original source filenames/UUIDs are preserved; no filename collisions are introduced.
- Narrative-facing labels use one source-qualified label at a time. Short codes appear in machine filenames, registry, manifest and this traceability report.
- Actual extension import normalization and download selection are checked in `_codex_review/validation_results.json` before writing the completion marker.
- This task stages the import artifact; it does not import into a live browser or download the future full/annotated image set.
- Source-specific frequencies and broad diagnostic claims were retained as supplied source material; no external clinical-guideline update was performed.

## Outputs

- [master_source_package.txt](master_source_package.txt)
- [master_source_manifest.json](master_source_manifest.json)
- [image_registry.json](image_registry.json)
- [master_source_import.json](master_source_import.json)
- [master_source_report.md](master_source_report.md)
- [_codex_master_source_done.txt](_codex_master_source_done.txt)
