$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$OutDir = "C:\Users\josem.000\NormalAnatomy\anki_helical_portal_flow"
$Source = Join-Path $OutDir "PMC4701371_fig3_helical_portal_flow.jpg"
$FrontOut = Join-Path $OutDir "abdominal_us_portal_doppler_01_source.png"
$BackOut = Join-Path $OutDir "abdominal_us_portal_doppler_01_source_back.png"

function Save-BitmapPng {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$Path
    )

    $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

$image = [System.Drawing.Bitmap]::FromFile($Source)
try {
    Save-BitmapPng -Bitmap $image -Path $FrontOut
    Save-BitmapPng -Bitmap $image -Path $BackOut
}
finally {
    $image.Dispose()
}

$attribution = @"
Source image:
- Fig. 3 from "Altered Doppler flow patterns in cirrhosis patients: an overview." https://pmc.ncbi.nlm.nih.gov/articles/PMC4701371/
- The source figure has no arrows or added markers. Both derived card images preserve the figure as published.

Derived files:
- abdominal_us_portal_doppler_01_source.png
- abdominal_us_portal_doppler_01_source_back.png
"@

Set-Content -LiteralPath (Join-Path $OutDir "attribution.txt") -Value $attribution -Encoding UTF8
