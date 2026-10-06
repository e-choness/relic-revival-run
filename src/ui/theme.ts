import Phaser from 'phaser';

// Procedural "ink on paper" look echoing the jam's hand-drawn art; to be replaced by a designed UI later.
export const FONT_DISPLAY = 'Borel, cursive';
export const FONT_BODY = '"Edu SA Beginner", cursive';
export const INK = 0x2b1d2e;
export const INK_CSS = '#2b1d2e';
export const PAPER = 0xfff6e6;
export const PAPER_CSS = '#fff6e6';
export const WIDTH = 1280;
export const HEIGHT = 720;

export function hex(css: string): number {
  return Phaser.Display.Color.HexStringToColor(css).color;
}

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  size: number,
  style: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
) {
  // Borel has tall ascenders; padding stops glyphs being clipped.
  return scene.add
    .text(x, y, str, { fontFamily: FONT_BODY, fontSize: `${size}px`, color: INK_CSS, padding: { top: size * 0.3, bottom: size * 0.2 }, ...style })
    .setOrigin(0.5);
}

/** Paper card with an ink outline and an offset shadow. */
export function card(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill = PAPER, radius = 18) {
  const g = scene.add.graphics();
  g.fillStyle(INK, 0.9).fillRoundedRect(x - w / 2 + 6, y - h / 2 + 7, w, h, radius);
  g.fillStyle(fill, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  g.lineStyle(4, INK, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}

export function button(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, w = 240, fill = PAPER) {
  const h = 64;
  const c = scene.add.container(x, y);
  const bg = card(scene, 0, 0, w, h, fill, 22);
  const t = label(scene, 0, 0, text, 30);
  c.add([bg, t]);
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.06, duration: 90 }));
  c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 90 }));
  c.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
    e.stopPropagation();
    onClick();
  });
  return c;
}

export function stars(scene: Phaser.Scene, x: number, y: number, count: number, size = 28) {
  const g = scene.add.graphics();
  for (let i = 0; i < 3; i++) {
    const cx = x + (i - 1) * size * 1.3;
    const pts = Array.from({ length: 10 }, (_, k) => {
      const r = k % 2 ? size * 0.22 : size * 0.5;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      return new Phaser.Math.Vector2(cx + Math.cos(a) * r, y + Math.sin(a) * r);
    });
    g.fillStyle(i < count ? 0xf2c14e : 0xd9cfc0, 1).fillPoints(pts, true);
    g.lineStyle(3, INK, 1).strokePoints(pts, true);
  }
  return g;
}
