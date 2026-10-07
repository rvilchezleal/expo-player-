import { useEffect, useEffectEvent } from 'react';

import { parseMaster } from '../utils/hlsMaster';
import { fetchText } from '../utils/http';
import { createLogger } from '../utils/logger';

const POLL_MS = 4000;
const MIN_STALE_MS = 15000;
const STALE_TARGET_DURATIONS = 2;

const log = createLogger('Heartbeat');
const fetchPlaylist = (url) => fetchText(url, { bustCache: true });

export default function useStreamHeartbeat(url, { canStop, onStopped, onResumed }) {
  const shouldStop = useEffectEvent((seenAdvancing) => canStop(seenAdvancing));
  const notifyStopped = useEffectEvent(() => onStopped());
  const notifyResumed = useEffectEvent(() => onResumed());

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    let mediaUrl = null;
    let lastSignature = null;
    let lastChangeAt = Date.now();
    let staleAfterMs = MIN_STALE_MS;
    let seenAdvancing = false;
    let ended = false;
    let stopped = false;

    const readMediaPlaylist = async () => {
      if (mediaUrl) return fetchPlaylist(mediaUrl);
      const text = await fetchPlaylist(url);
      if (!text.includes('#EXT-X-STREAM-INF')) {
        mediaUrl = url;
        return text;
      }
      mediaUrl = parseMaster(text, url).variants[0]?.uri ?? url;
      return fetchPlaylist(mediaUrl);
    };

    const poll = async () => {
      try {
        const text = await readMediaPlaylist();
        const sequence = text.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/)?.[1] ?? '0';
        const segments = text.match(/^[^#\s].*$/gm) ?? [];
        const targetDuration = Number(text.match(/#EXT-X-TARGETDURATION:(\d+)/)?.[1]) || 0;
        staleAfterMs = Math.max(MIN_STALE_MS, targetDuration * STALE_TARGET_DURATIONS * 1000);
        ended = text.includes('#EXT-X-ENDLIST');

        const signature = `${sequence}|${segments[segments.length - 1] ?? ''}`;
        if (signature !== lastSignature) {
          if (lastSignature !== null) seenAdvancing = true;
          lastSignature = signature;
          lastChangeAt = Date.now();
          if (stopped && !ended && !cancelled) {
            stopped = false;
            log.debug('El servidor volvió a publicar la transmisión');
            notifyResumed();
          }
        }
      } catch {
        mediaUrl = null;
      }

      if (cancelled) return;

      const staleFor = Date.now() - lastChangeAt;
      if (!stopped && (ended || staleFor >= staleAfterMs) && shouldStop(seenAdvancing)) {
        stopped = true;
        log.error(ended ? 'El servidor finalizó la transmisión' : `La playlist no avanza hace ${Math.round(staleFor / 1000)} s`);
        notifyStopped();
      }

      timer = setTimeout(poll, POLL_MS);
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url]);
}
