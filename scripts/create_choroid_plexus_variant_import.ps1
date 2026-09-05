$ErrorActionPreference = "Stop"

$OutDir = "C:\Users\josem.000\NormalAnatomy\anki_choroid_plexus_variants"
$OutFile = Join-Path $OutDir "anki_choroid_plexus_variants.tsv"
$DeckPath = "Corebook::Neuro::Brain::Anatomy: CSF spaces::Ventricles and Choroid Plexus"

$CalcSourceUrl = "https://pmc.ncbi.nlm.nih.gov/articles/PMC11138340/"
$CalcTeachingUrl = "https://pmc.ncbi.nlm.nih.gov/articles/PMC8013049/"
$CalcReference = "Image: PMC11138340, Figure 1, representative choroid plexus calcifications in the atria of the lateral ventricles. $CalcSourceUrl Teaching reference: Whitehead et al., AJNR 2015, choroid plexus calcifications localized to the lateral ventricular glomus. $CalcTeachingUrl"

$XgTeachingUrl = "https://radiopaedia.org/cases/choroid-plexus-xanthogranulomas-1?lang=us"
$XgNcCommonsUrl = "https://nccommons.org/wiki/Category%3ARadiopaedia_case_78785_Choroid_plexus_xanthogranuloma"
$XgReference = "Image: Radiopaedia case 78785, choroid plexus xanthogranuloma, axial T2 image 12 via NC Commons. $XgNcCommonsUrl Teaching reference: Gaillard F, Radiopaedia rID 21101, choroid plexus xanthogranulomas. $XgTeachingUrl"

function New-UnknownRow {
    param(
        [string]$ClinicalContext,
        [string]$Image,
        [string]$AnnotatedImage,
        [string]$Question,
        [string]$EntityLabel,
        [string]$ImagingDifferentiation,
        [string]$Caption,
        [string]$Reference
    )

    $fields = @(
        $ClinicalContext,
        "<img src=""$Image""><br>",
        "<div class=""stackItem""><img src=""$AnnotatedImage""><div class=""stackCap"">$Caption<br>Reference: $Reference</div></div>",
        $Question,
        "",
        $EntityLabel,
        "",
        "",
        "$ImagingDifferentiation<br><br>Reference: $Reference",
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
        -ClinicalContext "Noncontrast axial CT normal variant CHOROIDCALC01" `
        -Image "choroid_plexus_calcification_no_arrows.png" `
        -AnnotatedImage "choroid_plexus_calcification_arrow.png" `
        -Question "Identify the normal calcified intraventricular structures at the atria." `
        -EntityLabel "Choroid plexus glomus calcifications" `
        -ImagingDifferentiation "What they are: physiologic calcifications in the glomi of the choroid plexus, located in the atria/trigones of the lateral ventricles. They are a common normal variant, typically bilateral/symmetric and should not be mistaken for hemorrhage or an intraventricular mass. Calcification is expected in the atrial choroid plexus; calcification in unusual choroid plexus locations or excessive calcification in a young patient is more concerning." `
        -Caption "Bilateral choroid plexus glomus calcifications in the lateral ventricular atria." `
        -Reference $CalcReference

    New-UnknownRow `
        -ClinicalContext "Axial T2 MRI normal variant CHOROIDXG01" `
        -Image "choroid_plexus_xanthogranuloma_no_arrows.png" `
        -AnnotatedImage "choroid_plexus_xanthogranuloma_arrow.png" `
        -Question "Identify the cystic/lobulated choroid plexus variant in the atria." `
        -EntityLabel "Choroid plexus xanthogranulomas / cystic lobulated glomi" `
        -ImagingDifferentiation "What they are: benign cystic or xanthogranulomatous change within the choroid plexus glomi of the lateral ventricular atria. The glomi can look lobulated or cystic, often with CSF-like or T2-bright internal signal and sometimes peripheral calcification. Key pitfall: these are usually incidental normal variants; recognize their symmetric atrial choroid plexus location so they are not overcalled as intraventricular tumor, infection, or hemorrhage." `
        -Caption "Bilateral cystic/lobulated choroid plexus glomi, compatible with xanthogranulomas." `
        -Reference $XgReference
)

$content = @(
    "#separator:tab",
    "#html:true",
    "#notetype:core_rad_notetype_v2",
    "#deck:$DeckPath"
) + $rows

Set-Content -LiteralPath $OutFile -Value $content -Encoding UTF8
