#!/usr/bin/env node

/* Compile the TypeScript main process into the CommonJS files loaded by Electron. */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const mainDir = path.join(root, 'src', 'main')
const tsc = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc')

execFileSync(tsc, ['-p', 'tsconfig.cjs.json'], { cwd: root, stdio: 'inherit' })

for (const entry of fs.readdirSync(mainDir)) {
  if (!entry.endsWith('.js')) continue
  const sourcePath = path.join(mainDir, entry)
  const targetPath = sourcePath.slice(0, -3) + '.cjs'
  const output = fs.readFileSync(sourcePath, 'utf8')
    .replace(/require\((['"])(\.\/[^'".]+)\1\)/g, 'require($1$2.cjs$1)')
  fs.writeFileSync(targetPath, output, 'utf8')
  fs.unlinkSync(sourcePath)
}
