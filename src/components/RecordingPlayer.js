import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Pressable, StyleSheet, Text, View, useAnimatedValue } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import IconButton from './IconButton';
import VolumeControl from './VolumeControl';
import { colors, motion, scrims, sizes, spacing } from '../theme';
import { overlayStyles } from '../styles/overlayStyles';
import { recordingPlayerStyles as styles } from '../styles/recordingsStyles';
import { buildPlaybackSource } from '../services/recording';
import { formatClock } from '../utils/format';
import { createLogger } from '../utils/logger';

const CONTROLS_HIDE_DELAY = 3000;

const log = createLogger('Grabaciones');
const redact = (message) => String(message ?? '').replace(/data:[^\s"']+/g, 'data:…');

export default function RecordingPlayer({ recording, isFullscreen, safeInsets, onToggleFullscreen, onClose }) {
  const [status, setStatus] = useState('loading');
  const [isPlaying, setIsPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.duration ?? 0);
  const [dragRatio, setDragRatio] = useState(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [interaction, setInteraction] = useState(0);
  const opacity = useAnimatedValue(1);
  const trackWidth = useRef(0);
  const trackLeft = useRef(0);
  const dragRatioRef = useRef(0);

  const player = useVideoPlayer(null, (instance) => {
    instance.timeUpdateEventInterval = 0.25;
  });

  const bump = useCallback(() => setInteraction((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    buildPlaybackSource({ id: recording.id, encrypted: recording.encrypted })
      .then((source) => (cancelled ? null : player.replaceAsync(source)))
      .then(() => {
        if (!cancelled) player.play();
      })
      .catch((error) => {
        log.warn('No se pudo abrir la grabación:', redact(error?.message ?? error));
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [player, recording.id, recording.encrypted]);

  useEffect(() => {
    const subs = [
      player.addListener('statusChange', ({ status: next, error }) => {
        if (error) log.warn('Error en la grabación:', redact(error.message));
        setStatus(next);
      }),
      player.addListener('playingChange', ({ isPlaying: playing }) => {
        setIsPlaying(playing);
        if (playing) setEnded(false);
      }),
      player.addListener('sourceLoad', ({ duration: loaded }) => {
        if (loaded > 0) setDuration(loaded);
      }),
      player.addListener('timeUpdate', ({ currentTime: time }) => setCurrentTime(time)),
      player.addListener('playToEnd', () => {
        setEnded(true);
        setControlsVisible(true);
      }),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, [player]);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: controlsVisible ? 1 : 0,
      duration: motion.fast,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible, opacity]);

  useEffect(() => {
    if (!controlsVisible || !isPlaying || dragRatio !== null) return;
    const timer = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_DELAY);
    return () => clearTimeout(timer);
  }, [controlsVisible, isPlaying, dragRatio, interaction]);

  const togglePlay = () => {
    bump();
    if (ended) {
      player.currentTime = 0;
      player.play();
      return;
    }
    if (isPlaying) player.pause();
    else player.play();
  };

  const latest = useRef({ duration, player, bump });

  useEffect(() => {
    latest.current = { duration, player, bump };
  });

  const updateDrag = (pageX) => {
    if (trackWidth.current <= 0) return;
    const ratio = Math.min(1, Math.max(0, (pageX - trackLeft.current) / trackWidth.current));
    dragRatioRef.current = ratio;
    setDragRatio(ratio);
    latest.current.bump();
  };

  const commitDrag = () => {
    const { duration: total, player: target } = latest.current;
    if (total > 0) {
      const time = dragRatioRef.current * total;
      target.currentTime = time;
      setCurrentTime(time);
      setEnded(false);
    }
    setDragRatio(null);
  };

  // eslint-disable-next-line react-hooks/refs -- PanResponder solo lee refs dentro de sus manejadores de gestos.
  const [scrubResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        trackLeft.current = event.nativeEvent.pageX - event.nativeEvent.locationX;
        updateDrag(event.nativeEvent.pageX);
      },
      onPanResponderMove: (_, gesture) => updateDrag(gesture.moveX),
      onPanResponderRelease: commitDrag,
      onPanResponderTerminate: commitDrag,
    })
  );

  const isDragging = dragRatio !== null;
  const progress = isDragging ? dragRatio : duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const shownTime = isDragging ? dragRatio * duration : currentTime;
  const isLoading = status === 'loading' || status === 'idle';
  const centerIcon = ended ? 'replay' : isPlaying ? 'pause' : 'play';
  const edgeInsets = isFullscreen
    ? {
        paddingLeft: Math.max(safeInsets.left, spacing.md) + spacing.sm,
        paddingRight: Math.max(safeInsets.right, spacing.md) + spacing.sm,
      }
    : null;

  return (
    <View style={[styles.container, isFullscreen ? styles.containerFullscreen : styles.containerInline]}>
      <VideoView
        player={player}
        nativeControls={false}
        surfaceType="textureView"
        contentFit="contain"
        style={styles.video}
      />

      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => {
          setControlsVisible((visible) => !visible);
          bump();
        }}
        accessibilityLabel={controlsVisible ? 'Ocultar controles' : 'Mostrar controles'}
      />

      {status === 'error' ? (
        <View style={styles.message}>
          <MaterialCommunityIcons name="alert-circle-outline" size={sizes.icon + 4} color={colors.onMedia} />
          <Text style={styles.messageText}>No se pudo reproducir esta grabación</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.message} pointerEvents="none">
          <ActivityIndicator color={colors.onMedia} />
        </View>
      ) : null}

      <Animated.View
        style={[styles.controls, { opacity }]}
        pointerEvents={controlsVisible ? 'box-none' : 'none'}
      >
        <LinearGradient colors={scrims.top} style={styles.scrimTop} pointerEvents="none" />
        <LinearGradient colors={scrims.bottom} style={styles.scrimBottom} pointerEvents="none" />

        <View style={[styles.topBar, edgeInsets]} pointerEvents="box-none">
          <IconButton
            icon="close"
            onPress={onClose}
            accessibilityLabel={isFullscreen ? 'Salir de pantalla completa' : 'Cerrar reproductor'}
          />
        </View>

        <View style={styles.center} pointerEvents="box-none">
          {!isLoading && status !== 'error' && (
            <IconButton
              icon={centerIcon}
              iconSize={sizes.playIcon}
              onPress={togglePlay}
              accessibilityLabel={ended ? 'Volver a reproducir' : isPlaying ? 'Pausar' : 'Reproducir'}
              style={overlayStyles.playButton}
            />
          )}
        </View>

        <View
          style={[styles.bottomArea, isFullscreen && styles.bottomAreaFullscreen, edgeInsets]}
          pointerEvents="box-none"
        >
          <View style={styles.controlsRow} pointerEvents="box-none">
            <View style={styles.controlGroup} pointerEvents="box-none">
              <VolumeControl player={player} onInteract={bump} />
              <Text style={styles.time}>
                {formatClock(shownTime)}
                <Text style={styles.timeTotal}> / {formatClock(duration)}</Text>
              </Text>
            </View>
            <IconButton
              icon={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
              onPress={() => {
                bump();
                onToggleFullscreen();
              }}
              accessibilityLabel={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            />
          </View>
          <View
            style={styles.scrubber}
            onLayout={(event) => {
              trackWidth.current = event.nativeEvent.layout.width;
            }}
            hitSlop={{ top: sizes.hitSlop, bottom: sizes.hitSlop }}
            accessibilityRole="adjustable"
            accessibilityLabel="Posición de la grabación"
            accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(shownTime) }}
            {...scrubResponder.panHandlers}
          >
            <View style={styles.track} pointerEvents="none" />
            <LinearGradient
              colors={scrims.progress}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.fill, { width: `${progress * 100}%` }]}
              pointerEvents="none"
            />
            <View
              style={[styles.thumb, isDragging && styles.thumbActive, { left: `${progress * 100}%` }]}
              pointerEvents="none"
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
