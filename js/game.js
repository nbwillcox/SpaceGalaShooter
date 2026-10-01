/* Core game state: player, bullets, collisions, stage flow. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, GFX = G.gfx, A = G.audio, I = G.input, TAU = U.TAU;
  const W = C.W, H = C.H;
  const Game = { state: 'title', demo: true, time: 0, paused: false };
  G.game = Game;

  function newPlayer() {
    return { x: W / 2, y: C.PLAYER_Y, alive: true, tier: 1, drones: 0, shield: 0, bombs: 1, fireCd: 0, invuln: 2, respawn: 0, tilt: 0, t: 0, dx: [-46, 46], dy: [10, 10], bombCd: 0, hitFlash: 0 };
  }

  Game.reset = function (demo, startStage) {
    this.demo = !!demo;
    this.score = 0; this.lives = C.START_LIVES; this.stage = 0;
    this.combo = 0; this.comboT = 0; this.mult = 1;
    this.lifeIdx = 0; this.nextLifeAt = C.EXTRA_LIFE_AT[0];
    this.pb = []; this.eb = []; this.en = []; this.pk = [];
    this.boss = null; this.form = null; this.banner = null;
    this.stageTime = 0; this.perfect = true; this.timer = 0; this.over = false; this.overDone = false;
    this.thiefAt = 0; this.thiefDone = true; this.pending = 0;
    this.player = newPlayer();
    this.hi = G.scores.best();
    this.clearInfo = null;
    FX.reset();
    this.startStage(startStage || 1);
  };

  /* ---------- scoring ---------- */
  Game.addScore = function (v) {
    this.score += v;
    if (this.demo) return;
    while (this.score >= this.nextLifeAt) {
      this.lives = Math.min(9, this.lives + 1);
      this.lifeIdx++;
      this.nextLifeAt = this.lifeIdx < C.EXTRA_LIFE_AT.length ? C.EXTRA_LIFE_AT[this.lifeIdx] : this.nextLifeAt + C.EXTRA_LIFE_EVERY;
      A.sfx.extraLife();
      this.banner = { text: 'EXTRA SHIP', sub: '', t: 0, life: 1.6, small: true };
    }
  };
  Game.award = function (base, x, y) {
    const v = Math.round(base * this.mult);
    this.addScore(v);
    if (x !== undefined && base >= 150) FX.text(x, y - 16, '+' + U.fmt(v), this.mult > 1 ? '#ffd24a' : '#ffffff', base >= 1000 ? 22 : 15);
  };
  Game.comboKill = function () {
    this.combo++; this.comboT = 2.4;
    const m = Math.min(8, 1 + Math.floor(this.combo / 6));
    if (m > this.mult) {
      this.mult = m;
      FX.text(this.player.x, this.player.y - 56, 'COMBO x' + m, '#ffd24a', 22);
      A.sfx.combo(m);
    }
  };
  Game.breakCombo = function () { this.combo = 0; this.comboT = 0; this.mult = 1; };

  /* ---------- bullets ---------- */
  Game.ebullet = function (x, y, vx, vy, kind, r) {
    if (this.eb.length > this.maxEB + 30) return;
    this.eb.push({ x, y, vx, vy, kind: kind || 'orb', r: r || 5, dead: false });
  };
  Game.aimed = function (x, y, speed, kind, spread, r) {
    const p = this.player;
    const a = Math.atan2(p.y - y, p.x - x) + (spread || 0);
    this.ebullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, kind, r);
  };
  Game.clearEnemyBullets = function (fxOn) {
    if (fxOn) for (const b of this.eb) FX.sparks(b.x, b.y, 2, 80, 'hsla(30,100%,60%,1)', 0.3, 1.2);
    this.eb.length = 0;
  };
  Game.pbullet = function (x, y, ang, speed, dmg, kind, pierce) {
    this.pb.push({ x, y, vx: Math.sin(ang) * speed, vy: -Math.cos(ang) * speed, ang, dmg, kind, pierce: !!pierce, hit: pierce ? [] : null, r: kind === 'lance' ? 5 : 4, dead: false });
  };

  /* ---------- pickups ---------- */
  Game.dropPickup = function (x, y, kind) {
    this.pk.push({ x, y, kind: kind || this.randomKind(), t: 0, vy: 70, dead: false });
  };
  Game.randomKind = function () {
    const p = this.player;
    const w = { W: p.tier >= C.MAX_TIER ? 1 : 4, D: p.drones >= C.MAX_DRONES ? 1 : 2.4, S: 2, B: p.bombs >= C.MAX_BOMBS ? 0.8 : 2 };
    let tot = 0; for (const k in w) tot += w[k];
    let r = Math.random() * tot;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return 'W';
  };
  Game.collect = function (pk) {
    const p = this.player, x = pk.x, y = pk.y;
    FX.sparks(x, y, 12, 170, FX.col(50), 0.5);
    FX.ring(x, y, 6, 36, 'hsla(50,100%,70%,1)', 0.35, 2);
    if (pk.kind === 'W') {
      if (p.tier < C.MAX_TIER) { p.tier++; A.sfx.weaponUp(); FX.text(p.x, p.y - 44, p.tier === C.MAX_TIER ? 'PIERCING LANCES!' : 'WEAPON UP', '#ffe27a', 18); }
      else { this.award(1000, x, y); A.sfx.pickup(); }
    } else if (pk.kind === 'D') {
      if (p.drones < C.MAX_DRONES) { p.drones++; A.sfx.drone(); FX.text(p.x, p.y - 44, 'WINGMAN', '#7dffb8', 18); }
      else { this.award(1000, x, y); A.sfx.pickup(); }
    } else if (pk.kind === 'S') {
      p.shield = C.SHIELD_TIME; A.sfx.shield(); FX.text(p.x, p.y - 44, 'SHIELD', '#8fd4ff', 18);
    } else {
      if (p.bombs < C.MAX_BOMBS) { p.bombs++; A.sfx.bombPickup(); FX.text(p.x, p.y - 44, 'SMART BOMB', '#ff8ca0', 18); }
      else { this.award(1000, x, y); A.sfx.pickup(); }
    }
    this.addScore(200);
  };

  /* ---------- player ---------- */
  const RATE = [0, 7.5, 8, 8.5, 10];
  Game.firePlayer = function (p) {
    const sp = 960, y = p.y - 26;
    if (p.tier === 1) this.pbullet(p.x, y, 0, sp, 1, 'bolt');
    else if (p.tier === 2) { this.pbullet(p.x - 9, y + 4, 0, sp, 1, 'bolt'); this.pbullet(p.x + 9, y + 4, 0, sp, 1, 'bolt'); }
    else if (p.tier === 3) {
      this.pbullet(p.x, y, 0, sp, 1, 'bolt');
      this.pbullet(p.x - 8, y + 6, -0.17, sp, 1, 'bolt');
      this.pbullet(p.x + 8, y + 6, 0.17, sp, 1, 'bolt');
    } else {
      this.pbullet(p.x - 7, y, 0, 1150, 1.5, 'lance', true);
      this.pbullet(p.x + 7, y, 0, 1150, 1.5, 'lance', true);
      this.pbullet(p.x - 16, y + 8, -0.2, sp, 1, 'bolt');
      this.pbullet(p.x + 16, y + 8, 0.2, sp, 1, 'bolt');
    }
    p.fireCd = 1 / RATE[p.tier];
    p.muzzle = 0.06;
    A.sfx.shoot(p.tier);
  };

  Game.useBomb = function () {
    const p = this.player;
    if (!p.alive || p.bombs <= 0 || p.bombCd > 0) return;
    p.bombs--; p.bombCd = 0.8;
    p.invuln = Math.max(p.invuln, 0.9);
    A.sfx.bomb();
    FX.doFlash(0.9, '255,240,220');
    FX.addShake(14);
    FX.ring(p.x, p.y, 10, 760, 'hsla(40,100%,70%,1)', 0.8, 7);
    FX.ring(p.x, p.y, 6, 540, 'hsla(200,100%,75%,1)', 1.0, 4);
    this.clearEnemyBullets(true);
    for (const e of this.en.slice()) this.damageEnemy(e, 6, null);
    if (this.boss && this.boss.state === 'fight') G.boss.bombed(this, this.boss);
  };

  Game.hitPlayer = function () {
    const p = this.player;
    if (!p.alive || p.invuln > 0) return false;
    if (G.debug && G.debug.god) return false;
    if (p.shield > 0) {
      p.shield = 0; p.invuln = 1.2; p.hitFlash = 0.25;
      A.sfx.shieldBreak(); FX.addShake(4);
      FX.ring(p.x, p.y, 18, 80, 'hsla(200,100%,70%,1)', 0.4, 4);
      FX.sparks(p.x, p.y, 16, 220, FX.col(200), 0.5);
      return true;
    }
    p.alive = false;
    FX.explosion(p.x, p.y, 3.2, 190);
    FX.explosion(p.x, p.y, 2, 320);
    A.sfx.playerDie(); FX.doFlash(0.5, '255,190,190'); FX.addShake(10);
    p.tier = Math.max(1, p.tier - 1);
    p.drones = Math.max(0, p.drones - 1);
    p.shield = 0;
    this.lives--; this.perfect = false; this.breakCombo();
    if (this.lives <= 0) { this.over = true; this.overT = 2.4; A.music('off'); setTimeout(() => A.sfx.gameOver(), 700); }
    else p.respawn = 1.5;
    return true;
  };

  Game.updatePlayer = function (dt) {
    const p = this.player;
    p.t += dt;
    if (p.hitFlash > 0) p.hitFlash -= dt;
    if (p.muzzle > 0) p.muzzle -= dt;
    if (!p.alive) {
      p.respawn -= dt;
      if (p.respawn <= 0 && this.lives > 0 && !this.over) {
        p.alive = true; p.x = W / 2; p.y = C.PLAYER_Y; p.invuln = 2.6; p.fireCd = 0; p.tilt = 0;
        FX.ring(p.x, p.y, 8, 60, 'hsla(190,100%,70%,1)', 0.5, 3);
      }
      return;
    }
    let dir = 0, target = null, fire = false, bomb = false;
    if (this.demo) { const c = this.autopilot(dt); target = c.x; fire = true; bomb = c.bomb; }
    else {
      dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
      if (dir === 0 && I.mouseActive) target = U.clamp(I.mouseX, 26, W - 26);
      fire = I.fire; bomb = I.takeBomb();
    }
    let vx = 0;
    if (dir !== 0) { vx = dir * C.PLAYER_SPEED; p.x += vx * dt; }
    else if (target !== null) {
      const d = target - p.x, step = C.MOUSE_SPEED * dt;
      const m = Math.abs(d) <= step ? d : Math.sign(d) * step;
      p.x += m; vx = m / dt;
    }
    p.x = U.clamp(p.x, 26, W - 26);
    p.tilt += (U.clamp(vx / C.PLAYER_SPEED, -1, 1) * 0.3 - p.tilt) * Math.min(1, 14 * dt);
    if (p.invuln > 0) p.invuln -= dt;
    if (p.shield > 0) p.shield -= dt;
    if (p.bombCd > 0) p.bombCd -= dt;
    p.fireCd = Math.max(0, p.fireCd - dt);
    if (fire && p.fireCd <= 0) this.firePlayer(p);
    if (bomb) this.useBomb();
    // wingmen
    p.dcd = (p.dcd || 0) - dt;
    p.dpos = p.dpos || [{ x: p.x, y: p.y }, { x: p.x, y: p.y }];
    const k = 1 - Math.exp(-11 * dt);
    for (let i = 0; i < p.drones; i++) {
      const d = p.dpos[i];
      d.x += (p.x + p.dx[i] - d.x) * k; d.y += (p.y + p.dy[i] + Math.sin(p.t * 3 + i * 2) * 3 - d.y) * k;
      if (fire && p.dcd <= 0) this.pbullet(d.x, d.y - 10, 0, 900, 0.8, 'dbolt');
    }
    if (fire && p.dcd <= 0) { p.dcd = 0.22; if (p.drones) A.sfx.droneShot(); }
    if (!S.reduced || Math.random() < 0.4) FX.trail(p.x + U.rand(-3, 3), p.y + 31, 'hsla(190,100%,60%,1)', U.rand(6, 10), 0.16);
  };

  /* attract-mode pilot: dodge bullets, line up under enemies */
  Game.autopilot = function (dt) {
    const p = this.player;
    this.apT = (this.apT || 0) - dt;
    if (this.apT <= 0) {
      this.apT = 0.25;
      let best = null, bd = 1e9;
      const cands = this.en.filter((e) => e.state !== 'wait' && e.y < p.y - 40 && e.y > 0);
      for (const e of cands) { const d = Math.abs(e.x - p.x); if (d < bd) { bd = d; best = e; } }
      if (this.boss && this.boss.state === 'fight') best = { x: this.boss.x + (Math.sin(this.time) * 60) };
      this.apTarget = best ? best.x : W / 2;
    }
    let bx = p.x, bc = 1e9;
    for (let cx = 30; cx <= W - 30; cx += 15) {
      let cost = Math.abs(cx - p.x) * 0.012 + Math.abs(cx - (this.apTarget || W / 2)) * 0.02;
      for (const b of this.eb) {
        if (b.y < p.y - 240 || b.y > p.y + 10 || b.vy < 20) continue;
        const t = (p.y - b.y) / b.vy, d = Math.abs(b.x + b.vx * t - cx);
        if (d < 36) cost += (36 - d) * (1 + (240 - (p.y - b.y)) / 240);
      }
      for (const e of this.en) {
        if (e.state === 'form' || e.state === 'wait' || e.y < p.y - 280 || e.y > p.y + 20) continue;
        const d = Math.abs(e.x - cx);
        if (d < 60) cost += (60 - d) * 1.6;
      }
      if (cost < bc) { bc = cost; bx = cx; }
    }
    return { x: bx, bomb: this.eb.length > 16 && p.bombs > 0 && Math.random() < 0.05 };
  };

  /* ---------- enemy damage / kills ---------- */
  Game.damageEnemy = function (e, dmg) {
    if (e.dead) return;
    e.hp -= dmg; e.flash = 0.07;
    if (e.hp <= 0) this.killEnemy(e);
    else { A.sfx.hit(); FX.sparks(e.x, e.y, 3, 120, 'hsla(40,100%,70%,1)', 0.25, 1.4); }
  };
  Game.killEnemy = function (e) {
    if (e.dead) return;
    e.dead = true;
    const T = G.enemies.TYPES[e.type];
    const diving = e.state === 'dive' || e.state === 'thief' || e.state === 'flee';
    this.award(T.score * (diving ? 2 : 1), e.x, e.y);
    this.comboKill();
    FX.explosion(e.x, e.y, T.size, T.hue);
    A.sfx.kill(T.size > 1.6 ? 2 : T.size > 1.1 ? 1 : 0);
    if (e.type === 'thief') {
      if (e.loot) { this.dropPickup(e.x, e.y, e.loot); A.sfx.recovered(); FX.text(e.x, e.y - 30, 'RECOVERED!', '#7dffd8', 20); this.addScore(1000); }
      else this.dropPickup(e.x, e.y);
    } else if (e.carrier) this.dropPickup(e.x, e.y);
    else if (!this.demo && Math.random() < 0.03) this.dropPickup(e.x, e.y);
  };

  /* ---------- update ---------- */
  function step(arr, dt, w, h) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.dead || b.y < -70 || b.y > h + 40 || b.x < -40 || b.x > w + 40) { arr[i] = arr[arr.length - 1]; arr.pop(); }
    }
  }

  Game.collide = function () {
    const p = this.player, boss = this.boss && this.boss.state === 'fight' ? this.boss : null;
    for (const b of this.pb) {
      if (b.dead) continue;
      for (const e of this.en) {
        if (e.dead || e.state === 'wait') continue;
        const rr = e.r + b.r;
        if (U.dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          if (b.pierce) { if (b.hit.indexOf(e.id) >= 0) continue; b.hit.push(e.id); }
          this.damageEnemy(e, b.dmg);
          FX.sparks(b.x, b.y, 2, 100, 'hsla(190,100%,75%,1)', 0.2, 1.2);
          if (!b.pierce) { b.dead = true; break; }
        }
      }
      if (!b.dead && boss) G.boss.bulletHit(this, boss, b);
    }
    if (!p.alive) return;
    const pr = 8;
    for (const b of this.eb) {
      const rr = b.r + pr;
      if (!b.dead && U.dist2(b.x, b.y, p.x, p.y) < rr * rr) { b.dead = true; this.hitPlayer(); if (!p.alive) return; }
    }
    for (const e of this.en) {
      if (e.dead || e.state === 'wait') continue;
      const rr = e.r + pr;
      if (U.dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        if (e.type === 'thief') G.enemies.thiefTouch(this, e);
        else if (this.hitPlayer()) { this.damageEnemy(e, 3); if (!p.alive) return; }
      }
    }
    if (boss && G.boss.hitsPlayer(this, boss, p)) this.hitPlayer();
    for (const k of this.pk) {
      if (k.dead) continue;
      if (U.dist2(k.x, k.y, p.x, p.y) < 30 * 30) { k.dead = true; this.collect(k); }
    }
  };

  Game.update = function (dt) {
    this.time += dt;
    this.stageTime += dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.breakCombo(); }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    this.updatePlayer(dt);
    step(this.pb, dt, W, H);
    G.enemies.update(this, dt);
    if (this.boss) G.boss.update(this, this.boss, dt);
    step(this.eb, dt, W, H);
    for (let i = this.pk.length - 1; i >= 0; i--) {
      const k = this.pk[i];
      k.t += dt; k.y += k.vy * dt;
      if (k.dead || k.y > H + 30) { this.pk[i] = this.pk[this.pk.length - 1]; this.pk.pop(); }
    }
    this.collide();
    FX.update(dt);
    this.flow(dt);
    if (this.over) {
      this.overT -= dt;
      if (this.overT <= 0) {
        if (this.demo) { this.reset(true, U.randInt(1, 4)); this.player.tier = U.randInt(1, 3); this.player.drones = U.randInt(0, 2); }
        else if (!this.overDone) { this.overDone = true; if (this.onOver) this.onOver(); }
      }
    }
  };

  /* ---------- stage flow ---------- */
  Game.startStage = function (n) {
    this.stage = n; this.stageTime = 0; this.perfect = true; this.clearInfo = null;
    this.maxEB = Math.min(40, 12 + Math.floor(n * 1.6));
    this.ebSpeed = Math.min(300, 170 + n * 8);
    this.world = Math.floor((n - 1) / C.BOSS_EVERY) % 5;
    this.clearEnemyBullets(false);
    const key = [0, 2, -2, 3, 5][this.world];
    if (n % C.BOSS_EVERY === 0) {
      this.state = 'bossWarn'; this.timer = 3.4;
      this.banner = { text: 'WARNING', sub: 'MOTHERSHIP APPROACHING', t: 0, life: 3.4, warn: true };
      if (!this.demo) { A.sfx.warning(); A.music('boss', 3, key); }
    } else {
      this.state = 'intro'; this.timer = 1.7;
      this.banner = { text: 'STAGE ' + n, sub: '', t: 0, life: 1.7 };
      if (!this.demo) A.music('play', n >= 3 ? 2 : 1, key);
    }
    G.onStage && G.onStage(n);
  };

  Game.beginClear = function (boss) {
    this.state = 'clear';
    this.timer = boss ? 4.4 : 2.7;
    this.clearEnemyBullets(true);
    let bonus = 0;
    if (this.perfect && !this.demo) bonus = boss ? 5000 : 1000 + this.stage * 100;
    if (bonus) { this.addScore(bonus); A.sfx.perfect(); }
    if (!this.demo) A.sfx.stageClear();
    this.banner = { text: boss ? 'MOTHERSHIP DESTROYED' : 'STAGE ' + this.stage + ' CLEAR', sub: bonus ? 'PERFECT  +' + U.fmt(bonus) : '', t: 0, life: this.timer - 0.2 };
  };

  Game.flow = function (dt) {
    if (this.over) return;
    switch (this.state) {
      case 'intro':
        this.timer -= dt;
        if (this.timer <= 0) { G.enemies.spawnStage(this, this.stage); this.state = 'play'; }
        break;
      case 'play':
        if (this.thiefAt > 0 && this.stageTime > this.thiefAt && this.en.length > 3) { this.thiefAt = 0; G.enemies.spawnThief(this); }
        if (this.en.length === 0) this.beginClear(false);
        break;
      case 'bossWarn':
        this.timer -= dt;
        if (this.timer <= 0) { this.boss = G.boss.create(this, this.stage); this.state = 'bossFight'; }
        break;
      case 'bossFight':
        if (this.boss && this.boss.state === 'done') { this.boss = null; this.beginClear(true); }
        break;
      case 'clear':
        this.timer -= dt;
        if (this.timer <= 0) this.startStage(this.stage + 1);
        break;
      default:
    }
  };

  /* ---------- rendering (logical 540x720 space) ---------- */
  Game.drawPlayer = function (ctx) {
    const p = this.player, spr = GFX.spr;
    if (!p.alive) return;
    const blink = p.invuln > 0 ? (Math.floor(p.t * 16) % 2 ? 0.35 : 0.85) : 1;
    ctx.globalCompositeOperation = 'lighter';
    const fl = 16 + Math.random() * 8 + (I.fire ? 4 : 0);
    for (const sx of [-14, 14]) {
      const g = ctx.createLinearGradient(0, p.y + 33, 0, p.y + 33 + fl);
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.3, 'rgba(70,225,255,0.8)'); g.addColorStop(1, 'rgba(40,80,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(p.x + sx - 3 + p.tilt * 8, p.y + 32); ctx.lineTo(p.x + sx + 3 + p.tilt * 8, p.y + 32); ctx.lineTo(p.x + sx + p.tilt * 20, p.y + 33 + fl); ctx.closePath(); ctx.fill();
    }
    if (p.muzzle > 0) GFX.drawGlow(ctx, 'hsla(190,100%,65%,1)', p.x, p.y - 34, 22, 0.9);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < p.drones; i++) {
      const d = p.dpos[i];
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(150,100%,60%,1)', d.x, d.y + 10, 9, 0.8);
      ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, spr.drone, d.x, d.y, p.tilt * 0.6, 1, 1, blink);
    }
    GFX.draw(ctx, spr.player, p.x, p.y, p.tilt * 0.4, 1, 1, blink);
    ctx.globalCompositeOperation = 'lighter';
    GFX.drawGlow(ctx, 'hsla(190,100%,70%,1)', p.x, p.y + 2, 5, 0.9);
    if (p.shield > 0) {
      const low = p.shield < 3 && Math.floor(p.t * 8) % 2;
      const pulse = 0.6 + Math.sin(p.t * 6) * 0.15;
      ctx.globalAlpha = low ? 0.25 : pulse;
      const g = ctx.createRadialGradient(p.x, p.y, 20, p.x, p.y, 40);
      g.addColorStop(0, 'rgba(80,190,255,0)'); g.addColorStop(0.75, 'rgba(80,190,255,0.25)'); g.addColorStop(1, 'rgba(180,235,255,0.9)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 40, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  Game.render = function (ctx) {
    const spr = GFX.spr;
    for (const k of this.pk) {
      const spin = 0.55 + 0.45 * Math.abs(Math.cos(k.t * 3.2));
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(' + (k.kind === 'W' ? 45 : k.kind === 'D' ? 150 : k.kind === 'S' ? 205 : 350) + ',100%,60%,1)', k.x, k.y, 30, 0.55 + Math.sin(k.t * 6) * 0.15);
      ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, spr.pick[k.kind], k.x, k.y, 0, spin, 1);
    }
    if (this.boss) G.boss.draw(ctx, this, this.boss);
    G.enemies.draw(ctx, this);
    FX.drawNorm(ctx);
    for (const b of this.eb) {
      if (b.kind === 'needle') GFX.draw(ctx, spr.eneedle, b.x, b.y, Math.atan2(b.vy, b.vx) - Math.PI / 2);
      else if (b.kind === 'big') GFX.draw(ctx, spr.ebig, b.x, b.y, this.time * 4);
      else if (b.kind === 'orbG') GFX.draw(ctx, spr.eorbG, b.x, b.y, 0);
      else GFX.draw(ctx, spr.eorb, b.x, b.y, 0);
    }
    for (const b of this.pb) GFX.draw(ctx, spr[b.kind], b.x, b.y, b.ang);
    this.drawPlayer(ctx);
    ctx.globalCompositeOperation = 'lighter';
    FX.drawAdd(ctx);
    ctx.globalCompositeOperation = 'source-over';
    FX.drawText(ctx);
  };

  Game.reset0 = function () { this.overDone = false; };
})((window.SGS = window.SGS || {}));
