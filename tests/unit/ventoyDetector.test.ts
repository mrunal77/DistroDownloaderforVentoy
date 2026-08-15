/* tests/unit/ventoyDetector.test.ts
 * Tests for Ventoy detection module.
 */

import { describe, it, expect } from 'vitest'
import * as ventoyDetector from '../../src/main/ventoyDetector'

describe('ventoyDetector', () => {
  it('should expose expected functions', () => {
    expect(typeof ventoyDetector.detectVentoyDrives).toBe('function')
    expect(typeof ventoyDetector.getVentoyDrive).toBe('function')
    expect(typeof ventoyDetector.getVentoyDataMount).toBe('function')
    expect(typeof ventoyDetector.runLsblk).toBe('function')
    expect(typeof ventoyDetector.runUdevadm).toBe('function')
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
})
