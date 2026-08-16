/* src/main/isoProvider.ts
 * Abstraction for resolving latest ISO information from various sources.
 */

import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export interface IsoProviderConfig {
  name?: string
  iso?: { downloadUrl?: string; download_url?: string; fileName?: string; file_name?: string; size?: number; sha256?: string; releaseDate?: string; release_date?: string }
  apiUrl?: string
  transform?: (data: Record<string, unknown>) => Record<string, unknown>
  repo?: string
  assetPattern?: RegExp
  archFilter?: RegExp | null
  baseUrl?: string
  pattern?: RegExp
  checksumPattern?: RegExp | null
  mirrors?: IsoProviderConfig[]
  select?: (items: IsoRelease[]) => IsoRelease
  officialWebsite?: string | null
  architectures?: string[]
  iso_provider?: string
  github_repo?: string
  base_url?: string
  checksum_provider?: string
  version?: string
  distros?: Record<string, unknown>
  family?: string
  desktop?: string
  arch?: string
  id?: string
  url?: string
  sha256sum?: string
  filename?: string
  category?: string
  providerType?: string
}

export interface IsoRelease {
  distro: string
  version: string
  architecture: string
  iso_name: string
  download_url: string
  size: number | null
  sha256: string | null
  release_date: string | null
  source: string
  official_website: string | null
}

interface GitHubAsset {
  name: string
  browser_download_url: string
  size: number
}

interface GitHubRelease {
  name: string
  tag_name: string
  published_at: string | null
  assets: GitHubAsset[]
}

class IsoProvider {
  config: IsoProviderConfig

  constructor (config: IsoProviderConfig = {}) {
    this.config = config
  }

  async getLatestRelease (): Promise<IsoRelease> {
    throw new Error('getLatestRelease not implemented')
  }

  async getIso (_release: IsoRelease): Promise<IsoRelease> {
    return _release
  }

  async getChecksum (_release: IsoRelease): Promise<string | null> {
    return null
  }

  async getSignature (_release: IsoRelease): Promise<string | null> {
    return null
  }

  async verifyChecksum (filePath: string | undefined | null, expectedChecksum: string | undefined | null, algorithm = 'sha256'): Promise<boolean | null> {
    if (!expectedChecksum || !filePath) return null
    try {
      const hash = crypto.createHash(algorithm)
      const fd = await fs.promises.open(filePath, 'r')
      try {
        const chunkSize = 4 * 1024 * 1024
        let position = 0
        const { size } = await fd.stat()
        while (position < size) {
          const buffer = Buffer.allocUnsafe(Math.min(chunkSize, size - position))
          const { bytesRead } = await fd.read(buffer, 0, buffer.length, position)
          if (bytesRead === 0) break
          hash.update(buffer.subarray(0, bytesRead))
          position += bytesRead
        }
      } finally {
        await fd.close()
      }
      const actual = hash.digest('hex').toLowerCase()
      return actual === expectedChecksum.toLowerCase()
    } catch {
      return null
    }
  }
}

class StaticProvider extends IsoProvider {
  iso: IsoProviderConfig['iso'] | null

  constructor (config: IsoProviderConfig = {}) {
    super(config)
    this.iso = config.iso || null
  }

  async getLatestRelease (): Promise<IsoRelease> {
    if (!this.iso) throw new Error('Static provider missing iso config')
    return {
      distro: this.config.name || 'Unknown',
      version: this.config.version || 'latest',
      architecture: this.config.arch || 'x86_64',
      iso_name: this.iso.fileName || this.iso.file_name || path.basename(this.iso.downloadUrl || this.iso.download_url || ''),
      download_url: this.iso.downloadUrl || this.iso.download_url || '',
      size: this.iso.size || null,
      sha256: this.iso.sha256 || null,
      release_date: this.iso.releaseDate || this.iso.release_date || null,
      source: 'static',
      official_website: this.config.officialWebsite || null
    }
  }
}

class OfficialApiProvider extends IsoProvider {
  apiUrl: string | undefined
  transform: (data: Record<string, unknown>) => Record<string, unknown>

  constructor (config: IsoProviderConfig = {}) {
    super(config)
    this.apiUrl = config.apiUrl
    this.transform = config.transform || ((r: Record<string, unknown>) => r)
  }

  async getLatestRelease (): Promise<IsoRelease> {
    if (!this.apiUrl) throw new Error('OfficialApiProvider missing apiUrl')
    const data = await fetchJson(this.apiUrl)
    const transformed = this.transform(data)
    return {
      distro: this.config.name || (transformed.name as string) || 'Unknown',
      version: (transformed.version as string) || 'latest',
      architecture: (transformed.arch as string) || 'x86_64',
      iso_name: path.basename((transformed.downloadUrl as string) || ''),
      download_url: transformed.downloadUrl as string,
      size: (transformed.size as number) || null,
      sha256: (transformed.sha256 as string) || null,
      release_date: (transformed.releaseDate as string) || null,
      source: 'official-api',
      official_website: this.config.officialWebsite || (transformed.officialWebsite as string) || null
    }
  }
}

class GitHubReleaseProvider extends IsoProvider {
  repo: string | undefined
  assetPattern: RegExp
  archFilter: RegExp | null

  constructor (config: IsoProviderConfig = {}) {
    super(config)
    this.repo = config.repo
    this.assetPattern = config.assetPattern || /\.iso$/i
    this.archFilter = config.archFilter || null
  }

