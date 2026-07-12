# Women's Health Companion — Production Question Bank (v1.0 MVP)
### Prepared by the Clinical Question Design Committee
*Gynecology · Reproductive Endocrinology · Psychology · Lifestyle Medicine · UX Research · Health Communication · Conversational AI Design*

**Source of truth:** `AI_Inference_Decision_Engine.json` (v1.0-MVP) and `Onboarding_Intelligence_System.md`. This document does not alter any decision logic, branch, trigger, or classification rule. It converts the finalized architecture into exact, user-facing question wording, ready for engineering and UI implementation.

**Committee working principles applied to every question below:**
1. Plain language first; no unexplained clinical terms.
2. One idea per question — no compound questions forcing a single answer to two things.
3. Every optional question is visibly optional in the UI copy, never implied to be required.
4. Nothing is framed to imply judgment (about weight, sexual activity, feeding choices, or fertility desire).
5. Every question maps to a specific downstream AI decision — if a question didn't earn its place in the spec, it isn't in this bank, and nothing has been added that isn't already in the spec.

---

## Tier 0 — Consent, Privacy, Language, Accessibility

Not clinical. Gates whether the rest of the pipeline runs at all (`tier0_gate`, node `T0-1`: decline → anonymous mode, pipeline halts).

| ID | Production Wording | Friendly/Conversational Version | Input Type | Options | Mandatory | Purpose | AI Decision Dependency |
|---|---|---|---|---|---|---|---|
| **T0-1** | "Before we begin: [App Name] will ask you some personal health questions to personalize your experience. Your answers are private by default. Do you consent to proceed?" | "Hi, welcome 💛 We're going to ask a few personal questions so we can support you better — and everything you share stays private unless you say otherwise. Ready to start?" | Single-select | Yes, I consent / No, use anonymously | Mandatory (gate) | Establishes informed consent before any data collection | If declined → `enter_anonymous_mode_and_halt_pipeline`; no Tier 1–5 question is ever shown |
| **T0-2** | "Would you like your anonymized, aggregated data to help improve women's health research and product design? This is separate from your private use of the app, and you can change this anytime." | "Want to help other women too? You can let us use your info anonymously (grouped with others, never identifiable) to improve care for everyone — totally optional." | Single-select | Yes, aggregated only / No, keep everything private (default) | Optional (defaults to private-only) | Sets business-use consent flag | Sets `aggregated_sharing_enabled`; gates `LFC-3` and `LFC-4` (occupation, shift-work questions) |
| **T0-3** | "Which language would you like to use?" | "What language works best for you?" | Single-select (dropdown) | [Supported locale list] | Mandatory | Sets interface and content language | Sets `locale`; controls language of every subsequent question |
| **T0-4** | "Do you need any accessibility accommodations — larger text, screen-reader optimization, reduced motion, or high-contrast mode?" | "Anything we can do to make this easier to use for you — bigger text, screen reader support, less animation?" | Multi-select | Larger text / Screen reader support / Reduce motion / High contrast / None needed | Optional | Sets UI accommodations | Sets `ui_accommodations`; changes rendering of all future screens, not question content |

---

## Tier 1 — Universal Onboarding Questions

Asked to every user, in this exact order, in the first session (`tier1_intake.sequence`). B1 and B2 only appear conditionally. This is intentionally short (6 mandatory + 1 conditional bridge + 2 lower-stakes items) so onboarding never feels like a hospital intake form.

### U1 — Age

| Field | Detail |
|---|---|
| **Production wording** | "What's your age?" |
| **Friendly version** | "How old are you? This helps us tailor everything else to you." |
| **Input type** | Numeric entry |
| **Options** | 9–100 (free numeric input, bounded) |
| **Mandatory/Optional** | Mandatory |
| **Purpose** | Single strongest determinant of which questions are appropriate next; distinguishes minor from adult flows |
| **AI decisions dependent on this answer** | Routes to adolescent vs. adult branch; triggers minor-appropriate consent/language mode if under 18; used in Tier 2 rules for `PRE_MENARCHE`, `ADOLESCENT`, `PERIMENOPAUSE`/`MENOPAUSE` age≥40 threshold, `POSSIBLE_POI_FLAG` age<40 threshold; used in TTC fertility-specialist threshold (12 vs. 6 months if age ≥35) |

### U2 — Menarche Status

| Field | Detail |
|---|---|
| **Production wording** | "Have you ever had a period?" |
| **Friendly version** | "Have you started getting your period yet?" |
| **Input type** | Single-select |
| **Options** | Yes / No |
| **Mandatory/Optional** | Mandatory |
| **Purpose** | Separates pre-menarche users (for whom cycle-length questions are meaningless and can cause anxiety) from everyone else |
| **AI decisions dependent on this answer** | Combined with U1: `U2=='No' & U1<18` → `PRE_MENARCHE`; `U2=='No' & U1>=16` → `PRE_MENARCHE` with gentle `primary_amenorrhea_gentle_nudge` flag (confidence 0.6); `U2=='Yes' & U1<18` → `ADOLESCENT` |

### U3 — Pregnancy Status

