import { StyleSheet } from 'react-native';

import { colors, radius, sizes, spacing, type } from '../theme';
import { CENTER_PILL_INSET } from './overlayStyles';

export const playerStyles = StyleSheet.create({
  playerContainer: {
    width: '100%',
    backgroundColor: colors.black,
    position: 'relative',
  },
  playerContainerPortrait: {
    aspectRatio: 16 / (9 * 1.2),
    maxHeight: '40%',
  },
  playerContainerFullscreen: {
    flex: 1,
  },
  videoLayer: {
    width: '100%',
    height: '100%',
  },
  reconnectWrap: {
    position: 'absolute',
    top: spacing.sm + (sizes.controlButton - sizes.pill) / 2,
    left: CENTER_PILL_INSET,
    right: CENTER_PILL_INSET,
    alignItems: 'center',
  },
  reconnectPill: {
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
  reconnectText: {
    ...type.footnote,
  },
});
