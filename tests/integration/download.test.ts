/* tests/integration/download.test.ts
 * Integration tests for download manager.
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import http from 'http'
import os from 'os'
import * as downloadManager from '../../src/main/downloadManager'

describe('download integration', () => {
  async function createFakeIsoServer (sizeBytes = 1024 * 1024 * 10): Promise<{ server: http.Server; url: string }> {
    return new Promise((resolve) => {
      const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': String(sizeBytes) })
        let sent = 0
        const chunk = crypto.randomBytes(64 * 1024)
        function writeMore () {
          if (sent >= sizeBytes) {
            res.end()
            return
          }
          const toWrite = Math.min(chunk.length, sizeBytes - sent)
          res.write(chunk.slice(0, toWrite))
          sent += toWrite
          setImmediate(writeMore)
        }
        writeMore()
      })
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port')
        resolve({ server, url: `http://127.0.0.1:${address.port}/test.iso` })
      })
    })
  }

  it('should stream, report progress, and write file', async () => {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iso-dl-test-'))

    const { server, url } = await createFakeIsoServer(1024 * 1024 * 5)

    let completed = false
    let progressReceived = false

    await new Promise<void>((resolve, reject) => {
      downloadManager.startDownload({
        downloadId: 'test-dl-1',
        downloadUrl: url,
        fileName: 'test-download.iso',
        targetMountPath: targetDir
      }, {
        onProgress: (p) => {
          if (p.percentage && p.percentage > 0) progressReceived = true
        },
        onComplete: () => {
          completed = true
          resolve()
        },
        onError: (e) => reject(new Error('Download failed: ' + e.message))
      })
    })

    expect(completed).toBe(true)
    expect(progressReceived).toBe(true)

    const downloadedFile = path.join(targetDir, 'test-download.iso')
    expect(fs.existsSync(downloadedFile)).toBe(true)
    const stats = fs.statSync(downloadedFile)
    expect(stats.size).toBe(5 * 1024 * 1024)

    server.close()
    fs.rmSync(targetDir, { recursive: true, force: true })
  })
})
