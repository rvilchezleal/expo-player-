import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { createLogger } from '../utils/logger';

const log = createLogger('Pantalla completa');
const { LANDSCAPE, PORTRAIT_UP } = ScreenOrientation.OrientationLock;

export default function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    ScreenOrientation.lockAsync(PORTRAIT_UP).catch(() => {});
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const next = !isFullscreen;
    try {
      await ScreenOrientation.lockAsync(next ? LANDSCAPE : PORTRAIT_UP);
      setIsFullscreen(next);
    } catch (error) {
      log.error('No se pudo rotar la pantalla:', error?.message ?? error);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      toggleFullscreen();
      return true;
    });
    return () => sub.remove();
  }, [isFullscreen, toggleFullscreen]);

  return { isFullscreen, toggleFullscreen };
}
