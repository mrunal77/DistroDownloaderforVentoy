"use strict";
/* src/main/catalog.ts
 * Loads and merges distro metadata from bundled catalog.json and distros/*.yaml.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadBundledCatalog = loadBundledCatalog;
exports.loadYamlDistros = loadYamlDistros;
exports.loadCatalog = loadCatalog;
exports.getDistroById = getDistroById;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const BUNDLED_CATALOG = path_1.default.join(__dirname, '..', 'shared', 'catalog.json');
const DISTROS_DIR = path_1.default.join(__dirname, '..', '..', 'distros');
function loadBundledCatalog() {
    try {
        if (fs_1.default.existsSync(BUNDLED_CATALOG)) {
            const data = fs_1.default.readFileSync(BUNDLED_CATALOG, 'utf8');
            return JSON.parse(data);
        }
    }
    catch {
        // ignore
    }
    return {};
}
function loadYamlDistros() {
    const results = {};
    try {
        const files = fs_1.default.readdirSync(DISTROS_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
        for (const file of files) {
            try {
                const content = fs_1.default.readFileSync(path_1.default.join(DISTROS_DIR, file), 'utf8');
                const parsed = parseYaml(content);
                const parsedId = parsed.id;
                if (parsedId) {
                    if (!parsed.desktop && parsed.desktop_environments) {
                        const envs = parsed.desktop_environments;
                        parsed.desktop = Array.isArray(envs) ? envs[0] : typeof envs === 'string' ? envs : undefined;
                    }
                    results[parsedId] = parsed;
                }
            }
            catch {
                // skip invalid yaml
            }
        }
    }
    catch {
        // no distros dir
    }
    return results;
}
function parseYaml(content) {
    const result = {};
    const lines = content.split(/\r?\n/);
    let currentKey = null;
    let currentArray = null;
    let arrayItem = null;
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#'))
            continue;
        const listMatch = line.match(/^-\s+(.+)$/);
        if (listMatch) {
            if (!currentArray) {
                currentArray = [];
                if (currentKey)
                    result[currentKey] = currentArray;
            }
            const raw = listMatch[1].trim();
            const parsed = parseYamlLine(raw);
            arrayItem = Object.keys(parsed).length > 0 ? parsed : raw;
            if (currentArray)
                currentArray.push(arrayItem);
            continue;
        }
        const kvMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)?$/);
        if (kvMatch) {
            currentKey = kvMatch[1];
            currentArray = null;
            const value = (kvMatch[2] || '').trim();
            if (!value) {
                result[currentKey] = null;
            }
            else if (value === '[]') {
                result[currentKey] = [];
            }
            else if (value.startsWith('[') && value.endsWith(']')) {
                const items = value.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
                result[currentKey] = items;
            }
            else if (value === 'true' || value === 'false') {
                result[currentKey] = value === 'true';
            }
            else if (!isNaN(Number(value))) {
                result[currentKey] = Number(value);
            }
            else {
                result[currentKey] = value.replace(/^["']|["']$/g, '');
            }
            continue;
        }
        if (arrayItem && typeof arrayItem === 'object' && line && !line.startsWith('-')) {
            const nestedKv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)?$/);
            if (nestedKv) {
                arrayItem[nestedKv[1]] = nestedKv[2].trim().replace(/^["']|["']$/g, '') || null;
            }
        }
    }
    return result;
}
function parseYamlLine(line) {
    const result = {};
    const parts = line.split(',');
    for (const part of parts) {
        const kv = part.trim().match(/^([a-zA-Z0-9_-]+)=(.*)?$/);
        if (kv) {
            result[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
        }
    }
    return result;
}
function loadCatalog() {
    const bundled = loadBundledCatalog();
    const yamlDistros = loadYamlDistros();
    for (const [id, distro] of Object.entries(yamlDistros)) {
        const name = distro.name || id;
        if (!bundled[name]) {
            bundled[name] = { ...distro, distros: [distro] };
        }
        else {
            const existing = bundled[name];
            if (!existing.distros)
                existing.distros = [];
            const dup = existing.distros.find(d => isDuplicateOf(d, distro));
            if (!dup && !existing.distros.find(d => d.id === distro.id)) {
                existing.distros.push(distro);
            }
        }
    }
    return bundled;
}
function isDuplicateOf(a, b) {
    const aUrl = (a.iso && a.iso.download_url) || a.downloadUrl || a.download_url;
    const bUrl = (b.iso && b.iso.download_url) || b.downloadUrl || b.download_url;
    if (aUrl && bUrl && aUrl === bUrl)
        return true;
    const aFile = (a.iso && a.iso.file_name) || a.fileName || a.file_name;
    const bFile = (b.iso && b.iso.file_name) || b.fileName || b.file_name;
    if (aFile && bFile && aFile === bFile)
        return true;
    const aName = a.name || a.id;
    const bName = b.name || b.id;
    if (aName && bName && aName === bName)
        return true;
    return false;
}
function getDistroById(catalog, distroId) {
    for (const parent of Object.values(catalog)) {
        if (!parent || !parent.distros)
            continue;
        const found = parent.distros.find(d => d.id === distroId);
        if (found)
            return found;
    }
    return null;
}
