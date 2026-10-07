import { ActivityIndicator, Text, View } from 'react-native';
import { VideoView } from 'expo-video';

import { colors } from '../theme';
import { playerStyles } from '../styles/playerStyles';

export default function VideoPlayer({
  player,
  videoViewRef,
  isFullscreen,
  isPictureInPicture,
  isReconnecting,
  onPictureInPictureStart,
  onPictureInPictureStop,
  children,
}) {
  return (
    <View
      style={[
        playerStyles.playerContainer,
        isFullscreen ? playerStyles.playerContainerFullscreen : playerStyles.playerContainerPortrait,
      ]}
    >
      <VideoView
        ref={videoViewRef}
        player={player}
        nativeControls={false}
        style={playerStyles.videoLayer}
        contentFit="contain"
        allowsPictureInPicture
        onPictureInPictureStart={onPictureInPictureStart}
        onPictureInPictureStop={onPictureInPictureStop}
      />

      {!isPictureInPicture && children}

      {isReconnecting && !isPictureInPicture && (
        <View style={playerStyles.reconnectWrap} pointerEvents="none">
          <View style={playerStyles.reconnectPill}>
            <ActivityIndicator size="small" color={colors.onMedia} />
            <Text style={playerStyles.reconnectText}>Reconectando…</Text>
          </View>
        </View>
      )}
    </View>
  );
}
