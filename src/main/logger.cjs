"use strict";
/* src/main/logger.ts
 * Structured logging with separate log files per concern.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOG_DIR = void 0;
exports.info = info;
exports.warn = warn;
exports.error = error;
exports.debug = debug;
exports.download = download;
exports.verification = verification;
exports.ventoy = ventoy;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
exports.LOG_DIR = path_1.default.join(os_1.default.homedir(), '.local', 'share', 'linux-iso-manager', 'logs');
const LOG_FILES = {
    application: 'application.log',
    downloads: 'downloads.log',
    verification: 'verification.log',
    ventoy: 'ventoy.log'
};
let initialized = false;
function ensureLogDir() {
    if (!initialized) {
        fs_1.default.mkdirSync(exports.LOG_DIR, { recursive: true });
        initialized = true;
    }
}
function log(category, level, message, meta = {}) {
    ensureLogDir();
    const timestamp = new Date().toISOString();
    const line = JSON.stringify({ timestamp, level, message, ...meta });
    const filePath = path_1.default.join(exports.LOG_DIR, LOG_FILES[category] || LOG_FILES.application);
    try {
        fs_1.default.appendFileSync(filePath, line + '\n');
    }
    catch {
        // best-effort
    }
}
function info(message, meta) {
    log('application', 'info', message, meta || {});
}
function warn(message, meta) {
    log('application', 'warn', message, meta || {});
}
function error(message, meta) {
    log('application', 'error', message, meta || {});
}
function debug(message, meta) {
    log('application', 'debug', message, meta || {});
}
function download(message, meta) {
    log('downloads', 'info', message, meta || {});
}
function verification(message, meta) {
    log('verification', 'info', message, meta || {});
}
function ventoy(message, meta) {
    log('ventoy', 'info', message, meta || {});
}
