import os, sys, shutil, json
import numpy as np
import torch
import gguf
from gguf import GGUFReader, GGUFWriter
from gguf.constants import GGMLQuantizationType
from gguf.quants import quantize as gquant
from gguf.tensor_mapping import get_tensor_name_map
from gguf.constants import MODEL_ARCH, GGUFValueType as VTS
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

HERE = os.path.dirname(os.path.abspath(__file__))
BLOB = os.path.expanduser("~/.ollama/models/blobs/sha256-85e4a5b7b8ef0e48af0e8658f5aaab9c2324c76c1641493f4d1e25fce54b18b9")
ADAPTERS = [os.path.join(HERE, "out", "adapter")]
REPO = "Qwen/Qwen3-4B-Instruct-2507"
OUT_LOCAL = "'" + os.path.expanduser("~") + "'/universe-ai-v3.gguf"

import gguf.gguf_reader as rrmod
_orig_push = rrmod.GGUFReader._push_field
def _tol(self, field, skip_sum=False):
    try: return _orig_push(self, field, skip_sum)
    except KeyError: pass
rrmod.GGUFReader._push_field = _tol

print("[1/6] reading base blob structure…", flush=True)
reader = GGUFReader(BLOB)
base_tensors = {t.name: t for t in reader.tensors}
print("   base tensors:", len(base_tensors), flush=True)

print("[2/6] loading base → bf16 RAM…", flush=True)
wdir = "'" + os.path.expanduser("~") + "'/gguf-fc3"
os.makedirs(wdir, exist_ok=True)
src = os.path.join(wdir, "base.gguf")
if not os.path.exists(src):
    shutil.copyfile(BLOB, src)
model = AutoModelForCausalLM.from_pretrained(wdir, gguf_file="base.gguf", torch_dtype=torch.bfloat16)
os.unlink(src)

for ad in ADAPTERS:
    if not os.path.isdir(ad): print("   adapter missing:", ad); continue
    print("[3/6] fusing adapter…", flush=True)
    model = PeftModel.from_pretrained(model, ad)
    model = model.merge_and_unload()
model = model.to(torch.float32)
cfg = model.config
sd = model.state_dict()
del model
tok = AutoTokenizer.from_pretrained(REPO)

print("[4/6] building GGUF…", flush=True)
name_map = get_tensor_name_map(MODEL_ARCH.QWEN3, cfg.num_hidden_layers)
OUT = OUT_LOCAL
w = GGUFWriter(OUT, arch="qwen3")
seen_kv = set()
for k, f in reader.fields.items():
    if k in seen_kv: continue
    seen_kv.add(k)
    vt = VTS(f.types[0])
    try:
        if vt == VTS.STRING:
            w.add_key_value(k, bytes(f.parts[-1]).decode('utf-8','replace'), vt)
        elif vt == VTS.ARRAY:
            sub = f.types[-1]
            if sub == VTS.STRING:
                w.add_key_value(k, [bytes(f.parts[i]).decode('utf-8','replace') for i in f.data], vt)
            else:
                w.add_key_value(k, [int(x) for x in f.parts[-1].tolist()], vt)
        else:
            v = f.parts[-1].tolist()
            w.add_key_value(k, v[0] if isinstance(v, list) and len(v) == 1 else v, vt)
    except Exception as e:
        print('kv-skip', k, e)

