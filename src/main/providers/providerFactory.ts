/* src/main/providers/providerFactory.ts
 * Creates the appropriate IsoProvider from a distro catalog entry.
 */

import { StaticProvider, GitHubReleaseProvider, OfficialApiProvider, OfficialDirectoryProvider } from '../isoProvider'

export function createProvider (distro: Record<string, unknown>): StaticProvider | GitHubReleaseProvider | OfficialApiProvider | OfficialDirectoryProvider {
  const d = distro as any
  const providerType = d.iso_provider
  if (providerType === 'github-release') {
    return new GitHubReleaseProvider({
      name: d.name,
      repo: d.github_repo,
      arch: d.architectures && d.architectures[0]
    })
  }
  if (providerType === 'official-api') {
    return new OfficialApiProvider({
      name: d.name,
      apiUrl: d.api_url,
      arch: d.architectures && d.architectures[0]
    })
  }
  if (providerType === 'official-directory') {
    return new OfficialDirectoryProvider({
      name: d.name,
      baseUrl: d.base_url,
      arch: d.architectures && d.architectures[0],
      checksumPattern: d.checksum_provider ? new RegExp(d.checksum_provider) : null
    })
  }

  const iso = d.iso || {
    downloadUrl: d.downloadUrl || d.download_url,
    size: d.size,
    sha256: d.sha256,
    releaseDate: d.releaseDate || d.release_date
  }

  return new StaticProvider({
    name: d.name,
    version: d.version,
    arch: d.architectures && d.architectures[0],
    iso,
    officialWebsite: d.official_website
  })
}
