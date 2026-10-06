import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_STYLE, PART_TEMPLATE, type Anchor, type AvatarDoc, type Material, type PartId, type Shape } from '../../src/art/types';

// PLACEHOLDER avatars, generated at the owner's request as working bases to redraw over in the workshop.
// Every shape is plain editable anchors. Re-running never overwrites an existing avatar file
// (the owner may be editing it); pass --force to regenerate the ones still flagged `placeholder`.

type Pt = [number, number, boolean?]; // x, y, corner?
const K = 0.5523;
let n = 0;

function ellipse(cx: number, cy: number, rx: number, ry: number): Anchor[] {
  return [
    { x: cx + rx, y: cy, in: { x: 0, y: -ry * K }, out: { x: 0, y: ry * K } },
    { x: cx, y: cy + ry, in: { x: rx * K, y: 0 }, out: { x: -rx * K, y: 0 } },
    { x: cx - rx, y: cy, in: { x: 0, y: ry * K }, out: { x: 0, y: -ry * K } },
    { x: cx, y: cy - ry, in: { x: -rx * K, y: 0 }, out: { x: rx * K, y: 0 } },
  ];
}

/** Catmull-Rom style smooth curve through points; corner points get no handles. */
function smooth(pts: Pt[], closed: boolean): Anchor[] {
  return pts.map(([x, y, corner], i) => {
    if (corner) return { x, y };
    const prev = pts[closed ? (i - 1 + pts.length) % pts.length : Math.max(0, i - 1)];
    const next = pts[closed ? (i + 1) % pts.length : Math.min(pts.length - 1, i + 1)];
    const tx = (next[0] - prev[0]) / 6, ty = (next[1] - prev[1]) / 6;
    return { x, y, in: { x: -tx, y: -ty }, out: { x: tx, y: ty } };
  });
}

const shape = (material: Material, color: string, anchors: Anchor[], closed = true): Shape => ({ id: `s${++n}`, material, color, closed, anchors });
const solid = (color: string, a: Anchor[]) => shape('solid', color, a);
const flat = (color: string, a: Anchor[]) => shape('highlight', color, a);
const line = (pts: Pt[], closed = false) => shape('line', 'ink', smooth(pts, closed), closed);
const blob = (color: string, pts: Pt[]) => solid(color, smooth(pts, true));

// ---------- shared restorer outfit (lab coat, jeans, shoes, gloves), echoing the jam axolotl ----------

function outfit(chest = 'fur'): Partial<Record<PartId, Shape[]>> {
  return {
    body: [
      blob('coat', [[420, 520], [600, 520], [640, 640], [652, 772, true], [398, 772, true], [408, 640]]),
      flat(chest, smooth([[505, 524, true], [577, 524, true], [541, 604, true]], true)),
      line([[504, 526], [541, 604], [578, 526]]),
    ],
    legFront: [blob('pants', [[520, 748, true], [588, 748, true], [583, 884], [524, 884]]), solid('shoes', ellipse(566, 902, 46, 26))],
    legBack: [blob('pants', [[452, 748, true], [518, 748, true], [513, 884], [455, 884]]), solid('shoes', ellipse(496, 902, 46, 26))],
    armFront: [blob('coat', [[598, 545], [642, 560], [694, 628], [668, 656], [616, 602]]), solid('glove', ellipse(692, 652, 25, 23))],
    armBack: [blob('coat', [[444, 545], [404, 562], [378, 628], [404, 652], [446, 602]]), solid('glove', ellipse(382, 650, 25, 23))],
  };
}

// ---------- head building blocks ----------

const eyeJam = (x = 662, y = 312) => [solid('eye', ellipse(x, y, 30, 38)), flat('white', ellipse(x + 9, y - 13, 10, 12))];
const blush = (x = 642, y = 388) => shape('blush', 'blush', ellipse(x, y, 32, 18));
const mouth = (x = 760) => line([[x - 16, 404], [x, 414], [x + 16, 403]]);
const nose = (x = 790, y = 360, rx = 16, ry = 12) => solid('nose', ellipse(x, y, rx, ry));
const roundEars = (inner = true) => ({
  earFront: [solid('fur', ellipse(628, 178, 48, 42)), ...(inner ? [flat('innerEar', ellipse(632, 182, 24, 20))] : [])],
  earBack: [solid('fur', ellipse(482, 182, 48, 42))],
});
const longTail = (): Shape[] => [blob('fur', [[422, 676], [340, 688], [272, 660], [236, 624], [252, 612], [282, 640], [344, 664], [420, 656]])];
const tuft = (color = 'fur'): Shape[] => [solid(color, ellipse(408, 690, 32, 24))];

interface Spec {
  id: string;
  name: string;
  palette: Record<string, string>;
  parts: Partial<Record<PartId, Shape[]>>;
  chest?: string;
}

