/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clampWrap,
  formatClock,
  pointToProgress,
  progressToMinutes,
  progressToPoint,
} from './dial.ts';

const C = 100; // dial center

describe('pointToProgress', () => {
  it('starts at 12 o’clock and grows clockwise', () => {
    assert.equal(pointToProgress(C, 0, C), 0);
    assert.equal(pointToProgress(2 * C, C, C), 0.25);
    assert.equal(pointToProgress(C, 2 * C, C), 0.5);
    assert.equal(pointToProgress(0, C, C), 0.75);
  });
});

describe('clampWrap', () => {
  it('does not wrap from full to empty when crossing the top', () => {
    assert.equal(clampWrap(0.98, 0.02), 1);
  });

  it('does not wrap from empty to full when crossing the top backwards', () => {
    assert.equal(clampWrap(0.02, 0.98), 1 / 60);
  });

  it('passes normal movement through', () => {
    assert.equal(clampWrap(0.4, 0.45), 0.45);
  });
});

describe('progressToMinutes', () => {
  it('snaps to whole minutes within 1–60', () => {
    assert.equal(progressToMinutes(0), 1);
    assert.equal(progressToMinutes(25 / 60 + 0.004), 25);
    assert.equal(progressToMinutes(1), 60);
  });
});

describe('progressToPoint', () => {
  it('is the inverse of pointToProgress', () => {
    for (const p of [0.1, 0.33, 0.5, 0.8]) {
      const { x, y } = progressToPoint(p, C, 80);
      assert.ok(Math.abs(pointToProgress(x, y, C) - p) < 1e-9);
    }
  });
});

describe('formatClock', () => {
  it('formats seconds as mm:ss and rounds up', () => {
    assert.equal(formatClock(25 * 60), '25:00');
    assert.equal(formatClock(59.2), '01:00');
    assert.equal(formatClock(-3), '00:00');
  });
});
