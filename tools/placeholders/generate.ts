import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_STYLE, PART_TEMPLATE, type Anchor, type AvatarDoc, type Material, type PartId, type Shape } from '../../src/art/types';
import { SIDE_JOINTS } from '../../src/art/skeleton';

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
      // Narrow side torso: back seam at the left, chest and opening at the right.
      // The uninterrupted hem occludes BOTH thigh roots, including the near thigh.
      blob('coat', [[493, 523], [553, 516], [582, 550], [588, 607], [579, 672], [594, 764, true], [465, 768, true], [478, 655], [471, 581]]),
      flat(chest, smooth([[553, 518, true], [575, 532, true], [578, 573, true]], true)),
      blob('lapel', [[538, 522, true], [569, 539, true], [580, 588, true], [554, 567, true]]),
      line([[580, 592], [571, 675], [581, 750]]),
      ...[620, 666, 711].map(y => flat('button', ellipse(580, y, 4, 5))),
      blob('pocket', [[495, 662, true], [545, 662, true], [542, 704], [498, 704]]),
      line([[505, 657], [505, 633]]),
      blob('bristle', [[497, 636, true], [498, 615, true], [512, 612, true], [514, 636, true]]),
      blob('leather', [[473, 719], [503, 719], [504, 752], [471, 752]]),
      flat('bristle', ellipse(488, 735, 4, 4)),
      line([[486, 590], [490, 636]]),
    ],
    coatTail: [blob('coat', [[490, 641], [516, 660], [507, 773], [449, 781, true], [469, 720]])],
    ...limb('Front', 528, false), ...limb('Back', 516, true),
    ...sleeve('Front', 530, false), ...sleeve('Back', 541, true),
  };
}

function limb(side: 'Front' | 'Back', x: number, far: boolean): Partial<Record<PartId, Shape[]>> {
  const pants = far ? 'pantsBack' : 'pants';
  return {
    [`leg${side}`]: [blob(pants, [[x - 24, 697], [x + 25, 697], [x + 22, 809], [x, 833], [x - 22, 811]])],
    [`shin${side}`]: [blob(pants, [[x - 21, 809], [x, 795], [x + 22, 811], [x + 18, 913], [x - 19, 913]]), blob('cuff', [[x - 20, 893, true], [x + 19, 893, true], [x + 19, 913, true], [x - 20, 913, true]])],
    [`foot${side}`]: [
      blob(far ? 'shoesBack' : 'shoes', [[x - 20, 905, true], [x + 18, 905, true], [x + 23, 917], [x + 58, 924], [x + 60, 937], [x - 22, 937, true]]),
      flat('sole', smooth([[x - 22, 931, true], [x + 60, 931, true], [x + 59, 939, true], [x - 22, 939, true]], true)),
      line([[x + 17, 918], [x + 34, 917]]), line([[x + 24, 925], [x + 43, 924]]),
    ],
  };
}

function sleeve(side: 'Front' | 'Back', x: number, far: boolean): Partial<Record<PartId, Shape[]>> {
  const coat = far ? 'coatBack' : 'coat';
  return {
    [`arm${side}`]: [blob(coat, [[x - 21, 544], [x, 530], [x + 24, 544], [x + 19, 638], [x, 655], [x - 19, 637]])],
    [`forearm${side}`]: [
      blob(coat, [[x - 17, 635], [x, 620], [x + 18, 636], [x + 17, 697], [x - 16, 697]]),
      blob('lapel', [[x - 17, 683, true], [x + 18, 683, true], [x + 18, 702, true], [x - 17, 702, true]]),
      blob(far ? 'gloveBack' : 'glove', [[x - 14, 700], [x + 15, 700], [x + 20, 718], [x + 6, 735], [x - 11, 727]]),
      line([[x + 6, 716], [x + 12, 721]]),
    ],
  };
}

// ---------- head building blocks ----------

