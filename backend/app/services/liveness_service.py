"""Lightweight passive-liveness check: confirms a real blink happened across a short frame burst.

This is what stops the recognizer from being trivially fooled by a printed photo or a phone screen
held up to the camera - a single static image can never contain a blink. The frontend captures a
short burst (~1s) of frames when marking attendance and posts all of them to /recognition/identify.

Uses MediaPipe FaceMesh (prebuilt Windows wheels, no compiler needed) to track the eye landmarks and
compute the Eye Aspect Ratio (EAR) per frame; a blink is a dip below `blink_threshold` followed by a
recovery above it.
"""

from functools import lru_cache

import numpy as np

LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]


class LivenessService:
    def __init__(self) -> None:
        import mediapipe as mp

        self._face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        )

    @staticmethod
    def _eye_aspect_ratio(landmarks, eye_idx: list[int], width: int, height: int) -> float:
        pts = np.array([(landmarks[i].x * width, landmarks[i].y * height) for i in eye_idx])
        vertical = np.linalg.norm(pts[1] - pts[5]) + np.linalg.norm(pts[2] - pts[4])
        horizontal = np.linalg.norm(pts[0] - pts[3])
        if horizontal == 0:
            return 0.0
        return float(vertical / (2.0 * horizontal))

    def frame_ear(self, image_rgb: np.ndarray) -> float | None:
        height, width, _ = image_rgb.shape
        result = self._face_mesh.process(image_rgb)
        if not result.multi_face_landmarks:
            return None
        landmarks = result.multi_face_landmarks[0].landmark
        left = self._eye_aspect_ratio(landmarks, LEFT_EYE, width, height)
        right = self._eye_aspect_ratio(landmarks, RIGHT_EYE, width, height)
        return (left + right) / 2.0

    def check_blink(self, frames_rgb: list[np.ndarray], blink_threshold: float = 0.21) -> bool:
        ears = [ear for frame in frames_rgb if (ear := self.frame_ear(frame)) is not None]
        if len(ears) < 3:
            return False
        return min(ears) < blink_threshold < max(ears)


@lru_cache
def _singleton() -> LivenessService:
    return LivenessService()


def get_liveness_service() -> LivenessService:
    """FastAPI dependency - overridden with a fake in tests to avoid loading real models."""
    return _singleton()
