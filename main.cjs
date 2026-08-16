/* main.js - Electron main process
 * Core application logic with ISO providers, Ventoy detection, simulation, and download management.
 * All IPC handlers validate inputs to prevent path traversal, injection, and unauthorized access.
 */

const catalog = require('./src/main/catalog.cjs')
const downloadManager = require('./src/main/downloadManager.cjs')
const logger = require('./src/main/logger.cjs')
const isoProvider = require('./src/main/isoProvider.cjs')
const usbDetection = require('./src/main/usbDetectionService.cjs')
const ventoyMetadata = require('./src/main/ventoyMetadata.cjs')
const udevMonitor = require('./src/main/udevMonitor.cjs')

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

if (process.platform === 'linux') {
  // Opt into Chromium's VA-API decode path. Driver support remains the final
  // authority, so unsupported systems fall back to software rendering safely.
  app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder')
}

let mainWindow = null

/* ─── Input Validation Helpers ─── */

function validateDevicePath (devicePath) {
  if (!devicePath || typeof devicePath !== 'string') {
    throw new Error('Invalid device path: must be a non-empty string')
  }
  if (!devicePath.startsWith('/dev/')) {
    throw new Error('Invalid device path: must start with /dev/')
  }
  if (devicePath.includes('..') || devicePath.includes('//')) {
    throw new Error('Invalid device path: contains forbidden characters')
  }
  return devicePath
}

function validateMountPath (mountPath) {
  if (!mountPath || typeof mountPath !== 'string') {
    throw new Error('Invalid mount path: must be a non-empty string')
  }
  if (mountPath.includes('..') || mountPath.includes('//')) {
    throw new Error('Invalid mount path: contains forbidden characters')
  }
  if (!fs.existsSync(mountPath)) {
    throw new Error('Invalid mount path: path does not exist')
  }
  return mountPath
}

function validateVentoyTargetMount (mountPath) {
  validateMountPath(mountPath)
  const drive = usbDetection.detectAllDrives().find(candidate =>
    candidate.ventoyDataPath === mountPath &&
    (candidate.ventoyConfidence === 'high' || candidate.ventoyConfidence === 'medium')
  )
  if (!drive) {
    throw new Error('Select a detected Ventoy data partition before downloading')
  }
  return mountPath
}

function validateDownloadUrl (downloadUrl) {
  let parsed
  try {
    parsed = new URL(downloadUrl)
  } catch {
    throw new Error('Invalid download URL')
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Downloads must use HTTPS')
  }
  return parsed.href
}

function validateDistroId (distroId) {
  if (!distroId || typeof distroId !== 'string') {
    throw new Error('Invalid distro ID: must be a non-empty string')
  }
  if (distroId.includes('..') || distroId.includes('/')) {
    throw new Error('Invalid distro ID: contains forbidden characters')
  }
  const cat = catalog.loadCatalog()
  const distro = catalog.getDistroById(cat, distroId)
  if (!distro) {
    throw new Error('Distro not found: ' + distroId)
  }
  return distroId
}

function validateDriveObject (drive) {
  if (!drive || typeof drive !== 'object') {
    throw new Error('Invalid drive: must be an object')
  }
  if (!drive.device || typeof drive.device !== 'string') {
    throw new Error('Invalid drive: device property is required and must be a string')
  }
  if (!drive.device.startsWith('/dev/')) {
    throw new Error('Invalid drive: device path must start with /dev/')
  }
  return drive
}

function validateFileName (fileName) {
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('Invalid file name: must be a non-empty string')
  }
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new Error('Invalid file name: contains forbidden path characters')
  }
  if (!fileName.toLowerCase().endsWith('.iso')) {
    throw new Error('Invalid file name: must have .iso extension')
  }
  return fileName
}

function validateIsoName (isoName) {
  if (!isoName || typeof isoName !== 'string') {
    throw new Error('Invalid ISO name: must be a non-empty string')
  }
  if (isoName.includes('..') || isoName.includes('/') || isoName.includes('\\')) {
    throw new Error('Invalid ISO name: contains forbidden path characters')
  }
  return isoName
}