const eyeJam = (x = 662, y = 312) => [
  solid('white', ellipse(x, y, 32, 40)), solid('eye', ellipse(x + 7, y + 3, 23, 32)),
  flat('ink', ellipse(x + 12, y + 5, 13, 25)), flat('white', ellipse(x + 13, y - 13, 9, 11)),
  flat('white', ellipse(x + 1, y + 18, 4, 5)), line([[x - 26, y - 57], [x - 4, y - 65], [x + 19, y - 60]]),
];
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

const BASE_PALETTE = { coat: '#fff4dc', lapel: '#fffbef', pocket: '#e8d8b8', pants: '#355c69', cuff: '#61848a', shoes: '#885638', sole: '#3c302b', glove: '#9dd7d1', leather: '#b37a4d', bristle: '#e4b763', badge: '#287e7d', button: '#9d7955', eye: '#61432c', white: '#fffdf5', blush: '#ed9b92', ink: '#362b2a' };

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
  {
    id: 'axolotl', name: 'Axolotl (placeholder)',
    palette: { fur: '#f7c6d4', furLight: '#fde4ec', gill: '#e8708a', nose: '#c25a74' },
    parts: {
      head: [
        blob('fur', [[369, 324], [403, 220], [534, 184], [682, 216], [779, 304], [791, 392], [705, 471], [529, 493], [407, 434]]),
        flat('furLight', smooth([[452, 397], [590, 388], [777, 364], [750, 442], [607, 471], [481, 445]], true)),
        ...eyeJam(690, 324), blush(666, 401),
        line([[750, 402], [772, 411], [786, 400]]),
        flat('nose', ellipse(784, 375, 4, 3)),
      ],
      // Feathery external gills fan out behind the head.
      earFront: gills(529, 231, false),
      earBack: gills(420, 312, true),
      tail: [blob('fur', [[424, 670], [340, 640], [262, 640], [250, 668], [330, 700], [420, 712]]), blob('furLight', [[330, 642], [262, 640], [250, 668], [300, 680]])],
    },
  },
  {
    id: 'iberian-lynx', name: 'Iberian lynx (placeholder)',
    palette: { fur: '#c9955a', furLight: '#f4e6cf', innerEar: '#f0c9a8', nose: '#2a1c18', spot: '#3a2a22', tip: '#1e1418' },
    parts: {
      head: [
        // Facial ruff: pointed cheek tufts under the jaw.
        blob('furLight', [[430, 420, true], [470, 520, true], [540, 470], [620, 540, true], [660, 470]]),
        solid('fur', ellipse(570, 330, 205, 180)), solid('furLight', ellipse(704, 386, 96, 66)),
        ...[[480, 230], [530, 200], [450, 300], [505, 270]].map(([x, y]) => flat('spot', ellipse(x, y, 10, 8))),
        ...eyeJam(), blush(), nose(), mouth(),
      ],
      // Triangular ears with the lynx's black tufts.
      earFront: [blob('fur', [[575, 200, true], [628, 60, true], [680, 200, true]]), blob('innerEar', [[598, 190, true], [628, 100, true], [658, 190, true]]), line([[628, 60], [632, 20]])],
      earBack: [blob('fur', [[462, 210, true], [474, 70, true], [546, 190, true]]), line([[474, 70], [470, 30]])],
      tail: [blob('fur', [[424, 668], [370, 640], [348, 660], [418, 700]]), blob('tip', [[370, 640], [348, 660], [362, 672], [382, 650]])],
    },
  },
  {
    id: 'red-panda', name: 'Red panda (placeholder)',
    palette: { fur: '#c9522a', furLight: '#fbf3ea', innerEar: '#fbf3ea', nose: '#1e1418', ring: '#8a3519', eye: '#3b1f12' },
    parts: {
      head: [
        solid('fur', ellipse(570, 330, 210, 185)),
        // White eyebrow and cheek markings.
        flat('furLight', ellipse(650, 255, 34, 18)), blob('furLight', [[600, 360], [660, 330], [800, 350, true], [740, 440], [620, 430]]),
        ...eyeJam(), blush(626, 404), nose(796, 356), mouth(),
      ],
      earFront: [blob('fur', [[575, 190], [600, 90], [680, 110], [680, 200]]), blob('innerEar', [[600, 180], [612, 116], [660, 128], [660, 186]])],
      earBack: [blob('fur', [[460, 200], [460, 100], [536, 96], [546, 186]])],
      // Long bushy tail with darker rings.
      tail: [
        blob('fur', [[425, 670], [340, 640], [262, 610], [226, 640], [262, 690], [350, 712], [418, 712]]),
        flat('ring', smooth([[340, 640, true], [366, 651, true], [362, 712, true], [340, 709, true]], true)),
        flat('ring', smooth([[287, 617, true], [312, 631, true], [307, 704, true], [282, 697, true]], true)),
        flat('ring', smooth([[245, 616], [260, 610], [260, 688], [239, 668]], true)),
      ],
    },
  },
];

