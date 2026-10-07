import { useEffect } from 'react';
import { Animated, Text, View, useAnimatedValue } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import RecordingDot from './RecordingDot';
import { colors, motion, sizes, spacing } from '../theme';
import { recordingIndicatorStyles as styles } from '../styles/recordingsStyles';
import { formatClock } from '../utils/format';

export default function RecordingIndicator({ recording, isFullscreen }) {
  const { isRecording, status, seconds, limitSeconds, showSaved, lastResult } = recording;
  const showNotice = !isRecording && showSaved && !!lastResult;
  const visible = isRecording || showNotice;
  const opacity = useAnimatedValue(0);

  useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: motion.base, useNativeDriver: true }).start();
  }, [visible, opacity]);

  if (!visible) return null;

  const isComplete = lastResult?.status === 'complete';
  const top = (isFullscreen ? spacing.ms : spacing.sm) + (sizes.controlButton - sizes.pill) / 2;

  return (
    <Animated.View style={[styles.wrap, { top, opacity }]} pointerEvents="none">
      {isRecording ? (
        <View
          style={styles.pill}
          accessibilityRole="text"
          accessibilityLabel={`Grabando, ${formatClock(seconds)} de ${formatClock(limitSeconds)}`}
        >
          <RecordingDot />
          <Text style={styles.label}>REC</Text>
          <Text style={styles.time}>{status === 'starting' ? '–:––' : formatClock(seconds)}</Text>
        </View>
      ) : (
        <View
          style={styles.pill}
          accessibilityRole="text"
          accessibilityLabel={isComplete ? 'Grabación guardada' : 'Grabación incompleta guardada'}
        >
          <MaterialCommunityIcons
            name={isComplete ? 'check-circle' : 'alert-circle-outline'}
            size={sizes.iconSmall - 2}
            color={isComplete ? colors.success : colors.warning}
          />
          <Text style={styles.notice}>{isComplete ? 'Guardada' : 'Incompleta'}</Text>
        </View>
      )}
    </Animated.View>
  );
}
