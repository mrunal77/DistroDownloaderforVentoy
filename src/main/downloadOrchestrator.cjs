"use strict";
/* src/main/downloadOrchestrator.ts
 * Owns the complete download workflow: validate → resolve release → check space → enqueue.
 * Eliminates duplicated orchestration logic across IPC handlers.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DownloadOrchestrator = void 0;
const crypto_1 = __importDefault(require("crypto"));
const validators_1 = require("./validation/validators.cjs");
const catalog_1 = require("./catalog.cjs");
const providerFactory_1 = require("./providers/providerFactory.cjs");
const storage_1 = require("./usb/storage.cjs");
const downloadManager_1 = require("./downloadManager.cjs");
const driveEnumerator_1 = require("./usb/driveEnumerator.cjs");
const logger_1 = require("./logger.cjs");
class DownloadOrchestrator {
    constructor() {
        this.mainWindow = null;
    }
    setMainWindow(win) {
        this.mainWindow = win;
    }
    async startDownload(request, callbacks) {
        const { distroId, targetMountPath } = request;
        (0, validators_1.validateVentoyTargetMount)(targetMountPath);
        const catalog = (0, catalog_1.loadCatalog)();
        const distro = (0, catalog_1.getDistroById)(catalog, distroId);
        if (!distro) {
            throw new Error('Distro not found: ' + distroId);
        }
        const provider = (0, providerFactory_1.createProvider)(distro);
        const release = await provider.getLatestRelease();
        (0, validators_1.validateFileName)(release.iso_name);
        const storageInfo = (0, storage_1.getStorageInfo)(targetMountPath);
        const requiredBytes = release.size || 0;
        if (storageInfo && requiredBytes > 0 && storageInfo.available < requiredBytes) {
            const availableGB = (storageInfo.available / 1e9).toFixed(1);
            const requiredGB = (requiredBytes / 1e9).toFixed(1);
            throw new Error(`Insufficient disk space: ${requiredGB} GB required, ${availableGB} GB available on ${targetMountPath}. Please free up space and try again.`);
        }
        const downloadId = crypto_1.default.randomUUID();
        const sendProgress = (channel, payload) => {
            try {
                if (this.mainWindow && this.mainWindow.webContents) {
                    this.mainWindow.webContents.send(channel, payload);
                }
            }
            catch { /* ignore */ }
        };
        (0, downloadManager_1.startDownload)({
            downloadId,
            downloadUrl: release.download_url,
            fileName: release.iso_name,
            targetMountPath,
            options: {
                expectedSha256: release.sha256 || undefined,
                maxRetries: 3
            }
        }, {
            onProgress: (p) => {
                const progressPayload = { ...p, downloadId };
                sendProgress('download-progress', progressPayload);
                callbacks?.onProgress?.(progressPayload);
            },
            onQueueChange: (state) => {
                sendProgress('queue-state', state);
                callbacks?.onQueueChange?.(state);
            },
            onComplete: (r) => {
                (0, logger_1.download)('Download complete', { downloadId, filePath: r.filePath, sha256: r.sha256 });
                const completePayload = { ...r, downloadId };
                sendProgress('download-complete', completePayload);
                callbacks?.onComplete?.(completePayload);
            },
            onError: (e) => {
                (0, logger_1.warn)('Download error', { downloadId, message: e.message });
                const errorPayload = { downloadId, message: e.message };
                sendProgress('download-error', errorPayload);
                callbacks?.onError?.(errorPayload);
            }
        });
        return { downloadId, release };
    }
    async checkDownloadSpace(request) {
        const { distroId, targetMountPath } = request;
        const catalog = (0, catalog_1.loadCatalog)();
        const distro = (0, catalog_1.getDistroById)(catalog, distroId);
        if (!distro)
            throw new Error('Distro not found');
        const provider = (0, providerFactory_1.createProvider)(distro);
        const release = await provider.getLatestRelease();
        const requiredBytes = release.size || 0;
        const storageInfo = (0, storage_1.getStorageInfo)(targetMountPath);
        if (!storageInfo) {
            return {
                available: null,
                total: null,
                used: null,
                percentUsed: null,
                required: requiredBytes,
                ok: true,
                warning: 'Could not determine available space'
            };
        }
        const ok = storageInfo.available >= requiredBytes;
        return {
            available: storageInfo.available,
            total: storageInfo.total,
            used: storageInfo.used,
            percentUsed: storageInfo.percentUsed,
            required: requiredBytes,
            ok,
            warning: ok ? null : `Insufficient space: ${(requiredBytes / 1e9).toFixed(1)} GB required, ${(storageInfo.available / 1e9).toFixed(1)} GB available`
        };
    }
    cancelDownload(downloadId) {
        return (0, downloadManager_1.cancelDownload)(downloadId);
    }
    getQueueState() {
        return (0, downloadManager_1.getQueueState)();
    }
    setQueueConcurrency(concurrency) {
        const n = Math.max(1, Math.min(8, Number(concurrency) || 2));
        (0, downloadManager_1.setQueueConcurrency)('default', n);
        return { concurrency: n };
    }
    async getAutoSelectedDrive() {
        return (0, driveEnumerator_1.getVentoyDrive)();
    }
}
exports.DownloadOrchestrator = DownloadOrchestrator;
