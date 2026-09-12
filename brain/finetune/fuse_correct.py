import os, sys, shutil, json
import torch
from gguf.constants import GGUFValueType as VTS
from gguf import GGUFWriter
from gguf.constants import GGMLQuantizationType
from gguf.quants import quantize as gquant
from gguf.tensor_mapping import get_tensor_name_map
from gguf.constants import MODEL_ARCH
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

HERE = os.path.dirname(os.path.abspath(__file__))
BLOB = os.path.expanduser("~/.ollama/models/blobs/sha256-85e4a5b7b8ef0e48af0e8658f5aaab9c2324c76c1641493f4d1e25fce54b18b9")
ADAPTER = os.path.join(HERE, "out", "adapter")
REPO = "Qwen/Qwen3-4B-Instruct-2507"
OUT = "/run/media/kali/MM/universe-ai-v2.gguf"

wdir = "'" + os.path.expanduser("~") + "'/gguf-fc"
os.makedirs(wdir, exist_ok=True)
src = os.path.join(wdir, "base.gguf")
if not os.path.exists(src):
    shutil.copyfile(BLOB, src)

print("[1/5] loading base GGUF → bf16 RAM…", flush=True)
model = AutoModelForCausalLM.from_pretrained(wdir, gguf_file="base.gguf", torch_dtype=torch.bfloat16)
os.unlink(src)
assert not any("o_proj" in w for w in []), ""
missing_check = model.state_dict()

print("[2/5] fusing round-1 LoRA…", flush=True)
model = PeftModel.from_pretrained(model, ADAPTER)
model = model.merge_and_unload().to(torch.float32)
cfg = model.config
sd = model.state_dict()
del model
tok = AutoTokenizer.from_pretrained(REPO)

print("[3/5] metadata…", flush=True)
name_map = get_tensor_name_map(MODEL_ARCH.QWEN3, cfg.num_hidden_layers)
OUT_TMP = "'" + os.path.expanduser("~") + "'/universe-ai-v2.gguf"
w = GGUFWriter(OUT_TMP, arch="qwen3")
w.add_key_value("general.name", "universe-ai-v2", __import__('gguf').constants.GGUFValueType.STRING)
w.add_key_value("general.file_type", int(GGMLQuantizationType.Q4_0), __import__('gguf').constants.GGUFValueType.UINT32)
w.add_key_value("general.quantization_version", 2, __import__('gguf').constants.GGUFValueType.UINT32)
w.add_key_value("qwen3.context_length", int(cfg.max_position_embeddings), __import__('gguf').constants.GGUFValueType.UINT32)
w.add_key_value("qwen3.embedding_length", int(cfg.hidden_size), __import__('gguf').constants.GGUFValueType.UINT32)
w.add_key_value("qwen3.block_count", int(cfg.num_hidden_layers), __import__('gguf').constants.GGUFValueType.UINT32)
w.add_key_value("qwen3.feed_forward_length", int(cfg.intermediate_size), __import__('gguf').constants.GGUFValueType.UINT32)
w.add_key_value("qwen3.attention.head_count", int(cfg.num_attention_heads), __import__('gguf').constants.GGUFValueType.UINT32)
w.add_key_value("qwen3.attention.head_count_kv", int(cfg.num_key_value_heads), __import__('gguf').constants.GGUFValueType.UINT32)
w.add_key_value("qwen3.attention.key_length", 128, __import__('gguf').constants.GGUFValueType.UINT32)
w.add_key_value("qwen3.attention.layer_norm_rms_epsilon", float(cfg.rms_norm_eps), __import__('gguf').constants.GGUFValueType.FLOAT32)
w.add_key_value("qwen3.rope.freq_base", float(cfg.rope_theta), __import__('gguf').constants.GGUFValueType.FLOAT32)
w.add_key_value("qwen3.vocab_size", int(cfg.vocab_size), __import__('gguf').constants.GGUFValueType.UINT32)
w.add_add_bos_token(True); w.add_add_eos_token(True)
w.add_key_value("tokenizer.ggml.bos_token_id", int(cfg.bos_token_id), VTS.UINT32)
w.add_key_value("tokenizer.ggml.eos_token_id", int(cfg.eos_token_id), VTS.UINT32)
w.add_tokenizer_model("gpt2"); w.add_string("tokenizer.ggml.pre", "qwen2")
TOKD = "'" + os.path.expanduser("~") + "'/gguf-base"
tj = json.load(open(os.path.join(TOKD, "tokenizer.json")))
tmap = {1:1,2:2,3:3,4:4,5:5,6:6}
NT = 151936
tokens = [None] * NT
types = [1] * NT
for t, i in tj["model"]["vocab"].items(): tokens[i] = t
for _i in range(NT):
    if tokens[_i] is None: tokens[_i] = "<|reserved|>"
for at in tj.get("added_tokens", []):
    tokens[at["id"]] = at["content"]; types[at["id"]] = tmap.get(at.get("type",1),1)
seen = set()
for i in range(NT):
    t = tokens[i]
    if t in seen:
        t = f"{t}.{i}"
        while t in seen: t = t + "x"
        tokens[i] = t
    seen.add(t)
merges = [" ".join(m) if isinstance(m, list) else m for m in tj["model"]["merges"]]
w.add_token_list(tokens); w.add_token_types(types); w.add_token_merges(merges)

print("[4/5] tensors (map-derived names, Q4_0)…", flush=True)
bad = 0
for i, (hf_name, t) in enumerate(sd.items()):
    if i % 60 == 0: print('tensor', i, '/', len(sd), flush=True)
    base = hf_name
    for suf in (".weight", ".bias"):
        if base.endswith(suf):
            base = base[:-len(suf)]
    r = name_map.get_type_and_name(base, try_suffixes=())
    if r is None:
        bad += 1; print('UNMAPPED:', hf_name); continue
    gguf_type, gname = r
    gname += ".bias" if hf_name.endswith(".bias") else ".weight"
    t = t.contiguous()
    if t.dim() < 2:
        w.add_tensor(gname, t.numpy())
    else:
        q = gquant(t.numpy(), GGMLQuantizationType.Q4_0)
        w.add_tensor(gname, q, raw_dtype=GGMLQuantizationType.Q4_0)
print("unmapped:", bad)

print("[5/5] writing…", flush=True)
w.write_header_to_file(); w.write_kv_data_to_file(); w.write_tensors_to_file(progress=True); w.close()
shutil.move(OUT_TMP, OUT)
print("FUSED-V2 →", OUT, f"({os.path.getsize(OUT)/1e9:.2f} GB)")
