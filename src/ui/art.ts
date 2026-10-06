import Phaser from 'phaser';
import type { DamageId, ToolId, UtilityToolId } from '../data/conservation';
import type { Culture, Motif } from '../data/cultures';
import { INK, PAPER, hex } from './theme';

// Procedural placeholder art for damage spots, tool icons, skylines and artifacts (no external images).

export const DAMAGE_SIZE = 84;
export const TOOL_SIZE = 64;

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
  insects: (g) => {
    g.lineStyle(3, INK, 1);
    for (const y of [36, 44, 52]) g.lineBetween(28, y, 56, y + 4).lineBetween(56, y, 28, y + 4);
    g.lineBetween(38, 26, 32, 16).lineBetween(46, 26, 52, 16);
    g.fillStyle(0x7a4a1e, 1).fillEllipse(42, 46, 22, 30).fillStyle(0x4a2a12, 1).fillCircle(42, 28, 7);
    g.lineStyle(3, INK, 1).strokeEllipse(42, 46, 22, 30).strokeCircle(42, 28, 7).lineBetween(42, 32, 42, 60);
  },
  bronzeDisease: (g, r) => { blobs(g, r, 6, 0x6b4e2e, 8, 12); blobs(g, r, 14, 0x5fd38d, 2, 6); },
  corrosion: (g, r) => { blobs(g, r, 8, 0xb8662f, 5, 10); blobs(g, r, 6, 0x3f8f6f, 3, 6); },
  rootDamage: (g, r) => lines(g, r, 5, 0x6b4426, 4),
  oldRepair: (g) => { g.fillStyle(0xb48ad9, 1).fillRoundedRect(24, 26, 36, 32, 6); g.lineStyle(3, INK, 1).strokeRoundedRect(24, 26, 36, 32, 6); },
  yellowedVarnish: (g, r) => blobs(g, r, 5, 0xe3c341, 10, 16, 0.75),
};

const TOOL_DRAW: Record<ToolId | UtilityToolId, (g: G) => void> = {
  brush: (g) => {
    // Flat conservator's brush on a diagonal: handle, metal ferrule, then a fan of bristles.
    const n = (k: number, x: number, y: number) => new Phaser.Math.Vector2(x + k * 0.707, y + k * 0.707);
    g.lineStyle(9, INK, 1).lineBetween(10, 56, 30, 36).lineStyle(5, 0xb4553a, 1).lineBetween(10, 56, 30, 36);
    const ferrule = [n(-6, 30, 36), n(6, 30, 36), n(6, 37, 29), n(-6, 37, 29)];
    const bristles = [n(-7, 37, 29), n(7, 37, 29), n(13, 52, 14), n(-13, 52, 14)];
    g.fillStyle(0x9aa5b1, 1).fillPoints(ferrule, true).lineStyle(3, INK, 1).strokePoints(ferrule, true);
    g.fillStyle(0xf3e3c3, 1).fillPoints(bristles, true).lineStyle(3, INK, 1).strokePoints(bristles, true);
    g.lineStyle(1.5, 0x9c8a6a, 1);
    for (const k of [-5, 0, 5]) g.lineBetween(37 + k * 0.707, 29 + k * 0.707, 52 + k * 1.3, 14 + k * 1.3);
  },
  camera: (g) => {
    g.fillStyle(0x3a3a40, 1).fillRoundedRect(8, 20, 48, 32, 6).fillRect(18, 14, 14, 8);
    g.fillStyle(0x8fd0f0, 1).fillCircle(34, 36, 11).fillStyle(0xffffff, 1).fillCircle(30, 32, 3).fillStyle(0xe0457b, 1).fillCircle(48, 26, 3);
    g.lineStyle(3, INK, 1).strokeRoundedRect(8, 20, 48, 32, 6).strokeCircle(34, 36, 11);
  },
  uvLamp: (g) => {
    g.fillStyle(0x8e44ff, 0.35).fillTriangle(40, 32, 62, 14, 62, 50);
    g.fillStyle(0x4a4a52, 1).fillRoundedRect(6, 26, 26, 12, 4).fillRoundedRect(30, 22, 12, 20, 3);
    g.fillStyle(0xb48ad9, 1).fillRect(40, 24, 4, 16);
    g.lineStyle(3, INK, 1).strokeRoundedRect(6, 26, 26, 12, 4).strokeRoundedRect(30, 22, 12, 20, 3);
  },
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
  return `tool-${id}`;
}

