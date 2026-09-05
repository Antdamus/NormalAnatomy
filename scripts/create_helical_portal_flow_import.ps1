$ErrorActionPreference = "Stop"

$OutDir = "C:\Users\josem.000\NormalAnatomy\anki_helical_portal_flow"
$OutFile = Join-Path $OutDir "anki_helical_portal_flow.tsv"
$DeckPath = "Corebook::GI::Liver::Liver Transplant"

$Reference = "Reference: Fig. 3 and teaching text from Altered Doppler flow patterns in cirrhosis patients: an overview, PMC4701371. The article describes helical flow as secondary spiral flow from disturbed laminar flow; after liver transplant it is attributed to donor/native portal vein diameter discrepancy and is accentuated when the discrepancy is greater than 50%. https://pmc.ncbi.nlm.nih.gov/articles/PMC4701371/"

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

$row = New-ImageDiagnosisRow `
    -ClinicalContext "38-year-old after liver transplant. Portal venous Doppler ultrasound panel ABDDOP01" `
    -Image "abdominal_us_portal_doppler_01_source.png" `
    -AnnotatedImage "abdominal_us_portal_doppler_01_source_back.png" `
    -Question "What Doppler pitfall is shown, and what should it not be mistaken for?" `
    -MostLikelyDiagnosis "Helical flow in the main portal vein after liver transplant; do not mistake it for true hepatofugal portal venous flow.<br><br>Core concept: helical flow is spiral/secondary flow superimposed on overall portal venous inflow. In liver transplants, it commonly occurs when donor and recipient main portal veins are discrepant in size, especially with marked diameter mismatch." `
    -EntityLabel "Helical main portal venous flow after liver transplant: hepatofugal-flow mimic" `
    -ImagingDifferentiation "Logic behind the finding:<br>Color Doppler: alternating red and blue bands within the main portal vein do not automatically mean the entire portal vein is reversed. In a helical stream, one side of the spiral is moving relatively toward the transducer and another side is moving relatively away from it, so opposite colors can coexist in the same vessel lumen.<br><br>Spectral Doppler: sampling through the helix can show components above and below the baseline, creating an apparent bidirectional/hepatopetal-hepatofugal pattern. That reflects rotational flow within the sample volume rather than necessarily true net hepatofugal flow.<br><br>Anatomic/hemodynamic basis: donor-recipient portal vein diameter mismatch changes vessel geometry at/near the anastomosis. The caliber transition disturbs laminar flow, causes flow separation, and produces circular/helical streamlines. The source article notes this is accentuated when the portal-vein diameter discrepancy is greater than 50%.<br><br>How not to overcall it: confirm the net direction by checking intrahepatic portal vein branches and using the vessel course/angle. If intrahepatic branches remain hepatopetal, the red/blue mixture in the main portal vein is a pitfall pattern, not true global hepatofugal portal flow. Persistent helical flow with high velocity can still be a clue to portal vein stenosis, so do not ignore the anastomosis." `
    -Caption "Source caption/readout: A 38-year-old female with liver transplant. Panels A and B are color Doppler images showing helical flow in the main portal vein, with alternating red and blue bands inside the same portal vein. Panel C is spectral analysis showing alternating hepatopetal and hepatofugal components. How to read it: the mixed color and bidirectional spectral components are the visual trap; the pattern can mimic true hepatofugal flow, but in the transplant setting it often reflects helical flow caused by donor-recipient portal vein size mismatch." `
    -Reference $Reference `
    -Tags "GI Liver LiverTransplant Ultrasound Doppler PortalVein HelicalFlow HepatofugalFlowMimic"

$content = @(
    "#separator:tab",
    "#html:true",
    "#notetype:core_rad_notetype_v2",
    "#deck:$DeckPath",
    $row
)

Set-Content -LiteralPath $OutFile -Value $content -Encoding UTF8
