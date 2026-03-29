=== PROMPT ===

I am a radiology resident building a board-grade, conceptually deep Anki deck using **Core Radiology as the authoritative source of truth**.

I am using a custom Anki note type called:

core_rad_notetype

---

## PRIMARY RULE — CORE INTEGRATION FIRST (MANDATORY PRE-STEP)

For **EVERY** article/case bundle I provide, you MUST do this **before generating any cards**:

### Step 0A — Find Core Radiology Coverage

1. Identify the relevant section(s) in **Core Radiology** that correspond to the topic.
2. Report to me (Mode 1 only):

   * Chapter
   * Subsection(s)
   * **Exact page numbers / page ranges**
3. Provide a **brief Core coverage digest** (2–6 bullets max) capturing only the board-relevant points Core makes about this topic.

### Step 0B — Core GAP Declaration (SHORT)

Immediately after the Core digest, include a short GAP declaration:

**Core GAP Declaration (short):**

* Missing / not found in Core: [1–5 short bullets max]
* Article-only additions: [1–5 short bullets max]

### Step 0C — Stop Condition

If you cannot locate the relevant Core pages:

• STOP immediately
• Ask me to provide the exact page range (or screenshots)
• Do NOT proceed
• Do NOT guess
• Do NOT substitute with RadPrimer-only content for Core claims
• Radiopaedia is not a substitute for Core in this step

You do **NOT** need to embed page numbers inside Anki fields.
This page reporting is for validation only (Mode 1 pre-step).

---

## NOTE TYPE FIELDS (EXACT ORDER — DO NOT ALTER)

Clinical_Context
Image
Image_Annotated
Question
Most_Likely_Diagnosis
Differentials
Imaging_Differentiation
Original_Caption
Mechanism_Q
Mechanism
Boards_Trap_Q
Boards_Trap
High_Yield_Q
High_Yield_A
Radiopaedia_Link
Radiopaedia_Case_Context
Radiopaedia_Case_Summary
Radiopaedia_Case_Differential
summary

---

## IMPORTANT TSV OUTPUT REQUIREMENT

When generating TSV:

• Add ONE final extra column at the end: **Tags**
• **No header row**
• Tabs only
• One note per line
• Standalone concept cards MUST be included
• Clinical_Context field can NEVER be empty

TSV column order is exactly the 19 fields above, followed by Tags.
So TSV has **20 columns total: 19 fields + Tags**.

---

## SOURCE HIERARCHY (MANDATORY — NO EXCEPTIONS)

All medical content MUST come from the following sources, in this order of authority:

1. Core Radiology (Primary Source of Truth)
2. RadPrimer article provided
3. STATdx
4. Radiopaedia (last resort only)

If content is NOT found in these sources:

• You MAY propose a differential only if the imaging description strongly supports it
• You MUST explicitly state:
“Not explicitly listed in Core/RadPrimer/STATdx; inferred based on imaging pattern.”

You may NOT fabricate:

• Epidemiology
• MRI signal characteristics
• Differentials
• Imaging findings
• Staging rules
• Management triggers

If it is not explicitly defined in the allowed sources, do not include it.

---

## CORE + ARTICLE INTEGRATION RULE (MANDATORY)

After you locate Core pages:

• Compare Core content with the provided article/cases
• Identify:

* What Core already covers (board backbone)
* What the article adds (imaging nuance, signs, technique, pitfalls)
* True gaps that require cards

Generate cards that reflect **both sources**.

Do NOT:
• Duplicate trivial overlap
• Inflate the deck
• Ignore Core because the article is detailed

Core governs board relevance.
Article refines pattern recognition and discriminators.

---

## CARD TYPES ALLOWED (ONLY THESE)

A) PRIMARY UNKNOWN CARD
B) DIFFERENTIAL DRILL CARD
C) CONCEPT-ONLY CARD
D) RADIOPAEDIA LINK DRILL CARD

No other card types.

---

## FRONT-SIDE BLINDING RULE (IMAGE CARDS)

Front MUST contain ONLY:

• Clinical_Context (neutral; no hints)
• Image stack
• Question (cognitive task only)

Forbidden on front:

• Imaging descriptors
• Named signs
• Diagnosis-adjacent labels
• Differential hints

No leakage.

---

## IMAGE + CAPTION UNDER-IMAGE RULE (MANDATORY)

### Image field (FRONT)

Plain images only.
No captions.
No wrapper divs.
One image per line:

<img src="FILE1.jpg"><br> <img src="FILE2.jpg"><br>

### Image_Annotated field (BACK)

For every image:

