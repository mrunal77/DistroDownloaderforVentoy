import React from 'react'

export default function Header ({ selectedDrive, drives, onSelectDrive, onRefresh, onNavigate, currentView, scanning }) {
  return (
    <div style={{ height: 64, background: '#0b1220', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Ventoy Distro Downloader</h1>
        <span style={{ fontSize: 12, color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: 4 }}>Download • Verify • Copy to Ventoy</span>
        {scanning && (
          <span style={{ fontSize: 12, color: '#fbbf24', background: 'rgba(217,119,6,0.1)', padding: '4px 8px', borderRadius: 4 }}>🔍 Scanning...</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <select
          value={selectedDrive ? (selectedDrive.ventoyDataPath || selectedDrive.mountPath || selectedDrive.device) : ''}
          onChange={(e) => {
            const found = drives.find(d => (d.ventoyDataPath || d.mountPath || d.device) === e.target.value)
            onSelectDrive(found)
          }}
          style={{ padding: '8px 12px', borderRadius: 6, background: '#1e293b', color: '#e6eef8', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, minWidth: 280 }}
        >
          <option value="">No drive selected</option>
          {drives.map(d => {
            const val = d.ventoyDataPath || d.mountPath || d.device
            const label = d.ventoyConfidence === 'high' ? '🟢 Ventoy' :
                          d.ventoyConfidence === 'medium' ? '🟡 Ventoy-like' :
                          d.isVentoy ? '🟡 Possible Ventoy' : '⚪ USB'
            return (
              <option key={d.device} value={val}>
                {label} {d.model || d.name} — {val}
              </option>
            )
          })}
        </select>

        <button
          onClick={onRefresh}
          disabled={scanning}
          style={{ padding: '8px 12px', borderRadius: 6, background: scanning ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)', color: scanning ? '#64748b' : '#e6eef8', border: '1px solid rgba(255,255,255,0.1)', cursor: scanning ? 'not-allowed' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ↻ Refresh
        </button>

        <button
          onClick={() => onNavigate('settings')}
          style={{ padding: '8px 12px', borderRadius: 6, background: currentView === 'settings' ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.08)', color: currentView === 'settings' ? '#60a5fa' : '#e6eef8', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 13 }}
        >
          ⚙ Settings
        </button>
      </div>
    </div>
  )
}
