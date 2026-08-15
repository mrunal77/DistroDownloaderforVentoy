# CLI Reference

## Commands

### `list [search]`

List available distros.

```bash
linux-iso-manager list
linux-iso-manager list ubuntu
linux-iso-manager list --category Desktop --arch x86_64
```

### `detect-ventoy`

Detect Ventoy USB drives.

```bash
linux-iso-manager detect-ventoy
```

### `latest <distro-id>`

Resolve the latest ISO for a distro.

```bash
linux-iso-manager latest ubuntu-desktop
```

### `download <distro-id>`

Download an ISO. Requires GUI context.

```bash
linux-iso-manager download fedora-workstation --ventoy /media/user/Ventoy
```

### `update <distro-id>`

Check for updates on an installed ISO.

```bash
linux-iso-manager update fedora-workstation
```

### `scan --ventoy <path>`

Scan ISOs on a Ventoy drive.

```bash
linux-iso-manager scan --ventoy /media/user/Ventoy
```

### `verify <file.iso>`

Verify ISO checksum.

```bash
linux-iso-manager verify Ubuntu-24.04.iso
```

### `sync`

Sync distros to Ventoy.

```bash
linux-iso-manager sync --ventoy /media/user/Ventoy --distros ubuntu,fedora
linux-iso-manager sync --dry-run --distros ubuntu,fedora
```

## Options

| Option | Description |
|--------|-------------|
| `--ventoy <path>` | Ventoy mount path |
| `--distros <list>` | Comma-separated distro IDs |
| `--dry-run` | Plan without modifying |
| `--search <term>` | Search distros |
| `--category <name>` | Filter by category |
| `--help` | Show help |
