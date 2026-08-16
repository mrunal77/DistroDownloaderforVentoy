/* tests/unit/isoProvider.test.ts
 * Tests for ISO provider abstraction.
 */

import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import * as isoProvider from '../../src/main/isoProvider'

describe('isoProvider', () => {
  it('should create StaticProvider with correct release fields', async () => {
    const staticProvider = new isoProvider.StaticProvider({
      name: 'Test Distro',
      version: '1.0',
      arch: 'x86_64',
      iso: {
        downloadUrl: 'https://example.com/test.iso',
        size: 1024 * 1024 * 1024,
        sha256: 'abcd1234'
      }
    })

    const release = await staticProvider.getLatestRelease()
    expect(release.distro).toBe('Test Distro')
    expect(release.version).toBe('1.0')
    expect(release.download_url).toBe('https://example.com/test.iso')
    expect(release.source).toBe('static')
  })

  it('should have base verifyChecksum on IsoProvider', () => {
    const provider = new isoProvider.IsoProvider()
    expect(provider.verifyChecksum).toBe(isoProvider.IsoProvider.prototype.verifyChecksum)
  })

  it('should distinguish a matching SHA-256 checksum from a mismatch', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'iso-checksum-test-'))
    const filePath = path.join(directory, 'sample.iso')
    fs.writeFileSync(filePath, 'checksum fixture')
    const expected = crypto.createHash('sha256').update('checksum fixture').digest('hex')
    const provider = new isoProvider.IsoProvider()

    try {
      expect(await provider.verifyChecksum(filePath, expected)).toBe(true)
      expect(await provider.verifyChecksum(filePath, '0'.repeat(64))).toBe(false)
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })

  it('should extract version from iso filename', () => {
    expect(typeof isoProvider.extractVersionFromName).toBe('function')
    const ver = isoProvider.extractVersionFromName('ubuntu-24.04-desktop-amd64.iso')
    expect(ver).toBe('24.04')
  })

  it('should create GitHubReleaseProvider', () => {
    const githubProvider = new isoProvider.GitHubReleaseProvider({
      name: 'Test',
      repo: 'nonexistent/test-repo'
    })
    expect(githubProvider).toBeTruthy()
  })
})
