import Phaser from 'phaser';
import { DAMAGES, TOOLS, toolsFor, type DamageId, type ToolId } from '../data/conservation';
import { CULTURES, type Culture } from '../data/cultures';
import { difficultyFor, type Difficulty } from '../systems/difficulty';
import { RunState } from '../systems/runState';
import { DAMAGE_SIZE, damageTexture, drawArtifact, drawSkyline, toolTexture } from '../ui/art';
import { addAvatar, type AvatarView } from '../ui/avatar';
import { showFieldGuide } from '../ui/fieldGuide';
import { showControlsMenu } from '../ui/controlsMenu';
import { MenuNav, focusButton } from '../ui/menuNav';
import { actionFor, loadBindings, type Action } from '../systems/controls';
import { AudioDirector } from '../audio/AudioDirector';
import { FONT_DISPLAY, HEIGHT, INK, PAPER, PAPER_CSS, REDUCED_MOTION, WIDTH, button, card, hex, label } from '../ui/theme';

const GROUND_Y = 620;
const PLAYER_X = 240;
const LANES = [560, 440, 330, 230];
const JUMP_V = -760;
const DOUBLE_JUMP_V = -640;
const UV_COOLDOWN = 4;
const CAMERA_COOLDOWN = 3;
const ARTIFACT_W = 230;
const ARTIFACT_H = 140;
const AVATAR_HEIGHT = 150;
/** How far ahead (px) the tool hint looks for the next damage. */
const HINT_RANGE = 560;
const ASSIST_KEY = 'relic-revival-run:assist';
const PLAYER_HITBOX = { w: 64, h: 120 };

interface SpotInfo {
  damage: DamageId;
  hidden: boolean;
  documented: boolean;
  done: boolean;
  badge?: Phaser.GameObjects.Image;
}

type Spot = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

export interface RunResult {
  index: number;
  score: number;
  restoration: number;
  bestCombo: number;
  documented: number;
  stars: number;
  failed: boolean;
  seen: DamageId[];
}

export class RunScene extends Phaser.Scene {
  private culture!: Culture;
  private index = 0;
  private diff!: Difficulty;
  private state!: RunState;
  private tools: ToolId[] = [];
  private toolIndex = 0;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private avatar!: AvatarView;
  private spots!: Phaser.Physics.Arcade.Group;
  private floor!: Phaser.GameObjects.Rectangle;
  private layers: { sprite: Phaser.GameObjects.TileSprite; factor: number }[] = [];
  private elapsed = 0;
  private spawnTimer = 0;
  private extraJumps = 0;
  private uvCooldown = 0;
  private cameraCooldown = 0;
  private paused = false;
  /** Field guide is open: the run waits. */
  private briefing = false;
  /** A pause sub-menu (field guide, controls) owns the keyboard. */
  private subMenu = false;
  /** Pulse the slot of the tool needed for the next damage (pause menu toggle, remembered). */
  private assist = readAssist();
  private hintRing!: Phaser.GameObjects.Graphics;
  private ended = false;
  private seen = new Set<DamageId>();
  private audio = AudioDirector.get();

  // HUD
  private toolSlots: Phaser.GameObjects.Container[] = [];
  private toolName!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private timeBar!: Phaser.GameObjects.Graphics;
  private integrityBar!: Phaser.GameObjects.Graphics;
  private artifactGrime!: Phaser.GameObjects.Graphics;
  private artifactCracks!: Phaser.GameObjects.Graphics;
  private toast!: Phaser.GameObjects.Text;
  private uvButton!: Phaser.GameObjects.Container;
  private cameraButton!: Phaser.GameObjects.Container;
  private pauseLayer?: Phaser.GameObjects.Container;
  private pauseNav?: MenuNav;

  constructor() {
    super('Run');
  }

