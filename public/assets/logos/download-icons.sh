#!/bin/bash
# Download distro logos from simpleicons or official sources

BASE_URL="https://cdn.simpleicons.org"
# Map of distro names to simpleicons slugs
declare -A ICONS=(
  ["ubuntu"]="ubuntu"
  ["kubuntu"]="kubuntu"
  ["xubuntu"]="xubuntu"
  ["fedora"]="fedora"
  ["fedora-kde"]="fedora"
  ["linuxmint"]="linuxmint"
  ["mint-cinnamon"]="linuxmint"
  ["mint-xfce"]="linuxmint"
  ["debian"]="debian"
  ["arch"]="archlinux"
  ["kali"]="kalilinux"
  ["manjaro"]="manjaro"
  ["endeavouros"]="endeavouros"
  ["opensuse"]="opensuse"
  ["nixos"]="nixos"
  ["alpine"]="alpinelinux"
  ["popos"]="popos"
  ["zorin"]="zorinos"
  ["nobara"]="nobara"
  ["bazzite"]="bazzite"
  ["rocky"]="rockylinux"
  ["almalinux"]="almalinux"
  ["centos"]="centos"
  ["gentoo"]="gentoo"
  ["parrot"]="parrotos"
  ["tails"]="tails"
  ["qubes"]="qubesos"
  ["solus"]="solus"
  ["mageia"]="mageia"
  ["void"]="voidlinux"
)

for icon in "${!ICONS[@]}"; do
  slug="${ICONS[$icon]}"
  url="${BASE_URL}/${slug}/currentColor"
  echo "Downloading $icon from $url"
  curl -fsSL "$url" -o "${icon}.svg" || echo "Failed: $icon"
done

# Create simple placeholders for icons that failed
for icon in "${!ICONS[@]}"; do
  if [ ! -s "${icon}.svg" ]; then
    echo "Creating placeholder for $icon"
    cat > "${icon}.svg" << SVGEOF
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#333" rx="10"/>
  <text x="50" y="55" font-family="sans-serif" font-size="14" fill="white" text-anchor="middle">${icon}</text>
</svg>
SVGEOF
  fi
done

echo "Done"
