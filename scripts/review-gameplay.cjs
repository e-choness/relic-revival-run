// Run with Playwright against the Vite dev server; writes ignored review screenshots.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.GAME_URL || 'http://host.docker.internal:5173';
const out = process.env.REVIEW_OUT || '/work/docs/gameplay-review';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on('pageerror', e => { errors.push(e.message); console.error('Browser error:', e.message); });
    await page.goto(`${base}/?all`);
    await page.waitForFunction(() => window.game?.scene.isActive('Title'));
    console.log('Title loaded');
    const startRun = async index => {
      await page.evaluate(index => {
        window.game.scene.getScenes(true).forEach(scene => window.game.scene.stop(scene.scene.key));
        window.game.scene.start('Run', { index });
      }, index);
      await page.waitForFunction(() => window.game.scene.isActive('Run') && window.game.scene.getScene('Run').briefing);
      console.log('Field guide loaded:', index);
    };
    const press = async text => {
      await page.evaluate(text => {
        const scene = window.game.scene.getScene('Run');
        const children = scene.children.list.flatMap(c => [c, ...(c.list || [])]);
        const button = children.find(c => c.getData?.('activate') && c.list?.some(t => t.text === text));
        if (!button) throw Error(`Missing button: ${text}`);
        button.getData('activate')();
      }, text);
    };
    await startRun(11);
    await page.screenshot({ path: `${out}/mali-field-guide.png` });
    await startRun(0);
    await page.screenshot({ path: `${out}/mexico-field-guide.png` });
    await press('Start run');
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${out}/run.png` });
    await page.mouse.click(1220, 668);
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(() => window.game.scene.getScene('Run').cameraCooldown > 0));
    await page.screenshot({ path: `${out}/cooldown.png` });
    // Mouse: right click on the art photographs, left click reveals; neither jumps.
    await page.evaluate(() => { window.game.scene.getScene('Run').cameraCooldown = 0; });
    await page.mouse.click(700, 300, { button: 'right' });
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(() => window.game.scene.getScene('Run').cameraCooldown > 0));
    await page.mouse.click(700, 300);
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(() => window.game.scene.getScene('Run').player.body.velocity.y >= 0), 'a left click must not jump');
    // Real pointer interaction must pause without jumping and preserve run time.
    await page.mouse.click(1044, 40);
    assert.equal(await page.evaluate(() => window.game.scene.getScene('Run').paused), true);
    const frozen = await page.evaluate(() => window.game.scene.getScene('Run').elapsed);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => window.game.scene.getScene('Run').elapsed), frozen);
    await page.screenshot({ path: `${out}/pause.png` });
    await press('Field guide');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.game.scene.getScene('Run').paused), true);
    await press('Resume');
    await page.evaluate(() => window.game.events.emit('blur'));
    assert.equal(await page.evaluate(() => window.game.scene.getScene('Run').paused), true);
    await press('Resume');
    // Portugal must stop generating bonus tiles when its run timer ends.
    await startRun(1);
    await press('Start run');
    await page.evaluate(() => {
      const s = window.game.scene.getScene('Run');
      s.elapsed = s.diff.duration;
      s.spots.clear(true, true);
      s.rand = () => 0;
      s.lastWholeBeat = -1;
      s.updateTwist(3);
      if (s.spots.countActive() !== 0) throw Error('Bonus tiles spawned after the run ended');
      for (let i = 0; i < 20; i++) {
        s.state.spawn();
        if (i < 17) s.state.treat('grime', 'brush');
        else if (i < 19) s.state.miss();
        else s.state.treat('salts', 'brush');
      }
      s.seen = new Set(['grime', 'salts']);
      s.refreshHud();
    });
    await page.waitForFunction(() => !!window.game.scene.getScene('Run').finale);
    const before = await page.evaluate(() => window.game.scene.getScene('Run').finale.left);
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => window.game.scene.getScene('Run').finale.left), before);
    await page.screenshot({ path: `${out}/finale-ready.png` });
    await press('Begin final care');
    await page.waitForTimeout(200);
    assert.ok(await page.evaluate(() => window.game.scene.getScene('Run').finale.left) < before);
    await page.mouse.click(1044, 40);
    await press('Resume');
    assert.equal(await page.evaluate(() => window.game.scene.getScene('Run').physics.world.isPaused), true);
    await page.evaluate(async () => {
      const { DAMAGES } = await import('/src/data/conservation.ts');
      const s = window.game.scene.getScene('Run');
      while (s.finale) s.applyFinale(DAMAGES[s.finale.steps[s.finale.at].damage].treatedBy);
    });
    await page.waitForFunction(() => window.game.scene.isActive('Results'));
    await page.screenshot({ path: `${out}/results.png` });
    await startRun(11);
    await press('Start run');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/mali-run.png` });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.screenshot({ path: `${out}/mobile-landscape.png` });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.evaluate(() => {
      const s = window.game.scene.getScene('Run');
      s.elapsed = s.diff.duration;
      s.spots.clear(true, true);
    });
    await page.waitForFunction(() => !!window.game.scene.getScene('Run').finale);
    await press('Begin final care');
    await page.screenshot({ path: `${out}/mali-finale.png` });
    // Pause menu: options overlay, then restart into a fresh briefing.
    await page.mouse.click(1044, 40);
    await press('Options');
    await page.screenshot({ path: `${out}/pause-options.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.game.scene.getScene('Run').subMenu), false);
    await press('Restart');
    await page.waitForFunction(() => window.game.scene.getScene('Run').briefing);
    // The ending: the completed collection, then the credits roll, skipped to the end.
    await page.evaluate(() => {
      window.game.scene.getScenes(true).forEach(scene => window.game.scene.stop(scene.scene.key));
      window.game.scene.start('Credits', { ending: true });
    });
    await page.waitForFunction(() => window.game.scene.isActive('Credits'));
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `${out}/ending.png` });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.game.scene.getScene('Credits').finished);
    await page.screenshot({ path: `${out}/credits.png` });
    assert.deepEqual(errors, []);
    console.log('PASS: pointer controls, cooldowns, pause/submenus, focus loss, finite bonus spawns, finale readiness/resume/completion, mouse reveal/photo, results, options, restart, ending and credits; no browser errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
