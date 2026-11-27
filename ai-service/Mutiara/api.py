from contextlib import asynccontextmanager
from pathlib import Path
import sys
import time
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from main_arcface import SistemWajahTrainFolder

MODEL_PATH = BASE_DIR / "runs" / "detect" / "model_wajah_roboflow" / "weights" / "best.pt"
TRAIN_DIR = BASE_DIR / "train"
MODEL_VERSION = "yolov11-arcface-v1"
PADDING = 25

sistem: Optional[SistemWajahTrainFolder] = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global sistem
    sistem = SistemWajahTrainFolder(
        model_path=str(MODEL_PATH),
        folder_train=str(TRAIN_DIR),
        threshold=0.80,
        max_foto_per_orang=None,
    )
    yield


app = FastAPI(
    title="YOLOv11 + ArcFace Recognition Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
def health():
    identities = sorted(sistem.database_wajah.keys()) if sistem is not None else []
    return {
        "status": "ok" if sistem is not None else "initializing",
        "model_version": MODEL_VERSION,
        "identities_count": len(identities),
        "identities": identities,
    }


@app.post("/recognize")
async def recognize(
    file: UploadFile = File(...),
    session_id: int = Form(0),
):
    if sistem is None:
        raise HTTPException(status_code=503, detail="Model AI belum siap.")

    raw_bytes = await file.read()
    np_arr = np.frombuffer(raw_bytes, dtype=np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="File gambar tidak valid atau gagal didecode.")

    start_time = time.perf_counter()
    h, w, _ = frame.shape

    results = sistem.yolo_model(frame, conf=0.50, iou=0.45, verbose=False)

    boxes_xyxy = []
    for r in results:
        if r.boxes is None:
            continue
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(w, x2)
            y2 = min(h, y2)
            if x2 > x1 and y2 > y1:
                boxes_xyxy.append((x1, y1, x2, y2))

    # Urutkan bounding box dari kiri ke kanan
    boxes_xyxy.sort(key=lambda b: b[0])

    faces = []
    for x1, y1, x2, y2 in boxes_xyxy:
        x1_pad = max(0, x1 - PADDING)
        y1_pad = max(0, y1 - PADDING)
        x2_pad = min(w, x2 + PADDING)
        y2_pad = min(h, y2 + PADDING)

        wajah_crop = frame[y1_pad:y2_pad, x1_pad:x2_pad]

        candidate_name = None
        similarity_score = 0.0
        status = "unknown"

        if wajah_crop.size > 0:
            try:
                query_vector = sistem._ekstrak_norm_embedding(wajah_crop)
                if query_vector is not None:
                    label_nama, skor, dikenali = sistem.cari_nama_terdekat(query_vector)
                    similarity_score = round(float(skor), 4)
                    if dikenali:
                        candidate_name = label_nama
                        status = "matched"
            except Exception:
                pass

        faces.append(
            {
                "bbox": [x1, y1, x2, y2],
                "candidate_name": candidate_name,
                "similarity_score": similarity_score,
                "status": status,
            }
        )

    processing_time_ms = int((time.perf_counter() - start_time) * 1000)

    return {
        "session_id": session_id,
        "model_version": MODEL_VERSION,
        "processing_time_ms": processing_time_ms,
        "faces": faces,
    }
