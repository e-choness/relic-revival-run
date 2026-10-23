// Regenerates the media kit in media/ from the running dev server (see media/README.md).
// Needs Playwright (PLAYWRIGHT_MODULE) and ffmpeg. GAME_URL defaults to http://localhost:5173.
//   node scripts/media-kit.cjs            everything
//   node scripts/media-kit.cjs studio     only the drawn assets (banners, logos, cast, collages)
//   node scripts/media-kit.cjs game       only screenshots and gameplay video
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const base = process.env.GAME_URL || 'http://localhost:5173';
const out = path.resolve(process.env.MEDIA_OUT || 'media');
const only = process.argv[2];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'media-kit-'));

const file = (rel) => {
  const p = path.join(out, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  return p;
};
const ffmpeg = (...args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const savePng = (rel, dataUrl) => fs.writeFileSync(file(rel), Buffer.from(dataUrl.split(',')[1], 'base64'));
/** Opaque artwork ships as high-quality JPEG to keep the repository light. */
function saveJpg(rel, dataUrl) {
  const png = path.join(tmp, 'frame.png');
  fs.writeFileSync(png, Buffer.from(dataUrl.split(',')[1], 'base64'));
  ffmpeg('-i', png, '-q:v', '2', file(rel));
}
/**
 * GIF with one shared palette. A still background (the banner) stores only changed rectangles per
 * frame; a scrolling one (gameplay) changes everywhere, so it gets fewer colours to stay README-sized.
 */
function gif(input, rel, filters, inputArgs = [], scrolling = false) {
  const palette = scrolling ? 'palettegen=max_colors=96:stats_mode=full' : 'palettegen=stats_mode=diff:max_colors=192';
  const use = scrolling ? 'paletteuse=dither=bayer:bayer_scale=5' : 'paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle';
  ffmpeg(...inputArgs, '-i', input, '-vf', `${filters},split[a][b];[a]${palette}[p];[b][p]${use}`, '-loop', '0', file(rel));
}

async function open(browser, url, ready) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.error('Browser error:', e.message));
  await page.goto(url);
  // Vite may re-optimise dependencies on first visit and ask for a reload.
  try {
    await page.waitForFunction(ready, null, { timeout: 15000 });
  } catch {
    await page.reload();
    await page.waitForFunction(ready, null, { timeout: 90000 });
  }
  return page;
}

