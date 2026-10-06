import { isCorrectTool, type DamageId, type ToolId, type UtilityToolId } from '../data/conservation';

export type Outcome = 'restored' | 'wrongTool';

const BASE_POINTS = 100;
const DOCUMENTED_BONUS = 50;
const MAX_COMBO_BONUS = 10;
const PERFECT_MULTIPLIER = 1.5;
const FRAGILE_MULTIPLIER = 2;

export interface RunRules {
  /** Integrity lost per wrong treatment (a miss costs half). */
  penalty: number;
  /** Chill mode: mistakes break the combo but never damage the artifact. */
  chill?: boolean;
  /** Score multiplier for on-beat treatments (the precision twist raises it). */
  perfectMultiplier?: number;
}

export interface TreatOptions {
  /** Photographed before treatment. */
  documented?: boolean;
  /** Treated on the beat. */
  perfect?: boolean;
  /** Fragile spot: double points if right, double damage if wrong. */
  fragile?: boolean;
}

/** Scoring and artifact condition for one run; no Phaser dependency so it can be unit tested. */
export class RunState {
  spawned = 0;
  restored = 0;
  documented = 0;
  perfects = 0;
  combo = 0;
  bestCombo = 0;
  score = 0;
  /** Artifact integrity, 1 → 0. Mistakes damage the object; at 0 the run fails. */
  integrity = 1;

  constructor(private readonly rules: RunRules) {}

  spawn() {
    this.spawned++;
  }

  treat(damage: DamageId, tool: ToolId | UtilityToolId, opts: TreatOptions = {}): Outcome {
    const stakes = opts.fragile ? FRAGILE_MULTIPLIER : 1;
    if (!isCorrectTool(damage, tool)) {
      this.hurt(this.rules.penalty * stakes);
      return 'wrongTool';
    }
    this.restored++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    let points = BASE_POINTS * (1 + Math.min(this.combo, MAX_COMBO_BONUS) * 0.1) * stakes;
    if (opts.perfect) {
      this.perfects++;
      points *= this.rules.perfectMultiplier ?? PERFECT_MULTIPLIER;
    }
    this.score += Math.round(points);
    if (opts.documented) {
      this.documented++;
      this.score += DOCUMENTED_BONUS;
    }
    return 'restored';
  }

  /** Damage scrolled past untreated: it keeps deteriorating, but less than a wrong treatment. */
  miss(fragile = false) {
    this.hurt((this.rules.penalty / 2) * (fragile ? FRAGILE_MULTIPLIER : 1));
  }

  /** Extra points from twists and the finale. */
  bonus(points: number) {
    this.score += Math.round(points);
  }

  /** A mistake outside normal treatment (e.g. a failed finale step). */
  setback(amount: number) {
    this.hurt(amount);
  }

  get restoration(): number {
    return this.spawned ? this.restored / this.spawned : 0;
  }

  get failed(): boolean {
    return this.integrity <= 0;
  }

  get stars(): 0 | 1 | 2 | 3 {
    if (this.failed) return 0;
    const r = this.restoration;
    return r >= 0.95 ? 3 : r >= 0.8 ? 2 : r >= 0.6 ? 1 : 0;
  }

  private hurt(amount: number) {
    this.combo = 0;
    if (!this.rules.chill) this.integrity = Math.max(0, this.integrity - amount);
  }
}
