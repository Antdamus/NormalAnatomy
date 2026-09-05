$ErrorActionPreference = 'Stop'

$outDir = Join-Path (Get-Location) 'anki_pyonephrosis'
$tsvPath = Join-Path $outDir 'anki_pyonephrosis.tsv'
$attributionPath = Join-Path $outDir 'attribution.txt'

$deck = 'Corebook::GU::Kidney::Infection::Pyonephrosis'
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

$refPictorial = 'Reference: Tamburrini S, Lugara M, Iannuzzi M, et al. Pyonephrosis Ultrasound and Computed Tomography Features: A Pictorial Review. Diagnostics. 2021;11(2):331. PMCID: PMC7921924. DOI: 10.3390/diagnostics11020331. Open access CC BY 4.0. https://pmc.ncbi.nlm.nih.gov/articles/PMC7921924/'
$refTbMri = 'Reference: Merchant S, Bharati A, Merchant N. Tuberculosis of the genitourinary system-Urinary tract tuberculosis: Renal tuberculosis-Part II. Indian J Radiol Imaging. 2013;23(1):64-77. PMCID: PMC3737619. DOI: 10.4103/0971-3026.113617. Open access CC BY-NC-SA 3.0. https://pmc.ncbi.nlm.nih.gov/articles/PMC3737619/'

$capFig1 = 'Source caption/readout: A 78 years old septic male patient. US longitudinal (a) and axial (b) view of the left kidney show high-grade hydronephrosis with gross dilatation of the renal pelvis and calyces filled by inhomogeneous urine (white arrow) and an extremely dilated inferior calyceal group filled by a huge ball of debris conglomerate (*). Axial (c) and MPR coronal CT (d) after IV contrast in cortical-medullary phase show high-grade hydronephrosis, diffuse parietal thickening of the calico-pelvic system (white arrow), fat stranding of perirenal and renal sinus fat, and a small amount of anterior free fluid (dashed arrow).'
$capFig3 = 'Source caption/readout: A 73 years old septic male patient. US longitudinal view of the left kidney (a,b) shows hydronephrosis with parietal thickening of the inferior calyceal group (*), dense peripheral echoes within the calyceal system (white arrow) with acoustic shadowing at low gain indicating gas-forming infection, and perirenal suffusion (dashed arrow). Axial contrast CT after stent placement shows drainage of the calico-pelvic system and mild perirenal fat stranding (*).'
$capFig4 = 'Source caption/readout: A 42 years old septic female patient. US longitudinal view (a,b) of the right kidney shows low/mild-grade hydronephrosis (white arrow) with sharply defined urine debris level (*).'
$capFig6 = 'Source caption/readout: An 83 years old septic woman. US longitudinal (a,b) view of the right kidney shows high-grade hydronephrosis with the calyceal-pelvic system completely occupied by inhomogeneous echogenic debris (with arrow). Perirenal fascia is thickened and perirenal fat is hyperechogenic and inhomogeneous (dashed arrow). Fluid over-collection is appreciated around the kidney (*), and free fluid was appreciated in the abdomen. Contrast CT in parenchymal (c) and urography phase (d) shows hydronephrosis with parietal thickening of the calyceal-pelvic system, multiple loculated perirenal fluid collections (white arrow), iliopsoas abscess (*), and urographic-phase extravasation into extrarenal collections due to abscessualization of the calyceal-pelvic system.'
$capMriT2 = 'Source caption/readout: Fat-saturated T2W coronal MRI image of TB pyonephrosis reveals a scarred renal pelvis and marked dilatation of the collecting system with severe parenchymal loss.'
$capMriDwi = 'Source caption/readout: Diffusion-weighted imaging (A) and corresponding ADC image (B) show restricted diffusion within a dilated right pelvicalyceal system, suggestive of pyonephrosis. Urothelial thickening is also present.'

$summaryCore = 'Pyonephrosis is infected obstructed hydronephrosis, effectively pus under pressure in the collecting system. High-yield imaging clues are hydronephrosis plus complex/infected contents: echogenic debris, fluid-debris or fluid-fluid levels, gas/dirty shadowing on US, thickened/enhancing urothelium, perinephric or renal sinus inflammatory stranding, complex/high attenuation collecting-system fluid, and complications such as perinephric/psoas abscess or urinary extravasation. It is a urologic emergency requiring urgent decompression plus antibiotics.'

