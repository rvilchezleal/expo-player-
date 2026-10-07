import { StyleSheet } from 'react-native';

import { colors, radius, sizes, spacing, type } from '../theme';

export const debugStyles = StyleSheet.create({
  container: {
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: sizes.touchTarget,
    paddingHorizontal: spacing.md,
  },
  headerPressed: {
    backgroundColor: colors.pressed,
  },
  headerText: {
    ...type.footnote,
    color: colors.secondaryLabel,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  row: {
    ...type.caption,
  },
  value: {
    ...type.mono,
  },
  errorBox: {
    backgroundColor: colors.dangerTint,
    borderRadius: radius.sm,
    padding: spacing.ms,
    marginTop: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.danger,
  },
  errorText: {
    ...type.mono,
    fontSize: type.micro.fontSize,
    color: colors.danger,
  },
  hint: {
    ...type.micro,
    marginTop: spacing.xs,
  },
});
