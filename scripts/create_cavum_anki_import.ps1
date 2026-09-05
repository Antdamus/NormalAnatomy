$ErrorActionPreference = "Stop"

$OutDir = "C:\Users\josem.000\NormalAnatomy\anki_cavum_images"
$OutFile = Join-Path $OutDir "anki_cavum_cards.tsv"
$DeckPath = "Corebook::Neuro::Brain::Anatomy: CSF spaces::Ventricles and Choroid Plexus"
$SourceUrl = "https://radiopaedia.org/cases/cavum-septum-pellucidum-cavum-vergae-and-cavum-veli-interpositi-annotated-ct"
$Attribution = "Vitalii Rogalskyi, Radiopaedia rID 48256, CC BY-NC-SA 3.0. $SourceUrl"

function New-UnknownRow {
    param(
        [string]$ClinicalContext,
        [string]$Image,
        [string]$AnnotatedImage,
        [string]$Question,
        [string]$EntityLabel,
        [string]$ImagingDifferentiation,
        [string]$Caption
    )

    $fields = @(
        $ClinicalContext,
        "<img src=""$Image""><br>",
        "<div class=""stackItem""><img src=""$AnnotatedImage""><div class=""stackCap"">$Caption<br>Reference: $Attribution</div></div>",
        $Question,
        "",
        $EntityLabel,
        "",
        "",
        "$ImagingDifferentiation<br><br>Reference: $Attribution",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
    )

    if ($fields.Count -ne 22) {
        throw "Expected 22 fields, got $($fields.Count)"
    }

    return ($fields -join "`t")
}

$rows = @(
    New-UnknownRow `
        -ClinicalContext "Noncontrast axial CT normal variant CAVUMCSP01" `
        -Image "cavum_septi_pellucidi_no_arrows.png" `
        -AnnotatedImage "cavum_septi_pellucidi_arrow.png" `
        -Question "Identify the normal midline CSF-space variant shown." `
        -EntityLabel "Cavum septi pellucidi" `
        -ImagingDifferentiation "What it is: a CSF-like potential space between the leaflets of the septum pellucidum, anterior to the columns of the fornix, between the frontal horns of the lateral ventricles. It is a normal variant and is not part of the ventricular system." `
        -Caption "Cavum septi pellucidi."

    New-UnknownRow `
        -ClinicalContext "Noncontrast axial CT normal variant CAVUMVERGAE01" `
        -Image "cavum_vergae_no_arrows.png" `
        -AnnotatedImage "cavum_vergae_arrow.png" `
        -Question "Identify the posterior midline CSF-space variant shown." `
        -EntityLabel "Cavum vergae" `
        -ImagingDifferentiation "What it is: the posterior continuation of a cavum septi pellucidi, extending posterior to the columns of the fornix. It is a CSF-like normal variant rather than a true ventricle." `
        -Caption "Cavum vergae."

    New-UnknownRow `
        -ClinicalContext "Noncontrast axial CT normal variant CAVUMCVI01" `
        -Image "cavum_veli_interpositi_no_arrows.png" `
        -AnnotatedImage "cavum_veli_interpositi_arrow.png" `
        -Question "Identify the CSF-space variant near the roof of the third ventricle." `
        -EntityLabel "Cavum veli interpositi" `
        -ImagingDifferentiation "What it is: dilatation of the cistern of the velum interpositum, a triangular CSF space in the roof region of the third ventricle, below the fornices and above the internal cerebral veins/tela choroidea. When large, it can mimic a pineal-region cyst." `
        -Caption "Cavum veli interpositi."
)

$content = @(
    "#separator:tab",
    "#html:true",
    "#notetype:core_rad_notetype_v2",
    "#deck:$DeckPath"
) + $rows

Set-Content -LiteralPath $OutFile -Value $content -Encoding UTF8