$rows = @()

# Card 1: subtle ultrasound unknown.
$rows += Make-Row @(
  '42-year-old woman with fever and right flank pain. Renal ultrasound panel GUUSPY01A',
  '<img src="PMC7921924_fig4_us_fluid_debris_level.jpg"><br>',
  "<div class=""stackItem""><img src=""PMC7921924_fig4_us_fluid_debris_level.jpg""><div class=""stackCap"">$capFig4<br>How to read it: the key is not the degree of dilatation; it is that the mildly dilated collecting system is not clean anechoic urine. The dependent debris/fluid level means infected or complex collecting-system contents in the correct clinical setting. Source arrows/callouts are original; no extra arrows were added.<br>$refPictorial</div></div>",
  'What is the most likely diagnosis in this septic patient with this renal ultrasound appearance?',
  "Pyonephrosis.<br><br>Why: there is hydronephrosis plus a sharply defined urine-debris level. Simple hydronephrosis should look like clean anechoic urine in a dilated collecting system; echogenic/dependent debris turns the finding into infected obstructed urine until proven otherwise.<br><br>Important nuance: this can be present even with only mild hydronephrosis, so do not require massive collecting-system dilatation before raising the alarm.<br><br>Differential to think through: uncomplicated hydronephrosis, hematuria/clot in the collecting system, milk of calcium, fungal ball/debris, sloughed papilla, and parapelvic cyst. The septic clinical context plus internal debris/fluid level strongly favors pyonephrosis.<br><br>$refPictorial",
  '',
  '',
  '',
  "Differential to think through: simple hydronephrosis; collecting-system clot/hematuria; milk of calcium; fungal ball or sloughed papilla; parapelvic cyst.<br><br>How to separate: simple hydronephrosis is anechoic and lacks internal debris. Clot/debris may look complex, but pyonephrosis is favored when complex collecting-system contents occur with fever/sepsis and obstruction. A parapelvic cyst does not communicate with the collecting system and lacks urothelial/inflammatory context.",
  $capFig4,
  '',
  '',
  '',
  '',
  '',
  '',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC7921924/',
  '42-year-old septic female patient with right renal US showing low/mild-grade hydronephrosis and a sharply defined urine-debris level.',
  'Subtle US example: pyonephrosis can present as mild hydronephrosis with debris, not only massive dilatation.',
  '',
  $summaryCore,
  'GU Kidney Infection Pyonephrosis Ultrasound Hydronephrosis Debris FluidFluidLevel Urosepsis'
)

# Card 2: classic US + CT unknown.
$rows += Make-Row @(
  '78-year-old man with sepsis and left flank pain. Renal ultrasound and contrast CT panel GUUSCTPY02B',
  '<img src="PMC7921924_fig1_us_ct_highgrade_pyonephrosis.jpg"><br>',
  "<div class=""stackItem""><img src=""PMC7921924_fig1_us_ct_highgrade_pyonephrosis.jpg""><div class=""stackCap"">$capFig1<br>How to read it: US shows a dirty/inhomogeneous dilated collecting system rather than clean urine; CT then adds urothelial thickening and perirenal/renal sinus inflammatory change, which are the staging clues. Source arrows/callouts are original; no extra arrows were added.<br>$refPictorial</div></div>",
  'What diagnosis best unifies the US and CT findings in this septic patient?',
  "Pyonephrosis.<br><br>Why US sees it: pus, bacteria, cells, and sediment make the collecting-system urine echogenic/inhomogeneous instead of purely anechoic.<br><br>Why CT helps: CT may not directly prove pus, but in the right clinical setting it supports infected obstruction by showing hydronephrosis plus pelvic/calyceal wall thickening, perinephric or renal sinus fat stranding, complex collecting-system fluid, and complications.<br><br>Differential to think through: uncomplicated obstructive hydronephrosis, acute pyelonephritis without obstruction, renal/perinephric abscess, xanthogranulomatous pyelonephritis, hematuria/clot, and obstructing urothelial tumor. Hydronephrosis plus infected debris and urothelial/perinephric inflammation pushes this to pyonephrosis.<br><br>$refPictorial",
  '',
  '',
  '',
  "Differential to think through: uncomplicated obstructive hydronephrosis; acute pyelonephritis without obstruction; renal/perinephric abscess; xanthogranulomatous pyelonephritis; hematuria/clot; obstructing urothelial tumor.<br><br>How to separate: the discriminator is infected obstruction: dilated collecting system plus complex internal contents and inflammatory urothelial/perinephric change. Acute pyelonephritis can produce striated nephrogram/perinephric stranding but does not require purulent debris within an obstructed collecting system.",
  $capFig1,
  '',
  '',
  '',
  '',
  '',
  '',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC7921924/',
  '78-year-old septic male patient with high-grade hydronephrosis, inhomogeneous urine/debris on US, and CT urothelial thickening with perirenal/renal sinus inflammation.',
  'Classic multimodality US/CT pyonephrosis pattern.',
  '',
  $summaryCore,
  'GU Kidney Infection Pyonephrosis Ultrasound CT Hydronephrosis UrothelialThickening PerinephricStranding'
)

