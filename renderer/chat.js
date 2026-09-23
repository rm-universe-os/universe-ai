"use strict";
const {
    ipcRenderer,
    clipboard
} = require("electron");
const logEl = document.getElementById("log");
const scrollEl = document.getElementById("scroll");
const statusEl = document.getElementById("status");
const statusText = document.getElementById("status-text");
const agentEl = document.getElementById("agent");
const orbEl = document.getElementById("state-orb");
const inputEl = document.getElementById("input");
const btnStop = document.getElementById("btn-stop");

function scrollDown() {
    scrollEl.scrollTop = scrollEl.scrollHeight
}
const CHAT_PALETTES = {
    developer: {
        nebula: ["120, 92, 255", "76, 58, 200", "150, 100, 255"],
        ice: "200, 190, 255"
    },
    hacker: {
        nebula: ["43, 200, 110", "24, 140, 80", "0, 200, 140"],
        ice: "190, 255, 215"
    }
};
(function deepSpace() {
    const cv = document.getElementById("deep");
    const ctx = cv.getContext("2d");
    let W = 0,
        H = 0,
        DPR = Math.min(window.devicePixelRatio || 1, 2);
    let palette = null;
    window.__uaiChatMode = function(mode) {
        palette = CHAT_PALETTES[mode] || null;
        document.documentElement.dataset.mode = mode || "";
        nebulaW = 0
    };
    let stars = [];
    let nebulaBlobs = [];
    let nebulaW = 0;
    let meteor = null;
    let nextMeteorAt = 14 + Math.random() * 14;

    function resize() {
        W = cv.clientWidth;
        H = cv.clientHeight;
        cv.width = W * DPR;
        cv.height = H * DPR;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        stars = [];
        const N = Math.max(14, Math.floor(W * H / 14e3));
        for (let i = 0; i < N; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                z: .25 + Math.random() * .75,
                r: .45 + Math.random() * .9,
                tw: Math.random() * Math.PI * 2,
                ts: .4 + Math.random() * 1.6,
                hue: Math.random() < .14 ? "warm" : Math.random() < .3 ? "ice" : "plain"
            })
        }
    }
    resize();
    window.addEventListener("resize", resize);

    function colorOf(s, a) {
        if (s.hue === "warm") return `rgba(255, 214, 165, ${a})`;
        if (s.hue === "ice") return `rgba(${palette?palette.ice:"160, 210, 255"}, ${a})`;
        return `rgba(220, 230, 255, ${a})`
    }

    function tick(t) {
        requestAnimationFrame(tick);
        if (document.hidden) return;
        ctx.clearRect(0, 0, W, H);
        if (!nebulaBlobs.length || nebulaW !== W) {
            nebulaW = W;
            const nc = palette ? palette.nebula : ["99, 91, 255", "40, 90, 220", "30, 180, 210"];
            nebulaBlobs = [{
                x: W * .22,
                y: H * .2,
                r: W * .5,
                c: nc[0],
                a: .05,
                dx: .9
            }, {
                x: W * .85,
                y: H * .55,
                r: W * .42,
                c: nc[1],
                a: .055,
                dx: -.6
            }, {
                x: W * .45,
                y: H * .95,
                r: W * .4,
                c: nc[2],
                a: .035,
                dx: .4
            }]
        }
        for (const nb of nebulaBlobs) {
            nb.x += nb.dx * .02;
            if (nb.x - nb.r > W) nb.x = -nb.r;
            if (nb.x + nb.r < 0) nb.x = W + nb.r;
            const g = ctx.createRadialGradient(nb.x, nb.y, 0, nb.x, nb.y, nb.r);
            g.addColorStop(0, `rgba(${nb.c}, ${nb.a})`);
            g.addColorStop(1, `rgba(${nb.c}, 0)`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H)
        }
        const drift = 4.2;
        for (const s of stars) {
            s.x -= drift * s.z * .016;
            if (s.x < -2) {
                s.x = W + 2;
                s.y = Math.random() * H
            }
            const tw = .5 + .5 * Math.sin(t * .001 * s.ts + s.tw);
            const a = (.3 + .5 * s.z) * (.3 + .5 * tw) * .75;
            ctx.beginPath();
            ctx.fillStyle = colorOf(s, a);
            ctx.arc(s.x, s.y, s.r * (.8 + .4 * s.z), 0, 6.2832);
            ctx.fill()
        }
        const now = t * .001;
        if (!meteor && now > nextMeteorAt) {
            meteor = {
                x: W * (.15 + Math.random() * .7),
                y: -20,
                vx: (Math.random() < .5 ? -1 : 1) * (140 + Math.random() * 120),
                vy: 180 + Math.random() * 140,
                life: 0
            }
        }
        if (meteor) {
            meteor.life += .016;
            meteor.x += meteor.vx * .016;
            meteor.y += meteor.vy * .016;
            const fade = Math.max(0, 1 - meteor.life / 1.4);
            if (fade <= 0 || meteor.y > H + 30) {
                meteor = null;
                nextMeteorAt = now + 5 + Math.random() * 9
            } else {
                const tail = 14;
                const grd = ctx.createLinearGradient(meteor.x, meteor.y, meteor.x - meteor.vx * .001 * 60 * (tail / 14), meteor.y - meteor.vy * .001 * 60 * (tail / 14));
                grd.addColorStop(0, `rgba(220, 240, 255, ${.85*fade})`);
                grd.addColorStop(1, "rgba(140, 180, 255, 0)");
                ctx.strokeStyle = grd;
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(meteor.x, meteor.y);
                ctx.lineTo(meteor.x - meteor.vx * .085, meteor.y - meteor.vy * .085);
                ctx.stroke();
                ctx.beginPath();
                ctx.fillStyle = `rgba(240, 248, 255, ${.9*fade})`;
                ctx.arc(meteor.x, meteor.y, 1.4, 0, 6.2832);
                ctx.fill()
            }
        }
    }
    requestAnimationFrame(tick)
})();

