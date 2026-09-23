#!/usr/bin/env python3
import os, re, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = "/home/rm/Desktop/Univerce-OS"
OUT = os.path.join(HERE, "dataset-v5-os.jsonl")

SYS = ("You are Universe AI, one of the core features and options of Universe OS, "
       "built by RM (Team RM). You are an expert on Linux, on debugging, and on "
       "every part of the Universe OS project.")

rows = []
def add(u, a, sys=True):
    msgs = ([{"role": "system", "content": SYS}] if sys else []) + [
        {"role": "user", "content": u}, {"role": "assistant", "content": a}]
    rows.append({"messages": msgs})

CURATED = [
("What is Universe OS?",
 "Universe OS is a fully custom Linux distribution built from scratch by RM. It is based on debootstrap Ubuntu 24.04 LTS with Kali packages, runs kernel 7.2.0-070200-generic, uses GNOME 46 on Wayland only, boots live through casper, and ships as a hybrid BIOS + UEFI ISO. The current line is v0.7.0."),
("Who makes Universe OS and Universe AI?",
 "Both are built by RM (Team RM). Universe OS is the distribution; Universe AI is its resident assistant and one of its core features. RM built the system from scratch - the boot chain, the shell theme, the app suite, the installer and the AI."),
("Where does the Universe OS project live?",
 "The project root is ~/Desktop/Univerce-OS. scripts/rootfs/ inside it is the single source of truth for everything that gets added to the base system; build/ holds the staging chroot, the ISO tree and scratch files."),
("What is the current version of Universe OS?",
 "v0.7.0. The ISO is Universe-OS-beta(v0.7.0).iso, about 2.06 GB, with volume id Universe-OS-v0.7.0. Version strings must be kept in sync across build-iso-noroot.sh, etc/os-release, etc/lsb-release, etc/issue, etc/issue.net, usr/lib/os-release, the universe-monitor watermark, the universe-settings header, universe-fetch, the Star Deck source and the AI knowledge."),
("Which apps ship with Universe OS?",
 "Universe Settings (the control centre, 9 pages), Universe Privilege (the sudo replacement and consent gate), Universe Welcome, Universe Installer, Universe Monitor, Universe Files, Universe Security, Universe Fetch, the Star Deck browser theme, and Universe AI itself. All live as universe-* names in /usr/bin and are GTK4 + libadwaita apps."),
("What happened to Universe Control Center?",
 "It is gone and must not come back. universe-settings is the control centre now; its 9 pages cover everything the old hub did."),
("What is the signature feature of Universe OS?",
 "The graphical privilege gate. Since v0.7.0 the gate lives on the ROOT side: universe-approve (Python GTK4, launched through pkexec) owns the consent dialog and the rules store at /var/lib/universe/privilege/rules.json (root, 0600). universe-privilege, which sudo links to, only classifies a command and deposits it; gate-exec, a setuid helper, runs single-use root-deposited jobs. Never move a decision back to the user side."),
("How does sudo work in Universe OS?",
 "sudo is a link to universe-privilege. It classifies the command, then either refuses, runs it directly for safe commands, or deposits a job for the root-side gate. universe-approve shows the graphical consent dialog and records decisions in /var/lib/universe/privilege/rules.json. Approved single-use jobs are executed by gate-exec, which is setuid."),
("Why must the privilege gate stay on the root side?",
 "Because a decision made on the user side can be bypassed: the user process that decides can be replaced or spoofed, and any rules store the user can write is a rules store an attacker can write. Two real holes were closed by moving the decision to root - see the privilege-gate-audit notes."),
("What is the boot chain of Universe OS?",
 "BIOS or UEFI -> GRUB with the custom universe theme and its own fonts -> kernel with gfxpayload=keep -> initrd, which carries uni-fb-splash and the plymouth splash -> GDM -> GNOME on Wayland. GRUB hands the splash over to plymouth, which hands it to the desktop."),
("How is the ISO built?",
 "Two steps. First scripts/sync-rootfs-to-chroot.sh deploys scripts/rootfs/ into build/chroot-kali with sudo. Then scripts/build-iso-noroot.sh packs the ISO as the NORMAL user - never as root, because mksquashfs as root silently packs root-only junk that keeps the image clean when built unprivileged. build/scratch/ must exist; the generators (gen-grub-theme.py, gen-mode-wallpapers.py, gen-mode-themes.py, build-shell-theme.py) are run by hand with /usr/bin/python3."),
("Why must the ISO be built as a normal user?",
 "Because mksquashfs skips root-only (0700) entries when it runs unprivileged, and that is exactly what keeps chroot test junk such as /tmp browser profiles, /root/.cache and /root/.pki out of the image. One sudo build came out 135 MB fatter than the same content built as the normal user."),
("What does sync-rootfs-to-chroot.sh do?",
 "It deploys scripts/rootfs/ into build/chroot-kali with rsync -rlptD --keep-dirlinks --no-owner --no-group, tolerates exit codes 23 and 24, restores the setuid/setgid mode table, repairs /etc/polkit-1/rules.d to 0755, deletes systemd symlinks that no longer exist in the source, and prunes files that were removed from scripts/rootfs since the last sync using build/.rootfs-manifest."),
("What is the rule about rsync in this project?",
 "Always --keep-dirlinks, never --delete (orphans stay in the chroot - delete them by hand), and never plain -a as non-root. Recompile both dconf databases after a sync."),
("What are the GRUB traps in Universe OS?",
 "loadfont must come before set theme; installed paths need /@/; there is no linux16; Safe Mode means a KMS blacklist, never nomodeset; the theme must live both in the ISO9660 tree and in /usr/lib/universe/grub-theme/; never re-open a packed ISO. gfxmode=auto alone gives 800x600 under BIOS, so an explicit chain with auto last is used for both pc and efi."),
("Why must a GRUB config never contain &&?",
 "Because [ -f x ] && cmd is a lexer syntax error in GRUB (script/lexer.c:352). GRUB prints the error to gfxterm, and that print paints the 70%-centred terminal window in background_color - that window is the black box users kept reporting. Always use if [ -f x ]; then cmd; fi."),
("How does the GRUB theme panel geometry work?",
 "grub_theme_metrics.py is the single source of truth. The panel height must satisfy H >= n*(IH+S) + 2*item_padding + 2*max_pads + 2*box_pad - S or entries clip. For 9-slice boxes the box pads are max(corner, edge) per direction, so a corner tile h x w costs h px vertically and w px horizontally, and the drawn box is 2*h + content tall. Horizontal and vertical radii are independent - draw the corner as a quarter ellipse for a wide round corner that only costs ry of padding."),
("Why is one GRUB menu entry lower than the others?",
 "Because gui_list.c sizes the select box with item_height and draws its label at item_top + sel_top_pad, so the selected entry's text sits sel_top_pad pixels lower. The fix is to give plain entries a fully transparent box with the same metrics (item_pixmap_style = item_*.png, all tiles 0,0,0,0) so every label returns to one baseline."),
("How do GRUB theme fonts resolve?",
 "By exact NAME only. If the name is wrong the last loaded font silently wins. A new size needs loadfont in grub-live.cfg, in grub.cfg and in install-disk.sh."),
("Where does the boot timeout live?",
 "The 10 second timeout lives in four files: grub-live.cfg (the build copies it over the ISO's grub.cfg), rootfs/boot/grub/grub.cfg, the install-disk.sh heredoc and the repo-root grub.cfg. Keep them in sync; default=0 is Universe OS. The visible countdown is a theme label with id __timeout__ whose text GRUB treats as a printf template (%d only)."),
("What is the uni-fb-splash program?",
 "It is the frame-buffer painter written in C (scripts/src/uni-fb-splash.c) that draws the boot splash before the compositor exists. It tries /dev/fb0 through /dev/fb2 and supports 16, 24 and 32 bits per pixel - an early version accepted only 32 bpp and failed silently on virtual machines, which is why the splash never appeared."),
("What is the splash service trap?",
 "universe-splash.service used to be a Type=oneshot unit with a 210 second loop wanted by multi-user.target. Because graphical.target starts after multi-user.target, GDM could not start until the loop finished - a 3.5 minute black screen. The loop now runs under setsid with KillMode=none, starts from sysinit.target, and stops itself as soon as the real compositor is up."),
("What is Liquid Glass?",
 "It is the single integer os.universe.glass level, from 0 to 100, that moves every translucent surface at once. 0 is absolute glass - the ground is gone and only the rim and blur remain, so the wallpaper reads through. 100 is absolute matte - the ground is opaque and painted with a tint of the wallpaper, not a neutral grey. Both alpha and colour move together in between."),
("How does the glass tint get chosen?",
 "It is sampled, not chosen. sampleTint() in the universe-glass extension loads the wallpaper at 32 px, takes the median of each channel (a mean is dragged away by one big highlight), keeps the hue, boosts saturation 1.9x, substitutes the theme's blue when the hue is noise (s < 0.22) and pins the value to 0.40. The result is mirrored into os.universe.glass tint and re-sampled when the wallpaper or colour scheme changes."),
("Why does the glass slider write through set-appearance.sh?",
 "Because universe-settings runs as root through pkexec, and root cannot write the user's dconf: the dconf service drops clients whose uid is not the database's owner and the write dies with a dconf-WARNING, leaving the key untouched. Writes go through set-appearance.sh, which drops to the user with runuser first. The app writes directly only when it is not root."),
("Why does a runtime stylesheet sometimes do nothing?",
 "Because St.Theme.load_stylesheet() PREPENDS to the list of custom stylesheets and the theme's own declaration then wins every tie. Winning needs strictly higher specificity, which is what bump() buys by repeating the last compound - but bump() only works on a class, not on an id: #panel#panel parses fine and never matches. The panel has no class of its own, so the extension lends it universe-glass-panel and styles #panel.universe-glass-panel."),
("Why is the panel background unreachable through CSS?",
 "Because Blur My Shell owns the panel and the dock: it adds a transparent-panel class and hangs its own blurred actor behind the panel, and that actor is what you see - a background-color rule on #panel is painted underneath it. Measured on the ISO, switching the glass level end to end changed app windows and the dock but the panel by 0 pixels. BMS has to be asked through its own pipeline settings."),
("Where does the dock's dark ground come from?",
 "From three places that must agree: DOCK_RGB and the SURFACES table in the universe-glass extension, and #dash .dash-background in scripts/shell-theme/universe-additions.css. The CSS is appended to all four mode sheets by gen-mode-themes.py, so re-run that generator after editing it. The bar's height is only controllable through min-height on .dash-background - padding is inert."),
("Why do dash-to-dock colours need two changes?",
 "Because dash-to-dock does not inherit #dash .dash-background directly: it clears its inline style, reads the stylesheet colour and re-applies it with background-opacity from its own dconf key. The RGB comes from the CSS and the alpha from dconf, so both must be changed together; with transparency-mode FIXED the dconf value is the one you actually see."),
("Why do extension stylesheets beat the theme?",
 "Because extension stylesheets load after the theme, so at equal specificity they win. Blur My Shell marks the panel transparent and the dock with !important rules, so anything forced on those surfaces must be !important too. The frost grounds are !important for the same reason - upstream writes background: none on .quick-settings later than .popup-menu-content's 0.72, and the shorthand won."),
("Why does Quick Settings ignore background-color?",
 "Because it paints its ground with border-image: url(assets/menu.svg). Changing background-color alone never moves it; border-image: none must be given as well."),
("What is the GTK version trap?",
 "The image ships GTK 4.14.5 and libadwaita 1.5.0, while the host has GTK 4.22. GTK silently drops CSS it cannot parse, so a sheet written in the newer dialect loads fine and does nothing - the raw vendored sheet had 760 dropped declarations. build-gtk-theme.py runs every sheet through css-downgrade.py before writing it, and stylesheets are checked with build/testtools/css-parse-check.sh, which parses them with the image's own GTK inside the chroot."),
("Why must app icons be universe-* names?",
 "Because the Adwaita names the install scripts used - system-file-manager, security-high, preferences-desktop-theme, utilities-system-monitor - resolve to image-missing under this image's icon theme, verified with a real Gtk.IconTheme lookup. The planet artwork per app lives in assets/app-icons/ and scripts/restore-legacy-app-icons.py reinstalls it. Check any icon change with build/testtools/app-icon-check.py."),
("How is the panel mark drawn?",
 "Not with St.Icon - every St.Icon route fails on this image. It is painted with CSS: universePanelMark() returns a plain St.Widget with class universe-panel-logo and the sheet sets background-image: url(file:///usr/share/universe/panel-mark.png) with background-size: 22px 22px. The mark is built by scripts/gen-panel-mark.py from assets/universe-logo-clean.png."),
("What happens to GLib.file_set_contents in GJS?",
 "It THROWS on failure because it is a GError function. An unwritable cache directory once aborted the whole apply path before load_stylesheet() ever ran, which is why a round of probes silently did nothing. Wrap it."),
("Why is the disk always full?",
 "Because the builds are large and ext4 reserves 5 percent for root. df reports about 4.7 GiB less than the filesystem has; the reserve was lowered to 1 percent with tune2fs -m 1 after a build died with xorriso exceeding free space. A fresh ISO needs about 1.83 GiB free after the old one is deleted, and the old ISO must be deleted BEFORE the build starts because xorriso writes the new ISO alongside the old one."),
("Why does rm sometimes free no space?",
 "Because rm is a zsh shell function in this environment that moves files to ~/.local/share/Trash instead of deleting them - df does not budge, and a second rm on the trashed path renames it to .2 instead of deleting it. Use /bin/rm for anything large; every build script sets RM=/bin/rm. A deleted file whose fd is still open also keeps its blocks - a leftover QEMU holding the old ISO as -cdrom pins about 2 GiB until it exits."),
("What are the shell traps in this project?",
 "cmd followed by st=$? is dead under set -e (use cmd || st=$?); install-disk.sh heredocs are unquoted so dollar signs must be escaped; pkexec'd scripts need a shebang; pipefail with a non-matching grep inside a command substitution is fatal; and pkill -f kills the tool session, so use pkill -x."),
("Why is /etc/polkit-1/rules.d special?",
 "It must be 0755 or rules are invisible; the sync script restores a setuid/setgid mode table for it. Every new pkexec'd helper must be in the 49-universe.rules allowlist. AUTH_SELF_KEEP forces a password even for policy-yes, and org.freedesktop.accounts is NOT_HANDLED. pkexec also refuses from the serial console because its session is never active - escape the password prompt with a raw Ctrl-C and drive the live session through the session bus instead."),
("What are the modes of Universe OS?",
 "The desktop has four mode sheets built by gen-mode-themes.py and gen-mode-wallpapers.py; the shell theme is compiled by build-shell-theme.py. Mode changes are applied through the universe-glass extension and the mode selector, and every mode sheet carries the same appended additions from universe-additions.css."),
("What is the Star Deck?",
 "It is the custom browser start page and theme shipped with the system. Its source is scripts/chrome-theme/newtab.html; after editing it, re-run scripts/gen-chrome-theme.py, which rewrites chrome-stardeck/, start/index.html and both CRX files."),
("How does the installer handle dual boot?",
 "Universe Installer detects Windows, can shrink a partition and installs onto btrfs with the /@ subvolume layout. Its disk steps are driven by usr/lib/universe/install-disk.sh, whose heredocs are unquoted."),
("What is in the rust/ directory?",
 "Rust components that are being moved into the system: installer, privilege, monitor, firewall, cleaner, network, security, ui and mode-selector. universe-settings also has a Rust version under universe-settings/ which is still in development and not yet in the ISO."),
("What is gnome-apps/ for?",
 "It holds the Python drafts of the GNOME apps before they are finalised into scripts/rootfs/usr/bin. The shipping versions are the universe-* binaries in the rootfs."),
("Where is the AI app inside the OS?",
 "At scripts/rootfs/opt/universe-ai/ - the Electron app with its mascot, the agent harness in main.js, the chat renderer and the helper scripts such as cinema-watch.py. That copy is what ships inside the ISO and is updated from the universe-ai repository."),
("How does the AI fit into the OS?",
 "Universe AI is one of the core features of Universe OS. It runs locally on the user's machine, talks to a local model through ollama, and its tools can read files, run commands with the consent gate, search the web and answer about Linux and about Universe OS itself."),
("What are the release targets for any change?",
 "Every change ships to three targets: the GitHub repository, the local desktop copy, and Universe OS itself through the rootfs, chroot and a fresh ISO."),
("What is the policy about the public repository?",
 "The public repository must contain zero Persian traces and zero signs of AI authorship: comments are stripped, and branding stays as Team RM. Local private copies may keep Persian."),
("Which generators must be re-run after editing their sources?",
 "gen-grub-theme.py for the GRUB pixmaps, grub_theme_metrics.py for the theme text, gen-mode-themes.py after editing universe-additions.css, gen-mode-wallpapers.py for mode wallpapers, build-shell-theme.py for the shell theme, gen-panel-mark.py for the panel mark, gen-boot-splash.sh for the splash artwork, and gen-chrome-theme.py after editing the Star Deck source."),
("What is the testing setup for the OS?",
 "build/testtools/ holds the checkers: app-icon-check.py, css-parse-check.sh, glass-level-check.py, glass-live-path-check.py, glass-privilege-check.py and gtk-window-ground-check.py. Live checks run in QEMU with live-desktop-vm.sh, and visual claims are verified by diffing screenshots, not by reasoning about the cascade."),
("How do I verify a CSS change for this image?",
 "Run build/testtools/css-parse-check.sh, which parses the sheet with the image's own GTK inside the chroot. Never check a stylesheet by loading it on the host, because the host GTK is newer and accepts syntax the image drops."),
("What is the fastest way to debug GRUB?",
 "Build a small grub-mkrescue ISO of about 29 MB instead of the full image, add terminal_output gfxterm serial and -serial file: to a VM, and read the log. That turns a debugging round from minutes into seconds."),
("Why must the theme never be hand-edited?",
 "Because grub_theme_metrics.py and gen-grub-theme.py generate it. Hand edits are overwritten by the next generator run and the geometry drifts; the metrics file is the single source of truth for panel geometry."),
("What is the panel palette in the GRUB theme?",
 "Panel fill (26,40,82,176), border (148,187,255,155), selection (88,140,255,158). Darkening the fill turns the glass into a black box; the artwork itself stays text-free."),
("What is the rule for the GRUB terminal window?",
 "GRUB's gfxterm terminal window is 70 percent centred and paints only when GRUB writes text to gfxterm; background_color #162858 recolours it and alpha is ignored, so it cannot be made transparent. Setting terminal-* geometry in theme.txt breaks the whole theme and falls back to the text menu."),
("Which checks confirm a built ISO is correct?",
 "pkexec must be -rwsr-xr-x root/root; the launcher must contain the UNIVERSE_LAUNCH_MARK writes and the || st= fallback; the splash unit must be only in sysinit.target.wants; the initrd must carry uni-fb-splash and splash.raw; /etc/polkit-1/rules.d must be 0755 root:root; El Torito must show two boot images; md5sum.txt must exist."),
("What was the apps-do-not-open bug?",
 "In universe-root-launch the pkexec command ran plainly and the next line was st=$?. Under set -e the shell exited right there, so the whole fallback path was dead code - exit 127 in the chroot and the app never launched. The fix was pkexec ... || st=$? plus a marker file UNIVERSE_LAUNCH_MARK written by the elevated copy just before exec, so only a missing marker triggers the fallback."),
("What was the half-synced rootfs bug?",
 "rsync -a as a non-root user failed on root-owned files such as usr/bin/pkexec with exit 23, and set -e killed the whole sync: etc/ was copied and usr/ was not, so a build could ship old binaries and still look fine. The fix is rsync -rlptD --keep-dirlinks --no-owner --no-group with tolerance for exit codes 23 and 24."),
("What was the stale systemd symlink bug?",
 "rsync never deletes, so changing WantedBy on an existing chroot had no effect because the old symlink stayed. sync-rootfs-to-chroot.sh now deletes orphaned symlinks under /etc/systemd/system."),
("How should I answer questions about Universe OS internals?",
 "Concretely: name the exact file, the exact key or the exact unit, state the trap that is already known, and give the verification step. Never guess a path - if the path is not known, say what is known and how to check it."),
("What is the kernel and desktop of Universe OS?",
 "Kernel 7.2.0-070200-generic (mainline) and GNOME 46 on Wayland only - the image is Wayland-only, there is no X session."),
("What is casper in this project?",
 "casper is the live-boot system used by the ISO. The live session boots from the squashfs through casper, and the installer then deploys the same tree to disk."),
("What makes the ISO hybrid?",
 "It carries two El Torito boot images, so the same file boots on BIOS and on UEFI machines. The build verifies both are present."),
("How is the AI knowledge kept current?",
 "The knowledge base lives in the universe-ai repository at brain/knowledge/universe-os-knowledge.md. The system prompt half is injected into the model's Modelfile, the deep half is served by the os_knowledge tool. When the OS changes, this file is updated and the model is retrained or the Modelfile rebuilt."),
("What is the universe-fetch app?",
 "It is the system information app - a fastfetch-style summary of the machine with the Universe OS branding and the version watermark."),
("What is universe-security?",
 "It is the security overview app: it surfaces the state of the privilege gate, the firewall, the update state and the audit findings in one place."),
("What is universe-monitor?",
 "It is the system monitor - processes, memory, disk and the OS watermark with the version string."),
("What is universe-files?",
 "It is the file manager of the suite, built for the same GTK4 + libadwaita look as the rest of the apps."),
("What is the universe-welcome app?",
 "It is the first-run experience: it introduces the system, its modes and its features to a new user."),
("What is the mode-selector in rust/?",
 "It is the Rust component that switches the desktop between the mode sheets, working with the universe-glass extension so a mode change moves the shell theme, the wallpapers and the glass tint together."),
("What should I check before claiming an OS change works?",
 "That it was verified inside the image, not on the host: CSS through css-parse-check, icons through app-icon-check, glass through the glass checkers, and anything visual through a QEMU boot with screenshot diffs."),
]

