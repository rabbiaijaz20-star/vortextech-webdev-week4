"""
Outpost backend — FastAPI service that:
1. Proxies two free public remote-jobs sources (Remotive + We Work Remotely),
   merges them, and gives the frontend one clean, CORS-safe endpoint.
2. Powers the "Tailor my CV" feature: extracts text from an uploaded PDF,
   sends it + a job description to Groq's LLM API, and returns both the
   rewritten CV text and a freshly generated PDF, plus a match score.
"""

import base64
import json
import io
import os
import re
from typing import Optional

import asyncio
import xml.etree.ElementTree as ET
from html import unescape

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader

try:
    import pymupdf as fitz  # PyMuPDF: much better text extraction than pypdf
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b")
# If the main model is ever retired, these are tried in order.
GROQ_FALLBACK_MODELS = ["qwen/qwen3.6-27b", "openai/gpt-oss-20b"]
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
REMOTIVE_URL = "https://remotive.com/api/remote-jobs"
WWR_RSS_URL = "https://weworkremotely.com/remote-jobs.rss"

ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()
]

app = FastAPI(title="Outpost API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

CATEGORY_SLUG_MAP = {
    "software development": "software-dev",
    "customer service": "customer-service",
    "customer support": "customer-service",
    "design": "design",
    "marketing": "marketing",
    "sales / business": "sales-business",
    "sales and business": "sales-business",
    "data analysis": "data",
    "writing": "writing",
    "product": "product",
    "human resources": "hr",
    # We Work Remotely's category names, mapped onto the same slug set
    "full-stack programming": "software-dev",
    "front-end programming": "software-dev",
    "back-end programming": "software-dev",
    "all programming": "software-dev",
    "sales and marketing": "marketing",
    "management and finance": "sales-business",
    "devops and system admin": "data",
    "all other": "other",
}


def slugify_category(name: str) -> str:
    if not name:
        return "other"
    key = name.strip().lower()
    if key in CATEGORY_SLUG_MAP:
        return CATEGORY_SLUG_MAP[key]
    return re.sub(r"[^a-z0-9]+", "-", key).strip("-") or "other"


@app.get("/api/health")
async def health():
    return {"status": "ok"}


async def fetch_remotive_jobs(client: httpx.AsyncClient, search: Optional[str]) -> list:
    """Live listings straight from Remotive's own public API. No scraping, no fabricated data."""
    params = {"search": search} if search else {}
    try:
        resp = await client.get(REMOTIVE_URL, params=params, timeout=15.0)
        resp.raise_for_status()
    except httpx.HTTPError as e:
        print(f"[jobs] Remotive fetch failed: {e}")
        return []

    jobs = []
    for j in resp.json().get("jobs", []):
        jobs.append({
            "id": f"remotive-{j.get('id')}",
            "title": j.get("title"),
            "company_name": j.get("company_name"),
            "company_logo": j.get("company_logo_url") or j.get("company_logo"),
            "category": j.get("category"),
            "category_slug": slugify_category(j.get("category", "")),
            "job_type_label": (j.get("job_type") or "").replace("_", " ").title() or "Full time",
            "remote_label": "Remote",
            "candidate_required_location": j.get("candidate_required_location"),
            "publication_date_label": (j.get("publication_date") or "")[:10],
            "salary": j.get("salary") or None,
            "tags": j.get("tags", []),
            "url": j.get("url"),
            "description": j.get("description"),
            "source": "Remotive",
        })
    return jobs


def _wwr_text(item, tag: str) -> str:
    el = item.find(tag)
    return (el.text or "").strip() if el is not None and el.text else ""


async def fetch_wwr_jobs(client: httpx.AsyncClient) -> list:
    """Live listings straight from We Work Remotely's own public RSS feed. No scraping
    service, no key, no fabricated data — this is their real, official feed."""
    try:
        resp = await client.get(WWR_RSS_URL, timeout=15.0)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
    except (httpx.HTTPError, ET.ParseError) as e:
        print(f"[jobs] We Work Remotely fetch failed: {e}")
        return []

    jobs = []
    for item in root.findall(".//item"):
        raw_title = _wwr_text(item, "title")
        if ":" in raw_title:
            company_name, title = raw_title.split(":", 1)
            company_name, title = company_name.strip(), title.strip()
        else:
            company_name, title = "Unknown company", raw_title

        link = _wwr_text(item, "link") or _wwr_text(item, "guid")
        if not link:
            continue  # can't build a stable id/url without this

        logo_el = item.find("{http://search.yahoo.com/mrss}content")
        logo = logo_el.get("url") if logo_el is not None else None

        category = _wwr_text(item, "category")
        region = _wwr_text(item, "region") or "Not specified"

        jobs.append({
            "id": f"wwr-{abs(hash(link))}",
            "title": title,
            "company_name": company_name,
            "company_logo": logo,
            "category": category,
            "category_slug": slugify_category(category),
            "job_type_label": _wwr_text(item, "type") or "Full time",
            "remote_label": "Remote",
            "candidate_required_location": region,
            "publication_date_label": _wwr_text(item, "pubDate")[:16],
            "salary": None,
            "tags": [s.strip() for s in _wwr_text(item, "skills").split(",") if s.strip()][:6],
            "url": link,
            "description": unescape(_wwr_text(item, "description")),
            "source": "We Work Remotely",
        })
    return jobs


@app.get("/api/jobs")
async def get_jobs(search: Optional[str] = None, category: Optional[str] = None):
    # Two genuinely free, real, no-key job sources, fetched together and merged.
    # If one source is down, the other still renders rather than failing the whole request.
    async with httpx.AsyncClient() as client:
        remotive_jobs, wwr_jobs = await asyncio.gather(
            fetch_remotive_jobs(client, search),
            fetch_wwr_jobs(client),
        )

    if not remotive_jobs and not wwr_jobs:
        raise HTTPException(status_code=502, detail="Couldn't reach either jobs source right now. Please try again shortly.")

    jobs = remotive_jobs + wwr_jobs

    if search:
        term = search.lower()
        wwr_jobs_filtered = [
            j for j in wwr_jobs
            if term in (j["title"] or "").lower()
            or term in (j["company_name"] or "").lower()
            or any(term in t.lower() for t in j["tags"])
        ]
        jobs = remotive_jobs + wwr_jobs_filtered  # Remotive already applied `search` upstream

    if category:
        jobs = [j for j in jobs if j["category_slug"] == category]

    return {"count": len(jobs), "jobs": jobs}


MIN_TEXT_CHARS = 60


def _extract_with_pymupdf(file_bytes: bytes) -> str:
    if fitz is None:
        return ""
    try:
        with fitz.open(stream=file_bytes, filetype="pdf") as doc:
            return "\n".join(page.get_text("text") for page in doc)
    except Exception:
        return ""


def _extract_with_pypdf(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception:
        return ""


def _clean_llm_text(text: str) -> str:
    # Some models return their reasoning inside <think> tags; drop it.
    return re.sub(r"<think>.*?</think>", "", text or "", flags=re.DOTALL).strip()


async def _groq_chat(payload: dict, timeout: float = 90.0) -> str:
    """POST to Groq and return the message text. Raises HTTPException with a readable reason."""
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="The server is missing a GROQ_API_KEY. Add one to backend/.env and restart the server.",
        )
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="The AI took too long to respond. Please try again.")
    except httpx.HTTPStatusError as e:
        reason = "Groq API error."
        try:
            reason = e.response.json().get("error", {}).get("message", reason)
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f"Groq error ({e.response.status_code}): {reason}")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Couldn't reach the AI service right now.")
    try:
        return _clean_llm_text(resp.json()["choices"][0]["message"]["content"])
    except (KeyError, IndexError, TypeError):
        raise HTTPException(status_code=502, detail="The AI service returned an unexpected response.")


