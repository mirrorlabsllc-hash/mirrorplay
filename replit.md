# Mirror Play - Emotional Intelligence Practice App

## Overview
Mirror Play is an emotional intelligence and communication practice application. It utilizes AI-powered tone analysis, role-play scenarios, and gamification to help users improve their communication skills. The application features an animated mystical floating orb, representing Mirror AI, to provide an immersive ChatGPT-style conversational experience. The project aims to provide a safe, unjudged, and engaging environment for users to explore and improve their emotional communication.

## User Preferences
- Mobile-first responsive design
- Dark mode default
- Wellness-focused calming aesthetic
- The orb is a non-human, abstract presence - it is a "mirror," not a character
- The orb must NOT have a face, eyes, mouth, or human features
- Do NOT introduce humanoid avatars, masks, or facial expressions
- The orb communicates through motion, color, light, rhythm, and sound-reactive behavior only
- Its job is to reflect tone, pace, and emotional energy — not to judge or perform therapy

## System Architecture

### Core Design Principles
The core design emphasizes a minimal, dark-mode friendly, abstract, and premium feel. The primary focus is on creating a calming and emotionally safe environment. The UI prioritizes voice interaction, assuming the user is speaking, with text input being secondary. The visual representation of Mirror AI is a mystical floating orb that communicates through motion, color, light, rhythm, and sound-reactive behavior, reflecting tone and emotional energy without human features.

### Orb States
- **Neutral/Default**: Slow pulse, soft glow.
- **Tone-Reactive**: Reacts to voice volume/pitch/rhythm, color shifts based on intensity.
- **Grounding**: Slower pulse, lower brightness for de-escalation.
- **Playful/Reward**: Slight bounce, brighter colors for streaks and wins.
- **Reflective/Review**: Subtle echo effects, highlights tone shifts visually.

### Technical Implementation
The application is built with a **React + Vite + TypeScript** frontend, an **Express.js + TypeScript** backend, and a **PostgreSQL database with Drizzle ORM**. Authentication is handled via **Replit Auth (OIDC)**. **OpenAI GPT-4o** is used for tone analysis, and **Whisper** for voice transcription. **ElevenLabs TTS** is optionally integrated for the AI companion. **Stripe** is used for payment processing, integrated via `stripe-replit-sync`. Styling is managed with **Tailwind CSS** using custom design tokens.

### Key Features
- **Mystical Orb AI**: Animated floating orb with voice-reactive effects.
- **Practice Mode**: Voice-first practice with AI tone analysis, detailed feedback, and alternative phrasings.
- **Gamification**: Wheel-driven practice experience with categories, XP progression, daily spins, and rewards.
- **Freemium Model**: Tiered access (Free, Mirror Play+, Pro Mind) with varying daily practice limits and feature sets.
- **Dynamic Theming**: Full light/dark mode support with system preference detection.
- **User Onboarding Tour**: Guided tour for new users highlighting key features.
- **Tone Journey Page**: Analytics page with radar charts for tracking tone mastery.
- **User Feedback Tool**: Floating feedback button for users to submit bug reports, feature requests, and improvement ideas with optional rating.

### UI/UX Decisions
- Dark mode default with glass morphism effects and purple/pink neon glows.
- Ambient particle animations and custom `MirrorAvatar` component with mood states.
- Emphasis on calming visuals and sound effects for user engagement without distraction.

### Database Tables
The database includes tables for users, progress, practice sessions, daily capsules, conversations, scenarios, gamification elements (badges, cosmetics, inventory, wheel rewards), social features (friends, circles, challenges), custom content, voice preferences, user feedback, and Stripe payment data.

## External Dependencies
- **OpenAI API**: For `GPT-4o` (tone analysis) and `Whisper` (voice transcription).
- **ElevenLabs API**: Optional for Text-to-Speech (TTS) functionality.
- **Stripe**: For subscription management and payment processing.
- **Replit Auth**: For user authentication.