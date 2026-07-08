# PRD — Guess the Game

> Created: 2026-07-09 · Status: Draft · Owner: PM

## 1. Requirement Background

Casual puzzle games like Wordle, Semantle, and Framed proved that a daily guessing format with zero onboarding can attract millions of players. The key ingredients are simple: one puzzle per day, instant play, shareable results, and a streak that brings people back.

Guess the Game takes that formula and broadens it. Instead of a single guessing mechanic, the product ships five distinct modes — Keywords, Emoji, Screenshot, Timeline, and a Daily Mixed Challenge that combines all four. The Daily Mixed Challenge is the hook; the individual modes are the retention engine for players who finish early and want more.

The hard constraints shape every decision: no database, no accounts, no runtime backend. The entire product runs as a static site. Puzzle data lives in JSON files bundled at build time. Player progress — scores, streaks, history — stays in the browser via localStorage. This keeps hosting costs near zero, eliminates auth friction, and makes the game load in under a second.

The content model is built for public knowledge and IP-safe assets only. Topics span geography, science, history, nature, and everyday objects. No copyrighted game screenshots, no trademarked logos, no character art. Screenshots mode uses public-domain images, original illustrations, and silhouettes — never ripped assets.

## 2. Target Users and Core Use Cases

### 2.1 Personas

**Persona A — Commute Camille (primary)**

- 28, office worker, 15-minute metro commute
- Plays Wordle and Connections every morning
- Phone is her only device during commute; desktop at lunch
- Wants: something fresh daily, finishes in 2-3 minutes, shareable to group chat
- Pain: Wordle is getting stale; wants variety without learning new rules each time

**Persona B — Lunch Break Leo**

- 34, software engineer, 20-minute lunch break
- Plays on desktop, prefers keyboard input
- Wants: a brain teaser that's harder than Wordle but not a full quiz
- Pain: most puzzle sites are cluttered with ads and popups; wants clean and fast

**Persona C — Weekend Wanda**

- 41, teacher, plays with her 10-year-old on weekends
- Uses tablet, touch input
- Wants: kid-appropriate content, no login wall, educational value
- Pain: most "trivia" apps are ad-heavy or require accounts

### 2.2 Core Use Cases

| Priority | Use Case | Persona | Frequency |
|----------|----------|---------|-----------|
| P0 | Open site, play today's Daily Challenge in under 3 minutes | A, B | Daily |
| P0 | Share result to messaging app after finishing | A | Daily |
| P0 | Come back next day to maintain streak | A, B | Daily |
| P1 | Play an extra round in a specific mode after finishing daily | B | 2-3x/week |
| P1 | Check personal stats and streak history | A, B | Weekly |
| P1 | Replay a past daily challenge from the archive | C | Weekly |
| P2 | Browse available topics/domains to find interesting puzzles | C | Occasional |

## 3. Information Architecture

```
Guess the Game
├── /                        Home — today's Daily Challenge entry + mode quick-start
├── /daily                   Daily Mixed Challenge (4 puzzles: Keywords + Emoji + Screenshot + Timeline)
├── /play/keywords           Keywords mode (unlimited, random or topic-filtered)
├── /play/emoji              Emoji mode (unlimited)
├── /play/screenshot         Screenshot mode (unlimited)
├── /play/timeline           Timeline mode (unlimited)
├── /archive                 Past daily challenges (browse by date)
├── /archive/[date]          Specific past challenge replay
├── /stats                   Personal statistics (scores, streaks, history)
├── /how-to-play             Rules for all 5 modes
├── /about                   About the project
└── /share/[result-id]       Shared result preview (OG image, static)
```

### Navigation Model

The header carries five primary entries: Home, Daily, Play (dropdown to 4 modes), Stats, How to Play. On mobile, a bottom navigation bar replaces the header with five icon tabs: Home, Daily, Play, Stats, More.

The Home page is intentionally minimal — it shows today's Daily Challenge status (not started / in progress / completed) with a single primary CTA, followed by four quick-start tiles for the individual modes. SEO text lives below the fold and never pushes the game area down.

