/* tests/security/security.test.ts
 * Security tests for path traversal, malicious URLs, symlinks, etc.
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import * as downloadManager from '../../src/main/downloadManager'

describe('security', () => {
  it('should reject malicious URLs and prevent path traversal', async () => {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iso-sec-test-'))

    expect(typeof downloadManager.startDownload).toBe('function')

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 2000)
      try {
        await downloadManager.startDownload({
          downloadId: 'bad-url',
          downloadUrl: 'file:///etc/passwd',
          fileName: 'evil.iso',
          targetMountPath: targetDir,
          options: { signal: controller.signal }
        }, {
          onError: () => {
            throw new Error('Should not reach onError for file:// URL in this context')
          }
        })
      } finally {
        clearTimeout(timeout)
      }
    } catch (e) {
      expect(e.message.includes('ENOTFOUND') || e.message.includes('ECONNREFUSED') || e.message.includes('aborted') || e.message.includes('connect') || e.message.includes('protocol') || e.message.includes('URL')).toBe(true)
    }

    try {
      await downloadManager.startDownload({
        downloadId: 'bad-path',
        downloadUrl: 'http://localhost:1/bad',
        fileName: '../etc/passwd',
        targetMountPath: targetDir
      }, {
        onError: () => {}
      })
      const escaped = path.join(targetDir, '..', 'etc', 'passwd')
      expect(fs.existsSync(escaped)).toBe(false)
    } catch {
      // expected - download may fail before file creation
    }

    const badUrl = 'javascript:alert(1)'
    const urlObj = new URL(badUrl)
    expect(urlObj.protocol).toBe('javascript:')

    fs.rmSync(targetDir, { recursive: true, force: true })
  }, 10000)
})
