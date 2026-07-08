# UX Design — Guess the Game

> Created: 2026-07-09 · Status: Draft · Owner: UX Designer
> Source of truth: `docs/PRD.md` (sections 3, 5, 8, 9.7)

## 0. Design Principles

Guess the Game is a casual puzzle product. The interface must disappear so the puzzle can be the experience. Every decision in this document follows three principles:

1. **Zero-onboarding play.** A first-time visitor who has never read the rules should be able to start today's Daily Challenge within 3 seconds of page load. The home page answers "what do I do?" before the user has to ask.
2. **One screen, one job.** Each screen has a single primary action. Daily status card = "Resume" or "Start". Mode tile = "Play". Puzzle screen = "Submit guess". Result modal = "Share" or "Next".
3. **Honest feedback.** Correct, wrong, skip, and fail states are never communicated by color alone. Every state pairs color with an icon, a text label, and an `aria-live` announcement. Color is reinforcement, not information.

**Hard constraints inherited from PRD section 4.2 and 9.7:**

- No sound, no haptics (MVP).
- No animations beyond CSS `transition` and `transform`. No WebGL, canvas, or physics.
- Single dark theme; no theme toggle in MVP.
- Game area always precedes SEO text. First viewport is never ad-occupied (the product has no ads in MVP — this rule is documented to prevent future regression).
- Every interactive element has a minimum 44 × 44 px touch target (AC-35).
- Color is never the sole indicator of state (AC-36).
- Timeline drag always has a button alternative (AC-37).

---

## 1. Complete Sitemap

The sitemap mirrors the information architecture in PRD section 3. Each entry lists the route, primary purpose, and the single most important action a user can take on that screen.

| # | Route | Page Name | Primary Purpose | Primary Action |
|---|-------|-----------|-----------------|----------------|
| 1 | `/` | Home | Tell the user whether today's Daily Challenge is started, in progress, or complete, and offer a fast path into any mode. | Tap the Daily status card or a mode tile. |
| 2 | `/daily` | Daily Challenge | Show the 4 puzzle cards (one per mode) and track per-puzzle completion and total score. | Open a puzzle card; share the result when complete. |
| 3 | `/play/keywords` | Keywords (Unlimited) | Guess a hidden target by revealing vague-to-specific keyword clues. | Type a guess or reveal the next keyword. |
| 4 | `/play/emoji` | Emoji (Unlimited) | Guess a hidden target from an emoji sequence. | Type a guess; request a hint. |
| 5 | `/play/screenshot` | Screenshot (Unlimited) | Identify the subject of a progressively sharpened image. | Type a guess; sharpen the image. |
| 6 | `/play/timeline` | Timeline (Unlimited) | Arrange 4–6 items in chronological order. | Reorder items; submit the order. |
| 7 | `/archive` | Archive | Browse past daily challenges by date. | Tap a date to replay. |
| 8 | `/archive/[date]` | Archive Replay | Replay a specific past challenge from scratch, without affecting streak. | Play the challenge. |
| 9 | `/stats` | Stats | Show streak, best score, 30-day heatmap, and per-mode breakdown. | Review trends; return to play. |
| 10 | `/how-to-play` | How to Play | Explain rules for all 5 modes in static, scannable form. | Return to play. |
| 11 | `/about` | About | Explain the project, content sources, and IP-safe policy. | External links to sources. |
| 12 | `/share/[result-id]` | Shared Result Preview | Render the OG preview card for a shared result so links unfurl in messaging apps. | Open the site to play. |

**Hierarchy:**

```
Home (/)
├── Daily Challenge (/daily)
│   ├── Keywords puzzle (modal/inline, returns to /daily)
│   ├── Emoji puzzle (modal/inline, returns to /daily)
│   ├── Screenshot puzzle (modal/inline, returns to /daily)
│   └── Timeline puzzle (modal/inline, returns to /daily)
├── Play (dropdown on desktop, tab on mobile)
│   ├── /play/keywords
│   ├── /play/emoji
│   ├── /play/screenshot
│   └── /play/timeline
├── Archive (/archive)
│   └── /archive/[date]
├── Stats (/stats)
├── How to Play (/how-to-play)
├── About (/about)
└── /share/[result-id]  (public, OG-rendered)
```

Daily puzzles are presented as a single inline experience inside `/daily`. The user does not navigate away to `/play/keywords` for a daily puzzle; the puzzle UI renders in place or in a modal overlay, and on completion the user is returned to the Daily grid. The `/play/*` routes are reserved for Unlimited mode.

---

## 2. Home Page Layout

The home page is intentionally minimal. It is the single most important screen for retention because it answers "what do I do today?" in one glance.

Layout from top to bottom, mobile-first (max-width 480 px content column, centered on desktop):

### 2.1 Top Navigation Bar (Header)

- Height: 56 px on mobile, 64 px on desktop.
- Left: Wordmark "Guess the Game" (text, not a logo file — keeps payload at zero).
- Right (desktop ≥ 768 px): horizontal nav — Daily · Play ▾ · Stats · How to Play.
- Right (mobile < 768 px): a single "More" icon button that opens a sheet with About and How to Play. The primary nav moves to the bottom bar (see section 10).
- Sticky: header stays on top during scroll. Background uses `--color-surface-elevated` with a subtle bottom border.

### 2.2 Daily Challenge Status Card

This is the hero element and the first thing the user sees. It occupies the upper portion of the first viewport and is always above the fold on devices ≥ 360 px wide.

Three states (mirroring PRD 5.1 completion states):

**State A — Not started**

- Headline: "Today's Daily Challenge"
- Subhead: "4 puzzles · 2–3 min · resets at UTC midnight"
- Primary CTA: "Start" button (full-width on mobile, auto-width on desktop)
- Visual: 4 dim mode icons in a row (Keywords, Emoji, Screenshot, Timeline) — all greyed, indicating none started.

**State B — In progress**

- Headline: "Daily Challenge — in progress"
- Progress indicator: "2 of 4 solved"
- Inline mini-scores: solved modes show their score (e.g., "Keywords 60"), unsolved modes show "—" with a "Resume" affordance.
- Primary CTA: "Resume" (jumps to the next unsolved puzzle).
- Visual: solved mode icons are filled in accent color; unsolved are still greyed.

**State C — Complete**

- Headline: "Daily Challenge — complete"
- Total score display: large number (e.g., "336") with the streak multiplier shown beneath (e.g., "280 × 1.20 streak bonus").
- Primary CTA: "Share result"
- Secondary CTA: "View stats"
- Visual: all 4 mode icons filled, plus a small celebratory checkmark badge (CSS only — a bordered circle with a CSS-drawn check).

The card is a single tappable region on mobile (the whole card triggers the CTA) with the CTA button itself as the explicit accessible target.

### 2.3 Mode Quick-Start Tiles

Below the status card, a heading "Or play a single mode" introduces a 2 × 2 grid (mobile) / 1 × 4 row (desktop) of tiles, one per mode:

| Tile | Icon | Label | Sub-label |
|------|------|-------|-----------|
| 1 | Key glyph | Keywords | Reveal clues, guess the word |
| 2 | Emoji cluster | Emoji | Decode the emoji sequence |
| 3 | Eye glyph | Screenshot | Sharpen the image, name the subject |
| 4 | Vertical bars | Timeline | Put events in order |

