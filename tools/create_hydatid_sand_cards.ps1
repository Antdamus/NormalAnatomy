param(
    [string]$Root = (Resolve-Path -LiteralPath ".").Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$outDir = Join-Path $Root "anki_hydatid_sand"
$mediaDir = Join-Path $outDir "media"
New-Item -ItemType Directory -Force -Path $mediaDir | Out-Null

$pmcFigure = Join-Path $outDir "WJG-30-4115-g001.jpg"
$ctPlainSource = Join-Path $Root "radprimer_audit_queue\Cystic_Hepatic_Mass_2026-09-08T23-50-42-177Z\media\SDX-17_STATdx_plain_Cystic_Hepatic_Mass17.jpg"
$ctAnnotatedSource = Join-Path $Root "radprimer_audit_queue\Cystic_Hepatic_Mass_2026-09-08T23-50-42-177Z\media\SDX-17_STATdx_annotated_Cystic_Hepatic_Mass17_annot.jpg"

foreach ($required in @($pmcFigure, $ctPlainSource, $ctAnnotatedSource)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "Missing required source image: $required"
    }
}

Add-Type -AssemblyName System.Drawing

function Save-Crop {
    param(
        [string]$Source,
        [string]$Dest,
        [int]$X,
        [int]$Y,
        [int]$Width,
        [int]$Height,
        [int]$Scale = 3
    )

    $src = [System.Drawing.Bitmap]::FromFile($Source)
    try {
        $rect = New-Object System.Drawing.Rectangle($X, $Y, $Width, $Height)
        $crop = $src.Clone($rect, $src.PixelFormat)
        try {
            $scaled = New-Object System.Drawing.Bitmap($($Width * $Scale), $($Height * $Scale))
            try {
                $graphics = [System.Drawing.Graphics]::FromImage($scaled)
                try {
                    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                    $graphics.DrawImage($crop, 0, 0, $scaled.Width, $scaled.Height)
                }
                finally {
                    $graphics.Dispose()
                }
                $scaled.Save($Dest, [System.Drawing.Imaging.ImageFormat]::Jpeg)
            }
            finally {
                $scaled.Dispose()
            }
        }
        finally {
            $crop.Dispose()
        }
    }
    finally {
        $src.Dispose()
    }
}

$panels = @(
    @{ Name = "hydatid_sand_us_1.jpg"; X = 184; Y = 398; W = 180; H = 132 },
    @{ Name = "hydatid_sand_us_2.jpg"; X = 368; Y = 398; W = 181; H = 132 },
    @{ Name = "hydatid_sand_us_3.jpg"; X = 552; Y = 398; W = 182; H = 132 },
    @{ Name = "hydatid_daughter_us_1.jpg"; X = 185; Y = 534; W = 179; H = 130 },
    @{ Name = "hydatid_daughter_us_2.jpg"; X = 368; Y = 534; W = 181; H = 130 },
    @{ Name = "hydatid_daughter_us_3.jpg"; X = 552; Y = 534; W = 182; H = 130 },
    @{ Name = "hydatid_water_lily_us_1.jpg"; X = 185; Y = 667; W = 179; H = 133 },
    @{ Name = "hydatid_water_lily_us_2.jpg"; X = 368; Y = 667; W = 181; H = 133 },
    @{ Name = "hydatid_water_lily_us_3.jpg"; X = 552; Y = 667; W = 182; H = 133 }
)

foreach ($panel in $panels) {
    Save-Crop -Source $pmcFigure -Dest (Join-Path $mediaDir $panel.Name) -X $panel.X -Y $panel.Y -Width $panel.W -Height $panel.H
}

Copy-Item -LiteralPath $ctPlainSource -Destination (Join-Path $mediaDir "hydatid_daughter_ct_plain.jpg") -Force
Copy-Item -LiteralPath $ctAnnotatedSource -Destination (Join-Path $mediaDir "hydatid_daughter_ct_annotated.jpg") -Force

function Image-Stack {
    param([string[]]$Files)
    $count = $Files.Count
    $items = for ($i = 0; $i -lt $count; $i++) {
        "<div class=""stackItem""><div class=""stackIdx"">Image $($i + 1)/$count</div><img src=""$($Files[$i])""></div>"
    }
    return ($items -join "")
}

