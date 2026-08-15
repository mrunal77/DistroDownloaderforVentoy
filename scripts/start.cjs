#!/usr/bin/env node
const { spawn } = require('child_process')
const path = require('path')
const net = require('net')

const isWin = process.platform === 'win32'
const viteBin = path.join(__dirname, '..', 'node_modules', '.bin', isWin ? 'vite.cmd' : 'vite')
const electronBin = path.join(__dirname, '..', 'node_modules', '.bin', isWin ? 'electron.cmd' : 'electron')

function waitForPort (port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const timer = setInterval(() => {
      const client = new net.Socket()
      client.connect(port, '127.0.0.1', () => {
        client.destroy()
        clearInterval(timer)
        resolve()
      })
      client.on('error', () => {
        client.destroy()
        if (Date.now() - start > timeout) {
          clearInterval(timer)
          reject(new Error(`Timeout waiting for port ${port}`))
        }
      })
    }, 200)
  })
}

async function main () {
  console.log('Starting Vite dev server...')
  const vite = spawn(viteBin, ['--port', '5173'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: isWin
  })

  try {
    await waitForPort(5173, 15000)
    console.log('Vite dev server ready')
  } catch (e) {
    console.error('Vite dev server failed to start:', e.message)
    vite.kill()
    process.exit(1)
  }

  console.log('Starting Electron...')
  const electron = spawn(electronBin, ['.', '--disable-gpu', '--disable-gpu-sandbox', '--in-process-gpu', '--no-sandbox'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: isWin,
    env: { ...process.env, MAIN_WINDOW_VITE_DEV_SERVER_URL: 'http://localhost:5173' }
  })

  electron.on('exit', (code) => {
    console.log('Electron exited with code:', code)
    vite.kill()
    process.exit(code)
  })

  process.on('SIGINT', () => {
    electron.kill()
    vite.kill()
    process.exit(0)
  })
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
