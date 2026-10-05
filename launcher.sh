#!/bin/bash
cd /opt/universe-ai
E=node_modules/electron/dist/electron
LDCONFIG="$(command -v ldconfig || true)"
for cand in /sbin/ldconfig /usr/sbin/ldconfig /usr/bin/ldconfig; do
  [ -n "$LDCONFIG" ] && break
  [ -x "$cand" ] && LDCONFIG="$cand"
done
MISSING=""
if [ -n "$LDCONFIG" ]; then
  LIBS="$("$LDCONFIG" -p 2>/dev/null)"
  for lib in libnss3.so libgtk-3.so.0 libgbm.so.1 libasound.so.2; do
    printf '%s' "$LIBS" | grep -q "$lib" || MISSING="$MISSING $lib"
  done
fi
if [ -n "$MISSING" ]; then
  echo "Universe AI: missing system libraries:$MISSING"
  echo "Install them with: sudo apt install libnss3 libgtk-3-0 libgbm1 libasound2"
  notify-send "Universe AI" "Missing libraries:$MISSING - see terminal" 2>/dev/null || true
  exit 1
fi
exec "$E" . --no-sandbox
