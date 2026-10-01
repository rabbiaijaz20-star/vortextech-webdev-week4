import React from 'react'

export default function Loader({ label = 'Loading jobs…' }) {
  return (
    <div className="state-block">
      <div className="spinner" />
      {label}
    </div>
  )
}
