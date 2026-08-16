import React from 'react'

export default function AboutPage () {
  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 600 }}>About</h2>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 48 }}>🐧</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Ventoy Distro Downloader</div>
            <div style={{ fontSize: 13, color: '#9aa7bd' }}>Version 0.3.0</div>
          </div>
        </div>

        <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>
          An Electron + React desktop app for downloading Linux distribution ISOs directly to Ventoy USB drives.
          It features real USB detection, Ventoy metadata verification, SHA-256 checksum validation, and a concurrent download queue.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>License</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>MIT</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Framework</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Electron + React</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Language</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>TypeScript / JavaScript</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Tests</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>77 passing (unit + integration + security)</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, color: '#9aa7bd' }}>
            <span style={{ color: '#64748b' }}>Source:</span>{' '}
            <a href="https://github.com/anomalyco/DistroDownloaderforVentoy" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>
              github.com/anomalyco/DistroDownloaderforVentoy
            </a>
          </div>
          <div style={{ fontSize: 13, color: '#9aa7bd' }}>
            <span style={{ color: '#64748b' }}>Report issues:</span>{' '}
            <a href="https://github.com/anomalyco/DistroDownloaderforVentoy/issues" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>
              GitHub Issues
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
