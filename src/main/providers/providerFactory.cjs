"use strict";
/* src/main/providers/providerFactory.ts
 * Creates the appropriate IsoProvider from a distro catalog entry.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProvider = createProvider;
const isoProvider_1 = require("../isoProvider.cjs");
function createProvider(distro) {
    const d = distro;
    const providerType = d.iso_provider;
    if (providerType === 'github-release') {
        return new isoProvider_1.GitHubReleaseProvider({
            name: d.name,
            repo: d.github_repo,
            arch: d.architectures && d.architectures[0]
        });
    }
    if (providerType === 'official-api') {
        return new isoProvider_1.OfficialApiProvider({
            name: d.name,
            apiUrl: d.api_url,
            arch: d.architectures && d.architectures[0]
        });
    }
    if (providerType === 'official-directory') {
        return new isoProvider_1.OfficialDirectoryProvider({
            name: d.name,
            baseUrl: d.base_url,
            arch: d.architectures && d.architectures[0],
            checksumPattern: d.checksum_provider ? new RegExp(d.checksum_provider) : null
        });
    }
    const iso = d.iso || {
        downloadUrl: d.downloadUrl || d.download_url,
        size: d.size,
        sha256: d.sha256,
        releaseDate: d.releaseDate || d.release_date
    };
    return new isoProvider_1.StaticProvider({
        name: d.name,
        version: d.version,
        arch: d.architectures && d.architectures[0],
        iso,
        officialWebsite: d.official_website
    });
}
