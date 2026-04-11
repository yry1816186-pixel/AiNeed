import * as Haptics from 'react-native-haptic-feedback';

export type ImpactFeedbackStyle = 'light' | 'medium' | 'heavy';
export type NotificationFeedbackType = 'success' | 'warning' | 'error';

export const ImpactFeedbackStyle = {
  Light: 'light' as const,
  Medium: 'medium' as const,
  Heavy: 'heavy' as const,
};

export const NotificationFeedbackType = {
  Success: 'success' as const,
  Warning: 'warning' as const,
  Error: 'error' as const,
};

export const impactAsync = (style: ImpactFeedbackStyle = 'medium') => {
  const hapticStyle = style === 'light' ? 'impactLight' : style === 'heavy' ? 'impactHeavy' : 'impactMedium';
  Haptics.trigger(hapticStyle);
};

export const notificationAsync = (type: NotificationFeedbackType = 'success') => {
  const hapticType = type === 'success' ? 'notificationSuccess' : type === 'warning' ? 'notificationWarning' : 'notificationError';
  Haptics.trigger(hapticType);
};

export const selectionAsync = () => {
  Haptics.trigger('selection');
};

export default { impactAsync, notificationAsync, selectionAsync, ImpactFeedbackStyle, NotificationFeedbackType };
