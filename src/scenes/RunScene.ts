import Phaser from 'phaser';
import { AudioDirector } from '../audio/AudioDirector';
import { rng as seededRng, seedFrom } from '../audio/music';
import { DAMAGES, TOOLS, toolsFor, type DamageId, type ToolId } from '../data/conservation';
import { CULTURES, type Culture } from '../data/cultures';
import { actionFor, keyLabel, loadBindings, type Action } from '../systems/controls';
import { difficultyFor, spacingBeats, type Difficulty } from '../systems/difficulty';
import { PatternSpawner, type SpawnEvent } from '../systems/patterns';
import { RunState } from '../systems/runState';
import { loadSave } from '../systems/save';
import { loadAssist } from '../systems/settings';
import { DAMAGE_SIZE, damageTexture, toolTexture } from '../ui/art';
import { addArtifact, loadArtifact } from '../ui/artifacts';
import { addLandscape, advanceLandscape, loadLandscape } from '../ui/landscape';
import { addAvatar, type AvatarView } from '../ui/avatar';
import { showOptionsMenu } from '../ui/optionsMenu';
import { showFieldGuide } from '../ui/fieldGuide';
import { MenuNav, focusButton } from '../ui/menuNav';
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
const PLAYER_HITBOX = { w: 64, h: 120 };
const SPOT_DISPLAY = DAMAGE_SIZE * 0.9;
/** Where a ground-lane spot first touches the player: spots are timed to arrive here on a beat. */
const CONTACT_X = PLAYER_X + PLAYER_HITBOX.w / 2 + SPOT_DISPLAY / 2;
/** On-beat window (seconds either side) for a Perfect; the precision twist tightens it. */
const PERFECT_WINDOW = 0.11;
const PRECISION_WINDOW = 0.07;
const DARKNESS = 0.82;

type SpotKind = 'damage' | 'tile';

interface SpotInfo {
  kind: SpotKind;
  damage: DamageId;
  lane: number;
  /** Beat on which the spot reaches the player (for Perfect judging). */
  arrival: number;
  hidden: boolean;
  documented: boolean;
  done: boolean;
  fragile: boolean;
  /** Pairs twist: the answer of a call-and-response pair. */
  answer: boolean;
  /** Regrowth twist: this spot already came back once. */
  regrown: boolean;
  badge?: Phaser.GameObjects.Image;
  ring?: Phaser.GameObjects.Image;
}

type Spot = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

export interface RunResult {
  index: number;
  score: number;
  restoration: number;
  bestCombo: number;
  documented: number;
  perfects: number;
  stars: number;
  failed: boolean;
  seen: DamageId[];
  chill: boolean;
  wrongTools: number;
  missed: number;
  integrity: number;
  /** Set for the daily challenge. */
  daily?: string;
}

export interface RunData {
  index: number;
  /** Daily challenge: date key and seed, so everyone gets the same run that day. */
  daily?: { date: string; seed: number };
}

interface FinaleStep {
  damage: DamageId;
  time: number;
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
  private avatarShadow!: Phaser.GameObjects.Ellipse;
  private spots!: Phaser.Physics.Arcade.Group;
  private floor!: Phaser.GameObjects.Rectangle;
  private layers: { sprite: Phaser.GameObjects.TileSprite; factor: number }[] = [];
  private elapsed = 0;
  private extraJumps = 0;
  private uvCooldown = 0;
  private cameraCooldown = 0;
  private paused = false;
  /** Field guide is open: the run waits. */
  private briefing = false;
  /** A pause sub-menu (field guide, controls) owns the keyboard. */
  private subMenu = false;
  /** Pulse the slot of the tool needed for the next damage (pause menu toggle, remembered). */
  private assist = loadAssist();
  private hintRing!: Phaser.GameObjects.Graphics;
  private ended = false;
  private seen = new Set<DamageId>();
  private audio = AudioDirector.get();
  private daily?: RunData['daily'];
  private chill = false;
  /** Seeded randomness for twists (reproducible daily runs). */
  private rand: () => number = Math.random;

  // Rhythm
  private spawner!: PatternSpawner;
  private pendingEvent!: SpawnEvent;
  private beatDur = 0.6;
  private localBeat = 0;
  private nextSpawnBeat = -1;
  /** Beats per pattern slot at this level's density. */
  private slotBeats = 2;
  private lastWholeBeat = -1;
  private tempoScale = 1;
  private regrowQueue: { beat: number; event: SpawnEvent }[] = [];
  private lastCallRestored = false;
  /** Beat at which play was suspended (pause / field guide), to shift the schedule on resume. */
  private heldAt: number | null = null;

  // Twist visuals
  private dark?: Phaser.GameObjects.RenderTexture;
  private darkAlpha = DARKNESS;
  private haze?: Phaser.GameObjects.Rectangle;

  // Finale
  private finale?: { steps: FinaleStep[]; at: number; left: number; ready: boolean; start: Phaser.GameObjects.Container; layer: Phaser.GameObjects.Container; grime: Phaser.GameObjects.Graphics; rows: Phaser.GameObjects.Text[]; timer: Phaser.GameObjects.Graphics };
  private finaleDone = false;

  // HUD
  private toolSlots: Phaser.GameObjects.Container[] = [];
  private toolName!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private timeBar!: Phaser.GameObjects.Graphics;
  private integrityBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private conditionText!: Phaser.GameObjects.Text;
  private restorationText!: Phaser.GameObjects.Text;
  private nextText!: Phaser.GameObjects.Text;
  private grime!: Phaser.GameObjects.RenderTexture;
  private artifactPos = { x: 0, y: 0 };
  private artifactCracks!: Phaser.GameObjects.Graphics;
  private glow!: Phaser.GameObjects.Graphics;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private toast!: Phaser.GameObjects.Text;
  private uvButton!: Phaser.GameObjects.Container;
  private cameraButton!: Phaser.GameObjects.Container;
  private pauseLayer?: Phaser.GameObjects.Container;
  private pauseNav?: MenuNav;

