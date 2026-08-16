/* src/main/validation/validators.ts
 * Shared input validation for IPC handlers and internal services.
 */

import fs from 'fs'
import { detectAllDrives } from '../usbDetectionService'

export class ValidationError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validateDevicePath (devicePath: string): string {
  if (!devicePath || typeof devicePath !== 'string') {
    throw new ValidationError('Invalid device path: must be a non-empty string')
  }
  if (!devicePath.startsWith('/dev/')) {
    throw new ValidationError('Invalid device path: must start with /dev/')
  }
  if (devicePath.includes('..') || devicePath.includes('//')) {
    throw new ValidationError('Invalid device path: contains forbidden characters')
  }
  return devicePath
}

export function validateMountPath (mountPath: string): string {
  if (!mountPath || typeof mountPath !== 'string') {
    throw new ValidationError('Invalid mount path: must be a non-empty string')
  }
  if (mountPath.includes('..') || mountPath.includes('//')) {
    throw new ValidationError('Invalid mount path: contains forbidden characters')
  }
  if (!fs.existsSync(mountPath)) {
    throw new ValidationError('Invalid mount path: path does not exist')
  }
  return mountPath
}

export function validateVentoyTargetMount (mountPath: string): string {
  validateMountPath(mountPath)
  const drive = detectAllDrives().find(candidate =>
    candidate.ventoyDataPath === mountPath &&
    (candidate.ventoyConfidence === 'high' || candidate.ventoyConfidence === 'medium')
  )
  if (!drive) {
    throw new ValidationError('Select a detected Ventoy data partition before downloading')
  }
  return mountPath
}

export function validateDownloadUrl (downloadUrl: string): string {
  let parsed
  try {
    parsed = new URL(downloadUrl)
  } catch {
    throw new ValidationError('Invalid download URL')
  }
  if (parsed.protocol !== 'https:') {
    throw new ValidationError('Downloads must use HTTPS')
  }
  return parsed.href
}

export function validateDistroId (distroId: string, catalog: Record<string, { distros?: Array<{ id: string }> }>): string {
  if (!distroId || typeof distroId !== 'string') {
    throw new ValidationError('Invalid distro ID: must be a non-empty string')
  }
  if (distroId.includes('..') || distroId.includes('/')) {
    throw new ValidationError('Invalid distro ID: contains forbidden characters')
  }
  const found = Object.values(catalog).some(parent =>
    parent.distros?.some(d => d.id === distroId)
  )
  if (!found) {
    throw new ValidationError('Distro not found: ' + distroId)
  }
  return distroId
}

export function validateDriveObject (drive: Record<string, unknown>): Record<string, unknown> {
  if (!drive || typeof drive !== 'object') {
    throw new ValidationError('Invalid drive: must be an object')
  }
  const device = (drive as any).device
  if (!device || typeof device !== 'string') {
    throw new ValidationError('Invalid drive: device property is required and must be a string')
  }
  if (!device.startsWith('/dev/')) {
    throw new ValidationError('Invalid drive: device path must start with /dev/')
  }
  return drive
}

export function validateFileName (fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    throw new ValidationError('Invalid file name: must be a non-empty string')
  }
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new ValidationError('Invalid file name: contains forbidden path characters')
  }
  if (!fileName.toLowerCase().endsWith('.iso')) {
    throw new ValidationError('Invalid file name: must have .iso extension')
  }
  return fileName
}

export function validateIsoName (isoName: string): string {
  if (!isoName || typeof isoName !== 'string') {
    throw new ValidationError('Invalid ISO name: must be a non-empty string')
  }
  if (isoName.includes('..') || isoName.includes('/') || isoName.includes('\\')) {
    throw new ValidationError('Invalid ISO name: contains forbidden path characters')
  }
  return isoName
}

export function validateFilePath (filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new ValidationError('Invalid file path')
  }
  if (filePath.includes('..') || filePath.includes('//')) {
    throw new ValidationError('Invalid file path: contains forbidden characters')
  }
  if (!fs.existsSync(filePath)) throw new ValidationError('File not found')
  return filePath
}

export function validateSettings (settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== 'object') {
    throw new ValidationError('Invalid settings: must be an object')
  }
  return settings as Record<string, unknown>
}

export function validateDownloadId (downloadId: string): string {
  if (!downloadId || typeof downloadId !== 'string') {
    throw new ValidationError('Invalid download ID')
  }
  return downloadId
}

export function validateDistroMetadataId (distroId: string): string | null {
  if (!distroId || typeof distroId !== 'string') {
    return null
  }
  if (distroId.includes('..') || distroId.includes('/')) {
    return null
  }
  return distroId
}
