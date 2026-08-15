/* src/main/catalog.ts
 * Loads and merges distro metadata from bundled catalog.json and distros/*.yaml.
 */

import fs from 'fs'
import path from 'path'

const BUNDLED_CATALOG = path.join(__dirname, '..', 'shared', 'catalog.json')
const DISTROS_DIR = path.join(__dirname, '..', '..', 'distros')

interface DistroEntry {
  id: string
  name: string
  [key: string]: unknown
  distros?: DistroEntry[]
}

interface CatalogEntry {
  [key: string]: unknown
  distros?: DistroEntry[]
}

type Catalog = Record<string, CatalogEntry>

export function loadBundledCatalog (): Catalog {
  try {
    if (fs.existsSync(BUNDLED_CATALOG)) {
      const data = fs.readFileSync(BUNDLED_CATALOG, 'utf8')
      return JSON.parse(data) as Catalog
    }
  } catch {
    // ignore
  }
  return {}
}

export function loadYamlDistros (): Record<string, DistroEntry> {
  const results: Record<string, DistroEntry> = {}
  try {
    const files = fs.readdirSync(DISTROS_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(DISTROS_DIR, file), 'utf8')
        const parsed = parseYaml(content)
        const parsedId = parsed.id as string | undefined
        if (parsedId) {
          if (!parsed.desktop && parsed.desktop_environments) {
            const envs = parsed.desktop_environments as string[] | string | undefined
            parsed.desktop = Array.isArray(envs) ? envs[0] : typeof envs === 'string' ? envs : undefined
          }
          results[parsedId] = parsed as DistroEntry
        }
      } catch {
        // skip invalid yaml
      }
    }
  } catch {
    // no distros dir
  }
  return results
}

function parseYaml (content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = content.split(/\r?\n/)
  let currentKey: string | null = null
  let currentArray: string[] | null = null
  let arrayItem: Record<string, unknown> | string | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const listMatch = line.match(/^-\s+(.+)$/)
    if (listMatch) {
      if (!currentArray) {
        currentArray = []
        if (currentKey) result[currentKey] = currentArray
      }
      const raw = listMatch[1].trim()
      const parsed = parseYamlLine(raw)
      arrayItem = Object.keys(parsed).length > 0 ? parsed : raw
      if (currentArray) currentArray.push(arrayItem as string)
      continue
    }

    const kvMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)?$/)
    if (kvMatch) {
      currentKey = kvMatch[1]
      currentArray = null
      const value = (kvMatch[2] || '').trim()
      if (!value) {
        result[currentKey] = null
      } else if (value === '[]') {
        result[currentKey] = []
      } else if (value.startsWith('[') && value.endsWith(']')) {
        const items = value.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean)
        result[currentKey] = items
      } else if (value === 'true' || value === 'false') {
        result[currentKey] = value === 'true'
      } else if (!isNaN(Number(value))) {
        result[currentKey] = Number(value)
      } else {
        result[currentKey] = value.replace(/^["']|["']$/g, '')
      }
      continue
    }

    if (arrayItem && typeof arrayItem === 'object' && line && !line.startsWith('-')) {
      const nestedKv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)?$/)
      if (nestedKv) {
        arrayItem[nestedKv[1]] = nestedKv[2].trim().replace(/^["']|["']$/g, '') || null
      }
    }
  }

  return result
}

function parseYamlLine (line: string): Record<string, string> {
  const result: Record<string, string> = {}
  const parts = line.split(',')
  for (const part of parts) {
    const kv = part.trim().match(/^([a-zA-Z0-9_-]+)=(.*)?$/)
    if (kv) {
      result[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '')
    }
  }
  return result
}

export function loadCatalog (): Catalog {
  const bundled = loadBundledCatalog()
  const yamlDistros = loadYamlDistros()

  for (const [id, distro] of Object.entries(yamlDistros)) {
    const name = distro.name || id
    if (!bundled[name]) {
      bundled[name] = { ...distro, distros: [distro] }
    } else {
      const existing = bundled[name]
      if (!existing.distros) existing.distros = []
      const dup = existing.distros.find(d => isDuplicateOf(d, distro))
      if (!dup && !existing.distros.find(d => d.id === distro.id)) {
        existing.distros.push(distro)
      }
    }
  }

  return bundled
}

function isDuplicateOf (a: DistroEntry, b: DistroEntry): boolean {
  const aUrl = (a.iso as any)?.download_url || (a as any).downloadUrl || (a as any).download_url
  const bUrl = (b.iso as any)?.download_url || (b as any).downloadUrl || (b as any).download_url
  if (aUrl && bUrl && aUrl === bUrl) return true

  const aFile = (a.iso as any)?.file_name || (a as any).fileName || (a as any).file_name
  const bFile = (b.iso as any)?.file_name || (b as any).fileName || (b as any).file_name
  if (aFile && bFile && aFile === bFile) return true

  const aName = a.name || a.id
  const bName = b.name || b.id
  if (aName && bName && aName === bName) return true

  return false
}

export function getDistroById (catalog: Catalog, distroId: string): DistroEntry | null {
  for (const parent of Object.values(catalog)) {
    if (!parent || !parent.distros) continue
    const found = parent.distros.find(d => d.id === distroId)
    if (found) return found
  }
  return null
}
