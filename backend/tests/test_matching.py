import numpy as np
import pytest

from app.services.face_service import FaceService


def test_cosine_similarity_identical_vectors_is_one():
    v = np.array([1.0, 2.0, 3.0], dtype=np.float32)
    assert FaceService.cosine_similarity(v, v) == pytest.approx(1.0)


def test_cosine_similarity_orthogonal_vectors_is_zero():
    a = np.array([1.0, 0.0], dtype=np.float32)
    b = np.array([0.0, 1.0], dtype=np.float32)
    assert FaceService.cosine_similarity(a, b) == pytest.approx(0.0)


def test_cosine_similarity_handles_zero_vector():
    a = np.zeros(3, dtype=np.float32)
    b = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    assert FaceService.cosine_similarity(a, b) == 0.0


def test_find_best_match_returns_closest_above_threshold():
    service = FaceService()
    target = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    candidates = [
        (1, np.array([0.0, 1.0, 0.0], dtype=np.float32)),
        (2, np.array([0.9, 0.1, 0.0], dtype=np.float32)),
    ]
    person_id, score = service.find_best_match(target, candidates, threshold=0.5)
    assert person_id == 2
    assert score > 0.5


def test_find_best_match_returns_none_below_threshold():
    service = FaceService()
    target = np.array([1.0, 0.0], dtype=np.float32)
    candidates = [(1, np.array([0.0, 1.0], dtype=np.float32))]
    person_id, score = service.find_best_match(target, candidates, threshold=0.5)
    assert person_id is None
