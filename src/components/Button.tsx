import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SPRING = { damping: 15, stiffness: 400 } as const;

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

export function Button({ label, onPress, variant = 'primary' }: Props) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.set(withSpring(0.94, PRESS_SPRING));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, PRESS_SPRING));
      }}
      accessibilityRole="button"
      style={[
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel,
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 128,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
  },
  primary: { backgroundColor: colors.accentA },
  secondary: { backgroundColor: colors.surfaceHigh },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  primaryLabel: { color: '#fff' },
  secondaryLabel: { color: colors.text },
});
