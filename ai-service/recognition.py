"""
Face Recognition Engine using DeepFace with RetinaFace + ArcFace.
Manages embeddings stored as .npy files on disk.
"""

import os
import json
import logging
from typing import Optional

import numpy as np

logger = logging.getLogger("watchguard-ai")

# Confidence threshold for match
CONFIDENCE_THRESHOLD = 0.6


class FaceRecognitionEngine:
    def __init__(self, embeddings_dir: str = "/app/embeddings"):
        self.embeddings_dir = embeddings_dir
        self.embeddings: dict[str, dict] = {}  # user_id -> {name, embedding}
        os.makedirs(embeddings_dir, exist_ok=True)

    def load_all_embeddings(self) -> int:
        """Load all stored embeddings from disk."""
        self.embeddings = {}
        count = 0

        # Load metadata
        meta_path = os.path.join(self.embeddings_dir, "metadata.json")
        metadata = {}
        if os.path.exists(meta_path):
            with open(meta_path, "r") as f:
                metadata = json.load(f)

        for filename in os.listdir(self.embeddings_dir):
            if filename.endswith(".npy"):
                user_id = filename.replace(".npy", "")
                try:
                    embedding = np.load(os.path.join(self.embeddings_dir, filename))
                    name = metadata.get(user_id, {}).get("name", user_id)
                    self.embeddings[user_id] = {
                        "name": name,
                        "embedding": embedding,
                    }
                    count += 1
                except Exception as e:
                    logger.error(f"Failed to load embedding {filename}: {e}")

        return count

    def save_embedding(self, user_id: str, name: str, embedding: np.ndarray):
        """Save an embedding to disk and register it in memory."""
        filepath = os.path.join(self.embeddings_dir, f"{user_id}.npy")
        np.save(filepath, embedding)

        # Update metadata
        meta_path = os.path.join(self.embeddings_dir, "metadata.json")
        metadata = {}
        if os.path.exists(meta_path):
            with open(meta_path, "r") as f:
                metadata = json.load(f)

        metadata[user_id] = {"name": name}
        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2)

        # Register in memory
        self.embeddings[user_id] = {"name": name, "embedding": embedding}
        logger.info(f"Saved and registered embedding for {name} ({user_id})")

    def get_embedding(self, img_array: np.ndarray) -> Optional[np.ndarray]:
        """Extract face embedding from an image using DeepFace ArcFace."""
        try:
            from deepface import DeepFace

            # Detect and embed
            embeddings = DeepFace.represent(
                img_path=img_array,
                model_name="ArcFace",
                detector_backend="retinaface",
                enforce_detection=True,
            )

            if not embeddings:
                return None

            # If multiple faces, use the one with largest bounding box
            if len(embeddings) > 1:
                largest = max(
                    embeddings,
                    key=lambda x: x.get("facial_area", {}).get("w", 0) * x.get("facial_area", {}).get("h", 0),
                )
                return np.array(largest["embedding"], dtype=np.float32)

            return np.array(embeddings[0]["embedding"], dtype=np.float32)

        except Exception as e:
            logger.error(f"Embedding extraction failed: {e}")
            return None

    def recognize(self, img_array: np.ndarray) -> dict:
        """
        Recognize a face against stored embeddings.
        Returns match info with confidence and bounding box.
        """
        try:
            from deepface import DeepFace

            # Detect faces and extract embeddings
            detections = DeepFace.represent(
                img_path=img_array,
                model_name="ArcFace",
                detector_backend="retinaface",
                enforce_detection=False,
            )

            if not detections:
                return {"matched": False, "reason": "no_face_detected"}

            # Pick the largest face if multiple detected
            if len(detections) > 1:
                detection = max(
                    detections,
                    key=lambda x: x.get("facial_area", {}).get("w", 0) * x.get("facial_area", {}).get("h", 0),
                )
            else:
                detection = detections[0]

            query_embedding = np.array(detection["embedding"], dtype=np.float32)
            facial_area = detection.get("facial_area", {})
            bounding_box = {
                "x": facial_area.get("x", 0),
                "y": facial_area.get("y", 0),
                "w": facial_area.get("w", 0),
                "h": facial_area.get("h", 0),
            }

            # If no registered embeddings, return no match
            if not self.embeddings:
                return {
                    "matched": False,
                    "reason": "no_registered_faces",
                    "boundingBox": bounding_box,
                }

            # Compare against all registered embeddings using cosine similarity
            best_match_id = None
            best_match_name = None
            best_similarity = -1.0

            for user_id, data in self.embeddings.items():
                stored_embedding = data["embedding"]
                similarity = self._cosine_similarity(query_embedding, stored_embedding)

                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match_id = user_id
                    best_match_name = data["name"]

            # Check threshold
            if best_similarity >= CONFIDENCE_THRESHOLD:
                return {
                    "matched": True,
                    "userId": best_match_id,
                    "name": best_match_name,
                    "confidence": round(float(best_similarity), 4),
                    "boundingBox": bounding_box,
                }
            else:
                return {
                    "matched": False,
                    "confidence": round(float(best_similarity), 4) if best_similarity > 0 else None,
                    "reason": "below_threshold",
                    "boundingBox": bounding_box,
                }

        except Exception as e:
            logger.error(f"Recognition failed: {e}")
            return {"matched": False, "reason": "no_face_detected"}

    @staticmethod
    def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        """Compute cosine similarity between two vectors."""
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))