## 4. MVP Feature Scope

### 4.1 In Scope (MVP)

| # | Feature | Description |
|---|---------|-------------|
| 1 | Daily Mixed Challenge | One set per UTC day, 4 puzzles across all modes, deterministic from date seed |
| 2 | Keywords mode | Guess target from progressively revealed keyword clues |
| 3 | Emoji mode | Guess target from emoji sequence |
| 4 | Screenshot mode | Guess target from progressively de-blurred image |
| 5 | Timeline mode | Arrange 4-6 items in chronological order |
| 6 | Scoring system | Per-puzzle 0-100 points, daily total, streak multiplier |
| 7 | Streak tracking | Consecutive-day streak with multiplier, stored in localStorage |
| 8 | Personal stats page | Best score, current streak, max streak, games played, mode breakdown |
| 9 | Shareable results | Text-based result card with score breakdown, copyable and shareable via Web Share API |
| 10 | Archive | Browse and replay past daily challenges |
| 11 | How to Play page | Static rules page for all modes |
| 12 | PWA install | Manifest + service worker for offline play and home-screen install |
| 13 | Topic domains | Puzzles organized by domain (Geography, Science, History, Nature, Everyday) |

### 4.2 Out of Scope (Non-Goals)

- **User accounts and login.** No registration, no email, no OAuth. Identity is the browser.
- **Multiplayer or real-time competition.** No live head-to-head, no rooms, no lobbies.
- **Global leaderboards with real player data.** No server-side score collection. The stats page shows only the player's own history. A "community average" would require a backend — explicitly deferred.
- **User-generated content.** Players cannot submit puzzles. All content is curated at build time.
- **Social features.** No friends list, no follow, no comments, no profiles.
- **Monetization.** No ads, no subscriptions, no in-app purchases in MVP.
- **Internationalization.** MVP is English-only. Content model supports future i18n but no translation in scope.
- **Dark/light toggle.** The product ships a single dark theme. Theme toggle is a post-MVP polish item.
- **Audio and haptics.** No sound effects, no vibration API in MVP.
- **Animations beyond CSS transitions.** No WebGL, no canvas animations, no physics.

## 5. Complete Game Rules

### 5.1 Daily Mixed Challenge

**Objective:** Complete 4 puzzles — one from each mode — and maximize total score.

**Setup:**
- The challenge resets at UTC midnight (00:00 UTC).
- The 4 puzzles are deterministically selected from the puzzle pool using a hash of the UTC date string (e.g., `2026-07-09`). Same date = same puzzles for every player.
- One puzzle is drawn from each mode: Keywords, Emoji, Screenshot, Timeline.
- The domain/topic of each puzzle rotates daily to avoid repetition.

**Gameplay:**
- Player sees 4 puzzle cards on the Daily Challenge page, one per mode.
- Player can solve them in any order.
- Tapping a card opens that puzzle in its native mode UI.
- Once a puzzle is answered (correctly or via give-up), the result is locked and the card shows the score.
- The challenge is "complete" when all 4 puzzles are resolved.
- Player can leave and return; progress is saved in localStorage and persists across page reloads within the same UTC day.

**Scoring:**
- Daily total = sum of 4 puzzle scores (0-400 range).
- Streak multiplier applies to the daily total: `final = total × multiplier`.
- Multiplier scales with streak length (see section 7.2).

**Completion states:**
- Not started: all 4 cards show "Play" button.
- In progress: solved cards show score; unsolved cards show "Play" / "Resume".
- Complete: all cards show scores; total score and streak multiplier displayed; share button appears.

### 5.2 Keywords Mode

**Objective:** Guess the hidden target word/phrase using as few keyword clues as possible.

**Setup:**
- Each puzzle has a target answer (e.g., "Volcano") and 6 associated keywords ordered from vague to specific (e.g., "mountain", "heat", "lava", "eruption", "magma", "crater").
- The target has 1-3 accepted aliases (e.g., "Volcano", "volcano", "volcanoes"). Matching is case-insensitive and trims whitespace.
- Keywords start hidden.

