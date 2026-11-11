/**
 * Pure geometry helpers for the dial. Every function is a worklet, so it can
 * run on the UI thread inside gesture callbacks and animated props — and also
 * on the JS thread (e.g. in tests), because a worklet is still a plain function.
 */

export const MAX_MINUTES = 60;
export const MIN_MINUTES = 1;

const TWO_PI = Math.PI * 2;

/**
 * Converts a touch point to dial progress in the range [0, 1).
 * 0 is at 12 o'clock and the value grows clockwise.
 */
export function pointToProgress(x: number, y: number, center: number): number {
  'worklet';
  const angle = Math.atan2(x - center, center - y); // (-π, π], 0 at the top
  const normalized = angle < 0 ? angle + TWO_PI : angle;
  return normalized / TWO_PI;
}

/**
 * Stops the knob from jumping across 12 o'clock. Dragging past the top
 * clamps to full (60 min) or empty instead of wrapping around.
 */
export function clampWrap(previous: number, next: number): number {
  'worklet';
  if (previous > 0.75 && next < 0.25) return 1;
  if (previous < 0.25 && next > 0.75) return MIN_MINUTES / MAX_MINUTES;
  return Math.max(MIN_MINUTES / MAX_MINUTES, next);
}

export function progressToMinutes(progress: number): number {
  'worklet';
  return Math.min(
    MAX_MINUTES,
    Math.max(MIN_MINUTES, Math.round(progress * MAX_MINUTES))
  );
}

export function minutesToProgress(minutes: number): number {
  'worklet';
  return minutes / MAX_MINUTES;
}

/** Position of the knob on the ring for a given progress. */
export function progressToPoint(
  progress: number,
  center: number,
  radius: number
): { x: number; y: number } {
  'worklet';
  const angle = progress * TWO_PI;
  return {
    x: center + radius * Math.sin(angle),
    y: center - radius * Math.cos(angle),
  };
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
