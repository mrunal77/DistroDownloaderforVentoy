import React from 'react'

export default function DownloadQueue ({ activeDownload, progressMap, onCancel }) {
  const active = progressMap[activeDownload?.downloadId] || (activeDownload && { ...activeDownload, progress: 0, eta: '0s' })

  const formatSpeed = (b) => {
    if (!b) return '0 MB/s'
    const mbps = b / 1024 / 1024
    return mbps.toFixed(1) + ' MB/s'
  }

  if (!activeDownload) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📥</div>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>No active downloads</div>
        <div style={{ fontSize: 13 }}>Browse the dashboard and download ISOs to get started.</div>
      </div>
    )
  }

  const percent = active.progress != null ? Math.min(100, Math.round(active.progress)) : 0

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 600 }}>Active Download</h2>
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 32 }}>🐧</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{activeDownload.distro?.name || 'Downloading...'}</div>
            <div style={{ fontSize: 12, color: '#9aa7bd' }}>{activeDownload.mountPath}</div>
          </div>
        </div>

        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ height: '100%', width: `${percent}%`, background: '#2563eb', borderRadius: 4, transition: 'width 0.2s' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9aa7bd', marginBottom: 16 }}>
          <span>{percent}%</span>
          <span>Speed: {formatSpeed(active.speed || 0)}</span>
          <span>ETA: {active.eta || '...'}</span>
          <span>Size: {active.size ? (active.size / 1e9).toFixed(1) + ' GB' : '...'}</span>
        </div>

        {active.error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            {active.error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => onCancel(activeDownload.downloadId)} style={{ padding: '8px 16px', borderRadius: 6, background: 'rgba(220,38,38,0.15)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.3)', cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