**Gameplay:**
- Player sees an input field and a "Reveal next keyword" button.
- Player can type a guess at any time, or reveal keywords one by one.
- Submitting a guess: if it matches the target or an alias, the puzzle is solved. If not, the guess is recorded as wrong and the input clears.
- Revealing a keyword: the next keyword in sequence becomes visible. Revealed keywords stay visible.
- "Give up" button: reveals the answer, score = 0, puzzle is locked.

**Scoring:**
- Base score: 100 points.
- Penalty per revealed keyword: -15 points.
- Penalty per wrong guess: -10 points.
- Minimum score: 10 (floor; cannot go below 10 unless player gives up).
- Give up: 0 points.

**Example:**
Target = "Volcano". Player guesses "Mountain" (wrong, -10). Reveals 2 keywords: "mountain", "heat" (-30). Guesses "Volcano" (correct). Score = 100 - 10 - 30 = 60.

### 5.3 Emoji Mode

**Objective:** Guess the hidden target from an emoji sequence.

**Setup:**
- Each puzzle has a target answer and an emoji sequence of 3-6 emojis (e.g., 🌋💨🔥 = "Volcano").
- All emojis are shown at once — no progressive reveal.
- 2 hints are available: (1) category (e.g., "Geography"), (2) first letter of the answer.

**Gameplay:**
- Player sees the emoji sequence and an input field.
- Player types a guess. Correct match (including aliases) solves the puzzle.
- Player can request hint 1 (category) and hint 2 (first letter), each available once.
- "Give up" button: reveals answer, score = 0.

**Scoring:**
- Base score: 100 points.
- Penalty per wrong guess: -20 points.
- Penalty per hint used: -25 points.
- Minimum score: 10.
- Give up: 0 points.

### 5.4 Screenshot Mode

**Objective:** Identify the subject of an image that starts blurred and can be progressively sharpened.

**Setup:**
- Each puzzle has a target answer and an image (public-domain photo, original illustration, or silhouette).
- The image starts at blur level 3 (heavily blurred).
- Player can "sharpen" up to 3 times: level 3 → 2 → 1 → 0 (fully clear).

**Gameplay:**
- Player sees the blurred image and an input field.
- Player types a guess at any blur level.
- Player can sharpen (reduce blur by one level) up to 3 times.
- "Give up" button: reveals answer and full image, score = 0.

**Scoring:**
- Base score: 100 points.
- Penalty per wrong guess: -20 points.
- Penalty per sharpen action: -25 points.
- Minimum score: 10.
- Give up: 0 points.

**Image constraints:**
- Only public-domain images (Wikimedia Commons, NASA, etc.), original illustrations, or generated silhouettes.
- Each image includes attribution metadata where required by license.
- No copyrighted photographs, no game screenshots, no movie stills.

### 5.5 Timeline Mode

**Objective:** Arrange 4-6 items in correct chronological order (oldest to newest).

**Setup:**
- Each puzzle has 4-6 items, each with: title, short description, hidden year/date.
- Items are presented in random order.
- The correct order is strictly chronological by date.

**Gameplay:**
- Player sees item cards in a vertical list, shuffled.
- Player rearranges via drag-and-drop (desktop) or move up/down buttons (all devices, including desktop as accessibility alternative).
- "Submit order" button: locks the arrangement and scores.
- "Hint" button: reveals the date of one item (player picks which). Available up to 2 times.
- "Give up" button: reveals correct order, score = 0.

**Scoring:**
- Base score: 100 points.
- Penalty per position error (item is N positions away from correct spot): -15 × N points.
- Penalty per hint: -10 points.
- Minimum score: 10.
- Give up: 0 points.

**Example:** 4 items. Player places item A 1 position off, item B 2 positions off. Total position errors = 1 + 2 = 3. Score = 100 - (15 × 3) = 55. (The other two items are necessarily correct since only A and B are wrong.)

## 6. Content Model

### 6.1 Puzzle Types

Each puzzle is a JSON object. The `mode` field determines which sub-schema applies.

