import { DAMAGES, type DamageId } from '../data/conservation';

// Authored damage "phrases" that teach, then test. Randomness only chooses which phrase comes next.
// Pure (seeded RNG) so it is unit-testable and daily runs are reproducible.

export interface SpawnEvent {
  damage: DamageId;
  /** 0 = ground lane; higher lanes need jumps. */
  lane: number;
  /** Slots to wait after this spot before the next (1 slot = the level's base spacing, in beats). */
  gap: number;
  /** Pairs mode: the answering spot of a call-and-response pair. */
  answer?: boolean;
}

export interface PatternOptions {
  damages: DamageId[];
  lanes: number;
  /** 0-based culture index: harder phrases unlock later. */
  level: number;
  rng: () => number;
  /** Call and response: every spot is answered by a second of the same kind (Nigeria). */
  pairs?: boolean;
}

interface Phrase {
  name: string;
  minLevel: number;
  build(o: PatternOptions, pick: Picker): SpawnEvent[] | null;
}

interface Picker {
  any(): DamageId;
  other(than: DamageId): DamageId;
  hidden(): DamageId | null;
  lane(max?: number): number;
}

const visible = (d: DamageId) => !DAMAGES[d].hiddenUntilUV;

const PHRASES: Phrase[] = [
  { name: 'switch', minLevel: 0, build: (_o, p) => { const a = p.any(), b = p.other(a); return [{ damage: a, lane: 0, gap: 1 }, { damage: a, lane: p.lane(1), gap: 1 }, { damage: b, lane: 0, gap: 1.5 }]; } },
  { name: 'trio', minLevel: 0, build: (_o, p) => { const a = p.any(); return [0, 1, 2].map(() => ({ damage: a, lane: p.lane(), gap: 1 })); } },
  { name: 'stairs', minLevel: 1, build: (o, p) => { if (o.lanes < 3) return null; const a = p.any(); return [0, 1, 2].map((lane) => ({ damage: a, lane, gap: 1 })); } },
  { name: 'highLow', minLevel: 2, build: (o, p) => { if (o.lanes < 4) return null; const a = p.any(), b = p.other(a); return [{ damage: a, lane: 3, gap: 1 }, { damage: b, lane: 0, gap: 1 }, { damage: a, lane: 2, gap: 1 }, { damage: b, lane: 0, gap: 1.5 }]; } },
  { name: 'rapid', minLevel: 4, build: (_o, p) => { const a = p.any(), b = p.other(a); return [a, b, a, b].map((damage, i) => ({ damage, lane: i % 2, gap: i === 3 ? 1.5 : 0.5 })); } },
  { name: 'uvReveal', minLevel: 0, build: (_o, p) => { const h = p.hidden(); return h ? [{ damage: p.any(), lane: 0, gap: 1 }, { damage: h, lane: p.lane(1), gap: 1.5 }] : null; } },
  { name: 'breather', minLevel: 0, build: (_o, p) => [{ damage: p.any(), lane: p.lane(), gap: 2 }] },
];

export class PatternSpawner {
  private queue: SpawnEvent[] = [];
  private introduced = new Set<DamageId>();
  private last = '';

  constructor(private readonly o: PatternOptions) {}

  next(): SpawnEvent {
    if (this.queue.length === 0) this.queue = this.phrase();
    return this.queue.shift()!;
  }

  /** Name of the phrase most recently started (for tests and debugging). */
  get current() {
    return this.last;
  }

  private phrase(): SpawnEvent[] {
    const { o } = this;
    const r = o.rng;
    const shown = o.damages.filter(visible);
    const pool = shown.length ? shown : o.damages;
    const pick: Picker = {
      any: () => pool[Math.floor(r() * pool.length)],
      other: (than) => {
        const rest = pool.filter((d) => d !== than);
        return rest.length ? rest[Math.floor(r() * rest.length)] : than;
      },
      hidden: () => {
        const h = o.damages.filter((d) => !visible(d));
        return h.length ? h[Math.floor(r() * h.length)] : null;
      },
      lane: (max = o.lanes - 1) => Math.floor(r() * (Math.min(max, o.lanes - 1) + 1)),
    };

    // Teach first: each visible damage type is introduced three times on the ground lane.
    const fresh = shown.find((d) => !this.introduced.has(d));
    let events: SpawnEvent[];
    if (fresh) {
      this.introduced.add(fresh);
      this.last = 'intro';
      events = [0, 1, 2].map(() => ({ damage: fresh, lane: 0, gap: 1 }));
    } else {
      const options = PHRASES.filter((p) => p.minLevel <= o.level && p.name !== this.last);
      for (;;) {
        const p = options[Math.floor(r() * options.length)];
        const built = p.build(o, pick);
        if (built) {
          this.last = p.name;
          events = built;
          break;
        }
      }
    }
    if (o.pairs) events = events.flatMap((e) => [{ ...e, gap: 0.5 }, { ...e, gap: e.gap, answer: true }]);
    return events;
  }
}
