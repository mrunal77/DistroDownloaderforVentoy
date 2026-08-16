/* src/main/windowManager.ts
 * Electron BrowserWindow creation and lifecycle management.
 */

import { app, BrowserWindow } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

export function createWindow (): BrowserWindow {
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
      preload: path.join(__dirname, '..', '..', 'preload.cjs'),
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

  mainWindow.webContents.on('console-message', (event, details: any) => {
    const prefix = details.level === 2 ? 'Renderer Error' : details.level === 3 ? 'Renderer Warning' : 'Renderer Log'
    console.log(prefix + ' [' + details.sourceId + ':' + details.lineNumber + ']:', details.message)
  })

  const devServerUrl = (process as any).env.MAIN_WINDOW_VITE_DEV_SERVER_URL || (typeof (globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' ? (globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL : null)
  console.log('Dev server URL:', devServerUrl, 'MAIN_WINDOW_VITE_NAME:', typeof (globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' ? (globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL : 'undefined')
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl)
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${(globalThis as any).MAIN_WINDOW_VITE_NAME}/index.html`))
  }

  return mainWindow
}

export function getMainWindow (): BrowserWindow | null {
  return mainWindow
}

export function setupAppLifecycle (): void {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('gpu-info-update', () => {
    console.log('GPU feature status:', app.getGPUFeatureStatus())
  })
}
