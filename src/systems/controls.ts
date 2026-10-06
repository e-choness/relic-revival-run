// Remappable keyboard bindings (accessibility). Number keys select tools and M mutes; those stay fixed.

export type Action = 'jump' | 'prevTool' | 'nextTool' | 'uv' | 'camera' | 'pause';
export type Bindings = Record<Action, string[]>;

export const ACTIONS: { id: Action; label: string }[] = [
  { id: 'jump', label: 'Jump' },
  { id: 'prevTool', label: 'Previous tool' },
  { id: 'nextTool', label: 'Next tool' },
  { id: 'uv', label: 'UV lamp' },
  { id: 'camera', label: 'Camera' },
  { id: 'pause', label: 'Pause' },
];

export const DEFAULT_BINDINGS: Bindings = {
  jump: ['Space', 'ArrowUp', 'KeyW'],
  prevTool: ['KeyQ'],
  nextTool: ['KeyE'],
  uv: ['KeyU'],
  camera: ['KeyC'],
  pause: ['Escape', 'KeyP'],
};

/** Codes that cannot be rebound: tool number keys and mute. */
export const isReserved = (code: string) => /^Digit[1-9]$/.test(code) || code === 'KeyM';

const KEY = 'relic-revival-run:bindings:v1';

export function loadBindings(): Bindings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Bindings> | null;
    if (saved) return { ...DEFAULT_BINDINGS, ...saved };
  } catch {
    /* ignore */
  }
  return structuredClone(DEFAULT_BINDINGS);
}

export function saveBindings(b: Bindings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* ignore */
  }
}

export function actionFor(b: Bindings, code: string): Action | undefined {
  return ACTIONS.find((a) => b[a.id].includes(code))?.id;
}

/** Make `code` the only key for `action`, taking it away from any other action. Reserved codes are refused. */
export function rebind(b: Bindings, action: Action, code: string): Bindings | null {
  if (isReserved(code)) return null;
  const next = Object.fromEntries(ACTIONS.map((a) => [a.id, b[a.id].filter((c) => c !== code)])) as Bindings;
  next[action] = [code];
  return next;
}

const NAMES: Record<string, string> = { Space: 'Space', Escape: 'Esc', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter', ShiftLeft: 'Shift', ShiftRight: 'Shift', Tab: 'Tab' };

export function keyLabel(code: string): string {
  return NAMES[code] ?? code.replace(/^Key|^Digit|^Numpad/, '');
}

export function keysLabel(b: Bindings, action: Action): string {
  return b[action].map(keyLabel).join(' / ') || '—';
}