const BASE_PALETTE = { coat: '#fbf3f1', pants: '#1e6a8f', shoes: '#f6e6ea', glove: '#8fd0f0', eye: '#6b3b1e', white: '#ffffff', blush: '#f4a0a8', ink: '#1e1418' };

const SPECS: Spec[] = [
  {
    id: 'fennec', name: 'Fennec fox (placeholder)',
    palette: { fur: '#e9c48f', furLight: '#fbeacf', innerEar: '#f2b6a0', nose: '#2a1c18', tip: '#3a2a22' },
    parts: {
      head: [blob('fur', [[400, 330], [440, 190], [570, 150], [690, 200], [800, 350, true], [700, 470], [560, 505], [430, 440]]), blob('furLight', [[640, 360], [800, 352, true], [730, 440], [640, 450]]), ...eyeJam(), blush(), nose(), mouth(750)],
      earFront: [blob('fur', [[560, 200, true], [610, 20, true], [690, 196, true]]), blob('innerEar', [[588, 188, true], [612, 70, true], [660, 186, true]])],
      earBack: [blob('fur', [[462, 214, true], [436, 36, true], [540, 186, true]])],
      tail: [blob('fur', [[425, 670], [360, 640], [290, 612], [232, 596, true], [252, 646], [330, 690], [412, 716]]), blob('tip', [[292, 613], [232, 596, true], [250, 642], [290, 656]])],
    },
  },
  {
    id: 'little-owl', name: 'Little owl (placeholder)',
    palette: { fur: '#9a7350', furLight: '#efe2c8', eye: '#f2c94c', pupil: '#1e1418', beak: '#e0a040' },
    parts: {
      head: [
        solid('fur', ellipse(575, 335, 215, 190)),
        ...[[470, 230], [520, 190], [430, 300], [480, 270]].map(([x, y]) => flat('white', ellipse(x, y, 9, 7))),
        solid('furLight', ellipse(660, 340, 125, 115)),
        solid('eye', ellipse(668, 318, 46, 46)), solid('pupil', ellipse(682, 318, 21, 21)), flat('white', ellipse(690, 306, 8, 8)),
        blob('beak', [[748, 360, true], [790, 376, true], [748, 400, true]]),
        blush(650, 400),
      ],
      tail: [blob('fur', [[422, 690], [340, 722, true], [334, 698, true], [350, 690], [334, 672, true], [420, 668]])],
    },
  },
  {
    id: 'vicuna', name: 'Vicuña (placeholder)',
    palette: { fur: '#c98e4f', furLight: '#f3e3c8', innerEar: '#e7b48a', nose: '#3a2a22' },
    chest: 'furLight',
    parts: {
      head: [solid('fur', ellipse(575, 330, 185, 175)), solid('furLight', ellipse(720, 378, 100, 62)), ...eyeJam(650, 300), blush(632, 380), nose(805, 360, 12, 10), mouth(772)],
      earFront: [blob('fur', [[598, 186], [618, 40, true], [668, 70], [664, 190]]), blob('innerEar', [[614, 176], [626, 78, true], [652, 96], [648, 178]])],
      earBack: [blob('fur', [[500, 196], [492, 50, true], [546, 74], [560, 186]])],
      tail: tuft(),
    },
  },
  {
    id: 'tanuki', name: 'Tanuki (placeholder)',
    palette: { fur: '#8c7a64', furLight: '#e9dcc6', mask: '#3b3028', innerEar: '#5a4a3c', nose: '#1e1418', tip: '#3b3028' },
    parts: {
      head: [solid('fur', ellipse(570, 330, 205, 182)), solid('furLight', ellipse(710, 384, 95, 66)), solid('mask', ellipse(652, 318, 72, 56)), ...eyeJam(), blush(), nose(), mouth()],
      ...roundEars(),
      tail: [blob('fur', [[425, 670], [350, 630], [280, 610], [240, 640], [270, 690], [350, 705], [415, 712]]), blob('tip', [[282, 611], [240, 640], [268, 688], [300, 670]])],
    },
  },
  {
    id: 'tiger-cub', name: 'Bengal tiger cub (placeholder)',
    palette: { fur: '#f08a2c', furLight: '#fff4e6', innerEar: '#fff4e6', nose: '#e0707a', tip: '#1e1418' },
    parts: {
      head: [
        solid('fur', ellipse(570, 330, 210, 185)), solid('furLight', ellipse(705, 388, 100, 70)),
        line([[520, 150], [535, 196], [524, 232]]), line([[580, 148], [588, 190]]), line([[430, 250], [470, 270], [490, 300]]), line([[420, 340], [462, 350]]),
        ...eyeJam(), blush(), nose(), mouth(),
      ],
      ...roundEars(),
      tail: [...longTail(), line([[330, 664], [322, 690]]), line([[290, 645], [276, 668]]), blob('tip', [[262, 650], [236, 624], [252, 612], [272, 636]])],
    },
  },
  {
    id: 'cheetah', name: 'Asiatic cheetah (placeholder)',
    palette: { fur: '#e8b860', furLight: '#fff1d6', innerEar: '#fff1d6', nose: '#2a1c18', spot: '#2a1c18' },
    parts: {
      head: [
        solid('fur', ellipse(570, 330, 205, 182)), solid('furLight', ellipse(705, 386, 96, 66)),
        ...[[470, 220], [520, 200], [440, 300], [500, 260], [560, 180], [450, 380]].map(([x, y]) => flat('spot', ellipse(x, y, 11, 9))),
        line([[650, 352], [684, 400], [736, 410]]),
        ...eyeJam(), blush(626, 400), nose(), mouth(),
      ],
      ...roundEars(),
      tail: [...longTail(), ...[[380, 676], [320, 668], [276, 646]].map(([x, y]) => flat('spot', ellipse(x, y, 10, 8)))],
    },
  },
  {
    id: 'leopard', name: 'Leopard (placeholder)',
    palette: { fur: '#e3a84a', furLight: '#fff1d6', innerEar: '#fff1d6', nose: '#e0707a' },
    parts: {
      head: [
        solid('fur', ellipse(570, 330, 205, 182)), solid('furLight', ellipse(705, 386, 96, 66)),
        ...[[470, 230], [530, 196], [440, 310], [500, 280], [470, 390]].map(([x, y]) => shape('line', 'ink', ellipse(x, y, 16, 13))),
        ...eyeJam(), blush(), nose(), mouth(),
      ],
      ...roundEars(),
      tail: [...longTail(), ...[[372, 676], [312, 664]].map(([x, y]) => shape('line', 'ink', ellipse(x, y, 13, 10)))],
    },
  },
  {
    id: 'sun-bear', name: 'Sun bear (placeholder)',
    palette: { fur: '#3a302c', furLight: '#d9b98a', innerEar: '#5a4a44', nose: '#1e1418', chest: '#f2c46d', eye: '#4a2a14' },
    chest: 'chest',
    parts: {
      head: [solid('fur', ellipse(570, 335, 210, 185)), solid('furLight', ellipse(708, 388, 100, 70)), ...eyeJam(), blush(), nose(), mouth()],
      ...roundEars(),
      tail: tuft(),
    },
  },
  {
    id: 'desert-hedgehog', name: 'Desert hedgehog (placeholder)',
    palette: { fur: '#e8d2b0', spines: '#7a5a3c', innerEar: '#f2b6a0', nose: '#1e1418' },
    parts: {
      head: [
        blob('spines', [[600, 150, true], [560, 100, true], [520, 140, true], [460, 110, true], [440, 170, true], [370, 170, true], [390, 240, true], [330, 270, true], [380, 320, true], [340, 390, true], [420, 410, true], [420, 470, true], [500, 430, true]]),
        blob('fur', [[480, 300], [560, 190], [680, 220], [810, 360, true], [700, 470], [560, 500], [470, 420]]),
        ...eyeJam(), blush(), nose(812, 360), mouth(758),
      ],
      ...roundEars(),
      tail: tuft('spines'),
    },
  },
];

