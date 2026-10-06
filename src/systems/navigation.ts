// Pure focus-movement logic for keyboard/gamepad menu navigation (see src/ui/menuNav.ts).

export type Dir = 'left' | 'right' | 'up' | 'down';

/** Index of the closest item in a direction; stays put if there is none. Pure, for unit tests. */
export function nearest(items: { x: number; y: number }[], from: number, dir: Dir): number {
  const o = items[from];
  if (!o) return 0;
  const [dx, dy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
  let best = from, bestScore = Infinity;
  items.forEach((it, i) => {
    const vx = it.x - o.x, vy = it.y - o.y;
    const along = vx * dx + vy * dy;
    if (i === from || along <= 0) return;
    // Prefer items straight ahead: sideways distance costs more than distance along the direction.
    const score = along + Math.abs(vx * dy - vy * dx) * 2.5;
    if (score < bestScore) (bestScore = score), (best = i);
  });
  return best;
}
