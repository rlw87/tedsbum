# Ted's Bum

A Beat Saber–style rhythm web game starring **Ted the cat**. Tap the left or
right of Ted's bum (and, on harder levels, his head) in time with the music.
Runs in any modern browser on desktop and mobile.

![Built with Phaser 3](https://img.shields.io/badge/engine-Phaser_3-orange)
![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)
![Vite](https://img.shields.io/badge/bundler-Vite-646cff)

---

## How it plays

- Notes slide in from off-screen toward a target hit zone on Ted.
- When a note arrives, **tap / click** the matching part of Ted in time with
  the beat.
- Three lanes:
  - **Left bum** — left cheek (colour: blue notes, labelled `L`)
  - **Right bum** — right cheek (colour: pink notes, labelled `R`)
  - **Head** — on medium/hard levels (colour: yellow notes, labelled `★`)
- Every tap is judged:
  - **Perfect** — within ±60 ms → biggest score + combo
  - **Good** — within ±120 ms → smaller score + combo
  - **Miss** — outside the window, or wrong lane → breaks your combo
- Score, combo, and live accuracy are shown in the HUD. Reach **≥ 70%
  accuracy** on a level to unlock the next one.

## Levels

| # | Title              | Difficulty | Ted's movement | Head lane? |
|---|--------------------|------------|----------------|------------|
| 1 | Warm-up Wiggle     | Easy       | Static         | No         |
| 2 | Double Trouble     | Medium     | Slow drift     | Yes        |
| 3 | Ted Goes Wild      | Hard       | Full chaos     | Yes        |

Level progress is stored in `localStorage` under `tedsbum.progress.v1`.
Clear that key (or your browser storage) to reset unlocks.

## Custom tracks

On the level-select screen, tap **"+ Play a Custom Track"** and pick any
audio file from your device (MP3, WAV, OGG, etc.). The game will:

1. Decode it with the Web Audio API.
2. Run onset detection (spectral-flux) to find beats.
3. Quantise and assign lanes based on the chosen difficulty.
4. Cache the generated beatmap in `localStorage` so replays are instant.

No server upload happens — everything runs locally in your browser.

## Controls & accessibility

- **Desktop**: mouse click on the corresponding part of Ted.
- **Mobile / touch**: tap directly on Ted. Multi-touch is enabled for
  hard-level double-taps (e.g. left + right simultaneously).
- Hit zones are intentionally generous around the visible art so thumbs on
  small screens have room.
- On narrow portrait mobile screens a "rotate to landscape" prompt appears,
  but the game still works in portrait.

---

## Running locally

### Prerequisites

- **Node.js ≥ 18** (tested with 20+)
- **npm** (or pnpm / yarn — adjust commands accordingly)

### Setup

```bash
git clone https://github.com/rlw87/tedsbum.git
cd tedsbum
npm install
```

### Start the dev server

```bash
npm run dev
```

Vite prints both a local and a network URL, e.g.:

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

Open the **local** URL on your computer, or the **network** URL on a phone
on the same Wi-Fi to test touch controls on a real device.

### Production build

```bash
npm run build     # type-checks with tsc, then bundles with vite
npm run preview   # serves the built dist/ on http://localhost:4173
```

The output lives in `dist/` and is a fully static site — it will drop into
any static host (GitHub Pages, Cloudflare Pages, Netlify, S3, etc.). No
backend is required.

### Scripts reference

| Command           | What it does                                            |
|-------------------|---------------------------------------------------------|
| `npm run dev`     | Start the Vite dev server with HMR                      |
| `npm run build`   | Type-check, then produce an optimised build in `dist/`  |
| `npm run preview` | Serve the `dist/` build locally for a final smoke test  |

---

## Tech stack

- **[Phaser 3](https://phaser.io/)** — scenes, sprites, tweens, pointer input
- **[Vite](https://vitejs.dev/)** — dev server + bundler
- **TypeScript** — strict mode
- **Web Audio API** — used directly (not via Phaser's sound manager) so the
  same `AudioContext` drives playback, the clock, and user-file decoding

## Project layout

```
src/
├── main.ts                    # Phaser boot + scene registration
├── audio/
│   ├── AudioClock.ts          # Web Audio currentTime → game time
│   └── AudioPlayer.ts         # AudioBuffer playback + metronome synth
├── entities/
│   ├── Ted.ts                 # Cartoon cat + hit zones + motion modes
│   └── HitZone.ts             # Tappable rectangle child of Ted
├── gameplay/
│   ├── BeatMapGenerator.ts    # Onset detection → BeatMap
│   ├── NoteSpawner.ts         # Just-in-time note spawning
│   ├── Note.ts                # Sprite that tweens toward its target zone
│   ├── HitDetector.ts         # Timing windows, Perfect/Good/Miss
│   ├── ScoreManager.ts        # Score, combo, accuracy
│   └── types.ts               # Lane / Difficulty / BeatMap / Judgment
├── levels/levels.ts           # Level definitions (data only)
├── scenes/
│   ├── BackgroundScene.ts     # Shared animated backdrop
│   ├── MenuScene.ts           # Title screen
│   ├── LevelSelectScene.ts    # Level cards + custom-track button
│   ├── GameScene.ts           # Core gameplay
│   └── ResultScene.ts         # Score + retry / next level
├── ui/Hud.ts                  # In-game HUD
└── utils/
    ├── responsive.ts          # Scale constants + rotate prompt hookup
    └── storage.ts             # localStorage for progress + map cache
```

## How timing works (important for modding)

`AudioClock` exposes `now()` = `ctx.currentTime − startTime`. Everything
time-related in the game — note spawn timing, note positions, hit windows —
is derived from this single function. **Never** drive gameplay from
`delta` / `performance.now()`: the Web Audio clock is the only one that
stays in lock-step with the audio itself across a long track.

Travel time for a note (spawn → target) is a fixed `TRAVEL_DURATION` in
`gameplay/types.ts`. Adjust it to change the "look-ahead" a player gets.

## Adding a real track

The three demo levels currently play a procedural metronome so the game is
playable with zero assets. To wire in a real audio file:

1. Drop the file under `public/assets/audio/`, e.g. `track1.mp3`.
2. In `src/levels/levels.ts`, set `track: '/assets/audio/track1.mp3'` on
   the level you want. You can leave `bpm` as a hint for the generator.
3. Reload. The first play will run the generator on the file and cache the
   beatmap by content hash in `localStorage`.

## Swapping the cartoon art for real sprites

`Ted.ts` currently draws Ted procedurally via `scene.add.graphics()` so the
game runs before art exists. To drop in your own PNGs:

1. Put the image under `public/assets/images/`, e.g. `ted.png`.
2. In `BootScene` (add one if it doesn't exist yet) or `GameScene.preload`,
   call `this.load.image('ted', 'assets/images/ted.png')`.
3. Replace the `graphics` calls inside `Ted`'s constructor with
   `this.add.image(0, 0, 'ted')`.
4. Adjust the `HitZone` offsets inside `Ted.ts` so the zones line up with
   the new art's anatomy.

---

## Deployment

Deferred by design — `npm run build` produces a static `dist/` that works
on any host. Some easy options:

- **GitHub Pages** via a workflow that runs `npm ci && npm run build` and
  publishes `dist/`.
- **Cloudflare Pages / Netlify / Vercel**: connect the repo, set the build
  command to `npm run build`, and the output directory to `dist`.

## Known limitations / next up

- Demo levels use a procedural metronome, not real music — sounds like a
  drum machine until real tracks are added.
- Ted's art is drawn procedurally (see *Swapping the cartoon art* above).
- The beatmap generator is intentionally simple (energy-based onset
  detection). It works well on rhythmic / percussive tracks; quiet or very
  dense tracks may need the difficulty bumped down.

## Licence

TBD.
