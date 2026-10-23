// Media kit studio (dev-only): draws banners, logos, icons, the cast and collages from the game's own art.
// scripts/media-kit.cjs drives window.studio and writes the PNGs to media/. Everything is drawn with
// Canvas 2D from deterministic inputs, so animation frames are exact and regenerating gives the same kit.
import { CULTURES, type Culture } from '../../src/data/cultures';
import { DEFAULT_RUN, idlePose, runPose, svgTransforms, type Pose } from '../../src/art/rig';
import { loopCanvas, PARALLAX_SPEED, sceneryFamily } from '../../src/art/loopTexture';
import { renderAvatar } from '../../src/art/stylize';
import type { AvatarDoc, PartId } from '../../src/art/types';

const INK = '#2b1d2e', PAPER = '#fbf1dc', ACCENT = '#c4622d', OCHRE = '#e2a93b', TEAL = '#2a8c82';
const DISPLAY = 'Borel', BODY = 'Edu SA Beginner';
/** The avatar sources' frame, as the art preview uses it. */
const VIEW = { x: 100, y: -20, w: 850, h: 1040 };
/** Game units: the run's ground line and the avatar height on it. */
const GROUND_Y = 620, AVATAR_H = 150;

type Ctx = CanvasRenderingContext2D;

// ---------- loading ----------

async function loadFonts() {
  const fonts: [string, string][] = [[DISPLAY, '/assets/fonts/Borel-Regular.ttf'], [BODY, '/assets/fonts/EduSABeginner-VariableFont_wght.ttf']];
  await Promise.all(fonts.map(async ([family, url]) => document.fonts.add(await new FontFace(family, `url(${url})`).load())));
}

const image = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error(`Could not load ${src}`));
  img.src = src;
});

interface Cast { culture: Culture; svg: SVGSVGElement; groups: SVGGElement[]; feet: number; centre: number }
const cast: Cast[] = [];
const docs = new Map<string, AvatarDoc>();
const landscapes = new Map<string, HTMLCanvasElement>();
const artifacts = new Map<string, HTMLImageElement>();

async function loadCast() {
  for (const culture of CULTURES) {
    const { defs, body } = renderAvatar(docs.get(culture.id)!, { idPrefix: culture.id });
    const svg = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}"><defs>${defs}</defs>${body}</svg>`,
      'image/svg+xml',
    ).documentElement as unknown as SVGSVGElement;
    const entry: Cast = { culture, svg, groups: [...svg.querySelectorAll<SVGGElement>('[data-part]')], feet: 1, centre: 0.5 };
    // Where the feet and the body's centre fall in the frame, measured once from a standing render.
    const probe = await rasterize(entry, idlePose(0), 520);
    const c = canvas(probe.width, probe.height), ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(probe, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let bottom = 0, left = c.width, right = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (data[(y * c.width + x) * 4 + 3] > 40) {
      bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x);
    }
    entry.feet = bottom / c.height;
    entry.centre = (left + right) / 2 / c.width;
    cast.push(entry);
  }
}

