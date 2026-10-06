import Phaser from 'phaser';
import type { DamageId, ToolId, UtilityToolId } from '../data/conservation';
import type { Culture, Motif } from '../data/cultures';
import { INK, PAPER, hex } from './theme';

// Procedural placeholder art. Where the jam has a hand-drawn prop (public/assets/props) we use it instead.

export const DAMAGE_SIZE = 84;
export const TOOL_SIZE = 64;

const PROP_DAMAGE: Partial<Record<DamageId, string>> = { insects: 'prop-bug', crack: 'prop-crack', foxing: 'prop-stain' };
const PROP_TOOL: Partial<Record<ToolId | UtilityToolId, string>> = { brush: 'prop-brush', camera: 'prop-camera', uvLamp: 'prop-uv' };

type G = Phaser.GameObjects.Graphics;
type Rng = Phaser.Math.RandomDataGenerator;

const blobs = (g: G, r: Rng, n: number, color: number, min: number, max: number, alpha = 1) => {
  for (let i = 0; i < n; i++) g.fillStyle(color, alpha).fillCircle(r.between(22, 62), r.between(22, 62), r.between(min, max));
};
const lines = (g: G, r: Rng, n: number, color: number, width: number) => {
  for (let i = 0; i < n; i++) {
    let x = r.between(20, 64), y = r.between(20, 64);
    g.lineStyle(width, color, 1).beginPath().moveTo(x, y);
    for (let k = 0; k < 4; k++) g.lineTo((x += r.between(-12, 12)), (y += r.between(-12, 12)));
    g.strokePath();
  }
};
const shards = (g: G, r: Rng, n: number, color: number) => {
  for (let i = 0; i < n; i++) {
    const x = r.between(22, 58), y = r.between(22, 58), s = r.between(6, 12);
    g.fillStyle(color, 1).fillTriangle(x, y, x + s, y + r.between(-4, 4), x + r.between(0, s), y + s);
    g.lineStyle(2, INK, 1).strokeTriangle(x, y, x + s, y + r.between(-4, 4), x + r.between(0, s), y + s);
  }
};

const DAMAGE_DRAW: Record<DamageId, (g: G, r: Rng) => void> = {
  grime: (g, r) => blobs(g, r, 14, 0x7a5c3e, 3, 9, 0.8),
  soot: (g, r) => blobs(g, r, 10, 0x2e2a2a, 6, 14, 0.7),
  biofilm: (g, r) => { blobs(g, r, 8, 0x9bb547, 5, 11); blobs(g, r, 6, 0xd9c84a, 3, 7); },
  mould: (g, r) => { blobs(g, r, 18, 0xe8efe0, 2, 6); blobs(g, r, 8, 0x8fa88a, 2, 4); },
  salts: (g, r) => {
    for (let i = 0; i < 16; i++) {
      const x = r.between(20, 62), y = r.between(20, 62);
      g.fillStyle(0xffffff, 1).fillRect(x, y, 5, 5).lineStyle(1, 0x9aa5b1).strokeRect(x, y, 5, 5);
    }
  },
  blackCrust: (g, r) => { blobs(g, r, 6, 0x1a1a1a, 8, 14); blobs(g, r, 6, 0x4a4a4a, 3, 6); },
  flakingPaint: (g, r) => shards(g, r, 7, 0xc4622d),
  lacquerLifting: (g, r) => shards(g, r, 7, 0x8c1c13),
  glazeLoss: (g, r) => { g.fillStyle(0x1f4e8c, 1).fillRect(20, 20, 44, 44); shards(g, r, 5, 0xf3ead7); },
  spalling: (g, r) => shards(g, r, 8, 0x9c9184),
  crack: (g, r) => lines(g, r, 4, INK, 3),
  tear: (g, r) => { g.fillStyle(0xf3e6cf, 1).fillRect(20, 22, 44, 40); g.fillStyle(0x3a2a2a, 1).fillTriangle(40, 22, 46, 22, 42, 62); lines(g, r, 1, INK, 2); },
  foxing: (g, r) => blobs(g, r, 10, 0xa0622d, 2, 5),
  creases: (g, r) => { g.fillStyle(0xf3e6cf, 1).fillRect(20, 20, 44, 44); g.lineStyle(2, 0x9c8a6a, 1); for (let i = 0; i < 4; i++) g.lineBetween(20, r.between(22, 62), 64, r.between(22, 62)); },
  insects: (g, r) => blobs(g, r, 6, 0x5a3a1a, 3, 5),
  bronzeDisease: (g, r) => { blobs(g, r, 6, 0x6b4e2e, 8, 12); blobs(g, r, 14, 0x5fd38d, 2, 6); },
  corrosion: (g, r) => { blobs(g, r, 8, 0xb8662f, 5, 10); blobs(g, r, 6, 0x3f8f6f, 3, 6); },
  rootDamage: (g, r) => lines(g, r, 5, 0x6b4426, 4),
  oldRepair: (g) => { g.fillStyle(0xb48ad9, 1).fillRoundedRect(24, 26, 36, 32, 6); g.lineStyle(3, INK, 1).strokeRoundedRect(24, 26, 36, 32, 6); },
  yellowedVarnish: (g, r) => blobs(g, r, 5, 0xe3c341, 10, 16, 0.75),
};

