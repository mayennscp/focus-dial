import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Light tick for every minute crossed on the dial. */
export function tick() {
  if (supported) Haptics.selectionAsync().catch(() => {});
}

export function tap() {
  if (supported) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

export function success() {
  if (supported) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
  }
}
