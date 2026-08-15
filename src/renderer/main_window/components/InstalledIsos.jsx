import React from 'react'

export default function InstalledIsos ({ isos, selectedDrive, onDelete, onScan }) {
  if (!selectedDrive) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>💿</div>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>No drive selected</div>
        <div style={{ fontSize: 13 }}>Select a Ventoy drive from the header to view installed ISOs.</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Installed ISOs</h2>
        <button onClick={onScan} style={{ padding: '8px 14px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', color: '#e6eef8', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 13 }}>
          Rescan
        </button>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left' }}>
              <th style={{ padding: 12, color: '#9aa7bd', fontWeight: 500 }}>ISO</th>
              <th style={{ padding: 12, color: '#9aa7bd', fontWeight: 500 }}>Path</th>
              <th style={{ padding: 12, color: '#9aa7bd', fontWeight: 500, textAlign: 'right' }}>Size</th>
              <th style={{ padding: 12, color: '#9aa7bd', fontWeight: 500, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isos.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No ISOs found on the selected Ventoy drive.</td>
              </tr>
            )}
            {isos.map((iso, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: 12, fontWeight: 500 }}>{iso.fileName}</td>
                <td style={{ padding: 12, color: '#9aa7bd', fontSize: 12 }}>{iso.path}</td>
                <td style={{ padding: 12, textAlign: 'right', color: '#9aa7bd' }}>{iso.size ? (iso.size / 1e9).toFixed(1) + ' GB' : 'N/A'}</td>
                <td style={{ padding: 12, textAlign: 'right' }}>
                  <button onClick={() => onDelete(iso.fileName)} style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(220,38,38,0.1)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer', fontSize: 12 }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
