# Ventoy Integration

## Detection

The application detects Ventoy drives by:

1. Enumerating removable block devices via `lsblk`
2. Checking `udevadm` properties for removable media
3. Scanning mount points for Ventoy structure (`ventoy.json`, `ventoy/` directory)
4. Distinguishing data partition from EFI/boot partition

## Write Safety

Before writing:

- Verifies device is removable
- Verifies filesystem is writable
- Verifies Ventoy structure is present
- Shows confirmation dialog with device details
- Uses temp file + atomic rename

## Supported Operations

- Scan existing ISOs
- Download new ISOs directly to Ventoy data partition
- Verify downloaded ISO checksum
- Detect updates (version, checksum, release date)
- Safe update workflow (new ISO verified before old is removed)

## Not Supported

- Formatting drives
- Installing Ventoy
- Modifying Ventoy configuration
- Deleting files without confirmation
