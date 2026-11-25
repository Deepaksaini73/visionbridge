# VisionBridge Cloud Deployment Guide (Vercel + Render + MongoDB Atlas)

**Target Topology:**
* **Frontend Web Application:** Vercel (or Render Static Site)
* **Backend API & Processing Server:** Render (Web Service - Node.js)
* **AI & Computer Vision Microservice:** Render (Web Service - Python FastAPI)
* **Database:** MongoDB Atlas (Free M0 Sandbox Cluster)

---

## Architecture Overview

```
                                [ End User Browser / Phone ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │                                           │
                       ▼                                           ▼
            [ Frontend on Vercel ]                       [ Direct Static Assets ]
       https://visionbridge.vercel.app                  Fast edge CDN caching
                       │
                       │ API Requests (/api/*)
                       ▼
           [ Backend on Render ]
    https://visionbridge-backend.onrender.com
           │                       │
           │ Database Queries      │ Computer Vision Telemetry (/api/v1/*)
           ▼                       ▼
   [ MongoDB Atlas Cloud ]    [ AI Service on Render ]
  mongodb+srv://...           https://visionbridge-ai.onrender.com
```

---

## Step 1: Set Up Cloud MongoDB (MongoDB Atlas)

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Click **"Build a Database"** $\rightarrow$ select the **M0 Free Tier** (free forever, 512 MB).
3. Under **Security Quickstart**:
   - Create a database user (e.g. `vb_admin`) and generate a secure password.
4. Under **Network Access**:
   - Click **"Add IP Address"** $\rightarrow$ select **"Allow Access from Anywhere"** (`0.0.0.0/0`).
5. Under **Database** $\rightarrow$ Click **"Connect"** $\rightarrow$ choose **"Drivers"** (Node.js).
6. Copy the connection URI string. It looks like:
   ```
   mongodb+srv://vb_admin:<PASSWORD>@cluster0.abcde.mongodb.net/visionbridge?retryWrites=true&w=majority
   ```
   *(Replace `<PASSWORD>` with your database user password).*

---

## Step 2: Deploy Python AI Service to Render

The AI service handles computer vision (Laplacian sharpness QA, 4-class segmentation, ptosis adnexal biometry, hyperaemia vascular density, lens clarity, and FLAIR retinal classification).

1. Log in to [https://render.com](https://render.com).
2. Click **"New +"** $\rightarrow$ select **"Web Service"**.
3. Connect your VisionBridge GitHub repository.
4. Configure the settings:
   - **Name:** `visionbridge-ai`
   - **Region:** Frankfurt (EU) or Oregon (US)
   - **Root Directory:** `ai-service`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free
5. Under **Advanced** $\rightarrow$ **Environment Variables**, add:
   - `DEBUG`: `False`
   - `API_KEY`: `your_secure_ai_secret_key`
6. Click **"Create Web Service"**.
7. Once deployed, copy your AI service URL:  
   *Example: `https://visionbridge-ai.onrender.com`*

---

## Step 3: Deploy Backend Server to Render

1. On Render, click **"New +"** $\rightarrow$ select **"Web Service"**.
2. Connect your VisionBridge GitHub repository.
3. Configure the settings:
   - **Name:** `visionbridge-backend`
   - **Region:** Same region as AI service
   - **Root Directory:** `.` (or leave empty)
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm --workspace=server run build`
   - **Start Command:** `npm --workspace=server run start`
   - **Instance Type:** Free
4. Under **Advanced** $\rightarrow$ **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGODB_URI`: *Your MongoDB Atlas connection URI from Step 1*
   - `JWT_SECRET`: *A secure random string (e.g. `vb_prod_jwt_secret_9941_key`)*
   - `JWT_EXPIRES_IN`: `7d`
   - `CLIENT_URL`: `https://your-visionbridge.vercel.app` *(or `*` initially)*
   - `AI_SERVICE_URL`: `https://visionbridge-ai.onrender.com` *(from Step 2)*
5. Click **"Create Web Service"**.
6. Once deployed, verify health at `https://visionbridge-backend.onrender.com/api/health`.

---

## Step 4: Deploy Frontend Client to Vercel

1. Log in to [https://vercel.com](https://vercel.com).
2. Click **"Add New..."** $\rightarrow$ **"Project"**.
3. Import your VisionBridge GitHub repository.
4. Configure the project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `.` (Leave at repository root so Vercel can access `shared/`)
   - **Build Command:** `npm --workspace=client run build`
   - **Output Directory:** `client/dist`
   - **Install Command:** `npm install`
5. Under **Environment Variables**:
   - `VITE_API_URL`: `https://visionbridge-backend.onrender.com/api`
6. Click **"Deploy"**.

*Note on SPA Routing:* Both [`client/vercel.json`](file:///d:/hackthon/zeiss/visionbeidge/client/vercel.json) and [`vercel.json`](file:///d:/hackthon/zeiss/visionbeidge/vercel.json) are already configured in the repo with `"source": "/(.*)", "destination": "/index.html"` to guarantee deep page links (`/customers/:id`, `/optometrist`, `/interview`) work when directly refreshed or shared.

---

## Alternative: 1-Click Render Blueprint (`render.yaml`)

VisionBridge includes a complete [`render.yaml`](file:///d:/hackthon/zeiss/visionbeidge/render.yaml) blueprint file at the repository root.

To deploy all 3 tiers onto Render together:
1. In Render Dashboard, click **"New +"** $\rightarrow$ **"Blueprint"**.
2. Select your VisionBridge repository.
3. Render reads `render.yaml` and provisions:
   - `visionbridge-backend` (Node API)
   - `visionbridge-ai` (Python FastAPI)
   - `visionbridge-client` (Vite Static Site)
4. Fill in `MONGODB_URI` when prompted, and click **"Apply"**.
