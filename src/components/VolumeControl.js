import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, View, useAnimatedValue } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { overlayStyles } from '../styles/overlayStyles';
import { colors, sizes } from '../theme';

const VOLUME_SLIDER_WIDTH = 84;
const VOLUME_HIDE_DELAY = 3000;

export default function VolumeControl({ player, onInteract }) {
  const [muted, setMuted] = useState(player.muted);
  const [volume, setVolume] = useState(player.volume);
  const [sliderOpen, setSliderOpen] = useState(false);
  const [dragValue, setDragValue] = useState(null);
  const dragValueRef = useRef(0);
  const draggingRef = useRef(false);
  const sliderAnim = useAnimatedValue(0);
  const hideTimer = useRef(null);
  const trackLeft = useRef(0);

  const latest = useRef({ muted, onInteract });

  useEffect(() => {
    latest.current = { muted, onInteract };
  });

  useEffect(() => {
    const volumeSub = player.addListener('volumeChange', ({ volume }) => {
      if (!draggingRef.current) setVolume(volume);
    });
    const mutedSub = player.addListener('mutedChange', ({ muted }) => setMuted(muted));
    return () => {
      volumeSub.remove();
      mutedSub.remove();
    };
  }, [player]);

  useEffect(() => {
    Animated.timing(sliderAnim, {
      toValue: sliderOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [sliderOpen, sliderAnim]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const scheduleHide = () => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setSliderOpen(false), VOLUME_HIDE_DELAY);
  };

  const openSlider = () => {
    setSliderOpen(true);
    scheduleHide();
    onInteract();
  };

  const toggleMute = () => {
    const next = !muted;
    player.muted = next;
    setMuted(next);
    if (sliderOpen) scheduleHide();
    onInteract();
  };

  const updateDrag = (pageX) => {
    const next = Math.min(1, Math.max(0, (pageX - trackLeft.current) / VOLUME_SLIDER_WIDTH));
    dragValueRef.current = next;
    setDragValue(next);
    latest.current.onInteract();
  };

  const commitDrag = () => {
    draggingRef.current = false;
    const next = dragValueRef.current;
    player.volume = next;
    setVolume(next);
    if (next > 0 && latest.current.muted) {
      player.muted = false;
      setMuted(false);
    }
    setDragValue(null);
    scheduleHide();
  };

  // eslint-disable-next-line react-hooks/refs -- PanResponder solo lee refs dentro de sus manejadores de gestos.
  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        clearTimeout(hideTimer.current);
        trackLeft.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
        draggingRef.current = true;
        updateDrag(e.nativeEvent.pageX);
      },
      onPanResponderMove: (_, gesture) => updateDrag(gesture.moveX),
      onPanResponderRelease: commitDrag,
      onPanResponderTerminate: commitDrag,
    })
  );

  const isDragging = dragValue !== null;
  const effective = isDragging ? dragValue : muted ? 0 : volume;
  const iconName = effective === 0 ? 'volume-mute' : effective < 0.5 ? 'volume-low' : 'volume-high';

  return (
    <Pressable style={overlayStyles.volumeGroup} onHoverIn={openSlider} onHoverOut={scheduleHide}>
      <Pressable
        style={({ pressed }) => [overlayStyles.volumeButton, pressed && overlayStyles.iconButtonPressed]}
        onPress={toggleMute}
        onLongPress={openSlider}
        delayLongPress={300}
        hitSlop={sizes.hitSlop}
        accessibilityRole="button"
        accessibilityLabel={muted ? 'Activar sonido' : 'Silenciar'}
        accessibilityHint="Mantén presionado para ajustar el volumen"
      >
        <MaterialCommunityIcons name={iconName} size={sizes.icon} color={colors.onMedia} />
      </Pressable>

      <Animated.View
        style={[
          overlayStyles.volumeSliderWrapper,
          {
            width: sliderAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, VOLUME_SLIDER_WIDTH + 16],
            }),
            opacity: sliderAnim,
          },
        ]}
        pointerEvents={sliderOpen ? 'auto' : 'none'}
      >
        <View
          style={[overlayStyles.volumeSlider, { width: VOLUME_SLIDER_WIDTH }]}
          {...panResponder.panHandlers}
        >
          <View style={overlayStyles.volumeTrack} pointerEvents="none" />
          <View
            style={[overlayStyles.volumeFill, { width: effective * VOLUME_SLIDER_WIDTH }]}
            pointerEvents="none"
          />
          <View
            style={[
              overlayStyles.volumeThumb,
              isDragging && overlayStyles.volumeThumbActive,
              { left: effective * VOLUME_SLIDER_WIDTH },
            ]}
            pointerEvents="none"
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}
