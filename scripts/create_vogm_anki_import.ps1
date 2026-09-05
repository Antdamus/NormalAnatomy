$ErrorActionPreference = "Stop"

$OutDir = "C:\Users\josem.000\NormalAnatomy\anki_vein_of_galen_malformation"
$OutFile = Join-Path $OutDir "anki_vogm_anatomic_basis.tsv"
$DeckPath = "Corebook::Neuro::Brain::Anatomy: CSF spaces::Ventricles and Choroid Plexus"

$SourceUrl = "https://pmc.ncbi.nlm.nih.gov/articles/PMC3208917/"
$Reference = "Pediatric aneurysms and vein of Galen malformations, PMC3208917. The article describes VOGM as persistence of the median prosencephalic vein of Markowski, with associated dural sinus anomalies including hypoplastic/absent straight sinus and falcine sinus drainage. $SourceUrl"

function New-UnknownRow {
    param(
        [string]$ClinicalContext,
        [string]$Image,
        [string]$AnnotatedClinicalImage,
        [string]$AnnotatedSchematicImage,
        [string]$Question,
        [string]$EntityLabel,
        [string]$ImagingDifferentiation,
        [string]$ClinicalCaption,
        [string]$SchematicCaption,
        [string]$Reference
    )

    $annotatedStack = "<div class=""stackItem""><img src=""$AnnotatedClinicalImage""><div class=""stackCap"">$ClinicalCaption<br>Reference: $Reference</div></div><div class=""stackItem""><img src=""$AnnotatedSchematicImage""><div class=""stackCap"">$SchematicCaption<br>Reference: $Reference</div></div>"

    $fields = @(
        $ClinicalContext,
        "<img src=""$Image""><br>",
        $annotatedStack,
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
        -ClinicalContext "Sagittal MRI developmental venous malformation VOGMBASE01" `
        -Image "vogm_sagittal_mri_no_arrows.png" `
        -AnnotatedClinicalImage "vogm_sagittal_mri_arrow.png" `
        -AnnotatedSchematicImage "vogm_embryology_schematic_arrow.png" `
        -Question "What is the anatomic basis of a vein of Galen malformation?" `
        -EntityLabel "Vein of Galen malformation: persistent median prosencephalic vein" `
        -ImagingDifferentiation "Anatomic basis: a vein of Galen malformation is centered on persistence of the primitive median prosencephalic vein of Markowski, which remains as the outlet for diencephalic and choroidal venous drainage. It is therefore not simply an abnormality or aneurysm of the mature normal vein of Galen. Associated venous-pattern clues include persistent falcine sinus drainage and an absent or hypoplastic straight sinus." `
        -ClinicalCaption "Sagittal MRI example: enlarged midline embryonic venous pouch/outlet with falcine sinus drainage toward the superior sagittal sinus; the straight sinus is absent or hypoplastic." `
        -SchematicCaption "Embryologic basis: the persistent median prosencephalic vein of Markowski is the primitive venous channel underlying the malformation." `
        -Reference $Reference
)

$content = @(
    "#separator:tab",
    "#html:true",
    "#notetype:core_rad_notetype_v2",
    "#deck:$DeckPath"
) + $rows

Set-Content -LiteralPath $OutFile -Value $content -Encoding UTF8
