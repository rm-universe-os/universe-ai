"use strict";
const {
    ipcRenderer
} = require("electron");
const CHECKER = process.env.UAI_BG === "checker";
if (CHECKER) document.body.classList.add("checker");
const canvas = document.getElementById("pet");
let wantCapture = null;
const origRAF = window.requestAnimationFrame.bind(window);
window.requestAnimationFrame = function(cb) {
    return origRAF(function(t) {
        cb(t);
        if (wantCapture) readCapture();
    });
};

function readCapture() {
    const resolve = wantCapture;
    try {
        const gl = canvas.getContext("webgl") || canvas.getContext("webgl2");
        if (!gl) {
            wantCapture = null;
            return resolve("");
        }
        const w = gl.drawingBufferWidth,
            h = gl.drawingBufferHeight;
        const px = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let hasAlpha = false;
        for (let i = 3; i < px.length; i += 40)
            if (px[i] > 0) {
                hasAlpha = true;
                break;
            }
        if (!hasAlpha) return;
        wantCapture = null;
        resolve(convertToPngDataURL(px, w, h));
    } catch (e) {
        wantCapture = null;
        resolve("");
    }
}

function convertToPngDataURL(px, w, h) {
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d");
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
        const srcRow = (h - 1 - y) * w * 4,
            dstRow = y * w * 4;
        for (let x = 0; x < w; x++) {
            const s = srcRow + x * 4,
                t = dstRow + x * 4;
            const a = px[s + 3];
            d[t + 3] = a;
            if (a > 0) {
                d[t] = Math.min(255, Math.round(px[s] * 255 / a));
                d[t + 1] = Math.min(255, Math.round(px[s + 1] * 255 / a));
                d[t + 2] = Math.min(255, Math.round(px[s + 2] * 255 / a));
            }
        }
    }
    ctx.putImageData(img, 0, 0);
    return out.toDataURL("image/png");
}
window.__uaiCapture = function() {
    return new Promise((resolve) => {
        wantCapture = resolve;
        setTimeout(() => {
            if (wantCapture === resolve) {
                wantCapture = null;
                resolve("");
            }
        }, 900);
    });
};
const mascot = window.UniverseAI.init(canvas, {
    background: false
    // the only allowed change: no starfield background
});

function feedGaze(gx, gy) {
    const r = canvas.getBoundingClientRect();
    const ev = new PointerEvent("pointermove", {
        clientX: r.left + r.width / 2 + gx * innerWidth,
        clientY: r.top + r.height / 2 + gy * innerHeight,
        bubbles: true
    });
    dispatchEvent(ev);
}
let lastGX = null,
    lastGY = null;
ipcRenderer.on("gaze", (e, g) => {
    if (g.x !== lastGX || g.y !== lastGY) {
        lastGX = g.x;
        lastGY = g.y;
        feedGaze(g.x, g.y);
    }
});
ipcRenderer.on("config", (e, c) => {
    if (c && c.eyesFollow === false) feedGaze(0, 0);
});
const speechEl = document.getElementById("speech");
const speechQueue = [];
let speaking = false;

function speak(text) {
    speechQueue.push(String(text || ""));
    if (!speaking) nextSpeech();
}

function nextSpeech() {
    const text = speechQueue.shift();
    if (!text) {
        speaking = false;
        if (mascot && mascot.talk) mascot.talk(false);
        speechEl.classList.remove("show");
        ipcRenderer.send("speech-done");
        return;
    }
    speaking = true;
    if (mascot && mascot.talk) mascot.talk(true);
    speechEl.textContent = "";
    speechEl.classList.add("show");
    let i = 0,
        last = performance.now(),
        acc = 0;
    const CHARS_PER_SEC = 34;

    function step(now) {
        acc += (now - last) / 1e3;
        last = now;
        const n = Math.min(text.length, Math.floor(acc * CHARS_PER_SEC));
        if (n !== i) {
            i = n;
            speechEl.textContent = text.slice(0, i) + (i < text.length ? "\u258C" : "");
        }
        if (i < text.length) requestAnimationFrame(step);
        else {
            speechEl.textContent = text;
            setTimeout(() => {
                speechEl.classList.remove("show");
                setTimeout(nextSpeech, 500);
            }, 2400 + text.length * 14);
        }
    }
    requestAnimationFrame(step);
}
ipcRenderer.on("speech", (e, m) => speak(m && m.text));

function pulse() {
    if (mascot) mascot.blink();
    canvas.dispatchEvent(new MouseEvent("click", {
        bubbles: true
    }));
}
ipcRenderer.on("pulse", () => pulse());
let winDragging = false,
    winMoved = false;
window.addEventListener("mousedown", (ev) => {
    if (ev.button === 2) {
        winDragging = true;
        winMoved = false;
        ev.preventDefault();
    }
});
window.addEventListener("mousemove", () => {
    if (!winDragging) return;
    if (!winMoved) {
        ipcRenderer.send("drag-start");
        winMoved = true;
    }
    ipcRenderer.send("drag-move");
});
window.addEventListener("mouseup", (ev) => {
    if (winDragging && ev.button === 2) {
        winDragging = false;
        ipcRenderer.send("drag-end");
    }
});
window.addEventListener("contextmenu", (ev) => ev.preventDefault());
canvas.addEventListener("dblclick", () => ipcRenderer.send("chat-toggle"));
let wheelLock = 0;
window.addEventListener("wheel", (ev) => {
    const now = performance.now();
    if (now - wheelLock < 60) return;
    wheelLock = now;
    ipcRenderer.send("resized", {
        delta: ev.deltaY < 0 ? 40 : -40
    });
});
ipcRenderer.send("ready");