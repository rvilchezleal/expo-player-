import { useEffect } from 'react';
import { Animated, useAnimatedValue } from 'react-native';

import { colors, radius } from '../theme';

export default function RecordingDot({ size = 8, color = colors.live }) {
  const pulse = useAnimatedValue(1);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: color,
        opacity: pulse,
        transform: [{ scale: pulse.interpolate({ inputRange: [0.25, 1], outputRange: [0.8, 1] }) }],
      }}
    />
  );
}