for q, a in CURATED:
    add(q, a)

KEY_FILES = {
"scripts/build-iso-noroot.sh": "the current ISO build script. It packs build/chroot-kali and the staging tree into the hybrid ISO as the normal user, deletes the old ISO at pack time, and carries the version strings.",
"scripts/sync-rootfs-to-chroot.sh": "deploys scripts/rootfs/ into build/chroot-kali with sudo, restores setuid modes, repairs polkit directory permissions, removes orphaned systemd symlinks and prunes files deleted from the source using build/.rootfs-manifest.",
"scripts/grub_theme_metrics.py": "the single source of truth for GRUB menu geometry. It writes the theme text; the pixmaps come from gen-grub-theme.py.",
"scripts/gen-grub-theme.py": "renders the GRUB theme artwork - the panel, the selection tiles and the planet - and writes theme.txt. PLANET_CX controls the planet position.",
"scripts/gen-mode-themes.py": "builds the four mode stylesheets, appending scripts/shell-theme/universe-additions.css to each.",
"scripts/gen-mode-wallpapers.py": "generates the wallpapers for the desktop modes.",
"scripts/build-shell-theme.py": "compiles the GNOME Shell theme from the vendored sources, running sheets through css-downgrade.py.",
"scripts/gen-boot-splash.sh": "generates splash.raw and the plymouth splash image from the logo artwork.",
"scripts/gen-panel-mark.py": "builds /usr/share/universe/panel-mark.png from the clean logo with an alpha bounding-box crop.",
"scripts/gen-chrome-theme.py": "rewrites the Star Deck theme directories and both CRX packages from scripts/chrome-theme/newtab.html.",
"scripts/restore-legacy-app-icons.py": "reinstalls the per-app planet icons from assets/app-icons/.",
"scripts/src/uni-fb-splash.c": "the frame-buffer splash painter: tries /dev/fb0 to /dev/fb2 and supports 16, 24 and 32 bits per pixel.",
"scripts/rootfs/usr/bin/universe-settings": "the control centre - a GTK4 + libadwaita app with 9 pages, including the Liquid Glass level slider and the mode selector. It runs elevated and writes user settings through set-appearance.sh.",
"scripts/rootfs/usr/bin/universe-privilege": "the sudo replacement: classifies a command, refuses or runs the safe ones, and deposits a job for the root-side gate. It never decides on the user side.",
"scripts/rootfs/usr/bin/universe-approve": "the root-side consent dialog (Python GTK4, launched through pkexec) that owns the decision and the rules store at /var/lib/universe/privilege/rules.json.",
"scripts/rootfs/usr/bin/gate-exec": "the setuid helper that executes single-use root-deposited jobs after approval.",
"scripts/rootfs/usr/bin/universe-root-launch": "elevates an app with pkexec and forwards HOME, XDG_CONFIG_HOME and DBUS_SESSION_BUS_ADDRESS. It uses a marker file written by the elevated copy to distinguish success from the dead fallback path.",
"scripts/rootfs/usr/bin/universe-welcome": "the first-run introduction app.",
"scripts/rootfs/usr/bin/universe-installer": "the installer front end; the disk work is in usr/lib/universe/install-disk.sh.",
"scripts/rootfs/usr/bin/universe-monitor": "the system monitor with the version watermark.",
"scripts/rootfs/usr/bin/universe-files": "the file manager of the suite.",
"scripts/rootfs/usr/bin/universe-security": "the security overview app.",
"scripts/rootfs/usr/bin/universe-fetch": "the system information app with the OS branding.",
"scripts/rootfs/etc/polkit-1/rules.d/49-universe.rules": "the pkexec allowlist for the Universe helpers. Every new pkexec'd helper must be added here.",
"scripts/rootfs/etc/systemd/system/universe-splash.service": "the boot splash unit - Type=oneshot started from sysinit.target with setsid and KillMode=none so it can never delay graphical.target.",
"scripts/rootfs/usr/share/glib-2.0/schemas/": "the GSettings schemas, including os.universe.glass level and tint.",
"scripts/rootfs/usr/lib/universe/install-disk.sh": "the installer's disk engine: partition shrinking, btrfs with /@, and the unquoted heredocs that write the installed system's configs.",
"scripts/rootfs/opt/universe-ai/": "the Universe AI Electron app as shipped in the image - harness in main.js, chat renderer, mascot and helper scripts.",
"rust/": "the Rust components being moved into the system: installer, privilege, monitor, firewall, cleaner, network, security, ui and mode-selector.",
"universe-settings/": "the Rust rewrite of the settings app, still in development and not yet part of the ISO.",
"gnome-apps/": "the Python drafts of the GNOME apps before they are finalised into the rootfs.",
"build/testtools/": "the verification tools: app-icon-check.py, css-parse-check.sh, glass-level-check.py, glass-live-path-check.py, glass-privilege-check.py and gtk-window-ground-check.py.",
"Universe-OS-HANDOFF.md": "the project handoff document - what the system is, how it is built, the folder map and the traps.",
"Universe-OS-transcript.md": "the detailed knowledge base and raw session transcript behind the handoff.",
"audits/": "the security and UX audit reports.",
}

