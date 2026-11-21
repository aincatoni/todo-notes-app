import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { validatePassword, validateUsername } from '../domain/validators';

export interface LoginScreenProps {
  submitting: boolean;
  error: string | null;
  onLogin: (username: string, password: string) => Promise<boolean>;
  onRegister: (
    username: string,
    password: string,
    displayName?: string
  ) => Promise<boolean>;
  onClearError: () => void;
}

type AuthMode = 'login' | 'register';

const DEMO_ACCOUNTS = [
  {
    username: 'emilys',
    password: 'emilyspass',
    label: 'emilys (1)',
  },
  {
    username: 'michaelw',
    password: 'michaelwpass',
    label: 'michaelw (2)',
  },
] as const;

export const LoginScreen: React.FC<LoginScreenProps> = ({
  submitting,
  error,
  onLogin,
  onRegister,
  onClearError,
}) => {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isRegisterMode = mode === 'register';
  const displayedError = localError ?? error;

  const clearErrors = () => {
    if (localError) setLocalError(null);
    if (error) onClearError();
  };

  const handleSwitchMode = (nextMode: AuthMode) => {
    if (nextMode === mode || submitting) {
      return;
    }
    setMode(nextMode);
    setLocalError(null);
    onClearError();
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    const userCheck = validateUsername(username.trim());
    if (!userCheck.valid) {
      setLocalError(userCheck.error);
      return;
    }

    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      setLocalError(passCheck.error);
      return;
    }

    if (isRegisterMode && password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden');
      return;
    }

    setLocalError(null);
    if (isRegisterMode) {
      const trimmedDisplayName = displayName.trim();
      await onRegister(
        userCheck.value,
        passCheck.value,
        trimmedDisplayName.length > 0 ? trimmedDisplayName : undefined
      );
    } else {
      await onLogin(userCheck.value, passCheck.value);
    }
  };

  const handleSelectDemo = (demoUser: string, demoPass: string) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setLocalError(null);
    onClearError();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(16, insets.bottom) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Ionicons name="checkmark-done" size={32} color="#2563EB" />
          </View>
          <Text style={styles.badgeText}>EVA2 • IPSS 2026</Text>
          <Text style={styles.title}>Mis Notas y Tareas</Text>
          <Text style={styles.subtitle}>
            {isRegisterMode
              ? 'Crea una cuenta local en este dispositivo para aislar tus tareas y fotos.'
              : 'Inicia sesión para proteger y aislar tus tareas locales en el dispositivo.'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.modeTabs} accessibilityRole="tablist">
            <Pressable
              onPress={() => handleSwitchMode('login')}
              disabled={submitting}
              style={[
                styles.modeTab,
                !isRegisterMode && styles.modeTabActive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: !isRegisterMode }}
              accessibilityLabel="Modo iniciar sesión"
            >
              <Text
                style={[
                  styles.modeTabText,
                  !isRegisterMode && styles.modeTabTextActive,
                ]}
              >
                Iniciar sesión
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleSwitchMode('register')}
              disabled={submitting}
              style={[
                styles.modeTab,
                isRegisterMode && styles.modeTabActive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isRegisterMode }}
              accessibilityLabel="Modo crear cuenta"
            >
              <Text
                style={[
                  styles.modeTabText,
                  isRegisterMode && styles.modeTabTextActive,
                ]}
              >
                Crear cuenta
              </Text>
            </Pressable>
          </View>

          {Boolean(displayedError) && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{displayedError}</Text>
            </View>
          )}

          {isRegisterMode && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre para mostrar (opcional)</Text>
              <View style={styles.inputRow}>
                <Ionicons
                  name="id-card-outline"
                  size={18}
                  color="#64748B"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Ain Catoni"
                  placeholderTextColor="#94A3B8"
                  value={displayName}
                  onChangeText={(text) => {
                    setDisplayName(text);
                    clearErrors();
                  }}
                  autoCapitalize="words"
                  editable={!submitting}
                  returnKeyType="next"
                  accessibilityLabel="Nombre para mostrar"
                />
              </View>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Usuario o correo</Text>
            <View style={styles.inputRow}>
              <Ionicons
                name="person-outline"
                size={18}
                color="#64748B"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={
                  isRegisterMode
                    ? 'Ej. ain@ipss.cl'
                    : 'Ej. emilys o ain@ipss.cl'
                }
                placeholderTextColor="#94A3B8"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  clearErrors();
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
                returnKeyType="next"
                accessibilityLabel="Usuario o correo"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputRow}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#64748B"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  clearErrors();
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
                returnKeyType={isRegisterMode ? 'next' : 'done'}
                onSubmitEditing={() => {
                  if (!isRegisterMode) {
                    void handleSubmit();
                  }
                }}
                accessibilityLabel="Contraseña"
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeButton}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </Pressable>
            </View>
          </View>

          {isRegisterMode && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={styles.inputRow}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color="#64748B"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor="#94A3B8"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    clearErrors();
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!submitting}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSubmit()}
                  accessibilityLabel="Confirmar contraseña"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  style={styles.eyeButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirmPassword
                      ? 'Ocultar confirmación de contraseña'
                      : 'Mostrar confirmación de contraseña'
                  }
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? 'eye-off-outline' : 'eye-outline'
                    }
                    size={20}
                    color="#64748B"
                  />
                </Pressable>
              </View>
            </View>
          )}

          <Pressable
            onPress={() => void handleSubmit()}
            disabled={submitting}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.buttonPressed,
              submitting && styles.submitDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              isRegisterMode ? 'Crear cuenta' : 'Iniciar sesión'
            }
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name={isRegisterMode ? 'person-add-outline' : 'log-in-outline'}
                size={20}
                color="#FFFFFF"
              />
            )}
            <Text style={styles.submitText}>
              {submitting
                ? isRegisterMode
                  ? 'Creando cuenta...'
                  : 'Ingresando...'
                : isRegisterMode
                  ? 'Crear cuenta'
                  : 'Iniciar sesión'}
            </Text>
          </Pressable>

          {!isRegisterMode && (
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>
                Cuentas de prueba multisesión
              </Text>
              <View style={styles.demoRow}>
                {DEMO_ACCOUNTS.map((account) => (
                  <Pressable
                    key={account.username}
                    onPress={() =>
                      handleSelectDemo(account.username, account.password)
                    }
                    disabled={submitting}
                    style={({ pressed }) => [
                      styles.demoChip,
                      pressed && styles.buttonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Autocompletar cuenta ${account.username}`}
                  >
                    <Ionicons
                      name="person-add-outline"
                      size={15}
                      color="#2563EB"
                    />
                    <Text style={styles.demoChipText}>{account.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        <Text style={styles.securityNote}>
          Tu cuenta y sesión se almacenan 100 % en el dispositivo (sesión
          cifrada en Keychain/Keystore).
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 14,
  },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 320,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 10,
  },
  eyeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    marginTop: 6,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  demoSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 6,
  },
  demoChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  buttonPressed: {
    opacity: 0.78,
  },
  securityNote: {
    marginTop: 16,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