<div class="stackItem"> <img src="FILE1_annot.jpg"> <div class="stackCap">VERBATIM CAPTION</div> </div>

Rules:

• Captions MUST be verbatim
• Every image must have a corresponding caption
• Order must match Image field
• No extra text inside stackCap

### Original_Caption field

Leave blank unless archival redundancy is explicitly requested.

---

## IMAGE CARD FINDINGS REQUIREMENT (MANDATORY — KEYWORDS ONLY)

For image cards, inside **Most_Likely_Diagnosis** you MUST include the key findings the learner should have identified.

These findings MUST:

• Be derived from captions
• Be explicitly present in caption text
• NOT be inferred
• NOT be fabricated

BUT:

• Do NOT paste the full caption
• Extract ONLY concise **keyword findings** (short phrases)
• Keep it tight (generally 3–8 phrases)
• No full-sentence caption copying

Then explain how those caption-derived keyword findings:

• Support the most likely diagnosis
• Or are nonspecific
• Or overlap with differentials

No added imaging findings beyond caption text.

---

## DIFFERENTIAL CARD DE-DUPLICATION RULE (CRITICAL — ALIGNED TO YOUR TEMPLATE)

Your Anki card template generates a Differential Drill card whenever **Differentials** is populated.

Therefore:

If multiple cases share the exact same differential set:

• ONLY ONE case may have Differentials populated
• Other cases MUST:

* Leave Differentials blank
* Still include differential reasoning in Imaging_Differentiation (explanation only)
* NOT generate additional drill cards

Every case must still explain reasoning, but only one becomes a drill.

No redundancy.

---

## DIFFERENTIAL RESTRICTION RULE

Differentials must:

• Appear in Core, RadPrimer, STATdx, or Radiopaedia
• Be realistic mimics for the described imaging pattern

Do NOT include encyclopedic lists.
Do NOT include weak mimics.
Do NOT inflate differential count.

If no differential is listed in trusted sources:

Leave Differentials blank.

There is no fixed number requirement.

Quality > quantity.

---

## MECHANISM / BOARDS TRAP RULES (FULL)

Mechanism_Q + Mechanism are OPTIONAL fields and must ONLY be populated when:

• Explicitly stated in Core / RadPrimer / STATdx / Radiopaedia
AND
• It is exam-relevant and causal (not trivia)

Mechanism must:
• Explain *why* the imaging appearance happens or *why* the disease behaves that way
• Be concise and board-useful
• Not invent physiology

Boards_Trap_Q + Boards_Trap are OPTIONAL fields and must ONLY be populated when:

• The source explicitly flags a pitfall, mimic, limitation, false positive/negative pattern, or common interpretive error
OR
• It is a classic board trap that is explicitly supported by one of the allowed sources

Boards_Trap must:
• State the trap
• State the correct discriminator or safety check
• Avoid speculation

If not strongly supported: leave both fields blank.

---

## HIGH-YIELD RULES (FULL)

High_Yield_Q / High_Yield_A must contain ONLY high-yield, testable pivots such as:

• Numeric thresholds
• Management triggers
• Size cutoffs
• Staging rules
• “Most common…” statements
• Epidemiology pivots that change interpretation

No trivia.

### EPIDEMIOLOGY INCLUSION RULE (HIGH-YIELD ONLY)

Include epidemiology ONLY if it meets one of the following:

• “Most common tumor of…”
• “Second most common…”
• Classic demographic association that alters pretest probability
• Age-driven discriminator
• Sex predilection affecting interpretation
• Classical epidemiology-driven radiologic presentation

Epidemiology must:

• Come from Core, RadPrimer, STATdx, or Radiopaedia
• Be explicitly stated in High_Yield_Q / High_Yield_A
• NOT inflate deck with trivial statistics

No fabricated numbers.

---

## MRI SEQUENCE RULE (STRICT)

If the case is MRI:

Include sequence-specific characteristics ONLY IF explicitly defined in:

• Core Radiology
• RadPrimer
• STATdx

You may NOT infer signal behavior.

At the end of the MRI description, include:

(Source: Core / RadPrimer / STATdx / Radiopaedia)

If not explicitly described in the source, do not include sequence behavior.

---

## CRITICAL RULE — CONCEPT-ONLY CARD STRUCTURE

For Concept-Only Cards:

Image = blank
Image_Annotated = blank
Question = blank
Most_Likely_Diagnosis = blank
Differentials = blank
Imaging_Differentiation = blank
Original_Caption = blank
Mechanism_Q = blank
Mechanism = blank
Boards_Trap_Q = blank
Boards_Trap = blank
Radiopaedia fields = blank (unless explicitly a Radiopaedia Link Drill)
summary = blank (unless concept card derived from RadPrimer/STATdx article; see Summary Rule)

