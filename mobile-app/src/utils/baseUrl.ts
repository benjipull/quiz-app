import Constants from 'expo-constants';
import { Platform } from 'react-native';

// In Expo, localhost doesn't work on Android emulators.
// Android emulators use 10.0.2.2 to access the host machine's localhost
const getDebuggerHost = () => {
  // For Android emulator, always use 10.0.2.2
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  // For iOS simulator or physical devices, try to get the debugger host
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (!debuggerHost) return 'localhost';
  return debuggerHost.split(':')[0];
};

const LOCAL_IP = getDebuggerHost();
const LOCAL_BASE_URL = `http://${LOCAL_IP}:3000`;

// Replace this with your actual production URL when deploying
const PRODUCTION_BASE_URL = "https://your-production-api.com";

export const getApiBaseUrl = () => {
  if (__DEV__) {
    console.log(`📡 API Base URL: ${LOCAL_BASE_URL}`);
    return LOCAL_BASE_URL;
  }
  return PRODUCTION_BASE_URL;
};
