import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StatusBar, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import IconButton from './IconButton';
import RecordingCard from './RecordingCard';
import RecordingPlayer from './RecordingPlayer';
import { availableBytes, deleteRecording, listRecordings } from '../services/recording';
import { colors, scrims, sizes, spacing } from '../theme';
import { recordingsStyles as styles } from '../styles/recordingsStyles';
import { createLogger } from '../utils/logger';
import { formatBytes, formatRecordingDate, formatRecordingDay, formatRecordingTitle, formatRecordingTraits } from '../utils/format';

const log = createLogger('Grabaciones');

function summaryText(items) {
  const total = items.reduce((sum, item) => sum + (item.bytes ?? 0), 0);
  const count = items.length === 1 ? '1 grabación' : `${items.length} grabaciones`;
  return `${count} · ${formatBytes(total)}`;
}

function RecordingsContent({ onClose, recording, selectedId, setSelectedId, isFullscreen, onToggleFullscreen }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const { activeId, lastResult, seconds, limitSeconds } = recording;

  useEffect(() => {
    let cancelled = false;
    listRecordings(activeId)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((error) => {
        log.warn('No se pudieron leer las grabaciones:', error?.message ?? error);
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId, lastResult, reloadToken]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  const selected = items?.find((item) => item.id === selectedId) ?? null;

  const confirmDelete = (item) => {
    Alert.alert(
      'Eliminar grabación',
      `Se borrará la grabación de ${formatRecordingDate(item.createdAt).toLowerCase()} de este dispositivo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            if (selectedId === item.id) setSelectedId(null);
            try {
              deleteRecording(item.id);
            } catch (error) {
              log.warn('No se pudo eliminar la grabación:', error?.message ?? error);
            }
            refresh();
          },
        },
      ]
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <LinearGradient colors={scrims.brandDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyIcon}>
        <MaterialCommunityIcons name="video-off-outline" size={sizes.icon + 8} color={colors.onMedia} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>Aún no tienes grabaciones</Text>
      <Text style={styles.emptyText}>
        Abre la configuración del reproductor y toca «Grabar» para guardar hasta {Math.round(limitSeconds / 60)} minutos
        de la transmisión.
      </Text>
    </View>
  );

  return (
    <View style={[styles.screen, isFullscreen ? styles.screenFullscreen : { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" hidden={isFullscreen} />

      {!isFullscreen && (
        <View style={[styles.header, { paddingLeft: spacing.xs + insets.left, paddingRight: spacing.md + insets.right }]}>
          <IconButton
            icon="chevron-left"
            iconSize={sizes.icon + 6}
            variant="plain"
            onPress={onClose}
            accessibilityLabel="Volver a la transmisión"
            style={styles.backButton}
          />
          <View style={styles.headerText}>
            <Text style={styles.title} accessibilityRole="header">Mis grabaciones</Text>
            <LinearGradient
              colors={scrims.brand}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.titleAccent}
            />
            {!!items?.length && <Text style={styles.summary}>{summaryText(items)}</Text>}
          </View>
        </View>
      )}

      {selected && (
        <>
          <RecordingPlayer
            key={selected.id}
            recording={selected}
            isFullscreen={isFullscreen}
            safeInsets={insets}
            onToggleFullscreen={onToggleFullscreen}
            onClose={() => (isFullscreen ? onToggleFullscreen() : setSelectedId(null))}
          />
          {!isFullscreen && (
            <View style={styles.nowPlaying}>
              <Text style={styles.nowPlayingTitle} numberOfLines={1}>
                {`${formatRecordingTitle(selected.createdAt)} · ${formatRecordingDay(selected.createdAt)}`}
              </Text>
              <Text style={styles.nowPlayingMeta} numberOfLines={1}>
                {[
                  'Transmisión en vivo',
                  ...formatRecordingTraits(selected),
                  selected.status === 'interrupted' && 'Incompleta',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          )}
        </>
      )}

      {isFullscreen ? null : items === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.lg, paddingLeft: spacing.md + insets.left, paddingRight: spacing.md + insets.right },
            items.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            items.length > 0 ? (
              <Text style={styles.footer}>Espacio libre en el dispositivo: {formatBytes(availableBytes())}</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <RecordingCard
              item={item}
              isPlaying={item.id === selectedId}
              isRecordingNow={item.id === activeId}
              liveSeconds={seconds}
              onPress={() => setSelectedId(item.id)}
              onDelete={() => confirmDelete(item)}
            />
          )}
        />
      )}
    </View>
  );
}

function lockOrientation(fullscreen) {
  return ScreenOrientation.lockAsync(
    fullscreen ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP
  );
}

export default function RecordingsScreen({ visible, onClose, recording }) {
  const [selectedId, setSelectedId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const setFullscreen = useCallback(async (next) => {
    try {
      await lockOrientation(next);
      setIsFullscreen(next);
    } catch (error) {
      log.warn('No se pudo rotar la pantalla:', error?.message ?? error);
    }
  }, []);

  const handleClose = () => {
    if (isFullscreen) {
      setIsFullscreen(false);
      lockOrientation(false).catch(() => {});
    }
    setSelectedId(null);
    onClose();
  };

  const handleRequestClose = () => {
    if (isFullscreen) setFullscreen(false);
    else handleClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleRequestClose}
      supportedOrientations={['portrait', 'landscape']}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <RecordingsContent
        onClose={handleClose}
        recording={recording}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setFullscreen(!isFullscreen)}
      />
    </Modal>
  );
}
