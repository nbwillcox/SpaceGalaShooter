/* Mothership bosses: armored hulls with destroyable modules. Shoot the parts off, then the core. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, TAU = U.TAU;
  const W = C.W, H = C.H;
  const B = {};

  const m = (k, x, y, r, hp) => ({ k, x, y, r, hp });
  const DEFS = [
    {
      name: 'BULWARK', hue: 205, accent: '#37d6ff', seed: 11,
      pts: [[0, -72], [60, -74], [120, -62], [190, -24], [200, 8], [165, 40], [112, 62], [60, 88], [0, 98]],
      mods: [m('gen', -72, -6, 15, 70), m('gen', 72, -6, 15, 70), m('turret', -132, 14, 15, 55), m('turret', 132, 14, 15, 55), m('core', 0, 22, 24, 190)],
    },
    {
      name: 'LEVIATHAN', hue: 315, accent: '#ff4fd8', seed: 23,
      pts: [[0, -82], [42, -72], [92, -84], [152, -62], [184, -22], [172, 30], [122, 52], [72, 80], [32, 102], [0, 112]],
      mods: [m('gen', -60, -18, 15, 80), m('gen', 60, -18, 15, 80), m('spreader', -122, 6, 16, 70), m('spreader', 122, 6, 16, 70),
        m('beam', -34, 66, 13, 60), m('beam', 34, 66, 13, 60), m('core', 0, 26, 24, 220)],
    },
    {
      name: 'HIVE QUEEN', hue: 135, accent: '#4dff9a', seed: 37,
      pts: [[0, -78], [70, -72], [132, -46], [168, 0], [152, 46], [102, 76], [52, 94], [0, 100]],
      mods: [m('gen', -70, -14, 14, 95), m('gen', 70, -14, 14, 95), m('launcher', -110, 30, 17, 80), m('launcher', 110, 30, 17, 80),
        m('turret', -50, 64, 14, 50), m('turret', 50, 64, 14, 50), m('core', 0, 22, 24, 220)],
    },
    {
      name: 'RAVAGER', hue: 18, accent: '#ff8a3d', seed: 51,
      pts: [[0, -62], [50, -88], [72, -50], [132, -72], [154, -30], [204, -10], [172, 26], [122, 36], [92, 72], [42, 62], [0, 106]],
      mods: [m('gen', -66, -4, 14, 85), m('gen', 66, -4, 14, 85), m('cannon', -140, 0, 18, 100), m('cannon', 140, 0, 18, 100),
        m('beam', -30, 74, 13, 65), m('beam', 30, 74, 13, 65), m('turret', -100, 40, 14, 55), m('turret', 100, 40, 14, 55), m('core', 0, 26, 25, 240)],
    },
    {
      name: 'ECLIPSE', hue: 265, accent: '#b07aff', seed: 67,
      pts: [[0, -118], [46, -108], [84, -84], [112, -44], [120, 0], [110, 46], [84, 84], [46, 108], [0, 116]],
      mods: [m('gen', -72, -52, 15, 120), m('gen', 72, -52, 15, 120), m('turret', -100, 20, 14, 60), m('turret', 100, 20, 14, 60),
        m('spreader', -58, 74, 15, 75), m('spreader', 58, 74, 15, 75), m('beam', -22, 92, 12, 70), m('beam', 22, 92, 12, 70), m('core', 0, 4, 26, 260)],
    },
  ];
  B.DEFS = DEFS;
  const hulls = [];

  B.nameFor = function (stage) {
    const k = Math.round(stage / C.BOSS_EVERY) - 1;
    return DEFS[k % DEFS.length].name + (Math.floor(k / DEFS.length) > 0 ? ' MK ' + (Math.floor(k / DEFS.length) + 1) : '');
  };

  B.create = function (g, stage) {
    const k = Math.round(stage / C.BOSS_EVERY) - 1, idx = k % DEFS.length, loop = Math.floor(k / DEFS.length);
    const def = DEFS[idx];
    if (!hulls[idx]) hulls[idx] = GFX.bossHull(def);
    const hpMul = 1 + 0.5 * loop;
    let mx = 0;
    def.pts.forEach((p) => { mx = Math.max(mx, p[0]); });
    const mods = def.mods.map((d, i) => ({ id: 'm' + i, k: d.k, x: d.x, y: d.y, r: d.r, hp: Math.ceil(d.hp * hpMul), maxHp: Math.ceil(d.hp * hpMul), alive: true, flash: 0, cd: 1.5 + Math.random() * 2, burst: 0, bt: 0, phase: 'idle', pt: 0, open: 0, sp: 0, spT: 2, ang: 0, smokeT: 0 }));
    const b = {
      def, idx, loop, x: W / 2, y: -190, t: 0, state: 'enter', mods, hull: hulls[idx], destroyed: 0, exposed: false, shielded: true,
      swayAmp: Math.min(110, W / 2 - mx - 10), dying: 0, shieldFlash: 0, total: mods.reduce((s, q) => s + q.maxHp, 0), rate: 1, name: B.nameFor(stage),
      ringT: 5, shake: 0,
    };
    let ex = 0, ey = 0;
    def.pts.forEach((p) => { ex = Math.max(ex, p[0]); ey = Math.max(ey, Math.abs(p[1])); });
    b.rx = ex * 0.92; b.ry = ey * 0.92;
    return b;
  };

  function breakModule(g, b, md) {
    md.alive = false; md.hp = 0;
    const wx = b.x + md.x, wy = b.y + md.y, core = md.k === 'core';
    FX.explosion(wx, wy, core ? 4 : 2.4, b.def.hue);
    FX.debris(wx, wy, core ? 18 : 10, b.def.accent, 230);
    FX.doFlash(core ? 0.7 : 0.25, '255,235,210');
    A.sfx.partBreak();
    b.destroyed++;
    g.award(core ? 5000 * (b.idx + 1) * (b.loop + 1) : 500, wx, wy);
    g.comboKill();
    if (!core && Math.random() < 0.28) g.dropPickup(wx, wy);
    if (core) {
      b.state = 'dying'; b.dying = 0; b.deathFx = 0;
      g.clearEnemyBullets(true);
      for (const e of g.en.slice()) g.killEnemy(e);
      A.sfx.boom();
    } else if (b.shielded && !b.mods.some((q) => q.k === 'gen' && q.alive)) {
      b.shielded = false; b.exposed = true;
      FX.text(b.x, b.y + 90, 'CORE EXPOSED!', '#ff7a7a', 24);
      FX.ring(b.x + md.x * 0, b.y + 22, 20, 160, 'hsla(0,100%,65%,1)', 0.7, 5);
      A.sfx.thief();
    }
  }

  function damageMod(g, b, md, dmg) {
    md.hp -= dmg; md.flash = 0.06;
    if (md.hp <= 0) breakModule(g, b, md);
    else { A.sfx.hit(); }
  }

  B.bulletHit = function (g, b, bu) {
    for (const md of b.mods) {
      if (!md.alive) continue;
      const rr = md.r + bu.r, wx = b.x + md.x, wy = b.y + md.y;
      if (U.dist2(bu.x, bu.y, wx, wy) < rr * rr) {
        if (md.k === 'core' && b.shielded) {
          if (!bu.pierce) bu.dead = true;
          b.shieldFlash = 0.15; A.sfx.armor();
          FX.sparks(bu.x, bu.y, 3, 160, 'hsla(200,100%,75%,1)', 0.25, 1.4);
          return;
        }
        if (bu.pierce) { if (bu.hit.indexOf(md.id) >= 0) return; bu.hit.push(md.id); }
        FX.sparks(bu.x, bu.y, 3, 140, FX.col(b.def.hue, 75), 0.25, 1.4);
        damageMod(g, b, md, bu.dmg);
        if (!bu.pierce) bu.dead = true;
        return;
      }
    }
    if (!bu.pierce) {
      const dx = (bu.x - b.x) / b.rx, dy = (bu.y - (b.y + (b.def.cy || 0))) / b.ry;
      if (dx * dx + dy * dy < 1) {
        // shots lined up with a part pass through to it; everything else bounces off the armor
        for (const md of b.mods) if (md.alive && Math.abs(bu.x - (b.x + md.x)) < md.r + 3 && b.y + md.y < bu.y) return;
        bu.dead = true; A.sfx.armor();
        FX.sparks(bu.x, bu.y, 2, 120, 'hsla(45,100%,70%,1)', 0.2, 1.2);
      }
    }
  };

  B.bombed = function (g, b) {
    for (const md of b.mods) {
      if (!md.alive) continue;
      if (md.k === 'core') { if (b.shielded) b.shieldFlash = 0.4; else damageMod(g, b, md, 34); }
      else damageMod(g, b, md, 18);
    }
  };

  B.hitsPlayer = function (g, b, p) {
    for (const md of b.mods) {
      if (!md.alive || md.k !== 'beam' || md.phase !== 'fire') continue;
      if (Math.abs(p.x - (b.x + md.x)) < 20 && p.y > b.y + md.y) return true;
    }
    return false;
  };

  function fireMod(g, b, md, dt, rate) {
    const wx = b.x + md.x, wy = b.y + md.y, sp = g.ebSpeed * 0.95;
    md.cd -= dt * rate;
    switch (md.k) {
      case 'turret':
        if (md.cd <= 0) { md.burst = 3; md.bt = 0; md.cd = 2.7; }
        if (md.burst > 0) {
          md.bt -= dt;
          if (md.bt <= 0) { g.aimed(wx, wy + 8, sp * 1.05, 'orb', 0); md.burst--; md.bt = 0.13; }
        }
        break;
      case 'cannon':
        if (md.cd <= 0) {
          md.cd = 3.6;
          g.aimed(wx, wy + 10, 150, 'big', 0, 9);
          g.aimed(wx, wy + 10, sp, 'orb', 0.32); g.aimed(wx, wy + 10, sp, 'orb', -0.32);
        }
        break;
      case 'spreader':
        if (md.cd <= 0) {
          md.cd = 3.0; md.fan = (md.fan || 0) + 1;
          const off = md.fan % 2 ? 0.1 : -0.1;
          for (let i = -3; i <= 3; i++) {
            const a = Math.PI / 2 + i * 0.22 + off;
            g.ebullet(wx, wy + 8, Math.cos(a) * sp * 0.9, Math.sin(a) * sp * 0.9, 'orb', 5);
          }
        }
        break;
      case 'launcher':
        md.open = Math.max(0, md.open - dt);
        if (md.cd <= 0) {
          md.cd = 7.5;
          const minions = g.en.filter((e) => e.noReturn).length;
          if (minions < 5) { md.open = 0.9; G.enemies.spawnMinion(g, wx - 10, wy + 14); G.enemies.spawnMinion(g, wx + 10, wy + 14); A.sfx.thief(); }
        }
        break;
      case 'beam':
        if (md.phase === 'idle') { if (md.cd <= 0) { md.phase = 'aim'; md.pt = 0; } }
        else {
          md.pt += dt;
          if (md.phase === 'aim' && md.pt > 1.1) { md.phase = 'fire'; md.pt = 0; A.sfx.bomb(); FX.addShake(3); }
          else if (md.phase === 'fire' && md.pt > 0.95) { md.phase = 'idle'; md.cd = 5.2 + Math.random() * 1.5; }
        }
        break;
      case 'core':
        if (b.shielded) {
          if (md.cd <= 0) { md.cd = 3.2; g.aimed(wx, wy + 14, sp, 'orb', 0); }
        } else {
          md.spT -= dt;
          if (md.spT > 0) {
            md.sp -= dt;
            if (md.sp <= 0) {
              md.sp = 0.11; md.ang += 0.42;
              for (let q = 0; q < 2; q++) { const a = md.ang + q * Math.PI; g.ebullet(wx, wy, Math.cos(a) * sp * 0.85, Math.sin(a) * sp * 0.85, 'needle', 4); }
            }
          } else if (md.spT < -1.6) md.spT = 2.4;
          b.ringT -= dt;
          if (b.ringT <= 0) {
            b.ringT = 5.5;
            for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.ebullet(wx, wy, Math.cos(a) * sp * 0.75, Math.sin(a) * sp * 0.75, 'orb', 5); }
            FX.ring(wx, wy, 10, 90, 'hsla(0,100%,65%,1)', 0.5, 3);
          }
        }
        break;
      default:
    }
  }

  B.update = function (g, b, dt) {
    b.t += dt;
    if (b.shieldFlash > 0) b.shieldFlash -= dt;
    if (b.state === 'enter') {
      const k = Math.min(1, b.t / 2.6);
      b.y = -190 + (150 + 190) * U.easeOutCubic(k);
      if (k >= 1) { b.state = 'fight'; b.t = 0; }
      return;
    }
    if (b.state === 'dying') {
      b.dying += dt;
      b.deathFx -= dt;
      b.x += Math.sin(b.dying * 40) * 40 * dt;
      if (b.deathFx <= 0) {
        b.deathFx = 0.11;
        const px = b.x + U.rand(-b.rx, b.rx) * 0.8, py = b.y + U.rand(-b.ry, b.ry) * 0.8;
        FX.explosion(px, py, U.rand(1.5, 3), b.def.hue);
        if (Math.random() < 0.3) A.sfx.kill(2);
      }
      if (b.dying > 3.1) {
        FX.explosion(b.x, b.y, 7, b.def.hue);
        FX.ring(b.x, b.y, 20, 520, 'hsla(0,0%,100%,1)', 0.9, 6);
        FX.doFlash(1, '255,255,255'); FX.addShake(16);
        A.sfx.boom();
        for (let i = 0; i < 3; i++) g.dropPickup(b.x + (i - 1) * 60, b.y + 20, i === 0 ? 'W' : undefined);
        b.state = 'done';
      }
      return;
    }
    b.y = 150 + Math.sin(b.t * 0.9) * 8;
    const speed = 0.5 + 0.06 * b.destroyed + 0.08 * b.loop;
    b.x = W / 2 + Math.sin(b.t * speed) * b.swayAmp;
    b.rate = (1 + 0.15 * b.destroyed + (b.exposed ? 0.25 : 0)) * (1 + 0.12 * b.loop) * (g.demo ? 0.7 : 1);
    for (const md of b.mods) {
      if (md.flash > 0) md.flash -= dt;
      if (md.alive) { if (g.player.alive || md.k === 'beam') fireMod(g, b, md, dt, b.rate); }
      else {
        md.smokeT -= dt;
        if (md.smokeT <= 0) { md.smokeT = U.rand(0.12, 0.3); FX.smoke(b.x + md.x, b.y + md.y, 1, 7); if (Math.random() < 0.4) FX.sparks(b.x + md.x, b.y + md.y, 2, 90, 'hsla(35,100%,65%,1)', 0.3); }
      }
    }
  };

  function hexPath(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = rot + i / 6 * TAU; if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  }

  function drawModule(ctx, g, b, md) {
    const x = b.x + md.x, y = b.y + md.y, r = md.r, acc = b.def.accent, t = b.t;
    if (!md.alive) {
      ctx.fillStyle = 'rgba(6,8,16,0.9)'; ctx.beginPath(); ctx.arc(x, y, r * 0.95, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,120,40,0.35)'; ctx.lineWidth = 2; ctx.stroke();
      return;
    }
    const p = g.player;
    const ang = Math.atan2(p.y - y, p.x - x);
    ctx.save(); ctx.translate(x, y);
    // mount
    ctx.fillStyle = 'rgba(8,12,24,0.95)'; ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, TAU); ctx.fill();
    ctx.strokeStyle = acc; ctx.lineWidth = 1.6; ctx.stroke();
    if (md.k === 'turret' || md.k === 'cannon') {
      ctx.rotate(ang - Math.PI / 2);
      const w = md.k === 'cannon' ? 9 : 5, len = r * (md.k === 'cannon' ? 1.9 : 1.6);
      ctx.fillStyle = GFX.lg(ctx, -w, 0, w, 0, [[0, '#2a3552'], [0.5, '#9fb2d8'], [1, '#2a3552']]);
      ctx.fillRect(-w / 2, 0, w, len);
      ctx.fillStyle = md.k === 'cannon' ? '#ff6a3a' : acc; ctx.fillRect(-w / 2 - 1, len - 3, w + 2, 3);
      ctx.rotate(-(ang - Math.PI / 2));
      ctx.fillStyle = GFX.rg(ctx, -3, -3, 1, r, [[0, '#dfe8ff'], [1, '#2d3a5e']]);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, TAU); ctx.fill();
    } else if (md.k === 'spreader') {
      ctx.fillStyle = '#26314f'; ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.6); ctx.lineTo(r * 0.8, -r * 0.6); ctx.lineTo(r * 1.1, r * 0.9); ctx.lineTo(-r * 1.1, r * 0.9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = acc; ctx.stroke();
      ctx.fillStyle = acc; for (let i = -1; i <= 1; i++) ctx.fillRect(i * r * 0.55 - 2, r * 0.5, 4, r * 0.6);
    } else if (md.k === 'launcher') {
      const open = Math.min(1, md.open * 3);
      ctx.fillStyle = '#05070f'; ctx.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
      if (open > 0) { ctx.fillStyle = 'rgba(120,255,160,0.8)'; ctx.fillRect(-r * 0.4, -r * 0.4, r * 0.8, r * 0.8); }
      ctx.fillStyle = '#34406a';
      ctx.fillRect(-r * 0.75 - open * r * 0.6, -r * 0.75, r * 0.75, r * 1.5);
      ctx.fillRect(open * r * 0.6, -r * 0.75, r * 0.75, r * 1.5);
    } else if (md.k === 'beam') {
      const charge = md.phase === 'aim' ? md.pt / 1.1 : md.phase === 'fire' ? 1 : 0;
      ctx.fillStyle = '#1b2440'; ctx.beginPath(); ctx.ellipse(0, 2, r * 0.7, r * 1.1, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,60,60,' + (0.3 + charge * 0.7) + ')'; ctx.beginPath(); ctx.ellipse(0, 4, r * 0.4, r * 0.7, 0, 0, TAU); ctx.fill();
    } else if (md.k === 'gen') {
      hexPath(ctx, 0, 0, r, t * 0.6);
      ctx.fillStyle = GFX.rg(ctx, 0, 0, 1, r, [[0, '#ffffff'], [0.4, acc], [1, '#10182c']]); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
    } else {
      const pulse = 1 + Math.sin(t * 4) * 0.08;
      ctx.fillStyle = GFX.rg(ctx, 0, 0, 1, r * pulse, [[0, '#ffffff'], [0.35, b.exposed ? '#ff5a5a' : acc], [1, '#1a1030']]);
      ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, TAU); ctx.fill();
      ctx.fillStyle = '#12061c'; ctx.beginPath(); ctx.ellipse(0, 0, 3, r * 0.55, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    if (md.hp < md.maxHp) {
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 6, 0, TAU); ctx.stroke();
      ctx.strokeStyle = md.hp / md.maxHp < 0.35 ? '#ff5a5a' : '#8dffb8'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(x, y, r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * md.hp / md.maxHp); ctx.stroke();
    }
    if (md.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU); ctx.fill(); }
  }

  B.draw = function (ctx, g, b) {
    if (b.state === 'done') return;
    GFX.draw(ctx, b.hull, b.x, b.y, 0, 1, 1);
    for (const md of b.mods) drawModule(ctx, g, b, md);
    ctx.globalCompositeOperation = 'lighter';
    for (const md of b.mods) {
      if (!md.alive) continue;
      const x = b.x + md.x, y = b.y + md.y;
      if (md.k === 'gen') GFX.drawGlow(ctx, b.def.accent.length === 7 ? FX.col(b.def.hue, 60) : 'hsla(200,100%,60%,1)', x, y, 28 + Math.sin(b.t * 5 + md.x) * 4, 0.5);
      if (md.k === 'core') GFX.drawGlow(ctx, b.exposed ? 'hsla(0,100%,60%,1)' : FX.col(b.def.hue, 60), x, y, 50 + Math.sin(b.t * 4) * 6, b.exposed ? 0.9 : 0.55);
      if (md.k === 'beam' && md.phase !== 'idle') {
        const bx = x, by = y + 8;
        if (md.phase === 'aim') {
          ctx.globalAlpha = 0.25 + 0.25 * Math.sin(md.pt * 30);
          ctx.fillStyle = 'rgba(255,60,60,1)'; ctx.fillRect(bx - 1, by, 2, H - by);
          ctx.globalAlpha = 1;
          GFX.drawGlow(ctx, 'hsla(0,100%,60%,1)', bx, by, 14 + md.pt * 18, 0.8);
        } else {
          const w = 24 * (1 - Math.max(0, md.pt - 0.75) * 3);
          const gr = ctx.createLinearGradient(bx - w, 0, bx + w, 0);
          gr.addColorStop(0, 'rgba(255,40,40,0)'); gr.addColorStop(0.35, 'rgba(255,90,60,0.8)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(0.65, 'rgba(255,90,60,0.8)'); gr.addColorStop(1, 'rgba(255,40,40,0)');
          ctx.fillStyle = gr; ctx.fillRect(bx - w, by, w * 2, H - by);
          GFX.drawGlow(ctx, 'hsla(10,100%,60%,1)', bx, by, 36, 0.9);
        }
      }
    }
    if (b.shielded) {
      const core = b.mods.find((q) => q.k === 'core');
      if (core && core.alive) {
        const x = b.x + core.x, y = b.y + core.y, r = core.r + 11;
        ctx.globalAlpha = 0.45 + b.shieldFlash * 4 + Math.sin(b.t * 5) * 0.08;
        hexPath(ctx, x, y, r, b.t * 0.5);
        ctx.fillStyle = 'rgba(70,170,255,0.25)'; ctx.fill();
        ctx.strokeStyle = 'rgba(160,225,255,0.95)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    // health bar
    if (b.state === 'fight' || b.state === 'enter') {
      const left = b.mods.reduce((s, q) => s + (q.alive ? q.hp : 0), 0), bw = 300, bx = W / 2 - bw / 2, by = 62;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 9);
      ctx.fillStyle = b.def.accent; ctx.fillRect(bx, by, bw * left / b.total, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '700 11px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(b.name + (b.shielded ? '  -  DESTROY THE GENERATORS' : '  -  DESTROY THE CORE'), W / 2, by - 6);
    }
  };

  G.boss = B;
})((window.SGS = window.SGS || {}));
