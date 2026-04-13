import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { authApi } from '../services/authApi';
import { AuthSession } from '../types';

type AuthMode = 'login' | 'register';

type AuthScreenProps = {
  onAuthenticated: (session: AuthSession) => Promise<void> | void;
};

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim() || (mode === 'register' && !name.trim())) {
      setErrorMessage('Preencha os campos obrigatorios para continuar.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const session =
        mode === 'login'
          ? await authApi.login({
              email: email.trim(),
              password: password.trim(),
            })
          : await authApi.register({
              name: name.trim(),
              email: email.trim(),
              password: password.trim(),
            });

      await onAuthenticated(session);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Nao foi possivel autenticar agora.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.overline}>Party Planner</Text>
          <Text style={styles.heroTitle}>Entre para gerenciar suas festas</Text>
          <Text style={styles.heroSubtitle}>
            Use usuario e senha ou entre com Google. O app recebe seus dados da API
            .NET por JWT.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.modeRow}>
            {(['login', 'register'] as AuthMode[]).map((currentMode) => {
              const isActive = currentMode === mode;

              return (
                <Pressable
                  key={currentMode}
                  style={[styles.modeButton, isActive && styles.modeButtonActive]}
                  onPress={() => setMode(currentMode)}
                >
                  <Text style={[styles.modeText, isActive && styles.modeTextActive]}>
                    {currentMode === 'login' ? 'Entrar' : 'Criar conta'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {mode === 'register' ? (
            <TextInput
              placeholder="Seu nome"
              placeholderTextColor="#7e776f"
              style={styles.input}
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
          ) : null}

          <TextInput
            placeholder="E-mail"
            placeholderTextColor="#7e776f"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />

          <TextInput
            placeholder="Senha"
            placeholderTextColor="#7e776f"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            blurOnSubmit
          />

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#fffaf3" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === 'login' ? 'Entrar com senha' : 'Criar conta e entrar'}
              </Text>
            )}
          </Pressable>

          <View style={[styles.secondaryButton, styles.secondaryButtonDisabled]}>
            <Text style={styles.secondaryButtonText}>
              Login Google em ajuste no Android. Use usuario e senha por enquanto.
            </Text>
          </View>

          <Text style={styles.hint}>
            Conta inicial para teste: demo@partyplanner.app com senha Party123!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6efe6',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  heroCard: {
    backgroundColor: '#1f3a5f',
    borderRadius: 28,
    padding: 24,
    gap: 14,
  },
  overline: {
    color: '#f3d8a6',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fffaf3',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  heroSubtitle: {
    color: '#dce6f4',
    fontSize: 15,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: '#fffaf3',
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#f8f3ec',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#1f3a5f',
  },
  modeText: {
    color: '#4d4b49',
    fontWeight: '700',
  },
  modeTextActive: {
    color: '#fffaf3',
  },
  input: {
    backgroundColor: '#f8f3ec',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#1d2433',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: '#ef7b45',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fffaf3',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#1f3a5f',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonDisabled: {
    opacity: 0.55,
  },
  secondaryButtonText: {
    color: '#fffaf3',
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: '#fff4ef',
    borderRadius: 18,
    padding: 14,
  },
  errorText: {
    color: '#af3e1d',
    fontSize: 14,
    lineHeight: 20,
  },
  hint: {
    color: '#6e6a67',
    fontSize: 13,
    lineHeight: 20,
  },
});
