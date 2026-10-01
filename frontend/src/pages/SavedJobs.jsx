import React from 'react'
import { useJobs } from '../context/JobsContext.jsx'
import { getSavedIds } from '../context/SavedJobsContext.js'
import JobCard from '../components/JobCard.jsx'
import Loader from '../components/Loader.jsx'
import EmptyState from '../components/EmptyState.jsx'

export default function SavedJobs() {
  const { jobs, loading } = useJobs()
  const savedIds = getSavedIds()
  const savedJobs = jobs.filter((job) => savedIds.includes(String(job.id)))

  return (
    <div className="container">
      <div className="page-head">
        <h1>Saved jobs</h1>
        <p>Roles you've bookmarked, kept in this browser so they're here next time you visit.</p>
      </div>

      {loading && <Loader label="Loading your saved jobs…" />}

      {!loading && savedJobs.length === 0 && (
        <EmptyState
          title="You haven't saved any jobs yet"
          message="Open a listing and select 'Save job' to keep it here."
        />
      )}

      {!loading && savedJobs.length > 0 && (
        <div className="job-grid">
          {savedJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
