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