async def _ocr_with_groq_vision(file_bytes: bytes) -> str:
    """For scanned/image-only PDFs: render pages to images and let a Groq vision model read them."""
    if fitz is None:
        raise HTTPException(status_code=500, detail="PyMuPDF is not installed. Run: pip install -r requirements.txt")
    images = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in list(doc)[:3]:  # Groq vision allows max 3 images per request
            pix = page.get_pixmap(dpi=110)
            images.append(base64.b64encode(pix.tobytes("jpeg")).decode("utf-8"))
    content = [{"type": "text", "text": "Transcribe all the text in these CV pages exactly as written. Return only the text."}]
    for b64 in images:
        content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}})
    payload = {
        "model": GROQ_VISION_MODEL,
        "messages": [{"role": "user", "content": content}],
        "max_completion_tokens": 6000,
    }
    return await _groq_chat(payload)


async def extract_pdf_text(file_bytes: bytes) -> str:
    if not file_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="That file is not a valid PDF.")

    text = _extract_with_pymupdf(file_bytes).strip()
    if len(text) < MIN_TEXT_CHARS:
        text = _extract_with_pypdf(file_bytes).strip()
    if len(text) < MIN_TEXT_CHARS:
        try:
            text = (await _ocr_with_groq_vision(file_bytes)).strip()
        except HTTPException as e:
            raise HTTPException(
                status_code=e.status_code,
                detail=f"This PDF looks scanned, and reading it with AI failed: {e.detail} "
                       "You can also paste your CV text in the box below.",
            )

    if len(text) < MIN_TEXT_CHARS:
        raise HTTPException(
            status_code=400,
            detail="Couldn't read text from this PDF (it looks like a scanned image). "
                   "Use the 'Paste your CV text' box instead, it works every time.",
        )
    return text


