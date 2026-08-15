import React, { useState, useEffect } from 'react'

export default function SettingsPage () {
  const [downloadDir, setDownloadDir] = useState('~/Downloads')
  const [concurrency, setConcurrency] = useState(2)
  const [autoVerify, setAutoVerify] = useState(true)
  const [retryCount, setRetryCount] = useState(3)

  useEffect(() => {
    ;(async () => {
      try {
        const saved = await window.ventoy.getSettings()
        if (saved) {
          setDownloadDir(saved.downloadDir || '~/Downloads')
          setConcurrency(saved.concurrency || 2)
          setAutoVerify(saved.autoVerify ?? true)
          setRetryCount(saved.retryCount || 3)
        }
      } catch (e) {
        console.error('getSettings failed', e)
      }
    })()
  }, [])

  const saveSettings = async () => {
    try {
      await window.ventoy.setSettings({ downloadDir, concurrency, autoVerify, retryCount })
      alert('Settings saved')
    } catch (e) {
      alert('Failed to save settings: ' + e.message)
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 600 }}>Settings</h2>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, color: '#9aa7bd', marginBottom: 6 }}>Download Directory</label>
          <input value={downloadDir} onChange={e => setDownloadDir(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: '#1e293b', color: '#e6eef8', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', fontSize: 14 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#9aa7bd', marginBottom: 6 }}>Concurrent Downloads</label>
            <input type="number" min={1} max={4} value={concurrency} onChange={e => setConcurrency(Number(e.target.value))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: '#1e293b', color: '#e6eef8', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', fontSize: 14 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#9aa7bd', marginBottom: 6 }}>Retry Count</label>
            <input type="number" min={0} max={10} value={retryCount} onChange={e => setRetryCount(Number(e.target.value))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: '#1e293b', color: '#e6eef8', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', fontSize: 14 }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Auto-verify checksums</div>
            <div style={{ fontSize: 12, color: '#9aa7bd' }}>Verify SHA-256 after download completes.</div>
          </div>
          <button onClick={() => setAutoVerify(v => !v)} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: autoVerify ? '#2563eb' : 'rgba(255,255,255,0.06)', color: 'white', cursor: 'pointer', fontSize: 13 }}>
            {autoVerify ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={saveSettings} style={{ padding: '10px 18px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
