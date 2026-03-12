# SmartDR-XAI — AI-Powered Diabetic Retinopathy Grading System

<div align="center">

![SmartDR-XAI Banner](https://img.shields.io/badge/SmartDR--XAI-Diabetic%20Retinopathy%20Grading-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.11-green?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)
![PyTorch](https://img.shields.io/badge/PyTorch-2.3-EE4C2C?style=for-the-badge&logo=pytorch)

**Multi-Stage Diabetic Retinopathy Grading with Explainable AI**

*Lloyd Institute of Engineering & Technology | CSE-DS | BTech 7th Semester*

</div>

---

## 🌐 Live Deployment

| Service | URL | Platform |
|--------|-----|----------|
| 🖥️ **Frontend (Web App)** | [smart-dr-xai-diabetic-retinopathy-g.vercel.app](https://smart-dr-xai-diabetic-retinopathy-g.vercel.app) | Vercel |
| ⚙️ **Backend (API)** | [satyan89755-smartdr-xai.hf.space](https://satyan89755-smartdr-xai.hf.space) | HuggingFace Spaces |
| 📚 **API Docs (Swagger)** | [satyan89755-smartdr-xai.hf.space/docs](https://satyan89755-smartdr-xai.hf.space/docs) | HuggingFace Spaces |
| 🗄️ **Database** | Neon PostgreSQL (Cloud) | Neon.tech |
| 📓 **Model Training Notebook** | [Diabetic Retinopathy Detection — Kaggle](https://www.kaggle.com/code/satyansinha1/diabetic-retinopathy-detection-using-machine-learn) | Kaggle |


---


## 📖 What is SmartDR-XAI?

SmartDR-XAI is a clinical decision support system that uses deep learning to automatically grade diabetic retinopathy (DR) severity from retinal fundus images. It uses **EfficientNet-B2** as the backbone model and **Grad-CAM++** to generate visual explanations showing *which regions* of the retina the AI focused on — making it explainable and trustworthy for ophthalmologists.

### Diabetic Retinopathy Grades

| Grade | Name | Urgency | Description |
|-------|------|---------|-------------|
| 0 | No DR | LOW | No signs of retinopathy |
| 1 | Mild DR | LOW | Microaneurysms only |
| 2 | Moderate DR | MEDIUM | More than just microaneurysms |
| 3 | Severe DR | HIGH | Extensive hemorrhages |
| 4 | Proliferative DR | CRITICAL | Neovascularization present |

---

## 🤖 AI Model

### Architecture — EfficientNet-B2

**Why EfficientNet-B2?**
- Achieves excellent accuracy with fewer parameters than ResNet or VGG
- Scales width, depth, and resolution simultaneously (compound scaling)
- Pretrained on ImageNet — transfers well to medical imaging
- Lightweight enough to run on CPU (important for free-tier deployment)

**Training Results:**
| Metric | Value |
|--------|-------|
| Quadratic Weighted Kappa (QWK) | **0.9079** |
| Accuracy | **84.58%** |
| Classes | 5 (Grade 0–4) |
| Model Size | ~32 MB |

### Explainability — Grad-CAM++

**Why Grad-CAM++?**
- Generates heatmaps showing which pixels influenced the prediction
- Improved version of standard Grad-CAM — better for multi-instance detection
- Critical for clinical use — doctors can verify what the AI "saw"
- Works by computing gradients of the class score with respect to the last convolutional layer

### Preprocessing Pipeline

1. **Quality Check** — Detects blurry or dark images using Laplacian variance and brightness thresholds
2. **CLAHE Enhancement** — Contrast Limited Adaptive Histogram Equalization improves blood vessel visibility
3. **Resize & Normalize** — Resized to 224×224, normalized with ImageNet mean/std
4. **Tensor Conversion** — Converted to PyTorch tensor for model inference

---

## 🛠️ Tech Stack & Libraries

### Backend

| Library | Version | Why Used |
|---------|---------|----------|
| **FastAPI** | 0.111.0 | High-performance async API framework; auto-generates Swagger docs |
| **Uvicorn** | 0.29.0 | ASGI server to run FastAPI in production |
| **PyTorch** | 2.3.1 | Deep learning framework for loading and running EfficientNet-B2 |
| **timm** | 1.0.3 | PyTorch Image Models — provides EfficientNet-B2 pretrained architecture |
| **grad-cam** | 1.5.0 | Implements Grad-CAM++ for generating explainability heatmaps |
| **OpenCV (headless)** | 4.9.0 | Image preprocessing — CLAHE enhancement, color space conversion |
| **Pillow** | 10.3.0 | Image reading, format conversion, resizing |
| **NumPy** | 1.26.4 | Array operations for image processing and probability calculations |
| **psycopg2-binary** | 2.9.9 | PostgreSQL adapter — connects to Neon cloud database |
| **python-jose** | 3.3.0 | JWT token creation and validation for authentication |
| **passlib[bcrypt]** | 1.7.4 | Password hashing (bcrypt algorithm) |
| **fpdf2** | 2.7.9 | Generates PDF reports with patient data and eye images |
| **python-dotenv** | 1.0.1 | Loads environment variables from .env file |
| **scikit-learn** | 1.4.1 | Evaluation metrics (QWK score) during training |
| **matplotlib** | 3.8.3 | Visualization during training and heatmap generation |

### Frontend

| Library | Version | Why Used |
|---------|---------|----------|
| **React** | 18 | Component-based UI framework |
| **Vite** | 5 | Fast build tool and dev server for React |
| **React Router v6** | 6 | Client-side routing between pages |
| **Axios** | latest | HTTP client — sends API requests with JWT auth headers |
| **Tailwind CSS** | 3 | Utility-first CSS — rapid, consistent styling |
| **Recharts** | latest | Charts for analytics dashboard (grade distribution, daily scans) |
| **react-dropzone** | latest | Drag-and-drop image upload for scan page |
| **lucide-react** | 0.577.0 | Icon library |
| **react-hot-toast** | latest | Toast notifications for success/error feedback |

### Database & Infrastructure

| Service | Purpose |
|---------|---------|
| **Neon PostgreSQL** | Cloud-hosted PostgreSQL — stores doctor profiles and patient records |
| **HuggingFace Spaces** | Backend hosting — 16GB RAM, supports ML models, free tier |
| **Vercel** | Frontend hosting — CDN-backed, auto-deploys from GitHub |
| **GitHub** | Source code repository and CI/CD trigger |
| **Docker** | Containerizes the backend for HuggingFace deployment |

---

## 📁 Folder Structure

```
SmartDR_XAI/
│
├── backend/                          # FastAPI Python backend
│   ├── main.py                       # All API endpoints, JWT auth, startup
│   ├── model.py                      # EfficientNet-B2 model definition & loader
│   ├── utils.py                      # Image preprocessing, quality check, predict()
│   ├── database.py                   # PostgreSQL queries (CRUD for records/doctors)
│   ├── report_gen.py                 # PDF report generation with eye images
│   ├── best_model.pth                # Trained model weights (~32MB)
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Docker config for HuggingFace deployment
│   ├── render.yaml                   # Render deployment config (backup)
│   └── .env                          # Environment variables (not committed)
│
├── frontend/                         # React JS frontend (Vite)
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js             # Axios instance with JWT interceptor
│   │   ├── context/
│   │   │   ├── AuthContext.jsx       # React context object for auth state
│   │   │   └── AuthProvider.jsx      # Auth provider component (login/logout)
│   │   ├── components/
│   │   │   └── Sidebar.jsx           # Navigation sidebar
│   │   ├── pages/
│   │   │   ├── Login.jsx             # Login & Register page
│   │   │   ├── Scan.jsx              # Image upload, AI scan, results display
│   │   │   ├── Records.jsx           # Patient records list, search, PDF download
│   │   │   ├── Analytics.jsx         # Charts and statistics dashboard
│   │   │   └── Profile.jsx           # Doctor profile & password change
│   │   ├── App.jsx                   # Routes configuration
│   │   ├── main.jsx                  # React entry point
│   │   └── index.css                 # Global styles + Tailwind imports
│   ├── package.json
│   ├── vite.config.js                # Vite config + dev proxy
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── .gitignore
├── .python-version                   # Forces Python 3.11 on deployment
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` |✅ | Login with email & password |
| POST | `/api/auth/register` | ✅ | Register new doctor account |
| GET | `/api/doctor/me` | ✅ | Get current doctor profile |
| PUT | `/api/doctor/update` | ✅ | Update profile details |
| PUT | `/api/doctor/password` | ✅ | Change password |
| POST | `/api/scan` | ✅ | Upload retinal image → returns grade, confidence, heatmap |
| POST | `/api/records/save` | ✅ | Save scan result to database |
| GET | `/api/records` | ✅ | Get all records for current doctor |
| GET | `/api/records/search?q=` | ✅ | Search records by name/ID/grade |
| DELETE | `/api/records/{id}` | ✅ | Delete a record |
| GET | `/api/records/{id}/pdf` | ✅ | Download PDF report |
| GET | `/api/analytics` | ✅ | Get grade distribution and scan statistics |

---

## 🔄 Scan Flow

```
User uploads retinal image
        ↓
POST /api/scan
        ↓
1. Quality Check (blur/brightness detection)
        ↓
2. CLAHE Enhancement (improve contrast)
        ↓
3. EfficientNet-B2 Inference (grade 0–4)
        ↓
4. Grad-CAM++ Heatmap Generation
        ↓
Returns: grade, confidence, probabilities, 3 images (original, enhanced, heatmap)
        ↓
User fills patient info → clicks Save
        ↓
POST /api/records/save (stores in PostgreSQL + saves images to disk)
        ↓
User clicks Download PDF
        ↓
GET /api/records/{id}/pdf → fpdf2 generates report with all images
```

---

## 🔐 Authentication

- JWT (JSON Web Tokens) stored in `sessionStorage`
- Token auto-attached to every request via Axios interceptor
- Auto-logout on 401 response
- Passwords hashed with SHA-256 before storage

---

## 🗄️ Database Schema

### `doctors` table
Stores doctor accounts — `doctor_id`, `name`, `email`, `password` (hashed), `hospital`, `specialization`, `phone`, `city`, `joined`, `total_scans`

### `patient_records` table
Stores scan results — `record_id`, `doctor_id`, `patient_name`, `patient_age`, `patient_gender`, `scan_date`, `grade`, `grade_name`, `confidence`, `urgency`, `prob_grade_0` through `prob_grade_4`, `notes`

---

## 🚀 Running Locally

### Prerequisites
- Python 3.11
- Node.js 18+
- PostgreSQL (or use the Neon cloud URL)

### Backend
```bash
cd backend
pip install -r requirements.txt
# Create .env file with DATABASE_URL and SECRET_KEY
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
# Opens at http://localhost:5173
```

### Environment Variables (backend/.env)
```
DATABASE_URL=your_neon_postgresql_url
SECRET_KEY=your_secret_key
```

---

## 📊 Model Training Details

- **Dataset:** Kaggle APTOS 2019 Blindness Detection
- **Architecture:** EfficientNet-B2 with custom classification head
- **Loss Function:** CrossEntropyLoss
- **Optimizer:** Adam with learning rate scheduling
- **Augmentation:** Random flip, rotation, color jitter
- **Evaluation Metric:** Quadratic Weighted Kappa (QWK) — standard for ordinal classification
- **Final QWK:** 0.9079 | **Final Accuracy:** 84.58%

### 📓 Training Notebook

The full model training code — including data loading, augmentation, EfficientNet-B2 fine-tuning, evaluation, and model export — is available on Kaggle:

**🔗 [Diabetic Retinopathy Detection using Machine Learning — Kaggle Notebook](https://www.kaggle.com/code/satyansinha1/diabetic-retinopathy-detection-using-machine-learn)**

The trained model weights (`best_model.pth`) were exported from this notebook and are used directly by the FastAPI backend for inference.

---

## 📄 License

MIT License — free to use for academic and research purposes.

---
