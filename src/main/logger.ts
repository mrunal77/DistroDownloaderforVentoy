/* src/main/logger.ts
 * Structured logging with separate log files per concern.
 */

import fs from 'fs'
import path from 'path'
import os from 'os'

export const LOG_DIR = path.join(os.homedir(), '.local', 'share', 'linux-iso-manager', 'logs')

type LogCategory = 'application' | 'downloads' | 'verification' | 'ventoy'

const LOG_FILES: Record<LogCategory, string> = {
  application: 'application.log',
  downloads: 'downloads.log',
  verification: 'verification.log',
  ventoy: 'ventoy.log'
}

interface LogMeta {
  [key: string]: unknown
}

let initialized = false

function ensureLogDir (): void {
  if (!initialized) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
    initialized = true
  }
}

function log (category: LogCategory, level: string, message: string, meta: LogMeta = {}): void {
  ensureLogDir()
  const timestamp = new Date().toISOString()
  const line = JSON.stringify({ timestamp, level, message, ...meta })
  const filePath = path.join(LOG_DIR, LOG_FILES[category] || LOG_FILES.application)
  try {
    fs.appendFileSync(filePath, line + '\n')
  } catch {
    // best-effort
  }
}

export function info (message: string, meta?: LogMeta): void {
  log('application', 'info', message, meta || {})
}

export function warn (message: string, meta?: LogMeta): void {
  log('application', 'warn', message, meta || {})
}

export function error (message: string, meta?: LogMeta): void {
  log('application', 'error', message, meta || {})
}

export function debug (message: string, meta?: LogMeta): void {
  log('application', 'debug', message, meta || {})
}

export function download (message: string, meta?: LogMeta): void {
  log('downloads', 'info', message, meta || {})
}

export function verification (message: string, meta?: LogMeta): void {
  log('verification', 'info', message, meta || {})
}

export function ventoy (message: string, meta?: LogMeta): void {
  log('ventoy', 'info', message, meta || {})
}
