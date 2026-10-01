import React from 'react'
import { Link } from 'react-router-dom'
import CompanyLogo from './CompanyLogo.jsx'
import { snippet } from '../utils/text.js'

export default function JobCard({ job }) {
  const summary = snippet(job.description, 120)

  return (
    <Link to={`/jobs/${job.id}`} className="job-card">
      <div className="job-card-top">
        <CompanyLogo name={job.company_name} logo={job.company_logo} />
        <div>
          <span className="company">{job.company_name}</span>
          <h3>{job.title}</h3>
        </div>
      </div>
      {summary && <p className="job-snippet">{summary}</p>}
      <div className="job-meta-row">
        <span className="pill remote">Remote</span>
        <span className="pill accent">{job.job_type_label}</span>
        <span className="pill">{job.candidate_required_location}</span>
      </div>
      <div className="job-card-foot">
        <span>{job.category}</span>
        <span>{job.source}</span>
      </div>
    </Link>
  )
}