Each tile is a minimum 44 × 44 px touch zone (actual tile is ~140 × 100 px on mobile) and links directly to `/play/[mode]`. Tapping a tile in Unlimited mode never affects the Daily Challenge.

### 2.4 SEO Text Area (Below the Fold)

- Lives below the mode tiles, never above them.
- Rendered in normal document flow (not `display: none`) so search engines index it.
- Contains: a one-paragraph product description, a list of supported modes, and a short FAQ (3–5 questions).
- Visually subdued: smaller font, muted color, generous top margin (≥ 48 px) so it does not compete with the game area.
- A "Show more" disclosure is acceptable for the FAQ portion only; the lead paragraph is always visible.

### 2.5 Bottom Navigation (Mobile Only)

Visible on screens < 768 px. See section 10 for full spec.

### 2.6 Constraints Enforced on Home

- The Daily status card and the 4 mode tiles fit within the first viewport on a 360 × 640 phone (smallest supported target). SEO text starts below the fold.
- No ad slot is rendered above the fold or between the status card and the tiles. (No ads exist in MVP; this rule documents the intent for any future monetization phase.)
- The home page loads no images. Mode icons are CSS/SVG inline. This protects FCP < 1.5 s (AC-41).

---

## 3. Daily Challenge User Flow

This flow covers US-1 through US-7. It assumes the user starts on the Home page and ends with a shared result.

### 3.1 Step 1 — Home → Daily

1. User opens `/`.
2. Home shows the Daily status card. Three possible entry states:
   - Not started → CTA "Start".
   - In progress → CTA "Resume".
   - Complete → CTA "Share result" (flow jumps to step 6).
3. User taps the CTA. Navigation goes to `/daily`.

### 3.2 Step 2 — Daily Grid

The `/daily` page shows a heading "Today's Daily Challenge" with the date (UTC) and a 2 × 2 grid of 4 puzzle cards (one per mode). Each card shows:

- Mode icon and name.
- Domain badge (e.g., "Geography").
- Status pill: "Not started", "In progress", or the score (e.g., "60 / 100").
- A primary affordance: "Play", "Resume", or "Review".

Cards are presented in a fixed order: Keywords, Emoji, Screenshot, Timeline. The user can solve them in any order. The grid is responsive: 2 × 2 on mobile, 1 × 4 on desktop.

A top-of-page summary bar (sticky) shows "X of 4 solved" and the running total. When all 4 are solved, the bar morphs into the Total Score display.

### 3.3 Step 3 — Open a Puzzle

1. User taps a card.
2. The puzzle UI renders in place inside `/daily` (a modal overlay on mobile, an inline expansion on desktop). The URL does not change to `/play/*` — that route is reserved for Unlimited.
3. The puzzle loads its content from the deterministic daily schedule (PRD 5.1, 6.3).
4. The user plays the puzzle per the mode-specific rules (sections 4 and 5 below).

### 3.4 Step 4 — Solve or Give Up

1. When the user submits a correct guess or taps "Give up", the puzzle transitions to a terminal state.
2. The Result Modal appears (see section 7) showing: the answer, the per-puzzle score, the learning fact, and two buttons — "Next puzzle" (if any remain unsolved) or "Back to Daily" (if this was the last one).
3. On dismiss, the user returns to the Daily grid. The solved card now shows the score and a "Review" affordance; it can no longer be replayed that day (AC-3).

### 3.5 Step 5 — All 4 Solved → Total Score

When the 4th puzzle is resolved:

1. The sticky summary bar at the top of `/daily` morphs into a Total Score card.
2. Total Score card shows: the sum of 4 scores, the streak multiplier applied, and the final daily score (e.g., "280 × 1.20 = 336").
3. A "Share result" button appears as the primary CTA. A "View stats" button is the secondary CTA.
4. A subtle confetti-like accent is allowed via CSS only (a single accent-colored border pulse, 200 ms). No particle animation.

### 3.6 Step 6 — Share Flow

1. User taps "Share result".
2. The Share Sheet appears (see section 8).
3. On mobile, the native Web Share API sheet opens. On desktop, the result text is copied to the clipboard and a toast confirms "Copied to clipboard".
4. The shared payload includes a URL to `/share/[result-id]` which renders an OG preview card (section 8.3).

### 3.7 Cross-Day Behavior

- If the user closes the tab mid-challenge and reopens within the same UTC day, the grid restores from localStorage and shows the in-progress state (AC-5).
- After UTC midnight, `/daily` shows a new challenge. Yesterday's progress is moved to the archive (AC-6). The streak is evaluated per PRD 7.3.

---

## 4. Unlimited Mode User Flow

Unlimited mode is the retention engine for players who finish the daily and want more (PRD use case P1). It does not affect streak (PRD decision D1, leaning A).

### 4.1 Entry Points

- Home → mode tile (section 2.3).
- Desktop header → Play dropdown → mode.
- Mobile bottom nav → Play tab → mode picker.
- Result Modal "Play another" button after any Unlimited puzzle (section 7).

### 4.2 Step 1 — Mode Page Load

1. User navigates to `/play/[mode]`.
2. The page shows a heading with the mode name and a short one-line instruction (e.g., "Guess the word. Reveal keywords for hints, but each one costs points.").
3. A "New puzzle" button is visible in the top-right of the play area for manual refresh.
4. A random puzzle is selected from the mode's pool and loaded. Selection is non-deterministic in Unlimited (unlike Daily). If the same puzzle was played recently, the loader retries up to 3 times to find a fresh one.

### 4.3 Step 2 — Play

The play interaction is mode-specific:

- **Keywords:** input + "Reveal next keyword" button + "Give up" button. Revealed keywords stack visibly.
- **Emoji:** emoji sequence displayed prominently + input + "Hint" button (cycles category → first letter) + "Give up".
- **Screenshot:** blurred image + input + "Sharpen" button + "Give up". Blur level indicator (3 / 2 / 1 / 0) shown beside the image.
- **Timeline:** shuffled item cards with drag handle + "Move up" / "Move down" buttons + "Hint" button + "Submit order" + "Give up".

All mode interactions follow the shared Search-and-Submit pattern in section 5.

### 4.4 Step 3 — Result

1. On correct guess, give up, or (Timeline only) submit order, the puzzle transitions to terminal.
2. The Result Modal appears with the answer, score, fact, and buttons.
3. Because this is Unlimited (not Daily), the buttons are:
   - Primary: "Play another" — loads a new random puzzle of the same mode without leaving `/play/[mode]`.
   - Secondary: "Share" — opens the Share Sheet.
   - Tertiary: "Back to Daily" — navigates to `/daily`.

### 4.5 Step 4 — Continue or Exit

- "Play another" resets the play area to its initial state for the new puzzle. The previous result is appended to a thin "Recent plays" list at the bottom of the page (optional, last 3 plays only).
- The user can leave at any time. Unlimited plays are tracked in stats as "games played" and "mode breakdown" but do not affect streak.

---

## 5. Search and Submit Answer Flow

