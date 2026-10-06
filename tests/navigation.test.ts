import { describe, expect, it } from 'vitest';
import { nearest } from '../src/systems/navigation';

// A 2×2 grid plus a lone item below-left (like world-map cards and a Back button).
const items = [
  { x: 100, y: 100 },
  { x: 300, y: 100 },
  { x: 100, y: 300 },
  { x: 300, y: 300 },
  { x: 60, y: 500 },
];

describe('menu navigation', () => {
  it('moves to the neighbour in each direction', () => {
    expect(nearest(items, 0, 'right')).toBe(1);
    expect(nearest(items, 0, 'down')).toBe(2);
    expect(nearest(items, 3, 'left')).toBe(2);
    expect(nearest(items, 3, 'up')).toBe(1);
  });

  it('prefers straight ahead over diagonal', () => {
    expect(nearest(items, 2, 'down')).toBe(4);
    expect(nearest(items, 1, 'down')).toBe(3);
  });

  it('stays put at an edge', () => {
    expect(nearest(items, 1, 'right')).toBe(1);
    expect(nearest(items, 0, 'up')).toBe(0);
  });
});
