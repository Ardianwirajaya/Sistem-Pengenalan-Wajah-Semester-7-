import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import {
  ApiError,
  confirmRecognition,
  createAttendanceSession,
  getAttendanceSession,
  getAttendanceSessions,
  getClasses,
  getCourses,
  getSchedules,
  getStudents,
  pollRecognitionUntilDone,
  updateAttendanceSessionStatus,
  uploadRecognitionPhoto,
  type AttendanceSession,
  type AttendanceStatus,
  type ClassSchedule,
  type ConfirmationItem,
  type Course,
  type Kelas,
  type RecognitionResult,
  type RecognitionSession,
  type SessionStatus,
  type Student,
} from '../api/client';
import { StudentPickerModal } from '../components/StudentPickerModal';
import { ActionButton, Banner, COLORS, Card, SectionTitle, StatusBadge } from '../components/Ui';
import { formatDateOnly, formatError, pickImageAsset, todayYmd } from '../utils/media';

interface DraftConfirmation {
  recognition_result_id: number;
  student_id: number | null;
  student_label: string;
  status: AttendanceStatus;
}

const ATTENDANCE_STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Hadir' },
  { value: 'excused', label: 'Izin' },
  { value: 'absent', label: 'Alpa' },
  { value: 'unknown', label: 'Unknown' },
];

function isSmallFaceBbox(bbox: number[] | null): boolean {
  if (!bbox || bbox.length < 4) return false;
  const width = Math.abs(bbox[2] - bbox[0]);
  const height = Math.abs(bbox[3] - bbox[1]);
  return width > 0 && height > 0 && (width < 40 || height < 40);
}

function buildInitialDrafts(results: RecognitionResult[]): Record<number, DraftConfirmation> {
  const drafts: Record<number, DraftConfirmation> = {};
  for (const r of results) {
    const student = r.candidate_student ?? null;
    const isMatched = r.status === 'matched' && (student !== null || r.candidate_student_id !== null);
    drafts[r.id] = {
      recognition_result_id: r.id,
      student_id: isMatched ? (student ? student.id : r.candidate_student_id) : null,
      student_label: isMatched
        ? student
          ? `${student.nim} · ${student.name}`
          : `Mahasiswa #${r.candidate_student_id}`
        : 'Tidak Dikenali (Unknown)',
      status: isMatched ? 'present' : 'unknown',
    };
  }
  return drafts;
}

