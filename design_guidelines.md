# Mirror Play Design Guidelines

## Design Approach: Existing Design System Implementation

**Selected Approach:** Following the established Mirror Play design system - a dark-mode emotional wellness application with neon accents, glass morphism, and ambient lighting effects inspired by Headspace's calming interface, Duolingo's gamification, and Linear's clean typography.

---

## Core Design Elements

### A. Typography
- **Primary Font:** Inter (via CDN)
- **Hierarchy:**
  - H1: 2xl-3xl, font-semibold for page titles
  - H2: xl-2xl, font-medium for section headers  
  - H3: lg-xl, font-medium for card titles
  - Body: text-sm to text-base, normal weight
  - Captions: text-xs, muted-foreground color
- **Special Treatment:** Text glow effects for emphasis (`.text-glow-purple`, `.text-glow-pink`)

### B. Layout System
**Spacing Primitives:** Use Tailwind units of **2, 4, 6, 8, 12, 16, 20, 24** for consistency
- Tight spacing: p-2, p-4, gap-2
- Standard spacing: p-6, p-8, gap-4, gap-6
- Generous spacing: p-12, p-16, p-20, gap-8
- Section spacing: py-16, py-20, py-24

**Container Strategy:**
- Full-width app: Use entire viewport with bottom navigation clearance (pb-20)
- Content containers: max-w-4xl mx-auto for centered content
- Cards: Consistent rounded-xl (12px) with glass or solid backgrounds

### C. Color & Visual Treatment

**Core Palette (Enforced Dark Mode):**
- Background: `hsl(0 0% 11%)` - deep charcoal
- Foreground: `hsl(40 10% 95%)` - warm off-white
- Card: `hsl(0 0% 14%)` with `hsl(0 0% 18%)` borders
- Muted: `hsl(0 0% 21%)` for secondary surfaces

**Accent System:**
- Mirror Glow Primary: `hsl(320 100% 75%)` - vibrant pink-purple
- Mirror Glow Secondary: `hsl(280 100% 70%)` - deeper purple
- Use sparingly for CTAs, active states, achievement highlights

**Neon Glow Utilities:**
- Purple glow: Score improvements, calm achievements
- Pink glow: Empathy bonuses, connection moments  
- Amber glow: Streak milestones, warmth indicators
- Violet glow: Premium features, AI interactions

### D. Component Library

**Navigation:**
- Bottom navigation bar (mobile-first): 5 icons with labels, active state highlighted with mirror-glow accent
- Top bar (when needed): Minimal, transparent glass effect with back button

**Cards & Surfaces:**
- **Glass Cards** (`.glass-dark`): Primary UI containers with frosted backdrop-filter blur(20px)
- **Solid Cards** (`bg-card border border-card-border`): Secondary content, less emphasis
- **Glow Cards**: Add `.glow-purple` or `.glow-pink` for achievements, active sessions

**Buttons:**
- Primary: `bg-primary text-primary-foreground` (warm tan) with hover elevation
- Secondary: `bg-secondary` (dark gray) with subtle glow on hover
- Destructive: `bg-destructive` with warning glow
- Ghost: Transparent with hover elevation only

**Progress Indicators:**
- Circular XP rings: SVG-based with animated stroke-dashoffset
- Linear progress bars: Shimmer effect, glow pulse on completion
- Streak flames: Animated intensity based on current streak length

**Modals & Overlays:**
- Full-screen modals with ambient blur background
- Dialog components with glass-dark treatment
- Toast notifications positioned top-center with slide-in animation

**Interactive Elements:**
- Microphone button (voice mode): Large circular button with pulsing glow when listening
- Text input: Glass treatment with glow border on focus
- Category selectors: Grid cards with hover lift + glow
- Question cards: Fade-in slide-up entrance, confetti on completion

### E. Visual Effects & Animations

**Ambient Lighting:**
- Global ambient glow effect behind main content areas
- Rim lighting on card edges (subtle)
- Accent lighting following user achievements

**Particle Systems:**
- 60+ floating particles in background (Canvas 2D, GPU-accelerated)
- Subtle drift movement, no distracting motion
- Achievement bursts: Confetti on milestone completions

**Glass Morphism:**
- Frosted blur with subtle transparency on all card surfaces
- Specular highlights following cursor position (desktop only)
- Border shimmer on hover states

**Animation Principles:**
- Entrance: Fade-in + slide-up (200ms ease-out)
- Hover: Lift 2-4px + subtle glow (150ms)
- Active: Scale down 0.98 (100ms)
- Exit: Fade-out (150ms)
- Use sparingly - prioritize clarity over spectacle

---

## Screen-Specific Guidelines

### Home Screen (Dashboard)
- **Hero Area:** Large luminous orb avatar (center), 6 mood states with particle fields
- **Primary CTA:** Single "Talk to Mirror" button (mirror-glow accent, large)
- **Stats Drawer:** Slide-up panel showing XP/streak/badges (glass-dark)
- **Layout:** Avatar-centric with bottom-aligned CTA, minimal distractions

### Daily Capsule Flow
- **Intro Card:** Today's theme with category preview, warm glow accent
- **Category Grid:** 2-column cards (md: 3-column) with icons, hover lift effect
- **Question Display:** Full-screen card, progress bar top, large readable text
- **Results Screen:** Confetti animation, circular XP display (center), PP count, streak meter

### AI Companion Chat
- **Chat Interface:** Bubble layout, user (right/warm), AI (left/purple glow)
- **Emotion Tags:** Small pills above AI responses ("you sound stressed")
- **Input Area:** Glass bar with microphone button (primary) + text fallback
- **Typing Indicator:** Pulsing dots with purple glow

### Scenario Rehearsal
- **Scenario Cards:** List view with difficulty indicator, category tag
- **Rehearsal Screen:** Split view - scenario context (top), conversation (bottom)
- **Tone Feedback:** Live meter during interaction, final score card on completion

### Shop & Inventory
- **Shop Grid:** 2-3 columns, rarity badges (common/rare/epic), PP price tags
- **Item Cards:** Preview image, name, purchase button with PP cost
- **Inventory:** Owned items grid, "Equip" action with active state highlight

### Progress & Journey
- **Weekly Trend:** Line chart with gradient fill (mirror-glow colors)
- **Badges Grid:** Achievement cards with unlock animations
- **Streak Display:** Flame icon with intensity level, milestone markers

---

## Images
No external images needed - all visuals are generated through:
- SVG-based avatar system (luminous orb with particles)
- Icon library (Lucide React)
- Particle effects (Canvas 2D)
- Gradient backgrounds (CSS)

---

## Accessibility
- Maintain WCAG AA contrast ratios (already achieved in dark mode palette)
- Focus rings: `ring-2 ring-ring ring-offset-2` (purple accent)
- Screen reader labels on all interactive elements
- Keyboard navigation for all flows