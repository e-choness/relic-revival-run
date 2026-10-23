import Phaser from 'phaser';
import { AudioDirector } from '../audio/AudioDirector';

// A conservator's field journal: paper slips with hand-inked outlines, in colours taken from the paintings.
export const FONT_DISPLAY = 'Borel, cursive';
export const FONT_BODY = '"Edu SA Beginner", cursive';
export const INK = 0x2b1d2e;
export const INK_CSS = '#2b1d2e';
export const PAPER = 0xfbf1dc;
export const PAPER_CSS = '#fbf1dc';
/** Selected tool, "new" notes, primary actions. */
export const ACCENT = 0xc4622d;
export const ACCENT_CSS = '#c4622d';
/** Streaks, hints, timers, tape. */
export const OCHRE = 0xe2a93b;
export const OCHRE_CSS = '#e2a93b';
/** Artifact condition. */
export const TEAL = 0x2a8c82;
/** Ink outline for text placed straight on the artwork. */
export const INKED: Partial<Phaser.Types.GameObjects.Text.TextStyle> = { color: '#fbf1dc', stroke: '#2b1d2e', strokeThickness: 6 };
/** Touch screens get on-screen Jump/Reveal/Photo buttons; mice reveal and photograph with their buttons. */
export const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
export const WIDTH = 1280;
export const HEIGHT = 720;
/** Respect the OS setting: no camera shake or screen flashes. */
export const REDUCED_MOTION = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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

/** Uneven corner radii, so a frame reads as drawn by hand rather than ruled. */
function sketchRadii(radius: number, w: number, h: number) {
  const r = Math.min(radius, w / 2 - 1, h / 2 - 1);
  return { tl: r * 0.85, tr: r, br: r * 0.75, bl: r * 0.95 };
}

/** A paper slip: hand-inked outline over a hard ink shadow. Draws into `g` (centre x, y). */
export function slip(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill = PAPER, radius = 18, line = 2.5) {
  const radii = sketchRadii(radius, w, h);
  g.fillStyle(INK, 0.85).fillRoundedRect(x - w / 2 + 3, y - h / 2 + 4, w, h, radii);
  g.fillStyle(fill, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, radii);
  g.lineStyle(line, INK, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, radii);
  return g;
}

/** Paper card: a slip as its own Graphics object. */
export function card(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill = PAPER, radius = 18) {
  return slip(scene.add.graphics(), x, y, w, h, fill, radius, 3);
}

/** A strip of translucent tape, for pinned things (polaroids, menu cards). */
export function tape(scene: Phaser.Scene, x: number, y: number, w = 56, angle = -4) {
  return scene.add.rectangle(x, y, w, 16, OCHRE, 0.7).setStrokeStyle(1, INK, 0.25).setAngle(angle);
}

export function button(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, w = 240, fill = PAPER, h = 56) {
  const c = scene.add.container(x, y);
  const bg = slip(scene.add.graphics(), 0, 0, w, h, fill, 18);
  const size = Math.round(h * 0.47);
  const t = label(scene, 0, 0, text, size, fill === ACCENT ? { color: PAPER_CSS } : {});
  if (t.width > w - 30) t.setFontSize(Math.max(16, Math.floor(size * (w - 30) / t.width)));
  c.add([bg, t]);
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  const hover = (scale: number) => {
    scene.tweens.killTweensOf(c);
    scene.tweens.add({ targets: c, scale, duration: REDUCED_MOTION ? 0 : 90 });
  };
  c.on('pointerover', () => hover(REDUCED_MOTION ? 1 : 1.03));
  c.on('pointerout', () => hover(1));
  const activate = () => {
    AudioDirector.get().sfx('click');
    onClick();
  };
  // Stored so keyboard/gamepad navigation (menuNav.ts) can press it too.
  c.setData('activate', activate);
  c.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
    e.stopPropagation();
    activate();
  });
  return c;
}

/** A flat menu row (pause menu): ink text that gets an ochre wash under the pointer. */
export function rowButton(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, w = 288, h = 48) {
  const c = scene.add.container(x, y);
  const wash = scene.add.graphics().fillStyle(OCHRE, 0.45).fillRoundedRect(-w / 2, -h / 2, w, h, { tl: 11, tr: 14, br: 10, bl: 13 }).setVisible(false);
  c.add([wash, label(scene, 0, 0, text, 22)]);
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  c.on('pointerover', () => wash.setVisible(true));
  c.on('pointerout', () => wash.setVisible(false));
  const activate = () => {
    AudioDirector.get().sfx('click');
    onClick();
  };
  c.setData('activate', activate);
  c.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
    e.stopPropagation();
    activate();
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
    g.fillStyle(i < count ? OCHRE : 0xd9cfc0, 1).fillPoints(pts, true);
    g.lineStyle(3, INK, 1).strokePoints(pts, true);
  }
  return g;
}
