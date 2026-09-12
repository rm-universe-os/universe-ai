#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ICON_SRC="$DIR/assets/logo.png"
ICON_DST="$HOME/.local/share/icons/hicolor/512x512/apps/universe-ai.png"
DESKTOP_DIR="$HOME/.local/share/applications"
DESKTOP_FILE="$DESKTOP_DIR/universe-ai.desktop"
EXEC="$DIR/scripts/run.sh"

[ -f "$ICON_SRC" ] || { echo "missing $ICON_SRC — run the app once with UAI_LOGO=$ICON_SRC to capture it" >&2; exit 1; }

mkdir -p "$(dirname "$ICON_DST")" "$DESKTOP_DIR"
cp "$ICON_SRC" "$ICON_DST"

case "$EXEC" in *['\"$']*|*[\ \;]*) echo "refusing install: path contains desktop-unsafe characters: $EXEC"; exit 1;; esac

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Universe AI
Comment=Resident 3D black-hole agent of Universe OS
Exec="$EXEC"
Icon=$ICON_DST
Terminal=false
Categories=Utility;System;
StartupWMClass=universe-ai
X-GNOME-UsesNotifications=false
EOF

update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || true

echo "[universe-ai] installed: $ICON_DST"
echo "[universe-ai] installed: $DESKTOP_FILE (StartupWMClass=universe-ai)"
