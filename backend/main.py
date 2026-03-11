# backend/main.py
import os
import io
import uuid
import numpy as np
from PIL import Image
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

import cv2
import torch
from fastapi import (
    FastAPI, UploadFile, File, Form,
    Depends, HTTPException, status
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from model      import load_model, DRGradingModel
from utils      import check_quality, preprocess, predict, GRADE_INFO
from database   import (
    add_record, get_doctor_records,
    search_records, delete_record,
    get_record_by_id
)
from report_gen import generate_pdf_report

from pytorch_grad_cam import GradCAMPlusPlus
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

import psycopg2
import psycopg2.extras
import hashlib

# ─────────────────────────────────────────
#  CONFIG
# ─────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()

SECRET_KEY    = os.getenv("SECRET_KEY", "smartdr-xai-secret-2024-lloyd")
ALGORITHM     = "HS256"
ACCESS_EXPIRE = 60 * 24   # 24 hours in minutes

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

app = FastAPI(title="SmartDR-XAI API", version="1.0.0")

# Allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
#  GLOBAL MODEL — LOADED ONCE AT STARTUP
# ─────────────────────────────────────────
MODEL  = None
DEVICE = None

@app.on_event("startup")
async def startup():
    global MODEL, DEVICE
    print("Loading model into RAM...")
    MODEL, DEVICE = load_model("best_model.pth")
    print("Model ready. Server accepting requests.")
    os.makedirs("reports/images", exist_ok=True)


# ─────────────────────────────────────────
#  PYDANTIC SCHEMAS
# ─────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    hospital: str
    phone: str
    city: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str]     = None
    hospital: Optional[str] = None
    specialization: Optional[str] = None
    phone: Optional[str]    = None
    city: Optional[str]     = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# ─────────────────────────────────────────
#  JWT HELPERS
# ─────────────────────────────────────────
def create_token(doctor_id: str) -> str:
    expire  = datetime.utcnow() + timedelta(minutes=ACCESS_EXPIRE)
    payload = {"sub": doctor_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_db_connection():
    from database import get_connection
    return get_connection()


def get_current_doctor(token: str = Depends(oauth2_scheme)):
    try:
        payload   = jwt.decode(token, SECRET_KEY,
                               algorithms=[ALGORITHM])
        doctor_id = payload.get("sub")
        if not doctor_id:
            raise HTTPException(status_code=401,
                                detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401,
                            detail="Token expired or invalid")

    conn = get_db_connection()
    try:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                "SELECT * FROM doctors WHERE doctor_id = %s",
                (doctor_id,)
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=401,
                                    detail="Doctor not found")
            return dict(row)
    finally:
        conn.close()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# ─────────────────────────────────────────
#  AUTH ROUTES
# ─────────────────────────────────────────
@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_db_connection()
    try:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                "SELECT * FROM doctors WHERE email=%s AND password=%s",
                (req.email.strip(), hash_password(req.password))
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password"
                )
            doctor = dict(row)
            token  = create_token(doctor["doctor_id"])
            return {"token": token, "doctor": doctor}
    finally:
        conn.close()


