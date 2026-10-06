import { shapeD } from '../../src/art/geometry';
import { DEFAULT_RUN, fallPose, jumpPose, runPose, svgTransforms, type Pose } from '../../src/art/rig';
import { partBounds, renderAvatar, toSvg } from '../../src/art/stylize';
import { PART_TEMPLATE, newAvatar, type Anchor, type AvatarDoc, type AvatarStyle, type Material, type Part, type PartId, type Shape, type Vec } from '../../src/art/types';

// Avatar workshop: the owner draws every shape; this tool only edits, styles, previews and exports.

type Tool = 'pen' | 'edit' | 'pivot';
type Mode = 'edit' | 'run' | 'jump' | 'fall';
type Drag =
  | { kind: 'newHandle'; anchor: Anchor }
  | { kind: 'anchor'; anchor: Anchor }
  | { kind: 'handle'; anchor: Anchor; which: 'in' | 'out'; free: boolean }
  | { kind: 'shape'; shape: Shape; last: Vec };

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const NS = 'http://www.w3.org/2000/svg';
const EXPORT_SCALE = 0.35;
const STYLE_SLIDERS: [keyof AvatarStyle, number, number, number][] = [
  ['inkWidth', 2, 24, 0.5],
  ['taper', 0, 1, 0.05],
  ['pressureVariation', 0, 1, 0.05],
  ['wobble', 0, 6, 0.1],
  ['lightAngle', 0, 360, 5],
  ['shadeOffset', 0, 60, 1],
  ['shadeDarken', 0, 0.6, 0.01],
];

let doc: AvatarDoc = newAvatar('fennec', 'Fennec fox');
let partId: PartId = 'head';
let shapeId: string | null = null;
let drawingId: string | null = null;
let tool: Tool = 'pen';
let mode: Mode = 'edit';
let drag: Drag | null = null;
const undo: string[] = [];
let dirty = false;

const stage = $<SVGSVGElement>('#stage');
const styled = $<SVGGElement>('#styled');
const overlay = $<SVGGElement>('#overlay');
const mini = $<SVGSVGElement>('#mini');
const other = $<SVGSVGElement>('#other');
/** Another avatar shown beside this one, to keep the cast consistent in size and style. */
let otherDoc: AvatarDoc | null = null;

// ---------- helpers ----------

const part = (): Part => doc.parts.find((p) => p.id === partId)!;
const shape = (): Shape | undefined => part().shapes.find((s) => s.id === shapeId);
const uid = () => Math.random().toString(36).slice(2, 9);
const status = (msg: string) => ($('#status').textContent = msg);

function snapshot() {
  undo.push(JSON.stringify(doc));
  if (undo.length > 100) undo.shift();
  dirty = true;
}

function toCanvas(e: PointerEvent | MouseEvent): Vec {
  const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(stage.getScreenCTM()!.inverse());
  return { x: pt.x, y: pt.y };
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  parent.appendChild(n);
  return n;
}

function poseFor(t: number): Pose {
  return mode === 'run' ? runPose(t, DEFAULT_RUN) : mode === 'jump' ? jumpPose() : mode === 'fall' ? fallPose() : {};
}

// ---------- rendering ----------

let renderQueued = false;
function render() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const { defs, body } = renderAvatar(doc, { idPrefix: 'st' });
    styled.innerHTML = `<defs>${defs}</defs>${body}`;
    const m = renderAvatar(doc, { idPrefix: 'mi' });
    mini.innerHTML = `<defs>${m.defs}</defs>${m.body}`;
    fitView(mini);
    drawOverlay();
    drawPanels();
    try {
      // Only unsaved edits are cached; an untouched doc must never shadow the file on disk.
      if (dirty) localStorage.setItem(`workshop:${doc.id}`, JSON.stringify(doc));
    } catch {
      /* ignore */
    }
  });
}

/** Same fixed frame for every avatar, so the comparison shows true relative size. */
function fitView(svg: SVGSVGElement) {
  svg.setAttribute('viewBox', '150 0 750 1000');
}

