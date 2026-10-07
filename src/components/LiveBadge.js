import { useEffect } from 'react';
import { Animated, Text, View, useAnimatedValue } from 'react-native';

import { liveBadgeStyles } from '../styles/liveBadgeStyles';

export default function LiveBadge({ isLive }) {
  const pulseAnim = useAnimatedValue(1);

  useEffect(() => {
    if (!isLive) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isLive, pulseAnim]);

  if (!isLive) return null;

  return (
    <View style={liveBadgeStyles.container}>
      <Animated.View style={[liveBadgeStyles.dot, { opacity: pulseAnim }]} />
      <Text style={liveBadgeStyles.text}>EN VIVO</Text>
    </View>
  );
}
