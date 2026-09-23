import os, shutil, time, json, random, torch
import numpy as np
import gguf.gguf_reader as _rr

_orig_push = _rr.GGUFReader._push_field

def _tolerant(self, field, skip_sum=False):
    try:
        return _orig_push(self, field, skip_sum)
    except KeyError:
        pass

_rr.GGUFReader._push_field = _tolerant

from datasets import Dataset
from transformers import AutoConfig, AutoModelForCausalLM, AutoTokenizer
from transformers.modeling_gguf_pytorch_utils import load_gguf_checkpoint, get_gguf_hf_weights_map
from gguf import GGUFReader, dequantize
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer, SFTConfig

HERE = os.path.dirname(os.path.abspath(__file__))
BLOB = os.environ.get("UAI_BASE_BLOB") or os.path.expanduser(
    "~/.ollama/models/blobs/sha256-85e4a5b7b8ef0e48af0e8658f5aaab9c2324c76c1641493f4d1e25fce54b18b9")
GGUF_DIR = "/tmp/opencode/gguf-work"
GGUF = os.path.join(GGUF_DIR, "universe-ai.gguf")
DATA = os.path.join(HERE, "..", "knowledge", "dataset-v3-full.jsonl")
TOOLS_DATA = os.path.join(HERE, "..", "knowledge", "dataset-v3-tools.jsonl")
OUT = os.path.join(HERE, "out-v3")
REPO = "Qwen/Qwen3-4B-Instruct-2507"
TOOL_OVERSAMPLE = 3

t0 = time.time()
os.makedirs(GGUF_DIR, exist_ok=True)
if not os.path.exists(GGUF):
    os.symlink(BLOB, GGUF)

tok = AutoTokenizer.from_pretrained(REPO)
print("[1/5] loading base GGUF (streaming dequantize, low RAM)...", flush=True)
cfg_dict = load_gguf_checkpoint(GGUF, return_tensors=False)["config"]
config = AutoConfig.for_model(**cfg_dict)
model = AutoModelForCausalLM.from_config(config, dtype=torch.bfloat16, attn_implementation="sdpa")
mapping = get_gguf_hf_weights_map(model)
params = dict(model.named_parameters(remove_duplicate=False))
buffers = dict(model.named_buffers())
reader = GGUFReader(GGUF)
n_ok = n_skip = 0
for tensor in reader.tensors:
    hf_name = mapping.get(tensor.name)
    if hf_name is None:
        n_skip += 1
        continue
    target = params.get(hf_name)
    if target is None:
        target = buffers.get(hf_name)
    if target is None:
        n_skip += 1
        continue
    w = dequantize(tensor.data, tensor.tensor_type)
    t = torch.from_numpy(np.ascontiguousarray(w)).to(torch.bfloat16)
    if tuple(t.shape) != tuple(target.shape):
        if tuple(t.t().shape) == tuple(target.shape):
            t = t.t().contiguous()
        else:
            raise RuntimeError(f"shape mismatch {tensor.name}: {tuple(t.shape)} vs {tuple(target.shape)}")
    with torch.no_grad():
        target.copy_(t)
    del w, t
    n_ok += 1
print(f"      copied {n_ok} tensors, skipped {n_skip}", flush=True)
model = model.to("cuda")
shutil.rmtree(GGUF_DIR, ignore_errors=True)
model.config.use_cache = False
model.enable_input_require_grads()
print(f"      loaded in {time.time()-t0:.0f}s", flush=True)

print("[2/5] attaching LoRA r=64 alpha=128...", flush=True)
model = get_peft_model(model, LoraConfig(
    r=32, lora_alpha=64, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]))
model.print_trainable_parameters()

print("[3/5] datasets...", flush=True)

def load_rows(p):
    rows = []
    with open(p, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows

rows_text = load_rows(os.path.abspath(DATA))
rows_tools = load_rows(os.path.abspath(TOOLS_DATA))
rows_yes = [r for r in rows_tools if any(m.get("tool_calls") for m in r["messages"])]
rows_no = [r for r in rows_tools if not any(m.get("tool_calls") for m in r["messages"])]
all_rows = rows_text + rows_yes * TOOL_OVERSAMPLE + rows_no
random.Random(42).shuffle(all_rows)

texts = []
for r in all_rows:
    tools = r.get("tools")
    if tools:
        tools = [t for t in tools if t.get("type") == "function"]
    texts.append({"text": tok.apply_chat_template(r["messages"], tools=tools, tokenize=False, add_generation_prompt=False)})
ds = Dataset.from_list(texts)
print(f"      total: {len(ds)} (text {len(rows_text)}, tools {len(rows_yes)}x{TOOL_OVERSAMPLE}+{len(rows_no)})", flush=True)

print("[4/5] training...", flush=True)
args = SFTConfig(
    output_dir=OUT,
    per_device_train_batch_size=1, gradient_accumulation_steps=24,
    num_train_epochs=3, learning_rate=1e-4, lr_scheduler_type="cosine",
    warmup_ratio=0.05, logging_steps=10, save_strategy="epoch", save_total_limit=1,
    bf16=True, max_length=1152, packing=False, optim="paged_adamw_8bit",
    report_to=[], dataset_text_field="text", gradient_checkpointing=True,
    seed=42)
trainer = SFTTrainer(model=model, args=args, train_dataset=ds, processing_class=tok)
trainer.train()
print(f"      training done in {time.time()-t0:.0f}s", flush=True)

print("[5/5] saving adapter...", flush=True)
os.makedirs(os.path.join(OUT, "adapter"), exist_ok=True)
trainer.model.save_pretrained(os.path.join(OUT, "adapter"))
tok.save_pretrained(os.path.join(OUT, "adapter"))
print("ADAPTER ->", os.path.join(OUT, "adapter"))
print(f"total {time.time()-t0:.0f}s")
