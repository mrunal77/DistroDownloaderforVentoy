/* src/main/udevMonitor.ts
 * Real-time USB hotplug detection via udev.
 * Monitors block device add/remove events and notifies the main window.
 * Strictly read-only. Never modifies any device.
 */

import { spawn, ChildProcess } from 'child_process'
import { warn as logWarn, info as logInfo, error as logError } from './logger'
import { detectAllDrives, UsbDrive } from './usbDetectionService'
import { verifyVentoyMetadataReadOnly } from './ventoyMetadata'

interface UdevEvent {
  action?: string
  devname?: string
  devtype?: string
  idBus?: string
  tran?: string
  idModel?: string
  idSerial?: string
  idVendor?: string
}

interface VentoyDetectedPayload {
  device: string
  confidence: string
  version: string | undefined
  mountPath: string | undefined
}

let monitorProcess: ChildProcess | null = null
let mainWindow: Electron.BrowserWindow | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 800

export function setMainWindow (win: Electron.BrowserWindow): void {
  mainWindow = win
}

export function startMonitor (): void {
  if (monitorProcess) return

  monitorProcess = spawn('udevadm', ['monitor', '--udev', '--property', '--kernel', '--subsystem-match=block'])

  if (monitorProcess.stdout) {
    monitorProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString()
      const lines = text.split(/\r?\n/)
      let event: UdevEvent = {}
    for (const line of lines) {
      if (line.startsWith('ACTION=')) event.action = line.slice(7)
        else if (line.startsWith('DEVNAME=')) event.devname = line.slice(8)
        else if (line.startsWith('DEVTYPE=')) event.devtype = line.slice(8)
        else if (line.startsWith('ID_BUS=')) event.idBus = line.slice(7)
        else if (line.startsWith('TRAN=')) event.tran = line.slice(5)
        else if (line.startsWith('ID_MODEL=')) event.idModel = line.slice(9)
        else if (line.startsWith('ID_SERIAL_SHORT=')) event.idSerial = line.slice(16)
        else if (line.startsWith('ID_VENDOR=')) event.idVendor = line.slice(11)
      }

      if (!event.action || !event.devname) return
      if (!event.devname.startsWith('/dev/')) return

      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        handleDeviceChange(event)
      }, DEBOUNCE_MS)
    })
  }

  if (monitorProcess.stderr) {
    monitorProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString().trim()
      if (text) logWarn('udev monitor stderr', { text })
    })
  }

  monitorProcess.on('close', (code: number | null) => {
    logInfo('udev monitor closed', { code })
    monitorProcess = null
    if (code === 0 || code === null) {
      setTimeout(() => startMonitor(), 2000)
    }
  })

  monitorProcess.on('error', (err: Error) => {
    logError('udev monitor spawn error', { error: err.message })
    monitorProcess = null
  })

  logInfo('udev monitor started')
}

export function stopMonitor (): void {
  if (monitorProcess) {
    monitorProcess.kill('SIGTERM')
    monitorProcess = null
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  logInfo('udev monitor stopped')
}

function handleDeviceChange (_event: UdevEvent): void {
  if (!mainWindow || mainWindow.isDestroyed()) return

  try {
    const drives: UsbDrive[] = detectAllDrives()

    for (const drive of drives) {
      const meta = verifyVentoyMetadataReadOnly(drive as unknown as Record<string, unknown>)
      drive.ventoyMetadataVerified = meta.verified
      drive.ventoyMetadataReason = meta.reason
      drive.ventoyRawSignatureValid = meta.mbrSignature || meta.stage2Signature
      if (meta.version && !drive.ventoyVersion) drive.ventoyVersion = meta.version
    }

    mainWindow.webContents.send('usb:devices-changed', { drives, timestamp: Date.now() })

    const ventoyDrives = drives.filter(d => d.isVentoy)

    for (const d of ventoyDrives) {
      mainWindow.webContents.send('ventoy:detected', {
        device: d.device,
        confidence: d.ventoyConfidence,
        version: d.ventoyVersion,
        mountPath: d.ventoyDataPath
      } as VentoyDetectedPayload)
    }
  } catch {
    logError('Device change handler failed')
  }
}

export function refreshAndNotify (): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  handleDeviceChange({})
}
