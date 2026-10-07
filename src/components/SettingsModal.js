import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
  useAnimatedValue,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import IconButton from './IconButton';
import RecordingDot from './RecordingDot';
import { colors, motion, sizes, spacing } from '../theme';
import { settingsStyles } from '../styles/settingsStyles';
import { formatClock } from '../utils/format';

const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 1;
const SHEET_ENTER_OFFSET = 48;
const SHEET_EXIT_OFFSET = 480;

export default function SettingsModal({
  visible,
  onClose,
  languageOptions,
  onSelectLanguage,
  subtitles,
  onToggleSubtitles,
  qualityOptions,
  currentHeight,
  selectedQuality,
  onSelectQuality,
  recording,
  canRecord,
  onToggleRecording,
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;
  const panelWidth = Math.min(isLandscape ? 340 : 380, width - 32 - insets.left - insets.right);
  const backdropInsets = {
    paddingTop: insets.top + 16,
    paddingBottom: insets.bottom + 16,
    paddingLeft: Math.max(insets.left, 16),
    paddingRight: Math.max(insets.right, 16) + (isLandscape ? 24 : 0),
  };
  const [menuView, setMenuView] = useState('main');
  const [wasVisible, setWasVisible] = useState(visible);

  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setMenuView('main');
  }

  const handleClose = () => onClose();

  const activeQualityLabel = selectedQuality === 'auto'
    ? `Automática${currentHeight ? ` · ${currentHeight}p` : ''}`
    : `${selectedQuality}p`;

  const recordEnabled = canRecord || recording.isRecording;
  const recordHint = `Hasta ${Math.round(recording.limitSeconds / 60)} min en 1080p, sin recodificar`;

  const sheetOffset = useAnimatedValue(0);
  const latestClose = useRef(handleClose);

  useEffect(() => {
    latestClose.current = handleClose;
  });

  useEffect(() => {
    if (!visible) return;
    sheetOffset.setValue(isLandscape ? 0 : SHEET_ENTER_OFFSET);
    Animated.timing(sheetOffset, { toValue: 0, duration: motion.base, useNativeDriver: true }).start();
  }, [visible, isLandscape, sheetOffset]);

  // eslint-disable-next-line react-hooks/refs -- PanResponder solo lee refs dentro de sus manejadores de gestos.
  const [dragResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => sheetOffset.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
          Animated.timing(sheetOffset, { toValue: SHEET_EXIT_OFFSET, duration: motion.fast, useNativeDriver: true })
            .start(() => latestClose.current());
          return;
        }
        Animated.spring(sheetOffset, { toValue: 0, bounciness: 4, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(sheetOffset, { toValue: 0, bounciness: 4, useNativeDriver: true }).start();
      },
    })
  );

  const isSheet = !isLandscape;
  const dragHandlers = isSheet ? dragResponder.panHandlers : {};

  const containerStyle = isSheet
    ? [
        settingsStyles.sheet,
        {
          maxHeight: height * 0.8,
          paddingBottom: insets.bottom + spacing.md,
          transform: [{ translateY: sheetOffset }],
        },
      ]
    : [settingsStyles.panel, { width: panelWidth, maxHeight: height - insets.top - insets.bottom - 32 }];

  const rowStyle = (pressed, extra) => [settingsStyles.row, extra, pressed && settingsStyles.rowPressed];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={['portrait', 'landscape']}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Pressable
        style={[
          settingsStyles.backdrop,
          isLandscape ? [settingsStyles.backdropLandscape, backdropInsets] : settingsStyles.backdropPortrait,
        ]}
        onPress={handleClose}
        accessibilityLabel="Cerrar configuración"
      >
        <Animated.View style={containerStyle} onStartShouldSetResponder={() => true} accessibilityViewIsModal>
          {isSheet && (
            <View style={settingsStyles.handleArea} {...dragHandlers}>
              <View style={settingsStyles.handle} />
            </View>
          )}

          {menuView === 'main' && (
            <>
              <View style={settingsStyles.header} {...dragHandlers}>
                <Text style={settingsStyles.headerTitle} accessibilityRole="header">Configuración</Text>
                <IconButton
                  icon="close"
                  variant="plain"
                  onPress={handleClose}
                  accessibilityLabel="Cerrar"
                  style={settingsStyles.headerButton}
                />
              </View>

              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                <Text style={settingsStyles.sectionTitle}>Calidad</Text>
                <View style={settingsStyles.group}>
                  <Pressable
                    style={({ pressed }) => rowStyle(pressed)}
                    onPress={() => setMenuView('quality')}
                    accessibilityRole="button"
                    accessibilityHint="Abre las opciones de calidad"
                  >
                    <View style={[settingsStyles.rowIcon, settingsStyles.rowIconBlue]}>
                      <MaterialCommunityIcons name="high-definition" size={sizes.iconSmall} color={colors.onMedia} />
                    </View>
                    <View style={settingsStyles.rowText}>
                      <Text style={settingsStyles.rowLabel}>Calidad de video</Text>
                      <Text style={settingsStyles.rowSubLabel}>{activeQualityLabel}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={sizes.icon} color={colors.tertiaryLabel} />
                  </Pressable>
                </View>

                <Text style={settingsStyles.sectionTitle}>Audio</Text>
                <View style={settingsStyles.group}>
                  {languageOptions.map((option, index) => (
                    <View key={option.code}>
                      {index > 0 && <View style={settingsStyles.divider} />}
                      <Pressable
                        style={({ pressed }) =>
                          rowStyle(pressed, [
                            option.active && settingsStyles.rowSelected,
                            !option.available && settingsStyles.rowDisabled,
                          ])
                        }
                        onPress={() => onSelectLanguage(option.code)}
                        disabled={!option.available}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: option.active, disabled: !option.available }}
                      >
                        <Text style={[settingsStyles.rowLabel, option.active && settingsStyles.rowLabelSelected]}>
                          {option.label}
                        </Text>
                        {option.active ? (
                          <MaterialCommunityIcons name="check" size={sizes.icon - 2} color={colors.accent} />
                        ) : !option.available ? (
                          <Text style={settingsStyles.rowHint}>No disponible</Text>
                        ) : null}
                      </Pressable>
                    </View>
                  ))}
                </View>

                <Text style={settingsStyles.sectionTitle}>Subtítulos</Text>
                <View style={settingsStyles.group}>
                  <Pressable
                    style={({ pressed }) =>
                      rowStyle(pressed && subtitles.available, !subtitles.available && settingsStyles.rowDisabled)
                    }
                    onPress={() => onToggleSubtitles(!subtitles.enabled)}
                    disabled={!subtitles.available}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: subtitles.enabled, disabled: !subtitles.available }}
                  >
                    <View style={[settingsStyles.rowIcon, settingsStyles.rowIconTurquoise]}>
                      <MaterialCommunityIcons name="closed-caption-outline" size={sizes.iconSmall} color={colors.onAccent} />
                    </View>
                    <View style={settingsStyles.rowText}>
                      <Text style={settingsStyles.rowLabel}>Mostrar subtítulos</Text>
                      <Text style={settingsStyles.rowSubLabel} numberOfLines={1}>
                        {!subtitles.available
                          ? 'No disponibles en esta transmisión'
                          : subtitles.enabled
                            ? `Activados${subtitles.label ? ` · ${subtitles.label}` : ''}`
                            : 'Desactivados'}
                      </Text>
                    </View>
                    <Switch
                      value={subtitles.enabled}
                      onValueChange={onToggleSubtitles}
                      disabled={!subtitles.available}
                      trackColor={{ false: colors.switchOff, true: colors.accent }}
                      thumbColor={colors.onMedia}
                    />
                  </Pressable>
                </View>

                <Text style={settingsStyles.sectionTitle}>Grabación</Text>
                <View style={settingsStyles.group}>
                  <Pressable
                    style={({ pressed }) =>
                      rowStyle(pressed && recordEnabled, [
                        recording.isRecording && settingsStyles.rowRecording,
                        !recordEnabled && settingsStyles.rowDisabled,
                      ])
                    }
                    onPress={onToggleRecording}
                    disabled={!recordEnabled}
                    accessibilityRole="button"
                    accessibilityLabel={recording.isRecording ? 'Detener grabación' : 'Grabar'}
                    accessibilityHint={recording.isRecording ? undefined : recordHint}
                    accessibilityState={{ busy: recording.status === 'starting', disabled: !recordEnabled }}
                  >
                    <View style={settingsStyles.rowText}>
                      <View style={settingsStyles.rowLabelLine}>
                        {recording.isRecording && <RecordingDot />}
                        <Text style={[settingsStyles.rowLabel, recording.isRecording && settingsStyles.rowLabelLive]}>
                          {recording.isRecording ? 'Detener grabación' : 'Grabar'}
                        </Text>
                      </View>
                      <Text style={settingsStyles.rowSubLabel} numberOfLines={1}>
                        {!canRecord
                          ? 'Disponible cuando cargue la transmisión'
                          : recording.status === 'starting'
                            ? 'Preparando la grabación…'
                            : recording.isRecording
                              ? `Grabando ${formatClock(recording.seconds)} de ${formatClock(recording.limitSeconds)}`
                              : recordHint}
                      </Text>
                    </View>
                    {recording.status === 'starting' ? (
                      <ActivityIndicator size="small" color={colors.live} />
                    ) : (
                      <MaterialCommunityIcons
                        name={recording.isRecording ? 'stop-circle-outline' : 'record-circle-outline'}
                        size={sizes.icon}
                        color={colors.live}
                      />
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </>
          )}

          {menuView === 'quality' && (
            <>
              <View style={settingsStyles.header} {...dragHandlers}>
                <Pressable
                  style={({ pressed }) => [settingsStyles.backButton, pressed && settingsStyles.headerButtonPressed]}
                  onPress={() => setMenuView('main')}
                  hitSlop={sizes.hitSlop}
                  accessibilityRole="button"
                  accessibilityLabel="Volver a configuración"
                >
                  <MaterialCommunityIcons name="chevron-left" size={sizes.icon + 4} color={colors.label} />
                  <Text style={settingsStyles.backButtonText}>Calidad de video</Text>
                </Pressable>
                <IconButton
                  icon="close"
                  variant="plain"
                  onPress={handleClose}
                  accessibilityLabel="Cerrar"
                  style={settingsStyles.headerButton}
                />
              </View>

              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                <View style={[settingsStyles.group, { marginTop: spacing.sm }]}>
                  {qualityOptions.map((option, index) => {
                    const isSelected = selectedQuality === option.key;
                    return (
                      <View key={option.key}>
                        {index > 0 && <View style={settingsStyles.divider} />}
                        <Pressable
                          style={({ pressed }) => rowStyle(pressed, isSelected && settingsStyles.rowSelected)}
                          onPress={() => onSelectQuality(option.key)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isSelected }}
                        >
                          <View style={settingsStyles.rowText}>
                            <Text style={[settingsStyles.rowLabel, isSelected && settingsStyles.rowLabelSelected]}>
                              {option.label}
                            </Text>
                            {!!option.sublabel && <Text style={settingsStyles.rowSubLabel}>{option.sublabel}</Text>}
                          </View>
                          <View style={[settingsStyles.radioOuter, isSelected && settingsStyles.radioOuterSelected]}>
                            {isSelected && <View style={settingsStyles.radioInner} />}
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
