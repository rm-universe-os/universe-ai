#!/bin/bash
# Universe AI — ONE-SHOT: NVIDIA driver (595, Blackwell) + CUDA deps + QLoRA train
set -e
echo "== [1/4] NVIDIA userland + modules =="
bash /tmp/opencode/install-nvidia-full.sh
echo "== [2/4] CUDA python deps (bitsandbytes needs libcuda — installed above) =="
'" + os.path.expanduser("~") + "'/uai-venv/bin/pip install --no-cache-dir --resume-retries 10 "transformers==4.51.3" "trl==0.17.0" "peft==0.15.2" "accelerate==1.6.0" "datasets==3.5.0" "bitsandbytes==0.45.5"
echo "== [3/4] GPU check =="
nvidia-smi
'" + os.path.expanduser("~") + "'/uai-venv/bin/python -c "import torch;assert torch.cuda.is_available(),'CUDA off';print('GPU:',torch.cuda.get_device_name(0),'| VRAM:',torch.cuda.get_device_properties(0).total_memory/1e9,'GB')"
echo "== [4/4] QLoRA training =="
cd "$(dirname "$0")"
../finetune/../../uai-venv/bin/python 2>/dev/null || true
'" + os.path.expanduser("~") + "'/uai-venv/bin/python train_qlora.py
