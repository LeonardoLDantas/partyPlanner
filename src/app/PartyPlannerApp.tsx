import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';

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
  const [session, setSession] = useState<AuthSession | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    informationalEnabled: true,
  });
  const [notificationMessage, setNotificationMessage] = useState('');
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

  useEffect(() => {
    if (!notificationMessage) {
      return;
    }

    const timeoutId = setTimeout(() => setNotificationMessage(''), 3200);
    return () => clearTimeout(timeoutId);
  }, [notificationMessage]);

  function pushInfo(message: string) {
    if (!notificationSettings.informationalEnabled) {
      return;
    }

    setNotificationMessage(message);
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
      setNotificationMessage('Notificacoes informativas ativadas.');
    } else {
      setNotificationMessage('');
    }
  }

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#1f3a5f" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {notificationMessage ? (
        <View style={styles.notificationBanner}>
          <Text style={styles.notificationText}>{notificationMessage}</Text>
        </View>
      ) : null}

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
  notificationBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#1f3a5f',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  notificationText: {
    color: '#fffaf3',
    fontSize: 14,
    fontWeight: '700',
  },
});