**Keywords puzzle:**
```json
{
  "id": "kw-001",
  "mode": "keywords",
  "domain": "geography",
  "target": "Volcano",
  "aliases": ["volcano", "volcanoes"],
  "keywords": ["mountain", "heat", "lava", "eruption", "magma", "crater"],
  "fact": "A volcano is a rupture in the crust of a planetary-mass object that allows hot lava and volcanic ash to escape."
}
```

**Emoji puzzle:**
```json
{
  "id": "em-001",
  "mode": "emoji",
  "domain": "geography",
  "target": "Volcano",
  "aliases": ["volcano"],
  "emojis": ["🌋", "💨", "🔥"],
  "hints": { "category": "Geography", "firstLetter": "V" },
  "fact": "..."
}
```

**Screenshot puzzle:**
```json
{
  "id": "ss-001",
  "mode": "screenshot",
  "domain": "nature",
  "target": "Mount Everest",
  "aliases": ["mount everest", "everest"],
  "image": "/images/puzzles/ss-001.webp",
  "imageLicense": "public-domain",
  "imageAttribution": "NASA, via Wikimedia Commons",
  "fact": "..."
}
```

**Timeline puzzle:**
```json
{
  "id": "tl-001",
  "mode": "timeline",
  "domain": "history",
  "items": [
    { "title": "Printing press invented", "description": "Gutenberg's movable-type press", "date": 1440 },
    { "title": "Steam engine patented", "description": "Watt's improved steam engine", "date": 1769 },
    { "title": "First airplane flight", "description": "Wright brothers at Kitty Hawk", "date": 1903 },
    { "title": "Moon landing", "description": "Apollo 11", "date": 1969 }
  ],
  "fact": "..."
}
```

### 6.2 Domains

| Domain | Topics | Example targets |
|--------|--------|-----------------|
| Geography | Landforms, countries, landmarks, weather | Volcano, Sahara, Eiffel Tower |
| Science | Elements, discoveries, phenomena | Oxygen, Gravity, DNA |
| History | Events, inventions, eras | Printing press, Renaissance |
| Nature | Animals, plants, ecosystems | Octopus, Baobab, Coral reef |
| Everyday | Objects, food, tools | Compass, Sourdough, Umbrella |

### 6.3 Daily Schedule

- Puzzles are assigned to dates at build time using a deterministic hash: `dailyPuzzles = hash(utcDateString) % poolSize` for each mode.
- The schedule file (`data/daily-schedule.json`) maps date strings to puzzle IDs, pre-generated for a configurable range (e.g., 365 days from build date).
- When the schedule runs out, the build process regenerates it — no runtime computation needed.

## 7. Scoring and Streak Rules

### 7.1 Per-Puzzle Scoring Summary

| Mode | Base | Wrong guess | Hint/Reveal | Sharpen | Min | Give up |
|------|------|-------------|-------------|---------|-----|---------|
| Keywords | 100 | -10/guess | -15/keyword | — | 10 | 0 |
| Emoji | 100 | -20/guess | -25/hint | — | 10 | 0 |
| Screenshot | 100 | -20/guess | — | -25/level | 10 | 0 |
| Timeline | 100 | — | -10/hint | — | 10 | 0 |

Timeline has no "wrong guess" penalty — instead, position errors are scored at submission.

### 7.2 Daily Total and Streak Multiplier

- Daily total = sum of 4 puzzle scores (0-400).
- Streak multiplier applies to the daily total:

| Streak (days) | Multiplier |
|---------------|-----------|
| 1-2 | 1.00x |
| 3-4 | 1.05x |
| 5-6 | 1.10x |
| 7-9 | 1.20x |
| 10+ | 1.50x |

- Final daily score = `dailyTotal × multiplier`, rounded to nearest integer.
- Example: daily total 280, streak 7 days → 280 × 1.20 = 336.

### 7.3 Streak Rules

- A streak day counts when the player completes at least 1 puzzle in the Daily Challenge for that UTC day.
- Streak increments by 1 each consecutive UTC day with activity.
- Streak resets to 0 if a UTC day passes with 0 puzzles attempted.
- No grace period. The UTC boundary is strict.
- Max streak is tracked separately from current streak.
- Streak is per-browser (localStorage). Clearing browser data resets streak.

