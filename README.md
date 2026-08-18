# AI Based Face authorization Attendance system

A web application that marks attendance by face instead of a badge swipe or manual roll call.

> Built with FastAPI, DeepFace, SQLAlchemy, PostgreSQL, React, TypeScript, and Tailwind CSS.

## How it works

1. **Enroll (admin-only).** An admin creates an employee profile, then captures 3-5 webcam
   frames of their face. Each frame is detected and embedded (DeepFace / Facenet512); the
   resulting embeddings are averaged into a single stored vector per employee.
2. **Mark attendance (kiosk/self-serve).** Anyone stands in front of the camera and scans. The
   frame is detected, embedded, and compared against every stored embedding via cosine
   similarity - implemented directly, not through `DeepFace.find`, so matching is auditable and
   unit-testable. A match above the configured threshold logs a timestamped check-in or
   check-out (inferred from whether the employee already has an open check-in today). Below
   threshold, the scan is rejected as "face not recognized" - it never guesses.
3. **Admin dashboard.** View the employee list and enrollment status, filter attendance records
   by employee/date range, and export them as CSV.

Only numeric face embeddings are stored - never a library of raw enrollment photos.

## Project structure

```
backend/
  app/
    core/       settings, JWT/password helpers
    db/         SQLAlchemy engine/session
    models/     Employee, FaceEmbedding, AttendanceRecord, AdminUser
    schemas/    Pydantic request/response models
    api/        auth, employees, attendance routers
    services/   face_service (detect+embed+match), attendance_service (check-in/out logic)
    seed.py     bootstraps the admin account
  alembic/      schema migrations
  tests/        pytest suite (auth, employees, attendance/matching)
frontend/
  src/
    pages/      LoginPage, EmployeesPage, EnrollFacePage, MarkAttendancePage, AttendanceRecordsPage
    components/ ui primitives, layout shell
    lib/        API client, auth store, toast store
```

## API endpoints

| Method | Path                             | Auth  | Purpose                                  |
|--------|-----------------------------------|-------|-------------------------------------------|
| POST   | `/auth/login`                     | -     | Admin login, returns a JWT                |
| POST   | `/employees`                      | admin | Create an employee                         |
| GET    | `/employees`                      | admin | List employees                             |
| POST   | `/employees/{id}/enroll-face`     | admin | Capture + store a face embedding           |
| POST   | `/attendance/mark`                | -     | Kiosk scan - match a face, log attendance  |
| GET    | `/attendance`                     | admin | List attendance, filterable by employee/date range |
| GET    | `/attendance/export`              | admin | CSV export                                 |

`/attendance/mark` is intentionally not JWT-protected - it's meant to run unattended on a kiosk.

## Running it locally

### 1. Database

Requires PostgreSQL. Create a database (defaults assume `attendance` on `localhost:5432`):

```bash
createdb attendance
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows; use `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
copy .env.example .env       # cp on macOS/Linux - then edit DATABASE_URL etc. as needed
alembic upgrade head         # creates the schema
python -m app.seed           # creates the admin user from ADMIN_USERNAME / ADMIN_PASSWORD
uvicorn app.main:app --reload
```

The API is now at `http://localhost:8000` (interactive docs at `/docs`).

> `pip install` pulls a CPU-only PyTorch wheel (~150MB) for the liveness/anti-spoofing model, on
> top of the TensorFlow already needed for face recognition - the first install and the first
> server startup (which warms up all three models - detector, recognition, anti-spoofing - before
> accepting requests) are both noticeably slower than subsequent ones.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. `/` is the kiosk check-in/check-out screen; `/login` is the admin
sign-in (defaults: username `admin`, password from `backend/.env`). The Vite dev server proxies
`/auth`, `/employees`, and `/attendance` to the backend, so no CORS config is needed in
development.

> Browsers only grant camera access (`getUserMedia`) on `localhost` or over HTTPS.

### Testing

```bash
cd backend
createdb attendance_test     # once, before the first run
pytest
```

The suite covers auth, employee CRUD, the check-in/check-out inference logic, CSV export, the
`/attendance/mark` no-face/multiple-face rejection paths, and the cosine-similarity matching
function as a pure unit test. `FaceService` is replaced with a deterministic fake via FastAPI's
dependency-override mechanism, so tests run in seconds without loading DeepFace or touching a
real camera. Tests run against a real Postgres database (`attendance_test`) rather than SQLite,
because `FaceEmbedding.embedding` is a native Postgres `ARRAY(Float)` column with no SQLite
equivalent.

## Environment variables

See `backend/.env.example` for the full list: `DATABASE_URL`, `JWT_SECRET_KEY`,
`FACE_MATCH_THRESHOLD`, `ADMIN_USERNAME`/`ADMIN_PASSWORD`, `CORS_ORIGINS`.

## Known limitations

- **Spoofing risk, reduced but not eliminated.** Every detected face is passed through DeepFace's
  Fasnet liveness model (`anti_spoofing=True` in `face_service.py`), which flags an obvious
  printed photo or phone/tablet screen and rejects it with a clear "looks like a photo or screen"
  error - on both attendance marking and enrollment/self-registration. It is a real trained model,
  not a heuristic, but it is not infallible against a high-quality replay attack; treat it as
  raising the bar; not as a guarantee.
- **Low-quality/dark frames.** An unreadable or undetectable frame (too dark, blurry, corrupt)
  never crashes the pipeline - it returns a clear "no face detected" error instead.
- **Duplicate enrollment.** Re-running `POST /employees/{id}/enroll-face` for an already-enrolled
  employee **overwrites** their stored embedding rather than averaging it with the old one. This
  keeps behavior predictable (no drift from repeated partial re-enrollments) and matches the
  usual intent of re-enrolling - see the comment in `backend/app/api/employees.py`.

## Design decisions worth knowing about

- **Cosine similarity is implemented directly**, not via `DeepFace.find`, so matching is
  explicit, testable code rather than a filesystem-scanning black box.
- **One embedding per employee.** Enrollment always averages the captured frames into a single
  vector; there's no history of prior embeddings.
- **`/attendance/mark` rejects multiple faces**, per spec, and - for consistency - each
  enrollment frame is held to the same one-face rule, so a bystander in an enrollment shot can't
  silently poison the stored embedding.
