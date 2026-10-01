# SpaceGalaShooter

A free, retro-flavored top-down space shooter with modern neon graphics. Hold the line against alien formations, grab 1942-style power-ups, and shoot the armor off giant motherships.

**Play it in your browser:** https://nbwillcox.github.io/SpaceGalaShooter/

Everything is generated in code: sprites are vector-drawn on the fly, and all sound effects and music are synthesized with the Web Audio API. There are no image or audio files and no build step.

## Controls

| Action | Keys |
| --- | --- |
| Move | `←` `→` or `A` `D` (mouse position also steers) |
| Fire (hold to auto-fire) | `Space` or left mouse button |
| Smart bomb | `B`, `X`, `↑` or right mouse button |
| Pause | `P` or `Esc` |

## Gameplay

- Enemies swoop in, lock into a swaying formation, then peel off to dive-bomb you.
- **Power-ups** drop from glowing carrier enemies and bosses:
  - **W** weapon tier: single → double → spread → piercing lances (a hit drops you one tier)
  - **D** wingman drone (up to 2)
  - **S** shield bubble
  - **B** smart bomb (clears bullets, damages everything)
- Watch for the **Thief**: it steals a power-up on contact and flees. Shoot it down to get the loot back.
- Chain kills for a score multiplier (up to x8) and clear a stage without being hit for a Perfect bonus.
- Every 5th stage is a **mothership boss**. Shoot its turrets, cannons, beam emitters and launchers off, take out the generators to drop the core shield, then destroy the core. Five unique bosses, scaling up each loop.
- Local top-10 high scores with arcade-style 3-letter initials (stored in your browser).

## Run locally

It is plain HTML/CSS/JS. Either open `index.html` directly, or serve the folder:

```bash
python -m http.server 8000
```

then visit http://localhost:8000. Desktop browsers with keyboard/mouse only for now.

## License and attribution

Licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/): free to play, share and remix **non-commercially**, as long as you give credit and **link back to this repository**: https://github.com/nbwillcox/SpaceGalaShooter

This is an original game inspired by classic fixed-shooter arcade games. It uses no assets, names or code from any existing game.