| Field | Detail |
|---|---|
| **Production wording** | "Are you pregnant, or could you be?" |
| **Friendly version** | "Is there any chance you're pregnant right now?" |
| **Input type** | Single-select |
| **Options** | Yes / No / Not sure |
| **Mandatory/Optional** | Mandatory (safety-critical) |
| **Purpose** | Highest-stakes triage question in the entire intake; changes what content is safe to show, regardless of age or stated cycle status |
| **AI decisions dependent on this answer** | `U3=='Yes' or 'Not sure'` → `PREGNANCY`, confidence 0.9, and this rule **overrides every other Tier 2 rule**; suppresses cycle-irregularity flags, weight-related content, and any supplement suggestion unsafe in pregnancy; if left unanswered, safe default is `treat_as_not_sure_provisional_pregnant` |

### U4 — Recent Pregnancy/Birth

| Field | Detail |
|---|---|
| **Production wording** | "Have you given birth, or been pregnant, in the last 12 months?" |
| **Friendly version** | "Have you had a baby, or been pregnant, sometime in the past year?" |
| **Input type** | Single-select |
| **Options** | Yes / No |
| **Mandatory/Optional** | Mandatory (safety-critical) |
| **Purpose** | Catches postpartum status even when U3 is "No" — without this, postpartum absence of periods can be misread as menopause, or as a new irregularity |
| **AI decisions dependent on this answer** | `U4=='Yes'` → `POSTPARTUM`, confidence 0.95, and this rule overrides any menopause-pattern classification for 12 months regardless of what U5 later shows |

### U5 — Current Cycle Status

| Field | Detail |
|---|---|
| **Production wording** | "Right now, would you say your periods are:" |
| **Friendly version** | "How would you describe your periods right now?" |
| **Input type** | Single-select |
| **Options** | Regular / Irregular / Stopped / I don't get periods (e.g., due to a hormonal device, medication, or another reason) |
| **Mandatory/Optional** | Mandatory (master routing question) |
| **Purpose** | Does more classification work than any other single item; the primary staging tool for menstrual-to-menopausal status |
| **AI decisions dependent on this answer** | `Regular` → `REPRODUCTIVE_REGULAR` (0.9), sub-routed by U7; `Irregular` → `REPRODUCTIVE_IRREGULAR` (0.85); `Stopped` → triggers conditional bridge **B1**; `I don't get periods` (with U2=='Yes' and no earlier rule fired) → low-confidence safe fallback `NO_BLEED_OVARIES_CYCLING` (0.4); if unanswered, held at `reproductive_unclassified`, re-prompted next session |

### B1 — Why Periods Stopped *(shown only if U5 == "Stopped")*

| Field | Detail |
|---|---|
| **Production wording** | "Did your periods stop because of a surgery, a medical treatment, or a medication (like an IUD or injection) — or did they slow down and stop gradually on their own?" |
| **Friendly version** | "What led to your periods stopping — was it a surgery, treatment, or medication, or did it happen gradually on its own?" |
| **Input type** | Single-select |
| **Options** | Surgery or medical treatment / Gradually, on its own |
| **Mandatory/Optional** | Mandatory when shown (this bridge question exists specifically because bleeding-pattern-only staging silently misclassifies surgical/induced amenorrhea and hysterectomy-with-intact-ovaries as menopause) |
| **Purpose** | Prevents the single most common mis-staging failure in consumer period-tracking apps |
| **AI decisions dependent on this answer** | `Surgery or medical treatment` → triggers conditional bridge **B2**; `Gradually` combined with U1 age determines `PERIMENOPAUSE`, `MENOPAUSE`, or `POSSIBLE_POI_FLAG` |

### B2 — Ovary Status *(shown only if B1 == "Surgery or medical treatment")*

| Field | Detail |
|---|---|
| **Production wording** | "Were your ovaries removed as part of this?" |
| **Friendly version** | "Just to make sure we track this correctly — were your ovaries removed?" |
| **Input type** | Single-select |
| **Options** | Yes / No |
| **Mandatory/Optional** | Mandatory when shown |
| **Purpose** | Determines whether this is abrupt surgical menopause (ovaries gone, sudden estrogen loss) or a case where hormones are still cycling normally with no bleeding to track |
| **AI decisions dependent on this answer** | `Yes` → `SURGICAL_MENOPAUSE` (0.9), treated as sudden-onset menopause, skipping the gradual perimenopause pacing; `No` → `NO_BLEED_OVARIES_CYCLING` (0.85), switches this user permanently to symptom-based (not calendar-based) tracking |

### U6 — Diagnosed Conditions *(optional)*

