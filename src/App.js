import { SafeAreaProvider } from 'react-native-safe-area-context';

import PlayerScreen from './screens/PlayerScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <PlayerScreen />
    </SafeAreaProvider>
  );
}
