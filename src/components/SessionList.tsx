import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  FadeInDown,
  FadeOutLeft,
  interpolate,
  LinearTransition,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { colors } from '../theme';

export type Session = {
  id: string;
  minutes: number;
  finishedAt: number;
};

type Props = {
  sessions: Session[];
  onRemove: (id: string) => void;
};

const ACTION_WIDTH = 88;

function DeleteAction({
  progress,
  onPress,
}: {
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.6, 1], 'clamp') },
    ],
  }));

  return (
    <Animated.View style={[styles.action, style]}>
      <Pressable
        onPress={onPress}
        style={styles.actionButton}
        accessibilityRole="button"
        accessibilityLabel="Delete session"
      >
        <Text style={styles.actionText}>Delete</Text>
      </Pressable>
    </Animated.View>
  );
}

function formatTime(timestamp: number) {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function SessionList({ sessions, onRemove }: Props) {
  const total = sessions.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.total}>
          {total} min · {sessions.length}{' '}
          {sessions.length === 1 ? 'session' : 'sessions'}
        </Text>
      </View>

      {sessions.length === 0 ? (
        <Animated.Text entering={FadeInDown} style={styles.empty}>
          Finished sessions land here. Swipe one left to delete it.
        </Animated.Text>
      ) : null}

      {sessions.map((session) => (
        <Animated.View
          key={session.id}
          entering={FadeInDown.springify().damping(16)}
          exiting={FadeOutLeft}
          layout={LinearTransition.springify().damping(18)}
          style={styles.rowWrapper}
        >
          <ReanimatedSwipeable
            friction={2}
            rightThreshold={ACTION_WIDTH / 2}
            overshootRight={false}
            renderRightActions={(progress) => (
              <DeleteAction
                progress={progress}
                onPress={() => onRemove(session.id)}
              />
            )}
          >
            <View style={styles.row}>
              <View style={styles.dot} />
              <Text style={styles.rowMinutes}>{session.minutes} min focus</Text>
              <Text style={styles.rowTime}>
                {formatTime(session.finishedAt)}
              </Text>
            </View>
          </ReanimatedSwipeable>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  total: { color: colors.textDim, fontSize: 14, fontVariant: ['tabular-nums'] },
  empty: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  rowWrapper: { borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentB,
  },
  rowMinutes: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  rowTime: {
    color: colors.textDim,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  action: { width: ACTION_WIDTH, backgroundColor: colors.danger },
  actionButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#fff', fontWeight: '700' },
});
