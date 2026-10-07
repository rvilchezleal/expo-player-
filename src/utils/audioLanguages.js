export const AUDIO_LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'Inglés' },
];

export function matchesLanguage(track, code) {
  const lang = track?.language?.toLowerCase() ?? '';
  const iso3 = { es: 'spa', en: 'eng' }[code];
  return lang === code || lang.startsWith(`${code}-`) || lang === iso3;
}

export function findAudioTrack(tracks, code) {
  return tracks.find((track) => matchesLanguage(track, code)) ?? null;
}
