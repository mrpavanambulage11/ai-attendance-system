FROM python:3.11-slim

WORKDIR /app

# opencv-python-headless still needs a handful of shared libs on Debian slim, even without
# GUI/X11 support.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Render sets $PORT at runtime. Schema migrations + admin seeding run on every boot, before the
# server starts accepting requests - both are idempotent (seed.py skips if the admin already
# exists, alembic upgrade is a no-op once at head).
CMD alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
