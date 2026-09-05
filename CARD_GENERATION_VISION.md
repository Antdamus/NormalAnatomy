# Radiology Anki Card Generation Vision

Last revised: 2026-09-05

## Core Goal

The card generator exists to train radiology recognition and interpretation.

The main learner task is:

- recognize the image pattern of a disease, mass, variant, or normal anatomy target
- know the typical modality-specific appearance of that entity
- keep realistic mimics in mind
- know the key differentiators when they exist
- accept uncertainty when imaging cannot confidently distinguish entities without pathology, biopsy, clinical data, or follow-up

The generator should not create filler cards, metadata cards, or generic prompts that do not improve image interpretation.

## Default Pathology Output

For each disease entity, generate independent notes for the major learning targets.

Default pathology output should include:

- one independent UNKNOWN image-recognition note for each usable case or case group
- separate independent imaging-pattern recall note(s) for the disease entity
- no standalone definition card unless explicitly requested
- no standalone differential drill unless explicitly requested

Important architecture rule:

- one learning target equals one TSV row
- one TSV row should trigger only one card family
- do not put multiple front-driving prompts in the same note
- do not rely on sibling cards from the same note for separate learning targets

Reason: if one card is deleted in Anki, sibling cards from the same note may be affected. Separate learning targets must therefore live in separate TSV rows.

## Visible Unique IDs

Short non-diagnostic unique IDs may remain in `Clinical_Context`.

Purpose:

- keep notes uniquely identifiable during export, audit, and Anki import
- prevent accidental duplicate merging
- allow a broken or suspicious row to be referenced precisely

Rules:

- IDs must not reveal the diagnosis, anatomy target, differential, or answer
- do not remove IDs during audit solely because they are visible
- if an ID is used, keep it short and mechanically recognizable as an identifier rather than teaching content

## UNKNOWN Image Cards

UNKNOWN cards are the primary image-learning cards.

Front:

- neutral clinical context only
- actual image or multi-image stack
- a diagnosis-blinded question
- no answer leakage
- no source captions on the front
- no disease names, named signs, or diagnosis-collapsing history
- no workflow/meta wording such as "this batch," "source review," "extraction," "prompt," or "what was included"

Question style:

- prefer "Most likely diagnosis?" when the image is a diagnosis-recognition card
- use a tighter image-based question only if it does not reveal the answer
- never ask generic workflow questions

Multi-image rule:

- all usable images from a case must be included
- multi-image stacks must visibly label image position, such as "Image 1/3", "Image 2/3", "Image 3/3"
- labels exist so the learner knows to keep scrolling
- labels must not reveal the diagnosis

Back:

- diagnosis at the top
- differential diagnosis immediately after diagnosis
- key differentiators immediately after differential diagnosis
- exact source caption if a caption exists
- explanation of what each image shows
- explanation of why the findings support the diagnosis
- modality-specific appearance checklist when source-supported
- reference/link when available

Preferred back order:

1. Diagnosis
2. Differential
3. Key differentiators
4. Source caption/readout, verbatim if available
5. How to read the images
6. Typical imaging appearance by modality
7. Reference

## Disease Entity Imaging-Pattern Cards

Each disease entity should have dedicated imaging-pattern recall cards separate from the UNKNOWN image cards.

These cards test the expected appearance of the entity itself, not just one displayed case.

Generate these only from source-supported information.

Use one or more independent notes depending on how much source-supported appearance exists:

- CT appearance card
- MRI appearance card
- ultrasound or Doppler appearance card
- nuclear medicine / PET / SPECT appearance card
- contrast-enhancement pattern card if the contrast behavior is a major discriminator and too large to fit cleanly inside one modality card

Do not generate appearance cards for unsupported modalities.

Do not invent absent appearances from general medical knowledge unless the workflow explicitly permits externally sourced clarification, and then label it clearly.

## Entity Modality Matrix

Before generating pathology cards for a disease entity, create an internal entity modality matrix.

The matrix should identify which modality-specific facts are source-supported and which are absent.

Required matrix buckets:

- CT noncontrast
- CT contrast phases, including arterial, portal venous, delayed, CTA, enteric/oral/rectal contrast when relevant
- MRI sequences, including T1, T2, FLAIR, DWI/ADC, GRE/SWI, MRCP, and other source-stated sequences
- MRI contrast behavior, including dynamic gadolinium phases and hepatobiliary phase when relevant
- ultrasound grayscale
- ultrasound Doppler
- contrast-enhanced ultrasound
- nuclear medicine / PET / SPECT, including exact radiotracer and timing when provided