function drawOverlay() {
  overlay.innerHTML = '';
  if (mode !== 'edit') return;
  for (const p of doc.parts)
    el('circle', { cx: p.pivot.x, cy: p.pivot.y, r: p.id === partId ? 9 : 5, fill: 'none', stroke: p.id === partId ? '#e0457b' : '#e0457b55', 'stroke-width': 3, 'data-role': 'pivot' }, overlay);
  for (const s of part().shapes) {
    const d = shapeD(s);
    if (!d) continue;
    el('path', { d, fill: 'transparent', stroke: s.id === shapeId ? '#2f80ed' : '#2f80ed66', 'stroke-width': s.id === shapeId ? 3 : 1.5, 'data-role': 'shape', 'data-id': s.id, style: 'cursor:move' }, overlay);
  }
  const s = shape();
  if (!s?.anchors) return;
  s.anchors.forEach((a, i) => {
    for (const which of ['in', 'out'] as const) {
      const h = a[which];
      if (!h) continue;
      el('line', { x1: a.x, y1: a.y, x2: a.x + h.x, y2: a.y + h.y, stroke: '#2f80ed', 'stroke-width': 1.5 }, overlay);
      el('circle', { cx: a.x + h.x, cy: a.y + h.y, r: 7, fill: '#fff', stroke: '#2f80ed', 'stroke-width': 2, 'data-role': which, 'data-i': i }, overlay);
    }
    el('rect', { x: a.x - 7, y: a.y - 7, width: 14, height: 14, fill: i === 0 ? '#2f80ed' : '#fff', stroke: '#2f80ed', 'stroke-width': 2, 'data-role': 'anchor', 'data-i': i }, overlay);
  });
}

// Animation: only the part transforms change per frame, the styled paths are reused.
function animate(time: number) {
  if (mode !== 'edit') {
    const pose = poseFor(time / 1000);
    const apply = (root: SVGSVGElement | SVGGElement, d: AvatarDoc) => {
      const t = svgTransforms(d, pose);
      root.querySelectorAll<SVGGElement>('[data-part]').forEach((g) => g.setAttribute('transform', t[g.dataset.part as PartId] ?? ''));
    };
    apply(styled, doc);
    apply(mini, doc);
    if (otherDoc) apply(other, otherDoc);
  }
  requestAnimationFrame(animate);
}

// ---------- panels ----------

function drawPanels() {
  $<HTMLInputElement>('#placeholderBox').checked = !!doc.placeholder;
  const parts = $('#parts');
  parts.innerHTML = '';
  for (const t of PART_TEMPLATE) {
    const p = doc.parts.find((x) => x.id === t.id)!;
    const li = document.createElement('li');
    li.className = t.id === partId ? 'on' : '';
    li.innerHTML = `<span class="grow">${t.label}</span><small>${p.shapes.length}</small>`;
    li.onclick = () => selectPart(t.id);
    parts.appendChild(li);
  }

  const shapes = $('#shapes');
  shapes.innerHTML = '';
  part().shapes.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = s.id === shapeId ? 'on' : '';
    const mat = document.createElement('select');
    for (const m of ['solid', 'line', 'blush', 'highlight']) mat.add(new Option(m, m, false, m === s.material));
    mat.onchange = () => (snapshot(), (s.material = mat.value as Material), render());
    const col = colorSelect(s.color);
    col.onchange = () => (snapshot(), (s.color = col.value), render());
    const btn = (label: string, title: string, fn: () => void) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.title = title;
      b.onclick = (e) => (e.stopPropagation(), snapshot(), fn(), render());
      return b;
    };
    const arr = part().shapes;
    li.append(
      Object.assign(document.createElement('span'), { className: 'grow', textContent: `#${i + 1}${s.d ? ' (svg)' : ''}` }),
      mat,
      col,
      btn('↑', 'Draw later (on top)', () => i < arr.length - 1 && arr.splice(i + 1, 0, ...arr.splice(i, 1))),
      btn('↓', 'Draw earlier (behind)', () => i > 0 && arr.splice(i - 1, 0, ...arr.splice(i, 1))),
      btn('✕', 'Delete shape', () => arr.splice(i, 1)),
    );
    li.onclick = () => ((shapeId = s.id), render());
    shapes.appendChild(li);
  });

  const newColor = $<HTMLSelectElement>('#newColor');
  const keep = newColor.value;
  newColor.replaceChildren(...Object.keys(doc.palette).map((k) => new Option(k, k)));
  if (keep in doc.palette) newColor.value = keep;

  const pal = $('#palette');
  pal.innerHTML = '';
  for (const [k, v] of Object.entries(doc.palette)) {
    const label = document.createElement('label');
    const input = Object.assign(document.createElement('input'), { type: 'color', value: v });
    input.oninput = () => ((doc.palette[k] = input.value), (dirty = true), render());
    const del = Object.assign(document.createElement('button'), { textContent: '✕', title: 'Remove colour' });
    del.onclick = () => {
      if (doc.parts.some((p) => p.shapes.some((s) => s.color === k))) return status(`"${k}" is in use`);
      snapshot();
      delete doc.palette[k];
      render();
    };
    label.append(k, input, del);
    pal.appendChild(label);
  }

  const st = $('#style');
  st.innerHTML = '';
  for (const [key, min, max, step] of STYLE_SLIDERS) {
    const label = document.createElement('label');
    const input = Object.assign(document.createElement('input'), { type: 'range', min: String(min), max: String(max), step: String(step), value: String(doc.style[key]) });
    const out = document.createElement('small');
    out.textContent = String(doc.style[key]);
    input.oninput = () => {
      (doc.style[key] as number) = Number(input.value);
      out.textContent = input.value;
      dirty = true;
      render();
    };
    label.append(key, input, out);
    st.appendChild(label);
  }
  const ink = document.createElement('label');
  const inkInput = Object.assign(document.createElement('input'), { type: 'color', value: doc.style.inkColor });
  inkInput.oninput = () => ((doc.style.inkColor = inkInput.value), (dirty = true), render());
  ink.append('inkColor', inkInput);
  st.appendChild(ink);
}

