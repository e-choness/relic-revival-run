import { isCorrectTool, type DamageId, type ToolId, type UtilityToolId } from '../data/conservation';

export type Outcome = 'restored' | 'wrongTool';

const BASE_POINTS = 100;
const DOCUMENTED_BONUS = 50;
const MAX_COMBO_BONUS = 10;

/** Scoring and artifact condition for one run; no Phaser dependency so it can be unit tested. */
export class RunState {
  spawned = 0;
  restored = 0;
  documented = 0;
  combo = 0;
  bestCombo = 0;
  score = 0;
  /** Artifact integrity, 1 → 0. Mistakes damage the object; at 0 the run fails. */
  integrity = 1;

  constructor(private readonly penalty: number) {}

  spawn() {
    this.spawned++;
  }

  treat(damage: DamageId, tool: ToolId | UtilityToolId, wasDocumented: boolean): Outcome {
    if (!isCorrectTool(damage, tool)) {
      this.hurt(this.penalty);
      return 'wrongTool';
    }
    this.restored++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.score += Math.round(BASE_POINTS * (1 + Math.min(this.combo, MAX_COMBO_BONUS) * 0.1));
    if (wasDocumented) {
      this.documented++;
      this.score += DOCUMENTED_BONUS;
    }
    return 'restored';
  }

  /** Damage scrolled past untreated: it keeps deteriorating, but less than a wrong treatment. */
  miss() {
    this.hurt(this.penalty / 2);
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
    this.integrity = Math.max(0, this.integrity - amount);
  }
}
