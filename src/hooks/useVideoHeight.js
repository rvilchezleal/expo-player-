import { useEffect, useState } from 'react';

export default function useVideoHeight(player) {
  const [height, setHeight] = useState(() => player.videoTrack?.size?.height ?? null);

  useEffect(() => {
    const sub = player.addListener('videoTrackChange', ({ videoTrack }) => setHeight(videoTrack?.size?.height ?? null));
    return () => sub.remove();
  }, [player]);

  return height;
}