# Card 3: gas-forming infection unknown.
$rows += Make-Row @(
  '73-year-old man with sepsis after urinary obstruction. Renal ultrasound and post-drainage CT panel GUUSCTPY03C',
  '<img src="PMC7921924_fig3_us_gas_forming.jpg"><br>',
  "<div class=""stackItem""><img src=""PMC7921924_fig3_us_gas_forming.jpg""><div class=""stackCap"">$capFig3<br>How to read it: dirty acoustic shadowing within a dilated collecting system should raise concern for gas in infected urine. CT is used to localize gas and look for renal parenchymal/perinephric extension. Source arrows/callouts are original; no extra arrows were added.<br>$refPictorial</div></div>",
  'What complication/pattern should this ultrasound appearance raise concern for in a septic obstructed kidney?',
  "Pyonephrosis with gas-forming infection, on the emphysematous UTI spectrum.<br><br>Why: dirty shadowing/dense internal echoes in a hydronephrotic collecting system can represent gas mixed with infected urine/debris. Gas is highly abnormal unless explained by recent instrumentation.<br><br>What CT must answer: is gas limited to the collecting system (emphysematous pyelitis/collecting-system infection), or is there renal parenchymal/perinephric gas suggesting emphysematous pyelonephritis with higher severity?<br><br>Differential to think through: shadowing calculus/staghorn stone, recent instrumentation or refluxed air, emphysematous pyelitis, emphysematous pyelonephritis, and gas-containing abscess. The combination of sepsis, obstruction, and dirty intraluminal echoes makes gas-forming pyonephrosis urgent.<br><br>$refPictorial",
  '',
  '',
  '',
  "Differential to think through: staghorn calculus or shadowing stone; recent instrumentation/refluxed air; emphysematous pyelitis; emphysematous pyelonephritis; gas-containing renal/perinephric abscess.<br><br>How to separate: stones produce clean echogenic foci with posterior shadowing but do not explain dirty gas-like reverberation within infected urine. Instrumentation can introduce air; absence of instrumentation plus sepsis favors gas-forming infection. CT localizes gas to collecting system versus parenchyma/perinephric tissues.",
  $capFig3,
  '',
  '',
  '',
  '',
  '',
  '',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC7921924/',
  '73-year-old septic male patient with hydronephrosis, dense peripheral echoes/acoustic shadowing suggesting gas-forming infection, and post-stent CT showing drainage with mild perirenal stranding.',
  'US gas-forming infection example with CT staging role.',
  '',
  $summaryCore,
  'GU Kidney Infection Pyonephrosis Ultrasound CT GasFormingInfection EmphysematousUTI DirtyShadowing'
)

