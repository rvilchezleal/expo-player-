import { StyleSheet } from 'react-native';

import { colors, radius, sizes, spacing, type } from '../theme';

export const screenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeAreaFullscreen: {
    paddingTop: 0,
    backgroundColor: colors.black,
  },
  hidden: {
    display: 'none',
  },
  mainContainer: {
    flex: 1,
  },
  shutdownOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 100,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  shutdownTitle: {
    ...type.headline,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  shutdownText: {
    ...type.subhead,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  titleContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...type.title,
  },
  subtitle: {
    ...type.subhead,
  },
  libraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    minHeight: sizes.touchTarget + spacing.md,
    paddingVertical: spacing.ms,
    paddingLeft: spacing.ms,
    paddingRight: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  libraryButtonPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  libraryIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  libraryText: {
    flex: 1,
    gap: spacing.xs,
  },
  libraryTitle: {
    ...type.bodyStrong,
  },
  librarySubtitle: {
    ...type.caption,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.ms,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  errorContent: {
    flex: 1,
    gap: spacing.xs,
  },
  errorTitle: {
    ...type.footnote,
    fontWeight: '600',
  },
  errorText: {
    ...type.caption,
    lineHeight: 18,
  },
  debugWrapper: {
    marginTop: 'auto',
    marginBottom: spacing.md,
  },
});
