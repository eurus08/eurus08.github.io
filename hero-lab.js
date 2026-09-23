// Home page hero: an ambient diagram inspired by HPC interconnects, not a
// literal legend of research areas. Nodes sit on a torus-style mesh (the
// wraparound grid topology used in real HPC networks) and flicker with local
// "computation"; every few seconds a synchronisation wave ripples outward
// from one node across the network, echoing a broadcast/reduce step in a
// parallel algorithm. Click/tap the canvas to trigger a ripple yourself.
(function () {
    var root = document.getElementById('hero-lab');
    if (!root) return;
    var canvas = root.querySelector('canvas');
    var ctx = canvas.getContext('2d');

    var W = 340, H = 290;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    var rnd = mulberry32(11);

    // ---- build a small torus mesh: a grid with wraparound edges --------
    var COLS = 5, ROWS = 4, PAD_X = 32, PAD_Y = 28;
    var cellW = (W - PAD_X * 2) / (COLS - 1), cellH = (H - PAD_Y * 2) / (ROWS - 1);
    var nodes = [];
    for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
            nodes.push({
                x: PAD_X + c * cellW + (rnd() - 0.5) * 10,
                y: PAD_Y + r * cellH + (rnd() - 0.5) * 10,
                phase: rnd() * 6.28,
                r: r, c: c
            });
        }
    }
    function at(c, r) { return nodes[r * COLS + c]; }

    var meshEdges = [], wrapEdges = [];
    for (var rr = 0; rr < ROWS; rr++) {
        for (var cc = 0; cc < COLS; cc++) {
            if (cc < COLS - 1) meshEdges.push([at(cc, rr), at(cc + 1, rr)]);
            if (rr < ROWS - 1) meshEdges.push([at(cc, rr), at(cc, rr + 1)]);
        }
    }
    for (rr = 0; rr < ROWS; rr++) wrapEdges.push([at(COLS - 1, rr), at(0, rr)]);
    for (cc = 0; cc < COLS; cc++) wrapEdges.push([at(cc, ROWS - 1), at(cc, 0)]);

    // ---- synchronisation waves: a ripple of "who has heard yet" --------
    var waves = [];
    var WAVE_SPEED = 150;       // px/s
    var WAVE_BAND = 34;         // px, width of the lit wavefront
    var maxDist = Math.hypot(W, H);
    var waveLife = maxDist / WAVE_SPEED + 0.4;

    function spawnWave(fromNode) {
        if (waves.length >= 3) waves.shift();
        waves.push({ x: fromNode.x, y: fromNode.y, t0: clock });
    }

    // ---- theme-aware colours -------------------------------------------
    function themeVar(name, fallback) {
        var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }

    // ---- drawing ----------------------------------------------------------
    function fit() {
        var dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawEdge(a, b, alpha, width, color) {
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = width;
        ctx.stroke(); ctx.globalAlpha = 1;
    }

    function render() {
        ctx.clearRect(0, 0, W, H);
        var rule = themeVar('--rule', '#dcdfe3');
        var ink = themeVar('--ink', '#212121');
        var accent = themeVar('--accent', '#2f6690');

        // wave intensity felt by a node right now
        function waveGlow(n) {
            var g = 0;
            waves.forEach(function (w) {
                var age = clock - w.t0;
                if (age < 0 || age > waveLife) return;
                var radius = age * WAVE_SPEED;
                var d = Math.hypot(n.x - w.x, n.y - w.y);
                var band = 1 - Math.min(1, Math.abs(d - radius) / WAVE_BAND);
                var fade = 1 - age / waveLife;
                g = Math.max(g, Math.max(0, band) * fade);
            });
            return g;
        }
        function edgeGlow(a, b) {
            var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            return waveGlow({ x: mx, y: my });
        }

        wrapEdges.forEach(function (e) {
            var g = edgeGlow(e[0], e[1]);
            drawEdge(e[0], e[1], 0.10 + g * 0.5, 1, g > 0.15 ? accent : rule);
        });
        meshEdges.forEach(function (e) {
            var g = edgeGlow(e[0], e[1]);
            drawEdge(e[0], e[1], 0.4 + g * 0.6, 1 + g * 1.4, g > 0.15 ? accent : rule);
        });

        nodes.forEach(function (n) {
            var pulse = reduced ? 0 : Math.sin(clock * 1.6 + n.phase) * 0.5 + 0.5;
            var g = waveGlow(n);
            var lit = Math.max(g, pulse * 0.22);
            var rad = 3.2 + lit * 3.4;
            ctx.beginPath(); ctx.arc(n.x, n.y, rad, 0, 6.2832);
            ctx.fillStyle = lit > 0.12 ? accent : themeVar('--surface', '#fff');
            ctx.globalAlpha = lit > 0.12 ? 0.55 + g * 0.45 : 1;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.lineWidth = 1.3;
            ctx.strokeStyle = lit > 0.35 ? accent : ink;
            ctx.stroke();
        });
    }

    // ---- clock / loop ------------------------------------------------------
    var clock = 0, lastT = null, nextAuto = 2.2;
    function tick(now) {
        var dt = lastT === null ? 0 : Math.min(0.1, (now - lastT) / 1000);
        lastT = now; clock += dt;
        waves = waves.filter(function (w) { return clock - w.t0 < waveLife; });
        if (clock > nextAuto) {
            spawnWave(nodes[Math.floor(rnd() * nodes.length)]);
            nextAuto = clock + 3.4 + rnd() * 2.2;
        }
        render();
        requestAnimationFrame(tick);
    }

    function nearestNode(p) {
        var best = nodes[0], bd = Infinity;
        nodes.forEach(function (n) {
            var d = (n.x - p.x) * (n.x - p.x) + (n.y - p.y) * (n.y - p.y);
            if (d < bd) { bd = d; best = n; }
        });
        return best;
    }
    function localPos(ev) {
        var rect = canvas.getBoundingClientRect();
        return { x: (ev.clientX - rect.left) * W / rect.width, y: (ev.clientY - rect.top) * H / rect.height };
    }
    canvas.addEventListener('pointerdown', function (ev) {
        if (reduced) return;
        spawnWave(nearestNode(localPos(ev)));
    });
    canvas.addEventListener('keydown', function (ev) {
        if (reduced) return;
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); spawnWave(nodes[Math.floor(nodes.length / 2)]); }
    });

    fit();
    window.addEventListener('resize', function () { fit(); render(); });
    // The animation loop picks up new colours by itself; the static render needs a nudge.
    document.addEventListener('themechange', function () { if (reduced) render(); });
    if (reduced) {
        render();
    } else {
        spawnWave(nodes[Math.floor(nodes.length / 2)]);
        requestAnimationFrame(tick);
    }
})();
