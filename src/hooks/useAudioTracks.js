import { useCallback, useEffect, useMemo, useState } from 'react';

import { AUDIO_LANGUAGES, findAudioTrack, matchesLanguage } from '../utils/audioLanguages';
import { createLogger } from '../utils/logger';

const log = createLogger('Audio');

export default function useAudioTracks(player) {
  const [tracks, setTracks] = useState(() => player.availableAudioTracks ?? []);
  const [current, setCurrent] = useState(() => player.audioTrack ?? null);
  const [preferredCode, setPreferredCode] = useState(null);

  useEffect(() => {
    const availableSub = player.addListener('availableAudioTracksChange', ({ availableAudioTracks }) => {
      setTracks(availableAudioTracks);
      const preferred = preferredCode && findAudioTrack(availableAudioTracks, preferredCode);
      if (preferred) player.audioTrack = preferred;
    });
    const changeSub = player.addListener('audioTrackChange', ({ audioTrack }) => setCurrent(audioTrack));

    return () => {
      availableSub.remove();
      changeSub.remove();
    };
  }, [player, preferredCode]);

  const options = useMemo(
    () =>
      AUDIO_LANGUAGES.map((language) => ({
        ...language,
        available: !!findAudioTrack(tracks, language.code),
        active: matchesLanguage(current, language.code),
      })),
    [tracks, current]
  );

  const activeOption = options.find((option) => option.active) ?? null;

  const select = useCallback(
    (code) => {
      const track = findAudioTrack(tracks, code);
      if (!track) {
        log.warn(`No hay pista de audio "${code}" en el stream`);
        return;
      }
      setPreferredCode(code);
      player.audioTrack = track;
      setCurrent(track);
    },
    [player, tracks]
  );

  return { options, activeOption, activeCode: activeOption?.code ?? preferredCode, select };
}
