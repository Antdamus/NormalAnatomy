$ErrorActionPreference = 'Stop'

$outDir = Join-Path (Get-Location) 'anki_budd_chiari_regenerative_nodules'
$tsvPath = Join-Path $outDir 'anki_budd_chiari_regenerative_nodules.tsv'
$attributionPath = Join-Path $outDir 'attribution.txt'

$deck = 'Corebook::GI::Liver::Vascular::Budd-Chiari Syndrome'
$headers = @(
  '#separator:tab',
  '#html:true',
  '#notetype:core_rad_notetype_v2',
  "#deck:$deck"
)

function Clean-Field {
  param([string]$Value)
  if ($null -eq $Value) { return '' }
  return ($Value -replace "`r?`n", '<br>' -replace "`t", ' ')
}

function Make-Row {
  param([string[]]$Fields)
  if ($Fields.Count -ne 22) {
    throw "Expected 22 fields, got $($Fields.Count)"
  }
  return (($Fields | ForEach-Object { Clean-Field $_ }) -join "`t")
}

function Get-PmcCaption {
  param(
    [string]$HtmlPath,
    [string]$FigureId
  )

  $html = Get-Content -LiteralPath $HtmlPath -Raw -Encoding UTF8
  $escapedId = [regex]::Escape($FigureId)
  $pattern = "(?s)<figure[^>]+id=`"$escapedId`"[\s\S]*?<figcaption><p>(.*?)</p></figcaption>"
  $match = [regex]::Match($html, $pattern)
  if (-not $match.Success) {
    throw "Could not find caption for $FigureId in $HtmlPath"
  }
  return $match.Groups[1].Value.Trim()
}

function New-UnknownRow {
  param(
    [string]$ClinicalContext,
    [string]$ImageHtml,
    [string]$AnnotatedHtml,
    [string]$Question,
    [string]$Answer,
    [string]$ImagingDifferentiation,
    [string]$OriginalCaption,
    [string]$SourceLink,
    [string]$CaseContext,
    [string]$CaseSummary,
    [string]$CaseDifferential,
    [string]$Summary,
    [string]$Tags
  )

  return Make-Row @(
    $ClinicalContext,
    $ImageHtml,
    $AnnotatedHtml,
    $Question,
    $Answer,
    '',
    '',
    '',
    $ImagingDifferentiation,
    $OriginalCaption,
    '',
    '',
    '',
    '',
    '',
    '',
    $SourceLink,
    $CaseContext,
    $CaseSummary,
    $CaseDifferential,
    $Summary,
    $Tags
  )
}

$refFocal = 'Reference: Rizzetto F, Rutanni D, Carbonaro LA, Vanzulli A. Focal Liver Lesions in Budd-Chiari Syndrome: Spectrum of Imaging Findings. Diagnostics (Basel). 2023;13(14):2346. PMCID: PMC10378170. DOI: 10.3390/diagnostics13142346. Open access CC BY 4.0. https://pmc.ncbi.nlm.nih.gov/articles/PMC10378170/'
$refImaging = 'Reference: Porrello G, Mamone G, Miraglia R. Budd-Chiari Syndrome Imaging Diagnosis: State of the Art and Future Perspectives. Diagnostics (Basel). 2023;13(13):2256. PMCID: PMC10341099. DOI: 10.3390/diagnostics13132256. Open access CC BY 4.0. https://pmc.ncbi.nlm.nih.gov/articles/PMC10341099/'

$htmlImaging = Join-Path $outDir 'pmc10341099.html'
$htmlFocal = Join-Path $outDir 'pmc10378170.html'

$capHv = Get-PmcCaption -HtmlPath $htmlImaging -FigureId 'diagnostics-13-02256-f001'
$capTrap = Get-PmcCaption -HtmlPath $htmlImaging -FigureId 'diagnostics-13-02256-f010'
$capCtRn = Get-PmcCaption -HtmlPath $htmlFocal -FigureId 'diagnostics-13-02346-f001'
$capHcc = Get-PmcCaption -HtmlPath $htmlFocal -FigureId 'diagnostics-13-02346-f006'
$capLargeRn = Get-PmcCaption -HtmlPath $htmlFocal -FigureId 'diagnostics-13-02346-f007'

$summaryCore = 'Chronic Budd-Chiari syndrome is hepatic venous outflow obstruction with chronic congestion, fibrosis, portal hypertension, caudate/sparing-region hypertrophy, venous collaterals, mosaic enhancement, and frequent benign FNH-like/large regenerative nodules. The major trap is overcalling arterialized regenerative nodules as HCC. In BCS, arterial phase hyperenhancement and even washout are not specific enough by themselves; use hepatobiliary phase, DWI/ADC, T1/T2 signal, central scar, multiplicity, growth behavior, AFP, and multidisciplinary follow-up/biopsy when atypical.'

$rows = @()

$rows += New-UnknownRow `
  -ClinicalContext 'Adult with abdominal pain, ascites, abnormal liver tests, and hypercoagulable history. Portal venous phase liver MRI panel GILIVBCS01A' `
  -ImageHtml '<img src="PMC10341099_fig1_hv_occlusion_mosaic.jpg"><br>' `
  -AnnotatedHtml "<div class=""stackItem""><img src=""PMC10341099_fig1_hv_occlusion_mosaic.jpg""><div class=""stackCap"">$capHv<br>How to read it: the direct clue is hepatic venous outflow non-opacification/occlusion; the parenchymal clue is heterogeneous mosaic enhancement from venous congestion. Source callouts are original; no extra arrows or crops were added.<br>$refImaging</div></div>" `
  -Question 'What vascular liver disorder pattern is shown, and what background parenchymal finding supports it?' `
  -Answer "Budd-Chiari syndrome, with hepatic venous outflow obstruction and mosaic hepatic enhancement from venous congestion.<br><br>Why: Budd-Chiari is defined by impaired hepatic venous drainage in the absence of right heart failure or constrictive pericarditis. Direct imaging signs are hepatic vein/IVC obstruction and venous collaterals. Indirect signs include ascites, caudate or spared-territory hypertrophy, fibrosis/atrophy of involved segments, portal hypertension, mosaic enhancement, and later regenerative nodules.<br><br>Differential to think through: congestive hepatopathy from right heart failure, sinusoidal obstruction syndrome, cirrhosis with heterogeneous enhancement, portal vein thrombosis, and infiltrative hepatic tumor. Direct hepatic vein/IVC obstruction or collaterals is the key discriminator.<br><br>$refImaging" `
  -ImagingDifferentiation "Differentiate from congestive hepatopathy by looking for a cardiac/right-heart cause and patent hepatic veins. Differentiate from primary cirrhosis by identifying hepatic venous outflow obstruction, venous collaterals, caudate hypertrophy, and the BCS pattern of focal regenerative nodules." `
  -OriginalCaption $capHv `
  -SourceLink 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10341099/' `
  -CaseContext 'Adult with abdominal pain, ascites, abnormal liver tests, and hypercoagulable background; MRI shows hepatic venous outflow occlusion and mosaic enhancement.' `
  -CaseSummary 'Recognition card for the chronic/subacute Budd-Chiari imaging background that sets up the regenerative nodule trap.' `
  -CaseDifferential 'Congestive hepatopathy; sinusoidal obstruction syndrome; cirrhosis; portal vein thrombosis; infiltrative tumor.' `
  -Summary $summaryCore `
  -Tags 'GI Liver Vascular BuddChiari HepaticVeinOcclusion MosaicEnhancement Ascites MRI'

$rows += New-UnknownRow `
  -ClinicalContext '36-year-old man with chronic liver disease, ascites, and prior TIPS. Multiphasic liver CT panel GILIVBCS02B' `
  -ImageHtml '<img src="PMC10378170_fig1_ct_fnh_like_rn.jpg"><br>' `
  -AnnotatedHtml "<div class=""stackItem""><img src=""PMC10378170_fig1_ct_fnh_like_rn.jpg""><div class=""stackCap"">$capCtRn<br>How to read it: multiple homogeneous arterialized nodules in this vascular liver background are not automatically HCC. Their later iso/slight hyperdensity and perinodular congestion rim favor FNH-like regenerative nodules. Source callouts are original; no extra arrows or crops were added.<br>$refFocal</div></div>" `
  -Question 'In this vascular chronic liver background, what is the most likely interpretation of the multiple arterialized hepatic nodules?' `
  -Answer "FNH-like regenerative nodules / large regenerative nodules in chronic Budd-Chiari syndrome.<br><br>Why: chronic hepatic venous outflow obstruction causes portal flow deprivation, congestion, fibrosis, and compensatory hepatic arterialization. Areas with relatively preserved outflow can undergo benign hepatocellular hyperplasia, producing multiple arterialized regenerative nodules. On CT they are often homogeneous arterial enhancing and become iso- or slightly hyperdense on portal venous/delayed phases.<br><br>Trap: do not call every arterial enhancing nodule HCC in chronic Budd-Chiari. Multiplicity, homogeneous enhancement, T1 iso/hyperintensity on MRI, lack of restricted diffusion, central scar/perinodular congestion rim, and hepatobiliary iso/hyperintensity favor benign regenerative nodules.<br><br>Differential to think through: HCC, adenoma, true FNH, dysplastic nodule, hypervascular metastases, hemangioma, and perfusion pseudolesion.<br><br>$refFocal" `
  -ImagingDifferentiation "HCC is favored by a solitary/new dominant lesion, T1 hypointensity, T2 hyperintensity, restricted diffusion, heterogeneous arterial enhancement, enhancing capsule, portal/delayed washout, hepatobiliary hypointensity, portal venous invasion, and rising AFP. In BCS, APHE and washout alone have low specificity." `
  -OriginalCaption $capCtRn `
  -SourceLink 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10378170/' `
  -CaseContext '36-year-old man with Budd-Chiari, TIPS, ascites, and multiple arterial enhancing nodules on CT.' `
  -CaseSummary 'CT pattern of benign FNH-like regenerative nodules in chronic Budd-Chiari.' `
  -CaseDifferential 'HCC; adenoma; true FNH; dysplastic nodule; hypervascular metastases; hemangioma; perfusion pseudolesion.' `
  -Summary $summaryCore `
  -Tags 'GI Liver Vascular BuddChiari RegenerativeNodule FNHLikeNodule CT TIPS HCCMimic'

$rows += New-UnknownRow `
  -ClinicalContext 'Known chronic hepatic venous outflow obstruction. Surveillance hepatospecific-contrast MRI shows an arterialized nodule with delayed washout-like appearance. Panel GILIVBCS03C' `
  -ImageHtml '<img src="PMC10341099_fig10_rn_mimics_hcc_hbp.jpg"><br>' `
  -AnnotatedHtml "<div class=""stackItem""><img src=""PMC10341099_fig10_rn_mimics_hcc_hbp.jpg""><div class=""stackCap"">$capTrap<br>How to read it: the apparent HCC trigger is arterial hyperenhancement plus delayed washout-like behavior. The rescuing clue is hepatobiliary-phase hyperintensity, which supports a benign hepatocellular/FNH-like regenerative nodule rather than HCC. Source arrows are original; no extra arrows or crops were added.<br>$refImaging</div></div>" `
  -Question 'What is the main diagnostic trap here, and what feature keeps you from overcalling malignancy?' `
  -Answer "Trap: calling a large regenerative/FNH-like nodule in chronic Budd-Chiari syndrome hepatocellular carcinoma solely because it has arterial hyperenhancement and washout-like behavior.<br><br>Most likely diagnosis: benign FNH-like regenerative nodule / large regenerative nodule in chronic Budd-Chiari.<br><br>Why the trap happens: BCS changes liver hemodynamics. Portal flow deprivation and increased arterialization make regenerative nodules hypervascular. Perilesional congestion can create relative delayed hypointensity, so 'washout' is less specific than it is in ordinary cirrhosis/HCC algorithms.<br><br>What rescues the call: hepatobiliary-phase iso/hyperintensity means functioning hepatocytes and ductular proliferation are present, like FNH/FNH-like regenerative tissue. That pattern argues against HCC, which is usually HBP hypointense in this context.<br><br>Differential to think through: HCC, hepatic adenoma, true FNH, dysplastic nodule, necrotic/infarcted regenerative nodule, hypervascular metastasis. If AFP rises, the lesion is solitary/dominant, HBP hypointense, diffusion restricting, T2 bright, rapidly growing, or atypical over serial exams, biopsy/focused workup is justified.<br><br>$refImaging" `
  -ImagingDifferentiation "In chronic BCS, do not apply LI-RADS/AASLD-style APHE-plus-washout logic uncritically. HBP hyperintensity and lack of aggressive ancillary features favor FNH-like RN; HBP hypointensity, T2 hyperintensity, T1 hypointensity, restriction, capsule, vascular invasion, and AFP elevation favor HCC." `
  -OriginalCaption $capTrap `
  -SourceLink 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10341099/' `
  -CaseContext 'Known chronic hepatic venous outflow obstruction; hepatospecific MRI shows a hypervascular nodule with washout-like delayed behavior but hepatobiliary hyperintensity.' `
  -CaseSummary 'Direct trap card: regenerative nodule in chronic Budd-Chiari can mimic HCC on dynamic phases; hepatobiliary phase prevents overcall.' `
  -CaseDifferential 'HCC; hepatic adenoma; true FNH; dysplastic nodule; necrotic regenerative nodule; hypervascular metastasis.' `
  -Summary $summaryCore `
  -Tags 'GI Liver Vascular BuddChiari RegenerativeNodule FNHLikeNodule HCCMimic HepatobiliaryPhase Eovist WashoutTrap'

$rows += New-UnknownRow `
  -ClinicalContext '49-year-old woman with chronic hepatic venous outflow obstruction. Multisequence liver MRI shows multiple hepatic lesions, including larger right-lobe lesions. Panel GILIVBCS04D' `
  -ImageHtml '<img src="PMC10378170_fig7_large_fnh_like_rn.jpg"><br>' `
  -AnnotatedHtml "<div class=""stackItem""><img src=""PMC10378170_fig7_large_fnh_like_rn.jpg""><div class=""stackCap"">$capLargeRn<br>How to read it: size alone should not force HCC in chronic Budd-Chiari. The benign pattern is multiple lesions, T1 hyperintensity, T2 iso-hypointensity, central scar/rim features, no convincing restricted diffusion, and HBP iso-hyperintensity. Source arrows/arrowhead are original; no extra arrows or crops were added.<br>$refFocal</div></div>" `
  -Question 'What is the likely diagnosis of the larger right-lobe lesions, and why should size alone not make you call HCC?' `
  -Answer "Large FNH-like regenerative nodules in chronic Budd-Chiari syndrome.<br><br>Why size is not enough: regenerative nodules in BCS can be large, increase in size, change enhancement, and even show washout-like behavior during follow-up. Those changes are not automatically malignant in this specific vascular liver disease context.<br><br>Benign clues in this panel: multiple lesions, T1 hyperintensity, T2 iso-hypointensity with central scar-like signal, no meaningful diffusion restriction compared with liver, arterial enhancement without persistent malignant behavior, portal/delayed isointensity, perinodular congested rim, and hepatobiliary iso/hyperintensity.<br><br>Differential to think through: HCC, hepatic adenoma, true FNH, hemangioma, dysplastic nodule, necrotic/infarcted regenerative nodule, hypervascular metastasis. The source also includes a hemangioma-like lesion as a separate lesion, which is a useful reminder not every lesion in the same liver is the same entity.<br><br>$refFocal" `
  -ImagingDifferentiation "Favor HCC when the lesion is solitary/new dominant, HBP hypointense, T2 hyperintense, T1 hypointense, diffusion restricting, capsule-forming, vascular invasive, or associated with rising AFP. Favor FNH-like RN when nodules are multiple, T1 iso/hyperintense, T2 iso/hypointense, HBP iso/hyperintense, and lack aggressive ancillary features." `
  -OriginalCaption $capLargeRn `
  -SourceLink 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10378170/' `
  -CaseContext '49-year-old woman with Budd-Chiari and multiple hepatic lesions on multisequence MRI.' `
  -CaseSummary 'Large FNH-like regenerative nodules can be an HCC mimic in chronic Budd-Chiari.' `
  -CaseDifferential 'HCC; adenoma; true FNH; hemangioma; dysplastic nodule; infarcted regenerative nodule; hypervascular metastasis.' `
  -Summary $summaryCore `
  -Tags 'GI Liver Vascular BuddChiari LargeRegenerativeNodule FNHLikeNodule MRI HCCMimic CentralScar HepatobiliaryPhase'

$rows += New-UnknownRow `
  -ClinicalContext '67-year-old woman with chronic hepatic venous outflow obstruction and a new focal liver lesion. Multisequence hepatospecific MRI panel GILIVBCS05E' `
  -ImageHtml '<img src="PMC10378170_fig6_hcc_bcs.jpg"><br>' `
  -AnnotatedHtml "<div class=""stackItem""><img src=""PMC10378170_fig6_hcc_bcs.jpg""><div class=""stackCap"">$capHcc<br>How to read it: this is the comparator pattern. HBP hypointensity plus T2 hyperintensity, T1 hypointensity, diffusion restriction, APHE, washout/capsule, and new solitary lesion behavior should override the benign-regenerative-nodule bias. Source arrows/asterisks are original; no extra arrows or crops were added.<br>$refFocal</div></div>" `
  -Question 'In the same vascular liver disease background, what features should make you worry for true malignancy rather than a benign regenerative nodule?' `
  -Answer "Hepatocellular carcinoma arising in Budd-Chiari syndrome.<br><br>Why this is different from the regenerative nodule trap: the lesion is new/solitary, T2 hyperintense, T1 hypointense, diffusion restricting, arterial enhancing, then shows washout with an enhancing capsule and hepatobiliary-phase hypointensity. That combination is much more concerning for HCC than a T1-bright/HBP-bright FNH-like regenerative nodule.<br><br>Key distinction: in BCS, arterial enhancement and washout alone are not enough because benign regenerative nodules can do that. Add the ancillary features: HBP hypointensity, restricted diffusion, T2 hyperintensity, T1 hypointensity, capsule, vascular invasion, growth pattern, and AFP.<br><br>Differential to think through: HCC, necrotic/infarcted regenerative nodule, adenoma, cholangiocarcinoma, hypervascular metastasis, hemangioma. Necrotic regenerative nodules can mimic HCC by T2 hyperintensity, T1 hypointensity, diffusion restriction, and HBP hypointensity; lack of enhancement through dynamic phases favors necrotic RN rather than HCC.<br><br>$refFocal" `
  -ImagingDifferentiation "HCC in BCS: often solitary/new dominant, T1 low, T2 high, DWI restriction, heterogeneous APHE, washout/capsule, HBP hypointensity, possible vascular invasion, and rising AFP. FNH-like RN: often multiple, T1 iso/high, T2 iso/low, little/no restriction, central scar/rim, and HBP iso/high." `
  -OriginalCaption $capHcc `
  -SourceLink 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10378170/' `
  -CaseContext '67-year-old woman with Budd-Chiari and a new focal liver lesion on multisequence MRI.' `
  -CaseSummary 'Comparator card for true HCC features in Budd-Chiari syndrome.' `
  -CaseDifferential 'HCC; infarcted regenerative nodule; adenoma; cholangiocarcinoma; hypervascular metastasis; hemangioma.' `
  -Summary $summaryCore `
  -Tags 'GI Liver Vascular BuddChiari HCC HepatocellularCarcinoma MRI DWI HepatobiliaryPhase Washout Capsule'

[System.IO.Directory]::CreateDirectory($outDir) | Out-Null
[System.IO.File]::WriteAllLines($tsvPath, $headers + $rows, [System.Text.UTF8Encoding]::new($false))

$attribution = @(
  'Budd-Chiari regenerative nodules Anki image/source attribution',
  '',
  $refImaging,
  'Images used: PMC10341099 Figure 1 and Figure 10.',
  '',
  $refFocal,
  'Images used: PMC10378170 Figure 1, Figure 6, and Figure 7.',
  '',
  'Source figures already contain their original arrows/callouts where present. No extra arrows, labels, or crops were added.'
)
[System.IO.File]::WriteAllLines($attributionPath, $attribution, [System.Text.UTF8Encoding]::new($false))

Write-Host $tsvPath
Write-Host "rows=$($rows.Count)"
