import { StyleSheet } from 'react-native';

import { colors, mediaTextShadow, radius, shadows, sizes, spacing } from '../theme';

export const CENTER_PILL_INSET = sizes.controlButton * 2 + spacing.sm + spacing.ms + spacing.sm;

export const overlayStyles = StyleSheet.create({
  controls: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'column',
  },
  scrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '48%',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.ms,
    paddingTop: spacing.sm,
  },
  topBarFullscreen: {
    paddingTop: spacing.ms,
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  centerZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.ms,
    paddingBottom: spacing.sm,
  },
  bottomBarFullscreen: {
    paddingBottom: spacing.ms,
  },
  liveGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  liveBadgeSlot: {
    justifyContent: 'center',
  },
  iconButton: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaControl: {
    width: sizes.controlButton,
    height: sizes.controlButton,
    borderRadius: radius.full,
    borderWidth: sizes.hairline,
    borderColor: colors.mediaBorder,
    backgroundColor: colors.mediaControl,
  },
  iconButtonPressed: {
    opacity: 0.55,
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
  playButton: {
    width: sizes.playButton,
    height: sizes.playButton,
    borderRadius: radius.full,
    borderWidth: sizes.hairline,
    borderColor: colors.mediaBorder,
    backgroundColor: colors.mediaControl,
  },
  iconShadow: {
    ...mediaTextShadow,
  },

  volumeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    height: sizes.controlButton,
    borderRadius: radius.full,
    borderWidth: sizes.hairline,
    borderColor: colors.mediaBorder,
    backgroundColor: colors.mediaControl,
  },
  volumeButton: {
    width: sizes.controlButton - sizes.hairline * 2,
    height: sizes.controlButton - sizes.hairline * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeSliderWrapper: {
    overflow: 'hidden',
  },
  volumeSlider: {
    height: sizes.controlButton - sizes.hairline * 2,
    marginLeft: spacing.xs,
    justifyContent: 'center',
  },
  volumeTrack: {
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.sliderTrack,
  },
  volumeFill: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  volumeThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: radius.full,
    marginLeft: -6,
    backgroundColor: colors.onMedia,
    boxShadow: shadows.thumb,
  },
  volumeThumbActive: {
    width: 16,
    height: 16,
    marginLeft: -8,
  },
});