function Caption-Stack {
    param([object[]]$Items)
    $count = $Items.Count
    $html = for ($i = 0; $i -lt $count; $i++) {
        $file = $Items[$i].File
        $caption = $Items[$i].Caption
        "<div class=""stackItem""><div class=""stackIdx"">Image $($i + 1)/$count</div><img src=""$file""><div class=""stackCap"">$caption</div></div>"
    }
    return ($html -join "")
}

function Empty-Row {
    $row = New-Object string[] 22
    for ($i = 0; $i -lt $row.Length; $i++) {
        $row[$i] = ""
    }
    return $row
}

function Clean-Field {
    param([string]$Value)
    return (($Value -replace "`r?`n", "<br>") -replace "`t", " ")
}

$summary = "<b>Entity:</b> Hepatic cystic echinococcosis / hydatid cyst<br><b>Required pattern:</b> On ultrasound, learn the distinction between fine mobile hydatid sand, discrete daughter cysts, and a detached floating membrane. On CT/MRI, daughter cysts, a low-signal rim/pericyst, nonenhancing cystic architecture, and wall calcification support hydatid disease when the clinical setting fits."

$rows = @()

$row = Empty-Row
$row[0] = "Adult with cystic liver lesion and endemic exposure HX9K4S2MQL7"
$row[1] = Image-Stack @("hydatid_sand_us_1.jpg", "hydatid_sand_us_2.jpg", "hydatid_sand_us_3.jpg")
$row[2] = Caption-Stack @(
    @{ File = "hydatid_sand_us_1.jpg"; Caption = "Ultrasound CE1 pattern: fine echogenic hydatid sand/snowflake material is internal cyst content and may be subtle on a static image." },
    @{ File = "hydatid_sand_us_2.jpg"; Caption = "Hydatid sand is particulate internal echo material; it is not a separate daughter cyst." },
    @{ File = "hydatid_sand_us_3.jpg"; Caption = "Repositioning can make the dependent echogenic material more apparent." }
)
$row[3] = "Most likely diagnosis?"
$row[4] = "Hepatic cystic echinococcosis with hydatid sand"
$row[5] = "Hepatic hydatid cyst"
$row[7] = "Simple hepatic cyst<br>Hemorrhagic or proteinaceous hepatic cyst<br>Pyogenic or amebic abscess<br>Biliary cystic neoplasm<br>Cystic or necrotic metastasis"
$row[8] = "<b>Key imaging findings:</b> Fine internal echogenic material within an otherwise cystic lesion; the material may layer dependently or become more apparent with patient repositioning.<br><b>Key differentiators:</b> Simple cyst should be truly anechoic. Abscess usually has clinical infection plus thick/irregular wall or hyperemic/enhancing inflammatory change. Biliary cystic neoplasm is driven by enhancing septa/mural nodule rather than mobile particulate sand. Hemorrhagic/proteinaceous cyst can have internal echoes but lacks daughter cysts, membrane detachment, endemic context, and supportive serology."
$row[20] = $summary
$row[21] = "GI Liver HydatidCyst Echinococcosis Ultrasound"
$rows += ,$row

$row = Empty-Row
$row[0] = "Adult with complex multiseptated cystic liver lesion QN7V2PDL6R8"
$row[1] = Image-Stack @("hydatid_daughter_us_1.jpg", "hydatid_daughter_us_2.jpg", "hydatid_daughter_us_3.jpg")
$row[2] = Caption-Stack @(
    @{ File = "hydatid_daughter_us_1.jpg"; Caption = "Ultrasound CE2 pattern: multiple daughter cysts occupy a larger mother cyst." },
    @{ File = "hydatid_daughter_us_2.jpg"; Caption = "Daughter cysts can create wheel-spoke, petal, rosette, or honeycomb morphology." },
    @{ File = "hydatid_daughter_us_3.jpg"; Caption = "The important distinction is discrete cyst-within-cyst architecture, not just debris." }
)
$row[3] = "Most likely diagnosis?"
$row[4] = "Hepatic cystic echinococcosis with daughter cysts"
$row[5] = "Hepatic hydatid cyst"
$row[7] = "Biliary cystadenoma/cystadenocarcinoma<br>Pyogenic abscess with septations<br>Caroli disease<br>Cystic or necrotic metastasis<br>Polycystic liver disease"
$row[8] = "<b>Key imaging findings:</b> Multiple internal daughter cysts inside a larger mother cyst, producing cyst-within-cyst or honeycomb morphology.<br><b>Key differentiators:</b> Biliary cystic neoplasm may be multilocular but is usually evaluated for enhancing septa or mural nodules rather than true daughter cysts. Abscess septa/walls enhance and the patient is usually septic. Caroli disease communicates with the biliary tree and may show central-dot sign. Polycystic liver disease has many simple cysts rather than a mother cyst containing daughter cysts."
$row[20] = $summary
$row[21] = "GI Liver HydatidCyst Echinococcosis Ultrasound"
$rows += ,$row

