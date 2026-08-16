#!/usr/bin/env node

/* Compile the TypeScript main process into the CommonJS files loaded by Electron. */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const mainDir = path.join(root, 'src', 'main')
const tsc = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc')

execFileSync(tsc, ['-p', 'tsconfig.cjs.json'], { cwd: root, stdio: 'inherit' })

function processDir (dir) {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry)
    if (entry.endsWith('.js') && fs.statSync(fullPath).isFile()) {
      const targetPath = fullPath.slice(0, -3) + '.cjs'
      const output = fs.readFileSync(fullPath, 'utf8')
        .replace(/require\((['"])((?:\.{1,2}\/)[^'".]+)\1\)/g, 'require($1$2.cjs$1)')
      fs.writeFileSync(targetPath, output, 'utf8')
      fs.unlinkSync(fullPath)
    } else if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath)
    }
  }
}

processDir(mainDir)
