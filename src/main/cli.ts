/* src/main/cli.ts
 * CLI interface using minimist for lightweight argument parsing.
 */

import path from 'path'
import fs from 'fs'
import { loadCatalog, getDistroById } from './catalog'
import { detectAllDrives, getStorageInfo, getDriveDetails } from './usbDetectionService'
import { IsoProvider, StaticProvider, OfficialApiProvider, OfficialDirectoryProvider, GitHubReleaseProvider } from './isoProvider'
import { verifyVentoyMetadataReadOnly } from './ventoyMetadata'

interface CliArgs {
  [key: string]: string | boolean | string[] | undefined
  _?: string[]
}

interface DistroRecord {
  id: string
  name: string
  family?: string
  desktop?: string
  arch?: string
  iso_provider?: string
  github_repo?: string
  api_url?: string
  base_url?: string
  checksum_provider?: string
  version?: string
  iso?: { downloadUrl?: string; download_url?: string; fileName?: string; file_name?: string; size?: number; sha256?: string; releaseDate?: string; release_date?: string }
  downloadUrl?: string
  download_url?: string
  size?: number
  sha256?: string
  releaseDate?: string
  release_date?: string
  architectures?: string[]
  official_website?: string
  distros?: DistroRecord[]
}

function parseArgs (argv: string[]): CliArgs {
  const args: CliArgs = {}
  let i = 1
  while (i < argv.length && (argv[i].endsWith('.ts') || argv[i].endsWith('.js') || argv[i].includes('tsx') || argv[i].includes('node'))) {
    i++
  }
  for (; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        args[key] = next
        i++
      } else {
        args[key] = true
      }
    } else if (arg.startsWith('-')) {
      args[arg.slice(1)] = true
    } else {
      args._ = args._ || []
      args._.push(arg)
    }
  }
  return args
}

export async function runCommand (argv: string[]): Promise<void> {
  const args = parseArgs(argv)
  const command = (args._ && args._[0]) || (args.command as string) || null

  try {
    switch (command) {
      case 'list':
        return await cmdList(args)
      case 'detect-ventoy':
        return await cmdDetectVentoy(args)
      case 'usb:list':
        return await cmdUsbList(args)
      case 'usb:diagnose':
        return await cmdUsbDiagnose(args)
      case 'latest':
        return await cmdLatest(args)
      case 'download':
        return await cmdDownload(args)
      case 'update':
        return await cmdUpdate(args)
      case 'scan':
        return await cmdScan(args)
      case 'verify':
        return await cmdVerify(args)
      case 'sync':
        return await cmdSync(args)
      default:
        printHelp()
    }
  } catch {
    console.error(`Error: ${(new Error('command failed')).message}`)
    process.exitCode = 1
  }
}

async function cmdList (args: CliArgs): Promise<void> {
  const cat = loadCatalog()
  const search = ((args.search as string) || '').toLowerCase()
  const category = (args.category as string) || 'all'
  let count = 0
  const entries = Object.entries(cat)
  for (const [, group] of entries) {
    const groupEntry = group as { distros?: DistroRecord[] }
    if (!groupEntry.distros) continue
    for (const distro of groupEntry.distros) {
      if (search && !(distro.name as string).toLowerCase().includes(search)) continue
      if (category !== 'all' && !((distro.family || '').toString().toLowerCase().includes(category))) continue
      console.log(`- ${distro.id}: ${distro.name} (${distro.desktop || 'N/A'}) - ${distro.arch || 'x86_64'}`)
      count++
    }
  }
  console.log(`\nTotal: ${count} distros`)
}

async function cmdDetectVentoy (_args: CliArgs): Promise<void> {
  const drives = detectAllDrives()
  const ventoyDrives = drives.filter(d => d.isVentoy)
  if (ventoyDrives.length === 0) {
    console.log('No Ventoy drives detected')
    console.log(`Total USB drives found: ${drives.length}`)
    return
  }
  for (const drive of ventoyDrives) {
    console.log(`\nDevice: ${drive.device}`)
    console.log(`  Model: ${drive.model || 'N/A'}`)
    console.log(`  Vendor: ${drive.vendor || 'N/A'}`)
    console.log(`  Serial: ${drive.serial || 'N/A'}`)
    console.log(`  Size: ${formatBytes(drive.size)}`)
    console.log(`  Transport: ${drive.transport || 'USB'}`)
    console.log(`  Removable: ${drive.removable}`)
    console.log(`  Confidence: ${drive.ventoyConfidence}`)
    console.log(`  Ventoy Version: ${drive.ventoyVersion || 'unavailable'}`)
    console.log(`  Data Path: ${drive.ventoyDataPath || 'N/A'}`)
    console.log(`  Boot Path: ${drive.ventoyBootPath || 'N/A'}`)
    if (drive.ventoyDataPath) {
      const storage = getStorageInfo(drive.ventoyDataPath)
      if (storage) {
        console.log(`  Storage: ${formatBytes(storage.total)} total, ${formatBytes(storage.available)} free (${storage.percentUsed}% used)`)
      }
    }
    console.log(`  Partitions:`)
    for (const p of drive.partitions) {
      console.log(`    - ${p.device}: ${p.filesystem || 'unknown'} ${p.label || ''} (${formatBytes(p.size)}) mount: ${p.mountPoints.join(', ') || 'none'}`)
    }
  }
}