$row = Empty-Row
$row[0] = "Adult with cystic hepatic lesion containing internal curvilinear material ML4R8XQ2CY5"
$row[1] = Image-Stack @("hydatid_water_lily_us_1.jpg", "hydatid_water_lily_us_2.jpg", "hydatid_water_lily_us_3.jpg")
$row[2] = Caption-Stack @(
    @{ File = "hydatid_water_lily_us_1.jpg"; Caption = "Ultrasound CE3a pattern: detached endocyst membrane floats or folds within cyst fluid." },
    @{ File = "hydatid_water_lily_us_2.jpg"; Caption = "The folded membrane produces the water-lily, ribbon, serpent, or snake-type appearance." },
    @{ File = "hydatid_water_lily_us_3.jpg"; Caption = "This is membrane detachment, not hydatid sand and not separate daughter cysts." }
)
$row[3] = "Most likely diagnosis?"
$row[4] = "Hepatic cystic echinococcosis with detached membrane / water-lily sign"
$row[5] = "Hepatic hydatid cyst"
$row[7] = "Hemorrhagic cyst with clot or retracting fibrin<br>Pyogenic or amebic abscess with debris<br>Biliary cystic neoplasm<br>Cystic/necrotic tumor"
$row[8] = "<b>Key imaging findings:</b> Floating or folded curvilinear membrane within a cystic lesion, reflecting detachment/collapse of the endocyst layer.<br><b>Key differentiators:</b> Clot and abscess debris can be irregular internal material, but they do not create the classic detached endocyst membrane pattern and usually need clinical/laboratory correlation. Biliary cystic neoplasm is assessed for enhancing septa/mural nodules. If imaging cannot confidently separate debris from membrane, report the uncertainty and recommend correlation for echinococcosis when epidemiology fits."
$row[20] = $summary
$row[21] = "GI Liver HydatidCyst Echinococcosis Ultrasound"
$rows += ,$row

$row = Empty-Row
$row[0] = "Adult immigrant patient with cystic hepatic lesions on contrast CT VZ6P9KL3HR2"
$row[1] = Image-Stack @("hydatid_daughter_ct_plain.jpg")
$row[2] = Caption-Stack @(
    @{ File = "hydatid_daughter_ct_annotated.jpg"; Caption = "Coronal contrast CT: large multiseptated cystic liver lesions with internal daughter cysts/scolices in the mother cysts." }
)
$row[3] = "Most likely diagnosis?"
$row[4] = "Hepatic cystic echinococcosis with multivesicular daughter cysts"
$row[5] = "Hepatic hydatid cyst"
$row[7] = "Pyogenic or amebic abscess<br>Biliary cystic neoplasm<br>Cystic/necrotic metastasis<br>Simple or hemorrhagic hepatic cyst"
$row[8] = "<b>Key imaging findings:</b> Nonenhancing multivesicular cystic liver lesions with internal daughter cyst architecture; wall calcification may be present in other cases and is best checked on noncontrast CT when suspected.<br><b>Key differentiators:</b> Abscess favors inflammatory wall/septal enhancement and systemic infection. Biliary cystic neoplasm raises concern when enhancing mural nodules or solid tissue are present. Cystic metastases usually fit known malignancy/multiplicity and do not form true daughter cysts. Imaging plus epidemiology and serology often resolves the diagnosis."
$row[20] = $summary
$row[21] = "GI Liver HydatidCyst Echinococcosis CT"
$rows += ,$row

