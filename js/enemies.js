/* Enemy roster, formation stages, entry swoops, dive attacks and the Thief. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, TAU = U.TAU;
  const W = C.W, H = C.H;
  const E = {};
  const TYPES = {
    wasp: { r: 13, hp: 1, score: 80, size: 1, hue: 40, spr: 'wasp' },
    raider: { r: 12, hp: 1, score: 110, size: 1, hue: 350, spr: 'raider' },
    guard: { r: 16, hp: 3, score: 200, size: 1.5, hue: 145, spr: 'guard', scale: 0.88 },
    warden: { r: 20, hp: 6, score: 450, size: 2, hue: 275, spr: 'warden', scale: 0.82 },
    thief: { r: 17, hp: 9, score: 1000, size: 2, hue: 50, spr: 'thief' },
  };
  E.TYPES = TYPES;
  let uid = 0;
  const tmp = { x: 0, y: 0 };

  function hpFor(type, n) {
    const T = TYPES[type];
    const add = { wasp: n / 12, raider: n / 10, guard: n / 10, warden: n / 8, thief: n / 6 }[type];
    return T.hp + Math.floor(add);
  }
  function make(g, type, x, y) {
    const hp = hpFor(type, g.stage);
    return { id: ++uid, type, x, y, vx: 0, vy: 0, r: TYPES[type].r, hp, maxHp: hp, state: 'wait', wait: 0, slot: null, t: 0, dur: 1, path: null, ang: 0, flash: 0, carrier: false, loot: null, anim: Math.random() * 6, fireCd: U.rand(3, 9), dead: false, shots: [], si: 0 };
  }
  function slotXY(g, s, out) {
    const f = g.form;
    out.x = W / 2 + f.sway + (s.c - (f.cols - 1) / 2) * f.sx * f.breath;
    out.y = f.top + s.r * f.sy * (0.92 + 0.08 * f.breath) + f.bob;
    return out;
  }
  const PAIRS = [['L', 'R'], ['TL', 'TR'], ['LOOPL', 'LOOPR']];
  function entryPath(kind, end) {
    switch (kind) {
      case 'L': return [{ x: -50, y: H * 0.5 }, { x: W * 0.65, y: H * 0.72 }, { x: W * 0.72, y: H * 0.2 }, end];
      case 'R': return [{ x: W + 50, y: H * 0.5 }, { x: W * 0.35, y: H * 0.72 }, { x: W * 0.28, y: H * 0.2 }, end];
      case 'TL': return [{ x: W * 0.15, y: -50 }, { x: W * 0.05, y: H * 0.66 }, { x: W * 0.9, y: H * 0.6 }, end];
      case 'TR': return [{ x: W * 0.85, y: -50 }, { x: W * 0.95, y: H * 0.66 }, { x: W * 0.1, y: H * 0.6 }, end];
      case 'LOOPL': return [{ x: W * 0.5, y: -50 }, { x: W * 1.05, y: H * 0.42 }, { x: -W * 0.05, y: H * 0.52 }, end];
      default: return [{ x: W * 0.5, y: -50 }, { x: -W * 0.05, y: H * 0.42 }, { x: W * 1.05, y: H * 0.52 }, end];
    }
  }

  E.spawnStage = function (g, n) {
    const avail = ['wasp'];
    if (n >= 2) avail.unshift('raider');
    if (n >= 3) avail.unshift('guard');
    if (n >= 4) avail.unshift('warden');
    const rows = Math.min(3 + Math.floor(n / 4), 5), cols = n < 3 ? 7 : 8;
    const variant = n < 3 ? 0 : (n * 7) % 3, mid = (cols - 1) / 2;
    const f = g.form = { cols, rows, sx: cols >= 8 ? 52 : 58, sy: 50, top: 110, t: 0, sway: 0, breath: 1, bob: 0, ready: false, diveT: 2.6 };
    f.swayAmp = Math.max(0, Math.min(46, W / 2 - ((cols - 1) / 2 * f.sx * 1.06 + 26) - 6));
    const list = [];
    const pairShift = U.randInt(0, 2);
    for (let r = 0; r < rows; r++) {
      const type = avail[Math.round(r * (avail.length - 1) / Math.max(1, rows - 1))];
      const cells = [];
      for (let c = 0; c < cols; c++) {
        const dc = Math.abs(c - mid);
        if (type === 'warden' && dc > 1.6) continue;
        if (type === 'guard' && dc > 2.6) continue;
        if (variant === 1 && (c + r) % 2) continue;
        if (variant === 2 && !(dc < Math.max(1.5, cols / 2 - r * 0.8))) continue;
        cells.push(c);
      }
      const pair = PAIRS[(r + pairShift) % 3];
      const left = cells.filter((c) => c < mid + 0.01 && c <= mid), right = cells.filter((c) => c > mid).reverse();
      const base = 0.2 + r * 1.3;
      [[left, pair[0]], [right, pair[1]]].forEach((grp) => {
        grp[0].forEach((c, i) => {
          const e = make(g, type, -100, -100);
          e.slot = { c, r }; e.wait = base + i * 0.17; e.pk = grp[1];
          list.push(e);
        });
      });
    }
    const carriers = n >= 6 ? 2 : 1;
    for (let i = 0; i < carriers && list.length > 4; i++) U.pick(list.filter((e) => e.type !== 'warden')).carrier = true;
    g.en.push(...list);
    g.thiefAt = n >= 3 && Math.random() < 0.55 ? U.rand(8, 16) : 0;
  };

  function beginEnter(g, e) {
    const end = { x: 0, y: 0 };
    slotXY(g, e.slot, end);
    e.endPt = end;
    e.path = entryPath(e.pk, end);
    e.state = 'enter'; e.t = 0;
    e.dur = e.pk.indexOf('LOOP') === 0 ? 3.0 : e.pk[0] === 'T' ? 2.8 : 2.4;
    e.x = e.path[0].x; e.y = e.path[0].y;
  }
  function heading(e, nx, ny, dt) {
    const dx = nx - e.x, dy = ny - e.y;
    if (dx * dx + dy * dy > 0.01) {
      const target = Math.atan2(dy, dx) - Math.PI / 2;
      let d = target - e.ang;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      e.ang += d * Math.min(1, 14 * dt);
    }
    e.x = nx; e.y = ny;
  }

  function startDive(g, e) {
    const p = g.player, px = p.alive ? p.x : W / 2, slow = g.demo ? 1.2 : 1;
    const side = Math.random() < 0.7 ? (e.x < W / 2 ? 1 : -1) : (e.x < W / 2 ? -1 : 1);
    const st = Math.min(g.stage, 14), P0 = { x: e.x, y: e.y };
    let path, dur, shots = [];
    if (e.type === 'raider') {
      path = [P0, { x: e.x, y: e.y + 70 }, { x: px + U.rand(-30, 30), y: H * 0.5 }, { x: px, y: H + 70 }]; dur = 1.9 - 0.04 * st;
    } else if (e.type === 'guard') {
      path = [P0, { x: e.x + side * 200, y: e.y + 30 }, { x: px - side * 130, y: H * 0.38 }, { x: px + side * 60, y: H + 70 }]; dur = 3.2 - 0.05 * st; shots = [0.32, 0.55];
    } else if (e.type === 'warden') {
      path = [P0, { x: e.x + side * 100, y: e.y + 120 }, { x: px, y: H * 0.3 }, { x: W / 2 + side * 140, y: H + 70 }]; dur = 4.2 - 0.05 * st; shots = [0.3, 0.5, 0.7];
    } else {
      path = [P0, { x: e.x + side * 130, y: e.y + 90 }, { x: px - side * 70, y: H * 0.55 }, { x: px + side * 40, y: H + 70 }]; dur = 2.8 - 0.05 * st; if (g.stage >= 2) shots = [0.5];
    }
    e.state = 'dive'; e.t = 0; e.dur = Math.max(1.3, dur) * slow; e.path = path; e.shots = shots; e.si = 0;
  }
  E.startDive = startDive;

  function shoot(g, e) {
    if (g.eb.length >= g.maxEB) return;
    const sp = g.ebSpeed;
    if (e.type === 'warden') { for (const s of [-0.28, 0, 0.28]) g.aimed(e.x, e.y + 10, sp * 0.9, 'orb', s); }
    else if (e.type === 'guard') { g.aimed(e.x - 6, e.y + 10, sp * 1.15, 'needle', -0.06); g.aimed(e.x + 6, e.y + 10, sp * 1.15, 'needle', 0.06); }
    else g.aimed(e.x, e.y + 8, sp, 'orb', 0);
  }

  function updateEnemy(g, e, dt) {
    const f = g.form;
    e.anim += dt;
    if (e.flash > 0) e.flash -= dt;
    switch (e.state) {
      case 'wait':
        e.wait -= dt;
        if (e.wait <= 0) beginEnter(g, e);
        break;
      case 'enter': {
        e.t += dt / e.dur;
        slotXY(g, e.slot, e.endPt);
        U.bezier(e.path, Math.min(1, e.t), tmp);
        heading(e, tmp.x, tmp.y, dt);
        if (e.t >= 1) { e.state = 'form'; }
        break;
      }
      case 'form': {
        slotXY(g, e.slot, tmp);
        e.x = tmp.x; e.y = tmp.y;
        e.ang += (0 - e.ang) * Math.min(1, 10 * dt);
        if (f && f.ready && g.state === 'play') {
          e.fireCd -= dt;
          if (e.fireCd <= 0) {
            e.fireCd = U.rand(5, 11) / (1 + g.stage * 0.08);
            if (g.eb.length < g.maxEB && g.player.alive) {
              if (Math.random() < 0.5) g.ebullet(e.x, e.y + 12, 0, g.ebSpeed * 0.85, 'needle', 4);
              else g.aimed(e.x, e.y + 12, g.ebSpeed * 0.9, 'orb', 0);
            }
          }
        }
        break;
      }
      case 'dive': {
        e.t += dt / e.dur;
        U.bezier(e.path, Math.min(1, e.t), tmp);
        heading(e, tmp.x, tmp.y, dt);
        while (e.si < e.shots.length && e.t >= e.shots[e.si]) { if (e.y < H * 0.78 && g.player.alive) shoot(g, e); e.si++; }
        if (e.t >= 1) {
          if (e.noReturn || !e.slot) { e.dead = true; break; }
          const s = slotXY(g, e.slot, { x: 0, y: 0 });
          e.state = 'return'; e.t = 0; e.dur = 1.3;
          e.endPt = { x: s.x, y: s.y };
          e.path = [{ x: s.x, y: -50 }, { x: s.x + U.rand(-60, 60), y: 70 }, { x: s.x, y: s.y - 70 }, e.endPt];
          e.x = s.x; e.y = -50;
        }
        break;
      }
      case 'return':
        e.t += dt / e.dur;
        slotXY(g, e.slot, e.endPt);
        U.bezier(e.path, Math.min(1, e.t), tmp);
        heading(e, tmp.x, tmp.y, dt);
        if (e.t >= 1) e.state = 'form';
        break;
      case 'thief': {
        e.t += dt;
        const tx = g.player.alive ? g.player.x : W / 2;
        e.x += U.clamp(tx - e.x, -1, 1) * 150 * dt + Math.sin(e.t * 3) * 70 * dt;
        e.y += e.vy * dt;
        e.ang = Math.sin(e.t * 3) * 0.25;
        if (e.y > H + 50) e.dead = true;
        break;
      }
      case 'flee':
        e.t += dt;
        e.y -= 300 * dt; e.x += Math.sin(e.t * 6) * 150 * dt;
        e.ang = Math.sin(e.t * 6) * 0.3;
        if (e.y < -60) {
          e.dead = true;
          if (e.loot) FX.text(W / 2, 96, 'LOOT LOST', '#ff8a8a', 20);
        }
        break;
      default:
    }
    e.x = U.clamp(e.x, -120, W + 120);
  }

  E.update = function (g, dt) {
    const f = g.form;
    if (f) {
      f.t += dt;
      f.sway = Math.sin(f.t * 0.6) * f.swayAmp;
      f.breath = 1 + 0.05 * Math.sin(f.t * 1.1);
      f.bob = Math.sin(f.t * 1.7) * 3;
    }
    let entering = 0, divers = 0;
    const cand = [];
    for (let i = 0; i < g.en.length; i++) {
      const e = g.en[i];
      if (e.dead) continue;
      updateEnemy(g, e, dt);
      if (e.state === 'wait' || e.state === 'enter') entering++;
      else if (e.state === 'dive' || e.state === 'return') divers++;
      else if (e.state === 'form') cand.push(e);
    }
    if (f) {
      f.ready = entering === 0;
      if (f.ready && g.state === 'play' && !g.over) {
        f.diveT -= dt;
        if (f.diveT <= 0) {
          const maxDivers = Math.min(2 + Math.floor(g.stage / 3), 6);
          if (divers < maxDivers && cand.length) {
            const e = U.pick(cand);
            startDive(g, e);
            if (g.stage >= 4 && Math.random() < 0.4) {
              const buddy = cand.find((o) => o !== e && o.slot.r === e.slot.r && Math.abs(o.slot.c - e.slot.c) === 1);
              if (buddy) startDive(g, buddy);
            }
          }
          f.diveT = Math.max(0.7, 3.4 - 0.2 * g.stage) * U.rand(0.7, 1.3) * (g.demo ? 1.5 : 1) * (cand.length <= 3 ? 0.5 : 1);
        }
      }
    }
    for (let i = g.en.length - 1; i >= 0; i--) if (g.en[i].dead) { g.en[i] = g.en[g.en.length - 1]; g.en.pop(); }
  };

  /* ---------- Thief: steals a power-up on contact, then flees. Kill it to get the loot back. ---------- */
  E.spawnThief = function (g) {
    const e = make(g, 'thief', U.chance(0.5) ? 70 : W - 70, -40);
    e.state = 'thief'; e.vy = 95 + g.stage * 2;
    g.en.push(e);
    A.sfx.thief();
    FX.text(e.x, 60, 'THIEF!', '#ffd24a', 22);
  };
  E.spawnMinion = function (g, x, y) {
    const e = make(g, 'wasp', x, y);
    e.hp = 1; e.maxHp = 1; e.noReturn = true; e.slot = null;
    const px = g.player.x, side = x < px ? 1 : -1;
    e.state = 'dive'; e.t = 0; e.dur = 2.8; e.shots = []; e.si = 0;
    e.path = [{ x, y }, { x: x + side * 120, y: y + 100 }, { x: px - side * 60, y: H * 0.55 }, { x: px + side * 30, y: H + 70 }];
    g.en.push(e);
  };
  E.thiefTouch = function (g, e) {
    if (e.state !== 'thief') return;
    const p = g.player;
    let loot = null;
    if (p.shield > 0) { loot = 'S'; p.shield = 0; }
    else if (p.drones > 0) { loot = 'D'; p.drones--; }
    else if (p.tier > 1) { loot = 'W'; p.tier--; }
    else if (p.bombs > 0) { loot = 'B'; p.bombs--; }
    e.state = 'flee'; e.t = 0; e.loot = loot;
    A.sfx.stolen();
    p.hitFlash = 0.3;
    if (loot) FX.text(e.x, e.y - 28, 'STOLEN!', '#ff6a6a', 22);
    else if (!g.demo) { g.score = Math.max(0, g.score - 1000); FX.text(e.x, e.y - 28, '-1000', '#ff6a6a', 22); }
    FX.ring(e.x, e.y, 10, 60, 'hsla(50,100%,65%,1)', 0.4, 3);
  };

  E.draw = function (ctx, g) {
    const sp = GFX.spr;
    for (const e of g.en) {
      if (e.state === 'wait' || e.dead) continue;
      const T = TYPES[e.type], frames = sp[T.spr];
      const idx = e.type === 'wasp' ? Math.floor(e.anim * 11) % 2 : 0;
      const img = e.flash > 0 ? GFX.flash[T.spr][idx] : frames[idx];
      const s = e.state === 'form' ? 1 + 0.035 * Math.sin(e.anim * 4) : 1;
      if (e.carrier || e.loot) {
        ctx.globalCompositeOperation = 'lighter';
        GFX.drawGlow(ctx, e.loot ? 'hsla(185,100%,60%,1)' : 'hsla(48,100%,60%,1)', e.x, e.y, 30 + Math.sin(e.anim * 8) * 4, 0.55 + Math.sin(e.anim * 8) * 0.2);
        ctx.globalCompositeOperation = 'source-over';
      }
      GFX.draw(ctx, img, e.x, e.y, e.ang, s * (T.scale || 1), s * (T.scale || 1));
      if (e.loot) GFX.draw(ctx, sp.pick[e.loot], e.x, e.y - 30, 0, 0.6 + 0.2 * Math.abs(Math.cos(e.anim * 3)), 0.7);
      if (e.hp < e.maxHp && e.maxHp > 1) {
        const w = 26, y = e.y - T.r - 8;
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(e.x - w / 2, y, w, 3);
        ctx.fillStyle = T.hue > 100 && T.hue < 200 ? '#5dffb0' : '#ffd24a'; ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 3);
      }
    }
  };

  G.enemies = E;
})((window.SGS = window.SGS || {}));
