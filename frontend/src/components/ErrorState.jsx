import React from 'react'

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="state-block error">
      <p style={{ margin: 0, fontWeight: 600 }}>Couldn't load this.</p>
      <p style={{ margin: '6px 0 16px' }}>{message}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>Try again</button>
      )}
    </div>
  )
}
