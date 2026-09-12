"use strict";
const {
    ipcRenderer
} = require("electron");
const views = {
    alert: document.getElementById("alert-view"),
    prog: document.getElementById("prog-view")
};
const errEl = document.getElementById("err");
const barFill = document.getElementById("bar-fill");
const bytesEl = document.getElementById("bytes");
const finalMsg = document.getElementById("final-msg");
const phases = [1, 2, 3, 4].map(n => document.getElementById("ph" + n));

function fmtBytes(n) {
    if (n > 1e9) return (n / 1e9).toFixed(2) + " GB";
    if (n > 1e6) return (n / 1e6).toFixed(1) + " MB";
    if (n > 1e3) return (n / 1e3).toFixed(0) + " KB";
    return n + " B"
}
document.getElementById("btn-download").addEventListener("click", () => {
    views.alert.classList.add("hidden");
    views.prog.classList.remove("hidden");
    ipcRenderer.invoke("setup-start")
});
document.getElementById("btn-cancel").addEventListener("click", () => ipcRenderer.send("setup-cancel"));
document.getElementById("btn-close").addEventListener("click", () => ipcRenderer.send("setup-cancel"));
document.getElementById("btn-enter").addEventListener("click", () => ipcRenderer.send("setup-finished"));
ipcRenderer.on("setup-phase", (e, m) => {
    const idx = (m.phase || 1) - 1;
    phases.forEach((el, i) => {
        el.classList.toggle("active", i === idx && !m.done);
        if (i < idx) {
            el.classList.add("done");
            el.classList.remove("active")
        }
        if (m.done && i === idx) {
            el.classList.add("done");
            el.classList.remove("active")
        }
    });
    phases[idx].querySelector(".msg").textContent = m.msg || "";
    if (!m.done && typeof m.pct !== "undefined") {
        const slice = 100 / 4;
        barFill.style.width = idx * slice + (m.pct || 0) * slice / 100 + "%"
    }
    if (m.done) barFill.style.width = m.phase * 25 + "%";
    bytesEl.textContent = typeof m.got === "number" ? `${fmtBytes(m.got)}${m.total?" / "+fmtBytes(m.total):""}` : ""
});
ipcRenderer.on("setup-progress", (e, m) => {
    const idx = m.phase === "runtime" ? 0 : 1;
    const slice = 100 / 4;
    barFill.style.width = idx * slice + (m.pct || 0) * slice / 100 + "%";
    bytesEl.textContent = `${fmtBytes(m.got)}${m.total?" / "+fmtBytes(m.total):""}`
});
ipcRenderer.on("setup-done", (e, m) => {
    if (m.ok) {
        phases.forEach(el => {
            el.classList.add("done");
            el.classList.remove("active")
        });
        barFill.style.width = "100%";
        bytesEl.textContent = "";
        finalMsg.classList.remove("hidden")
    } else {
        const act = phases.findIndex(el2 => el2.classList.contains("active"));
        const el = act >= 0 ? phases[act] : phases[3];
        el.classList.add("fail");
        el.classList.remove("active");
        errEl.textContent = "\u2717 " + (m.error || "setup failed");
        errEl.classList.remove("hidden")
    }
});