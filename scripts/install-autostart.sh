#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTOSTART="$HOME/.config/autostart"
mkdir -p "$AUTOSTART"

cat > "$AUTOSTART/universe-ai.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Universe AI
Comment=Resident 3D black-hole agent of Universe OS
Exec=$DIR/scripts/run.sh
Icon=$DIR/assets/logo.png
Terminal=false
X-GNOME-Autostart-enabled=true
StartupWMClass=universe-ai
EOF

echo "[universe-ai] autostart installed: $AUTOSTART/universe-ai.desktop"
