// Local browser review. No user save data is touched: Playwright uses an isolated browser context.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.GAME_URL || 'http://host.docker.internal:5173';
const out = process.env.REVIEW_OUT || '/work/docs/museum-music-review';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(120000);
    const errors = [];
    page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
    // Canvas avoids expensive software-WebGL readback in a CPU-only review container.
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        return type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl' ? null : original.call(this, type, ...args);
      };
    });
    await page.goto(base);
    await page.waitForFunction(() => window.game?.scene.isActive('Title'));
    console.log('Title loaded');
    const museum = async state => {
      await page.evaluate(async state => {
        const { CULTURES } = await import('/src/data/cultures.ts');
        const { DAMAGES } = await import('/src/data/conservation.ts');
        const save = { stars: {}, best: {}, learned: [], daily: {}, chill: false };
        if (state !== 'empty') {
          CULTURES.forEach((c, i) => {
            save.stars[c.id] = state === 'complete' ? 3 : i % 4;
            save.best[c.id] = state === 'complete' ? 1 : (i % 4) * 0.3;
          });
          save.learned = Object.keys(DAMAGES);
        }
        localStorage.setItem('relic-revival-run:save:v1', JSON.stringify(save));
        window.game.scene.getScenes(true).forEach(s => window.game.scene.stop(s.scene.key));
        window.game.scene.start('Museum');
      }, state);
      await page.waitForFunction(() => window.game.scene.isActive('Museum') && window.game.textures.exists('artifact-mali'));
      await page.waitForTimeout(150);
      console.log('Museum loaded:', state);
      await page.screenshot({ path: `${out}/museum-${state}.png` });
    };
    await museum('empty');
    await museum('partial');
    await museum('complete');
    // The long Greek label and seven-note Mali exhibit exercise both layout extremes.
    for (const id of ['greece', 'mali']) {
      await page.evaluate(async id => {
        const { CULTURES } = await import('/src/data/cultures.ts');
        const { loadSave } = await import('/src/systems/save.ts');
        window.game.scene.getScene('Museum').exhibit(CULTURES.find(c => c.id === id), loadSave());
      }, id);
      await page.screenshot({ path: `${out}/exhibit-${id}.png` });
      await page.mouse.click(480, 645);
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => window.audio.integrity), 1);
      assert.equal(await page.evaluate(() => window.audio.intensity), 0.9);
      assert.equal(await page.evaluate(() => window.audio.profileKey), id);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.audio.profileKey), 'menu');
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await page.screenshot({ path: `${out}/museum-mobile.png` });
    console.log('Museum states, artwork, exhibit previews, and navigation passed.');

    // Use the actual renderer with an OfflineAudioContext so sample peaks and clips are reproducible.
    // The dev harness intentionally accesses TS-private methods; no review API is shipped in the game.
    const metrics = [];
    // Every culture's full arrangement for one whole cycle (A A B A), plus one culture calm and in danger.
    const cultures = await page.evaluate(async () => (await import('/src/data/cultures.ts')).CULTURES.map(c => c.id));
    const renders = [...cultures.map(id => [id, 0.9, 1]), ['mali', 0, 1], ['mali', 0.9, 0.15]];
    for (const [id, intensity, integrity] of renders) {
      const rendered = await page.evaluate(async ({ id, intensity, integrity }) => {
        const { AudioDirector } = await import('/src/audio/AudioDirector.ts');
        const { CULTURES } = await import('/src/data/cultures.ts');
        const { instrumentsOf } = await import('/src/audio/score.ts');
        const c = CULTURES.find(c => c.id === id);
        const d = new AudioDirector();
        d.muted = false;
        d.play(c.sound, c.id);
        const steps = d.score.cycle, stepDuration = d.stepDur;
        const rate = 22050, seconds = steps * stepDuration + 2.5;
        const ctx = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
        d.initialize(ctx);
        const manifest = await fetch('/assets/audio/manifest.json').then(r => r.json());
        d.manifestData = manifest;
        const used = instrumentsOf(d.score);
        const files = [...used.melodic.flatMap(inst => manifest.melodic[inst].map(s => s.file)), ...used.perc.map(key => manifest.perc[key])];
        await Promise.all([...new Set(files)].map(async file => {
          const bytes = await fetch(`/assets/audio/${file}`).then(r => r.arrayBuffer());
          d.buffers.set(file, await ctx.decodeAudioData(bytes));
        }));
        d.intensity = intensity; d.integrity = integrity;
        d.start();
        clearInterval(d.timer); d.timer = undefined;
        for (let step = 0; step < steps; step++) d.playStep(step, 0.1 + step * stepDuration);
        for (const node of d.sustained) node.stop(seconds - 0.2);
        const buffer = await ctx.startRendering();
        const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
        let peak = 0, squares = 0, stereo = 0;
        const wav = new ArrayBuffer(44 + buffer.length * 4), view = new DataView(wav);
        const str = (offset, text) => [...text].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)));
        str(0, 'RIFF'); view.setUint32(4, wav.byteLength - 8, true); str(8, 'WAVE'); str(12, 'fmt ');
        view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
        view.setUint32(24, rate, true); view.setUint32(28, rate * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true);
        str(36, 'data'); view.setUint32(40, buffer.length * 4, true);
        for (let i = 0; i < buffer.length; i++) {
          peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
          squares += (left[i] ** 2 + right[i] ** 2) / 2;
          stereo += (left[i] - right[i]) ** 2;
          view.setInt16(44 + i * 4, Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), true);
          view.setInt16(46 + i * 4, Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), true);
        }
        const bytes = new Uint8Array(wav); let binary = '';
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return { wav: btoa(binary), peak, rms: Math.sqrt(squares / buffer.length), stereoRms: Math.sqrt(stereo / buffer.length), seconds };
      }, { id, intensity, integrity });
      const file = `${id}-${intensity === 0 ? 'calm' : integrity < 1 ? 'danger' : 'full'}.wav`;
      fs.writeFileSync(`${out}/${file}`, Buffer.from(rendered.wav, 'base64'));
      delete rendered.wav;
      assert.ok(rendered.peak < 0.98, `${file}: clipping risk ${rendered.peak}`);
      assert.ok(rendered.rms > 0.005, `${file}: silence or unexpectedly quiet mix`);
      assert.ok(rendered.stereoRms > 0.0001, `${file}: missing stereo arrangement`);
      metrics.push({ file, ...rendered });
      console.log('Rendered', file, 'peak', rendered.peak.toFixed(3), 'RMS', rendered.rms.toFixed(3));
    }
    fs.writeFileSync(`${out}/audio-metrics.json`, JSON.stringify(metrics, null, 2));
    // Tempo changes must preserve the beat seen by gameplay, and stale schedules must be bounded.
    await page.evaluate(async () => {
      const { CULTURES } = await import('/src/data/cultures.ts');
      const audio = window.audio;
      audio.preview(CULTURES[7].sound, 'india');
      const before = audio.beatPosition().beat;
      audio.setTempoScale(1.3);
      if (Math.abs(audio.beatPosition().beat - before) > 0.02) throw Error('Tempo change moved the beat');
      const step = audio.step;
      audio.nextTime -= 20;
      audio.schedule();
      if (audio.step - step < 20) throw Error('Scheduler did not skip stale notes');
      audio.toggleMute();
      if (!audio.muted) throw Error('Mute failed');
      audio.toggleMute();
      audio.stop();
    });
    await page.goto(`${base}/tools/music-preview/`);
    await page.locator('#play').click();
    await page.waitForTimeout(300);
    await page.locator('#culture').selectOption('iran');
    await page.locator('#stop').click();
    assert.deepEqual(errors, []);
    console.log('PASS: audio rendering, headroom, stereo, museum preview mix, tempo continuity, stalled scheduler, mute, and listening room.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