function colorSelect(value: string) {
  const sel = document.createElement('select');
  for (const k of Object.keys(doc.palette)) sel.add(new Option(k, k, false, k === value));
  return sel;
}

function selectPart(id: PartId) {
  partId = id;
  shapeId = null;
  drawingId = null;
  render();
}

function setTool(t: Tool) {
  tool = t;
  finishDrawing();
  document.querySelectorAll('#tools button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.tool === t));
}

function setMode(m: Mode) {
  mode = m;
  document.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.mode === m));
  if (m === 'edit') styled.querySelectorAll('[data-part]').forEach((g) => g.removeAttribute('transform'));
  if (m === 'edit') for (const svg of [mini, other]) svg.querySelectorAll('[data-part]').forEach((g) => g.removeAttribute('transform'));
  render();
}

// ---------- drawing ----------

function finishDrawing(close = false) {
  const s = part().shapes.find((x) => x.id === drawingId);
  drawingId = null;
  if (!s?.anchors) return;
  if (s.anchors.length < 2) part().shapes.splice(part().shapes.indexOf(s), 1);
  else if (close && s.anchors.length > 2) s.closed = true;
  render();
}

stage.addEventListener('pointerdown', (e) => {
  if (mode !== 'edit') return;
  const p = toCanvas(e);
  const target = e.target as SVGElement;
  const role = target.dataset.role;
  stage.setPointerCapture(e.pointerId);

  if (tool === 'pivot') {
    snapshot();
    part().pivot = { x: Math.round(p.x), y: Math.round(p.y) };
    return render();
  }

  if (tool === 'edit') {
    const s = shape();
    const i = Number(target.dataset.i);
    if (role === 'anchor' && s?.anchors) {
      snapshot();
      if (e.altKey) {
        s.anchors.splice(i, 1);
        return render();
      }
      drag = { kind: 'anchor', anchor: s.anchors[i] };
    } else if ((role === 'in' || role === 'out') && s?.anchors) {
      snapshot();
      drag = { kind: 'handle', anchor: s.anchors[i], which: role, free: e.shiftKey };
    } else if (role === 'shape') {
      shapeId = target.dataset.id!;
      const sel = shape();
      if (sel?.anchors) {
        snapshot();
        drag = { kind: 'shape', shape: sel, last: p };
      }
      render();
    }
    return;
  }

  // Pen
  let s = part().shapes.find((x) => x.id === drawingId);
  if (s?.anchors && s.anchors.length > 2) {
    const first = s.anchors[0];
    if (Math.hypot(first.x - p.x, first.y - p.y) < 14) return finishDrawing(true);
  }
  snapshot();
  if (!s) {
    s = { id: uid(), material: $<HTMLSelectElement>('#newMaterial').value as Material, color: $<HTMLSelectElement>('#newColor').value, closed: false, anchors: [] };
    part().shapes.push(s);
    drawingId = shapeId = s.id;
  }
  const a: Anchor = { x: Math.round(p.x), y: Math.round(p.y) };
  s.anchors!.push(a);
  drag = { kind: 'newHandle', anchor: a };
  render();
});

stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = toCanvas(e);
  switch (drag.kind) {
    case 'newHandle': {
      const out = { x: p.x - drag.anchor.x, y: p.y - drag.anchor.y };
      if (Math.hypot(out.x, out.y) < 4) break;
      drag.anchor.out = out;
      drag.anchor.in = { x: -out.x, y: -out.y };
      break;
    }
    case 'anchor':
      drag.anchor.x = Math.round(p.x);
      drag.anchor.y = Math.round(p.y);
      break;
    case 'handle': {
      const h = { x: p.x - drag.anchor.x, y: p.y - drag.anchor.y };
      drag.anchor[drag.which] = h;
      const other = drag.which === 'in' ? 'out' : 'in';
      // Smooth by default: the opposite handle mirrors direction and keeps its own length.
      if (!drag.free && !e.shiftKey && drag.anchor[other]) {
        const len = Math.hypot(drag.anchor[other]!.x, drag.anchor[other]!.y);
        const hl = Math.hypot(h.x, h.y) || 1;
        drag.anchor[other] = { x: (-h.x / hl) * len, y: (-h.y / hl) * len };
      }
      break;
    }
    case 'shape': {
      const dx = p.x - drag.last.x, dy = p.y - drag.last.y;
      drag.last = p;
      for (const a of drag.shape.anchors!) {
        a.x += dx;
        a.y += dy;
      }
      break;
    }
  }
  render();
});

stage.addEventListener('pointerup', () => {
  if (drag?.kind === 'shape') drag.shape.anchors!.forEach((a) => ((a.x = Math.round(a.x)), (a.y = Math.round(a.y))));
  drag = null;
});

stage.addEventListener('dblclick', (e) => {
  const target = e.target as SVGElement;
  const s = shape();
  if (tool !== 'edit' || target.dataset.role !== 'anchor' || !s?.anchors) return;
  snapshot();
  const a = s.anchors[Number(target.dataset.i)];
  if (a.in || a.out) {
    delete a.in;
    delete a.out;
  } else {
    a.out = { x: 40, y: 0 };
    a.in = { x: -40, y: 0 };
  }
  render();
});

window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).tagName === 'INPUT') return;
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    const prev = undo.pop();
    if (prev) {
      doc = JSON.parse(prev);
      drawingId = null;
      render();
    }
    e.preventDefault();
  } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    save();
  } else if (e.key === 'Enter') finishDrawing(part().shapes.find((x) => x.id === drawingId)?.material !== 'line');
  else if (e.key === 'Escape') finishDrawing();
  else if (e.key === 'Delete' && shapeId) {
    snapshot();
    part().shapes = part().shapes.filter((s) => s.id !== shapeId);
    shapeId = null;
    render();
  } else if (e.key === 'p') setTool('pen');
  else if (e.key === 'e') setTool('edit');
  else if (e.key === 'v') setTool('pivot');
});

// ---------- reference image ----------

const ref = $<SVGImageElement>('#ref');
let refNatural = { w: 1000, h: 1000 };
function applyRef() {
  const s = Number($<HTMLInputElement>('#refScale').value);
  // Fit the image's height to the canvas, then apply the user's scale and offset.
  const fit = 1000 / refNatural.h;
  const w = refNatural.w * fit * s, h = 1000 * s;
  ref.setAttribute('width', String(w));
  ref.setAttribute('height', String(h));
  ref.setAttribute('x', String(500 - w / 2 + Number($<HTMLInputElement>('#refX').value)));
  ref.setAttribute('y', String(500 - h / 2 + Number($<HTMLInputElement>('#refY').value)));
  ref.setAttribute('opacity', $<HTMLInputElement>('#refOpacity').value);
}
function loadRef(url: string) {
  const img = new Image();
  img.onload = () => {
    refNatural = { w: img.naturalWidth, h: img.naturalHeight };
    ref.setAttribute('href', url);
    applyRef();
  };
  img.src = url;
}
$<HTMLInputElement>('#refFile').onchange = (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) loadRef(URL.createObjectURL(f));
};
for (const id of ['#refOpacity', '#refScale', '#refX', '#refY']) $<HTMLInputElement>(id).oninput = applyRef;

