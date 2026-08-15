#!/usr/bin/env node
const { spawn } = require('child_process')
const path = require('path')
const os = require('os')

const tsxBin = path.join(__dirname, '..', '..', 'node_modules', '.bin', os.platform() === 'win32' ? 'tsx.cmd' : 'tsx')
const cliPath = path.join(__dirname, 'cli.ts')
const args = process.argv.slice(2)

const child = spawn(tsxBin, [cliPath, ...args], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code))