$row = Empty-Row
$row[0] = "Hydatid ultrasound sign distinction S7D3NQ8WKL4"
$row[5] = "Hepatic hydatid cyst"
$row[14] = "On ultrasound, how is hydatid sand different from daughter cysts or a floating membrane?"
$row[15] = "Hydatid sand is fine internal echogenic particulate material, often dependent/mobile and more apparent with repositioning; it reflects hooklets and scolices from protoscolices. Daughter cysts are separate cystic structures within a mother cyst. A floating membrane is detached endocyst lining folded or floating in cyst fluid, producing the water-lily/ribbon/serpent-type appearance."
$row[20] = $summary
$row[21] = "GI Liver HydatidCyst Echinococcosis Ultrasound HighYield"
$rows += ,$row

$row = Empty-Row
$row[0] = "Hydatid modality pattern HM6Q2V8XKD3"
$row[5] = "Hepatic hydatid cyst"
$row[14] = "What is the source-supported modality pattern for hepatic hydatid cyst?"
$row[15] = "Ultrasound: cystic lesion that may show hydatid sand, daughter cysts, double wall, detached membrane/water-lily sign, or wall calcification in inactive cysts. CT: nonenhancing cystic lesion; daughter cysts/multivesicular architecture and curvilinear wall calcification support the diagnosis. MRI: cystic lesion with T2-bright fluid, low-signal rim/pericyst, variable daughter-cyst signal, and detached membranes in degenerating cysts. Mimics include simple cyst, abscess, biliary cystic neoplasm, hemorrhagic cyst, and cystic/necrotic tumor; serology and exposure history may be decisive."
$row[20] = $summary
$row[21] = "GI Liver HydatidCyst Echinococcosis Pattern Management"
$rows += ,$row

$row = Empty-Row
$row[0] = "Hydatid reporting trap BT8L3NQ6VR2"
$row[5] = "Hepatic hydatid cyst"
$row[12] = "What reporting trap matters when a cystic liver lesion has hydatid-type internal architecture?"
$row[13] = "Do not treat it as a routine simple cyst or ordinary abscess-drainage target without raising possible echinococcosis. Hydatid cyst puncture/spillage can cause anaphylaxis or peritoneal dissemination; management depends on cyst stage, symptoms, local expertise, and hydatid-specific protocol such as medical therapy, selected PAIR, or surgery."
$row[20] = $summary
$row[21] = "GI Liver HydatidCyst Echinococcosis Management"
$rows += ,$row

$tsv = Join-Path $outDir "anki_hydatid_sand.tsv"
$lines = foreach ($row in $rows) {
    if ($row.Count -ne 22) {
        throw "Bad row column count before write: $($row.Count)"
    }
    (($row | ForEach-Object { Clean-Field $_ }) -join "`t")
}
[System.IO.File]::WriteAllLines($tsv, $lines, [System.Text.UTF8Encoding]::new($false))

