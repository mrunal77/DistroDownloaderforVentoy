/* preload.js - Expose a minimal, secure IPC surface to the renderer
 * - contextBridge provides typed methods for drives, catalog, downloads
 * - subscribe to download events
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ventoy', {
  // USB drive detection
  getUsbDrives: () => ipcRenderer.invoke('get-usb-drives'),
  refreshDrives: () => ipcRenderer.invoke('refresh-usb-drives'),
  getDriveDetails: (devicePath) => ipcRenderer.invoke('get-drive-details', devicePath),
  getStorageInfo: (mountPath) => ipcRenderer.invoke('get-storage-info', mountPath),
  verifyVentoyMetadata: (drive) => ipcRenderer.invoke('verify-ventoy-metadata', drive),

  // Real-time monitor
  startUsbMonitor: () => ipcRenderer.invoke('start-usb-monitor'),
  stopUsbMonitor: () => ipcRenderer.invoke('stop-usb-monitor'),

  // Diagnostics
  usbDiagnostics: () => ipcRenderer.invoke('usb-diagnostics'),

  // Catalog
  getCatalog: () => ipcRenderer.invoke('get-catalog'),
  getDistroMetadata: (distroId) => ipcRenderer.invoke('get-distro-metadata', distroId),

  // Download control
  startDownload: (distroId, targetMountPath) => ipcRenderer.invoke('start-download', { distroId, targetMountPath }),
  cancelDownload: (downloadId) => ipcRenderer.invoke('cancel-download', downloadId),
  checkDownloadSpace: (distroId, targetMountPath) => ipcRenderer.invoke('check-download-space', { distroId, targetMountPath }),
  getQueueState: () => ipcRenderer.invoke('get-queue-state'),
  setDownloadConcurrency: (concurrency) => ipcRenderer.invoke('set-download-concurrency', concurrency),
  verifyIso: (filePath) => ipcRenderer.invoke('verify-iso', filePath),
  scanVentoy: (mountPath) => ipcRenderer.invoke('scan-ventoy', mountPath),
  deleteIso: (mountPath, isoName) => ipcRenderer.invoke('delete-iso', { mountPath, isoName }),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),

  // Event subscriptions
  onDownloadProgress: (cb) => {
    const listener = (event, payload) => cb(payload)
    ipcRenderer.on('download-progress', listener)
    return () => ipcRenderer.removeListener('download-progress', listener)
  },
  onDownloadComplete: (cb) => {
    const listener = (event, payload) => cb(payload)
    ipcRenderer.on('download-complete', listener)
    return () => ipcRenderer.removeListener('download-complete', listener)
  },
  onError: (cb) => {
    const listener = (event, payload) => cb(payload)
    ipcRenderer.on('download-error', listener)
    return () => ipcRenderer.removeListener('download-error', listener)
  },
  onQueueState: (cb) => {
    const listener = (event, payload) => cb(payload)
    ipcRenderer.on('queue-state', listener)
    return () => ipcRenderer.removeListener('queue-state', listener)
  },
  onDevicesChanged: (cb) => {
    const listener = (event, data) => cb(data)
    ipcRenderer.on('usb:devices-changed', listener)
    return () => ipcRenderer.removeListener('usb:devices-changed', listener)
  },
  onVentoyDetected: (cb) => {
    const listener = (event, data) => cb(data)
    ipcRenderer.on('ventoy:detected', listener)
    return () => ipcRenderer.removeListener('ventoy:detected', listener)
  },
  onVentoyRemoved: (cb) => {
    const listener = (event, data) => cb(data)
    ipcRenderer.on('ventoy:removed', listener)
    return () => ipcRenderer.removeListener('ventoy:removed', listener)
  }
})
