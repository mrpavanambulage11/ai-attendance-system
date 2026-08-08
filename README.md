# AI-Based Smart Attendance System

A full-stack attendance system that recognizes people by their face instead of a badge swipe or
manual roll call - with a **liveness check** so a printed photo or phone screen can't spoof a
check-in, plus a real-time analytics dashboard.

> Built with FastAPI, DeepFace, MediaPipe, SQLAlchemy, React, TypeScript, and Tailwind CSS.

## Why this exists

Most "attendance system" projects on GitHub are CRUD apps with a face-recognition demo bolted on
top - a static photo is matched once and that's the whole security model. This project treats
recognition as a small pipeline with a real failure mode to defend against:

1. **Detect + embed** a face from a webcam frame (DeepFace / Facenet512).
2. **Match** the embedding against stored people via cosine similarity - implemented directly
   (not `DeepFace.find`), so the matching logic is auditable and unit-testable.
3. **Verify liveness** - a short burst of frames must show a real blink (Eye Aspect Ratio dip via
   MediaPipe FaceMesh) before a match is allowed to count. A single photo can never blink.
4. Only then is attendance marked - once per person per day, with a confidence score recorded.

It also only stores **numeric face embeddings**, not a library of raw biometric photos, beyond one
profile picture kept for the UI.

## Features

- **Face-recognition check-in** with live webcam bounding-box-style feedback and a session log.
- **Blink-based liveness detection** - the key differentiator over trivially-spoofable demos.
- **Role-based auth** (Admin / Teacher) with JWT, protecting mutating endpoints.
- **People management** - CRUD, department grouping, multi-shot enrollment flow.
- **Attendance records** - filterable table, manual override, CSV export.
- **Analytics dashboard** - today's stats, a 14-day trend chart, department breakdown, and a
  30-day attendance leaderboard.
- **Configurable rules** - late-arrival cutoff time and working days.
- **Seed script** with ~30 days of realistic demo attendance history so the dashboard isn't empty
  on first run.
- Zero-config **SQLite** by default; swap to Postgres with one environment variable.

## Architecture

```
┌─────────────────┐        REST + multipart          ┌──────────────────────┐
│  React + Vite    │ ───────────────────────────────▶ │      FastAPI          │
│  TypeScript       │ ◀─────────────────────────────── │                        │
│  Tailwind CSS     │        JSON / JWT                │  ┌──────────────────┐ │
│  TanStack Query   │                                   │  │ FaceService        │ │
│  Recharts         │                                   │  │  DeepFace (Facenet)│ │
└─────────────────┘                                   │  │  cosine similarity │ │
                                                        │  └──────────────────┘ │
                                                        │  ┌──────────────────┐ │
                                                        │  │ LivenessService    │ │
                                                        │  │  MediaPipe FaceMesh│ │
                                                        │  │  blink (EAR) check │ │
                                                        │  └──────────────────┘ │
                                                        │           │            │
                                                        │   SQLAlchemy ORM       │
                                                        │           │            │
                                                        │      SQLite / Postgres │
                                                        └──────────────────────┘
```

Both AI services sit behind FastAPI dependency-injected interfaces
(`get_face_service`, `get_liveness_service`), so the test suite swaps in deterministic fakes and
never has to download model weights or touch a real camera.

## Project structure

```
backend/
  app/
    core/       settings, JWT/password helpers
    db/         SQLAlchemy engine/session
    models/     User, Person, FaceEmbedding, Attendance, SystemSettings
    schemas/    Pydantic request/response models
    api/        auth, people, recognition, attendance, dashboard routers
    services/   face_service, liveness_service, attendance_service
    seed.py     bootstrap admin + demo data
  tests/        pytest suite (auth, people, attendance, matching)
frontend/
  src/
    pages/      Landing, Login, Dashboard, People, Enroll, LiveAttendance, Records, Reports, Settings
    components/ ui primitives, charts, layout shell, webcam hook
    lib/        API client, auth store, toast store
docker-compose.yml
```

## Running it locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows; use `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
copy .env.example .env       # cp on macOS/Linux - then edit as needed
python -m app.seed           # creates the admin user + demo attendance history
uvicorn app.main:app --reload
```

The API is now at `http://localhost:8000` (interactive docs at `/docs`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` and sign in with the admin credentials from `backend/.env`
(defaults: `admin@attendance.io` / `Admin@12345`). The Vite dev server proxies `/api` and
`/static` to the backend, so no CORS config is needed in development.

### Docker

```bash
docker compose up --build
```

Frontend on `http://localhost`, backend on `http://localhost:8000`. Set `JWT_SECRET_KEY`,
`ADMIN_EMAIL`, and `ADMIN_PASSWORD` in a `.env` file at the repo root to override the defaults.

> Browsers only grant camera access (`getUserMedia`) on `localhost` or over HTTPS. `http://localhost`
> works out of the box; if you deploy this behind a real domain, put it behind HTTPS (e.g. Caddy,
> nginx + Let's Encrypt, or your host's built-in TLS) or the Enroll/Live Attendance pages won't be
> able to open the camera.

### Trying face recognition yourself

The seed script creates ten demo people for the dashboard/charts, but it can't fabricate their
face embeddings (there are no real photos to seed with). To see the actual recognition + liveness
flow end-to-end:

1. Sign in, go to **People → Add person**, create a profile for yourself.
2. Click the scan icon to open **Enroll face**, capture 4-5 shots from slightly different angles.
3. Go to **Live Attendance**, click **Scan to check in**, and blink naturally during the burst.

## Testing

```bash
cd backend
pytest
```

The suite covers auth (login/roles), people CRUD, attendance business logic (late-cutoff
calculation, duplicate-check-in prevention), CSV export, and the cosine-similarity matching
function as a pure unit test. `FaceService`/`LivenessService` are replaced with deterministic
fakes via FastAPI's dependency-override mechanism, so tests run in seconds, fully offline.

## Design decisions worth knowing about

- **Cosine similarity is implemented directly**, not via `DeepFace.find`, so matching is explicit,
  testable code rather than a filesystem-scanning black box.
- **Liveness is a first-class step**, not an afterthought - recognition and liveness are separate
  services, and a match without a passing liveness check is reported but never marks attendance.
- **Only embeddings + one profile photo are persisted** per person, not a rotating library of raw
  enrollment images.
- **SQLite by default** for a genuine zero-config clone-and-run experience; the ORM layer doesn't
  care which database is behind `DATABASE_URL`.

## Future enhancements

Deliberately out of scope for now, but natural next steps: email alerts for low attendance, PDF
report export, and a multi-camera kiosk mode.

## Resume bullet points

- Built a full-stack face-recognition attendance system (FastAPI, React/TypeScript, SQLAlchemy)
  with a custom cosine-similarity matching pipeline and blink-based liveness detection
  (MediaPipe) to prevent photo-spoofed check-ins.
- Designed a JWT-secured REST API with role-based access control, and an analytics dashboard
  (Recharts) surfacing attendance trends, department breakdowns, and leaderboards from live data.
- Wrote a pytest suite covering auth, business logic, and matching, using FastAPI dependency
  overrides to test AI-backed endpoints deterministically without loading ML models.