  constructor() {
    super('Run');
  }

  init(data: RunData) {
    // Scene instances are reused across restarts, so reset everything here.
    this.index = data.index ?? 0;
    this.daily = data.daily;
    this.culture = CULTURES[this.index];
    this.diff = difficultyFor(this.index);
    this.chill = loadSave().chill;
    this.assist = loadAssist();
    const twist = this.culture.twist;
    this.state = new RunState({ penalty: this.diff.mistakePenalty, chill: this.chill, perfectMultiplier: twist === 'precision' ? 3 : undefined });
    this.tools = toolsFor(this.culture.damages);
    this.toolIndex = 0;
    this.layers = [];
    this.toolSlots = [];
    this.elapsed = this.uvCooldown = this.cameraCooldown = this.extraJumps = this.localBeat = 0;
    this.paused = this.ended = this.briefing = this.subMenu = this.finaleDone = this.lastCallRestored = false;
    this.pauseLayer = this.finale = this.dark = this.haze = undefined;
    this.pauseNav = undefined;
    this.darkAlpha = DARKNESS;
    this.seen = new Set();
    this.regrowQueue = [];
    this.nextSpawnBeat = this.lastWholeBeat = -1;
    this.heldAt = null;
    this.tempoScale = 1;
    this.beatDur = 60 / this.culture.sound.tempo;
    // A pattern slot is the level's spawn interval rounded to the music's beats.
    this.slotBeats = Math.max(1, Math.round(this.diff.spawnInterval / this.beatDur));
    const seed = this.daily?.seed ?? seedFrom(`${this.culture.id}-${Date.now()}`);
    this.rand = seededRng(seed ^ 0x5bd1e995);
    this.spawner = new PatternSpawner({ damages: this.culture.damages, lanes: this.diff.lanes, level: this.index, rng: seededRng(seed), pairs: twist === 'pairs' });
    this.pendingEvent = this.spawner.next();
  }

