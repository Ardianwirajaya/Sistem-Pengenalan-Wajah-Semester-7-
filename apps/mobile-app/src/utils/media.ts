import * as ImagePicker from 'expo-image-picker';

export function todayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateOnly(value?: string | null): string {
  if (!value) return '-';
  return value.slice(0, 10);
}

export function formatError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Terjadi kesalahan tak terduga.';
}

export async function pickImageAsset(
  source: 'camera' | 'library',
): Promise<{ asset: ImagePicker.ImagePickerAsset | null; error?: string }> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return { asset: null, error: 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan perangkat.' };
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets.length) {
      return { asset: null };
    }
    return { asset: result.assets[0] };
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { asset: null, error: 'Izin galeri ditolak. Aktifkan izin penyimpanan/foto di pengaturan perangkat.' };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets.length) {
    return { asset: null };
  }
  return { asset: result.assets[0] };
}