# Card 4: extrarenal extension unknown.
$rows += Make-Row @(
  '83-year-old woman with sepsis and right flank pain. Renal US plus contrast CT/parenchymal and urographic phases panel GUCTPY04D',
  '<img src="PMC7921924_fig6_us_ct_extrarenal_extension.jpg"><br>',
  "<div class=""stackItem""><img src=""PMC7921924_fig6_us_ct_extrarenal_extension.jpg""><div class=""stackCap"">$capFig6<br>How to read it: the collecting system is filled with echogenic debris on US, but the board-level danger is the surrounding fluid/abscess and urographic-phase leak. CT stages the extrarenal spread that ultrasound can underestimate. Source arrows/callouts are original; no extra arrows were added.<br>$refPictorial</div></div>",
  'What diagnosis and major complication pattern are shown?',
  "Complicated pyonephrosis with extrarenal extension, including perirenal collections, iliopsoas abscess, and urinary extravasation from an abscessed collecting system.<br><br>Why: this is not just dilated urine. The calyceal-pelvic system is occupied by echogenic debris, the perirenal fascia/fat are abnormal, and CT shows loculated extrarenal collections plus delayed/urographic-phase extravasation.<br><br>Why the modality matters: ultrasound can suggest debris and nearby fluid, but CT defines the extent of retroperitoneal/perirenal spread and helps plan urgent drainage.<br><br>Differential to think through: uncomplicated hydronephrosis with urinoma, renal/perinephric abscess without obstruction, xanthogranulomatous pyelonephritis, ruptured calyx from obstruction, renal malignancy with necrosis, and retroperitoneal abscess from non-urinary source.<br><br>$refPictorial",
  '',
  '',
  '',
  "Differential to think through: uncomplicated hydronephrosis with urinoma; renal/perinephric abscess without obstructed infected collecting system; xanthogranulomatous pyelonephritis; ruptured calyx from obstruction; necrotic renal malignancy; non-urinary retroperitoneal abscess.<br><br>How to separate: the decisive pattern is obstructed infected collecting-system contents plus extrarenal inflammatory collections. Urographic-phase extravasation links the collections to the urinary collecting system, while perirenal/psoas abscess shows spread beyond simple obstruction.",
  $capFig6,
  '',
  '',
  '',
  '',
  '',
  '',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC7921924/',
  '83-year-old septic woman with right renal US showing the collecting system occupied by echogenic debris and CT showing perirenal collections, iliopsoas abscess, and urographic-phase urinary extravasation.',
  'Complicated pyonephrosis with extrarenal extension.',
  '',
  $summaryCore,
  'GU Kidney Infection Pyonephrosis CT Ultrasound ExtrarenalExtension PerinephricAbscess PsoasAbscess UrinaryExtravasation'
)

# Card 5: MRI/DWI unknown.
$rows += Make-Row @(
  'Adult with chronic/recurrent urinary infection symptoms and renal impairment. Renal MRI T2 and DWI/ADC panel GUMRIPY05E',
  '<img src="PMC3737619_fig20_mri_t2_tb_pyonephrosis.jpg"><br><img src="PMC3737619_fig22_mri_dwi_adc_pyonephrosis.jpg"><br>',
  "<div class=""stackItem""><img src=""PMC3737619_fig20_mri_t2_tb_pyonephrosis.jpg""><div class=""stackCap"">$capMriT2<br>How to read it: heavily T2-weighted MRI shows the morphology: severely dilated collecting system, scarred pelvis, and marked parenchymal loss.</div></div><br><div class=""stackItem""><img src=""PMC3737619_fig22_mri_dwi_adc_pyonephrosis.jpg""><div class=""stackCap"">$capMriDwi<br>How to read it: diffusion restriction in the dilated pelvicalyceal system supports pus/debris rather than simple urine. This source case is TB-related, but DWI restriction is not specific for tuberculosis.<br>$refTbMri</div></div>",
  'What diagnosis is suggested by this MRI pattern, and what does diffusion add?',
  "Pyonephrosis; in the source article, tuberculous pyonephrosis.<br><br>What T2 adds: marked collecting-system dilatation with scarred renal pelvis and severe parenchymal loss shows chronic destructive obstructive/infectious collecting-system disease.<br><br>What DWI/ADC adds: pus and cellular debris restrict diffusion, so the dilated pelvicalyceal system can look bright on DWI with low signal on ADC. Simple hydronephrosis is mostly free fluid and should not show the same restricted-diffusion pus pattern.<br><br>Important limitation: restricted diffusion supports pyonephrosis but is not specific for TB. Use ureteral/urothelial thickening, strictures, uneven caliectasis, calcification, clinical context, and microbiology to decide tuberculous versus non-tuberculous infection.<br><br>Differential to think through: simple hydronephrosis, chronic obstructive uropathy, renal TB with strictures/caseation, renal abscess, xanthogranulomatous pyelonephritis, and multiloculated cystic renal mass.<br><br>$refTbMri",
  '',
  '',
  '',
  "Differential to think through: simple hydronephrosis; chronic obstructive uropathy; renal tuberculosis with strictures/caseation; renal abscess; xanthogranulomatous pyelonephritis; multiloculated cystic renal mass.<br><br>How to separate: DWI is the key separator from simple hydronephrosis: purulent/cellular debris restricts diffusion, while simple urine should have freer diffusion. TB is suggested by scarred pelvis, strictures/uneven caliectasis, urothelial thickening, calcification, and chronic context, but DWI restriction alone is not TB-specific.",
  "$capMriT2<br>$capMriDwi",
  '',
  '',
  '',
  '',
  '',
  '',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC3737619/',
  'MRI examples from renal tuberculosis review: T2 coronal image of TB pyonephrosis and DWI/ADC showing restricted diffusion within a dilated right pelvicalyceal system.',
  'MRI/DWI card emphasizing that pus/debris restricts diffusion and can help distinguish pyonephrosis from simple hydronephrosis.',
  '',
  $summaryCore,
  'GU Kidney Infection Pyonephrosis MRI DWI ADC Tuberculosis Hydronephrosis RestrictedDiffusion'
)

