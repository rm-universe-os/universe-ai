import argparse
import json
import os
import subprocess
import sys
import urllib.request
import urllib.error

HOME = os.path.expanduser("~")
NO_COLOR = os.environ.get("NO_COLOR") is None and not sys.stdout.isatty()

GREEN = "\033[92m" if not NO_COLOR else ""
RED = "\033[91m" if not NO_COLOR else ""
YELLOW = "\033[93m" if not NO_COLOR else ""
BLUE = "\033[94m" if not NO_COLOR else ""
DIM = "\033[2m" if not NO_COLOR else ""
RESET = "\033[0m" if not NO_COLOR else ""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "run_command",
            "description": "Run a shell command on the user's Linux machine via /bin/zsh -c (cwd = home, 30 s timeout). Read-only commands run immediately; mutating/privileged ones require user approval; destructive system commands are refused.",
            "parameters": {
                "type": "object",
                "properties": {"command": {"type": "string"}},
                "required": ["command"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the real internet (DuckDuckGo). Returns top results with title, url, snippet.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_url",
            "description": "Fetch a URL and return readable text (HTML stripped).",
            "parameters": {
                "type": "object",
                "properties": {"url": {"type": "string"}},
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "edit_file",
            "description": "Create or overwrite a text file. Then verify with run_command.",
            "parameters": {
                "type": "object",
                "properties": {"path": {"type": "string"}, "content": {"type": "string"}},
                "required": ["path", "content"],
            },
        },
    },
]

