const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const base = process.env.GAME_URL || 'http://host.docker.internal:5173';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.setDefaultTimeout(120000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(`${base}/?all`);
    await page.waitForFunction(() => window.game?.scene?.isActive('Title'));
    const ids = ['mexico', 'portugal', 'china', 'egypt', 'greece', 'peru', 'japan', 'india', 'iran', 'nigeria', 'cambodia', 'mali'];
    fs.mkdirSync('/work/docs/art-review', { recursive: true });
    const start = Number(process.env.START_INDEX || 0);
    for (let index = start; index < ids.length; index++) {
      await page.evaluate(index => window.game.scene.start('Run', { index }), index);
      await page.waitForFunction(id => {
        const scene = window.game.scene.getScene('Run');
        return scene.culture.id === id && scene.briefing && !scene.load.isLoading();
      }, ids[index]);
      const result = await page.evaluate(() => {
        const scene = window.game.scene.getScene('Run');
        const rig = scene.cache.json.get(`rig-${scene.culture.avatar.rig}`);
        const missing = rig.parts.filter(p => !scene.textures.exists(`${rig.id}-part-${p.id}`));
        const loaded = scene.textures.exists(`landscape-v3-${scene.culture.id}-loop`);
        const factors = scene.layers.map(l => l.factor);
        const all = scene.children.list.flatMap(c => [c, ...(c.list || [])]);
        all.find(c => c.getData?.('activate') && c.list?.some(t => t.text === 'Start run')).getData('activate')();
        return { id: scene.culture.id, loaded, factors, parts: rig.parts.length, missing: missing.map(p => p.id) };
      });
      if (!result.loaded || result.missing.length || result.parts < 14 || JSON.stringify(result.factors) !== '[0.08,0.32,1]') throw new Error(JSON.stringify(result));
      if ([0, 1, 3, 11].includes(index)) {
        await page.waitForFunction(() => window.game.scene.getScene('Run').player.body.blocked.down);
        await page.screenshot({ path: `/work/docs/art-review/${ids[index]}-run.png` });
      }
      console.log(JSON.stringify(result));
    }
    // Exercise all animation states and cosmetic reactions on the live Phaser view.
    const animation = await page.evaluate(() => {
      const scene = window.game.scene.getScene('Run');
      scene.physics.pause();
      const avatar = scene.avatar;
      for (const state of ['idle', 'run', 'jump', 'fall', 'run']) {
        avatar.setAnim(state);
        for (let i = 0; i < 20; i++) avatar.tick(1 / 60);
      }
      avatar.react('restore'); avatar.tick(0.05);
      avatar.react('mistake'); avatar.tick(0.05);
      return avatar.object.list.every(p => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.rotation));
    });
    if (!animation) throw new Error('Invalid animation transform');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.screenshot({ path: '/work/docs/art-review/mobile-landscape.png' });
    console.log(`${ids.length - start} landscapes and rigs loaded; animation transforms finite. Errors:`, errors);
    if (errors.length) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
