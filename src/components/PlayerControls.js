import { useCallback, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, useAnimatedValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import IconButton from './IconButton';
import LiveBadge from './LiveBadge';
import SettingsModal from './SettingsModal';
import VolumeControl from './VolumeControl';
import { overlayStyles } from '../styles/overlayStyles';
import { scrims, sizes } from '../theme';

const CONTROLS_HIDE_DELAY = 3000;

export default function PlayerControls({
  player,
  isPlaying,
  onTogglePlay,
  onFullscreen,
  languageOptions,
  onSelectLanguage,
  subtitles,
  onToggleSubtitles,
  isFullscreen,
  qualityOptions,
  currentHeight,
  selectedQuality,
  onSelectQuality,
  onPictureInPicture,
  canPictureInPicture,
  safeInsets,
  isLiveBadgeVisible,
  onClose,
  recording,
  canRecord,
  onToggleRecording,
}) {
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [interaction, setInteraction] = useState(0);
  const opacity = useAnimatedValue(1);
  const [wasPlaying, setWasPlaying] = useState(isPlaying);

  if (isPlaying !== wasPlaying) {
    setWasPlaying(isPlaying);
    if (!isPlaying) setVisible(true);
  }

  const bump = useCallback(() => setInteraction((n) => n + 1), []);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  useEffect(() => {
    if (!visible || menuOpen || !isPlaying) return;
    const timer = setTimeout(() => setVisible(false), CONTROLS_HIDE_DELAY);
    return () => clearTimeout(timer);
  }, [visible, menuOpen, isPlaying, interaction]);

  const handleSurfacePress = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    setVisible((v) => !v);
    bump();
  };

  const handleLanguage = (code) => {
    bump();
    onSelectLanguage(code);
  };

  const handleSubtitles = (enabled) => {
    bump();
    onToggleSubtitles(enabled);
  };

  const handleFullscreen = () => {
    setMenuOpen(false);
    onFullscreen();
  };

  const handlePictureInPicture = () => {
    setMenuOpen(false);
    onPictureInPicture();
  };

  const handleClose = () => {
    setMenuOpen(false);
    bump();
    onClose();
  };

  const handleToggleRecording = () => {
    bump();
    onToggleRecording();
  };

  const edgeInsets = isFullscreen
    ? {
        paddingLeft: Math.max(safeInsets.left, 16) + 8,
        paddingRight: Math.max(safeInsets.right, 16) + 8,
      }
    : null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={handleSurfacePress} />

      <Animated.View
        style={[overlayStyles.controls, { opacity }]}
        pointerEvents={visible ? 'box-none' : 'none'}
      >
        <LinearGradient colors={scrims.top} style={overlayStyles.scrimTop} pointerEvents="none" />
        <LinearGradient colors={scrims.bottom} style={overlayStyles.scrimBottom} pointerEvents="none" />

        <View
          style={[overlayStyles.topBar, isFullscreen && overlayStyles.topBarFullscreen, edgeInsets]}
          pointerEvents="box-none"
        >
          <IconButton
            icon="close"
            onPress={handleClose}
            accessibilityLabel={isFullscreen ? 'Salir de pantalla completa' : 'Cerrar'}
          />

          <View style={overlayStyles.controlGroup} pointerEvents="box-none">
            {canPictureInPicture && (
              <IconButton
                icon="picture-in-picture-bottom-right-outline"
                onPress={handlePictureInPicture}
                accessibilityLabel="Imagen en imagen"
              />
            )}
            <IconButton
              icon="cog-outline"
              onPress={() => { setMenuOpen((v) => !v); bump(); }}
              accessibilityLabel="Configuración"
            />
          </View>
        </View>

        <View style={overlayStyles.centerZone} pointerEvents="box-none">
          <IconButton
            icon={isPlaying ? 'pause' : 'play'}
            iconSize={sizes.playIcon}
            onPress={() => { onTogglePlay(); bump(); }}
            accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}
            style={overlayStyles.playButton}
          />
        </View>

        <View
          style={[
            overlayStyles.bottomBar,
            isFullscreen && overlayStyles.bottomBarFullscreen,
            edgeInsets,
            isFullscreen && { paddingBottom: Math.max(safeInsets.bottom, 10) },
          ]}
          pointerEvents="box-none"
        >
          <View style={overlayStyles.liveGroup} pointerEvents="box-none">
            <View style={overlayStyles.liveBadgeSlot} pointerEvents="none">
              <LiveBadge isLive={isLiveBadgeVisible} />
            </View>
            <VolumeControl player={player} onInteract={bump} />
          </View>

          <IconButton
            icon={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
            onPress={handleFullscreen}
            accessibilityLabel={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          />
        </View>
      </Animated.View>

      <SettingsModal
        visible={menuOpen}
        onClose={() => { setMenuOpen(false); bump(); }}
        languageOptions={languageOptions}
        onSelectLanguage={handleLanguage}
        subtitles={subtitles}
        onToggleSubtitles={handleSubtitles}
        qualityOptions={qualityOptions}
        currentHeight={currentHeight}
        selectedQuality={selectedQuality}
        onSelectQuality={onSelectQuality}
        recording={recording}
        canRecord={canRecord}
        onToggleRecording={handleToggleRecording}
      />
    </View>
  );
}
