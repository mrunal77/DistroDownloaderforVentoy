/* src/main/ipc/systemHandlers.ts
 * Thin IPC wiring for settings, window controls, and catalog.
 */

import { ipcMain, BrowserWindow } from 'electron'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { loadCatalog } from '../catalog'
import { validateSettings } from '../validation/validators'

export function registerSystemHandlers (mainWindow: BrowserWindow | null): void {
  ipcMain.handle('get-catalog', async () => {
    return loadCatalog()
  })

  ipcMain.handle('get-settings', async () => {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json')
    try {
      const raw = fs.readFileSync(settingsPath, 'utf-8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  })

  ipcMain.handle('set-settings', async (_event, settings: unknown) => {
    validateSettings(settings)
    const settingsPath = path.join(app.getPath('userData'), 'settings.json')
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
    return { success: true }
  })

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
}
