# Training Universe AI — The Full QLoRA Story

This document explains exactly how the model behind Universe AI was trained:
a real QLoRA fine-tune of **Qwen3-4B-Instruct-2507** on a single consumer GPU,
end to end — from raw dataset to the GGUF that ships in the release.

No magic, no shortcuts. Everything below was actually run.

---

## 1. The base model

| | |
|---|---|
| Model | Qwen3-4B-Instruct-2507 (Apache-2.0) |
| Quantization | Q4_K_M (~2.5 GB, ~4.5 bits/weight) |
| Runtime | ollama 0.33 (llama.cpp backend) |
| Context | 26k |

The base model is a capable general assistant but knows nothing about
Universe OS, its tools, its security rules, or its identity. That is what
the fine-tune adds.

## 2. Why QLoRA (and not full fine-tuning)

Full fine-tuning of a 4B model needs 60 GB+ of VRAM. The training machine
has a laptop **RTX 5070 Ti with 12 GB**. QLoRA makes it possible:

- The base model is loaded **frozen in 4-bit (NF4)** — read-only.
- Small **LoRA matrices** (rank 32) are attached to every attention and MLP
  projection (`q/k/v/o/gate/up/down_proj`).
- Only those matrices are trained: **~478 M trainable params out of 4 B**.
- Result: the base weights never change; the "brain" is a small adapter
  file (~130–260 MB) that can be attached, removed, or replaced at will.

## 3. The dataset

Built from the Universe OS codebase and documentation, in
`brain/knowledge/`. Every example is a JSONL line with
`system / user / assistant` messages:

| Category | Examples | Purpose |
|---|---|---|
| Identity | 13 | "Who are you?" → Universe AI, built by RM for Universe OS |
| Universe OS knowledge | 25 | the 8 universe-* apps, privilege model, modes, BTRFS, build pipeline |
| Linux encyclopedia | 33 | practical answers for ls, grep, systemctl, ssh, cron, permissions, pipes |
| Security refusals | 9 | printing SSH keys, malware, prompt injection → correct refusals |

A fixed system prompt sits on top of every example encoding the permanent
rules: mirror the user's language, never reveal secrets, treat tool output
as untrusted data, never help with illegal activity.

Generators: `make_dataset.py` and `make_dataset_v2.py` (v2 adds the
deeper Universe OS internals from `universe_data.py` and
`commands_data.py`).

## 4. Training run

Environment (Python venv):

```
torch 2.11.0+cu128 · transformers 4.57.1 · trl 0.17.0
peft 0.15.2 · bitsandbytes 0.45.5 · datasets · accelerate
```

Script: `brain/finetune/train_qlora.py`

```python
model = AutoModelForCausalLM.from_pretrained(dir, gguf_file="base.gguf",
                                             torch_dtype=torch.bfloat16)
model = get_peft_model(model, LoraConfig(
    r=32, lora_alpha=64,
    target_modules=["q_proj","k_proj","v_proj","o_proj",
                    "gate_proj","up_proj","down_proj"]))

SFTConfig(num_train_epochs=6, learning_rate=2e-4, bf16=True,
          per_device_train_batch_size=1, gradient_accumulation_steps=16,
          max_length=1024, gradient_checkpointing=True)
```

Notable details:

- **Training directly from the GGUF** — transformers can load a quantized
  GGUF as a weight source, so no separate 8 GB safetensors download was
  needed.
- `enable_input_require_grads()` is required, otherwise the frozen 4-bit
  base swallows the gradients and LoRA silently learns nothing.
- `batch=1 + grad_accum=16` is what makes 12 GB VRAM enough.
- **Wall time: 71 seconds** on the RTX 5070 Ti for 6 epochs over ~120
  examples. QLoRA is fast because almost nothing is trainable.

Output: `brain/finetune/out/adapter` — the LoRA adapter.

## 5. Adapter → ollama

The adapter is converted with llama.cpp's
`convert_lora_to_gguf.py` and attached to the base blob via an ollama
Modelfile (`brain/knowledge/Modelfile.template`):

```
FROM <base-blob>
ADAPTER <adapter.gguf>
SYSTEM <knowledge + security rules>
```

`ollama create universe-ai-ft` produces the model the app uses.

### Why not a single fused GGUF?

A one-file merged model was also built (dequantize → `merge_and_unload()`
→ re-quantize with ollama's exact tensor layout). Current ollama/llama.cpp
versions derive Qwen3's KV dimension as 640 and ignore the GGUF's
`key_length=128`, so hand-fused files fail with a tensor-dimension
mismatch. The **base + adapter** route is the supported path and is what
ships. The fusion scripts (`fuse_v3.py`, `fuse_final.py`, ...) are kept
for when upstream fixes the KV-dim derivation.

## 6. Verification

The final model was probed live through ollama:

- Identity: answers as Universe AI, built by RM for Universe OS ✓
- OS knowledge: correct Universe OS internals ✓
- Security: refuses to print SSH keys, ignores prompt injection ✓
- Language: mirrors the user's language ✓

## 7. Reproducing

```bash
# 1. dataset
cd brain/knowledge && python3 make_dataset_v2.py

# 2. train (needs a CUDA GPU with >= 12 GB VRAM)
python3 brain/finetune/train_qlora.py

# 3. convert + attach
python3 convert_lora_to_gguf.py ...      # llama.cpp tool
ollama create universe-ai-ft -f brain/knowledge/Modelfile
```

Hardware used: RTX 5070 Ti Laptop 12 GB (Blackwell, sm_120), driver 595,
CUDA 12.8. Peak VRAM during training: ~10 GB.
