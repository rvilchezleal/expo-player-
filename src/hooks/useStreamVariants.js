import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { STREAM_URL, videoSource } from '../config/stream';
import { buildLocalMaster, parseMaster, qualityHeights, writeLocalMaster } from '../utils/hlsMaster';
import { fetchText } from '../utils/http';
import { createLogger } from '../utils/logger';
import { buildQualityOptions } from '../utils/quality';

const log = createLogger('Variantes');

export default function useStreamVariants(player) {
  const [masterInfo, setMasterInfo] = useState(null);
  const [burnedSubsOn, setBurnedSubsOn] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const localSourceActiveRef = useRef(false);

  const playVariant = useCallback(
    async (master, { subtitled, quality }) => {
      const height = quality === 'auto' ? null : Number(quality);
      const text = buildLocalMaster(master, { subtitled, height });
      if (!text) return false;
      const uri = writeLocalMaster(`master_${subtitled ? 'subtitulado' : 'limpio'}_${quality}.m3u8`, text);
      localSourceActiveRef.current = true;
      await player.replaceAsync({ ...videoSource, uri });
      player.play();
      return true;
    },
    [player]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const master = parseMaster(await fetchText(STREAM_URL), STREAM_URL);
        if (cancelled) return;
        log.debug('Variantes:', master.variants.map(({ height, subtitled }) => `${height}p${subtitled ? ' sub' : ''}`).join(', '));
        setMasterInfo(master);
        if (master.variants.some((variant) => variant.subtitled)) {
          await playVariant(master, { subtitled: false, quality: 'auto' });
        }
      } catch (error) {
        log.warn('No se pudo analizar el master:', error?.message ?? error);
      }
    })();

    const errorSub = player.addListener('statusChange', ({ status }) => {
      if (status !== 'error' || !localSourceActiveRef.current) return;
      log.warn('Falló el master local, volviendo al enlace original');
      localSourceActiveRef.current = false;
      setMasterInfo(null);
      setBurnedSubsOn(false);
      setSelectedQuality('auto');
      player.replaceAsync(videoSource).then(() => player.play()).catch(() => {});
    });

    return () => {
      cancelled = true;
      errorSub.remove();
    };
  }, [player, playVariant]);

  const hasBurnedSubs =
    !!masterInfo?.variants.some((variant) => variant.subtitled) && !!masterInfo?.variants.some((variant) => !variant.subtitled);

  const qualityOptions = useMemo(
    () => buildQualityOptions(qualityHeights(masterInfo, burnedSubsOn)),
    [masterInfo, burnedSubsOn]
  );

  const selectQuality = useCallback(
    async (qualityKey) => {
      if (qualityKey === selectedQuality) return;
      if (!masterInfo) {
        log.warn('El master aún no se analizó; no se puede cambiar la calidad');
        return;
      }
      const previous = selectedQuality;
      setSelectedQuality(qualityKey);
      try {
        const ok = await playVariant(masterInfo, { subtitled: burnedSubsOn, quality: qualityKey });
        if (!ok) setSelectedQuality(previous);
      } catch (error) {
        log.error('No se pudo cambiar la calidad:', error?.message ?? error);
        setSelectedQuality(previous);
      }
    },
    [burnedSubsOn, masterInfo, playVariant, selectedQuality]
  );

  const setBurnedSubtitles = useCallback(
    async (enabled) => {
      if (!hasBurnedSubs) return;
      const quality =
        selectedQuality !== 'auto' && qualityHeights(masterInfo, enabled).includes(Number(selectedQuality))
          ? selectedQuality
          : 'auto';
      setBurnedSubsOn(enabled);
      try {
        await playVariant(masterInfo, { subtitled: enabled, quality });
        setSelectedQuality(quality);
      } catch (error) {
        log.error('No se pudo cambiar de variante:', error?.message ?? error);
        setBurnedSubsOn(!enabled);
      }
    },
    [hasBurnedSubs, masterInfo, playVariant, selectedQuality]
  );

  return { masterInfo, burnedSubsOn, hasBurnedSubs, selectedQuality, qualityOptions, selectQuality, setBurnedSubtitles };
}