// ---------- SVG import (Inkscape) ----------

/** Layers/groups whose label or id matches a part id become that part's shapes. Fill colours map to palette keys. */
function importSvg(text: string) {
  const src = new DOMParser().parseFromString(text, 'image/svg+xml');
  const ids = new Set(PART_TEMPLATE.map((p) => p.id as string));
  let count = 0;
  snapshot();
  src.querySelectorAll('g').forEach((g) => {
    const name = g.getAttribute('inkscape:label') ?? g.id;
    if (!ids.has(name)) return;
    const target = doc.parts.find((p) => p.id === name)!;
    g.querySelectorAll('path, ellipse, circle, rect').forEach((n) => {
      const d = elementToD(n);
      if (!d) return;
      const fill = (n.getAttribute('style')?.match(/fill:\s*(#[0-9a-fA-F]{6})/)?.[1] ?? n.getAttribute('fill') ?? '').toLowerCase();
      const hasFill = /^#[0-9a-f]{6}$/.test(fill);
      target.shapes.push({ id: uid(), material: hasFill ? 'solid' : 'line', color: hasFill ? paletteKeyFor(fill) : Object.keys(doc.palette)[0], closed: /z\s*$/i.test(d), d });
      count++;
    });
  });
  status(count ? `Imported ${count} shapes` : 'No groups named after parts (e.g. "head", "body") found');
  render();
}

function elementToD(n: Element): string | null {
  const num = (a: string) => Number(n.getAttribute(a) ?? 0);
  switch (n.tagName) {
    case 'path':
      return n.getAttribute('d');
    case 'circle':
    case 'ellipse': {
      const cx = num('cx'), cy = num('cy');
      const rx = n.tagName === 'circle' ? num('r') : num('rx'), ry = n.tagName === 'circle' ? num('r') : num('ry');
      return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
    }
    case 'rect': {
      const x = num('x'), y = num('y'), w = num('width'), h = num('height');
      return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
    }
  }
  return null;
}

function paletteKeyFor(hex: string): string {
  const found = Object.entries(doc.palette).find(([, v]) => v.toLowerCase() === hex);
  if (found) return found[0];
  let i = 1;
  while (doc.palette[`c${i}`]) i++;
  doc.palette[`c${i}`] = hex;
  return `c${i}`;
}

$<HTMLInputElement>('#importSvg').onchange = async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) importSvg(await f.text());
};

// ---------- persistence & export ----------

async function list(): Promise<string[]> {
  return (await fetch('/__workshop/list')).json();
}

async function load(id: string) {
  let cached: AvatarDoc | null = null;
  try {
    cached = JSON.parse(localStorage.getItem(`workshop:${id}`) ?? 'null');
  } catch {
    /* ignore */
  }
  const res = await fetch(`/avatars/${id}.avatar.json?t=${Date.now()}`);
  // Vite answers missing files with its HTML fallback, so check the type too.
  const saved: AvatarDoc | null = res.ok && res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  // Unsaved work in this browser wins over the file, so a reload never loses drawing.
  doc = cached ?? saved ?? newAvatar(id, id);
  undo.length = 0;
  dirty = !!cached && JSON.stringify(cached) !== JSON.stringify(saved);
  if (dirty) status('Restored unsaved work from this browser (Save to keep it)');
  else if (doc.placeholder) status('PLACEHOLDER: a generated base to redraw over. Untick "placeholder" once it is your drawing.');
  selectPart('head');
}

async function save() {
  const res = await fetch('/__workshop/save', { method: 'POST', body: JSON.stringify(doc) });
  dirty = !res.ok;
  if (res.ok) localStorage.removeItem(`workshop:${doc.id}`);
  status(res.ok ? `Saved avatars/${doc.id}.avatar.json` : 'Save failed');
}

function rasterize(svg: string, w: number, h: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w);
      c.height = Math.ceil(h);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function exportParts() {
  const parts: { id: string; png: string }[] = [];
  const rigParts = [];
  for (const p of doc.parts) {
    const b = partBounds(doc, p);
    if (!b) continue;
    const svg = toSvg(doc, { parts: [p.id], idPrefix: `ex-${p.id}` }, `${b.x} ${b.y} ${b.w} ${b.h}`);
    parts.push({ id: p.id, png: await rasterize(svg, b.w * EXPORT_SCALE, b.h * EXPORT_SCALE) });
    rigParts.push({ id: p.id, parent: p.parent ?? null, pivot: p.pivot, ...b });
  }
  if (parts.length === 0) return status('Nothing to export yet');
  const rig = { id: doc.id, size: doc.size, scale: EXPORT_SCALE, order: doc.parts.map((p) => p.id), parts: rigParts };
  const res = await fetch('/__workshop/export', { method: 'POST', body: JSON.stringify({ id: doc.id, parts, rig }) });
  status(res.ok ? `Exported ${parts.length} parts to public/assets/avatars/${doc.id}/` : 'Export failed');
}

async function showOther(id: string) {
  const res = await fetch(`/avatars/${id}.avatar.json?t=${Date.now()}`);
  otherDoc = res.ok && res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!otherDoc) return (other.innerHTML = '');
  const r = renderAvatar(otherDoc, { idPrefix: 'ot' });
  other.innerHTML = `<defs>${r.defs}</defs>${r.body}`;
  fitView(other);
}