async function studio(browser) {
  const page = await open(browser, `${base}/tools/media-kit/`, () => !!window.studio);
  await page.evaluate(() => window.studio.ready);
  const render = (name, ...args) => page.evaluate(([n, a]) => window.studio.render(n, ...a), [name, args]);
  const steps = [
    ['banners/readme-banner.jpg', 'readmeBanner'],
    ['social/social-preview-1280x640.jpg', 'socialPreview'],
    ['social/header-1500x500.jpg', 'header1500'],
    ['store/itch-cover-630x500.jpg', 'itchCover'],
    ['store/capsule-616x353.jpg', 'capsule616'],
    ['store/capsule-460x215.jpg', 'capsule460'],
    ['logo/logo-on-dark.png', 'logoLight'],
    ['logo/logo-on-light.png', 'logoDark'],
    ['characters/lineup.png', 'lineup'],
    ['characters/cast-sheet.jpg', 'castSheet'],
    ['artwork/collection.jpg', 'collage'],
    ['artwork/landscapes.jpg', 'settings'],
    ['artwork/palette.png', 'palette'],
  ];
  for (const [rel, name] of steps) {
    const url = await render(name);
    rel.endsWith('.jpg') ? saveJpg(rel, url) : savePng(rel, url);
    console.log('wrote', rel);
  }
  for (const size of [1024, 512, 256, 128, 64, 32]) savePng(`logo/icon-${size}.png`, await render('icon', size));
  fs.copyFileSync('public/favicon.svg', file('logo/icon.svg'));
  console.log('wrote logo/icon-*.png, logo/icon.svg');
  const cultures = await page.evaluate(() => window.studio.cultures);
  for (const [i, c] of cultures.entries()) savePng(`characters/${String(i + 1).padStart(2, '0')}-${c.id}-${c.rig}.png`, await render('character', i));
  console.log('wrote characters/*.png');

  // Animated banner: the parade crosses once per loop, so the GIF repeats without a seam.
  const loop = 8, fps = 15, frames = loop * fps;
  const dir = fs.mkdtempSync(path.join(tmp, 'banner-'));
  for (let f = 0; f < frames; f++) {
    const url = await render('animatedBanner', f / fps, loop);
    fs.writeFileSync(path.join(dir, `f${String(f).padStart(3, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  gif(path.join(dir, 'f%03d.png'), 'banners/banner-animated.gif', 'null', ['-framerate', String(fps)]);
  ffmpeg('-framerate', String(fps), '-i', path.join(dir, 'f%03d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', file('banners/banner-animated.mp4'));
  console.log('wrote banners/banner-animated.gif, .mp4');
  await page.close();
}

// ---------- the real game ----------
// The game is stepped by hand at a fixed frame rate, so captures are smooth however slowly the
// headless browser renders. Nothing presses a key or clicks, so audio stays locked and the run keeps
// time on its own beat clock: the same frames every time.

/** In the page: an autopilot (right tool, reveal hidden damage, jump for high lanes) and a frame stepper. */
const SETUP = async () => {
  const { DAMAGES } = await import('/src/data/conservation.ts');
  let photoAt = 0;
  window.__pilot = () => {
    const s = window.game.scene.getScene('Run');
    if (!s || !s.sys.isActive() || s.paused || s.briefing || s.ended || s.finale) return;
    const spots = s.spots.getChildren().map((c) => [c, c.getData('info')]).filter(([c, i]) => i.kind === 'damage' && !i.done && c.x > 210).sort((a, b) => a[0].x - b[0].x);
    if (!spots.length) return;
    const [spot, info] = spots[0];
    const dx = spot.x - 240, body = s.player.body;
    if (info.hidden && spot.alpha < 1) { if (dx < 520) s.useUV(); return; }
    const want = s.tools.indexOf(DAMAGES[info.damage].treatedBy);
    if (want !== s.toolIndex && dx < 420) s.selectTool(want);
    // An occasional photograph, as a player would take.
    if (!info.documented && s.cameraCooldown === 0 && dx < 600 && dx > 250 && s.elapsed - photoAt > 7) { s.useCamera(); photoAt = s.elapsed; }
    const lead = s.speed * (info.lane === 1 ? 0.3 : 0.52);
    if (info.lane > 0 && body.blocked.down && dx < lead + 40 && dx > lead - 60) s.jump();
    if (info.lane >= 3 && !body.blocked.down && body.velocity.y > -120 && s.extraJumps > 0) s.jump();
  };
  let clock = performance.now();
  window.__step = (frames, fps = 30) => {
    window.game.loop.sleep();
    const dt = 1000 / fps;
    for (let i = 0; i < frames; i++) {
      clock += dt;
      window.__pilot();
      window.game.step(clock, dt);
    }
  };
  window.__wake = () => { clock = performance.now(); window.game.loop.wake(); };
};

async function game(browser) {
  // A mid-game save, so the title, map and museum show progress.
  const save = {
    stars: { mexico: 3, portugal: 3, china: 2, egypt: 3, greece: 2, peru: 1 },
    best: { mexico: 1, portugal: 0.97, china: 0.86, egypt: 0.95, greece: 0.82, peru: 0.66 },
    scores: { mexico: 6120, portugal: 7480, china: 5210, egypt: 6890, greece: 5530, peru: 4020 },
    learned: ['grime', 'salts', 'flakingPaint', 'glazeLoss', 'crack', 'foxing', 'insects', 'tear', 'bronzeDisease', 'soot', 'oldRepair', 'blackCrust', 'creases', 'mould'],
    daily: {}, chill: false, seenIntro: true, seenEnding: false,
  };
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript((s) => { if (!localStorage.getItem('relic-revival-run:save:v1')) localStorage.setItem('relic-revival-run:save:v1', s); }, JSON.stringify(save));
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('Browser error:', e.message));
  await page.goto(`${base}/`);
  try { await page.waitForFunction(() => window.game?.scene.isActive('Title'), null, { timeout: 15000 }); } catch { await page.reload(); await page.waitForFunction(() => window.game?.scene.isActive('Title'), null, { timeout: 90000 }); }
  await page.evaluate(SETUP);
  const shot = async (rel) => { const png = path.join(tmp, 'shot.png'); await page.screenshot({ path: png }); ffmpeg('-i', png, '-q:v', '2', file(rel)); console.log('wrote', rel); };
  const go = async (key, data) => {
    await page.evaluate(([k, d]) => { window.__wake(); window.game.scene.getScenes(true).forEach((s) => window.game.scene.stop(s.scene.key)); window.game.scene.start(k, d); }, [key, data]);
  };
  const step = (seconds) => page.evaluate((n) => window.__step(n), Math.round(seconds * 30));
  const startRun = async (index, play = false) => {
    await go('Run', { index });
    await page.waitForFunction(() => window.game.scene.getScene('Run')?.briefing, null, { timeout: 30000 });
    await page.waitForTimeout(400);
    // Close the field guide by its own button, as a click would.
    if (play) await page.evaluate(() => {
      const s = window.game.scene.getScene('Run');
      const all = s.children.list.flatMap((c) => [c, ...(c.list || [])]);
      all.find((c) => c.getData?.('activate') && c.list?.some((t) => t.text === 'Start run')).getData('activate')();
    });
  };

  await page.waitForTimeout(1500);
  await shot('screenshots/01-title.jpg');
  await go('WorldMap'); await page.waitForTimeout(1500);
  await shot('screenshots/02-world-map.jpg');
  await startRun(3);
  await shot('screenshots/03-field-guide.jpg');

  // Gameplay clip: Portugal, after the opening lessons, 10 s at 30 fps.
  await startRun(1, true);
  await step(17);
  const frames = fs.mkdtempSync(path.join(tmp, 'clip-'));
  for (let f = 0; f < 300; f++) {
    await step(1 / 30);
    await page.screenshot({ path: path.join(frames, `f${String(f).padStart(3, '0')}.png`) });
  }
  await shot('screenshots/04-run-portugal.jpg');
  ffmpeg('-framerate', '30', '-i', path.join(frames, 'f%03d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', file('video/gameplay.mp4'));
  gif(path.join(frames, 'f%03d.png'), 'video/gameplay.gif', 'fps=12,scale=560:-1:flags=lanczos', ['-framerate', '30', '-t', '6'], true);
  console.log('wrote video/gameplay.mp4, video/gameplay.gif');

  for (const [index, rel, seconds] of [[3, 'screenshots/05-run-egypt-tomb.jpg', 14], [10, 'screenshots/06-run-cambodia.jpg', 21], [6, 'screenshots/07-run-japan.jpg', 24]]) {
    await startRun(index, true);
    await step(seconds);
    await shot(rel);
  }
  // Fast-forward to the finale, then finish it correctly for a real results card.
  await page.evaluate(() => { const s = window.game.scene.getScene('Run'); s.elapsed = s.diff.duration - 0.1; });
  for (let i = 0; i < 40 && !(await page.evaluate(() => !!window.game.scene.getScene('Run').finale)); i++) await step(1);
  await step(0.5);
  await shot('screenshots/08-final-restoration.jpg');
  await page.evaluate(async () => {
    const { DAMAGES } = await import('/src/data/conservation.ts');
    const s = window.game.scene.getScene('Run');
    s.beginFinale();
    while (s.finale) s.applyFinale(DAMAGES[s.finale.steps[s.finale.at].damage].treatedBy);
    window.__wake();
  });
  await page.waitForFunction(() => window.game.scene.isActive('Results'), null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  await shot('screenshots/09-results.jpg');
  await go('Museum'); await page.waitForTimeout(2500);
  await shot('screenshots/10-museum.jpg');
  await go('Credits', { ending: true }); await page.waitForTimeout(7500);
  await shot('screenshots/11-ending.jpg');
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  try {
    if (only !== 'game') await studio(browser);
    if (only !== 'studio') await game(browser);
  } finally {
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
