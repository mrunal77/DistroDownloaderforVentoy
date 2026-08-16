"use strict";
/* src/main/ipc/driveHandlers.ts
 * Thin IPC wiring for USB drive detection channels.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDriveHandlers = registerDriveHandlers;
const electron_1 = require("electron");
const driveEnumerator_1 = require("../usb/driveEnumerator.cjs");
const ventoyAnalyzer_1 = require("../usb/ventoyAnalyzer.cjs");
const validators_1 = require("../validation/validators.cjs");
const udevMonitor_1 = require("../udevMonitor.cjs");
function registerDriveHandlers(mainWindow) {
    (0, udevMonitor_1.setMainWindow)(mainWindow);
    electron_1.ipcMain.handle('get-usb-drives', async () => {
        return (0, driveEnumerator_1.detectAllDrives)().filter(d => d.isVentoy);
    });
    electron_1.ipcMain.handle('refresh-usb-drives', async () => {
        return (0, driveEnumerator_1.detectAllDrives)().filter(d => d.isVentoy);
    });
    electron_1.ipcMain.handle('get-drive-details', async (_event, devicePath) => {
        (0, validators_1.validateDevicePath)(devicePath);
        return (0, driveEnumerator_1.getDriveDetails)(devicePath);
    });
    electron_1.ipcMain.handle('get-storage-info', async (_event, mountPath) => {
        (0, validators_1.validateMountPath)(mountPath);
        return (0, driveEnumerator_1.getStorageInfo)(mountPath);
    });
    electron_1.ipcMain.handle('verify-ventoy-metadata', async (_event, drive) => {
        (0, validators_1.validateDriveObject)(drive);
        return (0, ventoyAnalyzer_1.verifyVentoyMetadataReadOnly)(drive);
    });
    electron_1.ipcMain.handle('start-usb-monitor', async () => {
        (0, udevMonitor_1.startMonitor)();
        return { started: true };
    });
    electron_1.ipcMain.handle('stop-usb-monitor', async () => {
        (0, udevMonitor_1.stopMonitor)();
        return { stopped: true };
    });
    electron_1.ipcMain.handle('usb-diagnostics', async () => {
        const drives = (0, driveEnumerator_1.detectAllDrives)();
        const result = [];
        for (const drive of drives) {
            const meta = (0, ventoyAnalyzer_1.verifyVentoyMetadataReadOnly)(drive);
            const storage = drive.ventoyDataPath ? (0, driveEnumerator_1.getStorageInfo)(drive.ventoyDataPath) : null;
            result.push({
                ...drive,
                ventoyMetadata: meta,
                storage
            });
        }
        return result;
    });
}
