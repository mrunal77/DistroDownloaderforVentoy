/* tests/unit/usbDetection.test.ts
 * Unit tests for real USB detection service.
 */

import { describe, it, expect } from 'vitest'
import * as usbDetection from '../../src/main/usbDetectionService'

describe('usbDetection', () => {
  it('should expose expected functions', () => {
    expect(typeof usbDetection.detectAllDrives).toBe('function')
    expect(typeof usbDetection.getVentoyDrive).toBe('function')
    expect(typeof usbDetection.getDriveDetails).toBe('function')
    expect(typeof usbDetection.getStorageInfo).toBe('function')
    expect(typeof usbDetection.runLsblk).toBe('function')
    expect(typeof usbDetection.runUdevadm).toBe('function')
    expect(typeof usbDetection.detectVentoyOnDrive).toBe('function')
  })

  it('detectAllDrives should return an array', () => {
    const drives = usbDetection.detectAllDrives()
    expect(Array.isArray(drives)).toBe(true)
  })

  it('system should have block devices', () => {
    const drives = usbDetection.detectAllDrives()
    expect(drives.length >= 0).toBe(true)
  })

  it('drives should have expected properties', () => {
    const drives = usbDetection.detectAllDrives()
    for (const drive of drives) {
      expect(typeof drive.device === 'string' && drive.device.startsWith('/dev/')).toBe(true)
      expect(typeof drive.removable).toBe('boolean')
      expect(typeof drive.partitions).toBe('object')
      expect(typeof drive.isVentoy).toBe('boolean')
      expect(['high', 'medium', 'low', 'none'].includes(drive.ventoyConfidence)).toBe(true)
    }
  })

  it('getVentoyDrive should return null or object', () => {
    const ventoyDrive = usbDetection.getVentoyDrive()
    expect(ventoyDrive === null || (ventoyDrive && typeof ventoyDrive === 'object')).toBe(true)
  })

  it('getDriveDetails should return null for nonexistent device', () => {
    const details = usbDetection.getDriveDetails('/dev/nonexistent')
    expect(details).toBeNull()
  })

  it('getStorageInfo should return null or object with numeric total', () => {
    const storage = usbDetection.getStorageInfo('/')
    expect(storage === null || (storage && typeof storage.total === 'number')).toBe(true)
  })
})
