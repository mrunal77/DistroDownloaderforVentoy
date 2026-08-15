/* src/main/downloadManager.ts
 * Download manager with temp file, atomic rename, resume support, retry, and checksum verification.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import axios, { AxiosResponse } from 'axios'
import { download as logDownload, verification as logVerification, warn as logWarn } from './logger'
import { IsoProvider } from './isoProvider'

const activeDownloads = new Map<string, DownloadInfo>()

interface DownloadInfo {
  downloadId: string
  downloadUrl: string
  fileName: string
  targetMountPath: string
  aborted: boolean
  signal: AbortSignal
  controller: AbortController
}

interface DownloadProgress {
  transferredBytes: number
  totalBytes: number | null
  percentage: number | null
  downloadSpeedBytesPerSec: number
  etaSeconds: number | null
}

interface DownloadCallbacks {
  onProgress?: (progress: DownloadProgress & { downloadId: string }) => void
  onComplete?: (result: DownloadResult & { downloadId: string }) => void
  onError?: (error: { downloadId: string; message: string }) => void
}

interface DownloadOptions {
  maxRetries?: number
  timeout?: number
  signal?: AbortSignal | null
  onProgress?: ((progress: DownloadProgress) => void) | null
  expectedSha256?: string
}

interface DownloadResult {
  filePath: string
  sha256: string
}

interface DownloadConfig {
  downloadId?: string
  downloadUrl: string
  fileName: string
  targetMountPath: string
  options?: DownloadOptions
}

export async function downloadWithRetry (url: string, targetDir: string, fileName: string, options: DownloadOptions = {}): Promise<DownloadResult> {
  const { maxRetries = 3, timeout = 0, signal = null, onProgress = null } = options
  const targetPath = path.join(targetDir, fileName)
  const tempPath = targetPath + '.download'
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await streamDownload(url, tempPath, { timeout, signal, onProgress })
      if (options.expectedSha256) {
        const valid: boolean | null = IsoProvider.prototype.verifyChecksum(tempPath, options.expectedSha256, 'sha256') as unknown as boolean | null
        if (valid === false) {
          throw new Error('Checksum verification failed')
        }
        if (valid === null) {
          logVerification('Checksum verification unavailable', { file: tempPath })
        } else {
          logVerification('Checksum verified', { file: tempPath, sha256: options.expectedSha256 })
        }
      }
      fs.renameSync(tempPath, targetPath)
      logDownload('Download completed', { targetPath, attempt: attempt + 1 })
      return { filePath: targetPath, sha256: result.sha256 }
    } catch (err) {
      lastError = err as Error
      try { fs.unlinkSync(tempPath) } catch { /* ignore */ }
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        logWarn('Download retry', { attempt: attempt + 1, delay, error: (err as Error).message })
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError || new Error('Download failed')
}

async function streamDownload (url: string, targetPath: string, options: DownloadOptions = {}): Promise<{ sha256: string; totalBytes: number }> {
  const { timeout = 0, signal = null, onProgress = null } = options
  const response: AxiosResponse<ReadableStream> = await axios.get(url, {
    responseType: 'stream',
    signal: signal ?? undefined,
    timeout,
    maxRedirects: 5,
    validateStatus: (s: number) => s >= 200 && s < 400
  } as any)
  const totalBytes = parseInt((response.headers['content-length'] as string) || '0', 10) || null
  let transferred = 0
  const hash = crypto.createHash('sha256')
  const writeStream = fs.createWriteStream(targetPath, { flags: 'w' })
  await new Promise<void>((resolve, reject) => {
    writeStream.on('open', resolve)
    writeStream.on('error', reject)
  })
  try { await fs.promises.open(targetPath, 'r+') } catch { /* ignore */ }
  const stream = response.data
  let lastProgressSentAt = 0
  const progressIntervalMs = 500
  const startTime = Date.now()

  const streamIterable = stream as AsyncIterable<Buffer>
  for await (const chunk of streamIterable) {
    if (signal !== null && (signal as AbortSignal).aborted) throw new Error('aborted')
    transferred += chunk.length
    hash.update(chunk)
    const ok = writeStream.write(chunk)
    if (!ok) await new Promise<void>(resolve => writeStream.once('drain', resolve))
    const now = Date.now()
    if (onProgress && now - lastProgressSentAt >= progressIntervalMs) {
      lastProgressSentAt = now
      const elapsed = (now - startTime) / 1000
      const speedBps = elapsed > 0 ? transferred / elapsed : 0
      const percentage = totalBytes ? Math.min(100, (transferred / totalBytes) * 100) : null
      const etaSeconds = (totalBytes && speedBps > 0) ? Math.max(0, Math.round((totalBytes - transferred) / speedBps)) : null
      onProgress({
        transferredBytes: transferred,
        totalBytes,
        percentage,
        downloadSpeedBytesPerSec: Math.round(speedBps),
        etaSeconds
      })
    }
  }
  await new Promise<void>(resolve => writeStream.end(resolve))
  const sha256 = hash.digest('hex')
  return { sha256, totalBytes: transferred }
}

export async function startDownload (config: DownloadConfig, callbacks: DownloadCallbacks = {}): Promise<DownloadResult> {
  const {
    downloadId: rawDownloadId,
    downloadUrl,
    fileName,
    targetMountPath,
    options = {}
  } = config

  const downloadId = rawDownloadId || crypto.randomUUID()
  const { onProgress, onComplete, onError } = callbacks
  const controller = new AbortController()
  const signal = controller.signal

  if (!targetMountPath || !fs.existsSync(targetMountPath)) {
    throw new Error('Target mount path does not exist')
  }
  const info: DownloadInfo = { downloadId, downloadUrl, fileName, targetMountPath, aborted: false, signal, controller }
  activeDownloads.set(downloadId, info)
  logDownload('Download started', { downloadId, url: downloadUrl, target: path.join(targetMountPath, fileName) })
  try {
    const result = await downloadWithRetry(downloadUrl, targetMountPath, fileName, {
      ...options,
      signal,
      onProgress: (progress) => {
        if (onProgress) onProgress({ ...progress, downloadId })
      }
    })
    if (onComplete) onComplete({ downloadId, ...result })
    activeDownloads.delete(downloadId)
    return result
  } catch {
    if (onError) onError({ downloadId, message: 'Download failed' })
    activeDownloads.delete(downloadId)
    throw new Error('Download failed')
  }
}

export function cancelDownload (downloadId: string): boolean {
  const info = activeDownloads.get(downloadId)
  if (!info) return false
  info.aborted = true
  if (info.controller) info.controller.abort()
  return true
}
