import os, shutil, torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer, SFTConfig

HERE = os.path.dirname(os.path.abspath(__file__))
BLOB = os.path.expanduser("~/.ollama/models/blobs/sha256-85e4a5b7b8ef0e48af0e8658f5aaab9c2324c76c1641493f4d1e25fce54b18b9")
GGUF_DIR = "/tmp/opencode/gguf-work"          # transformers needs <dir>/<name>.gguf
GGUF = os.path.join(GGUF_DIR, "universe-ai.gguf")
DATA = os.path.join(HERE, "..", "knowledge", "dataset.jsonl")
OUT = os.path.join(HERE, "out")
REPO = "Qwen/Qwen3-4B-Instruct-2507"          # for tokenizer files only (tiny)

os.makedirs(GGUF_DIR, exist_ok=True)
if not os.path.exists(GGUF):
    shutil.copyfile(BLOB, GGUF)               # 2.4GB local copy (deleted after load)

tok = AutoTokenizer.from_pretrained(REPO)
bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                         bnb_4bit_compute_dtype=torch.bfloat16,
                         bnb_4bit_use_double_quant=True)
print("[1/5] loading GGUF (dequantize to bf16 in RAM, 30GB available)…", flush=True)
model = AutoModelForCausalLM.from_pretrained(
    GGUF_DIR, gguf_file="universe-ai.gguf",
    torch_dtype=torch.bfloat16)
model = model.to("cuda")                       # bf16 on GPU: 4B × 2B = ~8GB VRAM of 12GB ✓
shutil.rmtree(GGUF_DIR, ignore_errors=True)   # free the 2.4GB copy right away
model.config.use_cache = False
model.enable_input_require_grads()

print("[2/5] attaching LoRA adapters…", flush=True)
model = get_peft_model(model, LoraConfig(
    r=32, lora_alpha=64, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]))
model.print_trainable_parameters()

print("[3/5] dataset…", flush=True)
ds = load_dataset("json", data_files=os.path.abspath(DATA), split="train")
def to_text(ex):
    return {"text": tok.apply_chat_template(ex["messages"], tokenize=False, add_generation_prompt=False)}
ds = ds.map(to_text)

print("[4/5] training…", flush=True)
args = SFTConfig(
    gradient_checkpointing=True,
    output_dir=OUT,
    per_device_train_batch_size=1, gradient_accumulation_steps=16,
    num_train_epochs=6, learning_rate=2e-4, lr_scheduler_type="cosine",
    warmup_ratio=0.06, logging_steps=2, save_strategy="no",
    bf16=True, max_length=1024, packing=False,
    report_to=[], dataset_text_field="text",
)
trainer = SFTTrainer(model=model, args=args, train_dataset=ds, processing_class=tok)
trainer.train()

print("[5/5] saving adapter…", flush=True)
trainer.model.save_pretrained(os.path.join(OUT, "adapter"))
tok.save_pretrained(os.path.join(OUT, "adapter"))
print("ADAPTER →", os.path.join(OUT, "adapter"))
