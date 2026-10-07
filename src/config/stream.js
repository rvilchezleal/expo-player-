export const STREAM_URL = process.env.EXPO_PUBLIC_STREAM_URL;

export const videoSource = {
  uri: STREAM_URL,
  contentType: 'hls',
  liveTargetOffset: 6,
  metadata: {
    title: 'Transmisión en Vivo',
  },
};

export const EXIT_DELAY_MS = 3000;
export const EXIT_ON_STARTUP_ERROR = false;
