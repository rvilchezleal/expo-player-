import { StyleSheet } from 'react-native';

import { colors, radius, spacing, type } from '../theme';

export const liveBadgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.xs,
    gap: spacing.xs,
    backgroundColor: colors.live,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.onMedia,
  },
  text: {
    ...type.badge,
    includeFontPadding: false,
  },
});
