FROM python:3.11-slim

WORKDIR /app

# opencv/mediapipe need these system libs even in headless mode
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bakes the ~90MB Facenet512 weights into the image at build time, instead of downloading them
# from GitHub on the first live face-recognition request in production (slow + a runtime
# dependency on outbound internet access that would otherwise repeat on every redeploy).
RUN python -c "from deepface import DeepFace; DeepFace.build_model('Facenet512')"

COPY . .
RUN mkdir -p storage/faces

EXPOSE 8000

CMD ["sh", "-c", "python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