for path, desc in KEY_FILES.items():
    add("What is %s in the Universe OS project?" % path, desc)

SKIP_DIRS = {"build", "node_modules", "target", ".git", "__pycache__", ".workbuddy", "plymouth-build", "attic", "dist", "out", ".cache"}
TEXT_EXT = {".sh", ".py", ".rs", ".c", ".h", ".css", ".js", ".mjs", ".html", ".json", ".md", ".desktop", ".service", ".rules", ".toml", ".cfg", ".xml", ".txt", ".conf", ".policy", ".schema", ".gschema.xml", ".in"}
MAX_SIZE = 200 * 1024

def purpose_of(path, text):
    name = os.path.basename(path)
    ext = os.path.splitext(name)[1].lower()
    lines = text.splitlines()
    if ext == ".sh":
        for ln in lines[:40]:
            s = ln.strip()
            if s.startswith("#!") or not s:
                continue
            if s.startswith("#") and len(s) > 3:
                return s.lstrip("# ").strip()[:220]
            break
        for ln in lines[:80]:
            m = re.search(r'echo\s+"?=*\s*([A-Za-z][^"=]{6,90})', ln)
            if m:
                return m.group(1).strip()[:220]
    elif ext == ".py":
        m = re.search(r'"""(.+?)"""', text, re.S)
        if m:
            first = m.group(1).strip().splitlines()[0].strip()
            if first:
                return first[:220]
        for ln in lines[:40]:
            s = ln.strip()
            if s.startswith("#") and len(s) > 3:
                return s.lstrip("# ").strip()[:220]
    elif ext == ".rs":
        for ln in lines[:40]:
            s = ln.strip()
            if s.startswith("//!"):
                return s.lstrip("/! ").strip()[:220]
    elif ext in (".service",):
        m = re.search(r"^Description=(.+)$", text, re.M)
        if m:
            return m.group(1).strip()[:220]
    elif ext == ".desktop":
        m = re.search(r"^(?:Comment|Name)=(.+)$", text, re.M)
        if m:
            return m.group(1).strip()[:220]
    elif ext == ".css":
        m = re.search(r"/\*(.+?)\*/", text, re.S)
        if m:
            first = m.group(1).strip().splitlines()[0].strip()
            if first:
                return first[:220]
    elif ext in (".js", ".mjs", ".c", ".h"):
        for ln in lines[:40]:
            s = ln.strip()
            if s.startswith("//") and len(s) > 3:
                return s.lstrip("/ ").strip()[:220]
            if s.startswith("/*") and len(s) > 3:
                return s.lstrip("/* ").strip()[:220]
    elif ext == ".json":
        try:
            data = json.loads(text)
            if isinstance(data, dict):
                return "a JSON data file with keys: " + ", ".join(list(data.keys())[:8])
        except Exception:
            pass
    return "a %s file" % (ext.lstrip(".") or "text")

