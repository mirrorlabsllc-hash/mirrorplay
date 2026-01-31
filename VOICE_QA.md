# VOICE_QA.md
## Mirror Play — Voice Quality Assurance Guide
**Version:** 1.0  
**Scope:** All TTS, voice acting, narration, analysis, and scenario delivery

---

## Purpose

This document defines the **non-negotiable standards** for voice delivery in Mirror Play.

Mirror Play is **presence-based rehearsal**, not instruction, coaching, or therapy.  
The voice must feel like a calm observer who **sets a moment and leaves space**.

If any rule in this document fails, the build does **not** ship.

---

## Voice Identity (Locked)

**The voice is:**
- Calm
- Grounded
- Observational
- Neutral-warm
- Present

**The voice is NOT:**
- A coach
- A teacher
- A narrator
- A therapist
- Motivational or upbeat

> If it sounds like advice, encouragement, or performance — it’s wrong.

---

## 10-Second Voice Calibration Script
**Run this verbatim for every new voice, provider, or model update.**

### Script (≈9–11 seconds)
> “Something just shifted.  
> They stop talking and look at you.  
> There’s a quiet pause now.”

### How to Run
- Playback speed: **1×**
- No background audio
- No UI sounds
- Listen once with eyes closed

### Pass / Fail
- **PASS:** You feel the silence and want to speak  
- **FAIL:** It sounds like narration, advice, or a character

This script must never be edited.

---

## Core Delivery Rules

### Pacing
- Target **0.85–0.95×** conversational speed
- Never rush scene-setting lines
- Silence is intentional

### Pauses
- Clause pause: **250–400ms**
- Section pause: **600–900ms**
- End-of-handoff pause (before mic opens): **~700ms**

### Intonation
- Downward endings (no uptalk)
- No “smile in the voice”
- No dramatic emphasis

---

## Content-Specific Direction

### Scenario / Handoff (Before User Speaks)
- Slower pacing
- Minimal emphasis
- Final line trails into silence

**Rule:**  
The voice must disappear after setting the moment.

---

### Analysis — What Landed (Presence)
- Observational
- Warm but restrained
- No praise, no judgment

---

### Analysis — How It Played (Performance)
- Slightly firmer
- Clear articulation
- Emphasize verbs, not “you”

---

### Analysis — One Reframe (Optional)
- One sentence
- Quiet, reflective
- Never instructional

---

## Difficulty Modulation (Cadence Only)

**Words do not change. Delivery does.**

### Beginner
- Slower pace
- Longer pauses
- Softer delivery

### Intermediate
- Neutral pace
- Balanced pauses

### Advanced
- Tighter pace
- Fewer pauses
- Cleaner delivery

---

## Language Guardrails

Never allow:
- Questions
- Exclamation points
- Emojis
- “You should”
- “Next time”

Allowed:
- Neutral observation
- Conditional phrasing (“may have,” “likely”)
- Single forward cue

---

## Provider-Specific Defaults

### ElevenLabs
- Stability: **60–70**
- Similarity: **70–80**
- Style Exaggeration: **Low**
- Speed: **0.9×**
- Watch for emotional over-expression

### Azure Neural TTS
```xml
<prosody rate="90%" pitch="-2%">
  ...
</prosody>
<break time="600ms"/>
```

Add breaks intentionally

Prevent announcer tone

### OpenAI TTS

Slightly reduce speed if available

Prefer periods over commas

Split long sentences

---

## Regression Checklist (Hard Gate)

Run this before every release.

1. **Tone Integrity**
   - Calm, not upbeat
   - No coaching energy
   - No over-expression
   - Downward sentence endings

2. **Cadence & Silence**
   - Slightly slower than conversation
   - Intentional pauses
   - Silence after handoff
   - Mic does not open immediately

3. **Language Alignment**
   - No questions
   - No instructional verbs
   - No praise
   - No exclamations or emojis

4. **Presence vs Performance**
   - Presence reflected first
   - Performance reflected second
   - One subtle reframe max
   - No multi-step advice

5. **Difficulty Sensitivity**
   - Beginner softer than Advanced
   - Advanced tighter than Beginner
   - Cadence changes, words do not

6. **Provider Consistency**
   - Same calibration script across providers
   - Same perceived personality
   - No provider sounds more excited or rushed

7. **Gut Check (Non-Negotiable)**
   Ask honestly:

   “Would I talk to someone like this in a tense moment?”

   - Yes → ship
   - No → tune again

**Final Rule**

Mirror Play’s voice sets moments.  
It does not tell users what to do.

If you’re unsure, default to less voice, more silence.

This document is authoritative.  
If voice delivery conflicts with this guide, the guide wins.