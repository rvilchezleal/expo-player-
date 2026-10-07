import { useEffect } from 'react';

import { createLogger } from '../utils/logger';

const RESUME_JUMP_AFTER_MS = 2000;
const SEEK_COOLDOWN_MS = 10000;

const log = createLogger('VivoEdge');

export function seekToLiveEdge(player) {
  if (typeof player.seekToLiveEdge === 'function') {
    player.seekToLiveEdge();
    return;
  }
  if (player.isLive && player.duration > 0) player.currentTime = player.duration;
}

export default function useLiveEdgeSync(player) {
  useEffect(() => {
    let pendingSourceSync = false;
    let stoppedAt = 0;
    let lastSeekAt = 0;

    const jumpToLive = (reason) => {
      lastSeekAt = Date.now();
      log.debug(`Saltando al vivo (${reason})`);
      seekToLiveEdge(player);
    };

    const sourceSub = player.addListener('sourceChange', () => {
      pendingSourceSync = true;
    });

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status !== 'readyToPlay' || !pendingSourceSync) return;
      pendingSourceSync = false;
      stoppedAt = 0;
      if (player.isLive) jumpToLive('fuente nueva lista');
      player.play();
    });

    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (!isPlaying) {
        stoppedAt = Date.now();
        return;
      }
      const stoppedSince = stoppedAt;
      const stoppedFor = stoppedSince ? Date.now() - stoppedSince : 0;
      stoppedAt = 0;
      if (!player.isLive || stoppedFor < RESUME_JUMP_AFTER_MS) return;
      if (lastSeekAt > stoppedSince && Date.now() - lastSeekAt < SEEK_COOLDOWN_MS) return;
      jumpToLive(`reanudado tras ${(stoppedFor / 1000).toFixed(1)} s detenido`);
    });

    return () => {
      sourceSub.remove();
      statusSub.remove();
      playingSub.remove();
    };
  }, [player]);
}
