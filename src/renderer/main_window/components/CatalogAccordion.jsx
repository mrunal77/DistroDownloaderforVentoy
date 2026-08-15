import React, { useState } from 'react'
import DistroCard from './DistroCard'

export default function CatalogAccordion ({ catalog = {}, search = '', category = 'All', archFilter = 'x86_64', onStartDownload }) {
  const [openKeys, setOpenKeys] = useState({})

  const toggle = (key) => setOpenKeys(prev => ({ ...prev, [key]: !prev[key] }))

  const matchesSearch = (distro) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (distro.name && distro.name.toLowerCase().includes(s)) || (distro.desktop && distro.desktop.toLowerCase().includes(s))
  }

  const matchesCategory = (distro) => {
    if (category === 'All') return true
    const family = (distro.family || '').toLowerCase()
    if (category === 'Desktop') return ['debian', 'arch', 'fedora', 'independent'].includes(family)
    if (category === 'Gaming') return ['gaming'].includes(family) || distro.name.toLowerCase().includes('nobara') || distro.name.toLowerCase().includes('bazzite') || distro.name.toLowerCase().includes('cachyos')
    if (category === 'Security') return ['security'].includes(family) || distro.name.toLowerCase().includes('kali')
    if (category === 'Server') return ['fedora', 'independent'].includes(family) || distro.name.toLowerCase().includes('rocky') || distro.name.toLowerCase().includes('almalinux') || distro.name.toLowerCase().includes('centos')
    return true
  }

  const matchesArch = (distro) => {
    if (!archFilter) return true
    return distro.architectures && distro.architectures.includes(archFilter)
  }

  return (
    <div>
      {Object.keys(catalog).length === 0 && <div className="card">No catalog loaded</div>}
      {Object.entries(catalog).map(([key, parent]) => {
        const filteredDistros = (parent.distros || []).filter(d => matchesSearch(d) && matchesCategory(d) && matchesArch(d))
        if (filteredDistros.length === 0 && search) return null
        return (
          <div key={key} style={{ marginBottom: 12 }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => toggle(key)}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src={parent.logo} alt="logo" style={{ width: 40, height: 40 }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{parent.name}</div>
                  <div className="small">{parent.description}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#9aa7bd' }}>{filteredDistros.length} items</div>
            </div>

            {openKeys[key] && (
              <div style={{ marginTop: 8 }}>
                <div className="grid">
                  {filteredDistros.map(d => (
                    <DistroCard key={d.id} distro={d} onStart={() => onStartDownload(d)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
