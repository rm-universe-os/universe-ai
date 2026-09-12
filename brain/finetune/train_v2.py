import os, shutil, torch
import gguf.gguf_reader as _rr
_orig_push = _rr.GGUFReader._push_field
def _tolerant(self, field, skip_sum=False):
    try: return _orig_push(self, field, skip_sum)
    except KeyError: pass
_rr.GGUFReader._push_field = _tolerant
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer, SFTConfig

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = "/run/media/kali/MM/universe-ai-fused-final.gguf"
WDIR = "/run/media/kali/MM"
DATA = os.path.join(HERE, "..", "knowledge", "dataset-v2.jsonl")
OUT = os.path.join(HERE, "out-v2")
REPO = "Qwen/Qwen3-4B-Instruct-2507"

os.makedirs(WDIR, exist_ok=True)
g = "/run/media/kali/MM/universe-ai-fused-final.gguf"

tok = AutoTokenizer.from_pretrained(REPO)
print("[1/4] loading fused GGUF (bf16 RAM)…", flush=True)
model = AutoModelForCausalLM.from_pretrained("/run/media/kali/MM", gguf_file="universe-ai-fused-final.gguf", torch_dtype=torch.bfloat16)
model = model.to("cuda")
model.config.use_cache = False
model.enable_input_require_grads()

print("[2/4] LoRA…", flush=True)
model = get_peft_model(model, LoraConfig(
    r=32, lora_alpha=64, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
    target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"]))
model.print_trainable_parameters()

print("[3/4] dataset…", flush=True)
ds = load_dataset("json", data_files=DATA, split="train")
ds = ds.map(lambda ex: {"text": tok.apply_chat_template(ex["messages"], tokenize=False, add_generation_prompt=False)})

args = SFTConfig(
    output_dir=OUT, per_device_train_batch_size=1, gradient_accumulation_steps=16,
    num_train_epochs=8, learning_rate=1.5e-4, lr_scheduler_type="cosine", warmup_ratio=0.06,
    logging_steps=2, save_strategy="no", bf16=True, max_length=1024, packing=False,
    report_to=[], dataset_text_field="text", gradient_checkpointing=True)

print("[4/4] training…", flush=True)
trainer = SFTTrainer(model=model, args=args, train_dataset=ds, processing_class=tok)
trainer.train()
os.makedirs(OUT, exist_ok=True)
trainer.model.save_pretrained(OUT)
tok.save_pretrained(OUT)
print("ADAPTER_V2 →", OUT)
