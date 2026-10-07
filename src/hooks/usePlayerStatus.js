import { useCallback, useEffect, useRef, useState } from 'react';

import { createLogger } from '../utils/logger';

const log = createLogger('Reproductor');

export default function usePlayerStatus(player) {
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const statusSub = player.addListener('statusChange', ({ status: next, oldStatus, error }) => {
      log.debug(`Estado: ${oldStatus} → ${next}`);
      setStatus(next);
      if (error) {
        log.error('Error de reproducción:', error.message);
        setErrorMessage(error.message);
      }
      if (next === 'readyToPlay') {
        hasLoadedRef.current = true;
        setIsLive(player.isLive);
      }
    });
    const playingSub = player.addListener('playingChange', ({ isPlaying: playing }) => setIsPlaying(playing));

    return () => {
      statusSub.remove();
      playingSub.remove();
    };
  }, [player]);

  const clearError = useCallback(() => setErrorMessage(null), []);

  return { status, errorMessage, clearError, isPlaying, isLive, hasLoadedRef };
}
