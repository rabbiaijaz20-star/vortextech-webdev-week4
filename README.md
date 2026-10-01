# SmartApply — Remote Jobs Explorer + AI CV Tailoring

A React app that shows live remote job listings and uses AI to tailor your CV to a specific job, built for the VortexTech Web Development Internship (Week 4, Advanced).

**Live app:** _add your Vercel link here after deploying_

## What it does

- Browses real, live remote job listings pulled from two free sources: [Remotive](https://remotive.com/api-documentation) and [We Work Remotely](https://weworkremotely.com/remote-job-rss-feed)
- Search by title, company, skill, or location, and filter by category
- Full job detail pages, save jobs for later (stored in your browser)
- Links to real onsite Punjab job listings on Rozee.pk
- **Bonus AI feature:** upload your CV (or paste its text) and a job description — Groq's AI rewrites your CV to fit the role, scores the match (0–100%), lists matched/missing skills, and gives you a downloadable PDF

## Why a backend?

A small FastAPI backend keeps the Groq API key private, merges the two job sources so there's no CORS issue, and handles PDF reading/writing for the CV feature.

## Tech stack

React + React Router + Vite · FastAPI (Python) · Groq AI · Remotive & We Work Remotely APIs

## Running locally

Opens at http://localhost:5173.

## Deployment

- **Backend** → Render: root dir `backend`, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`, set `GROQ_API_KEY`
- **Frontend** → Vercel: root dir `frontend`, set `VITE_API_BASE_URL` to your Render URL
- Then set `ALLOWED_ORIGINS` on Render to your Vercel URL and redeploy

## Task requirements

- [x] React + React Router, 5 routes
- [x] Fetches live data from public APIs
- [x] Loading and error states
- [x] Clean, responsive layout
- [x] Deployable, with `useParams()` on the detail page

All job data is real and live — nothing is fabricated. The AI only reorders and reframes real CV content; it never invents experience.