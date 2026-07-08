# Handoff: Phase 3 → Phase 4 (Engineer)

> Date: 2026-07-09 · From: UX Designer · To: Engineer

## What was delivered

- `docs/ux-design.md` — 16-section UX and interface system document

## Key UX decisions

1. **Home page**: Daily Challenge status card (3 states) + 4 mode quick-start tiles + SEO text below fold
2. **Daily flow**: 4 puzzle cards → solve in any order → locked cards show score → total + multiplier → share
3. **Feedback**: Correct/wrong/skip/fail each have distinct icon + text + color (never color alone)
4. **Result modal**: Answer + score + fact + share + next/back buttons
5. **Share**: Web Share API on mobile, clipboard on desktop, ASCII-style text card
6. **Mobile**: 5-tab bottom nav (Home/Daily/Play/Stats/More), 44px touch targets, 100dvh layout
7. **Timeline**: Vertical list with drag-and-drop + move up/down buttons (accessibility alternative)
8. **Keyboard**: Tab order, Enter submit, Esc close modal, arrow keys for Timeline
9. **Design tokens**: Dark theme, 4px spacing unit, CSS custom properties

## Component inventory (30+ components)

### Layout
- `Header`, `BottomNav`, `SkipLink`, `MainLayout`

### Home
- `DailyStatusCard` (3 states: not-started, in-progress, complete)
- `ModeTile` (4 variants: keywords, emoji, screenshot, timeline)

### Daily Challenge
- `DailyChallengeGrid`, `PuzzleCard` (locked/unlocked states)

### Game interaction
- `PuzzleInput`, `GuessList`, `GuessItem`
- `RevealButton` (keywords), `HintButton` (emoji), `SharpenButton` (screenshot)
- `GiveUpButton`, `SubmitButton`

### Timeline
- `TimelineList`, `TimelineItem`, `MoveUpButton`, `MoveDownButton`

### Screenshot
- `BlurImage` (CSS filter blur, 4 levels)

### Result & Share
- `ResultModal`, `ScoreDisplay`, `FactDisplay`
- `ShareButton`, `ShareCard`

### Stats
- `StatsGrid`, `StreakBadge`, `HeatmapCalendar`, `ModeBreakdownChart`

### Accessibility primitives
- `VisuallyHidden`, `LiveRegion`, `FocusTrap`

## Design tokens (CSS custom properties)

```css
--color-bg: #0a0e1a;
--color-surface: #141b2d;
--color-text: #f0f4ff;
--color-muted: #7a8599;
--color-primary: #6366f1;
--color-accent: #22d3ee;
--color-success: #22c55e;
--color-error: #ef4444;
--color-warning: #f59e0b;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--radius: 12px;
--radius-lg: 20px;
--shadow: 0 4px 12px rgba(0,0,0,0.3);
--transition: 200ms ease;
```

## Accessibility requirements (from PRD AC-35 to AC-40)

- All interactive elements ≥ 44×44px
- Never color alone for correct/wrong — always icon + text
- Timeline has button alternative to drag
- All inputs have `<label>` or `aria-label`
- Keyboard navigable for all flows
- `aria-live` regions for game state changes

## Open UX questions for implementation phase

1. Heatmap calendar: CSS grid vs SVG (CSS grid simpler, SVG more flexible)
2. Share card ASCII format: final character set and layout
3. Bottom nav "More" tab: what goes in the overflow menu?
