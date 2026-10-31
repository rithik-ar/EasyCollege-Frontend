# EasyCollege Frontend

EasyCollege gives PSG Tech students and parents a friendlier view of their eCampus data. This repository is the web app: a React single-page app built with Vite.

What it shows:

- **Attendance**, course by course, with how many classes you can skip or need to attend, and a simulator for "what if I skip or attend the next few classes".
- **GPA and CGPA**, with a semester-by-semester trend and the option to leave courses out to see the effect.
- **Internal (CA) marks**, with converted totals and, for supported layouts, what you need in the next test.
- **Today's timetable** on the dashboard, with each remaining class marked as safe to skip or not.

The data comes from EasyCollege's API, which signs in to eCampus on the user's behalf. The API is a separate service and is not part of this repository; this app only calls it and renders what it returns, plus a few calculations that run in the browser.

## Getting started

You need Node.js 22 (what CI uses; Vite 7 requires 20.19+ or 22.12+) and a running EasyCollege API to point the app at.

```bash
npm install
cp .env.example .env      # then set VITE_API_BASE_URL
npm run dev               # http://localhost:5173
```

## Configuration

Settings come from `.env` (git-ignored; start from [.env.example](.env.example)).

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Origin of the EasyCollege API, without a trailing slash, e.g. `http://localhost:5050` |
| `VITE_GA_MEASUREMENT_ID` | No | Google Analytics 4 ID. Analytics only starts when it is set. |

Vite builds `VITE_` variables into the JavaScript bundle, so they are visible to anyone using the app and a change needs a rebuild. Only put public values in them.

## Scripts

```bash
npm run dev        # dev server with hot reload (http://localhost:5173)
npm run build      # production build → dist/
npm run preview    # serve dist/ locally
npm run lint       # ESLint
npm test           # unit tests (node:test, no extra dependencies)
```

## Technology

| Purpose | Library |
|---|---|
| UI | React 19 (plain JavaScript `.jsx`, no TypeScript) |
| Build and dev server | Vite 7 with `@vitejs/plugin-react-swc` |
| Routing | react-router-dom 7 (`BrowserRouter`) |
| Animation and icons | framer-motion, lucide-react |
| Charts | chart.js with react-chartjs-2 (CGPA page) |
| Analytics | react-ga4 |
| Installable app (PWA) | vite-plugin-pwa |
| Linting | ESLint 9 flat config ([eslint.config.js](eslint.config.js)) |

Styling is plain CSS: global styles in `src/index.css`, plus a `.css` file next to most pages and components.

## Project structure

```
├── index.html                 Mounts #root and loads src/main.jsx
├── vite.config.js             React plugin and PWA manifest
├── eslint.config.js
├── .env.example               Configuration template
├── public/                    Static files (app icon)
├── tests/                     Unit tests (npm test)
├── test.js                    Prints two example attendance-predictor results
└── src/
    ├── main.jsx               React root
    ├── App.jsx                Router and route table
    ├── index.css              Global styles
    ├── components/            Navbar, PrivateRoute, Modal, analytics tracker
    ├── utils/
    │   ├── attendanceSimulation.js   Attendance predictor (pure functions)
    │   ├── internalsSimulation.js    Internals column mapping, totals and CA2 target (pure functions)
    │   └── session.js                Signing the user out when their session stops working
    └── pages/                 One component per route
```

## Routes

| Path | Page | Needs sign-in |
|---|---|---|
| `/` | Login (goes straight to `/dashboard` when already signed in) | No |
| `/dashboard` | Dashboard | Yes |
| `/attendance` | Attendance | Yes |
| `/gpa` | GPA | Yes |
| `/cgpa` | CGPA | Yes |
| `/internals` | Internals | Yes |
| `/feedback` | Redirects to the external feedback form | Yes |
| `/about` | About | No |
| anything else | Not found | No |

Pages that need sign-in are wrapped in `PrivateRoute`, which sends visitors without a session to `/`.

## Pages

