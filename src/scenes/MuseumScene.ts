import Phaser from 'phaser';
import { AudioDirector } from '../audio/AudioDirector';
import { MENU_PROFILE } from '../audio/music';
import { DAMAGES } from '../data/conservation';
import { CULTURES, type Culture } from '../data/cultures';
import { curatorTitle, loadSave, totalStars, type SaveData } from '../systems/save';
import { drawArtifact } from '../ui/art';
import { MenuNav, focusButton, type Focusable } from '../ui/menuNav';
import { FONT_DISPLAY, HEIGHT, INK, INK_CSS, PAPER_CSS, WIDTH, button, card, hex, label, stars } from '../ui/theme';

const EX_W = 170;
const EX_H = 88;
/** Exhibit frame: artifact on top, name and stars below. */
const FRAME_H = EX_H + 64;

/**
 * The museum: every artifact you have restored, as clean as your best run, with the conservation facts
 * you have learned. A reason to replay for three stars, and the game's heritage message made visible.
 */
export class MuseumScene extends Phaser.Scene {
  private nav?: MenuNav;

  constructor() {
    super('Museum');
  }

  create() {
    AudioDirector.get().play(MENU_PROFILE, 'menu');
    const save = loadSave();
    const total = totalStars(save);
    const rank = curatorTitle(total);
    this.add.graphics().fillGradientStyle(0x2b1d33, 0x2b1d33, 0x1d1424, 0x1d1424, 1).fillRect(0, 0, WIDTH, HEIGHT);
    label(this, WIDTH / 2, 48, 'Museum', 46, { fontFamily: FONT_DISPLAY, color: PAPER_CSS });
    const progress = rank.next ? `${total}/${rank.next} stars to the next rank` : 'Every artifact fully restored!';
    label(this, WIDTH / 2, 96, `${rank.title} · ${total} ★ · ${progress}`, 20, { color: '#f2c14e' });

    const focus: Focusable[] = [];
    CULTURES.forEach((c, i) => {
      const x = 170 + (i % 4) * 313, y = 205 + Math.floor(i / 4) * 160;
      const best = save.best[c.id] ?? 0;
      const starCount = save.stars[c.id] ?? 0;
      const visited = best > 0;
      // Gold frame for a perfect restoration.
      card(this, x, y, EX_W + 40, FRAME_H, starCount === 3 ? 0xf2c14e : 0xfff6e6);
      const art = this.add.graphics().setPosition(x - EX_W / 2, y - EX_H / 2 - 12);
      drawArtifact(art, c, EX_W, EX_H);
      this.add.graphics().setPosition(x - EX_W / 2, y - EX_H / 2 - 12).fillStyle(0x6b5434, visited ? 0.8 * (1 - best) : 0.92).fillRect(0, 0, EX_W, EX_H);
      if (!visited) label(this, x, y - 12, 'Not yet restored', 18, { color: PAPER_CSS });
      label(this, x, y + EX_H / 2, c.name, 20, { fontFamily: FONT_DISPLAY, fontSize: '18px' });
      stars(this, x, y + EX_H / 2 + 22, starCount, 14);
      const open = () => this.exhibit(c, save);
      this.add.zone(x, y, EX_W + 40, FRAME_H).setInteractive({ useHandCursor: true }).on('pointerdown', open);
      focus.push({ x, y, w: EX_W + 40, h: FRAME_H, activate: open });
    });
    const back = button(this, 130, HEIGHT - 44, 'Back', () => this.scene.start('WorldMap'), 180);
    this.nav = new MenuNav(this, [...focus, focusButton(back)], { back: () => this.scene.start('WorldMap') });
  }

  /** Exhibit card: the artifact, its restorer, unlocked facts, and the culture's music. */
  private exhibit(c: Culture, save: SaveData) {
    this.nav?.setEnabled(false);
    const audio = AudioDirector.get();
    const layer = this.add.container(0, 0).setDepth(30);
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, INK, 0.7).setInteractive());
    layer.add(card(this, WIDTH / 2, HEIGHT / 2, 980, 600, hex('#fff6e6')));
    layer.add(label(this, WIDTH / 2, 92, `${c.name}: ${c.artifact}`, 32, { fontFamily: FONT_DISPLAY }));
    const art = this.add.graphics().setPosition(180, 140);
    drawArtifact(art, c, 330, 210);
    const grime = this.add.graphics().setPosition(180, 140).fillStyle(0x6b5434, 0.8 * (1 - (save.best[c.id] ?? 0))).fillRect(0, 0, 330, 210);
    layer.add([art, grime]);
    layer.add(label(this, 345, 380, `Restored up to ${Math.round((save.best[c.id] ?? 0) * 100)}%`, 20));
    layer.add(label(this, 345, 420, `Restorer: ${c.avatar.animal}`, 20));
    layer.add(label(this, 345, 452, c.avatar.note, 16, { wordWrap: { width: 320 }, align: 'center' }));
    layer.add(label(this, 560, 150, 'Conservation notes', 24, { fontFamily: FONT_DISPLAY, fontSize: '22px' }).setOrigin(0, 0.5));
    c.damages.forEach((d, i) => {
      const known = save.learned.includes(d);
      const def = DAMAGES[d];
      layer.add(label(this, 560, 192 + i * 52, known ? `${def.name}: ${def.fact}` : '??? Meet this damage in a run to learn about it.', 17, { color: known ? INK_CSS : '#7a6a85', wordWrap: { width: 520 } }).setOrigin(0, 0.5));
    });
    let playing = false;
    const listenLabel = () => (playing ? 'Stop music' : `Listen: ${c.name}`);
    const listen = button(this, WIDTH / 2 - 160, HEIGHT - 110, listenLabel(), () => {
      playing = !playing;
      if (playing) audio.play(c.sound, c.id);
      else audio.play(MENU_PROFILE, 'menu');
      (listen.getAt(1) as Phaser.GameObjects.Text).setText(listenLabel());
    }, 280);
    const close = () => {
      if (playing) audio.play(MENU_PROFILE, 'menu');
      nav.destroy();
      layer.destroy();
      this.time.delayedCall(0, () => this.nav?.setEnabled(true));
    };
    const back = button(this, WIDTH / 2 + 160, HEIGHT - 110, 'Back', close, 200);
    layer.add([listen, back]);
    const nav = new MenuNav(this, [listen, back].map(focusButton), { back: close, depth: 40 });
  }
}
