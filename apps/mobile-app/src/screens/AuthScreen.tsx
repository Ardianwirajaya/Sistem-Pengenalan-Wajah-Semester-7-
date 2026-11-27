import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  BASE_URL_PRESETS,
  clearApiKey,
  getApiConfig,
  getUser,
  login,
  saveApiKey,
  saveBaseUrl,
  USE_MOCK_API,
  type User,
} from '../api/client';
import { ActionButton, Banner, COLORS, Card } from '../components/Ui';
import { formatError } from '../utils/media';

const DEMO_ACCOUNTS = [
  { label: 'Dosen 1 (Budi)', email: 'budi@example.com', password: 'password' },
  { label: 'Dosen 2 (Siti)', email: 'siti@example.com', password: 'password' },
  { label: 'Admin Sistem', email: 'admin@example.com', password: 'password' },
] as const;

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const initial = getApiConfig();
  const [mode, setMode] = useState<'login' | 'token'>('login');
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [email, setEmail] = useState('budi@example.com');
  const [password, setPassword] = useState('password');
  const [tokenInput, setTokenInput] = useState(initial.apiKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(targetEmail = email, targetPassword = password) {
    if (!targetEmail.trim() || !targetPassword) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await saveBaseUrl(baseUrl);
      const res = await login(targetEmail.trim(), targetPassword);
      onAuthenticated(res.user);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectToken() {
    if (!tokenInput.trim()) {
      setError('Masukkan Bearer Token / API Key terlebih dahulu.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await saveBaseUrl(baseUrl);
      await saveApiKey(tokenInput);
      const user = await getUser();
      onAuthenticated(user);
    } catch (err) {
      await clearApiKey();
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.logoPill}>
            <Text style={styles.logoText}>FACE ATTENDANCE</Text>
          </View>
          <Text style={styles.title}>Sistem Presensi Wajah</Text>
          <Text style={styles.subtitle}>
            Aplikasi mobile dosen untuk sesi kelas, deteksi wajah AI, dan konfirmasi kehadiran.
          </Text>
        </View>

        <Banner
          message={
            USE_MOCK_API
              ? 'Mode Mock API aktif (USE_MOCK_API = true). Kamu bisa tes semua alur di HP tanpa backend aktif.'
              : null
          }
          tone="info"
        />
        <Banner message={error} tone="error" onDismiss={() => setError(null)} />

        <Card>
          <Text style={styles.label}>Server Backend (Laravel API URL)</Text>
          <TextInput
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="http://127.0.0.1:8000/api"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <View style={styles.presetRow}>
            {BASE_URL_PRESETS.map((preset) => {
              const active = baseUrl.trim().replace(/\/+$/, '') === preset.url;
              return (
                <Pressable
                  key={preset.url}
                  onPress={() => setBaseUrl(preset.url)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            Jika memakai HP fisik (Expo Go), ganti ke IP LAN laptop (mis. http://192.168.1.10:8000/api).
          </Text>
        </Card>

        <Card>
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => {
                setMode('login');
                setError(null);
              }}
              style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}
            >
              <Text style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}>
                Login Akun
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMode('token');
                setError(null);
              }}
              style={[styles.modeTab, mode === 'token' && styles.modeTabActive]}
            >
              <Text style={[styles.modeTabText, mode === 'token' && styles.modeTabTextActive]}>
                API Key / Token
              </Text>
            </Pressable>
          </View>

          {mode === 'login' ? (
            <View>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="budi@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                style={styles.input}
              />

              <ActionButton
                title="Masuk & Dapatkan Token"
                onPress={() => handleLogin()}
                loading={loading}
                style={styles.submitBtn}
              />

              <Text style={styles.demoHeading}>Login Cepat Akun Seeder:</Text>
              <View style={styles.presetRow}>
                {DEMO_ACCOUNTS.map((acc) => (
                  <Pressable
                    key={acc.email}
                    disabled={loading}
                    onPress={() => {
                      setEmail(acc.email);
                      setPassword(acc.password);
                      handleLogin(acc.email, acc.password);
                    }}
                    style={styles.demoChip}
                  >
                    <Text style={styles.demoChipText}>{acc.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.label}>Bearer Token / API Key (Laravel Sanctum)</Text>
              <TextInput
                value={tokenInput}
                onChangeText={setTokenInput}
                placeholder="Tempel token dari POST /api/auth/login (mis. 1|abcde...)"
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.tokenInput]}
              />
              <Text style={styles.hint}>
                Token akan dikirim sebagai header Authorization: Bearer &lt;token&gt; dan diverifikasi ke GET /api/user.
              </Text>
              <ActionButton
                title="Hubungkan dengan API Key"
                onPress={handleConnectToken}
                loading={loading}
                style={styles.submitBtn}
              />
            </View>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  hero: {
    marginTop: 8,
    marginBottom: 16,
  },
  logoPill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  logoText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 19,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  tokenInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  chipTextActive: {
    color: COLORS.primaryDark,
  },
  hint: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 16,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: COLORS.surface,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
  },
  modeTabTextActive: {
    color: COLORS.primary,
  },
  submitBtn: {
    marginTop: 8,
  },
  demoHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    marginTop: 16,
    marginBottom: 8,
  },
  demoChip: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  demoChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
});