This is the shared interaction for Keywords, Emoji, and Screenshot modes. Timeline has a different flow (section 4.4) because it does not take free-text guesses.

### 5.1 Input Component

- A single-line text input, full-width on mobile, max 480 px on desktop.
- Associated visible label or `aria-label` (AC-38): "Your guess".
- Placeholder text mode-specific: "Type your guess…" (Keywords), "What do the emojis mean?" (Emoji), "What is this?" (Screenshot).
- Submit button to the right of the input, minimum 44 × 44 px. Label: "Submit".
- Input is auto-focused on desktop only. On mobile, auto-focus is disabled to prevent the on-screen keyboard from pushing the puzzle content out of view on load.

### 5.2 Submit Triggers

The user can submit a guess via:

- Pressing Enter while the input is focused.
- Clicking/tapping the "Submit" button.

Both paths call the same handler. There is no debounce — submission is instant.

### 5.3 Guess Evaluation

The guess is normalized: trimmed of leading/trailing whitespace, lowercased. It is then compared to the target and the list of aliases (PRD 5.2–5.4, AC-9, AC-10). Matching is exact after normalization; partial or fuzzy matching is out of scope for MVP.

### 5.4 Correct Guess Path

1. The input is disabled and visually replaced by the correct answer with a checkmark icon and the word "Correct".
2. The Result Modal opens (section 7) after a 200 ms delay (long enough for the visual feedback to register, short enough to feel instant).
3. The fact is read aloud via `aria-live="polite"` (section 6).

### 5.5 Wrong Guess Path

1. The input does not clear immediately — it briefly shakes (a 150 ms CSS `transform` shake, one cycle only) and the input border flashes the error color for 400 ms.
2. The input then clears and refocuses (desktop) or stays focused (mobile).
3. The wrong guess is appended to the Guess List below the input (section 14, `GuessList`), shown with a small "×" icon and the literal text the user typed.
4. The wrong-guess count increments and the live score preview updates (e.g., "Score if correct now: 70").
5. `aria-live="assertive"` announces: "Wrong guess. Try again." (section 6).

### 5.6 Empty or Invalid Input

- Submitting an empty input is a no-op. The Submit button is disabled when the input is empty (`disabled` attribute, with `aria-disabled` for clarity).
- Submitting whitespace-only input is treated as empty.
- No error message is shown for empty submit; the button simply does not respond.

### 5.7 Give Up Path

- A "Give up" button is always available, positioned to the left of the Submit button or below it on narrow screens.
- Tapping it opens a confirmation dialog: "Give up? You'll see the answer but score 0 points." with "Cancel" and "Give up" buttons.
- On confirm, the puzzle transitions to terminal with score 0 and the Result Modal appears.

---

## 6. Feedback States: Wrong, Skip, Correct, Fail

Per AC-36, color is never the sole indicator. Every state combines color, icon, text label, and `aria-live` announcement. Per PRD 4.2, no haptics in MVP — the Haptic column is documented as "None (MVP)" to make the deferral explicit.

### 6.1 Correct (Guess Accepted)

| Aspect | Specification |
|--------|---------------|
| Color | Success green border on input + success background tint. |
| Icon | Filled checkmark (CSS-drawn or inline SVG). |
| Text label | "Correct!" shown inline beside the answer. |
| Animation | Input border transitions to success color over 200 ms (CSS `transition`). No bounce, no scale. |
| `aria-live` | `polite` region announces: "Correct. The answer was [target]. [Fact]." |
| Haptic | None (MVP). |

### 6.2 Wrong (Guess Rejected)

| Aspect | Specification |
|--------|---------------|
| Color | Error red border on input for 400 ms, then back to default. |
| Icon | "×" icon beside the rejected guess in the Guess List. |
| Text label | The literal guess text is preserved in the list with an "Incorrect" label. |
| Animation | 150 ms horizontal shake (CSS `@keyframes` using `transform: translateX`), one cycle. Input then clears. |
| `aria-live` | `assertive` region announces: "Wrong guess." |
| Haptic | None (MVP). |

### 6.3 Skip (Player Reveals a Clue / Hint / Sharpen)

"Skip" in this product is not a skip-the-puzzle action; it refers to choosing to reveal a clue rather than guess. Each reveal/hint/sharpen is a voluntary point sacrifice.

| Aspect | Specification |
|--------|---------------|
| Color | Hint area appears in the warning amber tint. |
| Icon | Lightbulb glyph for keywords/emoji hints; eye glyph for screenshot sharpen; calendar glyph for timeline hint. |
| Text label | "Hint used: [hint content]" or "Keyword revealed: [keyword]". |
| Animation | Revealed content fades in over 150 ms (`opacity` 0 → 1). |
| `aria-live` | `polite` region announces the revealed content verbatim. |
| Haptic | None (MVP). |

### 6.4 Fail (Give Up or Score = 0)

| Aspect | Specification |
|--------|---------------|
| Color | Muted neutral background on the result card (not red — red is reserved for transient wrong-guess feedback). The result is final, not an alarm. |
| Icon | Flag or "reveal" glyph indicating the answer is now visible. |
| Text label | "You gave up. The answer was [target]." |
| Animation | Answer reveal: opacity fade-in over 200 ms. No shake, no flash. |
| `aria-live` | `assertive` region announces: "Puzzle given up. The answer was [target]. Score: 0." |
| Haptic | None (MVP). |

### 6.5 Timeline-Specific Feedback

Timeline has no per-guess feedback; the only terminal event is "Submit order". On submit:

- Each item card shows whether it landed in the correct position: a green check (correct position) or an amber arrow (off by N positions, with N shown).
- Total position error and final score appear in the Result Modal.
- `aria-live="polite"` announces: "Order submitted. [X] of [N] items in correct position. Score: [score]."

---

## 7. Result Modal

The Result Modal is the single most important post-puzzle surface. It appears on every terminal state (correct, give up, Timeline submit) in both Daily and Unlimited modes.

### 7.1 Trigger and Dismissal

- Triggered automatically on terminal state, 200 ms after the inline feedback (section 6.1, 6.4).
- Dismissed by: tapping "Next puzzle" / "Back to Daily", pressing Esc, or clicking the backdrop.
- Backdrop click is intentionally allowed for dismissal because the result is already saved to localStorage; there is no data-loss risk.
- On dismissal, focus returns to the puzzle card the user opened (Daily) or to the "New puzzle" button (Unlimited).

### 7.2 Layout (Top to Bottom)

1. **Mode badge and domain** — small pill at the top (e.g., "Keywords · Geography").
2. **Answer reveal** — large text: "The answer was [target]". In Timeline, this becomes "The correct order was:" followed by the ordered list.
3. **Score display** — large number (e.g., "60 / 100") with a one-line breakdown: "100 base − 10 wrong guess − 30 keywords revealed".
4. **Learning fact** — a short paragraph from the puzzle data (`fact` field). Limited to 280 characters in content authoring to keep the modal scannable.
5. **Streak indicator (Daily only)** — small line: "Streak: 7 days · 1.20× multiplier applies to your daily total".
6. **Action buttons** — see 7.3.

### 7.3 Action Buttons

**Daily Challenge context:**

