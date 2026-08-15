"use strict";
/* src/main/downloadManager.ts
 * Download manager with temp file, atomic rename, resume support, retry, and checksum verification.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadWithRetry = downloadWithRetry;
exports.startDownload = startDownload;
exports.cancelDownload = cancelDownload;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./logger.cjs");
const isoProvider_1 = require("./isoProvider.cjs");
const activeDownloads = new Map();
async function downloadWithRetry(url, targetDir, fileName, options = {}) {
    const { maxRetries = 3, timeout = 0, signal = null, onProgress = null } = options;
    const targetPath = path_1.default.join(targetDir, fileName);
    const tempPath = targetPath + '.download';
    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const result = await streamDownload(url, tempPath, { timeout, signal, onProgress });
            if (options.expectedSha256) {
                const valid = isoProvider_1.IsoProvider.prototype.verifyChecksum(tempPath, options.expectedSha256, 'sha256');
                if (valid === false) {
                    throw new Error('Checksum verification failed');
                }
                if (valid === null) {
                    (0, logger_1.verification)('Checksum verification unavailable', { file: tempPath });
                }
                else {
                    (0, logger_1.verification)('Checksum verified', { file: tempPath, sha256: options.expectedSha256 });
                }
            }
            fs_1.default.renameSync(tempPath, targetPath);
            (0, logger_1.download)('Download completed', { targetPath, attempt: attempt + 1 });
            return { filePath: targetPath, sha256: result.sha256 };
        }
        catch (err) {
            lastError = err;
            try {
                fs_1.default.unlinkSync(tempPath);
            }
            catch { /* ignore */ }
            if (attempt < maxRetries - 1) {
                const delay = Math.pow(2, attempt) * 1000;
                (0, logger_1.warn)('Download retry', { attempt: attempt + 1, delay, error: err.message });
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError || new Error('Download failed');
}
async function streamDownload(url, targetPath, options = {}) {
    const { timeout = 0, signal = null, onProgress = null } = options;
    const response = await axios_1.default.get(url, {
        responseType: 'stream',
        signal: signal ?? undefined,
        timeout,
        maxRedirects: 5,
        validateStatus: (s) => s >= 200 && s < 400
    });
    const totalBytes = parseInt(response.headers['content-length'] || '0', 10) || null;
    let transferred = 0;
    const hash = crypto_1.default.createHash('sha256');
    const writeStream = fs_1.default.createWriteStream(targetPath, { flags: 'w' });
    await new Promise((resolve, reject) => {
        writeStream.on('open', resolve);
        writeStream.on('error', reject);
    });
    const stream = response.data;
    let lastProgressSentAt = 0;
    const progressIntervalMs = 500;
    const startTime = Date.now();
    const streamIterable = stream;
    for await (const chunk of streamIterable) {
        if (signal !== null && signal.aborted)
            throw new Error('aborted');
        transferred += chunk.length;
        hash.update(chunk);
        const ok = writeStream.write(chunk);
        if (!ok)
            await new Promise(resolve => writeStream.once('drain', resolve));
        const now = Date.now();
        if (onProgress && now - lastProgressSentAt >= progressIntervalMs) {
            lastProgressSentAt = now;
            const elapsed = (now - startTime) / 1000;
            const speedBps = elapsed > 0 ? transferred / elapsed : 0;
            const percentage = totalBytes ? Math.min(100, (transferred / totalBytes) * 100) : null;
            const etaSeconds = (totalBytes && speedBps > 0) ? Math.max(0, Math.round((totalBytes - transferred) / speedBps)) : null;
            onProgress({
                transferredBytes: transferred,
                totalBytes,
                percentage,
                downloadSpeedBytesPerSec: Math.round(speedBps),
                etaSeconds
            });
        }
    }
    await new Promise(resolve => writeStream.end(resolve));
    const sha256 = hash.digest('hex');
    return { sha256, totalBytes: transferred };
}
async function startDownload(config, callbacks = {}) {
    const { downloadId: rawDownloadId, downloadUrl, fileName, targetMountPath, options = {} } = config;
    const downloadId = rawDownloadId || crypto_1.default.randomUUID();
    const { onProgress, onComplete, onError } = callbacks;
    const controller = new AbortController();
    const signal = controller.signal;
    if (!targetMountPath || !fs_1.default.existsSync(targetMountPath)) {
        throw new Error('Target mount path does not exist');
    }
    const info = { downloadId, downloadUrl, fileName, targetMountPath, aborted: false, signal, controller };
    activeDownloads.set(downloadId, info);
    (0, logger_1.download)('Download started', { downloadId, url: downloadUrl, target: path_1.default.join(targetMountPath, fileName) });
    try {
        const result = await downloadWithRetry(downloadUrl, targetMountPath, fileName, {
            ...options,
            signal,
            onProgress: (progress) => {
                if (onProgress)
                    onProgress({ ...progress, downloadId });
            }
        });
        if (onComplete)
            onComplete({ downloadId, ...result });
        activeDownloads.delete(downloadId);
        return result;
    }
    catch (err) {
        const message = err && err.message ? err.message : 'Download failed';
        if (onError)
            onError({ downloadId, message });
        activeDownloads.delete(downloadId);
        throw new Error(message);
    }
}
function cancelDownload(downloadId) {
    const info = activeDownloads.get(downloadId);
    if (!info)
        return false;
    info.aborted = true;
    if (info.controller)
        info.controller.abort();
    return true;
}