const TOOL_DRAW: Record<Exclude<ToolId, 'brush'>, (g: G) => void> = {
  wash: (g) => { g.fillStyle(0x5aa9e6, 1).fillCircle(32, 40, 14).fillTriangle(18, 36, 46, 36, 32, 10); g.lineStyle(3, INK, 1).strokeCircle(32, 40, 14); },
  poultice: (g) => { g.fillStyle(0xd9c7a7, 1).fillRoundedRect(12, 24, 40, 28, 6); g.fillStyle(0xf3ead7, 1).fillEllipse(32, 24, 40, 12); g.lineStyle(3, INK, 1).strokeRoundedRect(12, 24, 40, 28, 6).strokeEllipse(32, 24, 40, 12); },
  consolidant: (g) => { g.fillStyle(0xc0c4c8, 1).fillRoundedRect(28, 8, 8, 30, 3); g.fillStyle(0x8c5a2b, 1).fillRoundedRect(26, 36, 12, 22, 4); g.fillStyle(0xf2c14e, 1).fillCircle(46, 18, 6); g.lineStyle(3, INK, 1).strokeRoundedRect(28, 8, 8, 30, 3).strokeRoundedRect(26, 36, 12, 22, 4); },
  bond: (g) => { g.fillStyle(0xf3ead7, 1).fillRoundedRect(14, 22, 30, 20, 5); g.fillStyle(0xc4622d, 1).fillTriangle(44, 26, 44, 38, 54, 32); g.lineStyle(3, INK, 1).strokeRoundedRect(14, 22, 30, 20, 5); },
  anoxia: (g) => { g.fillStyle(0xbfe3f2, 0.9).fillRoundedRect(12, 14, 40, 40, 8); g.fillStyle(0x2a9d8f, 1).fillRect(12, 14, 40, 6); g.lineStyle(3, INK, 1).strokeRoundedRect(12, 14, 40, 40, 8); },
  scalpel: (g) => { g.fillStyle(0x8c8f94, 1).fillRect(14, 30, 26, 6); g.fillStyle(0xe6e9ec, 1).fillTriangle(40, 28, 40, 38, 56, 30); g.lineStyle(3, INK, 1).strokeRect(14, 30, 26, 6).strokeTriangle(40, 28, 40, 38, 56, 30); },
  solventGel: (g) => { g.fillStyle(0x9be3c6, 0.9).fillRoundedRect(16, 18, 32, 36, 6); g.fillStyle(0x4a4a4a, 1).fillRect(20, 10, 24, 10); g.lineStyle(3, INK, 1).strokeRoundedRect(16, 18, 32, 36, 6).strokeRect(20, 10, 24, 10); },
};

export function damageTexture(id: DamageId) {
  return `spot-${id}`;
}

export function toolTexture(id: ToolId | UtilityToolId) {
  return PROP_TOOL[id] ?? `tool-${id}`;
}

