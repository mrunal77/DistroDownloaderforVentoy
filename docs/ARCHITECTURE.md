# Architecture

## Overview

The application follows a modular Electron + React architecture with a clear separation between main process (Node.js) and renderer process (React).

```
linux-iso-manager/
├── main.js                    # Electron main process entry
├── preload.js                 # Secure IPC bridge
├── package.json               # Dependencies and scripts
├── src/
│   ├── main/
│   │   ├── catalog.js         # Distro metadata loader
│   │   ├── isoProvider.js     # ISO resolution strategies
│   │   ├── downloadManager.js # Download engine with retry/verify
│   │   ├── ventoyDetector.js  # USB and Ventoy detection
│   │   ├── logger.js          # Structured logging
│   │   └── cli.js             # CLI interface
│   ├── renderer/
│   │   ├── main.jsx           # React app entry
│   │   ├── index.css          # Dark theme styles
│   │   └── components/
│   │       ├── CatalogAccordion.jsx
│   │       ├── DistroCard.jsx
│   │       ├── DriveSelector.jsx
│   │       └── DownloadProgressDock.jsx
│   └── shared/
│       └── catalog.json       # Bundled distro catalog
├── distros/                   # YAML metadata for each distro
├── docs/                      # Documentation
├── tests/                     # Unit, integration, security tests
└── scripts/                   # Build and utility scripts
```

## Core Modules

### catalog.js

Loads distro metadata from bundled `catalog.json` and YAML files in `distros/`. Merges both sources.

### isoProvider.js

Provider abstraction for resolving latest ISOs:

- `StaticProvider` - Hardcoded URLs
- `OfficialApiProvider` - JSON API endpoints
- `GitHubReleaseProvider` - GitHub releases
- `OfficialDirectoryProvider` - HTML directory listings
- `MirrorProvider` - Fallback mirror chain

### downloadManager.js

Handles streaming downloads with:

- Temp file + atomic rename
- SHA-256 verification
- Exponential backoff retry
- Progress reporting
- Cancellation support

### ventoyDetector.js

Robust USB detection using:

- `lsblk -J` for structured block device info
- `udevadm info` for device properties
- `/dev/disk/by-id` for stable device paths
- Filesystem heuristics for Ventoy detection

## Data Flow

```
User selects distro
       ↓
catalog.getDistroById() → distro metadata
       ↓
createProvider(distro) → IsoProvider instance
       ↓
provider.getLatestRelease() → release metadata
       ↓
downloadManager.startDownload() → stream to Ventoy
       ↓
verifyChecksum() → SHA-256 validation
       ↓
atomic rename → ISO available on Ventoy
```

## Security Model

- Main process handles all privileged operations
- Renderer only accesses functionality via exposed IPC methods
- No shell command execution with user input
- HTTPS-only with certificate validation
- Domain allowlist enforcement