// Pivots: neck, shoulders, hips, ear bases, tail root, body centre of balance.
const PIVOTS: Record<PartId, [number, number]> = {
  body: [520, 650], head: [540, 510], earFront: [628, 205], earBack: [486, 205], armFront: [610, 556],
  armBack: [440, 556], legFront: [552, 756], legBack: [484, 756], tail: [422, 690],
};

function build(spec: Spec): AvatarDoc {
  n = 0;
  const parts = { ...outfit(spec.chest), ...spec.parts };
  return {
    version: 1,
    id: spec.id,
    name: spec.name,
    size: 1000,
    placeholder: true,
    palette: { ...BASE_PALETTE, ...spec.palette },
    style: { ...DEFAULT_STYLE },
    parts: PART_TEMPLATE.map((t) => ({ id: t.id, parent: t.parent, pivot: { x: PIVOTS[t.id][0], y: PIVOTS[t.id][1] }, shapes: parts[t.id] ?? [] })),
  };
}


const force = process.argv.includes('--force');
mkdirSync('avatars', { recursive: true });
for (const spec of SPECS) {
  const file = `avatars/${spec.id}.avatar.json`;
  if (existsSync(file)) {
    const current = JSON.parse(readFileSync(file, 'utf8')) as AvatarDoc;
    if (!force || !current.placeholder) {
      console.log(`skip ${file} (exists${current.placeholder ? '' : ', owner-drawn'})`);
      continue;
    }
  }
  writeFileSync(file, JSON.stringify(build(spec), null, 2) + '\n');
  console.log(`wrote ${file}`);
}