  init(data: { index: number }) {
    // Scene instances are reused across restarts, so reset everything here.
    this.index = data.index ?? 0;
    this.culture = CULTURES[this.index];
    this.diff = difficultyFor(this.index);
    this.state = new RunState(this.diff.mistakePenalty);
    this.tools = toolsFor(this.culture.damages);
    this.toolIndex = 0;
    this.layers = [];
    this.toolSlots = [];
    this.elapsed = this.spawnTimer = this.uvCooldown = this.cameraCooldown = this.extraJumps = 0;
    this.paused = this.ended = this.briefing = this.subMenu = false;
    this.pauseLayer = undefined;
    this.seen = new Set();
  }

  create() {
    this.audio.play(this.culture.sound, this.culture.id);
    this.audio.setIntensity(0);
    this.audio.setIntegrity(1);
    this.audio.duck(false);
    this.createBackground();
    this.createPlayer();
    this.physics.add.collider(this.player, this.floor);
    this.spots = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player, this.spots, (_p, s) => this.onTouch(s as Spot));
    this.createHud();
    this.bindInput();
    this.briefing = true;
    this.physics.pause();
    showFieldGuide(this, this.culture, 'Start run', () => {
      this.briefing = false;
      this.physics.resume();
      this.toastText(`${this.culture.name}: restore the ${this.culture.artifact.toLowerCase()}!`, 2500);
    });
  }

  // ---------- world ----------

  private createBackground() {
    const { sky, ground } = this.culture.palette;
    const skyC = hex(sky), groundC = hex(ground);
    this.add.graphics().fillGradientStyle(skyC, skyC, mix(skyC, 0xffffff, 0.4), mix(skyC, 0xffffff, 0.4), 1).fillRect(0, 0, WIDTH, HEIGHT);

    const far = `skyline-${this.culture.id}`;
    if (!this.textures.exists(far)) {
      const g = this.make.graphics({}, false);
      drawSkyline(g, this.culture.motif, 1280, 300, mix(skyC, groundC, 0.35));
      g.generateTexture(far, 1280, 300);
      g.clear().fillStyle(mix(skyC, groundC, 0.6), 1);
      for (let x = 0; x < 1280; x += 256) g.fillEllipse(x + 128, 200, 340, 160);
      g.generateTexture(`hills-${this.culture.id}`, 1280, 200);
      g.clear().fillStyle(groundC, 1).fillRect(0, 0, 256, 100).fillStyle(mix(groundC, 0x000000, 0.2), 1);
      for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 32, 8);
      g.lineStyle(4, INK, 1).lineBetween(0, 2, 256, 2);
      g.generateTexture(`ground-${this.culture.id}`, 256, 100);
      g.destroy();
    }
    const add = (key: string, y: number, h: number, factor: number) =>
      this.layers.push({ sprite: this.add.tileSprite(0, y, WIDTH, h, key).setOrigin(0, 0), factor });
    add(far, GROUND_Y - 300, 300, 0.12);
    add(`hills-${this.culture.id}`, GROUND_Y - 160, 200, 0.4);
    add(`ground-${this.culture.id}`, GROUND_Y, 100, 1);

    this.floor = this.add.rectangle(WIDTH / 2, GROUND_Y + 50, WIDTH * 2, 100).setVisible(false);
    this.physics.add.existing(this.floor, true);
  }

  private createPlayer() {
    // Invisible physics body with the same hitbox for every avatar; the visible avatar follows it.
    this.player = this.physics.add.sprite(PLAYER_X, GROUND_Y - 120, 'avatar-placeholder').setVisible(false);
    this.player.body.setSize(PLAYER_HITBOX.w, PLAYER_HITBOX.h);
    this.avatar = addAvatar(this, this.culture, PLAYER_X, GROUND_Y, AVATAR_HEIGHT, 'run');
    this.avatar.object.setDepth(5);
  }

  private jump() {
    if (this.paused || this.briefing || this.ended) return;
    const body = this.player.body;
    if (body.blocked.down) {
      body.setVelocityY(JUMP_V);
      this.audio.sfx('jump');
      this.extraJumps = this.diff.lanes > 3 ? 1 : 0;
    } else if (this.extraJumps > 0) {
      body.setVelocityY(DOUBLE_JUMP_V);
      this.audio.sfx('jump');
      this.extraJumps--;
    }
  }

  private spawn() {
    const damage = Phaser.Utils.Array.GetRandom(this.culture.damages) as DamageId;
    const def = DAMAGES[damage];
    const lane = Phaser.Math.Between(0, this.diff.lanes - 1);
    const spot = this.spots.create(WIDTH + DAMAGE_SIZE, LANES[lane], damageTexture(damage)) as Spot;
    spot.setDisplaySize(DAMAGE_SIZE * 0.9, DAMAGE_SIZE * 0.9).setDepth(4);
    spot.body.setVelocityX(-this.diff.scrollSpeed);
    const info: SpotInfo = { damage, hidden: !!def.hiddenUntilUV, documented: false, done: false };
    spot.setData('info', info);
    if (info.hidden) spot.setAlpha(0.12);
    this.state.spawn();
    if (!this.seen.has(damage)) {
      this.seen.add(damage);
      if (!info.hidden) this.toastText(`New: ${def.name} → ${TOOLS[def.treatedBy].name}`, 2200);
    }
  }

  private onTouch(spot: Spot) {
    const info = spot.getData('info') as SpotInfo;
    if (info.done || (info.hidden && spot.alpha < 1)) return; // can't treat what you haven't found
    info.done = true;
    const tool = this.tools[this.toolIndex];
    const outcome = this.state.treat(info.damage, tool, info.documented);
    info.badge?.destroy();
    spot.body.enable = false;
    if (outcome === 'restored') {
      this.audio.sfx('restore');
      this.floatText(spot.x, spot.y - 40, info.documented ? 'Restored! +docs' : 'Restored!', '#2a9d8f');
      this.tweens.add({ targets: spot, scale: spot.scale * 1.6, alpha: 0, duration: 260, onComplete: () => spot.destroy() });
    } else {
      const need = TOOLS[DAMAGES[info.damage].treatedBy].name;
      this.floatText(spot.x, spot.y - 40, 'Wrong tool!', '#c0392b');
      this.toastText(`${DAMAGES[info.damage].name} needs the ${need}`, 2000);
      this.audio.sfx('wrong');
      if (!REDUCED_MOTION) this.cameras.main.shake(140, 0.006);
      spot.setTint(0xc0392b);
      this.flashSlot(this.tools.indexOf(DAMAGES[info.damage].treatedBy));
      this.tweens.add({ targets: spot, alpha: 0, duration: 400, onComplete: () => spot.destroy() });
    }
    this.refreshHud();
  }

  private useUV() {
    if (this.paused || this.briefing || this.ended || this.uvCooldown > 0) return;
    this.uvCooldown = UV_COOLDOWN;
    this.audio.sfx('uv');
    const flash = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x8e44ff, 0).setDepth(8);
    this.tweens.add({ targets: flash, fillAlpha: 0.3, duration: 150, yoyo: true, onComplete: () => flash.destroy() });
    for (const s of this.activeSpots()) {
      const info = s.getData('info') as SpotInfo;
      if (info.hidden && !info.done && s.alpha < 1) {
        s.setAlpha(1);
        this.floatText(s.x, s.y - 40, DAMAGES[info.damage].name, '#8e44ff');
      }
    }
  }

  private useCamera() {
    if (this.paused || this.briefing || this.ended || this.cameraCooldown > 0) return;
    this.cameraCooldown = CAMERA_COOLDOWN;
    this.audio.sfx('camera');
    if (!REDUCED_MOTION) this.cameras.main.flash(120, 255, 255, 240);
    for (const s of this.activeSpots()) {
      const info = s.getData('info') as SpotInfo;
      if (info.done || info.documented || s.x > WIDTH || s.alpha < 1) continue;
      info.documented = true;
      info.badge = this.add.image(s.x + 30, s.y - 30, 'prop-camera').setScale(0.28).setDepth(6);
    }
  }

  private activeSpots() {
    return this.spots.getChildren() as Spot[];
  }

  // ---------- loop ----------

  update(_t: number, deltaMs: number) {
    if (this.paused || this.briefing || this.ended) return;
    const dt = deltaMs / 1000;
    this.elapsed += dt;
    this.uvCooldown = Math.max(0, this.uvCooldown - dt);
    this.cameraCooldown = Math.max(0, this.cameraCooldown - dt);
    for (const l of this.layers) l.sprite.tilePositionX += this.diff.scrollSpeed * l.factor * dt;

    const running = this.elapsed < this.diff.duration;
    this.spawnTimer += dt;
    if (running && this.spawnTimer >= this.diff.spawnInterval) {
      this.spawnTimer = 0;
      this.spawn();
    }

    for (const s of this.activeSpots()) {
      const info = s.getData('info') as SpotInfo;
      info.badge?.setPosition(s.x + 30, s.y - 30);
      if (s.x < -DAMAGE_SIZE) {
        if (!info.done) {
          this.state.miss();
          this.audio.sfx('miss');
          this.refreshHud();
        }
        info.badge?.destroy();
        s.destroy();
      }
    }

    this.animatePlayer(dt);
    this.drawTimeBar();
    this.drawToolHint();
    this.uvButton.setAlpha(this.uvCooldown > 0 ? 0.45 : 1);
    this.cameraButton.setAlpha(this.cameraCooldown > 0 ? 0.45 : 1);

    if (this.state.failed || (!running && this.spots.countActive() === 0)) this.finish();
  }

  private animatePlayer(dt: number) {
    const body = this.player.body;
    this.avatar.setAnim(body.blocked.down ? 'run' : body.velocity.y < 0 ? 'jump' : 'fall');
    this.avatar.setFeet(this.player.x, body.bottom);
    this.avatar.tick(dt);
  }

  private finish() {
    this.ended = true;
    this.physics.pause();
    this.audio.setIntensity(0);
    this.audio.sfx(this.state.stars > 0 ? 'win' : 'fail');
    const result: RunResult = {
      index: this.index,
      score: this.state.score,
      restoration: this.state.restoration,
      bestCombo: this.state.bestCombo,
      documented: this.state.documented,
      stars: this.state.stars,
      failed: this.state.failed,
      seen: [...this.seen],
    };
    this.time.delayedCall(700, () => this.scene.start('Results', result));
  }

  // ---------- HUD ----------

  private createHud() {
    label(this, 24, 34, this.culture.name, 40, { fontFamily: FONT_DISPLAY, color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 8 }).setOrigin(0, 0.5).setDepth(10);
    this.timeBar = this.add.graphics().setDepth(10);
    this.integrityBar = this.add.graphics().setDepth(10);
    label(this, 24, 110, 'Condition', 20, { color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0, 0.5).setDepth(10);
    this.scoreText = label(this, WIDTH / 2, 34, '0', 36, { fontFamily: FONT_DISPLAY, color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 8 }).setDepth(10);
    this.comboText = label(this, WIDTH / 2, 82, '', 24, { color: '#f2c14e', stroke: '#2b1d2e', strokeThickness: 6 }).setDepth(10);

    // Artifact panel: the relic gets visibly cleaner as you restore it, and cracks when you make mistakes.
    const ax = WIDTH - ARTIFACT_W - 28, ay = 20;
    card(this, ax + ARTIFACT_W / 2, ay + ARTIFACT_H / 2, ARTIFACT_W + 12, ARTIFACT_H + 12).setDepth(10);
    const art = this.add.graphics().setPosition(ax, ay).setDepth(10);
    drawArtifact(art, this.culture, ARTIFACT_W, ARTIFACT_H);
    this.artifactGrime = this.add.graphics().setPosition(ax, ay).setDepth(10);
    const rng = new Phaser.Math.RandomDataGenerator([this.culture.id]);
    this.artifactGrime.fillStyle(0x6b5434, 0.75).fillRect(0, 0, ARTIFACT_W, ARTIFACT_H);
    for (let i = 0; i < 40; i++) this.artifactGrime.fillStyle(0x3d2f1f, 0.6).fillCircle(rng.between(0, ARTIFACT_W), rng.between(0, ARTIFACT_H), rng.between(3, 12));
    this.artifactCracks = this.add.graphics().setPosition(ax, ay).setDepth(10);

    this.toolName = label(this, WIDTH / 2, HEIGHT - 142, '', 26, { color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 6 }).setDepth(10);
    const spacing = 92, start = WIDTH / 2 - ((this.tools.length - 1) * spacing) / 2;
    this.tools.forEach((tool, i) => {
      const c = this.add.container(start + i * spacing, HEIGHT - 52).setDepth(10);
      const bg = this.add.graphics();
      const icon = this.add.image(0, -2, toolTexture(tool)).setDisplaySize(58, 58);
      const key = label(this, 30, 28, String(i + 1), 16);
      c.add([bg, icon, key]).setSize(80, 80).setInteractive({ useHandCursor: true });
      c.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.selectTool(i);
      });
      this.toolSlots.push(c);
      const treats = this.culture.damages.filter((d) => DAMAGES[d].treatedBy === tool);
      treats.forEach((d, k) => this.add.image(c.x + (k - (treats.length - 1) / 2) * 26, HEIGHT - 106, damageTexture(d)).setDisplaySize(26, 26).setDepth(10));
    });

    this.uvButton = this.actionButton(WIDTH - 150, HEIGHT - 52, 'prop-uv', 'U', () => this.useUV());
    this.cameraButton = this.actionButton(WIDTH - 60, HEIGHT - 52, 'prop-camera', 'C', () => this.useCamera());
    if (!this.culture.damages.some((d) => DAMAGES[d].hiddenUntilUV)) this.uvButton.setVisible(false);

    this.toast = label(this, WIDTH / 2, 170, '', 28, { color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 7 }).setDepth(11).setAlpha(0);
    this.hintRing = this.add.graphics().setDepth(11);
    this.selectTool(0);
    this.refreshHud();
  }

  private actionButton(x: number, y: number, tex: string, key: string, onClick: () => void) {
    const c = this.add.container(x, y).setDepth(10);
    const bg = card(this, 0, 0, 76, 76);
    c.add([bg, this.add.image(0, -2, tex).setDisplaySize(56, 56), label(this, 26, 26, key, 16)]);
    c.setSize(76, 76).setInteractive({ useHandCursor: true });
    c.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      onClick();
    });
    return c;
  }

  private selectTool(i: number) {
    if (this.paused || this.briefing || this.ended) return;
    const next = Phaser.Math.Wrap(i, 0, this.tools.length);
    if (next !== this.toolIndex) this.audio.sfx('switch');
    this.toolIndex = next;
    this.toolSlots.forEach((c, k) => {
      const on = k === this.toolIndex;
      const bg = c.getAt(0) as Phaser.GameObjects.Graphics;
      bg.clear().fillStyle(INK, 0.9).fillRoundedRect(-36, -32, 76, 76, 16);
      bg.fillStyle(on ? hex(this.culture.palette.accent) : PAPER, 1).fillRoundedRect(-40, -38, 76, 76, 16);
      bg.lineStyle(4, INK, 1).strokeRoundedRect(-40, -38, 76, 76, 16);
      this.tweens.add({ targets: c, y: HEIGHT - 52 - (on ? 12 : 0), scale: on ? 1.1 : 1, duration: 100 });
    });
    this.toolName.setText(TOOLS[this.tools[this.toolIndex]].name);
  }

  /** Pulse the slot of the tool the next visible damage needs. */
  private drawToolHint() {
    const g = this.hintRing.clear();
    if (!this.assist) return;
    let next: Spot | undefined;
    for (const s of this.activeSpots()) {
      const info = s.getData('info') as SpotInfo;
      if (info.done || s.alpha < 1 || s.x < PLAYER_X - 30 || s.x > PLAYER_X + HINT_RANGE) continue;
      if (!next || s.x < next.x) next = s;
    }
    if (!next) return;
    const slot = this.toolSlots[this.tools.indexOf(DAMAGES[(next.getData('info') as SpotInfo).damage].treatedBy)];
    const pulse = 0.75 + 0.25 * Math.sin(this.time.now / 110);
    // Ink under gold so the ring reads on every culture's palette.
    g.lineStyle(10, INK, pulse).strokeRoundedRect(slot.x - 52, slot.y - 50, 100, 100, 22);
    g.lineStyle(5, 0xf2c14e, pulse).strokeRoundedRect(slot.x - 52, slot.y - 50, 100, 100, 22);
  }

  private flashSlot(i: number) {
    const slot = this.toolSlots[i];
    if (!slot) return;
    this.tweens.add({ targets: slot, scale: 1.35, duration: 120, yoyo: true, repeat: 1 });
  }

  private refreshHud() {
    this.audio.setIntensity(this.state.combo);
    this.audio.setIntegrity(this.state.integrity);
    this.scoreText.setText(String(this.state.score));
    this.comboText.setText(this.state.combo > 1 ? `Combo ×${this.state.combo}` : '');
    const g = this.integrityBar.clear();
    g.fillStyle(INK, 1).fillRoundedRect(130, 98, 224, 24, 10);
    g.fillStyle(this.state.integrity > 0.35 ? 0x2a9d8f : 0xc0392b, 1).fillRoundedRect(134, 102, 216 * this.state.integrity, 16, 7);
    this.artifactGrime.setAlpha(1 - this.state.restoration);
    // One crack per ~10% integrity lost.
    const cracks = Math.floor((1 - this.state.integrity) * 10);
    const c = this.artifactCracks.clear().lineStyle(3, INK, 1);
    const rng = new Phaser.Math.RandomDataGenerator(['cracks']);
    for (let i = 0; i < cracks; i++) {
      let x = rng.between(10, ARTIFACT_W - 10), y = rng.between(10, ARTIFACT_H - 10);
      c.beginPath().moveTo(x, y);
      for (let k = 0; k < 4; k++) c.lineTo((x += rng.between(-18, 18)), (y += rng.between(-14, 14)));
      c.strokePath();
    }
  }

  private drawTimeBar() {
    const p = Math.min(1, this.elapsed / this.diff.duration);
    this.timeBar.clear().fillStyle(INK, 1).fillRoundedRect(24, 66, 330, 18, 8);
    this.timeBar.fillStyle(0xf2c14e, 1).fillRoundedRect(28, 70, 322 * p, 10, 5);
  }

  private toastText(msg: string, ms: number) {
    this.tweens.killTweensOf(this.toast);
    this.toast.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 400 });
  }

  private floatText(x: number, y: number, msg: string, color: string) {
    const t = label(this, x, y, msg, 24, { color, stroke: PAPER_CSS, strokeThickness: 6 }).setDepth(9);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  // ---------- input & pause ----------

  private bindInput() {
    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => {
      if (this.briefing || this.subMenu) return;
      const actions: Record<Action, () => void> = {
        jump: () => this.jump(),
        prevTool: () => this.selectTool(this.toolIndex - 1),
        nextTool: () => this.selectTool(this.toolIndex + 1),
        uv: () => this.useUV(),
        camera: () => this.useCamera(),
        pause: () => this.togglePause(),
      };
      // Read each time so changes made in the Controls menu apply immediately.
      const action = actionFor(loadBindings(), e.code);
      if (action) actions[action]();
      else if (/^Digit[1-9]$/.test(e.code)) {
        const i = Number(e.code.slice(5)) - 1;
        if (i < this.tools.length) this.selectTool(i);
      }
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.selectTool(this.toolIndex + Math.sign(dy)));
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0 && !this.briefing) this.jump();
    });
    // Standard gamepad mapping. Tools on shoulders/D-pad and UV/camera on triggers, so they work
    // while the thumb stays on A (jump). X/Y kept as alternates; Start/Select pause.
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, b: Phaser.Input.Gamepad.Button) => {
      if (this.briefing) return;
      const prev = () => this.selectTool(this.toolIndex - 1), next = () => this.selectTool(this.toolIndex + 1);
      const camera = () => this.useCamera(), uv = () => this.useUV(), pause = () => this.togglePause();
      ({ 0: () => this.jump(), 12: () => this.jump(), 2: camera, 6: camera, 3: uv, 7: uv, 4: prev, 14: prev, 5: next, 15: next, 8: pause, 9: pause } as Record<number, () => void>)[b.index]?.();
    });
  }

  private togglePause() {
    if (this.ended || this.briefing) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.physics.pause();
      this.audio.duck(true);
      this.tweens.pauseAll();
      this.anims.pauseAll();
      const c = this.add.container(0, 0).setDepth(20);
      c.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, INK, 0.6));
      c.add(card(this, WIDTH / 2, HEIGHT / 2, 440, 650));
      c.add(label(this, WIDTH / 2, HEIGHT / 2 - 270, 'Paused', 44, { fontFamily: FONT_DISPLAY }));
      const resume = button(this, WIDTH / 2, HEIGHT / 2 - 190, 'Resume', () => this.togglePause(), 300);
      c.add(resume);
      const subMenu = (open: (done: () => void) => void) => {
        c.setVisible(false);
        this.subMenu = true;
        this.pauseNav?.setEnabled(false);
        open(() => {
          this.subMenu = false;
          c.setVisible(true);
          // Next tick, so the key that closed the sub-menu isn't handled again here.
          this.time.delayedCall(0, () => this.pauseNav?.setEnabled(true));
        });
      };
      const guide = button(this, WIDTH / 2, HEIGHT / 2 - 107, 'Field guide', () => subMenu((done) => showFieldGuide(this, this.culture, 'Back', done)), 300);
      const controls = button(this, WIDTH / 2, HEIGHT / 2 - 24, 'Controls', () => subMenu((done) => showControlsMenu(this, done)), 300);
      c.add([guide, controls]);
      const hintLabel = () => `Tool hints: ${this.assist ? 'on' : 'off'}`;
      const hints = button(this, WIDTH / 2, HEIGHT / 2 + 59, hintLabel(), () => {
        this.assist = !this.assist;
        writeAssist(this.assist);
        (hints.getAt(1) as Phaser.GameObjects.Text).setText(hintLabel());
      }, 300);
      c.add(hints);
      const soundLabel = () => `Sound: ${this.audio.muted ? 'off' : 'on'} (M)`;
      const sound = button(this, WIDTH / 2, HEIGHT / 2 + 142, soundLabel(), () => {
        this.audio.toggleMute();
        (sound.getAt(1) as Phaser.GameObjects.Text).setText(soundLabel());
      }, 300);
      c.add(sound);
      const map = button(this, WIDTH / 2, HEIGHT / 2 + 225, 'World map', () => this.scene.start('WorldMap'), 300);
      c.add(map);
      this.pauseLayer = c;
      // Esc is the pause key itself, so only gamepad B means "back" here.
      this.pauseNav = new MenuNav(this, [resume, guide, controls, hints, sound, map].map(focusButton), { back: () => this.togglePause(), escape: false, depth: 25 });
    } else {
      this.physics.resume();
      this.audio.duck(false);
      this.tweens.resumeAll();
      this.anims.resumeAll();
      this.pauseLayer?.destroy();
      this.pauseNav?.destroy();
      this.pauseNav = undefined;
    }
  }
}

function mix(a: number, b: number, t: number) {
  const ca = Phaser.Display.Color.IntegerToColor(a), cb = Phaser.Display.Color.IntegerToColor(b);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, t * 100);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

function readAssist() {
  try {
    return localStorage.getItem(ASSIST_KEY) !== '0';
  } catch {
    return true;
  }
}

function writeAssist(on: boolean) {
  try {
    localStorage.setItem(ASSIST_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}
