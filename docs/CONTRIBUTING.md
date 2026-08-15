# Contributing

Thank you for your interest in contributing to DistroDownloaderforVentoy!

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/anomalyco/DistroDownloaderforVentoy.git
   cd DistroDownloaderforVentoy
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Run tests**:
   ```bash
   npm run test
   ```

5. **Run linter**:
   ```bash
   npm run lint
   ```

6. **Run type check**:
   ```bash
   npm run typecheck
   ```

## Project Structure

```
src/
  main/           # Electron main process (Node.js)
    catalog.ts    # Distro catalog loader
    downloadManager.ts  # Download orchestrator
    isoProvider.ts      # ISO release resolvers
    usbDetectionService.ts  # Linux USB detection
    ventoyMetadata.ts   # Ventoy signature verification
    ventoyDetector.ts   # Ventoy detection logic
    diskManager.ts      # Disk utilities
    udevMonitor.ts      # Real-time USB monitor
    logger.ts           # Logging utility
  renderer/       # Electron renderer (React)
  shared/         # Shared data (catalog.json)
distros/          # Per-distro YAML configs
docs/             # Documentation
tests/            # Vitest test suite
  unit/           # Unit tests
  integration/    # Integration tests
  security/       # Security tests
```

## Running Tests

```bash
# All tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Security tests only
npm run test:security

# Watch mode
npm run test:watch
```

## Adding New Distros

1. Create a new YAML file in `distros/` (e.g., `my-distro.yaml`):

```yaml
id: my-distro
name: My Distro
iso_provider: static
version: 1.0
architectures:
  - x86_64
iso:
  downloadUrl: https://example.com/my-distro.iso
  sha256: abc123...
official_website: https://example.com
```

2. Or add to the bundled `src/shared/catalog.json`.

3. Run tests to verify the distro loads correctly:
   ```bash
   npm run test:unit
   ```

## Code Style

- **Language**: TypeScript for main process, JSX for renderer
- **Formatting**: Follow existing patterns in the codebase
- **Linting**: All code must pass `npm run lint`
- **Type checking**: All code must pass `npm run typecheck`
- **No `any` types**: Use proper TypeScript types
- **Error handling**: Use try/catch with specific error messages
- **Logging**: Use the `logger` utility instead of `console.log`

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(usb): add udev monitor for real-time drive detection
fix(download): handle network timeout with exponential backoff
docs(security): expand threat model with MITM scenarios
test(ipc): add path traversal validation tests
chore(deps): update axios to 1.19.2
```

## Security Policy

We take security seriously. Before contributing:

1. Read `docs/SECURITY.md` to understand the threat model
2. Never add arbitrary code execution from USB or network sources
3. All IPC handlers must validate inputs (type, format, range)
4. File paths must be validated against path traversal
5. Network requests must use HTTPS with certificate validation
6. Do not add shell execution (`exec`, `spawn`) with user-controlled input

See `docs/SECURITY.md` for the full security checklist.

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes following the guidelines above
4. Run `npm run lint && npm run typecheck && npm run test`
5. Commit with conventional commit message
6. Push to your fork
7. Open a Pull Request with a clear description
