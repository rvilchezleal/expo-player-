import { useCallback, useEffect, useState } from 'react';

export default function useSubtitleTracks(player) {
  const [tracks, setTracks] = useState([]);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    const availableSub = player.addListener('availableSubtitleTracksChange', ({ availableSubtitleTracks }) =>
      setTracks(availableSubtitleTracks)
    );
    const changeSub = player.addListener('subtitleTrackChange', ({ subtitleTrack }) => setCurrent(subtitleTrack));

    return () => {
      availableSub.remove();
      changeSub.remove();
    };
  }, [player]);

  const select = useCallback(
    (track) => {
      player.subtitleTrack = track;
      setCurrent(track);
    },
    [player]
  );

  return { tracks, current, select };
}
