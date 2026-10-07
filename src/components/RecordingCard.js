import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import IconButton from './IconButton';
import RecordingDot from './RecordingDot';
import { loadThumbnail, peekThumbnail } from '../services/recording';
import { colors, scrims, sizes } from '../theme';
import { recordingCardStyles as styles } from '../styles/recordingsStyles';
import { createLogger } from '../utils/logger';
import {
  formatBytes,
  formatClock,
  formatDurationLabel,
  formatRecordingDay,
  formatRecordingLanguages,
  formatRecordingQuality,
  formatRecordingTitle,
} from '../utils/format';

const log = createLogger('Grabaciones');
const HORIZONTAL = { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };

function statusFor({ isRecordingNow, isPlaying, status }) {
  if (isRecordingNow) return { label: 'REC', container: styles.statusLive, dark: false };
  if (isPlaying) return { label: 'Reproduciendo', container: styles.statusPlaying, dark: true };
  if (status === 'interrupted') return { label: 'Incompleta', container: styles.statusIncomplete, dark: true };
  return null;
}

export default function RecordingCard({ item, isPlaying, isRecordingNow, liveSeconds, onPress, onDelete }) {
  const [thumbnailUri, setThumbnailUri] = useState(() => peekThumbnail(item.id));
  const { id, encrypted } = item;
  const thumbnailFile = item.thumbnail?.file;
  const thumbnailIv = item.thumbnail?.iv;

  useEffect(() => {
    if (isRecordingNow) return undefined;
    let cancelled = false;
    const thumbnail = thumbnailFile ? { file: thumbnailFile, iv: thumbnailIv } : undefined;
    loadThumbnail({ id, encrypted, thumbnail })
      .then((uri) => {
        if (!cancelled && uri) setThumbnailUri(uri);
      })
      .catch((error) => log.warn('No se pudo cargar la miniatura:', error?.message ?? error));
    return () => {
      cancelled = true;
    };
  }, [id, encrypted, thumbnailFile, thumbnailIv, isRecordingNow]);

  const title = formatRecordingTitle(item.createdAt);
  const seconds = isRecordingNow ? liveSeconds : item.duration;
  const quality = formatRecordingQuality(item);
  const languages = formatRecordingLanguages(item);
  const status = statusFor({ isRecordingNow, isPlaying, status: item.status });
  const showImage = !!thumbnailUri && !isRecordingNow;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, isPlaying && styles.cardActive, pressed && styles.cardPressed]}
      onPress={onPress}
      disabled={isRecordingNow}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatRecordingDay(item.createdAt)}, ${formatDurationLabel(seconds)}`}
      accessibilityHint={isRecordingNow ? 'Se está grabando' : 'Reproduce la grabación'}
      accessibilityState={{ selected: isPlaying, disabled: isRecordingNow }}
    >
      <View style={styles.media}>
        {showImage ? (
          <Image source={{ uri: thumbnailUri }} style={styles.mediaLayer} resizeMode="cover" />
        ) : (
          <LinearGradient colors={scrims.thumbnail} style={styles.mediaLayer} />
        )}
        <LinearGradient colors={scrims.cardMedia} style={styles.mediaLayer} pointerEvents="none" />

        <View style={styles.mediaTop} pointerEvents="none">
          {!!quality && (
            <LinearGradient colors={scrims.brandDeep} {...HORIZONTAL} style={styles.qualityBadge}>
              <Text style={styles.qualityText}>{quality}</Text>
            </LinearGradient>
          )}
          {status && (
            <View style={[styles.statusBadge, status.container]}>
              {isRecordingNow && <RecordingDot size={6} color={colors.onMedia} />}
              <Text style={[styles.statusText, status.dark && styles.statusTextDark]}>{status.label}</Text>
            </View>
          )}
        </View>

        <View style={styles.mediaPlay} pointerEvents="none">
          {isRecordingNow ? (
            <RecordingDot size={14} />
          ) : (
            <MaterialCommunityIcons
              name={isPlaying ? 'equalizer' : 'play'}
              size={sizes.icon + 4}
              color={isPlaying ? colors.accent : colors.onMedia}
            />
          )}
        </View>

        <View style={styles.durationChip} pointerEvents="none">
          <Text style={styles.durationText}>{formatClock(seconds)}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {`${formatRecordingDay(item.createdAt)} · ${formatDurationLabel(seconds)}`}
            </Text>
          </View>
          {!isRecordingNow && (
            <IconButton
              icon="trash-can-outline"
              variant="plain"
              onPress={onDelete}
              accessibilityLabel={`Eliminar ${title.toLowerCase()}`}
              style={styles.deleteButton}
            />
          )}
        </View>

        <View style={styles.chips}>
          {!!languages && (
            <View style={[styles.chip, styles.chipViolet]}>
              <MaterialCommunityIcons name="translate" size={sizes.iconSmall - 4} color={colors.brandVioletLabel} />
              <Text style={[styles.chipText, styles.chipTextViolet]}>{languages}</Text>
            </View>
          )}
          {item.encrypted && (
            <View style={[styles.chip, styles.chipBlue]}>
              <MaterialCommunityIcons name="shield-lock-outline" size={sizes.iconSmall - 4} color={colors.brandBlueLabel} />
              <Text style={[styles.chipText, styles.chipTextBlue]}>Cifrada</Text>
            </View>
          )}
          <View style={styles.chip}>
            <MaterialCommunityIcons name="harddisk" size={sizes.iconSmall - 4} color={colors.secondaryLabel} />
            <Text style={styles.chipText}>{formatBytes(item.bytes)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