  preload() {
    loadLandscape(this, this.culture.id);
    loadArtifact(this, this.culture.id);
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
    this.createTwist();
    this.createHud();
    this.bindInput();
    const autoPause = () => {
      if (!this.paused && !this.briefing && !this.ended) this.togglePause();
    };
    this.game.events.on(Phaser.Core.Events.BLUR, autoPause);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, autoPause);
      this.audio.duck(false);
      this.audio.setTempoScale(1);
      // The animation manager is game-wide: leaving from the pause menu must not keep it paused.
      this.anims.resumeAll();
    });
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
    this.layers = addLandscape(this, this.culture, GROUND_Y);

    this.floor = this.add.rectangle(WIDTH / 2, GROUND_Y + 50, WIDTH * 2, 100).setVisible(false);
    this.physics.add.existing(this.floor, true);
  }

  private createPlayer() {
    this.avatarShadow = this.add.ellipse(PLAYER_X, GROUND_Y + 3, 78, 13, 0x38281f, 0.22).setDepth(4);
    // Invisible physics body with the same hitbox for every avatar; the visible avatar follows it.
    this.player = this.physics.add.sprite(PLAYER_X, GROUND_Y - 120, 'avatar-placeholder').setVisible(false);
    this.player.body.setSize(PLAYER_HITBOX.w, PLAYER_HITBOX.h);
    // Thin mountain air: lighter gravity, higher and floatier jumps.
    if (this.culture.twist === 'thinAir') this.player.body.setGravityY(-450);
    this.avatar = addAvatar(this, this.culture, PLAYER_X, GROUND_Y, AVATAR_HEIGHT, 'run');
    this.avatar.object.setDepth(5);
  }

  private createTwist() {
    const twist = this.culture.twist;
    if (twist === 'darkness') {
      this.dark = this.add.renderTexture(0, 0, WIDTH, HEIGHT).setOrigin(0, 0).setDepth(8);
    }
    if (twist === 'sandstorm') {
      this.haze = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0xd9a35b, 0.2).setDepth(8);
    }
  }

  private get speed() {
    return this.diff.scrollSpeed * this.tempoScale;
  }

  private jump() {
    if (this.paused || this.briefing || this.ended) return;
    // In the finale the jump key applies the selected tool.
    if (this.finale) {
      if (!this.finale.ready) return this.beginFinale();
      return this.applyFinale(this.tools[this.toolIndex]);
    }
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

  /** Current beat: the music's audio clock when it runs, else a local clock at the same tempo. */
  private beatNow(): number {
    const pos = this.audio.beatPosition();
    if (pos) {
      this.beatDur = pos.dur;
      return pos.beat;
    }
    return this.localBeat;
  }

  /** Pixels the world scrolls per beat. Constant even when the tempo changes (crescendo), so spots just get faster. */
  private get beatPx() {
    return this.speed * this.beatDur;
  }

  /**
   * Place a spot so it reaches the player exactly on a beat: it arrives a whole number of beats after
   * it spawns. From then on its x is derived from the music's beat every frame (see update), so it
   * stays in time with what you hear regardless of frame rate.
   */
  private spawnSpot(kind: SpotKind, damage: DamageId, lane: number, spawnBeat: number, beat: number, extra: Partial<SpotInfo> = {}) {
    const travel = Math.ceil((WIDTH + DAMAGE_SIZE - CONTACT_X) / this.beatPx);
    const x = CONTACT_X + (spawnBeat + travel - beat) * this.beatPx;
    const tex = kind === 'tile' ? 'tile-piece' : damageTexture(damage);
    const spot = this.spots.create(x, LANES[lane], tex) as Spot;
    spot.setDisplaySize(SPOT_DISPLAY, SPOT_DISPLAY).setDepth(4);
    spot.body.moves = false; // kinematic: the body follows the beat-derived position
    const def = DAMAGES[damage];
    const info: SpotInfo = {
      kind, damage, lane, arrival: spawnBeat + travel,
      hidden: kind === 'damage' && !!def.hiddenUntilUV,
      documented: false, done: false, fragile: false, answer: false, regrown: false, ...extra,
    };
    spot.setData('info', info);
    if (info.hidden) spot.setAlpha(0.12);
    if (kind === 'tile') return spot;

    if (this.culture.twist === 'fragile' && this.rand() < 0.3) {
      info.fragile = true;
      info.ring = this.add.image(spot.x, spot.y, 'fragile-ring').setDisplaySize(SPOT_DISPLAY + 14, SPOT_DISPLAY + 14).setDepth(4);
    }
    this.state.spawn();
    if (!this.seen.has(damage)) {
      this.seen.add(damage);
      if (!info.hidden) this.toastText(`New: ${def.name} → ${TOOLS[def.treatedBy].name}`, 2200);
    }
    return spot;
  }

  private onTouch(spot: Spot) {
    const info = spot.getData('info') as SpotInfo;
    if (this.paused || this.briefing || this.ended || info.done || (info.hidden && spot.alpha < 1)) return;
    info.done = true;
    info.badge?.destroy();
    info.ring?.destroy();
    spot.body.enable = false;

    if (info.kind === 'tile') {
      this.avatar.react('restore');
      this.state.bonus(150);
      this.audio.sfx('bonus');
      this.sparks.explode(18, spot.x, spot.y);
      this.cleanPatch(2);
      this.floatText(spot.x, spot.y - 40, 'Tile restored! +150', '#d4a83a');
      this.tweens.add({ targets: spot, scale: spot.scale * 1.6, alpha: 0, duration: 260, onComplete: () => spot.destroy() });
      return this.refreshHud();
    }

    const window = this.culture.twist === 'precision' ? PRECISION_WINDOW : PERFECT_WINDOW;
    const perfect = Math.abs(this.beatNow() - info.arrival) * this.beatDur <= window;
    const tool = this.tools[this.toolIndex];
    const outcome = this.state.treat(info.damage, tool, { documented: info.documented, perfect, fragile: info.fragile });
    if (outcome === 'restored') {
      this.avatar.react('restore');
      this.audio.sfx('restore', this.state.combo);
      if (perfect) this.audio.sfx('perfect');
      this.sparks.explode(perfect ? 26 : 12, spot.x, spot.y);
      this.cleanPatch(perfect ? 2 : 1);
      const text = perfect ? 'Perfect!' : info.documented ? 'Restored! +docs' : 'Restored!';
      this.floatText(spot.x, spot.y - 40, text, perfect ? '#d4a83a' : '#2a9d8f');
      if (perfect || this.state.combo % 10 === 0) this.hitStop();
      // Call and response: answering a restored call earns a bonus.
      if (this.culture.twist === 'pairs') {
        if (info.answer && this.lastCallRestored) {
          this.state.bonus(100);
          this.floatText(spot.x, spot.y - 80, 'Response! +100', '#d4a83a');
        }
        this.lastCallRestored = !info.answer;
      }
      this.tweens.add({ targets: spot, scale: spot.scale * 1.6, alpha: 0, duration: 260, onComplete: () => spot.destroy() });
    } else {
      this.lastCallRestored = false;
      this.avatar.react('mistake');
      const need = TOOLS[DAMAGES[info.damage].treatedBy].name;
      this.floatText(spot.x, spot.y - 40, info.fragile ? 'Wrong tool! ×2' : 'Wrong tool!', '#c0392b');
      this.toastText(`${DAMAGES[info.damage].name} needs the ${need}`, 2000);
      this.audio.sfx('wrong');
      if (!REDUCED_MOTION) this.cameras.main.shake(140, 0.006);
      spot.setTint(0xc0392b);
      this.flashSlot(this.tools.indexOf(DAMAGES[info.damage].treatedBy));
      this.tweens.add({ targets: spot, alpha: 0, duration: 400, onComplete: () => spot.destroy() });
    }
    this.refreshHud();
  }

  /** A quick zoom punch to make a great hit land (freezing time would break the rhythm). */
  private hitStop() {
    if (REDUCED_MOTION) return;
    const cam = this.cameras.main;
    this.tweens.add({ targets: cam, zoom: 1.03, duration: 60, yoyo: true, onComplete: () => cam.setZoom(1) });
  }

  private useUV() {
    if (this.paused || this.briefing || this.ended || this.finale || this.uvCooldown > 0) return;
    this.uvCooldown = UV_COOLDOWN;
    this.audio.sfx('uv');
    if (!REDUCED_MOTION) {
      const flash = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x8e44ff, 0).setDepth(8);
      this.tweens.add({ targets: flash, fillAlpha: 0.3, duration: 150, yoyo: true, onComplete: () => flash.destroy() });
    }
    // In the tomb the UV lamp briefly lights the whole chamber.
    if (this.dark) {
      this.tweens.killTweensOf(this);
      this.tweens.add({ targets: this, darkAlpha: 0.12, duration: 150, yoyo: true, hold: 1400 });
    }
    for (const s of this.activeSpots()) {
      const info = s.getData('info') as SpotInfo;
      if (info.hidden && !info.done && s.alpha < 1) {
        s.setAlpha(1);
        this.floatText(s.x, s.y - 40, DAMAGES[info.damage].name, '#8e44ff');
      }
    }
  }

  private useCamera() {
    if (this.paused || this.briefing || this.ended || this.finale || this.cameraCooldown > 0) return;
    this.cameraCooldown = CAMERA_COOLDOWN;
    this.audio.sfx('camera');
    if (!REDUCED_MOTION) this.cameras.main.flash(120, 255, 255, 240);
    for (const s of this.activeSpots()) {
      const info = s.getData('info') as SpotInfo;
      if (info.kind !== 'damage' || info.done || info.documented || s.x > WIDTH || s.x < PLAYER_X - 30 || s.alpha < 1) continue;
      info.documented = true;
      info.badge = this.add.image(s.x + 30, s.y - 30, toolTexture('camera')).setDisplaySize(30, 30).setDepth(6);
    }
  }

  private activeSpots() {
    return this.spots.getChildren() as Spot[];
  }

  // ---------- loop ----------

  update(_t: number, deltaMs: number) {
    if (this.paused || this.briefing || this.ended) return;
    const dt = deltaMs / 1000;
    this.localBeat += dt / this.beatDur;
    this.releaseHold();
    if (this.finale) return this.updateFinale(dt);

    this.elapsed += dt;
    this.uvCooldown = Math.max(0, this.uvCooldown - dt);
    this.cameraCooldown = Math.max(0, this.cameraCooldown - dt);
    advanceLandscape(this.layers, this.speed * dt, REDUCED_MOTION);

    const running = this.elapsed < this.diff.duration;
    const beat = this.beatNow();
    if (running) this.spawnOnBeat(beat);
    this.updateTwist(beat);

    const beatPx = this.beatPx;
    for (const s of this.activeSpots()) {
      const info = s.getData('info') as SpotInfo;
      if (!info.done) s.x = CONTACT_X + (info.arrival - beat) * beatPx;
      else s.x -= this.speed * dt; // treated spots drift off while their effect plays
      info.badge?.setPosition(s.x + 30, s.y - 30);
      info.ring?.setPosition(s.x, s.y);
      if (s.x < -DAMAGE_SIZE) {
        if (!info.done && info.kind === 'damage') {
          this.state.miss(info.fragile);
          this.audio.sfx('miss');
          this.lastCallRestored = false;
          // Jungle regrowth: missed damage comes back once, a few beats later.
          if (this.culture.twist === 'regrowth' && !info.regrown && running)
            this.regrowQueue.push({ beat: beat + 6 + Math.floor(this.rand() * 6), event: { damage: info.damage, lane: info.lane, gap: 1 } });
          this.refreshHud();
        }
        info.badge?.destroy();
        info.ring?.destroy();
        s.destroy();
      }
    }

    this.animatePlayer(dt);
    this.drawTimeBar();
    this.drawToolHint();
    this.drawGlow();
    this.updateUtility(this.uvButton, this.uvCooldown, 'uv', 'Reveal');
    this.updateUtility(this.cameraButton, this.cameraCooldown, 'camera', 'Photo');

    if (this.state.failed) return this.finish();
    if (!running && this.spots.countActive() === 0) {
      if (this.finaleDone) this.finish();
      else this.startFinale();
    }
  }

  private hold() {
    if (this.heldAt === null) this.heldAt = this.beatNow();
  }

  /** After a pause, push every scheduled beat back by the time spent paused, so nothing jumps. */
  private releaseHold() {
    if (this.heldAt === null) return;
    const shift = this.beatNow() - this.heldAt;
    this.heldAt = null;
    if (shift <= 0) return;
    for (const s of this.activeSpots()) (s.getData('info') as SpotInfo).arrival += shift;
    if (this.nextSpawnBeat >= 0) this.nextSpawnBeat += shift;
    for (const r of this.regrowQueue) r.beat += shift;
  }

  /** Spawn pattern events on the beat grid; resync after pauses instead of bursting. */
  private spawnOnBeat(beat: number) {
    if (this.nextSpawnBeat < 0 || beat - this.nextSpawnBeat > 2) this.nextSpawnBeat = Math.ceil(beat);
    while (beat >= this.nextSpawnBeat) {
      const ev = this.pendingEvent;
      this.spawnSpot('damage', ev.damage, ev.lane, this.nextSpawnBeat, beat, { answer: !!ev.answer });
      this.pendingEvent = this.spawner.next();
      // Reserve landing time even at the crescendo's fastest tempo.
      const fastestBeat = (60 / this.culture.sound.tempo) / (this.culture.twist === 'crescendo' ? 1.3 : 1);
      this.nextSpawnBeat += spacingBeats(ev.lane, this.pendingEvent.lane, ev.gap, this.slotBeats, fastestBeat, this.culture.twist === 'thinAir');
    }
    for (const r of [...this.regrowQueue]) {
      if (beat < r.beat) continue;
      this.regrowQueue.splice(this.regrowQueue.indexOf(r), 1);
      const spot = this.spawnSpot('damage', r.event.damage, r.event.lane, Math.ceil(beat), beat, { regrown: true });
      this.floatText(WIDTH - 120, spot.y - 50, 'Regrowth!', '#3a7d44');
    }
  }

  private updateTwist(beat: number) {
    const twist = this.culture.twist;
    const whole = Math.floor(beat);
    const newBeat = whole !== this.lastWholeBeat;
    this.lastWholeBeat = whole;

    if (this.elapsed < this.diff.duration && twist === 'tiles' && newBeat && whole % 6 === 3 && this.rand() < 0.7)
      this.spawnSpot('tile', this.culture.damages[0], Math.floor(this.rand() * this.diff.lanes), whole, beat);

    if ((twist === 'wind' || twist === 'sandstorm') && newBeat && whole % 8 === 4) this.gust();

    if (this.haze) this.haze.setFillStyle(0xd9a35b, 0.16 + 0.1 * Math.sin(this.time.now / 700));

    if (this.dark) {
      // A pool of lamplight around the restorer; everything else is dark.
      this.dark.clear().fill(0x0b0710, this.darkAlpha).erase('light', this.player.x - 280, this.player.y - 320);
    }

    if (twist === 'crescendo') {
      const scale = 1 + 0.3 * Math.min(1, this.elapsed / this.diff.duration);
      if (scale - this.tempoScale > 0.01) {
        this.tempoScale = scale;
        this.audio.setTempoScale(scale);
      }
    }
  }

  /** Wind: damage ahead drifts one lane up or down, with a warning arrow. */
  private gust() {
    const dir = this.rand() < 0.5 ? -1 : 1;
    for (const s of this.activeSpots()) {
      const info = s.getData('info') as SpotInfo;
      if (info.done || s.x < PLAYER_X + this.speed * 1.5) continue;
      const lane = Phaser.Math.Clamp(info.lane - dir, 0, this.diff.lanes - 1);
      if (lane === info.lane) continue;
      // Higher lane index = higher on screen.
      this.floatText(s.x, s.y - 50, lane > info.lane ? '↑' : '↓', '#2b6cb0');
      info.lane = lane;
      this.tweens.add({ targets: s, y: LANES[lane], duration: this.beatDur * 1000, ease: 'Sine.easeInOut' });
    }
    this.toastText(this.culture.twist === 'sandstorm' ? 'Sandstorm gust!' : 'Gust of wind!', 900);
  }

  private animatePlayer(dt: number) {
    const body = this.player.body;
    const lift = Phaser.Math.Clamp((GROUND_Y - body.bottom) / 350, 0, 1);
    this.avatarShadow.setPosition(this.player.x, GROUND_Y + 3).setScale(1 - lift * 0.55).setAlpha(1 - lift * 0.7);
    this.avatar.setAnim(this.finale ? 'idle' : body.blocked.down ? 'run' : body.velocity.y < 0 ? 'jump' : 'fall');
    this.avatar.setRunSpeed(this.speed);
    this.avatar.setFeet(this.player.x, body.bottom);
    this.avatar.tick(dt);
  }

  private finish() {
    this.ended = true;
    this.physics.pause();
    this.audio.setIntensity(0);
    if (this.tempoScale !== 1) this.audio.setTempoScale(1);
    this.audio.sfx(this.state.stars > 0 ? 'win' : 'fail');
    const result: RunResult = {
      index: this.index,
      score: this.state.score,
      restoration: this.state.restoration,
      bestCombo: this.state.bestCombo,
      documented: this.state.documented,
      perfects: this.state.perfects,
      stars: this.state.stars,
      failed: this.state.failed,
      seen: [...this.seen],
      chill: this.chill,
      wrongTools: this.state.wrongTools,
      missed: this.state.missed,
      integrity: this.state.integrity,
      daily: this.daily?.date,
    };
    this.time.delayedCall(700, () => this.scene.start('Results', result));
  }

  // ---------- finale: the final restoration ----------

  /** Run up to the artifact itself, then treat its worst damage in sequence against the clock. */
  private startFinale() {
    this.player.body.setVelocity(0, 0);
    this.physics.pause();
    const count = 3 + Math.floor(this.index / 4);
    const time = Math.max(2.5, 4 - this.index * 0.12);
    const steps: FinaleStep[] = [];
    for (let i = 0; i < count; i++) {
      const options = this.culture.damages.filter((d) => d !== steps[i - 1]?.damage);
      steps.push({ damage: options[Math.floor(this.rand() * options.length)], time });
    }
    const layer = this.add.container(0, 0).setDepth(15);
    layer.add(this.add.rectangle(WIDTH / 2, 280, WIDTH, 560, INK, 0.45).setInteractive());
    layer.add(card(this, WIDTH / 2, 300, 820, 420));
    layer.add(label(this, WIDTH / 2, 130, 'Final restoration', 38, { fontFamily: FONT_DISPLAY }));
    layer.add(label(this, WIDTH / 2, 172, 'Take a breath. Then tap a tool or press its number to treat each damage in order.', 19));
    const art = addArtifact(this, this.culture, WIDTH / 2 - 380, 205, 330, 200);
    const grime = this.add.graphics().setPosition(WIDTH / 2 - 380, 205);
    grime.fillStyle(0x6b5434, 0.8).fillRect(0, 0, 330, 200);
    layer.add([art, grime]);
    const rows = steps.map((s, i) => {
      layer.add(this.add.image(WIDTH / 2 + 10, 230 + i * 42, damageTexture(s.damage)).setDisplaySize(36, 36));
      const t = label(this, WIDTH / 2 + 42, 230 + i * 42, DAMAGES[s.damage].name, 22).setOrigin(0, 0.5);
      layer.add(t);
      return t;
    });
    const timer = this.add.graphics();
    layer.add(timer);
    const start = button(this, WIDTH / 2, 477, 'Begin final care', () => this.beginFinale(), 300);
    layer.add(start);
    this.finale = { steps, at: 0, left: time, ready: false, start, layer, grime, rows, timer };
    this.nextText.setText('Final care · press Jump or Begin when ready');
    this.hintRing.clear();
    this.audio.setIntensity(4);
    this.highlightFinale();
  }

  private beginFinale() {
    if (!this.finale || this.finale.ready || this.paused || this.ended) return;
    this.finale.ready = true;
    this.finale.start.setVisible(false).disableInteractive();
    this.nextText.setText('Final care · select a tool to apply it');
  }

  private highlightFinale() {
    const f = this.finale!;
    f.rows.forEach((r, i) => r.setColor(i === f.at ? '#c4622d' : i < f.at ? '#7a6a85' : '#2b1d2e').setFontStyle(i === f.at ? 'bold' : 'normal'));
  }

  private updateFinale(dt: number) {
    const f = this.finale!;
    this.animatePlayer(dt);
    if (!f.ready) return;
    f.left -= dt;
    const step = f.steps[f.at];
    f.timer.clear().fillStyle(INK, 1).fillRoundedRect(WIDTH / 2 - 380, 430, 760, 16, 8);
    f.timer.fillStyle(f.left / step.time > 0.3 ? 0x2a9d8f : 0xc0392b, 1).fillRoundedRect(WIDTH / 2 - 376, 434, 752 * Math.max(0, f.left / step.time), 8, 4);
    if (f.left <= 0) this.applyFinale(null);
  }

  /** Apply a tool to the current finale step (null = ran out of time). */
  private applyFinale(tool: ToolId | null) {
    const f = this.finale;
    if (!f || !f.ready || this.paused || this.ended) return;
    const step = f.steps[f.at];
    const right = tool !== null && DAMAGES[step.damage].treatedBy === tool;
    const y = 230 + f.at * 42;
    if (right) {
      const points = 120 + 40 * f.at + Math.round(60 * (f.left / step.time));
      this.state.bonus(points);
      this.audio.sfx('restore', f.at + 2);
      this.sparks.explode(20, WIDTH / 2 + 10, y);
      this.floatText(WIDTH / 2 + 260, y, `+${points}`, '#2a9d8f');
      this.tweens.add({ targets: f.grime, alpha: Math.max(0, 1 - (f.at + 1) / f.steps.length), duration: 300 });
    } else {
      this.state.setback(this.diff.mistakePenalty);
      this.audio.sfx('wrong');
      this.floatText(WIDTH / 2 + 260, y, tool === null ? 'Too slow!' : 'Wrong tool!', '#c0392b');
      this.flashSlot(this.tools.indexOf(DAMAGES[step.damage].treatedBy));
    }
    this.refreshHud();
    f.at++;
    if (f.at >= f.steps.length || this.state.failed) {
      this.finaleDone = true;
      const layer = f.layer;
      this.finale = undefined;
      this.toastText(this.state.failed ? 'The artifact could not be saved…' : 'Restoration complete!', 1500);
      this.time.delayedCall(1100, () => {
        layer.destroy();
        this.finish();
      });
      this.ended = true; // hold input until results
      return;
    }
    f.left = f.steps[f.at].time;
    this.highlightFinale();
  }

  // ---------- HUD ----------

  private createHud() {
    this.add.graphics().fillStyle(INK, 0.88).fillRoundedRect(12, 12, 366, 145, 18).setDepth(9);
    this.add.graphics().fillStyle(INK, 0.88).fillRoundedRect(492, 12, 296, 105, 18).setDepth(9);
    this.add.rectangle(WIDTH / 2, HEIGHT - 47, WIDTH, 94, INK, 0.94).setDepth(9);
    label(this, 28, 37, this.culture.name, 30, { fontFamily: FONT_DISPLAY, color: PAPER_CSS }).setOrigin(0, 0.5).setDepth(10);
    this.progressText = label(this, 28, 91, '', 17, { color: PAPER_CSS }).setOrigin(0, 0.5).setDepth(10);
    this.timeBar = this.add.graphics().setDepth(10);
    this.integrityBar = this.add.graphics().setDepth(10);
    this.conditionText = label(this, 28, 128, '', 18, { color: PAPER_CSS }).setOrigin(0, 0.5).setDepth(10);
    label(this, WIDTH / 2, 27, this.daily ? 'DAILY SCORE' : 'SCORE', 14, { color: '#e5cfae', fontFamily: 'Arial, sans-serif', letterSpacing: 3 }).setDepth(10);
    this.scoreText = label(this, WIDTH / 2, 58, '0', 32, { color: PAPER_CSS, fontFamily: 'Arial, sans-serif', fontStyle: 'bold' }).setDepth(10);
    this.comboText = label(this, WIDTH / 2, 93, '', 20, { color: '#f2c14e' }).setDepth(10);
    this.nextText = label(this, WIDTH / 2, 144, '', 21, { color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 6 }).setDepth(10);
    button(this, 899, 49, 'Pause', () => this.togglePause(), 142).setDepth(18);
    button(this, 105, HEIGHT - 48, 'Jump', () => this.jump(), 156).setDepth(10);
    label(this, 105, HEIGHT - 10, this.diff.lanes > 3 ? 'Tap twice: double jump' : 'Tap or press Jump', 15, { color: PAPER_CSS }).setDepth(10);

    // Artifact panel: every restore wipes a patch of grime away; mistakes crack it.
    const ax = WIDTH - ARTIFACT_W - 28, ay = 20;
    this.artifactPos = { x: ax, y: ay };
    card(this, ax + ARTIFACT_W / 2, ay + ARTIFACT_H / 2, ARTIFACT_W + 12, ARTIFACT_H + 12).setDepth(10);
    addArtifact(this, this.culture, ax, ay, ARTIFACT_W, ARTIFACT_H).setDepth(10);
    const g = this.make.graphics({}, false);
    const rng = new Phaser.Math.RandomDataGenerator([this.culture.id]);
    g.fillStyle(0x6b5434, 0.8).fillRect(0, 0, ARTIFACT_W, ARTIFACT_H);
    for (let i = 0; i < 40; i++) g.fillStyle(0x3d2f1f, 0.6).fillCircle(rng.between(0, ARTIFACT_W), rng.between(0, ARTIFACT_H), rng.between(3, 12));
    this.grime = this.add.renderTexture(ax, ay, ARTIFACT_W, ARTIFACT_H).setOrigin(0, 0).setDepth(10);
    this.grime.draw(g);
    g.destroy();
    this.artifactCracks = this.add.graphics().setPosition(ax, ay).setDepth(10);
    this.restorationText = label(this, ax + ARTIFACT_W / 2, 184, '', 18, { color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 5 }).setDepth(10);

    this.toolName = label(this, WIDTH / 2, HEIGHT - 108, '', 20, { color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 5 }).setDepth(10);
    const spacing = 92, start = WIDTH / 2 - ((this.tools.length - 1) * spacing) / 2;
    this.tools.forEach((tool, i) => {
      const c = this.add.container(start + i * spacing, HEIGHT - 52).setDepth(10);
      const bg = this.add.graphics();
      const icon = this.add.image(0, -2, toolTexture(tool)).setDisplaySize(58, 58);
      const key = label(this, 26, 23, String(i + 1), 19, { fontFamily: 'Arial, sans-serif', fontStyle: 'bold' });
      c.add([bg, icon, key]).setSize(80, 80).setInteractive({ useHandCursor: true });
      c.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.pickTool(i);
      });
      this.toolSlots.push(c);
      const treats = this.culture.damages.filter((d) => DAMAGES[d].treatedBy === tool);
      treats.forEach((d, k) => this.add.image(c.x + (k - (treats.length - 1) / 2) * 26, HEIGHT - 100, damageTexture(d)).setDisplaySize(23, 23).setDepth(10));
    });

    this.uvButton = this.actionButton(WIDTH - 150, HEIGHT - 52, toolTexture('uvLamp'), 'U', () => this.useUV());
    this.cameraButton = this.actionButton(WIDTH - 60, HEIGHT - 52, toolTexture('camera'), 'C', () => this.useCamera());
    if (!this.culture.damages.some((d) => DAMAGES[d].hiddenUntilUV) && this.culture.twist !== 'darkness') this.uvButton.setVisible(false);

    this.toast = label(this, WIDTH / 2, 188, '', 25, { color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 7, wordWrap: { width: 720 }, align: 'center' }).setDepth(11).setAlpha(0);
    this.hintRing = this.add.graphics().setDepth(11);
    this.glow = this.add.graphics().setDepth(9);
    this.sparks = this.add
      .particles(0, 0, 'spark', {
        lifespan: 550, speed: { min: 90, max: 260 }, scale: { start: 1, end: 0 }, alpha: { start: 1, end: 0 },
        rotate: { min: 0, max: 360 }, tint: [hex(this.culture.palette.accent), 0xf2c14e, 0xffffff], emitting: false,
      })
      .setDepth(12);
    this.selectTool(0);
    this.updateUtility(this.uvButton, 0, 'uv', 'Reveal');
    this.updateUtility(this.cameraButton, 0, 'camera', 'Photo');
    this.drawTimeBar();
    this.refreshHud();
  }

  /** Wipe a soft patch of grime off the artifact panel. */
  private cleanPatch(times: number) {
    for (let i = 0; i < times; i++) this.grime.erase('eraser', this.rand() * (ARTIFACT_W - 48), this.rand() * (ARTIFACT_H - 48));
    if (!REDUCED_MOTION) this.sparks.explode(6, this.artifactPos.x + ARTIFACT_W / 2, this.artifactPos.y + ARTIFACT_H / 2);
  }

  /** Screen-edge glow while on a hot streak. */
  private drawGlow() {
    const g = this.glow.clear();
    if (this.state.combo < 8) return;
    const pulse = REDUCED_MOTION ? 0.35 : 0.35 + 0.25 * Math.sin(this.time.now / 140);
    const w = Math.min(18, 6 + (this.state.combo - 8));
    g.lineStyle(w, 0xf2c14e, pulse).strokeRect(w / 2, w / 2, WIDTH - w, HEIGHT - w);
  }

  private actionButton(x: number, y: number, tex: string, key: string, onClick: () => void) {
    const c = this.add.container(x, y).setDepth(10);
    const bg = card(this, 0, 0, 76, 76);
    const status = label(this, 0, 45, '', 16, { color: PAPER_CSS });
    const shortcut = label(this, 26, 26, key, 16);
    c.add([bg, this.add.image(0, -2, tex).setDisplaySize(56, 56), shortcut, status]);
    c.setData('status', status).setData('shortcut', shortcut);
    c.setSize(76, 76).setInteractive({ useHandCursor: true });
    c.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      onClick();
    });
    return c;
  }

  private updateUtility(c: Phaser.GameObjects.Container, cooldown: number, action: Action, name: string) {
    (c.getAt(1) as Phaser.GameObjects.Image).setAlpha(cooldown > 0 ? 0.4 : 1);
    (c.getData('status') as Phaser.GameObjects.Text).setText(cooldown > 0 ? `${cooldown.toFixed(1)}s` : `${name} · ready`);
    const key = loadBindings()[action][0];
    (c.getData('shortcut') as Phaser.GameObjects.Text).setText(key ? keyLabel(key) : '');
  }

  /** Direct pick (number key / tap): in the finale this also applies the tool. */
  private pickTool(i: number) {
    if (this.paused || this.briefing || this.ended || this.subMenu) return;
    if (this.finale && i === this.toolIndex) return this.applyFinale(this.tools[i]);
    this.selectTool(i);
    if (this.finale) this.applyFinale(this.tools[this.toolIndex]);
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
      this.tweens.killTweensOf(c);
      this.tweens.add({ targets: c, y: HEIGHT - 52 - (on ? 6 : 0), scale: on ? 1.06 : 1, duration: REDUCED_MOTION ? 0 : 100 });
    });
    this.toolName.setText(`${this.toolIndex + 1} · ${TOOLS[this.tools[this.toolIndex]].name}`).setPosition(278, HEIGHT - 45).setOrigin(0.5).setWordWrapWidth(150).setFontSize(18);
  }

  /** Pulse the slot of the tool the next visible damage needs. */
  private drawToolHint() {
    const g = this.hintRing.clear();
    if (!this.assist) {
      this.nextText.setText('Match the tool · jump to reach damage');
      return;
    }
    let next: Spot | undefined;
    for (const s of this.activeSpots()) {
      const info = s.getData('info') as SpotInfo;
      if (info.kind !== 'damage' || info.done || s.x < PLAYER_X - 30 || s.x > PLAYER_X + HINT_RANGE) continue;
      if (!next || s.x < next.x) next = s;
    }
    if (!next) {
      this.nextText.setText(this.elapsed >= this.diff.duration ? 'Finish the remaining spots' : 'Look ahead · select a tool before contact');
      return;
    }
    const info = next.getData('info') as SpotInfo;
    if (info.hidden && next.alpha < 1) {
      this.nextText.setText('Hidden damage ahead · use Reveal');
      return;
    }
    const index = this.tools.indexOf(DAMAGES[info.damage].treatedBy);
    const slot = this.toolSlots[index];
    this.nextText.setText(`${DAMAGES[info.damage].name} → ${TOOLS[this.tools[index]].name} [${index + 1}]`);
    const pulse = REDUCED_MOTION ? 1 : 0.75 + 0.25 * Math.sin(this.time.now / 110);
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
    this.scoreText.setText(this.state.score.toLocaleString());
    this.comboText.setText(this.state.combo > 1 ? `${this.state.combo} in a row · keep going!` : 'Match · jump · restore');
    this.conditionText.setText(this.chill ? 'Chill · protected' : `Condition ${Math.ceil(this.state.integrity * 100)}%`);
    const resolved = this.state.restored + this.state.wrongTools + this.state.missed;
    this.restorationText.setText(resolved ? `${this.state.restored} restored · ${Math.round(this.state.accuracy * 100)}% accuracy` : 'Your restoration starts here');
    const g = this.integrityBar.clear();
    g.fillStyle(PAPER, 0.2).fillRoundedRect(182, 120, 174, 14, 7);
    if (this.state.integrity > 0) g.fillStyle(this.state.integrity > 0.35 ? 0x65d4b6 : 0xf08a77, 1).fillRoundedRect(182, 120, 174 * this.state.integrity, 14, 7);
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
    this.progressText.setText(p < 1 ? `${Math.ceil(this.diff.duration - this.elapsed)}s remaining · final care next` : 'Run complete · finish the remaining spots');
    this.timeBar.clear().fillStyle(PAPER, 0.2).fillRoundedRect(28, 65, 328, 8, 4);
    if (p > 0) this.timeBar.fillStyle(0xf2c14e, 1).fillRoundedRect(28, 65, 328 * p, 8, 4);
  }

  private toastText(msg: string, ms: number) {
    this.tweens.killTweensOf(this.toast);
    this.toast.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 400 });
  }

  private floatText(x: number, y: number, msg: string, color: string) {
    const t = label(this, x, y, msg, 24, { color, stroke: PAPER_CSS, strokeThickness: 6 }).setDepth(16);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  // ---------- input & pause ----------

  private bindInput() {
    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => {
      if (this.briefing || this.subMenu || e.repeat) return;
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
        if (i < this.tools.length && !this.paused) this.pickTool(i);
      }
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.selectTool(this.toolIndex + Math.sign(dy)));
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0 && !this.briefing) this.jump();
    });
    // Standard gamepad mapping. Tools on shoulders/D-pad and UV/camera on triggers, so they work
    // while the thumb stays on A (jump). X/Y kept as alternates; Start/Select pause.
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, b: Phaser.Input.Gamepad.Button) => {
      if (this.briefing || this.subMenu) return;
      const prev = () => this.selectTool(this.toolIndex - 1), next = () => this.selectTool(this.toolIndex + 1);
      const camera = () => this.useCamera(), uv = () => this.useUV(), pause = () => this.togglePause();
      ({ 0: () => this.jump(), 12: () => this.jump(), 2: camera, 6: camera, 3: uv, 7: uv, 4: prev, 14: prev, 5: next, 15: next, 8: pause, 9: pause } as Record<number, () => void>)[b.index]?.();
    });
  }

  private togglePause() {
    if (this.ended || this.briefing || this.subMenu) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.hold();
      this.physics.pause();
      this.audio.duck(true);
      this.tweens.pauseAll();
      this.anims.pauseAll();
      const c = this.add.container(0, 0).setDepth(20);
      c.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, INK, 0.6).setInteractive());
      c.add(card(this, WIDTH / 2, HEIGHT / 2, 440, 560));
      c.add(label(this, WIDTH / 2, HEIGHT / 2 - 225, 'Paused', 44, { fontFamily: FONT_DISPLAY }));
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
      const at = (i: number) => HEIGHT / 2 - 145 + i * 83;
      const resume = button(this, WIDTH / 2, at(0), 'Resume', () => this.togglePause(), 300);
      const restart = button(this, WIDTH / 2, at(1), 'Restart', () => this.scene.restart({ index: this.index, daily: this.daily }), 300);
      const guide = button(this, WIDTH / 2, at(2), 'Field guide', () => subMenu((done) => showFieldGuide(this, this.culture, 'Back', done)), 300);
      const options = button(this, WIDTH / 2, at(3), 'Options', () => subMenu((done) => showOptionsMenu(this, { inRun: true }, () => {
        this.assist = loadAssist();
        done();
      })), 300);
      const map = button(this, WIDTH / 2, at(4), 'World map', () => this.scene.start('WorldMap'), 300);
      c.add([resume, restart, guide, options, map]);
      this.pauseLayer = c;
      // Esc is the pause key itself, so only gamepad B means "back" here.
      this.pauseNav = new MenuNav(this, [resume, restart, guide, options, map].map(focusButton), { back: () => this.togglePause(), escape: false, depth: 25 });
    } else {
      if (!this.finale) this.physics.resume();
      this.audio.duck(false);
      this.tweens.resumeAll();
      this.anims.resumeAll();
      this.pauseLayer?.destroy();
      this.pauseNav?.destroy();
      this.pauseNav = undefined;
    }
  }
}
