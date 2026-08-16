/* src/main/ipc/downloadHandlers.ts
 * Thin IPC wiring for download-related channels.
 * All business logic lives in DownloadOrchestrator.
 */

import { ipcMain } from 'electron'
import { DownloadOrchestrator } from '../downloadOrchestrator'
import { validateDistroId, validateFilePath, validateIsoName } from '../validation/validators'
import { loadCatalog } from '../catalog'
import { IsoProvider } from '../isoProvider'
import fs from 'fs'
import path from 'path'

export function registerDownloadHandlers (orchestrator: DownloadOrchestrator, mainWindow: Electron.BrowserWindow | null): void {
  orchestrator.setMainWindow(mainWindow)

  ipcMain.handle('start-download', async (event, request: { distroId: string; targetMountPath: string }) => {
    return orchestrator.startDownload(request)
  })

  ipcMain.handle('cancel-download', async (_event, downloadId: string) => {
    return orchestrator.cancelDownload(downloadId)
  })

  ipcMain.handle('get-queue-state', async () => {
    return orchestrator.getQueueState()
  })

  ipcMain.handle('set-download-concurrency', async (_event, concurrency: number) => {
    return orchestrator.setQueueConcurrency(concurrency)
  })

  ipcMain.handle('check-download-space', async (_event, request: { distroId: string; targetMountPath: string }) => {
    return orchestrator.checkDownloadSpace(request)
  })

  ipcMain.handle('verify-iso', async (_event, filePath: string) => {
    validateFilePath(filePath)
    const result = await IsoProvider.prototype.verifyChecksum(filePath, null, 'sha256')
    return { verified: result === true, status: result === true ? 'verified' : result === false ? 'failed' : 'unavailable' }
  })

  ipcMain.handle('scan-ventoy', async (_event, mountPath: string) => {
    const entries = fs.readdirSync(mountPath).filter(f => f.toLowerCase().endsWith('.iso'))
    const isos = []
    for (const iso of entries) {
      const stats = fs.statSync(path.join(mountPath, iso))
      isos.push({ fileName: iso, path: path.join(mountPath, iso), size: stats.size })
    }
    return isos
  })

  ipcMain.handle('delete-iso', async (_event, { mountPath, isoName }: { mountPath: string; isoName: string }) => {
    validateIsoName(isoName)
    const target = path.join(mountPath, isoName)
    if (!fs.existsSync(target)) throw new Error('ISO not found: ' + isoName)
    fs.unlinkSync(target)
    return { success: true }
  })

  ipcMain.handle('get-distro-metadata', async (_event, distroId: string | null) => {
    if (!distroId) return null
    const catalog = loadCatalog()
    const sanitized = validateDistroId(distroId, catalog)
    if (!sanitized) return null
    for (const parent of Object.values(catalog)) {
      if (!parent || !parent.distros) continue
      const found = parent.distros.find((d: any) => d.id === distroId)
      if (found) return found
    }
    return null
  })
}