### 7.4 Stats Tracked

| Stat | Description | Source |
|------|-------------|--------|
| Current streak | Consecutive days with activity | localStorage |
| Max streak | Highest streak ever achieved | localStorage |
| Games played | Total puzzles completed (all modes) | localStorage |
| Best daily score | Highest final daily score | localStorage |
| Mode breakdown | Games played per mode | localStorage |
| Average score | Mean score per mode | localStorage |
| Last 30 days | Daily score history for calendar heatmap | localStorage |

## 8. User Stories

### 8.1 Daily Challenge

- **US-1:** As a player, I open the home page and see whether today's Daily Challenge is started, in progress, or complete, so I know what to do next.
- **US-2:** As a player, I tap "Start" and see 4 puzzle cards, one per mode, so I can choose which to solve first.
- **US-3:** As a player, I solve one puzzle, return to the daily page, and see my score on that card, so I can track my progress.
- **US-4:** As a player, I complete all 4 puzzles and see my total score with streak multiplier applied, so I understand my performance.
- **US-5:** As a player, I complete the daily challenge and tap "Share" to copy a text summary to my clipboard, so I can paste it in a group chat.
- **US-6:** As a player, I close the tab mid-challenge, reopen it later the same day, and my progress is preserved, so I don't lose work.
- **US-7:** As a player, I come back the next day and see a new challenge, so the game stays fresh.

### 8.2 Individual Modes

- **US-8:** As a player, I open Keywords mode and see an input field with a "Reveal keyword" button, so I can start guessing immediately.
- **US-9:** As a player, I type a wrong guess in Keywords and see it listed below with a "wrong" indicator, so I know what I already tried.
- **US-10:** As a player, I open Emoji mode and see emoji art with an input field, so I can guess without reading instructions.
- **US-11:** As a player, I open Screenshot mode and see a blurred image, so I know I need to sharpen or guess.
- **US-12:** As a player, I open Timeline mode and see shuffled item cards with drag handles, so I can start arranging.
- **US-13:** As a player, I use keyboard arrow keys to reorder Timeline items as an alternative to dragging, so I can play without a mouse.
- **US-14:** As a player, I tap "Give up" on any puzzle and see the answer revealed, so I can learn even when stuck.
- **US-15:** As a player, after any puzzle ends (solved or given up), I see a fact about the answer, so I learn something new.

### 8.3 Stats and Sharing

- **US-16:** As a player, I open the Stats page and see my current streak, max streak, and best daily score, so I can track my progress over time.
- **US-17:** As a player, I see a 30-day calendar heatmap of my daily scores, so I can visualize my consistency.
- **US-18:** As a player, I see a breakdown of my average score per mode, so I know which modes I'm strongest at.
- **US-19:** As a player, I share my result and it includes a URL that opens the site with an OG preview card showing my score, so my friends can see what I got.

### 8.4 Archive

- **US-20:** As a player, I browse the archive and see a list of past daily challenges by date, so I can find one to replay.
- **US-21:** As a player, I tap a past date and play that challenge from scratch, so I can practice or catch up on missed days.
- **US-22:** As a player, archived challenges don't affect my streak, so I can play them stress-free.

## 9. Acceptance Criteria

### 9.1 Daily Challenge

| AC # | Criterion | Verification |
|------|-----------|-------------|
| AC-1 | Home page shows today's Daily Challenge status within 1 second of page load on 4G | Lighthouse TTI < 1s, manual check |
| AC-2 | Daily Challenge page shows exactly 4 puzzle cards, one per mode | Visual inspection, E2E test |
| AC-3 | Solving a puzzle locks its card and displays the score | E2E: solve puzzle → card shows score → cannot re-open |
| AC-4 | Completing all 4 puzzles shows total score with streak multiplier | E2E: complete 4 → total = sum × multiplier |
| AC-5 | Closing and reopening the browser preserves daily progress within the same UTC day | Manual: close tab → reopen → progress intact |
| AC-6 | After UTC midnight, a new challenge appears and yesterday's progress is archived | Manual/E2E: mock date change → new puzzles appear |
| AC-7 | Share button copies a text summary to clipboard | E2E: click share → clipboard contains score summary |

