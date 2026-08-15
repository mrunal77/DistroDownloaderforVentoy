import React from 'react'

export default function DownloadProgressDock ({ active, progress, onCancel }) {
  if (!active) return null
  const p = progress || {}
  const percentage = p.percentage != null ? Math.round(p.percentage) : 0
  const speedMB = p.downloadSpeedBytesPerSec ? (p.downloadSpeedBytesPerSec / (1024 * 1024)).toFixed(2) : '0.00'
  const eta = p.etaSeconds != null ? p.etaSeconds : null
  const totalGB = p.totalBytes ? (p.totalBytes / (1024 * 1024 * 1024)).toFixed(2) : '?'
  const transferredGB = p.transferredBytes ? (p.transferredBytes / (1024 * 1024 * 1024)).toFixed(2) : '0.00'

  return (
    <div className="bottom-dock">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{active.distro.name}</div>
          <div className="small">To: {active.mountPath} / {active.distro.fileName || active.release?.iso_name || 'downloading...'}</div>
          {p.sha256 && <div className="small">SHA256: {p.sha256.substring(0, 16)}...</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700 }}>{speedMB} MB/s</div>
            <div className="small">{transferredGB} / {totalGB} GB</div>
            <div className="small">ETA: {eta != null ? eta + 's' : '—'}</div>
          </div>
          <div>
            <button className="button button-danger" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="progress"><i style={{ width: Math.min(100, percentage) + '%' }}></i></div>
        <div className="small" style={{ marginTop: 6 }}>{percentage}%</div>
      </div>
    </div>
  )
}
