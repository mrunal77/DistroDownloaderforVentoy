import React from 'react'

export default function ActivityPanel ({ activities }) {
  return (
    <div style={{ maxWidth: 960 }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 600 }}>Activity Log</h2>
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        {activities.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No activity yet.</div>
        )}
        {activities.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
            <span style={{
              width: 8, height: 8, borderRadius: 4, flexShrink: 0,
              background: a.type === 'success' ? '#059669' : a.type === 'error' ? '#dc2626' : a.type === 'warning' ? '#d97706' : '#2563eb'
            }} />
            <span style={{ flex: 1 }}>{a.message}</span>
            <span style={{ color: '#64748b', fontSize: 12 }}>{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
