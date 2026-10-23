/**
 * Wrap a scene 'keydown' handler so each key event reaches it once.
 *
 * Phaser re-dispatches its whole key queue on every DOM key event and clears the queue only once per
 * frame; its duplicate check compares against the previous event alone. Several key events inside one
 * frame (fast taps, slow devices) therefore replay earlier presses: a double-tapped pause key toggled
 * pause five times. Handlers remember the events they have already handled instead.
 */
export function freshKeys(handler: (e: KeyboardEvent) => void): (e: KeyboardEvent) => void {
  const seen = new WeakSet<KeyboardEvent>();
  return (e) => {
    if (seen.has(e)) return;
    seen.add(e);
    handler(e);
  };
}
