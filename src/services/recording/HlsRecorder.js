import { Directory, File } from 'expo-file-system';

import AirtekCrypto from '../../../modules/airtek-crypto';
import { fetchText, withRetry } from '../../utils/http';
import { createLogger } from '../../utils/logger';
import {
  AES_BLOCK_BYTES,
  AUDIO_TRACK,
  INFO_FILE,
  MASTER_FILE,
  RECORDING_LIMIT_SECONDS,
  SEGMENT_EXTENSION,
  THUMBNAIL_FILE,
  VIDEO_TRACK,
  playlistFileFor,
} from './constants';
import { buildMasterPlaylist, buildMediaPlaylist, keyPlaceholderFor, parseMediaPlaylist } from './playlist';
import { forgetKey, recordingsDirectory, saveKey, writeText } from './storage';

const GIVE_UP_AFTER_ERRORS_MS = 30000;
const MIN_POLL_MS = 1000;
const DEFAULT_TARGET_DURATION = 4;

const log = createLogger('Grabación');
const pad = (value, size = 2) => String(value).padStart(size, '0');
const fetchPlaylist = (url) => withRetry(() => fetchText(url, { bustCache: true }));

function recordingId(date, height) {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  return `grabacion_${height ?? 'auto'}p_${day}_${time}`;
}

export class HlsRecorder {
  constructor({ tracks, onProgress, onFinish }) {
    this.tracks = tracks;
    this.onProgress = onProgress;
    this.onFinish = onFinish;
    this.stopped = false;
    this.timer = null;
    this.persistedSegments = -1;
  }

  get recordedSeconds() {
    return this.videoTrack ? this.videoTrack.segments.reduce((sum, segment) => sum + segment.duration, 0) : 0;
  }

  get segmentCount() {
    return this.trackList.reduce((count, track) => count + track.segments.length, 0);
  }

  async start() {
    const createdAt = new Date();
    this.id = recordingId(createdAt, this.tracks.video.height);
    this.directory = new Directory(recordingsDirectory(), this.id);
    this.directory.create({ intermediates: true });
    this.info = {
      id: this.id,
      createdAt: createdAt.toISOString(),
      status: 'recording',
      duration: 0,
      height: this.tracks.video.height,
      language: this.tracks.audio?.language ?? null,
      heights: [this.tracks.video.height].filter(Boolean),
      languages: [this.tracks.audio?.language].filter(Boolean),
      encrypted: true,
    };

    this.videoTrack = this.createTrack(VIDEO_TRACK, this.tracks.video);
    this.trackList = [this.videoTrack];
    if (this.tracks.audio?.url) {
      this.audioTrack = this.createTrack(AUDIO_TRACK, this.tracks.audio);
      this.trackList.push(this.audioTrack);
    }

    let startSequence;
    try {
      this.keyHex = AirtekCrypto.randomBytesHex(AES_BLOCK_BYTES);
      await saveKey(this.id, this.keyHex);
      const playlists = await Promise.all(
        this.trackList.map(async (track) => parseMediaPlaylist(await fetchPlaylist(track.url), track.url))
      );
      startSequence = Math.min(
        ...playlists.map((playlist) => playlist.segments[playlist.segments.length - 1]?.sequence ?? Infinity)
      );
      if (!Number.isFinite(startSequence)) throw new Error('La transmisión no tiene segmentos disponibles');
    } catch (error) {
      if (this.stopped) return;
      this.discard();
      throw error;
    }
    if (this.stopped) return;
    this.trackList.forEach((track) => {
      track.nextSequence = startSequence;
    });

    writeText(this.directory, MASTER_FILE, buildMasterPlaylist(this.tracks));
    this.persist(false);
    log.debug('Iniciada', this.id);
    this.started = true;
    this.poll();
  }

  createTrack(name, source) {
    const directory = new Directory(this.directory, name);
    directory.create();
    return {
      name,
      url: source.url,
      directory,
      segments: [],
      nextSequence: null,
      lastSuccessAt: Date.now(),
      targetDuration: DEFAULT_TARGET_DURATION,
      generation: 0,
      switched: false,
    };
  }

  stop() {
    this.finish(this.recordedSeconds > 0 ? 'complete' : 'empty');
  }

  switchTracks(tracks) {
    if (this.stopped || !this.videoTrack) return;
    const changes = [
      [this.videoTrack, tracks.video?.url],
      [this.audioTrack, tracks.audio?.url],
    ].filter(([track, url]) => track && url && url !== track.url);
    if (changes.length === 0) return;

    for (const [track, url] of changes) {
      log.debug(`Pista ${track.name} cambia de variante`);
      track.url = url;
      track.generation += 1;
      track.switched = true;
    }
    if (tracks.video?.height && !this.info.heights.includes(tracks.video.height)) {
      this.info.heights.push(tracks.video.height);
    }
    if (tracks.audio?.language && !this.info.languages.includes(tracks.audio.language)) {
      this.info.languages.push(tracks.audio.language);
    }
    this.pollNow();
  }

  pollNow() {
    if (this.stopped || !this.started) return;
    if (this.polling) {
      this.pollAgain = true;
      return;
    }
    clearTimeout(this.timer);
    this.poll();
  }

  persist(finished) {
    const keyUri = keyPlaceholderFor(this.id);
    for (const track of this.trackList) {
      writeText(this.directory, playlistFileFor(track.name), buildMediaPlaylist(track, finished, keyUri));
    }
    this.info.duration = Math.round(this.recordedSeconds);
    writeText(this.directory, INFO_FILE, JSON.stringify(this.info));
    this.persistedSegments = this.segmentCount;
  }

  async pollTrack(track) {
    const generation = track.generation;
    const url = track.url;
    const playlist = parseMediaPlaylist(await fetchPlaylist(url), url);
    if (track.generation !== generation) return playlist;
    track.targetDuration = playlist.targetDuration;

    if (track.switched && playlist.segments.length > 0) {
      const first = playlist.segments[0].sequence;
      const last = playlist.segments[playlist.segments.length - 1].sequence;
      if (track.nextSequence < first) track.nextSequence = first;
      else if (track.nextSequence > last + 1) track.nextSequence = last;
    }

    for (const segment of playlist.segments) {
      if (this.stopped || track.generation !== generation) return playlist;
      if (segment.sequence < track.nextSequence) continue;
      if (track === this.audioTrack && segment.sequence >= this.videoTrack.nextSequence && this.isAtLimit()) {
        return playlist;
      }
      const discontinuity = track.segments.length > 0 && (track.switched || segment.sequence > track.nextSequence);
      const file = `seg_${pad(track.segments.length, 5)}${SEGMENT_EXTENSION}`;
      const iv = AirtekCrypto.randomBytesHex(AES_BLOCK_BYTES);
      const destination = new File(track.directory, file).uri;
      await withRetry(() => AirtekCrypto.downloadEncryptedAsync(segment.url, destination, this.keyHex, iv));
      if (this.stopped) return playlist;
      if (track.generation !== generation) {
        try {
          new File(track.directory, file).delete();
        } catch {}
        return playlist;
      }
      track.segments.push({ file, duration: segment.duration, discontinuity, iv });
      if (track === this.videoTrack && track.segments.length === 1) this.captureThumbnail(destination, iv);
      track.nextSequence = segment.sequence + 1;
      track.switched = false;
      if (track === this.videoTrack && this.isAtLimit()) return playlist;
    }
    return playlist;
  }

  isAtLimit() {
    return this.recordedSeconds >= RECORDING_LIMIT_SECONDS;
  }

  async poll() {
    if (this.stopped) return;
    this.polling = true;
    this.pollAgain = false;
    let streamEnded = false;

    await Promise.all(
      this.trackList.map(async (track) => {
        try {
          const playlist = await this.pollTrack(track);
          track.lastSuccessAt = Date.now();
          if (playlist.ended) streamEnded = true;
        } catch (error) {
          log.warn(`Descarga de ${track.name} fallida, se reintenta en la siguiente vuelta:`, error?.message ?? error);
        }
      })
    );
    this.polling = false;
    if (this.stopped) return;

    if (this.segmentCount !== this.persistedSegments) this.persist(false);
    this.onProgress?.(this.recordedSeconds);

    if (this.isAtLimit() || streamEnded) return this.finish('complete');
    const failing = this.trackList.some((track) => Date.now() - track.lastSuccessAt > GIVE_UP_AFTER_ERRORS_MS);
    if (failing) return this.finish(this.recordedSeconds > 0 ? 'interrupted' : 'empty');

    const delay = this.pollAgain ? 0 : Math.max(MIN_POLL_MS, (this.videoTrack.targetDuration * 1000) / 2);
    this.timer = setTimeout(() => this.poll(), delay);
  }

  captureThumbnail(segmentUri, segmentIv) {
    const keyHex = this.keyHex;
    const iv = AirtekCrypto.randomBytesHex(AES_BLOCK_BYTES);
    const destination = new File(this.directory, THUMBNAIL_FILE).uri;
    AirtekCrypto.createThumbnailAsync(segmentUri, keyHex, segmentIv, destination, keyHex, iv)
      .then((created) => {
        if (!created || this.discarded) return;
        this.info.thumbnail = { file: THUMBNAIL_FILE, iv };
        if (this.stopped) writeText(this.directory, INFO_FILE, JSON.stringify(this.info));
      })
      .catch((error) => log.warn('No se pudo crear la miniatura:', error?.message ?? error));
  }

  discard() {
    this.discarded = true;
    this.stopped = true;
    clearTimeout(this.timer);
    this.keyHex = null;
    try {
      this.directory?.delete();
    } catch {}
    if (this.id) forgetKey(this.id);
  }

  finish(status) {
    if (this.stopped) return;

    if (status === 'empty') {
      this.discard();
      log.debug('Grabación vacía descartada');
    } else {
      this.stopped = true;
      clearTimeout(this.timer);
      this.keyHex = null;
      this.info.status = status;
      this.persist(true);
      log.debug(`Grabación ${status === 'complete' ? 'guardada' : 'interrumpida'}`, this.id, `${Math.round(this.recordedSeconds)} s`);
    }
    this.onFinish?.({ id: this.id, status, seconds: this.recordedSeconds });
  }
}