/** Pose the vector avatar and rasterize it at `height` px (frame height). */
async function rasterize(entry: Cast, pose: Pose, height: number) {
  const doc = docs.get(entry.culture.id)!;
  const transforms = svgTransforms(doc, pose);
  for (const g of entry.groups) g.setAttribute('transform', transforms[g.dataset.part as PartId] ?? '');
  entry.svg.setAttribute('width', String(Math.round(height * VIEW.w / VIEW.h)));
  entry.svg.setAttribute('height', String(Math.round(height)));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(entry.svg)], { type: 'image/svg+xml' }));
  try {
    return await image(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function loadDocs() {
  for (const c of CULTURES) docs.set(c.id, await fetch(`/avatars/${c.avatar.rig}.avatar.json`).then((r) => r.json()));
}

async function loadLandscape(id: string) {
  for (const asset of [id, sceneryFamily(id), 'path']) {
    if (landscapes.has(asset)) continue;
    landscapes.set(asset, loopCanvas(await image(`/assets/backgrounds/${asset}-v3.webp`)));
  }
}

const ready = (async () => {
  await loadFonts();
  await loadDocs();
  await loadCast();
  await Promise.all(CULTURES.map(async (c) => {
    await loadLandscape(c.id);
    artifacts.set(c.id, await image(`/assets/artifacts/${c.id}-v1.webp`));
  }));
})();

// ---------- drawing helpers ----------

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** The run's three layers, in game units (1280 × 720, ground at 620), scrolled by `distance`. */
function drawScene(ctx: Ctx, id: string, width: number, distance = 0) {
  const far = landscapes.get(id)!, middle = landscapes.get(sceneryFamily(id))!, path = landscapes.get('path')!;
  const tile = (img: HTMLCanvasElement, y: number, height: number, sx: number, factor: number) => {
    const w = img.width * sx, offset = ((distance * factor) % w + w) % w;
    for (let x = -offset; x < width; x += w) ctx.drawImage(img, x, y, w, height);
  };
  const farScale = GROUND_Y / (far.height * 0.84);
  tile(far, 0, far.height * farScale, farScale, PARALLAX_SPEED.distance);
  tile(middle, GROUND_Y - 290 + 35, 290, 290 / middle.height, PARALLAX_SPEED.middle);
  tile(path, GROUND_Y, 100, 0.65, PARALLAX_SPEED.ground);
}

/** Draw a restorer with its feet at (x, y), `height` px tall (body height, as in the game). */
async function drawAvatar(ctx: Ctx, index: number, pose: Pose, x: number, y: number, height: number, flip = false) {
  const entry = cast[index];
  const frameH = height / (entry.feet - 0.06);
  // Rasterized at twice the drawn size, so scaled-up outputs stay sharp.
  const img = await rasterize(entry, pose, frameH * 2);
  const w = frameH * VIEW.w / VIEW.h;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w * entry.centre, -frameH * entry.feet, w, frameH);
  ctx.restore();
}

/** Paper text with an ink outline, for type placed on the art. */
function inked(ctx: Ctx, text: string, x: number, y: number, size: number, font = DISPLAY, align: CanvasTextAlign = 'center', stroke = 0.2) {
  ctx.save();
  ctx.font = `${size}px "${font}"`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * stroke;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = PAPER;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function inkText(ctx: Ctx, text: string, x: number, y: number, size: number, font = BODY, align: CanvasTextAlign = 'center', color = INK) {
  ctx.save();
  ctx.font = `${size}px "${font}"`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const radii = [r * 0.85, r, r * 0.75, r * 0.95];
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radii);
}

/** A paper slip with a hand-inked outline and a hard ink shadow, as in the game's UI. */
function slip(ctx: Ctx, x: number, y: number, w: number, h: number, fill = PAPER, r = 18, line = 3) {
  ctx.save();
  ctx.fillStyle = 'rgba(43,29,46,.85)';
  roundRect(ctx, x + line + 1, y + line + 2, w, h, r); ctx.fill();
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = line;
  roundRect(ctx, x, y, w, h, r); ctx.stroke();
  ctx.restore();
}

function tape(ctx: Ctx, x: number, y: number, w: number, angle: number) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = 'rgba(226,169,59,.72)';
  ctx.fillRect(-w / 2, -w * 0.15, w, w * 0.3);
  ctx.restore();
}

