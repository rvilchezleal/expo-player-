import { File, Paths } from 'expo-file-system';

const SUBTITLED_VARIANT = /subtitulado/i;

export function resolvePlaylistUrl(uri, masterUrl) {
  if (/^https?:\/\//i.test(uri)) return uri;
  if (uri.startsWith('/')) return masterUrl.match(/^https?:\/\/[^/]+/i)[0] + uri;
  return masterUrl.slice(0, masterUrl.lastIndexOf('/') + 1) + uri;
}

export function parseMaster(masterText, masterUrl) {
  const lines = masterText.split(/\r?\n/).map((line) => line.trim());
  const shared = [];
  const variants = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (line.startsWith('#EXT-X-STREAM-INF')) {
      let j = i + 1;
      while (j < lines.length && (!lines[j] || lines[j].startsWith('#'))) j++;
      if (j < lines.length) {
        const uri = resolvePlaylistUrl(lines[j], masterUrl);
        variants.push({
          inf: line,
          uri,
          height: Number(line.match(/RESOLUTION=\d+x(\d+)/)?.[1]) || null,
          subtitled: SUBTITLED_VARIANT.test(uri),
        });
        i = j;
      }
    } else if (line.startsWith('#')) {
      shared.push(line.replace(/URI="([^"]+)"/, (_, uri) => `URI="${resolvePlaylistUrl(uri, masterUrl)}"`));
    }
  }
  return { shared, variants };
}

export function buildLocalMaster(master, { subtitled, height }) {
  const picked = master.variants.filter(
    (v) => v.subtitled === subtitled && (height == null || v.height === height)
  );
  if (picked.length === 0) return null;
  return [...master.shared, ...picked.flatMap((v) => [v.inf, v.uri]), ''].join('\n');
}

export function qualityHeights(master, subtitled) {
  if (!master) return [];
  const heights = master.variants
    .filter((v) => v.subtitled === subtitled && v.height)
    .map((v) => v.height);
  return [...new Set(heights)].sort((a, b) => b - a);
}

export function writeLocalMaster(name, text) {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(text);
  return file.uri;
}
