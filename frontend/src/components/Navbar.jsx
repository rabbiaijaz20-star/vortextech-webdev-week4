import React from 'react'
import { NavLink } from 'react-router-dom'

export function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#24463b" />
      <path d="M6 24 L14 11 L19 19 L22 15 L26 24 Z" fill="#f7f2e9" />
      <circle cx="23" cy="9" r="3" fill="#c4903f" />
    </svg>
  )
}

export default function Navbar() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <NavLink to="/" className="wordmark">
          <LogoMark />
          <span className="wordmark-text">
            <span className="wordmark-name">Smart<span>Apply</span></span>
            <span className="wordmark-tag">Remote jobs, tailored CVs</span>
          </span>
        </NavLink>
        <ul className="nav-links">
          <li><NavLink to="/" end className={({isActive}) => isActive ? 'active' : ''}>Browse jobs</NavLink></li>
          <li><NavLink to="/saved" className={({isActive}) => isActive ? 'active' : ''}>Saved</NavLink></li>
          <li><NavLink to="/punjab-jobs" className={({isActive}) => isActive ? 'active' : ''}>Punjab jobs</NavLink></li>
          <li><NavLink to="/cv-enhancer" className={({isActive}) => isActive ? 'active' : ''}>Tailor my CV</NavLink></li>
        </ul>
      </div>
    </header>
  )
}