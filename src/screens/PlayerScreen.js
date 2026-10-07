import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, BackHandler, Platform, Pressable, StatusBar, Text, View, useAnimatedValue } from 'react-native';
import { useVideoPlayer } from 'expo-video';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DebugPanel from '../components/DebugPanel';
import PlayerControls from '../components/PlayerControls';
import RecordingIndicator from '../components/RecordingIndicator';
import RecordingsScreen from '../components/RecordingsScreen';
import StatusPill from '../components/StatusPill';
import VideoPlayer from '../components/VideoPlayer';
import { EXIT_DELAY_MS, EXIT_ON_STARTUP_ERROR, STREAM_URL, videoSource } from '../config/stream';
import useAudioTracks from '../hooks/useAudioTracks';
import useFullscreen from '../hooks/useFullscreen';
import useLiveEdgeSync from '../hooks/useLiveEdgeSync';
import usePictureInPicture from '../hooks/usePictureInPicture';
import usePlayerStatus from '../hooks/usePlayerStatus';
import useRecorder from '../hooks/useRecorder';
import useStreamHeartbeat from '../hooks/useStreamHeartbeat';
import useStreamRecovery from '../hooks/useStreamRecovery';
import useStreamVariants from '../hooks/useStreamVariants';
import useSubtitleTracks from '../hooks/useSubtitleTracks';
import useVideoHeight from '../hooks/useVideoHeight';
import { matchesLanguage } from '../utils/audioLanguages';
import { createLogger } from '../utils/logger';
import { colors, scrims, sizes } from '../theme';
import { screenStyles } from '../styles/screenStyles';

const FADE_IN_MS = 600;
const BUFFER_OPTIONS = {
  preferredForwardBufferDuration: 10,
  minBufferForPlayback: 1,
  prioritizeTimeOverSizeThreshold: true,
};