function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    } [c]))
}

function inlineFmt(s) {
    let t = escapeHtml(s);
    t = t.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    t = t.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
    t = t.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, "$1<i>$2</i>");
    t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    t = t.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    return t
}

function renderMarkdown(src) {
    const lines = String(src || "").replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let inCode = false,
        codeLang = "",
        codeBuf = [],
        listBuf = [],
        listType = "";
    const flushList = () => {
        if (listBuf.length) {
            out.push("<" + listType + ">" + listBuf.map(x => "<li>" + x + "</li>").join("") + "</" + listType + ">");
            listBuf = [];
            listType = ""
        }
    };
    const flushCode = () => {
        if (codeBuf.length || codeLang) {
            const code = escapeHtml(codeBuf.join("\n"));
            const id = "c" + Math.random().toString(36).slice(2, 9);
            out.push('<div class="code"><div class="code-head"><span class="code-lang">' + escapeHtml(codeLang || "code") + '</span><button class="code-copy" data-code="' + id + '" title="Copy">copy</button></div><pre id="' + id + '">' + code + "</pre></div>")
        }
        codeBuf = [];
        codeLang = ""
    };
    for (const raw of lines) {
        const fence = raw.match(/^\s*```([\w+#.-]*)\s*$/);
        if (fence) {
            if (inCode) {
                inCode = false;
                flushCode()
            } else {
                flushList();
                inCode = true;
                codeLang = fence[1] || ""
            }
            continue
        }
        if (inCode) {
            codeBuf.push(raw);
            continue
        }
        const li = raw.match(/^\s*[-*\u2022]\s+(.+)$/);
        const oli = raw.match(/^\s*\d+[.)]\s+(.+)$/);
        if (li || oli) {
            const type = li ? "ul" : "ol";
            if (listType && listType !== type) flushList();
            listType = type;
            listBuf.push(inlineFmt(li ? li[1] : oli[1]));
            continue
        }
        flushList();
        if (!raw.trim()) {
            out.push('<div class="sp"></div>');
            continue
        }
        const h = raw.match(/^#{1,6}\s+(.+)$/);
        if (h) {
            out.push("<h4>" + inlineFmt(h[1]) + "</h4>");
            continue
        }
        const q = raw.match(/^&gt;\s?(.+)$/) || raw.match(/^>\s?(.+)$/);
        if (q) {
            out.push("<blockquote>" + inlineFmt(q[1]) + "</blockquote>");
            continue
        }
        if (/^\s*([-*_])\1{2,}\s*$/.test(raw)) {
            out.push("<hr>");
            continue
        }
        out.push("<p>" + inlineFmt(raw) + "</p>")
    }
    if (inCode) flushCode();
    flushList();
    return out.join("")
}

function attachCopy(div, getText) {
    const b = document.createElement("button");
    b.className = "copy";
    b.title = "Copy";
    b.textContent = "\u29C9";
    b.addEventListener("click", e => {
        e.stopPropagation();
        try {
            clipboard.writeText(String(getText() || ""));
            b.textContent = "\u2713";
            setTimeout(() => {
                b.textContent = "\u29C9"
            }, 1100)
        } catch (_) {}
    });
    div.appendChild(b)
}

function addLine(cls, prefix, text) {
    const div = document.createElement("div");
    div.className = "line " + cls;
    if (prefix) {
        const p = document.createElement("span");
        p.className = "prefix";
        p.textContent = prefix;
        div.appendChild(p)
    }
    if (cls === "assistant") {
        const body = document.createElement("div");
        body.className = "body";
        body.innerHTML = renderMarkdown(text);
        div.appendChild(body);
        attachCopy(div, () => text)
    } else div.appendChild(document.createTextNode(text));
    logEl.appendChild(div);
    scrollDown();
    return div
}
let streamLine = null,
    streamNode = null,
    cursor = null;

function streamDelta(delta) {
    if (!streamLine) {
        streamLine = document.createElement("div");
        streamLine.className = "line assistant";
        const p = document.createElement("span");
        p.className = "prefix";
        p.textContent = "\u25CF";
        streamNode = document.createTextNode("");
        cursor = document.createElement("span");
        cursor.className = "cursor";
        streamLine.appendChild(p);
        streamLine.appendChild(streamNode);
        streamLine.appendChild(cursor);
        logEl.appendChild(streamLine)
    }
    streamNode.textContent += delta;
    scrollDown()
}

function endStream() {
    if (cursor) cursor.remove();
    cursor = null;
    if (streamLine && !streamNode.textContent.trim()) streamLine.remove();
    else if (streamLine) {
        const raw = streamNode.textContent;
        const body = document.createElement("div");
        body.className = "body";
        body.innerHTML = renderMarkdown(raw);
        streamLine.replaceChild(body, streamNode);
        attachCopy(streamLine, () => raw)
    }
    streamLine = null;
    streamNode = null
}
const tools = new Map;

function toolBlock(id, command, opts = {}) {
    let t = tools.get(id);
    if (!t) {
        const root = document.createElement("div");
        root.className = "tool";
        if (opts.blocked) root.classList.add("blocked");
        if (opts.pending) root.classList.add("pending");
        const head = document.createElement("div");
        head.className = "tool-head";
        const dot = document.createElement("span");
        dot.className = "dot";
        dot.textContent = "\u23FA";
        const code = document.createElement("code");
        code.textContent = command;
        head.appendChild(dot);
        head.appendChild(code);
        if (opts.why) {
            const why = document.createElement("span");
            why.className = "why";
            why.textContent = opts.why;
            head.appendChild(why)
        }
        const chev = document.createElement("span");
        chev.className = "chev";
        chev.textContent = "\u25BE";
        head.appendChild(chev);
        const body = document.createElement("div");
        body.className = "tool-body";
        head.addEventListener("click", () => root.classList.toggle("collapsed"));
        root.appendChild(head);
        root.appendChild(body);
        logEl.appendChild(root);
        scrollDown();
        t = {
            root,
            body,
            head,
            code,
            lines: 0
        };
        tools.set(id, t)
    }
    return t
}
const MAX_TOOL_LINES = 400;

function toolOutput(id, output, opts = {}) {
    const t = toolBlock(id, opts.command || id, opts);
    if (opts.command) t.code.textContent = opts.command;
    const text = String(output == null ? "" : output);
    let lines = text.split("\n");
    if (t.lines >= MAX_TOOL_LINES) return;
    if (t.lines + lines.length > MAX_TOOL_LINES) {
        lines = lines.slice(0, MAX_TOOL_LINES - t.lines);
        lines.push("\u2026[truncated at 400 lines]")
    }
    t.body.appendChild(document.createTextNode(lines.join("\n") + (lines.length ? "\n" : "")));
    t.lines += lines.length;
    if (opts.done) {
        t.root.classList.remove("pending");
        scrollDown()
    }
}

function approvalBlock(id, tool, command) {
    endStream();
    const root = document.createElement("div");
    root.className = "approval";
    const ask = document.createElement("div");
    ask.className = "ask";
    ask.textContent = `\u26A0 ${tool} needs your approval`;
    const code = document.createElement("code");
    code.textContent = command;
    const btns = document.createElement("div");
    btns.className = "btns";
    const ok = document.createElement("button");
    ok.className = "ok";
    ok.textContent = "[Approve]";
    const no = document.createElement("button");
    no.className = "no";
    no.textContent = "[Deny]";
    btns.appendChild(ok);
    btns.appendChild(no);
    root.appendChild(ask);
    root.appendChild(code);
    root.appendChild(btns);
    logEl.appendChild(root);
    scrollDown();
    const done = verdict => {
        ok.remove();
        no.remove();
        const v = document.createElement("div");
        v.className = "verdict";
        v.textContent = verdict ? "\u2192 approved" : "\u2192 denied";
        root.appendChild(v)
    };
    ok.addEventListener("click", () => {
        done(true);
        ipcRenderer.send("approval-response", {
            id,
            ok: true
        })
    });
    no.addEventListener("click", () => {
        done(false);
        ipcRenderer.send("approval-response", {
            id,
            ok: false
        })
    })
}
ipcRenderer.on("chat-mode", (e, m) => {
    if (window.__uaiChatMode) window.__uaiChatMode(m && m.mode)
});
let viewingId = null;
const newActBtn = document.getElementById("new-activity");

function markNewActivity() {
    if (newActBtn) newActBtn.classList.remove("hidden")
}

function clearLog() {
    logEl.innerHTML = "";
    tools.clear();
    endStream();
    if (newActBtn) newActBtn.classList.add("hidden")
}

function renderEvents(events, opts = {}) {
    clearLog();
    if (opts.viewer) {
        const b = document.createElement("div");
        b.className = "viewer-bar";
        const t = document.createElement("span");
        t.textContent = "\u25C8 viewing an earlier conversation";
        const back = document.createElement("button");
        back.textContent = "back to live";
        back.addEventListener("click", backToLive);
        b.appendChild(t);
        b.appendChild(back);
        logEl.appendChild(b)
    }
    for (const ev of events) {
        if (ev.t === "user") addLine("user", "\u276F", ev.text);
        else if (ev.t === "assistant") addLine("assistant", "\u25CF", ev.text);
        else if (ev.t === "tool") {
            const id = "h" + Math.random().toString(36).slice(2, 8);
            toolBlock(id, ev.command, {
                blocked: !!ev.blocked
            });
            toolOutput(id, ev.output || "", {
                command: ev.command,
                done: true
            });
            const t = tools.get(id);
            if (t) {
                t.root.classList.add("collapsed");
                if (ev.denied || /\(denied by user\)/.test(ev.output || "")) {
                    const v = document.createElement("div");
                    v.className = "verdict";
                    v.textContent = "(denied by user)";
                    t.root.insertBefore(v, t.body)
                }
            }
        } else if (ev.t === "meta") addLine("meta", "", ev.text);
        else if (ev.t === "error") addLine("error", "", "\u2717 " + ev.text)
    }
    scrollDown()
}

function backToLive() {
    ipcRenderer.send("chat-history-open", {
        id: "live"
    })
}
ipcRenderer.on("chat-history", (e, m) => {
    viewingId = null;
    renderEvents(m && m.events || [])
});
ipcRenderer.on("chat-history-view", (e, m) => {
    if (!m) return;
    if (m.live) {
        viewingId = null;
        renderEvents(m.events || [])
    } else {
        viewingId = m.id || "view";
        renderEvents(m.events || [], {
            viewer: true
        })
    }
});
ipcRenderer.on("chat-user", (e, m) => {
    if (viewingId) {
        markNewActivity();
        return
    }
    endStream();
    addLine("user", "\u276F", m.text)
});
ipcRenderer.on("chat-assistant", (e, m) => {
    if (viewingId) {
        markNewActivity();
        return
    }
    streamDelta(m.delta || "")
});
ipcRenderer.on("chat-tool", (e, m) => {
    if (viewingId) {
        markNewActivity();
        return
    }
    endStream();
    const cmd = m.command || "";
    if (m.phase === "start") toolBlock(m.id, cmd, {
        pending: true
    });
    else if (m.phase === "ask") toolBlock(m.id, cmd, {
        pending: true,
        why: m.reason ? `needs approval \u2014 ${m.reason}` : "needs approval"
    });
    else if (m.phase === "approved") {
        const t = tools.get(m.id);
        if (t) t.root.classList.remove("pending")
    } else if (m.phase === "blocked") {
        toolBlock(m.id, cmd, {
            blocked: true,
            why: m.reason
        });
        toolOutput(m.id, m.reason || "blocked by safety policy", {
            command: cmd,
            done: true
        })
    } else if (m.phase === "denied") {
        const t = toolBlock(m.id, cmd, {});
        const v = document.createElement("div");
        v.className = "verdict";
        v.textContent = "(denied by user)";
        t.root.insertBefore(v, t.body);
        t.root.classList.remove("pending")
    } else if (m.phase === "output") {
        if (m.web && m.results && m.results.length) {
            webResults(m.id, cmd, m.results)
        } else {
            toolOutput(m.id, m.output, {
                command: cmd,
                done: true
            })
        }
    }
});

function webResults(id, query, results) {
    const t = toolBlock(id, query, {});
    t.body.innerHTML = "";
    t.body.classList.add("web");
    for (const r of results) {
        const card = document.createElement("div");
        card.className = "web-card";
        const title = document.createElement("a");
        title.className = "web-title";
        title.href = r.href || "#";
        title.textContent = r.title || "(untitled)";
        title.addEventListener("click", e => {
            e.preventDefault();
            ipcRenderer.send("open-external", title.href)
        });
        const url = document.createElement("span");
        url.className = "web-url";
        url.textContent = (r.href || "").replace(/^https?:\/\//, "").split("/")[0];
        const snip = document.createElement("div");
        snip.className = "web-snip";
        snip.textContent = r.snippet || "";
        card.appendChild(title);
        card.appendChild(url);
        card.appendChild(snip);
        t.body.appendChild(card)
    }
    t.root.classList.remove("pending");
    scrollDown()
}
ipcRenderer.on("chat-approval", (e, m) => {
    if (viewingId) backToLive();
    approvalBlock(m.id, m.tool, m.command)
});

function showIntro() {
    addLine("welcome", "", "Universe AI online");
    const chips = document.createElement("div");
    chips.className = "chips";
    for (const s of ["what is my disk usage?", "who are you?", "explain file permissions"]) {
        const c = document.createElement("button");
        c.className = "chip";
        c.textContent = s;
        c.addEventListener("click", () => {
            inputEl.value = s;
            inputEl.focus();
            autosize();
            btnSend.classList.add("ready");
            phVis()
        });
        chips.appendChild(c)
    }
    logEl.appendChild(chips);
    scrollDown()
}
ipcRenderer.on("chat-meta", (e, m) => {
    endStream();
    if (m.type === "welcome") {
        if (!logEl.querySelector(".line.user, .line.assistant")) showIntro();
        return
    }
    if (m.type === "cleared") {
        viewingId = null;
        clearLog();
        showIntro();
        return
    }
    if (viewingId) {
        markNewActivity();
        return
    }
    if (m.type === "error") addLine("error", "", "\u2717 " + m.text);
    else addLine("meta", "", m.text || "")
});
ipcRenderer.on("chat-status", (e, m) => {
    if (m && m.text) {
        statusText.textContent = m.text;
        statusEl.classList.remove("hidden")
    }
});
ipcRenderer.on("chat-state", (e, m) => {
    const s = m && m.state || "idle";
    agentEl.classList.toggle("busy", s !== "idle");
    orbEl.dataset.state = s;
    orbEl.title = s;
    btnStop.classList.toggle("hidden", s === "idle");
    btnSend.classList.toggle("hidden", s !== "idle");
    const map = {
        idle: null,
        listening: "listening\u2026",
        thinking: "thinking\u2026",
        "start model": "start model \u25B8",
        speaking: "speaking\u2026",
        excited: "excited!"
    };
    if (map[s]) {
        statusText.textContent = map[s];
        statusEl.classList.remove("hidden")
    } else statusEl.classList.add("hidden")
});
const histPanel = document.getElementById("hist-panel");
const histList = document.getElementById("hist-list");
const histNote = document.getElementById("hist-note");

function histNoteShow(text) {
    if (!histNote) return;
    histNote.textContent = text;
    histNote.classList.remove("hidden");
    clearTimeout(histNoteShow.t);
    histNoteShow.t = setTimeout(() => histNote.classList.add("hidden"), 3600)
}

function fmtWhen(iso) {
    const d = iso ? new Date(iso) : null;
    if (!d || isNaN(d)) return "";
    return d.toLocaleString(void 0, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    })
}

let histCache = [];
let histCurrent = null;

function renderHistoryList(sessions, currentId) {
    histCache = sessions || [];
    histCurrent = currentId;
    const q = (document.getElementById("hist-search") || {}).value || "";
    const filter = q.trim().toLowerCase();
    const list = filter ? histCache.filter(s => String(s.title || "").toLowerCase().includes(filter)) : histCache;
    histList.innerHTML = "";
    if (!histCache.length) {
        const e = document.createElement("div");
        e.className = "hist-empty";
        e.textContent = "no conversations yet \u2014 say something to the universe";
        histList.appendChild(e);
        return
    }
    if (!list.length) {
        const e = document.createElement("div");
        e.className = "hist-empty";
        e.textContent = "no conversation matches \u201C" + q.trim() + "\u201D";
        histList.appendChild(e);
        return
    }
    for (const s of list) {
        const row = document.createElement("div");
        row.className = "hist-item";
        if (s.id === currentId) row.classList.add("current");
        const main = document.createElement("button");
        main.className = "hist-main";
        const t = document.createElement("span");
        t.className = "hist-title";
        t.textContent = s.title || "conversation";
        const sub = document.createElement("span");
        sub.className = "hist-sub";
        sub.textContent = fmtWhen(s.created) + " \xB7 " + (s.count || 0) + " msg" + (s.id === currentId ? " \xB7 current" : "");
        main.appendChild(t);
        main.appendChild(sub);
        main.addEventListener("click", () => {
            ipcRenderer.send("chat-history-open", {
                id: s.id
            });
            histPanel.classList.add("hidden")
        });
        const acts = document.createElement("div");
        acts.className = "hist-acts";
        const exp = document.createElement("button");
        exp.className = "hist-act";
        exp.title = "Export as Markdown";
        exp.textContent = "\u2913";
        exp.addEventListener("click", e => {
            e.stopPropagation();
            ipcRenderer.send("chat-history-export", {
                id: s.id
            })
        });
        const del = document.createElement("button");
        del.className = "hist-act del";
        del.title = "Delete";
        del.textContent = "\u2715";
        del.addEventListener("click", e => {
            e.stopPropagation();
            if (!del.classList.contains("sure")) {
                del.classList.add("sure");
                del.textContent = "sure?";
                setTimeout(() => {
                    del.classList.remove("sure");
                    del.textContent = "\u2715"
                }, 2600);
                return
            }
            ipcRenderer.send("chat-history-delete", {
                id: s.id
            })
        });
        acts.appendChild(exp);
        acts.appendChild(del);
        row.appendChild(main);
        row.appendChild(acts);
        histList.appendChild(row)
    }
}
ipcRenderer.on("chat-history-list", (e, m) => {
    renderHistoryList(m && m.sessions || [], m && m.current || null)
});
ipcRenderer.on("chat-history-exported", (e, m) => {
    if (m && m.ok) histNoteShow("exported \u2192 " + m.file);
    else histNoteShow("export failed")
});
const histSearch = document.getElementById("hist-search");
if (histSearch) histSearch.addEventListener("input", () => renderHistoryList(histCache, histCurrent));
const histExportAll = document.getElementById("hist-export-all");
if (histExportAll) histExportAll.addEventListener("click", () => {
    ipcRenderer.send("chat-history-export-all")
});
document.getElementById("btn-hist").addEventListener("click", () => {
    histPanel.classList.toggle("hidden");
    if (!histPanel.classList.contains("hidden")) {
        ipcRenderer.send("chat-history-list")
    }
});
document.getElementById("hist-close").addEventListener("click", () => histPanel.classList.add("hidden"));
if (newActBtn) {
    newActBtn.addEventListener("click", () => {
        backToLive()
    })
}
const btnSend = document.getElementById("btn-send");

function send() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = "";
    autosize();
    btnSend.classList.remove("ready");
    phVis();
    ipcRenderer.send("chat-send", {
        text
    })
}

function autosize() {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(120, inputEl.scrollHeight) + "px"
}
const phEl = document.getElementById("ph");
const SUGGESTIONS = ["what is my disk usage?", "search the web for\u2026", "write a script and run it", "what time is it on Mars?", "fetch this URL for me\u2026"];
let phI = 0;

function phVis() {
    const empty = !inputEl.value;
    phEl.style.opacity = empty && document.activeElement !== inputEl ? 1 : 0
}
setInterval(() => {
    if (document.activeElement !== inputEl && !inputEl.value) {
        phEl.style.opacity = 0;
        setTimeout(() => {
            phI = (phI + 1) % SUGGESTIONS.length;
            phEl.textContent = SUGGESTIONS[phI];
            phEl.style.opacity = 1
        }, 480)
    }
}, 4600);
inputEl.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send()
    } else if (e.key === "Escape") {
        ipcRenderer.send("chat-close")
    } else if (e.key === "u" && e.ctrlKey) {
        e.preventDefault();
        ipcRenderer.send("chat-clear")
    }
});
inputEl.addEventListener("input", () => {
    autosize();
    btnSend.classList.toggle("ready", !!inputEl.value.trim());
    phVis()
});
inputEl.addEventListener("focus", phVis);
inputEl.addEventListener("blur", phVis);
document.getElementById("btn-clear").addEventListener("click", () => ipcRenderer.send("chat-clear"));
document.getElementById("btn-close").addEventListener("click", () => ipcRenderer.send("chat-close"));
btnStop.addEventListener("click", () => ipcRenderer.send("chat-abort"));
document.addEventListener("click", e => {
    const b = e.target && e.target.closest ? e.target.closest(".code-copy") : null;
    if (!b) return;
    const pre = document.getElementById(b.dataset.code);
    if (!pre) return;
    try {
        clipboard.writeText(pre.textContent);
        b.textContent = "copied";
        setTimeout(() => b.textContent = "copy", 1100)
    } catch (_) {}
});
btnSend.addEventListener("click", send);
window.addEventListener("keydown", e => {
    if (e.key === "Escape") ipcRenderer.send("chat-close");
    if (e.key === "." && e.ctrlKey) {
        e.preventDefault();
        ipcRenderer.send("chat-abort")
    }
    if (e.key === "u" && e.ctrlKey) {
        e.preventDefault();
        ipcRenderer.send("chat-clear")
    }
});
inputEl.focus();