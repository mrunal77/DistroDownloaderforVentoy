import React from 'react'

const categories = ['All', 'Popular', 'Desktop', 'Gaming', 'Security', 'Server', 'Lightweight', 'Privacy']

export default function CategoryFilter ({ selected, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {categories.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{
            padding: '8px 16px',
            borderRadius: 20,
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            background: selected === c ? '#2563eb' : 'rgba(255,255,255,0.06)',
            color: selected === c ? 'white' : '#9aa7bd',
            transition: 'all 0.15s'
          }}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
