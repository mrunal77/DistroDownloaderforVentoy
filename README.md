# Ventoy Linux Distro Downloader

A modern, production-quality Electron + React desktop application for discovering, downloading, and managing Linux distribution ISOs directly on a Ventoy USB drive — without host disk caching.

## Why?

Most ISO downloaders save the entire image to your main drive before copying it to USB. This app streams ISOs directly to your Ventoy drive with live progress, checksum verification, and a clean dark-mode UI.

## Features

- **Direct-to-Ventoy streaming** — ISOs download straight to your USB drive, no host disk caching
- **Real USB detection** — Enumerates drives via `lsblk`, `udevadm`, and sysfs with stable IDs
- **Ventoy verification** — Read-only MBR/stage2 signature checks with confidence scoring (High / Medium / Low)
- **Live progress** — Real-time download speed, ETA, and percentage
- **SHA-256 verification** — Automatic checksum validation where available
- **ISO management** — Scan, view, and delete ISOs already on Ventoy drives
- **Disk space warnings** — Pre-download capacity checks with 90% threshold alerts
- **Hotplug monitoring** — udev-based USB insertion/removal detection
- **CLI interface** — `usb:list`, `detect-ventoy`, `usb:diagnose` for automation
- **Dark theme UI** — GNOME/KDE-inspired interface with custom scrollbars
- **Frameless window** — Custom title bar with window controls

## Supported Distros

20+ curated distributions with verified official download URLs:

| Family | Distributions |
|--------|--------------|
| **Debian/Ubuntu** | Ubuntu, Kubuntu, Xubuntu, Linux Mint, Debian, Kali Linux, Pop!_OS, Zorin OS |
| **Arch** | Arch Linux, Manjaro, EndeavourOS, CachyOS, Garuda |
| **Fedora** | Fedora, Nobara, Bazzite |
| **Enterprise** | Rocky Linux, AlmaLinux, CentOS Stream, Oracle Linux |
| **SUSE** | openSUSE Tumbleweed, openSUSE Leap |
| **Independent** | NixOS, Alpine Linux, Gentoo, Void Linux, Solus, Mageia |
| **Security** | Parrot OS, Tails, Qubes OS, BlackArch |

## Installation

### Prerequisites

- Node.js 18+
- npm
- Ventoy installed on a USB drive (v1.0.80+ recommended)

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm start

# Or run tests
npm test
```

### Build Packages

```bash
# Build .deb and .rpm packages
npm run make

# Package without making installers
npm run package
```

## Usage

1. Connect a Ventoy-formatted USB drive
2. Launch the app — it auto-detects Ventoy drives
3. Select your target drive from the header dropdown
4. Browse, search, and filter distributions
5. Click **Download** to stream ISO directly to Ventoy
6. Verify checksum after download completes
7. Reboot and boot from Ventoy

### CLI

```bash
# List USB drives
node src/main/cli.cjs usb:list

# Detect Ventoy drives
node src/main/cli.cjs detect-ventoy

# Run USB diagnostics
node src/main/cli.cjs usb:diagnose
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ USB Detect  │  │   Ventoy     │  │   Download        │  │
│  │ Service     │  │   Metadata   │  │   Manager         │  │
│  │ (lsblk/     │  │   (raw MBR   │  │   (streaming,     │  │
│  │  udevadm)   │  │   verify)    │  │   retry, hash)    │  │
│  └──────┬──────┘  └──────────────┘  └────────┬──────────┘  │
│         │             │                       │              │
│  ┌──────▼────────────▼───────────────────────▼──────────┐  │
│  │                   IPC Handlers                        │  │
│  └───────────────────────┬──────────────────────────────┘  │
└──────────────────────────┼─────────────────────────────────┘
                           │ contextBridge
┌──────────────────────────▼─────────────────────────────────┐
│                   Renderer (React)                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐  │
│  │Sidebar │ │Header  │ │Dashboard│ │Downloads│ │Settings│  │
│  └────────┘ └────────┘ └────────┘ └────────┘ └─────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Module | Purpose |
|--------|---------|
| `src/main/usbDetectionService.ts` | Real USB enumeration via `lsblk`, `udevadm`, sysfs |
| `src/main/ventoyMetadata.ts` | Read-only Ventoy verification (MBR/stage2 signatures) |
| `src/main/udevMonitor.ts` | Hotplug monitoring for drive insertion/removal |
| `src/main/isoProvider.ts` | Bundled YAML catalog with verified download URLs |
| `src/main/downloadManager.ts` | Streaming downloads with retry, checksum, cancellation |
| `preload.cjs` | Secure IPC bridge (contextIsolation enabled) |

## Security

- **Context isolation** — Renderer cannot access Node.js APIs directly
- **No destructive operations** — No `dd`, `mkfs`, `parted`, or similar commands
- **Path traversal protection** — All file paths validated against allowed directories
- **Read-only Ventoy verification** — Never writes to or modifies Ventoy partitions
- **HTTPS-only** — All downloads use HTTPS from official sources
- **Input validation** — IPC handlers validate all incoming data

See [docs/SECURITY.md](docs/SECURITY.md) for details.

## Development

### Tech Stack

- **Electron** — Desktop runtime
- **React 19** — UI framework
- **Vite** — Build tooling
- **TypeScript** — Type safety (main process)
- **Vitest** — Test runner
- **ESLint** — Linting with React/TypeScript plugins
- **Electron Forge** — Packaging

### Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start dev server + Electron |
| `npm test` | Run full test suite (76 tests) |
| `npm run lint` | Lint source files |
| `npm run typecheck` | TypeScript type checking |
| `npm run make` | Build .deb/.rpm packages |
| `npm run build` | Lint + typecheck + test + package |

### Project Structure

```
├── main.cjs                 # Electron main entry
├── preload.cjs              # Secure IPC bridge
├── src/
│   ├── main/                 # Main process (TypeScript → .cjs)
│   │   ├── usbDetectionService.ts
│   │   ├── ventoyMetadata.ts
│   │   ├── udevMonitor.ts
│   │   ├── isoProvider.ts
│   │   ├── downloadManager.ts
│   │   └── ...
│   └── renderer/
│       └── main_window/      # React UI (JSX)
│           ├── main.jsx
│           ├── index.css
│           └── components/
├── distros/                  # Bundled YAML catalog
├── tests/                    # Unit + integration + security tests
└── docs/                     # Architecture, security, troubleshooting
```

## Troubleshooting

### Blank window on launch

Ensure you're running on a system with a display server (Wayland/X11). Headless environments may show a blank window.

### VA-API warnings

```
vaInitialize failed: unknown libva error
```

This is a harmless Chromium GPU warning on systems without VA-API. The app disables hardware acceleration automatically.

### Permission denied on USB drives

Ensure your user is in the `plugdev` or `disk` group, or run with appropriate permissions.

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for more.

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] AppImage and Flatpak packaging
- [ ] Multiple simultaneous downloads
- [ ] Distro edition selection (minimal, standard, etc.)
- [ ] Torrent download support
- [ ] Persistent Ventoy configuration editor
- [ ] Plugin store integration

## License

MIT — see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Ventoy](https://www.ventoy.net/) — The bootloader that makes this possible
- [Electron](https://www.electronjs.org/) — Desktop framework
- [React](https://react.dev/) — UI library
