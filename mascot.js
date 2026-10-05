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

    function softwareGL() {
        try {
            var c = document.createElement("canvas");
            var gl = c.getContext("webgl") || c.getContext("experimental-webgl");
            if (!gl) return true;
            var dbg = gl.getExtension("WEBGL_debug_renderer_info");
            var name = String(dbg ?
                gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) :
                gl.getParameter(gl.RENDERER) || "");
            var lose = gl.getExtension("WEBGL_lose_context");
            if (lose) lose.loseContext();
            return /swiftshader|llvmpipe|softpipe|software|mesa offscreen|lavapipe/i
                .test(name);
        } catch (e) {
            return true;
        }
    }

    function init(canvas, opts) {
        opts = opts || {};
        if (!canvas || canvas.__universeAI || !window.THREE) return null;
        canvas.__universeAI = true;
        var softGL = opts.softwareGL !== undefined ? !!opts.softwareGL :
            softwareGL();
        var renderer;
        try {
            renderer = new THREE.WebGLRenderer({
                canvas,
                alpha: true,
                antialias: !softGL,
                powerPreference: softGL ? "low-power" : "high-performance"
            });
        } catch (e) {
            canvas.style.display = "none";
            return null;
        }
        var reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
        var mobile = Math.min(innerWidth, innerHeight) < 760 || matchMedia("(pointer:coarse)").matches;
        if (softGL)
            renderer.setPixelRatio(0.75);
        else
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
            eye: glowTexture("rgba(206,238,255,.9)", "rgba(92,176,255,.22)")
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
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        );
        photon.rotation.x = Math.PI / 2;
        var aura = new THREE.Sprite(new THREE.SpriteMaterial({
            map: T.aura,
            transparent: true,
            opacity: 0.34,
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
            vertexShader: "attribute float aA; attribute float aR; attribute float aY; attribute float aW; attribute float aS;uniform float uTime; uniform float uPR;varying vec3 vC; varying float vA;void main(){ vC = color; float a = aA + uTime * aW; /* Radial envelope: the disc used to start dead at its inner radius, and that hard edge drew a straight bright seam across the lower half of the sphere right under the eyes. Fading in from the inner radius and out at the outer one keeps the light even. */ float rn = (aR - 2.5) / 1.9; float env = smoothstep(0.0, 0.34, rn) * (1.0 - smoothstep(0.6, 1.0, rn)); vA = (.55 + .45*sin(uTime*2.2 + aA*9.)) * (1. + .85*max(cos(a),0.)) * env; vec4 mv = modelViewMatrix * vec4(cos(a)*aR, aY, sin(a)*aR, 1.); gl_PointSize = clamp(aS * uPR * (140. / -mv.z), 1., 9.); gl_Position = projectionMatrix * mv; }",
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
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
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
        var eyeHalos = [];

        var EYE_W = 0.54,
            EYE_H = 1.16,
            EYE_R = EYE_W / 2;

        function makeEye(x) {
            var e = new THREE.Group();
            e.add(new THREE.Mesh(new THREE.CylinderGeometry(EYE_R, EYE_R,
                EYE_H - 2 * EYE_R, 20), eyeMat));
            var s1 = new THREE.Mesh(new THREE.SphereGeometry(EYE_R, 20, 20), eyeMat);
            s1.position.y = EYE_H / 2 - EYE_R;
            var s2 = s1.clone();
            s2.position.y = -(EYE_H / 2 - EYE_R);
            e.add(s1);
            e.add(s2);
            var glow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: T.eye,
                color: C.eye,
                transparent: true,
                opacity: 0.26,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false
            }));
            glow.position.z = 0.18;
            glow.scale.setScalar(1.0);
            e.add(glow);
            var halo = new THREE.Sprite(new THREE.SpriteMaterial({
                map: T.eye,
                color: C.eye,
                transparent: true,
                opacity: 0.055,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false
            }));
            halo.position.z = 0.1;
            halo.scale.setScalar(1.6);
            e.add(halo);
            var spark = new THREE.Sprite(new THREE.SpriteMaterial({
                map: T.dot,
                color: 16777215,
                transparent: true,
                opacity: 0.45,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false
            }));
            spark.position.set(-0.1, 0.16, 0.34);
            spark.scale.setScalar(0.28);
            e.add(spark);
            eyeHalos.push({
                glow: glow,
                halo: halo,
                spark: spark,
                phase: x * 3.1
            });
            e.position.set(x, 0.42, 2);
            world.add(e);
            return e;
        }
        var eL = makeEye(-0.66),
            eR = makeEye(0.66);


        var glassesMats = [],
            popMats = [];

        function mkMat(list, m, base) {
            m.transparent = true;
            m.userData.cbase = (base === undefined) ? 1 : base;
            list.push(m);
            return m;
        }

        function setOpacity(list, v) {
            for (var mi = 0; mi < list.length; mi++) {
                var mm = list[mi];
                mm.opacity = mm.userData.cbase * v;
            }
        }

        function easeOutCubic(p) {
            return 1 - Math.pow(1 - p, 3);
        }

        function easeInCubic(p) {
            return p * p * p;
        }

        function roundedRect(w, h, r) {
            var sh = new THREE.Shape();
            var x = -w / 2,
                y = -h / 2;
            sh.moveTo(x + r, y);
            sh.lineTo(x + w - r, y);
            sh.quadraticCurveTo(x + w, y, x + w, y + r);
            sh.lineTo(x + w, y + h - r);
            sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            sh.lineTo(x + r, y + h);
            sh.quadraticCurveTo(x, y + h, x, y + h - r);
            sh.lineTo(x, y + r);
            sh.quadraticCurveTo(x, y, x + r, y);
            return sh;
        }

        function frameGeometry(w, h, r, border, depth, bevel) {
            bevel = (bevel === undefined) ? 0.009 : bevel;
            var outer = roundedRect(w, h, r);
            var inner = roundedRect(w - border * 2, h - border * 2,
                Math.max(0.02, r - border * 0.7));
            outer.holes.push(new THREE.Path(inner.getPoints(18)));
            return new THREE.ExtrudeGeometry(outer, {
                depth: depth,
                bevelEnabled: true,
                bevelThickness: bevel,
                bevelSize: bevel,
                bevelSegments: 2,
                curveSegments: 18
            });
        }

        var FACE = new THREE.Vector3(0, 0.42, 2.46);
        var GLASSES_PARK = new THREE.Vector3(0.34, 3.55, 5.10);

        var glasses = new THREE.Group();
        glasses.position.copy(FACE);
        glasses.visible = false;
        world.add(glasses);

        function glassMat(m, base) {
            m.depthTest = false;
            mkMat(glassesMats, m, base);
            return m;
        }

        var frameMat = glassMat(new THREE.MeshBasicMaterial({
            color: 0x7488c4
        }), 1.0);
        var lensRedMat = glassMat(new THREE.MeshBasicMaterial({
            color: 0xff2f4d, depthWrite: false
        }), 0.46);
        var lensCyanMat = glassMat(new THREE.MeshBasicMaterial({
            color: 0x22d6ff, depthWrite: false
        }), 0.46);
        var armMat = mkMat(glassesMats, new THREE.MeshBasicMaterial({
            color: 0x5b6ca6
        }), 1.0);

        var LENS_W = EYE_W * 1.1,
            LENS_H = EYE_H * 1.1,
            LENS_R = 0.29,
            FRAME_B = 0.075;
        var spectacleGeo = frameGeometry(LENS_W + FRAME_B * 2,
            LENS_H + FRAME_B * 2, LENS_R + FRAME_B, FRAME_B, 0.058);
        var lensGeo = new THREE.ShapeGeometry(roundedRect(LENS_W, LENS_H, LENS_R));

        function spectacle(x, lensMat) {
            var g = new THREE.Group();
            var frame = new THREE.Mesh(spectacleGeo, frameMat);
            frame.position.set(x, 0, -0.014);
            frame.renderOrder = 21;
            g.add(frame);
            var lens = new THREE.Mesh(lensGeo, lensMat);
            lens.position.set(x, 0, 0.012);
            lens.renderOrder = 22;
            g.add(lens);
            return g;
        }

        glasses.add(spectacle(-0.66, lensRedMat));
        glasses.add(spectacle(0.66, lensCyanMat));

        var bridge = new THREE.Mesh(
            new THREE.BoxGeometry(0.80, 0.10, 0.05), frameMat);
        bridge.position.set(0, 0.28, -0.005);
        bridge.renderOrder = 21;
        glasses.add(bridge);

        [-1, 1].forEach(function(sgn) {
            var arm = new THREE.Mesh(
                new THREE.BoxGeometry(0.055, 0.078, 0.74), armMat);
            arm.position.set(sgn * 1.03, 0.12, -0.40);
            arm.rotation.y = sgn * 0.27;
            glasses.add(arm);
        });

        function stripeTexture() {
            var c = document.createElement("canvas");
            c.width = 256;
            c.height = 64;
            var x = c.getContext("2d");
            x.fillStyle = "#f3f6ff";
            x.fillRect(0, 0, 256, 64);
            x.fillStyle = "#dc2f47";
            for (var i = 0; i < 8; i++) x.fillRect(i * 32, 0, 16, 64);
            var t = new THREE.CanvasTexture(c);
            t.wrapS = THREE.RepeatWrapping;
            return t;
        }

        var POP_HOME = new THREE.Vector3(1.34, -2.02, 2.06);
        var popcorn = new THREE.Group();
        popcorn.position.copy(POP_HOME);
        popcorn.visible = false;
        world.add(popcorn);

        var stripeMat = mkMat(popMats, new THREE.MeshBasicMaterial({
            map: stripeTexture()
        }), 1.0);
        var boxSide = new THREE.Mesh(
            new THREE.CylinderGeometry(0.60, 0.44, 0.96, 4, 1, true),
            stripeMat);
        boxSide.rotation.y = Math.PI / 4;
        popcorn.add(boxSide);

        var boxInner = new THREE.Mesh(
            new THREE.CylinderGeometry(0.585, 0.425, 0.94, 4, 1, true),
            mkMat(popMats, new THREE.MeshBasicMaterial({
                color: 0x2a1220, side: THREE.BackSide
            }), 1.0));
        boxInner.rotation.y = Math.PI / 4;
        popcorn.add(boxInner);

        var boxBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.44, 0.44, 0.02, 4), stripeMat);
        boxBase.rotation.y = Math.PI / 4;
        boxBase.position.y = -0.48;
        popcorn.add(boxBase);

        var boxRim = new THREE.Mesh(
            new THREE.CylinderGeometry(0.615, 0.60, 0.075, 4, 1, true),
            mkMat(popMats, new THREE.MeshBasicMaterial({
                color: 0xf3f6ff
            }), 1.0));
        boxRim.rotation.y = Math.PI / 4;
        boxRim.position.y = 0.485;
        popcorn.add(boxRim);

        var kernelMats = [
            mkMat(popMats, new THREE.MeshBasicMaterial({
                color: 0xfff0bb
            }), 1.0),
            mkMat(popMats, new THREE.MeshBasicMaterial({
                color: 0xffd97e
            }), 1.0),
            mkMat(popMats, new THREE.MeshBasicMaterial({
                color: 0xe8b45c
            }), 1.0)
        ];
        var kernelGeo = new THREE.IcosahedronGeometry(0.098, 0);
        var lobeGeo = new THREE.IcosahedronGeometry(0.058, 0);
        for (var pk = 0; pk < 30; pk++) {
            var pa = Math.random() * Math.PI * 2,
                pr = Math.sqrt(Math.random()) * 0.45;
            var pker = new THREE.Mesh(
                kernelGeo, kernelMats[pk % kernelMats.length]);
            var py = 0.50 + Math.random() * 0.15;
            if (pk >= 25) {
                pa = Math.random() * Math.PI * 2;
                pr = Math.sqrt(Math.random()) * 0.36;
                py = 0.66 + Math.random() * 0.15;
            }
            pker.position.set(Math.cos(pa) * pr, py, Math.sin(pa) * pr);
            pker.rotation.set(Math.random() * 3, Math.random() * 3,
                Math.random() * 3);
            pker.scale.set(0.80 + Math.random() * 0.45,
                0.72 + Math.random() * 0.40,
                0.80 + Math.random() * 0.45);
            for (var lb = 0; lb < 2; lb++) {
                var lobe = new THREE.Mesh(lobeGeo,
                    kernelMats[(pk + lb + 1) % kernelMats.length]);
                lobe.position.set((Math.random() - 0.5) * 0.11,
                    (Math.random() - 0.5) * 0.11,
                    (Math.random() - 0.5) * 0.11);
                lobe.rotation.set(Math.random() * 3, Math.random() * 3,
                    Math.random() * 3);
                lobe.scale.setScalar(0.55 + Math.random() * 0.35);
                pker.add(lobe);
            }
            popcorn.add(pker);
        }

        var popGlow = new THREE.Sprite(new THREE.SpriteMaterial({
            map: T.dot,
            color: 0xffcf7a,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        popGlow.position.set(0, 0.62, 0);
        popGlow.scale.setScalar(1.5);
        mkMat(popMats, popGlow.material, 0.20);
        popcorn.add(popGlow);

        var flyGeo = new THREE.IcosahedronGeometry(0.088, 0);
        var flying = [];
        for (var fk = 0; fk < 5; fk++) {
            var fmat = new THREE.MeshBasicMaterial({
                color: 0xfff3c4,
                transparent: true,
                depthWrite: false
            });
            var fm = new THREE.Mesh(flyGeo, fmat);
            fm.visible = false;
            var fglow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: T.dot,
                color: 0xffe2a8,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false
            }));
            fglow.scale.setScalar(0.46);
            fm.add(fglow);
            fm.userData = {
                t: 0,
                dur: 1,
                spin: 5,
                from: new THREE.Vector3(),
                to: new THREE.Vector3(),
                ctrl: new THREE.Vector3(),
                glow: fglow
            };
            world.add(fm);
            flying.push(fm);
        }

        var crunch = new THREE.Sprite(new THREE.SpriteMaterial({
            map: T.dot,
            color: 0xffe9b8,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false
        }));
        crunch.visible = false;
        world.add(crunch);
        var crunchT = 0;
        var boxKick = 0;


        var musicMats = [];

        var HEAD_R = 2.05;

        var phones = new THREE.Group();
        phones.visible = false;
        world.add(phones);

        var bandMat = mkMat(musicMats, new THREE.MeshBasicMaterial({
            color: 0x93a7dd
        }), 1.0);
        var cupMat = mkMat(musicMats, new THREE.MeshBasicMaterial({
            color: 0x3d4a75
        }), 1.0);
        var rimMat = mkMat(musicMats, new THREE.MeshBasicMaterial({
            color: C.ring
        }), 1.0);

        phones.add(new THREE.Mesh(
            new THREE.TorusGeometry(HEAD_R + 0.19, 0.105, 10, 64, Math.PI),
            bandMat));

        phones.position.set(0, 0, 0.30);

        var cupGlows = [];
        [-1, 1].forEach(function(sgn) {
            var cup = new THREE.Mesh(
                new THREE.CylinderGeometry(0.60, 0.54, 0.30, 24), cupMat);
            cup.rotation.z = Math.PI / 2;
            cup.position.set(sgn * (HEAD_R + 0.02), -0.02, 0);
            phones.add(cup);

            var rim = new THREE.Mesh(
                new THREE.TorusGeometry(0.605, 0.062, 10, 40), rimMat);
            rim.rotation.y = Math.PI / 2;
            rim.position.set(sgn * (HEAD_R + 0.18), -0.02, 0);
            phones.add(rim);

            var cglow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: T.dot,
                color: C.ring,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
            cglow.position.set(sgn * (HEAD_R + 0.30), -0.02, 0);
            cglow.scale.setScalar(0.95);
            mkMat(musicMats, cglow.material, 0.30);
            phones.add(cglow);
            cupGlows.push(cglow);
        });


        var NOTE_N = 5;
        var noteHeadGeo = new THREE.SphereGeometry(0.17, 16, 12);
        var noteStemGeo = new THREE.BoxGeometry(0.055, 0.80, 0.055);
        var noteFlagGeo = new THREE.BoxGeometry(0.22, 0.055, 0.055);
        var notes = [];
        for (var nk = 0; nk < NOTE_N; nk++) {
            var note = new THREE.Group();
            var noteMat = mkMat(musicMats, new THREE.MeshBasicMaterial({
                color: nk % 2 ? C.ring : C.eye,
                depthWrite: false
            }), 1.0);
            var nhead = new THREE.Mesh(noteHeadGeo, noteMat);
            nhead.scale.set(1, 0.74, 1);
            note.add(nhead);
            var nstem = new THREE.Mesh(noteStemGeo, noteMat);
            nstem.position.set(0.135, 0.38, 0);
            note.add(nstem);
            var nflag = new THREE.Mesh(noteFlagGeo, noteMat);
            nflag.position.set(0.235, 0.755, 0);
            nflag.rotation.z = -0.42;
            note.add(nflag);
            var nglow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: T.dot,
                color: nk % 2 ? C.ring : C.eye,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
            nglow.position.set(0.06, 0.34, 0.05);
            nglow.scale.setScalar(1.35);
            note.add(nglow);
            note.userData = {
                mat: noteMat,
                glow: nglow.material,
                x: 2.55 + (nk % 3) * 0.45,
                z: 0.10 + (nk % 2) * 0.60,
                sway: 0.13 + 0.09 * (nk % 2),
                y0: -1.60,
                rise: 4.30,
                dur: 2.55 + 0.23 * (nk % 3),
                tilt: -0.22 + 0.14 * (nk % 3),
                phase: nk / NOTE_N
            };
            note.visible = false;
            world.add(note);
            notes.push(note);
        }


        var devOn = false,
            hackOn = false;
        var dev = { want: 0, mix: 0, from: 0, t: 0, dur: 1 };
        var hack = { want: 0, mix: 0, from: 0, t: 0, dur: 1 };
        var devMats = [],
            hackMats = [];

        function driveProp(st, target, dt, durIn, durOut) {
            target = target ? 1 : 0;
            if (target !== st.want) {
                st.want = target;
                st.t = 0;
                st.from = st.mix;
                st.dur = target ? durIn : durOut;
            }
            st.t += dt;
            var p = Math.min(st.t / st.dur, 1);
            var e = target ? easeOutCubic(p) : easeInCubic(p);
            st.mix = st.from + (target - st.from) * e;
            if (p >= 1) st.mix = target;
            return st.mix;
        }

        function devMat(m, base) {
            mkMat(devMats, m, base === undefined ? 1 : base);
            return m;
        }

        function hackMat(m, base) {
            mkMat(hackMats, m, base === undefined ? 1 : base);
            return m;
        }

        function rrect(x, px, py, w, h, r) {
            x.beginPath();
            x.moveTo(px + r, py);
            x.lineTo(px + w - r, py);
            x.quadraticCurveTo(px + w, py, px + w, py + r);
            x.lineTo(px + w, py + h - r);
            x.quadraticCurveTo(px + w, py + h, px + w - r, py + h);
            x.lineTo(px + r, py + h);
            x.quadraticCurveTo(px, py + h, px, py + h - r);
            x.lineTo(px, py + r);
            x.quadraticCurveTo(px, py, px + r, py);
            x.closePath();
        }


        var LAP_W = 1.94,
            LAP_D = 1.28,
            LAP_H = 1.26;
        var LAP_CLOSED = Math.PI / 2,
            LAP_OPEN = -0.17;
        var LAP_YAW = Math.PI + Math.atan2(1.34, 2.10);
        var LAP_HOME = new THREE.Vector3(1.34, -1.46, 2.10);

        function keyboardTexture() {
            var W = 256,
                H = 154;
            var c = document.createElement("canvas");
            c.width = W;
            c.height = H;
            var x = c.getContext("2d");
            var g = x.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, "#242b47");
            g.addColorStop(1, "#151929");
            x.fillStyle = g;
            x.fillRect(0, 0, W, H);
            var cols = 14,
                rows = 5,
                pad = 3,
                m = 9,
                bottom = 46;
            var kw = (W - m * 2 - pad * (cols - 1)) / cols;
            var kh = (H - m * 2 - bottom - pad * (rows - 1)) / rows;
            for (var r = 0; r < rows; r++) {
                for (var q = 0; q < cols; q++) {
                    var kx = m + q * (kw + pad),
                        ky = m + r * (kh + pad);
                    x.fillStyle = "#2b3355";
                    rrect(x, kx, ky, kw, kh, 3);
                    x.fill();
                    x.fillStyle = "rgba(167,139,250,.34)";
                    rrect(x, kx + 1.2, ky + 1.2, kw - 2.4, kh - 2.4, 2.4);
                    x.fill();
                    x.fillStyle = "#3a4370";
                    rrect(x, kx + 3, ky + 2.6, kw - 6, kh - 5.6, 2);
                    x.fill();
                }
            }
            x.fillStyle = "#262e4d";
            rrect(x, W / 2 - 54, H - bottom + 9, 108, 30, 5);
            x.fill();
            x.strokeStyle = "rgba(167,139,250,.40)";
            x.lineWidth = 1.2;
            rrect(x, W / 2 - 54, H - bottom + 9, 108, 30, 5);
            x.stroke();
            return new THREE.CanvasTexture(c);
        }

        var CODE_LINES = [
            "#include <universe.h>",
            "#include <orbit.h>",
            "",
            "/* the accretion disc never sleeps */",
            "int main(void) {",
            "    world_t *w = world_new(ORBIT_KEPLER);",
            "    if (!w) return EXIT_FAILURE;",
            "",
            "    for (int i = 0; i < STARS; ++i) {",
            "        star_t *s = star_spawn(w, i);",
            "        star_ignite(s, LUMINOSITY(i));",
            "    }",
            "",
            "    while (world_alive(w)) {",
            "        float dt = clock_tick(w);",
            "        world_step(w, dt);",
            "        if (universe_watching()) {",
            "            world_smile(w);",
            "        }",
            "    }",
            "",
            "    world_free(w);",
            "    return EXIT_SUCCESS;",
            "}",
            "/* build: gcc -O3 -o universe main.c */"
        ];
        var CODE_KW = {
            int: 1, float: 1, void: 1, if: 1, else: 1, for: 1, while: 1,
            return: 1, break: 1, const: 1, struct: 1, static: 1, char: 1,
            long: 1, unsigned: 1, sizeof: 1, double: 1, typedef: 1
        };
        var codeCanvas = document.createElement("canvas");
        codeCanvas.width = 320;
        codeCanvas.height = 208;
        var codeCtx = codeCanvas.getContext("2d");
        var codeTex = new THREE.CanvasTexture(codeCanvas);
        var codeScroll = 0,
            codeLast = -9;

        function drawCode(now) {
            if (now - codeLast < 0.075) return;
            var step = codeLast < 0 ? 0 : now - codeLast;
            codeLast = now;
            codeScroll += step * 1.7;
            if (codeScroll > CODE_LINES.length - 3) codeScroll = 0;
            var x = codeCtx,
                W = codeCanvas.width,
                H = codeCanvas.height;
            x.fillStyle = "#0c0f1e";
            x.fillRect(0, 0, W, H);
            x.fillStyle = "#191e35";
            x.fillRect(0, 0, W, 17);
            var dots = ["#ff5f57", "#febc2e", "#28c840"];
            for (var d = 0; d < 3; d++) {
                x.fillStyle = dots[d];
                x.beginPath();
                x.arc(12 + d * 12, 8.5, 3.2, 0, Math.PI * 2);
                x.fill();
            }
            x.font = "14px 'DejaVu Sans Mono','Fira Code',monospace";
            x.textBaseline = "middle";
            var lh = 17,
                top = 24,
                rows = Math.ceil((H - top) / lh),
                i0 = Math.floor(codeScroll),
                frac = codeScroll - i0,
                cur = i0 + rows - 2;
            for (var r = -1; r <= rows; r++) {
                var idx = i0 + r;
                if (idx < 0 || idx >= CODE_LINES.length) continue;
                var y = top + (r - frac) * lh;
                if (y < top - lh || y > H + lh) continue;
                if (idx === cur) {
                    x.fillStyle = "rgba(167,139,250,.15)";
                    x.fillRect(0, y - lh / 2, W, lh);
                }
                var line = CODE_LINES[idx],
                    cx = 9,
                    parts = line.split(/(\s+|[(){}\[\];,<>*&+\-=\/!]+)/);
                for (var q = 0; q < parts.length; q++) {
                    var tk = parts[q];
                    if (!tk) continue;
                    if (/^\s+$/.test(tk)) {
                        cx += x.measureText(tk).width;
                        continue;
                    }
                    var col = "#dbe7ff";
                    if (/^(\/\/|\/\*|\*)/.test(line.trim()) && cx < 20) col = "#6d7ba4";
                    else if (CODE_KW[tk]) col = "#c9a8ff";
                    else if (/^[0-9]/.test(tk)) col = "#ffd479";
                    else if (/^[(){}\[\];,<>*&+\-=\/!]+$/.test(tk)) col = "#8b98c2";
                    else if (/["']/.test(tk)) col = "#86e8b0";
                    x.fillStyle = col;
                    x.fillText(tk, cx, y);
                    cx += x.measureText(tk).width;
                }
                if (idx === cur && Math.floor(now * 2.2) % 2 === 0) {
                    x.fillStyle = "#c4a7ff";
                    x.fillRect(cx + 1, y - 7, 7, 14);
                }
            }
            codeTex.needsUpdate = true;
        }

        var laptop = new THREE.Group();
        laptop.position.copy(LAP_HOME);
        laptop.visible = false;
        world.add(laptop);

        var lapChassisMat = devMat(new THREE.MeshBasicMaterial({
            color: 0x252b45
        }));
        var lapDeckMat = devMat(new THREE.MeshBasicMaterial({
            map: keyboardTexture()
        }));
        var lapShellMat = devMat(new THREE.MeshBasicMaterial({
            color: 0x161b2e
        }));
        var lapScreenMat = devMat(new THREE.MeshBasicMaterial({
            map: codeTex
        }));

        var chassis = new THREE.Mesh(
            new THREE.BoxGeometry(LAP_W, 0.075, LAP_D), lapChassisMat);
        chassis.position.y = -0.038;
        laptop.add(chassis);

        var deck = new THREE.Mesh(
            new THREE.PlaneGeometry(LAP_W * 0.96, LAP_D * 0.94), lapDeckMat);
        deck.rotation.x = -Math.PI / 2;
        deck.position.set(0, 0.003, 0.02);
        laptop.add(deck);

        var lid = new THREE.Group();
        lid.position.set(0, 0, -LAP_D / 2);
        lid.rotation.x = LAP_CLOSED;
        laptop.add(lid);

        var lidShell = new THREE.Mesh(
            new THREE.BoxGeometry(LAP_W, LAP_H, 0.05), lapShellMat);
        lidShell.position.set(0, LAP_H / 2, 0);
        lid.add(lidShell);

        var screen = new THREE.Mesh(
            new THREE.PlaneGeometry(LAP_W - 0.20, LAP_H - 0.20), lapScreenMat);
        screen.position.set(0, LAP_H / 2, 0.032);
        lid.add(screen);

        var lapGlow = new THREE.Sprite(new THREE.SpriteMaterial({
            map: T.aura,
            color: 0x9b7cff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        lapGlow.position.set(0, LAP_H / 2, -0.06);
        lapGlow.scale.setScalar(3.2);
        lid.add(lapGlow);
        mkMat(devMats, lapGlow.material, 0.30);

        var hands = [];

        function makeHand(sgn) {
            var h = new THREE.Group();
            var mat = devMat(new THREE.MeshBasicMaterial({
                color: 0xb9a6ff,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }), 0.82);
            var palm = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 12), mat);
            palm.scale.set(1, 0.52, 1.30);
            h.add(palm);
            for (var f = -1; f <= 1; f++) {
                var fin = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), mat);
                fin.position.set(f * 0.072, -0.028, 0.115);
                fin.scale.set(0.75, 0.75, 2.4);
                fin.rotation.x = 0.45;
                h.add(fin);
            }
            var gl = new THREE.Sprite(new THREE.SpriteMaterial({
                map: T.eye,
                color: 0x9d7dff,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
            gl.scale.setScalar(0.62);
            gl.position.z = -0.06;
            h.add(gl);
            mkMat(devMats, gl.material, 0.34);
            h.userData = {
                base: new THREE.Vector3(sgn * 0.34, 0.34, 0.14),
                phase: sgn < 0 ? 0 : 0.5,
                period: sgn < 0 ? 0.30 : 0.38,
                down: false
            };
            h.position.copy(h.userData.base);
            laptop.add(h);
            hands.push(h);
            return h;
        }
        makeHand(-1);
        makeHand(1);

        var keyFlashGeo = new THREE.PlaneGeometry(0.20, 0.20);
        var keyFlashes = [];
        for (var kf = 0; kf < 8; kf++) {
            var kfm = new THREE.MeshBasicMaterial({
                color: 0xcbb0ff,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            var kfp = new THREE.Mesh(keyFlashGeo, kfm);
            kfp.rotation.x = -Math.PI / 2;
            kfp.position.set((Math.random() - 0.5) * 1.2, 0.006,
                0.02 + (Math.random() - 0.5) * 0.55);
            kfp.visible = false;
            kfp.userData = { life: 0 };
            laptop.add(kfp);
            keyFlashes.push(kfp);
        }

        var glyphTex = [];
        (function() {
            var chars = ["{ }", "</>", "( )", "=>", "0 1", "[ ]", "#", ";;"];
            for (var gi = 0; gi < chars.length; gi++) {
                var c = document.createElement("canvas");
                c.width = c.height = 64;
                var x = c.getContext("2d");
                x.font = "bold 28px 'DejaVu Sans Mono',monospace";
                x.textAlign = "center";
                x.textBaseline = "middle";
                x.fillStyle = gi % 2 ? "#a8dcff" : "#cbaaff";
                x.fillText(chars[gi], 32, 35);
                glyphTex.push(new THREE.CanvasTexture(c));
            }
        })();
        var glyphs = [];
        for (var gq = 0; gq < 7; gq++) {
            var gsp = new THREE.Sprite(new THREE.SpriteMaterial({
                map: glyphTex[gq % glyphTex.length],
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
            gsp.visible = false;
            gsp.userData = {
                t: 0,
                dur: 1,
                from: new THREE.Vector3(),
                to: new THREE.Vector3(),
                ctrl: new THREE.Vector3()
            };
            world.add(gsp);
            glyphs.push(gsp);
        }
        var glyphSpawn = 0;

        function spawnGlyph() {
            for (var i = 0; i < glyphs.length; i++) {
                var g = glyphs[i];
                if (g.visible) continue;
                var d = g.userData;
                d.t = 0;
                d.dur = 0.9 + Math.random() * 0.5;
                d.from.set(LAP_HOME.x - 0.10 + (Math.random() - 0.5) * 1.1,
                    LAP_HOME.y + 0.30 + Math.random() * 0.75,
                    LAP_HOME.z - 0.70);
                d.to.set(0.12 + (Math.random() - 0.5) * 0.7,
                    0.40 + Math.random() * 0.30,
                    2.50);
                d.ctrl.set((d.from.x + d.to.x) / 2 + (Math.random() - 0.5) * 0.9,
                    (d.from.y + d.to.y) / 2 + 0.85,
                    (d.from.z + d.to.z) / 2 + 0.55);
                g.visible = true;
                g.material.opacity = 0;
                return;
            }
        }

        var lapDust = [];
        for (var ld = 0; ld < 4; ld++) {
            var dm = new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.045, 0),
                new THREE.MeshBasicMaterial({
                    color: 0xb79bff,
                    transparent: true,
                    opacity: 0,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }));
            dm.visible = false;
            dm.userData = { t: 0, dur: 1, from: new THREE.Vector3(), to: new THREE.Vector3() };
            world.add(dm);
            lapDust.push(dm);
        }
        var dustSpawn = 0;

        function updateDev(dt, t, mix) {
            var vis = mix > 0.004;
            laptop.visible = vis;
            if (!vis) return;
            var e = mix;
            laptop.position.set(
                LAP_HOME.x - (1 - e) * 1.7,
                LAP_HOME.y - (1 - e) * 2.9,
                LAP_HOME.z - (1 - e) * 1.1);
            laptop.rotation.set(
                -(1 - e) * 0.55,
                LAP_YAW - (1 - e) * 1.25,
                (1 - e) * 0.40);
            laptop.scale.setScalar(0.5 + 0.5 * e);
            laptop.position.y += Math.sin(t * 1.6) * 0.012;
            setOpacity(devMats, e);

            var lo = Math.min(Math.max((e - 0.42) / 0.58, 0), 1);
            var le = easeOutCubic(lo);
            lid.rotation.x = LAP_CLOSED + (LAP_OPEN - LAP_CLOSED) * le;
            lapScreenMat.opacity = e * (0.30 + 0.70 * le);
            lapGlow.material.opacity = 0.30 * e * le;

            var booted = lo > 0.55;
            if (booted) drawCode(t);

            var handOn = Math.max(0, (lo - 0.72) / 0.28);
            for (var hi = 0; hi < hands.length; hi++) {
                var h = hands[hi],
                    ud = h.userData;
                var ph = ((t / ud.period) + ud.phase) % 1;
                var dip = Math.exp(-Math.pow((ph - 0.5) / 0.115, 2));
                var strike = dip > 0.86;
                h.position.set(
                    ud.base.x + Math.sin(t * 5.1 + hi * 2.3) * 0.02,
                    ud.base.y - 0.15 * dip * handOn,
                    ud.base.z + Math.cos(t * 4.4 + hi * 1.7) * 0.018);
                h.rotation.z = (0.12 + 0.30 * dip) * (hi ? -1 : 1) * handOn;
                h.rotation.x = -0.22 * dip * handOn;
                var sc = handOn * (0.85 + 0.15 * e);
                h.scale.setScalar(sc);
                if (strike && !ud.down && handOn > 0.5) {
                    ud.down = true;
                    for (var fi = 0; fi < keyFlashes.length; fi++) {
                        if (keyFlashes[fi].visible) continue;
                        keyFlashes[fi].visible = true;
                        keyFlashes[fi].userData.life = 1;
                        keyFlashes[fi].position.set(
                            ud.base.x + (Math.random() - 0.5) * 0.5,
                            0.006,
                            ud.base.z + 0.34 + (Math.random() - 0.5) * 0.30);
                        break;
                    }
                    if (dustSpawn <= 0) {
                        dustSpawn = 0.5;
                        for (var dj = 0; dj < lapDust.length; dj++) {
                            var dd = lapDust[dj];
                            if (dd.visible) continue;
                            dd.userData.t = 0;
                            dd.userData.dur = 0.55 + Math.random() * 0.3;
                            dd.userData.from.set(
                                LAP_HOME.x + ud.base.x + (Math.random() - 0.5) * 0.4,
                                LAP_HOME.y + 0.05,
                                LAP_HOME.z + ud.base.z + 0.3);
                            dd.userData.to.set(
                                dd.userData.from.x + (Math.random() - 0.5) * 0.7,
                                dd.userData.from.y + 0.5 + Math.random() * 0.5,
                                dd.userData.from.z + (Math.random() - 0.5) * 0.5);
                            dd.visible = true;
                            break;
                        }
                    }
                } else if (!strike && dip < 0.4) {
                    ud.down = false;
                }
            }
            dustSpawn -= dt;

            for (var ki = 0; ki < keyFlashes.length; ki++) {
                var kp = keyFlashes[ki];
                if (!kp.visible) continue;
                kp.userData.life -= dt * 3.4;
                if (kp.userData.life <= 0) {
                    kp.visible = false;
                    kp.material.opacity = 0;
                    continue;
                }
                var kl = kp.userData.life;
                kp.material.opacity = kl * 0.85 * e;
                kp.scale.setScalar(1 + (1 - kl) * 1.3);
            }

            for (var qi = 0; qi < lapDust.length; qi++) {
                var du = lapDust[qi];
                if (!du.visible) continue;
                var d2 = du.userData;
                d2.t += dt;
                var dp = Math.min(d2.t / d2.dur, 1);
                du.position.lerpVectors(d2.from, d2.to, easeOutCubic(dp));
                du.material.opacity = Math.sin(dp * Math.PI) * 0.8 * e;
                du.rotation.x += dt * 5;
                du.rotation.y += dt * 4;
                du.scale.setScalar(1 - 0.5 * dp);
                if (dp >= 1) du.visible = false;
            }

            if (booted && e > 0.85) {
                glyphSpawn -= dt;
                if (glyphSpawn <= 0) {
                    glyphSpawn = 0.30 + Math.random() * 0.34;
                    spawnGlyph();
                }
            }
            for (var gi2 = 0; gi2 < glyphs.length; gi2++) {
                var gp = glyphs[gi2];
                if (!gp.visible) continue;
                var gd = gp.userData;
                gd.t += dt;
                var pp = Math.min(gd.t / gd.dur, 1);
                var pe = easeOutCubic(pp);
                var u = 1 - pe;
                gp.position.set(
                    u * u * gd.from.x + 2 * u * pe * gd.ctrl.x + pe * pe * gd.to.x,
                    u * u * gd.from.y + 2 * u * pe * gd.ctrl.y + pe * pe * gd.to.y,
                    u * u * gd.from.z + 2 * u * pe * gd.ctrl.z + pe * pe * gd.to.z);
                var gf = pp < 0.14 ? pp / 0.14 :
                    (pp > 0.72 ? Math.max(0, 1 - (pp - 0.72) / 0.28) : 1);
                gp.material.opacity = Math.max(0, gf) * e * 0.95;
                gp.scale.setScalar((0.34 + 0.30 * Math.sin(pp * Math.PI)) * e);
                if (pp >= 1) gp.visible = false;
            }

            if (mix > 0.55) {
                var w = (mix - 0.55) / 0.45;
                tRX = 0.04 + 0.27 * w;
                tRY = 0.20 * w + 0.03 * Math.sin(t * 0.41);
                var k2 = Math.min(1, dt * 2.4 * w);
                eyeTX += (0.24 + 0.06 * Math.sin(t * 6.9) - eyeTX) * k2;
                eyeTY += (0.28 + 0.04 * Math.sin(t * 8.7) - eyeTY) * k2;
            }
        }


        var MASK_PARK = new THREE.Vector3(-2.05, 1.95, 1.35);
        var MASK_SCALE = 1.24;
        var mask = new THREE.Group();
        mask.position.copy(FACE);
        mask.visible = false;
        world.add(mask);

        function circuitTexture() {
            var W = 512,
                H = 640;
            var c = document.createElement("canvas");
            c.width = W;
            c.height = H;
            var x = c.getContext("2d");
            x.fillStyle = "#ffffff";
            x.fillRect(0, 0, W, H);
            var seed = 9173;
            function rr() {
                seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                return seed / 0x7fffffff;
            }
            x.lineCap = "round";
            for (var ci = 0; ci < 46; ci++) {
                var px = Math.floor(rr() * W),
                    py = Math.floor(rr() * H);
                var a = Math.floor(rr() * 4) * Math.PI / 2;
                var cyan = rr() < 0.30;
                x.strokeStyle = cyan
                    ? "rgba(52, 190, 235, " + (0.50 + rr() * 0.35).toFixed(2) + ")"
                    : "rgba(34, 200, 118, " + (0.50 + rr() * 0.35).toFixed(2) + ")";
                x.lineWidth = rr() < 0.25 ? 3.6 : 2.2;
                x.beginPath();
                x.moveTo(px, py);
                var segs = 3 + Math.floor(rr() * 4);
                for (var s = 0; s < segs; s++) {
                    var len = 26 + rr() * 76;
                    px += Math.cos(a) * len;
                    py += Math.sin(a) * len;
                    x.lineTo(px, py);
                    a += (rr() < 0.5 ? -1 : 1) * Math.PI / 2;
                }
                x.stroke();
                x.fillStyle = "rgba(16, 84, 64, 0.45)";
                x.fillRect(px - 7, py - 5, 14, 10);
                x.strokeStyle = cyan ? "rgba(52, 190, 235, 0.85)"
                                     : "rgba(34, 200, 118, 0.85)";
                x.lineWidth = 1.4;
                x.strokeRect(px - 7, py - 5, 14, 10);
                x.fillStyle = cyan ? "rgba(140, 236, 255, 0.95)"
                                   : "rgba(96, 255, 172, 0.95)";
                x.beginPath();
                x.arc(px, py, 3.0, 0, Math.PI * 2);
                x.fill();
            }
            var tex = new THREE.CanvasTexture(c);
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(0.4505, 0.3546);
            tex.offset.set(0.5, 0.5106);
            return tex;
        }

        var maskFaceMat = hackMat(new THREE.MeshBasicMaterial({
            vertexColors: true,
            color: 0xffffff,
            map: circuitTexture(),
            transparent: true,
            opacity: 0.96
        }), 1.0);
        maskFaceMat.renderOrder = 30;
        var maskSideMat = hackMat(new THREE.MeshBasicMaterial({
            color: 0xbfb8aa
        }), 1.0);
        maskSideMat.renderOrder = 30;
        var maskDarkMat = hackMat(new THREE.MeshBasicMaterial({
            color: 0x10151f
        }), 0.95);
        maskDarkMat.renderOrder = 31;
        var maskRidgeMat = hackMat(new THREE.MeshBasicMaterial({
            color: 0xffffff
        }), 1.0);
        maskRidgeMat.renderOrder = 31;
        var maskNoseMat = hackMat(new THREE.MeshBasicMaterial({
            color: 0xffffff,
            vertexColors: true
        }), 0.9);
        maskNoseMat.renderOrder = 31;
        var maskBlushTex = glowTexture("rgba(255,96,150,.95)",
            "rgba(255,64,128,.38)");

        var EXTRUDE = {
            depth: 0.07,
            bevelEnabled: true,
            bevelThickness: 0.011,
            bevelSize: 0.011,
            bevelSegments: 2,
            curveSegments: 20
        };


        var DOME_X = 0.26,
            DOME_Y = 0.185,
            DOME_Y0 = 0.35;

        function domeZ(x, y) {
            var dy = y - DOME_Y0;
            return -DOME_X * x * x - DOME_Y * dy * dy;
        }

        function bendMask(geo) {
            var pos = geo.attributes.position;
            for (var bi = 0; bi < pos.count; bi++) {
                pos.setZ(bi, pos.getZ(bi) + domeZ(pos.getX(bi), pos.getY(bi)));
            }
            pos.needsUpdate = true;
            geo.computeBoundingSphere();
            return geo;
        }

        function subdivide(geo, levels) {
            var cur = geo;
            for (var lv = 0; lv < levels; lv++) {
                var src = cur.attributes.position,
                    tri = src.count / 3,
                    out = new Float32Array(tri * 36);
                var o = 0;
                for (var t = 0; t < tri; t++) {
                    var i0 = t * 9;
                    var ax = src.array[i0], ay = src.array[i0 + 1],
                        az = src.array[i0 + 2],
                        bx = src.array[i0 + 3], by = src.array[i0 + 4],
                        bz = src.array[i0 + 5],
                        cx = src.array[i0 + 6], cy = src.array[i0 + 7],
                        cz = src.array[i0 + 8];
                    var abx = (ax + bx) / 2, aby = (ay + by) / 2,
                        abz = (az + bz) / 2,
                        bcx = (bx + cx) / 2, bcy = (by + cy) / 2,
                        bcz = (bz + cz) / 2,
                        cax = (cx + ax) / 2, cay = (cy + ay) / 2,
                        caz = (cz + az) / 2;
                    out[o++] = ax; out[o++] = ay; out[o++] = az;
                    out[o++] = abx; out[o++] = aby; out[o++] = abz;
                    out[o++] = cax; out[o++] = cay; out[o++] = caz;
                    out[o++] = abx; out[o++] = aby; out[o++] = abz;
                    out[o++] = bx; out[o++] = by; out[o++] = bz;
                    out[o++] = bcx; out[o++] = bcy; out[o++] = bcz;
                    out[o++] = cax; out[o++] = cay; out[o++] = caz;
                    out[o++] = bcx; out[o++] = bcy; out[o++] = bcz;
                    out[o++] = cx; out[o++] = cy; out[o++] = cz;
                    out[o++] = abx; out[o++] = aby; out[o++] = abz;
                    out[o++] = bcx; out[o++] = bcy; out[o++] = bcz;
                    out[o++] = cax; out[o++] = cay; out[o++] = caz;
                }
                var ng = new THREE.BufferGeometry();
                ng.setAttribute("position", new THREE.BufferAttribute(out, 3));
                for (var gi = 0; gi < cur.groups.length; gi++) {
                    var gr = cur.groups[gi];
                    ng.addGroup(gr.start * 4, gr.count * 4, gr.materialIndex);
                }
                cur = ng;
            }
            return cur;
        }

        var IVORY = new THREE.Color(0xefe9dc);

        function plateShade(x, y) {
            var nx = 2 * DOME_X * x,
                ny = 2 * DOME_Y * (y - DOME_Y0),
                nz = 1;
            var inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
            nx *= inv; ny *= inv; nz *= inv;
            var diff = Math.max(0, nx * -0.38 + ny * 0.56 + nz * 0.73);
            var lit = 0.70 + 0.30 * diff;
            [-1, 1].forEach(function(sgn) {
                var dx = x - sgn * 0.49,
                    dy = y - 0.40;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < 0.56) lit *= 0.87 + 0.13 * Math.pow(d / 0.56, 0.7);
            });
            if (y < -0.55) lit *= 0.95 + 0.05 * Math.max(0, (y + 1.44) / 0.89);
            return Math.max(0.52, Math.min(1.03, lit));
        }

        function paintPlate(geo) {
            var pos = geo.attributes.position;
            var col = new Float32Array(pos.count * 3);
            var uvs = new Float32Array(pos.count * 2);
            var c = new THREE.Color();
            for (var pi = 0; pi < pos.count; pi++) {
                c.copy(IVORY).multiplyScalar(
                    plateShade(pos.getX(pi), pos.getY(pi)));
                col[pi * 3] = c.r;
                col[pi * 3 + 1] = c.g;
                col[pi * 3 + 2] = c.b;
                uvs[pi * 2] = pos.getX(pi);
                uvs[pi * 2 + 1] = pos.getY(pi);
            }
            geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
            geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
            return geo;
        }

        var faceShape = new THREE.Shape();
        faceShape.moveTo(0, -1.44);
        faceShape.bezierCurveTo(-0.15, -1.437, -0.33, -1.365, -0.48, -1.25);
        faceShape.bezierCurveTo(-0.64, -1.10, -0.80, -0.84, -0.92, -0.54);
        faceShape.bezierCurveTo(-1.02, -0.30, -1.09, -0.06, -1.10, 0.14);
        faceShape.bezierCurveTo(-1.11, 0.24, -1.11, 0.31, -1.10, 0.38);
        faceShape.bezierCurveTo(-1.08, 0.60, -0.98, 0.88, -0.78, 1.08);
        faceShape.bezierCurveTo(-0.58, 1.27, -0.30, 1.38, 0, 1.38);
        faceShape.bezierCurveTo(0.30, 1.38, 0.58, 1.27, 0.78, 1.08);
        faceShape.bezierCurveTo(0.98, 0.88, 1.08, 0.60, 1.10, 0.38);
        faceShape.bezierCurveTo(1.11, 0.31, 1.11, 0.24, 1.10, 0.14);
        faceShape.bezierCurveTo(1.09, -0.06, 1.02, -0.30, 0.92, -0.54);
        faceShape.bezierCurveTo(0.80, -0.84, 0.64, -1.10, 0.48, -1.25);
        faceShape.bezierCurveTo(0.33, -1.365, 0.15, -1.437, 0, -1.44);
        var faceMesh = new THREE.Mesh(
            paintPlate(bendMask(subdivide(
                new THREE.ExtrudeGeometry(faceShape, EXTRUDE), 2))),
            [maskFaceMat, maskSideMat]);
        faceMesh.position.z = -0.036;
        faceMesh.renderOrder = 30;
        mask.add(faceMesh);

        var maskOutlineMat = new THREE.MeshBasicMaterial({
            color: 0x2bff9a,
            transparent: true,
            opacity: 0,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        var maskOutline = new THREE.Mesh(faceMesh.geometry,
            [maskOutlineMat, maskOutlineMat]);
        maskOutline.scale.setScalar(1.05);
        maskOutline.position.z = -0.052;
        maskOutline.renderOrder = 29;
        mask.add(maskOutline);

        function flatMesh(shape, mat, order, depth) {
            var m = new THREE.Mesh(
                bendMask(subdivide(new THREE.ExtrudeGeometry(shape, {
                    depth: depth === undefined ? 0.035 : depth,
                    bevelEnabled: false,
                    curveSegments: 16
                }), 2)), mat);
            m.renderOrder = order;
            return m;
        }

        var maskShadowMat = hackMat(new THREE.MeshBasicMaterial({
            color: 0x2a3040
        }), 0.38);
        maskShadowMat.renderOrder = 30;

        function featureShadow(m, dx, dy) {
            var sh = new THREE.Mesh(m.geometry, maskShadowMat);
            sh.position.copy(m.position);
            sh.position.x += dx;
            sh.position.y += dy;
            sh.position.z -= 0.004;
            sh.renderOrder = 30;
            mask.add(sh);
        }

        [-1, 1].forEach(function(sgn) {
            var s = new THREE.Shape();
            s.moveTo(sgn * 0.88, 0.83);
            s.bezierCurveTo(sgn * 0.78, 0.925, sgn * 0.60, 0.95,
                sgn * 0.44, 0.90);
            s.bezierCurveTo(sgn * 0.30, 0.865, sgn * 0.19, 0.755,
                sgn * 0.115, 0.60);
            s.bezierCurveTo(sgn * 0.20, 0.655, sgn * 0.36, 0.745,
                sgn * 0.50, 0.775);
            s.bezierCurveTo(sgn * 0.64, 0.805, sgn * 0.78, 0.79,
                sgn * 0.88, 0.83);
            var m = flatMesh(s, maskDarkMat, 31, 0.022);
            m.position.z = 0.052;
            mask.add(m);
            featureShadow(m, 0.013, -0.017);
        });

        [-1, 1].forEach(function(sgn) {
            var s = new THREE.Shape();
            s.moveTo(sgn * 0.72, 0.415);
            s.quadraticCurveTo(sgn * 0.50, 0.50, sgn * 0.25, 0.375);
            s.quadraticCurveTo(sgn * 0.50, 0.30, sgn * 0.72, 0.415);
            var m = flatMesh(s, maskDarkMat, 31, 0.02);
            m.position.z = 0.045;
            mask.add(m);
        });

        [-1, 1].forEach(function(sgn) {
            var b = new THREE.Sprite(new THREE.SpriteMaterial({
                map: maskBlushTex,
                transparent: true,
                opacity: 0,
                depthWrite: false
            }));
            b.position.set(sgn * 0.82, 0.0, 0.055 + domeZ(0.82, 0.0));
            b.scale.setScalar(0.42);
            b.renderOrder = 31;
            mask.add(b);
            mkMat(hackMats, b.material, 0.36);
        });

        var maskSheen = new THREE.Sprite(new THREE.SpriteMaterial({
            map: glowTexture("rgba(255,255,255,.45)",
                "rgba(255,255,255,.12)"),
            transparent: true,
            opacity: 0,
            depthWrite: false
        }));
        maskSheen.position.set(-0.38, 1.00, 0.055 + domeZ(-0.38, 1.00));
        maskSheen.scale.set(1.15, 0.72, 1);
        maskSheen.renderOrder = 32;
        mask.add(maskSheen);
        mkMat(hackMats, maskSheen.material, 0.16);

        [-1, 1].forEach(function(sgn) {
            var s = new THREE.Shape();
            s.moveTo(sgn * 0.005, -0.295);
            s.bezierCurveTo(sgn * 0.06, -0.305, sgn * 0.10, -0.315,
                sgn * 0.115, -0.325);
            s.bezierCurveTo(sgn * 0.16, -0.36, sgn * 0.21, -0.415,
                sgn * 0.26, -0.445);
            s.bezierCurveTo(sgn * 0.35, -0.425, sgn * 0.40, -0.41,
                sgn * 0.44, -0.40);
            s.bezierCurveTo(sgn * 0.52, -0.385, sgn * 0.585, -0.36,
                sgn * 0.63, -0.335);
            s.bezierCurveTo(sgn * 0.68, -0.305, sgn * 0.73, -0.265,
                sgn * 0.755, -0.24);
            s.bezierCurveTo(sgn * 0.79, -0.215, sgn * 0.815, -0.255,
                sgn * 0.80, -0.29);
            s.bezierCurveTo(sgn * 0.775, -0.335, sgn * 0.74, -0.36,
                sgn * 0.70, -0.39);
            s.bezierCurveTo(sgn * 0.64, -0.44, sgn * 0.57, -0.49,
                sgn * 0.48, -0.53);
            s.bezierCurveTo(sgn * 0.40, -0.565, sgn * 0.30, -0.585,
                sgn * 0.22, -0.60);
            s.bezierCurveTo(sgn * 0.19, -0.605, sgn * 0.165, -0.595,
                sgn * 0.16, -0.585);
            s.bezierCurveTo(sgn * 0.15, -0.50, sgn * 0.13, -0.40,
                sgn * 0.005, -0.295);
            var m = flatMesh(s, maskDarkMat, 31, 0.02);
            m.position.z = 0.046;
            mask.add(m);
            featureShadow(m, 0.011, -0.015);
        });

        (function() {
            var s = new THREE.Shape();
            s.moveTo(-0.30, -0.575);
            s.quadraticCurveTo(0, -0.635, 0.30, -0.575);
            s.lineTo(0.30, -0.597);
            s.quadraticCurveTo(0, -0.657, -0.30, -0.597);
            s.closePath();
            var m = flatMesh(s, maskDarkMat, 31, 0.015);
            m.position.z = 0.046;
            mask.add(m);

            var r = new THREE.Shape();
            r.moveTo(-0.285, -0.605);
            r.quadraticCurveTo(0, -0.668, 0.285, -0.605);
            r.lineTo(0.285, -0.638);
            r.quadraticCurveTo(0, -0.701, -0.285, -0.638);
            r.closePath();
            var rm = flatMesh(r, maskRidgeMat, 31, 0.013);
            rm.position.z = 0.047;
            mask.add(rm);
        })();

        (function() {
            var s = new THREE.Shape();
            s.moveTo(-0.13, -0.775);
            s.bezierCurveTo(-0.135, -0.95, -0.105, -1.16, -0.068, -1.30);
            s.bezierCurveTo(-0.052, -1.375, -0.028, -1.425, 0, -1.425);
            s.bezierCurveTo(0.028, -1.425, 0.052, -1.375, 0.068, -1.30);
            s.bezierCurveTo(0.105, -1.16, 0.135, -0.95, 0.13, -0.775);
            s.quadraticCurveTo(0, -0.80, -0.13, -0.775);
            var m = flatMesh(s, maskDarkMat, 31, 0.02);
            m.position.z = 0.046;
            mask.add(m);
            featureShadow(m, 0.009, -0.013);
        })();

        (function() {
            var STATIONS = [
                [ 0.400, 0.046, 0.003],
                [ 0.300, 0.062, 0.009],
                [ 0.190, 0.078, 0.019],
                [ 0.070, 0.100, 0.034],
                [-0.040, 0.132, 0.052],
                [-0.120, 0.172, 0.068],
                [-0.175, 0.212, 0.076],
                [-0.215, 0.258, 0.074],
                [-0.250, 0.292, 0.062],
                [-0.280, 0.262, 0.042],
                [-0.305, 0.165, 0.020],
                [-0.325, 0.055, 0.006]
            ];
            var SEG = 12;
            var BASE_Z = 0.050;
            var LAST = STATIONS.length - 1;

            function surfaceZ(x, y) {
                var lo = 0;
                var hi = LAST;
                if (y >= STATIONS[0][0]) {
                    hi = 0;
                } else if (y <= STATIONS[LAST][0]) {
                    lo = LAST;
                } else {
                    for (var i = 0; i < LAST; i++) {
                        if (y <= STATIONS[i][0] && y >= STATIONS[i + 1][0]) {
                            lo = i;
                            hi = i + 1;
                            break;
                        }
                    }
                }
                var t = (STATIONS[lo][0] - y) /
                        Math.max(1e-6, STATIONS[lo][0] - STATIONS[hi][0]);
                var w = STATIONS[lo][1] +
                        (STATIONS[hi][1] - STATIONS[lo][1]) * t;
                var h = STATIONS[lo][2] +
                        (STATIONS[hi][2] - STATIONS[lo][2]) * t;
                var s = Math.min(1, Math.abs(x) / Math.max(1e-6, w));
                return BASE_Z + h * Math.sqrt(Math.max(0, 1 - s * s));
            }

            var positions = [];
            var colours = [];
            var indices = [];
            var bright = new THREE.Color(0xf2ede3);
            var shade = new THREE.Color(0xcdc4b4);
            var tint = new THREE.Color();
            for (var si = 0; si <= LAST; si++) {
                var sy = STATIONS[si][0];
                var sw = STATIONS[si][1];
                var sh = STATIONS[si][2];
                for (var k = 0; k <= SEG; k++) {
                    var th = (k / SEG - 0.5) * Math.PI;
                    positions.push(sw * Math.sin(th), sy,
                                   BASE_Z + sh * Math.cos(th));
                    var front = Math.cos(th);
                    var low = Math.min(1, Math.max(0, (sy + 0.34) / 0.16));
                    var lit = 0.26 + 0.74 * front * (0.35 + 0.65 * low);
                    tint.copy(shade).lerp(bright, Math.min(1, lit));
                    colours.push(tint.r, tint.g, tint.b);
                }
            }
            var ring = SEG + 1;
            for (var sj = 0; sj < LAST; sj++) {
                for (var k2 = 0; k2 < SEG; k2++) {
                    var a0 = sj * ring + k2;
                    var a1 = a0 + 1;
                    var b0 = a0 + ring;
                    var b1 = b0 + 1;
                    indices.push(a0, b0, a1, a1, b0, b1);
                }
            }
            var noseGeo = new THREE.BufferGeometry();
            noseGeo.setAttribute("position",
                new THREE.BufferAttribute(new Float32Array(positions), 3));
            noseGeo.setAttribute("color",
                new THREE.BufferAttribute(new Float32Array(colours), 3));
            noseGeo.setIndex(indices);
            bendMask(noseGeo);
            var noseMesh = new THREE.Mesh(noseGeo, maskNoseMat);
            noseMesh.renderOrder = 31;
            mask.add(noseMesh);

            [-1, 1].forEach(function(sgn) {
                var n = new THREE.Shape();
                n.moveTo(sgn * 0.062, -0.230);
                n.quadraticCurveTo(sgn * 0.182, -0.334, sgn * 0.248, -0.258);
                n.quadraticCurveTo(sgn * 0.150, -0.240, sgn * 0.062, -0.230);
                var nm = flatMesh(n, maskDarkMat, 31, 0.012);
                var pos = nm.geometry.attributes.position;
                for (var vi = 0; vi < pos.count; vi++) {
                    var vx = pos.getX(vi);
                    var vy = pos.getY(vi);
                    pos.setZ(vi, surfaceZ(vx, vy) + 0.005 + domeZ(vx, vy));
                }
                pos.needsUpdate = true;
                nm.geometry.computeBoundingSphere();
                mask.add(nm);
            });

            var shadeTex = glowTexture("rgba(58,54,62,.85)",
                "rgba(58,54,62,.30)");
            var sh = new THREE.Sprite(new THREE.SpriteMaterial({
                map: shadeTex,
                transparent: true,
                opacity: 0,
                depthWrite: false
            }));
            sh.position.set(0, -0.298, 0.056 + domeZ(0, -0.298));
            sh.scale.set(0.62, 0.30, 1);
            sh.renderOrder = 31;
            mask.add(sh);
            mkMat(hackMats, sh.material, 0.55);
        })();

        var hackEyes = [];
        [-1, 1].forEach(function(sgn) {
            var g = new THREE.Sprite(new THREE.SpriteMaterial({
                map: T.eye,
                color: 0x3dff9a,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false
            }));
            g.position.set(sgn * 0.49, 0.40, 0.16);
            g.scale.setScalar(0.52);
            g.renderOrder = 33;
            mask.add(g);
            hackEyes.push(g);
        });

        var hackEyeGlow = [];
        [-1, 1].forEach(function(sgn) {
            var hg = new THREE.Sprite(new THREE.SpriteMaterial({
                map: T.aura,
                color: 0x2bff9a,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false
            }));
            hg.position.set(sgn * 0.49, 0.40, 0.10);
            hg.scale.setScalar(0.78);
            hg.renderOrder = 32;
            mask.add(hg);
            hackEyeGlow.push(hg);
        });

        var maskRim = new THREE.Sprite(new THREE.SpriteMaterial({
            map: T.aura,
            color: 0x22ff8f,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false
        }));
        maskRim.position.z = -0.10;
        maskRim.scale.setScalar(3.4);
        maskRim.renderOrder = 29;
        mask.add(maskRim);
        mkMat(hackMats, maskRim.material, 0.38);

        var scanBand = new THREE.Mesh(
            new THREE.PlaneGeometry(2.7, 0.14),
            new THREE.MeshBasicMaterial({
                color: 0x5cffb0,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false
            }));
        scanBand.position.z = 0.14;
        scanBand.renderOrder = 34;
        scanBand.visible = false;
        mask.add(scanBand);

        var aurora = new THREE.Mesh(
            new THREE.PlaneGeometry(2.9, 1.15),
            new THREE.MeshBasicMaterial({
                map: T.aura,
                color: 0x39e9a0,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false
            }));
        aurora.position.z = 0.12;
        aurora.renderOrder = 33;
        aurora.visible = false;
        mask.add(aurora);

        var sonar = new THREE.Sprite(new THREE.SpriteMaterial({
            map: T.aura,
            color: 0x9fe8ff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false
        }));
        sonar.position.z = -0.06;
        sonar.renderOrder = 30;
        sonar.visible = false;
        mask.add(sonar);

        var shards = [];
        for (var sh = 0; sh < 10; sh++) {
            var sm = new THREE.Mesh(
                new THREE.BoxGeometry(0.10, 0.10, 0.10),
                new THREE.MeshBasicMaterial({
                    color: sh % 3 ? 0x2bff9c : 0xbdf7ff,
                    transparent: true,
                    opacity: 0,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    depthTest: false
                }));
            sm.renderOrder = 34;
            sm.visible = false;
            var ang = Math.random() * Math.PI * 2,
                rad = 2.6 + Math.random() * 2.4;
            sm.userData = {
                from: new THREE.Vector3(Math.cos(ang) * rad,
                    0.5 + Math.sin(ang) * rad * 0.7,
                    Math.sin(ang * 1.7) * rad * 0.9),
                to: new THREE.Vector3((Math.random() - 0.5) * 1.7,
                    (Math.random() - 0.5) * 2.2, 0.10),
                off: Math.random() * 0.34,
                spin: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 5)
            };
            mask.add(sm);
            shards.push(sm);
        }

        var motes = [];
        for (var mo = 0; mo < 18; mo++) {
            var mg = new THREE.Sprite(new THREE.SpriteMaterial({
                map: T.dot,
                color: mo % 3 ? 0x2bff9a : 0xbdf7ff,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false
            }));
            mg.renderOrder = 33;
            mg.visible = false;
            mg.userData = {
                phase: Math.random() * Math.PI * 2,
                radius: 1.7 + Math.random() * 1.5,
                speed: 0.35 + Math.random() * 0.55,
                lift: Math.random() * 1.6 - 0.4,
                size: 0.05 + Math.random() * 0.06,
                twinkle: 0.5 + Math.random() * 1.6
            };
            mask.add(mg);
            motes.push(mg);
        }

        var hackScanT = -1,
            hackLanded = false,
            hackNextScan = 0,
            hackBlinkAt = 2.5,
            hackBlinkT = -1,
            hackAuroraAt = 1.5,
            hackAuroraT = -1,
            hackSonarAt = 3.0,
            hackSonarT = -1;

        function updateHack(dt, t, mix) {
            var vis = mix > 0.004;
            mask.visible = vis;
            if (!vis) {
                hackLanded = false;
                return;
            }
            var e = mix;
            mask.position.copy(FACE).addScaledVector(MASK_PARK, 1 - e);
            var gl = Math.max(0, 1 - e / 0.62);
            var burst = Math.pow(Math.max(0, Math.sin(t * 0.43 + 1.3)), 26);
            var glitch = Math.max(gl, burst * e * 0.9);
            mask.position.x += glitch * (Math.sin(t * 53.1) + Math.sin(t * 21.7)) * 0.075;
            mask.position.y += glitch * Math.sin(t * 37.3) * 0.035;
            mask.rotation.set(
                -1.02 * (1 - e) + glitch * 0.06 * Math.sin(t * 33.0),
                0.78 * (1 - e) + glitch * 0.05 * Math.sin(t * 19.0),
                -0.60 * (1 - e) + glitch * 0.05 * Math.sin(t * 27.0) +
                    e * 0.015 * Math.sin(t * 0.9));
            var land = Math.exp(-Math.pow((e - 0.985) / 0.028, 2));
            var grow = easeOutCubic(Math.min(e / 0.88, 1));
            mask.scale.setScalar(MASK_SCALE * (0.30 + 0.70 * grow) * (1 + 0.07 * land));
            setOpacity(hackMats, Math.min(1, e * 1.25));

            var idle = e > 0.9 ? (e - 0.9) * 10 : 0;
            mask.position.y += idle * (Math.sin(t * 1.35) * 0.020 +
                                       Math.sin(t * 2.13) * 0.011);
            mask.position.z += idle * Math.sin(t * 1.02 + 0.7) * 0.012;
            mask.rotation.z += idle * 0.022 * Math.sin(t * 0.62);
            mask.rotation.y += idle * 0.030 * Math.sin(t * 0.44 + 1.1);

            maskOutlineMat.opacity = (0.30 * e + 0.24 * land) *
                (0.75 + 0.25 * Math.sin(t * 2.1));

            if (!hackLanded && e > 0.93) {
                hackLanded = true;
                hackScanT = 0;
                hackNextScan = t + 6.5;
                hackBlinkAt = t + 2.2;
                hackAuroraAt = t + 1.4;
                hackSonarAt = t + 3.4;
            }
            if (e < 0.35) hackLanded = false;
            if (hackScanT < 0 && hackLanded && t >= hackNextScan) {
                hackScanT = 0;
                hackNextScan = t + 7.0 + (t % 3.0);
            }

            var rimPulse = 0.86 + 0.14 * Math.sin(t * 1.9);
            if (hackScanT >= 0) rimPulse += 0.30;
            if (hackSonarT >= 0) rimPulse += 0.16;
            maskRim.material.opacity = (0.30 * e + 0.55 * land) * rimPulse;

            var flick = 0.72 + 0.16 * Math.sin(t * 7.3) + 0.12 * Math.sin(t * 23.1);
            var focus = Math.pow(Math.max(0, Math.sin(t * 0.47 + 2.1)), 20);
            if (hackBlinkT < 0 && hackLanded && t >= hackBlinkAt) {
                hackBlinkT = 0;
                hackBlinkAt = t + 2.8 + (t % 2.3);
            }
            var blinkK = 1;
            if (hackBlinkT >= 0) {
                hackBlinkT += dt;
                var bp = hackBlinkT / 0.17;
                if (bp >= 1) {
                    hackBlinkT = -1;
                } else {
                    blinkK = 1 - Math.sin(bp * Math.PI) * 0.88;
                }
            }
            for (var i = 0; i < hackEyes.length; i++) {
                var es = 0.52 + 0.09 * flick + 0.16 * focus;
                hackEyes[i].material.opacity =
                    Math.min(1, e * 1.15) * (0.55 + 0.45 * flick) * 0.95 *
                    (0.55 + 0.45 * blinkK);
                hackEyes[i].scale.set(es, es * blinkK, 1);
            }
            for (var ge = 0; ge < hackEyeGlow.length; ge++) {
                var gw = 0.30 + 0.14 * Math.sin(t * 3.1 + ge * 1.7);
                hackEyeGlow[ge].material.opacity =
                    e * gw * (0.5 + 0.5 * focus) * (0.6 + 0.4 * blinkK);
                hackEyeGlow[ge].scale.setScalar(0.72 + 0.10 * focus +
                    0.06 * Math.sin(t * 2.2 + ge));
            }

            if (hackScanT >= 0) {
                hackScanT += dt;
                var sp = hackScanT / 0.62;
                scanBand.visible = sp < 1;
                if (sp < 1) {
                    scanBand.position.y = 1.65 - 3.30 * easeOutCubic(sp);
                    scanBand.material.opacity = Math.sin(sp * Math.PI) * 0.85 * e;
                    scanBand.scale.x = 0.55 + 0.45 * Math.sin(sp * Math.PI);
                } else {
                    hackScanT = -1;
                }
            } else {
                scanBand.visible = false;
            }

            if (hackAuroraT < 0 && hackLanded && t >= hackAuroraAt) {
                hackAuroraT = 0;
                hackAuroraAt = t + 3.8 + (t % 2.1);
            }
            if (hackAuroraT >= 0) {
                hackAuroraT += dt;
                var ap = hackAuroraT / 1.55;
                aurora.visible = ap < 1;
                if (ap < 1) {
                    aurora.position.y = 1.9 - 3.9 * easeOutCubic(ap);
                    aurora.material.opacity = Math.sin(ap * Math.PI) * 0.20 * e;
                } else {
                    hackAuroraT = -1;
                }
            } else {
                aurora.visible = false;
            }

            if (hackSonarT < 0 && hackLanded && t >= hackSonarAt) {
                hackSonarT = 0;
                hackSonarAt = t + 4.4 + (t % 2.7);
            }
            if (hackSonarT >= 0) {
                hackSonarT += dt;
                var np = hackSonarT / 1.15;
                sonar.visible = np < 1;
                if (np < 1) {
                    sonar.scale.setScalar(1.1 + 2.6 * easeOutCubic(np));
                    sonar.material.opacity = (1 - np) * 0.30 * e;
                } else {
                    hackSonarT = -1;
                }
            } else {
                sonar.visible = false;
            }

            for (var mI = 0; mI < motes.length; mI++) {
                var mt = motes[mI],
                    mu = mt.userData;
                var ma = mu.phase + t * mu.speed;
                mt.position.set(Math.cos(ma) * mu.radius * 0.92,
                                mu.lift + Math.sin(t * 0.9 + mu.phase) * 0.24,
                                0.25 + Math.sin(ma * 0.7) * mu.radius * 0.5);
                var tw = 0.5 + 0.5 * Math.sin(t * mu.twinkle + mu.phase * 3.0);
                mt.material.opacity = e * (0.16 + 0.50 * tw);
                mt.scale.setScalar(mu.size * (0.7 + 0.6 * tw));
                mt.visible = e > 0.25;
            }

            for (var s2 = 0; s2 < shards.length; s2++) {
                var sd = shards[s2],
                    ud = sd.userData;
                var p = Math.min(Math.max((e - ud.off) / 0.56, 0), 1);
                if (p <= 0 || p >= 1) {
                    sd.visible = false;
                    continue;
                }
                sd.visible = true;
                var pe = easeOutCubic(p);
                sd.position.lerpVectors(ud.from, ud.to, pe);
                sd.rotation.set(pe * ud.spin, pe * ud.spin * 0.8, pe * ud.spin * 0.6);
                sd.material.opacity = Math.sin(p * Math.PI) * 0.9 * e;
                sd.scale.setScalar(0.4 + 1.2 * (1 - p));
            }

            if (mix > 0.6) {
                var w = (mix - 0.6) / 0.4;
                tRX = 0.04 + 0.02 * Math.sin(t * 0.33);
                tRY = 0.03 * Math.sin(t * 0.21);
                var k3 = Math.min(1, dt * 2.2 * w);
                eyeTX += (0.0 - eyeTX) * k3;
                eyeTY += (0.0 - eyeTY) * k3;
            }
        }

        function updateOutfits(dt, t) {
            var sup = cine.mix > 0.45;
            var devMix = driveProp(dev, devOn && !sup, dt, 1.20, 0.62);
            var hackMix = driveProp(hack, hackOn && !sup, dt, 1.05, 0.50);
            updateDev(dt, t, devMix);
            updateHack(dt, t, hackMix);
        }

        var cine = {
            want: 0,
            mix: 0,
            from: 0,
            dur: 1,
            t: 0,
            pop: 0,
            popFrom: 0,
            popDur: 1,
            popT: 0,
            spawn: 0,
            nom: 0
        };

        function cinemaSet(on) {
            on = on ? 1 : 0;
            console.log("[mascot] cinemaSet", on, "was", cine.want);
            if (on === cine.want) return;
            cine.want = on;
            cine.t = 0;
            cine.from = cine.mix;
            cine.dur = on ? 1.05 : 0.72;
            cine.popT = 0;
            cine.popFrom = cine.pop;
            cine.popDur = on ? 0.85 : 0.62;
            if (on) cine.spawn = 3.2;
            for (var ci = 0; ci < flying.length; ci++) flying[ci].visible = false;
            crunchT = 0;
            crunch.visible = false;
            boxKick = 0;
        }

        var musicOn = false;
        var mus = {
            want: 0,
            mix: 0,
            from: 0,
            t: 0,
            dur: 1
        };

        function musicSet(on) {
            on = !!on;
            console.log("[mascot] musicSet", on, "was", musicOn);
            musicOn = on;
        }

        function spawnKernel() {
            for (var si = 0; si < flying.length; si++) {
                var f = flying[si];
                if (f.visible) continue;
                var d = f.userData;
                d.t = 0;
                d.dur = 0.82 + Math.random() * 0.22;
                d.spin = (Math.random() < 0.5 ? -1 : 1) * (4.5 + Math.random() * 3);
                d.from.set(POP_HOME.x + (Math.random() - 0.5) * 0.55,
                    POP_HOME.y + 0.55 + Math.random() * 0.12,
                    POP_HOME.z + (Math.random() - 0.5) * 0.25);
                d.to.set(-0.06 + (Math.random() - 0.5) * 0.40,
                    -0.40 + Math.random() * 0.12,
                    2.16 + Math.random() * 0.10);
                d.ctrl.set((d.from.x + d.to.x) / 2 + (Math.random() - 0.5) * 1.0,
                    (d.from.y + d.to.y) / 2 + 1.25,
                    (d.from.z + d.to.z) / 2 + 0.35);
                f.visible = true;
                f.material.opacity = 1;
                d.glow.material.opacity = 0;
                f.scale.setScalar(1);
                boxKick = 0.34;
                return;
            }
        }

        function updateKernels(dt) {
            for (var ui = 0; ui < flying.length; ui++) {
                var f = flying[ui];
                if (!f.visible) continue;
                var d = f.userData;
                d.t += dt;
                var p = Math.min(d.t / d.dur, 1);
                var e = p * p * (3 - 2 * p);
                var u = 1 - e;
                f.position.set(
                    u * u * d.from.x + 2 * u * e * d.ctrl.x + e * e * d.to.x,
                    u * u * d.from.y + 2 * u * e * d.ctrl.y + e * e * d.to.y,
                    u * u * d.from.z + 2 * u * e * d.ctrl.z + e * e * d.to.z);
                f.rotation.x += dt * d.spin;
                f.rotation.z += dt * d.spin * 0.7;
                var fade = p < 0.10 ? p / 0.10 : 1;
                var eat = p < 0.78 ? 0 : (p - 0.78) / 0.22;
                f.material.opacity = Math.max(0, fade * (1 - 0.75 * eat)) * cine.mix;
                d.glow.material.opacity = Math.max(0, fade * (1 - eat)) * cine.mix * 0.5;
                f.scale.setScalar((0.72 + 0.5 * Math.sin(p * Math.PI)) *
                    (1 - 0.82 * eat * eat) * cine.mix);
                if (p >= 1) {
                    f.visible = false;
                    cine.nom = 0.30;
                    crunchT = 0.30;
                    crunch.position.copy(f.position);
                    crunch.visible = true;
                }
            }
            if (crunchT > 0) {
                crunchT = Math.max(0, crunchT - dt);
                var cp = 1 - crunchT / 0.30;
                crunch.material.opacity = 0.75 * (1 - cp) * (1 - cp) * cine.mix;
                crunch.scale.setScalar(0.35 + 0.95 * cp);
                if (crunchT <= 0) crunch.visible = false;
            }
        }

        function updateCinema(dt, t) {
            cine.t += dt;
            var gp = Math.min(cine.t / cine.dur, 1);
            var ge = cine.want ? easeOutCubic(gp) : easeInCubic(gp);
            cine.mix = cine.from + (cine.want - cine.from) * ge;
            if (!cine.want && gp >= 1) cine.mix = 0;

            cine.popT += dt;
            var qd = cine.want ? 0.45 : 0;
            var qp = Math.min(Math.max(cine.popT - qd, 0) / cine.popDur, 1);
            var qe = cine.want ? easeOutCubic(qp) : easeInCubic(qp);
            cine.pop = cine.popFrom + (cine.want - cine.popFrom) * qe;
            if (!cine.want && qp >= 1) cine.pop = 0;

            cine.nom = Math.max(0, cine.nom - dt);

            var vis = cine.mix > 0.004;
            glasses.visible = vis;
            if (vis) {
                glasses.position.copy(FACE)
                    .addScaledVector(GLASSES_PARK, 1 - cine.mix);
                glasses.rotation.set(
                    -1.15 * (1 - cine.mix),
                    0.62 * (1 - cine.mix),
                    -0.98 * (1 - cine.mix));
                glasses.scale.setScalar(0.62 + 0.38 * cine.mix);
                setOpacity(glassesMats, cine.mix);
                var glint = Math.exp(-Math.pow((cine.t - 0.87) / 0.085, 2));
                var lensOp = Math.min(0.92, 0.46 * cine.mix + 0.40 * glint);
                lensRedMat.opacity = lensOp;
                lensCyanMat.opacity = lensOp;
            }

            var pvis = cine.pop > 0.004;
            popcorn.visible = pvis;
            if (pvis) {
                boxKick = Math.max(0, boxKick - dt);
                var kick = Math.sin((1 - boxKick / 0.34) * Math.PI);
                popcorn.position.set(POP_HOME.x,
                    POP_HOME.y + (1 - cine.pop) * -2.8,
                    POP_HOME.z + (1 - cine.pop) * 0.5);
                popcorn.rotation.z = (1 - cine.pop) * 0.6 + kick * 0.055;
                popcorn.rotation.x = (1 - cine.pop) * -0.4 + kick * 0.035;
                popcorn.scale.setScalar(0.70 + 0.30 * cine.pop);
                setOpacity(popMats, cine.pop);
                popGlow.material.opacity =
                    cine.pop * (0.15 + 0.06 * Math.sin(t * 2.3));
            }

            if (cine.want && cine.mix > 0.85 && cine.pop > 0.85) {
                cine.spawn -= dt;
                if (cine.spawn <= 0) {
                    cine.spawn = 4.0;
                    spawnKernel();
                }
            }
            updateKernels(dt);

            if (cine.mix > 0.6) {
                var w = (cine.mix - 0.6) / 0.4;
                tRX = 0.04 + 0.02 * Math.sin(t * 0.43);
                tRY = 0.05 * Math.sin(t * 0.27);
                var k2 = Math.min(1, dt * 2.6 * w);
                eyeTX += (0.02 * Math.sin(t * 0.31) - eyeTX) * k2;
                eyeTY += (0.02 * Math.sin(t * 0.47) - eyeTY) * k2;
            }
        }

        function updateNotes(dt, t) {
            for (var qi = 0; qi < notes.length; qi++) {
                var q = notes[qi];
                var d = q.userData;
                var p = (t / d.dur + d.phase) % 1;
                var fade = p < 0.20 ? p / 0.20 :
                    (p > 0.74 ? (1 - p) / 0.26 : 1);
                var op = fade * mus.mix;
                q.position.set(
                    d.x + Math.sin(t * 1.05 + d.phase * 6.2832) * d.sway,
                    d.y0 + p * d.rise,
                    d.z + Math.sin(t * 0.7 + d.phase * 4.0) * 0.16);
                q.rotation.z = d.tilt + Math.sin(t * 0.9 + d.phase * 6.2832) * 0.14;
                var grow = 0.55 + 0.45 * Math.min(p / 0.22, 1);
                q.scale.setScalar(grow * (1 - 0.22 * Math.max(0, (p - 0.74) / 0.26)));
                d.mat.opacity = op;
                d.glow.opacity = op * 0.42;
                q.visible = op > 0.01;
            }
        }

        function updateMusic(dt, t) {
            var sup = cine.mix > 0.45;
            driveProp(mus, musicOn && !sup, dt, 0.85, 0.55);

            var vis = mus.mix > 0.004;
            phones.visible = vis;
            if (vis) {
                phones.position.set(0, 1.45 * (1 - mus.mix), 0.30);
                phones.rotation.z = 0.34 * (1 - mus.mix);
                phones.scale.setScalar(0.76 + 0.24 * mus.mix);
                setOpacity(musicMats, mus.mix);
                var beat = 0.80 + 0.20 * Math.sin(t * 3.3);
                for (var gi = 0; gi < cupGlows.length; gi++)
                    cupGlows[gi].material.opacity = 0.30 * mus.mix * beat;
            }
            updateNotes(dt, t);

            if (mus.mix > 0.01) {
                world.position.y += mus.mix * 0.075 * Math.sin(t * 3.15);
                world.rotation.z += mus.mix * 0.022 * Math.sin(t * 1.55);
            }
        }
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
        var peekLift = 0,
            tPeekLift = 0;
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
            eyeTX = Math.max(-0.3, Math.min(0.3, dx * 0.95));
            eyeTY = Math.max(-0.24, Math.min(0.24, dy * 0.62));
            tRY = Math.max(-0.34, Math.min(0.34, dx * 0.45));
            tRX = 0.04 + Math.max(-0.2, Math.min(0.2, dy * 0.3));
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
        var lastPaint = 0,
            minStep = softGL ? 1 / 15 : 1 / 30;

        function frame(now) {
            rafId = requestAnimationFrame(frame);
            if (!visible || document.hidden) return;
            if (typeof now === "number") {
                if (now - lastPaint < minStep) return;
                lastPaint = now;
            }
            var dt = Math.min(ck.getDelta(), 0.05),
                t = ck.getElapsedTime();
            if (dragging) gazeHeat = Math.max(gazeHeat, 0.8);
            gazeHeat = Math.max(0, gazeHeat - dt);
            if (spinT < 0 && gazeHeat <= 0) {
                lifeT += dt;
                if (lifeT >= gNext) {
                    lifeT = 0;
                    gNext = 3.4 + Math.random() * 4.2;
                    var roll = Math.random();
                    if (roll < 0.42) {
                        var ax = (Math.random() * 2 - 1) * 0.28,
                            ay = (Math.random() * 2 - 1) * 0.18;
                        tRY = ax;
                        tRX = 0.04 + ay;
                        eyeTX = ax * 0.6;
                        eyeTY = ay * 0.4;
                    } else if (roll < 0.68) {
                        tTZ = (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.04);
                        tRY = (Math.random() * 2 - 1) * 0.08;
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
            aura.material.opacity = 0.3 + 0.05 * Math.sin(t * 1.8) + flare * 0.22;
            if (stars) stars.rotation.y += dt * 0.012;
            arc1.rotation.z += dt * (0.45 + diskBoost * 0.35);
            arc2.rotation.z -= dt * (0.3 + diskBoost * 0.25);
            photon.rotation.z += dt * (0.12 + diskBoost * 0.2);
            photon.material.opacity = Math.min(1, 0.72 + 0.22 * Math.sin(t * 2.6) + flare * 0.3);
            peekLift += (tPeekLift - peekLift) * 0.08;
            world.position.y = Math.sin(t * 1.15) * 0.09 + Math.sin(t * 0.43) * 0.03 + talking * Math.sin(t * 8.2) * 0.024 + peekLift;
            world.position.x = Math.sin(t * 0.31) * 0.028;
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
            eL.position.x = -0.66 + eyeTX * 0.12;
            eR.position.x = 0.66 + eyeTX * 0.12;
            eL.position.y = 0.42 + eyeTY * 0.1;
            eR.position.y = eL.position.y;
            eL.position.z = 2 - 0.26 * hack.mix;
            eR.position.z = eL.position.z;
            bt -= dt;
            if (bt <= -bNext) {
                bt = 0.24;
                bNext = 2 + Math.random() * 3.2;
            }
            var blink = bt > 0 ? Math.max(0.07, Math.min(1, Math.abs(bt / 0.24 * 2 - 1))) : 1;
            squintV += ((spinT >= 0 ? 0.3 : 1) - squintV) * Math.min(1, dt * 4);
            var eyeEnv = 1 - 0.12 * Math.max(0, Math.min(1, flare));
            var nomPulse = Math.sin(Math.min(cine.nom / 0.30, 1) * Math.PI);
            var nomY = 1 - 0.46 * nomPulse;
            var nomX = 1 + 0.46 * nomPulse;
            eL.scale.x = eyeEnv * nomX;
            eR.scale.x = eyeEnv * nomX;
            eL.scale.y = blink * squintV * eyeEnv * nomY;
            eR.scale.y = blink * squintV * eyeEnv * nomY;
            var eyeHide = 1 - hack.mix;
            for (var hi = 0; hi < eyeHalos.length; hi++) {
                var hh = eyeHalos[hi];
                var pl = 0.5 + 0.5 * Math.sin(t * 1.7 + hh.phase);
                hh.halo.material.opacity = (0.04 + 0.03 * pl) * eyeHide;
                hh.halo.scale.setScalar(1.55 + 0.18 * pl);
                hh.glow.material.opacity = (0.22 + 0.06 * pl) * eyeHide;
                if (hh.spark) hh.spark.material.opacity = (0.3 + 0.2 * pl) * eyeHide;
            }
            updateCinema(dt, t);
            updateOutfits(dt, t);
            updateMusic(dt, t);
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
            lift: function(v) {
                tPeekLift = Number(v) || 0;
            },
            cinema: function(on) {
                cinemaSet(!!on);
            },
            music: function(on) {
                musicSet(!!on);
            },
            outfit: function(name) {
                name = String(name || "");
                devOn = name === "developer";
                hackOn = name === "hacker";
            },

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