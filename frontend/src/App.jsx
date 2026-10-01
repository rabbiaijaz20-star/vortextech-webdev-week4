import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import JobList from './pages/JobList.jsx'
import JobDetail from './pages/JobDetail.jsx'
import SavedJobs from './pages/SavedJobs.jsx'
import CvEnhancer from './pages/CvEnhancer.jsx'
import PunjabJobs from './pages/PunjabJobs.jsx'

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<JobList />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/saved" element={<SavedJobs />} />
          <Route path="/cv-enhancer" element={<CvEnhancer />} />
          <Route path="/punjab-jobs" element={<PunjabJobs />} />
        </Routes>
      </main>
      <footer className="footer">
        SmartApply helps you find remote work and tailor your CV to each role with AI.<br />
        Job listings courtesy of <a href="https://remotive.com" target="_blank" rel="noreferrer">Remotive</a>. Built for the VortexTech Web Development Internship.
      </footer>
    </>
  )
}