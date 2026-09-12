#!/usr/bin/env bash
set -euo pipefail

SRC="${1:-$HOME/uai-build/model-package}"
OUT="${2:-dist}"
PART="${3:-1900M}"
NAME="universe-ai-model"

command -v zstd >/dev/null || { echo "zstd is required (apt install zstd)"; exit 1; }
for f in universe-ai.gguf universe-ai-adapter.gguf Modelfile; do
  [ -f "$SRC/$f" ] || { echo "missing $SRC/$f"; exit 1; }
done
mkdir -p "$OUT"

echo "[1/4] packing (base + adapter + Modelfile) -> $OUT/$NAME.tar.zst"
tar -C "$SRC" -chf - universe-ai.gguf universe-ai-adapter.gguf Modelfile \
  | zstd -19 -T0 -o "$OUT/$NAME.tar.zst" -f

echo "[2/4] sha256"
( cd "$OUT" && sha256sum "$NAME.tar.zst" > "$NAME.tar.zst.sha256" )

echo "[3/4] splitting into $PART parts"
python3 - "$OUT" "$NAME.tar.zst" "$PART" <<'PYEOF'
import os, ctypes, sys

dist, src_name, part_size = sys.argv[1], sys.argv[2], int(sys.argv[3]) * 1024 * 1024
SRC = os.path.join(dist, src_name)
SIZE = os.path.getsize(SRC)
base = os.path.join(dist, src_name + ".part-")
libc = ctypes.CDLL(None)
PUNCH = 0x02 | 0x01
src_fd = os.open(SRC, os.O_RDWR)
offset = 0
idx = 0
while offset < SIZE:
    n = min(part_size, SIZE - offset)
    out = os.open(f"{base}{idx:02d}", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
    rd = os.open(SRC, os.O_RDONLY)
    os.lseek(rd, offset, os.SEEK_SET)
    rem = n
    written = 0
    while rem > 0:
        data = os.read(rd, min(8 << 20, rem))
        if not data:
            break
        os.write(out, data)
        rem -= len(data)
        written += len(data)
        if written >= 256 << 20:
            libc.fallocate(src_fd, PUNCH, offset, written)
    libc.fallocate(src_fd, PUNCH, offset, n)
    os.close(out)
    os.close(rd)
    print(f"  part-{idx:02d}: {n} bytes")
    offset += n
    idx += 1
os.close(src_fd)
print(f"  -> {idx} parts")
PYEOF

echo "[4/4] verify"
cat "$OUT/$NAME.tar.zst.part-"* | sha256sum | cut -d' ' -f1
cut -d' ' -f1 "$OUT/$NAME.tar.zst.sha256"
ls -lh "$OUT" | grep "$NAME"