| Page | API endpoint | What it does |
|---|---|---|
| **Login** | `POST /api/login` | Student or Parent sign-in with eCampus credentials. Uppercases the roll number, stores the session, then opens the dashboard. |
| **Dashboard** | `/api/timetable` and `/api/attendance`, in parallel | Greeting and today's remaining classes. Back-to-back periods of the same course are grouped, and each group is marked as safe to skip or not from the attendance results. Cards link to the other pages. |
| **Attendance** | `/api/attendance` | Per-course table, colour-coded (75% and above is good, 65% and above is borderline, lower is low). The **simulator** adds hypothetical attended, skipped or exempted classes and recomputes the result in the browser with the same 75% / 65% rules as the API (`src/utils/attendanceSimulation.js`). Percentages are rounded up, as eCampus shows them. An exempted class counts towards total and absent hours and towards the "with exemption" percentage, not the physical one. Courses whose data predates the exemption fields show "Reload to predict" instead of controls. The Med Bunks search stops at 70. Simulator inputs stay in the page; they are never stored or sent anywhere. |
| **GPA** | `/api/gpa` | Latest-semester courses. Leave courses out to recalculate the GPA locally. Shows an explanation the first time. |
| **CGPA** | `/api/cgpa` | Totals, a per-semester SGPA and CGPA table, a course list with exclusions, and a trend chart. Shows an explanation the first time. |
| **Internals** | `/api/internals` | CA marks per course: the Total against its real maximum, the converted mark, and a breakdown. The calculations are in `src/utils/internalsSimulation.js`. Table layouts differ by programme: layouts verified against real data (`SIMULATOR_TABLE_IDS`) get the simulator and the "needed in CA2 for one more mark" figure; other layouts show the component breakdown from the API. For the `8^2260` layout, T1 and T2 are shown and entered as percentages. |
| **About**, **Not found** | none | Static pages |

The **Navbar** also handles:

- **Fast Mode:** a toggle (`POST /api/settings/opt-in`) that lets the API serve recent results from its cache instead of signing in to eCampus every time, which is much faster. It reads the account's real setting from `POST /api/settings` when the app loads, so every device shows the same state.
- **Feedback:** a form that sends `POST /api/submit-feedback`.
- **Logout:** clears the session from the browser.

## Talking to the API

- **Base URL:** `import.meta.env.VITE_API_BASE_URL`. There is no shared API client; each page builds its own `fetch` call. Some files fall back to `http://localhost:5050` or the page's own origin when the variable is missing, so always set it.
- **Requests:** data requests are `POST` with the JSON body `{ auth_token, force_refresh }`. The refresh button on a data page sends `force_refresh: true` to skip the Fast Mode cache.
- **Errors:** the page shows the response's `error` message, keeping any data it already had on screen.
- **Signing in again:** a `401` from a data request means the session no longer works, most often because the password was changed on eCampus. The page calls `signInAgain()` from `src/utils/session.js`, which clears the session (the same keys as Logout) and opens the sign-in page with the message. Pages never retry these requests: each retry would be another failed eCampus sign-in, and eCampus locks an account after five in a day.

## Browser storage

There is no global state library or React context; the session lives in `localStorage`.

| Key | Set by | Cleared by | Holds |
|---|---|---|---|
| `user` | Login | Logout, sign-in again | Display name from eCampus (JSON string) |
| `auth_token` | Login | Logout, sign-in again | Session token sent with every data request |
| `fastMode` | Navbar | Logout, sign-in again | Last known Fast Mode state, shown until the account's setting arrives |
| `gpa_modal_shown`, `cgpa_modal_shown` | GPA, CGPA | Never | Show each explanation only once |

Logout also removes the old keys `credentials` and `login_type`, which nothing sets any more.

## Testing

`npm test` runs `tests/*.test.js` with Node's built-in `node:test`:

- **Attendance predictor** (`src/utils/attendanceSimulation.js`, the same functions the page uses), checked against hand-worked expected results in `../test_data/attendance_cases.json`.
- **Internals calculations** (`src/utils/internalsSimulation.js`), checked against real eCampus rows: totals match eCampus's own, CA2 targets reach the next mark, and the simulator is offered only for verified layouts.

There are no component or browser tests. `node test.js` prints two example predictor results.

## Deployment

The app is a standard Vite build: `npm run build` writes static files to `dist/`. It is deployed on Vercel, with `VITE_API_BASE_URL` pointing at the production API.

When deploying:

- Set `VITE_API_BASE_URL` (and `VITE_GA_MEASUREMENT_ID` if you use analytics) in the host's environment variables **before** building.
- The app uses `BrowserRouter`, so the host must serve `index.html` for unknown paths. Reload a page such as `/attendance` on the deployed site; if it returns 404, add a rewrite to `index.html`.
- `vite.config.js` holds the PWA manifest (name, theme colours, icon). The service worker updates itself (`registerType: 'autoUpdate'`) and also runs during `npm run dev`, which generates the ignored `dev-dist/` folder.

## Unused and incomplete functionality

| Item | Status | Notes |
|---|---|---|
| `src/components/FeedbackWidget.jsx` | Unused | Nothing imports it; the Navbar has its own feedback form. |
| `src/App.css` | Unused | Never imported. |
| `src/assets/react.svg` | Unused | Vite template leftover. |
| `index.html` → `/favicon.ico` | Missing file | There is no `favicon.ico` in `public/`. |
| `localStorage` keys `credentials`, `login_type` | Legacy | Only removed at logout; never set. |
| `test.js` | Standalone script | Not run by any npm script; `npm test` is the real check. |
| `dev-dist/` | Generated | Output of the PWA dev mode, ignored by git and ESLint. |
