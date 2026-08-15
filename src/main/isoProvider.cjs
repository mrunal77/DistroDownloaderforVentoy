"use strict";
/* src/main/isoProvider.ts
 * Abstraction for resolving latest ISO information from various sources.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MirrorProvider = exports.OfficialDirectoryProvider = exports.GitHubReleaseProvider = exports.OfficialApiProvider = exports.StaticProvider = exports.IsoProvider = void 0;
exports.extractVersionFromName = extractVersionFromName;
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
class IsoProvider {
    constructor(config = {}) {
        this.config = config;
    }
    async getLatestRelease() {
        throw new Error('getLatestRelease not implemented');
    }
    async getIso(_release) {
        return _release;
    }
    async getChecksum(_release) {
        return null;
    }
    async getSignature(_release) {
        return null;
    }
    async verifyChecksum(filePath, expectedChecksum, algorithm = 'sha256') {
        if (!expectedChecksum || !filePath)
            return null;
        try {
            const hash = crypto_1.default.createHash(algorithm);
            const fd = await fs_1.default.promises.open(filePath, 'r');
            const chunkSize = 4 * 1024 * 1024;
            let offset = 0;
            const { size } = await fd.stat();
            while (offset < size) {
                const { buffer } = await fd.read({ buffer: Buffer.alloc(chunkSize), offset, length: chunkSize });
                hash.update(buffer.slice(0, buffer.length));
                offset += buffer.length;
            }
            await fd.close();
            const actual = hash.digest('hex').toLowerCase();
            return actual === expectedChecksum.toLowerCase();
        }
        catch {
            return null;
        }
    }
}
exports.IsoProvider = IsoProvider;
class StaticProvider extends IsoProvider {
    constructor(config = {}) {
        super(config);
        this.iso = config.iso || null;
    }
    async getLatestRelease() {
        if (!this.iso)
            throw new Error('Static provider missing iso config');
        const downloadUrl = this.iso.downloadUrl || this.iso.download_url || '';
        const isoName = this.iso.fileName || this.iso.file_name || path_1.default.basename(downloadUrl);
        return {
            distro: this.config.name || 'Unknown',
            version: this.config.version || 'latest',
            architecture: this.config.arch || 'x86_64',
            iso_name: isoName,
            download_url: downloadUrl,
            size: this.iso.size || null,
            sha256: this.iso.sha256 || null,
            release_date: this.iso.releaseDate || this.iso.release_date || null,
            source: 'static',
            official_website: this.config.officialWebsite || null
        };
    }
}
exports.StaticProvider = StaticProvider;
class OfficialApiProvider extends IsoProvider {
    constructor(config = {}) {
        super(config);
        this.apiUrl = config.apiUrl;
        this.transform = config.transform || ((r) => r);
    }
    async getLatestRelease() {
        if (!this.apiUrl)
            throw new Error('OfficialApiProvider missing apiUrl');
        const data = await fetchJson(this.apiUrl);
        const transformed = this.transform(data);
        return {
            distro: this.config.name || transformed.name || 'Unknown',
            version: transformed.version || 'latest',
            architecture: transformed.arch || 'x86_64',
            iso_name: path_1.default.basename(transformed.downloadUrl || ''),
            download_url: transformed.downloadUrl,
            size: transformed.size || null,
            sha256: transformed.sha256 || null,
            release_date: transformed.releaseDate || null,
            source: 'official-api',
            official_website: this.config.officialWebsite || transformed.officialWebsite || null
        };
    }
}
exports.OfficialApiProvider = OfficialApiProvider;
class GitHubReleaseProvider extends IsoProvider {
    constructor(config = {}) {
        super(config);
        this.repo = config.repo;
        this.assetPattern = config.assetPattern || /\.iso$/i;
        this.archFilter = config.archFilter || null;
    }
    async getLatestRelease() {
        if (!this.repo)
            throw new Error('GitHubReleaseProvider missing repo');
        const url = `https://api.github.com/repos/${this.repo}/releases/latest`;
        const data = await fetchJson(url);
        const assets = (data?.assets || []).filter(a => this.assetPattern.test(a.name));
        let asset = assets[0];
        if (this.archFilter && assets.length > 1) {
            const archFilter = this.archFilter;
            asset = assets.find(a => archFilter.test(a.name)) || assets[0];
        }
        if (!asset)
            throw new Error('No matching ISO asset found in latest release');
        return {
            distro: this.config.name || data.name || 'Unknown',
            version: data.tag_name || data.name || 'latest',
            architecture: this.config.arch || 'x86_64',
            iso_name: asset.name,
            download_url: asset.browser_download_url,
            size: asset.size || null,
            sha256: null,
            release_date: data.published_at || null,
            source: 'github-release',
            official_website: this.config.officialWebsite || `https://github.com/${this.repo}`
        };
    }
}
exports.GitHubReleaseProvider = GitHubReleaseProvider;
class OfficialDirectoryProvider extends IsoProvider {
    constructor(config = {}) {
        super(config);
        this.baseUrl = config.baseUrl;
        this.pattern = config.pattern || /\.iso$/i;
        this.checksumPattern = config.checksumPattern || null;
        this.archFilter = config.archFilter || null;
    }
    async getLatestRelease() {
        if (!this.baseUrl)
            throw new Error('OfficialDirectoryProvider missing baseUrl');
        const html = await fetchText(this.baseUrl);
        const urls = extractIsoUrls(html, this.baseUrl);
        const archFilter = this.archFilter;
        const filtered = archFilter ? urls.filter(u => archFilter.test(u)) : urls;
        if (filtered.length === 0)
            throw new Error('No ISOs found in directory listing');
        const latest = filtered[filtered.length - 1];
        const isoName = path_1.default.basename(latest);
        const checksum = await this.findChecksum(html, isoName, latest);
        return {
            distro: this.config.name || 'Unknown',
            version: extractVersionFromName(isoName) || 'latest',
            architecture: this.config.arch || 'x86_64',
            iso_name: isoName,
            download_url: latest,
            size: null,
            sha256: checksum,
            release_date: null,
            source: 'official-directory',
            official_website: this.config.officialWebsite || this.baseUrl
        };
    }
    async findChecksum(html, isoName, isoUrl) {
        if (!this.checksumPattern)
            return null;
        const matches = html.match(this.checksumPattern);
        if (!matches || matches.length < 2)
            return null;
        const checksumUrl = new URL(matches[1], isoUrl).href;
        try {
            const text = await fetchText(checksumUrl);
            const lines = text.split(/\r?\n/);
            for (const line of lines) {
                if (line.includes(isoName)) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 1)
                        return parts[0].toLowerCase();
                }
            }
        }
        catch {
            // ignore checksum fetch failure
        }
        return null;
    }
}
exports.OfficialDirectoryProvider = OfficialDirectoryProvider;
class MirrorProvider extends IsoProvider {
    constructor(config = {}) {
        super(config);
        this.mirrors = config.mirrors || [];
        this.select = config.select || ((items) => items[0]);
    }
    async getLatestRelease() {
        if (this.mirrors.length === 0)
            throw new Error('MirrorProvider missing mirrors');
        const results = [];
        for (const mirror of this.mirrors) {
            try {
                const provider = mirror.providerType === 'github'
                    ? new GitHubReleaseProvider(mirror)
                    : mirror.providerType === 'official-api'
                        ? new OfficialApiProvider(mirror)
                        : new OfficialDirectoryProvider(mirror);
                const release = await provider.getLatestRelease();
                results.push(release);
            }
            catch {
                // continue to next mirror
            }
        }
        if (results.length === 0)
            throw new Error('All mirrors failed');
        const selected = this.select(results);
        return { ...selected, source: 'mirror' };
    }
}
exports.MirrorProvider = MirrorProvider;
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https_1.default : http_1.default;
        const req = client.get(url, { timeout: 30000, headers: { 'User-Agent': 'VentoyLinuxDistroDownloader/0.3.0' } }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchJson(res.headers.location).then(resolve, reject);
                return;
            }
            if (res.statusCode && res.statusCode >= 400) {
                reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                return;
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
                }
                catch {
                    reject(new Error('Failed to parse JSON'));
                }
            });
            res.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timeout for ${url}`));
        });
    });
}
function fetchText(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https_1.default : http_1.default;
        const req = client.get(url, { timeout: 30000, headers: { 'User-Agent': 'VentoyLinuxDistroDownloader/0.3.0' } }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchText(res.headers.location).then(resolve, reject);
                return;
            }
            if (res.statusCode && res.statusCode >= 400) {
                reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                return;
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timeout for ${url}`));
        });
    });
}
function extractIsoUrls(html, baseUrl) {
    const urls = new Set();
    const hrefRegex = /href\s*=\s*["']([^"']+\.iso(?:\?[^"']*)?)["']/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
        let url = match[1];
        if (url.startsWith('./'))
            url = url.slice(2);
        if (!url.startsWith('http')) {
            url = new URL(url, baseUrl).href;
        }
        urls.add(url);
    }
    return Array.from(urls).sort();
}
function extractVersionFromName(name) {
    const m = name.match(/(\d+\.\d+(?:\.\d+)?)/);
    return m ? m[1] : null;
}