$fieldNames = @(
    "Clinical_Context",
    "Image",
    "Image_Annotated",
    "Question",
    "Most_Likely_Diagnosis",
    "Entity_Label",
    "Differential_Q",
    "Differentials",
    "Imaging_Differentiation",
    "Original_Caption",
    "Mechanism_Q",
    "Mechanism",
    "Boards_Trap_Q",
    "Boards_Trap",
    "High_Yield_Q",
    "High_Yield_A",
    "Radiopaedia_Link",
    "Radiopaedia_Case_Context",
    "Radiopaedia_Case_Summary",
    "Radiopaedia_Case_Differential",
    "summary",
    "Tags"
)
$ankiImport = Join-Path $outDir "anki_hydatid_sand_anki_import.tsv"
$importLines = @(
    "#separator:tab",
    "#html:true",
    "#notetype:core_rad_notetype_v2",
    "#deck:Corebook::GI::Liver::Cystic Hepatic Mass",
    "#columns:$($fieldNames -join "`t")"
) + $lines
[System.IO.File]::WriteAllLines($ankiImport, $importLines, [System.Text.UTF8Encoding]::new($false))

$sourceBasis = @"
# Hydatid Sand / Daughter Cysts / Water-Lily Sign Source Basis

Card output: anki_hydatid_sand.tsv
Deck target: Corebook::GI::Liver::Cystic Hepatic Mass
Note type: core_rad_notetype_v2

Local source support:
- radprimer_audit_queue/Cystic_Hepatic_Mass_2026-09-08T23-50-42-177Z/source_package.txt supports hepatic hydatid cyst as solitary/multiple cysts with peripheral wall +/- calcification; mother cyst contains hydatid matrix/sand and daughter cysts/scolices; STATdx image 17 shows coronal CECT with large multiseptated cystic masses and daughter cysts/scolices.
- radprimer_audit_queue/Cystic_Hepatic_Mass_2026-09-08T23-50-42-177Z/core_evidence.txt supports Core claim that hydatid cyst may contain daughter cysts or floating membrane and ultrasound may show daughter cysts, hydatid sand, and water-lily sign.

Open source support:
- Pictorial review of hepatic echinococcosis: Ultrasound imaging and differential diagnosis, PMC11514533. Figure 1 and surrounding text support CE1 hydatid sand/snowflake, CE2 daughter cysts/nested cysts, CE3a water-lily/ribbon signs.
- Hydatid Cyst of Spleen: A Diagnostic Challenge, PMC3560132. Text supports hydatid sand as hooklets/scolices from protoscolices, visibility with repositioning, sonographic daughter cysts/membranes/sand, CT/MRI patterns, and rupture/spillage/anaphylaxis concern.

Learner-facing fields intentionally omit source URLs, file names, and image-reference blocks.
"@
[System.IO.File]::WriteAllText((Join-Path $outDir "source_basis.txt"), $sourceBasis, [System.Text.UTF8Encoding]::new($false))

$validation = [System.Collections.Generic.List[string]]::new()
$validation.Add("Hydatid Anki TSV validation")
$validation.Add("Rows: $($rows.Count)")
$validation.Add("Columns per row: 22")

$badCols = @()
for ($i = 0; $i -lt $rows.Count; $i++) {
    $cols = ($lines[$i] -split "`t", -1).Count
    if ($cols -ne 22) {
        $badCols += "row $($i + 1): $cols columns"
    }
}
$validation.Add("Bad column rows: $(if ($badCols.Count) { $badCols -join '; ' } else { 'none' })")

$differentialTriggers = 0
foreach ($row in $rows) {
    if (-not [string]::IsNullOrWhiteSpace($row[6])) {
        $differentialTriggers++
    }
}
$validation.Add("Differential_Q populated rows: $differentialTriggers")

$allHtml = $rows | ForEach-Object { $_ -join " " } | Out-String
$imageRefs = [regex]::Matches($allHtml, '<img src="([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$missing = @()
foreach ($img in $imageRefs) {
    if (-not (Test-Path -LiteralPath (Join-Path $mediaDir $img))) {
        $missing += $img
    }
}
$validation.Add("Unique image refs: $($imageRefs.Count)")
$validation.Add("Missing image files: $(if ($missing.Count) { $missing -join ', ' } else { 'none' })")

$forbiddenTerms = @("Image reference:", "Image references:", "Source image link", "https://", "http://", "app.statdx.com", "app.radprimer.com", "SDX-")
$violations = @()
foreach ($term in $forbiddenTerms) {
    foreach ($row in $rows) {
        for ($i = 0; $i -lt 21; $i++) {
            $text = $row[$i] -replace '<img src="[^"]+">', ''
            if ($text -like "*$term*") {
                $violations += "$term in field $i"
            }
        }
    }
}
$validation.Add("Learner-facing source/bookkeeping violations: $(if ($violations.Count) { ($violations | Sort-Object -Unique) -join '; ' } else { 'none' })")
$validation.Add("Anki import header file: $ankiImport")

[System.IO.File]::WriteAllLines((Join-Path $outDir "validation_report.txt"), $validation, [System.Text.UTF8Encoding]::new($false))

Write-Host "Wrote $tsv"
Write-Host "Wrote $ankiImport"
Write-Host "Wrote $(Join-Path $outDir 'source_basis.txt')"
Write-Host "Wrote $(Join-Path $outDir 'validation_report.txt')"
