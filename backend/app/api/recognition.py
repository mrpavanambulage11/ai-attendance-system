import json
from datetime import datetime

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.database import get_db
from app.models.attendance import AttendanceMethod
from app.models.face_embedding import FaceEmbedding
from app.models.person import Person
from app.models.user import User
from app.schemas.attendance import PersonSummary, RecognitionResult
from app.services.attendance_service import already_marked_today, mark_attendance
from app.services.face_service import FaceService, get_face_service
from app.services.liveness_service import LivenessService, get_liveness_service

router = APIRouter(prefix="/api/recognition", tags=["recognition"])
settings = get_settings()


def _decode(upload: UploadFile) -> np.ndarray | None:
    raw = upload.file.read()
    array = np.frombuffer(raw, dtype=np.uint8)
    return cv2.imdecode(array, cv2.IMREAD_COLOR)


@router.post("/identify", response_model=RecognitionResult)
def identify(
    frames: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    face_service: FaceService = Depends(get_face_service),
    liveness_service: LivenessService = Depends(get_liveness_service),
    _: User = Depends(get_current_user),
):
    """Takes a short burst of webcam frames: matches the face against enrolled people and
    requires a genuine blink (liveness) across the burst before attendance is marked."""
    decoded = [image for f in frames if (image := _decode(f)) is not None]
    if not decoded:
        raise HTTPException(status_code=422, detail="No readable image frames received")

    rgb_frames = [cv2.cvtColor(image, cv2.COLOR_BGR2RGB) for image in decoded]
    liveness_passed = liveness_service.check_blink(rgb_frames)

    embedding = face_service.get_embedding(decoded[-1])
    if embedding is None:
        return RecognitionResult(matched=False, liveness_passed=liveness_passed, message="No face detected")

    rows = db.query(FaceEmbedding).all()
    candidates = [(row.person_id, np.array(json.loads(row.vector_json), dtype=np.float32)) for row in rows]
    person_id, score = face_service.find_best_match(embedding, candidates, settings.FACE_MATCH_THRESHOLD)

    if person_id is None:
        return RecognitionResult(
            matched=False, liveness_passed=liveness_passed, confidence=round(score, 4), message="Face not recognized"
        )

    person = db.get(Person, person_id)
    if not person or not person.is_active:
        return RecognitionResult(matched=False, liveness_passed=liveness_passed, message="Matched person is inactive")

    summary = PersonSummary.model_validate(person)

    if not liveness_passed:
        return RecognitionResult(
            matched=True,
            liveness_passed=False,
            person=summary,
            confidence=round(score, 4),
            message="Liveness check failed - blink naturally and try again",
        )

    if already_marked_today(db, person.id, datetime.now()):
        return RecognitionResult(
            matched=True,
            liveness_passed=True,
            person=summary,
            confidence=round(score, 4),
            attendance_marked=False,
            message=f"{person.full_name} was already marked present today",
        )

    mark_attendance(db, person.id, AttendanceMethod.FACE, confidence=score)
    return RecognitionResult(
        matched=True,
        liveness_passed=True,
        person=summary,
        confidence=round(score, 4),
        attendance_marked=True,
        message=f"Attendance marked for {person.full_name}",
    )
