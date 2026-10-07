import { Text, View } from 'react-native';

import { colors } from '../theme';
import { statusPillStyles } from '../styles/statusPillStyles';

export default function StatusPill({ status, isPlaying }) {
  const getConfig = () => {
    switch (status) {
      case 'readyToPlay':
        return isPlaying
          ? { label: 'En vivo', color: colors.live }
          : { label: 'En pausa', color: colors.secondaryLabel };
      case 'loading':
        return { label: 'Conectando…', color: colors.warning };
      case 'error':
        return { label: 'Sin señal', color: colors.danger };
      default:
        return { label: 'Inactivo', color: colors.tertiaryLabel };
    }
  };

  const config = getConfig();

  return (
    <View style={statusPillStyles.container}>
      <View style={[statusPillStyles.dot, { backgroundColor: config.color }]} />
      <Text style={statusPillStyles.text}>{config.label}</Text>
    </View>
  );
}
