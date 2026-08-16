/* main.cjs - Electron main process
 * Thin entry point. All logic lives in dedicated modules.
 */

if (process.platform === 'linux') {
  const { app } = require('electron')
  app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder')
}

const { app } = require('electron')

const { setupAppLifecycle, createWindow } = require('./src/main/windowManager.cjs')
const { registerDownloadHandlers } = require('./src/main/ipc/downloadHandlers.cjs')
const { registerDriveHandlers } = require('./src/main/ipc/driveHandlers.cjs')
const { registerSystemHandlers } = require('./src/main/ipc/systemHandlers.cjs')
const { DownloadOrchestrator } = require('./src/main/downloadOrchestrator.cjs')

setupAppLifecycle()

const orchestrator = new DownloadOrchestrator()

app.whenReady().then(() => {
  const mainWindow = createWindow()
  registerSystemHandlers(mainWindow)
  registerDriveHandlers(mainWindow)
  registerDownloadHandlers(orchestrator, mainWindow)

  app.on('activate', function () {
    if (require('electron').BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