/* ─── Window Creation ─── */

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready-to-show')
  })

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading')
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('Page failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('console-message', (event, details) => {
    const prefix = details.level === 2 ? 'Renderer Error' : details.level === 3 ? 'Renderer Warning' : 'Renderer Log'
    console.log(prefix + ' [' + details.sourceId + ':' + details.lineNumber + ']:', details.message)
  })

  const devServerUrl = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' ? MAIN_WINDOW_VITE_DEV_SERVER_URL : null)
  console.log('Dev server URL:', devServerUrl, 'MAIN_WINDOW_VITE_NAME:', typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' ? MAIN_WINDOW_VITE_DEV_SERVER_URL : 'undefined')
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl)
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  /* ─── USB Drive Detection IPC Handlers ─── */

  ipcMain.handle('get-usb-drives', async () => {
    return usbDetection.detectAllDrives().filter(d => d.isVentoy)
  })

  ipcMain.handle('refresh-usb-drives', async () => {
    return usbDetection.detectAllDrives().filter(d => d.isVentoy)
  })

  ipcMain.handle('get-drive-details', async (event, devicePath) => {
    validateDevicePath(devicePath)
    return usbDetection.getDriveDetails(devicePath)
  })

  ipcMain.handle('get-storage-info', async (event, mountPath) => {
    validateMountPath(mountPath)
    return usbDetection.getStorageInfo(mountPath)
  })

  ipcMain.handle('verify-ventoy-metadata', async (event, drive) => {
    validateDriveObject(drive)
    return ventoyMetadata.verifyVentoyMetadataReadOnly(drive)
  })

  /* ─── USB Monitor IPC Handlers ─── */

  ipcMain.handle('start-usb-monitor', async () => {
    udevMonitor.setMainWindow(mainWindow)
    udevMonitor.startMonitor()
    return { started: true }
  })

  ipcMain.handle('stop-usb-monitor', async () => {
    udevMonitor.stopMonitor()
    return { stopped: true }
  })

  ipcMain.handle('usb-diagnostics', async () => {
    const drives = usbDetection.detectAllDrives()
    const result = []
    for (const drive of drives) {
      const meta = ventoyMetadata.verifyVentoyMetadataReadOnly(drive)
      const storage = drive.ventoyDataPath ? usbDetection.getStorageInfo(drive.ventoyDataPath) : null
      result.push({
        ...drive,
        ventoyMetadata: meta,
        storage
      })
    }
    return result
  })

  /* ─── Catalog IPC Handlers ─── */

  ipcMain.handle('get-catalog', async () => {
    return catalog.loadCatalog()
  })

  /* ─── Download IPC Handlers ─── */

  ipcMain.handle('start-download', async (event, { distroId, targetMountPath }) => {
    validateDistroId(distroId)
    validateVentoyTargetMount(targetMountPath)

    const cat = catalog.loadCatalog()
    const distro = catalog.getDistroById(cat, distroId)

    const provider = createProvider(distro)
    const release = await provider.getLatestRelease()

    validateFileName(release.iso_name)
    validateDownloadUrl(release.download_url)

    const storageInfo = usbDetection.getStorageInfo(targetMountPath)
    const requiredBytes = release.size || 0
    if (storageInfo && requiredBytes > 0 && storageInfo.available < requiredBytes) {
      const availableGB = (storageInfo.available / 1e9).toFixed(1)
      const requiredGB = (requiredBytes / 1e9).toFixed(1)
      throw new Error(`Insufficient disk space: ${requiredGB} GB required, ${availableGB} GB available on ${targetMountPath}. Please free up space and try again.`)
    }

    const downloadId = crypto.randomUUID()
    const sendProgress = (channel, payload) => {
      try {
        if (mainWindow && mainWindow.webContents) mainWindow.webContents.send(channel, payload)
      } catch { /* ignore */ }
    }

    downloadManager.startDownload({
      downloadId,
      downloadUrl: release.download_url,
      fileName: release.iso_name,
      targetMountPath,
      options: {
        expectedSha256: release.sha256,
        maxRetries: 3
      }
    }, {
      onProgress: (p) => sendProgress('download-progress', { downloadId, ...p }),
      onQueueChange: (state) => sendProgress('queue-state', state),
      onComplete: (r) => {
        logger.download('Download complete', { downloadId, filePath: r.filePath, sha256: r.sha256 })
        sendProgress('download-complete', { downloadId, ...r })
      },
      onError: (e) => {
        logger.error('Download error', { downloadId, message: e.message })
        sendProgress('download-error', { downloadId, message: e.message })
      }
    })

    return { downloadId, release }
  })

  ipcMain.handle('cancel-download', async (event, downloadId) => {
    if (!downloadId || typeof downloadId !== 'string') {
      throw new Error('Invalid download ID')
    }
    const ok = downloadManager.cancelDownload(downloadId)
    return { success: !!ok }
  })

  ipcMain.handle('get-queue-state', async () => {
    return downloadManager.getQueueState()
  })

  ipcMain.handle('set-download-concurrency', async (event, concurrency) => {
    const n = Math.max(1, Math.min(8, Number(concurrency) || 2))
    downloadManager.setQueueConcurrency('default', n)
    return { concurrency: n }
  })

  ipcMain.handle('check-download-space', async (event, { distroId, targetMountPath }) => {
    validateDistroId(distroId)
    validateMountPath(targetMountPath)

    const cat = catalog.loadCatalog()
    const distro = catalog.getDistroById(cat, distroId)
    if (!distro) throw new Error('Distro not found')

    const provider = createProvider(distro)
    const release = await provider.getLatestRelease()

    const requiredBytes = release.size || 0
    const storageInfo = usbDetection.getStorageInfo(targetMountPath)

    if (!storageInfo) {
      return { available: null, required: requiredBytes, ok: true, warning: 'Could not determine available space' }
    }

    const ok = storageInfo.available >= requiredBytes
    return {
      available: storageInfo.available,
      total: storageInfo.total,
      used: storageInfo.used,
      percentUsed: storageInfo.percentUsed,
      required: requiredBytes,
      ok,
      warning: ok ? null : `Insufficient space: ${(requiredBytes / 1e9).toFixed(1)} GB required, ${(storageInfo.available / 1e9).toFixed(1)} GB available`
    }
  })

  /* ─── ISO Management IPC Handlers ─── */

  ipcMain.handle('verify-iso', async (event, filePath) => {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path')
    }
    if (filePath.includes('..') || filePath.includes('//')) {
      throw new Error('Invalid file path: contains forbidden characters')
    }
    if (!fs.existsSync(filePath)) throw new Error('File not found')
    const result = await isoProvider.IsoProvider.prototype.verifyChecksum(filePath, null, 'sha256')
    return { verified: result === true, status: result === true ? 'verified' : result === false ? 'failed' : 'unavailable' }
  })

  ipcMain.handle('scan-ventoy', async (event, mountPath) => {
    validateMountPath(mountPath)
    const entries = fs.readdirSync(mountPath).filter(f => f.toLowerCase().endsWith('.iso'))
    const isos = []
    for (const iso of entries) {
      const stats = fs.statSync(path.join(mountPath, iso))
      isos.push({ fileName: iso, path: path.join(mountPath, iso), size: stats.size })
    }
    return isos
  })

  ipcMain.handle('delete-iso', async (event, { mountPath, isoName }) => {
    validateVentoyTargetMount(mountPath)
    validateIsoName(isoName)
    const target = path.join(mountPath, isoName)
    if (!fs.existsSync(target)) throw new Error('ISO not found: ' + isoName)
    fs.unlinkSync(target)
    return { success: true }
  })

  /* ─── Settings IPC Handlers ─── */

  ipcMain.handle('get-settings', async () => {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json')
    try {
      const raw = fs.readFileSync(settingsPath, 'utf-8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  })

  ipcMain.handle('set-settings', async (event, settings) => {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Invalid settings: must be an object')
    }
    const settingsPath = path.join(app.getPath('userData'), 'settings.json')
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
    return { success: true }
  })

  /* ─── Window Control IPC Handlers ─── */

  ipcMain.handle('window-minimize', async () => {
    if (mainWindow) mainWindow.minimize()
  })

  ipcMain.handle('window-maximize', async () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
    }
  })

  ipcMain.handle('window-is-maximized', async () => {
    if (mainWindow) return mainWindow.isMaximized()
    return false
  })

  ipcMain.handle('window-close', async () => {
    if (mainWindow) mainWindow.close()
  })

  /* ─── Distro Metadata IPC Handler ─── */

  ipcMain.handle('get-distro-metadata', async (event, distroId) => {
    if (!distroId || typeof distroId !== 'string') {
      return null
    }
    if (distroId.includes('..') || distroId.includes('/')) {
      return null
    }
    const cat = catalog.loadCatalog()
    const distro = catalog.getDistroById(cat, distroId)
    if (!distro) return null
    return distro
  })
})

