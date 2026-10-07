import { Directory, File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import { MIN_FREE_BYTES } from './constants';

const RECORDINGS_FOLDER = 'grabaciones';
const NOMEDIA_FILE = '.nomedia';
const KEY_ALIAS_PREFIX = 'airtek.key.';

const keyAlias = (id) => `${KEY_ALIAS_PREFIX}${id}`;

export function recordingsDirectory() {
  const directory = new Directory(Paths.document, RECORDINGS_FOLDER);
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  const noMedia = new File(directory, NOMEDIA_FILE);
  if (!noMedia.exists) noMedia.create();
  return directory;
}

export function recordingDirectory(id) {
  return new Directory(recordingsDirectory(), id);
}

export function directoryUri(directory) {
  return directory.uri.endsWith('/') ? directory.uri : `${directory.uri}/`;
}

export function availableBytes() {
  return Paths.availableDiskSpace;
}

export function hasEnoughSpace() {
  return availableBytes() >= MIN_FREE_BYTES;
}

export function writeText(directory, name, text) {
  const file = new File(directory, name);
  file.create({ overwrite: true });
  file.write(text);
}

export async function readJson(directory, name) {
  const file = new File(directory, name);
  return file.exists ? JSON.parse(await file.text()) : null;
}

export function saveKey(id, keyHex) {
  return SecureStore.setItemAsync(keyAlias(id), keyHex);
}

export function readKey(id) {
  return SecureStore.getItemAsync(keyAlias(id));
}

export function forgetKey(id) {
  return SecureStore.deleteItemAsync(keyAlias(id)).catch(() => {});
}
