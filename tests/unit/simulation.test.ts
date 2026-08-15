/* tests/unit/simulation.test.ts
 * Tests for Ventoy detector USB detection.
 */

import { describe, it, expect } from 'vitest'
import * as ventoyDetector from '../../src/main/ventoyDetector'

describe('ventoyDetector simulation', () => {
  it('should expose expected functions including getUsbPortPath', () => {
    expect(typeof ventoyDetector.detectVentoyDrives).toBe('function')
    expect(typeof ventoyDetector.getVentoyDrive).toBe('function')
    expect(typeof ventoyDetector.getVentoyDataMount).toBe('function')
    expect(typeof ventoyDetector.runLsblk).toBe('function')
    expect(typeof ventoyDetector.runUdevadm).toBe('function')
    expect(typeof ventoyDetector.getUsbPortPath).toBe('function')
  })

  it('detectVentoyDrives should return an array', () => {
    const drives = ventoyDetector.detectVentoyDrives()
    expect(Array.isArray(drives)).toBe(true)
  })

  it('getVentoyDrive should return null or object', () => {
    const drive = ventoyDetector.getVentoyDrive()
    expect(drive === null || (drive && typeof drive === 'object')).toBe(true)
  })

  it('getVentoyDataMount(null) should return null', () => {
    const mount = ventoyDetector.getVentoyDataMount(null)
    expect(mount).toBeNull()
  })

  it('drives should have isUsb flag and usbPortPath', () => {
    const drives = ventoyDetector.detectVentoyDrives()
    if (drives.length > 0) {
      const first = drives[0]
      expect(typeof first.isUsb).toBe('boolean')
      expect(typeof first.usbPortPath === 'string' || first.usbPortPath === null).toBe(true)
    }
  })
})
