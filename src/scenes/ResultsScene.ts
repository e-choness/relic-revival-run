import Phaser from 'phaser';
import { DAMAGES } from '../data/conservation';
import { CULTURES } from '../data/cultures';
import { isUnlocked, loadSave, recordStars } from '../systems/save';
import { drawArtifact } from '../ui/art';
import { FONT_DISPLAY, HEIGHT, INK_CSS, WIDTH, button, card, hex, label, stars } from '../ui/theme';
import type { RunResult } from './RunScene';

/** Museum-card style summary: how well the relic was restored and what the player learned. */
export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  create(r: RunResult) {
    const culture = CULTURES[r.index];
    const save = recordStars(loadSave(), culture.id, r.stars);
    this.add.graphics().fillGradientStyle(hex(culture.palette.ground), hex(culture.palette.ground), 0x1d1424, 0x1d1424, 1).fillRect(0, 0, WIDTH, HEIGHT);
    card(this, WIDTH / 2, HEIGHT / 2 - 40, 1000, 540);

    const title = r.stars > 0 ? 'Relic restored!' : 'The relic needs more care';
    label(this, WIDTH / 2, 110, title, 44, { fontFamily: FONT_DISPLAY });
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
      `Documented before treatment: ${r.documented}`,
    ];
    stats.forEach((s, i) => label(this, 560, 255 + i * 38, s, 26).setOrigin(0, 0.5));
    label(this, 560, 420, 'Conservation notes', 24, { fontFamily: FONT_DISPLAY, fontSize: '22px' }).setOrigin(0, 0.5);
    r.seen.slice(0, 2).forEach((d, i) =>
      label(this, 560, 462 + i * 46, `• ${DAMAGES[d].fact}`, 18, { color: INK_CSS, wordWrap: { width: 470 } }).setOrigin(0, 0.5),
    );

    const y = HEIGHT - 60;
    button(this, WIDTH / 2 - 280, y, 'Retry', () => this.scene.start('Run', { index: r.index }));
    button(this, WIDTH / 2, y, 'World map', () => this.scene.start('WorldMap'));
    if (isUnlocked(save, r.index + 1)) button(this, WIDTH / 2 + 280, y, 'Next', () => this.scene.start('Run', { index: r.index + 1 }));
  }
}
