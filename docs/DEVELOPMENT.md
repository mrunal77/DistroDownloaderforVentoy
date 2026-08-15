# Development

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

## CLI

```bash
node src/main/cli.js list
node src/main/cli.js detect-ventoy
```

## Tests

```bash
npm test
```

## Adding a New Distro

Create a YAML file in `distros/`:

```yaml
id: mydistro
name: My Distro
family: independent
description: Description here
official_website: https://example.com
download_page: https://example.com/download
logo: assets/logos/mydistro.svg
architectures:
  - x86_64
desktop_environments:
  - GNOME
release_type: stable
iso_provider: official-directory
base_url: https://example.com/downloads/
checksum_provider: https://example.com/downloads/SHA256SUMS
verification_method: sha256
download_strategy: official-directory
iso_pattern: mydistro-.*amd64\.iso$
arch_filter: amd64
version: 1.0
iso:
  download_url: https://example.com/downloads/mydistro-1.0-amd64.iso
  file_name: mydistro-1.0-amd64.iso
  size: 3000000000
  sha256: abc123...
  release_date: 2024-01-01
```

## Build

```bash
npm run make
```