print("[5/6] fused tensors (base layout)…", flush=True)
bad = 0; total = len(base_tensors)
for bi, (bname, bt) in enumerate(base_tensors.items()):
    if bi % 60 == 0: print(f'   tensor {bi}/{total}', flush=True)
    np_base = bt.data
    if bt.tensor_type not in (GGMLQuantizationType.F32, GGMLQuantizationType.F16, GGMLQuantizationType.BF16):
        base_logical = gguf.dequantize(np_base, bt.tensor_type)
    else:
        base_logical = np_base
    if base_logical.ndim < 2:
        hf_key = None
        import re
        m = re.match(r'^blk\.(\d+)\.attn_norm', bname)
        if m: hf_key = f'model.layers.{m.group(1)}.input_layernorm.weight'
        m = re.match(r'^blk\.(\d+)\.ffn_norm', bname)
        if m: hf_key = f'model.layers.{m.group(1)}.post_attention_layernorm.weight'
        if bname == 'output_norm.weight': hf_key = 'model.norm.weight'
        if hf_key and hf_key in sd:
            w.add_tensor(bname, sd[hf_key].contiguous().float().numpy())
        else:
            w.add_tensor(bname, np_base.copy())
        continue
    ne = (base_logical.shape[1], base_logical.shape[0])
    btype = bt.tensor_type
    import re as _re
    stem = bname
    for suf in ('.weight', '.bias'):
        if stem.endswith(suf): stem = stem[:-len(suf)]
    hf = None
    m2 = _re.match(r'^blk\.(\d+)\.attn_q$', stem)
    if m2: hf = f'model.layers.{m2.group(1)}.self_attn.q_proj'
    m2 = _re.match(r'^blk\.(\d+)\.attn_k$', stem)
    if m2: hf = f'model.layers.{m2.group(1)}.self_attn.k_proj'
    m2 = _re.match(r'^blk\.(\d+)\.attn_v$', stem)
    if m2: hf = f'model.layers.{m2.group(1)}.self_attn.v_proj'
    m2 = _re.match(r'^blk\.(\d+)\.attn_output$', stem)
    if m2: hf = f'model.layers.{m2.group(1)}.self_attn.o_proj'
    m2 = _re.match(r'^blk\.(\d+)\.attn_q_norm$', stem)
    if m2: hf = f'model.layers.{m2.group(1)}.self_attn.q_norm'
    m2 = _re.match(r'^blk\.(\d+)\.attn_k_norm$', stem)
    if m2: hf = f'model.layers.{m2.group(1)}.self_attn.k_norm'
    m2 = _re.match(r'^blk\.(\d+)\.ffn_gate$', stem)
    if m2: hf = f'model.layers.{m2.group(1)}.mlp.gate_proj'
    m2 = _re.match(r'^blk\.(\d+)\.ffn_up$', stem)
    if m2: hf = f'model.layers.{m2.group(1)}.mlp.up_proj'
    m2 = _re.match(r'^blk\.(\d+)\.ffn_down$', stem)
    if m2: hf = f'model.layers.{m2.group(1)}.mlp.down_proj'
    m2 = _re.match(r'^blk\.(\d+)\.attn_norm$', stem)
    if m2: hf = f'model.layers.{m2.group(1)}.input_layernorm'
    m2 = _re.match(r'^blk\.(\d+)\.ffn_norm$', stem)
    if m2: hf = f'model.layers.{m2.group(1)}.post_attention_layernorm'
    if bname == 'output_norm.weight': hf = 'model.norm'
    if bname == 'token_embd.weight': hf = 'model.embed_tokens'
    if bname == 'output.weight': hf = 'lm_head'
    if hf is None:
        bad += 1
        if bad < 6: print('   UNMAPPED', bname)
        continue
    ggname = hf + '.weight'
    if ggname not in sd:
        bad += 1
        if bad < 8: print('   NOT-IN-SD', ggname)
        continue
    t = sd[ggname].contiguous().float()
    my_ne = (t.shape[1], t.shape[0])
    if tuple(my_ne) != tuple(ne):
        bad += 1
        if bad < 8: print(f'   SHAPE {ggname}: mine {my_ne} base {ne}')
        continue
    rows = t.numpy().reshape(ne[1], ne[0])
    if btype == GGMLQuantizationType.F32:
        w.add_tensor(bname, rows, raw_dtype=btype)
    elif btype == GGMLQuantizationType.F16:
        w.add_tensor(bname, rows.astype(np.float16), raw_dtype=btype)
    elif btype == GGMLQuantizationType.BF16:
        w.add_tensor(bname, rows.astype(torch.bfloat16).view(torch.uint8).numpy().reshape(ne[1], -1), raw_dtype=btype)
    else:
        w.add_tensor(bname, gquant(rows, btype), raw_dtype=btype)
print("   problems:", bad)

print("[6/6] writing…", flush=True)
w.write_header_to_file(); w.write_kv_data_to_file(); w.write_tensors_to_file(progress=True); w.close()
print("FUSED-V3 →", OUT, f"({os.path.getsize(OUT)/1e9:.2f} GB)")
