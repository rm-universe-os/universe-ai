/* ============================================================
   UNIVERSE AI — 3D Mascot Engine (standalone)
   Part of the Universe OS project — by Team RM.
   A cute, fully interactive black-hole mascot built on Three.js.

   Usage:
     UniverseAI.init(canvasElement, {
       colors: { core, ring, diskIn, diskMid, diskOut, eye },
     });

   Auto-init: every <canvas data-universe-ai> on the page.
   ============================================================ */
(function() {
    "use strict";
    var SEL = "[data-universe-ai]";

    function glowTexture(inner, mid) {
        var s = 128;
        var c = document.createElement("canvas");
        c.width = c.height = s;
        var x = c.getContext("2d");
        var g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0, inner);
        g.addColorStop(0.4, mid);
        g.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = g;
        x.fillRect(0, 0, s, s);
        return new THREE.CanvasTexture(c);
    }

    function init(canvas, opts) {
        opts = opts || {};
        if (!canvas || canvas.__universeAI || !window.THREE) return null;
        canvas.__universeAI = true;
        var renderer;
        try {
            renderer = new THREE.WebGLRenderer({
                canvas,
                alpha: true,
                antialias: true,
                powerPreference: "high-performance"
            });
        } catch (e) {
            canvas.style.display = "none";
            return null;
        }
        var reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
        var mobile = Math.min(innerWidth, innerHeight) < 760 || matchMedia("(pointer:coarse)").matches;
        renderer.setPixelRatio(mobile ? 1.5 : Math.min(devicePixelRatio || 1, 2));
        var C = Object.assign({
            core: 132368,
            ring: 6273279,
            diskIn: 15398911,
            diskMid: 6273279,
            diskOut: 1851304,
            eye: 13496831
        }, opts.colors || {});
        var scene = new THREE.Scene();
        var cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        cam.position.set(0, 0.3, 12.5);
        var world = new THREE.Group();
        scene.add(world);
        var T = {
            dot: glowTexture("rgba(255,255,255,1)", "rgba(140,200,255,.55)"),
            star: glowTexture("rgba(255,255,255,1)", "rgba(160,200,255,.5)"),
            aura: glowTexture("rgba(110,185,255,.95)", "rgba(40,90,220,.35)"),
            eye: glowTexture("rgba(200,240,255,1)", "rgba(80,180,255,.5)")
        };
        world.add(new THREE.Mesh(
            new THREE.SphereGeometry(2.05, 48, 48),
            new THREE.MeshBasicMaterial({
                color: C.core
            })
        ));
        world.add(new THREE.Mesh(
            new THREE.SphereGeometry(2.17, 48, 48),
            new THREE.ShaderMaterial({
                transparent: true,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide,
                depthWrite: false,
                vertexShader: "varying float vI;void main(){ vec3 n = normalize(normalMatrix * normal); vI = pow(.74 - dot(n, vec3(0.,0.,1.)), 2.6); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
                fragmentShader: "varying float vI;void main(){ gl_FragColor = vec4(.35,.65,1., vI); }"
            })
        ));
        var photon = new THREE.Mesh(
            new THREE.TorusGeometry(2.26, 0.06, 12, 150),
            new THREE.MeshBasicMaterial({
                color: C.ring,
                transparent: true,
                opacity: 0.95,
                blending: THREE.AdditiveBlending
            })
        );
        photon.rotation.x = Math.PI / 2;
        var aura = new THREE.Sprite(new THREE.SpriteMaterial({
            map: T.aura,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        aura.scale.setScalar(7.5);
        world.add(aura);
        var stars = null;
        if (opts.background !== false) {
            var STK = mobile ? 50 : 90;
            var stPos = new Float32Array(STK * 3),
                stSz = new Float32Array(STK);
            for (var si = 0; si < STK; si++) {
                stPos[si * 3] = (Math.random() - 0.5) * 16;
                stPos[si * 3 + 1] = (Math.random() - 0.5) * 10;
                stPos[si * 3 + 2] = -4 - Math.random() * 5;
                stSz[si] = 0.5 + Math.random();
            }
            var stGeo = new THREE.BufferGeometry();
            stGeo.setAttribute("position", new THREE.BufferAttribute(stPos, 3));
            stGeo.setAttribute("aSize", new THREE.BufferAttribute(stSz, 1));
            stars = new THREE.Points(stGeo, new THREE.PointsMaterial({
                size: 0.09,
                map: T.star,
                transparent: true,
                opacity: 0.85,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
            scene.add(stars);
        }
        var DN = mobile ? 900 : 1600;
        var dA = new Float32Array(DN),
            dR = new Float32Array(DN),
            dY = new Float32Array(DN),
            dW = new Float32Array(DN),
            dS = new Float32Array(DN),
            dP = new Float32Array(DN * 3),
            dC = new Float32Array(DN * 3);
        var cIn = new THREE.Color(C.diskIn),
            cMid = new THREE.Color(C.diskMid),
            cOut = new THREE.Color(C.diskOut);
        for (var di = 0; di < DN; di++) {
            dA[di] = Math.random() * Math.PI * 2;
            dR[di] = 2.5 + Math.pow(Math.random(), 1.3) * 1.9;
            dY[di] = (Math.random() - 0.5) * 0.12;
            dW[di] = 3.2 / Math.pow(dR[di], 1.4);
            dS[di] = 0.5 + Math.random() * 0.9;
            dP[di * 3 + 1] = dY[di];
            var h = (dR[di] - 2.5) / 1.9;
            var c = cIn.clone().lerp(cMid, Math.min(h * 1.6, 1)).lerp(cOut, Math.max(h - 0.3, 0) * 1.6);
            dC[di * 3] = c.r;
            dC[di * 3 + 1] = c.g;
            dC[di * 3 + 2] = c.b;
        }
        var dGeo = new THREE.BufferGeometry();
        dGeo.setAttribute("position", new THREE.BufferAttribute(dP, 3));
        dGeo.setAttribute("aA", new THREE.BufferAttribute(dA, 1));
        dGeo.setAttribute("aR", new THREE.BufferAttribute(dR, 1));
        dGeo.setAttribute("aY", new THREE.BufferAttribute(dY, 1));
        dGeo.setAttribute("aW", new THREE.BufferAttribute(dW, 1));
        dGeo.setAttribute("aS", new THREE.BufferAttribute(dS, 1));
        dGeo.setAttribute("color", new THREE.BufferAttribute(dC, 3));
        var dU = {
            uTime: {
                value: 0
            },
            uTex: {
                value: T.dot
            },
            uPR: {
                value: renderer.getPixelRatio()
            }
        };
        var disk = new THREE.Points(dGeo, new THREE.ShaderMaterial({
            uniforms: dU,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            vertexShader: "attribute float aA; attribute float aR; attribute float aY; attribute float aW; attribute float aS;uniform float uTime; uniform float uPR;varying vec3 vC; varying float vA;void main(){ vC = color; float a = aA + uTime * aW; vA = (.55 + .45*sin(uTime*2.2 + aA*9.)) * (1. + .85*max(cos(a),0.)); vec4 mv = modelViewMatrix * vec4(cos(a)*aR, aY, sin(a)*aR, 1.); gl_PointSize = clamp(aS * uPR * (140. / -mv.z), 1., 9.); gl_Position = projectionMatrix * mv; }",
            fragmentShader: "uniform sampler2D uTex; varying vec3 vC; varying float vA;void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC*1.35, t.a*vA); }"
        }));
        var diskT = new THREE.Group();
        diskT.rotation.x = 0.28;
        diskT.rotation.z = 0.08;
        diskT.position.y = -0.08;
        diskT.add(disk);
        diskT.add(photon);
        world.add(diskT);

        function swirlArc(r, tube, op) {
            var m = new THREE.Mesh(
                new THREE.TorusGeometry(r, tube, 10, 90, Math.PI * 1.15),
                new THREE.MeshBasicMaterial({
                    color: C.ring,
                    transparent: true,
                    opacity: op,
                    blending: THREE.AdditiveBlending
                })
            );
            m.rotation.x = Math.PI / 2;
            return m;
        }
        var arc1 = swirlArc(2.5, 0.035, 0.75);
        var arc2 = swirlArc(2.74, 0.022, 0.5);
        diskT.add(arc1);
        diskT.add(arc2);
        var eyeMat = new THREE.MeshBasicMaterial({
            color: C.eye
        });

        function makeEye(x) {
            var e = new THREE.Group();
            e.add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.6, 18), eyeMat));
            var s1 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), eyeMat);
            s1.position.y = 0.3;
            var s2 = s1.clone();
            s2.position.y = -0.3;
            e.add(s1);
            e.add(s2);
            var glow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: T.eye,
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
            glow.position.z = 0.18;
            glow.scale.setScalar(1.05);
            e.add(glow);
            e.position.set(x, 0.42, 2);
            world.add(e);
            return e;
        }
        var eL = makeEye(-0.64),
            eR = makeEye(0.64);
        var rx = 0,
            ry = 0,
            tRX = 0.04,
            tRY = 0;
        var eyeTX = 0,
            eyeTY = 0;
        var dragging = false,
            lxp = 0,
            lyp = 0,
            moved = false;
        var bt = 0,
            bNext = 2.2;
        var spinT = -1,
            spinDur = 2.05,
            spinYaw = 0,
            spinPitch = 0,
            spinScale = 1,
            diskBoost = 0,
            diskTime = 0;
        var spinSY = 1,
            spinSXZ = 1,
            squintV = 1;
        var gazeHeat = 0,
            lifeT = 0,
            gNext = 2.4;
        var tiltZ = 0,
            tTZ = 0;
        var talking = 0;
        canvas.addEventListener("pointerdown", function(e) {
            dragging = true;
            moved = false;
            lxp = e.clientX;
            lyp = e.clientY;
            if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
        });
        addEventListener("pointerup", function() {
            dragging = false;
        });
        canvas.addEventListener("pointermove", function(e) {
            if (!dragging) return;
            tRY += (e.clientX - lxp) * 0.012;
            tRX = Math.max(-0.7, Math.min(0.7, tRX + (e.clientY - lyp) * 8e-3));
            if (Math.abs(e.clientX - lxp) > 4 || Math.abs(e.clientY - lyp) > 4) moved = true;
            lxp = e.clientX;
            lyp = e.clientY;
        });
        canvas.addEventListener("click", function() {
            if (moved || spinT >= 0) return;
            spinT = 0;
            bt = 0.24;
            bNext = 0.5;
            squintV = Math.min(squintV, 0.55);
        });
        addEventListener("pointermove", function(e) {
            if (dragging) return;
            gazeHeat = 2.2;
            var r = canvas.getBoundingClientRect();
            var dx = (e.clientX - (r.left + r.width / 2)) / Math.max(innerWidth, 1);
            var dy = (e.clientY - (r.top + r.height / 2)) / Math.max(innerHeight, 1);
            eyeTX = Math.max(-0.45, Math.min(0.45, dx * 1.4));
            eyeTY = Math.max(-0.35, Math.min(0.35, dy * 0.9));
            tRY = Math.max(-0.55, Math.min(0.55, dx * 0.7));
            tRX = 0.04 + Math.max(-0.3, Math.min(0.3, dy * 0.45));
        }, {
            passive: true
        });

        function fit() {
            var w = canvas.clientWidth || 300,
                h2 = canvas.clientHeight || 300;
            renderer.setSize(w, h2, false);
            cam.aspect = w / h2;
            cam.updateProjectionMatrix();
        }
        fit();
        addEventListener("resize", fit);
        var visible = true,
            rafId = 0;
        if ("IntersectionObserver" in window) {
            new IntersectionObserver(function(en) {
                visible = en[0].isIntersecting;
            }).observe(canvas);
        }
        var ck = new THREE.Clock();

        function frame() {
            rafId = requestAnimationFrame(frame);
            if (!visible || document.hidden) return;
            var dt = Math.min(ck.getDelta(), 0.05),
                t = ck.getElapsedTime();
            if (dragging) gazeHeat = Math.max(gazeHeat, 0.8);
            gazeHeat = Math.max(0, gazeHeat - dt);
            if (spinT < 0 && gazeHeat <= 0) {
                lifeT += dt;
                if (lifeT >= gNext) {
                    lifeT = 0;
                    gNext = 1.6 + Math.random() * 2.4;
                    var roll = Math.random();
                    if (roll < 0.42) {
                        var ax = (Math.random() * 2 - 1) * 0.5,
                            ay = (Math.random() * 2 - 1) * 0.3;
                        tRY = ax;
                        tRX = 0.04 + ay;
                        eyeTX = ax * 0.55;
                        eyeTY = ay * 0.3;
                    } else if (roll < 0.68) {
                        tTZ = (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.07);
                        tRY = (Math.random() * 2 - 1) * 0.12;
                    } else if (roll < 0.86) {
                        bt = 0.22 + Math.random() * 0.08;
                        bNext = 0.4;
                    } else {
                        tTZ = 0;
                        tRY = 0;
                        tRX = 0.04;
                        eyeTX = 0;
                        eyeTY = 0;
                    }
                }
            }
            tiltZ += ((spinT >= 0 ? 0 : tTZ) - tiltZ) * 0.06;
            var flare = 0;
            if (spinT >= 0) {
                spinT += dt;
                var p = Math.min(spinT / spinDur, 1);
                if (p < 0.088) {
                    var w = p / 0.088;
                    spinYaw = -0.7 * w;
                    spinScale = 1 - 0.1 * w;
                    spinPitch = 0;
                    diskBoost = 0;
                    spinSY = spinScale;
                    spinSXZ = spinScale;
                } else if (p < 0.585) {
                    var q = (p - 0.088) / 0.497,
                        e = 1 - Math.pow(1 - q, 3);
                    spinYaw = -0.7 + e * (Math.PI * 4 + 0.7);
                    spinPitch = Math.sin(q * Math.PI) * 0.38;
                    spinScale = 0.9 + q * 0.18;
                    spinSY = spinScale;
                    spinSXZ = spinScale;
                    diskBoost = Math.sin(q * Math.PI) * 3;
                    flare = Math.sin(p * Math.PI);
                } else {
                    var r = (p - 0.585) / 0.415;
                    spinYaw = Math.PI * 4;
                    spinPitch = 0;
                    var c2 = 1.08 - 0.08 * (1 - Math.pow(1 - r, 2));
                    var m = 1 - 0.07 * Math.sin(r * Math.PI);
                    spinSY = c2 * m;
                    spinSXZ = c2 * (1 + (1 - m) * 0.55);
                    diskBoost = 0.9 * Math.sin(r * Math.PI) * Math.exp(-1.8 * r);
                    flare = 0.97 * Math.exp(-2.6 * r);
                }
                if (p >= 1) {
                    spinT = -1;
                    spinYaw = 0;
                    spinPitch = 0;
                    spinScale = 1;
                    spinSY = 1;
                    spinSXZ = 1;
                    diskBoost = 0;
                }
            }
            diskTime += dt * (1 + diskBoost);
            dU.uTime.value = diskTime;
            var flare = spinT >= 0 ? Math.sin(Math.min(spinT / spinDur, 1) * Math.PI) : 0;
            aura.material.opacity = 0.5 + 0.07 * Math.sin(t * 1.8) + flare * 0.4;
            if (stars) stars.rotation.y += dt * 0.012;
            arc1.rotation.z += dt * (0.45 + diskBoost * 0.35);
            arc2.rotation.z -= dt * (0.3 + diskBoost * 0.25);
            photon.rotation.z += dt * (0.12 + diskBoost * 0.2);
            photon.material.opacity = Math.min(1, 0.72 + 0.22 * Math.sin(t * 2.6) + flare * 0.3);
            world.position.y = Math.sin(t * 1.15) * 0.15 + Math.sin(t * 0.43) * 0.05 + talking * Math.sin(t * 8.2) * 0.028;
            world.position.x = Math.sin(t * 0.31) * 0.045;
            rx += (tRX - rx) * 0.13;
            ry += (tRY - ry) * 0.13;
            world.rotation.x = rx + Math.sin(t * 0.5) * 0.035 + spinPitch;
            world.rotation.y = ry + Math.sin(t * 0.37) * 0.07 + spinYaw;
            world.rotation.z = tiltZ + Math.sin(t * 0.6) * 0.012;
            world.scale.set(spinSXZ, spinSY, spinSXZ);
            eL.rotation.y += (eyeTX - eL.rotation.y) * 0.28;
            eR.rotation.y = eL.rotation.y;
            eL.rotation.x += (eyeTY - eL.rotation.x) * 0.28;
            eR.rotation.x = eL.rotation.x;
            eL.position.x = -0.64 + eyeTX * 0.12;
            eR.position.x = 0.64 + eyeTX * 0.12;
            eL.position.y = 0.42 + eyeTY * 0.1;
            eR.position.y = eL.position.y;
            bt -= dt;
            if (bt <= -bNext) {
                bt = 0.24;
                bNext = 2 + Math.random() * 3.2;
            }
            var blink = bt > 0 ? Math.max(0.07, Math.min(1, Math.abs(bt / 0.24 * 2 - 1))) : 1;
            squintV += ((spinT >= 0 ? 0.3 : 1) - squintV) * Math.min(1, dt * 4);
            var eyeEnv = 1 - 0.12 * Math.max(0, Math.min(1, flare));
            eL.scale.x = eyeEnv;
            eR.scale.x = eyeEnv;
            eL.scale.y = blink * squintV * eyeEnv;
            eR.scale.y = blink * squintV * eyeEnv;
            renderer.render(scene, cam);
        }
        if (reduced) {
            renderer.render(scene, cam);
        } else {
            frame();
        }
        return {
            blink: function() {
                bt = 0.24;
            },
            lookAt: function(nx, ny) {
                eyeTX = nx;
                eyeTY = ny;
            },
            talk: function(on) {
                talking = on ? 1 : 0;
            },
            /* gentle bob while speaking */
            dispose: function() {
                cancelAnimationFrame(rafId);
                renderer.dispose();
                canvas.__universeAI = false;
            }
        };
    }
    var UniverseAI = {
        init,
        auto: function() {
            var list = document.querySelectorAll(SEL);
            for (var i = 0; i < list.length; i++) init(list[i]);
        }
    };
    window.UniverseAI = UniverseAI;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", UniverseAI.auto);
    else UniverseAI.auto();
})();