ALL tested content must live exclusively in:

High_Yield_Q
High_Yield_A

Clinical_Context MUST contain:

• A unique 12-character alphanumeric/symbolic ID
• NOTHING else

No diagnosis labels.
No explanation.
No hints.

---

## RADIOPAEDIA LINK DRILL RULE (FULL)

Use a Radiopaedia Link Drill ONLY when:

• The entity is not adequately covered in Core/RadPrimer/STATdx
OR
• Radiopaedia provides a uniquely instructive image-based case that adds genuine value
AND
• It does not inflate redundancy

Front MUST contain ONLY:

Radiopaedia_Case_Context
Radiopaedia_Link
Question:

“Open the case, review the images, return and answer:

Most likely diagnosis
Two reasonable differentials
One key discriminator”

Front must not contain diagnosis hints.

Back MUST contain:

Most_Likely_Diagnosis
Radiopaedia_Case_Summary
Radiopaedia_Case_Differential
Imaging_Differentiation

Optional: one rule-level pearl supported by Radiopaedia.

summary field:

Leave blank unless this drill was explicitly derived from a RadPrimer/STATdx article (rare).

---

## SUMMARY FIELD RULE (STRICT — RADPRIMER / STATdx ONLY)

This rule applies ONLY to cards where the question/case originates from:

• A RadPrimer article
• A STATdx article

Then:

You MUST populate the final field summary with a high-quality summary of that article.

The summary must:

• Be derived ONLY from that specific RadPrimer/STATdx article
• NOT include Core Radiology content
• NOT include Radiopaedia content
• NOT merge sources
• NOT expand beyond the article
• NOT add interpretation or outside facts
• NOT fabricate imaging, epidemiology, staging, or management

The summary must concisely capture (ONLY if present in the article):

• Definition / terminology
• Key imaging patterns
• Core pathophysiology (if present)
• Differential logic emphasized by the article (if present)
• High-yield complications or management triggers (if present)

Avoid:

• Trivial epidemiology
• Exhaustive lists
• Verbatim copying
• External additions

If the card does NOT originate from RadPrimer or STATdx:

Leave summary blank.

---

## REVIEW MODE BEHAVIOR (IMPORTANT)

During Mode 1 — PRE-APPROVAL REVIEW OUTPUT:

1. First output the Core Integration Report:

   * Chapter/subsection/pages
   * Core digest bullets
   * Short Core GAP declaration

2. Then output the cards in structured pretty format.

Do NOT display the full summary text.

Instead, at the bottom of each RadPrimer/STATdx-derived card, write only:

“Summary field included.”

The full article summary appears ONLY in TSV output.

---

## BACK-SIDE CONTENT RULES

Most_Likely_Diagnosis:

• Single best answer
• Must include caption-derived **keyword findings** (not the full caption)

Differentials:

• Only if source-supported
• Leave blank if redundant per de-duplication rule
• If populated, it MUST be the “one chosen drill case” for that differential set

Imaging_Differentiation:

• Workstation-grade discriminator logic
• Must clearly explain A vs B
• Must tie directly to caption findings
• Must still contain differential reasoning even if Differentials is blank (non-drill duplicates)

Mechanism / Boards_Trap:

Only if exam-relevant and source-supported.

High_Yield:

• Numeric thresholds
• Epidemiology pivots
• Staging rules
• Management triggers
• “Most common…” statements

No trivia.

---

## COVERAGE VALIDATION STEP (MANDATORY)

Before TSV output verify:

• All Core board-relevant content covered
• All RadPrimer/STATdx board-relevant content covered
• No redundancy
• No duplicate differential drills (Differentials populated only once per identical set)
• All high-yield epidemiology included (only if source-supported and high-yield)
• All MRI sequence characteristics included if present (and source-supported)
• All caption findings embedded as **keywords**
• No fabricated content
• Summary field populated only when RadPrimer/STATdx-derived

If gaps exist → generate additional required cards before TSV.

---

## TAGGING (MANDATORY)

SPACE-separated:

Core::<Module>::<Submodule>
::Disease / ::Concept / ::DifferentialDrill / ::RadiopaediaDrill
Entity tag
Optional modality tag
Yield::High or Yield::Moderate

---

## OUTPUT MODES

Mode 1 — REVIEW (Core integration report + structured cards)
Mode 2 — TSV (exact field order + final Tags column)

No header row.
Tabs only.
Standalone concept cards included.
Clinical_Context never empty.

---

article is now provided: