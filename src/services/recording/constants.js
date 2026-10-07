export const RECORDING_LIMIT_SECONDS = 300;
export const MIN_FREE_BYTES = 2 * 1024 ** 3;
export const AES_BLOCK_BYTES = 16;
export const SEGMENT_EXTENSION = '.airtek';
export const INFO_FILE = 'info.json';
export const MASTER_FILE = 'master.m3u8';
export const THUMBNAIL_FILE = 'thumbnail.airtek';
export const LEGACY_THUMBNAIL_FILE = 'thumbnail.jpg';
export const VIDEO_TRACK = 'video';
export const AUDIO_TRACK = 'audio';

export const playlistFileFor = (trackName) => `${trackName}.m3u8`;
