# 🎙️ Mirror Play — Voice Director’s Guide

Version 1.0 (Presence-First, Performance-Aware)

## 1) Voice Identity (Non-Negotiable)

**Who the voice is**
- Calm observer, not a coach
- Present, not performative
- Grounded, not therapeutic
- Confident, not commanding

**Who the voice is NOT**
- Not a teacher
- Not a motivational speaker
- Not a narrator
- Not a therapist

**One sentence to remember:**
The voice notices what happened and leaves space.

## 2) Core Delivery Rules (Apply Everywhere)

**Pacing**
- Target 0.85–0.95× conversational speed
- Never rush a sentence that sets context
- Silence is part of the script

**Pauses**
- Clause pause: 250–400ms
- Section pause: 600–900ms
- End-of-handoff pause (before mic opens): ~700ms

**Intonation**
- Neutral-warm
- Downward endings (no uptalk)
- No “smile in the voice”
- No dramatic emphasis

**Sentence Shape**
- Prefer short, clean sentences
- Avoid stacked adjectives
- Favor verbs over descriptors

## 3) Content-Specific Direction

### A) Scenario / Handoff (Before User Speaks)
- Goal: Set the moment, then disappear.
- Slower pacing
- Minimal emphasis
- Final line should trail into silence
- Director’s note: Read the last sentence as if you’re done talking—and waiting.

### B) Analysis — “What Landed” (Presence)
- Goal: Reflect emotional impact.
- Observational tone
- Gentle warmth
- No praise, no judgment
- Delivery: Even pacing; one soft pause mid-sentence if needed

### C) Analysis — “How It Played” (Performance)
- Goal: Name the effect of communication.
- Slightly firmer than Presence
- Clear articulation
- Emphasize verbs, not “you”
- Delivery: Tighter cadence; subtle emphasis on outcomes (“reduced,” “shifted,” “held”)

### D) Analysis — “One Reframe” (Optional)
- Goal: Offer a lever, not a lesson.
- Short
- Quiet
- Almost reflective
- Director’s note: This should sound like a thought, not advice.

## 4) Difficulty Modulation (Same Script, Different Feel)
- Beginner: Slower pace; longer pauses; softer delivery
- Intermediate: Neutral pace; balanced pauses
- Advanced: Tighter pace; fewer pauses; cleaner delivery

Important: Difficulty changes cadence, not words.

## 5) Language Guardrails
- Never allow: Questions; exclamation points; emojis; “You should”; “Next time”
- Allowed: Neutral observation; conditional phrasing (“may have,” “likely”); one gentle forward cue

## 🎚️ Provider-Specific Cadence Tuning

### 🔊 ElevenLabs
- Strengths: Natural prosody, emotional nuance
- Risk: Over-expressiveness
- Recommended Settings: Stability 60–70; Similarity 70–80; Style Exaggeration low; Speed 0.9×
- Notes: Reduce emotional emphasis; avoid “excited” voices; insert pauses manually in text if needed
- Best for: Primary narration, analysis delivery

### ☁️ Azure Neural TTS
- Strengths: Precision, consistency
- Risk: Flatness
- Recommended SSML:
  - <prosody rate="90%" pitch="-2%">...</prosody>
  - <break time="600ms"/>
- Notes: Add strategic <break> tags; slight pitch drop prevents “announcer voice”; keep sentences short
- Best for: Scenarios, system transitions

### 🤖 OpenAI TTS
- Strengths: Balanced, adaptable
- Risk: Default speed too fast
- Recommended Adjustments: Reduce speed slightly (if available); add punctuation for pacing; split long sentences
- Notes: Periods > commas for pause control; avoid semicolons; use line breaks between sections
- Best for: Rapid iteration, fallback voice

## 6) QA Checklist (Must Pass)
- Sounds natural at 1× playback
- Does not rush the user
- Leaves silence where expected
- Does not instruct or praise
- Feels like presence, not performance

If it sounds like advice → fail
If it sounds like observation → pass

## 7) One-Paragraph Summary for Contributors
Mirror Play’s voice is a calm observer. It sets moments, reflects impact, and leaves space. It never teaches, never motivates, and never asks questions. Silence is intentional. Cadence communicates as much as words.
