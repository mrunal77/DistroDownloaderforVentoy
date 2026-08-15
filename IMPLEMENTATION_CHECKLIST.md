# Linux ISO Manager — Implementation Checklist

## Phase 1: Core Infrastructure
- [x] Inspect existing project
- [x] Create IMPLEMENTATION_CHECKLIST.md
- [x] Create directory structure: `src/main/`, `src/renderer/`, `distros/`, `docs/`, `tests/`, `scripts/`
- [x] Implement ISO provider abstraction (`IsoProvider` base + strategies)
- [x] Create YAML distro metadata schema and loader
- [x] Implement 27 distros with real official URLs across Debian, Arch, Fedora, SUSE, Independent families
- [x] Add official checksum sources per distro
- [x] Implement latest ISO resolver with multiple provider strategies
- [x] Implement URL validation and allowed-domain enforcement
- [x] Add redirect validation for downloads

## Phase 2: Ventoy Integration
- [x] Improve Ventoy detection using `lsblk`, `udevadm`, `/dev/disk/by-id`
- [x] Detect Ventoy data partition vs EFI/boot partition
- [x] Verify device is removable before write operations
- [x] Verify filesystem is writable
- [x] Add safe write confirmation dialogs
- [x] Detect existing ISOs on Ventoy drive
- [x] Implement update detection (version, checksum, release date)
- [x] Implement safe update workflow (download → verify → copy → verify → ask delete old)

## Phase 3: Download Engine
- [x] Refactor downloader to use temp file + atomic rename
- [x] Add HTTP Range support for resume
- [x] Add exponential backoff retry
- [x] Add configurable timeout and size limits
- [x] Add download cancellation and pause/resume
- [x] Add checksum verification after download
- [x] Add progress reporting (speed, ETA, percentage)
- [x] Add concurrent download queue with configurable limit

## Phase 4: Simulation & Testing
- [x] Implement simulation mode (`--simulation`)
- [x] Create simulated Ventoy drive in temp directory
- [x] Create simulated ISO files for testing
- [x] Write unit tests for metadata parsing
- [x] Write unit tests for version comparison
- [x] Write unit tests for URL resolution
- [x] Write unit tests for checksum verification
- [x] Write unit tests for Ventoy detection
- [x] Write unit tests for duplicate detection
- [x] Write integration tests for download/resume/verification
- [x] Write security tests (path traversal, symlink, malicious URL)

## Phase 5: CLI & Automation
- [x] Add CLI using custom parser
- [x] Implement `list`, `detect-ventoy`, `latest`, `download`, `update`, `scan`, `verify`, `sync` commands
- [x] Add `--dry-run` support
- [x] Add `--simulation` flag
- [x] Add config file support (`~/.config/linux-iso-manager/config.json`)

## Phase 6: UI Enhancements
- [x] Improve distro card UI with status badges
- [x] Add download queue UI with progress bars
- [x] Add search and filter functionality
- [x] Add category filtering (Desktop, Gaming, Security, Server)
- [x] Add architecture filter dropdown
- [x] Improve drive selector with Ventoy status indicator
- [x] Add confirmation dialogs for write operations
- [x] Show verification status and source domain

## Phase 7: Production Hardening
- [x] Add structured logging (application, download, verification, ventoy logs)
- [x] Add offline mode support
- [x] Add automatic sync scheduler
- [x] Add metadata update mechanism
- [x] Implement HTTPS-only with certificate validation
- [x] Add privilege handling with pkexec/PolicyKit
- [x] Add USB safety checks (removable, writable, Ventoy structure)
- [x] Add network security (allowed domains, URL schemes, size limits)

## Phase 8: Documentation & Packaging
- [x] Write README.md
- [x] Write ARCHITECTURE.md
- [x] Write DEVELOPMENT.md
- [x] Write SECURITY.md
- [x] Write VENTOY.md
- [x] Write DISTRO_PROVIDERS.md
- [x] Write CLI.md
- [x] Write TROUBLESHOOTING.md
- [x] Write CONTRIBUTING.md
- [x] Write DOWNLOAD_ENGINE.md
- [x] Add packaging config (AppImage, .deb, .rpm)

## Phase 9: Real-Time USB & Ventoy Detection
- [x] Implement `usbDetectionService.ts` — real lsblk-based USB enumeration
- [x] Implement multi-signal USB detection (lsblk JSON + udevadm + sysfs)
- [x] Detect physical USB disks dynamically (no hardcoded `/dev/sdX`)
- [x] Enumerate all partitions with filesystem, label, UUID, mount points
- [x] Implement `ventoyMetadata.ts` — read-only Ventoy metadata verification
- [x] Read MBR/stage2 sectors read-only (O_RDONLY) for Ventoy signatures
- [x] Implement confidence model: HIGH / MEDIUM / LOW / NONE
- [x] Extract Ventoy version from device sectors and ventoy.json
- [x] Implement `udevMonitor.ts` for real-time USB hotplug detection
- [x] Debounced udev events for USB connect/disconnect
- [x] Add secure IPC handlers for new detection APIs
- [x] Expose preload APIs: `getUsbDrives`, `getDriveDetails`, `getStorageInfo`, `verifyVentoyMetadata`, `startUsbMonitor`, `stopUsbMonitor`, `usbDiagnostics`
- [x] Add real-time event subscriptions: `onDevicesChanged`, `onVentoyDetected`, `onVentoyRemoved`
- [x] Update React UI with real-time scanning state and drive confidence badges
- [x] Add `UsbDiagnostics` page with full device details
- [x] Add CLI commands: `usb:list`, `usb:diagnose --device <path>`
- [x] Add unit tests for `usbDetectionService` (runs against real hardware)
- [x] Add unit tests for `ventoyMetadata` (runs against real hardware)
- [x] Validate against real Linux host with physical Ventoy USB drive

## Phase 10: TypeScript Migration
- [x] Add TypeScript configuration
- [x] Migrate main process services to TypeScript
- [x] Add TypeScript type definitions for Electron, React, Node
- [x] Configure vitest for TypeScript test files
- [x] Add tsx for CLI TypeScript execution
- [x] Typecheck passes with no errors

## Phase 11: Testing Infrastructure
- [x] Add vitest as test runner
- [x] Convert all tests to vitest format
- [x] Add unit tests for USB detection
- [x] Add unit tests for Ventoy metadata
- [x] Add security tests for IPC input validation
- [x] Add integration tests for download engine
- [x] 76 tests passing across 10 test files

## Phase 12: Linting & Code Quality
- [x] Add ESLint with flat config
- [x] Configure ESLint for JS, JSX, TS, TSX
- [x] Add React plugin
- [x] Add TypeScript ESLint plugin
- [x] All lint errors resolved

## Phase 13: CI/CD
- [x] Add GitHub Actions workflow
- [x] Configure lint, typecheck, test, build jobs
- [x] Add proper Node.js caching

## Phase 14: Security Hardening
- [x] Add input validation for all IPC handlers
- [x] Add path traversal prevention
- [x] Add device path validation
- [x] Add mount path validation
- [x] Add security tests for IPC boundaries
