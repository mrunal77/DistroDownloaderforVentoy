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
  async function createFakeIsoServer (port: number, sizeBytes = 1024 * 1024 * 10): Promise<http.Server> {
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
      server.listen(port, () => resolve(server))
    })
  }

  it('should stream, report progress, and write file', async () => {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iso-dl-test-'))

    const server = await createFakeIsoServer(9876, 1024 * 1024 * 5)
    const url = 'http://localhost:9876/test.iso'

    let completed = false
    let progressReceived = false

    await downloadManager.startDownload({
      downloadId: 'test-dl-1',
      downloadUrl: url,
      fileName: 'test-download.iso',
      targetMountPath: targetDir
    }, {
      onProgress: (p) => {
        if (p.percentage && p.percentage > 0) progressReceived = true
      },
      onComplete: (_r) => {
        completed = true
      },
      onError: (e) => {
        throw new Error('Download failed: ' + e.message)
      }
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
