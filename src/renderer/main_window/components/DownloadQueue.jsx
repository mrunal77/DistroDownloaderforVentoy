import React from 'react'

export default function DownloadQueue ({ downloadMap, progressMap, queueState, onCancel, onSetConcurrency }) {
  const downloadIds = Object.keys(downloadMap)
  const hasActive = downloadIds.length > 0

  const formatSpeed = (b) => {
    if (!b) return '0 MB/s'
    const mbps = b / 1024 / 1024
    return mbps.toFixed(1) + ' MB/s'
  }

  if (!hasActive) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📥</div>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>No active downloads</div>
        <div style={{ fontSize: 13 }}>Browse the dashboard and download ISOs to get started.</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
          Downloads ({downloadIds.length} active)
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#9aa7bd' }}>Concurrency:</span>
          <select
            value={queueState.concurrency}
            onChange={(e) => onSetConcurrency && onSetConcurrency(Number(e.target.value))}
            style={{ padding: '6px 10px', borderRadius: 6, background: '#1e293b', color: '#e6eef8', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13 }}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {downloadIds.map((downloadId) => {
          const dl = downloadMap[downloadId]
          const progress = progressMap[downloadId] || {}
          const percent = progress.percentage != null ? Math.min(100, Math.round(progress.percentage)) : 0

          return (
            <div key={downloadId} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 32 }}>🐧</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{dl.distro?.name || 'Downloading...'}</div>
                  <div style={{ fontSize: 12, color: '#9aa7bd' }}>{dl.mountPath}</div>
                </div>
                <button
                  onClick={() => onCancel(downloadId)}
                  style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(220,38,38,0.1)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer', fontSize: 12 }}
                >
                  Cancel
                </button>
              </div>

              <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', width: `${percent}%`, background: '#2563eb', borderRadius: 4, transition: 'width 0.2s' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9aa7bd', marginBottom: 8 }}>
                <span>{percent}%</span>
                <span>Speed: {formatSpeed(progress.downloadSpeedBytesPerSec || 0)}</span>
                <span>ETA: {progress.etaSeconds != null ? progress.etaSeconds + 's' : '...'}</span>
                <span>Size: {progress.totalBytes ? (progress.totalBytes / 1e9).toFixed(1) + ' GB' : '...'}</span>
              </div>

              {progress.error && (
                <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5', padding: 10, borderRadius: 8, fontSize: 13 }}>
                  {progress.error}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}