# CROSS: wildebeest river-crossing game

## Location and tools

- GitHub: https://github.com/internetofelephants/cross, branch `main`.
- React 19, TypeScript, Vite 6 and Tailwind 4, using **npm** (not Bun). First generated in Google AI Studio.
- `npm run dev` serves on port 3000 by default. Vite reads a `PORT` variable if one is set; this is configured in `vite.config.ts`, not `package.json`.
- `npm run lint` type-checks.
- `.claude/launch.json` defines a `cross-dev` preview config with `autoPort: true`, so the preview server may land on a random port. `.claude/` is gitignored.
- Git pushes use macOS Keychain; never paste tokens into chat.
- The Claude browser pane is shared with the user.
- Google Chrome is installed, which is useful for headless screenshots.

## The game

Each level is a new herd at a different crossing point. There are 10 crossings, #1 to #10, each harder than the last.

- **Goal:** steer the lead wildebeest (the alpha) from the left bank to one of the two green exit ramps on the far bank (y 80–200 and 460–580). The rest of that bank is an unclimbable mud cliff.
- **Movement:** WASD, arrow keys, or mouse move, click or tap. Pointing with the mouse overrides the keys until the alpha reaches that spot.
- **Hop:** Space or the "Hop!" button. Costs 15% stamina, works only in the water, gives a short lunge forward, shoves nearby animals aside, and can leap over crocodile jaws.
- **Stamina:** drains while swimming, faster upstream and much faster in a crush, and never refills during a crossing. Below 5% the alpha is exhausted (slower, can't hop) and only recovers above 35%, so in practice it's permanent. At 0% the alpha drowns.
- **Health:** recovers only on the bank. Drifting past the bottom of the river means being washed away.
- **Stampede:** 3 or more animals within 38px slow the alpha, drain health, and drain stamina heavily.
- **Isolation:** straying more than `STRAY_DISTANCE` (120, in `src/types.ts`) from the herd triggers a HUD warning. Stalker crocodiles hunt isolated swimmers at 1.6× speed.
- **Crocodiles:** lane (patrols a line), stalker (hunts strays), sleeper (lies still, periodically wakes with open jaws). A bite does 45 damage and knocks the alpha back.
  - Deliberate, don't change: a crocodile that kills anything is sated for the rest of the crossing and carries its prey downstream.
- **Croc counts** (lane / stalker / sleeper), set in the `switch (day)` in `setupLevel`:
  - #1–5: 1/1/2, 1/2/2, 2/2/3, 2/2/4, 3/2/4
  - #6–10: 3/2/5, 4/2/5, 4/3/5, 5/3/6, 6/4/7
  - The total rises every crossing and no type ever decreases. Keep it that way.
- **River current:** rises evenly from #1 (0.135) to #10 (0.38). Helpers at the top of `GameCanvas.tsx`: `currentRamp`, `currentPush`, `currentFlowSpeed`.
- **Herd size:** 10 + 3×N animals. Later waves are larger; waves 2 and 3 are doubled.

## Code layout

- `src/components/GameCanvas.tsx`: simulation and canvas drawing.
  - Key functions: `setupLevel`, `updateAlphaLeader`, `updateFollowerHerd`, `updateAmbientWildebeests`, `updatePredators`, `processCollisions`, `evaluateWaveProgress`, `drawGameOnly`.
  - Mutable game state lives in `stateRef`, including `paused` (set while the guide is open). Fixed 60 steps per second.
  - Canvas is 1200×675; the river spans x 220–980.
  - Calls `onGameOver(cause)` with a `DeathCause` ('eaten' | 'washed' | 'trampled' | 'drowned', in `types.ts`).
- `App.tsx`: screen flow (title overlay → menu → playing → summary → gameover). Internal state is still called `day` though players see "Crossing #N". Also holds `deathCause`.
- `TitleScreen.tsx`: full-screen concept art (`src/assets/title-art.webp`, cropped to cover, pinned top-left) with a Play button. Dissolves over 1.2s into the start screen; shows only on first load.
- `MainMenu.tsx`: start screen with intro text, the map and a "Start Crossing #1 →" button.
- `DaySummary.tsx`: between-crossings screen: "Crossing #N: made it!", "Nice swimming", the map, a "Next up: Crossing #N" briefing (one fixed paragraph), and "Reset all" / "Into the water" buttons.
- `GameOver.tsx`: "The river won this one" or "All ten crossings made!", with Lost at and Cause rows. Rank is based on crossings finished (Riverbank Rookie / Plains Walker / Savannah Survivor / Gnu Master).
- `GameHUD.tsx`: crossing number, Health and Stamina bars, "Hop!" button, isolation warning, and restart, reset, sound and ? buttons.
- `GuideModal.tsx` + `src/data/guideContent.tsx`: the ? panel (on the menu, HUD and game over). Tabs: Instructions, About (credits and project story), References (empty). Grows out of the ? button, closes with Escape, click-outside or ✕, and pauses the game while open.
- `CrossingMap.tsx`: SVG map with 10 stepping stones. Props: `completed`, `justCompleted`, `onSelect`. With `onSelect`, clicking any stone plays that crossing (replaced debug mode). Colours in the palette object `C`. Names in `CROSSING_NAMES` are unverified.
- `src/utils/audio.ts` (sound), `src/hooks/useEscapeKey.ts`, `src/vite-env.d.ts`.

## Visual style

- Theme colours in `src/index.css` under `@theme`:
  - `page` `#2f5563`: river blue, background outside panels.
  - `panel` `#252019`, `panel-raised` `#2f2921`, `line` `#443b30`.
  - `inset` `#1c1813`: small dark boxes inside panels (bar tracks, tabs).
- Accent gold `#c2a078`; dark text on gold is `#1e1a15`.
- `.screen-glow`: faint gold radial glow at the top of full screens.
- Game canvas: dusty brown banks; river runs from muddy olive shallows (`#34402f`) to a teal channel (`#2f5563`).
- Fonts: Fredoka (`font-display`, SemiBold) for headings, buttons and labels; Inter for body text. Headings in sentence case, no wide letter spacing, no monospace in player-facing text.
- Buttons are pill-shaped (`rounded-full`); panels use `rounded-2xl` / `rounded-xl`.
- The title-screen concept art uses a different style (chunky cream and navy lettering). The plan is to align styles later.

## Decisions and constraints

- Nothing is labelled "Day" for players. Internal names (`day`, `dayNumber`, `DaySummary`) stay as they are.
- Leave the mouse-steering override alone unless the user asks.
- The clickable-stone level select is provisional and may be removed. Removing `onSelect` from `MainMenu` and `DaySummary` turns it off.
- Known side effect, left on purpose: jumping straight to a later crossing ticks the earlier stones and inflates the game-over rank.

## Still open

- A cleaner logo file and a tagline banner (waiting on final art). A portrait crop of the title art for phones, where the logo is currently cut to "CROS".
- References tab content (About is filled in).
- Checking the crossing names in `CROSSING_NAMES`.
- Showing the full 10-checkmark map on the victory screen.
- Possibly tightening the safe strip along the banks if hugging the bank becomes an easy strategy.
- Exhaustion is effectively permanent once triggered, since stamina never refills during a crossing.
- The fixed-step speed hasn't been tested on a real 120Hz display.
- The `gameplay-cleanup-and-tuning` branch on GitHub can be deleted.
