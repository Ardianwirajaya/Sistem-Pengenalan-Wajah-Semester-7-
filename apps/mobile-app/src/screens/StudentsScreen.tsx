import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import {
  createStudent,
  deleteStudentFace,
  getStudentFaces,
  getStudents,
  refreshStudentFaceUrl,
  updateStudent,
  uploadStudentFace,
  type Student,
  type StudentFace,
} from '../api/client';
import { ActionButton, Banner, COLORS, Card, SectionTitle, StatusBadge } from '../components/Ui';
import { formatError, pickImageAsset } from '../utils/media';

export function StudentsScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [faces, setFaces] = useState<StudentFace[]>([]);
  const [loadingFaces, setLoadingFaces] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Face upload state
  const [faceAsset, setFaceAsset] = useState<ImagePickerAsset | null>(null);
  const [isPrimary, setIsPrimary] = useState(true);
  const [hasConsent, setHasConsent] = useState(false);

  // Create / Edit student modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nim, setNim] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [programStudy, setProgramStudy] = useState('Informatika');
  const [isActive, setIsActive] = useState(true);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadStudents = useCallback(async (queryText: string) => {
    try {
      setError(null);
      const res = await getStudents({ search: queryText.trim() || undefined, per_page: 50 });
      setStudents(res.data);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStudents(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, loadStudents]);

  async function openStudentDetail(student: Student) {
    setSelectedStudent(student);
    setFaceAsset(null);
    setHasConsent(false);
    setConfirmDeleteId(null);
    setError(null);
    setNotice(null);
    setLoadingFaces(true);
    try {
      const list = await getStudentFaces(student.id);
      setFaces(list);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoadingFaces(false);
    }
  }

  function openCreateModal() {
    setEditingId(null);
    setNim('');
    setName('');
    setEmail('');
    setProgramStudy('Informatika');
    setIsActive(true);
    setError(null);
    setFormOpen(true);
  }

  function openEditModal(student: Student) {
    setEditingId(student.id);
    setNim(student.nim);
    setName(student.name);
    setEmail(student.email ?? '');
    setProgramStudy(student.program_study);
    setIsActive(student.is_active);
    setError(null);
    setFormOpen(true);
  }

  async function handleSaveStudent() {
    if (!nim.trim() || !name.trim() || !programStudy.trim()) {
      setError('NIM, Nama, dan Program Studi wajib diisi.');
      return;
    }
    setBusy('save-student');
    setError(null);
    try {
      const payload = {
        nim: nim.trim(),
        name: name.trim(),
        email: email.trim() ? email.trim() : null,
        program_study: programStudy.trim(),
        is_active: isActive,
      };
      if (editingId !== null) {
        const updated = await updateStudent(editingId, payload);
        if (selectedStudent?.id === editingId) {
          setSelectedStudent(updated);
        }
        setNotice('Data mahasiswa berhasil diperbarui.');
      } else {
        await createStudent(payload);
        setNotice('Mahasiswa baru berhasil ditambahkan.');
      }
      setFormOpen(false);
      loadStudents(search);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleActive(student: Student) {
    setBusy('toggle-active');
    setError(null);
    try {
      const updated = await updateStudent(student.id, { is_active: !student.is_active });
      setSelectedStudent(updated);
      setNotice(`Status mahasiswa diubah menjadi ${updated.is_active ? 'AKTIF' : 'NONAKTIF'}.`);
      loadStudents(search);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(null);
    }
  }

  async function handlePickFace(source: 'camera' | 'library') {
    setError(null);
    const { asset, error: pickErr } = await pickImageAsset(source);
    if (pickErr) {
      setError(pickErr);
      return;
    }
    if (asset) {
      setFaceAsset(asset);
    }
  }

  async function handleUploadFace() {
    if (!selectedStudent || !faceAsset) return;
    if (!hasConsent) {
      setError('Persetujuan biometrik eksplisit mahasiswa wajib dicentang sebelum mengunggah foto wajah.');
      return;
    }
    setBusy('upload-face');
    setError(null);
    setNotice(null);
    try {
      await uploadStudentFace(selectedStudent.id, faceAsset, isPrimary);
      const updatedFaces = await getStudentFaces(selectedStudent.id);
      setFaces(updatedFaces);
      setFaceAsset(null);
      setHasConsent(false);
      setNotice('Foto wajah berhasil diunggah ke penyimpanan MinIO.');
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleRefreshUrl(faceId: number) {
    setBusy(`refresh-${faceId}`);
    setError(null);
    try {
      const { url } = await refreshStudentFaceUrl(faceId);
      setFaces((prev) => prev.map((f) => (f.id === faceId ? { ...f, url } : f)));
      setNotice('Signed URL foto berhasil diperbarui (berlaku 15 menit).');
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteFace(faceId: number) {
    setBusy(`delete-${faceId}`);
    setError(null);
    try {
      await deleteStudentFace(faceId);
      setFaces((prev) => prev.filter((f) => f.id !== faceId));
      setConfirmDeleteId(null);
      setNotice('Foto wajah berhasil dihapus.');
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(null);
    }
  }

  // --- Student Form Modal ---
  const studentModal = (
    <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.rowBetween}>
            <Text style={styles.modalTitle}>
              {editingId !== null ? 'Ubah Data Mahasiswa' : 'Tambah Mahasiswa Baru'}
            </Text>
            <Pressable onPress={() => setFormOpen(false)} hitSlop={8}>
              <Text style={styles.closeText}>Tutup</Text>
            </Pressable>
          </View>

          <Banner message={error} tone="error" onDismiss={() => setError(null)} />

          <Text style={styles.fieldLabel}>NIM *</Text>
          <TextInput
            value={nim}
            onChangeText={setNim}
            placeholder="2025016"
            style={styles.input}
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Nama Lengkap *</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Nama Mahasiswa" style={styles.input} />

          <Text style={styles.fieldLabel}>Email (Opsional)</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="mahasiswa@student.example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Program Studi *</Text>
          <TextInput
            value={programStudy}
            onChangeText={setProgramStudy}
            placeholder="Informatika"
            style={styles.input}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Status Mahasiswa Aktif</Text>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>

          <ActionButton
            title={editingId !== null ? 'Simpan Perubahan' : 'Simpan Mahasiswa'}
            loading={busy === 'save-student'}
            onPress={handleSaveStudent}
            style={styles.saveBtn}
          />
        </View>
      </View>
    </Modal>
  );

  // --- Student Detail & Face Enrollment View ---
  if (selectedStudent) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => setSelectedStudent(null)} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Kembali ke Daftar Mahasiswa</Text>
        </Pressable>

        <Banner message={error} tone="error" onDismiss={() => setError(null)} />
        <Banner message={notice} tone="success" onDismiss={() => setNotice(null)} />

        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.nimText}>NIM {selectedStudent.nim}</Text>
            <StatusBadge status={selectedStudent.is_active ? 'active' : 'inactive'} />
          </View>
          <Text style={styles.studentTitle}>{selectedStudent.name}</Text>
          <Text style={styles.metaText}>{selectedStudent.program_study}</Text>
          {selectedStudent.email ? <Text style={styles.metaText}>{selectedStudent.email}</Text> : null}

          <View style={styles.actionRow}>
            <ActionButton
              title="Ubah Data"
              variant="outline"
              onPress={() => openEditModal(selectedStudent)}
              style={styles.flex1}
            />
            <ActionButton
              title={selectedStudent.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              variant={selectedStudent.is_active ? 'secondary' : 'primary'}
              loading={busy === 'toggle-active'}
              onPress={() => handleToggleActive(selectedStudent)}
              style={styles.flex1}
            />
          </View>
        </Card>

        <SectionTitle
          title="Registrasi Foto Wajah Baru"
          subtitle="Unggah foto wajah jelas untuk pencocokan identitas mahasiswa"
        />
        <Card>
          <View style={styles.actionRow}>
            <ActionButton
              title="Ambil Kamera"
              variant="outline"
              onPress={() => handlePickFace('camera')}
              style={styles.flex1}
            />
            <ActionButton
              title="Pilih Galeri"
              variant="outline"
              onPress={() => handlePickFace('library')}
              style={styles.flex1}
            />
          </View>

          {faceAsset ? (
            <Image source={{ uri: faceAsset.uri }} style={styles.facePreview} resizeMode="cover" />
          ) : null}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Jadikan Foto Utama (is_primary)</Text>
            <Switch value={isPrimary} onValueChange={setIsPrimary} />
          </View>

          <Pressable onPress={() => setHasConsent((v) => !v)} style={styles.consentRow}>
            <View style={[styles.checkbox, hasConsent && styles.checkboxChecked]}>
              {hasConsent ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.consentText}>
              Mahasiswa telah memberikan persetujuan eksplisit dan terinformasi atas pengambilan serta penyimpanan data biometrik wajahnya untuk keperluan presensi.
            </Text>
          </Pressable>

          <ActionButton
            title="Unggah Foto Wajah"
            disabled={!faceAsset || !hasConsent}
            loading={busy === 'upload-face'}
            onPress={handleUploadFace}
            style={styles.saveBtn}
          />
        </Card>

        <SectionTitle
          title={`Foto Wajah Terdaftar (${faces.length})`}
          subtitle="Signed URL MinIO berlaku 15 menit"
        />
        {loadingFaces ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
        ) : faces.length === 0 ? (
          <Card>
            <Text style={styles.mutedInfo}>Belum ada foto wajah terdaftar untuk mahasiswa ini.</Text>
          </Card>
        ) : (
          faces.map((face) => (
            <Card key={face.id}>
              {face.url ? (
                <Image source={{ uri: face.url }} style={styles.faceImage} resizeMode="cover" />
              ) : (
                <View style={styles.facePlaceholder}>
                  <Text style={styles.mutedInfo}>URL foto belum dimuat</Text>
                </View>
              )}

              <View style={[styles.rowBetween, { marginTop: 10 }]}>
                <View style={styles.badgeGroup}>
                  {face.is_primary ? <StatusBadge status="primary" label="UTAMA" /> : null}
                  <Text style={styles.metaText}>
                    Embedding: {face.embedding ? 'Tersedia' : 'Belum diproses AI'}
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <ActionButton
                  title="Perbarui URL"
                  variant="outline"
                  loading={busy === `refresh-${face.id}`}
                  onPress={() => handleRefreshUrl(face.id)}
                  style={styles.flex1}
                />
                {confirmDeleteId === face.id ? (
                  <>
                    <ActionButton
                      title="Yakin Hapus"
                      variant="danger"
                      loading={busy === `delete-${face.id}`}
                      onPress={() => handleDeleteFace(face.id)}
                      style={styles.flex1}
                    />
                    <ActionButton
                      title="Batal"
                      variant="outline"
                      onPress={() => setConfirmDeleteId(null)}
                      style={styles.flex1}
                    />
                  </>
                ) : (
                  <ActionButton
                    title="Hapus"
                    variant="danger"
                    onPress={() => setConfirmDeleteId(face.id)}
                    style={styles.flex1}
                  />
                )}
              </View>
            </Card>
          ))
        )}

        {studentModal}
      </ScrollView>
    );
  }

  // --- Student Directory View ---
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadStudents(search);
          }}
        />
      }
    >
      <Banner message={error} tone="error" onDismiss={() => setError(null)} />
      <Banner message={notice} tone="success" onDismiss={() => setNotice(null)} />

      <View style={styles.topControls}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Cari nama atau NIM..."
          style={[styles.input, styles.searchInput]}
          autoCapitalize="none"
        />
        <ActionButton title="+ Tambah" onPress={openCreateModal} style={styles.addBtn} />
      </View>

      <SectionTitle
        title="Daftar Mahasiswa"
        subtitle="Ketuk mahasiswa untuk mengelola data & registrasi foto wajah"
      />

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : students.length === 0 ? (
        <Card>
          <Text style={styles.mutedInfo}>Tidak ada mahasiswa ditemukan.</Text>
        </Card>
      ) : (
        students.map((s) => (
          <Pressable key={s.id} onPress={() => openStudentDetail(s)}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.nimText}>NIM {s.nim}</Text>
                <StatusBadge status={s.is_active ? 'active' : 'inactive'} />
              </View>
              <Text style={styles.studentTitle}>{s.name}</Text>
              <Text style={styles.metaText}>{s.program_study}</Text>
            </Card>
          </Pressable>
        ))
      )}

      {studentModal}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 28,
  },
  loader: {
    marginVertical: 24,
  },
  topControls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  addBtn: {
    paddingHorizontal: 14,
  },
  backBtn: {
    marginBottom: 10,
    paddingVertical: 6,
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  nimText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  studentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
  },
  mutedInfo: {
    fontSize: 13,
    color: COLORS.muted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  flex1: {
    flex: 1,
  },
  facePreview: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: '#E2E8F0',
  },
  faceImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  facePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  consentText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primaryDark,
    lineHeight: 17,
  },
  saveBtn: {
    marginTop: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalSheet: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    color: COLORS.text,
    marginBottom: 4,
  },
});
