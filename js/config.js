(function (G) {
  'use strict';

  G.C = {
    W: 540,
    H: 720,
    REPO: 'https://github.com/nbwillcox/SpaceGalaShooter',
    PLAYER_Y: 646,
    PLAYER_SPEED: 470,
    MOUSE_SPEED: 1700,
    START_LIVES: 3,
    BOSS_EVERY: 5,
    EXTRA_LIFE_AT: [20000, 60000],
    EXTRA_LIFE_EVERY: 80000,
    MAX_TIER: 4,
    MAX_DRONES: 2,
    MAX_BOMBS: 3,
    SHIELD_TIME: 14,
  };

  const KEY = 'spacegalashooter.settings.v1';
  const defaults = { master: 0.8, music: 0.6, sfx: 0.9, bloom: true, shake: true, reduced: false };

  const S = Object.assign({}, defaults);
  let hadSaved = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { Object.assign(S, JSON.parse(raw)); hadSaved = true; }
  } catch (e) { /* storage unavailable */ }
  S.save = function () {
    try {
      const o = {};
      for (const k in defaults) o[k] = S[k];
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch (e) { /* ignore */ }
  };
  if (!hadSaved && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    S.reduced = true;
  }
  G.settings = S;
})((window.SGS = window.SGS || {}));
