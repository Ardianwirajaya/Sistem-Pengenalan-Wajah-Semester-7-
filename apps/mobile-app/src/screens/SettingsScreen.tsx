import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  BASE_URL_PRESETS,
  getApiConfig,
  getUser,
  logout,
  saveApiKey,
  saveBaseUrl,
  type User,
} from '../api/client';
import { ActionButton, Banner, COLORS, Card, SectionTitle, StatusBadge } from '../components/Ui';
import { formatError } from '../utils/media';

function maskToken(token: string): string {
  if (!token) return '(kosong)';
  if (token.length <= 12) return '••••••••';
  return `${token.slice(0, 6)}••••••••${token.slice(-6)}`;
}

export function SettingsScreen({
  user,
  onUserUpdated,
  onLoggedOut,
}: {
  user: User;
  onUserUpdated: (user: User) => void;
  onLoggedOut: () => void;
}) {
  const initial = getApiConfig();
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [apiKeyInput, setApiKeyInput] = useState(initial.apiKey);
  const [showFullToken, setShowFullToken] = useState(false);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSaveAndTest() {
    if (!apiKeyInput.trim()) {
      setError('API Key / Bearer Token tidak boleh kosong.');
      return;
    }
    setBusy('test');
    setError(null);
    setNotice(null);
    try {
      const savedUrl = await saveBaseUrl(baseUrl);
      await saveApiKey(apiKeyInput);
      setBaseUrl(savedUrl);
      const freshUser = await getUser();
      onUserUpdated(freshUser);
      setNotice(`Koneksi OK (${freshUser.name} · ${freshUser.role}).`);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleCopyOrShareToken() {
    const token = apiKeyInput.trim();
    if (!token) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(token);
      setNotice('Bearer Token disalin ke clipboard.');
      return;
    }
    await Share.share({ message: token });
  }

  async function handleLogout() {
    setBusy('logout');
    setError(null);
    try {
      await logout();
      onLoggedOut();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Banner message={error} tone="error" onDismiss={() => setError(null)} />
      <Banner message={notice} tone="success" onDismiss={() => setNotice(null)} />

      <SectionTitle title="Akun Pengguna Aktif" />
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.userName}>{user.name}</Text>
          <StatusBadge status="primary" label={user.role.toUpperCase()} />
        </View>
        <Text style={styles.userEmail}>{user.email}</Text>
      </Card>

      <SectionTitle
        title="Konfigurasi Backend & API Key"
        subtitle="Semua request menyertakan header Authorization: Bearer <token>"
      />
      <Card>
        <Text style={styles.label}>Base URL Laravel API</Text>
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

        <View style={styles.tokenHeader}>
          <Text style={styles.label}>Active API Key (Sanctum Bearer Token)</Text>
          <Pressable onPress={() => setShowFullToken((v) => !v)}>
            <Text style={styles.linkText}>{showFullToken ? 'Sembunyikan' : 'Tampilkan'}</Text>
          </Pressable>
        </View>

        <View style={styles.tokenPreviewBox}>
          <Text selectable style={styles.tokenPreviewText}>
            {showFullToken ? apiKeyInput : maskToken(apiKeyInput)}
          </Text>
        </View>

        <Text style={styles.label}>Perbarui API Key Secara Manual</Text>
        <TextInput
          value={apiKeyInput}
          onChangeText={setApiKeyInput}
          placeholder="Tempel Bearer Token baru..."
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!showFullToken}
          style={styles.input}
        />

        <View style={styles.btnRow}>
          <ActionButton
            title="Salin / Bagikan Token"
            variant="outline"
            onPress={handleCopyOrShareToken}
            style={styles.flex1}
          />
          <ActionButton
            title="Simpan & Uji GET /user"
            loading={busy === 'test'}
            onPress={handleSaveAndTest}
            style={styles.flex1}
          />
        </View>
      </Card>

      <ActionButton
        title="Logout (Cabut Token Ini)"
        variant="danger"
        loading={busy === 'logout'}
        onPress={handleLogout}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 28,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    backgroundColor: '#F8FAFC',
    color: COLORS.text,
    marginBottom: 8,
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
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tokenPreviewBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  tokenPreviewText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  flex1: {
    flex: 1,
  },
});
