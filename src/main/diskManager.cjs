"use strict";
/* src/main/diskManager.ts
 * Enumerates removable drives using drivelist and resolves Ventoy mounts.
 * Exports:
 *  - listVentoyDrives(): Promise<[{ name, mountPath, totalSize, availableSize, isVentoy }]>
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listVentoyDrives = listVentoyDrives;
const drivelist_1 = __importDefault(require("drivelist"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
async function getAvailableBytes(mountPath) {
    try {
        const out = (0, child_process_1.execFileSync)('df', ['--output=avail', mountPath], { encoding: 'utf8' });
        const lines = out.trim().split(/\r?\n/);
        if (lines.length >= 2) {
            const kb = parseInt(lines[1].trim(), 10);
            if (!Number.isNaN(kb))
                return kb * 1024;
        }
    }
    catch {
        // Best-effort; return null if unavailable
    }
    return null;
}
async function checkIsVentoy(mountPath) {
    try {
        if (!mountPath)
            return false;
        const base = path_1.default.resolve(mountPath);
        const basename = path_1.default.basename(base);
        if (basename && basename.toLowerCase() === 'ventoy')
            return true;
        const candidates = [
            path_1.default.join(base, 'ventoy.json'),
            path_1.default.join(base, 'ventoy'),
            path_1.default.join(base, 'ventoy', 'ventoy')
        ];
        for (const p of candidates) {
            try {
                await fs_1.default.promises.access(p, fs_1.default.constants.F_OK);
                return true;
            }
            catch {
                // ignore
            }
        }
    }
    catch {
        // ignore and return false
    }
    return false;
}
async function listVentoyDrives() {
    const drives = await drivelist_1.default.list();
    const results = [];
    for (const d of drives) {
        // Only consider removable drives with mountpoints
        if (!d.isRemovable)
            continue;
        if (!d.mountpoints || d.mountpoints.length === 0)
            continue;
        // For each mountpoint, produce an entry
        for (const mp of d.mountpoints) {
            const mountPath = mp.path;
            const name = d.description || d.device || mountPath;
            const totalSize = d.size || null;
            const availableSize = await getAvailableBytes(mountPath);
            const isVentoy = await checkIsVentoy(mountPath);
            results.push({
                name,
                mountPath,
                totalSize,
                availableSize,
                isVentoy
            });
        }
    }
    return results;
}
