import { Platform } from 'react-native';

function adaptLocalhost(url: string) {
  if (Platform.OS === 'android') {
    return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }

  return url;
}

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL;

export const apiBaseUrl = configuredBaseUrl
  ? adaptLocalhost(configuredBaseUrl)
  : Platform.select({
      android: 'http://10.0.2.2:5112',
      default: 'http://localhost:5112',
    });
