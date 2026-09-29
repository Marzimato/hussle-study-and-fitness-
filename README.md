# Hussle

**A platform that rewards balance in college lifestyle.** Hussle turns two things students usually trade off, studying and staying fit, into one points system. You earn the most by doing both.

Study sessions use your webcam to check your posture and restlessness. Workouts use live pose tracking to count squat and push-up reps. Everything runs in the browser.

---

## Features

**Study Focus Mode**
- Timed focus sessions with webcam posture monitoring (MediaPipe Face Mesh).
- Calibrates a baseline face distance, then flags *too close*, *too far* and *restless* states. Restlessness comes from a low-pass-filtered measure of head movement.
- Points accrue while the timer runs: more for good posture, fewer when slouched or restless. Finishing a session adds a focus-quality bonus scaled by your focus score, plus a completion bonus.
- A built-in task list awards points for finished tasks.

**Fitness Workout Mode**
- Live rep counting for **squats** and **push-ups** (MediaPipe Pose), based on joint angles (hip-knee-ankle for squats, shoulder-elbow-wrist for push-ups).
- 5 points per rep, with an estimated calorie count and audio feedback.
- If the camera or MediaPipe is unavailable, an interactive joint-angle simulator lets you try the mode without a webcam.

**Balance Meter**
- Weekly bonus for doing both: **+50 pts** once you have 40+ points in study *and* fitness, and **+100 pts** at 80+ in both.
- Daily streak tracking and unlockable achievements (for example *Posture Scholar* and multi-day balance streaks).

**Calendar, Leaderboard and History**
- Calendar view of sessions with a weekly focus-session goal.
- Leaderboard that ranks your points against other participants.
- Activity log of every study and fitness session, with editable daily goals.

All progress is stored in your browser (`localStorage`). No account is needed.

## Tech stack

| Area | Tools |
| --- | --- |
| UI | React 19, TypeScript, Tailwind CSS 4, Motion, Lucide icons |
| Build | Vite 6 |
| Computer vision | MediaPipe Face Mesh and Pose (in-browser, loaded from the jsDelivr CDN) |
| Storage | Browser `localStorage` |

## Getting started

**Prerequisites:** Node.js 18+ and a webcam (optional, see the simulator above).

```bash
git clone https://github.com/Marzimato/hussle-study-and-fitness-.git
cd hussle-study-and-fitness-
npm install
npm run dev
```

Open <http://localhost:3000> and allow camera access when asked.

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Type-check with `tsc --noEmit` |

> The camera needs a secure context, so use `localhost` or HTTPS. MediaPipe and the fonts load from CDNs, so the first load needs an internet connection.

## Privacy

Camera frames are processed locally in your browser by MediaPipe. The app does not upload video or images anywhere.

## Project structure

```
src/
  App.tsx                       app shell, tabs, points, streaks, achievements
  types.ts                      shared types (posture state, metrics, logs, goals)
  components/
    StudyFocusMode.tsx          focus timer + posture tracking + task list
    FitnessWorkoutMode.tsx      pose-based rep counter + joint simulator
    BalanceMeter.tsx            weekly balance bonuses
    CalendarTab.tsx             calendar and weekly goal
    LeaderboardTab.tsx          leaderboard
```

## Current limitations

- The leaderboard currently ranks you against **sample participants**. There is no backend yet, so it is not a real multi-user competition.
- Data lives only in the browser, so it does not sync across devices and is lost if site data is cleared.
- Posture and rep detection use fixed angle and distance thresholds, so results depend on camera placement and lighting.
- `.env.example` and the `@google/genai` dependency come from the Google AI Studio template this project started from. The app does not call any Gemini API, and no API key is needed to run it.

## Author

Built by [Saksham Garg](https://github.com/Marzimato).
