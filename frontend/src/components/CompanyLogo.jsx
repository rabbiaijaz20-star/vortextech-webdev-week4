import React, { useState } from 'react'

const COLORS = ['#24463b', '#c4903f', '#7a4b3a', '#4f5d3a', '#8a5a2b']

function colorFor(name) {
  let hash = 0
  const str = name || '?'
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

// Shows the company's real logo; falls back to a colored initial if missing or broken.
export default function CompanyLogo({ name, logo, size = 40 }) {
  const [failed, setFailed] = useState(false)
  const initial = (name || '?').trim().charAt(0).toUpperCase()

  if (logo && !failed) {
    return (
      <span className="avatar avatar-img" style={{ width: size, height: size }}>
        <img src={logo} alt={`${name} logo`} onError={() => setFailed(true)} loading="lazy" />
      </span>
    )
  }
  return (
    <span className="avatar" style={{ background: colorFor(name), width: size, height: size }}>
      {initial}
    </span>
  )
}
