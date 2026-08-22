# ⚡ VIRALY — AI Content Repurposing Engine

> **One upload. Every platform.** Turn videos, podcasts, articles, and raw ideas into viral Twitter threads, LinkedIn posts, Instagram captions, Reel hooks, and video scripts.

---

## 📁 Monorepo Structure

```text
VIRALY_PROJECT/
├── frontend/                     # React + Vite Client Application
│   ├── src/                      # Components, Pages, State
│   ├── public/                   # Static assets & icons
│   ├── package.json              # Frontend dependencies
│   ├── vite.config.js            # Vite configuration
│   └── vercel.json               # SPA routing rewrite configuration
├── backend/                      # Node.js + Express API Server
│   ├── models/                   # Mongoose schemas
│   ├── server.js                 # Express server & Gemini AI synthesis
│   ├── .env.example              # Environment variables template
│   └── package.json              # Backend dependencies
├── package.json                  # Root runner scripts
├── .gitignore                    # Monorepo gitignore
└── README.md                     # Documentation
```

---

## 🚀 Quick Local Development

### 1. Install All Dependencies
```bash
npm run install:all
```

### 2. Configure Environment Variables

**Backend (`backend/.env`):**
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/viraly
CLIENT_ORIGIN=http://localhost:5173
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5000
```

### 3. Run Applications
- **Start Backend:** `npm run dev:backend`
- **Start Frontend:** `npm run dev:frontend`

---

## 🌐 Production Deployment Guide

Both **Vercel** and **Render** support this monorepo out of the box using their **Root Directory** setting:

### 1. Render (Backend API Service)
- **Repository:** Connect `VIRALY_PROJECT`
- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Environment Variables:**
  - `GEMINI_API_KEY`: Your Google AI Studio API Key
  - `GEMINI_MODEL`: `gemini-3.5-flash-lite`
  - `MONGODB_URI`: Your MongoDB Atlas connection string
  - `CLIENT_ORIGIN`: Your Vercel frontend URL (e.g. `https://viraly-frontend.vercel.app`)

### 2. Vercel (Frontend Web App)
- **Repository:** Connect `VIRALY_PROJECT`
- **Root Directory:** `frontend`
- **Framework Preset:** `Vite`
- **Build Command:** `vite build`
- **Output Directory:** `dist`
- **Environment Variables:**
  - `VITE_API_URL`: Your Render backend URL (e.g. `https://viraly-project.onrender.com` without trailing slash)

---

## ✨ Features
- **Multi-Source Ingestion:** Supports public YouTube videos, PDFs, TXT documents, and raw text prompts.
- **Multi-Platform Repurposing:** Twitter/X threads, LinkedIn posts, Instagram captions, Reel hooks, Video scripts, Hashtags.
- **AI Content Calendar:** Visual monthly activity heatmaps, day inspector, and automated 7-day personalized content roadmaps.
- **System Metrics & Analytics:** Live tracking of posts created, engine latency, and calculated hours saved.
