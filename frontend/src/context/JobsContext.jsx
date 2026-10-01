import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { fetchJobs } from '../api/client'

const JobsContext = createContext(null)

export function JobsProvider({ children }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchJobs(filters)
      setJobs(data.jobs || [])
    } catch (err) {
      setError(err.message || 'Something went wrong while loading jobs.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const getJobById = useCallback(
    (id) => jobs.find((job) => String(job.id) === String(id)),
    [jobs]
  )

  return (
    <JobsContext.Provider value={{ jobs, loading, error, reload: load, getJobById }}>
      {children}
    </JobsContext.Provider>
  )
}

export function useJobs() {
  const ctx = useContext(JobsContext)
  if (!ctx) throw new Error('useJobs must be used within JobsProvider')
  return ctx
}
