import React, { useEffect, useState } from 'react';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  clearApiKey,
  getUser,
  loadStoredAuthConfig,
  setOnUnauthorized,
  type User,
} from './src/api/client';
import { COLORS, StatusBadge } from './src/components/Ui';
import { AttendanceScreen } from './src/screens/AttendanceScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { StudentsScreen } from './src/screens/StudentsScreen';

type TabKey = 'attendance' | 'students' | 'reports' | 'settings';

const TABS: { key: TabKey; label: string; title: string }[] = [
  { key: 'attendance', label: 'Presensi', title: 'Presensi & Scan AI' },
  { key: 'students', label: 'Mahasiswa', title: 'Mahasiswa & Wajah' },
  { key: 'reports', label: 'Laporan', title: 'Laporan Kehadiran' },
  { key: 'settings', label: 'API & Akun', title: 'Pengaturan API & Akun' },
];

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('attendance');

  useEffect(() => {
    setOnUnauthorized(() => {
      clearApiKey();
      setUser(null);
    });

    let mounted = true;
    async function bootstrap() {
      try {
        const { apiKey } = await loadStoredAuthConfig();
        if (apiKey) {
          const currentUser = await getUser();
          if (mounted) setUser(currentUser);
        }
      } catch {
        await clearApiKey();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setBooting(false);
      }
    }
    bootstrap();

    return () => {
      mounted = false;
      setOnUnauthorized(null);
    };
  }, []);

  const currentTabMeta = TABS.find((t) => t.key === activeTab) ?? TABS[0];

  return (
    <View style={styles.outerBackdrop}>
      <SafeAreaView style={styles.mobileShell}>
        <ExpoStatusBar style="dark" />
        {booting ? (
          <View style={styles.bootContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.bootText}>Memeriksa koneksi & token API...</Text>
          </View>
        ) : !user ? (
          <AuthScreen
            onAuthenticated={(authedUser) => {
              setUser(authedUser);
              setActiveTab('attendance');
            }}
          />
        ) : (
          <View style={styles.appContainer}>
            {/* Sticky Mobile Top Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>{currentTabMeta.title}</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {user.name} · {user.email}
                </Text>
              </View>
              <StatusBadge status="primary" label={user.role.toUpperCase()} />
            </View>

            {/* Active Screen Content */}
            <View style={styles.content}>
              {activeTab === 'attendance' ? <AttendanceScreen /> : null}
              {activeTab === 'students' ? <StudentsScreen /> : null}
              {activeTab === 'reports' ? <ReportsScreen /> : null}
              {activeTab === 'settings' ? (
                <SettingsScreen
                  user={user}
                  onUserUpdated={setUser}
                  onLoggedOut={() => setUser(null)}
                />
              ) : null}
            </View>

            {/* Bottom Navigation Bar */}
            <View style={styles.bottomNav}>
              {TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={[styles.navItem, active && styles.navItemActive]}
                  >
                    <View style={[styles.navDot, active && styles.navDotActive]} />
                    <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerBackdrop: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  mobileShell: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  },
  bootContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  bootText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  appContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 10,
  },
  navItemActive: {
    backgroundColor: COLORS.primarySoft,
  },
  navDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  navDotActive: {
    backgroundColor: COLORS.primary,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
  },
  navLabelActive: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
});