def walk():
    found = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        rel = os.path.relpath(dirpath, ROOT)
        if rel == ".":
            rel = ""
        for fn in filenames:
            ext = os.path.splitext(fn)[1].lower()
            if ext not in TEXT_EXT:
                continue
            p = os.path.join(dirpath, fn)
            try:
                if os.path.getsize(p) > MAX_SIZE:
                    continue
                text = open(p, encoding="utf-8", errors="ignore").read()
            except Exception:
                continue
            found.append((os.path.join(rel, fn) if rel else fn, text))
    return sorted(found)

files = walk()
by_dir = {}
for rel, text in files:
    d = os.path.dirname(rel) or "."
    by_dir.setdefault(d, []).append((os.path.basename(rel), text, rel))

for d, items in sorted(by_dir.items()):
    names = sorted(set(n for n, _, _ in items))
    if not names:
        continue
    if len(names) > 40:
        names = names[:40] + ["..."]
    add("What files are in %s of the Universe OS project?" % d,
        "The directory %s contains: %s." % (d, ", ".join(names)))

count = 0
for rel, text in files:
    if rel in KEY_FILES:
        continue
    desc = purpose_of(rel, text)
    if desc == "a text file":
        continue
    add("What is the file %s in the Universe OS project?" % rel,
        "%s is %s." % (rel, desc))
    count += 1