export function AttendanceScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [recentSessions, setRecentSessions] = useState<AttendanceSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessionDate, setSessionDate] = useState(todayYmd());
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [activeRecognition, setActiveRecognition] = useState<RecognitionSession | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ImagePickerAsset | null>(null);
  const [drafts, setDrafts] = useState<Record<number, DraftConfirmation>>({});
  const [pickerResultId, setPickerResultId] = useState<number | null>(null);
  const [pollingInfo, setPollingInfo] = useState<{
    status: string;
    attempt: number;
    maxAttempts: number;
  } | null>(null);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    try {
      setError(null);
      const [courseList, classList, scheds, sessPage, studPage] = await Promise.all([
        getCourses(),
        getClasses(),
        getSchedules(),
        getAttendanceSessions(),
        getStudents({ is_active: true, per_page: 100 }),
      ]);
      setCourses(courseList);
      setClasses(classList);
      setSchedules(scheds);
      setRecentSessions(sessPage.data);
      setStudents(studPage.data);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  function selectRecognition(rec: RecognitionSession | null) {
    setActiveRecognition(rec);
    setDrafts(rec?.results ? buildInitialDrafts(rec.results) : {});
  }

  async function openSessionDetail(sessionId: number) {
    setBusyAction('load-session');
    setError(null);
    setNotice(null);
    try {
      const detail = await getAttendanceSession(sessionId);
      setActiveSession(detail);
      setSelectedAsset(null);
      const recs = detail.recognition_sessions ?? [];
      selectRecognition(recs.length ? recs[recs.length - 1] : null);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleStartSession(scheduleId: number) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate.trim())) {
      setError('Format tanggal harus YYYY-MM-DD (contoh: 2026-11-20).');
      return;
    }
    setBusyAction(`open-${scheduleId}`);
    setError(null);
    setNotice(null);
    try {
      const created = await createAttendanceSession(scheduleId, sessionDate.trim());
      await openSessionDetail(created.id);
      setNotice('Sesi presensi berhasil dibuka.');
      loadInitialData();
    } catch (err) {
      // If session already exists for this schedule + date (422), open the existing session directly
      if (err instanceof ApiError && err.status === 422) {
        try {
          const existing = await getAttendanceSessions({
            class_schedule_id: scheduleId,
            date: sessionDate.trim(),
          });
          if (existing.data.length > 0) {
            await openSessionDetail(existing.data[0].id);
            setNotice('Sesi untuk jadwal & tanggal ini sudah ada — membuka sesi tersebut.');
            return;
          }
        } catch {
          // fall through to show original error
        }
      }
      setError(formatError(err));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleChangeSessionStatus(nextStatus: SessionStatus) {
    if (!activeSession) return;
    setBusyAction('status');
    setError(null);
    try {
      await updateAttendanceSessionStatus(activeSession.id, nextStatus);
      const refreshed = await getAttendanceSession(activeSession.id);
      setActiveSession(refreshed);
      setNotice(`Status sesi diubah menjadi ${nextStatus.toUpperCase()}.`);
      loadInitialData();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePickPhoto(source: 'camera' | 'library') {
    setError(null);
    const { asset, error: pickErr } = await pickImageAsset(source);
    if (pickErr) {
      setError(pickErr);
      return;
    }
    if (asset) {
      setSelectedAsset(asset);
    }
  }

  async function handleRunRecognition() {
    if (!activeSession || !selectedAsset) return;
    setBusyAction('recognize');
    setError(null);
    setNotice(null);
    setPollingInfo(null);
    try {
      const initialRec = await uploadRecognitionPhoto(activeSession.id, selectedAsset);
      let finalRec = initialRec;
      if (initialRec.status === 'queued' || initialRec.status === 'processing') {
        setPollingInfo({ status: initialRec.status, attempt: 0, maxAttempts: 30 });
        finalRec = await pollRecognitionUntilDone(initialRec.id, (progress, attempt, maxAttempts) => {
          setPollingInfo({ status: progress.status, attempt, maxAttempts });
          selectRecognition(progress);
        });
      }
      setPollingInfo(null);
      const refreshed = await getAttendanceSession(activeSession.id);
      setActiveSession(refreshed);
      selectRecognition(finalRec);
      setNotice(
        finalRec.status === 'completed'
          ? `Pengenalan selesai (${finalRec.results?.length ?? 0} wajah terdeteksi). Silakan periksa & konfirmasi.`
          : `Status pengenalan: ${finalRec.status}.`,
      );
    } catch (err) {
      setPollingInfo(null);
      setError(formatError(err));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleConfirmAttendance() {
    if (!activeSession || !activeRecognition) return;
    const confirmationList: ConfirmationItem[] = Object.values(drafts).map((d) => ({
      recognition_result_id: d.recognition_result_id,
      student_id: d.student_id,
      status: d.status,
    }));

    if (confirmationList.length === 0) {
      setError('Tidak ada hasil deteksi wajah untuk dikonfirmasi.');
      return;
    }

    // Prevent duplicate student_id in one recognition confirmation batch
    const seenStudents = new Set<number>();
    for (const item of confirmationList) {
      if (item.student_id !== null) {
        if (seenStudents.has(item.student_id)) {
          setError('Terdapat mahasiswa ganda pada hasil deteksi. Pastikan satu mahasiswa hanya dipilih satu kali dalam satu sesi.');
          return;
        }
        seenStudents.add(item.student_id);
      }
    }

    setBusyAction('confirm');
    setError(null);
    setNotice(null);
    try {
      const res = await confirmRecognition(activeRecognition.id, confirmationList);
      const refreshed = await getAttendanceSession(activeSession.id);
      setActiveSession(refreshed);
      setNotice(`${res.message} (${res.attendance_records.length} data kehadiran tersimpan).`);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusyAction(null);
    }
  }

  function updateDraftStudent(resultId: number, student: Student | null) {
    if (student) {
      const duplicateEntry = Object.values(drafts).find(
        (d) => d.recognition_result_id !== resultId && d.student_id === student.id,
      );
      if (duplicateEntry) {
        setError(`Mahasiswa ${student.name} sudah dipilih pada wajah lain dalam sesi ini.`);
        return;
      }
    }
    setDrafts((prev) => {
      const current = prev[resultId];
      if (!current) return prev;
      return {
        ...prev,
        [resultId]: {
          ...current,
          student_id: student ? student.id : null,
          student_label: student ? `${student.nim} · ${student.name}` : 'Tidak Dikenali (Unknown)',
          status: student ? (current.status === 'unknown' ? 'present' : current.status) : 'unknown',
        },
      };
    });
  }

  function updateDraftStatus(resultId: number, status: AttendanceStatus) {
    setDrafts((prev) => {
      const current = prev[resultId];
      if (!current) return prev;
      return {
        ...prev,
        [resultId]: { ...current, status },
      };
    });
  }

  // --- Detail View (Steps 3-7) ---
  if (activeSession) {
    const course = activeSession.schedule?.kelas?.course;
    const kelas = activeSession.schedule?.kelas;
    const recSessions = activeSession.recognition_sessions ?? [];
    const results = activeRecognition?.results ?? [];
    const details = activeSession.details ?? [];
    const isSessionOpen = activeSession.status === 'open';

    return (
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={busyAction === 'load-session'}
            onRefresh={() => openSessionDetail(activeSession.id)}
          />
        }
      >
        <Pressable onPress={() => setActiveSession(null)} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Kembali ke Jadwal & Daftar Sesi</Text>
        </Pressable>

        <Banner message={error} tone="error" onDismiss={() => setError(null)} />
        <Banner message={notice} tone="success" onDismiss={() => setNotice(null)} />

        {/* Step 3: Session Header */}
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.courseCode}>{course?.code ?? 'MK'}</Text>
            <StatusBadge status={activeSession.status} />
          </View>
          <Text style={styles.cardTitle}>{course?.name ?? 'Mata Kuliah'}</Text>
          <Text style={styles.metaText}>
            Kelas {kelas?.name ?? '-'} · {activeSession.schedule?.day ?? '-'}{' '}
            {activeSession.schedule?.start_time}–{activeSession.schedule?.end_time}
            {activeSession.schedule?.room ? ` · ${activeSession.schedule.room}` : ''}
          </Text>
          <Text style={styles.metaText}>Tanggal Sesi: {formatDateOnly(activeSession.date)}</Text>

          <View style={styles.statusActions}>
            {activeSession.status !== 'open' ? (
              <ActionButton
                title="Buka Kembali"
                variant="outline"
                loading={busyAction === 'status'}
                onPress={() => handleChangeSessionStatus('open')}
                style={styles.flexBtn}
              />
            ) : (
              <>
                <ActionButton
                  title="Tutup Sesi"
                  variant="secondary"
                  loading={busyAction === 'status'}
                  onPress={() => handleChangeSessionStatus('closed')}
                  style={styles.flexBtn}
                />
                <ActionButton
                  title="Batalkan"
                  variant="danger"
                  loading={busyAction === 'status'}
                  onPress={() => handleChangeSessionStatus('cancelled')}
                  style={styles.flexBtn}
                />
              </>
            )}
          </View>
        </Card>

        {/* Step 4: Camera / Photo Upload */}
        <SectionTitle
          title="Ambil / Unggah Foto Kelas"
          subtitle="Foto akan dikirim ke Laravel API & diproses AI (YOLOv11 + ArcFace)"
        />
        <Card>
          {!isSessionOpen ? (
            <Text style={styles.mutedInfo}>
              Sesi berstatus {activeSession.status.toUpperCase()}. Buka kembali sesi untuk mengunggah foto baru.
            </Text>
          ) : (
            <>
              <View style={styles.photoBtnRow}>
                <ActionButton
                  title="Ambil Kamera"
                  variant="outline"
                  onPress={() => handlePickPhoto('camera')}
                  style={styles.flexBtn}
                />
                <ActionButton
                  title="Pilih Galeri"
                  variant="outline"
                  onPress={() => handlePickPhoto('library')}
                  style={styles.flexBtn}
                />
              </View>

              {selectedAsset ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: selectedAsset.uri }} style={styles.previewImg} resizeMode="cover" />
                  <ActionButton
                    title="Proses Pengenalan Wajah (AI)"
                    loading={busyAction === 'recognize'}
                    onPress={handleRunRecognition}
                    style={styles.processBtn}
                  />
                  {pollingInfo ? (
                    <View style={styles.pollingBox}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.pollingText}>
                        Memproses YOLOv11 & ArcFace ({pollingInfo.status.toUpperCase()}) · Polling{' '}
                        {pollingInfo.attempt}/{pollingInfo.maxAttempts}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.mutedInfo}>
                  Ambil foto suasana ruang kelas atau pilih foto dari galeri perangkat.
                </Text>
              )}
            </>
          )}
        </Card>

        {/* Step 5 & 6: Recognition Results & Lecturer Verification */}
        {recSessions.length > 0 ? (
          <>
            <SectionTitle
              title="Hasil Deteksi & Validasi Dosen"
              subtitle="Periksa skor kemiripan, koreksi nama bila perlu, lalu konfirmasi kehadiran"
            />

            {recSessions.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recTabs}>
                {recSessions.map((rs, idx) => {
                  const selected = activeRecognition?.id === rs.id;
                  return (
                    <Pressable
                      key={rs.id}
                      onPress={() => selectRecognition(rs)}
                      style={[styles.recTab, selected && styles.recTabActive]}
                    >
                      <Text style={[styles.recTabText, selected && styles.recTabTextActive]}>
                        Scan #{idx + 1} ({rs.results?.length ?? 0})
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {activeRecognition ? (
              <Card>
                <View style={styles.rowBetween}>
                  <Text style={styles.auditText}>
                    Model: {activeRecognition.model_version ?? '-'} ·{' '}
                    {activeRecognition.processing_time_ms ?? 0} ms
                  </Text>
                  <StatusBadge status={activeRecognition.status} />
                </View>

                <View style={styles.cautionBox}>
                  <Text style={styles.cautionText}>
                    Alat bantu presensi: wajah unknown atau skor rendah wajib diperiksa manual oleh dosen sebelum dikonfirmasi.
                  </Text>
                </View>

                {results.length === 0 ? (
                  <Text style={styles.mutedInfo}>Belum ada wajah terdeteksi pada scan ini.</Text>
                ) : (
                  results.map((res, index) => {
                    const draft = drafts[res.id];
                    const scorePct =
                      res.similarity_score !== null ? Math.round(res.similarity_score * 100) : 0;
                    const smallFace = isSmallFaceBbox(res.bbox);
                    const hasQualityIssue =
                      (res.quality_flag && res.quality_flag !== 'clear') || smallFace;
                    const needsManualCheck = res.status === 'unknown' || hasQualityIssue;

                    return (
                      <View
                        key={res.id}
                        style={[styles.faceBox, needsManualCheck && styles.faceBoxWarning]}
                      >
                        <View style={styles.rowBetween}>
                          <Text style={styles.faceTitle}>Wajah #{index + 1}</Text>
                          <View style={styles.scoreRow}>
                            <Text style={styles.scoreText}>Skor {scorePct}%</Text>
                            <StatusBadge status={res.status} />
                            {res.quality_flag && res.quality_flag !== 'clear' ? (
                              <StatusBadge status={res.quality_flag} />
                            ) : smallFace ? (
                              <StatusBadge status="too_small" />
                            ) : null}
                          </View>
                        </View>

                        {needsManualCheck ? (
                          <Text style={styles.qualityNoteText}>
                            Peringatan: {res.quality_note || (res.status === 'unknown' ? 'Wajah tidak dikenali (unknown).' : 'Kualitas wajah kurang optimal (blur/tertutup/terlalu kecil).')} Harap periksa manual.
                          </Text>
                        ) : null}

                        {res.bbox ? (
                          <Text style={styles.bboxText}>
                            Bounding Box: [{res.bbox.join(', ')}]
                          </Text>
                        ) : null}

                        <Pressable
                          onPress={() => setPickerResultId(res.id)}
                          style={styles.studentSelector}
                        >
                          <View style={styles.flex1}>
                            <Text style={styles.selectorLabel}>Identitas Mahasiswa (Ketuk untuk koreksi)</Text>
                            <Text
                              style={[
                                styles.selectorValue,
                                !draft?.student_id && { color: COLORS.warning },
                              ]}
                            >
                              {draft?.student_label ?? 'Pilih mahasiswa...'}
                            </Text>
                          </View>
                          <Text style={styles.changeLink}>Ubah</Text>
                        </Pressable>

                        <View style={styles.pillRow}>
                          {ATTENDANCE_STATUS_OPTIONS.map((opt) => {
                            const selected = draft?.status === opt.value;
                            return (
                              <Pressable
                                key={opt.value}
                                onPress={() => updateDraftStatus(res.id, opt.value)}
                                style={[styles.statusPill, selected && styles.statusPillActive]}
                              >
                                <Text
                                  style={[
                                    styles.statusPillText,
                                    selected && styles.statusPillTextActive,
                                  ]}
                                >
                                  {opt.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })
                )}

                {results.length > 0 ? (
                  <ActionButton
                    title="Konfirmasi Presensi"
                    loading={busyAction === 'confirm'}
                    onPress={handleConfirmAttendance}
                    style={styles.confirmBtn}
                  />
                ) : null}
              </Card>
            ) : null}
          </>
        ) : null}

        {/* Step 7: Confirmed Attendance Records */}
        <SectionTitle
          title={`Kehadiran Tersimpan (${details.length})`}
          subtitle="Daftar mahasiswa yang telah disahkan pada sesi ini"
        />
        <Card>
          {details.length === 0 ? (
            <Text style={styles.mutedInfo}>Belum ada kehadiran yang dikonfirmasi pada sesi ini.</Text>
          ) : (
            details.map((item) => (
              <View key={item.id} style={styles.detailRow}>
                <View style={styles.flex1}>
                  <Text style={styles.detailName}>{item.student?.name ?? `Mahasiswa #${item.student_id}`}</Text>
                  <Text style={styles.detailSub}>
                    NIM: {item.student?.nim ?? '-'}
                    {item.confirmed_at ? ` · Dikonfirmasi ${item.confirmed_at.slice(11, 16)}` : ''}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
            ))
          )}
        </Card>

        <StudentPickerModal
          visible={pickerResultId !== null}
          students={students}
          selectedStudentId={pickerResultId !== null ? drafts[pickerResultId]?.student_id ?? null : null}
          usedByOtherFaces={(() => {
            const map: Record<number, string> = {};
            results.forEach((r, idx) => {
              if (r.id === pickerResultId) return;
              const d = drafts[r.id];
              if (d?.student_id) {
                map[d.student_id] = `Sudah dipilih di Wajah #${idx + 1}`;
              }
            });
            return map;
          })()}
          onSelect={(student) => {
            if (pickerResultId !== null) {
              updateDraftStudent(pickerResultId, student);
            }
          }}
          onClose={() => setPickerResultId(null)}
        />
      </ScrollView>
    );
  }

  // --- Schedule & Session Picker View (Steps 1-2) ---
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadInitialData();
          }}
        />
      }
    >
      <Banner message={error} tone="error" onDismiss={() => setError(null)} />
      <Banner message={notice} tone="success" onDismiss={() => setNotice(null)} />

      <Card>
        <Text style={styles.inputLabel}>Tanggal Sesi Presensi (YYYY-MM-DD)</Text>
        <TextInput
          value={sessionDate}
          onChangeText={setSessionDate}
          placeholder="2026-11-20"
          style={styles.dateInput}
        />

        {courses.length > 0 ? (
          <>
            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Filter Mata Kuliah</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <Pressable
                onPress={() => {
                  setSelectedCourseId(null);
                  setSelectedClassId(null);
                }}
                style={[styles.filterChip, selectedCourseId === null && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCourseId === null && styles.filterChipTextActive,
                  ]}
                >
                  Semua MK
                </Text>
              </Pressable>
              {courses.map((c) => {
                const active = selectedCourseId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setSelectedCourseId(c.id);
                      setSelectedClassId(null);
                    }}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {c.code} · {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {classes.length > 0 ? (
          <>
            <Text style={[styles.inputLabel, { marginTop: 8 }]}>Filter Kelas</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <Pressable
                onPress={() => setSelectedClassId(null)}
                style={[styles.filterChip, selectedClassId === null && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedClassId === null && styles.filterChipTextActive,
                  ]}
                >
                  Semua Kelas
                </Text>
              </Pressable>
              {classes
                .filter((k) => selectedCourseId === null || k.course_id === selectedCourseId)
                .map((k) => {
                  const active = selectedClassId === k.id;
                  return (
                    <Pressable
                      key={k.id}
                      onPress={() => setSelectedClassId(k.id)}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {k.name} ({k.course?.code ?? ''})
                      </Text>
                    </Pressable>
                  );
                })}
            </ScrollView>
          </>
        ) : null}
      </Card>

      <SectionTitle
        title="Jadwal Kelas Tersedia"
        subtitle="Pilih jadwal untuk membuka sesi presensi baru"
      />
      {loadingList ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (() => {
        const filteredSchedules = schedules.filter((sched) => {
          if (selectedClassId !== null && sched.class_id !== selectedClassId) return false;
          if (selectedCourseId !== null && sched.kelas?.course_id !== selectedCourseId) return false;
          return true;
        });

        if (filteredSchedules.length === 0) {
          return (
            <Card>
              <Text style={styles.mutedInfo}>Tidak ada jadwal kelas yang cocok dengan filter.</Text>
            </Card>
          );
        }

        return filteredSchedules.map((sched) => (
          <Card key={sched.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.courseCode}>{sched.kelas?.course?.code ?? 'MK'}</Text>
              <Text style={styles.roomBadge}>
                {sched.day} · {sched.start_time}–{sched.end_time}
              </Text>
            </View>
            <Text style={styles.cardTitle}>{sched.kelas?.course?.name ?? 'Mata Kuliah'}</Text>
            <Text style={styles.metaText}>
              Kelas {sched.kelas?.name ?? '-'} · Ruang {sched.room ?? '-'}
            </Text>
            <ActionButton
              title="Buka Sesi Presensi"
              loading={busyAction === `open-${sched.id}`}
              onPress={() => handleStartSession(sched.id)}
              style={styles.openSessionBtn}
            />
          </Card>
        ));
      })()}

      <SectionTitle
        title="Riwayat Sesi Presensi"
        subtitle="Ketuk sesi untuk lanjut scan foto atau lihat daftar kehadiran"
      />
      {recentSessions.length === 0 ? (
        <Card>
          <Text style={styles.mutedInfo}>Belum ada sesi presensi yang tercatat.</Text>
        </Card>
      ) : (
        recentSessions.map((sess) => (
          <Pressable key={sess.id} onPress={() => openSessionDetail(sess.id)}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.courseCode}>
                  {sess.schedule?.kelas?.course?.code ?? `Sesi #${sess.id}`} ·{' '}
                  {sess.schedule?.kelas?.name ?? '-'}
                </Text>
                <StatusBadge status={sess.status} />
              </View>
              <Text style={styles.cardTitle}>
                {sess.schedule?.kelas?.course?.name ?? 'Sesi Presensi'}
              </Text>
              <Text style={styles.metaText}>
                Tanggal: {formatDateOnly(sess.date)} · {sess.schedule?.day ?? ''}{' '}
                {sess.schedule?.start_time ?? ''}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
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
  backBtn: {
    marginBottom: 10,
    paddingVertical: 6,
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    color: COLORS.text,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  courseCode: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  roomBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  openSessionBtn: {
    marginTop: 10,
  },
  statusActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  flexBtn: {
    flex: 1,
  },
  photoBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  previewWrap: {
    marginTop: 12,
  },
  previewImg: {
    width: '100%',
    height: 210,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  processBtn: {
    marginTop: 10,
  },
  pollingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primarySoft,
  },
  pollingText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  filterRow: {
    marginBottom: 4,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  filterChipTextActive: {
    color: COLORS.primaryDark,
  },
  mutedInfo: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 8,
    lineHeight: 18,
  },
  recTabs: {
    marginBottom: 10,
  },
  recTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginRight: 8,
  },
  recTabActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  recTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  recTabTextActive: {
    color: COLORS.primaryDark,
  },
  auditText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  cautionBox: {
    backgroundColor: COLORS.warningSoft,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  cautionText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  faceBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    backgroundColor: '#F8FAFC',
  },
  faceBoxWarning: {
    borderColor: COLORS.warning,
    backgroundColor: '#FFFBEB',
  },
  faceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  bboxText: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },
  qualityNoteText: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '600',
    marginTop: 4,
  },
  studentSelector: {
    marginTop: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  flex1: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 11,
    color: COLORS.muted,
  },
  selectorValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  changeLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  statusPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  statusPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  statusPillTextActive: {
    color: '#FFFFFF',
  },
  confirmBtn: {
    marginTop: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  detailName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  detailSub: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
});
