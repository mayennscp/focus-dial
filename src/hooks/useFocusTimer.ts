import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelAnimation,
  Easing,
  type SharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { minutesToProgress } from '../lib/dial';

export type TimerStatus = 'idle' | 'running' | 'paused';

const TICK_MS = 200;
const SNAP_SPRING = { damping: 18, stiffness: 160 } as const;

/**
 * Timer state machine. The countdown arc is a single `withTiming` animation
 * running on the UI thread, so it stays smooth even if the JS thread is busy.
 * JS only keeps the wall-clock deadline and refreshes the digits a few times
 * per second.
 */
export function useFocusTimer(
  progress: SharedValue<number>,
  onComplete: (minutes: number) => void
) {
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [minutes, setMinutes] = useState(25);
  const [remainingMs, setRemainingMs] = useState(25 * 60_000);

  const endAt = useRef(0);
  const remaining = useRef(0);
  const plannedMinutes = useRef(minutes);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const animateTo = useCallback(
    (durationMs: number) => {
      progress.set(
        withTiming(0, {
          duration: durationMs,
          easing: Easing.linear,
        })
      );
    },
    [progress]
  );

  const backToIdle = useCallback(
    (selected: number) => {
      cancelAnimation(progress);
      progress.set(withSpring(minutesToProgress(selected), SNAP_SPRING));
      setRemainingMs(selected * 60_000);
      setStatus('idle');
    },
    [progress]
  );

  const start = useCallback(() => {
    const total = minutes * 60_000;
    plannedMinutes.current = minutes;
    endAt.current = Date.now() + total;
    setRemainingMs(total);
    setStatus('running');
    animateTo(total);
  }, [minutes, animateTo]);

  const pause = useCallback(() => {
    cancelAnimation(progress);
    remaining.current = Math.max(0, endAt.current - Date.now());
    setRemainingMs(remaining.current);
    setStatus('paused');
  }, [progress]);

  const resume = useCallback(() => {
    endAt.current = Date.now() + remaining.current;
    setStatus('running');
    animateTo(remaining.current);
  }, [animateTo]);

  const reset = useCallback(() => backToIdle(minutes), [backToIdle, minutes]);

  // Keep the digits in sync with the dial while the user is choosing a time.
  const selectMinutes = useCallback((value: number) => {
    setMinutes(value);
    setRemainingMs(value * 60_000);
  }, []);

  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => {
      const left = endAt.current - Date.now();
      if (left <= 0) {
        clearInterval(id);
        onCompleteRef.current(plannedMinutes.current);
        backToIdle(plannedMinutes.current);
        return;
      }
      setRemainingMs(left);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [status, backToIdle]);

  return {
    status,
    minutes,
    remainingMs,
    selectMinutes,
    start,
    pause,
    resume,
    reset,
  };
}
