import os, shutil, torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

HERE = os.path.dirname(os.path.abspath(__file__))
BLOB = os.path.expanduser("~/.ollama/models/blobs/sha256-85e4a5b7b8ef0e48af0e8658f5aaab9c2324c76c1641493f4d1e25fce54b18b9")
GGUF_DIR = "/tmp/opencode/gguf-work2"
GGUF = os.path.join(GGUF_DIR, "universe-ai.gguf")
ADAPTER = os.path.join(HERE, "out", "adapter")
REPO = "Qwen/Qwen3-4B-Instruct-2507"

out_root = "/run/media/kali/MM"
OUT = os.path.join(out_root, "merged-hf")
if not os.path.isdir(out_root) or len(os.listdir(out_root)) == 0:
    raise SystemExit("MM flash not mounted at " + out_root)
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT, exist_ok=True)

GGUF_DIR2 = "/tmp/opencode/gguf-work2"
os.makedirs(GGUF_DIR2, exist_ok=True)
if not os.path.exists(GGUF):
    shutil.copyfile(BLOB, GGUF)

print("[1/4] loading base GGUF → bf16 RAM…", flush=True)
model = AutoModelForCausalLM.from_pretrained(GGUF_DIR2, gguf_file="universe-ai.gguf", torch_dtype=torch.bfloat16)
shutil.rmtree(GGUF_DIR2, ignore_errors=True)

print("[2/4] applying LoRA adapter…", flush=True)
model = PeftModel.from_pretrained(model, ADAPTER)
print("[3/4] merging…", flush=True)
model = model.merge_and_unload()

print("[4/4] saving merged model to flash (sharded 2GB)…", flush=True)
model.save_pretrained(OUT, safe_serialization=True, max_shard_size="2GB")
tok = AutoTokenizer.from_pretrained(REPO)
tok.save_pretrained(OUT)
print("MERGED →", OUT)
