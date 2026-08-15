"use strict";
/* src/main/udevMonitor.ts
 * Real-time USB hotplug detection via udev.
 * Monitors block device add/remove events and notifies the main window.
 * Strictly read-only. Never modifies any device.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMainWindow = setMainWindow;
exports.startMonitor = startMonitor;
exports.stopMonitor = stopMonitor;
exports.refreshAndNotify = refreshAndNotify;
const child_process_1 = require("child_process");
const logger_1 = require("./logger.cjs");
const usbDetectionService_1 = require("./usbDetectionService.cjs");
const ventoyMetadata_1 = require("./ventoyMetadata.cjs");
let monitorProcess = null;
let mainWindow = null;
let debounceTimer = null;
const DEBOUNCE_MS = 800;
function setMainWindow(win) {
    mainWindow = win;
}
function startMonitor() {
    if (monitorProcess)
        return;
    monitorProcess = (0, child_process_1.spawn)('udevadm', ['monitor', '--udev', '--property', '--kernel', '--subsystem-match=block']);
    if (monitorProcess.stdout) {
        monitorProcess.stdout.on('data', (data) => {
            const text = data.toString();
            const lines = text.split(/\r?\n/);
            let event = {};
            for (const line of lines) {
                if (line.startsWith('ACTION='))
                    event.action = line.slice(7);
                else if (line.startsWith('DEVNAME='))
                    event.devname = line.slice(8);
                else if (line.startsWith('DEVTYPE='))
                    event.devtype = line.slice(8);
                else if (line.startsWith('ID_BUS='))
                    event.idBus = line.slice(7);
                else if (line.startsWith('TRAN='))
                    event.tran = line.slice(5);
                else if (line.startsWith('ID_MODEL='))
                    event.idModel = line.slice(9);
                else if (line.startsWith('ID_SERIAL_SHORT='))
                    event.idSerial = line.slice(16);
                else if (line.startsWith('ID_VENDOR='))
                    event.idVendor = line.slice(11);
            }
            if (!event.action || !event.devname)
                return;
            if (!event.devname.startsWith('/dev/'))
                return;
            if (debounceTimer)
                clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                handleDeviceChange(event);
            }, DEBOUNCE_MS);
        });
    }
    if (monitorProcess.stderr) {
        monitorProcess.stderr.on('data', (data) => {
            const text = data.toString().trim();
            if (text)
                (0, logger_1.warn)('udev monitor stderr', { text });
        });
    }
    monitorProcess.on('close', (code) => {
        (0, logger_1.info)('udev monitor closed', { code });
        monitorProcess = null;
        if (code === 0 || code === null) {
            setTimeout(() => startMonitor(), 2000);
        }
    });
    monitorProcess.on('error', (err) => {
        (0, logger_1.error)('udev monitor spawn error', { error: err.message });
        monitorProcess = null;
    });
    (0, logger_1.info)('udev monitor started');
}
function stopMonitor() {
    if (monitorProcess) {
        monitorProcess.kill('SIGTERM');
        monitorProcess = null;
    }
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
    (0, logger_1.info)('udev monitor stopped');
}
function handleDeviceChange(_event) {
    if (!mainWindow || mainWindow.isDestroyed())
        return;
    try {
        const drives = (0, usbDetectionService_1.detectAllDrives)();
        for (const drive of drives) {
            const meta = (0, ventoyMetadata_1.verifyVentoyMetadataReadOnly)(drive);
            drive.ventoyMetadataVerified = meta.verified;
            drive.ventoyMetadataReason = meta.reason;
            drive.ventoyRawSignatureValid = meta.mbrSignature || meta.stage2Signature;
            if (meta.version && !drive.ventoyVersion)
                drive.ventoyVersion = meta.version;
        }
        mainWindow.webContents.send('usb:devices-changed', { drives, timestamp: Date.now() });
        const ventoyDrives = drives.filter(d => d.isVentoy);
        for (const d of ventoyDrives) {
            mainWindow.webContents.send('ventoy:detected', {
                device: d.device,
                confidence: d.ventoyConfidence,
                version: d.ventoyVersion,
                mountPath: d.ventoyDataPath
            });
        }
    }
    catch {
        (0, logger_1.error)('Device change handler failed');
    }
}
function refreshAndNotify() {
    if (!mainWindow || mainWindow.isDestroyed())
        return;
    handleDeviceChange({});
}
