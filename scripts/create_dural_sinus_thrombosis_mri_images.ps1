$ErrorActionPreference = "Stop"

$OutDir = "C:\Users\josem.000\NormalAnatomy\anki_dural_sinus_thrombosis_mri"

$cleanSource = Join-Path $OutDir "WIKI_sinus_thrombosis_multiseq_clean.jpg"
$annotatedSource = Join-Path $OutDir "WIKI_sinus_thrombosis_multiseq_annotated.jpg"

$cleanOutput = Join-Path $OutDir "brain_mri_multisequence_01_no_arrows.jpg"
$annotatedOutput = Join-Path $OutDir "brain_mri_multisequence_01_arrow.jpg"

Copy-Item -LiteralPath $cleanSource -Destination $cleanOutput -Force
Copy-Item -LiteralPath $annotatedSource -Destination $annotatedOutput -Force

$attribution = @"
Source image set:
- Clean and annotated multi-sequence MRI case by Hellerhoff.
- Description: right-sided sinus thrombosis, mainly involving the transverse sinus, shown on T2, T1, DWI, FLAIR, and post-contrast T1 axial/coronal MRI.
- Clean file: https://commons.wikimedia.org/wiki/File:Sinusthrombose_rechts_Sinus_transversalis_76W_-_MR_-_001.jpg
- Annotated file: https://commons.wikimedia.org/wiki/File:Sinusthrombose_rechts_Sinus_transversalis_76W_-_MR_-_001_-_Annotation.jpg
- License: CC BY-SA 4.0.
- Teaching reference: https://pacs.de/term/dural-sinus-thrombosis

Derived files in this folder:
- brain_mri_multisequence_01_no_arrows.jpg
- brain_mri_multisequence_01_arrow.jpg
"@

Set-Content -LiteralPath (Join-Path $OutDir "attribution.txt") -Value $attribution -Encoding UTF8
