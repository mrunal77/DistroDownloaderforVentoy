import React, { useState, useEffect } from 'react'

export default function TitleBar () {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        const m = await window.ventoy.isMaximized?.()
        if (alive) setIsMaximized(!!m)
      } catch (_e) { /* ignore */ }
    }
    check()
    const interval = setInterval(check, 1000)
    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [])

  const onMinimize = async () => {
    try { await window.ventoy.minimizeWindow() } catch (e) { console.error(e) }
  }

  const onMaximize = async () => {
    try {
      await window.ventoy.maximizeWindow()
      setIsMaximized(true)
    } catch (e) { console.error(e) }
  }

  const onClose = async () => {
    try { await window.ventoy.closeWindow() } catch (e) { console.error(e) }
  }

  return (
    <div
      style={{
        height: 38,
        background: '#0b1220',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 0 0 16px',
        WebkitAppRegion: 'drag',
        userSelect: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: '100%' }}>
        <span style={{ fontSize: 18 }}>🐧</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e6eef8' }}>Ventoy Distro Downloader</span>
      </div>

      <div style={{ display: 'flex', height: '100%', WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={onMinimize}
          title="Minimize"
          style={{
            width: 46,
            height: '100%',
            border: 'none',
            background: 'transparent',
            color: '#9aa7bd',
            cursor: 'pointer',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.1s'
          }}
          onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.color = '#e6eef8' }}
          onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#9aa7bd' }}
        >
          _
        </button>

        <button
          onClick={onMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
          style={{
            width: 46,
            height: '100%',
            border: 'none',
            background: 'transparent',
            color: '#9aa7bd',
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.1s'
          }}
          onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.color = '#e6eef8' }}
          onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#9aa7bd' }}
        >
          {isMaximized ? '❐' : '□'}
        </button>

        <button
          onClick={onClose}
          title="Close"
          style={{
            width: 46,
            height: '100%',
            border: 'none',
            background: 'transparent',
            color: '#9aa7bd',
            cursor: 'pointer',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.1s'
          }}
          onMouseEnter={(e) => { e.target.style.background = '#dc2626'; e.target.style.color = 'white' }}
          onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#9aa7bd' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