CATASTROPHIC = [
    ("mkfs", r"\bmkfs(\.\w+)?\b"),
    ("raw device write", r"\bdd\b[^|;&]*\bof=/dev/"),
    ("fork bomb", r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:"),
    ("power action", r"\b(shutdown|reboot|poweroff|halt)\b"),
    ("rm -rf /", r"\brm\s+(-\S+\s+)*/(\*|\s|$)"),
    ("chmod 777 /", r"\bchmod\s+(-R\s+)?777\s+/"),
]

READONLY = {
    "ls", "cat", "head", "tail", "grep", "find", "df", "du", "ps", "free", "uname",
    "which", "whereis", "pwd", "whoami", "id", "date", "uptime", "hostname", "wc",
    "file", "stat", "printenv", "lsblk", "lscpu", "lsmod", "lspci", "lsusb",
    "ss", "netstat", "ip", "echo", "printf", "man", "info", "readlink", "dirname",
    "basename", "sort", "uniq", "cut", "sleep", "tree", "xxd", "od", "nproc", "top",
    "vmstat", "journalctl", "timedatectl", "who", "w", "groups", "getent",
    "type", "realpath",
}

READONLY_SUB = {
    "systemctl": ("status", "show", "is-active", "is-enabled", "is-failed", "list-"),
    "git": ("status", "log", "diff", "show", "branch", "remote", "tag", "rev-parse", "blame"),
    "ollama": ("list", "ls", "ps", "show", "help"),
    "python": ("--version", "-V"),
    "python3": ("--version", "-V"),
    "node": ("--version", "-v"),
    "npm": ("ls", "list", "view", "outdated", "search"),
    "apt": ("list", "search", "show", "policy"),
    "dnf": ("list", "search", "info"),
    "pip": ("--version", "list", "show", "freeze"),
    "pip3": ("--version", "list", "show", "freeze"),
}

def classify(cmd: str):
    import re
    if re.search(r"[\n\r]", cmd):
        return "ask", "multi-line command needs approval"
    if re.search(r"\$\(|`|<\(|>\(|\$\{", cmd):
        return "ask", "command substitution / expansion needs approval"
    for name, pattern in CATASTROPHIC:
        if re.search(pattern, cmd):
            return "refuse", f"{name} is forbidden"
    segments = [s.strip() for s in re.split(r"&&|\|\||;|\||&", cmd) if s.strip()]
    for seg in segments:
        words = seg.split()
        if not words:
            continue
        w0 = words[0]
        if w0 == "sudo":
            return "ask", "sudo requires approval"
        if w0 in ("rm", "kill", "pkill", "chmod", "chown", "dd", "tee", "mv", "apt", "apt-get", "dnf",
                  "env", "sed", "awk", "ln", "ldd", "strace", "flatpak", "ldconfig", "xargs",
                  "bash", "sh", "zsh", "eval", "source", "touch", "mkdir", "truncate"):
            if w0 in ("pip", "pip3") and words[1:2] and words[1] in ("list", "show", "freeze"):
                continue
            if w0 in ("apt", "dnf") and words[1:2] and words[1] in ("list", "search", "show", "info", "policy"):
                continue
            return "ask", f"'{w0}' needs approval"
        if re.search(r">>{0,1}\s*/(?!tmp/)", " " + seg) or re.search(r">>{0,1}\s*[A-Za-z~.]", " " + seg):
            return "ask", "redirect needs approval"
        if w0 in READONLY_SUB:
            rest = " ".join(words[1:])
            if any(rest.startswith(p) or p in rest.split() for p in READONLY_SUB[w0]):
                continue
            return "ask", f"'{w0} {rest.split()[0] if rest else ''}' needs approval"
        if w0 not in READONLY:
            return "ask", f"'{w0}' is not on the read-only list"
    return "run", ""

def run_command(command: str) -> str:
    verdict, reason = classify(command)
    if verdict == "refuse":
        return f"(refused by safety policy: {reason})"
    if verdict == "ask":
        try:
            ans = input(f"{YELLOW}⚠ approve? {command}{RESET} [y/N] ").strip().lower()
        except EOFError:
            ans = "n"
        if ans not in ("y", "yes"):
            return "(denied by user)"
    try:
        env = dict(os.environ, NO_COLOR="1")
        p = subprocess.run(["/bin/zsh", "-c", command], cwd=HOME, env=env,
                           capture_output=True, text=True, timeout=30)
        out = (p.stdout or "") + (("[stderr]\n" if p.stdout else "") + p.stderr if p.stderr else "")
        if len(out) > 6000:
            out = out[:6000] + "\n…[truncated]"
        out += f"\n[exit code {p.returncode}]"
        return out or "(no output)"
    except subprocess.TimeoutExpired:
        return "[timeout]"
    except Exception as e:
        return f"error: {e}"

def web_search(query: str) -> str:
    url = "https://html.duckduckgo.com/html/?q=" + urllib.request.quote(query)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"})
    import re
    try:
        html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8", "replace")
    except Exception as e:
        return f"search failed: {e}"
    titles = re.findall(r'<a[^>]*class="[^"]*result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)</a>', html)
    snippets = re.findall(r'class="[^"]*result__snippet"[^>]*>([\s\S]*?)</a>', html)

    def strip_tags(s):
        s = re.sub(r"<[^>]*>", "", s)
        for a, b in (("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&#39;", "'")):
            s = s.replace(a, b)
        return " ".join(s.split())

    out = []
    for i, (href, title) in enumerate(titles[:8]):
        m = re.search(r"[?&]uddg=([^&]+)", href)
        if m:
            href = urllib.request.unquote(m.group(1))
        snip = strip_tags(snippets[i]) if i < len(snippets) else ""
        out.append(f"{i + 1}. {strip_tags(title)}\n   {href}\n   {snip}")
    return "\n".join(out) if out else "No results found."

def fetch_url(url: str) -> str:
    import re
    if not re.match(r"^https?://", url or "", re.I):
        return "refused: url must start with http:// or https://"
    host = re.match(r"^https?://([^/:?#]+)", url or "", re.I)
    if host:
        h = host.group(1).lower()
        if (h in ("localhost",) or h.endswith(".localhost") or h.endswith(".local") or h.endswith(".internal")
                or re.match(r"^127\.|^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.", h)
                or h in ("::1", "[::1]") or h.startswith("fc") or h.startswith("fd") or h.startswith("fe80")):
            return "refused: fetching internal/private network addresses is not allowed"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 UniverseAI/1.0"})
    try:
        body = urllib.request.urlopen(req, timeout=20).read(300000).decode("utf-8", "replace")
    except Exception as e:
        return f"fetch failed: {e}"
    body = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", body, flags=re.I)
    body = re.sub(r"<[^>]*>", " ", body)
    for a, b in (("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&#39;", "'"), ("&nbsp;", " ")):
        body = body.replace(a, b)
    body = re.sub(r"[ \t]+", " ", body)
    body = re.sub(r"\n\s*\n+", "\n", body).strip()
    if len(body) > 12000:
        body = body[:12000] + "\n…[truncated]"
    return body or "(empty page)"

def edit_file(path: str, content: str) -> str:
    p = os.path.expanduser(path)
    if not os.path.isabs(p):
        p = os.path.join(HOME, p)
    p = os.path.normpath(p)
    real = os.path.realpath(p)
    if os.path.commonpath([HOME, real]) != HOME:
        return "refused: path outside home directory"
    forbidden = [".bashrc", ".zshrc", ".zshenv", ".profile", ".bash_profile", ".pam_environment",
                 ".ssh", ".config/autostart", ".xprofile", ".xinitrc"]
    rel = os.path.relpath(real, HOME)
    if any(rel == f or rel.startswith(f + "/") or ("/" + f) in ("/" + rel) for f in forbidden):
        return "refused: shell-startup or session files are protected"
    if os.path.islink(real) or os.path.islink(os.path.dirname(p)):
        return "refused: target is a symlink"
    ans = input(f"{YELLOW}⚠ approve writing {real} ({len(content)} bytes)?{RESET} [y/N] ").strip().lower()
    if ans not in ("y", "yes"):
        return "(denied by user)"
    os.makedirs(os.path.dirname(real), exist_ok=True)
    with open(real, "w") as f:
        f.write(content)
    return f"wrote {real} ({len(content)} bytes)"

def dispatch(name, args):
    if name == "run_command":
        return run_command(str(args.get("command", "")))
    if name == "web_search":
        return web_search(str(args.get("query", "")))
    if name == "fetch_url":
        return fetch_url(str(args.get("url", "")))
    if name == "edit_file":
        return edit_file(str(args.get("path", "")), str(args.get("content", "")))
    return f"unknown tool: {name}"

SYSTEM = (
    "You are Universe AI, the resident assistant of Universe OS — a Linux distribution built on the "
    "Linux kernel, GNOME Shell, Wayland, Flatpak and strict security / access-control policies. "
    "Always reply in the SAME LANGUAGE the user writes in. Be concise, warm and practical. "
    "You are an always-on agent: explain briefly before each tool call, prefer read-only commands, "
    "summarize after tool output."
)

def chat(base_url, model, messages):
    body = json.dumps({
        "model": model, "messages": messages, "stream": False,
        "tools": TOOLS,
        "options": {"temperature": 0.4, "num_ctx": 16384},
    }).encode()
    req = urllib.request.Request(base_url.rstrip("/") + "/api/chat", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.loads(r.read().decode())

def main():
    ap = argparse.ArgumentParser(description="Universe AI terminal bridge")
    ap.add_argument("prompt", nargs="*", help="one-shot prompt (omit for REPL)")
    ap.add_argument("--model", default=os.environ.get("UAI_MODEL", "qwen3:4b"))
    ap.add_argument("--url", default=os.environ.get("UAI_OLLAMA_URL", "http://127.0.0.1:11434"))
    ap.add_argument("--effort", choices=["off", "low", "medium", "high"], default="medium")
    args = ap.parse_args()

    effort_line = {
        "off": "Think briefly and answer directly.",
        "low": "Think briefly.",
        "medium": "Think step by step.",
        "high": "Think deeply and exhaustively.",
    }[args.effort]
    messages = [{"role": "system", "content": SYSTEM + " " + effort_line}]

    max_iter = 10 if args.effort == "high" else 7

    def turn(user_text):
        messages.append({"role": "user", "content": user_text})
        for _ in range(max_iter):
            resp = chat(args.url, args.model, messages)
            msg = resp.get("message", {})
            content = msg.get("content", "")
            calls = msg.get("tool_calls") or []
            if content:
                print(f"{BLUE}●{RESET} {content}")
            if not calls:
                messages.append({"role": "assistant", "content": content})
                return
            messages.append({"role": "assistant", "content": content, "tool_calls": calls})
            for tc in calls:
                fn = tc.get("function", {})
                name = fn.get("name", "")
                try:
                    targs = fn.get("arguments", "{}")
                    targs = json.loads(targs) if isinstance(targs, str) else targs
                except json.JSONDecodeError:
                    targs = {}
                print(f"{GREEN}⏺ {name}{RESET} {json.dumps(targs, ensure_ascii=False)[:200]}")
                result = dispatch(name, targs)
                preview = result if len(result) <= 800 else result[:800] + " …[truncated]"
                print(f"{DIM}{preview}{RESET}")
                messages.append({"role": "tool", "tool_name": name, "content": result})
        print(f"{RED}(tool budget exhausted){RESET}")

    if args.prompt:
        turn(" ".join(args.prompt))
        return
    print(f"{DIM}Universe AI terminal bridge — model: [hidden], /quit to exit{RESET}")
    while True:
        try:
            line = input(f"{GREEN}❯{RESET} ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return
        if line in ("/quit", "/exit", "q"):
            return
        if line:
            turn(line)

if __name__ == "__main__":
    main()
