"use strict";
/* src/main/validation/validators.ts
 * Shared input validation for IPC handlers and internal services.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = void 0;
exports.validateDevicePath = validateDevicePath;
exports.validateMountPath = validateMountPath;
exports.validateVentoyTargetMount = validateVentoyTargetMount;
exports.validateDownloadUrl = validateDownloadUrl;
exports.validateDistroId = validateDistroId;
exports.validateDriveObject = validateDriveObject;
exports.validateFileName = validateFileName;
exports.validateIsoName = validateIsoName;
exports.validateFilePath = validateFilePath;
exports.validateSettings = validateSettings;
exports.validateDownloadId = validateDownloadId;
exports.validateDistroMetadataId = validateDistroMetadataId;
const fs_1 = __importDefault(require("fs"));
const usbDetectionService_1 = require("../usbDetectionService.cjs");
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
function validateDevicePath(devicePath) {
    if (!devicePath || typeof devicePath !== 'string') {
        throw new ValidationError('Invalid device path: must be a non-empty string');
    }
    if (!devicePath.startsWith('/dev/')) {
        throw new ValidationError('Invalid device path: must start with /dev/');
    }
    if (devicePath.includes('..') || devicePath.includes('//')) {
        throw new ValidationError('Invalid device path: contains forbidden characters');
    }
    return devicePath;
}
function validateMountPath(mountPath) {
    if (!mountPath || typeof mountPath !== 'string') {
        throw new ValidationError('Invalid mount path: must be a non-empty string');
    }
    if (mountPath.includes('..') || mountPath.includes('//')) {
        throw new ValidationError('Invalid mount path: contains forbidden characters');
    }
    if (!fs_1.default.existsSync(mountPath)) {
        throw new ValidationError('Invalid mount path: path does not exist');
    }
    return mountPath;
}
function validateVentoyTargetMount(mountPath) {
    validateMountPath(mountPath);
    const drive = (0, usbDetectionService_1.detectAllDrives)().find(candidate => candidate.ventoyDataPath === mountPath &&
        (candidate.ventoyConfidence === 'high' || candidate.ventoyConfidence === 'medium'));
    if (!drive) {
        throw new ValidationError('Select a detected Ventoy data partition before downloading');
    }
    return mountPath;
}
function validateDownloadUrl(downloadUrl) {
    let parsed;
    try {
        parsed = new URL(downloadUrl);
    }
    catch {
        throw new ValidationError('Invalid download URL');
    }
    if (parsed.protocol !== 'https:') {
        throw new ValidationError('Downloads must use HTTPS');
    }
    return parsed.href;
}
function validateDistroId(distroId, catalog) {
    if (!distroId || typeof distroId !== 'string') {
        throw new ValidationError('Invalid distro ID: must be a non-empty string');
    }
    if (distroId.includes('..') || distroId.includes('/')) {
        throw new ValidationError('Invalid distro ID: contains forbidden characters');
    }
    const found = Object.values(catalog).some(parent => parent.distros?.some(d => d.id === distroId));
    if (!found) {
        throw new ValidationError('Distro not found: ' + distroId);
    }
    return distroId;
}
function validateDriveObject(drive) {
    if (!drive || typeof drive !== 'object') {
        throw new ValidationError('Invalid drive: must be an object');
    }
    const device = drive.device;
    if (!device || typeof device !== 'string') {
        throw new ValidationError('Invalid drive: device property is required and must be a string');
    }
    if (!device.startsWith('/dev/')) {
        throw new ValidationError('Invalid drive: device path must start with /dev/');
    }
    return drive;
}
function validateFileName(fileName) {
    if (!fileName || typeof fileName !== 'string') {
        throw new ValidationError('Invalid file name: must be a non-empty string');
    }
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
        throw new ValidationError('Invalid file name: contains forbidden path characters');
    }
    if (!fileName.toLowerCase().endsWith('.iso')) {
        throw new ValidationError('Invalid file name: must have .iso extension');
    }
    return fileName;
}
function validateIsoName(isoName) {
    if (!isoName || typeof isoName !== 'string') {
        throw new ValidationError('Invalid ISO name: must be a non-empty string');
    }
    if (isoName.includes('..') || isoName.includes('/') || isoName.includes('\\')) {
        throw new ValidationError('Invalid ISO name: contains forbidden path characters');
    }
    return isoName;
}
function validateFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        throw new ValidationError('Invalid file path');
    }
    if (filePath.includes('..') || filePath.includes('//')) {
        throw new ValidationError('Invalid file path: contains forbidden characters');
    }
    if (!fs_1.default.existsSync(filePath))
        throw new ValidationError('File not found');
    return filePath;
}
function validateSettings(settings) {
    if (!settings || typeof settings !== 'object') {
        throw new ValidationError('Invalid settings: must be an object');
    }
    return settings;
}
function validateDownloadId(downloadId) {
    if (!downloadId || typeof downloadId !== 'string') {
        throw new ValidationError('Invalid download ID');
    }
    return downloadId;
}
function validateDistroMetadataId(distroId) {
    if (!distroId || typeof distroId !== 'string') {
        return null;
    }
    if (distroId.includes('..') || distroId.includes('/')) {
        return null;
    }
    return distroId;
}
