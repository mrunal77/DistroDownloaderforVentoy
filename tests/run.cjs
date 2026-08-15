/* tests/run.js
 * Vitest test runner using child_process.
 */

const { spawnSync } = require('child_process')
const path = require('path')
const os = require('os')

const binDir = path.join(__dirname, '..', 'node_modules', '.bin')
const vitestBin = os.platform() === 'win32' ? path.join(binDir, 'vitest.cmd') : path.join(binDir, 'vitest')

const files = [
  'tests/unit/catalog.test.ts',
  'tests/unit/isoProvider.test.ts',
  'tests/unit/ventoyDetector.test.ts',
  'tests/unit/simulation.test.ts',
  'tests/unit/logger.test.ts',
  'tests/unit/usbDetection.test.ts',
  'tests/unit/ventoyMetadata.test.ts',
  'tests/integration/download.test.ts',
  'tests/security/security.test.ts',
  'tests/security/ipc-security.test.ts'
]

const result = spawnSync(process.execPath, [vitestBin, 'run', ...files], { stdio: 'inherit' })

process.exit(result.status || 0)
