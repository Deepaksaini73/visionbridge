# VisionBridge 👁️🌉
### *Speak. We listen. An eye-care professional reviews.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](#)
[![React](https://img.shields.io/badge/React-18.x-teal.svg)](#)
[![Node](https://img.shields.io/badge/Node.js-20+-navy.svg)](#)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](#)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38bdf8.svg)](#)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Local-green.svg)](#)

VisionBridge is a voice-first, AI-assisted preliminary vision-screening and tele-optometry platform designed for rural communities, local optical stores, and people with limited access to eye-care professionals. It enables local optical store operators to administer standardized, multilingual vision screenings that remote optometrists can review, verify, and act upon.

---

## ⚠️ Important Medical & Ethical Guardrails

> **CLINICAL NOTICE**: VisionBridge is an information gathering, preliminary vision screening, and professional-connect platform.
> - **It does NOT calculate spectacle power or generate optical prescriptions.**
> - **It does NOT diagnose medical conditions (e.g. cataract, glaucoma, retinopathy, macular degeneration).**
> - **It does NOT replace comprehensive in-person clinical eye examinations by an ophthalmologist or optometrist.**
> - All findings are classified as **preliminary screening observations** requiring licensed eye-care professional verification.
> - Acute danger symptoms (sudden vision loss, severe eye pain, flashes of light) trigger automated triage warnings advising immediate hospital emergency eye care.

---

## ✨ Key Features & Clinical Modules

- **🎙️ Multilingual Voice Interview (Hindi & English)**
  - Browser-native Speech Recognition (STT) and Speech Synthesis (TTS).
  - Dynamic adaptive question branching (questions adjust automatically based on prior answers; irrelevant questions are pruned).
  - Immediate red-flag symptom interception and emergency triage warnings.

- **👁️ Modular Vision Screening Suite**
  - **Module A**: Distance Visual Acuity (3-meter standardized Tumbling-E with separate eye occlusion).
  - **Module B**: Near Visual Acuity (40 cm reading distance trials).
  - **Module C**: Contrast Sensitivity (diminishing Weber contrast steps converting to LogCS).
  - **Module D**: Colour Vision (pseudoisochromatic simulation plates).
  - **Module E**: Central Amsler Grid (macular function assessment and localized metamorphopsia detection).
  - **Calibration System**: Physical card calibration to accurately render visual angle optotypes at true millimeters.

- **📸 Clinical Eye Photography & Secure Storage**
  - Patient demographic portrait photo upload with cropping and thumbnail caching.
  - Anatomical eye image capture (Left OS / Right OD, anterior segment / external eye).
  - **AES-256-GCM Cryptographic Encryption at Rest**: Raw images are encrypted on disk with authenticated encryption tags to prevent unauthorized access.
  - **Tokenized Authenticated Streaming**: Clinical photographs require valid session tokens or cookies to view; direct file URLs are not publicly exposed.

- **🛡️ Multi-Tenant Store Isolation & RBAC**
  - Strict data isolation between partner optical store centers (Chittoor, Madanapalle, Tirupati).
  - Role-based permissions:
    - **Store Operator**: Scoped strictly to their designated optical store; can register customers, record voice interviews, conduct preliminary acuity screenings, and download complete clinical PDF reports.
    - **Optometrist**: Network-wide tele-review console; connected directly to live MongoDB database queue (`GET /api/reviews/queue`); reviews raw telemetry (Tumbling-E, Amsler), inspects encrypted eye images, signs off clinical notes (`POST /api/reviews/:caseId/decision`), and issues formal hospital referrals.
    - **Administrator**: System-wide governance, account provisioning, and optical center registration.

- **📄 Comprehensive Clinical PDF Report Engine (Milestone 5.6)**
  - Print-optimized A4 clinical reports covering all 5 modules: Customer Demographics, Calibration & Test Validity, Visual Acuity (OD / OS) logMAR & Snellen scores, Near Vision & Presbyopia, Amsler Grid Macular Distortion, Contrast Sensitivity, Colour Vision, Clinical Eye Photographs, Operator Observations, and Optometrist Clinical Decision & Digital Sign-off Block.
  - Multi-source tokenized streaming (`req.headers.authorization`, `?token=<jwt>`, and session cookie `vb_auth_token`) enabling direct 1-click downloads and prints without 401 Unauthorized errors.
  - Universal Customer Report resolution endpoint (`GET /api/customers/:id/report`) automatically linking to the latest screening.

- **⚡ Offline-First Architecture**
  - Client-side IndexedDB database (via Dexie.js) allows full screening operation when internet is unavailable.
  - Automatic synchronization with the cloud backend when connectivity is restored.

- **🤖 VisionBridge AI & Computer Vision Microservice**
  - **EyeCapture AI (Milestone 5.1)**: Pre-capture quality scoring (Laplacian sharpness, illumination uniformity, glare saturation) and 4-class anterior segmentation (Sclera, Iris, Pupil, Periocular).
  - **Adnexal & Alignment Telemetry (Milestone 5.2B)**: Dual-engine ptosis screening (MRD1, MRD2, Palpebral Fissure Height), IPD metric scaling via 11.7mm iris standard, and Hirschberg corneal reflex optical alignment.
  - **Conjunctival Hyperaemia & Pterygium Screening (Milestone 5.3)**: Scleral microvascular density extraction mapped to the international Efron grading scale (0–4) and corneal limbus encroachment detection.
  - **VisionBridge Retinal AI Foundation (Milestone 5.4 FLAIR)**: Zero-shot contrastive vision-language representation (Bio_ClinicalBERT + ResNet-50, 133.26M params) evaluating Color Fundus Photography (CFP) across Diabetic Retinopathy (5 stages), Macular Pathologies (DME, Macular Hole, AMD), Glaucomatous Disc Cupping, and Retinal Vascular Occlusions, paired with automated clinical triage urgency routing (`ROUTINE`, `ELECTIVE_CONSULT`, `URGENT_REFERRAL`).
  - **Lens & Corneal Clarity Engine (Milestone 5.5)**: Crystalline lens pupillary light transmission and Shannon entropy texture profiling (WHO/LOCS III cataract proxy Grades 0–3) and 360° radial limbal arcus senilis lipid ring biometry.

- **🎨 Modern Healthcare SaaS Interface**
  - Responsive layout inspired by the *Eye Sight* optical UI kit and clean *Whitespace* healthcare SaaS patterns.
  - Dual-font typography: **Poppins** (headings) + **Inter** (clinical telemetry).
  - Full desktop, tablet, and mobile responsiveness with zero horizontal scrollbar overflow.

---

## 🏗️ Project Architecture

```
visionbridge/
├── ai-service/          # Python AI & Computer Vision Service (FastAPI, OpenCV, Pillow)
│   ├── app/             # FastAPI routes, image decodability validator, Pydantic schemas
│   ├── tests/           # Automated pytest test suites
│   ├── requirements.txt # Foundation dependencies
│   └── start.bat / ps1  # Dedicated launcher scripts
├── client/              # React 18 + Vite + TypeScript + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/  # Reusable UI system (StatCard, Badge, PageHeader, EmptyState)
│   │   ├── features/    # Screening engine, imaging gallery, voice interview
│   │   ├── pages/       # Store dashboard, Optometrist console, Admin, Customer profile
│   │   ├── context/     # AuthContext with demo personas & token management
│   │   └── offline/     # Dexie.js IndexedDB local database
│   └── vite.config.ts   # Vite configuration with API proxy to port 5000
├── server/              # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── controllers/ # Auth, Customers, Screenings, Interviews, Imaging, AI Gateway
│   │   ├── models/      # Mongoose schemas for MongoDB
│   │   ├── routes/      # REST API endpoints & authenticated media streaming
│   │   ├── services/    # Google Gemini AI summary service
│   │   └── utils/       # AES-256-GCM storage engine & JWT helpers
│   └── test-*.js        # Automated verification & audit test suites
├── shared/              # Shared domain TypeScript types, interfaces & screening configs
├── storage/             # Private encrypted disk vault for clinical uploads
└── docs/                # Architecture specifications & redesign audit reports
```

---

## 🚀 Quickstart: Setup & Run Locally

Follow these steps to run VisionBridge on your local machine.

### Prerequisites

- **Node.js**: `v18.0.0` or higher (`v20+` recommended)
- **npm**: `v9.0.0` or higher
- **MongoDB**: Either a local MongoDB instance running at `mongodb://localhost:27017` or a free MongoDB Atlas connection string. *(The server includes fallback behavior if MongoDB is not locally running).*

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/visionbridge.git
cd visionbridge
```

---

### Step 2: Install All Dependencies

VisionBridge uses an npm monorepo setup. Running `npm install` in the root directory automatically installs all root, client, and server dependencies:

```bash
npm install
```

---

### Step 3: Configure Environment Variables

1. **Root & Server Environment Configuration**:
   Copy `.env.example` to `.env` in the root:
   ```bash
   # On Windows (PowerShell):
   Copy-Item .env.example .env

   # On macOS / Linux:
   cp .env.example .env
   ```

   *(Optional)* Check `.env` and set your MongoDB URI or Google Gemini API key if desired:
   ```env
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   MONGODB_URI=mongodb://localhost:27017/visionbridge
   JWT_SECRET=visionbridge_super_secure_jwt_secret_change_in_production
   JWT_EXPIRES_IN=7d
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

2. **Client Environment Configuration**:
   ```bash
   # On Windows (PowerShell):
   Copy-Item client/.env.example client/.env

   # On macOS / Linux:
   cp client/.env.example client/.env
   ```

---

### Step 4: Run the Development Servers

Start both the backend server and frontend client concurrently with a single command:

```bash
npm run dev
```

- **Client App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)
- **Python AI Microservice**: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)

> **Individual commands** (if running in separate terminal windows):
> ```bash
> # Terminal 1: Backend Server (Port 5000)
> npm run dev:server
> 
> # Terminal 2: Frontend Client (Port 5173)
> npm run dev:client
> 
> # Terminal 3: Python AI & Computer Vision Microservice (Port 8001)
> npm run dev:ai
> # Or on Windows: .\ai-service\start.bat
> 
> # Automated Python Test Suite (pytest)
> npm run test:ai
> ```

---

## 🔑 Fast One-Click Demo Personas

On the Login page ([http://localhost:5173/login](http://localhost:5173/login)), click any of the **One-Click Demo Personas** to instantly explore all workflows without typing:

| Demo Persona | Role | Default Credentials | Scope & Permissions |
| :--- | :--- | :--- | :--- |
| **Store Operator (Chittoor)** | `STORE_OPERATOR` | `operator@visionbridge.org`<br>`OperatorPass123!` | Manages customers, conducts voice interviews, performs acuity screenings at Chittoor Center. |
| **Optometrist Reviewer** | `OPTOMETRIST` | `optometrist@visionbridge.org`<br>`OptometristPass123!` | Network-wide tele-review console; reviews findings, inspects encrypted eye images, signs off clinical notes. |
| **Administrator** | `ADMIN` | `admin@visionbridge.org`<br>`AdminPass123!` | Governance console; provisions new operators/optometrists and registers new partner optical centers. |
| **Store Operator 2 (Madanapalle)** | `STORE_OPERATOR` | `operator2@visionbridge.org`<br>`OperatorPass123!` | Used to verify multi-tenant store isolation (cannot see Chittoor store records). |

---

## 📚 Engineering & Clinical Documentation Index

Comprehensive milestone documentation, clinical specifications, mathematical formulations, and validation reports are stored in `docs/`:

| Milestone | Document | Focus & Highlights |
|---|---|---|
| **5.0** | [`docs/milestone-5-python-ai-foundation.md`](docs/milestone-5-python-ai-foundation.md) | FastAPI microservice foundation, port `8001` integration, and in-memory streaming gateway |
| **5.1** | [`docs/milestone-5.1-eye-capture-ai-report.md`](docs/milestone-5.1-eye-capture-ai-report.md) | EyeCapture AI: Sharpness/exposure QA gating, 4-class U-Net segmentation, and canvas overlays |
| **5.2A** | [`docs/milestone-5.2a-flair-retinal-report.md`](docs/milestone-5.2a-flair-retinal-report.md) | FLAIR Retinal Foundation Model: Zero-shot classification, CPU benchmark, and domain gating |
| **5.2B** | [`docs/milestone-5.2b-adnexal-alignment-telemetry.md`](docs/milestone-5.2b-adnexal-alignment-telemetry.md) | Adnexal biometry: MediaPipe 468-mesh, Sobel edge macro profiler, MRD1/MRD2, PFH, IPD & Hirschberg |
| **5.3** | [`docs/milestone-5.3-hyperaemia-pterygium.md`](docs/milestone-5.3-hyperaemia-pterygium.md) | Scleral vascular density %, Efron redness grading (0–4), and pterygium corneal encroachment |
| **5.4** | [`docs/milestone-5.4-production-retinal-ai.md`](docs/milestone-5.4-production-retinal-ai.md) | Production Retinal AI (FLAIR): Zero-shot CFP multi-category evaluation (DR, DME, Glaucoma, BRVO/CRVO), triage routing, and fundus overlays |
| **5.5** | [`docs/milestone-5.5-lens-corneal-clarity-report.md`](docs/milestone-5.5-lens-corneal-clarity-report.md) | Lens & Corneal Clarity: Crystalline lens opacity (Cataract WHO Grades 0–3) & Arcus Senilis lipid ring biometry |
| **5.6** | [`docs/milestone-5.6-live-optometrist-queue-and-pdf-reporting.md`](docs/milestone-5.6-live-optometrist-queue-and-pdf-reporting.md) | Live MongoDB Optometrist Review Queue, Decision Persistence, and Comprehensive Clinical PDF Report Engine |
| **UI Polish** | [`docs/ui-styling-enhancements-report.md`](docs/ui-styling-enhancements-report.md) | Full-spectrum styling audit: borders, dark modal scrollbars, responsive table widths, modal scroll bounds, and non-overflowing 5-engine AI toolbar |
| **Architecture** | [`docs/architecture.md`](docs/architecture.md) | End-to-end multi-tenant system architecture, AES-256-GCM vault, and RBAC security |
| **Research** | [`docs/research/eye-capture-ai-model-evaluation.md`](docs/research/eye-capture-ai-model-evaluation.md) | In-depth AI/ML model landscape evaluation for ophthalmology and tele-optometry |

---

## 🧪 Running Automated Verification & Audit Tests

The project includes automated quality, security, and clinical verification test suites. You can run them anytime:

```bash
# 0. Python AI Microservice Test Suite (pytest - 38 tests across 5 modules)
cd ai-service && .venv\Scripts\pytest -c pytest.ini tests/

# 1. Milestone 4.2 Security, Encryption & Store Isolation Audit (46 tests)
node server/test-milestone4.2-audit.js

# 2. Milestone 4.1 Clinical Eye Images & Tele-Review Suite (32 tests)
node server/test-milestone4.1-images.js

# 3. Milestone 4 Modular Vision Screening Suite (36 tests)
node server/test-milestone4-modular.js

# 4. Milestone 3.1 Adaptive Voice Interview & Branching Suite (24 tests)
node server/test-milestone3-branching.js
```

To run a full production typecheck and build validation:
```bash
npm run build
```

---

## 📄 License & Attribution

This project is built for the Zeiss Hackathon and is open source under the MIT License.
Refer to [`docs/ui-redesign-report.md`](docs/ui-redesign-report.md) for detailed UX tokens, responsive breakpoints, and architectural audits.