/** Branching external gills give the axolotl a recognizable silhouette at small sizes. */
function gills(x: number, y: number, back: boolean): Shape[] {
  const result: Shape[] = [];
  for (let i = 0; i < 3; i++) {
    const angle = (back ? -2.65 + i * 0.48 : -2.05 + i * 0.48);
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const px = -dy, py = dx;
    const points: Pt[] = [[x - px * 12, y - py * 12]];
    for (let k = 1; k <= 4; k++) {
      const d = k * 26;
      points.push([x + dx * d - px * 27, y + dy * d - py * 27, true], [x + dx * (d + 7) - px * 9, y + dy * (d + 7) - py * 9]);
    }
    points.push([x + dx * 138, y + dy * 138]);
    for (let k = 4; k >= 1; k--) {
      const d = k * 26;
      points.push([x + dx * (d + 7) + px * 9, y + dy * (d + 7) + py * 9], [x + dx * d + px * 27, y + dy * d + py * 27, true]);
    }
    points.push([x + px * 12, y + py * 12]);
    result.push(blob('gill', points), line([[x, y], [x + dx * 114, y + dy * 114]]));
  }
  return result;
}

/**
 * The specs draw heads around x≈570, y≈330. Shift them back over the shoulders and down so the chin
 * overlaps the collar; a head perched on the collar edge looks like it is about to roll off when running.
 */
const HEAD_SHIFT = { x: -32, y: 34 };
const shifted = (shapes: Shape[] = [], extraX = 0): Shape[] =>
  shapes.map((sh) => ({ ...sh, anchors: sh.anchors?.map((a) => ({
    ...a, x: 540 + (a.x + HEAD_SHIFT.x + extraX - 540) * 0.8, y: 533 + (a.y + HEAD_SHIFT.y - 533) * 0.84,
    in: a.in && { x: a.in.x * 0.8, y: a.in.y * 0.84 }, out: a.out && { x: a.out.x * 0.8, y: a.out.y * 0.84 },
  })) }));

function build(spec: Spec): AvatarDoc {
  n = 0;
  const parts = { ...outfit(spec.chest), ...spec.parts };
  for (const id of ['head', 'earFront', 'earBack'] as const) {
    // In profile the two ears overlap, rather than sitting on either side of a frontal head.
    parts[id] = shifted(parts[id], id === 'earBack' && spec.id !== 'axolotl' ? 108 : 0);
  }
  // Carry the tail at the back of the new narrow side-view coat.
  parts.tail = parts.tail?.map(sh => ({ ...sh, anchors: sh.anchors?.map(a => ({ ...a, x: a.x + 52 })) }));
  return {
    version: 1,
    id: spec.id,
    name: spec.name,
    size: 1000,
    placeholder: true,
    palette: { ...BASE_PALETTE, ...spec.palette, coatBack: '#d8cbb1', pantsBack: '#294751', shoesBack: '#674530', gloveBack: '#6ba7a4' },
    style: { ...DEFAULT_STYLE, inkColor: '#362b2a', inkWidth: 8, shadeOffset: 24, shadeDarken: 0.16, wobble: 0.9 },
    parts: PART_TEMPLATE.map((t) => ({ id: t.id, parent: t.parent, pivot: { ...SIDE_JOINTS[t.id] }, shapes: parts[t.id] ?? [] })),
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
