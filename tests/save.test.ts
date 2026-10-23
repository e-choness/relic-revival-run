import { describe, expect, it } from 'vitest';
import { CULTURES } from '../src/data/cultures';
import { isComplete, loadSave, markSeen, recordRun, resetSave } from '../src/systems/save';
import { clampVolume, loadAssist, loadVolume } from '../src/systems/settings';

describe('save progress', () => {
  it('keeps the best score per culture', () => {
    let save = recordRun(loadSave(), 'mexico', 1, 0.7, ['grime'], 900);
    save = recordRun(save, 'mexico', 2, 0.85, ['salts'], 600);
    expect(save.scores.mexico).toBe(900);
    expect(save.stars.mexico).toBe(2);
    expect(save.learned).toEqual(['grime', 'salts']);
  });

  it('the collection is complete once every released culture has a star', () => {
    const stars = Object.fromEntries(CULTURES.map((c) => [c.id, 1]));
    expect(isComplete({ stars })).toBe(true);
    expect(isComplete({ stars: { ...stars, mali: 0 } })).toBe(false);
    expect(isComplete({ stars: {} })).toBe(false);
  });

  it('marks story beats and resets everything', () => {
    const seen = markSeen(markSeen(loadSave(), 'intro'), 'ending');
    expect(seen.seenIntro && seen.seenEnding).toBe(true);
    const fresh = resetSave();
    expect(fresh).toMatchObject({ stars: {}, scores: {}, learned: [], seenIntro: false, seenEnding: false, chill: false });
  });
});

describe('settings', () => {
  it('clamps volumes to tenths between 0 and 1', () => {
    expect(clampVolume(1.3)).toBe(1);
    expect(clampVolume(-0.2)).toBe(0);
    expect(clampVolume(0.1 + 0.2)).toBe(0.3);
  });

  it('defaults to full volume and tool hints on without storage', () => {
    expect(loadVolume('music')).toBe(1);
    expect(loadAssist()).toBe(true);
  });
});
