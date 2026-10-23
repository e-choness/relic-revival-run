import Phaser from 'phaser';
import { AudioDirector } from '../audio/AudioDirector';
import { MENU_PROFILE } from '../audio/music';
import { DAMAGES } from '../data/conservation';
import { CULTURES, type Culture } from '../data/cultures';
import { curatorTitle, loadSave, totalStars, type SaveData } from '../systems/save';
import { addArtifact, loadArtifact } from '../ui/artifacts';
import { MenuNav, focusButton, type Focusable } from '../ui/menuNav';
import { FONT_DISPLAY, HEIGHT, INK, INK_CSS, PAPER_CSS, WIDTH, button, card, hex, label, stars } from '../ui/theme';

const EX_W = 246;
const EX_H = 108;
/** Exhibit frame: artifact on top, name and stars below. */
const FRAME_H = 160;

/**
 * The museum: every artifact you have restored, as clean as your best run, with the conservation facts
 * you have learned. A reason to replay for three stars, and the game's heritage message made visible.
 */
export class MuseumScene extends Phaser.Scene {
  private nav?: MenuNav;

  constructor() {
    super('Museum');
  }

  preload() {
    for (const c of CULTURES) loadArtifact(this, c.id);
  }

  create() {
    AudioDirector.get().play(MENU_PROFILE, 'menu');
    const save = loadSave();
    const total = totalStars(save);
    const rank = curatorTitle(total);
    this.add.graphics().fillGradientStyle(0x2b1d33, 0x2b1d33, 0x1d1424, 0x1d1424, 1).fillRect(0, 0, WIDTH, HEIGHT);
    label(this, WIDTH / 2, 45, 'The restoration collection', 40, { fontFamily: FONT_DISPLAY, color: PAPER_CSS });
    const progress = rank.next ? `${total}/${rank.next} stars to the next rank` : 'Every artifact fully restored!';
    const collected = CULTURES.filter(c => (save.stars[c.id] ?? 0) > 0).length;
    label(this, WIDTH / 2, 91, `${collected} / ${CULTURES.length} restored · ${rank.title} · ${progress}`, 20, { color: '#f2c14e' });

    const focus: Focusable[] = [];
    CULTURES.forEach((c, i) => {
      const x = 172 + (i % 4) * 312, y = 205 + Math.floor(i / 4) * 170;
      const best = save.best[c.id] ?? 0;
      const starCount = save.stars[c.id] ?? 0;
      const visited = best > 0;
      // Gold frame for a perfect restoration.
      card(this, x, y, EX_W + 28, FRAME_H, starCount === 3 ? 0xf2c14e : 0xfff6e6);
      addArtifact(this, c, x - EX_W / 2, y - 72, EX_W, EX_H);
      // A trace of wear communicates progress without hiding the exhibit.
      this.add.rectangle(x, y - 18, EX_W, EX_H, 0x6b5434, 0.14 * (1 - best));
      label(this, x - 112, y + 46, c.name, 21).setOrigin(0, 0.5);
      stars(this, x + 82, y + 48, starCount, 17);
      label(this, x - 112, y + 67, visited ? `${Math.round(best * 100)}% restored · view exhibit` : 'Awaiting care · view exhibit', 15, { color: '#675344' }).setOrigin(0, 0.5);
      const open = () => this.exhibit(c, save);
      this.add.zone(x, y, EX_W + 28, FRAME_H).setInteractive({ useHandCursor: true }).on('pointerdown', open);
      focus.push({ x, y, w: EX_W + 28, h: FRAME_H, activate: open });
    });
    const back = button(this, 130, HEIGHT - 44, 'Back', () => this.scene.start('WorldMap'), 180);
    label(this, 760, HEIGHT - 42, 'Explore an exhibit to see its details and hear its soundtrack.', 22, { color: PAPER_CSS });
    this.nav = new MenuNav(this, [...focus, focusButton(back)], { back: () => this.scene.start('WorldMap') });
  }

  /** Exhibit card: the artifact, its restorer, unlocked facts, and the culture's music. */
  private exhibit(c: Culture, save: SaveData) {
    this.nav?.setEnabled(false);
    const audio = AudioDirector.get();
    const layer = this.add.container(0, 0).setDepth(30);
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, INK, 0.7).setInteractive());
    layer.add(card(this, WIDTH / 2, HEIGHT / 2, 1140, 640, hex('#fff6e6')));
    layer.add(label(this, WIDTH / 2, 88, c.name, 38, { fontFamily: FONT_DISPLAY }));
    layer.add(label(this, WIDTH / 2, 130, c.artifact, 26, { wordWrap: { width: 1000 }, align: 'center' }));
    const art = addArtifact(this, c, 110, 175, 480, 320);
    const grime = this.add.rectangle(350, 335, 480, 320, 0x6b5434, 0.14 * (1 - (save.best[c.id] ?? 0)));
    layer.add([art, grime]);
    layer.add(label(this, 350, 520, (save.best[c.id] ?? 0) > 0 ? `Best restoration · ${Math.round(save.best[c.id] * 100)}%${save.scores[c.id] ? ` · score ${save.scores[c.id].toLocaleString()}` : ''}` : 'Awaiting your first restoration', 23));
    layer.add(label(this, 350, 557, `Restorer: ${c.avatar.animal}`, 20));
    layer.add(label(this, 350, 586, c.avatar.note, 17, { wordWrap: { width: 460 }, align: 'center' }));
    layer.add(label(this, 640, 176, 'Conservation notes', 24, { fontFamily: FONT_DISPLAY, fontSize: '22px' }).setOrigin(0, 0.5));
    c.damages.forEach((d, i) => {
      const known = save.learned.includes(d);
      const def = DAMAGES[d];
      layer.add(label(this, 640, 224 + i * 52, known ? `${def.name}: ${def.fact}` : `${def.name} · Encounter it during a run to unlock its conservation note.`, 17, { color: known ? INK_CSS : '#7a6a85', wordWrap: { width: 510 } }).setOrigin(0, 0.5));
    });
    let playing = false;
    const listenLabel = () => (playing ? 'Stop music' : `Listen: ${c.name}`);
    const listen = button(this, WIDTH / 2 - 160, HEIGHT - 75, listenLabel(), () => {
      playing = !playing;
      if (playing) audio.preview(c.sound, c.id);
      else audio.play(MENU_PROFILE, 'menu');
      (listen.getAt(1) as Phaser.GameObjects.Text).setText(listenLabel());
    }, 280);
    const close = () => {
      if (playing) audio.play(MENU_PROFILE, 'menu');
      nav.destroy();
      layer.destroy();
      this.time.delayedCall(0, () => this.nav?.setEnabled(true));
    };
    const back = button(this, WIDTH / 2 + 160, HEIGHT - 75, 'Back', close, 200);
    layer.add([listen, back]);
    const nav = new MenuNav(this, [listen, back].map(focusButton), { back: close, depth: 40 });
  }
}
