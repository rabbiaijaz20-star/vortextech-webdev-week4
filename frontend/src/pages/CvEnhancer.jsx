import React, { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useJobs } from '../context/JobsContext.jsx'
import { enhanceCv } from '../api/client'

export default function CvEnhancer() {
  const [searchParams] = useSearchParams()
  const prefillJobId = searchParams.get('jobId')
  const { getJobById } = useJobs()
  const prefillJob = prefillJobId ? getJobById(prefillJobId) : null

  const [file, setFile] = useState(null)
  const [cvText, setCvText] = useState('')
  const [jobTitle, setJobTitle] = useState(prefillJob?.title || '')
  const [jobDescription, setJobDescription] = useState(
    prefillJob ? stripForField(prefillJob.description) : ''
  )
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null) // { enhanced_text, pdf_base64, match_score, ... }
  const inputRef = useRef(null)

  function stripForField(html) {
    if (!html) return ''
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return (tmp.textContent || '').slice(0, 2000)
  }

  function handleFilePick(e) {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file && !cvText.trim()) {
      setErrorMsg('Upload your CV as a PDF, or paste your CV text.')
      setStatus('error')
      return
    }
    if (!jobDescription.trim()) {
      setErrorMsg('Paste the job description you want to tailor your CV to.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setErrorMsg('')
    setResult(null)
    try {
      const data = await enhanceCv({ file, cvText, jobTitle, jobDescription })
      setResult(data)
      setStatus('success')
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong while enhancing your CV.')
      setStatus('error')
    }
  }

  function scoreClass(score) {
    if (score >= 75) return 'score-good'
    if (score >= 50) return 'score-mid'
    return 'score-low'
  }

  function downloadPdf() {
    if (!result?.pdf_base64) return
    const byteChars = atob(result.pdf_base64)
    const byteNumbers = new Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tailored-cv.pdf'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Tailor your CV to a role</h1>
        <p>
          Upload your current CV and paste the job description. Outpost uses Groq's AI to rewrite your
          CV so it speaks directly to what this employer is asking for, then hands you back a clean PDF.
        </p>
      </div>

      <div className="cv-layout">
        <form className="panel" onSubmit={handleSubmit}>
          <h2>1. Your details</h2>

          <div className="field">
            <label htmlFor="cv-file">Your CV (PDF)</label>
            <div
              className={`dropzone ${file ? 'has-file' : ''}`}
              onClick={() => inputRef.current?.click()}
            >
              {file ? file.name : 'Click to choose a PDF file'}
            </div>
            <input
              ref={inputRef}
              id="cv-file"
              type="file"
              accept="application/pdf"
              onChange={handleFilePick}
              style={{ display: 'none' }}
            />
          </div>

          <div className="field">
            <label htmlFor="cv-text">Or paste your CV text (use this if the PDF can't be read)</label>
            <textarea
              id="cv-text"
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste the full text of your CV here…"
            />
          </div>

          <div className="field">
            <label htmlFor="job-title">Job title (optional)</label>
            <input
              id="job-title"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>

          <div className="field">
            <label htmlFor="job-desc">Job description</label>
            <textarea
              id="job-desc"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the requirements and responsibilities from the listing here…"
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Tailoring your CV…' : 'Tailor my CV'}
          </button>

          {status === 'error' && (
            <p style={{ color: 'var(--brick)', marginTop: 14, fontSize: 14 }}>{errorMsg}</p>
          )}
        </form>

        <div className="panel">
          <h2>2. Result</h2>
          {status === 'idle' && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 14.5 }}>
              Your tailored CV preview will appear here once it's ready.
            </p>
          )}
          {status === 'loading' && (
            <div className="state-block">
              <div className="spinner" />
              Reading your CV and matching it to the role…
            </div>
          )}
          {status === 'success' && result && (
            <>
              {result.match_summary && (
                <div className="match-block">
                  <div className="match-score-row">
                    <div className={`score-badge ${scoreClass(result.match_score)}`}>
                      {result.match_score !== null && result.match_score !== undefined ? `${result.match_score}%` : '--'}
                    </div>
                    <p className="match-summary">{result.match_summary}</p>
                  </div>

                  {result.matched_skills?.length > 0 && (
                    <div className="skill-group">
                      <span className="skill-group-label">Matched</span>
                      <div className="job-meta-row">
                        {result.matched_skills.map((s) => (
                          <span key={s} className="pill accent">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.missing_skills?.length > 0 && (
                    <div className="skill-group">
                      <span className="skill-group-label">Worth adding</span>
                      <div className="job-meta-row">
                        {result.missing_skills.map((s) => (
                          <span key={s} className="pill missing">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="cv-output">{result.enhanced_text}</div>
              <button className="btn btn-gold" style={{ marginTop: 18 }} onClick={downloadPdf}>
                Download tailored CV (PDF)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}