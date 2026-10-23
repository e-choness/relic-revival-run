// Run in the temporary Playwright Docker container; no host installs required.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const base = process.env.GAME_URL || 'http://host.docker.internal:5173';
const out = '/work/docs/art-review';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error('Page error:', error.message); });
  if (!process.argv.includes('--skip-export')) {
    await page.goto(`${base}/tools/workshop/?noguard`);
    await page.waitForFunction(() => window.workshop?.doc?.id);
    console.log('Exported:', await page.evaluate(() => window.workshop.exportAll()));
  }
  await page.goto(`${base}/tools/art-preview/`);
  await page.waitForSelector('.avatar:nth-child(12)');
  await page.evaluate(async () => {
    const images = [...document.querySelectorAll('.landscapes img')];
    images.forEach(img => img.loading = 'eager');
    await Promise.all(images.map(img => img.decode()));
  });
  await page.screenshot({ path: `${out}/cast-and-landscapes.png`, fullPage: true });
  await page.locator('#cast').screenshot({ path: `${out}/cast.png` });
  await page.locator('#seam').click();
  await page.locator('#parallax').screenshot({ path: `${out}/parallax-wrap.png` });
  await page.evaluate(async () => {
    const { runPose, jumpPose, fallPose, svgTransforms, DEFAULT_RUN } = await import('/src/art/rig.ts');
    const doc = await fetch('/avatars/axolotl.avatar.json').then(r => r.json());
    const strip = document.createElement('div'); strip.id = 'motion-strip';
    strip.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);background:#fffaf0;padding:20px';
    const poses = [...Array.from({ length: 8 }, (_, i) => ({ label: `Stride ${i + 1}`, pose: runPose(i / 8 / DEFAULT_RUN.cadence) })), { label: 'Jump', pose: jumpPose(0.2) }, { label: 'Fall', pose: fallPose(0.2) }];
    for (const { label, pose } of poses) {
      const card = document.querySelector('.avatar').cloneNode(true);
      card.querySelector('h3').textContent = label; card.querySelector('p').textContent = '';
      const transforms = svgTransforms(doc, pose);
      card.querySelectorAll('[data-part]').forEach(g => g.setAttribute('transform', transforms[g.dataset.part] || ''));
      strip.append(card);
    }
    document.body.prepend(strip);
  });
  await page.locator('#motion-strip').screenshot({ path: `${out}/motion-strip.png` });
  console.log('Art gallery captured');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${base}/?all`);
  await page.waitForFunction(() => window.game?.scene?.isActive('Title'));
  console.log('Title loaded');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/title.png` });
  await page.evaluate(() => window.game.scene.start('Run', { index: 0 }));
  await page.waitForFunction(() => window.game.scene.isActive('Run') && window.game.scene.getScene('Run').briefing);
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('Run');
    const all = scene.children.list.flatMap(c => [c, ...(c.list || [])]);
    const button = all.find(c => c.getData?.('activate') && c.list?.some(t => t.text === 'Start run'));
    button?.getData('activate')();
  });
  await page.waitForTimeout(900);
  await page.waitForFunction(() => window.game.scene.getScene('Run').player.body.blocked.down);
  await page.screenshot({ path: `${out}/mexico-run.png` });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: `${out}/mobile-landscape.png` });
  console.log('Browser errors:', errors);
  if (errors.length) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
