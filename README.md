pomodoro-pet v0.1.0
==========

A 3D virtual pet pomodoro timer desktop app, aiming for Steam release.

> 🤖 This project is built entirely through **Vibe Coding** with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (Anthropic CLI).

## Screenshots

| Home | Config |
|:---:|:---:|
| ![Home](.claude/memories/2026-02-22_PomodoroPet/screen01_home.png) | ![Config](.claude/memories/2026-02-22_PomodoroPet/screen02_config.png) |

| Statistics | Pet (Fureai Mode) |
|:---:|:---:|
| ![Statistics](.claude/memories/2026-02-22_PomodoroPet/screen03_stats.png) | ![Pet](.claude/memories/2026-02-22_PomodoroPet/screen04_pet.png) |

| Pomodoro | Break |
|:---:|:---:|
| ![Pomodoro](.claude/memories/2026-02-22_PomodoroPet/screen06_pomodoro.png) | ![Break](.claude/memories/2026-02-22_PomodoroPet/screen07_break.png) |

| Congrats |
|:---:|
| ![Congrats](.claude/memories/2026-02-22_PomodoroPet/screen08_congrats.png) |

## Features

- **Pomodoro Timer** — Work / Break / Long Break phase cycling with pause, resume, and stop. Circular progress ring, phase dots, and background tint visualization
- **Timer Settings** — Configurable Work / Break / Long Break durations and Sets per Cycle
- **3D Character** — Autonomous behavior (idle, wander, sit, sleep), march during work, celebration on completion. Click, pet, and drag interactions
- **Statistics** — 13-week heatmap, daily / 7-day / monthly summaries of completed cycles and work time
- **Fureai Mode** — Feed the character by dragging apples and cabbages. Prompt input for behavior commands (English / Japanese keywords)
- **Weather Settings** — Choose weather type (sunny / cloudy / rainy / snowy), cloud density (6 levels), and time of day (morning / day / evening / night / auto). Live preview with dynamic lighting and effects
- **Sound** — Procedural ambient sounds (forest / rain / wind), timer SFX, break BGM with crossfade, volume and mute controls
- **Background Notifications** — System toast notifications for phase completion and cycle completion when the app is in the background
- **Emotion System** — Satisfaction, fatigue, and affinity parameters that respond to pomodoro completion, feeding, and petting. Affinity persists across sessions
- **Auto Update** — Check, download, and install updates via electron-updater with in-app notification banner

## Architecture

Clean Architecture (dependency direction: outer → inner only)

```
domain ← application ← adapters ← infrastructure
```

Three domain contexts: Timer, Character, Environment.
Modules communicate via EventBus (Pub/Sub) for loose coupling.

## Tech Stack

TypeScript + Electron + Three.js + React + Vite + vanilla-extract

## Assets

- https://downraindc3d.itch.io/wildboar