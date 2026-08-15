# Security Policy

## Reporting Security Issues

If you discover a security vulnerability in this application, please report it responsibly:

- **GitHub Security Advisory**: Use the "Security" tab on GitHub to create a private advisory
- **Email**: Contact the maintainer directly with details

Please do **not** open public issues for security vulnerabilities.

## Threat Model

### Malicious USB Devices

| Threat | Mitigation |
|--------|-----------|
| Malicious Ventoy ISO on USB | SHA-256 checksum verification before using any ISO |
| Drive with fake Ventoy signatures | Confidence scoring: only high/medium confidence drives shown |
| USB auto-executing payloads | Application is read-only; never executes code from USB |
| Symlink attack on mount points | `path.join` normalization + explicit existence checks |
| Fake device paths (`/dev/../etc/passwd`) | Device paths must start with `/dev/` |
| Read-only device masquerading | `detectPhysicalUsbDisks` skips drives where `ro=1` |

### Network Attacks

| Threat | Mitigation |
|--------|-----------|
| Man-in-the-middle (MITM) | All downloads use HTTPS with certificate validation |
| Certificate pinning bypass | No custom CA store; uses system trust store |
| HTTP downgrade | `fetchJson` and `fetchText` use `https` module for known HTTPS endpoints |
| Malicious redirect | Max 5 redirects; redirect target validated via same protocol |
| DNS rebinding | No arbitrary redirects; redirects only to same origin family |

### Path Traversal

| Threat | Mitigation |
|--------|-----------|
| `../../etc/passwd` as filename | `path.join()` normalizes; IPC handlers validate paths |
| Symlinks escaping mount point | No symlink following in download destination |
| Mount point injection | Mount paths checked for existence before use |
| Device path injection | Must start with `/dev/` and contain no `..` or `//` |

## IPC Security

All inter-process communication between the renderer and main process is mediated through a **preload script** with a strict allowlist of exposed methods.

### Preload Bridge (`preload.js`)

- `contextIsolation: true` — renderer runs in an isolated context
- `nodeIntegration: false` — renderer has no Node.js access
- `sandbox: false` (see Electron Security notes)
- Only explicitly listed methods are exposed via `contextBridge.exposeInMainWorld('ventoy', ...)`
- No `eval`, no `Function()` constructor, no dynamic method dispatch

### Main Process Input Validation (`main.js`)

Every IPC handler validates its inputs:

```javascript
// Device paths must start with /dev/
if (!devicePath || typeof devicePath !== 'string' || !devicePath.startsWith('/dev/'))
  throw new Error('Invalid device path')

// Mount paths must be non-empty strings
if (!mountPath || typeof mountPath !== 'string')
  throw new Error('Invalid mount path')

// Distro IDs validated against catalog
const distro = catalog.getDistroById(cat, distroId)
if (!distro) throw new Error('Distro not found')

// Drive objects require a device property
if (!drive || !drive.device) throw new Error('Invalid drive')
```

## USB Safety

- **Strictly read-only**: The application only reads device metadata via `lsblk` and `udevadm`
- **No write operations**: No `dd`, `mkfs`, `fdisk`, `parted`, or `mount`/`umount` calls
- **Read-only device filtering**: `detectPhysicalUsbDisks` skips drives where `ro=1` in sysfs
- **No automatic writes**: All file operations are explicit user-initiated downloads
- **Atomic writes**: Downloads go to `.download` temp file, atomically renamed on success

## Network Security

- **HTTPS-first**: `fetchJson` and `fetchText` use `https` module for HTTPS URLs
- **Certificate validation**: System trust store is used; no custom CA bypass
- **No arbitrary redirects**: Maximum 5 redirects per request; redirect validation applied
- **Axios downloads**: Uses `axios` with configurable `maxRedirects` and `validateStatus`
- **Timeout enforcement**: 30-second timeouts on all network requests
- **No arbitrary code execution from USB**: No dynamic imports from USB paths; all code is bundled at build time

## Filesystem Security

- **Path normalization**: All paths passed through `path.join()` before use
- **No `..` components**: Paths containing `..` are rejected by IPC handlers
- **No double-slash paths**: Paths containing `//` are rejected
- **Existence checks**: Mount paths and file paths verified with `fs.existsSync()` before use
- **No symlink following in downloads**: Downloads target is joined path, not followed symlink
- **Temp file isolation**: Downloads written to temp `.download` files in target directory

## Electron Security

```javascript
new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,    // Renderer isolated from main process
    nodeIntegration: false,    // No Node.js APIs in renderer
    sandbox: false             // App sandbox disabled for udev access
  }
})
```

| Setting | Value | Reason |
|---------|-------|--------|
| `contextIsolation` | `true` | Isolates renderer from main process globals |
| `nodeIntegration` | `false` | Prevents arbitrary Node.js execution in renderer |
| `sandbox` | `false` | Required for udev/sysfs access (OS-level sandbox via seccomp on Linux) |

**Note**: The Electron sandbox is disabled because the app needs OS-level filesystem and device access. Security is provided instead by:
- Strict IPC input validation
- No `eval` or dynamic code in renderer
- Preload bridge with allowlisted methods only

## Dependency Security

- **No arbitrary code execution from USB**: No dynamic `require()` or `import()` from USB paths
- **Bundled at build time**: All code is bundled into the Electron ASAR (when enabled)
- **YAML parser is internal**: No external YAML parsing library; custom parser used
- **Dependency pinning**: `yauzl` overridden to specific version `3.3.1`
- **Limited attack surface**: Dependencies are axios (HTTPS), drivelist (device listing), React (UI)

## Security Checklist for Releases

- [ ] Run `npm run lint` — no errors
- [ ] Run `npm run typecheck` — no errors
- [ ] Run `npm run test` — all tests pass
- [ ] Review dependency audit: `npm audit`
- [ ] Verify all IPC handlers have input validation
- [ ] Verify `contextIsolation: true` and `nodeIntegration: false`
- [ ] Verify no `eval`, `Function()`, or dynamic imports
- [ ] Verify all downloads use HTTPS
- [ ] Verify checksum verification is enabled for all distros
