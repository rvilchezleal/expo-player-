import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { STREAM_URL } from '../config/stream';
import { colors, sizes } from '../theme';
import { debugStyles } from '../styles/debugStyles';

export default function DebugPanel({ status, errorMessage, isPlaying }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={debugStyles.container}>
      <Pressable
        style={({ pressed }) => [debugStyles.header, pressed && debugStyles.headerPressed]}
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={debugStyles.headerText}>Diagnóstico</Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={sizes.iconSmall + 2}
          color={colors.tertiaryLabel}
        />
      </Pressable>

      {expanded && (
        <View style={debugStyles.content}>
          <Text style={debugStyles.row}>
            Estado: <Text style={debugStyles.value}>{status}</Text>
          </Text>
          <Text style={debugStyles.row}>
            Reproduciendo: <Text style={debugStyles.value}>{isPlaying ? 'Sí' : 'No'}</Text>
          </Text>
          <Text style={debugStyles.row} numberOfLines={2}>
            URL: <Text style={debugStyles.value}>{STREAM_URL}</Text>
          </Text>
          {errorMessage && (
            <View style={debugStyles.errorBox}>
              <Text style={debugStyles.errorText}>{errorMessage}</Text>
            </View>
          )}
          <Text style={debugStyles.hint}>
            Registro completo en la consola con el prefijo [EXPO-VIDEO]
          </Text>
        </View>
      )}
    </View>
  );
}
