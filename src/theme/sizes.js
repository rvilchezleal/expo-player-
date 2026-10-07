import { Platform } from 'react-native';

export const sizes = {
  touchTarget: Platform.select({ android: 48, default: 44 }),
  controlButton: 40,
  hitSlop: 8,
  hairline: 1,
  pill: 28,
  icon: 24,
  iconSmall: 18,
  playIcon: 40,
  playButton: 64,
};
