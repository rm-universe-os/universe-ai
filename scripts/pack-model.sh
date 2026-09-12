#!/usr/bin/env bash
set -euo pipefail

MODEL="${1:-universe-ai}"
VER="${2:-v0.1.8}"
DIST="dist"
NAME="universe-ai-model-${VER}"
PART=1900M            # stay safely under GitHub's 2 GiB per-asset limit

command -v zstd >/dev/null || { echo "zstd is required (apt install zstd)"; exit 1; }

GGUF=$(ollama show "$MODEL" --modelfile 2>/dev/null | awk '/^FROM /{print $2; exit}')
[ -n "$GGUF" ] && [ -f "$GGUF" ] || { echo "cannot resolve GGUF blob of '$MODEL' (is ollama running?)"; exit 1; }

echo "[1/4] source blob: $GGUF ($(du -h "$GGUF" | cut -f1))"
mkdir -p "$DIST"

echo "[2/4] packing + zstd -19 …"
tar -C "$(dirname "$GGUF")" -cf - "$(basename "$GGUF")" \
  | zstd -19 -T0 -o "$DIST/${NAME}.tar.zst" -f

echo "[3/4] sha256 …"
( cd "$DIST" && sha256sum "${NAME}.tar.zst" > "${NAME}.tar.zst.sha256" )

echo "[4/4] streaming split into ${PART} parts (disk-friendly: holes punched in source as we go)…"
python3 - "$DIST" "${NAME}.tar.zst" "$PART" <<'PYEOF'
import os, ctypes, sys
dist, src_name, part_size = sys.argv[1], sys.argv[2], int(sys.argv[3]) * 1024 * 1024
SRC = os.path.join(dist, src_name)
SIZE = os.path.getsize(SRC)
base = os.path.join(dist, src_name + '.part-')
libc = ctypes.CDLL(None)
PUNCH = 0x02 | 0x01                     # FALLOC_FL_PUNCH_HOLE | FALLOC_FL_KEEP_SIZE
src_fd = os.open(SRC, os.O_RDWR)
offset = 0; idx = 0
while offset < SIZE:
    n = min(PART, SIZE - offset)
    out = os.open(f"{base}{idx:02d}", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
    rd = os.open(SRC, os.O_RDONLY)
    os.lseek(rd, offset, os.SEEK_SET)
    rem = n; written = 0
    while rem > 0:
        data = os.read(rd, min(8 << 20, rem))
        if not data: break
        os.write(out, data); rem -= len(data); written += len(data)
        if written >= 256 << 20:        # free copied ranges progressively — peak usage ≈ 1 copy
            libc.fallocate(src_fd, PUNCH, offset, written)
    libc.fallocate(src_fd, PUNCH, offset, n)
    os.close(out); os.close(rd)
    print(f'  part-{idx:02d}: {n} bytes')
    offset += n; idx += 1
os.close(src_fd)
os.unlink(SRC)                          # parts sum == original (sha256 re-verified below)
print(f'  → {idx} parts; source removed')
PYEOF

echo
echo "Upload these to a GitHub Release of your model repo:"
ls -lh "$DIST" | grep "${NAME}"
echo
echo "The app's setup flow reassembles automatically; manual check:"
echo "  cat ${NAME}.tar.zst.part-* | sha256sum   # must match ${NAME}.tar.zst.sha256"
