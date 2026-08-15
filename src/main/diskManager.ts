/* src/main/diskManager.ts
 * Enumerates removable drives using drivelist and resolves Ventoy mounts.
 * Exports:
 *  - listVentoyDrives(): Promise<[{ name, mountPath, totalSize, availableSize, isVentoy }]>
 */

import drivelist from 'drivelist'
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

interface DriveEntry {
  name: string
  mountPath: string
  totalSize: number | null
  availableSize: number | null
  isVentoy: boolean
}

async function getAvailableBytes (mountPath: string): Promise<number | null> {
  try {
    const out = execFileSync('df', ['--output=avail', mountPath], { encoding: 'utf8' })
    const lines = out.trim().split(/\r?\n/)
    if (lines.length >= 2) {
      const kb = parseInt(lines[1].trim(), 10)
      if (!Number.isNaN(kb)) return kb * 1024
    }
  } catch {
    // Best-effort; return null if unavailable
  }
  return null
}

async function checkIsVentoy (mountPath: string): Promise<boolean> {
  try {
    if (!mountPath) return false
    const base = path.resolve(mountPath)
    const basename = path.basename(base)
    if (basename && basename.toLowerCase() === 'ventoy') return true

    const candidates = [
      path.join(base, 'ventoy.json'),
      path.join(base, 'ventoy'),
      path.join(base, 'ventoy', 'ventoy')
    ]

    for (const p of candidates) {
      try {
        await fs.promises.access(p, fs.constants.F_OK)
        return true
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore and return false
  }
  return false
}

export async function listVentoyDrives (): Promise<DriveEntry[]> {
  const drives = await drivelist.list()
  const results: DriveEntry[] = []
  for (const d of drives) {
    // Only consider removable drives with mountpoints
    if (!d.isRemovable) continue
    if (!d.mountpoints || d.mountpoints.length === 0) continue

    // For each mountpoint, produce an entry
    for (const mp of d.mountpoints) {
      const mountPath = mp.path
      const name = d.description || d.device || mountPath
      const totalSize = d.size || null
      const availableSize = await getAvailableBytes(mountPath)
      const isVentoy = await checkIsVentoy(mountPath)

      results.push({
        name,
        mountPath,
        totalSize,
        availableSize,
        isVentoy
      })
    }
  }

  return results
}
