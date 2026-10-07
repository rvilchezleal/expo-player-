import { useEffect, useEffectEvent, useState } from 'react';

import { createLogger } from '../utils/logger';

const RETRY_INTERVAL_MS = 3000;
const GIVE_UP_AFTER_MS = 10000;
const STALL_RELOAD_AFTER_MS = 8000;
const RELOAD_COOLDOWN_MS = 10000;
const TICK_MS = 1000;

const log = createLogger('Recuperación');

export default function useStreamRecovery(player, { initialSource, canGiveUp, onGiveUp, onRecovered }) {
  const [isRecovering, setIsRecovering] = useState(false);
  const mayGiveUp = useEffectEvent(() => canGiveUp());
  const notifyGiveUp = useEffectEvent((error) => onGiveUp(error));
  const notifyRecovered = useEffectEvent(() => onRecovered?.());

  useEffect(() => {
    let currentSource = initialSource;
    let hasPlayed = false;
    let recovering = false;
    let gaveUp = false;
    let errorSince = 0;
    let stallSince = 0;
    let lastRetryAt = 0;
    let lastReloadAt = 0;
    let lastError = null;
    let tickTimer = null;

    const reload = (reason) => {
      const now = Date.now();
      lastReloadAt = now;
      lastRetryAt = now;
      if (stallSince) stallSince = now;
      log.debug(`Recargando transmisión (${reason})`);
      player
        .replaceAsync({ ...initialSource, ...currentSource })
        .then(() => player.play())
        .catch(() => {});
    };

    const tick = () => {
      const now = Date.now();

      if (recovering) {
        if (!mayGiveUp()) errorSince = now;
        if (player.status === 'error' && now - lastRetryAt >= RETRY_INTERVAL_MS) reload('error de reproducción');
        if (!gaveUp && now - errorSince >= GIVE_UP_AFTER_MS) {
          gaveUp = true;
          log.error(`Sin recuperación tras ${GIVE_UP_AFTER_MS / 1000} s`);
          notifyGiveUp(lastError);
        }
        return;
      }

      if (stallSince && now - stallSince >= STALL_RELOAD_AFTER_MS && now - lastReloadAt >= RELOAD_COOLDOWN_MS) {
        reload(`cargando hace más de ${STALL_RELOAD_AFTER_MS / 1000} s`);
      }
    };

    const keepTicking = () => {
      clearTimeout(tickTimer);
      if (!recovering && !stallSince) return;
      tickTimer = setTimeout(() => {
        tick();
        keepTicking();
      }, TICK_MS);
    };

    const markRecovered = () => {
      if (!recovering) return;
      recovering = false;
      gaveUp = false;
      setIsRecovering(false);
      log.debug('Transmisión recuperada');
      notifyRecovered();
    };

    const sourceSub = player.addListener('sourceChange', ({ source }) => {
      if (source?.uri) currentSource = { uri: source.uri, contentType: source.contentType };
    });

    const statusSub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay') {
        stallSince = 0;
        markRecovered();
        keepTicking();
        return;
      }

      if (status === 'loading') {
        if (hasPlayed && !stallSince) stallSince = Date.now();
        keepTicking();
        return;
      }

      if (status !== 'error') return;
      lastError = error?.message ?? 'La transmisión se detuvo';
      log.warn('Error de reproducción, reconectando:', lastError);
      stallSince = 0;
      if (!recovering) {
        recovering = true;
        errorSince = Date.now();
        lastRetryAt = Date.now();
        setIsRecovering(true);
      }
      keepTicking();
    });

    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (!isPlaying) return;
      hasPlayed = true;
      stallSince = 0;
      markRecovered();
    });

    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      tick();
      if (recovering || !player.isLive || currentTime >= 0) return;
      if (Date.now() - lastReloadAt < RELOAD_COOLDOWN_MS) return;
      reload(`fuera de la ventana en vivo (${currentTime.toFixed(1)} s)`);
    });

    return () => {
      clearTimeout(tickTimer);
      sourceSub.remove();
      statusSub.remove();
      playingSub.remove();
      timeSub.remove();
    };
  }, [player, initialSource]);

  return { isRecovering };
}
