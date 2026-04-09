"""
Watch Guard — AI Face Recognition Service
Uses DeepFace with RetinaFace detector + ArcFace recognition model.
"""

import os
import io
import base64
import logging
from typing import Optional

import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from recognition import FaceRecognitionEngine

# ─── Logging ──────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("watchguard-ai")

# ─── FastAPI App ──────────────────────────────────────────
app = FastAPI(
    title="Watch Guard AI Service",
    description="Face recognition microservice using DeepFace (RetinaFace + ArcFace)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Engine ───────────────────────────────────────────────
engine = FaceRecognitionEngine(embeddings_dir="/app/embeddings")


# ─── Pydantic Models ─────────────────────────────────────
class RecognizeBase64Request(BaseModel):
    image_base64: str
    camera_id: Optional[str] = None


class SyncRequest(BaseModel):
    user_id: str
    embedding: list[float]
    name: str


class RecognizeResponse(BaseModel):
    matched: bool
    userId: Optional[str] = None
    name: Optional[str] = None
    confidence: Optional[float] = None
    boundingBox: Optional[dict] = None
    reason: Optional[str] = None


class EmbedResponse(BaseModel):
    success: bool
    embedding: Optional[list[float]] = None
    error: Optional[str] = None


# ─── Routes ──────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "watchguard-ai", "models": ["ArcFace", "RetinaFace"]}


@app.post("/recognize", response_model=RecognizeResponse)
async def recognize_face(
    file: Optional[UploadFile] = File(None),
    body: Optional[RecognizeBase64Request] = None,
):
    """
    Recognize a face from an uploaded image file or base64 string.
    Returns matched user info and confidence score.
    """
    try:
        img = None

        if file is not None:
            contents = await file.read()
            img = Image.open(io.BytesIO(contents)).convert("RGB")
        elif body is not None and body.image_base64:
            # Handle data URI prefix
            b64_data = body.image_base64
            if "," in b64_data:
                b64_data = b64_data.split(",", 1)[1]
            img_bytes = base64.b64decode(b64_data)
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        else:
            raise HTTPException(status_code=400, detail="No image provided")

        img_array = np.array(img)
        result = engine.recognize(img_array)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recognition error: {e}")
        return RecognizeResponse(matched=False, reason="recognition_error")


@app.post("/embed", response_model=EmbedResponse)
async def extract_embedding(file: UploadFile = File(...)):
    """
    Extract a 512-dimensional ArcFace face embedding from an image.
    """
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        img_array = np.array(img)

        result = engine.get_embedding(img_array)
        if result is not None:
            return EmbedResponse(success=True, embedding=result.tolist())
        else:
            return EmbedResponse(success=False, error="no_face_detected")

    except Exception as e:
        logger.error(f"Embedding extraction error: {e}")
        return EmbedResponse(success=False, error=str(e))


@app.post("/sync")
async def sync_embedding(body: SyncRequest):
    """
    Sync a user's face embedding from the backend database.
    Stores as .npy file for the recognition engine.
    """
    try:
        embedding = np.array(body.embedding, dtype=np.float32)
        engine.save_embedding(body.user_id, body.name, embedding)
        logger.info(f"Synced embedding for user {body.user_id} ({body.name})")
        return {"success": True, "message": f"Embedding synced for {body.name}"}
    except Exception as e:
        logger.error(f"Sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("startup")
async def startup_event():
    logger.info("Watch Guard AI Service starting up...")
    count = engine.load_all_embeddings()
    logger.info(f"Loaded {count} face embeddings from disk")
    logger.info("AI Service ready — RetinaFace detector + ArcFace model")
