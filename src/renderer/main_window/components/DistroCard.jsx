import React from 'react'

export default function DistroCard ({ distro, onDownload }) {
  const sizeGB = distro.size ? (distro.size / 1e9).toFixed(1) : '?'
  const version = distro.version || 'Latest'
  const desktop = distro.desktop || distro.editions?.[0]?.desktop || 'N/A'
  const arch = (distro.architectures && distro.architectures[0]) || distro.arch || 'x86_64'

  return (
    <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, transition: 'all 0.15s' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <img src={distro.logo || distro.groupLogo} alt={distro.name} style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(255,255,255,0.05)', padding: 4 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{distro.name}</div>
          <div style={{ fontSize: 12, color: '#9aa7bd', lineHeight: 1.4 }}>
            {version} • {desktop} • {arch}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: 4 }}>{sizeGB} GB</span>
          {distro.checksum && (
            <span style={{ fontSize: 11, color: '#059669', background: 'rgba(5,150,105,0.1)', padding: '2px 6px', borderRadius: 4 }}>✓ Checksum</span>
          )}
        </div>
        <button
          onClick={onDownload}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            background: '#2563eb',
            color: 'white',
            transition: 'all 0.15s'
          }}
        >
          Download
        </button>
      </div>
    </div>
  )
}
