# The Universe AI harness

Universe AI is not just a chat window in front of a model — the model is wrapped in an
agent harness that gives it hands and keeps the user in control. This document describes
what that harness does, tool by tool, and how the chat window and its history system work.

Everything lives in two files plus the renderer:

```
main.js        the harness: windows, tray, agent loop, tools, approvals, HTTP API, history store
mascot.js      the 3D black hole engine
renderer/      pet window, chat window, setup flow
```

## The agent loop

Every message the user sends goes to the local model **with the full tool set attached** —
there is no "agent mode" toggle. The loop:

1. sends the conversation plus the system prompt to ollama (streaming);
2. streams the answer into the chat as it is generated (chain-of-thought is filtered out
   and never displayed);
3. if the model calls tools, executes them one by one — showing each call in the chat as
   a tool block — and feeds the results back;
4. repeats until the model answers without tools (budget: 5–10 iterations depending on the
   reasoning-effort setting).

A cold model takes a moment to load; the chat shows `start model ▸` instead of `thinking…`
until the first token arrives.

## Tools

The model has twelve tools. Read-only tools run immediately; anything that changes the
machine goes through an approval card first; a small set of catastrophic patterns is
refused outright.

| Tool | What it does | Safety |
|---|---|---|
| `run_command` | Runs a shell command via `/bin/zsh -c` (30 s timeout, output capped) | Classifier: read-only → run; mutating (rm, sudo, apt, chmod, kill, redirects outside /tmp…) → approval card; mkfs, fork bombs, `rm -rf /`, shutdown… → refused |
| `read_file` | Reads a text file (≤ 400 lines / 12k chars, binary refused) | Read-only |
| `list_dir` | Lists a directory with types and sizes | Read-only |
| `edit_file` | Creates or overwrites a text file | Writes inside the workspace are free; outside it → approval card; app/system identity files and shell-startup files are refused |
| `web_search` | Real web search (DuckDuckGo by default; pluggable provider) | Results render as link cards in the chat |
| `fetch_url` | Fetches a page and strips it to readable text | SSRF guard: loopback/private ranges refused; streaming cap |
| `system_info` | One-shot system summary: OS, kernel, uptime, CPU/load, memory, disks, battery, GPU, network | Read-only |
| `remember` | Saves, lists or deletes persistent notes (stored locally) | Notes are recalled in later conversations |
| `search_files` | Finds files by name pattern under a directory (like `find -iname`; auto-wildcards, depth and result caps) | Read-only |
| `journal_logs` | Reads recent systemd journal entries, optionally filtered by unit and priority | Read-only |
| `process_list` | Top processes by CPU or memory | Read-only |
| `grep_files` | Searches inside files (like `grep -rn`, glob filter, noise directories skipped) | Read-only |
| `file_info` | One path in detail: type, size, mode, owner, timestamps, symlink target, sha256 (≤ 64 MB), directory entry count | Read-only |
| `disk_usage` | `df -hT` plus the largest entries under a directory | Read-only |
| `service_status` | systemd unit state: active, enabled, main PID, recent journal lines | Read-only |
| `network_info` | Interfaces and addresses, default route, listening sockets, DNS servers, connectivity check | Read-only |
| `package_info` | Package queries: search, info, file list, installed version (dpkg/apt-cache) | Read-only |
| `os_knowledge` | Searches the deep Universe OS knowledge base (system part + engineering appendix: traps, verification, playbooks) and returns the best-matching sections | Read-only |

Every tool call appears in the chat as a collapsible block — the exact command, the
output, and a green/amber/red state. Approvals render as a card with the command and
**[Approve] / [Deny]** buttons; a denial is reported back to the model, which accepts it
and moves on.

## Security posture

- **Approval gate.** Mutating or privileged commands never run silently.
- **Secrets policy.** The model is trained and prompted to never print passwords, keys,
  tokens or credential stores — it reports that a secret was found, not the secret.
- **Untrusted data.** Tool output and fetched pages are data, never instructions; the
  model ignores embedded directives and says so.
- **HTTP API.** `127.0.0.1:7788` — `/health` and `/state` are open; everything else needs
  a per-run bearer token. Host-header check, 1 MB body cap.
- **Path guards.** `edit_file` refuses symlinks, protects app/system files, and confines
  writes to the home directory.
- **No cloud.** Conversation, commands and history stay on the machine.

## The chat window

A frameless deep-space window: nebula backdrop that re-lights with the desktop mode
(blue / violet / green), frosted-glass panels, orbit line, and a state orb in the header.

- **Messages** — user lines with `❯`, answers with `●`; answers stream in with a blinking
  cursor; hover any answer for a copy button.
- **Markdown answers** — headings, lists, quotes, links, inline code and fenced code
  blocks with a language label and a per-block copy button. Streaming stays plain text
  and the finished answer is rendered, so long replies never stutter.
- **Stop button** — while the agent works the send arrow becomes a stop square
  (or Ctrl+.), which aborts the running model call and leaves the conversation usable.
- **Tool blocks** — collapsible, with the command in the header and scrollable output.
- **Approval cards** — the exact command plus Approve / Deny, and a verdict line after.
- **Web results** — search hits render as title / domain / snippet cards that open in the
  browser.
- **Empty state** — a short welcome and three suggestion chips to start from.
- **Status footer** — `thinking…`, `start model ▸`, `done`; `AGENT` chip lights while busy.
- **Keyboard** — Enter sends, Shift+Enter newline, Esc closes, Ctrl+U clears, Ctrl+. stops.

## Centralized history

Conversations are stored session by session under a single root:

```
~/.local/share/universe-ai/history/
    index.json          one entry per session: id, title, created, updated, message count
    s<id>.json          the full event log of one session
```

- A session starts with the first message after launch or after a clear; it is written
  with a short debounce and flushed on switch, clear and quit.
- The history button opens the panel: every conversation with its title (the first user
  message), date and message count; the current session is marked.
- Click a session to **view** it read-only — a banner offers *back to live*; if new
  activity arrives while viewing, a *jump to live* pill appears.
- **Filter** — the search box under the header narrows the list live by title.
- **Export** writes one conversation as Markdown to `~/Documents/Universe AI/`; the
  download glyph in the panel header exports **all** conversations into a single
  dated Markdown file (`universe-ai-chats-YYYY-MM-DD.md`).
- **Delete** is two-step (`sure?`) and removes the file and its index entry.
- Retention is bounded: up to 100 sessions, 600 events each, with per-field size caps.
- Older single-file history (`chat-history.json`) is migrated automatically on first run.

## Headless verification

The whole harness is scriptable for CI-style checks under `xvfb-run`:

| Hook | Purpose |
|---|---|
| `UAI_TEST=1` | Isolates config and data under /tmp |
| `UAI_ASK="…"` | Sends one message through the real agent loop |
| `UAI_TOOLTEST="cmd;;cmd"` | Exercises the command classifier and approval flow |
| `UAI_EDITTEST=1` | Exercises `edit_file` + `run_command` end to end |
| `UAI_HISTTEST=1` | Exercises the history store, panel, viewer, export and delete |
| `UAI_CHATPROBE=1` | Screenshots the chat and reports DOM state |
| `UNIVERSE_SNAPSHOT*` | Full snapshot chain of the pet window |
| `UAI_HIDE=…`, `UAI_GAZE=x,y`, `UAI_BG=checker` | Visual isolation for render tests |