- Primary: "Next puzzle" — opens the next unsolved Daily puzzle. If all 4 are solved, this becomes "Back to Daily".
- Secondary: "Share" — opens the Share Sheet.
- Tertiary (text link): "Review puzzle" — closes the modal and shows the puzzle in its terminal state for review.

**Unlimited context:**

- Primary: "Play another" — loads a new random puzzle of the same mode.
- Secondary: "Share".
- Tertiary (text link): "Back to Daily".

### 7.4 Share Copy Template

The share text is generated when the user taps "Share" (see section 8). The template is shown here for reference; the actual generation happens in the Share flow.

**Daily Challenge share template:**

```
Guess the Game — Daily Challenge
[UTC date]

Keywords    [score/100] [progress block]
Emoji       [score/100] [progress block]
Screenshot  [score/100] [progress block]
Timeline    [score/100] [progress block]

Total: [sum] × [multiplier] = [final]
Streak: [n] days

Play: https://guessthegame.example/share/[result-id]
```

The `[progress block]` is a 5-character ASCII row using `█` for full-score (100), `▓` for 70–99, `▒` for 40–69, `░` for 10–39, and `·` for 0 (give up). This gives a Wordle-like visual without emoji dependency.

**Unlimited mode share template:**

```
Guess the Game — [Mode name]
Score: [score]/100

[progress block]

Play: https://guessthegame.example/play/[mode]
```

---

## 8. Share Flow

### 8.1 Trigger

The "Share" button appears in:

- The Result Modal (section 7.3) for both Daily and Unlimited.
- The Daily Total Score card when all 4 puzzles are solved (section 3.5).

### 8.2 Share Sheet Behavior

**Mobile (Web Share API available):**

1. Tap "Share".
2. If `navigator.share` is available, call it with `{ title, text, url }`.
3. The native share sheet opens. The user picks a destination (messaging app, email, etc.).
4. On success or cancel, no further UI is shown — the user is back on the result modal.

**Desktop (Web Share API unavailable):**

1. Tap "Share".
2. The share text is written to the clipboard via `navigator.clipboard.writeText`.
3. A toast appears at the bottom of the screen: "Copied to clipboard — paste in your chat". The toast auto-dismisses after 3 seconds or on tap.
4. The URL is included in the copied text so the recipient can open the OG preview.

**Fallback (clipboard API also unavailable, e.g., older browsers):**

1. A modal appears containing the share text in a read-only textarea, pre-selected.
2. Instructions: "Copy this text and paste it wherever you like."
3. A "Copy" button attempts the clipboard write again; a "Close" button dismisses.

### 8.3 OG Link Preview Design

The `/share/[result-id]` route is statically generated at build time per shared result. It serves a minimal HTML page with OG meta tags so messaging apps render a preview card.

**OG image content (static, generated at build time per result-id):**

- Dimensions: 1200 × 630 px (standard OG).
- Background: brand surface elevated color.
- Foreground elements:
  - Wordmark "Guess the Game" top-left.
  - Mode label or "Daily Challenge" label top-right.
  - Center: the score block (ASCII-style blocks from section 7.4 rendered as text).
  - Bottom: the final score and streak, plus the site URL.
- No user-identifying information. The OG image is shareable without leaking anything personal because no personal data is collected.

**OG meta tags:**

- `og:title` — "Guess the Game — [Daily/Mode] result"
- `og:description` — "I scored [final] on today's Daily Challenge. Can you beat me?"
- `og:image` — `/og/[result-id].png`
- `og:url` — `https://guessthegame.example/share/[result-id]`
- `twitter:card` — `summary_large_image`

### 8.4 Result ID Generation

The `result-id` is a short, non-identifying string derived from: the UTC date, the mode(s) played, and the score(s). It encodes no personal data and no device fingerprint. The same player sharing the same result twice produces the same `result-id`, which is acceptable because the result is the same.

---

## 9. Stats and Achievements Page

The Stats page (`/stats`) is purely reflective — it shows the player's own history stored in localStorage. There are no leaderboards and no community averages (PRD 4.2, R7).

### 9.1 Layout (Top to Bottom)

1. **Page heading** — "Your stats" with a subtitle "All data lives in this browser only."
2. **Streak row** — two large stat blocks side by side:
   - Current streak: number + "days" + a flame icon.
   - Max streak: number + "days" + a trophy icon.
3. **Best daily score** — a single full-width stat block: the highest final daily score, with the date it was achieved.
4. **30-day heatmap** — a calendar-style grid (section 9.2) showing daily activity and score intensity for the last 30 UTC days.
5. **Mode breakdown** — a 4-row table or list (one row per mode) showing: games played, average score, best score.
6. **Total games played** — a single stat at the bottom: the sum of all puzzles completed across all modes.
7. **Reset button (tertiary, destructive)** — "Clear all stats" with a confirmation dialog. Documented because players on shared devices may want to wipe data.

### 9.2 30-Day Heatmap

- A horizontal grid: 5 rows × 6 columns (30 cells) on mobile, or 6 rows × 5 columns on desktop. Layout is flexible; the cells just need to fit the viewport.
- Each cell represents one UTC day, labeled with the day number.
- Cell fill color encodes the final daily score for that day:
  - 0 / not played: muted neutral.
  - 1–99: light accent.
  - 100–199: medium accent.
  - 200–299: strong accent.
  - 300–400: full accent.
- Cell also has a `title` attribute and an `aria-label` with the full description: "[date]: [score] points, [streak at the time] day streak" — so screen readers convey the same information as the color.
- Tapping a cell on mobile opens a tooltip with the same information.

### 9.3 Mode Breakdown Table

| Mode | Games played | Average score | Best score |
|------|--------------|---------------|------------|
| Keywords | [n] | [avg] | [best] |
| Emoji | [n] | [avg] | [best] |
| Screenshot | [n] | [avg] | [best] |
| Timeline | [n] | [avg] | [best] |

The table is the only place where per-mode performance is comparable. Players use this to find their weakest mode (US-18).

### 9.4 Stats Page Constraints

- No community averages, no comparison to other players, no percentile ranks.
- All numbers are integers. Averages are rounded to the nearest integer.
- The page is fully static — it reads from localStorage on mount and re-renders if storage changes (e.g., the user completes a puzzle in another tab via the `storage` event).

---

## 10. Mobile Layout

Mobile is the primary form factor for Persona A (Commute Camille) and Persona C (Weekend Wanda with tablet). All mobile-specific decisions live here.

### 10.1 Bottom Navigation Bar

Visible on screens < 768 px. Fixed to the bottom of the viewport. Height: 56 px plus safe-area inset (`env(safe-area-inset-bottom)`).

Five tabs, left to right:

| # | Tab | Icon | Label | Destination |
|---|-----|------|-------|-------------|
| 1 | Home | House glyph | Home | `/` |
| 2 | Daily | Calendar glyph | Daily | `/daily` |
| 3 | Play | Grid glyph | Play | `/play` mode picker (or last played mode) |
| 4 | Stats | Bar chart glyph | Stats | `/stats` |
| 5 | More | Three dots | More | Sheet with How to Play, About, Share site |

