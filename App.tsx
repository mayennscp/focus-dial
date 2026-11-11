import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { Button } from './src/components/Button';
import { Dial } from './src/components/Dial';
import { type Session, SessionList } from './src/components/SessionList';
import { useFocusTimer } from './src/hooks/useFocusTimer';
import { formatClock, minutesToProgress } from './src/lib/dial';
import * as haptics from './src/lib/haptics';
import { colors } from './src/theme';

function FocusScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const dialSize = Math.min(width - 48, 340);

  const progress = useSharedValue(minutesToProgress(25));
  const [sessions, setSessions] = useState<Session[]>([]);

  const handleComplete = useCallback((minutes: number) => {
    haptics.success();
    setSessions((prev) => [
      { id: `${Date.now()}`, minutes, finishedAt: Date.now() },
      ...prev,
    ]);
  }, []);

  const timer = useFocusTimer(progress, handleComplete);
  const { selectMinutes } = timer;

  const handleMinutesChange = useCallback(
    (value: number) => {
      haptics.tick();
      selectMinutes(value);
    },
    [selectMinutes]
  );

  // Gentle "breathing" of the clock while paused.
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (timer.status === 'paused') {
      pulse.set(withRepeat(withTiming(0.35, { duration: 700 }), -1, true));
    } else {
      cancelAnimation(pulse);
      pulse.set(withTiming(1, { duration: 150 }));
    }
  }, [timer.status, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const idle = timer.status === 'idle';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.appName}>Focus Dial</Text>
        <Text style={styles.hint}>
          {idle ? 'Drag the knob to set your focus time' : 'Stay with it.'}
        </Text>
      </View>

      <View style={styles.dialArea}>
        <Dial
          size={dialSize}
          progress={progress}
          enabled={idle}
          minutes={timer.minutes}
          onMinutesChange={handleMinutesChange}
        >
          {idle ? (
            <>
              <Text style={styles.bigNumber}>{timer.minutes}</Text>
              <Text style={styles.caption}>minutes</Text>
            </>
          ) : (
            <>
              <Animated.Text style={[styles.clock, pulseStyle]}>
                {formatClock(timer.remainingMs / 1000)}
              </Animated.Text>
              <Text style={styles.caption}>
                {timer.status === 'paused' ? 'paused' : 'focusing'}
              </Text>
            </>
          )}
        </Dial>
      </View>

      <Animated.View
        key={timer.status}
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(120)}
        style={styles.controls}
      >
        {idle ? (
          <Button
            label="Start"
            onPress={() => {
              haptics.tap();
              timer.start();
            }}
          />
        ) : (
          <>
            <Button label="Reset" variant="secondary" onPress={timer.reset} />
            {timer.status === 'running' ? (
              <Button label="Pause" onPress={timer.pause} />
            ) : (
              <Button label="Resume" onPress={timer.resume} />
            )}
          </>
        )}
      </Animated.View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <SessionList
          sessions={sessions}
          onRemove={(id) =>
            setSessions((prev) => prev.filter((s) => s.id !== id))
          }
        />
      </ScrollView>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <FocusScreen />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 24, gap: 4 },
  appName: { color: colors.text, fontSize: 28, fontWeight: '800' },
  hint: { color: colors.textDim, fontSize: 15 },
  dialArea: { alignItems: 'center', marginTop: 24 },
  bigNumber: {
    color: colors.text,
    fontSize: 72,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  clock: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  caption: {
    color: colors.textDim,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 24,
    minHeight: 54,
  },
  list: { flex: 1 },
});
