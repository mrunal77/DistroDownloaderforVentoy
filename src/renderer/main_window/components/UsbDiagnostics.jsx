import React, { useState, useEffect, useCallback } from 'react'

function formatBytes (b) {
  if (b == null) return 'N/A'
  const gb = b / 1e9
  if (gb >= 1) return gb.toFixed(1) + ' GB'
  const mb = b / 1e6
  return mb.toFixed(0) + ' MB'
}

export default function UsbDiagnostics () {
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.ventoy.usbDiagnostics()
      setDrives(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load diagnostics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 16, fontWeight: 500 }}>Scanning USB devices...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#dc2626' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Diagnostics failed</div>
        <div style={{ fontSize: 13 }}>{error}</div>
        <button onClick={load} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 6, background: 'rgba(220,38,38,0.15)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.3)', cursor: 'pointer', fontSize: 13 }}>Retry</button>
      </div>
    )
  }

  if (drives.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>💾</div>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No USB drives detected</div>
        <div style={{ fontSize: 13 }}>Connect a USB drive and click Refresh.</div>
        <button onClick={load} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', color: '#e6eef8', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 13 }}>Rescan</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>USB Diagnostics</h2>
        <button onClick={load} style={{ padding: '8px 14px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', color: '#e6eef8', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 13 }}>
          Rescan
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {drives.map((drive, i) => {
          const confidenceColor = drive.ventoyConfidence === 'high' ? '#059669' :
                                  drive.ventoyConfidence === 'medium' ? '#d97706' :
                                  drive.ventoyConfidence === 'low' ? '#d97706' : '#64748b'
          return (
            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>💾</span>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{drive.model || drive.name || drive.device}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: confidenceColor, background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: 4, fontWeight: 500 }}>
                  {drive.ventoyConfidence.toUpperCase()}
                </span>
              </div>
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, fontSize: 13 }}>
                <div><span style={{ color: '#64748b' }}>Device:</span> {drive.device}</div>
                <div><span style={{ color: '#64748b' }}>Name:</span> {drive.name}</div>
                <div><span style={{ color: '#64748b' }}>Vendor:</span> {drive.vendor || 'N/A'}</div>
                <div><span style={{ color: '#64748b' }}>Model:</span> {drive.model || 'N/A'}</div>
                <div><span style={{ color: '#64748b' }}>Serial:</span> {drive.serial || 'N/A'}</div>
                <div><span style={{ color: '#64748b' }}>Transport:</span> {drive.transport || 'N/A'}</div>
                <div><span style={{ color: '#64748b' }}>Removable:</span> {drive.removable ? 'Yes' : 'No'}</div>
                <div><span style={{ color: '#64748b' }}>Size:</span> {formatBytes(drive.size)}</div>
                {drive.stableId && (
                  <>
                    <div><span style={{ color: '#64748b' }}>Stable ID:</span> {drive.stableId.byId || 'N/A'}</div>
                    <div><span style={{ color: '#64748b' }}>USB Port:</span> {drive.usbPortPath || 'N/A'}</div>
                  </>
                )}
              </div>

              <div style={{ padding: 16, fontSize: 13, color: confidenceColor, fontWeight: 500 }}>
                {drive.isVentoy ? 'Ventoy detected' : 'Normal USB drive — Ventoy not detected'}
                {drive.ventoyVersion && <span style={{ marginLeft: 8, color: '#9aa7bd' }}>Version: {drive.ventoyVersion}</span>}
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Partitions</div>
                {drive.partitions.length === 0 && (
                  <div style={{ padding: '0 16px 16px', fontSize: 13, color: '#64748b' }}>No partitions found.</div>
                )}
                {drive.partitions.map((p, pi) => (
                  <div key={pi} style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, fontSize: 13 }}>
                    <div><span style={{ color: '#64748b' }}>Device:</span> {p.device}</div>
                    <div><span style={{ color: '#64748b' }}>Number:</span> {p.number}</div>
                    <div><span style={{ color: '#64748b' }}>Size:</span> {formatBytes(p.size)}</div>
                    <div><span style={{ color: '#64748b' }}>FS:</span> {p.filesystem || 'N/A'}</div>
                    <div><span style={{ color: '#64748b' }}>Label:</span> {p.label || 'N/A'}</div>
                    <div><span style={{ color: '#64748b' }}>UUID:</span> {p.uuid || 'N/A'}</div>
                    <div><span style={{ color: '#64748b' }}>PartLabel:</span> {p.partLabel || 'N/A'}</div>
                    <div><span style={{ color: '#64748b' }}>Mount:</span> {p.mountPoints.length > 0 ? p.mountPoints.join(', ') : 'Not mounted'}</div>
                  </div>
                ))}
              </div>

              {drive.storage && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, fontSize: 13 }}>
                  <div><span style={{ color: '#64748b' }}>Total:</span> {formatBytes(drive.storage.total)}</div>
                  <div><span style={{ color: '#64748b' }}>Used:</span> {formatBytes(drive.storage.used)}</div>
                  <div><span style={{ color: '#64748b' }}>Available:</span> {formatBytes(drive.storage.available)}</div>
                  <div><span style={{ color: '#64748b' }}>Used %:</span> {drive.storage.percentUsed}%</div>
                </div>
              )}

              {drive.ventoyMetadata && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: 16, fontSize: 13 }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Ventoy Metadata (Read-Only)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                    <div><span style={{ color: '#64748b' }}>Verified:</span> {drive.ventoyMetadata.verified ? '✓ Yes' : '✗ No'}</div>
                    <div><span style={{ color: '#64748b' }}>Reason:</span> {drive.ventoyMetadata.reason || 'N/A'}</div>
                    <div><span style={{ color: '#64748b' }}>MBR Signature:</span> {drive.ventoyMetadata.mbrSignature ? '✓ Valid' : '✗ Not found'}</div>
                    <div><span style={{ color: '#64748b' }}>Stage2 Signature:</span> {drive.ventoyMetadata.stage2Signature ? '✓ Valid' : '✗ Not found'}</div>
                    <div><span style={{ color: '#64748b' }}>Partition Structure:</span> {drive.ventoyMetadata.partitionStructureValid ? '✓ Valid' : '✗ Invalid'}</div>
                    {drive.ventoyMetadata.ventoyConfig && (
                      <div><span style={{ color: '#64748b' }}>Config Version:</span> {drive.ventoyMetadata.ventoyConfig.version || 'N/A'}</div>
                    )}
                    {drive.ventoyMetadata.version && (
                      <div><span style={{ color: '#64748b' }}>Extracted Version:</span> {drive.ventoyMetadata.version}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
