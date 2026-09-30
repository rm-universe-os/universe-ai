import os, sys, shutil, json
import torch
from gguf import GGUFWriter
from gguf.constants import GGMLQuantizationType
from gguf.quants import quantize as gquant
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

HERE = os.path.dirname(os.path.abspath(__file__))
BLOB = os.path.expanduser("~/.ollama/models/blobs/sha256-85e4a5b7b8ef0e48af0e8658f5aaab9c2324c76c1641493f4d1e25fce54b18b9")
ADAPTER = os.path.join(HERE, "out", "adapter")
REPO = "Qwen/Qwen3-4B-Instruct-2507"
FLASH = sys.argv[1] if len(sys.argv) > 1 else "/run/media/kali/MM"
OUT = os.path.join(FLASH, "universe-ai-fused-final.gguf")

wdir = "'" + os.path.expanduser("~") + "'/gguf-fuse-tmp"
os.makedirs(wdir, exist_ok=True)
src = os.path.join(wdir, "base.gguf")
if not os.path.exists(src):
    shutil.copyfile(BLOB, src)

print("[1/5] loading…", flush=True)
model = AutoModelForCausalLM.from_pretrained(wdir, gguf_file="base.gguf", torch_dtype=torch.bfloat16)
os.unlink(src)
print("[2/5] fusing…", flush=True)
model = PeftModel.from_pretrained(model, ADAPTER)
model = model.merge_and_unload().to(torch.float32)
cfg = model.config
sd = model.state_dict()
del model
tok = AutoTokenizer.from_pretrained(REPO)

print("[3/5] building GGUF metadata…", flush=True)
import gguf.gguf_reader as rrmod
w = GGUFWriter(OUT, arch="qwen3")
w.add_key_value("general.name", "universe-ai-ft-fused")
w.add_key_value("general.file_type", int(GGMLQuantizationType.Q4_0))
w.add_key_value("general.quantization_version", 2)
w.add_key_value("qwen3.context_length", int(cfg.max_position_embeddings))
w.add_key_value("qwen3.embedding_length", int(cfg.hidden_size))
w.add_key_value("qwen3.block_count", int(cfg.num_hidden_layers))
w.add_key_value("qwen3.feed_forward_length", int(cfg.intermediate_size))
w.add_key_value("qwen3.attention.head_count", int(cfg.num_attention_heads))
w.add_key_value("qwen3.attention.head_count_kv", int(cfg.num_key_value_heads))
w.add_key_value("qwen3.attention.layer_norm_rms_epsilon", float(cfg.rms_norm_eps))
w.add_key_value("qwen3.attention.key_length", 128)
w.add_key_value("qwen3.rope.freq_base", float(cfg.rope_theta))
w.add_key_value("qwen3.vocab_size", int(cfg.vocab_size))
w.add_token_bos(int(cfg.bos_token_id)); w.add_token_eos(int(cfg.eos_token_id))
w.add_tokenizer_model("gpt2"); w.add_string("tokenizer.ggml.pre", "qwen2")
tj = json.load(open(tok.vocab_files_names.get("vocab_file") or os.path.join(
    os.path.dirname(tok.vocab_files_names.get("vocab_file", "")) or "", "tokenizer.json")))
vocab = dict(tj["model"]["vocab"])
tmap = {1:1,2:2,3:3,4:4,5:5,6:6}
NT = 151936
tokens = ["<|reserved|>"] * NT
types = [1] * NT
for t, i in vocab.items(): tokens[i] = t
for at in tj.get("added_tokens", []):
    tokens[at["id"]] = at["content"]; types[at["id"]] = tmap.get(at.get("type",1),1)
merges = [" ".join(m) if isinstance(m, list) else m for m in tj["model"]["merges"]]
w.add_token_list(tokens); w.add_token_types(types); w.add_token_merges(merges)

print("[4/5] renaming + quantizing tensors (Q4_0)…", flush=True)
def map_name(n):
    n = n.replace("model.", "")
    import re
    n = re.sub(r"^layers\.(\d+)\.", r"blk.\1.", n)
    n = n.replace("self_attn.q_proj", "attn_q").replace("self_attn.k_proj", "attn_k")
    n = n.replace("self_attn.v_proj", "attn_v").replace("self_attn.o_proj", "attn_o")
    n = n.replace("self_attn.q_norm", "attn_q_norm").replace("self_attn.k_norm", "attn_k_norm")
    n = n.replace("mlp.gate_proj", "ffn_gate").replace("mlp.up_proj", "ffn_up").replace("mlp.down_proj", "ffn_down")
    n = n.replace("input_layernorm", "attn_norm").replace("post_attention_layernorm", "ffn_norm")
    n = n.replace("norm.weight", "output_norm.weight") if n == "norm.weight" else n
    n = n.replace("embed_tokens", "token_embd").replace("lm_head", "output")
    return n
for name, t in sd.items():
    t = t.contiguous()
    if t.dim() < 2 or "norm" in name:
        w.add_tensor(map_name(name), t.float().numpy())
    else:
        q = gquant(t.numpy(), GGMLQuantizationType.Q4_0)
        w.add_tensor(map_name(name), q, raw_dtype=GGMLQuantizationType.Q4_0)

print("[5/5] writing…", flush=True)
w.write_header_to_file(); w.write_kv_data_to_file(); w.write_tensors_to_file(progress=True); w.close()
print("FUSED →", OUT, f"({os.path.getsize(OUT)/1e9:.2f} GB)")
