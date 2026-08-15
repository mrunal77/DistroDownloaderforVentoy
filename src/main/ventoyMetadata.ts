/* src/main/ventoyMetadata.ts
 * Read-only Ventoy metadata verification from physical device sectors.
 * Never writes to the device. Uses O_RDONLY.
 */

import fs from 'fs'
import path from 'path'
import { warn as logWarn } from './logger'

const VENTOY_MBR_OFFSET = 0
const VENTOY_MBR_SIZE = 512
const VENTOY_STAGE2_OFFSET = 64
const VENTOY_STAGE2_SIZE = 1024 * 1024

interface DeviceSectorReadResult {
  verified: boolean
  reason: string
  mbrSignature: boolean
  stage2Signature: boolean
  partitionStructureValid: boolean
  ventoyConfig: { version: string | null; hasMenu: boolean } | null
  version: string | undefined
  rawReadOnly: boolean
}

interface PartitionObj {
  label?: string
  partLabel?: string
}

export function readDeviceSectors (devicePath: string, offset: number, length: number): Buffer | null {
  try {
    const fd = fs.openSync(devicePath, fs.constants.O_RDONLY)
    try {
      const buf = Buffer.alloc(length)
      const bytesRead = fs.readSync(fd, buf, 0, length, offset)
      return buf.slice(0, bytesRead)
    } finally {
      fs.closeSync(fd)
    }
  } catch {
    logWarn('Failed to read device sectors')
    return null
  }
}

export function checkVentoyMbrSignature (buf: Buffer | null | undefined): boolean {
  if (!buf || buf.length < 512) return false
  const mbr = buf.toString('latin1', 440, 512)
  const ventoySignatures = [
    'VTOY',
    'Ventoy',
    'vtoy',
    'grub',
    'GRUB2'
  ]
  for (const sig of ventoySignatures) {
    if (mbr.includes(sig)) return true
  }
  return false
}

export function checkVentoyStage2Signature (buf: Buffer | null | undefined): boolean {
  if (!buf || buf.length < 512) return false
  const stage2 = buf.toString('latin1', 0, Math.min(buf.length, 65536))
  const ventoySignatures = [
    'Ventoy',
    'vtoy',
    'VTOY',
    'ventoy',
    'GRUB2',
    'grub2'
  ]
  for (const sig of ventoySignatures) {
    if (stage2.includes(sig)) return true
  }
  return false
}

export function extractVentoyVersionFromBuf (buf: Buffer | null | undefined): string | undefined {
  if (!buf || buf.length < 512) return undefined
  const stage2 = buf.toString('latin1', 0, Math.min(buf.length, 65536))
  const patterns = [
    /Ventoy[\s/]+([0-9]+\.[0-9]+\.[0-9]+)/i,
    /vtoy[\s/]+([0-9]+\.[0-9]+\.[0-9]+)/i,
    /VTOY[\s/]+([0-9]+\.[0-9]+\.[0-9]+)/i
  ]
  for (const pat of patterns) {
    const m = stage2.match(pat)
    if (m && m[1]) return m[1]
  }
  return undefined
}

export function readVentoyConfigFromMount (mountPath: string | undefined | null): Record<string, unknown> | null {
  if (!mountPath) return null
  const ventoyJsonPath = path.join(mountPath, 'ventoy', 'ventoy.json')
  try {
    if (fs.existsSync(ventoyJsonPath)) {
      const raw = fs.readFileSync(ventoyJsonPath, 'utf8')
      return JSON.parse(raw)
    }
  } catch {
    logWarn('Failed to read ventoy.json')
  }
  return null
}

export function verifyVentoyMetadataReadOnly (drive: Record<string, unknown>): DeviceSectorReadResult {
  if (!drive || !drive.device) {
    return { verified: false, reason: 'No device path', mbrSignature: false, stage2Signature: false, partitionStructureValid: false, ventoyConfig: null, version: undefined, rawReadOnly: true }
  }

  const devicePath = drive.device as string
  const mbrBuf = readDeviceSectors(devicePath, VENTOY_MBR_OFFSET, VENTOY_MBR_SIZE)
  const stage2Buf = readDeviceSectors(devicePath, VENTOY_STAGE2_OFFSET * 512, VENTOY_STAGE2_SIZE)

  const mbrSig = checkVentoyMbrSignature(mbrBuf)
  const stage2Sig = checkVentoyStage2Signature(stage2Buf)
  const rawSignatureValid = mbrSig || stage2Sig

  const partitions = (drive.partitions || []) as PartitionObj[]
  const partitionStructureValid = partitions.some(p =>
    (p.label || '').toLowerCase() === 'vtoyefi' ||
    (p.partLabel || '').toLowerCase() === 'vtoyefi'
  ) && partitions.some(p =>
    (p.label || '').toLowerCase() === 'ventoy' ||
    (p.partLabel || '').toLowerCase() === 'ventoy'
  )

  const ventoyJson = drive.ventoyDataPath ? readVentoyConfigFromMount(drive.ventoyDataPath as string) : null

  let version: string | undefined = drive.ventoyVersion as string | undefined
  if (!version) {
    const stageVersion = extractVentoyVersionFromBuf(stage2Buf)
    if (stageVersion) version = stageVersion
  }
  if (!version && ventoyJson && ventoyJson.Version) {
    version = ventoyJson.Version as string
  }

  let verified = false
  let reason = 'No Ventoy indicators found'

  if (rawSignatureValid && partitionStructureValid) {
    verified = true
    reason = 'Ventoy signature and partition structure verified'
  } else if (partitionStructureValid && ventoyJson) {
    verified = true
    reason = 'Ventoy partition structure and config verified'
  } else if (partitionStructureValid) {
    verified = true
    reason = 'Ventoy partition structure consistent'
  } else if (rawSignatureValid) {
    verified = true
    reason = 'Ventoy disk signature found'
  } else if (ventoyJson) {
    verified = true
    reason = 'Ventoy config file found'
  }

  return {
    verified,
    reason,
    mbrSignature: mbrSig,
    stage2Signature: stage2Sig,
    partitionStructureValid,
    ventoyConfig: ventoyJson ? { version: (ventoyJson.Version as string) || '', hasMenu: !!ventoyJson.Menu } : null,
    version,
    rawReadOnly: true
  }
}