async function cmdUsbList (_args: CliArgs): Promise<void> {
  const drives = detectAllDrives()
  if (drives.length === 0) {
    console.log('No USB drives detected')
    return
  }
  console.log('USB Drives')
  console.log('────────────────────────────────────')
  for (const drive of drives) {
    const confidence = drive.ventoyConfidence === 'high' ? 'YES' : drive.ventoyConfidence === 'medium' ? 'LIKELY' : drive.isVentoy ? 'POSSIBLE' : 'NO'
    console.log(`\n[${drive.device}] ${drive.model || drive.name}`)
    console.log(`    Device: ${drive.device}`)
    console.log(`    Transport: ${drive.transport || 'USB'}`)
    console.log(`    Removable: ${drive.removable}`)
    console.log(`    Size: ${formatBytes(drive.size)}`)
    console.log(`    Ventoy: ${confidence}`)
    console.log(`    Confidence: ${drive.ventoyConfidence.toUpperCase()}`)
    if (drive.ventoyVersion) {
      console.log(`    Version: ${drive.ventoyVersion}`)
    }
  }
}

async function cmdUsbDiagnose (args: CliArgs): Promise<void> {
  const device = (args.device as string) || (args._ && args._[1] ? (args._[1] as string) : null)
  if (!device) {
    console.error('Usage: linux-iso-manager usb:diagnose [--device /dev/sdX]')
    process.exitCode = 1
    return
  }
  const drive = getDriveDetails(device)
  if (!drive) {
    console.error(`Device not found or not a USB drive: ${device}`)
    process.exitCode = 1
    return
  }
  const meta = verifyVentoyMetadataReadOnly(drive as unknown as Record<string, unknown>)
  const storage = drive.ventoyDataPath ? getStorageInfo(drive.ventoyDataPath) : null

  console.log(`\nUSB Diagnostics`)
  console.log('────────────────────────────────────')
  console.log(`\nDevice:`)
  console.log(`  ${drive.device}`)
  console.log(`\nTransport:`)
  console.log(`  ${drive.transport || 'USB'}`)
  console.log(`\nRemovable:`)
  console.log(`  ${drive.removable}`)
  console.log(`\nModel:`)
  console.log(`  ${drive.model || 'N/A'}`)
  console.log(`\nCapacity:`)
  console.log(`  ${formatBytes(drive.size)}`)
  console.log(`\nPartitions:`)
  console.log(`  ${drive.partitions.length}`)
  for (const p of drive.partitions) {
    console.log(`\n  Partition ${p.number}:`)
    console.log(`    Device: ${p.device}`)
    console.log(`    Filesystem: ${p.filesystem || 'N/A'}`)
    console.log(`    Label: ${p.label || 'N/A'}`)
    console.log(`    Mount: ${p.mountPoints.join(', ') || 'not mounted'}`)
  }
  console.log(`\nVentoy metadata:`)
  console.log(`  ${meta.verified ? '✓ Found' : '✗ Not found'}`)
  console.log(`\nVentoy signature:`)
  console.log(`  ${(meta.mbrSignature || meta.stage2Signature) ? '✓ Valid' : '✗ Not found'}`)
  console.log(`\nVentoy checksum:`)
  console.log(`  ${meta.rawReadOnly ? '✓ Read-only verification' : '✗ N/A'}`)
  console.log(`\nVentoy version:`)
  console.log(`  ${meta.version || drive.ventoyVersion || 'unavailable'}`)
  console.log(`\nConfidence:`)
  console.log(`  ${drive.ventoyConfidence.toUpperCase()}`)
  if (storage) {
    console.log(`\nStorage:`)
    console.log(`  ${formatBytes(storage.total)} total`)
    console.log(`  ${formatBytes(storage.used)} used`)
    console.log(`  ${formatBytes(storage.available)} free`)
  } else {
    console.log(`\nStorage:`)
    console.log(`  information unavailable`)
  }
}

async function cmdLatest (args: CliArgs): Promise<void> {
  const distroId = args._ && args._[1] ? (args._[1] as string) : null
  if (!distroId) {
    console.error('Usage: linux-iso-manager latest <distro-id>')
    process.exitCode = 1
    return
  }
  const cat = loadCatalog()
  const distro = getDistroById(cat, distroId)
  if (!distro) {
    console.error(`Distro not found: ${distroId}`)
    process.exitCode = 1
    return
  }
  const provider = createProvider(distro)
  const release = await provider.getLatestRelease()
  console.log(JSON.stringify(release, null, 2))
}

