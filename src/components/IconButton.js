import { Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, sizes } from '../theme';
import { overlayStyles } from '../styles/overlayStyles';

const variants = {
  media: { color: colors.onMedia, containerStyle: overlayStyles.mediaControl },
  plain: { color: colors.label, containerStyle: null },
};

export default function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'media',
  iconSize = sizes.icon,
  disabled = false,
  style,
}) {
  const { color, containerStyle } = variants[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={sizes.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        overlayStyles.iconButton,
        containerStyle,
        pressed && overlayStyles.iconButtonPressed,
        disabled && overlayStyles.iconButtonDisabled,
        style,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={iconSize} color={color} />
    </Pressable>
  );
}
