/* tests/unit/ventoyMetadata.test.ts
 * Unit tests for read-only Ventoy metadata detection.
 */

import { describe, it, expect } from 'vitest'
import * as ventoyMetadata from '../../src/main/ventoyMetadata'
import * as usbDetection from '../../src/main/usbDetectionService'

describe('ventoyMetadata', () => {
  it('should expose expected functions', () => {
    expect(typeof ventoyMetadata.readDeviceSectors).toBe('function')
    expect(typeof ventoyMetadata.checkVentoyMbrSignature).toBe('function')
    expect(typeof ventoyMetadata.checkVentoyStage2Signature).toBe('function')
    expect(typeof ventoyMetadata.extractVentoyVersionFromBuf).toBe('function')
    expect(typeof ventoyMetadata.readVentoyConfigFromMount).toBe('function')
    expect(typeof ventoyMetadata.verifyVentoyMetadataReadOnly).toBe('function')
  })

  it('should not verify null drive', () => {
    const result = ventoyMetadata.verifyVentoyMetadataReadOnly(null)
    expect(result.verified).toBe(false)
  })

  it('should not verify empty drive object', () => {
    const result2 = ventoyMetadata.verifyVentoyMetadataReadOnly({})
    expect(result2.verified).toBe(false)
  })

  it('should detect Ventoy stage2 signature in buffer', () => {
    const buf = Buffer.alloc(1024)
    buf.write('GRUB2 bootloader Ventoy stage2')
    expect(ventoyMetadata.checkVentoyStage2Signature(buf)).toBe(true)
  })

  it('should not extract version from simple buffer', () => {
    const buf = Buffer.alloc(1024)
    buf.write('GRUB2 bootloader Ventoy stage2')
    expect(ventoyMetadata.extractVentoyVersionFromBuf(buf)).toBeUndefined()
  })

  it('should extract version from buffer containing Ventoy version', () => {
    const versionBuf = Buffer.alloc(1024)
    versionBuf.write('Ventoy 1.0.99 is installed here')
    const version = ventoyMetadata.extractVentoyVersionFromBuf(versionBuf)
    expect(version).toBe('1.0.99')
  })

  it('should verify metadata on real USB devices', () => {
    const drives = usbDetection.detectAllDrives()
    let testedRealDevice = false
    for (const drive of drives) {
      if (drive.transport === 'usb' || (drive.udevProps && drive.udevProps.ID_BUS === 'usb')) {
        const meta = ventoyMetadata.verifyVentoyMetadataReadOnly(drive)
        expect(typeof meta.verified).toBe('boolean')
        expect(typeof meta.reason).toBe('string')
        expect(typeof meta.mbrSignature).toBe('boolean')
        expect(typeof meta.stage2Signature).toBe('boolean')
        expect(typeof meta.partitionStructureValid).toBe('boolean')
        expect(meta.rawReadOnly).toBe(true)
        testedRealDevice = true
      }
    }
    expect(testedRealDevice).toBe(true)
  })
})
