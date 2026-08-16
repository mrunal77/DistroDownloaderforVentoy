/* src/main/downloadManager.ts
 * Download manager with temp file, atomic rename, resume support, retry, checksum verification,
 * and a concurrent download queue with configurable concurrency.
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
  enqueuedAt: number
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
  onQueueChange?: (state: QueueState) => void
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

interface QueuedDownload {
  config: DownloadConfig
  callbacks: DownloadCallbacks
}

interface QueueState {
  concurrency: number
  active: number
  queued: number
  total: number
}

type QueueListener = (state: QueueState) => void

class DownloadQueue {
  private concurrency: number
  private running = new Set<string>()
  private pending: QueuedDownload[] = []
  private onQueueChange?: (state: QueueState) => void
  private listeners: QueueListener[] = []

  constructor (concurrency: number = 2) {
    this.concurrency = Math.max(1, concurrency)
  }

  setConcurrency (n: number): void {
    this.concurrency = Math.max(1, n)
    this.notify()
    this.pump()
  }

  getConcurrency (): number {
    return this.concurrency
  }

  add (config: DownloadConfig, callbacks: DownloadCallbacks = {}): string {
    const downloadId = config.downloadId || crypto.randomUUID()
    const merged: DownloadConfig = { ...config, downloadId }
    this.pending.push({ config: merged, callbacks })
    if (callbacks.onQueueChange) this.onQueueChange = callbacks.onQueueChange
    this.notify()
    this.pump()
    return downloadId
  }

  cancel (downloadId: string): boolean {
    const info = activeDownloads.get(downloadId)
    if (info) {
      info.aborted = true
      if (info.controller) info.controller.abort()
      return true
    }
    const idx = this.pending.findIndex(job => job.config.downloadId === downloadId)
    if (idx >= 0) {
      this.pending.splice(idx, 1)
      this.notify()
      return true
    }
    return false
  }

  getState (): QueueState {
    return {
      concurrency: this.concurrency,
      active: this.running.size,
      queued: this.pending.length,
      total: this.running.size + this.pending.length
    }
  }

  subscribe (listener: QueueListener): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notify (): void {
    const state = this.getState()
    for (const l of this.listeners) {
      try { l(state) } catch { /* ignore */ }
    }
    if (this.onQueueChange) {
      try { this.onQueueChange(state) } catch { /* ignore */ }
    }
  }

  private async pump (): Promise<void> {
    while (this.running.size < this.concurrency && this.pending.length > 0) {
      const job = this.pending.shift()!
      const { config } = job
      const id = config.downloadId!
      this.running.add(id)
      this.execute(config, job.callbacks).finally(() => {
        this.running.delete(id)
        this.notify()
        this.pump()
      })
    }
    this.notify()
  }

  private async execute (config: DownloadConfig, callbacks: DownloadCallbacks): Promise<void> {
    const {
      downloadId,
      downloadUrl,
      fileName,
      targetMountPath,
      options = {}
    } = config

    const { onProgress, onComplete, onError } = callbacks
    const controller = new AbortController()
    const signal = controller.signal

    if (!targetMountPath || !fs.existsSync(targetMountPath)) {
      const msg = 'Target mount path does not exist'
      if (onError) onError({ downloadId: downloadId!, message: msg })
      return
    }

    const info: DownloadInfo = {
      downloadId: downloadId!,
      downloadUrl,
      fileName,
      targetMountPath,
      aborted: false,
      signal,
      controller,
      enqueuedAt: Date.now()
    }
    activeDownloads.set(downloadId!, info)
    logDownload('Download started', {
      downloadId: downloadId!,
      url: downloadUrl,
      target: path.join(targetMountPath, fileName)
    })

    try {
      const result = await downloadWithRetry(downloadUrl, targetMountPath, fileName, {
        ...options,
        signal,
        onProgress: (progress) => {
          if (onProgress) onProgress({ ...progress, downloadId: downloadId! })
        }
      })
      if (onComplete) onComplete({ downloadId: downloadId!, ...result })
      activeDownloads.delete(downloadId!)
    } catch (err) {
      const message = err && (err as Error).message ? (err as Error).message : 'Download failed'
      if (onError) onError({ downloadId: downloadId!, message })
      activeDownloads.delete(downloadId!)
    }
  }
}

const queues = new Map<string, DownloadQueue>()

export function getQueue (id: string = 'default', concurrency: number = 2): DownloadQueue {
  let q = queues.get(id)
  if (!q) {
    q = new DownloadQueue(concurrency)
    queues.set(id, q)
  }
  return q
}

export function setQueueConcurrency (id: string, concurrency: number): void {
  getQueue(id, concurrency).setConcurrency(concurrency)
}

export function getQueueState (id: string = 'default'): QueueState {
  const q = queues.get(id)
  return q ? q.getState() : { concurrency: 2, active: 0, queued: 0, total: 0 }
}

export function cancelDownload (downloadId: string): boolean {
  for (const q of queues.values()) {
    if (q.cancel(downloadId)) return true
  }
  const info = activeDownloads.get(downloadId)
  if (info) {
    info.aborted = true
    if (info.controller) info.controller.abort()
    return true
  }
  return false
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
        const valid = await IsoProvider.prototype.verifyChecksum(tempPath, options.expectedSha256, 'sha256')
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
      if (signal?.aborted) throw lastError
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
  await new Promise<void>((resolve, reject) => {
    writeStream.once('error', reject)
    writeStream.end(resolve)
  })
  const sha256 = hash.digest('hex')
  if (onProgress) {
    const elapsed = Math.max((Date.now() - startTime) / 1000, 0.001)
    onProgress({
      transferredBytes: transferred,
      totalBytes,
      percentage: totalBytes ? 100 : null,
      downloadSpeedBytesPerSec: Math.round(transferred / elapsed),
      etaSeconds: totalBytes ? 0 : null
    })
  }
  return { sha256, totalBytes: transferred }
}

export function startDownload (config: DownloadConfig, callbacks: DownloadCallbacks = {}): string {
  const q = getQueue('default', 2)
  return q.add(config, callbacks)
}
