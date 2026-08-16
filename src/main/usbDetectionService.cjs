"use strict";
/* src/main/usbDetectionService.ts
 * Real Linux USB block device detection using lsblk, udevadm, sysfs, and /dev/disk/by-id.
 * Strictly read-only. Never modifies any device.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLsblk = runLsblk;
exports.runUdevadm = runUdevadm;
exports.getSysfsRemovable = getSysfsRemovable;
exports.getSysfsReadOnly = getSysfsReadOnly;
exports.getUsbPortPath = getUsbPortPath;
exports.detectPhysicalUsbDisks = detectPhysicalUsbDisks;
exports.detectVentoyOnDrive = detectVentoyOnDrive;
exports.getStorageInfo = getStorageInfo;
exports.detectAllDrives = detectAllDrives;
exports.getVentoyDrive = getVentoyDrive;
exports.getDriveDetails = getDriveDetails;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./logger.cjs");
const ventoyMetadata_1 = require("./ventoyMetadata.cjs");
const LSFIELDS = [
    'NAME', 'KNAME', 'PATH', 'TYPE', 'TRAN', 'RM', 'RO', 'SIZE',
    'FSTYPE', 'LABEL', 'UUID', 'MOUNTPOINTS',
    'PARTLABEL', 'PARTUUID', 'MODEL', 'VENDOR', 'SERIAL'
].join(',');
function runLsblk() {
    try {
        const out = (0, child_process_1.execFileSync)('lsblk', ['--json', '-b', '-o', LSFIELDS], { encoding: 'utf8' });
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
function getSysfsRemovable(deviceName) {
    try {
        const p = path_1.default.join('/sys/block', deviceName, 'removable');
        const v = fs_1.default.readFileSync(p, 'utf8').trim();
        return v === '1';
    }
    catch {
        return null;
    }
}
function getSysfsReadOnly(deviceName) {
    try {
        const p = path_1.default.join('/sys/block', deviceName, 'ro');
        const v = fs_1.default.readFileSync(p, 'utf8').trim();
        return v === '1';
    }
    catch {
        return null;
    }
}
function getUsbPortPath(deviceName) {
    try {
        const sysfsPath = path_1.default.join('/sys/block', deviceName);
        const realPath = fs_1.default.realpathSync(sysfsPath);
        return realPath;
    }
    catch {
        return null;
    }
}
function getStableId(udevProps) {
    const byId = udevProps.ID_SERIAL || udevProps.ID_SERIAL_SHORT || null;
    const byPath = udevProps.ID_PATH || null;
    const byDiskseq = null;
    return { byId, byPath, byDiskseq };
}
function getMountpoints(mp) {
    if (Array.isArray(mp))
        return mp.filter(Boolean);
    if (typeof mp === 'string' && mp)
        return [mp];
    return [];
}
function parseSizeBytes(size) {
    if (size == null)
        return null;
    const n = typeof size === 'string' ? parseInt(size, 10) : size;
    return Number.isNaN(n) ? null : n;
}
function detectPhysicalUsbDisks() {
    const data = runLsblk();
    const devices = data.blockdevices || [];
    const results = [];
    for (const dev of devices) {
        if (!dev.name || dev.type === 'loop' || dev.type === 'rom')
            continue;
        if (dev.type !== 'disk')
            continue;
        const devicePath = dev.path || `/dev/${dev.name}`;
        const udevProps = runUdevadm(devicePath);
        const sysRem = getSysfsRemovable(dev.name);
        const sysRo = getSysfsReadOnly(dev.name);
        const usbPort = getUsbPortPath(dev.name);
        const tran = (dev.tran || '').toLowerCase();
        const idBus = (udevProps.ID_BUS || '').toLowerCase();
        const isUsb = tran === 'usb' || idBus === 'usb';
        const removable = sysRem === true || sysRem === null && (dev.rm === true || dev.rm === '1');
        const readOnly = sysRo === true || sysRo === null && (dev.ro === true || dev.ro === '1');
        // USB-attached SSDs often report RM=0. USB transport is the reliable
        // indicator; read-only devices remain excluded.
        if (!isUsb || readOnly)
            continue;
        const size = parseSizeBytes(dev.size);
        const stable = getStableId(udevProps);
        const partitions = (dev.children || [])
            .filter(p => p.type === 'part')
            .map(p => ({
            device: p.path || `/dev/${p.name}`,
            number: p.name ? parseInt(p.name.replace(/[^0-9]/g, ''), 10) || 0 : 0,
            size: parseSizeBytes(p.size),
            filesystem: p.fstype || null,
            label: p.label || null,
            uuid: p.uuid || null,
            partLabel: p.partlabel || null,
            partUuid: p.partuuid || null,
            mountPoints: getMountpoints(p.mountpoints)
        }));
        results.push({
            device: devicePath,
            name: dev.name,
            model: dev.model || udevProps.ID_MODEL || null,
            vendor: dev.vendor || udevProps.ID_VENDOR || null,
            serial: dev.serial || udevProps.ID_SERIAL_SHORT || null,
            size,
            transport: dev.tran || idBus || 'usb',
            removable,
            partitions,
            mountPoints: getMountpoints(dev.mountpoints),
            isVentoy: false,
            ventoyConfidence: 'none',
            ventoyVersion: undefined,
            stableId: stable,
            usbPortPath: usbPort,
            udevProps
        });
    }
    return results;
}
function detectVentoyOnDrive(drive) {
    if (!drive || !drive.partitions)
        return drive;
    const parts = drive.partitions;
    const hasVentoyLabel = parts.some(p => (p.label || '').toLowerCase() === 'ventoy');
    const hasVtoyefiLabel = parts.some(p => (p.label || '').toLowerCase() === 'vtoyefi');
    const hasVentoyPartLabel = parts.some(p => (p.partLabel || '').toLowerCase() === 'ventoy');
    const hasVtoyefiPartLabel = parts.some(p => (p.partLabel || '').toLowerCase() === 'vtoyefi');
    const dataPart = parts.find(p => (p.label || '').toLowerCase() === 'ventoy') ||
        parts.find(p => (p.partLabel || '').toLowerCase() === 'ventoy') ||
        parts.find(p => p.filesystem && ['exfat', 'ntfs', 'fat32', 'vfat', 'ext4'].includes(p.filesystem.toLowerCase()) && p.size && p.size > 1e9);
    const efiPart = parts.find(p => (p.label || '').toLowerCase() === 'vtoyefi') ||
        parts.find(p => (p.partLabel || '').toLowerCase() === 'vtoyefi') ||
        parts.find(p => p.filesystem && ['vfat', 'fat32', 'fat12', 'fat16'].includes(p.filesystem.toLowerCase()) && p.size && p.size < 1e8);
    const hasLargeData = dataPart != null;
    const hasSmallEfi = efiPart != null;
    const partitionStructureOk = hasLargeData && hasSmallEfi;
    const mountedData = dataPart && dataPart.mountPoints.length > 0 ? dataPart.mountPoints[0] : null;
    const mountedEfi = efiPart && efiPart.mountPoints.length > 0 ? efiPart.mountPoints[0] : null;
    let metadataVerified = false;
    let ventoyVersion = undefined;
    if (mountedData) {
        const ventoyJsonPath = path_1.default.join(mountedData, 'ventoy', 'ventoy.json');
        const ventoyDirPath = path_1.default.join(mountedData, 'ventoy');
        try {
            if (fs_1.default.existsSync(ventoyJsonPath)) {
                const raw = fs_1.default.readFileSync(ventoyJsonPath, 'utf8');
                const parsed = JSON.parse(raw);
                metadataVerified = true;
                ventoyVersion = parsed.Version || parsed.version || undefined;
            }
            else if (fs_1.default.existsSync(ventoyDirPath)) {
                metadataVerified = true;
            }
        }
        catch {
            metadataVerified = false;
        }
    }
    let rawMeta = null;
    try {
        rawMeta = (0, ventoyMetadata_1.verifyVentoyMetadataReadOnly)(drive);
    }
    catch {
        rawMeta = null;
    }
    let confidence = 'none';
    if (rawMeta?.verified && partitionStructureOk && hasVentoyLabel) {
        confidence = 'high';
    }
    else if (metadataVerified && partitionStructureOk && hasVentoyLabel) {
        confidence = 'high';
    }
    else if (rawMeta?.verified && partitionStructureOk) {
        confidence = 'high';
    }
    else if (partitionStructureOk && (hasVentoyLabel || hasVtoyefiLabel)) {
        confidence = 'medium';
    }
    else if (rawMeta?.verified && (hasVentoyLabel || hasVtoyefiLabel)) {
        confidence = 'medium';
    }
    else if (hasVentoyLabel || hasVtoyefiLabel || hasVentoyPartLabel || hasVtoyefiPartLabel) {
        confidence = 'low';
    }
    else if (hasLargeData && hasSmallEfi && drive.transport === 'usb') {
        confidence = 'low';
    }
    drive.isVentoy = confidence !== 'none';
    drive.ventoyConfidence = confidence;
    drive.ventoyVersion = ventoyVersion;
    drive.ventoyDataPath = mountedData;
    drive.ventoyBootPath = mountedEfi;
    drive.ventoyDataPartition = dataPart ? dataPart.device : null;
    drive.ventoyBootPartition = efiPart ? efiPart.device : null;
    drive.ventoyMetadataVerified = rawMeta?.verified ?? metadataVerified;
    drive.ventoyMetadataReason = rawMeta?.reason || '';
    drive.ventoyRawSignatureValid = rawMeta?.mbrSignature || rawMeta?.stage2Signature || false;
    return drive;
}
function getStorageInfo(mountPath) {
    if (!mountPath)
        return null;
    try {
        const out = (0, child_process_1.execFileSync)('df', ['-B1', mountPath], { encoding: 'utf8' });
        const lines = out.trim().split(/\r?\n/);
        if (lines.length >= 2) {
            const cols = lines[1].trim().split(/\s+/);
            if (cols.length >= 6) {
                return {
                    total: parseInt(cols[1], 10),
                    used: parseInt(cols[2], 10),
                    available: parseInt(cols[3], 10),
                    percentUsed: parseInt(cols[4], 10)
                };
            }
        }
    }
    catch {
        (0, logger_1.warn)('df failed for mount');
    }
    return null;
}
function detectAllDrives() {
    const usbDisks = detectPhysicalUsbDisks();
    for (const drive of usbDisks) {
        detectVentoyOnDrive(drive);
    }
    return usbDisks;
}
function getVentoyDrive() {
    const drives = detectAllDrives();
    return drives.find(d => d.ventoyConfidence === 'high') ||
        drives.find(d => d.ventoyConfidence === 'medium') ||
        drives.find(d => d.isVentoy) ||
        null;
}
function getDriveDetails(devicePath) {
    const drives = detectAllDrives();
    return drives.find(d => d.device === devicePath) || null;
}
