/* tests/unit/catalog.test.ts
 * Tests for catalog loading, YAML parsing, and distro metadata.
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import * as catalog from '../../src/main/catalog'

describe('catalog', () => {
  it('should load catalog object with groups', () => {
    const cat = catalog.loadCatalog()
    expect(cat && typeof cat === 'object').toBe(true)
    expect(Object.keys(cat).length > 0).toBe(true)
  })

  it('should find ubuntu-desktop by id', () => {
    const cat = catalog.loadCatalog()
    const ubuntu = catalog.getDistroById(cat, 'ubuntu-desktop')
    expect(ubuntu).toBeTruthy()
    expect(ubuntu!.name).toBe('Ubuntu')
    const arch = ubuntu!.architectures ? ubuntu!.architectures[0] : (ubuntu! as any).arch
    expect(['x86_64', 'amd64'].includes(arch)).toBe(true)
  })

  it('should find fedora-workstation by id', () => {
    const cat = catalog.loadCatalog()
    const fedora = catalog.getDistroById(cat, 'fedora-workstation')
    expect(fedora).toBeTruthy()
  })

  it('should return null for nonexistent distro', () => {
    const cat = catalog.loadCatalog()
    const notFound = catalog.getDistroById(cat, 'nonexistent-distro-xyz')
    expect(notFound).toBeNull()
  })

  it('should have yaml distros available', () => {
    const yamlDir = path.join(__dirname, '..', '..', 'distros')
    if (fs.existsSync(yamlDir)) {
      const yamlFiles = fs.readdirSync(yamlDir).filter(f => f.endsWith('.yaml'))
      expect(yamlFiles.length >= 15).toBe(true)
    }
  })

  it('should have ubuntu and fedora groups in catalog', () => {
    const cat = catalog.loadCatalog()
    expect(cat['Ubuntu'] || cat['ubuntu']).toBeTruthy()
    expect(cat['Fedora'] || cat['fedora']).toBeTruthy()
  })
})