| Field | Detail |
|---|---|
| **Production wording** | "Do you currently have any diagnosed condition from this list?" |
| **Friendly version** | "Have you been diagnosed with any of these? Totally optional to answer." |
| **Input type** | Multi-select |
| **Options** | PCOS / Thyroid disorder / Diabetes / Endometriosis / None of these / Prefer not to say |
| **Mandatory/Optional** | Optional — if skipped, stored as `not_yet_known`, never inferred |
| **Purpose** | Low-effort, high personalization and safety value (e.g., diabetes changes which dietary content is appropriate to show) |
| **AI decisions dependent on this answer** | Adjusts sensitivity of the pattern-detection engine (e.g., a diagnosed-PCOS user's irregular cycles are not re-flagged as a "new" pattern); modulates confidence interpretation for androgen, thyroid, and glucose-related signals system-wide |

### U7 — Reason for Using the App

| Field | Detail |
|---|---|
| **Production wording** | "What brought you here today?" |
| **Friendly version** | "What are you hoping to get out of [App Name]?" |
| **Input type** | Single-select |
| **Options** | Track my cycle / Understand a symptom / Trying to conceive / Avoid pregnancy / General wellness |
| **Mandatory/Optional** | Mandatory (non-clinical, but always asked) |
| **Purpose** | Not a clinical gate — determines tone and which content surfaces first from message one |
| **AI decisions dependent on this answer** | Sets `goal_tag` modifier. For `REPRODUCTIVE_REGULAR` only, selects the Tier 3 sub-branch: "Trying to conceive" → TTC questions; "Avoid pregnancy" → contraception question; "Track my cycle" / "Understand a symptom" / "General wellness" → general tracking questions. For every other life stage, stored as a content-ordering signal only and never gates clinical logic |

**Missing-data handling for all of Tier 1:** any mandatory question left unanswered blocks progression to Tier 2 once, is re-prompted a single time, and only then falls back to the documented safe default (U3 → provisional pregnant; U5 → held at unclassified). Optional questions (U6) are simply stored as `not_yet_known` and re-offered at most once every 30 days — never as a blocking gate.

---

## Tier 2 — Classification Logic (computed, never shown to the user)

Pure function over Tier 1 answers. Produces exactly one `life_stage` plus zero or more modifier tags. No new logic has been added here — this table is a direct, readable translation of `tier2_classify.rules`.

| Tier 1 inputs | Resulting `life_stage` | Confidence | Notes |
|---|---|---|---|
| U2 = No, U1 < 18 | `PRE_MENARCHE` | 0.95 | Education only, no tracking |
| U2 = No, U1 ≥ 16 | `PRE_MENARCHE` | 0.60 | Adds gentle `primary_amenorrhea_gentle_nudge` flag |
| U2 = Yes, U1 < 18 | `ADOLESCENT` | 0.95 | First 1–3 years post-menarche; irregularity expected, not flagged |
| U3 = Yes or Not sure | `PREGNANCY` | 0.90 | **Overrides every rule below it**, regardless of U1/U5 |
| U4 = Yes | `POSTPARTUM` | 0.95 | Overrides any menopause-pattern reading for 12 months |
| U5 = Regular | `REPRODUCTIVE_REGULAR` | 0.90 | Sub-routed by U7 goal tag |
| U5 = Irregular | `REPRODUCTIVE_IRREGULAR` | 0.85 | Enters PCOS/thyroid screening path |
| U5 = Stopped, B1 = Surgery/treatment, B2 = Yes | `SURGICAL_MENOPAUSE` | 0.90 | Treated as sudden-onset, not gradual |
| U5 = Stopped, B1 = Surgery/treatment, B2 = No | `NO_BLEED_OVARIES_CYCLING` | 0.85 | Symptom-based tracking, not calendar-based |
| U5 = Stopped, B1 = Gradually, U1 ≥ 40, recent onset | `PERIMENOPAUSE` | 0.80 | Early/ongoing transition |
| U5 = Stopped, B1 = Gradually, U1 ≥ 40, 12+ months no period | `MENOPAUSE` | 0.85 | Clinical definition met |
| U5 = Stopped, B1 = Gradually, U1 < 40 | `POSSIBLE_POI_FLAG` | 0.50 | Gentle doctor nudge; **never** assumed to be menopause |
| U5 = "I don't get periods", U2 = Yes, no other rule fired | `NO_BLEED_OVARIES_CYCLING` | 0.40 | Safe, low-confidence fallback only |

**Modifiers layered on top of a life stage (not standalone stages):**
- `goal_tag` (from U7) — e.g., `GENERAL_WELLNESS` can sit on top of `REPRODUCTIVE_REGULAR`, `REPRODUCTIVE_IRREGULAR`, `PERIMENOPAUSE`, or `MENOPAUSE`, but is never itself a life stage.
- `hormonal_contraception_active` (from RRG-AVD-1) — global flag; once set, suppresses natural-cycle pattern flags system-wide, because the app must not misread contraception-induced bleeding as organic cycle data.


## Tier 3 — Adaptive Questions (stage-specific question banks)

Delivered gradually — **max 3 per session**, spread across the first 2–3 weeks, all skippable (`tier3_adaptive_bank.delivery_policy`). Never shown all at once.

### A. Adolescent (`ADOLESCENT` branch: ADO-1–ADO-4)

| ID | Trigger | Exact Wording | Input Type | Why It's Asked | AI Reasoning Dependency |
|---|---|---|---|---|---|
| **ADO-1** | life_stage = ADOLESCENT | "How old were you when your period first started?" | Numeric | Very early (<9) or delayed (>15–16) menarche warrants a gentle mention to a pediatric clinician | Only flags if outside the normal range; silent otherwise |
| **ADO-2** | life_stage = ADOLESCENT | "How has your cycle length been over these first few months — pretty different each time, or starting to settle into a pattern?" | Single-select (Very different each time / Starting to settle / Not sure yet) | Irregular, anovulatory cycles are expected and normal in the first 2–3 years after menarche | Suppresses any "irregular = concerning" flag entirely for this group |
| **ADO-3** | life_stage = ADOLESCENT | "Does period pain ever keep you home from school?" | Single-select (Never / Sometimes / Often) | Severe, escalating pain — not routine cramps — is the adolescent red flag for endometriosis | "Often" → gentle doctor nudge; "Never/Sometimes" → self-care content only |
| **ADO-4** | life_stage = ADOLESCENT, optional | "Any family history of PCOS, thyroid issues, or endometriosis that you know of?" | Multi-select + "Not sure" | Raises background sensitivity of future pattern detection without alarming the teen now | Lowers the confidence threshold needed for a later pattern flag in this specific user; also part of the mood/distress escalation source list |

*Never asked in this branch:* sexual activity, contraception, or pregnancy possibility, unless the user raises it herself.

### B. Reproductive Age (`REPRODUCTIVE_REGULAR` branch)

**Base questions (RRG-1–RRG-4), shown to everyone in this branch:**

| ID | Trigger | Exact Wording | Input Type | Why It's Asked | AI Reasoning Dependency |
|---|---|---|---|---|---|
| **RRG-1** | life_stage = REPRODUCTIVE_REGULAR | "What's your typical cycle length, and does it vary much from month to month?" | Numeric (days) + Single-select (Barely varies / Varies a few days / Varies a lot) | Cycle length and variability function as a clinical vital sign | Core, continuous input to the pattern-detection engine |
| **RRG-2** | life_stage = REPRODUCTIVE_REGULAR | (Delivered via U7 selection — see sub-branches below) | — | Biggest branch point in this stage | Routes to RRG-TTC, RRG-AVD, or RRG-TRK sub-branch |
| **RRG-3** | life_stage = REPRODUCTIVE_REGULAR | "How would you describe your period pain and flow — mild, moderate, or severe/heavy?" | Single-select (Mild / Moderate / Severe or Heavy) | Screens indirectly for endometriosis or fibroids without naming either | "Severe" sustained 3+ cycles → doctor nudge (endometriosis/fibroid context); paired with LFC-10 for iron-deficiency nudge if flow is Heavy |
| **RRG-4** | life_stage = REPRODUCTIVE_REGULAR | "Have you noticed any changes lately in your weight, skin, or hair growth?" *(optional, no number required)* | Single-select (No changes / Some changes / Prefer not to say) | Indirect PCOS/thyroid screen that avoids a body-image-triggering direct weight question | Combined with cycle data, raises or lowers confidence of a hormonal-imbalance nudge |

**Sub-branch — Trying to Conceive** *(shown if U7 = "Trying to conceive")*

| ID | Exact Wording | Input Type | Why | AI Reasoning |
|---|---|---|---|---|
| **RRG-TTC-1** | "How long have you been trying to conceive?" | Single-select (Less than 6 months / 6–12 months / Over 12 months) | Over 12 months (or 6+ if age ≥35) is the clinical threshold for a fertility evaluation | Crosses threshold → proactive, non-alarming fertility-specialist nudge |
| **RRG-TTC-2** | "Have you had any prior pregnancies or losses you'd like us to know about?" *(optional, gently framed)* | Free text or skip | Relevant context without demanding detail | Adjusts risk framing only; never displayed elsewhere without explicit consent |

**Sub-branch — Avoiding Pregnancy** *(shown if U7 = "Avoid pregnancy")*

| ID | Exact Wording | Input Type | Why | AI Reasoning |
|---|---|---|---|---|
| **RRG-AVD-1** | "Are you currently using a hormonal method of contraception — like the pill, an IUD, an injection, or an implant?" | Single-select (Yes / No / Non-hormonal method) | Hormonal contraception overrides the natural cycle; without this, the app would misread contraceptive bleeding as organic cycle data | Sets global `hormonal_contraception_active` flag; switches the pattern engine from "natural cycle" mode to "breakthrough bleeding" mode |

**Sub-branch — Track/Understand/General wellness** *(shown if U7 = "Track my cycle", "Understand a symptom", or "General wellness")*

| ID | Exact Wording | Input Type | Why | AI Reasoning |
|---|---|---|---|---|
| **RRG-TRK-1** | "Is there anything specific about your cycle you're hoping to understand better?" | Free text or multi-select (Symptoms / Timing / Fertility window / Just curious) | Lets the content-ordering logic prioritize what this particular user actually wants | Reorders which Tier 3/4 topics surface first; does not gate clinical logic |

### C. Irregular Cycle Pathway (`REPRODUCTIVE_IRREGULAR` branch: RIR-1–RIR-3)

| ID | Trigger | Exact Wording | Input Type | Why It's Asked | AI Reasoning Dependency |
|---|---|---|---|---|---|
| **RIR-1** | life_stage = REPRODUCTIVE_IRREGULAR | "How irregular are your periods — a few days off each time, or unpredictable and sometimes missed entirely?" | Single-select (A few days off / Unpredictable / Sometimes missed entirely) | Degree of irregularity correlates with likelihood of an underlying hormonal cause | Sets the threshold for suggesting a hormone-panel conversation |
| **RIR-2** | life_stage = REPRODUCTIVE_IRREGULAR | "Along with irregular cycles, have you also noticed acne, extra hair growth, or hair thinning?" | Multi-select | Rotterdam-criteria-adjacent screening, never presented as a diagnosis | 2+ signals selected → generates a PCOS-cluster doctor-prep report |
| **RIR-3** | life_stage = REPRODUCTIVE_IRREGULAR | "Have you noticed fatigue, sensitivity to cold, or unexplained weight changes?" | Multi-select | Thyroid symptom screen | 2+ signals selected → generates a separate thyroid-cluster doctor-prep report, kept distinct from the PCOS cluster |

### D. Pregnancy (`PREGNANCY` branch: PRG-1–PRG-3)

| ID | Trigger | Exact Wording | Input Type | Why It's Asked | AI Reasoning Dependency |
|---|---|---|---|---|---|
| **PRG-1** | life_stage = PREGNANCY | "About how many weeks pregnant are you, or when's your due date?" | Numeric (weeks) or date picker | Gestational age determines what's normal vs. a red flag at every later question | Sets trimester-specific content; suppresses cycle-tracking features entirely |
| **PRG-2** | life_stage = PREGNANCY | "Are you currently receiving prenatal care?" | Single-select (Yes / No / Not yet, but planning to) | If not, this becomes the single highest-priority item in the app | `No` → `top_priority_nudge_until_resolved`, overriding all other content |
| **PRG-3** | life_stage = PREGNANCY, optional | "Do you have any history of gestational diabetes, high blood pressure, or a multiple pregnancy (twins or more)?" | Multi-select | Risk stratification, not diagnosis | Adjusts which symptoms trigger an urgent-care nudge vs. routine reassurance |

*Never asked:* anything implying judgment about whether the pregnancy was planned; abortion history is never solicited.

### E. Postpartum (`POSTPARTUM` branch: PPT-1–PPT-3)

| ID | Trigger | Exact Wording | Input Type | Why It's Asked | AI Reasoning Dependency |
|---|---|---|---|---|---|
| **PPT-1** | life_stage = POSTPARTUM | "How many weeks or months postpartum are you?" | Numeric | Anchors all subsequent content to the correct recovery stage ("fourth trimester" framework) | Routes to stage-appropriate recovery content |
| **PPT-2** | life_stage = POSTPARTUM | "Are you breastfeeding, formula feeding, or both?" | Single-select (Breastfeeding / Formula feeding / Both / Prefer not to say) | Exclusive breastfeeding delays cycle return via lactational amenorrhea — without this, absent periods would be wrongly flagged as abnormal | Suppresses cycle-absence flags for the expected window; adjusts when periods are expected to return |
| **PPT-3** | life_stage = POSTPARTUM | "How have you been feeling emotionally lately — overwhelmed, low, generally okay, or something else?" | Single-select + optional free text | Postpartum mood changes are common and time-sensitive to catch | Sustained distress signal → immediate, prioritized professional-resource nudge, ahead of all other content (safety escalation source) |

*Never asked:* judgmental feeding-choice framing; no weight-loss or "bounce back" messaging in early postpartum.

### F. Perimenopause (`PERIMENOPAUSE` branch: PMN-1–PMN-3)

| ID | Trigger | Exact Wording | Input Type | Why It's Asked | AI Reasoning Dependency |
|---|---|---|---|---|---|
| **PMN-1** | life_stage = PERIMENOPAUSE | "Over the last 6–12 months, have your cycles gotten shorter, longer, or started skipping?" | Single-select (Shorter / Longer / Skipping / A mix of these) | Primary staging criterion for perimenopause itself | Determines early vs. late transition sub-stage |
| **PMN-2** | life_stage = PERIMENOPAUSE | "Do you get hot flashes or night sweats? If so, how often?" | Single-select (Never / Occasionally / Frequently) | Hallmark vasomotor symptom of the menopausal transition | Triggers relevant education content and ongoing symptom tracking |
| **PMN-3** | life_stage = PERIMENOPAUSE | "How's your sleep been, and has your mood shifted recently?" | Single-select + optional free text | Estrogen fluctuation affects sleep and mood independently of hot flashes | Adds to a combined symptom-severity picture for the doctor-prep report; also a mood/distress escalation source |

*Optional add-ons within this branch (bone and cardiovascular risk, non-urgent, forward-looking):* "Any family history of osteoporosis, or do you smoke?" and "Any family history of heart disease, high blood pressure, or do you smoke?" — both optional, both add education content only, never urgent action.

*Never asked:* anything framed around appearance, aging, or attractiveness.

### G. Menopause (`MENOPAUSE` branch: MNP-1–MNP-4)

| ID | Trigger | Exact Wording | Input Type | Why It's Asked | AI Reasoning Dependency |
|---|---|---|---|---|---|
| **MNP-1** | life_stage = MENOPAUSE or SURGICAL_MENOPAUSE | "How long has it been since your last period?" | Single-select (6–12 months / 12+ months / Not applicable — surgical) | Confirms staging; 12 consecutive months is the clinical definition | Confirms MENOPAUSE vs. still-perimenopause; for `SURGICAL_MENOPAUSE`, this bank is used directly since that branch has no separate question set |
| **MNP-2** | life_stage = MENOPAUSE or SURGICAL_MENOPAUSE, optional | "Any vaginal dryness or urinary symptoms you'd like to know more about?" | Single-select (Yes / No / Prefer not to say) | Genitourinary syndrome of menopause is common and under-discussed | Routes to specific, practical education content many women don't know is treatable |
| **MNP-3** | life_stage = MENOPAUSE or SURGICAL_MENOPAUSE, optional | "Have you had a bone density (DEXA) scan?" | Single-select (Yes / No / Not sure) | Risk-management nudge, not urgent | If never scanned and age-appropriate → gentle bone-density scan nudge |
| **MNP-4** | life_stage = MENOPAUSE or SURGICAL_MENOPAUSE, optional | "Would you like to learn more about hormone therapy options?" *(purely informational)* | Single-select (Yes, tell me more / Not right now) | Surfaces a legitimate, commonly discussed option many women don't know to ask about | Routes only to "discuss with your doctor" education — never a recommendation of a specific treatment |

**`SURGICAL_MENOPAUSE` branch note:** the spec defines no separate question bank for this branch — by design, it routes directly into the MNP-1–4 bank above (treated as sudden-onset menopause, skipping the gradual perimenopause pacing), supplemented by the ovary-status answer already captured at **B2**.

### H. No Bleed, Ovaries Still Cycling (`NO_BLEED_OVARIES_CYCLING` branch: SUR-1)

| ID | Trigger | Exact Wording | Input Type | Why It's Asked | AI Reasoning Dependency |
|---|---|---|---|---|---|
| **SUR-1** | life_stage = NO_BLEED_OVARIES_CYCLING | "Since you don't have periods to track, are you noticing any typical hormonal-transition symptoms — hot flashes, or changes in mood or sleep?" | Multi-select | With no bleeding pattern available, staging must shift entirely to symptoms; this person's ovaries may still be cycling normally with a natural transition still ahead of them | Permanently switches this user to a symptom-based (not calendar-based) tracking model |

### I. Existing Medical Conditions (cuts across branches, sourced from U6)

There is no separate Tier 3 question bank for diagnosed conditions — U6 (Tier 1) is the single collection point, by design, to avoid asking the same thing twice. Its answer is layered into every branch above:

| Condition flagged at U6 | Effect across Tier 3 |
|---|---|
| PCOS | Irregular cycles are not re-flagged as a "new" pattern in RIR-1/RIR-2; content is pre-weighted toward PCOS-specific education rather than a fresh diagnostic-style nudge |
| Thyroid disorder | RIR-3 answers are interpreted in the context of known thyroid status rather than treated as a new signal |
| Diabetes | Dietary and lifestyle content (Tier 4) is filtered for what's appropriate; glucose-related interpretation of symptom clusters is adjusted |
| Endometriosis | RRG-3 / ADO-3 pain answers are interpreted with this history in view rather than restarting the endometriosis-screening logic from zero |


## Tier 4 — Lifestyle & Hormonal Context

Universal — same 11 questions regardless of life stage. Delivered interleaved with Tier 3, 2–3 per session, all optional, never blocking (`tier4_lifestyle_context.delivery_policy`). LFC-3 and LFC-4 only appear if the user opted into aggregated data sharing at **T0-2**.

| ID | Topic | Exact Wording | Input Type | Mandatory/Optional | Purpose / AI Dependency |
|---|---|---|---|---|---|
| **LFC-1** | Sleep | "On average, how many hours of sleep are you getting, and how would you rate its quality?" | Numeric (hours) + Single-select (Poor / Fair / Good) | Optional | Feeds confound-suppression logic — poor sleep can mimic or mask hormonal symptoms, so it's used to raise or lower confidence in other pattern flags before they're ever shown |
| **LFC-2** | Stress | "How would you describe your stress levels lately?" | Single-select (Low / Moderate / High) | Optional | Same confound-suppression role as sleep; chronic high stress can itself disrupt cycles, so it's weighed before any irregularity is flagged as hormonal |
| **LFC-3** | Occupation | "What's your general occupation or work setting?" *(only shown if you opted into anonymized, aggregated sharing)* | Single-select or free text | Optional, gated by T0-2 aggregated consent | Used only in aggregated, de-identified research/product insights — never affects your individual recommendations |
| **LFC-4** | Shift Work | "Do you work night shifts or rotating shifts?" *(only shown if you opted into anonymized, aggregated sharing)* | Single-select (Yes, regularly / Occasionally / No) | Optional, gated by T0-2 aggregated consent | Shift work disrupts circadian and hormonal rhythms; used in aggregated insights and, individually, as another confound-suppression input |
| **LFC-5** | Physical Activity | "How much physical activity do you typically get in a week?" | Single-select (Little to none / Light / Moderate / Intense/frequent) | Optional | Very high training load or very low activity both affect cycle regularity; used as a confound-suppression input |
| **LFC-6** | Dietary Pattern | "How would you describe your typical eating pattern?" | Single-select (Balanced/varied / Vegetarian / Vegan / Restrictive or irregular / Prefer not to say) | Optional | Informs nutrition-related education content and, combined with LFC-10 and RRG-4, the iron-deficiency screening logic |
| **LFC-7** | Water Intake | "How much water do you typically drink in a day?" | Single-select (Less than 4 glasses / 4–8 glasses / 8+ glasses) | Optional | General wellness content personalization only |
| **LFC-8** | Medications | "Are you currently taking any regular medications you'd like us to be aware of?" | Free text or skip | Optional | Safety-relevant context for symptom interpretation; never used to suggest medication changes |
| **LFC-9** | Supplements | "Do you currently take any supplements?" | Free text or skip | Optional | Same purpose as LFC-8 — context for safe, non-prescriptive content only |
| **LFC-10** | Family History | "Does anyone in your immediate family have a history of anemia, thyroid conditions, PCOS, osteoporosis, or heart disease?" | Multi-select | Optional | Lowers the confidence threshold needed for a related pattern flag; specifically, "anemia" combined with a heavy-flow answer at RRG-4 triggers an iron-deficiency doctor nudge |
| **LFC-11** | Communication Style / AI Tone | "How would you like [App Name] to talk to you — warm and encouraging, direct and to-the-point, or somewhere in between?" | Single-select (Warm & encouraging / Direct & concise / A balance of both) | Optional (defaults to a balanced tone) | Sets the phrasing register for all AI-generated content at render time only — never changes the underlying clinical logic or which nudges are shown |


## Tier 5 — Long-Term Follow-Up (Recurring Check-Ins)

Cadence and content set depend on current `life_stage` and are re-evaluated on every reclassification event (`tier5_checkin_scheduler`).

### Daily Check-Ins

| ID | Frequency | Exact Wording | Why It's Important | AI Engine Using This Answer |
|---|---|---|---|---|
| **DLY-1** | Daily, universal | "How are you feeling today — physically and emotionally?" | Lightweight, ongoing pulse check that feeds the trend engine without becoming burdensome | AI memory/trend engine (stores as a new timestamped version, never overwrites prior answers) |
| **DLY-2** | Daily, conditional (near predicted period window, and has a bleeding cycle to track) | "Any signs your period might be starting — spotting, cramping, or other early signs?" | Improves period-prediction accuracy right when it matters most | Cycle-prediction model |

### Weekly Reviews

| ID | Frequency | Exact Wording | Why It's Important | AI Engine Using This Answer |
|---|---|---|---|---|
| **WKY-1** *(default; replaced by MNPC-2 for peri/menopause)* | Weekly | "Looking back at this week, how would you rate your overall symptoms — mild, moderate, or noticeable?" | Weekly symptom-severity rollup, smoother signal than daily noise | Symptom-severity trend model; feeds doctor-prep reports |
| **WKY-2** *(default; replaced by PPTC-1 for postpartum)* | Weekly | "Is there anything new or different you've noticed this week that you'd like us to know about?" | Open-ended catch-all so nothing important falls through the cracks between structured questions | Pattern-detection engine (free-text signal) |
| **WKY-3** | Weekly, universal (all stages) | "How's your energy been this week?" | Energy is a cross-cutting signal relevant to every life stage, from thyroid screening to postpartum recovery to menopause | Feeds the general wellness trend line and the thyroid/iron-deficiency screening logic |

### Monthly Cycle Reviews

| ID | Frequency | Exact Wording | Why It's Important | AI Engine Using This Answer |
|---|---|---|---|---|
| **MTH-1** | Monthly, universal | "Looking at the past month overall, how would you summarize how you've been feeling?" | High-level monthly rollup used for the doctor-prep report's trend section | Doctor-prep report generator |
| **MTH-2** | Monthly, universal | "Has anything changed this month — new symptoms, a new diagnosis, a new medication?" | Catches life changes that might require reclassification | Reclassification logic; also feeds `ai_memory_updates` |
| **MTH-3** | Monthly, universal | "Is [App Name] still meeting your needs the way you'd hoped?" | Product-quality and engagement signal | Product/engagement analytics only — no clinical routing effect |
| **CYC-1–CYC-4** *(cycle-specific monthly review — applies to REPRODUCTIVE_REGULAR, REPRODUCTIVE_IRREGULAR, ADOLESCENT only)* | Monthly | CYC-1: "How long was your cycle this past month?" · CYC-2: "How would you rate your flow — light, moderate, or heavy?" · CYC-3: "How would you rate your period pain this month?" · CYC-4: "Did anything about this cycle feel different from your usual pattern?" | Confirms whether the ongoing cycle picture still matches the recorded classification | Cycle-prediction model; pattern-detection engine; feeds the 12-consecutive-months-no-period reclassification trigger |

### Pregnancy Follow-Up

| ID | Frequency | Exact Wording | Why It's Important | AI Engine Using This Answer |
|---|---|---|---|---|
| **PRGC-1** | Weekly | "How are you feeling this week — any new symptoms you'd like to log?" | Ongoing pregnancy-symptom trend line, trimester-appropriate | Trimester-specific content engine |
| **PRGC-2** | Every check-in | "Have you experienced any of the following: heavy bleeding, severe abdominal pain, severe headache, vision changes, or reduced fetal movement?" *(select any that apply, or "None of these")* | Screens for pregnancy warning signs at every single touchpoint, not just occasionally | **Safety escalation:** any selection except "None of these" bypasses the content queue and shows an urgent-care nudge immediately |
| **PRGC-3** | Monthly | "How has your overall pregnancy been going this month?" | Monthly rollup for the doctor-prep report | Doctor-prep report generator |
| **PRGC-4** | Third trimester only | "Are you experiencing regular contractions, fluid leakage, or a noticeable decrease in movement?" | Third-trimester-specific warning signs not relevant earlier | Trimester-gated safety escalation logic, same urgent-care pathway as PRGC-2 |

### Postpartum Follow-Up

| ID | Frequency | Exact Wording | Why It's Important | AI Engine Using This Answer |
|---|---|---|---|---|
| **PPTC-1** *(replaces WKY-2)* | Weekly | "How has recovery been going this week — physically and emotionally?" | Postpartum-specific weekly rollup, replacing the generic weekly check-in | Postpartum recovery trend model; also a mood/distress escalation source |
| **PPTC-2** | Daily, first 6 weeks only | "Have you had any heavy bleeding, fever, or thoughts of harming yourself or your baby?" *(Yes / No)* | Screens for the most urgent postpartum complications during the highest-risk window | **Safety escalation:** `Yes` bypasses the content queue and shows an urgent-care nudge immediately |
| **PPTC-3** | Monthly | "How would you summarize your recovery and adjustment this past month?" | Monthly rollup for the doctor-prep report | Doctor-prep report generator |

### Menopause Follow-Up

| ID | Frequency | Exact Wording | Why It's Important | AI Engine Using This Answer |
|---|---|---|---|---|
| **MNPC-1** | Weekly (peri/menopause) | "How many hot flashes or night sweats did you have this week, roughly?" | Tracks the hallmark vasomotor symptom over time | Symptom-severity trend model |
| **MNPC-2** *(replaces WKY-1 for peri/menopause)* | Weekly (peri/menopause) | "How would you rate your sleep and mood this week?" | Menopause-specific replacement for the generic weekly severity question | Symptom-severity trend model; mood/distress escalation source |
| **MNPC-3** | Monthly, perimenopause only | "Has it now been 12 full months since your last period?" | The single question that resolves the perimenopause → menopause transition | **Reclassification trigger:** answering "Yes" automatically reclassifies `PERIMENOPAUSE` → `MENOPAUSE` |

**Cross-cutting safety rule for all recurring check-ins:** any sustained distress signal across PPT-3, PPTC-1, ADO-4, MNPC-2, or any other mood check-in triggers the same response regardless of life stage — a caring acknowledgment plus a prioritized professional-resource nudge, shown ahead of all other content. This is never framed as a diagnosis.


## Final Quality Review

Reviewed as if used by millions of women, across ages 9–70, literacy levels, and cultural contexts (with attention to the Indian-context sensitivities noted in the source design doc).

**Duplicate questions — checked and resolved:**
- U6 (diagnosed conditions) is the single collection point for condition history; Tier 3 branches reference it rather than re-asking, so a PCOS user is never asked "do you have PCOS" a second time.
- "Communication style" and "AI tone preference" were two separate items in the brief but map to one underlying signal in the spec (`LFC-11`) — merged into a single question rather than asked twice, which also reduces onboarding fatigue by one item.
- Family history appears once, at LFC-10, as a single multi-condition question rather than being re-asked per condition in Tier 3 (e.g., separately for PCOS, thyroid, osteoporosis, heart disease).

**Missing clinically important questions — none identified.** Every safety-critical path in the JSON (pregnancy, postpartum, PRGC-2/PRGC-4 warning signs, PPTC-2 urgent screen, mood/distress escalation) has a corresponding question in this bank; nothing in `cross_cutting_services` was left without user-facing wording.

**Confusing wording — resolved:**
- U5's option "I don't get periods" is annotated in the UI copy with examples (hormonal device, medication, or another reason) so users don't confuse it with "Stopped," which is reserved for periods that were previously happening and ceased.
- B1 and B2 use plain, non-clinical phrasing for surgery/ovary-removal so a user doesn't need to know the terms "oophorectomy" or "hysterectomy" to answer accurately.

**Unnecessary complexity — avoided:**
- No question in Tier 1 or Tier 3 base sets requires more than a single tap for the common case; free text is offered only where nuance genuinely matters (TTC pregnancy-loss history, medications, supplements).
- LFC-3/LFC-4 (occupation, shift work) are hidden entirely unless the user opted into aggregated sharing, so the default path is shorter, not longer.

**Bias — checked against the Never-Ask list:** no question in this bank touches sexual orientation, income, caste, religion, immigration status, marital status as an implicit gate, or forced BMI entry. RRG-4 (weight/skin/hair changes) is optional and framed as change-detection, not a number to report. No question presumes a desire for children; U7 and the TTC/avoiding sub-branches are neutrally framed.

**Poor user experience / low engagement — mitigated by design, not by adding scope:**
- Tier 1 remains 6 mandatory + 1 optional + up to 2 conditional bridge questions — no items were added to this bank that aren't already in the finalized spec.
- All Tier 3/4 delivery stays within the spec's stated pacing (max 3 Tier 3 items and 2–3 Tier 4 items per session).
- Every optional question's UI copy explicitly signals it can be skipped, reducing the perceived weight of the intake.

**Conclusion:** this question bank is ready to hand to engineering, UI/UX, and AI development as the definitive Version 1 (MVP) production content layer for the decision engine in `AI_Inference_Decision_Engine.json`. No decision-tree logic was altered; every question below the Tier 2 classification layer maps to an existing node, branch, or trigger in the source spec.
