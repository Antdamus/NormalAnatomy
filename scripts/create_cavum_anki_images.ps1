Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$OutDir = "C:\Users\josem.000\NormalAnatomy\anki_cavum_images"

function Save-Crop {
    param(
        [string]$Source,
        [string]$Output,
        [int]$X,
        [int]$Y,
        [int]$W,
        [int]$H
    )

    $src = [System.Drawing.Image]::FromFile($Source)
    try {
        $rect = New-Object System.Drawing.Rectangle($X, $Y, $W, $H)
        $bmp = New-Object System.Drawing.Bitmap($W, $H)
        try {
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            try {
                $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $g.DrawImage($src, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
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

function Save-Arrowed {
    param(
        [string]$Source,
        [string]$Output,
        [string]$Label,
        [int]$ArrowFromX,
        [int]$ArrowFromY,
        [int]$ArrowToX,
        [int]$ArrowToY,
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
                $pen = New-Object System.Drawing.Pen($color, 7)
                $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
                $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor

                $shadowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 0, 0, 0), 11)
                $shadowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
                $shadowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor

                $g.DrawLine($shadowPen, $ArrowFromX + 3, $ArrowFromY + 3, $ArrowToX + 3, $ArrowToY + 3)
                $g.DrawLine($pen, $ArrowFromX, $ArrowFromY, $ArrowToX, $ArrowToY)

                $font = New-Object System.Drawing.Font("Arial", 30, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
                $textBrush = New-Object System.Drawing.SolidBrush($color)
                $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(210, 0, 0, 0))

                $textX = [Math]::Max(18, [Math]::Min($ArrowFromX - 18, $src.Width - 360))
                $textY = [Math]::Max(18, [Math]::Min($ArrowFromY - 46, $src.Height - 60))
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

$cspClean = Join-Path $OutDir "cavum_septi_pellucidi_no_arrows.png"
$cspArrow = Join-Path $OutDir "cavum_septi_pellucidi_arrow.png"
$vergaeClean = Join-Path $OutDir "cavum_vergae_no_arrows.png"
$vergaeArrow = Join-Path $OutDir "cavum_vergae_arrow.png"
$cviClean = Join-Path $OutDir "cavum_veli_interpositi_no_arrows.png"
$cviArrow = Join-Path $OutDir "cavum_veli_interpositi_arrow.png"

Save-Crop -Source (Join-Path $OutDir "48256-53401_A1.jpg") -Output $cspClean -X 30 -Y 35 -W 750 -H 825
Save-Crop -Source (Join-Path $OutDir "48256-53401_A1.jpg") -Output $vergaeClean -X 835 -Y 35 -W 735 -H 825
Save-Crop -Source (Join-Path $OutDir "48256-53402_A1.jpg") -Output $cviClean -X 20 -Y 45 -W 710 -H 820

Save-Arrowed -Source $cspClean -Output $cspArrow -Label "CSP" -ArrowFromX 245 -ArrowFromY 180 -ArrowToX 380 -ArrowToY 325 -ColorName "Gold"
Save-Arrowed -Source $vergaeClean -Output $vergaeArrow -Label "Cavum vergae" -ArrowFromX 510 -ArrowFromY 155 -ArrowToX 385 -ArrowToY 385 -ColorName "Tomato"
Save-Arrowed -Source $cviClean -Output $cviArrow -Label "CVI" -ArrowFromX 185 -ArrowFromY 300 -ArrowToX 365 -ArrowToY 500 -ColorName "DeepSkyBlue"

$attribution = @"
Source image set:
Vitalii Rogalskyi, Cavum septum pellucidum, cavum vergae, and cavum veli interpositi (annotated CT). Radiopaedia.org, rID:48256.
NC Commons file pages:
- https://nccommons.org/wiki/File:Cavum_septum_pellucidum,_cavum_vergae,_and_cavum_veli_interpositi_(annotated_CT)_(Radiopaedia_48256-53401_A_1).jpg
- https://nccommons.org/wiki/File:Cavum_septum_pellucidum,_cavum_vergae,_and_cavum_veli_interpositi_(annotated_CT)_(Radiopaedia_48256-53402_A_1).jpg
License: CC BY-NC-SA 3.0.

Derived files in this folder:
- cavum_septi_pellucidi_no_arrows.png
- cavum_septi_pellucidi_arrow.png
- cavum_vergae_no_arrows.png
- cavum_vergae_arrow.png
- cavum_veli_interpositi_no_arrows.png
- cavum_veli_interpositi_arrow.png
"@

Set-Content -LiteralPath (Join-Path $OutDir "attribution.txt") -Value $attribution -Encoding UTF8
