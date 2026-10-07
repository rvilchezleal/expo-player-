import { StyleSheet } from 'react-native';

import { colors, radius, sizes, spacing, type } from '../theme';

export const statusPillStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 32,
    paddingHorizontal: spacing.ms,
    borderRadius: radius.full,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  text: {
    ...type.footnote,
  },
});
