"use strict";
/* src/main/ventoyDetector.ts
 * Robust Linux USB and Ventoy detection using lsblk, udevadm, /dev/disk/by-id, and sysfs USB port inspection.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLsblk = runLsblk;
exports.runUdevadm = runUdevadm;
exports.getUsbPortPath = getUsbPortPath;
exports.detectVentoyDrives = detectVentoyDrives;
exports.getVentoyDrive = getVentoyDrive;
exports.getVentoyDataMount = getVentoyDataMount;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./logger.cjs");
function runLsblk() {
    try {
        const out = (0, child_process_1.execFileSync)('lsblk', ['-Jb', '-o', 'NAME,SIZE,TYPE,MOUNTPOINTS,TRAN,RO,RM,MODEL,SERIAL'], { encoding: 'utf8' });
        return JSON.parse(out);
    }
    catch {
        (0, logger_1.warn)('lsblk failed');
        return { blockdevices: [] };
    }
}
function runUdevadm(devicePath) {
    try {
        const out = (0, child_process_1.execFileSync)('udevadm', ['info', '--query=property', '--name', devicePath], { encoding: 'utf8' });
        const props = {};
        for (const line of out.split(/\r?\n/)) {
            const idx = line.indexOf('=');
            if (idx > 0) {
                const key = line.slice(0, idx);
                const value = line.slice(idx + 1);
                props[key] = value;
            }
        }
        return props;
    }
    catch {
        return {};
    }
}
function isRemovable(udevProps) {
    const rem = udevProps.REMOVEABLE || udevProps.UDISKS_DRIVE_REMOVABLE;
    return rem === '1';
}
function isUsbDevice(udevProps) {
    return udevProps.ID_BUS === 'usb';
}
function getUsbPortPath(devicePath) {
    try {
        const sysfsPath = `/sys/block/${path_1.default.basename(devicePath)}`;
        const realPath = fs_1.default.realpathSync(sysfsPath);
        return realPath;
    }
    catch {
        return null;
    }
}
function checkVentoyStructure(mountPath) {
    if (!mountPath)
        return { isVentoy: false, mountPath: '', isBoot: false };
    const base = path_1.default.resolve(mountPath);
    const basename = path_1.default.basename(base);
    if (basename && basename.toLowerCase() === 'ventoy') {
        return { isVentoy: true, mountPath: base, isBoot: false };
    }
    try {
        const candidates = [
            path_1.default.join(base, 'ventoy.json'),
            path_1.default.join(base, 'ventoy'),
            path_1.default.join(base, 'ventoy', 'ventoy')
        ];
        for (const p of candidates) {
            try {
                fs_1.default.accessSync(p, fs_1.default.constants.F_OK);
                return { isVentoy: true, mountPath: base, isBoot: false };
            }
            catch { /* ignore */ }
        }
        if (basename.toLowerCase().includes('boot') || basename.toLowerCase().includes('efi')) {
            return { isVentoy: false, mountPath: base, isBoot: true };
        }
    }
    catch { /* ignore */ }
    return { isVentoy: false, mountPath: base, isBoot: false };
}
function detectVentoyDrives() {
    const data = runLsblk();
    const devices = data.blockdevices || [];
    const results = [];
    for (const dev of devices) {
        if (!dev.name || dev.type === 'loop' || dev.type === 'rom')
            continue;
        const devicePath = `/dev/${dev.name}`;
        const udevProps = runUdevadm(devicePath);
        const removable = isRemovable(udevProps);
        const usb = isUsbDevice(udevProps);
        const readOnly = dev.ro === true || dev.ro === '1';
        const model = dev.model || dev.serial || devicePath;
        const usbPortPath = getUsbPortPath(devicePath);
        if (dev.type === 'disk' && removable && usb && !readOnly) {
            const partitions = (dev.children || []).filter(p => p.type === 'part');
            for (const part of partitions) {
                const mountPoints = Array.isArray(part.mountpoints) ? part.mountpoints : (part.mountpoints ? [part.mountpoints] : []);
                for (const mp of mountPoints) {
                    if (!mp)
                        continue;
                    const ventoy = checkVentoyStructure(mp);
                    if (ventoy.isVentoy || ventoy.isBoot) {
                        const existing = results.find(r => r.devicePath === devicePath);
                        if (existing) {
                            if (ventoy.isVentoy && !existing.ventoyDataPath)
                                existing.ventoyDataPath = ventoy.mountPath;
                            if (ventoy.isBoot && !existing.ventoyBootPath)
                                existing.ventoyBootPath = ventoy.mountPath;
                        }
                        else {
                            results.push({
                                devicePath,
                                model,
                                size: dev.size ? parseInt(dev.size, 10) : null,
                                isRemovable: true,
                                isUsb: true,
                                isReadOnly: readOnly,
                                ventoyDataPath: ventoy.isVentoy ? ventoy.mountPath : null,
                                ventoyBootPath: ventoy.isBoot ? ventoy.mountPath : null,
                                mountPath: ventoy.mountPath,
                                usbPortPath,
                                udevProps
                            });
                        }
                    }
                }
            }
        }
    }
    return results;
}
function getVentoyDrive() {
    const drives = detectVentoyDrives();
    return drives.find(d => d.ventoyDataPath) || null;
}
function getVentoyDataMount(drive) {
    if (!drive)
        return null;
    return drive.ventoyDataPath || null;
}
