import React from 'react'

export default function DriveSelector ({ drives = [], selected, onSelect, onRefresh }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select
        value={selected ? (selected.ventoyDataPath || selected.mountPath) : ''}
        onChange={(e) => {
          const found = drives.find(d => (d.ventoyDataPath || d.mountPath) === e.target.value)
          onSelect(found)
        }}
        style={{ padding: 8, borderRadius: 6, background: '#021026', color: '#e6eef8', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <option value="">No drive selected</option>
        {drives.map(d => (
          <option key={d.devicePath || d.mountPath} value={d.ventoyDataPath || d.mountPath}>
            {(d.ventoyDataPath ? '🟢 Ventoy — ' : '🔵 ')}{d.model || d.name} — {d.ventoyDataPath || d.mountPath}
          </option>
        ))}
      </select>
      <button className="button button-secondary" onClick={onRefresh}>Refresh</button>
    </div>
  )
}