Generation rule:

- generate imaging-pattern cards only from source-supported matrix cells
- if multiple matrix cells form one inseparable pattern, combine them into one focused card
- if cells test different recognition moves, split them into separate independent TSV rows
- do not create cards for empty matrix cells
- do not mention unsupported modality absence unless that absence itself is useful for source audit or learner safety

The entity modality matrix is an internal planning tool. It should not become a card by itself.

## Modality and Contrast Framework

Contrast behavior belongs inside the relevant modality, not in a generic bucket.

CT appearance should distinguish, when source-supported:

- noncontrast CT
- arterial phase CT
- portal venous phase CT
- delayed phase CT
- CTA or CT angiography pattern
- oral, rectal, or enteric contrast behavior when relevant
- iodine contrast enhancement pattern
- calcification, fat, gas, hemorrhage, fluid, wall enhancement, septa, capsule, washout, or vascularity when source-supported

MRI appearance should distinguish, when source-supported:

- T1 signal
- T2 signal
- FLAIR signal when relevant
- DWI / ADC behavior
- susceptibility / GRE / SWI behavior
- dynamic gadolinium enhancement
- arterial, portal venous, equilibrium, or delayed phase behavior
- hepatobiliary phase behavior when hepatobiliary contrast agents are used
- extracellular versus hepatobiliary contrast agent implications when source-supported
- MRCP or heavily T2-weighted ductal/fluid behavior when relevant

Ultrasound appearance should distinguish, when source-supported:

- grayscale echogenicity and echotexture
- cystic versus solid morphology
- posterior acoustic enhancement or shadowing
- wall, septation, debris, fluid-fluid level, gas, or stone features
- color Doppler or spectral Doppler behavior
- dynamic compression or positional change when relevant
- contrast-enhanced ultrasound pattern when provided

Nuclear medicine / PET / SPECT appearance should distinguish, when source-supported:

- exact radiotracer
- uptake, photopenia, avidity, retention, washout, or excretion pattern
- timing or phase of imaging when relevant
- physiologic biodistribution that creates a pitfall
- tracer-specific discriminator

Never generalize one contrast agent, phase, sequence, or tracer to another unless the source explicitly supports that generalization.

## Differential and Key Differentiators

For every UNKNOWN pathology image card, the back should place diagnosis/differential information near the top.

Required structure:

- Diagnosis: the most likely diagnosis for the displayed case
- Differential: realistic mimics for that image pattern
- Key differentiators: what favors the diagnosis over the mimics

If imaging cannot reliably distinguish the diagnosis from a mimic:

- state that directly
- say what is needed instead, such as biopsy, pathology, cultures, labs, clinical context, interval follow-up, or operative correlation, only when source-supported or clinically necessary

Do not pretend imaging can separate entities when the distinction is not actually reliable.

## Imaging Specificity Label

UNKNOWN image-card backs and entity imaging-pattern cards should state how specific the imaging appearance is when that matters.

Use one of these practical labels when source-supported or clinically necessary:

- Diagnostic: imaging findings are sufficiently characteristic for the intended diagnosis in the right context
- Strongly suggestive: imaging favors the diagnosis, but mimics remain plausible
- Nonspecific: imaging pattern overlaps substantially with other entities
- Requires correlation: final distinction depends on pathology, biopsy, cultures, labs, clinical history, operative findings, interval follow-up, or other non-imaging data

Do not overstate certainty.

If the source says a finding can mimic another entity, or if the diagnosis often cannot be made confidently by imaging alone, the card should say that directly.

Differentials should be practical, not encyclopedic.

Good differential content:

- 2 to 5 realistic mimics for the same imaging pattern
- the dominant discriminator for each mimic when known
- source-supported limitations of imaging specificity

Bad differential content:

- long lists of loosely related entities
- rare possibilities that do not affect interpretation
- repeated standalone differential cards when the UNKNOWN back already teaches the same comparison

## Report-Critical / Management Pivot Cards

Some entities need a separate recall card for findings that change what the radiologist must inspect, report, recommend, or escalate.

Do not create a new Anki note type for this.

Implementation:

- use the existing High_Yield_Q and High_Yield_A fields
- each report-critical / management-pivot card must be its own independent TSV row
- do not place this as a sibling trigger on an UNKNOWN image note
- do not populate multiple front-driving prompt families in the same row

Generate these cards only when the source-supported finding changes:

- urgency
- treatment versus conservative management
- surgery, drainage, embolization, anticoagulation, or other intervention
- staging or resectability
- prognosis or risk stratification
- follow-up interval or surveillance pathway
- complication status
- what must be explicitly stated in the report

Good question design:

- ask for the specific actionable imaging feature
- ask what must be inspected or reported for that entity
- ask what downstream consequence follows if the finding is present
- keep the prompt concrete and clinically reportable

Good examples:

- "In suspected pyonephrosis, which imaging findings should be reported because they support urgent decompression?"
- "For this liver lesion diagnosis, what vascular or biliary involvement would change management?"
- "In this hernia type, which CT findings indicate strangulation or ischemia and should be reported urgently?"

Bad examples:

- "What should you report for this disease?"
- "What is important about this topic?"
- "What management facts were included in the source?"

UNKNOWN image-card backs may also include a short "Report-critical findings" section when relevant, but any important management/reporting pivot that should be memorized independently must be a separate TSV row.

## Report Checklist Gate

Before creating a report-critical / management-pivot card, ask whether the fact changes the actual radiology report.

Generate the card only if the finding changes at least one of:

- urgency or acuity
- need for immediate communication
- intervention or treatment pathway
- operative planning
- staging or resectability
- complication status
- prognosis or risk category
- follow-up interval or surveillance plan
- required report element for clinically useful interpretation

Do not generate a report-pivot card for generic statements such as:

- "report the location"
- "describe the lesion"
- "mention complications"
- "correlate clinically"

Those are too generic unless the source names a specific finding whose presence changes management or outcome.

## High-Yield Radiologist Usefulness Test

High-Yield cards must make the learner better at reading studies.

Allowed High-Yield retrieval targets:

- source-supported modality appearance: CT, MRI, ultrasound, Doppler, CEUS, nuclear medicine, PET, SPECT, angiography, fluoroscopy, or radiography
- source-supported contrast or tracer behavior: contrast agent, phase, uptake, retention, washout, excretion, photopenia, avidity, enhancement, or blood-pool behavior
- differential discriminator: the deciding feature that separates realistic mimics
- pitfall: a source-supported mistake that would cause overcall, undercall, or wrong differential ranking
- report-critical / management pivot: a finding that changes urgency, staging, intervention, prognosis, follow-up, or what must be stated in the report
- clinically useful pretest clue: age, sex, risk factor, syndrome, or "most common" fact only when it changes differential ranking or image interpretation

Not enough by itself:

- generic epidemiology
- generic "most common" trivia
- standalone definitions unless explicitly requested
- broad questions such as "What is important about this disease?"
- facts that are true but do not change image recognition, differential ranking, reporting, or management

Question design:

- name the entity, modality, contrast phase, sequence, tracer, mimic pair, pitfall, or report-critical feature being tested
- avoid generic stems when a specific imaging question is possible
- the answer should include a "Recognition pivot:", "Key differentiator:", "Report pivot:", or "Exam pivot:" line when that makes the card more actionable

Examples:

- Bad: "Which benign hepatic neoplasm is the most common?"
- Better: "On multiphasic CT/MRI, what enhancement pattern makes cavernous hemangioma the leading diagnosis, and what separates it from fibrolamellar HCC when a central scar or calcification is present?"
- Better: "For FNH, what hepatobiliary contrast pattern separates it from hepatic adenoma?"
- Better: "In chronic Budd-Chiari syndrome, why can large regenerative nodules mimic HCC, and what context or contrast behavior helps avoid the overcall?"

## Caption and Image Handling

Captions are source material and must be preserved carefully.

Rules:

- if a source caption is used, it must be reproduced exactly
- do not paraphrase, shorten, clean up, correct, or reorder caption text
- additional explanation must be separate from the caption
- captions must not appear on the front if they reveal the answer
- if source images have arrows, preserve them as the source provided them
- if source images do not have arrows, do not add arrows by default

Complete image reference name rule:

- every image-containing card must include the complete image reference name on the back
- use the full source-provided image identifier when available, such as figure number, image title, case image name, accession-style label, source filename, or downloaded media filename
- when a validation package, source package, extracted image block, case ledger, or media table lists image filenames, those filenames are authoritative image reference names and must be copied exactly
- do not truncate the image reference name
- do not paraphrase the image reference name
- for multi-image cases, include one complete image reference name per image in the same order as the image stack
- keep image reference names separate from verbatim captions
- do not insert image reference names into the caption text if doing so would alter the caption
- if no source-provided image identifier exists, use the exact local media filename

Image handling:

- include all usable images from every selected case
- do not silently omit selected images
- if an image is redundant or unusable, document why it was omitted before export
- non-annotated and annotated versions should stay paired when both exist
- image order should follow the source case order

## Question Quality Rules

Questions must test radiology reasoning or recognition.

Good questions:

- "Most likely diagnosis?"
- "What CT enhancement pattern is expected for this entity?"
- "What MRI features favor this diagnosis over its main mimics?"
- "What ultrasound findings distinguish infected hydronephrosis from simple hydronephrosis?"
- "Which tracer-specific nuclear medicine pattern supports this diagnosis?"

Bad questions:

- "What should be known for this batch?"
- "What did the source review support encoding?"
- "What did extraction identify?"
- "What does the prompt require?"
- "What information was included?"
- "What is important about this topic?" when not tied to a specific imaging target

If a draft question reads like process metadata, convert it into a direct radiology question or omit it.

## Hard Quality Filter

Every exported card must pass at least one of these tests:

- Does this help me recognize the image?
- Does this help me distinguish the diagnosis from realistic mimics?
- Does this teach source-supported modality-specific appearance?
- Does this teach what must be inspected or reported because it changes management, staging, urgency, prognosis, follow-up, or outcome?
- Does this teach a source-supported pitfall, contrast/tracer behavior, or pretest clue that changes real interpretation?

If a card does not pass at least one test, omit it.

Additional quality checks:

- the front must ask a real radiology question
- the back must contain actionable interpretation content
- the card must not exist merely because a field was available
- the card must not exist merely because a sentence was present in the source
- the card must not duplicate another card's retrieval target
- the card must not be a disguised source-audit or workflow card

## Normal Anatomy Output

Normal anatomy cards should follow the same anti-bloat philosophy.

Default normal output should prioritize:

- recognizing structures, spaces, landmarks, variants, and normal relationships on actual images
- localizing less-visible structures using reliable visible anchors
- avoiding overcalls of normal variants or pseudolesions
- preserving modality-specific normal appearance when source-supported

Do not generate disease-style diagnosis cards for normal anatomy unless the task is explicitly normal-versus-abnormal discrimination.

Definitions remain opt-in unless the definition is the actual requested learning target.

## Source Discipline

All claims must come from the allowed source set for the run.

Source-supported means the fact is present in:

- Core Radiology
- RadPrimer
- STATdx
- Radiopaedia
- user-provided article/case material

If a modality appearance is absent from all allowed sources:

- leave that modality out of dedicated appearance cards
- do not fabricate a pattern
- optionally state "not provided in the source set" only when that absence is useful for the learner or audit

The summary field is not the source of truth. Cards must be generated from the full source material, captions, and images.

Audit behavior:

- the article-level summary field is allowed to repeat across TSV rows because the Anki template may hide it by default
- do not delete or penalize a card solely because its summary field is long or repeated
- correct the summary only when it is inaccurate, source-contaminated, overcompressed, missing important article structure, or inconsistent with the auditable source basis
- if a card or summary claims Core-only or Core + article synthesis, Core support must be auditable from `core_evidence.txt` or direct Core text in the source package
- if Core evidence is missing, downgrade the card set to article-only and remove unsupported Core-only details rather than leaving unverified Core provenance in the TSV

## Practical Default

The generator should produce fewer, stronger cards.

Preferred default per disease entity:

- all usable case image cards
- one or more entity-level imaging appearance cards, source-supported and modality-specific
- differential and key differentiators on UNKNOWN backs
- report-critical / management-pivot cards when a source-supported finding changes reporting, escalation, staging, prognosis, follow-up, or treatment
- mechanisms, traps, and definitions only when they are truly high-yield or explicitly requested

The final deck should help a radiologist look at a study and answer:

- what is this most likely?
- what else could look like this?
- what imaging details separate those possibilities?
- what is the expected appearance of this entity across the modalities and contrast phases that matter?
- what must I inspect and report because it changes management or outcome?
