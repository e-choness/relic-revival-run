import Phaser from 'phaser';
import { DAMAGES } from '../data/conservation';
import { CULTURES } from '../data/cultures';
import { dailyFor, isComplete, isUnlocked, loadSave, recordDaily, recordRun } from '../systems/save';
import { addArtifact, loadArtifact } from '../ui/artifacts';
import { addAvatar, type AvatarView } from '../ui/avatar';
import { MenuNav, focusButton } from '../ui/menuNav';
import { FONT_DISPLAY, HEIGHT, INK_CSS, WIDTH, button, card, hex, label, stars } from '../ui/theme';
import type { RunResult } from './RunScene';

/** Museum-card style summary: how well the relic was restored and what the player learned. */
export class ResultsScene extends Phaser.Scene {
  private avatar?: AvatarView;
  private result!: RunResult;

  constructor() {
    super('Results');
  }

  // Phaser passes scene data to init and create, but not to preload.
  init(r: RunResult) {
    this.result = r;
  }

  preload() {
    loadArtifact(this, CULTURES[this.result.index].id);
  }

  create(r: RunResult) {
    const culture = CULTURES[r.index];
    const before = loadSave();
    // The daily challenge can visit a culture not reached yet. Its stars wait until then, or they would
    // unlock the next culture out of order; the facts it taught are kept.
    const counts = !r.daily || isUnlocked(before, r.index);
    let save = counts ? recordRun(before, culture.id, r.stars, r.restoration, r.seen, r.score) : recordRun(before, culture.id, 0, 0, r.seen);
    if (r.daily) save = recordDaily(save, r.daily, r.score);
    const newFacts = save.learned.length - before.learned.length;
    this.add.graphics().fillGradientStyle(hex(culture.palette.ground), hex(culture.palette.ground), 0x1d1424, 0x1d1424, 1).fillRect(0, 0, WIDTH, HEIGHT);
    card(this, WIDTH / 2, HEIGHT / 2 - 40, 1000, 540);

    const title = r.failed ? 'A little more practice' : r.stars > 0 ? 'Relic restored!' : 'The relic needs more care';
    label(this, WIDTH / 2, 110, title, 44, { fontFamily: FONT_DISPLAY });
    const mode = [r.daily && `Daily challenge ${r.daily} · best ${save.daily[r.daily]}`, r.chill && 'Chill mode', !counts && 'Stars count once you reach this culture'].filter(Boolean).join('  ·  ');
    if (mode) label(this, WIDTH / 2, 150, mode, 18);
    stars(this, WIDTH / 2, 185, r.stars, 44);

    // The relic, as clean as the player left it.
    addArtifact(this, culture, 200, 240, 300, 190);
    this.add.graphics().setPosition(200, 240).fillStyle(0x6b5434, 0.75 * (1 - r.restoration)).fillRect(0, 0, 300, 190);
    label(this, 350, 455, culture.artifact, 22);
    label(this, 350, 485, `${culture.avatar.animal}: ${culture.avatar.note}`, 16, { wordWrap: { width: 320 }, align: 'center' });

    const stats = [
      `Restored: ${Math.round(r.restoration * 100)}%`,
      `Score: ${r.score.toLocaleString()}   ·   Condition: ${Math.ceil(r.integrity * 100)}%`,
      `Best combo: ×${r.bestCombo}`,
      `Perfect hits: ${r.perfects}`,
      `Missed: ${r.missed}   ·   Wrong tools: ${r.wrongTools}   ·   Photos: ${r.documented}`,
    ];
    stats.forEach((s, i) => label(this, 560, 245 + i * 33, s, 24).setOrigin(0, 0.5));
    label(this, 560, 420, 'Conservation notes', 24, { fontFamily: FONT_DISPLAY, fontSize: '22px' }).setOrigin(0, 0.5);
    const next = CULTURES[r.index + 1];
    const unlocked = next && !isUnlocked(before, r.index + 1) && isUnlocked(save, r.index + 1);
    const news = [
      !!before.scores[culture.id] && r.score > before.scores[culture.id] && 'New best score!',
      unlocked && `${next.name} unlocked!`,
      newFacts > 0 && `+${newFacts} new ${newFacts === 1 ? 'fact' : 'facts'} in the museum`,
    ].filter(Boolean).join('  ·  ');
    if (news) label(this, WIDTH / 2, 216, news, 17, { color: '#c4622d' });
    r.seen.slice(0, 2).forEach((d, i) =>
      label(this, 560, 462 + i * 46, `• ${DAMAGES[d].fact}`, 18, { color: INK_CSS, wordWrap: { width: 400 } }).setOrigin(0, 0.5),
    );

    const target = r.restoration < 0.6 ? 60 : r.restoration < 0.8 ? 80 : 95;
    const tip = r.failed
      ? 'Condition ran out. Try tool hints or Chill mode from the world map.'
      : r.stars === 3
        ? 'Beautiful work! Try photographing damage before treatment for bonus points.'
        : `Next star: restore ${target}%. ${r.missed > r.wrongTools ? 'Watch the lanes and jump a little earlier.' : 'Choose the matching tool before contact.'}`;
    label(this, WIDTH / 2, 572, tip, 20, { color: INK_CSS, wordWrap: { width: 900 }, align: 'center' });

    // The restorer stands beside their work.
    this.avatar = addAvatar(this, culture, 1060, 470, 170, 'idle');

    const y = HEIGHT - 60;
    const buttons = [
      button(this, WIDTH / 2 - 280, y, 'Retry', () => this.scene.start('Run', { index: r.index, daily: r.daily ? { date: r.daily, ...dailyFor(r.daily) } : undefined })),
      button(this, WIDTH / 2, y, 'World map', () => this.scene.start('WorldMap')),
    ];
    // The last relic restored: the ending plays (once; the title's Credits replays it).
    if (isComplete(save) && !save.seenEnding) buttons.push(button(this, WIDTH / 2 + 280, y, 'Collection complete!', () => this.scene.start('Credits', { ending: true }), 300, 0xf2c14e));
    else if (!r.daily && isUnlocked(save, r.index + 1)) buttons.push(button(this, WIDTH / 2 + 280, y, 'Next culture', () => this.scene.start('Run', { index: r.index + 1 })));
    new MenuNav(this, buttons.map(focusButton), { back: () => this.scene.start('WorldMap'), start: r.stars > 0 ? buttons.length - 1 : 0 });
  }

  update(_t: number, deltaMs: number) {
    this.avatar?.tick(deltaMs / 1000);
  }
}