  async getLatestRelease (): Promise<IsoRelease> {
    if (!this.repo) throw new Error('GitHubReleaseProvider missing repo')
    const url = `https://api.github.com/repos/${this.repo}/releases/latest`
    const data = await fetchJson(url) as unknown as GitHubRelease
    const assets = (data?.assets || []).filter(a => this.assetPattern.test(a.name))
    let asset: GitHubAsset | undefined = assets[0]
    if (this.archFilter && assets.length > 1) {
      const archFilter = this.archFilter
      asset = assets.find(a => archFilter.test(a.name)) || assets[0]
    }
    if (!asset) throw new Error('No matching ISO asset found in latest release')
    return {
      distro: this.config.name || data.name || 'Unknown',
      version: data.tag_name || data.name || 'latest',
      architecture: this.config.arch || 'x86_64',
      iso_name: asset.name,
      download_url: asset.browser_download_url,
      size: asset.size || null,
      sha256: null,
      release_date: data.published_at || null,
      source: 'github-release',
      official_website: this.config.officialWebsite || `https://github.com/${this.repo}`
    }
  }
}

class OfficialDirectoryProvider extends IsoProvider {
  baseUrl: string | undefined
  pattern: RegExp
  checksumPattern: RegExp | null
  archFilter: RegExp | null

  constructor (config: IsoProviderConfig = {}) {
    super(config)
    this.baseUrl = config.baseUrl
    this.pattern = config.pattern || /\.iso$/i
    this.checksumPattern = config.checksumPattern || null
    this.archFilter = config.archFilter || null
  }

  async getLatestRelease (): Promise<IsoRelease> {
    if (!this.baseUrl) throw new Error('OfficialDirectoryProvider missing baseUrl')
    const html = await fetchText(this.baseUrl)
    const urls = extractIsoUrls(html, this.baseUrl)
    const archFilter = this.archFilter
    const filtered = archFilter ? urls.filter(u => archFilter.test(u)) : urls
    if (filtered.length === 0) throw new Error('No ISOs found in directory listing')
    const latest = filtered[filtered.length - 1]
    const isoName = path.basename(latest)
    const checksum = await this.findChecksum(html, isoName, latest)
    return {
      distro: this.config.name || 'Unknown',
      version: extractVersionFromName(isoName) || 'latest',
      architecture: this.config.arch || 'x86_64',
      iso_name: isoName,
      download_url: latest,
      size: null,
      sha256: checksum,
      release_date: null,
      source: 'official-directory',
      official_website: this.config.officialWebsite || this.baseUrl
    }
  }

  async findChecksum (html: string, isoName: string, isoUrl: string): Promise<string | null> {
    if (!this.checksumPattern) return null
    const matches = html.match(this.checksumPattern)
    if (!matches || matches.length < 2) return null
    const checksumUrl = new URL(matches[1], isoUrl).href
    try {
      const text = await fetchText(checksumUrl)
      const lines = text.split(/\r?\n/)
      for (const line of lines) {
        if (line.includes(isoName)) {
          const parts = line.trim().split(/\s+/)
          if (parts.length >= 1) return parts[0].toLowerCase()
        }
      }
    } catch {
      // ignore checksum fetch failure
    }
    return null
  }
}

class MirrorProvider extends IsoProvider {
  mirrors: IsoProviderConfig[]
  select: (items: IsoRelease[]) => IsoRelease

  constructor (config: IsoProviderConfig = {}) {
    super(config)
    this.mirrors = config.mirrors || []
    this.select = config.select || ((items: IsoRelease[]) => items[0])
  }

  async getLatestRelease (): Promise<IsoRelease> {
    if (this.mirrors.length === 0) throw new Error('MirrorProvider missing mirrors')
    const results: IsoRelease[] = []
    for (const mirror of this.mirrors) {
      try {
        const provider = mirror.providerType === 'github'
          ? new GitHubReleaseProvider(mirror)
          : mirror.providerType === 'official-api'
            ? new OfficialApiProvider(mirror)
            : new OfficialDirectoryProvider(mirror)
        const release = await provider.getLatestRelease()
        results.push(release)
      } catch {
        // continue to next mirror
      }
    }
    if (results.length === 0) throw new Error('All mirrors failed')
    const selected = this.select(results)
    return { ...selected, source: 'mirror' }
  }
}

function fetchJson (url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, { timeout: 30000, headers: { 'User-Agent': 'VentoyLinuxDistroDownloader/0.3.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchJson(res.headers.location).then(resolve, reject)
        return
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      const chunks: Buffer[] = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
        } catch {
          reject(new Error('Failed to parse JSON'))
        }
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error(`Request timeout for ${url}`))
    })
  })
}

function fetchText (url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, { timeout: 30000, headers: { 'User-Agent': 'VentoyLinuxDistroDownloader/0.3.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchText(res.headers.location).then(resolve, reject)
        return
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      const chunks: Buffer[] = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error(`Request timeout for ${url}`))
    })
  })
}

function extractIsoUrls (html: string, baseUrl: string): string[] {
  const urls = new Set<string>()
  const hrefRegex = /href\s*=\s*["']([^"']+\.iso(?:\?[^"']*)?)["']/gi
  let match: RegExpExecArray | null
  while ((match = hrefRegex.exec(html)) !== null) {
    let url = match[1]
    if (url.startsWith('./')) url = url.slice(2)
    if (!url.startsWith('http')) {
      url = new URL(url, baseUrl).href
    }
    urls.add(url)
  }
  return Array.from(urls).sort()
}

function extractVersionFromName (name: string): string | null {
  const m = name.match(/(\d+\.\d+(?:\.\d+)?)/)
  return m ? m[1] : null
}

export { IsoProvider, StaticProvider, OfficialApiProvider, GitHubReleaseProvider, OfficialDirectoryProvider, MirrorProvider, extractVersionFromName }