function fitImage(ctx: Ctx, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number, cover = false) {
  const s = (cover ? Math.max : Math.min)(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

// ---------- compositions ----------

interface SceneOpts {
  /** Culture whose landscape fills the frame. */
  culture?: string;
  /** Output size in px. */
  width: number;
  height: number;
  /** Game-unit window: scale and the game y shown at the top edge. */
  scale: number;
  top: number;
  /** Animation clock in seconds (parade position, stride, scroll). */
  t?: number;
  /** Parade loop length in seconds; the restorers cross exactly once per loop. */
  loop?: number;
  parade?: boolean;
  title?: { size: number; y: number; x?: number; align?: CanvasTextAlign; tagline?: string; taglineSize?: number };
  chips?: string[];
  scroll?: boolean;
}

/** A landscape with the twelve restorers running across it, optionally titled. */
async function scene(o: SceneOpts) {
  const c = canvas(o.width, o.height), ctx = c.getContext('2d')!;
  const t = o.t ?? 0, loop = o.loop ?? 8;
  const viewW = o.width / o.scale;
  ctx.save();
  ctx.scale(o.scale, o.scale);
  ctx.translate(0, -o.top);
  drawScene(ctx, o.culture ?? 'mexico', viewW, o.scroll ? t * 120 : 0);
  if (o.parade) {
    // One loop: the line of restorers moves by its own length, so the last frame meets the first.
    const gap = Math.max(118, (viewW + 160) / CULTURES.length);
    const length = gap * CULTURES.length;
    const speed = length / loop;
    // Whole stride cycles per loop, close to the game's cadence at this speed.
    const cycles = Math.max(1, Math.round(DEFAULT_RUN.cadence * 0.9 * loop));
    for (let i = 0; i < CULTURES.length; i++) {
      const x = ((-80 + i * gap + t * speed) % length + length) % length - 80;
      if (x < -120 || x > viewW + 120) continue;
      const phase = (t / loop) * cycles + i * 0.37;
      await drawAvatar(ctx, CULTURES.length - 1 - i, runPose(phase / DEFAULT_RUN.cadence), x, GROUND_Y + 2, AVATAR_H);
    }
  }
  ctx.restore();
  if (o.title) {
    const { size, y, align = 'center', x = o.width / 2 } = o.title;
    inked(ctx, 'Relic Revival Run', x, y, size, DISPLAY, align, 0.16);
    if (o.title.tagline) inked(ctx, o.title.tagline, x, y + size * 0.82, o.title.taglineSize ?? size * 0.32, BODY, align, 0.22);
  }
  if (o.chips?.length) {
    ctx.font = `${Math.round(o.height * 0.034)}px "${BODY}"`;
    const pad = o.height * 0.03, h = o.height * 0.06;
    const widths = o.chips.map((s) => ctx.measureText(s).width + pad * 2);
    let x = (o.width - widths.reduce((a, b) => a + b, 0) - (o.chips.length - 1) * 14) / 2;
    const y = o.height * 0.86;
    o.chips.forEach((s, i) => {
      slip(ctx, x, y, widths[i], h, i % 2 ? PAPER : OCHRE, h * 0.4, 2.5);
      inkText(ctx, s, x + widths[i] / 2, y + h / 2 + 1, Math.round(o.height * 0.034));
      x += widths[i] + 14;
    });
  }
  return c;
}

/** The wordmark with the brush icon, on transparency. `ink`: dark lettering for light backgrounds. */
async function logo(ink: boolean, height = 360) {
  const h = height;
  const probe = canvas(1, 1).getContext('2d')!;
  probe.font = `${h * 0.42}px "${DISPLAY}"`;
  const c = canvas(Math.ceil(h * 1.3 + probe.measureText('Relic Revival Run').width + h * 0.3), h), ctx = c.getContext('2d')!;
  const icon = await image('/favicon.svg');
  const size = h * 0.8;
  ctx.drawImage(icon, h * 0.08, (h - size) / 2, size, size);
  const textX = h * 0.08 + size + h * 0.16;
  const fontSize = h * 0.42;
  // Borel's tall ascenders put its middle above the visual centre; drop it to sit level with the icon.
  if (ink) inkText(ctx, 'Relic Revival Run', textX, h * 0.62, fontSize, DISPLAY, 'left');
  else inked(ctx, 'Relic Revival Run', textX, h * 0.62, fontSize, DISPLAY, 'left', 0.16);
  return trim(c);
}

/** Crop transparent margins (plus a small pad). */
function trim(c: HTMLCanvasElement, pad = 8) {
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  let l = c.width, r = 0, t = c.height, b = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (data[(y * c.width + x) * 4 + 3] > 8) {
    l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);
  }
  const out = canvas(r - l + 1 + pad * 2, b - t + 1 + pad * 2);
  out.getContext('2d')!.drawImage(c, pad - l, pad - t);
  return out;
}

async function icon(size: number) {
  const c = canvas(size, size);
  c.getContext('2d')!.drawImage(await image('/favicon.svg'), 0, 0, size, size);
  return c;
}

/** One restorer, standing, on transparency. */
async function character(i: number, height: number) {
  const c = canvas(Math.round(height * 0.8), height), ctx = c.getContext('2d')!;
  await drawAvatar(ctx, i, idlePose(0.6), c.width / 2, height - height * 0.03, height * 0.9);
  return trim(c, 12);
}

/** The whole cast in a row, on transparency or on a paper sheet with names. */
async function lineup(sheet: boolean) {
  const w = 2400, h = sheet ? 700 : 520, c = canvas(w, h), ctx = c.getContext('2d')!;
  if (sheet) {
    ctx.fillStyle = '#efe1c3'; ctx.fillRect(0, 0, w, h);
    inkText(ctx, 'The restorers', w / 2, 80, 64, DISPLAY);
    inkText(ctx, 'Twelve animal conservators, one for each culture', w / 2, 150, 34);
  }
  const ground = sheet ? 560 : 480, step = w / CULTURES.length;
  for (let i = 0; i < CULTURES.length; i++) {
    const x = step * (i + 0.5);
    await drawAvatar(ctx, i, idlePose(i * 0.4), x, ground, sheet ? 330 : 360);
    if (sheet) {
      inkText(ctx, CULTURES[i].avatar.animal, x, ground + 46, 28, BODY);
      inkText(ctx, CULTURES[i].name, x, ground + 84, 26, BODY, 'center', '#6b5a5e');
    }
  }
  return sheet ? c : trim(c, 16);
}

/** The twelve artifacts as taped slips on a paper sheet. */
async function collage() {
  const w = 1920, h = 1240, c = canvas(w, h), ctx = c.getContext('2d')!;
  ctx.fillStyle = '#efe1c3'; ctx.fillRect(0, 0, w, h);
  inkText(ctx, 'The collection', w / 2, 82, 64, DISPLAY);
  inkText(ctx, 'One artifact for each culture, waiting to be restored', w / 2, 150, 34);
  const cols = 4, cw = 400, ch = 300, gx = (w - cols * cw) / (cols + 1);
  CULTURES.forEach((cu, i) => {
    const x = gx + (i % cols) * (cw + gx), y = 210 + Math.floor(i / cols) * (ch + 38);
    ctx.save();
    ctx.translate(x + cw / 2, y + ch / 2); ctx.rotate(((i * 37) % 7 - 3) * 0.004); ctx.translate(-cw / 2, -ch / 2);
    slip(ctx, 0, 0, cw, ch, '#fffaf0', 6, 3);
    fitImage(ctx, artifacts.get(cu.id)!, 14, 14, cw - 28, ch - 80);
    inkText(ctx, cu.name, cw / 2, ch - 46, 30, DISPLAY);
    inkText(ctx, cu.artifact, cw / 2, ch - 16, 21);
    tape(ctx, cw / 2, 0, 90, -0.05);
    ctx.restore();
  });
  return c;
}

/** Twelve landscapes, 4 × 3. */
async function settings() {
  const w = 1920, h = 1180, c = canvas(w, h), ctx = c.getContext('2d')!;
  ctx.fillStyle = '#efe1c3'; ctx.fillRect(0, 0, w, h);
  inkText(ctx, 'Twelve places worth protecting', w / 2, 80, 60, DISPLAY);
  const cols = 4, cw = 432, ch = 243, gx = (w - cols * cw) / (cols + 1);
  for (const [i, cu] of CULTURES.entries()) {
    const x = gx + (i % cols) * (cw + gx), y = 160 + Math.floor(i / cols) * (ch + 74);
    const shot = canvas(1280, 720), sctx = shot.getContext('2d')!;
    drawScene(sctx, cu.id, 1280);
    slip(ctx, x - 8, y - 8, cw + 16, ch + 16, '#fffaf0', 6, 3);
    fitImage(ctx, shot, x, y, cw, ch, true);
    inkText(ctx, cu.name, x + cw / 2, y + ch + 34, 30, DISPLAY);
  }
  return c;
}

function palette() {
  const sw: [string, string, string][] = [
    ['Parchment', PAPER, 'slips, cards'], ['Ink', INK, 'lines, text'], ['Terracotta', ACCENT, 'selected, new'],
    ['Ochre', OCHRE, 'streaks, hints'], ['Sea teal', TEAL, 'condition'], ['Clay', '#6b5434', 'grime'],
  ];
  const w = 1500, h = 420, c = canvas(w, h), ctx = c.getContext('2d')!;
  ctx.fillStyle = '#efe1c3'; ctx.fillRect(0, 0, w, h);
  inkText(ctx, 'Palette, from the paintings', w / 2, 60, 46, DISPLAY);
  const bw = 200, gx = (w - sw.length * bw) / (sw.length + 1);
  sw.forEach(([name, hex, use], i) => {
    const x = gx + i * (bw + gx);
    slip(ctx, x, 120, bw, 150, hex, 16, 3);
    inkText(ctx, name, x + bw / 2, 310, 30, BODY);
    inkText(ctx, `${hex.toUpperCase()} · ${use}`, x + bw / 2, 350, 22, BODY, 'center', '#5e4b50');
  });
  return c;
}

// ---------- the driver's interface ----------

const presets = {
  /** README header: Mexico at sunset with the cast running underneath the title. */
  readmeBanner: (t = 1.3) => scene({ width: 1600, height: 400, scale: 1.25, top: 330, parade: true, t, title: { size: 92, y: 118, tagline: 'Run, restore, and bring heritage back to life', taglineSize: 34 } }),
  animatedBanner: (t: number, loop: number) => scene({ width: 1200, height: 300, scale: 0.9375, top: 320, parade: true, t, loop, title: { size: 70, y: 88, tagline: 'Run, restore, and bring heritage back to life', taglineSize: 26 } }),
  socialPreview: () => scene({ width: 1280, height: 640, scale: 1, top: 60, parade: true, t: 2.2, culture: 'portugal', title: { size: 104, y: 150, tagline: 'Run, restore, and bring heritage back to life', taglineSize: 40 }, chips: ['12 cultures', 'Real conservation tools', 'Browser and Windows'] }),
  header1500: () => scene({ width: 1500, height: 500, scale: 1.17, top: 230, parade: true, t: 3.1, culture: 'greece', title: { size: 96, y: 120, tagline: 'Run, restore, and bring heritage back to life', taglineSize: 36 } }),
  itchCover: () => scene({ width: 630, height: 500, scale: 0.79, top: 85, parade: true, t: 1.7, culture: 'india', title: { size: 58, y: 92, tagline: 'Restore heritage on the run', taglineSize: 26 } }),
  capsule616: () => scene({ width: 616, height: 353, scale: 0.56, top: 90, parade: true, t: 0.8, culture: 'japan', title: { size: 54, y: 82 } }),
  capsule460: () => scene({ width: 460, height: 215, scale: 0.42, top: 150, parade: true, t: 4.4, culture: 'egypt', title: { size: 42, y: 52 } }),
  logoLight: () => logo(false),
  logoDark: () => logo(true),
  icon: (size: number) => icon(size),
  character: (i: number) => character(i, 1024),
  lineup: () => lineup(false),
  castSheet: () => lineup(true),
  collage,
  settings,
  palette: async () => palette(),
};

declare global {
  interface Window { studio: { ready: Promise<void>; cultures: { id: string; rig: string }[]; render(name: keyof typeof presets, ...args: number[]): Promise<string> } }
}

window.studio = {
  ready,
  cultures: CULTURES.map((c) => ({ id: c.id, rig: c.avatar.rig! })),
  async render(name, ...args) {
    await ready;
    const c = await (presets[name] as (...a: number[]) => Promise<HTMLCanvasElement>)(...args);
    return c.toDataURL('image/png');
  },
};

void ready.then(async () => {
  const c = await presets.readmeBanner();
  c.style.width = '100%';
  document.querySelector('#preview')!.append(c);
});

