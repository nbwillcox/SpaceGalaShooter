/* Controller map for SpaceGalaShooter. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacegalashooter', title: 'SpaceGalaShooter', pause: 'KeyP',
  hint: '<b>Stick / D-pad</b> move &nbsp; <b>A / RT</b> fire &nbsp; <b>X / B</b> smart bomb &nbsp; <b>Start</b> pause',
  move: { keys: { l: 'ArrowLeft', r: 'ArrowRight' }, mode: 'h' },
  actions: [
    { id: 'fire', label: 'Fire', btn: ['A', 'RT', 'RB'], key: 'Space' },
    { id: 'bomb', label: 'Smart bomb', btn: ['X', 'B', 'Y'], key: 'KeyB' },
  ],
};