DOCS = [
    os.path.join(ROOT, "Universe-OS-HANDOFF.md"),
    os.path.join(ROOT, ".workbuddy", "memory", "MEMORY.md"),
]
BAD_TITLES = {"assistant", "user", "blocked", "tools", "notes", "todo", "next", "done"}
PERSIAN = re.compile(r"[\u0600-\u06FF]")

def persian_ratio(s):
    if not s:
        return 1.0
    return len(PERSIAN.findall(s)) / max(len(s), 1)

doc_count = 0
seen_titles = set()
for doc in DOCS:
    if not os.path.exists(doc):
        continue
    base = os.path.basename(doc)
    text = open(doc, encoding="utf-8", errors="ignore").read()
    for m in re.finditer(r"^(#{2,3})\s+(.+)$", text, re.M):
        title = m.group(2).strip()
        if title.lower() in BAD_TITLES or len(title) < 4:
            continue
        start = m.end()
        nxt = re.search(r"^#{2,3}\s+", text[start:], re.M)
        body = text[start:start + (nxt.start() if nxt else 4000)]
        body = re.sub(r"```.*?```", " ", body, flags=re.S)
        body = re.sub(r"\s+", " ", body).strip()
        if len(body) < 200 or persian_ratio(body) > 0.05:
            continue
        if "tool: bash" in body or "status completed" in body:
            continue
        key = title.lower()
        if key in seen_titles:
            continue
        seen_titles.add(key)
        body = body[:1400]
        add("From the Universe OS %s: explain %s." % (base, title), body)
        doc_count += 1

KB = os.path.join(HERE, "universe-os-knowledge.md")
kb_count = 0
if os.path.exists(KB):
    text = open(KB, encoding="utf-8", errors="ignore").read()
    text = text.split("<!-- system-prompt-end -->")[0] + text.split("<!-- system-prompt-end -->")[-1]
    for m in re.finditer(r"^(##)\s+(.+)$", text, re.M):
        title = m.group(2).strip()
        start = m.end()
        nxt = re.search(r"^##\s+", text[start:], re.M)
        body = text[start:start + (nxt.start() if nxt else 6000)]
        body = re.sub(r"```.*?```", " ", body, flags=re.S)
        body = re.sub(r"\s+", " ", body).strip()
        if len(body) < 120:
            continue
        add("What does the Universe OS knowledge base say about: %s?" % title, body[:1800])
        kb_count += 1

with open(OUT, "w", encoding="utf-8") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")

print("curated:", len(CURATED))
print("key files:", len(KEY_FILES))
print("dir listings:", len(by_dir))
print("file entries:", count)
print("doc sections:", doc_count)
print("kb sections:", kb_count)
print("total rows:", len(rows))
print("written:", OUT)
