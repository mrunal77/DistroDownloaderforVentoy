import React, { useEffect, useState } from 'react'

export default function VentoyCard ({ drive, onRefresh, scanning }) {
  const [storage, setStorage] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function loadStorage () {
      if (!drive || !drive.ventoyDataPath) {
        setStorage(null)
        return
      }
      try {
        const info = await window.ventoy.getStorageInfo(drive.ventoyDataPath)
        if (!cancelled) setStorage(info)
      } catch (_e) {
        if (!cancelled) setStorage(null)
      }
    }
    loadStorage()
    return () => { cancelled = true }
  }, [drive])

  if (!drive) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 48, opacity: 0.6 }}>💾</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No USB Drive Detected</div>
          <div style={{ fontSize: 13, color: '#9aa7bd' }}>Insert a USB drive and click Refresh to detect it.</div>
        </div>
      </div>
    )
  }

  const confidenceLabel = drive.ventoyConfidence === 'high' ? '🟢 Ventoy Drive Detected — Verified' :
                         drive.ventoyConfidence === 'medium' ? '🟡 Ventoy-like Drive — Verification incomplete' :
                         drive.ventoyConfidence === 'low' ? '🟡 Possible Ventoy Drive' :
                         drive.isVentoy ? '🟡 Possible Ventoy Drive' : '⚪ USB Drive — Ventoy not detected'
  const confidenceColor = drive.ventoyConfidence === 'high' ? '#059669' :
                          drive.ventoyConfidence === 'medium' ? '#d97706' :
                          drive.ventoyConfidence === 'low' ? '#d97706' : '#64748b'

  const formatBytes = (b) => {
    if (b == null) return 'N/A'
    const gb = b / 1e9
    if (gb >= 1) return gb.toFixed(1) + ' GB'
    const mb = b / 1e6
    return mb.toFixed(0) + ' MB'
  }

  const mounted = drive.ventoyDataPath && Array.isArray(drive.partitions) && drive.partitions.some(p => p.mountPoints && p.mountPoints.length > 0)

  return (
    <div style={{
      background: drive.ventoyConfidence === 'high' ? 'linear-gradient(135deg, rgba(5,150,105,0.08), rgba(5,150,105,0.02))' :
                  drive.ventoyConfidence === 'medium' ? 'linear-gradient(135deg, rgba(217,119,6,0.08), rgba(217,119,6,0.02))' :
                  'rgba(255,255,255,0.02)',
      border: `1px solid ${drive.ventoyConfidence === 'high' ? 'rgba(5,150,105,0.2)' : drive.ventoyConfidence === 'medium' ? 'rgba(217,119,6,0.2)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 12, padding: 24
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 48 }}>💾</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {drive.model || drive.name}
            {drive.ventoyConfidence === 'high' && <span style={{ background: '#059669', color: 'white', fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>Verified</span>}
            {drive.ventoyConfidence === 'medium' && <span style={{ background: '#d97706', color: 'white', fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>Incomplete</span>}
          </div>
          <div style={{ fontSize: 13, color: confidenceColor, marginBottom: 8, fontWeight: 500 }}>{confidenceLabel}</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, fontSize: 13, color: '#9aa7bd' }}>
            <div><span style={{ color: '#64748b' }}>Device:</span> {drive.device}</div>
            {drive.serial && <div><span style={{ color: '#64748b' }}>Serial:</span> {drive.serial}</div>}
            <div><span style={{ color: '#64748b' }}>Transport:</span> {drive.transport || 'USB'}</div>
            <div><span style={{ color: '#64748b' }}>Size:</span> {formatBytes(drive.size)}</div>
            {drive.ventoyVersion && <div><span style={{ color: '#64748b' }}>Version:</span> {drive.ventoyVersion}</div>}
            {drive.ventoyDataPath && <div><span style={{ color: '#64748b' }}>Data partition:</span> {drive.ventoyDataPath}</div>}
            {drive.ventoyBootPath && <div><span style={{ color: '#64748b' }}>EFI partition:</span> {drive.ventoyBootPath}</div>}
            {mounted ? (
              <div style={{ color: '#059669' }}>🟢 Mounted</div>
            ) : drive.ventoyDataPath ? (
              <div style={{ color: '#d97706' }}>🟡 Not mounted</div>
            ) : (
              <div style={{ color: '#64748b' }}>No data partition detected</div>
            )}
            {storage && (
              <>
                <div><span style={{ color: '#64748b' }}>Total:</span> {formatBytes(storage.total)}</div>
                <div><span style={{ color: '#64748b' }}>Free:</span> {formatBytes(storage.available)}</div>
                <div><span style={{ color: '#64748b' }}>Used:</span> {storage.percentUsed}%</div>
              </>
            )}
            {!storage && drive.ventoyDataPath && (
              <div style={{ color: '#64748b' }}>Storage info unavailable</div>
            )}
          </div>

          {drive.ventoyMetadataReason && drive.ventoyConfidence !== 'high' && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#9aa7bd', fontStyle: 'italic' }}>
              {drive.ventoyMetadataReason}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={onRefresh}
            disabled={scanning}
            style={{ padding: '8px 14px', borderRadius: 6, background: scanning ? 'rgba(255,255,255,0.04)' : 'rgba(37,99,235,0.2)', color: scanning ? '#64748b' : '#60a5fa', border: '1px solid rgba(37,99,235,0.3)', cursor: scanning ? 'not-allowed' : 'pointer', fontSize: 13 }}
          >
            {scanning ? 'Scanning...' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  )
}