/** Called once from Boot after props are loaded. */
export function generateTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({}, false);
  for (const [id, draw] of Object.entries(DAMAGE_DRAW)) {
    if (PROP_DAMAGE[id as DamageId]) continue;
    g.clear();
    draw(g, new Phaser.Math.RandomDataGenerator([id]));
    g.generateTexture(`dmg-${id}`, DAMAGE_SIZE, DAMAGE_SIZE);
  }
  for (const [id, draw] of Object.entries(TOOL_DRAW)) {
    g.clear();
    draw(g);
    g.generateTexture(`tool-${id}`, TOOL_SIZE, TOOL_SIZE);
  }
  // Every damage spot sits on a paper disc so it reads against any background palette.
  // Composited on a 2D canvas: independent of WebGL render timing, and kept by the texture manager across scenes.
  const c = DAMAGE_SIZE / 2;
  for (const id of Object.keys(DAMAGE_DRAW) as DamageId[]) {
    const tex = scene.textures.createCanvas(`spot-${id}`, DAMAGE_SIZE, DAMAGE_SIZE)!;
    const ctx = tex.getContext();
    ctx.fillStyle = 'rgba(255, 246, 230, 0.75)';
    ctx.strokeStyle = '#2b1d2e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c, c, c - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const prop = PROP_DAMAGE[id];
    const src = scene.textures.get(prop ?? `dmg-${id}`).getSourceImage() as CanvasImageSource;
    if (prop) ctx.drawImage(src, c - 31, c - 31, 62, 62);
    else ctx.drawImage(src, 0, 0);
    tex.refresh();
  }
  // Placeholder avatar for cultures without hand-drawn sprites yet.
  g.clear();
  g.fillStyle(PAPER, 1).fillEllipse(64, 150, 70, 90);
  g.fillStyle(0xd9a066, 1).fillCircle(64, 80, 46).fillTriangle(26, 60, 40, 14, 56, 46).fillTriangle(102, 60, 88, 14, 72, 46);
  g.fillStyle(INK, 1).fillCircle(80, 78, 6);
  g.lineStyle(4, INK, 1).strokeCircle(64, 80, 46).strokeEllipse(64, 150, 70, 90);
  g.generateTexture('avatar-placeholder', 128, 200);
  g.destroy();
}

/** Distant skyline for the parallax layer, tiling horizontally across `w`. */
export function drawSkyline(g: G, motif: Motif, w: number, h: number, color: number) {
  g.fillStyle(color, 1);
  const base = h;
  for (let x = 0; x < w; x += 320) {
    switch (motif) {
      case 'mesoamerican':
        for (let s = 0; s < 5; s++) g.fillRect(x + 40 + s * 18, base - (s + 1) * 34, 200 - s * 36, 34);
        g.fillRect(x + 125, base - 200, 30, 30);
        break;
      case 'azulejo':
        g.fillRect(x + 20, base - 120, 120, 120).fillRect(x + 170, base - 160, 110, 160);
        g.fillTriangle(x + 10, base - 120, x + 150, base - 120, x + 80, base - 170);
        g.fillCircle(x + 225, base - 165, 34);
        break;
      case 'pagoda':
        for (let s = 0; s < 4; s++) {
          const y = base - s * 50, half = 90 - s * 16;
          g.fillRect(x + 160 - half / 2, y - 40, half, 40).fillTriangle(x + 160 - half, y - 34, x + 160 + half, y - 34, x + 160, y - 62);
        }
        break;
      case 'egyptian':
        g.fillTriangle(x + 10, base, x + 170, base, x + 90, base - 170).fillTriangle(x + 150, base, x + 290, base, x + 220, base - 120);
        break;
      case 'classical':
        g.fillRect(x + 30, base - 20, 260, 20).fillRect(x + 30, base - 150, 260, 22).fillTriangle(x + 30, base - 150, x + 290, base - 150, x + 160, base - 200);
        for (let c = 0; c < 6; c++) g.fillRect(x + 44 + c * 44, base - 130, 18, 112);
        break;
      case 'andean':
        g.fillTriangle(x - 40, base, x + 360, base, x + 150, base - 220);
        for (let s = 0; s < 4; s++) g.fillRect(x + 60 + s * 20, base - 40 - s * 22, 200 - s * 40, 6);
        break;
      default:
        g.fillEllipse(x + 160, base, 360, 220);
    }
  }
}

