import Phaser from 'phaser';
import { DAMAGES } from '../data/conservation';
import { CULTURES } from '../data/cultures';
import { dailyFor, isUnlocked, loadSave, recordDaily, recordRun } from '../systems/save';
import { drawArtifact } from '../ui/art';
import { addAvatar, type AvatarView } from '../ui/avatar';
import { MenuNav, focusButton } from '../ui/menuNav';
import { FONT_DISPLAY, HEIGHT, INK_CSS, WIDTH, button, card, hex, label, stars } from '../ui/theme';
import type { RunResult } from './RunScene';

/** Museum-card style summary: how well the relic was restored and what the player learned. */
export class ResultsScene extends Phaser.Scene {
  private avatar?: AvatarView;

  constructor() {
    super('Results');
  }

  create(r: RunResult) {
    const culture = CULTURES[r.index];
    const before = loadSave();
    let save = recordRun(before, culture.id, r.stars, r.restoration, r.seen);
    if (r.daily) save = recordDaily(save, r.daily, r.score);
    const newFacts = save.learned.length - before.learned.length;
    this.add.graphics().fillGradientStyle(hex(culture.palette.ground), hex(culture.palette.ground), 0x1d1424, 0x1d1424, 1).fillRect(0, 0, WIDTH, HEIGHT);
    card(this, WIDTH / 2, HEIGHT / 2 - 40, 1000, 540);

    const title = r.stars > 0 ? 'Relic restored!' : 'The relic needs more care';
    label(this, WIDTH / 2, 110, title, 44, { fontFamily: FONT_DISPLAY });
    const mode = [r.daily && `Daily challenge ${r.daily} · best ${save.daily[r.daily]}`, r.chill && 'Chill mode'].filter(Boolean).join('  ·  ');
    if (mode) label(this, WIDTH / 2, 150, mode, 18);
    stars(this, WIDTH / 2, 185, r.stars, 44);

    // The relic, as clean as the player left it.
    const art = this.add.graphics().setPosition(200, 240);
    drawArtifact(art, culture, 300, 190);
    this.add.graphics().setPosition(200, 240).fillStyle(0x6b5434, 0.75 * (1 - r.restoration)).fillRect(0, 0, 300, 190);
    label(this, 350, 455, culture.artifact, 22);
    label(this, 350, 485, `${culture.avatar.animal}: ${culture.avatar.note}`, 16, { wordWrap: { width: 320 }, align: 'center' });

    const stats = [
      `Restored: ${Math.round(r.restoration * 100)}%`,
      `Score: ${r.score}`,
      `Best combo: ×${r.bestCombo}`,
      `Perfect hits: ${r.perfects}`,
      `Documented before treatment: ${r.documented}`,
    ];
    stats.forEach((s, i) => label(this, 560, 245 + i * 33, s, 24).setOrigin(0, 0.5));
    label(this, 560, 420, 'Conservation notes', 24, { fontFamily: FONT_DISPLAY, fontSize: '22px' }).setOrigin(0, 0.5);
    if (newFacts > 0) label(this, WIDTH / 2, 216, `+${newFacts} new ${newFacts === 1 ? 'fact' : 'facts'} in the museum`, 17, { color: '#c4622d' });
    r.seen.slice(0, 2).forEach((d, i) =>
      label(this, 560, 462 + i * 46, `• ${DAMAGES[d].fact}`, 18, { color: INK_CSS, wordWrap: { width: 400 } }).setOrigin(0, 0.5),
    );

    // The restorer stands beside their work.
    this.avatar = addAvatar(this, culture, 1060, 470, 170, 'idle');

    const y = HEIGHT - 60;
    const buttons = [
      button(this, WIDTH / 2 - 280, y, 'Retry', () => this.scene.start('Run', { index: r.index, daily: r.daily ? { date: r.daily, ...dailyFor(r.daily) } : undefined })),
      button(this, WIDTH / 2, y, 'World map', () => this.scene.start('WorldMap')),
    ];
    if (!r.daily && isUnlocked(save, r.index + 1)) buttons.push(button(this, WIDTH / 2 + 280, y, 'Next', () => this.scene.start('Run', { index: r.index + 1 })));
    new MenuNav(this, buttons.map(focusButton), { back: () => this.scene.start('WorldMap'), start: buttons.length - 1 });
  }

  update(_t: number, deltaMs: number) {
    this.avatar?.tick(deltaMs / 1000);
  }
}
