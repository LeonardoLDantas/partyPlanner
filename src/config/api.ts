import { Platform } from 'react-native';

const lanBaseUrl = 'http://192.168.3.70:5112';
const productionFallbackUrl = 'https://partyplanner-backend.onrender.com';

function adaptLocalhost(url: string) {
  if (Platform.OS === 'android') {
    return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }

  return url;
}

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL;

export const apiBaseUrl = configuredBaseUrl
  ? adaptLocalhost(configuredBaseUrl)
  : __DEV__
    ? Platform.OS === 'web'
      ? 'http://localhost:5112'
      : lanBaseUrl
    : productionFallbackUrl;
