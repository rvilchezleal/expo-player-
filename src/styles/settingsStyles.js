import { StyleSheet } from 'react-native';

import { colors, radius, shadows, sizes, spacing, type } from '../theme';

export const settingsStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
  },
  backdropPortrait: {
    justifyContent: 'flex-end',
  },
  backdropLandscape: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: sizes.hairline,
    borderBottomWidth: 0,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    boxShadow: shadows.overlay,
  },
  panel: {
    backgroundColor: colors.sheet,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    boxShadow: shadows.overlay,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.handle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: sizes.touchTarget + spacing.xs,
  },
  headerTitle: {
    ...type.headline,
  },
  headerButton: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.ms,
  },
  headerButtonPressed: {
    opacity: 0.55,
  },
  sectionTitle: {
    ...type.sectionLabel,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  group: {
    backgroundColor: colors.surface,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: sizes.touchTarget + spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowPressed: {
    backgroundColor: colors.pressed,
  },
  rowSelected: {
    backgroundColor: colors.selected,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  rowIcon: {
    width: 32,
    height: 32,
    marginRight: spacing.ms,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconBlue: {
    backgroundColor: colors.brandBlue,
  },
  rowIconTurquoise: {
    backgroundColor: colors.brandTurquoise,
  },
  rowText: {
    flex: 1,
    marginRight: spacing.ms,
  },
  rowLabel: {
    ...type.body,
  },
  rowLabelSelected: {
    fontWeight: '600',
    color: colors.accent,
  },
  rowRecording: {
    backgroundColor: colors.liveTint,
  },
  rowLabelLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowLabelLive: {
    color: colors.liveLabel,
    fontWeight: '600',
  },
  rowSubLabel: {
    ...type.caption,
    marginTop: spacing.xs,
  },
  rowHint: {
    ...type.caption,
    color: colors.tertiaryLabel,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
    backgroundColor: colors.separator,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: sizes.touchTarget,
    marginLeft: -spacing.xs,
  },
  backButtonText: {
    ...type.headline,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.tertiaryLabel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
});