- The active tab is indicated by: filled icon, accent color, and a 2 px top border in accent color. Not by color alone (AC-36).
- Each tab is a minimum 44 × 44 px touch target (AC-35). With 5 tabs on a 360 px screen, each tab is 72 px wide — well above the minimum.
- The bottom nav stays fixed during scroll. It does not dismiss on scroll-down (the cost of an accidental tap is low; the cost of losing nav is higher).

### 10.2 Touch Target Sizing

- All interactive elements (buttons, links, cards, tab targets) have a minimum 44 × 44 px hit area. Where the visual element is smaller, padding is added to expand the hit area without changing the visual size.
- Adjacent touch targets have at least 8 px of separation to prevent mis-taps.

### 10.3 Input and Keyboard Handling

When a text input is focused on mobile, the on-screen keyboard rises. To prevent the input from being obscured:

- The puzzle play area uses `min-height: 100dvh` (dynamic viewport unit) so the layout reflows when the keyboard appears.
- The input is anchored to the visible area using `position: sticky; bottom: 0` within the play area, so it stays visible above the keyboard.
- The Guess List scrolls independently above the input.
- The page does not use `position: fixed` for the input (which would cause it to be hidden by the keyboard on iOS Safari).
- On input focus, the puzzle content above (emoji sequence, blurred image, etc.) may scroll out of view — this is acceptable because the user has already seen it. A "show puzzle" button appears in the input row to scroll the puzzle content back into view if the user needs a reminder.

### 10.4 Timeline Drag Alternative on Mobile

Drag-and-drop is unreliable on touchscreens. The Timeline mode always provides a button alternative:

- Each Timeline item card has a "Move up" and "Move down" button on its right side.
- Buttons are 44 × 44 px, stacked vertically.
- The drag handle is still rendered (for desktop and for users who prefer it) but the buttons are the primary mobile interaction.
- Buttons are disabled at the boundaries (the topmost item's "Move up" is disabled; the bottommost item's "Move down" is disabled). Disabled state is shown by reduced opacity and an `aria-disabled="true"` attribute.
- Keyboard arrow keys (section 11) provide a third alternative for users who navigate by keyboard.

### 10.5 Modal Behavior on Mobile

- The Result Modal renders as a bottom sheet on mobile (slides up from the bottom, anchored to the safe area).
- The sheet covers approximately 80% of the viewport height. If content exceeds the height, the sheet scrolls internally.
- The backdrop is dimmed but tappable to dismiss (section 7.1).
- On desktop, the Result Modal renders as a centered dialog with a max-width of 480 px.

---

## 11. Keyboard Interaction

Per AC-39, all game flows are operable by keyboard. The Tab order follows the visual order; no positive `tabindex` values are used.

### 11.1 Global Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Move focus to the next interactive element, in visual order. |
| Shift + Tab | Move focus to the previous interactive element. |
| Enter | Activate the focused button or submit the focused form. |
| Esc | Close the active modal or sheet. If no modal is open, no-op. |
| ? | Open the How to Play page in a new tab (desktop only; hidden on mobile to avoid accidental triggers with on-screen keyboards). |

### 11.2 Tab Order

The Tab order on each screen follows the reading order:

- **Home:** Skip link → Header nav → Daily status card CTA → Mode tiles (left to right, top to bottom) → SEO text links → (mobile) Bottom nav.
- **Daily:** Skip link → Header → Sticky summary bar → 4 puzzle cards (in fixed mode order) → (mobile) Bottom nav.
- **Play (any mode):** Skip link → Header → Puzzle content (image / emoji / items) → Input → Submit button → Hint/Reveal button → Give up button → (mobile) Bottom nav.
- **Stats:** Skip link → Header → Streak blocks → Best score block → Heatmap (each cell is focusable) → Mode breakdown table → Reset button → (mobile) Bottom nav.

### 11.3 Puzzle-Specific Keyboard Behavior

**Keywords, Emoji, Screenshot:**

- Input is focusable and accepts text.
- Enter submits the guess.
- The "Reveal next keyword" / "Hint" / "Sharpen" button is reachable by Tab and activated by Enter or Space.
- The "Give up" button is reachable by Tab. Activating it opens the confirmation dialog; Tab moves focus to "Cancel" first (safe default), then "Give up".

**Timeline:**

- Each item card is a focusable region (`tabindex="0"`).
- When an item is focused, ArrowUp moves it up one position and ArrowDown moves it down one position. The focus follows the item.
- Space or Enter on a focused item opens a small action menu (Move up, Move down, Reveal date as hint) — this is an alternative to the dedicated buttons and is useful for keyboard-only users who prefer not to Tab to each button.
- The "Submit order" and "Give up" buttons are reachable by Tab.

### 11.4 Modal Keyboard Trap

When a modal (Result Modal, Give Up confirmation, Share fallback) is open:

- Focus is moved to the modal's first focusable element (typically the primary button).
- Tab cycles within the modal only (focus trap).
- Shift + Tab cycles backward within the modal.
- Esc closes the modal and returns focus to the trigger element.

### 11.5 Skip Link

Every page begins with a visually hidden "Skip to main content" link as the first focusable element. On focus, the link becomes visible (top-left, accent background). Activating it moves focus to the main content region and skips the header and bottom nav.

---

## 12. Loading, Error, and Empty States

### 12.1 Loading States

**Page-level loading:**

- The Daily page and Stats page show a skeleton screen — a low-fidelity grey block layout matching the final content shape — while data is read from localStorage or the puzzle JSON is fetched.
- Skeleton uses `--color-skeleton` (a muted neutral) with a subtle CSS pulse animation (opacity 0.5 → 0.8 over 1.2 s, infinite). This is the only allowed "animation" beyond simple transitions; it is permitted because it conveys "loading in progress" rather than decorating.

**Puzzle-level loading:**

- When a puzzle is being loaded (after tapping a card or "Play another"), the play area shows a centered spinner (a single CSS `border` ring with a `rotate` animation) and the text "Loading puzzle…".
- Maximum wait expectation: < 300 ms on 4G (data is local JSON). If the wait exceeds 2 s, the error state appears.

**Image loading (Screenshot mode):**

- The blurred image area shows a placeholder block in `--color-skeleton` until the image loads.
- The `loading="lazy"` attribute is not used for the active puzzle image — it should load eagerly.
- An `onerror` handler on the `<img>` swaps to the Error state (section 12.2).

### 12.2 Error States

**Image load failure (Screenshot mode):**

- The image area is replaced by a bordered block with an icon (broken image glyph) and text: "Image failed to load. Tap to retry."
- A "Retry" button re-attempts the load.
- If the image is truly missing (e.g., a build-time content error), the puzzle is unplayable. The user sees: "This puzzle is broken. [Skip to next puzzle]" — and the puzzle is flagged for the next build.

**Data missing (puzzle JSON fails to load):**

- The play area shows: "Couldn't load the puzzle. Check your connection and try again." with a "Retry" button.
- The Daily grid shows the same message in place of the affected card; the other 3 cards remain playable.

**Browser incompatibility:**

- A baseline feature check runs on page load: `localStorage`, `Promise`, `fetch`, `CSS.supports('display', 'grid')`.
- If any are missing, the user sees a full-page banner: "Your browser doesn't support Guess the Game. Please update to a modern browser." The rest of the page is hidden.
- This is documented as out of scope for graceful degradation — the product targets evergreen browsers only.

