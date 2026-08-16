/* src/main/ipc/driveHandlers.ts
 * Thin IPC wiring for USB drive detection channels.
 */

import { ipcMain } from 'electron'
import { detectAllDrives, getDriveDetails, getStorageInfo } from '../usb/driveEnumerator'
import { verifyVentoyMetadataReadOnly } from '../usb/ventoyAnalyzer'
import { validateDevicePath, validateMountPath, validateDriveObject } from '../validation/validators'
import { setMainWindow as setUdevMainWindow, startMonitor, stopMonitor } from '../udevMonitor'

export function registerDriveHandlers (mainWindow: Electron.BrowserWindow | null): void {
  setUdevMainWindow(mainWindow as Electron.BrowserWindow)

  ipcMain.handle('get-usb-drives', async () => {
    return detectAllDrives().filter(d => d.isVentoy)
  })

  ipcMain.handle('refresh-usb-drives', async () => {
    return detectAllDrives().filter(d => d.isVentoy)
  })

  ipcMain.handle('get-drive-details', async (_event, devicePath: string) => {
    validateDevicePath(devicePath)
    return getDriveDetails(devicePath)
  })

  ipcMain.handle('get-storage-info', async (_event, mountPath: string) => {
    validateMountPath(mountPath)
    return getStorageInfo(mountPath)
  })

  ipcMain.handle('verify-ventoy-metadata', async (_event, drive: Record<string, unknown>) => {
    validateDriveObject(drive)
    return verifyVentoyMetadataReadOnly(drive as any)
  })

  ipcMain.handle('start-usb-monitor', async () => {
    startMonitor()
    return { started: true }
  })

  ipcMain.handle('stop-usb-monitor', async () => {
    stopMonitor()
    return { stopped: true }
  })

  ipcMain.handle('usb-diagnostics', async () => {
    const drives = detectAllDrives()
    const result = []
    for (const drive of drives) {
      const meta = verifyVentoyMetadataReadOnly(drive as any)
      const storage = drive.ventoyDataPath ? getStorageInfo(drive.ventoyDataPath) : null
      result.push({
        ...drive,
        ventoyMetadata: meta,
        storage
      })
    }
    return result
  })
}