@app.post("/api/auth/register")
def register(req: RegisterRequest):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM doctors WHERE email=%s",
                (req.email.strip(),)
            )
            if cur.fetchone()[0] > 0:
                raise HTTPException(
                    status_code=400,
                    detail="Email already registered"
                )

            cur.execute("SELECT COUNT(*) FROM doctors")
            total  = cur.fetchone()[0]
            doc_id = f"DR{str(total + 1).zfill(3)}"

            cur.execute(
                "SELECT COUNT(*) FROM doctors WHERE doctor_id=%s",
                (doc_id,)
            )
            while cur.fetchone()[0] > 0:
                total += 1
                doc_id = f"DR{str(total + 1).zfill(3)}"
                cur.execute(
                    "SELECT COUNT(*) FROM doctors WHERE doctor_id=%s",
                    (doc_id,)
                )

            cur.execute(
                """INSERT INTO doctors
                (doctor_id,name,email,password,hospital,
                 specialization,phone,city,joined,total_scans)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (
                    doc_id, req.name.strip(),
                    req.email.strip(),
                    hash_password(req.password),
                    req.hospital.strip(), "Ophthalmology",
                    req.phone.strip(), req.city.strip(),
                    datetime.now().strftime("%Y-%m-%d"), 0
                )
            )
            conn.commit()

        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                "SELECT * FROM doctors WHERE doctor_id=%s",
                (doc_id,)
            )
            doctor = dict(cur.fetchone())
            token  = create_token(doc_id)
            return {"token": token, "doctor": doctor}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ─────────────────────────────────────────
#  DOCTOR ROUTES
# ─────────────────────────────────────────
@app.get("/api/doctor/me")
def get_me(doctor=Depends(get_current_doctor)):
    return doctor


@app.put("/api/doctor/update")
def update_profile(
    req: UpdateProfileRequest,
    doctor=Depends(get_current_doctor)
):
    conn = get_db_connection()
    try:
        updates = {k: v for k, v in req.dict().items()
                   if v is not None}
        if not updates:
            raise HTTPException(status_code=400,
                                detail="Nothing to update")
        with conn.cursor() as cur:
            for col, val in updates.items():
                cur.execute(
                    f"UPDATE doctors SET {col}=%s "
                    f"WHERE doctor_id=%s",
                    (val, doctor["doctor_id"])
                )
            conn.commit()

        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                "SELECT * FROM doctors WHERE doctor_id=%s",
                (doctor["doctor_id"],)
            )
            return dict(cur.fetchone())
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.put("/api/doctor/password")
def change_password(
    req: ChangePasswordRequest,
    doctor=Depends(get_current_doctor)
):
    if hash_password(req.old_password) != doctor["password"]:
        raise HTTPException(status_code=400,
                            detail="Current password is incorrect")
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE doctors SET password=%s "
                "WHERE doctor_id=%s",
                (hash_password(req.new_password),
                 doctor["doctor_id"])
            )
            conn.commit()
        return {"message": "Password updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ─────────────────────────────────────────
#  SCAN ROUTE
# ─────────────────────────────────────────
@app.post("/api/scan")
async def scan_image(
    file: UploadFile = File(...),
    doctor=Depends(get_current_doctor)
):
    # Read image
    try:
        contents    = await file.read()
        image       = Image.open(io.BytesIO(contents)).convert("RGB")
        image_array = np.array(image)
    except Exception as e:
        raise HTTPException(status_code=400,
                            detail=f"Invalid image: {e}")

    # Quality check
    quality_ok, quality_msg = check_quality(image_array)
    if not quality_ok:
        raise HTTPException(status_code=422,
                            detail=f"Quality check failed: {quality_msg}")

    # Preprocess
    image_tensor, enhanced = preprocess(image_array)

    # AI Inference — MODEL already in RAM, no loading
    grade, confidence, all_probs = predict(MODEL, image_tensor, DEVICE)

    # Grad-CAM++
    cam     = GradCAMPlusPlus(
        model=MODEL,
        target_layers=[MODEL.backbone.conv_head]
    )
    gcam    = cam(
        input_tensor=image_tensor.unsqueeze(0).to(DEVICE),
        targets=[ClassifierOutputTarget(grade)]
    )[0]
    heatmap = show_cam_on_image(
        enhanced.astype(np.float32) / 255.0,
        gcam, use_rgb=True
    )

    # Save images temporarily
    scan_id      = str(uuid.uuid4())[:8]
    img_dir      = Path("reports/images")
    enhanced_b64 = _img_to_base64(enhanced)
    heatmap_b64  = _img_to_base64(heatmap)
    original_b64 = _img_to_base64(image_array)

    return {
        "scan_id"     : scan_id,
        "grade"       : int(grade),
        "grade_name"  : GRADE_INFO[grade]["name"],
        "confidence"  : round(float(confidence) * 100, 2),
        "urgency"     : GRADE_INFO[grade]["urgency"],
        "action"      : GRADE_INFO[grade]["action"],
        "color"       : GRADE_INFO[grade]["color"],
        "probabilities": {
            f"Grade {i}": round(float(all_probs[i]) * 100, 2)
            for i in range(5)
        },
        "quality_msg"  : quality_msg,
        "original_img" : original_b64,
        "enhanced_img" : enhanced_b64,
        "heatmap_img"  : heatmap_b64,
    }


def _img_to_base64(img_array: np.ndarray) -> str:
    import base64
    pil = Image.fromarray(img_array.astype(np.uint8))
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


# ─────────────────────────────────────────
#  RECORDS ROUTES
# ─────────────────────────────────────────
@app.post("/api/records/save")
def save_record(
    patient_name:   str   = Form(...),
    patient_id:     str   = Form(...),
    patient_age:    int   = Form(...),
    patient_gender: str   = Form(...),
    notes:          str   = Form(""),
    grade:          int   = Form(...),
    confidence:     float = Form(...),
    prob_0: float = Form(...),
    prob_1: float = Form(...),
    prob_2: float = Form(...),
    prob_3: float = Form(...),
    prob_4: float = Form(...),
    img_original: str = Form(""), 
    img_enhanced: str = Form(""),
    img_heatmap:  str = Form(""),
    doctor=Depends(get_current_doctor)
):
    import base64

    all_probs = np.array([
        prob_0/100, prob_1/100, prob_2/100,
        prob_3/100, prob_4/100
    ])
    record_id = add_record(
        doctor_id=doctor["doctor_id"],
        doctor_name=doctor["name"],
        patient_name=patient_name,
        patient_age=patient_age,
        patient_gender=patient_gender,
        patient_id=patient_id,
        grade=grade,
        confidence=confidence / 100,
        all_probs=all_probs,
        notes=notes
    )

    # Save images to disk for PDF use
    if img_original or img_enhanced or img_heatmap:
        img_dir = Path(f"reports/images/{record_id}")
        img_dir.mkdir(parents=True, exist_ok=True)
        for name, b64 in [
            ("original", img_original),
            ("enhanced", img_enhanced),
            ("heatmap",  img_heatmap),
        ]:
            if b64:
                img_dir.joinpath(f"{name}.png").write_bytes(
                    base64.b64decode(b64)
                )

    # Increment scan count
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE doctors SET total_scans=total_scans+1 WHERE doctor_id=%s",
                (doctor["doctor_id"],)
            )
            conn.commit()
    finally:
        conn.close()

    return {"record_id": record_id, "message": "Record saved successfully"}


@app.get("/api/records")
def get_records(doctor=Depends(get_current_doctor)):
    return get_doctor_records(doctor["doctor_id"])


@app.get("/api/records/search")
def search(q: str, doctor=Depends(get_current_doctor)):
    return search_records(doctor["doctor_id"], q)


@app.delete("/api/records/{record_id}")
def delete(record_id: str, doctor=Depends(get_current_doctor)):
    delete_record(record_id, doctor["doctor_id"])
    return {"message": "Deleted successfully"}


@app.get("/api/records/{record_id}/pdf")
def download_pdf(
    record_id: str,
    doctor=Depends(get_current_doctor)
):
    record = get_record_by_id(record_id)
    if not record:
        raise HTTPException(status_code=404,
                            detail="Record not found")
    pdf_path = generate_pdf_report(record, doctor)
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"SmartDR_{record_id}.pdf"
    )


# ─────────────────────────────────────────
#  ANALYTICS ROUTE
# ─────────────────────────────────────────
@app.get("/api/analytics")
def analytics(doctor=Depends(get_current_doctor)):
    records = get_doctor_records(doctor["doctor_id"])

    grade_dist  = [0] * 5
    urgency_map = {"LOW": 0, "MEDIUM": 0,
                   "HIGH": 0, "CRITICAL": 0}
    daily       = {}

    for r in records:
        grade_dist[r["grade"]] += 1
        urg = r.get("urgency", "LOW")
        if urg in urgency_map:
            urgency_map[urg] += 1
        date_str = str(r.get("date", ""))[:10]
        if date_str:
            daily[date_str] = daily.get(date_str, 0) + 1

    daily_list = [
        {"date": k, "count": v}
        for k, v in sorted(daily.items())
    ]

    return {
        "total"         : len(records),
        "critical"      : urgency_map["CRITICAL"],
        "high"          : urgency_map["HIGH"],
        "no_dr"         : grade_dist[0],
        "grade_dist"    : grade_dist,
        "urgency_map"   : urgency_map,
        "daily_scans"   : daily_list,
        "high_risk"     : [
            r for r in records if r["grade"] >= 3
        ],
    }
