import React, { useMemo, useState } from 'react'
import { useJobs } from '../context/JobsContext.jsx'
import JobCard from '../components/JobCard.jsx'
import Loader from '../components/Loader.jsx'
import ErrorState from '../components/ErrorState.jsx'
import EmptyState from '../components/EmptyState.jsx'

const CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'software-dev', label: 'Software development' },
  { value: 'customer-service', label: 'Customer service' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales-business', label: 'Sales & business' },
  { value: 'data', label: 'Data' },
  { value: 'writing', label: 'Writing' },
  { value: 'product', label: 'Product' },
  { value: 'hr', label: 'HR' },
]

export default function JobList() {
  const { jobs, loading, error, reload } = useJobs()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const term = search.toLowerCase()
      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(term) ||
        job.company_name.toLowerCase().includes(term) ||
        (job.candidate_required_location || '').toLowerCase().includes(term) ||
        (job.tags || []).some((t) => t.toLowerCase().includes(term))
      const matchesCategory = !category || job.category_slug === category
      return matchesSearch && matchesCategory
    })
  }, [jobs, search, category])

  return (
    <>
      <div className="hero">
        <div className="container hero-inner">
          <h1>Real remote jobs, right now</h1>
          <p>Live listings pulled straight from real job boards. Search, filter, and open any role to see the full posting, then tailor your CV to it in one click.</p>
          <div className="hero-stats">
            <div className="hero-stat">
              <strong>{loading ? '—' : jobs.length}</strong>
              <span>open roles today</span>
            </div>
            <div className="hero-stat">
              <strong>{CATEGORIES.length - 1}</strong>
              <span>categories</span>
            </div>
            <div className="hero-stat">
              <strong>Worldwide</strong>
              <span>remote-first</span>
            </div>
          </div>
          <p className="hero-note">
            Every role here is tagged "Remote" and pulled live from two real, official sources — Remotive and
            We Work Remotely — with no fake or made-up listings. Where a location says "Worldwide" or "Anywhere
            in the World," anyone anywhere can apply; other roles restrict to specific countries, shown on their
            location tag, so check each listing before applying.
          </p>
        </div>
      </div>

      <div className="container">
      <div className="list-layout">
        <aside className="filters">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="text"
            placeholder="Title, company, skill, or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '6px 2px 0' }}>
            Tip: type a place like "Pakistan" or "Worldwide" to find remote roles open to that location.
          </p>
          <label htmlFor="category">Category</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </aside>

        <div>
          {loading && <Loader />}
          {!loading && error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && (
            <>
              <p className="results-count">{filtered.length} open role{filtered.length === 1 ? '' : 's'}</p>
              {filtered.length === 0 ? (
                <EmptyState
                  title="No roles match those filters"
                  message="Try a broader search term or clear the category filter. Note: location search only finds roles that explicitly list that place as remote-eligible — this board doesn't include onsite jobs."
                />
              ) : (
                <div className="job-grid">
                  {filtered.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </>
  )
}