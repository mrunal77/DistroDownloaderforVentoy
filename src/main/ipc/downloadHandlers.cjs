"use strict";
/* src/main/ipc/downloadHandlers.ts
 * Thin IPC wiring for download-related channels.
 * All business logic lives in DownloadOrchestrator.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDownloadHandlers = registerDownloadHandlers;
const electron_1 = require("electron");
const validators_1 = require("../validation/validators.cjs");
const catalog_1 = require("../catalog.cjs");
const isoProvider_1 = require("../isoProvider.cjs");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function registerDownloadHandlers(orchestrator, mainWindow) {
    orchestrator.setMainWindow(mainWindow);
    electron_1.ipcMain.handle('start-download', async (event, request) => {
        return orchestrator.startDownload(request);
    });
    electron_1.ipcMain.handle('cancel-download', async (_event, downloadId) => {
        return orchestrator.cancelDownload(downloadId);
    });
    electron_1.ipcMain.handle('get-queue-state', async () => {
        return orchestrator.getQueueState();
    });
    electron_1.ipcMain.handle('set-download-concurrency', async (_event, concurrency) => {
        return orchestrator.setQueueConcurrency(concurrency);
    });
    electron_1.ipcMain.handle('check-download-space', async (_event, request) => {
        return orchestrator.checkDownloadSpace(request);
    });
    electron_1.ipcMain.handle('verify-iso', async (_event, filePath) => {
        (0, validators_1.validateFilePath)(filePath);
        const result = await isoProvider_1.IsoProvider.prototype.verifyChecksum(filePath, null, 'sha256');
        return { verified: result === true, status: result === true ? 'verified' : result === false ? 'failed' : 'unavailable' };
    });
    electron_1.ipcMain.handle('scan-ventoy', async (_event, mountPath) => {
        const entries = fs_1.default.readdirSync(mountPath).filter(f => f.toLowerCase().endsWith('.iso'));
        const isos = [];
        for (const iso of entries) {
            const stats = fs_1.default.statSync(path_1.default.join(mountPath, iso));
            isos.push({ fileName: iso, path: path_1.default.join(mountPath, iso), size: stats.size });
        }
        return isos;
    });
    electron_1.ipcMain.handle('delete-iso', async (_event, { mountPath, isoName }) => {
        (0, validators_1.validateIsoName)(isoName);
        const target = path_1.default.join(mountPath, isoName);
        if (!fs_1.default.existsSync(target))
            throw new Error('ISO not found: ' + isoName);
        fs_1.default.unlinkSync(target);
        return { success: true };
    });
    electron_1.ipcMain.handle('get-distro-metadata', async (_event, distroId) => {
        if (!distroId)
            return null;
        const catalog = (0, catalog_1.loadCatalog)();
        const sanitized = (0, validators_1.validateDistroId)(distroId, catalog);
        if (!sanitized)
            return null;
        for (const parent of Object.values(catalog)) {
            if (!parent || !parent.distros)
                continue;
            const found = parent.distros.find((d) => d.id === distroId);
            if (found)
                return found;
        }
        return null;
    });
}
