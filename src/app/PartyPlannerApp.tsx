import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { authApi } from '../services/authApi';
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from '../services/preferencesStorage';
import { clearSession, loadSession, saveSession } from '../services/sessionStorage';
import { AuthSession, NotificationSettings } from '../types';
import { AuthScreen } from './AuthScreen';
import { PlannerHome } from './PlannerHome';

export function PartyPlannerApp() {
  const androidTopInset = Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 0 : 0;
  const [session, setSession] = useState<AuthSession | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    informationalEnabled: true,
  });
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const storedSettings = await loadNotificationSettings();
        setNotificationSettings(storedSettings);

        const storedSession = await loadSession();
        if (!storedSession) {
          return;
        }

        const user = await authApi.me(storedSession.accessToken);
        setSession({ ...storedSession, user });
      } catch {
        await clearSession();
        setSession(null);
      } finally {
        setIsBootstrapping(false);
      }
    }

    bootstrap();
  }, []);

  function pushInfo(message: string) {
    if (!notificationSettings.informationalEnabled) {
      return;
    }

    Toast.show({
      type: 'success',
      text1: 'Party Planner',
      text2: message,
      position: 'top',
      visibilityTime: 3200,
    });
  }

  async function handleAuthenticated(nextSession: AuthSession) {
    await saveSession(nextSession);
    setSession(nextSession);
    pushInfo(`Login realizado com sucesso. Bem-vindo, ${nextSession.user.name}.`);
  }

  async function handleLogout() {
    await clearSession();
    setSession(null);
    pushInfo('Voce saiu da sua conta.');
  }

  async function handleNotificationSettingsChange(informationalEnabled: boolean) {
    const nextSettings = { informationalEnabled };
    setNotificationSettings(nextSettings);
    await saveNotificationSettings(nextSettings);

    if (informationalEnabled) {
      Toast.show({
        type: 'success',
        text1: 'Notificacoes',
        text2: 'Notificacoes informativas ativadas.',
        position: 'top',
        visibilityTime: 2800,
      });
    }
  }

  if (isBootstrapping) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: androidTopInset }]}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#1f3a5f" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: androidTopInset }]}>
      {session ? (
        <PlannerHome
          session={session}
          onLogout={handleLogout}
          notificationsEnabled={notificationSettings.informationalEnabled}
          onNotificationsChange={handleNotificationSettingsChange}
          onInformationalEvent={pushInfo}
        />
      ) : (
        <AuthScreen onAuthenticated={handleAuthenticated} />
      )}
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6efe6',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f6efe6',
    justifyContent: 'center',
    padding: 24,
  },
  loadingCard: {
    backgroundColor: '#fffaf3',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
});