const log = createLogger('Pantalla');

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const videoViewRef = useRef(null);
  const pictureInPicture = usePictureInPicture(videoViewRef);
  const fadeAnim = useAnimatedValue(0);
  const [shutdownReason, setShutdownReason] = useState(null);
  const [originStopped, setOriginStopped] = useState(false);
  const [recordingsOpen, setRecordingsOpen] = useState(false);
  const liveSuspendRef = useRef(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: FADE_IN_MS, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const player = useVideoPlayer(videoSource, (instance) => {
    instance.bufferOptions = BUFFER_OPTIONS;
    instance.timeUpdateEventInterval = 2;
    instance.play();
  });

  const { status: playerStatus, errorMessage, clearError, isPlaying, isLive, hasLoadedRef } = usePlayerStatus(player);
  const { options: languageOptions, activeOption: activeLanguage, activeCode: activeAudioCode, select: selectLanguage } =
    useAudioTracks(player);
  const { tracks: subtitleTracks, current: currentSubtitle, select: selectSubtitle } = useSubtitleTracks(player);
  const currentHeight = useVideoHeight(player);
  const {
    masterInfo,
    burnedSubsOn,
    hasBurnedSubs,
    selectedQuality,
    qualityOptions,
    selectQuality,
    setBurnedSubtitles,
  } = useStreamVariants(player);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const recordingSelection = useMemo(
    () => ({ master: masterInfo, subtitled: burnedSubsOn, audioCode: activeAudioCode, quality: selectedQuality }),
    [masterInfo, burnedSubsOn, activeAudioCode, selectedQuality]
  );
  const recorder = useRecorder({ streamUrl: STREAM_URL, selection: recordingSelection });
  const { isRecording, start: startRecording, stop: stopRecording } = recorder;

  const handleSubtitlesToggle = useCallback(
    (enabled) => {
      if (subtitleTracks.length === 0) return setBurnedSubtitles(enabled);
      if (!enabled) return selectSubtitle(null);
      const audioCode = activeLanguage?.code;
      const track =
        (audioCode && subtitleTracks.find((candidate) => matchesLanguage(candidate, audioCode))) ||
        subtitleTracks.find((candidate) => candidate.isDefault) ||
        subtitleTracks[0];
      if (track) selectSubtitle(track);
      return undefined;
    },
    [activeLanguage, selectSubtitle, setBurnedSubtitles, subtitleTracks]
  );

  const subtitlesState = useMemo(
    () => ({
      available: subtitleTracks.length > 0 || hasBurnedSubs,
      enabled: !!currentSubtitle || burnedSubsOn,
      label: currentSubtitle?.label || currentSubtitle?.language?.toUpperCase() || (burnedSubsOn ? 'Español' : undefined),
    }),
    [subtitleTracks, currentSubtitle, hasBurnedSubs, burnedSubsOn]
  );

  const handleClose = useCallback(() => {
    if (isFullscreen) {
      toggleFullscreen();
      return;
    }
    const closeMessage = isRecording
      ? 'Hay una grabación en curso. Se guardará lo grabado hasta ahora.'
      : '¿Quieres salir de la aplicación?';
    Alert.alert('Cerrar transmisión', closeMessage, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => {
          stopRecording();
          player.pause();
          if (Platform.OS === 'android') BackHandler.exitApp();
        },
      },
    ]);
  }, [toggleFullscreen, isFullscreen, isRecording, player, stopRecording]);

  const { isRecovering } = useStreamRecovery(player, {
    initialSource: videoSource,
    canGiveUp: () => (EXIT_ON_STARTUP_ERROR || hasLoadedRef.current) && !pictureInPicture.isActive,
    onGiveUp: setShutdownReason,
    onRecovered: () => {
      clearError();
      setShutdownReason(null);
    },
  });

  useLiveEdgeSync(player);

  useStreamHeartbeat(STREAM_URL, {
    canStop: (seenAdvancing) => (EXIT_ON_STARTUP_ERROR || seenAdvancing) && !pictureInPicture.isActive,
    onStopped: () => setOriginStopped(true),
    onResumed: () => {
      setOriginStopped(false);
      player.play();
    },
  });

  const exitReason = shutdownReason ?? (originStopped ? 'El servidor dejó de transmitir' : null);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    const sub = player.addListener('playingChange', ({ isPlaying: playing }) => {
      if (!playing || !liveSuspendRef.current) return;
      player.pause();
    });
    return () => sub.remove();
  }, [player]);

  const handleOpenRecordings = useCallback(() => {
    liveSuspendRef.current = { wasPlaying: isPlaying, wasMuted: player.muted };
    player.muted = true;
    player.pause();
    if (isFullscreen) toggleFullscreen();
    setRecordingsOpen(true);
  }, [toggleFullscreen, isFullscreen, isPlaying, player]);

  const handleCloseRecordings = useCallback(() => {
    const suspended = liveSuspendRef.current;
    liveSuspendRef.current = null;
    setRecordingsOpen(false);
    if (!suspended) return;
    player.muted = suspended.wasMuted;
    if (suspended.wasPlaying && !exitReason) player.play();
  }, [exitReason, player]);

  const streamDetails = [
    activeLanguage && `Audio en ${activeLanguage.label.toLowerCase()}`,
    currentHeight && `calidad ${currentHeight}p`,
  ]
    .filter(Boolean)
    .join(', ');

  useEffect(() => {
    if (!exitReason) return undefined;
    stopRecording();
    if (recordingsOpen) return undefined;
    log.error('Transmisión caída, cerrando la app:', exitReason);
    player.pause();
    const timer = setTimeout(() => {
      if (Platform.OS === 'android') BackHandler.exitApp();
    }, EXIT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [exitReason, player, recordingsOpen, stopRecording]);

  return (
    <View
      style={[
        screenStyles.safeArea,
        { paddingTop: isFullscreen ? 0 : insets.top },
        isFullscreen && screenStyles.safeAreaFullscreen,
      ]}
    >
      <StatusBar barStyle="light-content" hidden={isFullscreen} />

      <Animated.View style={[screenStyles.mainContainer, { opacity: fadeAnim }]}>
        <VideoPlayer
          player={player}
          videoViewRef={videoViewRef}
          isFullscreen={isFullscreen}
          isPictureInPicture={pictureInPicture.isActive}
          isReconnecting={isRecovering}
          onPictureInPictureStart={pictureInPicture.onStart}
          onPictureInPictureStop={pictureInPicture.onStop}
        >
          <PlayerControls
            player={player}
            isPlaying={isPlaying}
            onTogglePlay={() => (isPlaying ? player.pause() : player.play())}
            onFullscreen={toggleFullscreen}
            isFullscreen={isFullscreen}
            languageOptions={languageOptions}
            onSelectLanguage={selectLanguage}
            subtitles={subtitlesState}
            onToggleSubtitles={handleSubtitlesToggle}
            qualityOptions={qualityOptions}
            currentHeight={currentHeight}
            selectedQuality={selectedQuality}
            onSelectQuality={selectQuality}
            onPictureInPicture={pictureInPicture.start}
            canPictureInPicture={pictureInPicture.isSupported}
            safeInsets={insets}
            isLiveBadgeVisible={isLive || playerStatus === 'readyToPlay'}
            onClose={handleClose}
            recording={recorder}
            canRecord={!!masterInfo}
            onToggleRecording={handleToggleRecording}
          />
          {!isRecovering && <RecordingIndicator recording={recorder} isFullscreen={isFullscreen} />}
        </VideoPlayer>

        <View style={[screenStyles.content, { paddingBottom: insets.bottom }, isFullscreen && screenStyles.hidden]}>
          <View style={screenStyles.headerRow}>
            <View style={screenStyles.titleContainer}>
              <Text style={screenStyles.title}>Transmisión en vivo</Text>
              {!!streamDetails && (
                <Text style={screenStyles.subtitle}>
                  {streamDetails.charAt(0).toUpperCase() + streamDetails.slice(1)}
                </Text>
              )}
            </View>
            <StatusPill status={playerStatus} isPlaying={isPlaying} />
          </View>

          <Pressable
            style={({ pressed }) => [screenStyles.libraryButton, pressed && screenStyles.libraryButtonPressed]}
            onPress={handleOpenRecordings}
            accessibilityRole="button"
            accessibilityLabel="Mis grabaciones"
            accessibilityHint="Abre tus grabaciones guardadas"
          >
            <LinearGradient
              colors={scrims.brandDeep}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={screenStyles.libraryIcon}
            >
              <MaterialCommunityIcons name="folder-play-outline" size={sizes.icon} color={colors.onMedia} />
            </LinearGradient>
            <View style={screenStyles.libraryText}>
              <Text style={screenStyles.libraryTitle}>Mis grabaciones</Text>
              <Text style={screenStyles.librarySubtitle}>Reproduce lo que grabaste</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={sizes.icon} color={colors.tertiaryLabel} />
          </Pressable>

          {errorMessage && (
            <View style={screenStyles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={sizes.icon - 2} color={colors.danger} />
              <View style={screenStyles.errorContent}>
                <Text style={screenStyles.errorTitle}>No se pudo reproducir la transmisión</Text>
                <Text style={screenStyles.errorText} numberOfLines={3}>{errorMessage}</Text>
              </View>
            </View>
          )}

          {__DEV__ && (
            <View style={screenStyles.debugWrapper}>
              <DebugPanel status={playerStatus} errorMessage={errorMessage} isPlaying={isPlaying} />
            </View>
          )}
        </View>
      </Animated.View>

      {exitReason && (
        <View style={screenStyles.shutdownOverlay}>
          <MaterialCommunityIcons name="cloud-off-outline" size={sizes.playIcon} color={colors.secondaryLabel} />
          <Text style={screenStyles.shutdownTitle}>Se perdió la transmisión</Text>
          <Text style={screenStyles.shutdownText}>
            {Platform.OS === 'android' ? 'Cerrando la aplicación…' : 'Vuelve a abrir la aplicación más tarde.'}
          </Text>
        </View>
      )}

      <RecordingsScreen visible={recordingsOpen} onClose={handleCloseRecordings} recording={recorder} />
    </View>
  );
}