/** Called once from Boot. */
export function generateTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({}, false);
  for (const [id, draw] of Object.entries(DAMAGE_DRAW)) {
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
    ctx.drawImage(scene.textures.get(`dmg-${id}`).getSourceImage() as CanvasImageSource, 0, 0);
    tex.refresh();
  }
  // Effects: sparks for restores, a soft eraser that cleans the artifact panel, a lamp glow for dark levels,
  // a gold tile piece (tiles twist) and a red ring marking fragile damage.
  g.clear().fillStyle(0xffffff, 1).fillTriangle(8, 0, 10, 8, 6, 8).fillTriangle(8, 16, 10, 8, 6, 8).fillTriangle(0, 8, 8, 6, 8, 10).fillTriangle(16, 8, 8, 6, 8, 10);
  g.generateTexture('spark', 16, 16);
  radial(scene, 'eraser', 48, 'rgba(0,0,0,1)', 'rgba(0,0,0,0)');
  radial(scene, 'light', 560, 'rgba(0,0,0,1)', 'rgba(0,0,0,0)', 0.45);
  g.clear().fillStyle(0xf2c14e, 1).fillRoundedRect(8, 8, 56, 56, 8).fillStyle(0x1f4e8c, 1).fillCircle(36, 36, 15).fillStyle(0xfff6e6, 1).fillCircle(36, 36, 6);
  g.lineStyle(4, INK, 1).strokeRoundedRect(8, 8, 56, 56, 8);
  g.generateTexture('tile-piece', 72, 72);
  g.clear().lineStyle(7, 0xc0392b, 1).strokeCircle(48, 48, 44).lineStyle(2, INK, 1).strokeCircle(48, 48, 47);
  g.generateTexture('fragile-ring', 96, 96);
  // Fallback avatar if a culture's rig failed to load.
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
      case 'torii': // Fuji-like peak behind a torii gate
        g.fillTriangle(x + 150, base, x + 330, base, x + 240, base - 180);
        g.fillRect(x + 40, base - 130, 14, 130).fillRect(x + 120, base - 130, 14, 130);
        g.fillRect(x + 18, base - 146, 138, 14).fillRect(x + 32, base - 112, 110, 9);
        break;
      case 'stupa': // stupa dome and a stepped temple tower
        g.fillEllipse(x + 90, base - 40, 150, 120).fillRect(x + 84, base - 150, 12, 60).fillRect(x + 20, base - 20, 140, 20);
        for (let s = 0; s < 6; s++) g.fillRect(x + 200 + s * 8, base - (s + 1) * 30, 100 - s * 16, 30);
        break;
      case 'dome': // onion dome between two minarets
        g.fillRect(x + 70, base - 90, 160, 90).fillEllipse(x + 150, base - 110, 120, 110).fillTriangle(x + 135, base - 160, x + 165, base - 160, x + 150, base - 200);
        g.fillRect(x + 44, base - 200, 16, 200).fillRect(x + 240, base - 200, 16, 200).fillCircle(x + 52, base - 204, 12).fillCircle(x + 248, base - 204, 12);
        break;
      case 'benin': // palace walls and conical roofs
        g.fillRect(x, base - 50, 320, 50);
        for (const hx of [60, 220]) g.fillRect(x + hx - 45, base - 110, 90, 60).fillTriangle(x + hx - 65, base - 110, x + hx + 65, base - 110, x + hx, base - 190);
        break;
      case 'angkor': // three lotus-bud towers
        for (const [tx, tall] of [[70, 0.75], [160, 1], [250, 0.75]] as const)
          for (let s = 0; s < 5; s++) {
            const tw = (70 - s * 12) * tall, th = 34 * tall;
            g.fillRect(x + tx - tw / 2, base - (s + 1) * th, tw, th);
            if (s === 4) g.fillEllipse(x + tx, base - (s + 1) * th - 10, tw, 30);
          }
        break;
      case 'sahel': // Djenné-style mud mosque with toron sticks
        g.fillRect(x + 30, base - 120, 260, 120);
        for (const tx of [40, 110, 180, 250]) g.fillRect(x + tx, base - 170, 30, 60).fillEllipse(x + tx + 15, base - 170, 30, 24);
        g.fillStyle(mixInt(color, 0x000000, 0.25), 1);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) g.fillRect(x + 40 + c * 44, base - 100 + r * 30, 22, 5);
        g.fillStyle(color, 1);
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
    case 'torii': // black-and-red lacquer box with gold waves
      g.fillStyle(0x1e1418, 1).fillRoundedRect(w * 0.12, h * 0.2, w * 0.76, h * 0.6, 10);
      g.fillStyle(0x8c1c13, 1).fillRect(w * 0.12, h * 0.44, w * 0.76, h * 0.1);
      g.lineStyle(3, 0xd4a83a, 1);
      for (let i = 0; i < 4; i++) g.strokeCircle(w * (0.25 + i * 0.17), h * 0.33, 10);
      break;
    case 'stupa': // Chola bronze dancer in a ring of fire
      g.lineStyle(6, 0xb8662f, 1).strokeCircle(w / 2, h / 2, h * 0.38);
      g.fillStyle(0x8a5a2b, 1).fillCircle(w / 2, h * 0.3, 10).fillRect(w / 2 - 6, h * 0.36, 12, 34);
      g.lineStyle(5, 0x8a5a2b, 1).lineBetween(w / 2 - 34, h * 0.42, w / 2 + 34, h * 0.36).lineBetween(w / 2, h * 0.68, w / 2 + 26, h * 0.8).lineBetween(w / 2, h * 0.68, w / 2 - 30, h * 0.6);
      break;
    case 'dome': // blue tiles with eight-point stars
      for (let ty = 0; ty < 2; ty++)
        for (let tx = 0; tx < 4; tx++) {
          const s = (w - 12) / 4, cx = 6 + tx * s + s / 2, cy = 10 + ty * (h - 20) / 2 + (h - 20) / 4;
          g.fillStyle(ground, 1).fillRect(cx - s / 2 + 1, cy - (h - 20) / 4 + 1, s - 2, (h - 20) / 2 - 2);
          g.fillStyle(accent, 1).fillRect(cx - 12, cy - 12, 24, 24);
          g.fillPoints([0, 1, 2, 3].map((k) => new Phaser.Math.Vector2(cx + Math.cos(k * Math.PI / 2) * 17, cy + Math.sin(k * Math.PI / 2) * 17)), true);
        }
      break;
    case 'benin': // bronze plaque with a raised figure
      g.fillStyle(0x8a5a2b, 1).fillRect(w * 0.2, 6, w * 0.6, h - 12);
      g.fillStyle(0xb07a3e, 1).fillCircle(w / 2, h * 0.3, 16).fillRect(w / 2 - 18, h * 0.42, 36, h * 0.4);
      for (let i = 0; i < 8; i++) g.fillStyle(0x5e3c1c, 1).fillCircle(w * 0.24, 16 + i * (h - 32) / 7, 3).fillCircle(w * 0.76, 16 + i * (h - 32) / 7, 3);
      break;
    case 'angkor': // sandstone relief with a row of apsaras
      g.fillStyle(0xb5a284, 1).fillRect(6, 6, w - 12, h - 12);
      for (let i = 0; i < 5; i++) {
        const cx = 26 + i * (w - 52) / 4;
        g.fillStyle(0x7d6b4f, 1).fillCircle(cx, h * 0.35, 9).fillTriangle(cx - 16, h * 0.8, cx + 16, h * 0.8, cx, h * 0.42);
      }
      break;
    case 'sahel': // manuscript page with lines of script
      g.fillStyle(0xf3e3c3, 1).fillRect(w * 0.15, 6, w * 0.7, h - 12);
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 6; c++) g.fillStyle(r === 0 ? 0x9c2a1c : 0x2b1d2e, 1).fillRect(w * 0.2 + c * w * 0.1, 18 + r * (h - 36) / 7, w * 0.07, 3);
      break;
    default:
      g.fillStyle(accent, 1).fillCircle(w / 2, h / 2, h * 0.32);
  }
  g.lineStyle(4, INK, 1).strokeRect(0, 0, w, h);
}

function mixInt(a: number, b: number, t: number) {
  const ca = Phaser.Display.Color.IntegerToColor(a), cb = Phaser.Display.Color.IntegerToColor(b);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, t * 100);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

/** Soft round gradient texture: solid out to `inner` × radius, then fading to the edge. */
function radial(scene: Phaser.Scene, key: string, size: number, from: string, to: string, inner = 0) {
  const tex = scene.textures.createCanvas(key, size, size)!;
  const ctx = tex.getContext();
  const r = size / 2;
  const grad = ctx.createRadialGradient(r, r, r * inner, r, r, r);
  grad.addColorStop(0, from);
  grad.addColorStop(1, to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}
