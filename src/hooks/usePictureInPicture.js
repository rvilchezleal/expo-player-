import { useCallback, useMemo, useState } from 'react';
import { isPictureInPictureSupported } from 'expo-video';

import { createLogger } from '../utils/logger';

const log = createLogger('PiP');

export default function usePictureInPicture(videoViewRef) {
  const [isActive, setIsActive] = useState(false);

  const isSupported = useMemo(() => {
    try {
      return isPictureInPictureSupported();
    } catch {
      return false;
    }
  }, []);

  const start = useCallback(async () => {
    try {
      await videoViewRef.current?.startPictureInPicture();
    } catch (e) {
      log.error('No se pudo iniciar:', e?.message ?? e);
    }
  }, [videoViewRef]);

  const onStart = useCallback(() => setIsActive(true), []);
  const onStop = useCallback(() => setIsActive(false), []);

  return { isActive, isSupported, start, onStart, onStop };
}
