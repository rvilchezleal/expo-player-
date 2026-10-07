import { Directory, File } from 'expo-file-system';

import AirtekCrypto from '../../../modules/airtek-crypto';
import { bytesToBase64, hexBytes, utf8Bytes } from '../../utils/base64';
import { createLogger } from '../../utils/logger';
import {
  AES_BLOCK_BYTES,
  AUDIO_TRACK,
  INFO_FILE,
  LEGACY_THUMBNAIL_FILE,
  MASTER_FILE,
  THUMBNAIL_FILE,
  VIDEO_TRACK,
  playlistFileFor,
} from './constants';
import { finalizePlaylistText, firstSegment, keyPlaceholderFor } from './playlist';
import { directoryUri, forgetKey, readJson, readKey, recordingDirectory, recordingsDirectory, writeText } from './storage';

const log = createLogger('Biblioteca');
const thumbnailCache = new Map();
const pendingThumbnails = new Map();

const toDataUri = (mimeType, bytes) => `data:${mimeType};base64,${bytesToBase64(bytes)}`;

async function repairInterrupted(directory, info) {
  for (const name of [VIDEO_TRACK, AUDIO_TRACK].map(playlistFileFor)) {
    const playlist = new File(directory, name);
    if (playlist.exists) writeText(directory, name, finalizePlaylistText(await playlist.text()));
  }
  const repaired = { ...info, status: 'interrupted' };
  writeText(directory, INFO_FILE, JSON.stringify(repaired));
  return repaired;
}

export async function listRecordings(activeId) {
  const items = [];
  for (const entry of recordingsDirectory().list()) {
    if (!(entry instanceof Directory)) continue;
    try {
      let info = await readJson(entry, INFO_FILE);
      if (!info) continue;
      if (info.status === 'recording' && info.id !== activeId) info = await repairInterrupted(entry, info);
      items.push({ ...info, uri: new File(entry, MASTER_FILE).uri, bytes: entry.size ?? 0 });
    } catch (error) {
      log.warn('Grabación ilegible:', entry.name, error?.message ?? error);
    }
  }
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function deleteRecording(id) {
  const directory = recordingDirectory(id);
  if (directory.exists) directory.delete();
  thumbnailCache.delete(id);
  forgetKey(id);
}

export function peekThumbnail(id) {
  return thumbnailCache.get(id) ?? null;
}

async function createMissingThumbnail(directory, keyHex) {
  const playlist = new File(directory, playlistFileFor(VIDEO_TRACK));
  if (!playlist.exists) return null;
  const segment = firstSegment(await playlist.text());
  if (!segment) return null;

  const thumbnail = keyHex
    ? { file: THUMBNAIL_FILE, iv: AirtekCrypto.randomBytesHex(AES_BLOCK_BYTES) }
    : { file: LEGACY_THUMBNAIL_FILE, iv: null };
  const created = await AirtekCrypto.createThumbnailAsync(
    `${directoryUri(directory)}${segment.path}`,
    keyHex,
    keyHex ? segment.iv : null,
    new File(directory, thumbnail.file).uri,
    keyHex,
    thumbnail.iv
  );
  if (!created) return null;

  const info = await readJson(directory, INFO_FILE);
  if (info) writeText(directory, INFO_FILE, JSON.stringify({ ...info, thumbnail }));
  return thumbnail;
}

async function resolveThumbnail(recording) {
  const directory = recordingDirectory(recording.id);
  const keyHex = recording.encrypted ? await readKey(recording.id) : null;
  if (recording.encrypted && !keyHex) return null;

  const thumbnail = recording.thumbnail ?? (await createMissingThumbnail(directory, keyHex));
  if (!thumbnail) return null;
  const file = new File(directory, thumbnail.file);
  if (!file.exists) return null;

  const uri = thumbnail.iv
    ? `data:image/jpeg;base64,${await AirtekCrypto.decryptToBase64Async(file.uri, keyHex, thumbnail.iv)}`
    : file.uri;
  thumbnailCache.set(recording.id, uri);
  return uri;
}

export function loadThumbnail(recording) {
  if (thumbnailCache.has(recording.id)) return Promise.resolve(thumbnailCache.get(recording.id));
  if (!pendingThumbnails.has(recording.id)) {
    const pending = resolveThumbnail(recording).finally(() => pendingThumbnails.delete(recording.id));
    pendingThumbnails.set(recording.id, pending);
  }
  return pendingThumbnails.get(recording.id);
}

export async function buildPlaybackSource(recording) {
  const directory = recordingDirectory(recording.id);
  const masterFile = new File(directory, MASTER_FILE);
  if (!recording.encrypted) return { uri: masterFile.uri, contentType: 'hls' };

  const keyHex = await readKey(recording.id);
  if (!keyHex || keyHex.length !== AES_BLOCK_BYTES * 2) throw new Error('No se encontró la clave de esta grabación');

  const baseUri = directoryUri(directory);
  const keyUri = toDataUri('application/octet-stream', hexBytes(keyHex));
  const placeholder = keyPlaceholderFor(recording.id);
  const playlistUri = (text) => toDataUri('application/vnd.apple.mpegurl', utf8Bytes(text));

  const resolveMedia = async (name) => {
    const text = await new File(directory, name).text();
    const lines = text.split(/\r?\n/).map((line) => {
      if (!line || line.startsWith('#')) return line.split(placeholder).join(keyUri);
      return `${baseUri}${line}`;
    });
    return playlistUri(lines.join('\n'));
  };

  const masterText = await masterFile.text();
  const masterLines = [];
  for (const line of masterText.split(/\r?\n/)) {
    const referenced = line.match(/URI="([^"]+\.m3u8)"/)?.[1];
    if (referenced) masterLines.push(line.replace(`URI="${referenced}"`, `URI="${await resolveMedia(referenced)}"`));
    else if (line && !line.startsWith('#')) masterLines.push(await resolveMedia(line));
    else masterLines.push(line);
  }
  return { uri: playlistUri(masterLines.join('\n')), contentType: 'hls' };
}
