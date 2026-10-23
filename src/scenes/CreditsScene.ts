import Phaser from 'phaser';
import { AudioDirector } from '../audio/AudioDirector';
import { MENU_PROFILE } from '../audio/music';
import { CULTURES } from '../data/cultures';
import { loadSave, markSeen } from '../systems/save';
import { addArtifact, loadArtifact } from '../ui/artifacts';
import { addAvatar, type AvatarView } from '../ui/avatar';
import { MenuNav, focusButton } from '../ui/menuNav';
import { FONT_DISPLAY, HEIGHT, PAPER_CSS, REDUCED_MOTION, WIDTH, button, card, label } from '../ui/theme';

export interface CreditsData {
  /** Play the ending first: the completed collection and the game's message. */
  ending?: boolean;
}

const GROUND_Y = 668;
const PARADE_GAP = 104;
const PARADE_SPEED = 120;
/** Credits scroll speed, px/s. */
const SCROLL = 46;

const CREDITS: [string, number, string?][] = [
  ['Relic Revival Run', 52, FONT_DISPLAY],
  ['', 18],
  ['Remake', 22, '#f2c14e'],
  ['Echo Yin', 30],
  ['', 18],
  ['Original game (2023)', 22, '#f2c14e'],
  ['Studio Jojo', 30],
  ['Made for the Mini Game Work Jam 2023,', 20],
  ['a jam against the illicit traffic of cultural property', 20],
  ['', 18],
  ['Music', 22, '#f2c14e'],
  ['Composed at play time from each culture\'s scales and rhythms', 20],
  ['Instrument samples: Versilian Community Sample Library (CC0)', 20],
  ['', 18],
  ['Fonts', 22, '#f2c14e'],
  ['Borel and Edu SA Beginner (SIL Open Font License)', 20],
  ['', 18],
  ['Engine', 22, '#f2c14e'],
  ['Phaser 3', 20],
  ['', 18],
  ['The restorers', 22, '#f2c14e'],
  ...CULTURES.map((c): [string, number] => [`${c.avatar.animal} · ${c.name}`, 20]),
  ['', 18],
  ['The objects in this game are illustrations, not real museum pieces.', 18],
  ['Their damage and treatments follow real conservation practice.', 18],
  ['', 30],
  ['Thank you for playing', 36, FONT_DISPLAY],
];

const MESSAGE =
  'Every object here carries the memory of the people who made it. When heritage is looted, ' +
  'trafficked or left to decay, that memory is torn away. Conservators, communities and museums ' +
  'work every day to care for it, and to bring it home.';

/** The ending (all twelve cultures restored) and the credits roll. Also reachable from the title. */
export class CreditsScene extends Phaser.Scene {
  private parade: { view: AvatarView; x: number }[] = [];
  private roll?: Phaser.GameObjects.Container;
  private rollEnd = 0;
  private finished = false;
  private ending = false;
  private skipHint?: Phaser.GameObjects.Text;

  constructor() {
    super('Credits');
  }

  init(data: CreditsData) {
    this.ending = !!data.ending;
    this.finished = false;
    this.roll = undefined;
  }

  preload() {
    if (this.ending) for (const c of CULTURES) loadArtifact(this, c.id);
  }

  create() {
    AudioDirector.get().play(MENU_PROFILE, 'menu');
    if (this.ending) markSeen(loadSave(), 'ending');
    const g = this.add.graphics();
    g.fillGradientStyle(0x1d1424, 0x1d1424, 0x3b2a4a, 0x3b2a4a, 1).fillRect(0, 0, WIDTH, HEIGHT);
    // A few fixed stars; seeded so the sky is the same every time.
    const rng = new Phaser.Math.RandomDataGenerator(['credits']);
    for (let i = 0; i < 70; i++) g.fillStyle(0xfff6e6, rng.realInRange(0.15, 0.6)).fillCircle(rng.between(0, WIDTH), rng.between(0, GROUND_Y - 120), rng.realInRange(0.8, 2.2));
    // The ground sits above the credits roll, so lines slip behind it.
    this.add.graphics().setDepth(3).fillStyle(0x2b1d2e, 1).fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y).fillStyle(0xc4622d, 1).fillRect(0, GROUND_Y, WIDTH, 4);

    // The whole team runs home together.
    this.parade = CULTURES.map((c, i) => ({ view: addAvatar(this, c, 0, GROUND_Y, 86, 'run'), x: -60 - i * PARADE_GAP }));
    this.parade.forEach((p) => p.view.object.setDepth(5));

