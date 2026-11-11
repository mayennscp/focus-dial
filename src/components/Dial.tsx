import { type ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedProps,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import {
  clampWrap,
  MAX_MINUTES,
  minutesToProgress,
  pointToProgress,
  progressToMinutes,
  progressToPoint,
} from '../lib/dial';
import { colors } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STROKE = 14;
const KNOB = 15;
const SNAP_SPRING = { damping: 18, stiffness: 220 } as const;

type Props = {
  size: number;
  /** Shared dial value in [0, 1] — owned by the parent so the timer can animate it too. */
  progress: SharedValue<number>;
  /** Dragging is only allowed while the timer is idle. */
  enabled: boolean;
  /** Currently selected minutes, used to seed the haptic tick tracking. */
  minutes: number;
  onMinutesChange: (minutes: number) => void;
  children?: ReactNode;
};

export function Dial({
  size,
  progress,
  enabled,
  minutes,
  onMinutesChange,
  children,
}: Props) {
  const center = size / 2;
  const radius = center - KNOB - 4;
  const circumference = 2 * Math.PI * radius;

  const isDragging = useSharedValue(false);
  const lastMinute = useSharedValue(minutes);

  // Everything below runs on the UI thread — the JS thread is only notified
  // when the selected minute actually changes (for haptics and the label).
  const updateFromPoint = (x: number, y: number) => {
    'worklet';
    const next = clampWrap(progress.get(), pointToProgress(x, y, center));
    progress.set(next);
    const minute = progressToMinutes(next);
    if (minute !== lastMinute.get()) {
      lastMinute.set(minute);
      scheduleOnRN(onMinutesChange, minute);
    }
  };

  const pan = usePanGesture({
    enabled,
    minDistance: 0,
    onBegin: (e) => {
      'worklet';
      isDragging.set(true);
      updateFromPoint(e.x, e.y);
    },
    onUpdate: (e) => {
      'worklet';
      updateFromPoint(e.x, e.y);
    },
    onFinalize: () => {
      'worklet';
      isDragging.set(false);
      // Settle on a whole minute with a spring instead of a hard jump.
      progress.set(
        withSpring(
          minutesToProgress(progressToMinutes(progress.get())),
          SNAP_SPRING
        )
      );
    },
  });

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const knobProps = useAnimatedProps(() => {
    const p = progressToPoint(progress.value, center, radius);
    return {
      cx: p.x,
      cy: p.y,
      r: withSpring(isDragging.value ? KNOB * 1.25 : KNOB, SNAP_SPRING),
    };
  });

  const ticks = useMemo(
    () =>
      Array.from({ length: MAX_MINUTES }, (_, i) => {
        const major = i % 5 === 0;
        const outer = progressToPoint(i / MAX_MINUTES, center, radius - STROKE);
        const inner = progressToPoint(
          i / MAX_MINUTES,
          center,
          radius - STROKE - (major ? 12 : 6)
        );
        return (
          <Line
            key={i}
            x1={outer.x}
            y1={outer.y}
            x2={inner.x}
            y2={inner.y}
            stroke={major ? colors.textDim : colors.track}
            strokeWidth={major ? 2 : 1}
            strokeLinecap="round"
          />
        );
      }),
    [center, radius]
  );

  return (
    <GestureDetector gesture={pan}>
      <View
        style={{ width: size, height: size }}
        accessibilityRole="adjustable"
        accessibilityLabel="Focus duration dial"
      >
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.accentA} />
              <Stop offset="1" stopColor={colors.accentB} />
            </LinearGradient>
          </Defs>
          {ticks}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.track}
            strokeWidth={STROKE}
            fill="none"
          />
          <G transform={`rotate(-90 ${center} ${center})`}>
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#arc)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              fill="none"
              animatedProps={arcProps}
            />
          </G>
          <AnimatedCircle
            fill={colors.knob}
            stroke={colors.accentB}
            strokeWidth={3}
            animatedProps={knobProps}
          />
        </Svg>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.center}>{children}</View>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
