import React from 'react'

// Real Rozee.pk city search pages (Pakistan's largest job board).
// Outpost's own data source (Remotive) is remote-only and has no Pakistan
// city/province data, so onsite Punjab jobs are provided as direct links
// to Rozee.pk instead of pretending we have structured local job data.
const PUNJAB_CITIES = [
  { name: 'Lahore', url: 'https://www.rozee.pk/jobs-in-lahore' },
  { name: 'Rawalpindi', url: 'https://www.rozee.pk/jobs-in-rawalpindi' },
  { name: 'Faisalabad', url: 'https://www.rozee.pk/jobs-in-faisalabad' },
  { name: 'Multan', url: 'https://www.rozee.pk/jobs-in-multan' },
  { name: 'Gujranwala', url: 'https://www.rozee.pk/jobs-in-gujranwala' },
  { name: 'Sialkot', url: 'https://www.rozee.pk/jobs-in-sialkot' },
  { name: 'Sargodha', url: 'https://www.rozee.pk/jobs-in-sargodha' },
  { name: 'Gujrat', url: 'https://www.rozee.pk/jobs-in-gujrat' },
  { name: 'Sheikhupura', url: 'https://www.rozee.pk/jobs-in-sheikhupura' },
  { name: 'Bahawalpur', url: 'https://www.rozee.pk/jobs-in-bahawalpur' },
  { name: 'Sahiwal', url: 'https://www.rozee.pk/jobs-in-sahiwal' },
]

export default function PunjabJobs() {
  return (
    <div className="container">
      <div className="page-head">
        <h1>Onsite jobs in Punjab</h1>
        <p>
          Outpost's own listings (above, via Remotive) are remote-only and global, so they don't
          cover onsite jobs by city. For onsite roles in Punjab, these links open live search
          results on Rozee.pk, Pakistan's largest job board, filtered to each city.
        </p>
      </div>

      <div className="job-grid">
        {PUNJAB_CITIES.map((city) => (
          <a key={city.name} href={city.url} target="_blank" rel="noreferrer" className="job-card">
            <div className="job-card-top">
              <span className="avatar" style={{ background: 'var(--green)' }}>
                {city.name.charAt(0)}
              </span>
              <div>
                <span className="company">Rozee.pk</span>
                <h3>Jobs in {city.name}</h3>
              </div>
            </div>
            <p className="job-snippet">Open live, onsite job listings for {city.name} on Rozee.pk.</p>
          </a>
        ))}
      </div>
    </div>
  )
}
