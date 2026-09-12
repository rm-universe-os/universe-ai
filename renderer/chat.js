"use strict";
const {
    ipcRenderer
} = require("electron");
const logEl = document.getElementById("log");
const scrollEl = document.getElementById("scroll");
const statusEl = document.getElementById("status");
const statusText = document.getElementById("status-text");
const agentEl = document.getElementById("agent");
const orbEl = document.getElementById("state-orb");
const inputEl = document.getElementById("input");

function scrollDown() {
    scrollEl.scrollTop = scrollEl.scrollHeight;
}
(function deepSpace() {
    const cv = document.getElementById("deep");
    const ctx = cv.getContext("2d");
    let W = 0,
        H = 0,
        DPR = Math.min(window.devicePixelRatio || 1, 2);
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
        const N = Math.max(14, Math.floor(W * H / 14000));
        for (let i = 0; i < N; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                z: 0.25 + Math.random() * 0.75,
                // depth → parallax + brightness
                r: 0.45 + Math.random() * 0.9,
                tw: Math.random() * Math.PI * 2,
                // twinkle phase
                ts: 0.4 + Math.random() * 1.6,
                // twinkle speed
                hue: Math.random() < 0.14 ? "warm" : Math.random() < 0.3 ? "ice" : "plain"
            });
        }
    }
    resize();
    window.addEventListener("resize", resize);

    function colorOf(s, a) {
        if (s.hue === "warm") return `rgba(255, 214, 165, ${a})`;
        if (s.hue === "ice") return `rgba(160, 210, 255, ${a})`;
        return `rgba(220, 230, 255, ${a})`;
    }

    function tick(t) {
        requestAnimationFrame(tick);
        if (document.hidden) return;
        ctx.clearRect(0, 0, W, H);
    // nebula — 3 huge soft blobs, barely there
    if (!nebulaBlobs.length || nebulaW !== W) {
        nebulaW = W;
        nebulaBlobs = [
            { x: W * 0.22, y: H * 0.2, r: W * 0.5, c: "99, 91, 255", a: 0.05, dx: 0.9 },
            { x: W * 0.85, y: H * 0.55, r: W * 0.42, c: "40, 90, 220", a: 0.055, dx: -0.6 },
            { x: W * 0.45, y: H * 0.95, r: W * 0.4, c: "30, 180, 210", a: 0.035, dx: 0.4 }
        ];
    }
    for (const nb of nebulaBlobs) {
        nb.x += nb.dx * 0.02;
        if (nb.x - nb.r > W) nb.x = -nb.r;
        if (nb.x + nb.r < 0) nb.x = W + nb.r;
        const g = ctx.createRadialGradient(nb.x, nb.y, 0, nb.x, nb.y, nb.r);
        g.addColorStop(0, `rgba(${nb.c}, ${nb.a})`);
        g.addColorStop(1, `rgba(${nb.c}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }
        const drift = 4.2;
        for (const s of stars) {
            s.x -= drift * s.z * 0.016;
            if (s.x < -2) {
                s.x = W + 2;
                s.y = Math.random() * H;
            }
            const tw = 0.5 + 0.5 * Math.sin(t * 1e-3 * s.ts + s.tw);
            const a = (0.3 + 0.5 * s.z) * (0.3 + 0.5 * tw) * 0.75;
            ctx.beginPath();
            ctx.fillStyle = colorOf(s, a);
            ctx.arc(s.x, s.y, s.r * (0.8 + 0.4 * s.z), 0, 6.2832);
            ctx.fill();
        }
        const now = t * 1e-3;
        if (!meteor && now > nextMeteorAt) {
            meteor = {
                x: W * (0.15 + Math.random() * 0.7),
                y: -20,
                vx: (Math.random() < 0.5 ? -1 : 1) * (140 + Math.random() * 120),
                vy: 180 + Math.random() * 140,
                life: 0
            };
        }
        if (meteor) {
            meteor.life += 0.016;
            meteor.x += meteor.vx * 0.016;
            meteor.y += meteor.vy * 0.016;
            const fade = Math.max(0, 1 - meteor.life / 1.4);
            if (fade <= 0 || meteor.y > H + 30) {
                meteor = null;
                nextMeteorAt = now + 5 + Math.random() * 9;
            } else {
                const tail = 14;
                const grd = ctx.createLinearGradient(
                    meteor.x,
                    meteor.y,
                    meteor.x - meteor.vx * 1e-3 * 60 * (tail / 14),
                    meteor.y - meteor.vy * 1e-3 * 60 * (tail / 14)
                );
                grd.addColorStop(0, `rgba(220, 240, 255, ${0.85 * fade})`);
                grd.addColorStop(1, "rgba(140, 180, 255, 0)");
                ctx.strokeStyle = grd;
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(meteor.x, meteor.y);
                ctx.lineTo(
                    meteor.x - meteor.vx * 0.085,
                    meteor.y - meteor.vy * 0.085
                );
                ctx.stroke();
                ctx.beginPath();
                ctx.fillStyle = `rgba(240, 248, 255, ${0.9 * fade})`;
                ctx.arc(meteor.x, meteor.y, 1.4, 0, 6.2832);
                ctx.fill();
            }
        }
    }
    requestAnimationFrame(tick);
})();

function addLine(cls, prefix, text) {
    const div = document.createElement("div");
    div.className = "line " + cls;
    if (prefix) {
        const p = document.createElement("span");
        p.className = "prefix";
        p.textContent = prefix;
        div.appendChild(p);
    }
    div.appendChild(document.createTextNode(text));
    logEl.appendChild(div);
    scrollDown();
    return div;
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
        logEl.appendChild(streamLine);
    }
    streamNode.textContent += delta;
    scrollDown();
}

function endStream() {
    if (cursor) cursor.remove();
    cursor = null;
    if (streamLine && !streamNode.textContent.trim()) streamLine.remove();
    streamLine = null;
    streamNode = null;
}
const tools = /* @__PURE__ */ new Map();

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
            head.appendChild(why);
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
        tools.set(id, t);
    }
    return t;
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
        lines.push("\u2026[truncated at 400 lines]");
    }
    t.body.appendChild(document.createTextNode(lines.join("\n") + (lines.length ? "\n" : "")));
    t.lines += lines.length;
    if (opts.done) {
        t.root.classList.remove("pending");
        scrollDown();
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
    const done = (verdict) => {
        ok.remove();
        no.remove();
        const v = document.createElement("div");
        v.className = "verdict";
        v.textContent = verdict ? "\u2192 approved" : "\u2192 denied";
        root.appendChild(v);
    };
    ok.addEventListener("click", () => {
        done(true);
        ipcRenderer.send("approval-response", {
            id,
            ok: true
        });
    });
    no.addEventListener("click", () => {
        done(false);
        ipcRenderer.send("approval-response", {
            id,
            ok: false
        });
    });
}
ipcRenderer.on("chat-history", (e, m) => {
    const events = m && m.events || [];
    let sessN = 0;
    for (const ev of events) {
        if (ev.t === "session") {
            sessN++;
            addSessionAnchor(sessN, ev.time);
        } else if (ev.t === "user") addLine("user", "\u276F", ev.text);
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
                    t.root.insertBefore(v, t.body);
                }
            }
        } else if (ev.t === "meta") addLine("meta", "", ev.text);
        else if (ev.t === "error") addLine("error", "", "\u2717 " + ev.text);
    }
    liveSession = sessN;
    if (events.length) {
        const div = document.createElement("div");
        div.className = "line meta hist-div";
        div.textContent = "\u2014 new session \u2014";
        logEl.appendChild(div);
    }
    scrollDown();
});
let liveSession = 0;
let liveSessionOpen = false;

function addSessionAnchor(n, time) {
    const div = document.createElement("div");
    div.className = "line session-anchor";
    div.id = "session-" + n;
    const when = time ? new Date(time) : null;
    const whenTxt = when && !isNaN(when) ? when.toLocaleString(void 0, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }) : "";
    div.textContent = `\u25C8 Session ${n}${whenTxt ? " \xB7 " + whenTxt : ""}`;
    logEl.appendChild(div);
    return div;
}
ipcRenderer.on("chat-user", (e, m) => {
    endStream();
    if (liveSessionOpen === false) {
        liveSession++;
        addSessionAnchor(liveSession, ( /* @__PURE__ */ new Date()).toISOString());
        liveSessionOpen = true;
    }
    addLine("user", "\u276F", m.text);
});
ipcRenderer.on("chat-assistant", (e, m) => streamDelta(m.delta || ""));
ipcRenderer.on("chat-tool", (e, m) => {
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
        if (t) t.root.classList.remove("pending");
    } else if (m.phase === "blocked") {
        toolBlock(m.id, cmd, {
            blocked: true,
            why: m.reason
        });
        toolOutput(m.id, m.reason || "blocked by safety policy", {
            command: cmd,
            done: true
        });
    } else if (m.phase === "denied") {
        const t = toolBlock(m.id, cmd, {});
        const v = document.createElement("div");
        v.className = "verdict";
        v.textContent = "(denied by user)";
        t.root.insertBefore(v, t.body);
        t.root.classList.remove("pending");
    } else if (m.phase === "output") {
        if (m.web && m.results && m.results.length) {
            webResults(m.id, cmd, m.results);
        } else {
            toolOutput(m.id, m.output, { command: cmd, done: true });
        }
    }
});

/* web search result cards */
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
        title.addEventListener("click", (e) => {
            e.preventDefault();
            ipcRenderer.send("open-external", title.href);
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
        t.body.appendChild(card);
    }
    t.root.classList.remove("pending");
    scrollDown();
}
ipcRenderer.on("chat-approval", (e, m) => approvalBlock(m.id, m.tool, m.command));
ipcRenderer.on("chat-meta", (e, m) => {
    endStream();
    if (m.type === "welcome") {
        addLine("welcome", "", m.text);
        return;
    }
    if (m.type === "cleared") {
        logEl.innerHTML = "";
        addLine("welcome", "", "Universe AI online");
        return;
    }
    if (m.type === "error") addLine("error", "", "\u2717 " + m.text);
    else addLine("meta", "", m.text || "");
});
ipcRenderer.on("chat-status", (e, m) => {
    if (m && m.text) {
        statusText.textContent = m.text;
        statusEl.classList.remove("hidden");
    }
});
ipcRenderer.on("chat-state", (e, m) => {
    const s = m && m.state || "idle";
    agentEl.classList.toggle("busy", s !== "idle");
    orbEl.dataset.state = s;
    orbEl.title = s;
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
        statusEl.classList.remove("hidden");
    } else statusEl.classList.add("hidden");
});
const histPanel = document.getElementById("hist-panel");
const histList = document.getElementById("hist-list");

function sessionSummaries() {
    const anchors = logEl.querySelectorAll(".session-anchor");
    const out = [];
    anchors.forEach((a, i) => {
        const next = anchors[i + 1];
        let node = a.nextElementSibling,
            firstUser = "",
            msgs = 0;
        while (node && node !== next) {
            if (node.classList.contains("user") && !firstUser) firstUser = node.textContent.replace(/^❯\s*/, "");
            if (node.classList.contains("user") || node.classList.contains("assistant")) msgs++;
            node = node.nextElementSibling;
        }
        out.push({
            id: a.id,
            title: a.textContent,
            first: firstUser || "(no messages)",
            msgs
        });
    });
    return out.reverse();
}

function renderHistory() {
    histList.innerHTML = "";
    const items = sessionSummaries();
    if (!items.length) {
        const e = document.createElement("div");
        e.className = "hist-empty";
        e.textContent = "no sessions yet \u2014 say something to the universe";
        histList.appendChild(e);
        return;
    }
    for (const it of items) {
        const row = document.createElement("button");
        row.className = "hist-item";
        const t = document.createElement("span");
        t.className = "hist-title";
        t.textContent = it.title;
        const s = document.createElement("span");
        s.className = "hist-sub";
        s.textContent = it.first + " \xB7 " + it.msgs + " msg";
        row.appendChild(t);
        row.appendChild(s);
        row.addEventListener("click", () => {
            histPanel.classList.add("hidden");
            const el = document.getElementById(it.id);
            if (el) el.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
        histList.appendChild(row);
    }
}
document.getElementById("btn-hist").addEventListener("click", () => {
    renderHistory();
    histPanel.classList.toggle("hidden");
});
document.getElementById("hist-close").addEventListener("click", () => histPanel.classList.add("hidden"));
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
    });
}

function autosize() {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(120, inputEl.scrollHeight) + "px";
}
const phEl = document.getElementById("ph");
const SUGGESTIONS = [
    "what is my disk usage?",
    "search the web for\u2026",
    "write a script and run it",
    "what time is it on Mars?",
    "fetch this URL for me\u2026"
];
let phI = 0;

function phVis() {
    const empty = !inputEl.value;
    phEl.style.opacity = empty && document.activeElement !== inputEl ? 1 : 0;
}
setInterval(() => {
    if (document.activeElement !== inputEl && !inputEl.value) {
        phEl.style.opacity = 0;
        setTimeout(() => {
            phI = (phI + 1) % SUGGESTIONS.length;
            phEl.textContent = SUGGESTIONS[phI];
            phEl.style.opacity = 1;
        }, 480);
    }
}, 4600);
inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
    } else if (e.key === "Escape") {
        ipcRenderer.send("chat-close");
    } else if (e.key === "u" && e.ctrlKey) {
        e.preventDefault();
        ipcRenderer.send("chat-clear");
    }
});
inputEl.addEventListener("input", () => {
    autosize();
    btnSend.classList.toggle("ready", !!inputEl.value.trim());
    phVis();
});
inputEl.addEventListener("focus", phVis);
inputEl.addEventListener("blur", phVis);
document.getElementById("btn-clear").addEventListener("click", () => ipcRenderer.send("chat-clear"));
document.getElementById("btn-close").addEventListener("click", () => ipcRenderer.send("chat-close"));
btnSend.addEventListener("click", send);
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") ipcRenderer.send("chat-close");
    if (e.key === "u" && e.ctrlKey) {
        e.preventDefault();
        ipcRenderer.send("chat-clear");
    }
});
inputEl.focus();