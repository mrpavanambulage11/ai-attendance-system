"""Face detection + embedding extraction, and embedding matching.

Detection/embedding is delegated to DeepFace (Facenet512 model, YuNet detector backend - both
install as prebuilt wheels/weights, no compiler required). YuNet is a small ONNX face detector
that is both faster and meaningfully more accurate than DeepFace's default Haar-cascade ("opencv")
backend - benchmarked locally at ~31ms vs ~238ms per 640x480 frame, and Haar cascades are known to
miss off-angle or poorly-lit faces that a DNN detector like YuNet handles fine. Matching is
implemented here as plain cosine similarity over stored embeddings rather than via `DeepFace.find`,
so the whole pipeline is auditable and testable without touching the filesystem-based lookup
DeepFace normally uses.

Liveness ("anti-spoofing") is enforced via DeepFace's built-in Fasnet model, which runs on the
detected facial area and flags a printed photo or a phone/tablet screen held up to the camera -
see SpoofDetectedError. Fasnet is a real trained model (requires PyTorch), not a heuristic, but
it is not infallible against a high-quality replay attack; treat it as raising the bar, not as a
guarantee.
"""

from functools import lru_cache

import numpy as np

MODEL_NAME = "Facenet512"
DETECTOR_BACKEND = "yunet"


class NoFaceDetectedError(Exception):
    """Zero faces found in a frame - the caller should return a clear "no face detected" error
    rather than attempting to guess. Also raised for an unreadable/corrupt image, since a
    low-quality or too-dark frame usually fails detection the same way."""


class MultipleFacesDetectedError(Exception):
    """More than one face found in a frame that must contain exactly one person. Enforced for
    attendance marking (per spec) and, for consistency, for each enrollment frame too - an
    enrollment shot with a bystander in frame would otherwise silently poison the stored
    embedding."""


class SpoofDetectedError(Exception):
    """The detected face failed DeepFace's Fasnet liveness check - i.e. it looks like a photo or
    a screen, not a live person. Raised for both attendance marking and enrollment, since letting
    a photo enroll a face is just as bad as letting one check someone in."""


class FaceService:
    def warm_up(self) -> None:
        """Builds the detector + recognition + anti-spoofing models once, at process startup,
        instead of paying that load cost (weight loading, TF/Torch graph construction) on
        whichever request happens to be the first real scan."""
        from deepface import DeepFace

        DeepFace.build_model(model_name=DETECTOR_BACKEND, task="face_detector")
        DeepFace.build_model(model_name=MODEL_NAME, task="facial_recognition")
        DeepFace.build_model(model_name="Fasnet", task="spoofing")

    def detect_and_embed(self, image_bgr: np.ndarray | None) -> np.ndarray:
        """Detect the face(s) in a BGR image and return a single embedding, or raise
        NoFaceDetectedError / MultipleFacesDetectedError / SpoofDetectedError."""
        if image_bgr is None:
            raise NoFaceDetectedError("Could not read the uploaded image")

        from deepface import DeepFace

        try:
            results = DeepFace.represent(
                img_path=image_bgr,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True,
                align=True,
                anti_spoofing=True,
            )
        except ValueError as exc:
            if "spoof" in str(exc).lower():
                raise SpoofDetectedError(
                    "This looks like a photo or screen, not a live face - please use your real face"
                ) from exc
            raise NoFaceDetectedError("No face detected in the image") from exc

        if not results:
            raise NoFaceDetectedError("No face detected in the image")
        if len(results) > 1:
            raise MultipleFacesDetectedError("Multiple faces detected, ensure only one person is in frame")

        return np.array(results[0]["embedding"], dtype=np.float32)

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
        """Return (employee_id, score) of the closest candidate if it clears `threshold`,
        else (None, best_score). Vectorized over all candidates at once (one matrix-vector
        product) rather than a per-candidate Python loop, so this stays cheap as headcount grows."""
        if not candidates:
            return None, 0.0

        ids = [employee_id for employee_id, _ in candidates]
        matrix = np.stack([candidate_embedding for _, candidate_embedding in candidates])

        norms = np.linalg.norm(matrix, axis=1) * np.linalg.norm(embedding)
        with np.errstate(invalid="ignore", divide="ignore"):
            scores = np.where(norms == 0, 0.0, (matrix @ embedding) / norms)

        best_index = int(np.argmax(scores))
        best_score = float(scores[best_index])
        if best_score >= threshold:
            return ids[best_index], best_score
        return None, max(best_score, 0.0)


@lru_cache
def _singleton() -> FaceService:
    return FaceService()


def get_face_service() -> FaceService:
    """FastAPI dependency - overridden with a fake in tests to avoid loading real models."""
    return _singleton()