# Card 6: management/trap card.
$rows += Make-Row @(
  'Septic patient with flank pain and an obstructed collecting system containing complex material GUHY06F',
  '',
  '',
  '',
  '',
  'Pyonephrosis management trap: obstructed infected collecting system',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  'What is the key management implication when imaging suggests infected material within an obstructed collecting system?',
  "Treat it as a urologic emergency: urgent decompression plus antibiotics, usually by percutaneous nephrostomy or retrograde ureteral stent depending on anatomy, stability, and local expertise.<br><br>Why antibiotics alone are not enough: the infected collecting system is obstructed and pressurized, so source control is poor until the system is drained. Delay risks septic shock, renal destruction, perinephric/psoas abscess, rupture/extravasation, fistula, nephrectomy, or death.<br><br>Imaging triggers: hydronephrosis with echogenic debris or fluid-debris level on US; gas/dirty shadowing; CT urothelial thickening/enhancement, perinephric stranding, complex/high-attenuation collecting-system fluid, gas-fluid/fluid-fluid levels, or extrarenal collections.<br><br>$refPictorial",
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC7921924/',
  'Septic obstructed collecting system with complex/infected material.',
  'High-yield management trap: pyonephrosis requires source control, not antibiotics alone.',
  '',
  $summaryCore,
  'GU Kidney Infection Pyonephrosis Urosepsis EmergencyDecompression Nephrostomy UreteralStent BoardsTrap'
)

[System.IO.Directory]::CreateDirectory($outDir) | Out-Null
[System.IO.File]::WriteAllLines($tsvPath, $headers + $rows, [System.Text.UTF8Encoding]::new($false))

$fixPath = Join-Path $outDir 'anki_pyonephrosis_fix_row6.tsv'
[System.IO.File]::WriteAllLines($fixPath, $headers + @($rows[-1]), [System.Text.UTF8Encoding]::new($false))

$attribution = @(
  'Pyonephrosis Anki image/source attribution',
  '',
  $refPictorial,
  'Images used: PMC7921924 Figure 1, Figure 3, Figure 4, Figure 6.',
  '',
  $refTbMri,
  'Images used: PMC3737619 Figure 20 and Figure 22.',
  '',
  'Source images already contain their original arrows/callouts where present. No extra arrows, labels, or crops were added.'
)
[System.IO.File]::WriteAllLines($attributionPath, $attribution, [System.Text.UTF8Encoding]::new($false))

Write-Host $tsvPath
Write-Host $fixPath
Write-Host "rows=$($rows.Count)"
