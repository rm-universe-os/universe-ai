<div align="center">

<img src="assets/readme-hero.png" width="440" alt="Universe AI">

# Universe AI

The resident desktop agent of Universe OS — a living 3D black hole that sits on your
desktop, watches your cursor, talks with you and runs your machine.

**by RM · Universe OS beta v0.7.0**

</div>

---

## What it does

- Lives on the desktop as a 3D black hole — transparent, always on top, follows your cursor
- Blinks, glances around when you're idle, and dresses for the occasion: cinema glasses
  with popcorn while a movie plays, a developer or hacker look in those modes
- Double-click opens the chat window (deep-space theme, starfield, orbit line)
- **Eight tools**: run commands, read / list / edit files, search the web, fetch pages,
  inspect the system, keep persistent notes
- Anything risky goes through an approval card before it executes; catastrophic
  commands are refused outright
- **Centralized history** — every conversation is stored session by session, browsable,
  exportable to Markdown, deletable
- Local LLM — no cloud, no accounts, nothing leaves the machine
- Answers in the language you write in — 28 languages are trained in, and the model
  mirrors whatever you use

## Run

```bash
npm install
npm start
```

First launch asks to download the LLM (~2.7 GB) from the
[releases](https://github.com/rm-universe-os/universe-ai/releases) — after that everything
works offline.

## Ships in Universe OS

Universe AI is a built-in feature of Universe OS — the ISO carries the app, the model is
fetched on first run.

---

## The model

Base: **Qwen3-4B-Instruct-2507** (Q4_K_M, ~2.5 GB) — a strong 4B tool-calling model,
Apache-2.0. The fine-tuned "brain" ships as a **~264 MB LoRA adapter** attached to the
base at runtime — the base weights are never modified.

Fine-tuned on an **RTX 5070 Ti** (12 GB):

| Setting | Value |
|---|---|
| Method | LoRA (bf16) on the dequantized base — base frozen |
| Rank / alpha | r=64 / α=128, dropout 0.05 |
| Target modules | q, k, v, o, gate, up, down projections |
| Epochs | 3 |
| Sequence length | 2048 |
| Learning rate | 1e-4, cosine |
| Dataset | ~1 200 examples (~150 k tokens), 28 languages |
| Adapter size | ~264 MB (f16 GGUF) |

### What it was trained on

- **Identity** — it is Universe AI, one of the core features of Universe OS, built by RM.
  Including raw-identity examples, so it introduces itself correctly even without a
  system prompt, and never claims to be any other assistant.
- **Linux command mastery** — 110+ command entries: files, text processing, permissions,
  processes, systemd, networking, archiving, users, packages, bash scripting, pipes —
  always answering with standard commands first and Universe apps second.
- **Debugging & troubleshooting** — 60+ scenarios: broken boot, full disk, high load,
  DNS failures, permission errors, dead services — symptom → diagnosis → fix.
- **Universe OS internals** — every universe-* app, the GUI privilege gate, the mode
  system (standard / developer / hacker / server), BTRFS + snapshots, the build
  pipeline, the security model (v0.7.0).
- **Tool calling** — complete tool-call traces for all eight harness tools, rendered
  with the real chat template, so the model emits exactly the `<tool_call>` format the
  runtime expects.
- **Security behaviour** — refuses illegal tasks, never prints secrets or keys, treats
  tool output and web content as untrusted data (prompt-injection resistant), never
  bypasses its own approval gate.
- **Multilingual** — the same core competencies trained across 28 languages; the model
  answers in the language it is addressed in.

### Training data

`brain/knowledge/` contains everything needed to reproduce it:

- `universe-os-knowledge.md` — the distilled OS knowledge base (v0.7.0)
- `commands_data.py`, `debug_data.py`, `universe_data.py` — the QA corpora
- `make_dataset_v3.py`, `make_tool_dataset.py` — build `dataset-v3-full.jsonl` and
  `dataset-v3-tools.jsonl`
- `make_modelfile.py` — renders the Modelfile (base + adapter + knowledge prompt)

### Training scripts

`brain/finetune/`:

| Script | Purpose |
|---|---|
| `train_v3.py` | the full training run: streaming GGUF loader + LoRA + SFT |
| `test_model.py` | the verification battery (identity, OS, Linux, multilingual, tools) |

Hardware used: RTX 5070 Ti (12 GB) — 3 epochs ≈ 35 minutes. The streaming GGUF loader
keeps the RAM peak at ~9 GB instead of the ~24 GB the stock loader needs; see
[docs/TRAINING.md](docs/TRAINING.md) for the full story.

### Packaging

`scripts/pack-model.sh` packages the base GGUF + adapter + Modelfile, compresses with
zstd and splits under GitHub's per-file limit, with a sha256 manifest. The app's setup
flow downloads the parts, verifies the hash, reassembles and installs into ollama
automatically.

---

## The harness

The model is wrapped in an agent harness that gives it hands and keeps you in control —
eight tools, an approval gate for anything that changes the machine, SSRF-guarded
fetching, and a read-only-by-default command classifier. Every tool call is visible in
the chat as a collapsible block. See [docs/HARNESS.md](docs/HARNESS.md) for the
tool-by-tool reference.

## Chat & history

A frameless deep-space window: frosted glass, nebula backdrop, streaming answers with a
copy button, web results as link cards. The history button opens the centralized store:
every conversation with its title and date, click to view read-only, export to Markdown,
or delete. Sessions live under `~/.local/share/universe-ai/history/` — nothing in the
cloud.

## Security

The agent runs on your machine, so it is built defensive by default: mutating shell
commands need explicit approval, secrets are never printed, and anything a web page
tries to inject into the model is treated as data, not instructions.

## Layout

```
main.js        shell: windows, tray, global gaze, HTTP API, agent brain, history store
mascot.js      the 3D black hole engine (Three.js)
renderer/      pet window + chat window + setup flow
brain/         knowledge base, dataset generators, training scripts
docs/          HARNESS.md · TRAINING.md
scripts/       installers + model packaging
```