async function cmdDownload (args: CliArgs): Promise<void> {
  const distroId = args._ && args._[1] ? (args._[1] as string) : null
  const target = (args.ventoy as string) || (args.target as string) || null
  if (!distroId) {
    console.error('Usage: linux-iso-manager download <distro-id> [--ventoy <mount>]')
    process.exitCode = 1
    return
  }
  console.log(`Download requested for ${distroId} to ${target || 'current directory'}`)
  console.log('(Download implementation requires GUI or main process context)')
}

async function cmdUpdate (args: CliArgs): Promise<void> {
  const distroId = args._ && args._[1] ? (args._[1] as string) : null
  console.log(`Update check requested for ${distroId || 'all distros'}`)
}

async function cmdScan (args: CliArgs): Promise<void> {
  const target = (args.ventoy as string) || (args.target as string) || null
  if (!target) {
    console.error('Usage: linux-iso-manager scan --ventoy <mount-path>')
    process.exitCode = 1
    return
  }
  if (!fs.existsSync(target)) {
    console.error(`Path does not exist: ${target}`)
    process.exitCode = 1
    return
  }
  const entries = fs.readdirSync(target).filter(f => f.toLowerCase().endsWith('.iso'))
  console.log(`Found ${entries.length} ISOs in ${target}:`)
  for (const iso of entries) {
    const stats = fs.statSync(path.join(target, iso))
    console.log(`- ${iso} (${formatBytes(stats.size)})`)
  }
}

async function cmdVerify (args: CliArgs): Promise<void> {
  const filePath = args._ && args._[1] ? (args._[1] as string) : null
  if (!filePath) {
    console.error('Usage: linux-iso-manager verify <file.iso>')
    process.exitCode = 1
    return
  }
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exitCode = 1
    return
  }
  const nodeCrypto = require('crypto')
  const hash = nodeCrypto.createHash('sha256')
  const fd = fs.openSync(filePath, 'r')
  const chunk = Buffer.alloc(1024 * 1024)
  let read = 0
  while ((read = fs.readSync(fd, chunk, 0, chunk.length, null)) > 0) {
    hash.update(chunk.slice(0, read))
  }
  fs.closeSync(fd)
  console.log(`SHA256: ${hash.digest('hex')}`)
}

async function cmdSync (args: CliArgs): Promise<void> {
  const distros = ((args.distros as string) || '').split(',').map(s => s.trim()).filter(Boolean)
  const ventoy = (args.ventoy as string) || (args.target as string) || null
  const dryRun = (args.dryrun as boolean) || (args['dry-run'] as boolean) || false
  console.log(`Sync requested for distros: ${distros.join(', ') || 'all'}`)
  console.log(`Target: ${ventoy || 'default Ventoy'}`)
  console.log(`Dry run: ${dryRun}`)
}

function createProvider (distro: DistroRecord): IsoProvider {
  if (distro.iso_provider === 'github-release') {
    return new GitHubReleaseProvider({
      name: distro.name,
      repo: distro.github_repo,
      arch: distro.architectures && distro.architectures[0]
    })
  }
  if (distro.iso_provider === 'official-api') {
    return new OfficialApiProvider({
      name: distro.name,
      apiUrl: distro.api_url,
      arch: distro.architectures && distro.architectures[0]
    })
  }
  if (distro.iso_provider === 'official-directory') {
    return new OfficialDirectoryProvider({
      name: distro.name,
      baseUrl: distro.base_url,
      arch: distro.architectures && distro.architectures[0],
      checksumPattern: distro.checksum_provider ? new RegExp(distro.checksum_provider as string) : null
    })
  }
  const iso = distro.iso || {
    downloadUrl: distro.downloadUrl || distro.download_url,
    size: distro.size,
    sha256: distro.sha256,
    releaseDate: distro.releaseDate || distro.release_date
  }
  return new StaticProvider({
    name: distro.name,
    version: distro.version,
    arch: distro.architectures && distro.architectures[0],
    iso,
    officialWebsite: distro.official_website
  })
}

function formatBytes (bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return 'Unknown'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function printHelp (): void {
  console.log(`
Linux ISO Manager CLI

Usage:
  linux-iso-manager <command> [options]

Commands:
  list [search]              List available distros
  detect-ventoy              Detect Ventoy USB drives (detailed)
  usb:list                   List all USB drives
  usb:diagnose --device      Detailed USB diagnostics
  latest <distro-id>         Resolve latest ISO for a distro
  download <distro-id>       Download ISO (GUI context required)
  update <distro-id>         Check for updates
  scan --ventoy <mount>      Scan ISOs on Ventoy drive
  verify <file.iso>          Verify ISO checksum
  sync [options]             Sync distros to Ventoy

Options:
  --ventoy <path>            Ventoy mount path
  --device <path>            Device path for diagnostics
  --distros <list>           Comma-separated distro IDs
  --dry-run                  Plan without modifying
  --search <term>            Search distros
  --category <name>          Filter by category
  --help                     Show this help
`)
}

runCommand(process.argv).catch(err => {
  console.error(`Error: ${err.message}`)
  process.exitCode = 1
})
