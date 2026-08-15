import React from 'react'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'downloads', label: 'Downloads', icon: '📥', showBadge: true },
  { id: 'installed', label: 'Installed ISOs', icon: '💿' },
  { id: 'activity', label: 'Activity', icon: '📋' },
  { id: 'diagnostics', label: 'USB Diagnostics', icon: '🔍' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
  { id: 'about', label: 'About', icon: 'ℹ' }
]

export default function Sidebar ({ currentView, onNavigate, installedCount, downloadCount }) {
  return (
    <div style={{ width: 240, background: '#0b1220', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🐧</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>Ventoy Distro</div>
            <div style={{ fontSize: 12, color: '#9aa7bd' }}>Downloader</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              marginBottom: 4,
              borderRadius: 8,
              border: 'none',
              background: currentView === item.id ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
              color: currentView === item.id ? '#60a5fa' : '#9aa7bd',
              cursor: 'pointer',
              fontSize: 14,
              textAlign: 'left',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => { if (currentView !== item.id) e.target.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={(e) => { if (currentView !== item.id) e.target.style.background = 'transparent' }}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.showBadge && downloadCount > 0 && (
              <span style={{ background: '#2563eb', color: 'white', fontSize: 11, padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>{downloadCount}</span>
            )}
            {item.id === 'installed' && installedCount > 0 && (
              <span style={{ background: 'rgba(255,255,255,0.1)', color: '#e6eef8', fontSize: 11, padding: '2px 6px', borderRadius: 10 }}>{installedCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>
          Ventoy Distro Downloader v0.2.0
        </div>
      </div>
    </div>
  )
}
