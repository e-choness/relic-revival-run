import { describe, expect, it } from 'vitest';
import { freshKeys } from '../src/ui/keys';

describe('freshKeys', () => {
  it('handles each key event once, however often Phaser replays its queue', () => {
    const handled: string[] = [];
    const onKey = freshKeys((e) => handled.push(e.code));
    const a = { code: 'KeyP' } as KeyboardEvent, b = { code: 'KeyP' } as KeyboardEvent;
    // Phaser's replay of a one-frame queue: [a], [a, b], [a, b, ...].
    [a, a, b, a, b].forEach(onKey);
    expect(handled).toEqual(['KeyP', 'KeyP']);
  });
});
