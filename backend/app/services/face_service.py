"""Face detection + embedding extraction, and embedding matching.

Detection/embedding is delegated to DeepFace (Facenet512 model, OpenCV detector backend -
both install as prebuilt wheels, no compiler required). Matching is implemented here as plain
cosine similarity over stored embeddings rather than via `DeepFace.find`, so the whole pipeline
is auditable and testable without touching the filesystem-based lookup DeepFace normally uses.
"""

from functools import lru_cache

import numpy as np

MODEL_NAME = "Facenet512"
DETECTOR_BACKEND = "opencv"


class FaceService:
    def get_embedding(self, image_bgr: np.ndarray) -> np.ndarray | None:
        """Detect the most prominent face in a BGR image and return its embedding, or None."""
        from deepface import DeepFace

        try:
            results = DeepFace.represent(
                img_path=image_bgr,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True,
                align=True,
            )
        except ValueError:
            return None

        if not results:
            return None

        best = max(results, key=lambda r: r["facial_area"]["w"] * r["facial_area"]["h"])
        return np.array(best["embedding"], dtype=np.float32)

    @staticmethod
    def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        denom = float(np.linalg.norm(a) * np.linalg.norm(b))
        if denom == 0:
            return 0.0
        return float(np.dot(a, b) / denom)

    def find_best_match(
        self,
        embedding: np.ndarray,
        candidates: list[tuple[int, np.ndarray]],
        threshold: float,
    ) -> tuple[int | None, float]:
        """Return (person_id, score) of the closest candidate if it clears `threshold`, else (None, best_score)."""
        best_person_id: int | None = None
        best_score = -1.0
        for person_id, candidate_embedding in candidates:
            score = self.cosine_similarity(embedding, candidate_embedding)
            if score > best_score:
                best_score = score
                best_person_id = person_id

        if best_person_id is not None and best_score >= threshold:
            return best_person_id, best_score
        return None, max(best_score, 0.0)


@lru_cache
def _singleton() -> FaceService:
    return FaceService()


def get_face_service() -> FaceService:
    """FastAPI dependency - overridden with a fake in tests to avoid loading real models."""
    return _singleton()
