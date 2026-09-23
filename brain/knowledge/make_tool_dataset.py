import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "dataset-v3-tools.jsonl")

TOOLS = [
    {"type": "function", "function": {"name": "run_command", "description": "Run a shell command on the Linux machine. Read-only commands run immediately; mutating or privileged commands require the user's approval; destructive system commands are refused.", "parameters": {"type": "object", "properties": {"command": {"type": "string"}}, "required": ["command"]}}},
    {"type": "function", "function": {"name": "read_file", "description": "Read a text file (up to ~400 lines).", "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "max_lines": {"type": "number"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "list_dir", "description": "List the entries of a directory with type and size.", "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "edit_file", "description": "Create or overwrite a text file. Writes outside the workspace ask for approval first.", "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}}},
    {"type": "function", "function": {"name": "web_search", "description": "Search the real internet; returns top results with title, url and snippet.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
    {"type": "function", "function": {"name": "fetch_url", "description": "Fetch a URL and return its readable text.", "parameters": {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}}},
    {"type": "function", "function": {"name": "system_info", "description": "Show a live system summary: OS, kernel, uptime, CPU, memory, disks, battery, GPU, network.", "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {"name": "remember", "description": "Keep a persistent note (save/list/delete).", "parameters": {"type": "object", "properties": {"action": {"type": "string"}, "text": {"type": "string"}}, "required": ["action"]}}},
    {"type": "function", "function": {"name": "os_knowledge", "description": "Look up a topic in the deep Universe OS knowledge base: architecture, apps, modes, security, boot, known pitfalls and troubleshooting playbooks. Use it for any Universe OS specific question.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
    {"type": "function", "function": {"name": "search_files", "description": "Find files by name pattern under a directory (like find -iname). Returns matching paths.", "parameters": {"type": "object", "properties": {"pattern": {"type": "string"}, "path": {"type": "string"}, "max_results": {"type": "number"}}, "required": ["pattern"]}}},
    {"type": "function", "function": {"name": "journal_logs", "description": "Read recent systemd journal entries, optionally filtered by unit and priority. Useful for debugging services and boot problems.", "parameters": {"type": "object", "properties": {"unit": {"type": "string"}, "lines": {"type": "number"}, "priority": {"type": "string"}}, "required": []}}},
    {"type": "function", "function": {"name": "process_list", "description": "Show the top running processes sorted by CPU or memory usage.", "parameters": {"type": "object", "properties": {"sort_by": {"type": "string", "enum": ["cpu", "mem"]}, "count": {"type": "number"}}, "required": []}}},
    {"type": "function", "function": {"name": "grep_files", "description": "Search inside files for a text pattern (like grep -rn). Returns file, line number and the matching line. Use it to find where a setting, function or error text lives.", "parameters": {"type": "object", "properties": {"pattern": {"type": "string"}, "path": {"type": "string"}, "glob": {"type": "string"}, "max_results": {"type": "number"}}, "required": ["pattern"]}}},
    {"type": "function", "function": {"name": "file_info", "description": "Detailed information about one path: type, size, permissions, owner, timestamps, symlink target, sha256 for files, and directory entry count.", "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "disk_usage", "description": "Filesystem usage: df -hT plus the largest entries under a directory. Use it when the disk fills up.", "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "count": {"type": "number"}}, "required": []}}},
    {"type": "function", "function": {"name": "service_status", "description": "Status of a systemd unit: active state, enabled state, main PID, recent journal lines. Read-only.", "parameters": {"type": "object", "properties": {"unit": {"type": "string"}, "lines": {"type": "number"}}, "required": ["unit"]}}},
    {"type": "function", "function": {"name": "network_info", "description": "Network summary: interfaces and addresses, default route, listening sockets, DNS servers, and connectivity check.", "parameters": {"type": "object", "properties": {"check": {"type": "string"}}, "required": []}}},
    {"type": "function", "function": {"name": "package_info", "description": "Query installed and available packages: search, show details, list files of a package, or check the installed version. Read-only.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}, "action": {"type": "string", "enum": ["search", "info", "files", "installed"]}}, "required": ["query"]}}},
]

SYS = ("You are Universe AI, one of the core features and options of Universe OS, built by RM (Team RM). "
       "You are an ALWAYS-ON agent: when the user asks you to run a command, search, fetch a page, read or list files, "
       "check the system or write/edit a file, call the matching tool in that very turn - never ask for permission in "
       "text and never only describe the action. Before each tool call, output one short line explaining what you are "
       "doing and why. Prefer read-only commands first. After tool output, summarize the result for the user. "
       "If a tool result says (denied by user) or (refused...), accept it, do not retry, and tell the user.")

def rc(user, command, result, answer, lang="en"):
    return (user, [("run_command", {"command": command}, result)], answer, lang)

def rf(user, path, result, answer, lang="en"):
    return (user, [("read_file", {"path": path}, result)], answer, lang)

def ld(user, path, result, answer, lang="en"):
    return (user, [("list_dir", {"path": path}, result)], answer, lang)

def ws(user, query, result, answer, lang="en"):
    return (user, [("web_search", {"query": query}, result)], answer, lang)

def fu(user, url, result, answer, lang="en"):
    return (user, [("fetch_url", {"url": url}, result)], answer, lang)

def ef(user, path, content, result, answer, lang="en"):
    return (user, [("edit_file", {"path": path, "content": content}, result)], answer, lang)

def si(user, result, answer, lang="en"):
    return (user, [("system_info", {}, result)], answer, lang)

def mem(user, action, text, result, answer, lang="en"):
    return (user, [("remember", {"action": action, "text": text} if text else {"action": action}, result)], answer, lang)

def ok(user, query, result, answer, lang="en"):
    return (user, [("os_knowledge", {"query": query}, result)], answer, lang)

def sf(user, pattern, path, result, answer, lang="en"):
    return (user, [("search_files", {"pattern": pattern, "path": path}, result)], answer, lang)

def jl(user, unit, result, answer, lang="en"):
    return (user, [("journal_logs", {"unit": unit} if unit else {}, result)], answer, lang)

def pl(user, sort_by, count, result, answer, lang="en"):
    return (user, [("process_list", {"sort_by": sort_by, "count": count}, result)], answer, lang)

DF_OUT = """Filesystem     Type  Size  Used Avail Use% Mounted on
/dev/nvme0n1p8 ext4   95G   62G   29G  69% /
tmpfs          tmpfs  16G  214M   16G   2% /tmp
/dev/sdb1      vfat  7.3G  1.3G  6.0G  18% /run/media/rm/MM"""

TRAJ = [
    rc("check my disk usage", "df -hT", DF_OUT, "Your root filesystem (/) is 69% full - 29 GB free of 95 GB. The USB stick at /run/media/rm/MM has 6 GB free. Nothing critical yet, but / is worth watching."),
    rc("how much space is left on my disk?", "df -h", DF_OUT, "You have 29 GB free on the root filesystem (69% used). Everything else is comfortable."),
    rc("what's eating my RAM?", "free -h && ps aux --sort=-%mem | head -6", """              total  used  free  shared  buff/cache  available
Mem:           30G   11G  12G    1.2G         6.8G       19G
Swap:         5.3G  1.3G  4.0G

USER  PID %MEM %CPU COMMAND
rm 7213 12.4  3.2 chrome
rm 4102  6.1  0.4 gnome-shell""", "You have 19 GB available of 30 GB - memory is fine. The biggest consumer is Chrome (12% of RAM), then GNOME Shell. Swap is lightly used (1.3 GB)."),
    rc("which processes use the most CPU right now?", "ps aux --sort=-%cpu | head -8", """USER PID %CPU %MEM COMMAND
rm 8830 92.1 3.0 ffmpeg
rm 7213 12.4 3.2 chrome""", "ffmpeg is using 92% of one core - probably a running encode. Chrome is next at 12%. Nothing else is heavy."),
    rc("is anything listening on port 8080?", "ss -tlnp | grep :8080", "LISTEN 0 511 0.0.0.0:8080 0.0.0.0:* users:((\"node\",pid=9001,fd=21))", "Yes - a node process (PID 9001) is listening on port 8080 on all interfaces."),
    rc("show me the last errors from this boot", "journalctl -b -p err -n 20 --no-pager", "Sep 22 09:41:02 universe kernel: usb 1-3: device descriptor read/64, error -71\nSep 22 09:41:05 universe systemd[1]: Failed to start NetworkManager-wait-online.service.", "Two errors this boot: a USB device failed to enumerate (error -71 - often a bad cable or port), and NetworkManager-wait-online timed out. Neither is critical; the USB one is worth checking if a device misbehaves."),
    rc("is my firewall on?", "sudo ufw status", "Status: active\n\nTo                         Action      From\n--                         ------      ----\n22/tcp                     ALLOW       Anywhere", "Yes, UFW is active with one rule: SSH (22/tcp) allowed from anywhere. Everything else incoming is denied by default."),
    rc("check the status of the ollama service", "systemctl status ollama --no-pager", "● ollama.service - Ollama Service\n     Loaded: loaded (/etc/systemd/system/ollama.service; enabled)\n     Active: active (running) since Tue 2026-09-22 09:12:04 EDT\n   Main PID: 2311 (ollama)", "The ollama service is active and running since 09:12 today. Everything looks healthy."),
    rc("what kernel am I running?", "uname -r", "7.2.0-070200-generic", "You are running kernel 7.2.0-070200-generic."),
    rc("find files bigger than 500MB on my system", "find /home -xdev -type f -size +500M 2>/dev/null", "/home/rm/Desktop/Univerce-OS/Universe-OS-beta(v0.7.0).iso\n/home/rm/uai-venv/lib/python3.13/site-packages/torch/lib/libtorch_cuda.so", "Two files over 500 MB in your home: the Universe OS v0.7.0 ISO (about 2.1 GB) and PyTorch's CUDA library. Both are expected."),
    rc("what are the biggest directories in /var?", "du -xsh /var/* 2>/dev/null | sort -h | tail -6", "512M /var/lib/flatpak\n1.2G /var/log\n2.4G /var/cache\n3.1G /var/lib/snapd", "The heaviest are /var/lib/snapd (3.1 GB), /var/cache (2.4 GB) and /var/log (1.2 GB). Cleaning the APT cache and old snap revisions would free several GB."),
    rc("how long has this machine been up?", "uptime -p", "up 3 days, 7 hours, 42 minutes", "The machine has been up for 3 days, 7 hours and 42 minutes."),
    rc("what's my IP address?", "ip -br a | grep -v LOOPBACK", "wlan0  UP  192.168.1.42/24\nvirbr0 DOWN 192.168.122.1/24", "Your Wi-Fi interface (wlan0) has 192.168.1.42/24. The virbr0 bridge is down - normal unless you run VMs."),
    rc("count the files in my Downloads folder", "find ~/Downloads -maxdepth 1 -type f | wc -l", "142", "There are 142 files directly in ~/Downloads."),
    rc("when was the last boot?", "who -b", "system boot 2026-09-19 02:10", "The system last booted on September 19 at 02:10."),
    rc("show me the 5 newest files in /var/log", "ls -lht /var/log | head -6", "-rw-r----- 1 root adm 2.1M Sep 22 10:41 syslog\n-rw-r----- 1 root adm 890K Sep 22 10:40 auth.log\n-rw-r--r-- 1 root root 12K Sep 22 10:35 dpkg.log", "The newest logs are syslog (2.1 MB, updated a minute ago), auth.log and dpkg.log - all active and rotating normally."),
    rc("is docker running?", "systemctl is-active docker", "active", "Yes, the Docker service is active."),
    rc("what's in my /etc/hosts?", "cat /etc/hosts", "127.0.0.1\tlocalhost\n127.0.1.1\tuniverse\n::1\tip6-localhost ip6-loopback", "The hosts file is the stock one: localhost plus your machine name (universe). No custom entries."),
    rc("check if the USB stick is mounted", "lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINT | grep -v loop", "NAME    SIZE FSTYPE MOUNTPOINT\nsdb     7.3G vfat   /run/media/rm/MM", "Yes - the 7.3 GB USB stick (/dev/sdb1, vfat) is mounted at /run/media/rm/MM."),
    rc("show my last 10 shell commands", "fc -ln -10 2>/dev/null || history | tail -10", "git status\nollama list\ncd ~/Desktop\nls -la", "Your recent commands were about git, ollama and browsing directories."),
    rc("what's the temperature of my CPU?", "sensors 2>/dev/null | grep -E 'Package|Core' | head -4", "Package id 0:  +52.0°C  (high = +100.0°C, crit = +100.0°C)\nCore 0:        +50.0°C\nCore 1:        +52.0°C", "The CPU package is at 52°C - cool and comfortable. Nothing is close to throttling."),
    rc("check my battery level", "upower -i $(upower -e | grep BAT) 2>/dev/null | grep -E 'percentage|state'", "  percentage: 87%\n  state: discharging", "The battery is at 87% and discharging - about 4-5 hours of normal use left."),
    rc("find all python files in my project", "find ~/projects -name '*.py' -type f 2>/dev/null | head -20", "/home/rm/projects/app/main.py\n/home/rm/projects/app/utils.py\n/home/rm/projects/app/tests/test_app.py", "Found Python files in ~/projects/app - main.py, utils.py and a tests directory."),
    rc("check network connectivity", "ping -c 3 1.1.1.1", "3 packets transmitted, 3 received, 0% packet loss, time 2003ms\nrtt min/avg/max/mdev = 12.1/13.4/15.2/1.2 ms", "Network is fine: 3/3 packets to 1.1.1.1, average latency 13 ms, no loss."),
    rc("is my SSH server running?", "systemctl status ssh --no-pager | head -5", "● ssh.service - OpenBSD Secure Shell server\n     Active: active (running)", "Yes, the SSH server is active and running."),
    rc("delete the old log files", "rm -i /var/log/old/*.log", "(approval required: rm command)", "I asked for your approval before deleting anything - the rm command is waiting on the approval card. Approve it and I will clean the old logs."),
    rc("kill the stuck process 4477", "kill 4477", "(approval required: kill command)", "Killing a process needs your approval - the request is on the approval card. If you confirm, the process will receive SIGTERM."),
    rc("install htop", "sudo apt install -y htop", "(approval required: sudo command)", "Installing software needs root, so I put the exact command on the approval card for you to confirm."),
    rc("show all open ports and the processes behind them", "ss -tulpn", "Netid State  Local Address:Port  Process\ntcp   LISTEN 0.0.0.0:22           sshd\ntcp   LISTEN 127.0.0.1:11434      ollama\ntcp   LISTEN 0.0.0.0:8080         node", "Three listeners: sshd on 22, ollama on 127.0.0.1:11434 (local only) and a node process on 8080."),
    rc("check if /etc/fstab has errors", "findmnt --verify 2>&1 | tail -3", "0 parse errors, 0 errors, 1 warning\n/etc/fstab: btrfs subvolumes are not verified", "fstab parses cleanly - 0 errors, just one harmless warning about BTRFS subvolumes."),
    rc("how many packages are installed?", "dpkg -l | grep -c '^ii'", "2847", "You have 2,847 installed packages."),

    rf("read my /etc/os-release", "/etc/os-release", "NAME=\"Universe OS\"\nVERSION=\"v0.7.0 (Ubuntu 24.04.4 LTS)\"\nID=universe-os\nID_LIKE=debian", "You are on Universe OS v0.7.0 (built on Ubuntu 24.04.4 LTS)."),
    rf("show me my shell config", "~/.zshrc", "# zsh config\nexport EDITOR=nano\nalias ll='ls -lah'\nalias gs='git status'", "Your ~/.zshrc is small and tidy: editor set to nano, plus ll and gs aliases. Nothing unusual."),
    rf("read the script I wrote yesterday", "~/universe-workspace/backup.sh", "#!/bin/bash\nset -euo pipefail\ntar -czf ~/backups/home-$(date +%F).tar.gz ~/Documents", "It is a backup script: it tars ~/Documents into ~/backups/home-<date>.tar.gz with strict error handling (set -euo pipefail). Looks correct."),
    rf("what is in /etc/fstab?", "/etc/fstab", "UUID=abcd-1234 / btrfs subvol=@ 0 1\nUUID=abcd-1234 /home btrfs subvol=@home 0 2\n/swapfile none swap sw 0 0", "fstab mounts the BTRFS root subvolume @, /home as @home, and a swapfile. Clean and standard for Universe OS."),
    rf("check the config file of the app", "~/projects/app/config.json", "{\n  \"port\": 8080,\n  \"debug\": false,\n  \"db\": \"postgres://localhost/app\"\n}", "The app config sets port 8080, debug off, and a local Postgres database."),

    ld("what's in my home directory?", "~", "d 4096  Desktop/\nd 4096  Documents/\nd 4096  Downloads/\n- 2201  notes.md\nd 4096  projects/", "Your home has the usual Desktop, Documents, Downloads and projects folders plus a notes.md file."),
    ld("list the files in Downloads", "~/Downloads", "- 15M   universe-ai-model.tar.zst\n- 2.1G  Universe-OS-beta(v0.7.0).iso\n- 890K  report.pdf", "Downloads has three items: the model archive (15 MB), the Universe OS v0.7.0 ISO (2.1 GB) and a PDF report."),
    ld("what configs are in /etc/nginx?", "/etc/nginx", "d 4096  sites-enabled/\nd 4096  sites-available/\n- 1440  nginx.conf\n- 687   mime.types", "The nginx layout is standard: nginx.conf, mime.types and the sites-enabled / sites-available directories."),
    ld("show me what's in /var/log", "/var/log", "- 2.1M  syslog\n- 890K  auth.log\n- 12K   dpkg.log\nd 4096  journal/", "Logs are present and small: syslog 2.1 MB, auth.log 890 KB, dpkg.log 12 KB, plus the systemd journal directory."),

    si("give me a full system overview", "OS: Universe OS v0.7.0 (Ubuntu 24.04.4 LTS)\nKernel: 7.2.0-070200-generic\nHost: universe\nUptime: 3d 7h 42m\nCPU: Intel(R) Core(TM) Ultra 9 275HX (24 threads)\nLoad (1/5/15m): 0.42 / 0.55 / 0.61\nMemory: 11.2 used / 30.0 GB (19.0 available)\nDisk /: 62 used / 95 GB (29 free)\nNetwork: wlan0 192.168.1.42\nGPU: NVIDIA GeForce RTX 5070 Ti, 9 %, 4096 MiB, 12227 MiB, 47 C", "Here is the summary: Universe OS v0.7.0 on kernel 7.2.0, up 3 days. Load is light (0.42). 19 GB RAM available of 30. Root disk 69% used. Wi-Fi at 192.168.1.42. The RTX 5070 Ti is idle at 47°C."),
    si("how is my machine doing?", "OS: Universe OS v0.7.0\nKernel: 7.2.0-070200-generic\nUptime: 1d 2h 10m\nCPU: Intel(R) Core(TM) Ultra 9 275HX (24 threads)\nLoad (1/5/15m): 0.10 / 0.20 / 0.15\nMemory: 4.1 used / 30.0 GB (25.0 available)\nDisk /: 30 used / 95 GB (65 free)\nBattery: 92% (Discharging)", "Everything is comfortable: light load (0.10), 25 GB RAM free, 65 GB disk free, battery at 92%. No pressure anywhere."),

    ws("what is the latest mainline Linux kernel version?", "web_search: latest mainline Linux kernel version", "1. kernel.org - The Linux Kernel Archives\n   https://kernel.org\n   Latest mainline: 7.3-rc2 released 2026-09-21...\n2. Phoronix - Linux 7.3 features\n   https://phoronix.com\n   Merge window closed...", "The latest mainline release is 7.3-rc2 (September 21, 2026), according to kernel.org. Stable series are still on 7.2.x."),
    ws("search the web for Qwen3-4B-Instruct benchmarks", "web_search: Qwen3-4B-Instruct benchmarks tool calling", "1. Qwen Blog - Qwen3-4B-Instruct-2507\n   https://qwenlm.github.io\n   Leads BFCL v4 tool-calling among open 4B models...\n2. Hugging Face - model card\n   https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507\n   Apache-2.0...", "The search confirms Qwen3-4B-Instruct-2507 leads tool-calling benchmarks (BFCL v4) among open 4B models, under Apache-2.0."),
    ws("what's the weather in Tehran today?", "web_search: Tehran weather today", "1. weather.com - Tehran, Iran\n   https://weather.com/...\n   Today: sunny, 31°C high / 19°C low...", "Today in Tehran: sunny, high around 31°C and low 19°C."),
    ws("who won the last F1 race?", "web_search: last F1 race winner", "1. formula1.com - Race report\n   https://formula1.com\n   ... wins the Grand Prix after a late pit stop gamble...", "According to formula1.com, the last Grand Prix was won after a late pit-stop gamble - check the race report for the full story."),
    ws("find the best way to back up a BTRFS system", "web_search: btrfs backup best practices snapper send receive", "1. BTRFS wiki - Incremental backups\n   https://btrfs.wiki.kernel.org\n   btrfs send / receive for incremental snapshots...\n2. snapper documentation\n   http://snapper.io\n   Timeline snapshots + cleanup algorithms...", "The standard approach: snapper for timeline snapshots plus btrfs send/receive for off-machine incremental backups. The BTRFS wiki and snapper docs both cover it."),

    fu("read me the release notes at kernel.org", "https://kernel.org/", "Linux Kernel Archives\n\nLatest Release: 7.3-rc2 (2026-09-21)\nStable: 7.2.7, 6.12.48, 6.6.98\n\n[more text]", "kernel.org lists 7.3-rc2 as the latest mainline (Sep 21), with stable branches 7.2.7, 6.12.48 and 6.6.98."),
    fu("fetch the ollama docs page about modelfiles", "https://github.com/ollama/ollama/blob/main/docs/modelfile.md", "Modelfile reference\n\nFROM - the base model\nPARAMETER - set runtime parameters\nTEMPLATE - the full prompt template\nSYSTEM - the system message\nADAPTER - apply a LoRA adapter\nLICENSE - the license text", "The Modelfile reference covers FROM, PARAMETER, TEMPLATE, SYSTEM, ADAPTER and LICENSE - including ADAPTER for LoRA adapters."),

    ef("write a small python script that prints the disk usage", "~/universe-workspace/disk.py", "import shutil\nt = shutil.disk_usage('/')\nprint(f'used {t.used/2**30:.1f} of {t.total/2**30:.1f} GiB')", "created ~/universe-workspace/disk.py (110 bytes)", "Created ~/universe-workspace/disk.py. I will run it to verify - one moment."),
    ef("create a systemd unit for my app", "~/universe-workspace/myapp.service", "[Unit]\nDescription=My App\n\n[Service]\nExecStart=/usr/bin/myapp\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target", "created ~/universe-workspace/myapp.service (140 bytes)", "The unit file is ready at ~/universe-workspace/myapp.service. To install it: copy to /etc/systemd/system/, then daemon-reload and enable - both need approval."),
    ef("save this idea as a note file", "~/universe-workspace/ideas.md", "# Ideas\n- offline-first note taking\n- pet that follows the cursor", "created ~/universe-workspace/ideas.md (76 bytes)", "Saved the two ideas to ~/universe-workspace/ideas.md."),

    mem("remember that my project folder is ~/projects/universe", "save", "my project folder is ~/projects/universe", "noted - 1 note(s) kept", "Noted - I will remember that your project folder is ~/projects/universe."),
    mem("remember I prefer short answers", "save", "prefers short answers", "noted - 2 note(s) kept", "Saved. I will keep my answers short from now on."),
    mem("what do you remember about me?", "list", None, "1. [2026-09-22] my project folder is ~/projects/universe\n2. [2026-09-22] prefers short answers", "I keep two notes: your project folder is ~/projects/universe, and you prefer short answers."),
    mem("forget the note about short answers", "delete", "short answers", "deleted 1 note(s), 1 kept", "Done - I removed that note. One note remains (the project folder)."),

    ("check the disk and if it is above 80% find the biggest folders", [("run_command", {"command": "df -h / | tail -1"}, "/dev/nvme0n1p8 95G 92G 2.3G 98% /"), ("run_command", {"command": "du -xsh /home/* /var/* 2>/dev/null | sort -h | tail -5"}, "2.4G /var/cache\n3.1G /var/lib/snapd\n12G /home/rm/uai-venv\n38G /home/rm/Desktop")], "The root disk is 98% full, so I checked the big folders: Desktop (38 GB), the uai-venv Python environment (12 GB), snapd (3.1 GB) and /var/cache (2.4 GB). Cleaning the APT cache and old snaps would free about 5 GB; the Desktop is the real heavyweight."),
    ("create a script that says hello and run it", [("edit_file", {"path": "~/universe-workspace/hello.sh", "content": "#!/bin/bash\necho \"Hello from Universe AI\""}, "created ~/universe-workspace/hello.sh (46 bytes)"), ("run_command", {"command": "bash ~/universe-workspace/hello.sh"}, "Hello from Universe AI")], "Created the script and ran it - the output is: Hello from Universe AI."),
    ("check if port 3000 is free and if not tell me what is on it", [("run_command", {"command": "ss -tlnp | grep :3000"}, "LISTEN 0 511 127.0.0.1:3000 users:((\"node\",pid=7712,fd=19))")], "Port 3000 is taken - a node process (PID 7712) is listening on 127.0.0.1:3000."),
    ("what is my public IP?", [("run_command", {"command": "curl -s ifconfig.me"}, "203.0.113.42")], "Your public IP is 203.0.113.42."),
    ("find out which service is failing at boot", [("run_command", {"command": "systemctl --failed --no-pager"}, "UNIT LOAD ACTIVE SUB DESCRIPTION\n● bluetooth.service loaded failed failed Bluetooth service"), ("run_command", {"command": "journalctl -u bluetooth -b -n 10 --no-pager"}, "bluetoothd[1201]: Failed to set mode: Blocked through rfkill (0x12)")], "One unit failed: bluetooth.service. The log shows the controller is blocked through rfkill - run 'rfkill unblock bluetooth' (needs approval) and restart the service."),

    rc("¿Cuánto espacio queda en mi disco?", "df -h / | tail -1", "/dev/nvme0n1p8 95G 62G 29G 69% /", "Quedan 29 GB libres en el sistema de archivos raíz (69% usado). Todo en orden.", "es"),
    si("Dame un resumen del sistema", "OS: Universe OS v0.7.0\nKernel: 7.2.0-070200-generic\nUptime: 1d 2h 10m\nMemory: 4.1 used / 30.0 GB (25.0 available)\nDisk /: 30 used / 95 GB (65 free)", "Resumen: Universe OS v0.7.0, kernel 7.2.0, 1 día encendido. 25 GB de RAM libres y 65 GB de disco libre. Todo cómodo.", "es"),
    rc("检查一下磁盘空间", "df -hT", DF_OUT, "根文件系统 (/) 已用 69%——95 GB 中剩余 29 GB。U 盘还有 6 GB 可用。", "zh"),
    rc("Quel processus utilise le plus de CPU ?", "ps aux --sort=-%cpu | head -4", "USER PID %CPU %MEM COMMAND\nrm 8830 92.1 3.0 ffmpeg", "ffmpeg consomme 92% d'un cœur — probablement un encodage en cours. Rien d'autre de lourd.", "fr"),
    rc("проверь свободное место на диске", "df -h / | tail -1", "/dev/nvme0n1p8 95G 62G 29G 69% /", "На корневом разделе свободно 29 ГБ из 95 (использовано 69%). Всё в норме.", "ru"),
    rc("كيف أتحقق من حالة الجدار الناري؟", "sudo ufw status", "Status: active\n\nTo Action From\n-- ------ ----\n22/tcp ALLOW Anywhere", "الجدار الناري (UFW) مفعّل، مع قاعدة واحدة تسمح بـ SSH على المنفذ 22. كل ما عدا ذلك مرفوض افتراضيًا.", "ar"),
    si("sistemin genel durumunu göster", "OS: Universe OS v0.7.0\nKernel: 7.2.0-070200-generic\nMemory: 4.1 used / 30.0 GB (25.0 available)\nDisk /: 30 used / 95 GB (65 free)", "Özet: Universe OS v0.7.0, çekirdek 7.2.0. 30 GB RAM'in 25 GB'ı ve 95 GB diskin 65 GB'ı boş — sistem rahat görünüyor.", "tr"),
    rc("チェック: ディスクの空き容量は?", "df -h / | tail -1", "/dev/nvme0n1p8 95G 62G 29G 69% /", "ルートファイルシステムの空きは29 GB（使用率69%）です。問題ありません。", "ja"),
ok("how does the sudo gate work in Universe OS?", "how does sudo work", """Universe OS - Privilege gate (sudo)
sudo is a symlink to universe-privilege. Every root request opens a GTK consent dialog showing:
  - the requesting app and category
  - the exact command line
  - grant durations: once / this session / 5 min / 30 min / 1 hour
  - dangerous commands highlighted in red; a 45-second timeout auto-denies
Headless sessions deny by default (UAI_ASSUME_NO_DISPLAY=1 overrides).""",
 "In Universe OS, sudo is not the classic sudo: it is a symlink to universe-privilege, which opens a graphical consent dialog for every root request. The dialog shows the app, the category and the exact command, highlights dangerous commands in red, and lets you grant access once, for the session, or for 5/30/60 minutes; without a display it denies by default."),
ok("what modes does Universe OS have?", "modes", """Universe OS - Modes
standard   everyday desktop, default wallpapers
developer  dev toolchain, violet-black accent, dev packages preinstalled
hacker     full pentest lab (nmap, sqlmap, metasploit, aircrack-ng), green-black accent
server     no GUI, headless services
Switch: Universe Settings -> Appearance, or universe-appearance on the CLI.
Mode is read at login by the theme engine and by universe-appearance --mode.""",
 "Four modes: standard (everyday desktop), developer (dev toolchain, violet-black accent), hacker (full pentest lab with nmap, sqlmap, metasploit and aircrack-ng, green-black accent) and server (headless). You switch in Universe Settings -> Appearance, or with universe-appearance from the terminal."),
ok("what is the security score made of?", "security score", """Universe OS - Security Score (0-100)
  UFW firewall enabled .......... 35
  AppArmor enabled .............. 15
  enforced AppArmor profiles .... up to 25
  BTRFS snapshots (@snapshots) .. 15
  Flatpak sandboxing ............ 10
The dashboard links every item to the exact page that fixes it.""",
 "The Security Score is 0-100: firewall (UFW) 35 points, AppArmor 15, enforced profiles up to 25, BTRFS snapshots 15, and Flatpak sandboxing 10. Start from the lowest category - each item links to the page that fixes it."),
ok("known pitfalls when building the ISO?", "pitfalls iso build", """Universe OS - Known pitfalls (excerpt)
  - casper must be installed inside the chroot or the live session drops to initramfs
  - the ISO volume label must stay ASCII: a non-ASCII label breaks the boot menu
  - grub.cfg must be regenerated after every kernel change inside the chroot
  - /etc/skel permissions: 0755 directories, 0644 files, or new users inherit broken perms
  - squashfs must be built with -comp xz -b 1M for a reliable boot on old firmware
  - do not ship /var/lib/dbus/machine-id - it must be regenerated on first boot""",
 "Top ISO-build pitfalls: casper missing in the chroot (drops to initramfs), non-ASCII volume label (breaks the boot menu), stale grub.cfg after a kernel change, wrong /etc/skel permissions, and a shipped machine-id that must instead be regenerated on first boot."),
ok("how do I debug a service that will not start?", "troubleshoot service", """Universe OS - Playbook: service will not start
1. systemctl status NAME          -> exact error line
2. journalctl -u NAME -n 100      -> the service's own log
3. systemd-analyze verify UNIT    -> syntax of the unit file
4. ss -tlnp | grep :PORT          -> is the port already taken?
5. sudo systemctl daemon-reload   -> after editing the unit
Common Universe OS twist: the service may call a privileged helper through the
gate; a denied dialog leaves 'permission denied' in the journal.""",
 "Run systemctl status NAME for the exact error, then journalctl -u NAME -n 100 for the service's own log, verify the unit with systemd-analyze verify, and check the port with ss -tlnp. In Universe OS also check the journal for a denied privilege-gate dialog - a denied request looks like a permission error."),
ok("what happens at boot in Universe OS?", "boot sequence", """Universe OS - Boot chain
UEFI -> GRUB (universe theme) -> vmlinuz + initrd -> systemd
  - universe-boot-splash draws the logo while services start
  - universe-appearance applies the mode theme at session start
  - universe-firstboot runs once: creates the user, applies the chosen mode
  - universe-monitor and the AI panel autostart with the session
Secure Boot: shim + signed GRUB; custom kernels need re-signing.""",
 "The chain is UEFI -> GRUB (Universe theme) -> kernel + initrd -> systemd. Universe-specific pieces: universe-boot-splash draws the boot logo, universe-appearance applies the mode theme at session start, and universe-firstboot runs once to create the user and apply the chosen mode. Secure Boot uses shim plus a signed GRUB; custom kernels must be re-signed."),
ok("how do snapshots and rollback work?", "snapshots rollback", """Universe OS - Snapshots (BTRFS + snapper)
Subvolumes: @ (root), @home, @snapshots.
snapper timelines run hourly by default; the installer also takes a pre-update snapshot.
Rollback: sudo snapper rollback N   (then reboot)
Manual:   sudo btrfs subvolume snapshot -r / /.snapshots/now
Check:    sudo snapper list""",
 "Universe OS uses BTRFS with @, @home and @snapshots subvolumes and snapper timelines (hourly by default, plus a pre-update snapshot). Roll back with sudo snapper rollback N and reboot; take a manual read-only snapshot with btrfs subvolume snapshot -r."),
ok("why is my Wi-Fi password never in the process list?", "wifi security stdin", """Universe OS - Network security detail
Universe Settings -> Network passes the Wi-Fi passphrase over stdin to
NetworkManager instead of the command line, so it never appears in `ps` output
or in the process list. Same rule applies to the privilege gate: secrets go
through stdin or the keyring, never argv.""",
 "Because the network panel passes the passphrase to NetworkManager over stdin instead of the command line - so it never shows up in ps output. The same rule applies to the privilege gate: secrets go through stdin or the keyring, never argv."),
jl("why did my service fail last night?", None, """Sep 21 23:14:02 universe systemd[1]: Starting backup.service...
Sep 21 23:14:02 universe backup.sh[4821]: rsync: connection unexpectedly closed
Sep 21 23:14:03 universe backup.sh[4821]: exit status 12
Sep 21 23:14:03 universe systemd[1]: backup.service: Main process exited, code=exited, status=12/n/a
Sep 21 23:14:03 universe systemd[1]: backup.service: Failed with result 'exit-code'.""",
 "The backup service failed at 23:14 with exit status 12 from rsync - 'connection unexpectedly closed', which is a network or SSH drop mid-transfer. Nothing on the local disk failed; check the remote host and rerun."),
jl("check the ssh unit logs", "ssh", """Sep 22 09:01:11 universe sshd[2210]: Accepted publickey for rm from 192.168.1.20 port 51422
Sep 22 09:12:40 universe sshd[2298]: Failed password for invalid user admin from 45.61.x.x port 40222
Sep 22 09:12:41 universe sshd[2298]: Connection closed by invalid user admin 45.61.x.x""",
 "The ssh unit is healthy: your key login from 192.168.1.20 succeeded at 09:01. There was one failed attempt at 09:12 from 45.61.x.x trying user 'admin' - a routine internet scan. Password auth is refused for invalid users, so no action needed."),
jl("any errors in the journal right now?", None, """Sep 22 10:02:14 universe kernel: nvme0n1: I/O error, dev nvme0n1, sector 488397168
Sep 22 10:02:15 universe kernel: blk_update_request: I/O error, dev nvme0n1
Sep 22 10:02:16 universe smartd[812]: Device: /dev/nvme0n1, FAILED SMART self-check""",
 "There is a real problem: the kernel logged I/O errors on nvme0n1 and smartd reports a FAILED SMART self-check. Back up your important data now, then check the drive with sudo smartctl -a /dev/nvme0n1 before writing anything else to it."),
pl("what is using my cpu?", "cpu", 8, """USER  PID %CPU %MEM COMMAND
rm    9241 91.2  3.1  ffmpeg -i capture.mkv -c:v libx264 out.mp4
rm    1180  4.8  1.2  gnome-shell
root   812   1.1  0.4  systemd-journald
rm    7712  0.9  8.6  firefox
rm    640   0.4  0.3  pipewire""",
 "One process dominates: ffmpeg (PID 9241) is using 91% of the CPU re-encoding capture.mkv. Everything else is normal. If you did not start that encode, stop it with kill 9241."),
pl("top memory consumers please", "mem", 6, """USER  PID %MEM %CPU COMMAND
rm    7712 18.4  0.9  firefox
rm    9241  9.2 91.2  ffmpeg -i capture.mkv -c:v libx264 out.mp4
rm    1180  3.4  4.8  gnome-shell
rm    7051  2.1  0.1  code
root   812   0.6  1.1  systemd-journald""",
 "Firefox is the biggest memory consumer at 18.4%, followed by the ffmpeg encode at 9.2%. Nothing is close to exhausting RAM; no action needed."),
sf("find my project notes", "notes", "/home/rm", """3 matches:
/home/rm/Documents/notes/universe-notes.md
/home/rm/Documents/notes/kernel-notes.md
/home/rm/Desktop/meeting-notes.txt""",
 "Found 3 files matching 'notes': two in ~/Documents/notes (universe-notes.md and kernel-notes.md) and meeting-notes.txt on the Desktop. Which one should I open?"),
sf("where are the log files?", "*.log", "/var/log", """/var/log/syslog.log
/var/log/universe-boot.log
/var/log/universe-firstboot.log
/var/log/Xorg.0.log""",
 "Four log files under /var/log, including the Universe-specific ones: universe-boot.log and universe-firstboot.log. The first-boot log is the one to read if the initial setup misbehaved."),
sf("find any .iso on disk", "*.iso", "/home/rm", """/home/rm/Desktop/Univerce-OS/Universe-OS-beta(v0.7.0).iso""",
 "One ISO found: Universe-OS-beta(v0.7.0).iso on the Desktop - that is the current beta image."),
("check the disk and then tell me if the usb is still mounted", [("run_command", {"command": "df -hT"}, """Filesystem     Type  Size  Used Avail Use% Mounted on
/dev/nvme0n1p2 ext4   95G   71G   24G  75% /
tmpfs          tmpfs  16G  214M   16G   2% /tmp
/dev/sdb1      exfat 29G   18G   11G  62% /run/media/rm/MM"""),
 ("run_command", {"command": "findmnt -no SOURCE,TARGET,FSTYPE /run/media/rm/MM"}, "/dev/sdb1 /run/media/rm/MM exfat")],
 "The USB stick is still mounted at /run/media/rm/MM (exfat, 11 GB free). The root filesystem is at 75%. Unmount with udisksctl unmount -b /dev/sdb1 when you are done."),
("the wifi dropped again - can you look?", [("run_command", {"command": "nmcli device status"}, """DEVICE  TYPE      STATE         CONNECTION
wlan0   wifi      disconnected  --
eth0    ethernet  connected     Wired connection 1"""),
 ("run_command", {"command": "journalctl -u NetworkManager -n 20 --no-pager | tail -8"}, """Sep 22 14:02:11 universe NetworkManager[690]: <info> [wlan0] device state change: activated -> deactivating
Sep 22 14:02:11 universe NetworkManager[690]: <warn> [wlan0] association failed: reason 4
Sep 22 14:02:12 universe NetworkManager[690]: <info> [wlan0] device state change: deactivating -> disconnected"""),
 ("run_command", {"command": "rfkill list"}, """0: phy0: Wireless LAN
\tSoft blocked: no
\tHard blocked: no""")],
 "wlan0 is disconnected with 'association failed: reason 4' - that is usually a wrong password or a rejected profile, not a hardware block (rfkill shows nothing blocked). Ethernet is fine, so you are still online. Try: nmcli connection up 'MyWifi' - and if it fails again, delete the profile and reconnect."),
("read my notes file and summarize it", [("list_dir", {"path": "/home/rm/Documents"}, """drwxr-xr-x  notes/
-rw-r--r--  todo.txt (1.2 KB)
-rw-r--r--  budget.csv (4.8 KB)"""),
 ("read_file", {"path": "/home/rm/Documents/todo.txt", "max_lines": 40}, """1. renew domain
2. test ISO on old laptop
3. backup photos to external drive
4. update resume
5. check BTRFS scrub results""")],
 "Your todo.txt has 5 items: renew the domain, test the ISO on the old laptop, back up photos to an external drive, update your resume, and check the BTRFS scrub results. The notes/ folder exists but I read todo.txt - tell me if you meant a file inside notes/."),
("create a small script that shows system health and make it executable", [("edit_file", {"path": "/home/rm/bin/health.sh", "content": "#!/bin/bash\nset -e\necho \"== uptime ==\"; uptime\necho \"== memory ==\"; free -h\necho \"== disk ==\"; df -hT /\necho \"== failed units ==\"; systemctl --failed --no-legend || true\n"}, "written /home/rm/bin/health.sh (238 bytes)"),
 ("run_command", {"command": "chmod +x /home/rm/bin/health.sh && /home/rm/bin/health.sh"}, """== uptime ==
 14:31:02 up 3:12, 1 user, load average: 0.42, 0.31, 0.28
== memory ==
              total  used  free  available
Mem:           30G   11G   12G        19G
== disk ==
Filesystem  Type  Size  Used Avail Use% Mounted on
/dev/nvme0n1p2 ext4  95G   71G   24G  75% /
== failed units ==
(no output)""")],
 "Done - I wrote /home/rm/bin/health.sh, made it executable and ran it. It reports uptime, memory, root disk usage and failed units. Right now: load is low, 19 GB RAM available, / at 75%, and no failed units."),
("what is my public ip and is the vpn up?", [("run_command", {"command": "ip -br addr show tun0 2>/dev/null; curl -s --max-time 8 https://ifconfig.me"}, "tun0  UNKNOWN  10.8.0.6/24\n203.0.113.77"),
 ("run_command", {"command": "ip route get 1.1.1.1 | head -1"}, "1.1.1.1 via 10.8.0.1 dev tun0 src 10.8.0.6")],
 "The VPN is up: tun0 has 10.8.0.6/24 and the default route to 1.1.1.1 goes through tun0. Your public address appears as 203.0.113.77 - note that is the exit node's address, not your ISP's."),
("check if the firewall is on and what ports are open", [("run_command", {"command": "sudo ufw status verbose"}, """Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
8080/tcp                   ALLOW IN    Anywhere"""),
 ("run_command", {"command": "ss -tlnp | head -8"}, """State  Recv-Q Send-Q Local Address:Port  Peer Address:Port
LISTEN 0      128          0.0.0.0:22         0.0.0.0:*
LISTEN 0      511          0.0.0.0:8080       0.0.0.0:*
LISTEN 0      128        127.0.0.1:631        0.0.0.0:*
LISTEN 0      4096       127.0.0.53:53       0.0.0.0:*""")],
 "The firewall is active with default deny for incoming traffic. Two ports are explicitly open: 22 (SSH) and 8080. The listening sockets match - 631 (CUPS) and 53 (systemd-resolved) are localhost-only, which is correct."),
("write a report of the last 10 errors and save it", [("run_command", {"command": "journalctl -p err -n 10 --no-pager"}, """Sep 22 10:02:14 universe kernel: nvme0n1: I/O error, sector 488397168
Sep 22 09:41:03 universe gdm[1180]: Gdm: Failed to start session
Sep 22 09:40:55 universe systemd[1]: Failed to start User Manager for UID 1000"""),
 ("edit_file", {"path": "/home/rm/Documents/errors-report.txt", "content": "Error report - 2026-09-22\n\n1. nvme0n1 I/O error at sector 488397168 (10:02) - check smartctl\n2. GDM failed to start session (09:41)\n3. User Manager for UID 1000 failed (09:40)\n"}, "written /home/rm/Documents/errors-report.txt (196 bytes)")],
 "Report saved to /home/rm/Documents/errors-report.txt with the 10 most recent error-level entries. The most serious is the nvme0n1 I/O error - I would run sudo smartctl -H /dev/nvme0n1 before anything else."),
("install htop for me", [("run_command", {"command": "sudo apt install -y htop"}, """(privilege gate) approval requested: apt install htop - category: packages
(privilege gate) approved for this session
Reading package lists... Done
Setting up htop (3.3.0-4) ..."""),
 ("run_command", {"command": "htop --version"}, "htop 3.3.0")],
 "htop is installed (3.3.0) - the privilege gate asked for approval and you granted it for the session. Run htop in a terminal to use it."),
mem("set a reminder note about the ISO test", "add", "test the ISO on the old laptop", "saved note #7: 'test the ISO on the old laptop'", "Saved. Note #7: 'test the ISO on the old laptop'. I will keep it in the notes list - ask me for notes anytime to see the full list."),
mem("what notes do I have?", "list", None, """1. renew domain
2. backup photos to external drive
7. test the ISO on the old laptop""", "You have three notes: renew the domain, back up photos to an external drive, and test the ISO on the old laptop. Anything to add or remove?"),
mem("remove the domain note, already done", "delete", "renew domain", "deleted note #1", "Removed note #1 (renew domain). Two notes remain: back up photos, and test the ISO."),
si("what is my system running on?", """OS:        Universe OS v0.7.0 (Ubuntu 24.04 base)
Kernel:    6.14.0-29-generic
Uptime:    3h 12m
CPU:       AMD Ryzen 7 8845HS (16) @ 4.9GHz
Memory:    11.2G / 30.6G (19.4G available)
Swap:      1.3G / 5.3G
Disk (/):  71G / 95G (75%)
Battery:   78% (discharging, 3h 41m left)
GPU:       NVIDIA RTX 5070 Ti Laptop / AMD Radeon 780M
Network:   eth0 192.168.1.10, wlan0 down, tun0 10.8.0.6""",
 "You are on Universe OS v0.7.0 (Ubuntu 24.04 base), kernel 6.14, AMD Ryzen 7 8845HS with 30 GB RAM. Disk is 75% full, battery 78% with about 3h41m left, and the NVIDIA RTX 5070 Ti plus the AMD iGPU are both present. Ethernet and the VPN are up; Wi-Fi is down."),
("how do I run a BTRFS scrub and check the result?", [("os_knowledge", {"query": "btrfs scrub"}, """Universe OS - BTRFS scrub
Start:  sudo btrfs scrub start -B /
Status: sudo btrfs scrub status /
Read errors and csum errors are the two counters that matter; anything above 0
points at failing hardware. Schedule monthly with btrfs-scrub.timer."""),
 ("run_command", {"command": "sudo btrfs scrub status /"}, """UUID:             3f8b2c1a-...
Scrub started:    Sun Sep 21 02:00:01 2026
Status:           finished
Duration:         0:12:44
Data scrubbed:    412.30GiB
Total to scrub:   412.30GiB
Rate:             551.80MiB/s
Error summary:    no errors found""")],
 "Your last scrub finished in 12m44s over 412 GB with 'no errors found' - the filesystem and the drive's checksums agree, so nothing to worry about. Run sudo btrfs scrub start -B / when you want a fresh pass."),
("is my ssd healthy?", [("run_command", {"command": "sudo smartctl -H -A /dev/nvme0n1 | grep -E 'SMART|Percentage|Available|Media|Unsafe' | head -8"}, """SMART overall-health self-assessment test result: PASSED
Percentage Used:                    12%
Available Spare:                    100%
Media and Data Integrity Errors:    0
Unsafe Shutdowns:                    23"""),
 ("run_command", {"command": "sudo nvme smart-log /dev/nvme0 | grep -iE 'temperature|critical|percentage_used' | head -4"}, """temperature                         : 41 C (314 K)
critical_warning                    : 0
percentage_used                     : 12%""")],
 "The SSD is healthy: SMART PASSED, 12% of rated endurance used, 100% spare remaining, zero integrity errors, and 41 C at idle. The 23 unsafe shutdowns are worth watching but not alarming."),
("the system feels slow - can you check the basics?", [("run_command", {"command": "uptime && free -h | head -2 && vmstat 1 3"}, """ 15:02:11 up 4:02, 1 user, load average: 5.82, 4.91, 3.40
              total  used  free  available
Mem:           30G   27G   0.8G        1.9G
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 6  3 1.3G  812M  120M  2.1G   12   48  8200  6100  920 2100 22  9 61  8  0"""),
 ("process_list", {"sort_by": "cpu", "count": 5}, """USER  PID %CPU %MEM COMMAND
rm    9241 82.4 12.2  ffmpeg -i capture.mkv -c:v libx264 out.mp4
rm    7051 21.0  4.1  code
rm    7712  8.4 18.4  firefox
rm    1180  4.8  3.4  gnome-shell
root   812   1.1  0.6  systemd-journald""")],
 "The machine is under real load (5.8 average, 6 processes waiting, 8% iowait) and it is not a mystery: ffmpeg is using 82% CPU and 12% RAM on that encode, while VS Code and Firefox add more. Available memory is down to 1.9 GB. Finish or pause the encode and the system will settle."),
("can you check if anything is listening on port 8080?", [("run_command", {"command": "ss -tlnp | grep :8080 || echo 'nothing on 8080'"}, """LISTEN 0 511 0.0.0.0:8080 0.0.0.0:*
users:(("python3",pid=5310,fd=3))"""),
 ("run_command", {"command": "ps -p 5310 -o pid,etime,cmd --no-headers"}, "5310  01:22:44  python3 -m http.server 8080")],
 "Yes - a Python http.server (PID 5310) has been listening on 0.0.0.0:8080 for 1h22m. It is serving whatever directory it was started in, and it is reachable from your network; stop it with kill 5310 if you do not need it."),
("find large files over 1gb in my home", [("run_command", {"command": "find /home/rm -xdev -type f -size +1G -exec ls -lh {} \\; 2>/dev/null | awk '{print $5, $9}'"}, """8.4G /home/rm/Videos/capture.mkv
2.1G /home/rm/Downloads/ubuntu-24.04.iso
1.4G /home/rm/.cache/ffmpeg/scratch.tmp"""),
 ("os_knowledge", {"query": "disk cleanup"}, """Universe OS - Disk cleanup hints
  - universe-monitor -> Disks shows a visual treemap
  - safe targets: ~/.cache, journal vacuum, apt clean, old snapshots
  - never delete /var/lib/universe-* or @snapshots entries by hand""")],
 "Three files over 1 GB in your home: capture.mkv (8.4 GB), the Ubuntu ISO (2.1 GB) and a 1.4 GB ffmpeg scratch file in ~/.cache - that last one is safe to delete. universe-monitor -> Disks can show you the same picture visually."),
("my laptop battery is draining fast, what should I check?", [("run_command", {"command": "upower -i $(upower -e | grep BAT) | grep -E 'state|percentage|energy-full|energy-rate' | head -6"}, """state:          discharging
percentage:     41%
energy-full:    52.4 Wh
energy-rate:    24.6 W"""),
 ("process_list", {"sort_by": "cpu", "count": 4}, """USER  PID %CPU %MEM COMMAND
rm    9241 78.1 12.2  ffmpeg -i capture.mkv -c:v libx264 out.mp4
rm    7712 12.4 18.4  firefox
rm    1180  4.8  3.4  gnome-shell
rm    7051  2.0  4.1  code"""),
 ("run_command", {"command": "cat /sys/bus/pci/devices/0000:01:00.0/power/runtime_status 2>/dev/null || echo n/a"}, "active")],
 "Two clear causes: the battery is discharging at 24.6 W, which is high, and ffmpeg is burning 78% CPU, while the discrete GPU is currently 'active' instead of suspended. Finish the encode, then check powertop; if the GPU stays active with no workload, that is what to chase next."),
("help me write a systemd timer for a weekly backup", [("edit_file", {"path": "/etc/systemd/system/backup.service", "content": "[Unit]\nDescription=Weekly home backup\n\n[Service]\nType=oneshot\nExecStart=/usr/bin/rsync -a --delete /home/rm/Documents/ /mnt/backup/Documents/\nNice=10\nIOSchedulingClass=idle\n"}, "(privilege gate) approval requested: write /etc/systemd/system/backup.service - category: system files\n(privilege gate) approved for this session\nwritten /etc/systemd/system/backup.service (210 bytes)"),
 ("edit_file", {"path": "/etc/systemd/system/backup.timer", "content": "[Unit]\nDescription=Weekly home backup timer\n\n[Timer]\nOnCalendar=Sun 03:00\nPersistent=true\n\n[Install]\nWantedBy=timers.target\n"}, "written /etc/systemd/system/backup.timer (170 bytes)"),
 ("run_command", {"command": "sudo systemctl daemon-reload && sudo systemctl enable --now backup.timer && systemctl list-timers backup.timer --no-pager"}, """NEXT                        LEFT       LAST  PASSED  UNIT          ACTIVATES
Sun 2026-09-27 03:00:00 EDT 4 days     -     -       backup.timer  backup.service""")],
 "Done. I wrote backup.service (rsync with idle I/O priority) and backup.timer (Sundays 03:00, Persistent=true so a missed run fires after boot), enabled it, and confirmed the next run: Sunday 2026-09-27 at 03:00. Both files needed privilege-gate approval, which you granted."),
("check what changed in /etc recently", [("run_command", {"command": "sudo find /etc -mtime -7 -type f 2>/dev/null | head -12"}, """/etc/systemd/system/backup.service
/etc/systemd/system/backup.timer
/etc/default/grub
/etc/fstab"""),
 ("run_command", {"command": "sudo diff <(grep -v '^#' /etc/default/grub) /dev/null | head -8"}, "GRUB_TIMEOUT=5\nGRUB_DEFAULT=0\nGRUB_CMDLINE_LINUX_DEFAULT=\"quiet splash\""),
 ("os_knowledge", {"query": "grub changes"}, """Universe OS - GRUB rules
After editing /etc/default/grub or adding a kernel: run sudo update-grub.
The Universe theme requires GRUB_THEME=/boot/grub/theme/universe/theme.txt.""")],
 "Four files changed in /etc in the last week: the two backup units we just created, plus /etc/default/grub and /etc/fstab. If you edited GRUB, remember to run sudo update-grub; the Universe theme needs GRUB_THEME set to the universe theme directory."),
("how do I check temperatures?", [("run_command", {"command": "sensors -f | grep -E 'Package|Tctl|Core|Composite' | head -6"}, """Package id 0:  +118.4°F  (high = +212.0°F, crit = +221.0°F)
Core 0:        +114.8°F  (high = +212.0°F, crit = +221.0°F)
Composite:     +105.8°F  (low = +32.0°F, crit = +194.0°F)"""),
 ("os_knowledge", {"query": "thermal monitoring"}, """Universe OS - Thermal tools
  universe-monitor -> Sensors shows live temperatures
  sensors -f for Fahrenheit, sensors for Celsius
  Thermal throttling appears in journalctl -k as 'CPU0: Core temperature above threshold'""")],
 "Temperatures are cool: CPU package at 118 F and the NVMe composite at 106 F - far from any threshold. For a live view, universe-monitor -> Sensors draws the same numbers as a graph."),
("can you check if my ssh key is set up for github?", [("run_command", {"command": "ls -la ~/.ssh/ 2>/dev/null"}, """-rw------- id_ed25519 (411 bytes)
-rw-r--r-- id_ed25519.pub (98 bytes)
-rw-r--r-- known_hosts (2.1 KB)"""),
 ("run_command", {"command": "ssh -T git@github.com 2>&1 | head -2"}, "Hi rm-universe-os! You've successfully authenticated, but GitHub does not provide shell access.")],
 "Yes, it is set up correctly: the key pair exists with safe permissions (600 on the private key) and GitHub greets you as rm-universe-os, so authentication works."),
("what is using all my inotify watches?", [("run_command", {"command": "cat /proc/sys/fs/inotify/max_user_watches && cat /proc/sys/fs/inotify/max_user_instances"}, "65536\n128"),
 ("run_command", {"command": "for p in $(pgrep -u $USER); do n=$(ls /proc/$p/fd 2>/dev/null | wc -l); [ $n -gt 60 ] && echo \"$n $(cat /proc/$p/comm 2>/dev/null)\"; done | sort -rn | head -5"}, """412 code
188 firefox
92 gnome-shell""")],
 "The system limit is 65,536 watches across 128 instances, and your biggest consumers are VS Code (412 file descriptors), Firefox (188) and GNOME Shell (92). Nothing is close to the limit yet - if editors start missing file changes, raise fs.inotify.max_user_watches to 524288."),
("test the microphone quickly", [("run_command", {"command": "arecord -f cd -d 3 /tmp/mic-test.wav 2>&1 && ls -la /tmp/mic-test.wav"}, """Recording WAVE '/tmp/mic-test.wav' : Signed 16 bit Little Endian, Rate 44100 Hz, Stereo
-rw-r--r-- 1 rm rm 529244 /tmp/mic-test.wav"""),
 ("run_command", {"command": "sox /tmp/mic-test.wav -n stat 2>&1 | grep -E 'Maximum amplitude|RMS' | head -2"}, """Maximum amplitude:  0.312
RMS     amplitude:  0.021""")],
 "The mic works: 3 seconds recorded at 44.1 kHz and the maximum amplitude was 0.312, so it is picking up sound at a healthy level (a silent capture would be near 0.000). Play /tmp/mic-test.wav to hear it yourself."),
("my second monitor stopped working after the update", [("run_command", {"command": "xrandr --query 2>/dev/null | grep -E ' connected| disconnected' || wlr-randr"}, """eDP-1 connected primary 1920x1080+0+0
HDMI-1 disconnected (normal left inverted right x axis y axis)"""),
 ("run_command", {"command": "sudo dmesg | grep -i -E 'hdmi|edid|drm' | tail -6"}, """[    4.221] amdgpu 0000:63:00.0: [drm] Connector HDMI-A-1: EDID is invalid
[    4.229] amdgpu 0000:63:00.0: [drm] Failed to read EDID for HDMI-A-1"""),
 ("os_knowledge", {"query": "display troubleshooting"}, """Universe OS - Display playbook
  EDID invalid -> suspect the cable first (many are charge-only), then the adapter
  Force a mode as a test: xrandr --output HDMI-1 --mode 1920x1080
  Wayland: wlr-randr shows the same state; GNOME: Settings -> Displays""")],
 "The kernel says the HDMI connector reports an invalid EDID, so the monitor is not being detected at all - that is almost always the cable or an adapter (charge-only cables look identical). Swap the HDMI cable first, then try another port; software is fine."),
("check if docker is running and how much space it uses", [("run_command", {"command": "systemctl is-active docker && docker system df"}, """active
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          14        3         9.4GB     6.1GB (64%)
Containers      5         2         212MB     96MB
Local Volumes   7         2         1.8GB     1.1GB
Build Cache     22        0         3.2GB     3.2GB"""),
 ("run_command", {"command": "docker ps --format '{{.Names}}  {{.Image}}  {{.Status}}'"}, """web  nginx:alpine  Up 3 days
db   postgres:16   Up 3 days""")],
 "Docker is active with 2 containers running (web and db, up 3 days). Disk use: 9.4 GB of images, 1.8 GB of volumes and 3.2 GB of build cache - about 10.4 GB is reclaimable. Safe cleanup order: docker builder prune, then docker image prune."),
("what kernel am I running and is it the latest?", [("run_command", {"command": "uname -r && apt list --upgradable 2>/dev/null | grep -i linux | head -5"}, "6.14.0-29-generic\nlinux-image-generic/noble-updates 6.14.0-31.31 amd64 [upgradable from: 6.14.0-29.29]"),
 ("os_knowledge", {"query": "kernel update"}, """Universe OS - Kernel updates
New kernels land through apt; after install run update-grub if you added a custom
kernel. Keep at least two kernels installed so a bad update is recoverable from
the GRUB menu. Secure Boot requires the signed generic kernels.""")],
 "You are on 6.14.0-29-generic and a newer 6.14.0-31 is available. It is a routine security/regression update - install with sudo apt upgrade, then reboot when convenient. Keep the old kernel for a while; it is your fallback in the GRUB menu."),
("check the root filesystem for errors", [("run_command", {"command": "sudo dmesg | grep -i -E 'ext4|xfs|btrfs' | grep -i -E 'error|corrupt' | tail -5 || echo 'no fs errors in dmesg'"}, "no fs errors in dmesg"),
 ("run_command", {"command": "sudo btrfs scrub status / 2>/dev/null || sudo tune2fs -l /dev/nvme0n1p2 | grep -E 'Filesystem state|Mount count|Last checked'"}, """Filesystem state:         clean
Mount count:               142
Maximum mount count:       -1
Last checked:              Sun Sep 14 02:11:03 2026""")],
 "The filesystem is clean: no errors in the kernel log and the ext4 superblock reports a clean state, last checked September 14. Nothing to fix."),
("how do I switch to the hacker mode?", [("os_knowledge", {"query": "modes switch"}, """Universe OS - Switching modes
GUI: Universe Settings -> Appearance -> Mode
CLI: universe-appearance --mode hacker
Effect: installs/removes the pentest toolchain on demand and switches the accent
(green-black for hacker). Requires privilege-gate approval for package changes."""),
 ("run_command", {"command": "universe-appearance --mode hacker"}, """(privilege gate) approval requested: install pentest toolchain (nmap, sqlmap, metasploit, aircrack-ng) - category: packages
(privilege gate) approved for 30 minutes
mode set to hacker - toolchain installing in the background
accent: green-black applied at next login""")],
 "Switched to hacker mode: the accent is now green-black (applied at next login) and the pentest toolchain (nmap, sqlmap, metasploit, aircrack-ng) is installing in the background - you approved the package change for 30 minutes through the gate. It will be ready in a minute or two."),
("is my timezone and clock correct?", [("run_command", {"command": "timedatectl"}, """               Local time: Tue 2026-09-22 15:44:12 EDT
           Universal time: Tue 2026-09-22 19:44:12 UTC
                 RTC time: Tue 2026-09-22 19:44:12
                Time zone: America/New_York (EDT, -0400)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no""")],
 "Everything is correct: local time 15:44 EDT, the clock is synchronized via NTP, and the hardware clock is in UTC (the right choice, especially on dual-boot systems)."),
("check for failed systemd units", [("run_command", {"command": "systemctl --failed --no-legend"}, "backup.service loaded failed failed Weekly home backup"),
 ("run_command", {"command": "journalctl -u backup.service -n 8 --no-pager"}, """Sep 22 03:00:01 universe systemd[1]: Starting backup.service...
Sep 22 03:00:01 universe rsync[9911]: rsync: [Receiver] mkdir "/mnt/backup/Documents" failed: No such file or directory (2)
Sep 22 03:00:01 universe systemd[1]: backup.service: Main process exited, code=exited, status=23""")],
 "One failed unit: backup.service. The log shows rsync could not create /mnt/backup/Documents because /mnt/backup is not mounted - the drive was probably not connected at 03:00. Plug the backup drive in and run sudo systemctl start backup.service to verify."),
("what changed on my system today?", [("run_command", {"command": "grep -E ' install | upgrade ' /var/log/dpkg.log | tail -8"}, """2026-09-22 09:12:03 upgrade linux-firmware:all 20250801-1 20250915-1
2026-09-22 09:12:20 install htop:amd64 <none> 3.3.0-4
2026-09-22 14:31:55 install rsync:amd64 3.2.7-1ubuntu1 3.2.7-1ubuntu1"""),
 ("run_command", {"command": "sudo find /etc -mtime -1 -type f 2>/dev/null | head -6"}, """/etc/systemd/system/backup.service
/etc/systemd/system/backup.timer""")],
 "Today: linux-firmware was upgraded, htop and rsync were installed, and two new files appeared in /etc - the backup service and timer. Nothing unusual; the firmware upgrade is worth a reboot when convenient."),
("can you read my fstab and check it is valid?", [("read_file", {"path": "/etc/fstab", "max_lines": 30}, """UUID=8f3a-2b1c  /boot/efi  vfat  umask=0077  0 1
UUID=a1b2c3d4  /          ext4  errors=remount-ro  0 1
UUID=e5f6a7b8  /home      ext4  defaults           0 2
UUID=11223344  none       swap  sw                 0 0"""),
 ("run_command", {"command": "findmnt --verify --verbose 2>&1 | tail -5"}, """Success, no errors or warnings detected
0 parse errors, 0 errors, 1 warning (unused entry: none)""")],
 "Your fstab is valid: 4 entries (EFI, root, home, swap) and findmnt --verify reports no errors or warnings - only an informational note about the swap entry having no mount point, which is normal."),
("check my home directory permissions", [("run_command", {"command": "ls -ld ~ ~/.ssh ~/.config 2>/dev/null"}, """drwxr-x--- 42 rm rm 4096 Sep 22 15:20 /home/rm
drwx------  2 rm rm 4096 Sep 22 09:01 /home/rm/.ssh
drwxr-xr-x 58 rm rm 4096 Sep 22 14:55 /home/rm/.config"""),
 ("run_command", {"command": "find ~ -maxdepth 1 -perm /o+w -type f 2>/dev/null | head -5 || echo 'no world-writable files'"}, "no world-writable files")],
 "Permissions are correct: home is 750 (private), .ssh is 700 (as it must be for SSH to accept your keys), and .config is 755. No world-writable files in your home directory."),
("what processes are listening on network ports?", [("run_command", {"command": "sudo ss -tulpn | awk 'NR==1 || /LISTEN/' | head -10"}, """Netid State  Local Address:Port  Process
tcp   LISTEN 0.0.0.0:22          users:(("sshd",pid=812,fd=3))
tcp   LISTEN 0.0.0.0:8080        users:(("python3",pid=5310,fd=3))
tcp   LISTEN 127.0.0.1:631       users:(("cupsd",pid=904,fd=7))
tcp   LISTEN 127.0.0.53:53       users:(("systemd-resolve",pid=690,fd=12))
udp   UNCONN 0.0.0.0:5353        users:(("avahi-daemon",pid=770,fd=12))""")],
 "Five services are listening: SSH on 22 and a Python http.server on 8080 (both reachable from your network), CUPS on 631 and systemd-resolved on 53 (localhost only, correct), plus avahi on 5353 for local discovery. The http.server is the one to close if you do not need it."),
("how much did the last apt upgrade install?", [("run_command", {"command": "grep -c ' install ' /var/log/dpkg.log && grep ' install ' /var/log/dpkg.log | tail -6"}, """5
2026-09-22 09:12:20 install htop:amd64 <none> 3.3.0-4
2026-09-22 09:14:02 install linux-headers-6.14.0-31:all <none> 6.14.0-31.31
2026-09-22 09:14:44 install linux-image-6.14.0-31-generic:amd64 <none> 6.14.0-31.31
2026-09-22 09:15:12 install linux-modules-6.14.0-31-generic:amd64 <none> 6.14.0-31.31
2026-09-22 09:15:40 install linux-modules-extra-6.14.0-31-generic:amd64 <none> 6.14.0-31.31""")],
 "Five packages were installed, all of them the new 6.14.0-31 kernel stack (headers, image, modules, modules-extra) plus htop. Reboot when convenient to start using the new kernel."),
("check my dns resolution", [("run_command", {"command": "resolvectl status | grep -A4 'Link 2' | head -8"}, """Link 2 (eth0)
    Current Scopes: DNS
         Protocols: +DefaultRoute
Current DNS Server: 192.168.1.1
       DNS Servers: 192.168.1.1 1.1.1.1"""),
 ("run_command", {"command": "dig +short example.com && dig +short github.com"}, """93.184.215.14
140.82.112.4""")],
 "DNS is healthy: eth0 uses the router (192.168.1.1) with 1.1.1.1 as fallback, and test lookups for example.com and github.com resolve instantly. Nothing to fix."),
("the fan is loud and the laptop is hot", [("run_command", {"command": "sensors | grep -E 'Package|Core 0|fan' | head -4"}, """Package id 0:  +86.0°C  (high = +100.0°C, crit = +100.0°C)
Core 0:        +84.0°C  (high = +100.0°C, crit = +100.0°C)
fan1:          4980 RPM"""),
 ("process_list", {"sort_by": "cpu", "count": 4}, """USER  PID %CPU %MEM COMMAND
rm    9241 96.2 12.2  ffmpeg -i capture.mkv -c:v libx264 out.mp4
rm    7712 14.0 18.4  firefox
rm    1180  4.8  3.4  gnome-shell"""),
 ("run_command", {"command": "cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"}, "powersave")],
 "The CPU is at 86 C with the fan at ~5000 RPM - that is thermal throttling territory, and the cause is visible: ffmpeg is at 96% CPU. The governor is already powersave, so this is a genuine sustained load, not a setting. Stop the encode or accept the noise; if it idles hot afterward, it is dust or paste."),
("is there anything wrong with my boot?", [("run_command", {"command": "systemd-analyze blame | head -5"}, """12.104s NetworkManager-wait-online.service
 4.221s snapd.service
 2.881s systemd-udev-settle.service
 1.904s gdm.service
 1.102s upower.service"""),
 ("run_command", {"command": "systemd-analyze critical-chain | head -8"}, """graphical.target @18.402s
└─multi-user.target @18.401s
  └─gdm.service @16.497s +1.904s
    └─systemd-user-sessions.service @16.312s +182ms
      └─NetworkManager-wait-online.service @4.202s +12.104s"""),
 ("os_knowledge", {"query": "boot slow"}, """Universe OS - Boot troubleshooting
NetworkManager-wait-online adds ~12s when an interface never reaches
'connected'. On laptops that are usually offline, disable it:
  sudo systemctl disable NetworkManager-wait-online.service""")],
 "Boot takes about 18 seconds and one unit dominates: NetworkManager-wait-online waits 12 of those seconds for the network. If you often boot without a cable, disable it with sudo systemctl disable NetworkManager-wait-online.service - that alone will cut your boot to roughly 6 seconds."),
("check if apparmor is protecting things", [("run_command", {"command": "sudo aa-status | head -8"}, """apparmor module is loaded.
42 profiles are loaded.
38 profiles are in enforce mode.
4 profiles are in complain mode.
  /usr/bin/firefox
  /usr/sbin/cupsd"""),
 ("os_knowledge", {"query": "apparmor security score"}, """Universe OS - AppArmor in the Security Score
AppArmor enabled = 15 points; enforced profiles = up to 25 more.
Complain mode logs but does not block - convert to enforce once verified:
  sudo aa-enforce /etc/apparmor.d/usr.bin.app""")],
 "AppArmor is active: 42 profiles loaded, 38 enforcing and 4 in complain mode. That earns the full 40 points in the Security Score. The 4 complain-mode profiles are logging only - review their logs with sudo aa-logprof and switch them to enforce when they behave."),
("what should I back up before upgrading?", [("os_knowledge", {"query": "backup before upgrade"}, """Universe OS - Pre-upgrade checklist
  1. sudo snapper create -d 'pre-upgrade'   (instant BTRFS snapshot)
  2. back up /home and /etc to external media
  3. note the current kernel: uname -r
  4. ensure 10% free disk space"""),
 ("run_command", {"command": "df -h / | tail -1 && sudo snapper list | tail -3"}, """/dev/nvme0n1p2 ext4 95G 71G 24G 75% /
 # | Type   | Pre # | Date                     | Description
 4 | single |       | Sun Sep 21 03:00:02 2026 | timeline
 5 | pre    |       | Mon Sep 22 09:10:01 2026 | pre-upgrade""")],
 "You already have a pre-upgrade snapshot from today (snapper #5) and 24 GB free - that is 25%, comfortably above the 10% guideline. For extra safety, copy /home and /etc to external media; the snapshot covers instant rollback, not disk failure."),
("check the boot errors from last time", [("run_command", {"command": "journalctl -b -1 -p err -n 8 --no-pager"}, """Sep 21 23:14:03 universe systemd[1]: Failed to start Weekly home backup
Sep 21 23:14:03 universe systemd[1]: backup.service: Failed with result 'exit-code'
Sep 22 09:40:55 universe systemd[1]: Failed to start User Manager for UID 1000"""),
 ("os_knowledge", {"query": "user manager failed"}, """Universe OS - 'Failed to start User Manager for UID 1000'
Usually a transient race at login; if it repeats every boot, check
systemctl status user@1000.service and the user's .config/systemd/user units.""")],
 "The previous boot had 3 error-level entries: the weekly backup failed (the /mnt/backup drive was not connected - same as today) and the user manager failed once at 09:40. The user-manager failure did not repeat, so it was a login race; only the backup needs action: connect the drive."),
("my file manager shows a broken mount - what is it?", [("run_command", {"command": "findmnt -t nfs,cifs,fuse,fuseblk -o TARGET,SOURCE,FSTYPE,OPTIONS | head -5 || echo 'no network mounts'"}, """TARGET                  SOURCE                    FSTYPE OPTIONS
/home/rm/mnt/server     //192.168.1.5/share       cifs   rw,vers=3.1.1
/home/rm/mnt/pi         pi:/srv/data              nfs4   rw,hard,addr=192.168.1.6"""),
 ("run_command", {"command": "timeout 4 ls /home/rm/mnt/pi >/dev/null 2>&1 && echo 'pi reachable' || echo 'pi UNREACHABLE'"}, "pi UNREACHABLE"),
 ("run_command", {"command": "timeout 4 ls /home/rm/mnt/server >/dev/null 2>&1 && echo 'server reachable' || echo 'server UNREACHABLE'"}, "server reachable")],
 "The broken mount is the NFS share /home/rm/mnt/pi - the Raspberry Pi at 192.168.1.6 is unreachable, so the mount hangs. The CIFS share on 192.168.1.5 is fine. Either bring the Pi back up, or unmount the stale one with sudo umount -l /home/rm/mnt/pi."),
("check the usb stick and copy my iso onto it", [("run_command", {"command": "lsblk -o NAME,SIZE,FSTYPE,LABEL,MOUNTPOINT | grep -A2 sdb"}, """sdb    29G
└─sdb1 29G  exfat  MM  /run/media/rm/MM"""),
 ("run_command", {"command": "df -h /run/media/rm/MM | tail -1"}, "/dev/sdb1 29G 18G 11G 62% /run/media/rm/MM"),
 ("run_command", {"command": "rsync -ah --info=progress2 '/home/rm/Desktop/Univerce-OS/Universe-OS-beta(v0.7.0).iso' /run/media/rm/MM/ && sync"}, """     4.71G 100%   92.14MB/s    0:00:51 (xfr#1, to-chk=0/1)"""),
 ("run_command", {"command": "sha256sum '/home/rm/Desktop/Univerce-OS/Universe-OS-beta(v0.7.0).iso' /run/media/rm/MM/'Universe-OS-beta(v0.7.0).iso' | awk '{print $1}' | uniq -c"}, "2 b994a4fa1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f")],
 "The USB stick has 11 GB free and the ISO (4.71 GB) copied in 51 seconds. I verified the checksum on both sides - identical, so the copy is intact. Eject safely with udisksctl power-off -b /dev/sdb."),
("check whether the laptop is charging", [("run_command", {"command": "upower -i $(upower -e | grep BAT) | grep -E 'state|percentage|time to full|time to empty' | head -4"}, """state:               charging
percentage:          64%
time to full:        1.2 hours"""),
 ("run_command", {"command": "cat /sys/class/power_supply/AC*/online 2>/dev/null"}, "1")],
 "Yes, the laptop is charging: AC is connected (1) and the battery is at 64% with about 1.2 hours to full."),
("how do I read the universe os docs?", [("os_knowledge", {"query": "documentation"}, """Universe OS - Documentation map
  Universe-OS-HANDOFF.md ....... architecture + 56 proven pitfalls (repo root)
  docs/HARNESS.md ............. how the AI harness works
  docs/TRAINING.md ............ how the model was trained
  ~/anticensor/README.md ...... internet-freedom toolbox (separate project)"""),
 ("list_dir", {"path": "/home/rm/Desktop/Univerce-OS"}, """drwxr-xr-x  scripts/
drwxr-xr-x  build/
-rw-r--r--  Universe-OS-HANDOFF.md (48 KB)
-rw-r--r--  Universe-OS-beta(v0.7.0).iso (4.7 GB)""")],
 "The main references are Universe-OS-HANDOFF.md (architecture and 56 proven pitfalls) in the project root, plus docs/HARNESS.md and docs/TRAINING.md for the AI side. I can open any of them - which one first?"),
("the clock is off by two hours", [("run_command", {"command": "timedatectl | grep -E 'Time zone|synchronized|RTC'"}, """Time zone: Europe/Berlin (CEST, +0200)
System clock synchronized: no
RTC in local TZ: yes"""),
 ("os_knowledge", {"query": "clock wrong"}, """Universe OS - Clock fixes
  timedatectl set-ntp true          re-enable network sync
  timedatectl set-local-rtc 0       store UTC in the RTC (dual-boot friendly)
  A dead CMOS battery makes the clock wrong on every cold boot""")],
 "Two problems: NTP sync is off and the hardware clock is set to local time, which fights with dual-boot systems. Fix both with: sudo timedatectl set-ntp true and sudo timedatectl set-local-rtc 0. If it drifts again after a full power-off, replace the CMOS battery."),
("find any duplicate photos taking space", [("run_command", {"command": "jdupes -r -S /home/rm/Pictures 2>/dev/null | tail -5 || fdupes -r /home/rm/Pictures 2>/dev/null | tail -5 || echo 'jdupes/fdupes not installed'"}, """/home/rm/Pictures/2025/IMG_4821.jpg
/home/rm/Pictures/backup/IMG_4821.jpg

/home/rm/Pictures/2025/IMG_4822.jpg
/home/rm/Pictures/backup/IMG_4822.jpg"""),
 ("run_command", {"command": "du -sh /home/rm/Pictures/backup"}, "3.1G /home/rm/Pictures/backup")],
 "jdupes found duplicate pairs between /home/rm/Pictures/2025 and /home/rm/Pictures/backup - the backup folder holds 3.1 GB of copies. Do not delete blindly: review the list with jdupes -r -S /home/rm/Pictures, then remove one side, or keep the backup on external media instead."),
("is there a way to see what the model knows about my os?", [("os_knowledge", {"query": "universe os overview"}, """Universe OS - Overview (v0.7.0)
Custom Linux by RM on Ubuntu 24.04 + GNOME 46 + Wayland. Signature feature: a
graphical privilege gate (sudo). 12 first-party apps (universe-monitor,
universe-appearance, universe-settings, universe-fetch, universe-firstboot,
universe-boot-splash, universe-ai, universe-privilege, universe-cinema, ...),
4 modes (standard/developer/hacker/server), BTRFS snapshots, AppArmor, UFW,
and the resident AI assistant (me)."""),
 ("run_command", {"command": "ls /usr/bin/universe-* | head -12"}, """/usr/bin/universe-appearance
/usr/bin/universe-boot-splash
/usr/bin/universe-fetch
/usr/bin/universe-firstboot
/usr/bin/universe-monitor
/usr/bin/universe-privilege
/usr/bin/universe-settings""")],
 "The knowledge base covers the whole system: version, base, the 12 first-party universe-* apps, the four modes, security stack (UFW, AppArmor, BTRFS snapshots, Flatpak) and troubleshooting playbooks. On disk I can see 7 of those apps in /usr/bin - the rest live in other paths."),
("help me test my internet speed", [("run_command", {"command": "curl -s -o /dev/null -w '%{speed_download}' --max-time 15 https://speed.cloudflare.com/__down?bytes=100000000 | awk '{printf \"%.1f MB/s\\n\", $1/1048576}'"}, "11.4 MB/s"),
 ("run_command", {"command": "ping -c 3 -q 1.1.1.1 | tail -2"}, """rtt min/avg/max/mdev = 11.204/12.881/15.402/1.731 ms""")],
 "Download speed: about 11.4 MB/s (roughly 91 Mbit/s) and latency to 1.1.1.1 averages 12.9 ms - a healthy connection. Note this is through the VPN exit; switch it off if you want to measure the raw line."),
("check if my backups are actually running", [("run_command", {"command": "systemctl list-timers --all | grep -E 'backup|snapper|btrfs' "}, """NEXT                        LEFT    LAST                        PASSED  UNIT
Sun 2026-09-27 03:00:00 EDT 4 days  -                           -       backup.timer
Tue 2026-09-22 16:00:00 EDT 15min   Tue 2026-09-22 15:00:01 EDT 44min   snapper-timeline.timer"""),
 ("run_command", {"command": "sudo btrfs subvolume list / | grep snapshots | tail -3"}, """ID 260 gen 8821 top level 5 path .snapshots/1/snapshot
ID 261 gen 8822 top level 5 path .snapshots/2/snapshot
ID 262 gen 8823 top level 5 path .snapshots/3/snapshot""")],
 "Mixed picture: snapper is running its hourly timeline (last at 15:00, next at 16:00) and there are 3 snapshots. But backup.timer has never run yet - it is waiting for Sunday 03:00. If you want a first run now to prove the setup, run sudo systemctl start backup.service."),
("which services start at boot?", [("run_command", {"command": "systemctl list-unit-files --state=enabled --type=service --no-legend | wc -l && systemctl list-unit-files --state=enabled --type=service --no-legend | head -8"}, """31
NetworkManager.service            enabled
apparmor.service                  enabled
bluetooth.service                 enabled
cups.service                      enabled
gdm.service                       enabled
snapd.service                     enabled
ssh.service                       enabled
universe-firstboot.service        enabled""")],
 "31 services are enabled at boot. The notable ones: NetworkManager, AppArmor, GDM (the login screen), SSH (you are accepting remote logins - disable it if you do not need it), CUPS for printing, and universe-firstboot which runs the one-time setup."),
("check my firewall logs for anything odd", [("run_command", {"command": "sudo journalctl -k --grep 'UFW BLOCK' --since '24 hours ago' -n 6 --no-pager"}, """Sep 22 03:12:44 universe kernel: [UFW BLOCK] IN=eth0 OUT= SRC=45.155.205.233 DST=192.168.1.10 PROTO=TCP SPT=44012 DPT=3389
Sep 22 03:12:46 universe kernel: [UFW BLOCK] IN=eth0 SRC=45.155.205.233 DST=192.168.1.10 PROTO=TCP DPT=5900
Sep 22 03:12:51 universe kernel: [UFW BLOCK] IN=eth0 SRC=45.155.205.233 DST=192.168.1.10 PROTO=TCP DPT=23"""),
 ("os_knowledge", {"query": "firewall logs"}, """Universe OS - Reading UFW blocks
A handful of blocks from random internet hosts probing RDP/VNC/telnet is normal
background noise. Blocks to ports you actually use (22, 8080) deserve a look.
Keep logging on; the Security Score expects UFW enabled.""")],
 "The firewall is doing its job: one internet host (45.155.205.233) probed RDP (3389), VNC (5900) and telnet (23) within a few seconds - a routine scan, all blocked, nothing listening on those ports anyway. This is normal noise; no action needed."),
("what is the difference between my two gpus and which is used?", [("run_command", {"command": "glxinfo -B | grep -E 'OpenGL renderer|Device' | head -3"}, """OpenGL renderer string: AMD Radeon 780M (radeonsi, gfx1103)
    Device: AMD Radeon 780M (0x15bf)"""),
 ("run_command", {"command": "nvidia-smi --query-gpu=name,memory.used,utilization.gpu --format=csv,noheader 2>/dev/null || echo 'nvidia driver not active'"}, "NVIDIA GeForce RTX 5070 Ti Laptop, 512MiB, 0%"),
 ("os_knowledge", {"query": "hybrid graphics"}, """Universe OS - Hybrid graphics
The iGPU (AMD) drives the desktop for power efficiency; the dGPU (NVIDIA) is
offloaded on demand: __NV_PRIME_RENDER_OFFLOAD=1 <app>, or per-app in
Universe Settings -> Graphics. Check with nvidia-smi.""")],
 "You have two GPUs: the AMD Radeon 780M (integrated) is driving the desktop right now, and the NVIDIA RTX 5070 Ti is idle with only 512 MB reserved. That is the intended power-efficient setup; run a heavy app with __NV_PRIME_RENDER_OFFLOAD=1 to put the RTX to work."),
("how do I check the iso checksum?", [("os_knowledge", {"query": "iso checksum"}, """Universe OS - Verifying the ISO
  sha256sum 'Universe-OS-beta(v0.7.0).iso'
Compare against the published value (release notes or .sha256 file).
A mismatch means a bad download or a bad USB write - re-download, never boot it."""),
 ("run_command", {"command": "sha256sum '/home/rm/Desktop/Univerce-OS/Universe-OS-beta(v0.7.0).iso'"}, "b994a4fa1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f  /home/rm/Desktop/Univerce-OS/Universe-OS-beta(v0.7.0).iso")],
 "The ISO's SHA-256 is b994a4fa1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f - compare it with the value published with the release. If they match, the file is intact and safe to write to a USB stick."),
("the terminal says permission denied on my script", [("run_command", {"command": "ls -l /home/rm/bin/health.sh"}, "-rw-r--r-- 1 rm rm 238 Sep 22 14:31 /home/rm/bin/health.sh"),
 ("run_command", {"command": "chmod +x /home/rm/bin/health.sh && ls -l /home/rm/bin/health.sh"}, "-rwxr-xr-x 1 rm rm 238 Sep 22 14:31 /home/rm/bin/health.sh"),
 ("run_command", {"command": "/home/rm/bin/health.sh | head -4"}, """== uptime ==
 15:52:01 up 4:52, 1 user, load average: 0.38, 0.41, 0.35
== memory ==
              total  used  free  available""")],
 "Fixed: the script had no execute bit (644), so I set it to 755 and ran it - it works now. That is the standard cause of 'permission denied' on a script you wrote yourself."),
("can you check if my wifi supports 5ghz?", [("run_command", {"command": "iw phy | grep -E 'Band|2412|5180|5745' | head -8"}, """Band 1:
\t* 2412 MHz [1]
\t* 2437 MHz [6]
Band 2:
\t* 5180 MHz [36]
\t* 5745 MHz [149]"""),
 ("run_command", {"command": "iw dev wlan0 link | grep -E 'SSID|freq|signal'"}, """Connected to 7c:8b:ca:11:22:33 (on wlan0)
\tSSID: HomeNet-5G
\tfreq: 5745
\tsignal: -52 dBm""")],
 "Yes - your adapter supports both bands (2.4 GHz and 5 GHz) and you are already connected on the 5 GHz band at 5745 MHz with a strong -52 dBm signal."),
("what is the exit code 12 from rsync?", [("os_knowledge", {"query": "rsync exit codes"}, """Universe OS - rsync exit codes
  0  success
 12  protocol error - connection dropped or incompatible versions
 23  partial transfer - some files could not be written (permissions, disk full)
 24  vanished source files (usually harmless)
Read the first error line, not the code alone."""),
 ("run_command", {"command": "grep -E 'rsync|exit status' /var/log/syslog | tail -4 2>/dev/null || journalctl -u backup.service -n 4 --no-pager"}, """Sep 22 03:00:01 universe rsync[9911]: rsync: connection unexpectedly closed (0 bytes received)
Sep 22 03:00:01 universe rsync[9911]: rsync error: unexplained error (code 12)""")],
 "Exit code 12 is a protocol error - in your case the log shows 'connection unexpectedly closed', so the SSH/network link dropped mid-transfer, not a disk problem. Check the remote host is reachable, then rerun; adding --timeout=60 and retrying automatically helps on flaky links."),
]

NEGATIVE = [
    ("What is Universe OS?", "Universe OS is a custom Linux distribution built from scratch by RM (Team RM) on Ubuntu 24.04 LTS. The current release is v0.7.0 with the GUI privilege gate as its signature feature."),
    ("Who are you?", "I am Universe AI, one of the main features and options of Universe OS, built by RM."),
    ("How does sudo work in Universe OS?", "sudo is a symlink to universe-privilege: every root request opens a GUI consent dialog with the app, category and exact command, grant durations from once to 1 hour, and auto-deny after 45 seconds."),
    ("Explain file permissions.", "Each file has read/write/execute bits for owner, group and others: 644 readable, 755 executable, 600 private. chmod changes them, chown changes ownership."),
    ("What is systemd?", "systemd is the init and service manager: systemctl manages services, journalctl reads logs, and units live in /etc/systemd/system (custom) and /lib/systemd/system (packaged)."),
    ("What is the Security Score?", "A 0-100 dashboard metric in Universe Settings: firewall 35 + AppArmor 15 + enforced profiles 25 + BTRFS snapshots 15 + Flatpak 10."),
    ("What are Universe Modes?", "standard (everyday), developer (dev tools, violet look), hacker (full pentest lab, green look) and server (headless). Switch in Universe Settings -> Appearance."),
    ("How do I take a screenshot?", "Print Screen opens the screenshot UI; Ctrl+Print takes the whole screen; Shift+Print selects a region."),
    ("What is BTRFS and why does the installer use it?", "BTRFS gives checksums, snapshots and subvolumes; the installer creates @, @home and @snapshots so snapper can roll back updates instantly."),
    ("What is a hard link vs a symlink?", "A hard link is a second name for the same inode; a symlink is a small file holding a path that is followed on access. Hard links cannot cross filesystems."),
    ("What is the difference between TCP and UDP?", "TCP is connection-oriented and reliable (web, SSH, transfers); UDP is fire-and-forget with lower latency (DNS, streaming, games)."),
    ("How do I change my wallpaper?", "Open universe-appearance or Universe Settings -> Appearance: four wallpapers with live preview, plus the mode switcher."),
    ("What is a zombie process?", "A finished process whose parent has not collected its exit status yet. It disappears when the parent reaps it or exits; a large pile means a buggy parent."),
    ("What is swap?", "Disk space used as overflow for RAM. swapon --show lists it; heavy si/so activity in vmstat means you need more RAM."),
    ("How does DNS work?", "DNS maps names to addresses. dig +short name tests resolution; if IPs work but names fail, it is DNS."),
    ("What is Universe AI?", "Me - the resident desktop agent of Universe OS, built by RM: a 3D black hole with a chat window, tools and a local fine-tuned model."),
    ("How do I check for hardware problems?", "universe-fetch for a summary, journalctl -b -p err for this boot's errors, and sensors for temperatures."),
    ("What is a checksum?", "A hash proving file integrity: sha256sum file, compared against the published value with sha256sum -c."),
    ("What is the difference between apt update and apt upgrade?", "apt update refreshes the package lists; apt upgrade installs newer versions of what is installed. update never installs anything by itself."),
    ("What is a shebang?", "The first line of a script (#!/bin/bash) telling the kernel which interpreter runs the file."),
    ("Can you help me write a bash script?", "Of course - tell me what it should do and I will write it with edit_file, then run it to verify. As a start: what input does it take, and what is the output?"),
    ("What is 12 times 8?", "96."),
    ("Hey, thanks for the help earlier!", "You are welcome! Ping me anytime something needs checking on the machine."),
    ("¿Qué es Universe OS?", "Universe OS es una distribución Linux personalizada creada por RM sobre Ubuntu 24.04; su firma es el portero de privilegios gráfico (sudo)."),
]

def gf(user, pattern, path, glob, result, answer, lang="en"):
    args = {"pattern": pattern}
    if path:
        args["path"] = path
    if glob:
        args["glob"] = glob
    return (user, [("grep_files", args, result)], answer, lang)

def fi(user, path, result, answer, lang="en"):
    return (user, [("file_info", {"path": path}, result)], answer, lang)

def du_(user, path, count, result, answer, lang="en"):
    args = {}
    if path:
        args["path"] = path
    if count:
        args["count"] = count
    return (user, [("disk_usage", args, result)], answer, lang)

def ss_(user, unit, result, answer, lang="en"):
    return (user, [("service_status", {"unit": unit}, result)], answer, lang)

def ni(user, result, answer, lang="en"):
    return (user, [("network_info", {}, result)], answer, lang)

def pi(user, query, action, result, answer, lang="en"):
    return (user, [("package_info", {"query": query, "action": action}, result)], answer, lang)

TRAJ_V5 = [
gf("Where is ListenStream set for the AI service?", "ListenStream", "/etc/systemd/system", "*.service",
   "/etc/systemd/system/universe-ai.service:7: ListenStream=127.0.0.1:17843",
   "It is set in /etc/systemd/system/universe-ai.service on line 7: ListenStream=127.0.0.1:17843 - the service listens only on the loopback interface."),
gf("Which script writes the boot splash?", "splash", "/usr/lib/universe", "*.sh",
   "/usr/lib/universe/gen-boot-splash.sh:12:  out=\"$DIR/splash.raw\"\n/usr/lib/universe/gen-boot-splash.sh:31:  echo \"splash written\"",
   "gen-boot-splash.sh writes it - line 12 builds splash.raw and line 31 confirms the write. The splash is generated, not shipped as a static file."),
gf("Find where that error message comes from.", "not within file bounds", "/home", "*.py",
   "/home/rm/tools/check-model.py:44:  raise SystemExit(\"tensor not within file bounds\")",
   "It comes from /home/rm/tools/check-model.py line 44 - a model file check that aborts when the tensor table points past the end of the file. That usually means a truncated download."),
gf("Is the polkit rule for our helpers in place?", "universe-privilege", "/etc/polkit-1/rules.d", "*.rules",
   "/etc/polkit-1/rules.d/49-universe.rules:18:  if (action.id == \"org.universe.privilege\") {\n/etc/polkit-1/rules.d/49-universe.rules:22:  if (action.id == \"org.universe.approve\") {",
   "Yes - 49-universe.rules has both entries: org.universe.privilege on line 18 and org.universe.approve on line 22. If a helper is missing here, pkexec refuses it silently."),
gf("Which files mention the old control center?", "universe-control-center", "/usr/share", "",
   "/usr/share/applications/universe-control-center.desktop:3: Name=Universe Control Center",
   "Only one leftover: /usr/share/applications/universe-control-center.desktop. The app itself is gone; this desktop entry should be removed so it stops showing in the menu."),
gf("Where is GTK_THEME set in the image?", "GTK_THEME", "/etc", "*.conf",
   "/etc/environment:4: GTK_THEME=Universe-Live",
   "In /etc/environment line 4: GTK_THEME=Universe-Live. That variable is the only thing that keeps libadwaita on our theme - without it the apps fall back to Adwaita-empty."),
gf("Find every place the version string is written.", "v0.7.0", "/usr/lib/universe", "*.sh",
   "/usr/lib/universe/build-iso-noroot.sh:22: VERSION=\"v0.7.0\"\n/usr/lib/universe/universe-fetch:9: VERSION=\"v0.7.0\"",
   "Two places in that tree: build-iso-noroot.sh line 22 and universe-fetch line 9. Remember the version also lives in etc/os-release, etc/lsb-release, etc/issue, usr/lib/os-release, universe-monitor and universe-settings - keep them all in sync."),
gf("Any TODO left in the settings app?", "TODO", "/usr/bin", "universe-*",
   "/usr/bin/universe-settings:812:  # TODO: move the snapshot page to the rust app",
   "One: universe-settings line 812, a note to move the snapshot page to the Rust app. Nothing user-visible."),
fi("Is /usr/bin/pkexec setuid?", "/usr/bin/pkexec",
   "path: /usr/bin/pkexec\ntype: regular file\nsize: 199928 bytes\nmode: -rwsr-xr-x\nowner: root:root\nmodified: 2026-08-14 10:22\nsha256: 5f2a9c...",
   "Yes - the mode is -rwsr-xr-x, so the setuid bit is set and pkexec runs as root. That is mandatory: without it the privilege gate cannot work. The build verifies this exact mode."),
fi("What are the permissions on the privilege rules file?", "/var/lib/universe/privilege/rules.json",
   "path: /var/lib/universe/privilege/rules.json\ntype: regular file\nsize: 412 bytes\nmode: -rw-------\nowner: root:root\nmodified: 2026-09-21 19:04",
   "0600 and owned by root:root - exactly as it should be. The rules store must never be readable or writable by the user, otherwise the gate can be edited around."),
fi("What does /usr/bin/sudo point to?", "/usr/bin/sudo",
   "path: /usr/bin/sudo\ntype: symlink\nsymlink target: /usr/bin/universe-privilege\nmode: lrwxrwxrwx\n",
   "It is a symlink to /usr/bin/universe-privilege - that is the whole trick. sudo in Universe OS is the privilege gate, which classifies the command and asks for consent when needed."),
fi("How big is the model file and is it intact?", "/usr/share/universe/models/universe-ai.gguf",
   "path: /usr/share/universe/models/universe-ai.gguf\ntype: regular file\nsize: 2497280480 bytes (2.3 GiB)\nmode: -rw-r--r--\nmodified: 2026-09-20 11:02\nsha256: 85e4a5b7...",
   "2.3 GiB (2497280480 bytes) and the hash is 85e4a5b7..., which matches the published base model. Size and hash agreeing means the file is complete."),
fi("How many files are in the app directory?", "/opt/universe-ai",
   "path: /opt/universe-ai\ntype: directory\nentries: 12\nmode: drwxr-xr-x\nowner: root:root\nmodified: 2026-09-21 08:15",
   "12 entries. The app tree holds main.js, the renderer, mascot.js, the brain knowledge directory and the helper scripts - if the count drops, a file went missing in the last sync."),
du_("The disk is full - where is it going?", "/", 12,
   "Filesystem      Type  Size  Used Avail Use%\n/dev/nvme0n1p8  ext4   95G   91G  3.6G  97% /\n\nLargest entries under /:\n34G  /usr\n47G  /home\n3.1G /opt\n1.7G /var\n4.1G /swapfile-uai",
   "The root filesystem is at 97 percent. /home holds 47G and /usr 34G; the swap file alone is 4.1G. The usual culprits here are build trees, old ISO images and cargo target directories - I can list the biggest files if you want to trim."),
du_("What is using space in my home?", "/home/rm", 10,
   "Largest entries under /home/rm:\n8.3G  Desktop/Univerce-OS\n2.7G  Desktop/Server-FullBackup-2026-09-15.tar.gz\n1.4G  pera-backups-all.tar.zst\n721M  .local/share/opencode/opencode.db\n265M  uai-build/llama.cpp",
   "The OS project itself is 8.3G, then a 2.7G server backup and a 1.4G archive. Those two backups alone are 4.1G - if they are already stored elsewhere they are the easiest win."),
du_("How much room is left before I build an ISO?", "", 6,
   "Filesystem      Type  Size  Used Avail Use%\n/dev/nvme0n1p8  ext4   95G   91G  3.6G  97% /\n\nA fresh ISO needs about 1.83 GiB free after the old ISO is deleted.",
   "3.6G free, and the build needs roughly 1.83G for the squashfs plus the ISO size itself. Delete the superseded ISO before starting - xorriso writes the new file alongside the old one and the pack fails at the very end if the old one is still there."),
du_("Is /var/log getting out of hand?", "/var/log", 8,
   "Largest entries under /var/log:\n412M  journal\n84M   syslog.1\n22M   kern.log.1\n8.0M  auth.log",
   "The journal is 412M, the rest is small. Trim it with journalctl --vacuum-size=200M if you need the space - it is safe and keeps recent logs."),
ss_("Is the AI service running?", "universe-ai",
   "unit: universe-ai.service\nloaded: loaded (/etc/systemd/system/universe-ai.service; enabled)\nactive: active (running) since Tue 2026-09-23 08:12:04; 21min ago\nmain pid: 1843 (node)\nrecent log:\n  08:12:04 Started Universe AI desktop assistant\n  08:12:06 model loaded, listening on 127.0.0.1:17843",
   "It is active and running since 08:12, PID 1843, and enabled at boot. The model loaded in two seconds and it is listening on the loopback port - everything is healthy."),
ss_("Why did the splash service fail?", "universe-splash",
   "unit: universe-splash.service\nloaded: loaded (/etc/systemd/system/universe-splash.service; enabled)\nactive: failed (Result: exit-code) since Tue 2026-09-23 08:11:58\nrecent log:\n  08:11:58 uni-fb-splash: /dev/fb0 unsupported bpp 24\n  08:11:58 universe-splash.service: Main process exited, code=exited, status=1/FAILURE",
   "It failed because uni-fb-splash reported an unsupported 24-bit framebuffer. The current version handles 16, 24 and 32 bpp, so an image built before that fix is still on disk - rebuild the rootfs and the error disappears."),
ss_("Is the firewall enabled at boot?", "ufw",
   "unit: ufw.service\nloaded: loaded (/lib/systemd/system/ufw.service; enabled)\nactive: active (exited) since Tue 2026-09-23 08:11:40\nrecent log:\n  08:11:40 Firewall not enabled (skipping reload)",
   "The unit is active and enabled, but the log line says the firewall itself was not enabled - that means the ruleset is empty. Run ufw status to confirm, then ufw enable if you want it enforcing."),
ni("What is my IP address and what is listening?",
   "interfaces:\n  wlan0  10.206.39.249/24  (default via 10.206.39.69)\n  lo     127.0.0.1/8\nlistening:\n  tcp  127.0.0.1:17843  node (universe-ai)\n  tcp  127.0.0.1:11434  ollama\n  tcp  0.0.0.0:22       sshd\ndns: 127.0.0.1 (unbound)\nconnectivity: ok (ping 1.1.1.1 in 21ms)",
   "wlan0 has 10.206.39.249 with the default route through 10.206.39.69. Locally, the AI listens on 17843 and ollama on 11434, both loopback-only; SSH is the only service open to the network. DNS resolves through the local unbound, and connectivity is fine."),
ni("The internet seems down - what is going on?",
   "interfaces:\n  wlan0  10.206.39.249/24  (no default route)\n  lo     127.0.0.1/8\nlistening:\n  tcp  127.0.0.1:17843  node\ndns: 127.0.0.1 (unbound)\nconnectivity: failed (no route to host)",
   "There is no default route on wlan0 - the interface has an address but nothing tells the kernel where to send outside traffic. Reconnect the network (or add the gateway back) and it will resolve; DNS itself is local and fine."),
ni("Which process is on port 17843?",
   "listening:\n  tcp  127.0.0.1:17843  node (pid 1843, universe-ai.service)",
   "It is the Universe AI service itself: node, PID 1843, started by universe-ai.service. Nothing else is bound to that port."),
pi("Is ffmpeg installed?", "ffmpeg", "installed",
   "ffmpeg 7:6.1.1-3ubuntu5  installed",
   "Yes - version 7:6.1.1-3ubuntu5 is installed. If a script fails with command not found for a different tool, run the same check for that name."),
pi("What version of node is available?", "nodejs", "info",
   "nodejs:\n  Installed: 22.14.0-1nodesource1\n  Candidate: 22.14.0-1nodesource1\n  Provides: node, npm\n  Homepage: https://nodejs.org",
   "22.14.0 is installed and it is the newest candidate, so nothing to upgrade. It also provides the node and npm names."),
pi("Which package owns /usr/bin/universe-privilege?", "universe-privilege", "files",
   "universe-privilege is a local file, not owned by a dpkg package.\n  dpkg -S /usr/bin/universe-privilege -> no path found",
   "Nothing owns it - it is part of the image itself, deployed from scripts/rootfs/, not from a package. That is normal for every universe-* binary."),
pi("Search for a screenshot tool.", "screenshot", "search",
   "gnome-screenshot - utility to take pictures of your screen\nflameshot - Powerful yet simple to use screenshot software\nscrot - command-line screen capture utility",
   "Three options: gnome-screenshot (the GNOME one, already the default keybinding), flameshot (annotation built in) and scrot (scriptable). For the desktop keys you want gnome-screenshot; for scripts, scrot."),
]
TRAJ.extend(TRAJ_V5)

def main():
    rows = []
    for t in TRAJ:
        user, steps, final, lang = (t + ("en",))[:4] if len(t) == 3 else t
        msgs = [{"role": "system", "content": SYS}, {"role": "user", "content": user}]
        for name, args, result in steps:
            msgs.append({"role": "assistant", "content": "", "tool_calls": [
                {"type": "function", "function": {"name": name, "arguments": args}}]})
            msgs.append({"role": "tool", "content": result})
        msgs.append({"role": "assistant", "content": final})
        rows.append({"messages": msgs, "tools": TOOLS, "_lang": lang})
    for user, answer in NEGATIVE:
        rows.append({"messages": [
            {"role": "system", "content": SYS},
            {"role": "user", "content": user},
            {"role": "assistant", "content": answer}], "tools": TOOLS, "_lang": "en"})
    with open(OUT, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"wrote {len(rows)} tool trajectories -> {OUT}")

if __name__ == "__main__":
    main()
