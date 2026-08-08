import json
import os

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.config import get_settings
from app.db.database import get_db
from app.models.face_embedding import FaceEmbedding
from app.models.person import Person
from app.models.user import User
from app.schemas.person import EnrollResult, PersonCreate, PersonOut, PersonUpdate
from app.services.face_service import FaceService, get_face_service

router = APIRouter(prefix="/api/people", tags=["people"])
settings = get_settings()

MAX_ENROLL_IMAGES = 5


@router.get("", response_model=list[PersonOut])
def list_people(
    department: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Person)
    if department:
        query = query.filter(Person.department == department)
    return query.order_by(Person.full_name).all()


@router.post("", response_model=PersonOut, status_code=status.HTTP_201_CREATED)
def create_person(payload: PersonCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if db.query(Person).filter(Person.external_id == payload.external_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="external_id already exists")
    person = Person(**payload.model_dump())
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


@router.get("/{person_id}", response_model=PersonOut)
def get_person(person_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    return person


@router.patch("/{person_id}", response_model=PersonOut)
def update_person(
    person_id: int, payload: PersonUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(person, field, value)
    db.commit()
    db.refresh(person)
    return person


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(person_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    db.delete(person)
    db.commit()
    return None


@router.post("/{person_id}/enroll", response_model=EnrollResult)
def enroll_person(
    person_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    face_service: FaceService = Depends(get_face_service),
    _: User = Depends(require_admin),
):
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")

    person_dir = os.path.join(settings.STORAGE_DIR, str(person_id))
    os.makedirs(person_dir, exist_ok=True)

    stored = 0
    for upload in files[:MAX_ENROLL_IMAGES]:
        raw = upload.file.read()
        image_array = np.frombuffer(raw, dtype=np.uint8)
        image_bgr = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if image_bgr is None:
            continue

        embedding = face_service.get_embedding(image_bgr)
        if embedding is None:
            continue

        db.add(FaceEmbedding(person_id=person_id, vector_json=json.dumps(embedding.tolist())))
        stored += 1

        if stored == 1:
            disk_path = os.path.join(person_dir, "profile.jpg")
            cv2.imwrite(disk_path, image_bgr)
            person.photo_path = f"/static/faces/{person_id}/profile.jpg"

    if stored == 0:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No face was detected in any of the uploaded images",
        )

    person.is_enrolled = True
    db.commit()
    return EnrollResult(person_id=person_id, images_used=stored, is_enrolled=True)
