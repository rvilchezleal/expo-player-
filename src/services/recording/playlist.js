import { matchesLanguage } from '../../utils/audioLanguages';
import { resolvePlaylistUrl } from '../../utils/hlsMaster';
import { AUDIO_TRACK, VIDEO_TRACK, playlistFileFor } from './constants';

const KEY_URI_SCHEME = 'airtek-key://';
const PREFERRED_HEIGHT = 1080;

export const keyPlaceholderFor = (id) => `${KEY_URI_SCHEME}${id}`;

const attribute = (line, name) => line?.match(new RegExp(`${name}="([^"]+)"`))?.[1] ?? null;

export function parseMediaPlaylist(text, playlistUrl) {
  const firstSequence = Number(text.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/)?.[1] ?? 0);
  const targetDuration = Number(text.match(/#EXT-X-TARGETDURATION:(\d+)/)?.[1] ?? 4);
  const segments = [];
  let pendingDuration = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('#EXTINF:')) {
      pendingDuration = parseFloat(line.slice('#EXTINF:'.length));
    } else if (line && !line.startsWith('#') && pendingDuration !== null) {
      segments.push({
        sequence: firstSequence + segments.length,
        duration: pendingDuration,
        url: resolvePlaylistUrl(line, playlistUrl),
      });
      pendingDuration = null;
    }
  }
  return { targetDuration, segments, ended: text.includes('#EXT-X-ENDLIST') };
}

export function selectRecordingTracks({ streamUrl, master, subtitled, audioCode, quality }) {
  if (!master || master.variants.length === 0) {
    return { video: { url: streamUrl, streamInf: null, height: null }, audio: null };
  }

  const sameVersion = master.variants.filter((variant) => variant.subtitled === subtitled);
  const candidates = sameVersion.length ? sameVersion : master.variants;
  const preferredHeight = quality && quality !== 'auto' ? Number(quality) : PREFERRED_HEIGHT;
  const video =
    candidates.find((variant) => variant.height === preferredHeight) ??
    [...candidates].sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];

  const audioLines = master.shared.filter((line) => line.startsWith('#EXT-X-MEDIA') && line.includes('TYPE=AUDIO'));
  const languageOf = (line) => attribute(line, 'LANGUAGE')?.toLowerCase() ?? '';
  const audioLine =
    audioLines.find((line) => audioCode && matchesLanguage({ language: languageOf(line) }, audioCode)) ??
    audioLines.find((line) => line.includes('DEFAULT=YES')) ??
    audioLines[0];

  return {
    video: { url: video.uri, streamInf: video.inf, height: video.height },
    audio: audioLine
      ? { url: attribute(audioLine, 'URI'), mediaLine: audioLine, language: languageOf(audioLine) }
      : null,
  };
}

export function buildMediaPlaylist(track, finished, keyUri) {
  const maxDuration = Math.max(1, ...track.segments.map((segment) => segment.duration));
  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:6',
    `#EXT-X-TARGETDURATION:${Math.ceil(maxDuration)}`,
    '#EXT-X-MEDIA-SEQUENCE:0',
    `#EXT-X-PLAYLIST-TYPE:${finished ? 'VOD' : 'EVENT'}`,
    '#EXT-X-INDEPENDENT-SEGMENTS',
  ];
  for (const segment of track.segments) {
    if (segment.discontinuity) lines.push('#EXT-X-DISCONTINUITY');
    if (segment.iv) lines.push(`#EXT-X-KEY:METHOD=AES-128,URI="${keyUri}",IV=0x${segment.iv}`);
    lines.push(`#EXTINF:${segment.duration.toFixed(6)},`, `${track.name}/${segment.file}`);
  }
  if (finished) lines.push('#EXT-X-ENDLIST');
  return `${lines.join('\n')}\n`;
}

export function buildMasterPlaylist(tracks) {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:6'];
  if (tracks.audio) {
    lines.push(
      tracks.audio.mediaLine
        .replace(/URI="[^"]+"/, `URI="${playlistFileFor(AUDIO_TRACK)}"`)
        .replace(/DEFAULT=NO/, 'DEFAULT=YES')
    );
  }
  const streamInf = tracks.video.streamInf ?? '#EXT-X-STREAM-INF:BANDWIDTH=5000000';
  lines.push(tracks.audio ? streamInf : streamInf.replace(/,AUDIO="[^"]+"/, ''), playlistFileFor(VIDEO_TRACK));
  return `${lines.join('\n')}\n`;
}

export function finalizePlaylistText(text) {
  if (text.includes('#EXT-X-ENDLIST')) return text;
  return `${text.replace('#EXT-X-PLAYLIST-TYPE:EVENT', '#EXT-X-PLAYLIST-TYPE:VOD').trimEnd()}\n#EXT-X-ENDLIST\n`;
}

export function firstSegment(text) {
  let iv = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('#EXT-X-KEY')) iv = line.match(/IV=0x([0-9a-f]+)/i)?.[1] ?? null;
    else if (line && !line.startsWith('#')) return { path: line, iv };
  }
  return null;
}
