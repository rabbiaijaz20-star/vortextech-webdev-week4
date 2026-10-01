import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useJobs } from '../context/JobsContext.jsx'
import Loader from '../components/Loader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { isSaved, toggleSaved } from '../context/SavedJobsContext.js'
import CompanyLogo from '../components/CompanyLogo.jsx'
import { stripHtml } from '../utils/text.js'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { jobs, loading, error, getJobById } = useJobs()
  const [saved, setSaved] = useState(false)

  const job = getJobById(id)

  useEffect(() => {
    setSaved(isSaved(id))
  }, [id])

  if (loading) return <div className="container"><Loader label="Loading job details…" /></div>
  if (error) return <div className="container"><EmptyState title="Couldn't load this job" message={error} /></div>
  if (!job) {
    return (
      <div className="container">
        <EmptyState
          title="Job not found"
          message="It may have been filled or the link is out of date."
        />
        <div style={{ marginTop: 16 }}>
          <Link to="/" className="back-link">← Back to all jobs</Link>
        </div>
      </div>
    )
  }

  const description = stripHtml(job.description)

  return (
    <div className="container">
      <button className="back-link" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} onClick={() => navigate(-1)}>
        ← Back to all jobs
      </button>

      <div className="detail-head">
        <div className="detail-company">
          <CompanyLogo name={job.company_name} logo={job.company_logo} size={56} />
          <div className="detail-title">
            <h1>{job.title}</h1>
            <p className="company">{job.company_name}, {job.candidate_required_location}</p>
          </div>
        </div>
        <div className="detail-actions">
          <button
            className={saved ? 'btn btn-gold' : 'btn btn-secondary'}
            onClick={() => setSaved(!!toggleSaved(job.id).includes(String(job.id)))}
          >
            {saved ? 'Saved' : 'Save job'}
          </button>
          <a className="btn btn-primary" href={job.url} target="_blank" rel="noreferrer">
            Apply on Remotive
          </a>
        </div>
      </div>

      <div className="job-meta-row" style={{ marginBottom: 8 }}>
        <span className="pill accent">{job.job_type_label}</span>
        <span className="pill">{job.category}</span>
        {job.salary && <span className="pill">{job.salary}</span>}
      </div>

      <div className="detail-body">
        <h2>About this role</h2>
        <p style={{ whiteSpace: 'pre-line' }}>{description || 'No description was provided for this listing.'}</p>

        {job.tags && job.tags.length > 0 && (
          <>
            <h2>Skills & tags</h2>
            <div className="job-meta-row">
              {job.tags.map((tag) => (
                <span key={tag} className="pill">{tag}</span>
              ))}
            </div>
          </>
        )}

        <h2>Want a CV built for this role?</h2>
        <p>
          <Link to={`/cv-enhancer?jobId=${job.id}`}>Tailor your CV to this listing</Link>
        </p>
      </div>
    </div>
  )
}
