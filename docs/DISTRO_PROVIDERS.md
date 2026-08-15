# Distro Providers

## Supported Strategies

### StaticProvider

Hardcoded URLs from bundled catalog. Used when the distro has a stable download URL pattern.

### OfficialApiProvider

Fetches JSON from official distro APIs. Used when distros expose machine-readable release metadata.

### GitHubReleaseProvider

Uses GitHub Releases API for distros hosted on GitHub (e.g., Bazzite).

### OfficialDirectoryProvider

Scrapes HTML directory listings from official mirrors and extracts ISO URLs.

### MirrorProvider

Fallback chain of multiple providers. Tries each mirror until one succeeds.

## URL Resolution

All providers normalize output to:

```json
{
  "distro": "string",
  "version": "string",
  "architecture": "string",
  "iso_name": "string",
  "download_url": "string",
  "size": "number|null",
  "sha256": "string|null",
  "release_date": "string|null",
  "source": "string",
  "official_website": "string|null"
}
```

## Adding a New Provider

1. Extend `IsoProvider` base class
2. Implement `getLatestRelease()`
3. Optionally implement `getChecksum()` and `getSignature()`
4. Add provider config to distro YAML
5. Update `createProvider()` in `main.js` or `cli.js`

## Official Sources

All distros in the bundled catalog use official domains:

- ubuntu.com
- fedoraproject.org
- debian.org
- archlinux.org
- kernel.org (mirrors)
- kali.org
- etc.

Third-party mirrors are used only when they are the primary official download host.