    const skip = () => (this.roll ? this.done() : this.startRoll());
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (!e.repeat && !this.finished && ['Escape', 'Enter', 'Space'].includes(e.code)) skip();
    });
    this.input.gamepad?.on('down', (_p: unknown, b: Phaser.Input.Gamepad.Button) => {
      if (!this.finished && [0, 1, 9].includes(b.index)) skip();
    });
    this.input.on('pointerdown', () => !this.finished && skip());
    this.skipHint = label(this, WIDTH - 20, HEIGHT - 22, 'Enter / tap to skip', 15, { color: '#b9a8c4' }).setOrigin(1, 0.5).setDepth(6);

    if (this.ending) this.playEnding();
    else this.startRoll();
  }

  /** The twelve restored artifacts appear one by one, then the game's message. */
  private playEnding() {
    const layer = this.add.container(0, 0).setName('ending');
    const title = label(this, WIDTH / 2, 62, 'The collection is complete', 46, { fontFamily: FONT_DISPLAY, color: PAPER_CSS });
    layer.add(title);
    const fw = 176, fh = 112;
    CULTURES.forEach((c, i) => {
      const x = WIDTH / 2 + ((i % 6) - 2.5) * (fw + 22), y = 190 + Math.floor(i / 6) * (fh + 56);
      const frame = this.add.container(x, y).setAlpha(0);
      frame.add(card(this, 0, 0, fw + 14, fh + 14, 0xf2c14e, 10));
      frame.add(addArtifact(this, c, -fw / 2, -fh / 2, fw, fh));
      frame.add(label(this, 0, fh / 2 + 24, c.name, 19, { color: PAPER_CSS }));
      layer.add(frame);
      this.time.delayedCall(500 + i * 380, () => {
        AudioDirector.get().sfx('restore', i % 8);
        this.tweens.add({ targets: frame, alpha: 1, scale: { from: REDUCED_MOTION ? 1 : 0.8, to: 1 }, duration: 320, ease: 'Back.easeOut' });
      });
    });
    const message = label(this, WIDTH / 2, 520, MESSAGE, 22, { color: PAPER_CSS, wordWrap: { width: 980 }, align: 'center' }).setAlpha(0);
    layer.add(message);
    this.time.delayedCall(500 + CULTURES.length * 380 + 400, () => {
      AudioDirector.get().sfx('win');
      this.tweens.add({ targets: message, alpha: 1, duration: 900 });
    });
    // Linger on the message, then roll the credits.
    this.time.delayedCall(500 + CULTURES.length * 380 + 9000, () => this.startRoll());
  }

  private startRoll() {
    if (this.roll || this.finished) return;
    const ending = this.children.getByName('ending');
    if (ending) this.tweens.add({ targets: ending, alpha: 0, duration: 600, onComplete: () => ending.destroy() });
    const c = this.add.container(0, HEIGHT).setDepth(2);
    let y = 0;
    for (const [text, size, style] of CREDITS) {
      if (text) {
        const font = style === FONT_DISPLAY ? { fontFamily: FONT_DISPLAY } : {};
        const color = style && style !== FONT_DISPLAY ? style : PAPER_CSS;
        c.add(label(this, WIDTH / 2, y, text, size, { ...font, color }));
      }
      y += size * 1.6;
    }
    this.roll = c;
    // Stop with the last line just above the parade.
    this.rollEnd = GROUND_Y - 225 - y;
  }

  /** Credits finished or skipped: offer the way back. */
  private done() {
    if (this.finished) return;
    this.finished = true;
    this.skipHint?.destroy();
    if (this.roll) this.roll.y = this.rollEnd;
    const back = button(this, WIDTH / 2, GROUND_Y - 110, 'Back to title', () => this.scene.start('Title'), 300).setDepth(6);
    const museum = this.ending ? button(this, WIDTH / 2, GROUND_Y - 190, 'Visit the museum', () => this.scene.start('Museum'), 300).setDepth(6) : undefined;
    const items = museum ? [museum, back] : [back];
    new MenuNav(this, items.map(focusButton), { back: () => this.scene.start('Title') });
  }

  update(_t: number, deltaMs: number) {
    const dt = deltaMs / 1000;
    const loop = WIDTH + 60 + CULTURES.length * PARADE_GAP;
    for (const p of this.parade) {
      p.x += PARADE_SPEED * dt;
      if (p.x > WIDTH + 60) p.x -= loop;
      p.view.setFeet(p.x, GROUND_Y);
      p.view.setRunSpeed(PARADE_SPEED);
      p.view.tick(dt);
    }
    if (this.roll && !this.finished) {
      this.roll.y -= SCROLL * dt;
      if (this.roll.y <= this.rollEnd) this.done();
    }
  }
}
