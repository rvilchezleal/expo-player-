import { StyleSheet } from 'react-native';

import { colors, mediaTextShadow, radius, shadows, sizes, spacing, type } from '../theme';
import { CENTER_PILL_INSET } from './overlayStyles';


export const recordingIndicatorStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: CENTER_PILL_INSET,
    right: CENTER_PILL_INSET,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.pill,
    paddingHorizontal: spacing.ms,
    borderRadius: radius.full,
    borderWidth: sizes.hairline,
    borderColor: colors.mediaBorder,
    backgroundColor: colors.mediaControl,
  },
  label: {
    ...type.indicator,
    includeFontPadding: false,
  },
  time: {
    ...type.footnote,
    color: colors.onMedia,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  notice: {
    ...type.footnote,
    color: colors.onMedia,
    includeFontPadding: false,
  },
});

export const recordingsStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenFullscreen: {
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...type.title,
  },
  titleAccent: {
    width: 32,
    height: 3,
    borderRadius: radius.full,
  },
  summary: {
    ...type.subhead,
  },
  backButton: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
  },
  nowPlaying: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.ms,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  nowPlayingTitle: {
    ...type.headline,
  },
  nowPlayingMeta: {
    ...type.caption,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.ms,
    gap: spacing.ms,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  footer: {
    ...type.micro,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  emptyTitle: {
    ...type.headline,
    textAlign: 'center',
  },
  emptyText: {
    ...type.subhead,
    textAlign: 'center',
    lineHeight: 20,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const recordingCardStyles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cardPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  cardActive: {
    borderColor: colors.accentBorder,
  },
  media: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
  },
  mediaLayer: {
    ...StyleSheet.absoluteFill,
  },
  mediaTop: {
    position: 'absolute',
    top: spacing.ms,
    left: spacing.ms,
    right: spacing.ms,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qualityBadge: {
    minHeight: 24,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.xs,
    borderCurve: 'continuous',
  },
  qualityText: {
    ...type.badge,
    includeFontPadding: false,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 24,
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  statusLive: {
    backgroundColor: colors.live,
  },
  statusPlaying: {
    backgroundColor: colors.accent,
  },
  statusIncomplete: {
    backgroundColor: colors.warning,
  },
  statusText: {
    ...type.badge,
    includeFontPadding: false,
  },
  statusTextDark: {
    color: colors.onAccent,
  },
  mediaPlay: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: sizes.hairline,
    borderColor: colors.mediaBorder,
    backgroundColor: colors.mediaControl,
  },
  durationChip: {
    position: 'absolute',
    right: spacing.ms,
    bottom: spacing.ms,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.xs,
    backgroundColor: colors.mediaChip,
  },
  durationText: {
    ...type.badge,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  body: {
    gap: spacing.ms,
    paddingTop: spacing.ms,
    paddingBottom: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...type.headline,
  },
  subtitle: {
    ...type.caption,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
  },
  chipViolet: {
    backgroundColor: colors.brandVioletTint,
  },
  chipBlue: {
    backgroundColor: colors.brandBlueTint,
  },
  chipText: {
    ...type.caption,
    fontWeight: '600',
  },
  chipTextViolet: {
    color: colors.brandVioletLabel,
  },
  chipTextBlue: {
    color: colors.brandBlueLabel,
  },
  deleteButton: {
    alignSelf: 'flex-start',
  },
});

export const recordingPlayerStyles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.black,
  },
  containerInline: {
    aspectRatio: 16 / 9,
  },
  containerFullscreen: {
    flex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controls: {
    ...StyleSheet.absoluteFill,
  },
  scrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '46%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.ms,
    paddingTop: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomArea: {
    gap: spacing.xs,
    paddingHorizontal: spacing.ms,
    paddingBottom: spacing.sm,
  },
  bottomAreaFullscreen: {
    paddingBottom: spacing.ms,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    flexShrink: 1,
  },
  time: {
    ...type.footnote,
    ...mediaTextShadow,
    color: colors.onMedia,
    fontVariant: ['tabular-nums'],
  },
  timeTotal: {
    color: colors.secondaryLabel,
  },
  scrubber: {
    height: sizes.touchTarget - spacing.lg,
    marginHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  track: {
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.sliderTrack,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  thumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: radius.full,
    marginLeft: -6,
    backgroundColor: colors.onMedia,
    boxShadow: shadows.thumb,
  },
  thumbActive: {
    width: 16,
    height: 16,
    marginLeft: -8,
  },
  message: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  messageText: {
    ...type.footnote,
    color: colors.onMedia,
    textAlign: 'center',
  },
});
