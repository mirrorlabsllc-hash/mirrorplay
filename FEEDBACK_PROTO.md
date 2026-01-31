# MIRROR PLAY — PROTOTYPE FEEDBACK SYSTEM (SHIP-SAFE)

## Goal (Lock This)
Collect actionable product feedback from early users about:
- confusion
- friction
- missing pieces
- emotional fit
- “this felt off” moments

Not testimonials. Not ratings. Not app store reviews. This is internal signal, not marketing.

Feedback type label: **Help Improve Mirror Play** (do not call it Feedback/Review/Testimonial/Survey).

## Placement (Low Friction)
- Primary: After 2–3 completed sessions, show a soft card: “Want to help improve Mirror Play?”
- Secondary (optional): Settings item “Help Improve Mirror Play”.
- Do NOT interrupt mid-practice. Do NOT show on first session.

## UI Spec
Title: **Help Improve Mirror Play**
Subtitle: "This is an early prototype. Your input helps shape what comes next."

1) Core Question (open text, required)
- Wording (exact): **“What felt confusing, missing, or off?”**
- Multiline textbox
- Placeholder: "Anything that broke the flow, felt unclear, or didn’t feel useful…"

2) Optional Follow-Ups (checkboxes; multi-select)
Label: **What best describes your feedback?**
- ☐ Something felt confusing
- ☐ The flow felt awkward
- ☐ I wanted more guidance
- ☐ I wanted less guidance
- ☐ The voice felt off
- ☐ The analysis wasn’t helpful
- ☐ Something important is missing
- ☐ Other

3) Context Toggle (default ON)
- Label: **Include my last session context (scenario + analysis, no voice recording)**

4) Submit Button
- Label: **Send Feedback**

## Post-Submit Response
- Single line: **“Got it. This helps more than you know.”**
- No confetti. No dopamine hit.

## Data to Store (Minimum)
- feedback_text
- selected_tags[]
- difficulty_level
- category (if available)
- last_scenario_id (if context toggle on)
- timestamp
- anonymous user ID

Do NOT ask for email. Do NOT force login upgrades.

## Optional Follow-Up (Only after second feedback submission)
- Prompt: **“If you could change one thing, what would it be?”**

## Why This Fits Mirror Play
- Matches presence-first tone
- Avoids flow break
- Invites honesty over politeness
- Keeps improvement signal separate from social proof
- Reinforces: “This isn’t public.”

## Hard Nos
- No “Did you like it?”
- No star ratings
- No multiple open-ended questions beyond the core
- No feature idea fishing on first pass
- No mixing with testimonials or reviews

## Notes for Implementation
- Trigger after session_count >= 2 (or 3) and once per day max.
- Soft card CTA should be dismissible and non-sticky.
- Respect context-toggle default ON; include scenario/analysis text only (never audio).
- Tag the submission source (post-session card vs settings) for analytics.
