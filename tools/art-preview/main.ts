import { CULTURES } from '../../src/data/cultures';
import { DEFAULT_RUN, fallPose, idlePose, jumpPose, runPose, svgTransforms, type Pose } from '../../src/art/rig';
import { loopCanvas, PARALLAX_SPEED, sceneryFamily } from '../../src/art/loopTexture';
import { renderAvatar } from '../../src/art/stylize';
import type { AvatarDoc, PartId } from '../../src/art/types';

const cast = document.querySelector('#cast')!;
const landscapes = document.querySelector('#landscapes')!;
const entries: { doc: AvatarDoc; element: HTMLElement }[] = [];
let mode = 'run';
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
let elapsed = 0;
let last = performance.now();
for (const culture of CULTURES) {
  const doc: AvatarDoc = await fetch(`/avatars/${culture.avatar.rig}.avatar.json`).then(r => r.json());
  const rendered = renderAvatar(doc, { idPrefix: culture.id });
  const element = document.createElement('article');
  element.className = 'avatar';
  element.innerHTML = `<svg viewBox="100 -20 850 1040" role="img" aria-label="${culture.avatar.animal} conservator"><defs>${rendered.defs}</defs>${rendered.body}</svg><h3>${culture.avatar.animal}</h3><p>${culture.name}</p>`;
  cast.append(element);
  entries.push({ doc, element });
  const figure = document.createElement('figure');
  figure.innerHTML = `<img src="/assets/backgrounds/${culture.id}-v3.webp" alt="Illustrated ${culture.name} heritage landscape" loading="lazy"><figcaption>${culture.name}</figcaption>`;
  landscapes.append(figure);
}
document.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach(button => {
  button.onclick = () => {
    mode = button.dataset.pose!;
    elapsed = 0;
    document.querySelectorAll('[data-pose]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    draw();
  };
});
const pause = document.querySelector<HTMLButtonElement>('#pause')!;
function pauseLabel() { pause.textContent = paused ? 'Resume' : 'Pause'; pause.setAttribute('aria-pressed', String(paused)); }
pause.onclick = () => { paused = !paused; pauseLabel(); };
pauseLabel();
function draw() {
  const pose: Pose = mode === 'run' ? runPose(elapsed) : mode === 'jump' ? jumpPose(elapsed) : mode === 'fall' ? fallPose(elapsed) : idlePose(elapsed);
  for (const { doc, element } of entries) {
    const transforms = svgTransforms(doc, pose);
    element.querySelectorAll<SVGGElement>('[data-part]').forEach(g => g.setAttribute('transform', transforms[g.dataset.part as PartId] ?? ''));
  }
}
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05);
  if (!paused) { elapsed += dt; draw(); phase.value = String((elapsed * DEFAULT_RUN.cadence % 1) * 100); }
  if (!paused) distance += dt * Number(speed.value);
  drawLandscape();
  last = now;
  requestAnimationFrame(frame);
}
const phase = document.querySelector<HTMLInputElement>('#phase')!;
phase.oninput = () => { paused = true; pauseLabel(); elapsed = Number(phase.value) / 100 / DEFAULT_RUN.cadence; draw(); };
const setting = document.querySelector<HTMLSelectElement>('#setting')!;
const speed = document.querySelector<HTMLInputElement>('#speed')!;
const canvas = document.querySelector<HTMLCanvasElement>('#parallax')!;
const ctx = canvas.getContext('2d')!;
const cache = new Map<string, HTMLCanvasElement>();
let distance = 0, selected = 'mexico';
for (const culture of CULTURES) setting.add(new Option(culture.name, culture.id));
async function loadSetting(id: string) {
  await Promise.all([id, sceneryFamily(id), 'path'].map(async asset => {
    if (cache.has(asset)) return;
    const image = new Image(); image.src = `/assets/backgrounds/${asset}-v3.webp`;
    await image.decode(); cache.set(asset, loopCanvas(image));
  }));
  if (setting.value === id) { selected = id; distance = 0; drawLandscape(); }
}
setting.onchange = () => { void loadSetting(setting.value); };
document.querySelector<HTMLButtonElement>('#seam')!.onclick = () => {
  const far = cache.get(selected)!;
  distance = (far.width * 620 / (far.height * 0.84) - 640) / PARALLAX_SPEED.distance;
  paused = true; pauseLabel(); drawLandscape();
};
function drawLandscape() {
  const far = cache.get(selected), middle = cache.get(sceneryFamily(selected)), path = cache.get('path');
  if (!far || !middle || !path) return;
  ctx.clearRect(0, 0, 1280, 720);
  const tile = (image: HTMLCanvasElement, y: number, height: number, sx: number, factor: number) => {
    const width = image.width * sx, offset = distance * factor % width;
    for (let x = -offset; x < 1280; x += width) ctx.drawImage(image, x, y, width, height);
  };
  const farScale = 620 / (far.height * 0.84);
  if (document.querySelector<HTMLInputElement>('#show-far')!.checked) tile(far, 0, far.height * farScale, farScale, PARALLAX_SPEED.distance);
  if (document.querySelector<HTMLInputElement>('#show-middle')!.checked) tile(middle, 365, 290, 290 / middle.height, PARALLAX_SPEED.middle);
  if (document.querySelector<HTMLInputElement>('#show-ground')!.checked) tile(path, 620, 100, 0.65, PARALLAX_SPEED.ground);
}
await loadSetting(selected);
draw(); requestAnimationFrame(frame);
