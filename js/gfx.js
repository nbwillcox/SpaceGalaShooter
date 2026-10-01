/* Procedural art: every sprite is drawn with canvas vector calls and cached. No image files. */
(function (G) {
  'use strict';
  const U = G.U, TAU = U.TAU;
  const GFX = { spr: {} };

  function mk(w, h, fn, scale) {
    scale = scale || 2;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale);
    const x = c.getContext('2d');
    x.scale(scale, scale);
    x.translate(w / 2, h / 2);
    x.lineJoin = 'round'; x.lineCap = 'round';
    fn(x);
    return { c, w, h };
  }
  function flashOf(s) {
    const c = document.createElement('canvas');
    c.width = s.c.width; c.height = s.c.height;
    const x = c.getContext('2d');
    x.drawImage(s.c, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(255,255,255,0.85)';
    x.fillRect(0, 0, c.width, c.height);
    return { c, w: s.w, h: s.h };
  }
  function lg(x, x0, y0, x1, y1, stops) {
    const g = x.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((s) => g.addColorStop(s[0], s[1]));
    return g;
  }
  function rg(x, cx, cy, r0, r1, stops) {
    const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1);
    stops.forEach((s) => g.addColorStop(s[0], s[1]));
    return g;
  }
  function poly(x, pts) {
    x.beginPath();
    x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.closePath();
  }
  function mirror(x, fn) {
    fn(x);
    x.save(); x.scale(-1, 1); fn(x); x.restore();
  }
  GFX.mk = mk; GFX.lg = lg; GFX.rg = rg; GFX.poly = poly; GFX.mirror = mirror; GFX.flashOf = flashOf;

  /* soft additive glow sprite, cached per colour ('rgba(r,g,b,1)') */
  const glowCache = new Map();
  GFX.glow = function (color) {
    let c = glowCache.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = rg(x, 32, 32, 0, 32, [[0, 'rgba(255,255,255,0.95)'], [0.18, color], [0.55, color.replace(/[\d.]+\)$/, '0.25)')], [1, 'rgba(0,0,0,0)']]);
    x.fillRect(0, 0, 64, 64);
    glowCache.set(color, c);
    return c;
  };
  GFX.drawGlow = function (ctx, color, px, py, r, alpha) {
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.drawImage(GFX.glow(color), px - r, py - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  };

  GFX.draw = function (ctx, s, px, py, rot, sx, sy, alpha) {
    ctx.save();
    ctx.translate(px, py);
    if (rot) ctx.rotate(rot);
    if (alpha !== undefined && alpha !== 1) ctx.globalAlpha = alpha;
    if (sx !== undefined && (sx !== 1 || sy !== 1)) ctx.scale(sx, sy === undefined ? sx : sy);
    ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
    ctx.restore();
  };

  /* ================= player ship ================= */
  function drawPlayer(x) {
    x.shadowColor = 'rgba(70,225,255,0.95)'; x.shadowBlur = 9;
    mirror(x, (c) => {
      c.fillStyle = lg(c, 2, -12, 36, 30, [[0, '#d6e9ff'], [0.45, '#5d86c6'], [1, '#17285a']]);
      c.beginPath(); c.moveTo(4, -12); c.lineTo(37, 23); c.lineTo(35, 33); c.lineTo(17, 25); c.lineTo(5, 30); c.closePath(); c.fill();
    });
    x.shadowBlur = 0;
    mirror(x, (c) => {
      c.strokeStyle = '#37e6ff'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(4, -12); c.lineTo(37, 23); c.lineTo(35, 33); c.stroke();
      c.strokeStyle = '#ff4fd8'; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(30, 25); c.lineTo(34.5, 32); c.stroke();
      c.strokeStyle = 'rgba(10,20,60,0.55)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(8, 4); c.lineTo(28, 24); c.moveTo(10, 14); c.lineTo(22, 26); c.stroke();
      c.fillStyle = lg(c, 10, 0, 18, 0, [[0, '#3c4f7c'], [0.5, '#95b3de'], [1, '#2a3a63']]);
      c.fillRect(10.5, 6, 7, 26);
      c.fillStyle = '#52f0ff'; c.fillRect(11.5, 31, 5, 2.2);
    });
    x.fillStyle = lg(x, -9, 0, 9, 0, [[0, '#6e8bb8'], [0.5, '#f4f9ff'], [1, '#6e8bb8']]);
    x.beginPath(); x.moveTo(0, -39);
    x.bezierCurveTo(7, -25, 9.5, -8, 9.5, 12); x.lineTo(10.5, 31); x.lineTo(-10.5, 31); x.lineTo(-9.5, 12);
    x.bezierCurveTo(-9.5, -8, -7, -25, 0, -39); x.fill();
    x.strokeStyle = 'rgba(40,70,140,0.7)'; x.lineWidth = 1; x.stroke();
    x.fillStyle = '#ff4fd8'; x.fillRect(-1.2, 4, 2.4, 22);
    x.fillStyle = lg(x, 0, -24, 0, 2, [[0, '#e6feff'], [0.45, '#36cdf5'], [1, '#08436f']]);
    x.beginPath(); x.ellipse(0, -10, 4.6, 11, 0, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.8)';
    x.beginPath(); x.ellipse(-1.4, -14, 1.2, 4.2, 0, 0, TAU); x.fill();
  }

  function drawDrone(x) {
    x.shadowColor = 'rgba(80,255,170,0.9)'; x.shadowBlur = 8;
    mirror(x, (c) => {
      c.fillStyle = lg(c, 0, -8, 12, 8, [[0, '#a9f8d4'], [1, '#14664a']]);
      c.beginPath(); c.moveTo(3, -4); c.lineTo(13, 6); c.lineTo(10, 10); c.lineTo(2, 4); c.closePath(); c.fill();
    });
    x.shadowBlur = 0;
    x.fillStyle = rg(x, -2, -3, 1, 10, [[0, '#f2fffa'], [0.4, '#4ff0a8'], [1, '#0a4a38']]);
    x.beginPath(); x.arc(0, 0, 8, 0, TAU); x.fill();
    x.strokeStyle = '#d6fff0'; x.lineWidth = 1.2; x.stroke();
    x.fillStyle = '#052a20'; x.beginPath(); x.arc(0, -1, 2.6, 0, TAU); x.fill();
  }

  /* ================= enemies (drawn facing DOWN, +y = nose) ================= */
  function drawWasp(frame) {
    return (x) => {
      const wa = frame ? 0.55 : -0.05;
      x.shadowColor = 'rgba(255,170,40,0.9)'; x.shadowBlur = 7;
      mirror(x, (c) => {
        c.save(); c.translate(5, -2); c.rotate(wa);
        c.fillStyle = lg(c, 0, 0, 26, 0, [[0, 'rgba(210,250,255,0.85)'], [1, 'rgba(110,190,255,0.22)']]);
        c.beginPath(); c.ellipse(13, 0, 14, 6, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(210,250,255,0.9)'; c.lineWidth = 1; c.stroke();
        c.restore();
      });
      x.fillStyle = lg(x, -9, 0, 9, 0, [[0, '#c26a00'], [0.5, '#ffc43a'], [1, '#c26a00']]);
      x.beginPath(); x.ellipse(0, -10, 8, 13, 0, 0, TAU); x.fill();
      x.shadowBlur = 0;
      x.fillStyle = '#3a1800';
      for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(0, -16 + i * 6, 8, 2, 0, 0, TAU); x.fill(); }
      x.fillStyle = lg(x, -9, 0, 9, 0, [[0, '#d98200'], [0.5, '#ffe27a'], [1, '#d98200']]);
      x.beginPath(); x.ellipse(0, 5, 9, 8, 0, 0, TAU); x.fill();
      x.fillStyle = '#ffb43a';
      x.beginPath(); x.ellipse(0, 15, 7, 6, 0, 0, TAU); x.fill();
      x.fillStyle = '#ff2d4a';
      x.shadowColor = '#ff2d4a'; x.shadowBlur = 5;
      x.beginPath(); x.arc(-3.6, 16, 2.4, 0, TAU); x.arc(3.6, 16, 2.4, 0, TAU); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = '#ffd77a'; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(-2, 20); x.quadraticCurveTo(-6, 25, -9, 24); x.moveTo(2, 20); x.quadraticCurveTo(6, 25, 9, 24); x.stroke();
      x.fillStyle = '#ffeaa0';
      poly(x, [[-2.5, -22], [2.5, -22], [0, -29]]); x.fill();
    };
  }

  function drawRaider(x) {
    x.shadowColor = 'rgba(255,45,90,0.95)'; x.shadowBlur = 9;
    mirror(x, (c) => {
      c.fillStyle = lg(c, 0, -20, 26, 24, [[0, '#ff6a8e'], [0.5, '#c4153f'], [1, '#4a0a1e']]);
      c.beginPath(); c.moveTo(0, 25); c.lineTo(7, 7); c.lineTo(27, -5); c.lineTo(23, -15); c.lineTo(9, -9); c.lineTo(6, -20); c.lineTo(0, -15); c.closePath(); c.fill();
    });
    x.shadowBlur = 0;
    mirror(x, (c) => {
      c.strokeStyle = '#ffb0c4'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(0, 25); c.lineTo(7, 7); c.lineTo(27, -5); c.stroke();
      c.strokeStyle = 'rgba(40,0,15,0.6)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(8, 4); c.lineTo(20, -6); c.moveTo(7, -4); c.lineTo(16, -11); c.stroke();
      c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(24, -7, 2, 0, TAU); c.fill();
    });
    x.fillStyle = rg(x, 0, 2, 0, 15, [[0, '#ffffff'], [0.45, '#ffb04a'], [1, 'rgba(255,60,60,0)']]);
    x.beginPath(); x.ellipse(0, 2, 5, 15, 0, 0, TAU); x.fill();
  }

  function drawGuard(x) {
    x.shadowColor = 'rgba(60,230,140,0.9)'; x.shadowBlur = 8;
    mirror(x, (c) => {
      c.strokeStyle = '#2fc57a'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(14, 4); c.quadraticCurveTo(30, 8, 24, 26); c.stroke();
      c.strokeStyle = '#baffd9'; c.lineWidth = 1.4; c.stroke();
    });
    x.fillStyle = lg(x, -22, -20, 22, 22, [[0, '#7bf5b4'], [0.5, '#1f9a63'], [1, '#0a3b2b']]);
    x.beginPath(); x.ellipse(0, -2, 20, 23, 0, 0, TAU); x.fill();
    x.shadowBlur = 0;
    x.strokeStyle = '#c8ffe4'; x.lineWidth = 1.3; x.stroke();
    x.strokeStyle = 'rgba(5,40,30,0.7)'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(0, -24); x.lineTo(0, 8); x.moveTo(-17, -10); x.quadraticCurveTo(0, -2, 17, -10); x.moveTo(-14, 6); x.quadraticCurveTo(0, 12, 14, 6); x.stroke();
    x.fillStyle = rg(x, 0, 12, 0, 8, [[0, '#ffffff'], [0.4, '#ffe45a'], [1, 'rgba(255,140,0,0)']]);
    x.beginPath(); x.arc(0, 12, 8, 0, TAU); x.fill();
    x.fillStyle = '#2b1500'; x.beginPath(); x.ellipse(0, 12, 1.6, 4.2, 0, 0, TAU); x.fill();
  }

  function drawWarden(x) {
    x.shadowColor = 'rgba(170,110,255,0.95)'; x.shadowBlur = 10;
    const hex = [];
    for (let i = 0; i < 6; i++) hex.push([Math.cos(i / 6 * TAU + TAU / 12) * 29, Math.sin(i / 6 * TAU + TAU / 12) * 29]);
    poly(x, hex);
    x.fillStyle = lg(x, -28, -28, 28, 28, [[0, '#b99aff'], [0.5, '#5a35b8'], [1, '#1c1050']]);
    x.fill();
    x.shadowBlur = 0;
    x.strokeStyle = '#ffd36a'; x.lineWidth = 2.2; x.stroke();
    const inner = hex.map((p) => [p[0] * 0.62, p[1] * 0.62]);
    poly(x, inner);
    x.fillStyle = 'rgba(14,6,44,0.75)'; x.fill();
    x.strokeStyle = 'rgba(210,180,255,0.8)'; x.lineWidth = 1; x.stroke();
    x.strokeStyle = 'rgba(255,211,106,0.7)'; x.lineWidth = 1.2;
    x.beginPath();
    for (let i = 0; i < 6; i++) { x.moveTo(inner[i][0], inner[i][1]); x.lineTo(hex[i][0], hex[i][1]); }
    x.stroke();
    x.fillStyle = rg(x, 0, 0, 0, 11, [[0, '#ffffff'], [0.35, '#ff7ae8'], [1, 'rgba(160,40,255,0)']]);
    x.beginPath(); x.arc(0, 0, 11, 0, TAU); x.fill();
    x.fillStyle = '#1a0630'; x.beginPath(); x.ellipse(0, 0, 2, 6, 0, 0, TAU); x.fill();
  }

  function drawThief(x) {
    x.shadowColor = 'rgba(255,210,70,0.95)'; x.shadowBlur = 10;
    x.beginPath(); x.arc(0, 0, 27, 0, TAU); x.arc(0, -13, 22, 0, TAU, true);
    x.fillStyle = lg(x, -26, -10, 26, 26, [[0, '#fff0a0'], [0.45, '#e0a92a'], [1, '#7a4a08']]);
    x.fill('evenodd');
    x.shadowBlur = 0;
    x.strokeStyle = '#fff6c8'; x.lineWidth = 1.3; x.stroke();
    x.strokeStyle = '#1fe0c4'; x.lineWidth = 2.6;
    x.beginPath(); x.moveTo(0, 26); x.quadraticCurveTo(-4, 34, 5, 35); x.stroke();
    x.fillStyle = '#1fe0c4';
    mirror(x, (c) => { poly(c, [[20, 5], [27, 11], [22, 15]]); c.fill(); });
    x.fillStyle = rg(x, 0, 7, 0, 10, [[0, '#ffffff'], [0.4, '#3dffe0'], [1, 'rgba(0,160,150,0)']]);
    x.beginPath(); x.arc(0, 7, 10, 0, TAU); x.fill();
    x.fillStyle = '#04201c'; x.beginPath(); x.ellipse(0, 7, 1.8, 6, 0, 0, TAU); x.fill();
  }

  /* ================= bullets & pickups ================= */
  function drawBolt(x) {
    x.shadowColor = 'rgba(60,225,255,1)'; x.shadowBlur = 8;
    x.fillStyle = lg(x, 0, -14, 0, 14, [[0, '#9af3ff'], [0.5, '#ffffff'], [1, '#27c6ee']]);
    x.beginPath(); x.ellipse(0, 0, 3, 12, 0, 0, TAU); x.fill();
  }
  function drawLance(x) {
    x.shadowColor = 'rgba(120,200,255,1)'; x.shadowBlur = 10;
    x.fillStyle = lg(x, 0, -40, 0, 40, [[0, '#ffffff'], [0.35, '#b8f2ff'], [1, 'rgba(60,150,255,0)']]);
    x.beginPath(); x.moveTo(0, -40); x.lineTo(3.4, -28); x.lineTo(2.2, 40); x.lineTo(-2.2, 40); x.lineTo(-3.4, -28); x.closePath(); x.fill();
  }
  function drawDBolt(x) {
    x.shadowColor = 'rgba(80,255,170,1)'; x.shadowBlur = 6;
    x.fillStyle = lg(x, 0, -9, 0, 9, [[0, '#d9fff0'], [1, '#2fe08f']]);
    x.beginPath(); x.ellipse(0, 0, 2.4, 8, 0, 0, TAU); x.fill();
  }
  function orb(c1, c2) {
    return (x) => {
      x.fillStyle = rg(x, 0, 0, 0, 11, [[0, '#ffffff'], [0.3, c1], [0.7, c2], [1, 'rgba(0,0,0,0)']]);
      x.beginPath(); x.arc(0, 0, 11, 0, TAU); x.fill();
    };
  }
  function drawNeedle(x) {
    x.shadowColor = 'rgba(255,60,220,1)'; x.shadowBlur = 8;
    x.fillStyle = lg(x, 0, -14, 0, 14, [[0, '#ff9af0'], [0.5, '#ffffff'], [1, '#ff2db8']]);
    x.beginPath(); x.moveTo(0, 15); x.lineTo(3.6, -2); x.lineTo(0, -13); x.lineTo(-3.6, -2); x.closePath(); x.fill();
  }
  function drawBig(x) {
    x.fillStyle = rg(x, 0, 0, 0, 20, [[0, '#ffffff'], [0.25, '#ffe36a'], [0.55, 'rgba(255,120,30,0.9)'], [1, 'rgba(255,40,0,0)']]);
    x.beginPath(); x.arc(0, 0, 20, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(255,230,160,0.9)'; x.lineWidth = 1.6;
    x.beginPath(); x.arc(0, 0, 10, 0.3, 3.9); x.stroke();
  }
  const PICK = {
    W: { c1: '#ffe27a', c2: '#c98600' },
    D: { c1: '#9bffd0', c2: '#13915b' },
    S: { c1: '#a6dcff', c2: '#1a6fc2' },
    B: { c1: '#ff9db1', c2: '#b3162f' },
  };
  GFX.PICK = PICK;
  function drawPickup(kind) {
    return (x) => {
      const p = PICK[kind];
      x.shadowColor = p.c1; x.shadowBlur = 9;
      const hex = [];
      for (let i = 0; i < 6; i++) hex.push([Math.cos(i / 6 * TAU) * 16, Math.sin(i / 6 * TAU) * 16]);
      poly(x, hex);
      x.fillStyle = lg(x, -14, -14, 14, 14, [[0, p.c1], [1, p.c2]]); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = '#ffffff'; x.lineWidth = 1.6; x.stroke();
      poly(x, hex.map((q) => [q[0] * 0.72, q[1] * 0.72]));
      x.fillStyle = 'rgba(10,14,40,0.55)'; x.fill();
      x.strokeStyle = '#ffffff'; x.fillStyle = '#ffffff'; x.lineWidth = 2;
      if (kind === 'W') {
        for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(-6, 5 - i * 5); x.lineTo(0, -1 - i * 5); x.lineTo(6, 5 - i * 5); x.stroke(); }
      } else if (kind === 'D') {
        x.beginPath(); x.arc(0, 0, 4, 0, TAU); x.fill();
        x.beginPath(); x.arc(-8, 3, 2.4, 0, TAU); x.arc(8, 3, 2.4, 0, TAU); x.fill();
        x.beginPath(); x.moveTo(-4, 1); x.lineTo(-7, 3); x.moveTo(4, 1); x.lineTo(7, 3); x.stroke();
      } else if (kind === 'S') {
        x.beginPath(); x.moveTo(0, -8); x.lineTo(7, -5); x.lineTo(7, 1); x.quadraticCurveTo(7, 7, 0, 10); x.quadraticCurveTo(-7, 7, -7, 1); x.lineTo(-7, -5); x.closePath(); x.stroke();
      } else {
        x.beginPath(); x.arc(0, 2, 6, 0, TAU); x.stroke();
        x.beginPath(); x.moveTo(3, -4); x.lineTo(6, -8); x.stroke();
        x.beginPath(); x.arc(7, -9, 1.6, 0, TAU); x.fill();
      }
    };
  }

  GFX.init = function () {
    if (GFX.ready) return;
    const s = GFX.spr, f = (GFX.flash = {});
    s.player = mk(84, 92, drawPlayer);
    s.drone = mk(40, 40, drawDrone);
    s.wasp = [mk(64, 64, drawWasp(0)), mk(64, 64, drawWasp(1))];
    s.raider = [mk(64, 64, drawRaider)];
    s.guard = [mk(72, 72, drawGuard)];
    s.warden = [mk(76, 76, drawWarden)];
    s.thief = [mk(76, 76, drawThief)];
    for (const k of ['wasp', 'raider', 'guard', 'warden', 'thief']) f[k] = s[k].map(flashOf);
    s.bolt = mk(20, 36, drawBolt);
    s.lance = mk(18, 84, drawLance);
    s.dbolt = mk(14, 24, drawDBolt);
    s.eorb = mk(26, 26, orb('#ffb23a', '#ff4a1a'));
    s.eorbG = mk(26, 26, orb('#7dffb0', '#18a860'));
    s.eneedle = mk(18, 36, drawNeedle);
    s.ebig = mk(46, 46, drawBig);
    s.pick = {};
    for (const k in PICK) s.pick[k] = mk(44, 44, drawPickup(k));
    GFX.ready = true;
  };

  /* ================= backdrop & boss hulls ================= */
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* tileable (vertically and horizontally) nebula texture for a given hue */
  GFX.nebula = function (hue) {
    const W = 512, H = 1024, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#03040d'; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';
    const rnd = mulberry(hue * 977 + 13);
    for (let i = 0; i < 16; i++) {
      const cx = rnd() * W, cy = rnd() * H, r = 110 + rnd() * 190;
      const h = hue + (rnd() - 0.5) * 70, a = 0.05 + rnd() * 0.09;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const px = cx + ox * W, py = cy + oy * H;
          if (px + r < 0 || px - r > W || py + r < 0 || py - r > H) continue;
          x.fillStyle = rg(x, px, py, 0, r, [[0, U.hsl(h, 80, 55, a)], [0.5, U.hsl(h + 20, 70, 40, a * 0.55)], [1, U.hsl(h, 60, 30, 0)]]);
          x.fillRect(px - r, py - r, r * 2, r * 2);
        }
      }
    }
    return c;
  };

  /* Boss hull: def = { pts (right half, x>=0, listed top->bottom), hue, accent, seed } */
  GFX.bossHull = function (def) {
    let mx = 0, my = 0;
    def.pts.forEach((p) => { mx = Math.max(mx, Math.abs(p[0])); my = Math.max(my, Math.abs(p[1])); });
    const pad = 26, w = mx * 2 + pad * 2, h = my * 2 + pad * 2;
    const full = def.pts.concat(def.pts.slice().reverse().map((p) => [-p[0], p[1]]));
    const rnd = mulberry(def.seed || 7);
    return mk(w, h, (x) => {
      x.shadowColor = def.accent; x.shadowBlur = 16;
      poly(x, full);
      x.fillStyle = lg(x, 0, -my, 0, my, [[0, U.hsl(def.hue, 28, 30)], [0.55, U.hsl(def.hue, 32, 17)], [1, U.hsl(def.hue, 36, 9)]]);
      x.fill();
      x.shadowBlur = 0;
      x.save();
      poly(x, full); x.clip();
      x.fillStyle = rg(x, -mx * 0.3, -my * 0.5, 0, mx * 1.2, [[0, 'rgba(255,255,255,0.20)'], [1, 'rgba(255,255,255,0)']]);
      x.fillRect(-mx, -my, mx * 2, my * 2);
      x.lineWidth = 1.2;
      for (let i = 0; i < 34; i++) {
        const px = (rnd() * 2 - 1) * mx, py = (rnd() * 2 - 1) * my, len = 18 + rnd() * 50, horiz = rnd() < 0.55;
        x.strokeStyle = 'rgba(0,0,0,0.38)';
        x.beginPath(); x.moveTo(px, py); x.lineTo(horiz ? px + len : px, horiz ? py : py + len); x.stroke();
        x.strokeStyle = 'rgba(255,255,255,0.08)';
        x.beginPath(); x.moveTo(px, py + 1.4); x.lineTo(horiz ? px + len : px, horiz ? py + 1.4 : py + len + 1.4); x.stroke();
      }
      x.fillStyle = 'rgba(255,255,255,0.22)';
      for (let i = 0; i < 40; i++) { x.beginPath(); x.arc((rnd() * 2 - 1) * mx, (rnd() * 2 - 1) * my, 1.1, 0, TAU); x.fill(); }
      x.fillStyle = lg(x, -4, 0, 4, 0, [[0, 'rgba(255,255,255,0)'], [0.5, U.hsl(def.hue, 90, 65, 0.25)], [1, 'rgba(255,255,255,0)']]);
      x.fillRect(-4, -my, 8, my * 2);
      x.restore();
      poly(x, full);
      x.strokeStyle = def.accent; x.lineWidth = 2.4; x.stroke();
      poly(x, full.map((p) => [p[0] * 0.9, p[1] * 0.9]));
      x.strokeStyle = 'rgba(255,255,255,0.14)'; x.lineWidth = 1.2; x.stroke();
      // engine vents along the rear (top) edge
      x.fillStyle = def.accent; x.shadowColor = def.accent; x.shadowBlur = 8;
      for (let i = 1; i < def.pts.length - 1; i++) {
        const p = def.pts[i];
        if (p[1] < -my * 0.4 && p[0] > 10) { x.fillRect(p[0] - 14, p[1] + 5, 9, 3); x.fillRect(-p[0] + 5, p[1] + 5, 9, 3); }
      }
      x.shadowBlur = 0;
    }, 1.5);
  };

  G.gfx = GFX;
})((window.SGS = window.SGS || {}));
