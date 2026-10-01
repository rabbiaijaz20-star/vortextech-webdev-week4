import React from 'react'

export default function EmptyState({ title = 'Nothing here yet', message }) {
  return (
    <div className="state-block">
      <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink)' }}>{title}</p>
      {message && <p style={{ margin: '6px 0 0' }}>{message}</p>}
    </div>
  )
}
