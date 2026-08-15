/* src/main/ventoyDetector.ts
 * Robust Linux USB and Ventoy detection using lsblk, udevadm, /dev/disk/by-id, and sysfs USB port inspection.
 */

import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { warn as logWarn } from './logger'

interface BlockDevice {
  name?: string
  type?: string
  size?: string | number
  model?: string
  serial?: string
  ro?: boolean | string
  mountpoints?: string | string[]
  children?: BlockDevice[]
}

interface LsblkOutput {
  blockdevices?: BlockDevice[]
}

interface UdevProps {
  [key: string]: string | undefined
}

interface VentoyStructureResult {
  isVentoy: boolean
  mountPath: string
  isBoot: boolean
}

export interface VentoyDrive {
  devicePath: string
  model: string
  size: number | null
  isRemovable: boolean
  isUsb: boolean
  isReadOnly: boolean
  ventoyDataPath: string | null
  ventoyBootPath: string | null
  mountPath: string
  usbPortPath: string | null
  udevProps: UdevProps
}

export function runLsblk (): LsblkOutput {
  try {
    const out = execFileSync('lsblk', ['-Jb', '-o', 'NAME,SIZE,TYPE,MOUNTPOINTS,TRAN,RO,RM,MODEL,SERIAL'], { encoding: 'utf8' })
    return JSON.parse(out)
  } catch {
    logWarn('lsblk failed')
    return { blockdevices: [] }
  }
}

export function runUdevadm (devicePath: string): UdevProps {
  try {
    const out = execFileSync('udevadm', ['info', '--query=property', '--name', devicePath], { encoding: 'utf8' })
    const props: UdevProps = {}
    for (const line of out.split(/\r?\n/)) {
      const idx = line.indexOf('=')
      if (idx > 0) {
        const key = line.slice(0, idx)
        const value = line.slice(idx + 1)
        props[key] = value
      }
    }
    return props
  } catch {
    return {}
  }
}

function isRemovable (udevProps: UdevProps): boolean {
  const rem = udevProps.REMOVEABLE || udevProps.UDISKS_DRIVE_REMOVABLE
  return rem === '1'
}

function isUsbDevice (udevProps: UdevProps): boolean {
  return udevProps.ID_BUS === 'usb'
}

export function getUsbPortPath (devicePath: string): string | null {
  try {
    const sysfsPath = `/sys/block/${path.basename(devicePath)}`
    const realPath = fs.realpathSync(sysfsPath)
    return realPath
  } catch {
    return null
  }
}

function checkVentoyStructure (mountPath: string | undefined | null): VentoyStructureResult {
  if (!mountPath) return { isVentoy: false, mountPath: '', isBoot: false }
  const base = path.resolve(mountPath)
  const basename = path.basename(base)
  if (basename && basename.toLowerCase() === 'ventoy') {
    return { isVentoy: true, mountPath: base, isBoot: false }
  }
  try {
    const candidates = [
      path.join(base, 'ventoy.json'),
      path.join(base, 'ventoy'),
      path.join(base, 'ventoy', 'ventoy')
    ]
    for (const p of candidates) {
      try {
        fs.accessSync(p, fs.constants.F_OK)
        return { isVentoy: true, mountPath: base, isBoot: false }
      } catch { /* ignore */ }
    }
    if (basename.toLowerCase().includes('boot') || basename.toLowerCase().includes('efi')) {
      return { isVentoy: false, mountPath: base, isBoot: true }
    }
  } catch { /* ignore */ }
  return { isVentoy: false, mountPath: base, isBoot: false }
}

export function detectVentoyDrives (): VentoyDrive[] {
  const data = runLsblk()
  const devices = data.blockdevices || []
  const results: VentoyDrive[] = []

  for (const dev of devices) {
    if (!dev.name || dev.type === 'loop' || dev.type === 'rom') continue
    const devicePath = `/dev/${dev.name}`
    const udevProps = runUdevadm(devicePath)
    const removable = isRemovable(udevProps)
    const usb = isUsbDevice(udevProps)
    const readOnly = dev.ro === true || dev.ro === '1'
    const model = dev.model || dev.serial || devicePath
    const usbPortPath = getUsbPortPath(devicePath)

    if (dev.type === 'disk' && removable && usb && !readOnly) {
      const partitions = (dev.children || []).filter(p => p.type === 'part')
      for (const part of partitions) {
        const mountPoints: string[] = Array.isArray(part.mountpoints) ? part.mountpoints : (part.mountpoints ? [part.mountpoints] : [])
        for (const mp of mountPoints) {
          if (!mp) continue
          const ventoy = checkVentoyStructure(mp)
          if (ventoy.isVentoy || ventoy.isBoot) {
            const existing = results.find(r => r.devicePath === devicePath)
            if (existing) {
              if (ventoy.isVentoy && !existing.ventoyDataPath) existing.ventoyDataPath = ventoy.mountPath
              if (ventoy.isBoot && !existing.ventoyBootPath) existing.ventoyBootPath = ventoy.mountPath
            } else {
              results.push({
                devicePath,
                model,
                size: dev.size ? parseInt(dev.size as string, 10) : null,
                isRemovable: true,
                isUsb: true,
                isReadOnly: readOnly,
                ventoyDataPath: ventoy.isVentoy ? ventoy.mountPath : null,
                ventoyBootPath: ventoy.isBoot ? ventoy.mountPath : null,
                mountPath: ventoy.mountPath,
                usbPortPath,
                udevProps
              })
            }
          }
        }
      }
    }
  }

  return results
}

export function getVentoyDrive (): VentoyDrive | null {
  const drives = detectVentoyDrives()
  return drives.find(d => d.ventoyDataPath) || null
}

export function getVentoyDataMount (drive: VentoyDrive | null | undefined): string | null {
  if (!drive) return null
  return drive.ventoyDataPath || null
}
