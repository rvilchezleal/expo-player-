import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import {
  HlsRecorder,
  MIN_FREE_BYTES,
  RECORDING_LIMIT_SECONDS,
  availableBytes,
  hasEnoughSpace,
  selectRecordingTracks,
} from '../services/recording';
import { formatBytes } from '../utils/format';
import { createLogger } from '../utils/logger';

const SAVED_NOTICE_MS = 3000;
const SWITCH_SETTLE_MS = 400;

const log = createLogger('Grabación');

export default function useRecorder({ streamUrl, selection }) {
  const [status, setStatus] = useState('idle');
  const [seconds, setSeconds] = useState(0);
  const [activeId, setActiveId] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [showSaved, setShowSaved] = useState(false);
  const [lastAudioCode, setLastAudioCode] = useState(selection.audioCode ?? null);
  const recorderRef = useRef(null);

  if (selection.audioCode && selection.audioCode !== lastAudioCode) setLastAudioCode(selection.audioCode);

  const { master, subtitled, quality } = selection;
  const audioCode = selection.audioCode ?? lastAudioCode;
  const tracks = useMemo(
    () => selectRecordingTracks({ streamUrl, master, subtitled, quality, audioCode }),
    [streamUrl, master, subtitled, quality, audioCode]
  );

  useEffect(() => {
    if (!activeId) return undefined;
    const timer = setTimeout(() => recorderRef.current?.switchTracks(tracks), SWITCH_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [activeId, tracks]);

  useEffect(() => {
    if (!showSaved) return undefined;
    const timer = setTimeout(() => setShowSaved(false), SAVED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [showSaved]);

  useEffect(() => {
    const recorder = recorderRef;
    return () => recorder.current?.stop();
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current) return;

    if (!hasEnoughSpace()) {
      Alert.alert(
        'Espacio insuficiente',
        `Para grabar necesitas al menos ${formatBytes(MIN_FREE_BYTES)} libres en el dispositivo. Ahora tienes ${formatBytes(availableBytes())}.`,
        [{ text: 'Entendido' }]
      );
      return;
    }

    const recorder = new HlsRecorder({
      tracks,
      onProgress: (recorded) => {
        if (recorderRef.current !== recorder) return;
        setStatus('recording');
        setSeconds(recorded);
      },
      onFinish: (result) => {
        if (recorderRef.current === recorder) recorderRef.current = null;
        setStatus('idle');
        setSeconds(0);
        setActiveId(null);
        setLastResult(result);
        if (result.status !== 'empty') setShowSaved(true);
      },
    });
    recorderRef.current = recorder;
    setShowSaved(false);
    setSeconds(0);
    setStatus('starting');

    const starting = recorder.start();
    setActiveId(recorder.id ?? null);
    try {
      await starting;
    } catch (error) {
      if (recorderRef.current !== recorder) return;
      recorderRef.current = null;
      setStatus('idle');
      setActiveId(null);
      log.warn('No se pudo iniciar la grabación:', error?.message ?? error);
      Alert.alert(
        'No se pudo iniciar la grabación',
        'No fue posible conectar con la transmisión. Inténtalo de nuevo en unos segundos.',
        [{ text: 'Entendido' }]
      );
    }
  }, [tracks]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  return {
    status,
    seconds,
    limitSeconds: RECORDING_LIMIT_SECONDS,
    isRecording: status !== 'idle',
    activeId,
    lastResult,
    showSaved,
    start,
    stop,
  };
}
