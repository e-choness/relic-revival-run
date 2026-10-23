import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS, actionFor, keyLabel, rebind } from '../src/systems/controls';

describe('controls', () => {
  it('maps default keys to actions', () => {
    expect(actionFor(DEFAULT_BINDINGS, 'Space')).toBe('jump');
    expect(actionFor(DEFAULT_BINDINGS, 'KeyU')).toBe('uv');
    expect(actionFor(DEFAULT_BINDINGS, 'Digit1')).toBeUndefined();
  });

  it('rebinding takes the key away from other actions', () => {
    const b = rebind(DEFAULT_BINDINGS, 'uv', 'KeyC')!;
    expect(b.uv).toEqual(['KeyC']);
    expect(b.camera).toEqual([]);
    expect(actionFor(b, 'KeyC')).toBe('uv');
    expect(DEFAULT_BINDINGS.camera).toEqual(['KeyC']); // input not mutated
  });

  it('refuses reserved keys', () => {
    expect(rebind(DEFAULT_BINDINGS, 'jump', 'Digit3')).toBeNull();
    expect(rebind(DEFAULT_BINDINGS, 'jump', 'KeyM')).toBeNull();
  });

  it('labels keys readably', () => {
    expect(keyLabel('KeyW')).toBe('W');
    expect(keyLabel('ArrowUp')).toBe('↑');
    expect(keyLabel('Escape')).toBe('Esc');
  });
});
