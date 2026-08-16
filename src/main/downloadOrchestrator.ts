/* src/main/downloadOrchestrator.ts
 * Owns the complete download workflow: validate → resolve release → check space → enqueue.
 * Eliminates duplicated orchestration logic across IPC handlers.
 */

import crypto from 'crypto'
import { validateVentoyTargetMount, validateFileName } from './validation/validators'
import { loadCatalog, getDistroById } from './catalog'
import { createProvider } from './providers/providerFactory'
import { getStorageInfo } from './usb/storage'
import { startDownload as dmStartDownload, cancelDownload as dmCancelDownload, getQueueState as dmGetQueueState, setQueueConcurrency as dmSetQueueConcurrency } from './downloadManager'
import { getVentoyDrive } from './usb/driveEnumerator'
import { IsoRelease } from './isoProvider'
import { download as logDownload, warn as logWarn } from './logger'

export interface DownloadRequest {
  distroId: string
  targetMountPath: string
}

export interface SpaceCheckRequest {
  distroId: string
  targetMountPath: string
}

export interface DownloadResult {
  downloadId: string
  release: IsoRelease
}

export interface SpaceCheckResult {
  available: number | null
  total: number | null
  used: number | null
  percentUsed: number | null
  required: number
  ok: boolean
  warning: string | null
}

export interface ProgressPayload {
  downloadId: string
  transferredBytes: number
  totalBytes: number | null
  percentage: number | null
  downloadSpeedBytesPerSec: number
  etaSeconds: number | null
}

export interface CompletePayload {
  downloadId: string
  filePath: string
  sha256: string
}

export class DownloadOrchestrator {
  private mainWindow: Electron.BrowserWindow | null = null

  setMainWindow (win: Electron.BrowserWindow | null): void {
    this.mainWindow = win
  }

  async startDownload (request: DownloadRequest, callbacks?: {
    onProgress?: (p: ProgressPayload) => void
    onComplete?: (r: CompletePayload) => void
    onError?: (e: { downloadId: string; message: string }) => void
    onQueueChange?: (state: { concurrency: number; active: number; queued: number; total: number }) => void
  }): Promise<DownloadResult> {
    const { distroId, targetMountPath } = request

    validateVentoyTargetMount(targetMountPath)

    const catalog = loadCatalog()
    const distro = getDistroById(catalog, distroId)
    if (!distro) {
      throw new Error('Distro not found: ' + distroId)
    }

    const provider = createProvider(distro as Record<string, unknown>)
    const release = await provider.getLatestRelease()

    validateFileName(release.iso_name)

    const storageInfo = getStorageInfo(targetMountPath)
    const requiredBytes = release.size || 0
    if (storageInfo && requiredBytes > 0 && storageInfo.available < requiredBytes) {
      const availableGB = (storageInfo.available / 1e9).toFixed(1)
      const requiredGB = (requiredBytes / 1e9).toFixed(1)
      throw new Error(`Insufficient disk space: ${requiredGB} GB required, ${availableGB} GB available on ${targetMountPath}. Please free up space and try again.`)
    }

    const downloadId = crypto.randomUUID()
    const sendProgress = (channel: string, payload: unknown) => {
      try {
        if (this.mainWindow && this.mainWindow.webContents) {
          this.mainWindow.webContents.send(channel, payload)
        }
      } catch { /* ignore */ }
    }

    dmStartDownload({
      downloadId,
      downloadUrl: release.download_url,
      fileName: release.iso_name,
      targetMountPath,
      options: {
        expectedSha256: release.sha256 || undefined,
        maxRetries: 3
      }
    }, {
      onProgress: (p) => {
        const progressPayload = { ...p, downloadId }
        sendProgress('download-progress', progressPayload)
        callbacks?.onProgress?.(progressPayload)
      },
      onQueueChange: (state) => {
        sendProgress('queue-state', state)
        callbacks?.onQueueChange?.(state)
      },
      onComplete: (r) => {
        logDownload('Download complete', { downloadId, filePath: r.filePath, sha256: r.sha256 })
        const completePayload = { ...r, downloadId }
        sendProgress('download-complete', completePayload)
        callbacks?.onComplete?.(completePayload)
      },
      onError: (e) => {
        logWarn('Download error', { downloadId, message: e.message })
        const errorPayload = { downloadId, message: e.message }
        sendProgress('download-error', errorPayload)
        callbacks?.onError?.(errorPayload)
      }
    })

    return { downloadId, release }
  }

  async checkDownloadSpace (request: SpaceCheckRequest): Promise<SpaceCheckResult> {
    const { distroId, targetMountPath } = request

    const catalog = loadCatalog()
    const distro = getDistroById(catalog, distroId)
    if (!distro) throw new Error('Distro not found')

    const provider = createProvider(distro)
    const release = await provider.getLatestRelease()

    const requiredBytes = release.size || 0
    const storageInfo = getStorageInfo(targetMountPath)

    if (!storageInfo) {
      return {
        available: null,
        total: null,
        used: null,
        percentUsed: null,
        required: requiredBytes,
        ok: true,
        warning: 'Could not determine available space'
      }
    }

    const ok = storageInfo.available >= requiredBytes
    return {
      available: storageInfo.available,
      total: storageInfo.total,
      used: storageInfo.used,
      percentUsed: storageInfo.percentUsed,
      required: requiredBytes,
      ok,
      warning: ok ? null : `Insufficient space: ${(requiredBytes / 1e9).toFixed(1)} GB required, ${(storageInfo.available / 1e9).toFixed(1)} GB available`
    }
  }

  cancelDownload (downloadId: string): boolean {
    return dmCancelDownload(downloadId)
  }

  getQueueState (): { concurrency: number; active: number; queued: number; total: number } {
    return dmGetQueueState()
  }

  setQueueConcurrency (concurrency: number): { concurrency: number } {
    const n = Math.max(1, Math.min(8, Number(concurrency) || 2))
    dmSetQueueConcurrency('default', n)
    return { concurrency: n }
  }

  async getAutoSelectedDrive (): Promise<ReturnType<typeof getVentoyDrive>> {
    return getVentoyDrive()
  }
}
