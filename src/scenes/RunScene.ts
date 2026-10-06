import Phaser from 'phaser';
import { DAMAGES, TOOLS, toolsFor, type DamageId, type ToolId } from '../data/conservation';
import { CULTURES, type Culture } from '../data/cultures';
import { difficultyFor, type Difficulty } from '../systems/difficulty';
import { RunState } from '../systems/runState';
import { DAMAGE_SIZE, damageTexture, drawArtifact, drawSkyline, toolTexture } from '../ui/art';
import { addAvatar, type AvatarView } from '../ui/avatar';
import { FONT_DISPLAY, HEIGHT, INK, PAPER, PAPER_CSS, WIDTH, button, card, hex, label } from '../ui/theme';

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
  private ended = false;
  private seen = new Set<DamageId>();

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
    this.paused = this.ended = false;
    this.pauseLayer = undefined;
    this.seen = new Set();
  }

  create() {
    this.createBackground();
    this.createPlayer();
    this.physics.add.collider(this.player, this.floor);
    this.spots = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player, this.spots, (_p, s) => this.onTouch(s as Spot));
    this.createHud();
    this.bindInput();
    this.toastText(`${this.culture.name}: restore the ${this.culture.artifact.toLowerCase()}!`, 2500);
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
    if (this.paused || this.ended) return;
    const body = this.player.body;
    if (body.blocked.down) {
      body.setVelocityY(JUMP_V);
      this.extraJumps = this.diff.lanes > 3 ? 1 : 0;
    } else if (this.extraJumps > 0) {
      body.setVelocityY(DOUBLE_JUMP_V);
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
      this.floatText(spot.x, spot.y - 40, info.documented ? 'Restored! +docs' : 'Restored!', '#2a9d8f');
      this.tweens.add({ targets: spot, scale: spot.scale * 1.6, alpha: 0, duration: 260, onComplete: () => spot.destroy() });
    } else {
      const need = TOOLS[DAMAGES[info.damage].treatedBy].name;
      this.floatText(spot.x, spot.y - 40, 'Wrong tool!', '#c0392b');
      this.toastText(`${DAMAGES[info.damage].name} needs the ${need}`, 2000);
      this.cameras.main.shake(140, 0.006);
      spot.setTint(0xc0392b);
      this.tweens.add({ targets: spot, alpha: 0, duration: 400, onComplete: () => spot.destroy() });
    }
    this.refreshHud();
  }

  private useUV() {
    if (this.paused || this.ended || this.uvCooldown > 0) return;
    this.uvCooldown = UV_COOLDOWN;
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
    if (this.paused || this.ended || this.cameraCooldown > 0) return;
    this.cameraCooldown = CAMERA_COOLDOWN;
    this.cameras.main.flash(120, 255, 255, 240);
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
    if (this.paused || this.ended) return;
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
          this.refreshHud();
        }
        info.badge?.destroy();
        s.destroy();
      }
    }

    this.animatePlayer(dt);
    this.drawTimeBar();
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

    this.toolName = label(this, WIDTH / 2, HEIGHT - 112, '', 26, { color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 6 }).setDepth(10);
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
    });

    this.uvButton = this.actionButton(WIDTH - 150, HEIGHT - 52, 'prop-uv', 'U', () => this.useUV());
    this.cameraButton = this.actionButton(WIDTH - 60, HEIGHT - 52, 'prop-camera', 'C', () => this.useCamera());
    if (!this.culture.damages.some((d) => DAMAGES[d].hiddenUntilUV)) this.uvButton.setVisible(false);

    this.toast = label(this, WIDTH / 2, 170, '', 28, { color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 7 }).setDepth(11).setAlpha(0);
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
    if (this.paused || this.ended) return;
    this.toolIndex = Phaser.Math.Wrap(i, 0, this.tools.length);
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

  private refreshHud() {
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
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) this.jump();
      else if (e.code === 'KeyQ') this.selectTool(this.toolIndex - 1);
      else if (e.code === 'KeyE') this.selectTool(this.toolIndex + 1);
      else if (e.code === 'KeyU') this.useUV();
      else if (e.code === 'KeyC') this.useCamera();
      else if (e.code === 'Escape' || e.code === 'KeyP') this.togglePause();
      else if (/^Digit[1-9]$/.test(e.code)) {
        const i = Number(e.code.slice(5)) - 1;
        if (i < this.tools.length) this.selectTool(i);
      }
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.selectTool(this.toolIndex + Math.sign(dy)));
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) this.jump();
    });
    // Standard gamepad mapping: A jump, X camera, Y UV, LB/RB cycle tools, Start pause.
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, b: Phaser.Input.Gamepad.Button) => {
      ({ 0: () => this.jump(), 2: () => this.useCamera(), 3: () => this.useUV(), 4: () => this.selectTool(this.toolIndex - 1), 5: () => this.selectTool(this.toolIndex + 1), 9: () => this.togglePause() } as Record<number, () => void>)[b.index]?.();
    });
  }

  private togglePause() {
    if (this.ended) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.physics.pause();
      this.tweens.pauseAll();
      this.anims.pauseAll();
      const c = this.add.container(0, 0).setDepth(20);
      c.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, INK, 0.6));
      c.add(card(this, WIDTH / 2, HEIGHT / 2, 420, 340));
      c.add(label(this, WIDTH / 2, HEIGHT / 2 - 110, 'Paused', 44, { fontFamily: FONT_DISPLAY }));
      c.add(button(this, WIDTH / 2, HEIGHT / 2 - 10, 'Resume', () => this.togglePause()));
      c.add(button(this, WIDTH / 2, HEIGHT / 2 + 80, 'World map', () => this.scene.start('WorldMap')));
      this.pauseLayer = c;
    } else {
      this.physics.resume();
      this.tweens.resumeAll();
      this.anims.resumeAll();
      this.pauseLayer?.destroy();
    }
  }
}

function mix(a: number, b: number, t: number) {
  const ca = Phaser.Display.Color.IntegerToColor(a), cb = Phaser.Display.Color.IntegerToColor(b);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, t * 100);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}
