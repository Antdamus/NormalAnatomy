$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$OutDir = "C:\Users\josem.000\NormalAnatomy\anki_demyelination_mcp_mlf"
$mcpSource = Join-Path $OutDir "PMC4697118_fig2_mcp_ms.jpg"
$mlfSource = Join-Path $OutDir "PMC7510542_fig5_mlf_ms.jpg"

function Save-BitmapPng {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$Path
    )

    $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

$mcpImage = [System.Drawing.Bitmap]::FromFile($mcpSource)
try {
    Save-BitmapPng -Bitmap $mcpImage -Path (Join-Path $OutDir "brain_mri_posterior_fossa_01_no_arrows.png")
    Save-BitmapPng -Bitmap $mcpImage -Path (Join-Path $OutDir "brain_mri_posterior_fossa_01_arrow.png")
    Save-BitmapPng -Bitmap $mcpImage -Path (Join-Path $OutDir "brain_mri_posterior_fossa_02_source.png")
    Save-BitmapPng -Bitmap $mcpImage -Path (Join-Path $OutDir "brain_mri_posterior_fossa_02_source_back.png")
}
finally {
    $mcpImage.Dispose()
}

$mlfImage = [System.Drawing.Bitmap]::FromFile($mlfSource)
try {
    Save-BitmapPng -Bitmap $mlfImage -Path (Join-Path $OutDir "brain_mri_brainstem_01_no_arrows.png")
    Save-BitmapPng -Bitmap $mlfImage -Path (Join-Path $OutDir "brain_mri_brainstem_01_arrow.png")
    Save-BitmapPng -Bitmap $mlfImage -Path (Join-Path $OutDir "brain_mri_brainstem_02_source_full.png")
    Save-BitmapPng -Bitmap $mlfImage -Path (Join-Path $OutDir "brain_mri_brainstem_02_source_full_back.png")
}
finally {
    $mlfImage.Dispose()
}

$attribution = @"
Source image set:
- Middle cerebellar peduncle example: Figure 2 from "Middle cerebellar peduncles: Magnetic resonance imaging and pathophysiologic correlate." https://pmc.ncbi.nlm.nih.gov/articles/PMC4697118/
- Medial longitudinal fasciculus example: Figure 5 from "The Medial Longitudinal Fasciculus and Internuclear Opthalmoparesis: There's More Than Meets the Eye." https://pmc.ncbi.nlm.nih.gov/articles/PMC7510542/

Derived files in this folder:
- brain_mri_posterior_fossa_01_no_arrows.png
- brain_mri_posterior_fossa_01_arrow.png
- brain_mri_brainstem_01_no_arrows.png
- brain_mri_brainstem_01_arrow.png
- brain_mri_posterior_fossa_02_source.png
- brain_mri_posterior_fossa_02_source_back.png
- brain_mri_brainstem_02_source_full.png
- brain_mri_brainstem_02_source_full_back.png

Note:
- No extra arrows or markups were added. The MCP figure has no source arrow. The MLF figure keeps the source-provided yellow arrow on panel A.
"@

Set-Content -LiteralPath (Join-Path $OutDir "attribution.txt") -Value $attribution -Encoding UTF8