async function refreshList(select?: string) {
  const ids = await list();
  const cmp = $<HTMLSelectElement>('#compareSelect');
  const keep = cmp.value;
  cmp.replaceChildren(new Option('(none)', ''), ...ids.map((id) => new Option(id, id)));
  cmp.value = keep;
  if (select && !ids.includes(select)) ids.push(select);
  const sel = $<HTMLSelectElement>('#avatarSelect');
  sel.replaceChildren(...ids.map((id) => new Option(id, id)));
  if (select) sel.value = select;
}

$<HTMLSelectElement>('#avatarSelect').onchange = (e) => {
  if (dirty && !confirm('Discard unsaved changes?')) return;
  load((e.target as HTMLSelectElement).value);
};
$('#newBtn').onclick = async () => {
  const id = prompt('Avatar id (lowercase, dashes), e.g. little-owl')?.trim();
  if (!id || !/^[a-z0-9-]+$/.test(id)) return;
  doc = newAvatar(id, prompt('Display name', id) ?? id);
  undo.length = 0;
  await save();
  await refreshList(id);
  selectPart('head');
};
$('#saveBtn').onclick = save;
$<HTMLSelectElement>('#compareSelect').onchange = (e) => showOther((e.target as HTMLSelectElement).value);
$<HTMLInputElement>('#placeholderBox').onchange = (e) => {
  snapshot();
  doc.placeholder = (e.target as HTMLInputElement).checked || undefined;
  render();
};
$('#exportBtn').onclick = exportParts;
document.querySelectorAll<HTMLElement>('#tools button').forEach((b) => (b.onclick = () => setTool(b.dataset.tool as Tool)));
document.querySelectorAll<HTMLElement>('#modes button').forEach((b) => (b.onclick = () => setMode(b.dataset.mode as Mode)));
// Skipped under automation or with ?noguard (playtest scripts) so reloads don't hang on the prompt.
const noGuard = navigator.webdriver || new URLSearchParams(location.search).has('noguard');
window.addEventListener('beforeunload', (e) => dirty && !noGuard && e.preventDefault());

// ---------- start ----------

(async () => {
  setTool('pen');
  setMode('edit');
  const ids = await list();
  const first = ids.includes('fennec') ? 'fennec' : ids[0] ?? 'fennec';
  await refreshList(first);
  await load(first);
  requestAnimationFrame(animate);
})();

// Exposed for playtest scripts and batch re-export.
(window as unknown as { workshop: unknown }).workshop = {
  get doc() {
    return doc;
  },
  /** Re-export every saved avatar (e.g. after changing the stylizer). */
  async exportAll() {
    const done: string[] = [];
    for (const id of await list()) {
      await load(id);
      await exportParts();
      done.push(id);
    }
    return done;
  },
};
