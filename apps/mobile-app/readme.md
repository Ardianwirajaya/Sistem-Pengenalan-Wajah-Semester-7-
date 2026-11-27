# Mobile App — Sistem Pengenalan Wajah Mahasiswa

Aplikasi Front End mobile-only berbasis **React Native (Expo + TypeScript)** yang terhubung langsung ke REST API Laravel (`backend/`) menggunakan **Bearer Token / API Key (Laravel Sanctum)**.

## Fitur Utama

1. **Autentikasi & Koneksi API Key (`src/screens/AuthScreen.tsx`, `src/screens/SettingsScreen.tsx`)**
   - Login dengan email + password (`POST /api/auth/login`) atau langsung menempelkan **Bearer Token / API Key** dan memverifikasinya via `GET /api/user`.
   - Pengaturan **Base URL** fleksibel (preset `http://127.0.0.1:8000/api` untuk Web/iOS Simulator, `http://10.0.2.2:8000/api` untuk Android Emulator, atau IP LAN untuk HP fisik via Expo Go).
   - Logout (`POST /api/auth/logout`).

2. **Presensi & Scan Wajah AI — Alur 7 Langkah Dosen (`src/screens/AttendanceScreen.tsx`)**
   - Pilih jadwal kelas (`GET /api/class-schedules`) dan buka sesi presensi (`POST /api/attendance-sessions`), atau lanjutkan sesi yang sudah ada (`GET /api/attendance-sessions/{id}`).
   - Ubah status sesi (`open` / `closed` / `cancelled`) melalui `PATCH /api/attendance-sessions/{id}`.
   - Ambil foto dari **Kamera** atau **Galeri**, unggah ke `POST /api/recognitions`, dan jalankan polling otomatis ke `GET /api/recognitions/{id}` hingga selesai.
   - Tinjau bounding box & skor kemiripan, koreksi identitas mahasiswa bila diperlukan (termasuk wajah `unknown`), pilih status (`present` / `excused` / `absent` / `unknown`), lalu konfirmasi ke `POST /api/recognitions/{id}/confirm`.

3. **Mahasiswa & Registrasi Foto Wajah (`src/screens/StudentsScreen.tsx`)**
   - Cari, tambah, ubah, dan aktifkan/nonaktifkan data mahasiswa (`GET/POST/PATCH /api/students`).
   - Kelola foto wajah mahasiswa (`GET/POST /api/students/{id}/faces`, `GET /api/student-faces/{id}/url`, `DELETE /api/student-faces/{id}`) lengkap dengan persetujuan biometrik eksplisit sebelum unggah.

4. **Laporan Kehadiran (`src/screens/ReportsScreen.tsx`)**
   - Rekap kehadiran per kelas atau per jadwal dengan filter rentang tanggal (`GET /api/reports/attendance`).

## Cara Menjalankan

### 1. Pastikan Backend & Service Docker Berjalan

Dari root repository:

```bash
docker compose up -d
cd backend
php artisan serve
```

> Catatan untuk HP fisik (Expo Go): jalankan backend agar menerima koneksi jaringan lokal, misalnya `php artisan serve --host=0.0.0.0 --port=8000`, lalu ubah Base URL di aplikasi menjadi `http://<IP-LAN-LAPTOP>:8000/api`.

### 2. Jalankan Aplikasi Mobile

```bash
cd apps/mobile-app
npm install
npx expo start
```

Pilihan target tampilan:
- **Expo Go (HP Android / iOS)**: pindai QR code yang muncul di terminal menggunakan aplikasi Expo Go.
- **Android Emulator**: tekan `a` di terminal Expo (gunakan preset Base URL `http://10.0.2.2:8000/api`).
- **Preview Mobile di Browser (Web)**: tekan `w` di terminal Expo atau jalankan `npm run web`.

## Akun Demo (dari `DatabaseSeeder.php`)

- **Dosen 1**: `budi@example.com` / `password`
- **Dosen 2**: `siti@example.com` / `password`
- **Admin**: `admin@example.com` / `password`
