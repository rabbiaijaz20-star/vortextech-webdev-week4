// Central place for talking to our FastAPI backend.
// The backend proxies the Remotive public API (avoids CORS issues in production)
// and hosts the Groq-powered CV enhancement endpoint.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function handle(res) {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.detail) detail = body.detail
    } catch (_) {
      /* ignore parse errors */
    }
    throw new Error(detail)
  }
  return res.json()
}

export async function fetchJobs({ search = '', category = '' } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (category) params.set('category', category)
  const res = await fetch(`${BASE_URL}/api/jobs?${params.toString()}`)
  return handle(res)
}

export async function enhanceCv({ file, cvText, jobTitle, jobDescription }) {
  const form = new FormData()
  if (file) form.append('file', file)
  form.append('cv_text', cvText || '')
  form.append('job_title', jobTitle || '')
  form.append('job_description', jobDescription || '')
  const res = await fetch(`${BASE_URL}/api/enhance-cv`, {
    method: 'POST',
    body: form
  })
  return handle(res)
}

export { BASE_URL }