### 9.2 Keywords Mode

| AC # | Criterion | Verification |
|------|-----------|-------------|
| AC-8 | Input field accepts free text, submits on Enter or button click | E2E: type + Enter → guess registered |
| AC-9 | Correct guess (case-insensitive, trimmed) solves the puzzle | Unit test: matchGuess("volcano ", "Volcano") = true |
| AC-10 | Aliases are accepted as correct | Unit test: matchGuess("everest", target with aliases) = true |
| AC-11 | Wrong guesses are listed and input clears | E2E: wrong guess → list shows it → input empty |
| AC-12 | Reveal keyword button shows next keyword and cannot exceed 6 | E2E: click 7 times → button disabled at 6 |
| AC-13 | Score = max(10, 100 - 15×keywords - 10×wrongGuesses) | Unit test |
| AC-14 | Give up reveals answer and sets score to 0 | E2E: give up → answer shown → score = 0 |

### 9.3 Emoji Mode

| AC # | Criterion | Verification |
|------|-----------|-------------|
| AC-15 | Emoji sequence displays correctly on iOS, Android, and desktop browsers | Manual cross-browser |
| AC-16 | Hints are available in order: category first, then first letter | E2E: hint 1 = category, hint 2 = firstLetter |
| AC-17 | Score = max(10, 100 - 20×wrong - 25×hints) | Unit test |
| AC-18 | Give up reveals answer, score = 0 | E2E |

### 9.4 Screenshot Mode

| AC # | Criterion | Verification |
|------|-----------|-------------|
| AC-19 | Image starts at blur level 3 (heavily blurred) | Visual inspection |
| AC-20 | Sharpen button reduces blur by one level, max 3 uses | E2E: click 4 times → disabled at 3 |
| AC-21 | All images are public-domain or original illustrations | Content audit: no copyrighted images in /images/puzzles/ |
| AC-22 | Attribution metadata is present where required | Content audit: each image has license + attribution fields |
| AC-23 | Score = max(10, 100 - 20×wrong - 25×sharpens) | Unit test |

### 9.5 Timeline Mode

| AC # | Criterion | Verification |
|------|-----------|-------------|
| AC-24 | Items are presented in random order (not chronological) | E2E: verify shuffled on load |
| AC-25 | Drag-and-drop reorders items on desktop | E2E: drag item A above item B → order changes |
| AC-26 | Move up/down buttons work as drag alternative | E2E: focus item → press arrow down → item moves down |
| AC-27 | Submit button scores based on position errors | Unit test: given [A,B,C,D] submitted as [B,A,C,D], errors = 2 |
| AC-28 | Hint reveals one item's date, max 2 hints | E2E |
| AC-29 | Score = max(10, 100 - 15×totalPositionErrors - 10×hints) | Unit test |

### 9.6 Scoring and Streak

| AC # | Criterion | Verification |
|------|-----------|-------------|
| AC-30 | Streak multiplier table matches spec (1.0x to 1.5x) | Unit test |
| AC-31 | Streak increments when ≥1 puzzle completed in a UTC day | E2E: complete puzzle → streak +1 |
| AC-32 | Streak resets to 0 when a UTC day is skipped | E2E: mock date skip → streak = 0 |
| AC-33 | Final daily score = round(dailyTotal × multiplier) | Unit test |
| AC-34 | All stats persist in localStorage after page reload | E2E: reload → stats intact |

### 9.7 Accessibility

| AC # | Criterion | Verification |
|------|-----------|-------------|
| AC-35 | All interactive elements have minimum 44×44px touch target | Manual measurement |
| AC-36 | Color is not the sole indicator of correct/wrong (icons + text labels) | Visual inspection |
| AC-37 | Timeline drag has button alternative (move up/down) | E2E |
| AC-38 | All inputs have associated labels | axe-core scan |
| AC-39 | Keyboard navigation works for all game flows | Manual keyboard test |
| AC-40 | Screen reader announces game state changes via aria-live | Manual NVDA/VoiceOver test |