/** The relic shown in the HUD panel; restored as the player treats damage. */
export function drawArtifact(g: G, c: Culture, w: number, h: number) {
  const accent = hex(c.palette.accent), ground = hex(c.palette.ground), sky = hex(c.palette.sky);
  g.fillStyle(sky, 1).fillRect(0, 0, w, h);
  switch (c.motif) {
    case 'mesoamerican': // mural band of glyph blocks
      for (let i = 0; i < 6; i++) {
        g.fillStyle(i % 2 ? ground : accent, 1).fillRoundedRect(8 + i * (w - 16) / 6, h * 0.25, (w - 16) / 6 - 6, h * 0.5, 8);
        g.fillStyle(PAPER, 1).fillCircle(8 + (i + 0.5) * (w - 16) / 6 - 3, h * 0.45, 8);
      }
      break;
    case 'azulejo': // blue-and-white tile grid
      for (let ty = 0; ty < 3; ty++)
        for (let tx = 0; tx < 5; tx++) {
          const s = Math.min((w - 12) / 5, (h - 12) / 3), x = 6 + tx * s, y = 6 + ty * s;
          g.fillStyle(0xf8f4ea, 1).fillRect(x, y, s - 2, s - 2);
          g.fillStyle(ground, 1).fillCircle(x + s / 2, y + s / 2, s * 0.28).fillRect(x, y, 6, 6).fillRect(x + s - 8, y + s - 8, 6, 6);
        }
      break;
    case 'pagoda': // hanging scroll with mountains
      g.fillStyle(0xf3e6cf, 1).fillRect(w * 0.2, 6, w * 0.6, h - 12);
      g.fillStyle(accent, 1).fillTriangle(w * 0.25, h * 0.8, w * 0.5, h * 0.25, w * 0.65, h * 0.8).fillTriangle(w * 0.45, h * 0.8, w * 0.65, h * 0.4, w * 0.78, h * 0.8);
      g.fillStyle(ground, 1).fillRect(w * 0.18, 4, w * 0.64, 8).fillRect(w * 0.18, h - 12, w * 0.64, 8);
      break;
    case 'egyptian': // coffin lid bands
      g.fillStyle(0xc08a3e, 1).fillRoundedRect(w * 0.15, 6, w * 0.7, h - 12, 30);
      for (let i = 0; i < 4; i++) g.fillStyle(i % 2 ? accent : 0xc4622d, 1).fillRect(w * 0.18, h * (0.35 + i * 0.12), w * 0.64, h * 0.07);
      g.fillStyle(0xf2c14e, 1).fillCircle(w / 2, h * 0.2, h * 0.1);
      break;
    case 'classical': // black-figure amphora
      g.fillStyle(0xc4622d, 1).fillEllipse(w / 2, h * 0.55, w * 0.4, h * 0.7).fillRect(w * 0.43, 6, w * 0.14, h * 0.25);
      g.fillStyle(INK, 1).fillCircle(w * 0.45, h * 0.5, 8).fillRect(w * 0.43, h * 0.55, 8, 22).fillCircle(w * 0.56, h * 0.5, 8).fillRect(w * 0.54, h * 0.55, 8, 22);
      break;
    case 'andean': // stepped-pattern textile
      for (let i = 0; i < 5; i++) g.fillStyle([ground, accent, 0xf3ead7, accent, ground][i], 1).fillRect(6, 6 + i * (h - 12) / 5, w - 12, (h - 12) / 5);
      for (let i = 0; i < 6; i++) g.fillStyle(INK, 1).fillRect(14 + i * (w - 28) / 6, h * 0.45, 14, 14);
      break;
    default:
      g.fillStyle(accent, 1).fillCircle(w / 2, h / 2, h * 0.32);
  }
  g.lineStyle(4, INK, 1).strokeRect(0, 0, w, h);
}
