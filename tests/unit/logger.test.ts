/* tests/unit/logger.test.ts
 * Tests for structured logging.
 */

import { describe, it, expect } from 'vitest'
import * as logger from '../../src/main/logger'
import fs from 'fs'
import path from 'path'

describe('logger', () => {
  it('should expose expected logging functions', () => {
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.download).toBe('function')
    expect(typeof logger.verification).toBe('function')
    expect(typeof logger.ventoy).toBe('function')
    expect(logger.LOG_DIR && typeof logger.LOG_DIR === 'string').toBe(true)
  })

  it('should write structured logs to files', () => {
    logger.info('test message', { key: 'value' })
    const logFile = path.join(logger.LOG_DIR, 'application.log')
    expect(fs.existsSync(logFile)).toBe(true)

    const content = fs.readFileSync(logFile, 'utf8')
    const lastLine = content.trim().split('\n').pop()!
    const parsed = JSON.parse(lastLine)
    expect(parsed.message).toBe('test message')
    expect(parsed.key).toBe('value')
    expect(parsed.level).toBe('info')
  })
})
