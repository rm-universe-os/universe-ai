import os, sys, shutil, json, struct
import numpy as np
import torch
from gguf import GGUFWriter
from gguf.constants import GGMLQuantizationType, GGUFValueType as MVT
from transformers import AutoModelForCausalLM, AutoTokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
BLOB = os.path.expanduser("~/.ollama/models/blobs/sha256-85e4a5b7b8ef0e48af0e8658f5aaab9c2324c76c1641493f4d1e25fce54b18b9")
GGUF_DIR = "/tmp/opencode/gguf-fuse"
ADAPTER = os.path.join(HERE, "out", "adapter")
REPO = "Qwen/Qwen3-4B-Instruct-2507"
FLASH = sys.argv[1] if len(sys.argv) > 1 else "/run/media/kali/MM"
OUT_Q8 = os.path.join(FLASH, "universe-ai-fused-q4_0.gguf")

GGUF_DIR2 = os.path.expanduser("~")
os.makedirs(GGUF_DIR2, exist_ok=True)

print("[1/5] loading base GGUF → bf16 RAM…", flush=True)
model = AutoModelForCausalLM.from_pretrained(GGUF_DIR2, gguf_file="universe-ai.gguf", torch_dtype=torch.bfloat16)

print("[2/5] fusing LoRA into weights…", flush=True)
from peft import PeftModel
model = PeftModel.from_pretrained(model, ADAPTER)
model = model.merge_and_unload()
sd = model.state_dict()
cfg = model.config

print("[3/5] writing GGUF q8_0 (streaming to flash)…", flush=True)
w = GGUFWriter(OUT_Q8, arch="qwen3")
def add(key, val, vt=None):
    w.add_key_value(key, val, vt or (MVT.STRING if isinstance(val, str) else MVT.UINT32))

add("general.name", "universe-ai-ft-fused")
add("general.file_type", int(GGMLQuantizationType.Q4_0))
add("general.quantization_version", 2)
add("qwen3.context_length", cfg.max_position_embeddings)
add("qwen3.embedding_length", cfg.hidden_size)
add("qwen3.block_count", cfg.num_hidden_layers)
add("qwen3.feed_forward_length", cfg.intermediate_size)
add("qwen3.attention.head_count", cfg.num_attention_heads)
add("qwen3.attention.head_count_kv", cfg.num_key_value_heads)
add("qwen3.attention.layer_norm_rms_epsilon", float(cfg.rms_norm_eps), MVT.FLOAT32)
add("qwen3.attention.key_length", getattr(cfg, "head_dim", cfg.hidden_size // cfg.num_attention_heads))
add("qwen3.rope.freq_base", float(cfg.rope_theta), MVT.FLOAT32)
add("qwen3.vocab_size", cfg.vocab_size)
for tok_id, key in ((cfg.bos_token_id, "bos"), (cfg.eos_token_id, "eos")):
    if tok_id is not None:
        add(f"tokenizer.ggml.{key}_token_id", tok_id)
w.add_add_bos_token(True)
w.add_add_eos_token(True)

tok = AutoTokenizer.from_pretrained(REPO)
vocab_items = sorted(tok.get_vocab().items(), key=lambda kv: kv[1])
w.add_token_list([t for t, _ in vocab_items])


w.add_tokenizer_model("gpt2")
w.add_string("tokenizer.ggml.pre", "qwen2")

def qt(name, t):
    if "norm" in name or t.dim() < 2:
        w.add_tensor(name, t.contiguous().float().numpy())
        return
    t = t.contiguous().float()
    if t.dim() == 2 and t.shape[1] % 32 == 0 and "embedding" not in name and "norm" not in name and "output.weight" not in name:
        q = np.ascontiguousarray(t.numpy())
        from gguf.quants import quantize as _q
        qd = _q(q, GGMLQuantizationType.Q4_0)
        w.add_tensor(name, qd, raw_dtype=GGMLQuantizationType.Q4_0)
    else:
        w.add_tensor(name, t.numpy())

n = 0
for name, tensor in sd.items():
    n += 1
    if n % 40 == 0: print(f"   tensor {n}/{len(sd)}", flush=True)
    qt(name, tensor)
w.write_header_to_file()
w.write_kv_data_to_file()
w.write_tensors_to_file(progress=True)
w.close()
print("Q8 GGUF →", OUT_Q8, f"({os.path.getsize(OUT_Q8)/1e9:.2f} GB)", flush=True)
os.unlink("'" + os.path.expanduser("~") + "'/universe-ai.gguf")
