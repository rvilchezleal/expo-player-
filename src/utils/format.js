const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

const pad2 = (value) => String(value).padStart(2, '0');

export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  return `${Math.floor(seconds / 60)}:${pad2(seconds % 60)}`;
}

export function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

export function formatRecordingDate(isoDate) {
  const date = new Date(isoDate);
  const today = new Date();
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  if (date.toDateString() === today.toDateString()) return `Hoy, ${time}`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${time}`;
}

const LANGUAGE_NAMES = { es: 'Español', spa: 'Español', en: 'Inglés', eng: 'Inglés' };

export function formatLanguage(code) {
  if (!code) return null;
  return LANGUAGE_NAMES[code.toLowerCase().split('-')[0]] ?? code.toUpperCase();
}

export function formatRecordingQuality(item) {
  const heights = item.heights?.length ? item.heights : [item.height].filter(Boolean);
  return [...new Set(heights.map((height) => `${height}p`))].join(' / ');
}

export function formatRecordingLanguages(item) {
  const languages = item.languages?.length ? item.languages : [item.language].filter(Boolean);
  return [...new Set(languages.map(formatLanguage))].join(' / ');
}

export function formatRecordingTraits(item) {
  return [formatRecordingQuality(item), formatRecordingLanguages(item)].filter(Boolean);
}

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function formatRecordingTitle(isoDate) {
  const date = new Date(isoDate);
  return `Grabación de las ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatRecordingDay(isoDate) {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  const year = date.getFullYear() === today.getFullYear() ? '' : ` ${date.getFullYear()}`;
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}${year}`;
}

export function formatDurationLabel(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds || 0));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest} s`;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}
