$ErrorActionPreference = "Stop"

$OutDir = "C:\Users\josem.000\NormalAnatomy\anki_demyelination_mcp_mlf"
$OutFile = Join-Path $OutDir "anki_demyelination_mcp_mlf.tsv"
$MlfRepairFile = Join-Path $OutDir "repair_mlf_note_full_source.tsv"
$DeckPath = "Corebook::Neuro::Brain::White Matter Disease::Demyelinating Disease"

$McpReference = "Reference: Figure 2 and teaching text from Middle cerebellar peduncles: Magnetic resonance imaging and pathophysiologic correlate, PMC4697118. https://pmc.ncbi.nlm.nih.gov/articles/PMC4697118/"
$MlfReference = "Reference: Figure 5 and teaching text from The Medial Longitudinal Fasciculus and Internuclear Opthalmoparesis: There's More Than Meets the Eye, PMC7510542. https://pmc.ncbi.nlm.nih.gov/articles/PMC7510542/"

function New-ImageDiagnosisRow {
    param(
        [string]$ClinicalContext,
        [string]$Image,
        [string]$AnnotatedImage,
        [string]$Question,
        [string]$MostLikelyDiagnosis,
        [string]$EntityLabel,
        [string]$ImagingDifferentiation,
        [string]$Caption,
        [string]$Reference,
        [string]$Tags
    )

    $fields = @(
        $ClinicalContext,
        "<img src=""$Image""><br>",
        "<div class=""stackItem""><img src=""$AnnotatedImage""><div class=""stackCap"">$Caption<br>$Reference</div></div>",
        $Question,
        $MostLikelyDiagnosis,
        $EntityLabel,
        "",
        "",
        "$ImagingDifferentiation<br><br>$Reference",
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
        $Tags
    )

    if ($fields.Count -ne 22) {
        throw "Expected 22 fields, got $($fields.Count)"
    }

    return ($fields -join "`t")
}

$rows = @()

$McpRow = New-ImageDiagnosisRow `
        -ClinicalContext "40-year-old with facial numbness and scanning speech. Axial brain MRI posterior fossa panel WMLOC01" `
        -Image "brain_mri_posterior_fossa_02_source.png" `
        -AnnotatedImage "brain_mri_posterior_fossa_02_source_back.png" `
        -Question "What diagnostic category should this lesion location raise concern for?" `
        -MostLikelyDiagnosis "Demyelinating disease, especially multiple sclerosis.<br><br>What exactly is this location? The middle cerebellar peduncle, also called the brachium pontis, is a large pontocerebellar white matter tract carrying afferent fibers from the contralateral pontine nuclei into the cerebellum.<br><br>Why this matters: a focal T2/FLAIR white matter lesion centered in the middle cerebellar peduncle is an infratentorial tract-location red flag for demyelination. Active demyelinating plaques may enhance, as in this example." `
        -EntityLabel "Middle cerebellar peduncle / brachium pontis lesion: demyelinating disease pattern" `
        -ImagingDifferentiation "Logic behind the finding:<br>The MCP is made of heavily myelinated white matter fibers, so immune-mediated myelin injury can produce a focal tract lesion here.<br>The same abnormality is present in the peduncular white matter on both T2 and postcontrast imaging, which supports a real lesion rather than artifact.<br>Enhancement, when present, fits active inflammatory demyelination.<br><br>Important trap: MCP T2 signal is not specific for MS. The differential includes PML, PRES/toxic edema, metabolic myelinolysis, neurodegenerative pontocerebellar processes, rare ischemia, tumor, or inflammatory rhombencephalitis. The board-style reflex is not 'MCP equals MS'; it is 'MCP white matter lesion should raise demyelination high on the list, then use age, tempo, diffusion, enhancement, and additional lesions to narrow it.'" `
        -Caption "Source caption/readout: Multiple sclerosis case in a 40-year-old with left facial pain/numbness and scanning speech. Axial T2 (A) and axial postcontrast MR (B) show an isolated lesion in the left middle cerebellar peduncle/brachium pontis; additional spine MRI and CSF findings supported MS. How to read it: panel A shows the T2-bright peduncular white matter lesion, and panel B shows enhancement in the same left MCP location, which fits an active inflammatory demyelinating plaque." `
        -Reference $McpReference `
        -Tags "Neuro Brain WhiteMatter Demyelination MiddleCerebellarPeduncle BrachiumPontis"

$MlfRow = New-ImageDiagnosisRow `
        -ClinicalContext "39-year-old with diplopia and dizziness. Brain MRI multi-sequence panel WMLOC02" `
        -Image "brain_mri_brainstem_02_source_full.png" `
        -AnnotatedImage "brain_mri_brainstem_02_source_full_back.png" `
        -Question "What diagnostic category should this lesion location raise concern for?" `
        -MostLikelyDiagnosis "Demyelinating disease, especially multiple sclerosis.<br><br>What exactly is this location? The medial longitudinal fasciculus is a paired, heavily myelinated tract near the midline in the dorsal pons and midbrain, immediately ventral to the fourth ventricle/aqueduct region. It coordinates conjugate gaze and vestibulo-ocular pathways.<br><br>Why this matters: a small T2/FLAIR or enhancing lesion in the expected medial longitudinal fasciculus region is a classic location-based clue for demyelination, particularly when the patient has diplopia, internuclear ophthalmoplegia-type symptoms, dizziness, or other brainstem complaints." `
        -EntityLabel "Expected medial longitudinal fasciculus region lesion: demyelinating disease pattern" `
        -ImagingDifferentiation "Logic behind the finding:<br>The MLF is a compact myelinated tract in the dorsal paramedian brainstem, so a tiny plaque can produce prominent ocular-motor symptoms.<br>FLAIR/T2 hyperintensity localizes the lesion to the dorsal pons/midbrain near midline.<br>No diffusion restriction argues against an acute infarct as the main explanation in this example.<br>Solid enhancement can indicate active inflammatory demyelination.<br><br>Important trap: the MLF lesion differential is mainly demyelination versus small brainstem infarct. In a younger patient or one with additional plaques, demyelination moves up. In an older vascular-risk patient with restricted diffusion, infarct moves up. Either way, the anatomic clue is to deliberately inspect the dorsal midline pons/midbrain when diplopia or dizziness is present." `
        -Caption "Source caption/readout: 39-year-old with known multiple sclerosis, bilateral internuclear ophthalmoplegia, diplopia, and dizziness. Axial FLAIR (A) shows a dorsal pontine lesion in the medial longitudinal fasciculus at the source arrow. Axial DWI (B) shows no restricted diffusion to suggest acute infarct. Axial and sagittal postcontrast T1 images (C, D) show solid enhancement at the same site. How to read it: the key is localization to the dorsal paramedian brainstem MLF region, with absent diffusion restriction arguing against acute infarct in this example and enhancement supporting active demyelinating inflammation." `
        -Reference $MlfReference `
        -Tags "Neuro Brain WhiteMatter Demyelination MedialLongitudinalFasciculus Brainstem"

$rows += $McpRow
$rows += $MlfRow

$content = @(
    "#separator:tab",
    "#html:true",
    "#notetype:core_rad_notetype_v2",
    "#deck:$DeckPath"
) + $rows

Set-Content -LiteralPath $OutFile -Value $content -Encoding UTF8

$repairContent = @(
    "#separator:tab",
    "#html:true",
    "#notetype:core_rad_notetype_v2",
    "#deck:$DeckPath",
    $MlfRow
)

Set-Content -LiteralPath $MlfRepairFile -Value $repairContent -Encoding UTF8
