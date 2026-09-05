Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$OutDir = "C:\Users\josem.000\NormalAnatomy\anki_vein_of_galen_malformation"

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

function Draw-Arrow {
    param(
        [System.Drawing.Graphics]$Graphics,
        [int]$FromX,
        [int]$FromY,
        [int]$ToX,
        [int]$ToY,
        [System.Drawing.Color]$Color
    )

    $shadowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(185, 0, 0, 0), 10)
    $shadowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $shadowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor

    $pen = New-Object System.Drawing.Pen($Color, 6)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor

    try {
        $Graphics.DrawLine($shadowPen, $FromX + 3, $FromY + 3, $ToX + 3, $ToY + 3)
        $Graphics.DrawLine($pen, $FromX, $FromY, $ToX, $ToY)
    }
    finally {
        $pen.Dispose()
        $shadowPen.Dispose()
    }
}

function Draw-Label {
    param(
        [System.Drawing.Graphics]$Graphics,
        [string]$Text,
        [int]$X,
        [int]$Y,
        [int]$Size,
        [System.Drawing.Color]$Color
    )

    $font = New-Object System.Drawing.Font("Arial", $Size, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = New-Object System.Drawing.SolidBrush($Color)
    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 0, 0, 0))

    try {
        $Graphics.DrawString($Text, $font, $shadowBrush, $X + 3, $Y + 3)
        $Graphics.DrawString($Text, $font, $textBrush, $X, $Y)
    }
    finally {
        $textBrush.Dispose()
        $shadowBrush.Dispose()
        $font.Dispose()
    }
}

function Save-ClinicalArrowed {
    param(
        [string]$Source,
        [string]$Output
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

                Draw-Label -Graphics $g -Text "persistent MPV" -X 22 -Y 24 -Size 26 -Color ([System.Drawing.Color]::Gold)
                Draw-Arrow -Graphics $g -FromX 152 -FromY 74 -ToX 290 -ToY 245 -Color ([System.Drawing.Color]::Gold)

                Draw-Label -Graphics $g -Text "falcine sinus" -X 345 -Y 30 -Size 25 -Color ([System.Drawing.Color]::DeepSkyBlue)
                Draw-Arrow -Graphics $g -FromX 425 -FromY 72 -ToX 430 -ToY 205 -Color ([System.Drawing.Color]::DeepSkyBlue)

                Draw-Label -Graphics $g -Text "straight sinus absent/hypoplastic" -X 110 -Y 500 -Size 22 -Color ([System.Drawing.Color]::Tomato)
                Draw-Arrow -Graphics $g -FromX 338 -FromY 493 -ToX 392 -ToY 320 -Color ([System.Drawing.Color]::Tomato)
            }
            finally {
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

function Save-SchematicArrowed {
    param(
        [string]$Source,
        [string]$Output
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

                Draw-Label -Graphics $g -Text "persistent MPV" -X 28 -Y 506 -Size 29 -Color ([System.Drawing.Color]::Gold)
                Draw-Arrow -Graphics $g -FromX 220 -FromY 508 -ToX 363 -ToY 350 -Color ([System.Drawing.Color]::Gold)

                $boxPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(230, 255, 215, 0), 5)
                try {
                    $g.DrawRectangle($boxPen, 331, 190, 66, 260)
                }
                finally {
                    $boxPen.Dispose()
                }
            }
            finally {
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

$clinicalClean = Join-Path $OutDir "vogm_sagittal_mri_no_arrows.png"
$clinicalArrow = Join-Path $OutDir "vogm_sagittal_mri_arrow.png"
$schematicClean = Join-Path $OutDir "vogm_embryology_schematic.png"
$schematicArrow = Join-Path $OutDir "vogm_embryology_schematic_arrow.png"

Save-Crop -Source (Join-Path $OutDir "PMC3208917_fig6_sagittal_mri.jpg") -Output $clinicalClean -X 0 -Y 0 -W 566 -H 569
Save-Crop -Source (Join-Path $OutDir "PMC3208917_fig1_embryology.jpg") -Output $schematicClean -X 0 -Y 0 -W 730 -H 557

Save-ClinicalArrowed -Source $clinicalClean -Output $clinicalArrow
Save-SchematicArrowed -Source $schematicClean -Output $schematicArrow

$attribution = @"
Source image set:
- Pediatric aneurysms and vein of Galen malformations. PMC3208917.
- Figure 1: Schematic drawing of the afferent choroidal, collicular arteries, and efferent venous channels during vascularization of the basal ganglia and thalamus.
- Figure 6: Sagittal T1-weighted MRI showing partial agenesis of the proximal straight sinus and alternate venous drainage through the falcine sinus into the superior sagittal sinus from the vein of Galen region.
- Article URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC3208917/

Derived files in this folder:
- vogm_sagittal_mri_no_arrows.png
- vogm_sagittal_mri_arrow.png
- vogm_embryology_schematic.png
- vogm_embryology_schematic_arrow.png
"@

Set-Content -LiteralPath (Join-Path $OutDir "attribution.txt") -Value $attribution -Encoding UTF8