### 9.8 Performance

| AC # | Criterion | Verification |
|------|-----------|-------------|
| AC-41 | First Contentful Paint < 1.5s on 4G | Lighthouse |
| AC-42 | Time to Interactive < 2s on 4G | Lighthouse |
| AC-43 | Lighthouse Performance ≥ 85 on home page | Lighthouse |
| AC-44 | Lighthouse Accessibility ≥ 95 on all game pages | Lighthouse |
| AC-45 | PWA installable (manifest + service worker) | Lighthouse PWA audit |

## 10. Risks and Pending Decisions

### 10.1 Risks

| # | Risk | Probability | Impact | Mitigation |
|---|------|------------|--------|------------|
| R1 | Content pool too small — players cycle through same puzzles within weeks | Medium | High | Launch with 50+ puzzles per mode (200+ total). Add content in batches. |
| R2 | Screenshot mode image sourcing is labor-intensive | High | Medium | Prioritize public-domain image collections (Wikimedia, NASA, NOAA). Use silhouettes as fallback. |
| R3 | Streak frustration — players who miss a day may churn | Medium | High | Consider a "streak freeze" mechanic (1 grace day per week) in post-MVP. For MVP, accept strict streak. |
| R4 | localStorage quota exceeded on devices with low storage | Low | Medium | Keep stored data minimal (scores, dates, streaks — no puzzle content). Target < 100KB total. |
| R5 | Emoji rendering differs across platforms | Medium | Low | Test on iOS, Android, Windows, macOS. Choose emojis with universal support. Provide text fallback in hints. |
| R6 | Daily schedule runs out after 365 days | Low | High | Build script regenerates schedule. Add CI check for schedule expiry date. |
| R7 | Players want social features (leaderboards, friends) that require a backend | High | Medium | Explicitly communicate "personal stats only" in MVP. Plan a serverless backend phase if demand warrants. |

### 10.2 Pending Decisions

| # | Decision | Options | Status |
|---|----------|---------|--------|
| D1 | Should Unlimited mode track a separate "casual streak"? | A: No streak for unlimited / B: Separate casual streak | Leaning A — unlimited is practice, no streak |
| D2 | Should archive replays count toward stats? | A: No, archive is practice / B: Yes, separate archive stats | Leaning A — archive is stress-free practice |
| D3 | How many puzzles per Daily Challenge? | A: 4 (one per mode) / B: 5 (two of one mode) / C: Variable | Decided: 4 (one per mode) |
| D4 | Should there be difficulty levels within each mode? | A: Flat difficulty / B: Easy/Hard toggle / C: Adaptive | Deferred to post-MVP |
| D5 | Should the share card be an image (OG) or text only? | A: Text only / B: Generated image / C: Both | Decided: Text-based for MVP, OG image for link previews |
| D6 | Should Timeline support horizontal (desktop) and vertical (mobile) layouts? | A: Vertical only / B: Responsive | Leaning A — vertical on all, simpler |
| D7 | What happens if a player's clock is wrong (not synced to UTC)? | A: Use device time / B: Fetch server time | A for MVP (static site has no server). Document the limitation. |
| D8 | When to migrate to a database? | Triggers: (1) social features requested, (2) user-generated content, (3) cross-device sync demand | Not in MVP. Reassess after 3 months of usage data. |

### 10.3 Database Migration Triggers

The product is designed to run without a database indefinitely. Migration is only justified when one of these conditions is met:

1. **Social features**: Players want to compare scores with friends or see community averages. This requires server-side score submission and retrieval.
2. **Cross-device sync**: Players want their streak and stats to follow them across devices. This requires server-side user identity (even anonymous, device-paired).
3. **User-generated content**: Players want to create and share custom puzzles. This requires content storage and moderation.
4. **Dynamic content updates**: Content team wants to add puzzles without a full rebuild and deploy. This requires a content API.

Until any of these conditions are met, the static + localStorage architecture is sufficient and superior in cost, speed, and simplicity.
