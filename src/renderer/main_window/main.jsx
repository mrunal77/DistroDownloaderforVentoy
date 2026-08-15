import React, { Component, useEffect, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import DownloadQueue from './components/DownloadQueue'
import InstalledIsos from './components/InstalledIsos'
import SettingsPage from './components/SettingsPage'
import ActivityPanel from './components/ActivityPanel'
import UsbDiagnostics from './components/UsbDiagnostics'

class ErrorBoundary extends Component {
  constructor (props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError (error) {
    return { hasError: true, error }
  }

  componentDidCatch (error, errorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo)
  }

  render () {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif', background: '#0f172a', color: '#e6eef8', minHeight: '100vh' }}>
          <h2 style={{ color: '#dc2626' }}>Component Error</h2>
          <pre style={{ background: '#1e293b', padding: 16, borderRadius: 8, overflow: 'auto' }}>{this.state.error?.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

function App () {
  const [error, setError] = useState(null)
  const [catalog, setCatalog] = useState({})
  const [drives, setDrives] = useState([])
  const [selectedDrive, setSelectedDrive] = useState(null)
  const [search, setSearch] = useState('')
  const [activeDownload, setActiveDownload] = useState(null)
  const [progressMap, setProgressMap] = useState({})
  const [installedIsos, setInstalledIsos] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [archFilter, setArchFilter] = useState('x86_64')
  const [currentView, setCurrentView] = useState('dashboard')
  const [activities, setActivities] = useState([])
  const [scanning, setScanning] = useState(false)
  const [spaceWarning, setSpaceWarning] = useState(null)

  const addActivity = useCallback((message, type = 'info') => {
    const activity = { id: Date.now(), message, type, time: new Date().toLocaleTimeString() }
    setActivities(prev => [activity, ...prev].slice(0, 20))
  }, [])

  const scanIsos = useCallback(async (mountPath) => {
    if (!mountPath) return
    try {
      const isos = await window.ventoy.scanVentoy(mountPath)
      setInstalledIsos(isos)
    } catch (e) {
      console.error('Scan failed', e)
    }
  }, [])

  const refreshDrives = useCallback(async () => {
    setScanning(true)
    try {
      const ds = await window.ventoy.refreshDrives()
      setDrives(ds)
      const firstVentoy = ds.find(d => d.ventoyConfidence === 'high' || d.ventoyConfidence === 'medium') || ds.find(d => d.isVentoy) || null
      setSelectedDrive(firstVentoy)
      if (firstVentoy) {
        scanIsos(firstVentoy.ventoyDataPath || firstVentoy.mountPath)
      }
      addActivity('Drives refreshed', 'info')
    } catch (e) {
      addActivity('Failed to refresh drives: ' + e.message, 'error')
    } finally {
      setScanning(false)
    }
  }, [scanIsos, addActivity])

  const onStartDownload = useCallback(async (distro) => {
    const mountPath = selectedDrive ? (selectedDrive.ventoyDataPath || selectedDrive.mountPath) : null
    if (!mountPath) {
      alert('Select a target Ventoy drive first')
      return
    }
    try {
      const spaceCheck = await window.ventoy.checkDownloadSpace(distro.id, mountPath)
      if (!spaceCheck.ok) {
        setSpaceWarning(spaceCheck.warning)
        alert(spaceCheck.warning || 'Not enough disk space for this download.')
        return
      }
      if (spaceCheck.warning) {
        console.warn('Space check warning:', spaceCheck.warning)
      }
      setSpaceWarning(null)
      const res = await window.ventoy.startDownload(distro.id, mountPath)
      const { downloadId, release } = res
      setActiveDownload({ downloadId, distro, mountPath, release })
      addActivity(`Downloading ${distro.name}`, 'info')
    } catch (e) {
      console.error('startDownload failed', e)
      alert('Failed to start download: ' + (e && e.message))
    }
  }, [selectedDrive, addActivity])

  const onCancelDownload = useCallback(async (downloadId) => {
    try {
      await window.ventoy.cancelDownload(downloadId)
      setActiveDownload(null)
      addActivity('Download cancelled', 'warning')
    } catch (e) {
      console.error('cancel failed', e)
    }
  }, [addActivity])

  const onSelectDrive = useCallback((drive) => {
    setSelectedDrive(drive)
    setSpaceWarning(null)
    const mountPath = drive ? (drive.ventoyDataPath || drive.mountPath) : null
    if (mountPath) scanIsos(mountPath)
  }, [scanIsos])

  const onDeleteIso = useCallback(async (isoName) => {
    if (!selectedDrive) return
    if (!confirm(`Delete ${isoName} from Ventoy drive?`)) return
    try {
      await window.ventoy.deleteIso(selectedDrive.ventoyDataPath || selectedDrive.mountPath, isoName)
      scanIsos(selectedDrive.ventoyDataPath || selectedDrive.mountPath)
      addActivity(`Deleted ${isoName}`, 'warning')
    } catch (e) {
      alert('Failed to delete: ' + e.message)
    }
  }, [selectedDrive, scanIsos, addActivity])

  useEffect(() => {
    if (!selectedDrive) {
      setSpaceWarning(null)
      return
    }
    const mountPath = selectedDrive.ventoyDataPath || selectedDrive.mountPath
    if (!mountPath) return
    window.ventoy.getStorageInfo(mountPath).then(info => {
      if (info && info.percentUsed > 90) {
        setSpaceWarning(`Drive is ${info.percentUsed}% full. Consider freeing up space before downloading.`)
      } else {
        setSpaceWarning(null)
      }
    }).catch(() => {})
  }, [selectedDrive])

  useEffect(() => {
    if (error) return
    if (!window.ventoy) {
      setError(new Error('window.ventoy not available. Preload script may not be loaded.'))
      return
    }

    async function load () {
      try {
        const cat = await window.ventoy.getCatalog()
        setCatalog(cat)
      } catch (e) {
        console.error('Failed to load catalog', e)
      }

      try {
        const ds = await window.ventoy.getUsbDrives()
        setDrives(ds)
        const firstVentoy = ds.find(d => d.ventoyConfidence === 'high' || d.ventoyConfidence === 'medium') || ds.find(d => d.isVentoy) || null
        setSelectedDrive(firstVentoy)
        if (firstVentoy) {
          scanIsos(firstVentoy.ventoyDataPath || firstVentoy.mountPath)
        }
      } catch (e) {
        console.error('Failed to list drives', e)
      }

      try {
        await window.ventoy.startUsbMonitor()
      } catch (e) {
        console.error('Failed to start USB monitor', e)
      }
    }
    load()

    const unsubProgress = window.ventoy.onDownloadProgress((payload) => {
      setProgressMap(prev => ({ ...prev, [payload.downloadId]: payload }))
    })
    const unsubComplete = window.ventoy.onDownloadComplete((payload) => {
      setProgressMap(prev => ({ ...prev, [payload.downloadId]: { ...prev[payload.downloadId], completed: true, sha256: payload.sha256, filePath: payload.filePath } }))
      setActiveDownload(ad => (ad && ad.downloadId === payload.downloadId) ? null : ad)
      if (selectedDrive) {
        scanIsos(selectedDrive.ventoyDataPath || selectedDrive.mountPath)
      }
      addActivity('Download complete', 'success')
    })
    const unsubError = window.ventoy.onError((payload) => {
      setProgressMap(prev => ({ ...prev, [payload.downloadId]: { ...prev[payload.downloadId], error: payload.message } }))
      setActiveDownload(ad => (ad && ad.downloadId === payload.downloadId) ? null : ad)
      addActivity('Download failed', 'error')
    })

    const unsubDevicesChanged = window.ventoy.onDevicesChanged((data) => {
      setDrives(data.drives || [])
      setScanning(false)
      addActivity('USB devices changed', 'info')
    })

    const unsubVentoyDetected = window.ventoy.onVentoyDetected((data) => {
      addActivity(`Ventoy detected: ${data.device} (${data.confidence})`, 'success')
    })

    return () => {
      unsubProgress && unsubProgress()
      unsubComplete && unsubComplete()
      unsubError && unsubError()
      unsubDevicesChanged && unsubDevicesChanged()
      unsubVentoyDetected && unsubVentoyDetected()
    }
  }, [error, selectedDrive, scanIsos, addActivity])

  if (error) {
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif', background: '#0f172a', color: '#e6eef8', minHeight: '100vh' }}>
        <h2 style={{ color: '#dc2626' }}>Application Error</h2>
        <pre style={{ background: '#1e293b', padding: 16, borderRadius: 8, overflow: 'auto' }}>{error.message}</pre>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', background: '#0f172a', color: '#e6eef8' }}>
      <TitleBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar currentView={currentView} onNavigate={setCurrentView} installedCount={installedIsos.length} downloadCount={activeDownload ? 1 : 0} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header selectedDrive={selectedDrive} drives={drives} onSelectDrive={onSelectDrive} onRefresh={refreshDrives} onNavigate={setCurrentView} currentView={currentView} scanning={scanning} />
          {spaceWarning && (
            <div style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.3)', color: '#fbbf24', padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, margin: '0 20px 16px', borderRadius: 8 }}>
              <span>⚠️</span>
              <span>{spaceWarning}</span>
            </div>
          )}
          <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
            {currentView === 'dashboard' && (
              <Dashboard
                catalog={catalog}
                search={search}
                setSearch={setSearch}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                archFilter={archFilter}
                setArchFilter={setArchFilter}
                selectedDrive={selectedDrive}
                onStartDownload={onStartDownload}
                installedIsos={installedIsos}
                onDeleteIso={onDeleteIso}
                addActivity={addActivity}
                scanning={scanning}
              />
            )}
            {currentView === 'downloads' && (
              <DownloadQueue activeDownload={activeDownload} progressMap={progressMap} onCancel={onCancelDownload} />
            )}
            {currentView === 'installed' && (
              <InstalledIsos isos={installedIsos} selectedDrive={selectedDrive} onDelete={onDeleteIso} onScan={() => scanIsos(selectedDrive?.ventoyDataPath || selectedDrive?.mountPath)} />
            )}
            {currentView === 'settings' && <SettingsPage />}
            {currentView === 'activity' && <ActivityPanel activities={activities} />}
            {currentView === 'diagnostics' && <UsbDiagnostics />}
          </div>
        </div>
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (!container) {
  const fallback = document.createElement('div')
  fallback.id = 'root'
  document.body.appendChild(fallback)
}
const root = createRoot(container || document.getElementById('root'))
try {
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
} catch (e) {
  console.error('React render error:', e)
  const rootEl = document.getElementById('root')
  if (rootEl) {
    rootEl.innerHTML = '<div style="padding:24px;color:#dc2626;font-family:sans-serif;"><h2>Render Error</h2><pre>' + e.message + '</pre></div>'
  }
}