app.on('gpu-info-update', () => {
  console.log('GPU feature status:', app.getGPUFeatureStatus())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function createProvider (distro) {
  if (distro.iso_provider === 'github-release') {
    return new isoProvider.GitHubReleaseProvider({
      name: distro.name,
      repo: distro.github_repo,
      arch: distro.architectures && distro.architectures[0]
    })
  }
  if (distro.iso_provider === 'official-api') {
    return new isoProvider.OfficialApiProvider({
      name: distro.name,
      apiUrl: distro.api_url,
      arch: distro.architectures && distro.architectures[0]
    })
  }
  if (distro.iso_provider === 'official-directory') {
    return new isoProvider.OfficialDirectoryProvider({
      name: distro.name,
      baseUrl: distro.base_url,
      arch: distro.architectures && distro.architectures[0],
      checksumPattern: distro.checksum_provider ? new RegExp(distro.checksum_provider) : null
    })
  }
  const iso = distro.iso || {
    downloadUrl: distro.downloadUrl || distro.download_url,
    size: distro.size,
    sha256: distro.sha256,
    releaseDate: distro.releaseDate || distro.release_date
  }
  return new isoProvider.StaticProvider({
    name: distro.name,
    version: distro.version,
    arch: distro.architectures && distro.architectures[0],
    iso,
    officialWebsite: distro.official_website
  })
}