**localStorage quota exceeded (R4):**

- On any write to localStorage, if `QuotaExceededError` is thrown, a toast appears: "Storage is full. Older history will be cleared to make room." The oldest 7 days of history are pruned and the write is retried.

### 12.3 Empty States

**No history (new user, first visit to Stats):**

- The Stats page shows the streak/best-score blocks with zero values and a friendly empty state under the heatmap: "No plays yet. Start today's Daily Challenge to see your stats grow." with a "Go to Daily" button.
- The mode breakdown table shows "—" in all cells.
- The heatmap shows all neutral cells.

**No history (mid-session, user hasn't played today):**

- The Daily status card on Home shows "Not started" (section 2.2 state A). This is not an empty state per se — it's the natural first-run state.

**Archive empty:**

- If the archive has no past challenges yet (e.g., day 1 of launch), the Archive page shows: "No past challenges yet. The first archive entry appears after the first UTC midnight." This is an edge case but documented for completeness.

---

## 13. Design Tokens

All design system values are defined as CSS custom properties on `:root`. They are grouped by category. The tokens encode the single dark theme shipped in MVP (PRD 4.2 — no theme toggle).

### 13.1 Color Tokens

**Backgrounds (dark theme):**

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#0e1116` | Page background. |
| `--color-surface` | `#161b22` | Cards, modal body. |
| `--color-surface-elevated` | `#1c232c` | Header, sticky bars, bottom nav. |
| `--color-skeleton` | `#21262d` | Skeleton screens, placeholder blocks. |

**Foregrounds:**

| Token | Value | Usage |
|-------|-------|-------|
| `--color-text` | `#e6edf3` | Primary text. |
| `--color-text-muted` | `#8b949e` | Secondary text, sub-labels. |
| `--color-text-inverse` | `#0e1116` | Text on accent/success/error backgrounds. |

**Brand and accent:**

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#6366f1` | Primary buttons, active states. |
| `--color-primary-hover` | `#818cf8` | Hover state for primary. |
| `--color-accent` | `#22d3ee` | Streak indicator, score highlights. |

**Semantic states (always paired with icon + text per AC-36):**

| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#3fb950` | Correct guess. |
| `--color-success-bg` | `rgba(63, 185, 80, 0.12)` | Success background tint. |
| `--color-error` | `#f85149` | Wrong guess, give up. |
| `--color-error-bg` | `rgba(248, 81, 73, 0.12)` | Error background tint. |
| `--color-warning` | `#d29922` | Hint used, sharpen active. |
| `--color-warning-bg` | `rgba(210, 153, 34, 0.12)` | Warning background tint. |

**Borders and dividers:**

| Token | Value | Usage |
|-------|-------|-------|
| `--color-border` | `#30363d` | Card borders, input borders. |
| `--color-border-focus` | `#6366f1` | Focused input border. |

### 13.2 Spacing Tokens

4 px base unit. All spacing values are multiples of 4.

| Token | Value |
|-------|-------|
| `--space-0` | `0` |
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |
| `--space-16` | `64px` |

### 13.3 Typography Tokens

**Font families:**

| Token | Value | Usage |
|-------|-------|-------|
| `--font-heading` | `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif` | Headings, scores, buttons. |
| `--font-body` | `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif` | Body text. (Same as heading in MVP; one font for payload.) |
| `--font-mono` | `'JetBrains Mono', 'SF Mono', 'Consolas', monospace` | Score breakdowns, share text, ASCII blocks. |

**Font sizes (mobile / desktop):**

| Token | Mobile | Desktop | Usage |
|-------|--------|---------|-------|
| `--font-size-xs` | 12px | 12px | Badges, sub-labels. |
| `--font-size-sm` | 14px | 14px | Body small, hints. |
| `--font-size-base` | 16px | 16px | Body, input. (16px minimum on mobile to prevent iOS zoom on focus.) |
| `--font-size-lg` | 18px | 20px | Card titles. |
| `--font-size-xl` | 22px | 24px | Section headings. |
| `--font-size-2xl` | 28px | 32px | Daily total score. |
| `--font-size-3xl` | 36px | 48px | Result modal answer reveal. |

**Font weights:**

| Token | Value | Usage |
|-------|-------|-------|
| `--font-weight-regular` | 400 | Body. |
| `--font-weight-medium` | 500 | Buttons, labels. |
| `--font-weight-semibold` | 600 | Card titles. |
| `--font-weight-bold` | 700 | Scores, headings. |

**Line heights:**

| Token | Value |
|-------|-------|
| `--line-height-tight` | 1.2 |
| `--line-height-base` | 1.5 |
| `--line-height-relaxed` | 1.7 |

### 13.4 Radius, Shadow, Border

**Border radius:**

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Badges, pills. |
| `--radius-md` | `8px` | Buttons, inputs. |
| `--radius-lg` | `12px` | Cards. |
| `--radius-xl` | `16px` | Modals. |
| `--radius-full` | `9999px` | Round icons, avatars. |

**Shadows (subtle — dark theme):**

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Cards. |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Sticky bars. |
| `--shadow-lg` | `0 12px 32px rgba(0,0,0,0.5)` | Modals. |

**Border:**

| Token | Value |
|-------|-------|
| `--border-width` | `1px` |
| `--border-default` | `1px solid var(--color-border)` |

### 13.5 Animation Tokens

Per PRD 4.2, only CSS `transition` and `transform` are allowed. All animations are short and purposeful.

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | `150ms` | Hover, focus, button press. |
| `--duration-base` | `200ms` | Color transitions, modal entrance. |
| `--duration-slow` | `300ms` | Sheet slide-in, large layout shifts. |
| `--easing-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Most transitions. |
| `--easing-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Modal entrance, sheet slide. |

**Allowed keyframe animations (CSS only):**

- Skeleton pulse (`opacity` 0.5 → 0.8 → 0.5, 1.2 s, infinite).
- Spinner rotation (`transform: rotate(360deg)`, 0.8 s, linear, infinite).
- Wrong-guess shake (`transform: translateX(-4px, 4px, -2px, 0)`, 150 ms, one cycle).
- Result modal entrance (`opacity` 0 → 1 and `transform: translateY(8px, 0)`, 200 ms, one cycle).

No other animations. No bounces, no scales on hover, no parallax.

### 13.6 Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-base` | `0` | Default content. |
| `--z-sticky` | `100` | Header, sticky summary bar. |
| `--z-bottom-nav` | `200` | Mobile bottom nav. |
| `--z-overlay` | `300` | Backdrop. |
| `--z-modal` | `400` | Result modal, dialogs. |
| `--z-toast` | `500` | Toasts. |

---

## 14. Component Inventory

This is a functional inventory, not code. Each component lists its purpose, key props/states, and the accessibility contract. Components are grouped by domain.

### 14.1 Layout Components

**Header**

- Purpose: Top navigation bar, sticky.
- Props: `activeRoute` (to highlight current nav item), `variant` (`'default' | 'compact'`).
- States: default, scrolled (border appears).
- Accessibility: `<header role="banner">`, nav is `<nav aria-label="Primary">`.

**BottomNav**

- Purpose: Mobile-only fixed bottom navigation, 5 tabs.
- Props: `activeRoute`.
- States: active tab indicated by icon fill + accent top border + label color.
- Accessibility: `<nav aria-label="Primary">`, each tab is a link with `aria-current="page"` when active. Min 44 × 44 px touch target per tab.

**SkipLink**

- Purpose: Keyboard users jump to main content.
- Props: `targetId` (id of the main region).
- States: hidden until focused, then visible.
- Accessibility: `<a class="skip-link" href="#main">Skip to main content</a>`. Becomes visible on `:focus` and `:focus-visible`.

**PageShell**

- Purpose: Wraps every page with Header, main region, and (mobile) BottomNav.
- Props: `children`, `title` (for document title), `showBottomNav` (default true on mobile).
- Accessibility: `<main id="main" tabindex="-1">`.

### 14.2 Home Page Components

**DailyStatusCard**

- Purpose: Hero card on Home showing today's Daily Challenge state.
- Props: `state` (`'not-started' | 'in-progress' | 'complete'`), `solvedCount`, `totalScore`, `multiplier`, `onCta`.
- States: 3 visual states per section 2.2.
- Accessibility: `aria-live="polite"` on the status subhead so screen readers announce state changes if the user returns to Home after solving a puzzle.

**ModeTile**

- Purpose: Quick-start tile for one Unlimited mode.
- Props: `mode` (`'keywords' | 'emoji' | 'screenshot' | 'timeline'`), `href`, `icon`, `label`, `subLabel`.
- States: default, hover/focus (subtle border highlight).
- Accessibility: rendered as `<a>` with descriptive `aria-label` (e.g., "Play Keywords mode — reveal clues and guess the word").

**SeoTextBlock**

- Purpose: Below-the-fold SEO content.
- Props: `content`.
- States: FAQ portion collapsible via a "Show more" disclosure.
- Accessibility: disclosure uses `<button aria-expanded>` pattern.

### 14.3 Daily Challenge Components

**DailyChallengeGrid**

- Purpose: 2 × 2 grid of 4 puzzle cards on `/daily`.
- Props: `puzzles` (array of 4, one per mode), `progress` (per-puzzle state).
- States: not-started, in-progress, complete (grid itself doesn't change; cards do).
- Accessibility: `<ul role="list">` of cards.

**PuzzleCard**

- Purpose: One card in the Daily grid.
- Props: `mode`, `domain`, `state` (`'not-started' | 'in-progress' | 'solved'`), `score`, `onOpen`.
- States:
  - Not started: "Play" button.
  - In progress: "Resume" button.
  - Solved: score display + "Review" link (read-only).
- Accessibility: card is a `<li>`; the primary action is a `<button>`. State is conveyed by text label ("Play" / "Resume" / "60 / 100") not by color alone.

**DailySummaryBar**

- Purpose: Sticky bar showing "X of 4 solved" and running total; morphs into Total Score display on completion.
- Props: `solvedCount`, `runningTotal`, `finalScore`, `multiplier`, `state`.
- States: in-progress, complete.
- Accessibility: `aria-live="polite"` so the count update is announced.

**TotalScoreCard**

- Purpose: Final daily score display with share CTA.
- Props: `totalScore`, `multiplier`, `finalScore`, `streakDays`, `onShare`, `onViewStats`.
- States: complete only.
- Accessibility: score is a heading (`<h2>`); breakdown is a definition list.

### 14.4 Puzzle Interaction Components

**PuzzleInput**

- Purpose: Shared text input + Submit button for Keywords, Emoji, Screenshot.
- Props: `value`, `onChange`, `onSubmit`, `disabled`, `placeholder`, `label`.
- States: default, focused, error (wrong guess shake), success (correct), disabled (post-terminal).
- Accessibility: `<label>` or `aria-label`; input has `autocomplete="off"`, `autocapitalize="off"`, `autocorrect="off"`, `spellcheck="false"`. Submit button is `<button type="submit">`.

**GuessList**

- Purpose: List of wrong guesses below the input.
- Props: `guesses` (array of strings).
- States: empty (not rendered), populated.
- Accessibility: `<ul>`; each item has an "× Incorrect:" prefix in the `aria-label` so screen readers announce it as wrong.

**RevealKeywordButton**

- Purpose: Keywords mode — reveals the next keyword.
- Props: `nextKeyword`, `onReveal`, `revealedCount`, `maxCount`.
- States: default, disabled (when `revealedCount === maxCount`).
- Accessibility: button label updates dynamically: "Reveal next keyword (2 of 6 revealed)".

**HintButton**

- Purpose: Emoji and Timeline modes — requests a hint.
- Props: `onHint`, `hintsUsed`, `maxHints`, `nextHintType`.
- States: default, disabled (when `maxHints` reached).
- Accessibility: label describes the next hint: "Reveal category hint" / "Reveal first letter hint".

**SharpenButton**

- Purpose: Screenshot mode — reduces blur level.
- Props: `onSharpen`, `currentLevel`, `maxSharpens`.
- States: default, disabled (when `maxSharpens` reached).
- Accessibility: label: "Sharpen image (level 3 → 2, 2 sharpens left)".

**BlurImage**

- Purpose: Screenshot mode — renders the image at a given blur level.
- Props: `src`, `alt`, `blurLevel` (0–3), `attribution`.
- States: loading (skeleton), loaded, error.
- Accessibility: `<img>` with descriptive `alt` (the alt text does NOT reveal the answer; it describes the image generically, e.g., "A blurred photograph of a natural landform"). Attribution rendered as `<figcaption>` when present.

**GiveUpButton**

- Purpose: Any mode — reveals answer, sets score to 0.
- Props: `onConfirm`.
- States: default; opens confirmation dialog.
- Accessibility: button labeled "Give up"; confirmation dialog is a focus-trapped modal.

### 14.5 Timeline-Specific Components

**TimelineList**

- Purpose: Vertical list of Timeline items in current arrangement.
- Props: `items` (array of `{ id, title, description, date?, revealedDate? }`), `onReorder`.
- States: editing (before submit), locked (after submit).
- Accessibility: `<ul role="listbox">` with each item `tabindex="0"`.

**TimelineItem**

- Purpose: One item card with reorder controls.
- Props: `item`, `position`, `canMoveUp`, `canMoveDown`, `onMoveUp`, `onMoveDown`, `isCorrectPosition`, `positionOffset` (for post-submit feedback).
- States: default, focused, correct-position (green check), wrong-position (amber arrow + offset number), locked.
- Accessibility: `aria-label="Item [n] of [total]: [title]. Press up or down arrow to move."`. Move buttons have `aria-label="Move up"` / `Move down"` and `aria-disabled` when at boundary.

**TimelineSubmitButton**

- Purpose: Locks the arrangement and triggers scoring.
- Props: `onSubmit`, `disabled` (until at least one reorder has happened, or always enabled — design decision: always enabled, player can submit the initial shuffle if they want).
- Accessibility: `<button>` with confirmatory label "Submit order".

### 14.6 Result and Share Components

**ResultModal**

- Purpose: Post-puzzle modal showing answer, score, fact, and actions.
- Props: `puzzle` (mode, target, fact), `score`, `breakdown`, `context` (`'daily' | 'unlimited'`), `isLastDailyPuzzle`, `onNext`, `onShare`, `onBackToDaily`, `onReview`.
- States: entering (200 ms fade), visible, exiting.
- Accessibility: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the answer heading. Focus trap active. Esc closes.

**ScoreDisplay**

- Purpose: Renders a score with optional breakdown.
- Props: `score`, `maxScore` (default 100), `breakdown` (array of `{ label, value }`), `size` (`'sm' | 'md' | 'lg'`).
- States: none (purely presentational).
- Accessibility: score is in a `<strong>` or heading; breakdown is a definition list.

**StreakBadge**

- Purpose: Small inline indicator of current streak.
- Props: `days`, `multiplier`.
- States: zero (0 days, hidden or muted), active (1+ days, flame icon + accent).
- Accessibility: `aria-label="Streak: [n] days, [multiplier]x multiplier"`.

**ShareButton**

- Purpose: Triggers the Share Sheet.
- Props: `payload` (`{ title, text, url }`), `variant` (`'primary' | 'secondary'`), `onSuccess`, `onError`.
- States: default, loading (during clipboard write), success (briefly shows "Copied"), error (falls back to manual copy modal).
- Accessibility: standard `<button>`; the toast that appears on desktop is `role="status"`.

**ShareSheet**

- Purpose: Orchestrates Web Share API / clipboard / fallback.
- Props: `payload`, `onClose`.
- States: native-share (mobile), clipboard-copy (desktop), fallback-modal (old browsers).
- Accessibility: the fallback modal is a focus-trapped dialog with a readonly textarea.

### 14.7 Stats Components

**StatsGrid**

- Purpose: Container for the top stat blocks on `/stats`.
- Props: `currentStreak`, `maxStreak`, `bestDailyScore`, `bestDailyDate`, `totalGames`.
- States: empty (new user), populated.
- Accessibility: each stat block is a `<section>` with an `<h3>` heading.

**HeatmapCalendar**

- Purpose: 30-day grid of daily scores.
- Props: `days` (array of 30 `{ date, score, streakAtTime }`).
- States: empty (no plays), partial, full.
- Accessibility: each cell is a `<button>` (focusable, tappable for tooltip) with `aria-label` describing the date and score. Color is reinforced by the label.

**ModeBreakdown**

- Purpose: 4-row table of per-mode stats.
- Props: `modes` (array of `{ mode, gamesPlayed, avgScore, bestScore }`).
- States: empty (all "—"), populated.
- Accessibility: real `<table>` with `<caption>`, `<thead>`, `<tbody>`. Screen readers navigate tables natively.

**ResetStatsButton**

- Purpose: Destructive — clears all localStorage stats.
- Props: `onConfirm`.
- States: default; opens confirmation dialog.
- Accessibility: button has `aria-label="Clear all stats — this cannot be undone"`. Confirmation dialog is focus-trapped.

### 14.8 Feedback Components

**Toast**

- Purpose: Transient non-modal message (e.g., "Copied to clipboard").
- Props: `message`, `variant` (`'info' | 'success' | 'error'`), `durationMs` (default 3000).
- States: entering, visible, exiting.
- Accessibility: `role="status"` for info/success, `role="alert"` for error. Auto-dismiss after `durationMs`. Tap to dismiss early.

**Skeleton**

- Purpose: Loading placeholder matching final content shape.
- Props: `variant` (`'text' | 'card' | 'image' | 'block'`), `width`, `height`.
- States: pulsing.
- Accessibility: `aria-hidden="true"`; the parent container has `aria-busy="true"` and a visually hidden "Loading…" label.

**Spinner**

- Purpose: Centered loading indicator for short waits.
- Props: `size` (`'sm' | 'md' | 'lg'`), `label`.
- States: spinning.
- Accessibility: `role="status"` with visually hidden label "Loading".

**EmptyState**

- Purpose: Friendly illustration + message + CTA when no data exists.
- Props: `icon`, `title`, `message`, `ctaLabel`, `onCta`.
- States: none.
- Accessibility: `role="region"` with `aria-label` matching the title.

**ErrorState**

- Purpose: Inline error block with retry.
- Props: `title`, `message`, `onRetry`.
- States: none.
- Accessibility: `role="alert"`.

### 14.9 Accessibility Primitives

**LiveRegion**

- Purpose: Reusable `aria-live` region for game-state announcements.
- Props: `politeness` (`'polite' | 'assertive'`), `message`.
- States: none.
- Accessibility: `<div aria-live="[politeness]" aria-atomic="true">`. Visually hidden via `sr-only` class but readable by screen readers.

**SrOnly**

- Purpose: Visually hidden text for screen readers.
- Props: `children`.
- States: none.
- Accessibility: uses the standard `sr-only` CSS pattern (`position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0`).

---

## 15. Constraints Checklist

This section is a self-audit against the constraints stated in the task brief and PRD section 9.7. Every item is satisfied by the design above.

| Constraint | Where addressed |
|------------|-----------------|
| Game area precedes SEO text. | Section 2.4, 2.6. |
| First viewport never ad-occupied. | Section 2.6. (No ads in MVP; rule documented for future.) |
| State never conveyed by color alone. | Section 6, 10.1, 14.5; every state pairs color + icon + text + `aria-live`. |
| Timeline drag has button alternative. | Section 10.4, 11.3, 14.5 (`TimelineItem`). |
| Touch targets ≥ 44 × 44 px. | Section 10.2, 10.4, 14.1 (`BottomNav`), 14.4 (`PuzzleInput`). |
| No complex animations. | Section 13.5; only CSS `transition` / `transform`, max 300 ms. |
| Keyboard navigation for all flows. | Section 11. |
| Screen reader announcements via `aria-live`. | Section 6, 14.9 (`LiveRegion`). |
| All inputs have labels. | Section 5.1, 14.4 (`PuzzleInput`). |
| No haptics in MVP. | Section 6 (documented as deferred). |
| Single dark theme. | Section 13.1. |

---

## 16. Open Questions for Next Phase

These are UX decisions that need validation before implementation but are not blocking for the design phase:

1. **Daily puzzle presentation: modal vs. inline expansion.** Section 3.3 says "modal overlay on mobile, inline expansion on desktop." Validate with a quick usability test — some users find modals disruptive on mobile.
2. **"Play" tab destination on mobile.** Section 10.1 says it opens a mode picker or the last played mode. Pick one default; "last played" is friendlier but may confuse first-time users.
3. **Heatmap cell tap behavior.** Section 9.2 says tapping opens a tooltip. On desktop, hover should also reveal it. Decide whether the tooltip is a native `title` (free, but inaccessible) or a custom component (more work, but accessible).
4. **Share text ASCII blocks.** Section 7.4 uses Unicode block characters (`█▓▒░`). Validate that these render correctly in iMessage, WhatsApp, and Slack — some clients strip or replace them.
5. **Result modal dismissal on backdrop tap.** Section 7.1 allows it. Validate that users don't accidentally dismiss before reading the fact. Consider a 1-second delay before backdrop becomes tappable.

These questions are flagged for the engineer and PM to resolve in the next phase. None of them block the design as specified.
