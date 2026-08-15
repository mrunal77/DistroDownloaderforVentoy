"use strict";
/* src/main/ventoyMetadata.ts
 * Read-only Ventoy metadata verification from physical device sectors.
 * Never writes to the device. Uses O_RDONLY.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readDeviceSectors = readDeviceSectors;
exports.checkVentoyMbrSignature = checkVentoyMbrSignature;
exports.checkVentoyStage2Signature = checkVentoyStage2Signature;
exports.extractVentoyVersionFromBuf = extractVentoyVersionFromBuf;
exports.readVentoyConfigFromMount = readVentoyConfigFromMount;
exports.verifyVentoyMetadataReadOnly = verifyVentoyMetadataReadOnly;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./logger.cjs");
const VENTOY_MBR_OFFSET = 0;
const VENTOY_MBR_SIZE = 512;
const VENTOY_STAGE2_OFFSET = 64;
const VENTOY_STAGE2_SIZE = 1024 * 1024;
function readDeviceSectors(devicePath, offset, length) {
    try {
        const fd = fs_1.default.openSync(devicePath, fs_1.default.constants.O_RDONLY);
        try {
            const buf = Buffer.alloc(length);
            const bytesRead = fs_1.default.readSync(fd, buf, 0, length, offset);
            return buf.slice(0, bytesRead);
        }
        finally {
            fs_1.default.closeSync(fd);
        }
    }
    catch {
        (0, logger_1.warn)('Failed to read device sectors');
        return null;
    }
}
function checkVentoyMbrSignature(buf) {
    if (!buf || buf.length < 512)
        return false;
    const mbr = buf.toString('latin1', 440, 512);
    const ventoySignatures = [
        'VTOY',
        'Ventoy',
        'vtoy',
        'grub',
        'GRUB2'
    ];
    for (const sig of ventoySignatures) {
        if (mbr.includes(sig))
            return true;
    }
    return false;
}
function checkVentoyStage2Signature(buf) {
    if (!buf || buf.length < 512)
        return false;
    const stage2 = buf.toString('latin1', 0, Math.min(buf.length, 65536));
    const ventoySignatures = [
        'Ventoy',
        'vtoy',
        'VTOY',
        'ventoy',
        'GRUB2',
        'grub2'
    ];
    for (const sig of ventoySignatures) {
        if (stage2.includes(sig))
            return true;
    }
    return false;
}
function extractVentoyVersionFromBuf(buf) {
    if (!buf || buf.length < 512)
        return undefined;
    const stage2 = buf.toString('latin1', 0, Math.min(buf.length, 65536));
    const patterns = [
        /Ventoy[\s/]+([0-9]+\.[0-9]+\.[0-9]+)/i,
        /vtoy[\s/]+([0-9]+\.[0-9]+\.[0-9]+)/i,
        /VTOY[\s/]+([0-9]+\.[0-9]+\.[0-9]+)/i
    ];
    for (const pat of patterns) {
        const m = stage2.match(pat);
        if (m && m[1])
            return m[1];
    }
    return undefined;
}
function readVentoyConfigFromMount(mountPath) {
    if (!mountPath)
        return null;
    const ventoyJsonPath = path_1.default.join(mountPath, 'ventoy', 'ventoy.json');
    try {
        if (fs_1.default.existsSync(ventoyJsonPath)) {
            const raw = fs_1.default.readFileSync(ventoyJsonPath, 'utf8');
            return JSON.parse(raw);
        }
    }
    catch {
        (0, logger_1.warn)('Failed to read ventoy.json');
    }
    return null;
}
function verifyVentoyMetadataReadOnly(drive) {
    if (!drive || !drive.device) {
        return { verified: false, reason: 'No device path', mbrSignature: false, stage2Signature: false, partitionStructureValid: false, ventoyConfig: null, version: undefined, rawReadOnly: true };
    }
    const devicePath = drive.device;
    const mbrBuf = readDeviceSectors(devicePath, VENTOY_MBR_OFFSET, VENTOY_MBR_SIZE);
    const stage2Buf = readDeviceSectors(devicePath, VENTOY_STAGE2_OFFSET * 512, VENTOY_STAGE2_SIZE);
    const mbrSig = checkVentoyMbrSignature(mbrBuf);
    const stage2Sig = checkVentoyStage2Signature(stage2Buf);
    const rawSignatureValid = mbrSig || stage2Sig;
    const partitions = (drive.partitions || []);
    const partitionStructureValid = partitions.some(p => (p.label || '').toLowerCase() === 'vtoyefi' ||
        (p.partLabel || '').toLowerCase() === 'vtoyefi') && partitions.some(p => (p.label || '').toLowerCase() === 'ventoy' ||
        (p.partLabel || '').toLowerCase() === 'ventoy');
    const ventoyJson = drive.ventoyDataPath ? readVentoyConfigFromMount(drive.ventoyDataPath) : null;
    let version = drive.ventoyVersion;
    if (!version) {
        const stageVersion = extractVentoyVersionFromBuf(stage2Buf);
        if (stageVersion)
            version = stageVersion;
    }
    if (!version && ventoyJson && ventoyJson.Version) {
        version = ventoyJson.Version;
    }
    let verified = false;
    let reason = 'No Ventoy indicators found';
    if (rawSignatureValid && partitionStructureValid) {
        verified = true;
        reason = 'Ventoy signature and partition structure verified';
    }
    else if (partitionStructureValid && ventoyJson) {
        verified = true;
        reason = 'Ventoy partition structure and config verified';
    }
    else if (partitionStructureValid) {
        verified = true;
        reason = 'Ventoy partition structure consistent';
    }
    else if (rawSignatureValid) {
        verified = true;
        reason = 'Ventoy disk signature found';
    }
    else if (ventoyJson) {
        verified = true;
        reason = 'Ventoy config file found';
    }
    return {
        verified,
        reason,
        mbrSignature: mbrSig,
        stage2Signature: stage2Sig,
        partitionStructureValid,
        ventoyConfig: ventoyJson ? { version: ventoyJson.Version || '', hasMenu: !!ventoyJson.Menu } : null,
        version,
        rawReadOnly: true
    };
}
