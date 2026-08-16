import React, { useState } from 'react'
import VentoyCard from './VentoyCard'
import CategoryFilter from './CategoryFilter'
import DistroCard from './DistroCard'

export default function Dashboard ({ catalog, search, setSearch, selectedCategory, setSelectedCategory, archFilter, setArchFilter, selectedDrive, onStartDownload, installedIsos: _installedIsos, onDeleteIso: _onDeleteIso, addActivity, scanning }) {
  const [sortBy, setSortBy] = useState('popular')

  const matchesCategory = (distro) => {
    if (selectedCategory === 'All') return true
    const family = (distro.family || '').toLowerCase()
    const name = (distro.name || '').toLowerCase()
    if (selectedCategory === 'Desktop') return ['debian', 'arch', 'fedora', 'suse', 'independent'].includes(family)
    if (selectedCategory === 'Gaming') return family === 'gaming' || name.includes('nobara') || name.includes('bazzite') || name.includes('cachyos') || name.includes('garuda') || name.includes('steam')
    if (selectedCategory === 'Security') return family === 'security' || name.includes('kali') || name.includes('parrot') || name.includes('tails') || name.includes('qubes') || name.includes('blackarch')
    if (selectedCategory === 'Server') return name.includes('rocky') || name.includes('almalinux') || name.includes('centos') || name.includes('oracle') || name.includes('alpine') || name.includes('ubuntu server')
    if (selectedCategory === 'Lightweight') return name.includes('lubuntu') || name.includes('xubuntu') || name.includes('antix') || name.includes('puppy') || name.includes('tiny core') || name.includes('mint xfce')
    return true
  }

  const matchesSearch = (distro) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (distro.name && distro.name.toLowerCase().includes(s)) || (distro.desktop && distro.desktop.toLowerCase().includes(s))
  }

  const matchesArch = (distro) => {
    if (!archFilter) return true
    return distro.architectures && distro.architectures.includes(archFilter)
  }

  const allDistros = []
  Object.entries(catalog).forEach(([_key, parent]) => {
    if (!parent.distros) return
    parent.distros.forEach(d => {
      allDistros.push({ ...d, groupName: parent.name, groupLogo: parent.logo })
    })
  })

  const filtered = allDistros
    .filter(d => matchesSearch(d) && matchesCategory(d) && matchesArch(d))
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      if (sortBy === 'size') return (a.iso?.size || a.size || 0) - (b.iso?.size || b.size || 0)
      if (sortBy === 'date') return String(b.iso?.release_date || b.release_date || '').localeCompare(String(a.iso?.release_date || a.release_date || ''))
      return 0
    })

  return (
    <div>
      {!selectedDrive && (
        <div style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.3)', color: '#fbbf24', padding: 14, borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span>Select a Ventoy USB drive from the header to enable downloads.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginBottom: 24 }}>
        <VentoyCard drive={selectedDrive} onRefresh={addActivity} scanning={scanning} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search distributions..."
          style={{ flex: 1, minWidth: 240, padding: '10px 14px', borderRadius: 8, background: '#1e293b', color: '#e6eef8', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', fontSize: 14 }}
        />
        <select value={archFilter} onChange={e => setArchFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, background: '#1e293b', color: '#e6eef8', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13 }}>
          <option value="x86_64">x86_64 (amd64)</option>
          <option value="aarch64">aarch64 (ARM64)</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, background: '#1e293b', color: '#e6eef8', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13 }}>
          <option value="popular">Sort by: Popular</option>
          <option value="name">Sort by: Name</option>
          <option value="size">Sort by: Size</option>
          <option value="date">Sort by: Date</option>
        </select>
      </div>

      <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />

      <div style={{ marginTop: 20 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
            No distributions found matching your criteria.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(d => (
            <DistroCard key={d.id} distro={d} onDownload={() => onStartDownload(d)} disabled={!selectedDrive} />
          ))}
        </div>
      </div>
    </div>
  )
}
