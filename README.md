# Tick List

A dark-themed Vue app for timed tasks and a stopwatch with an optional hourly rate calculator.

Use it when you need countdown timers with alarms for work blocks, or a stopwatch that can track elapsed time, laps, and estimated earnings.

## Features

### Tasks
- Create tasks with a title and duration (hours / minutes)
- Start, pause, reset, enable / disable
- Add +1 / +5 minutes on the fly
- Alarm sound when a timer reaches zero
- Archive and restore tasks
- Data persists in `localStorage` (active + archived)

### Stopwatch
- Start / stop / reset
- Lap list with split and total time
- Optional price calculator: set an hourly rate, see live earnings, and per-lap totals
- State persists in `localStorage` until reset

## Stack

| Tool | Why |
| --- | --- |
| [Vue 3](https://vuejs.org/) | UI with Composition API and Single File Components |
| [Vite](https://vitejs.dev/) | Dev server and production build |
| [Pinia](https://pinia.vuejs.org/) | App state for tasks and stopwatch |
| Web Audio API | Alarm tone without external audio files |
| `localStorage` | Persist tasks, archive, and stopwatch between reloads |
| Google Fonts (Outfit, Space Grotesk, JetBrains Mono) | UI and timer typography |

No backend — everything runs in the browser.

## Project structure

```
src/
  App.vue                 # Layout and Tasks / Stopwatch modes
  components/
    TaskForm.vue          # Create task + duration (mechanical / slider)
    TaskList.vue          # Active / Archive tabs
    TaskItem.vue          # Task controls
    Stopwatch.vue         # Stopwatch UI + pricing toggle
    BrandLogo.vue         # Mark + wordmark
    WheelPicker.vue       # iOS-style hours / minutes slider
  stores/
    tasks.js              # Task timers, archive, persistence
    stopwatch.js          # Stopwatch, laps, pricing
  composables/
    useAlarm.js           # Alarm playback + duration formatting
  style.css               # Global theme tokens
  assets/
    logo-mark.svg         # Brand mark
```

## Setup

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://127.0.0.1:5173`).

### Scripts

```bash
npm run dev       # development server
npm run build     # production build → dist/
npm run preview   # preview the production build
```

## Browser notes

- Alarm audio may need a user gesture (click Start / Add task) before the browser allows sound.
- Timers keep counting across page reloads while a task or stopwatch is running.
