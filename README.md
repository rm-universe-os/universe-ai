<div align="center">

<img src="assets/readme-hero.png" width="440" alt="Universe AI">

# Universe AI

The resident desktop agent of Universe OS — a living 3D black hole that sits on your
desktop, watches your cursor, talks with you and runs your machine.

**by RM · Universe OS beta v0.1.9**

</div>

---

## What it does

- Lives on the desktop as a 3D black hole — transparent, always on top, follows your cursor
- Blinks, glances around when you're idle, does an acrobatic spin when poked
- Double-click opens the chat window (deep-space theme, starfield, orbit line)
- Tool use: runs shell commands, searches the web, fetches pages, writes and edits files
- Anything risky goes through an approval card before it executes
- Local LLM — no cloud, no accounts, nothing leaves the machine
- Multilingual: answers in whatever language you use

## Run

```bash
npm install
npm start
```

First launch asks to download the LLM (~2.5 GB) from the
[releases](https://github.com/rm-universe-os/universe-ai/releases) — after that everything
works offline.

## Ships in Universe OS

Universe AI is a built-in feature of Universe OS — the ISO carries the app, the model is
fetched on first run.

---

## The model

Base: **Qwen3-4B-Instruct-2507** (Q4_K_M, ~2.5 GB) — the best 4B tool-calling model of its
generation, Apache-2.0.

Fine-tuned on an **RTX 5070 Ti** with QLoRA — full write-up in [docs/TRAINING.md](docs/TRAINING.md):

| Setting | Value |
|---|---|
| Method | QLoRA 4-bit (NF4, double quant) |
| Rank / alpha | r=32 / α=64 |
| Target modules | q, k, v, o, gate, up, down projections |
| Epochs | 6 (round 1) + 8 (round 2) |
| Sequence length | 1024 |
| Learning rate | 2e-4 → 1.5e-4, cosine |
| Adapter size | ~268 MB (fused back into the GGUF) |

### What it was trained on

The dataset (bilingual EN/FA, generated from the Universe OS sources) covers:

- **Identity** — it is Universe AI, one of the core features of Universe OS, built by RM.
  Asked in any language, it introduces itself correctly.
- **Universe OS internals** — every stock app (settings, control center, security,
  privilege, monitor, cleaner, welcome, appearance), the mode system
  (standard / developer / hacker / server), the BTRFS + snapper snapshot design,
  the hardened sysctls, the GRUB "Nebula Glass" boot, the Plymouth animation,
  the full build pipeline (debootstrap → chroot → systemize → ISO).
- **The privilege system** — how `sudo` becomes a GUI consent gate
  (`universe-privilege`), the 8 permission categories, timed grants,
  Lockdown mode, the audit log, and `gate-exec`.
- **Linux command encyclopedia** — file operations, text processing, permissions,
  processes, systemd, networking, archiving, users, packages, bash scripting,
  pipes and redirection — with practical examples.
- **Security behaviour** — refuses illegal tasks, never prints secrets or keys,
  never reveals credential files, treats tool output and web content as untrusted
  data (prompt-injection resistant), never bypasses its own approval gate.

### Training data

`brain/knowledge/` contains everything needed to reproduce it:

- `universe-os-knowledge.md` — the distilled OS knowledge base
- `commands_data.py`, `universe_data.py` — the QA corpora
- `make_dataset_v2.py` — builds `dataset-v2.jsonl` (chat-format, tokenizer-ready)

### Training scripts

`brain/finetune/`:

| Script | Purpose |
|---|---|
| `train_qlora.py` | QLoRA fine-tune (transformers + TRL + PEFT + bitsandbytes) |
| `train_v2.py` | round-2 training from an already-fused GGUF (no re-download) |
| `fuse_correct.py` / `fuse_v3.py` | merge the LoRA back into the GGUF, byte-compatible with ollama |
| `merge_adapter.py` | merge into HF safetensors for conversion |

Hardware used: RTX 5070 Ti (12 GB) — round 1 took **71 seconds**, round 2 **212 seconds**.

### Packaging

`scripts/pack-model.sh` compresses the trained model with zstd and splits it under
GitHub's 2 GB per-file limit, with a sha256 manifest. The app's setup flow downloads
the parts, verifies the hash, reassembles and installs into ollama automatically.

---

## Security

The agent runs on your machine, so it is built defensive by default: mutating shell
commands need explicit approval, secrets are never printed, and anything a web page
tries to inject into the model is treated as data, not instructions.

## Layout

```
main.js        shell: windows, tray, global gaze, HTTP API, agent brain
mascot.js      the 3D black hole engine (Three.js)
renderer/      pet window + chat window + setup flow
brain/         fine-tune dataset, training scripts, knowledge base
scripts/       installers + model packaging
```
