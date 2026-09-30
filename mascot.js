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
                /* Light must not write depth. With depthWrite on, this ring
                 * occluded the eye glow where it crossed it and cut a hard
                 * straight seam through it. */
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

        /* The eye is a capsule, and these are its real numbers: 0.54 across,
         * 1.16 tall.  The cinema lenses are built from the same two values
         * (eye + 10% in length and width), so the glasses and the eyes can
         * never drift apart again. */
        var EYE_W = 0.54,
            EYE_H = 1.16,
            EYE_R = EYE_W / 2;

        function makeEye(x) {
            var e = new THREE.Group();
            /* The eyeball is a capsule: a cylinder with a sphere capping each
             * end. From the front it reads as a tall rounded rectangle, which
             * is the shape this mascot has always had - a plain sphere loses
             * the character. */
            e.add(new THREE.Mesh(new THREE.CylinderGeometry(EYE_R, EYE_R,
                EYE_H - 2 * EYE_R, 20), eyeMat));
            var s1 = new THREE.Mesh(new THREE.SphereGeometry(EYE_R, 20, 20), eyeMat);
            s1.position.y = EYE_H / 2 - EYE_R;
            var s2 = s1.clone();
            s2.position.y = -(EYE_H / 2 - EYE_R);
            e.add(s1);
            e.add(s2);
            /* The two glow sprites are depthTest:false on purpose. They are
             * light, not geometry, and the additive ring in front of them used
             * to clip them along a hard edge - the "light break" that showed up
             * as a straight seam across the eye glow. */
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

        /* ================================================================== *
         * Cinema props.
         *
         * While a film is playing the mascot puts on anaglyph 3D glasses and
         * holds a box of popcorn.  One kernel every four seconds arcs from
         * the box up to its mouth, below the glasses, and is swallowed -
         * eye-squash and a crumb-puff on the bite.  Everything below is
         * built once, up front, and parked out of frame - nothing is created
         * or destroyed at runtime, so the first frame of the animation can
         * never stutter.
         *
         * Both props are children of `world`, which is what carries the bob
         * and the head-turn.  The glasses therefore ride the face and the box
         * swings with the body, which is what you want from something that is
         * supposed to be *worn* and *held*.
         * ================================================================== */

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

        /* A rounded rectangle as a THREE.Shape, so the spectacle frames are
         * real frames with a hole rather than a box with a painted border. */
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

        /* The centre of the face: the eyes sit at y 0.42, z 2, and the
         * glasses float just in front of them. */
        var FACE = new THREE.Vector3(0, 0.42, 2.46);
        /* Where the glasses wait, off to the upper right, before flying in. */
        var GLASSES_PARK = new THREE.Vector3(0.34, 3.55, 5.10);

        var glasses = new THREE.Group();
        glasses.position.copy(FACE);
        glasses.visible = false;
        world.add(glasses);

        /* depthTest:false + renderOrder on the lenses and frames, on purpose:
         * the eye glow sprites are also depthTest:false, and without this the
         * lenses would sit *behind* the mascot's own eye light instead of over
         * it, which defeats the whole gag.  The temple arms keep normal depth
         * testing so they still disappear behind the head. */
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

        /* Each spectacle is the eye's own silhouette - a tall capsule - sized
         * 10% bigger than the eye in both length and width, with a slim frame
         * around it.  The old square lenses were *shorter* than the eye
         * itself, so the capsule poked out above and below the glass; a lens
         * that is the eye + 10% covers it with a margin on every side.
         *
         * The lens is a flat rounded shape rather than a box: a box has square
         * corners, and those corners always poked through the rounded frame
         * hole.  Nothing is drawn inside the glass - an earlier thin rim ring
         * hugging the lens edge read as a circle floating inside each lens. */
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

        /* ---- the popcorn box ---- */
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

        /* Without an inner shell you see straight through the open box and
         * the stripes on the far wall read as a mess. */
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
            /* The last few sit above the rim - a box that has just been
             * filled and is about to overflow, not a flat layer of balls. */
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
            /* Two lobes per kernel: the bumpy silhouette is what makes the
             * shape read as popped corn instead of as a painted ball. */
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

        /* A warm glow sitting over the pile - popcorn, not gravel.  It fades
         * with the box through popMats and flickers in updateCinema. */
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

        /* Kernels in flight.  Each has its own material so it can fade on its
         * own; a shared one would fade all of them together.  Each carries a
         * small warm sprite so the arc reads as a comet, not a pebble. */
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

        /* The bite: one crumb-puff sprite, reused by every kernel - only one
         * kernel is ever swallowed at a time. */
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

        /* ================================================================== *
         * Music props.
         *
         * The sibling state: while a song is playing and no film is, the
         * mascot wears headphones and a run of eighth notes drifts up beside
         * it.  Same contract as the cinema props above - built once, up
         * front, parked out of frame, revealed and hidden through a 0..1
         * `mix`, nothing created or destroyed at runtime - so the first
         * frame of the animation can never stutter.
         *
         * Both are children of `world`, which is what carries the bob and the
         * head-turn: the band therefore rides the skull and the notes ride
         * the body, which is what makes them read as coming *off the mascot*
         * rather than off the window.
         * ================================================================== */

        var musicMats = [];

        /* The head is the body sphere itself: radius 2.05 (see the mesh at
         * the top of this file).  The band and the cups are measured off
         * that number, the same way the cinema lenses are measured off
         * EYE_W/EYE_H, so they cannot drift apart from the skull. */
        var HEAD_R = 2.05;

        var phones = new THREE.Group();
        phones.visible = false;
        world.add(phones);

        /* The cups have to be *readable*: this mascot is nearly black, so a
         * dark cup on a dark head is invisible.  Nothing in this scene is
         * lit - the eyes, the glasses' frames and the popcorn are all plain
         * MeshBasicMaterial with a bright colour - so the rim is the same
         * trick as the eyes: a bright ring, plus a soft additive sprite over
         * the cup so it glows instead of just being outlined. */
        var bandMat = mkMat(musicMats, new THREE.MeshBasicMaterial({
            color: 0x4d5b86
        }), 1.0);
        var cupMat = mkMat(musicMats, new THREE.MeshBasicMaterial({
            color: 0x2b3350
        }), 1.0);
        var rimMat = mkMat(musicMats, new THREE.MeshBasicMaterial({
            color: C.ring
        }), 1.0);

        /* The band is a half torus in the XY plane: with an arc of PI it
         * starts at +X, sweeps over the top and ends at -X, which is exactly
         * the shape of a headband and needs no rotation to sit right.  Its
         * radius clears the skull by 0.19 at every point on the arc. */
        phones.add(new THREE.Mesh(
            new THREE.TorusGeometry(HEAD_R + 0.19, 0.105, 10, 64, Math.PI),
            bandMat));

        /* The band sits in the head's own centre plane (the eyes are at
         * z 2, so z 0.30 is well behind them), where a real pair of cups
         * would be. */
        phones.position.set(0, 0, 0.30);

        var cupGlows = [];
        [-1, 1].forEach(function(sgn) {
            var cup = new THREE.Mesh(
                new THREE.CylinderGeometry(0.60, 0.54, 0.30, 24), cupMat);
            /* A cylinder's axis is Y; a quarter turn about Z points it along
             * X, which is what a cup on the side of a head needs. */
            cup.rotation.z = Math.PI / 2;
            /* The cup is deliberately sunk 0.1 into the skull: a cup that
             * only touches the surface reads as floating next to the head. */
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
            /* depthTest stays on here, unlike the eye glows: those are
             * allowed to shine through the face, but a cup light that shone
             * through the back of the skull during a spin would give the
             * gag away. */
            cglow.position.set(sgn * (HEAD_R + 0.30), -0.02, 0);
            cglow.scale.setScalar(0.95);
            mkMat(musicMats, cglow.material, 0.30);
            phones.add(cglow);
            cupGlows.push(cglow);
        });

        /* ---- the notes ---- */

        /* Five eighth notes (a head, a stem, a flag) on staggered phases.
         * Their whole cycle is driven off the render clock `t` rather than a
         * per-note timer, which is what keeps them spread out without any
         * state to reset, and it means the lane needs no allocation at all
         * once it is built. */
        var NOTE_N = 5;
        var noteHeadGeo = new THREE.SphereGeometry(0.17, 16, 12);
        var noteStemGeo = new THREE.BoxGeometry(0.055, 0.80, 0.055);
        var noteFlagGeo = new THREE.BoxGeometry(0.22, 0.055, 0.055);
        var notes = [];
        for (var nk = 0; nk < NOTE_N; nk++) {
            var note = new THREE.Group();
            /* One material for the whole note, so the head and the stem fade
             * together; the colour alternates between the two blues the rest
             * of the mascot is already drawn in. */
            var noteMat = mkMat(musicMats, new THREE.MeshBasicMaterial({
                color: nk % 2 ? C.ring : C.eye,
                depthWrite: false
            }), 1.0);
            var nhead = new THREE.Mesh(noteHeadGeo, noteMat);
            /* A note head is an oval, not a ball. */
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
                /* The lane: x, z and sway keep the five apart so they read
                 * as a stream and never merge into one blob.  The nearest
                 * lane starts outside the skull's own silhouette (x 2.05),
                 * so no note is ever drawn on top of the face. */
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

        /* ================================================================== *
         * Mode outfits.
         *
         * Developer mode hands the mascot a laptop it types on; Hacker mode
         * drops the anonymous mask over its face.  Both follow the cinema
         * contract - built once, parked out of frame, one 0..1 `mix` each - so
         * the first frame of either animation can never stutter.
         *
         * `driveProp` re-targets mid-flight instead of restarting, which is
         * what lets a film steal the face: the cinema props go up, the outfit
         * folds itself away, and it walks back on its own when the film ends
         * because its target never changed.
         * ================================================================== */

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

        /* The mask keeps normal depth testing.  The cinema glasses can afford
         * depthTest:false because they are small; the mask is a plate the size
         * of the face, and with depth testing off it painted over the front of
         * the accretion ring and cut a clean white wedge out of it. */
        function hackMat(m, base) {
            mkMat(hackMats, m, base === undefined ? 1 : base);
            return m;
        }

        /* A canvas rounded rectangle path - `roundRect` is not in the
         * 2021 three.js' host Chromium on every build, and this is two
         * lines either way. */
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

        /* ---------------------------------------------------------------- *
         * Developer: the laptop.
         * ---------------------------------------------------------------- */

        var LAP_W = 1.94,
            LAP_D = 1.28,
            LAP_H = 1.26;
        /* Closed lies flat over the deck; open leans just past vertical. */
        var LAP_CLOSED = Math.PI / 2,
            LAP_OPEN = -0.17;
        /* The machine belongs to the mascot, not to the viewer: the screen
         * faces the model (so the model is the one coding) and the camera
         * sees the lid's back.  The yaw is the direction from the laptop to
         * the sphere's centre - atan2(LAP_HOME.x, LAP_HOME.z) past half a
         * turn - so it aims at the model rather than merely away. */
        var LAP_YAW = Math.PI + Math.atan2(1.46, 2.24);
        var LAP_HOME = new THREE.Vector3(1.46, -1.78, 2.24);

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
                    /* the violet backlight bleeding out from under the keys */
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

        /* The screen is a live canvas: a real editor-looking window with
         * syntax colouring, a highlighted current line, a caret and a slow
         * scroll.  A shader could do it, but this reads as *code*. */
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

        /* Hands of light over the keys.  The mascot has no arms, so they are
         * little glowing gauntlets that hover and strike - which is what a
         * being made of light typing would look like.  They are additive, not
         * solid: as opaque blobs they read as two pink lumps of plastic
         * dropped on the keyboard. */
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
            /* Three fingers, splayed and angled down at the deck. */
            for (var f = -1; f <= 1; f++) {
                var fin = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), mat);
                fin.position.set(f * 0.072, -0.028, 0.115);
                fin.scale.set(0.75, 0.75, 2.4);
                fin.rotation.x = 0.45;
                h.add(fin);
            }
            /* A soft wrist glow instead of an arm. */
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

        /* Keys lighting up under the fingers. */
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

        /* Glyphs that lift off the screen and sink into the mascot's eyes -
         * the code is going *in*. */
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
            /* Flies in from below-left, spinning, then settles. */
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

            /* The lid unfolds only once the machine has landed. */
            var lo = Math.min(Math.max((e - 0.42) / 0.58, 0), 1);
            var le = easeOutCubic(lo);
            lid.rotation.x = LAP_CLOSED + (LAP_OPEN - LAP_CLOSED) * le;
            lapScreenMat.opacity = e * (0.30 + 0.70 * le);
            lapGlow.material.opacity = 0.30 * e * le;

            var booted = lo > 0.55;
            if (booted) drawCode(t);

            /* Typing. */
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

            /* The code stream. */
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

            /* Reading the code: the whole head tips down-right over the keys
             * and the eyes dart across the lines. */
            if (mix > 0.55) {
                var w = (mix - 0.55) / 0.45;
                tRX = 0.04 + 0.27 * w;
                tRY = 0.20 * w + 0.03 * Math.sin(t * 0.41);
                var k2 = Math.min(1, dt * 2.4 * w);
                eyeTX += (0.24 + 0.06 * Math.sin(t * 6.9) - eyeTX) * k2;
                eyeTY += (0.28 + 0.04 * Math.sin(t * 8.7) - eyeTY) * k2;
            }
        }

        /* ---------------------------------------------------------------- *
         * Hacker: the anonymous mask.
         * ---------------------------------------------------------------- */

        /* It sweeps in from the upper left, assembling out of shards.  Parking
         * it far forward made it arrive *bigger* than it lands - perspective
         * alone was worth 1.5x at z +5.6, so the mask read as a giant ghost
         * for most of the flight. */
        var MASK_PARK = new THREE.Vector3(-2.05, 1.95, 1.35);
        /* Sized to sit *inside* the head, not over it.
         *
         * At 1.10 the plate was as tall as the whole sphere (radius 2.05, so a
         * 4.1 diameter) and covered it edge to edge: photographed at rest, the
         * mascot disappeared behind a flat white slab with the accretion ring
         * cutting across it - "the hacker mask is not good at all".  A mask is
         * something the head *wears*: the black silhouette has to show around
         * it, and the eye holes have to land on the eyes.  0.84 of the old
         * size leaves a rim of head all the way round. */
        var MASK_SCALE = 0.84;
        var mask = new THREE.Group();
        mask.position.copy(FACE);
        mask.visible = false;
        world.add(mask);

        var maskFaceMat = hackMat(new THREE.MeshBasicMaterial({
            /* Not paper white.  A flat #f3f6fc plate over a black sphere is the
             * brightest thing on the desktop and reads as a sticker; a cooler,
             * slightly dimmed plate lets the mascot's own glow sit on top of
             * it instead of being hidden behind it. */
            color: 0xe4ebf7,
            transparent: true,
            opacity: 0.96
        }), 1.0);
        maskFaceMat.renderOrder = 30;
        var maskSideMat = hackMat(new THREE.MeshBasicMaterial({
            color: 0xa8b2c9
        }), 1.0);
        maskSideMat.renderOrder = 30;
        var maskDarkMat = hackMat(new THREE.MeshBasicMaterial({
            color: 0x0a0e18
        }), 0.95);
        maskDarkMat.renderOrder = 31;
        /* The smile ridge: a hair brighter than the plate, so the mouth
         * reads as a moulded ridge rather than a drawn line. */
        var maskRidgeMat = hackMat(new THREE.MeshBasicMaterial({
            color: 0xffffff
        }), 1.0);
        maskRidgeMat.renderOrder = 31;
        var maskNoseMat = hackMat(new THREE.MeshBasicMaterial({
            color: 0xffffff,
            vertexColors: true
        }), 0.9);
        maskNoseMat.renderOrder = 31;
        /* Blush is airbrushed on the real mask, not a disc with an edge -
         * a soft radial sprite does that for free. */
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

        /* ---- the mask, to a measured specification ---------------------- *
         *
         * The classic Guy Fawkes / Anonymous mask, rebuilt from the
         * reference photograph.  Every landmark below was measured off
         * the photo and converted to mask units - x = 0 on the centre
         * line, y = 0 at the eye line, the plate spanning x ±1.11 and
         * y -1.44..+1.38 before MASK_SCALE:
         *
         *   plate      widest ±1.10 at y +0.38 (cheekbones), broad domed
         *              forehead, tapering to a rounded chin at (0,-1.44)
         *   brows      heavy black arches: outer tip (±0.88, 0.83), peak
         *              y 0.94, inner tails sweeping down toward the nose
         *              bridge to (±0.12, 0.60) - the mask's signature
         *   eyes       almond holes, centre (±0.49, 0.40), 0.46 x 0.17,
         *              outer tip a touch higher than the inner; the
         *              mascot's green glow lives inside them
         *   blush      soft pink airbrushed discs on the cheekbones at
         *              (±0.82, 0.02)
         *   moustache  handlebar: two wings split by a thin centre seam
         *              under the nose (y -0.30), sweeping out and up to
         *              swept-up tips at (±0.75, -0.23)
         *   smile      thin shadow line with a raised white ridge under
         *              it, x ±0.30, dipping to y -0.63
         *   goatee     strip from (±0.13, -0.78) tapering to a rounded
         *              tip at the chin (±0.035, -1.42)
         *   nose       a real 3D loft: bridge y +0.52..+0.28 (half-width
         *              0.03..0.07), ball widest 0.23 at y -0.18, nostril
         *              wings reaching 0.30 at y -0.26, base tucking under
         *              at y -0.33; nostril slits conform to its surface
         * ----------------------------------------------------------------- */

        /* The mascot's face is a sphere, so a flat plate reads as a sticker
         * floating in front of it.  bendMask() pulls every vertex of a
         * piece back along z by a shallow dome term - strong sideways,
         * gentle vertically, centred on the eye line - and every piece of
         * the mask gets the same bend, so plate, holes and features keep
         * their relative depths while the whole mask wraps the face.
         * domeZ() is the same term for the few features that are sprites
         * rather than geometry.
         *
         * The sideways term is tuned against the eye capsules: they sit
         * just 0.05 in front of the sphere, so a deeper dome would pull
         * the plate's flanks *behind* the eyes' outer edges and the
         * capsules would poke through (the eyes also slide back with the
         * mask - see the eye update - so this is belt and braces). */
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

        /* The extruded caps are triangulated from the outline alone, so the
         * interior is a handful of big flat chords.  Bending those only warps
         * the rim: the middle of the plate stays a flat chord and the mascot's
         * own face pokes through it (the first curved version did exactly
         * that - a dark blob over the mouth).  Split every triangle into four,
         * twice, so the cap has enough interior vertices to actually follow
         * the dome.  The two material groups (caps / sides) are carried over
         * so the plate keeps its edge colour. */
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

        /* The silhouette: domed forehead, cheekbones widest at eye height,
         * jaw tapering into a rounded chin. */
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
            bendMask(subdivide(new THREE.ExtrudeGeometry(faceShape, EXTRUDE), 2)),
            [maskFaceMat, maskSideMat]);
        faceMesh.position.z = -0.036;
        faceMesh.renderOrder = 30;
        mask.add(faceMesh);

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

        /* The brows are the mask's whole expression: heavy arches, thick
         * over the outer eye, tapering to pointed tails that sweep down
         * toward the nose bridge.  Nothing else on the mask says "Guy
         * Fawkes" as loudly. */
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
        });

        /* The eye holes: wide almonds, the outer tip a touch higher than
         * the inner - the slanted, hollow look of the reference.  Dark,
         * with the mascot's green glow inside (below). */
        [-1, 1].forEach(function(sgn) {
            var s = new THREE.Shape();
            s.moveTo(sgn * 0.72, 0.415);
            s.quadraticCurveTo(sgn * 0.50, 0.50, sgn * 0.25, 0.375);
            s.quadraticCurveTo(sgn * 0.50, 0.30, sgn * 0.72, 0.415);
            var m = flatMesh(s, maskDarkMat, 31, 0.02);
            m.position.z = 0.045;
            mask.add(m);
        });

        /* Blush: soft pink discs on the cheekbones, sprite-soft like the
         * airbrushed paint on a real mask. */
        [-1, 1].forEach(function(sgn) {
            var b = new THREE.Sprite(new THREE.SpriteMaterial({
                map: maskBlushTex,
                transparent: true,
                opacity: 0,
                depthWrite: false
            }));
            b.position.set(sgn * 0.82, 0.0, 0.055 + domeZ(0.82, 0.0));
            b.scale.setScalar(0.45);
            b.renderOrder = 31;
            mask.add(b);
            mkMat(hackMats, b.material, 0.5);
        });

        /* The moustache: a centre wedge hanging from under the nose, two
         * wings that sweep out and up into rolled tips, and a deep notch
         * between wedge and wing - the white "fang" of the reference.
         * Wedge, wings and the bottom band are one connected shape. */
        [-1, 1].forEach(function(sgn) {
            var s = new THREE.Shape();
            s.moveTo(sgn * 0.005, -0.295);
            s.bezierCurveTo(sgn * 0.06, -0.305, sgn * 0.10, -0.315,
                sgn * 0.115, -0.325);                                   /* centre wedge, top edge */
            s.bezierCurveTo(sgn * 0.16, -0.36, sgn * 0.21, -0.415,
                sgn * 0.26, -0.445);                                    /* down into the notch */
            s.bezierCurveTo(sgn * 0.35, -0.425, sgn * 0.40, -0.41,
                sgn * 0.44, -0.40);                                     /* up out of the notch */
            s.bezierCurveTo(sgn * 0.52, -0.385, sgn * 0.585, -0.36,
                sgn * 0.63, -0.335);                                    /* wing, top edge */
            s.bezierCurveTo(sgn * 0.68, -0.305, sgn * 0.73, -0.265,
                sgn * 0.755, -0.24);                                    /* rise into the tip */
            s.bezierCurveTo(sgn * 0.79, -0.215, sgn * 0.815, -0.255,
                sgn * 0.80, -0.29);                                     /* the rolled cap */
            s.bezierCurveTo(sgn * 0.775, -0.335, sgn * 0.74, -0.36,
                sgn * 0.70, -0.39);                                     /* outer edge, coming down */
            s.bezierCurveTo(sgn * 0.64, -0.44, sgn * 0.57, -0.49,
                sgn * 0.48, -0.53);                                     /* wing, bottom edge */
            s.bezierCurveTo(sgn * 0.40, -0.565, sgn * 0.30, -0.585,
                sgn * 0.22, -0.60);                                     /* bottom band */
            s.bezierCurveTo(sgn * 0.19, -0.605, sgn * 0.165, -0.595,
                sgn * 0.16, -0.585);                                    /* centre tip */
            s.bezierCurveTo(sgn * 0.15, -0.50, sgn * 0.13, -0.40,
                sgn * 0.005, -0.295);                                   /* centre wedge, left edge */
            var m = flatMesh(s, maskDarkMat, 31, 0.02);
            m.position.z = 0.046;
            mask.add(m);
        });

        /* The smile: a thin shadow line with the raised white ridge just
         * under it - the moulded mouth of the reference mask. */
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

        /* The goatee: a long strip from just under the smile, tapering to
         * a rounded tip that reaches the very bottom of the chin. */
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
        })();

        /* ---- the nose ---------------------------------------------------- *
         *
         * A real 3D loft, not a painted ridge: a half-ellipse cross-section
         * swept down the nose's stations - narrow at the bridge, swelling
         * into the ball, flaring at the nostril wings, tucking under where
         * the moustache meets it.  The mask materials are unlit, so the
         * reference photo's lighting is baked into vertex colours instead:
         * bright down the ridge and over the front of the ball, falling
         * away at the rims and under the tip.
         * ----------------------------------------------------------------- */
        (function() {
            var STATIONS = [
                /* y, half-width, protrusion beyond the plate */
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
            var SEG = 12;              /* cross-section samples */
            var BASE_Z = 0.050;        /* sits just proud of the plate face */
            var LAST = STATIONS.length - 1;

            /* The loft's front surface height at (x, y), in flat space.
             * The nostril slits use it to conform to the nose's surface
             * instead of floating over it. */
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
            var bright = new THREE.Color(0xffffff);
            var shade = new THREE.Color(0xb9c3da);
            var tint = new THREE.Color();
            for (var si = 0; si <= LAST; si++) {
                var sy = STATIONS[si][0];
                var sw = STATIONS[si][1];
                var sh = STATIONS[si][2];
                for (var k = 0; k <= SEG; k++) {
                    var th = (k / SEG - 0.5) * Math.PI;
                    positions.push(sw * Math.sin(th), sy,
                                   BASE_Z + sh * Math.cos(th));
                    var front = Math.cos(th);           /* 1 front .. 0 rim */
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

            /* The nostril slits: dark crescents wrapped around the wings'
             * undersides, pulled onto the loft's surface so they read as
             * moulded shadows rather than decals. */
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

            /* The cast shadow under the tip - the reference's strongest
             * depth cue - as a soft dark sprite tucked behind the base. */
            var shadeTex = glowTexture("rgba(56,64,90,.85)",
                "rgba(56,64,90,.32)");
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

        /* Green light in the eye holes - the mascot is still in there. */
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
            g.scale.setScalar(0.46);
            g.renderOrder = 33;
            mask.add(g);
            hackEyes.push(g);
        });

        /* A green rim light behind the plate. */
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
        mkMat(hackMats, maskRim.material, 0.30);

        /* One green scan band that sweeps the mask the moment it lands. */
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

        /* Shards of light that converge onto the mask as it flies in. */
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

        var hackScanT = -1,
            hackLanded = false;

        function updateHack(dt, t, mix) {
            var vis = mix > 0.004;
            mask.visible = vis;
            if (!vis) {
                hackLanded = false;
                return;
            }
            var e = mix;
            mask.position.copy(FACE).addScaledVector(MASK_PARK, 1 - e);
            /* Digital tearing while it is still travelling. */
            var gl = Math.max(0, 1 - e / 0.62);
            mask.position.x += gl * (Math.sin(t * 53.1) + Math.sin(t * 21.7)) * 0.075;
            mask.position.y += gl * Math.sin(t * 37.3) * 0.035;
            mask.rotation.set(
                -1.02 * (1 - e) + gl * 0.06 * Math.sin(t * 33.0),
                0.78 * (1 - e) + gl * 0.05 * Math.sin(t * 19.0),
                -0.60 * (1 - e) + gl * 0.05 * Math.sin(t * 27.0));
            /* Landing: a green flare, then one scan. */
            var land = Math.exp(-Math.pow((e - 0.985) / 0.028, 2));
            var grow = easeOutCubic(Math.min(e / 0.88, 1));
            mask.scale.setScalar(MASK_SCALE * (0.30 + 0.70 * grow) * (1 + 0.07 * land));
            setOpacity(hackMats, Math.min(1, e * 1.25));

            if (!hackLanded && e > 0.93) {
                hackLanded = true;
                hackScanT = 0;
            }
            if (e < 0.35) hackLanded = false;

            maskRim.material.opacity = 0.30 * e + 0.55 * land;

            var flick = 0.72 + 0.16 * Math.sin(t * 7.3) + 0.12 * Math.sin(t * 23.1);
            for (var i = 0; i < hackEyes.length; i++) {
                hackEyes[i].material.opacity =
                    Math.min(1, e * 1.15) * (0.55 + 0.45 * flick) * 0.95;
                hackEyes[i].scale.setScalar(0.42 + 0.07 * flick);
            }

            if (hackScanT >= 0) {
                hackScanT += dt;
                var sp = hackScanT / 0.62;
                scanBand.visible = sp < 1;
                if (sp < 1) {
                    scanBand.position.y = 1.65 - 3.30 * easeOutCubic(sp);
                    scanBand.material.opacity = Math.sin(sp * Math.PI) * 0.85 * e;
                    scanBand.scale.x = 0.55 + 0.45 * Math.sin(sp * Math.PI);
                }
            } else {
                scanBand.visible = false;
            }

            /* Shards converge in step with the fly-in and burn off. */
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

            /* Behind the mask the mascot stares straight out. */
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
            /* A film wins the face: while the cinema glasses are up both
             * outfits fold themselves away and come back on their own when
             * the film ends, because their targets never changed. */
            var sup = cine.mix > 0.45;
            var devMix = driveProp(dev, devOn && !sup, dt, 1.20, 0.62);
            var hackMix = driveProp(hack, hackOn && !sup, dt, 1.05, 0.50);
            updateDev(dt, t, devMix);
            updateHack(dt, t, hackMix);
        }

        var cine = {
            want: 0,        /* 0 = off, 1 = on */
            mix: 0,         /* 0..1, how far the glasses have flown in */
            from: 0,
            dur: 1,
            t: 0,
            pop: 0,         /* 0..1, how far the box has risen */
            popFrom: 0,
            popDur: 1,
            popT: 0,
            spawn: 0,       /* countdown to the next kernel */
            nom: 0          /* eye-squash timer, set when a kernel is eaten */
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

        /* The music state: the desired flag and one 0..1 `mix`, driven by the
         * same `driveProp` the outfits use.  That is deliberate - it gives
         * the headphones the outfit contract rather than the film one: the
         * target can change mid-flight and the mix simply walks back the way
         * it came, which is what happens when a film starts on top of a song
         * and then ends. */
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
                /* The mouth sits *below* the glasses - the lens bottoms are
                 * at y -0.218, so the kernel must arrive under them or it
                 * reads as a bite into the glass. */
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
                boxKick = 0.34;     /* the box gives a little recoil */
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
                /* The last stretch is the bite: the kernel shrinks into the
                 * mouth instead of sailing through the face and fading. */
                var eat = p < 0.78 ? 0 : (p - 0.78) / 0.22;
                f.material.opacity = Math.max(0, fade * (1 - 0.75 * eat)) * cine.mix;
                d.glow.material.opacity = Math.max(0, fade * (1 - eat)) * cine.mix * 0.5;
                f.scale.setScalar((0.72 + 0.5 * Math.sin(p * Math.PI)) *
                    (1 - 0.82 * eat * eat) * cine.mix);
                if (p >= 1) {
                    f.visible = false;
                    cine.nom = 0.30;        /* eaten: squash the eyes */
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
            /* `e` always runs 0 -> 1, and the lerp below carries `mix` from
             * wherever it was to the target.  Getting this the wrong way round
             * (1 - easeInCubic) made the glasses vanish on the first frame of
             * the exit, fly back in, and then snap out at the end. */
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
                /* The arrival accent: a short glint on the glass as they land
                 * - `cine.t` crosses the settled point ~0.87 s into the
                 * 1.05 s flight, and the gaussian makes that a ~0.2 s pulse
                 * rather than a state.  (The thin rim rings that used to
                 * carry this read as circles inside the glass.) */
                var glint = Math.exp(-Math.pow((cine.t - 0.87) / 0.085, 2));
                var lensOp = Math.min(0.92, 0.46 * cine.mix + 0.40 * glint);
                lensRedMat.opacity = lensOp;
                lensCyanMat.opacity = lensOp;
            }

            var pvis = cine.pop > 0.004;
            popcorn.visible = pvis;
            if (pvis) {
                /* `boxKick` is the recoil from the last launch: a short
                 * one-sided bounce that makes the box feel held. */
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
                    cine.spawn = 4.0;   /* one kernel every four seconds */
                    spawnKernel();
                }
            }
            updateKernels(dt);

            /* While the film is on, the mascot watches it instead of the
             * pointer: the gaze is pulled forward and drifts slowly. */
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
                /* 0..1 up the lane, and back to 0 when it reaches the top:
                 * that wrap *is* the loop, and the stagger lives in
                 * `phase`, so there is no per-note timer to keep. */
                var p = (t / d.dur + d.phase) % 1;
                /* Fade in over the first fifth, hold, fade out over the last
                 * quarter - a note that pops in at full opacity reads as a
                 * glitch rather than as a note being sung. */
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
            /* A film wins, exactly as it does over the outfits: the
             * headphones come off while the glasses are up and come back on
             * their own when the film ends, because `musicOn` never
             * changed.  Same threshold as `updateOutfits` uses, so the two
             * hand the face over at the same moment instead of fighting. */
            var sup = cine.mix > 0.45;
            driveProp(mus, musicOn && !sup, dt, 0.85, 0.55);

            var vis = mus.mix > 0.004;
            phones.visible = vis;
            if (vis) {
                /* The band drops onto the head instead of flying in from the
                 * side: it is *worn*, so the one motion that reads correctly
                 * is the one you make putting it on. */
                phones.position.set(0, 1.45 * (1 - mus.mix), 0.30);
                phones.rotation.z = 0.34 * (1 - mus.mix);
                phones.scale.setScalar(0.76 + 0.24 * mus.mix);
                setOpacity(musicMats, mus.mix);
                /* The cup lights breathe with the beat the notes imply.  Set
                 * after setOpacity, which is the only reason this is not
                 * just another entry in musicMats. */
                var beat = 0.80 + 0.20 * Math.sin(t * 3.3);
                for (var gi = 0; gi < cupGlows.length; gi++)
                    cupGlows[gi].material.opacity = 0.30 * mus.mix * beat;
            }
            /* The notes are gated on the mix inside updateNotes, so they can
             * be driven every frame - it costs nothing when they are off. */
            updateNotes(dt, t);

            /* The idle: a small bounce and a slow sway of the head while the
             * song is on, subtle enough to read as listening rather than as
             * a second animation.  Applied after the loop has set the body's
             * own bob and tilt, which is what makes it additive. */
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
        /* The pet is a mascot, not a game.
         *
         * The loop below is a plain requestAnimationFrame chain with no rate
         * limit, which is fine when the scene is drawn on the GPU - the
         * display's refresh caps it.  On a software rasteriser (a machine
         * without a working GPU path, or UAI_SOFTWARE_GL=1) there is no
         * vblank to wait for and the same chain runs as fast as the CPU
         * allows: the scene was measured re-rasterising at over 300% CPU,
         * which starves the shell badly enough that menus stop opening.
         *
         * Half the display's rate is visually indistinguishable on a 260px
         * mascot and halves that cost.  The clock is left alone on the
         * skipped frames, so the animation still advances by real elapsed
         * time rather than slowing down. */
        var lastPaint = 0,
            minStep = 1 / 30;

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
            /* Behind the mask the eyes slide back out of harm's way: the
             * dome-bent plate is thinner than the eye capsules are deep,
             * and without this the capsules' outer edges poke through the
             * plate.  They slide forward again as the mask leaves. */
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
            /* Squash and stretch while a kernel is being eaten: `cine.nom`
             * runs 0.30 -> 0, and sin() of its half-cycle is a clean pulse. */
            var nomPulse = Math.sin(Math.min(cine.nom / 0.30, 1) * Math.PI);
            var nomY = 1 - 0.46 * nomPulse;
            var nomX = 1 + 0.46 * nomPulse;
            eL.scale.x = eyeEnv * nomX;
            eR.scale.x = eyeEnv * nomX;
            eL.scale.y = blink * squintV * eyeEnv * nomY;
            eR.scale.y = blink * squintV * eyeEnv * nomY;
            /* The eye glows are depthTest:false light, so they render over
             * whatever is in front of them.  Behind the mask that is a
             * leak: the soft cyan discs used to bleed straight through the
             * plate and wash out the whole face.  They fade out with the
             * mask instead - inside it the green mask eyes do the glowing. */
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
            /* The sibling state: headphones and notes while a song plays.
             * A film outranks it, so both can be set and the mascot resolves
             * it on its own. */
            music: function(on) {
                musicSet(!!on);
            },
            /* The desktop mode the mascot is dressed for: "developer" gets the
             * laptop, "hacker" the mask, anything else takes both off. */
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