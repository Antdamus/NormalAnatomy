Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$OutDir = "C:\Users\josem.000\NormalAnatomy\anki_choroid_plexus_variants"

function Save-Crop {
    param(
        [string]$Source,
        [string]$Output,
        [int]$X,
        [int]$Y,
        [int]$W,
        [int]$H
    )

    $src = [System.Drawing.Bitmap]::FromFile($Source)
    try {
        $rect = New-Object System.Drawing.Rectangle($X, $Y, $W, $H)
        $bmp = $src.Clone($rect, $src.PixelFormat)
        try {
            $bmp.Save($Output, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $bmp.Dispose()
        }
    }
    finally {
        $src.Dispose()
    }
}

function Save-DoubleArrowed {
    param(
        [string]$Source,
        [string]$Output,
        [string]$Label,
        [int]$Arrow1FromX,
        [int]$Arrow1FromY,
        [int]$Arrow1ToX,
        [int]$Arrow1ToY,
        [int]$Arrow2FromX,
        [int]$Arrow2FromY,
        [int]$Arrow2ToX,
        [int]$Arrow2ToY,
        [string]$ColorName = "Gold"
    )

    $src = [System.Drawing.Image]::FromFile($Source)
    try {
        $bmp = New-Object System.Drawing.Bitmap($src.Width, $src.Height)
        try {
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            try {
                $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
                $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $g.DrawImage($src, 0, 0, $src.Width, $src.Height)

                $color = [System.Drawing.Color]::FromName($ColorName)
                $pen = New-Object System.Drawing.Pen($color, 6)
                $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
                $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor

                $shadowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 0, 0, 0), 10)
                $shadowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
                $shadowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor

                $g.DrawLine($shadowPen, $Arrow1FromX + 3, $Arrow1FromY + 3, $Arrow1ToX + 3, $Arrow1ToY + 3)
                $g.DrawLine($shadowPen, $Arrow2FromX + 3, $Arrow2FromY + 3, $Arrow2ToX + 3, $Arrow2ToY + 3)
                $g.DrawLine($pen, $Arrow1FromX, $Arrow1FromY, $Arrow1ToX, $Arrow1ToY)
                $g.DrawLine($pen, $Arrow2FromX, $Arrow2FromY, $Arrow2ToX, $Arrow2ToY)

                $fontSize = if ($src.Width -lt 400) { 23 } else { 28 }
                $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
                $textBrush = New-Object System.Drawing.SolidBrush($color)
                $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 0, 0, 0))

                $textX = 18
                $textY = 18
                $g.DrawString($Label, $font, $shadowBrush, $textX + 3, $textY + 3)
                $g.DrawString($Label, $font, $textBrush, $textX, $textY)
            }
            finally {
                if ($textBrush) { $textBrush.Dispose() }
                if ($shadowBrush) { $shadowBrush.Dispose() }
                if ($font) { $font.Dispose() }
                if ($pen) { $pen.Dispose() }
                if ($shadowPen) { $shadowPen.Dispose() }
                $g.Dispose()
            }
            $bmp.Save($Output, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $bmp.Dispose()
        }
    }
    finally {
        $src.Dispose()
    }
}

$calcClean = Join-Path $OutDir "choroid_plexus_calcification_no_arrows.png"
$calcArrow = Join-Path $OutDir "choroid_plexus_calcification_arrow.png"
$xgClean = Join-Path $OutDir "choroid_plexus_xanthogranuloma_no_arrows.png"
$xgArrow = Join-Path $OutDir "choroid_plexus_xanthogranuloma_arrow.png"

Save-Crop -Source (Join-Path $OutDir "PMC11138340_choroid_calcification_fig1.jpg") -Output $calcClean -X 0 -Y 0 -W 360 -H 365
Save-Crop -Source (Join-Path $OutDir "RP_78785_AxT2_12.jpg") -Output $xgClean -X 42 -Y 0 -W 380 -H 492

Save-DoubleArrowed `
    -Source $calcClean `
    -Output $calcArrow `
    -Label "calcified glomi" `
    -Arrow1FromX 92 -Arrow1FromY 168 -Arrow1ToX 153 -Arrow1ToY 217 `
    -Arrow2FromX 294 -Arrow2FromY 168 -Arrow2ToX 235 -Arrow2ToY 217 `
    -ColorName "Gold"

Save-DoubleArrowed `
    -Source $xgClean `
    -Output $xgArrow `
    -Label "cystic glomi" `
    -Arrow1FromX 55 -Arrow1FromY 300 -Arrow1ToX 118 -Arrow1ToY 348 `
    -Arrow2FromX 330 -Arrow2FromY 300 -Arrow2ToX 258 -Arrow2ToY 348 `
    -ColorName "DeepSkyBlue"

$attribution = @"
Source image set:
- Choroid plexus calcification CT: Figure 1 from PMC11138340, representative choroid plexus calcifications in the atria of the lateral ventricles. Article URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC11138340/
- Choroid plexus calcification teaching reference: Whitehead et al., AJNR 2015. Article URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC8013049/
- Choroid plexus xanthogranuloma MRI: Radiopaedia case 78785, axial T2 image 12 via NC Commons. Category URL: https://nccommons.org/wiki/Category%3ARadiopaedia_case_78785_Choroid_plexus_xanthogranuloma
- Choroid plexus xanthogranuloma teaching reference: Gaillard F, Radiopaedia rID 21101. Article URL: https://radiopaedia.org/cases/choroid-plexus-xanthogranulomas-1?lang=us

Derived files in this folder:
- choroid_plexus_calcification_no_arrows.png
- choroid_plexus_calcification_arrow.png
- choroid_plexus_xanthogranuloma_no_arrows.png
- choroid_plexus_xanthogranuloma_arrow.png
"@

Set-Content -LiteralPath (Join-Path $OutDir "attribution.txt") -Value $attribution -Encoding UTF8
