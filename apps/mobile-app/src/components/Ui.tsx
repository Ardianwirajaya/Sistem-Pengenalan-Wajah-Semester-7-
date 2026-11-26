import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1E40AF',
  primarySoft: '#EFF6FF',
  bg: '#F1F5F9',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
} as const;

const BADGE_VARIANTS: Record<string, { bg: string; fg: string; label?: string }> = {
  open: { bg: COLORS.successSoft, fg: COLORS.success, label: 'OPEN' },
  closed: { bg: '#E2E8F0', fg: '#334155', label: 'CLOSED' },
  cancelled: { bg: COLORS.dangerSoft, fg: COLORS.danger, label: 'CANCELLED' },
  matched: { bg: COLORS.successSoft, fg: COLORS.success, label: 'MATCHED' },
  unknown: { bg: COLORS.warningSoft, fg: COLORS.warning, label: 'UNKNOWN' },
  present: { bg: COLORS.successSoft, fg: COLORS.success, label: 'HADIR' },
  excused: { bg: COLORS.primarySoft, fg: COLORS.primaryDark, label: 'IZIN' },
  absent: { bg: COLORS.dangerSoft, fg: COLORS.danger, label: 'ALPA' },
  completed: { bg: COLORS.successSoft, fg: COLORS.success, label: 'SELESAI' },
  processing: { bg: COLORS.primarySoft, fg: COLORS.primaryDark, label: 'MEMPROSES' },
  queued: { bg: COLORS.warningSoft, fg: COLORS.warning, label: 'ANTREAN' },
  failed: { bg: COLORS.dangerSoft, fg: COLORS.danger, label: 'GAGAL' },
  primary: { bg: COLORS.primarySoft, fg: COLORS.primaryDark },
  active: { bg: COLORS.successSoft, fg: COLORS.success, label: 'AKTIF' },
  inactive: { bg: '#E2E8F0', fg: '#475569', label: 'NONAKTIF' },
  blur: { bg: COLORS.warningSoft, fg: COLORS.warning, label: 'WAJAH BLUR' },
  occluded: { bg: COLORS.dangerSoft, fg: COLORS.danger, label: 'WAJAH TERTUTUP' },
  low_resolution: { bg: COLORS.warningSoft, fg: COLORS.warning, label: 'RESOLUSI RENDAH' },
  too_small: { bg: COLORS.warningSoft, fg: COLORS.warning, label: 'WAJAH TERLALU KECIL' },
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const palette = BADGE_VARIANTS[status.toLowerCase()] ?? { bg: '#E2E8F0', fg: '#334155' };
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>
        {label ?? palette.label ?? status.toUpperCase()}
      </Text>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ActionButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const bgStyle =
    variant === 'primary'
      ? styles.btnPrimary
      : variant === 'secondary'
        ? styles.btnSecondary
        : variant === 'danger'
          ? styles.btnDanger
          : styles.btnOutline;
  const txtStyle = variant === 'outline' ? styles.btnTextOutline : styles.btnTextLight;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        bgStyle,
        isDisabled && styles.btnDisabled,
        pressed && !isDisabled && styles.btnPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? COLORS.primary : '#FFFFFF'} />
      ) : (
        <Text style={[styles.btnText, txtStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Banner({
  message,
  tone = 'error',
  onDismiss,
}: {
  message: string | null;
  tone?: 'error' | 'success' | 'info';
  onDismiss?: () => void;
}) {
  if (!message) return null;
  const bg =
    tone === 'success'
      ? COLORS.successSoft
      : tone === 'info'
        ? COLORS.primarySoft
        : COLORS.dangerSoft;
  const fg =
    tone === 'success'
      ? COLORS.success
      : tone === 'info'
        ? COLORS.primaryDark
        : COLORS.danger;

  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor: fg }]}>
      <Text style={[styles.bannerText, { color: fg }]}>{message}</Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Text style={[styles.bannerClose, { color: fg }]}>Tutup</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btn: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnSecondary: {
    backgroundColor: '#0F172A',
  },
  btnDanger: {
    backgroundColor: COLORS.danger,
  },
  btnOutline: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnTextLight: {
    color: '#FFFFFF',
  },
  btnTextOutline: {
    color: COLORS.primary,
  },
  banner: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  bannerClose: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
});