async def call_groq(cv_text: str, job_title: str, job_description: str) -> str:
    system_prompt = (
        "You are an expert CV writer and career coach. You rewrite CVs so they honestly and "
        "clearly speak to a specific job's requirements, without inventing experience, skills, "
        "employers, or qualifications the candidate does not have. Reorder and re-emphasize real "
        "content, tighten language, mirror the job's key terms where genuinely true, and keep it "
        "ATS-friendly (plain text, clear section headers, no tables). Output ONLY the final CV "
        "text, with no commentary, no markdown formatting, and no preamble."
    )
    user_prompt = (
        f"Target job title: {job_title or 'Not specified'}\n\n"
        f"Target job description:\n{job_description[:6000]}\n\n"
        f"Candidate's current CV (raw extracted text):\n{cv_text[:12000]}\n\n"
        "Rewrite this CV so it is clearly tailored to the target job above."
    )

    last_error = None
    for model in [GROQ_MODEL] + GROQ_FALLBACK_MODELS:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.4,
            "max_completion_tokens": 3000,
        }
        try:
            result = await _groq_chat(payload)
            if result:
                return result
        except HTTPException as e:
            last_error = e
            # Only try the next model if this one looks retired/unavailable.
            if e.status_code == 502 and any(w in str(e.detail).lower() for w in ("model", "404", "400")):
                continue
            raise
    raise last_error or HTTPException(status_code=502, detail="The AI service returned an empty response.")


async def call_groq_match(cv_text: str, job_description: str) -> dict:
    """Ask Groq how well the CV matches the job, as strict JSON. Falls back to a
    neutral result if the model output can't be parsed, so this never breaks the
    main tailoring response."""
    system_prompt = (
        "You compare a candidate's CV against a job description and output ONLY "
        "valid JSON (no markdown, no commentary) with this exact shape: "
        '{"score": <integer 0-100>, "matched_skills": [<strings>], '
        '"missing_skills": [<strings>], "summary": "<one short sentence>"}. '
        "score reflects how well the CV's real, stated experience fits the job's "
        "requirements. matched_skills are skills/requirements from the job that the "
        "CV genuinely shows. missing_skills are requirements the CV does not show. "
        "Keep each list to at most 8 items."
    )
    user_prompt = f"Job description:\n{job_description[:6000]}\n\nCV:\n{cv_text[:12000]}"

    fallback = {
        "score": None,
        "matched_skills": [],
        "missing_skills": [],
        "summary": "Match score isn't available right now, but your tailored CV above is still ready.",
    }

    for model in [GROQ_MODEL] + GROQ_FALLBACK_MODELS:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
            "max_completion_tokens": 700,
            "response_format": {"type": "json_object"},
        }
        try:
            raw = await _groq_chat(payload)
            data = json.loads(raw)
            score = data.get("score")
            score = max(0, min(100, int(score))) if isinstance(score, (int, float)) else None
            return {
                "score": score,
                "matched_skills": [str(s) for s in data.get("matched_skills", [])][:8],
                "missing_skills": [str(s) for s in data.get("missing_skills", [])][:8],
                "summary": str(data.get("summary") or "")[:300],
            }
        except HTTPException as e:
            print(f"[match-score] Groq call failed with model {model}: {e.status_code} {e.detail}")
            if e.status_code == 502 and any(w in str(e.detail).lower() for w in ("model", "404", "400")):
                continue  # try the next model
            return fallback
        except (json.JSONDecodeError, ValueError, TypeError) as e:
            print(f"[match-score] Couldn't parse Groq's JSON response from {model}: {e}")
            return fallback

    return fallback


def build_pdf(text: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=LETTER,
        leftMargin=0.85 * inch, rightMargin=0.85 * inch,
        topMargin=0.8 * inch, bottomMargin=0.8 * inch,
    )
    styles = getSampleStyleSheet()
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"], fontName="Helvetica", fontSize=10.5, leading=15,
    )

    text = text.replace("\u2013", "-").replace("\u2014", "-").replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"').replace("\u2022", "-")
    text = text.encode("latin-1", "replace").decode("latin-1")
    story = []
    for line in text.split("\n"):
        clean = line.strip()
        if not clean:
            story.append(Spacer(1, 8))
            continue
        escaped = clean.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        story.append(Paragraph(escaped, body_style))

    doc.build(story)
    return buffer.getvalue()


@app.post("/api/enhance-cv")
async def enhance_cv(
    file: Optional[UploadFile] = File(None),
    cv_text: str = Form(""),
    job_title: str = Form(""),
    job_description: str = Form(...),
):
    cv_text = cv_text.strip()

    if not cv_text:
        if file is None:
            raise HTTPException(status_code=400, detail="Upload your CV as a PDF or paste your CV text.")
        file_bytes = await file.read()
        if len(file_bytes) > 8 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="That PDF is too large (max 8MB).")
        cv_text = await extract_pdf_text(file_bytes)

    enhanced_text = await call_groq(cv_text, job_title, job_description)
    match = await call_groq_match(cv_text, job_description)
    pdf_bytes = build_pdf(enhanced_text)
    pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

    return {
        "enhanced_text": enhanced_text,
        "pdf_base64": pdf_base64,
        "match_score": match["score"],
        "matched_skills": match["matched_skills"],
        "missing_skills": match["missing_skills"],
        "match_summary": match["summary"],
    }