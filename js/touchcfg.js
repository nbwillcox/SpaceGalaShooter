/* Touch controls for SpaceGalaShooter: drag anywhere to steer the ship (it fires while a finger is down), BOMB button, pause button. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacegalashooter', title: 'SpaceGalaShooter', orient: 'portrait', accent: '#37e6ff',
  hint: '<b>Drag</b> anywhere to move &nbsp; the ship <b>fires</b> while you touch &nbsp; <b>BOMB</b> button: smart bomb',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  pause: { pos: { l: 16, b: 60 }, mirror: true },                                  /* the top corners are HUD, so pause sits in the thumb band */
  controls: [
    { t: 'drag', id: 'steer', zone: [0, 0, 1, 1], mirror: false },
    { t: 'btn', id: 'bomb', label: 'BOMB', key: 'KeyB', hold: false, size: 84, pos: { r: 18, b: 44 } },
  ],
};
