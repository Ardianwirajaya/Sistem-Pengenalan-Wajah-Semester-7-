import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  getAttendanceReport,
  getClasses,
  getSchedules,
  type AttendanceReport,
  type ClassSchedule,
  type Kelas,
} from '../api/client';
import { ActionButton, Banner, COLORS, Card, SectionTitle } from '../components/Ui';
import { formatError } from '../utils/media';

export function ReportsScreen() {
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [filterMode, setFilterMode] = useState<'class' | 'schedule'>('class');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(
    async (
      mode: 'class' | 'schedule',
      classId: number | null,
      scheduleId: number | null,
      from: string,
      to: string,
    ) => {
      const params: {
        class_id?: number;
        class_schedule_id?: number;
        from?: string;
        to?: string;
      } = {};

      if (mode === 'class' && classId) {
        params.class_id = classId;
      } else if (mode === 'schedule' && scheduleId) {
        params.class_schedule_id = scheduleId;
      } else {
        setError('Pilih kelas atau jadwal terlebih dahulu.');
        return;
      }

      if (from.trim()) params.from = from.trim();
      if (to.trim()) params.to = to.trim();

      setLoadingReport(true);
      setError(null);
      try {
        const res = await getAttendanceReport(params);
        setReport(res);
      } catch (err) {
        setError(formatError(err));
      } finally {
        setLoadingReport(false);
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const [clsList, schedList] = await Promise.all([getClasses(), getSchedules()]);
        if (!mounted) return;
        setClasses(clsList);
        setSchedules(schedList);
        const firstClassId = clsList[0]?.id ?? null;
        const firstSchedId = schedList[0]?.id ?? null;
        setSelectedClassId(firstClassId);
        setSelectedScheduleId(firstSchedId);
        if (firstClassId) {
          await fetchReport('class', firstClassId, firstSchedId, '', '');
        }
      } catch (err) {
        if (mounted) setError(formatError(err));
      } finally {
        if (mounted) setLoadingInit(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [fetchReport]);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Banner message={error} tone="error" onDismiss={() => setError(null)} />

      <SectionTitle
        title="Filter Rekap Kehadiran"
        subtitle="Pilih berdasarkan kelas atau jadwal spesifik serta rentang tanggal"
      />
      <Card>
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setFilterMode('class')}
            style={[styles.modeBtn, filterMode === 'class' && styles.modeBtnActive]}
          >
            <Text style={[styles.modeText, filterMode === 'class' && styles.modeTextActive]}>
              Per Kelas
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterMode('schedule')}
            style={[styles.modeBtn, filterMode === 'schedule' && styles.modeBtnActive]}
          >
            <Text style={[styles.modeText, filterMode === 'schedule' && styles.modeTextActive]}>
              Per Jadwal
            </Text>
          </Pressable>
        </View>

        {loadingInit ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
        ) : filterMode === 'class' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {classes.map((c) => {
              const selected = c.id === selectedClassId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedClassId(c.id)}
                  style={[styles.chip, selected && styles.chipActive]}
                >
                  <Text style={[styles.chipTitle, selected && styles.chipTextActive]}>
                    {c.name} · {c.course?.code ?? ''}
                  </Text>
                  <Text style={[styles.chipSub, selected && styles.chipTextActive]}>
                    {c.course?.name ?? ''}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {schedules.map((s) => {
              const selected = s.id === selectedScheduleId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSelectedScheduleId(s.id)}
                  style={[styles.chip, selected && styles.chipActive]}
                >
                  <Text style={[styles.chipTitle, selected && styles.chipTextActive]}>
                    {s.kelas?.name ?? ''} · {s.day}
                  </Text>
                  <Text style={[styles.chipSub, selected && styles.chipTextActive]}>
                    {s.start_time}–{s.end_time} ({s.kelas?.course?.code ?? ''})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.dateRow}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Dari (opsional)</Text>
            <TextInput
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="YYYY-MM-DD"
              style={styles.input}
            />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.label}>Sampai (opsional)</Text>
            <TextInput
              value={toDate}
              onChangeText={setToDate}
              placeholder="YYYY-MM-DD"
              style={styles.input}
            />
          </View>
        </View>

        <ActionButton
          title="Muat Rekap Kehadiran"
          loading={loadingReport}
          onPress={() =>
            fetchReport(filterMode, selectedClassId, selectedScheduleId, fromDate, toDate)
          }
          style={styles.fetchBtn}
        />
      </Card>

      {report ? (
        <>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{report.total_sessions}</Text>
            <Text style={styles.summaryLabel}>Total Sesi Pertemuan</Text>
            <Text style={styles.summaryPeriod}>
              Periode: {report.from ?? 'Awal'} s/d {report.to ?? 'Sekarang'}
            </Text>
          </Card>

          <SectionTitle title={`Rekap Per Mahasiswa (${report.students.length})`} />

          {report.students.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>
                Belum ada catatan kehadiran pada filter kelas/jadwal ini.
              </Text>
            </Card>
          ) : (
            report.students.map((st) => {
              const pct =
                report.total_sessions > 0
                  ? Math.round((st.present / report.total_sessions) * 100)
                  : 0;
              return (
                <Card key={st.student_id}>
                  <View style={styles.rowBetween}>
                    <View style={styles.flex1}>
                      <Text style={styles.studentName}>{st.name ?? `Mahasiswa #${st.student_id}`}</Text>
                      <Text style={styles.studentNim}>NIM: {st.nim ?? '-'}</Text>
                    </View>
                    <View style={styles.pctBadge}>
                      <Text style={styles.pctText}>{pct}% Hadir</Text>
                    </View>
                  </View>

                  <View style={styles.countsRow}>
                    <View style={[styles.countBox, { backgroundColor: COLORS.successSoft }]}>
                      <Text style={[styles.countNum, { color: COLORS.success }]}>{st.present}</Text>
                      <Text style={[styles.countLabel, { color: COLORS.success }]}>Hadir</Text>
                    </View>
                    <View style={[styles.countBox, { backgroundColor: COLORS.primarySoft }]}>
                      <Text style={[styles.countNum, { color: COLORS.primaryDark }]}>{st.excused}</Text>
                      <Text style={[styles.countLabel, { color: COLORS.primaryDark }]}>Izin</Text>
                    </View>
                    <View style={[styles.countBox, { backgroundColor: COLORS.dangerSoft }]}>
                      <Text style={[styles.countNum, { color: COLORS.danger }]}>{st.absent}</Text>
                      <Text style={[styles.countLabel, { color: COLORS.danger }]}>Alpa</Text>
                    </View>
                    <View style={[styles.countBox, { backgroundColor: COLORS.warningSoft }]}>
                      <Text style={[styles.countNum, { color: COLORS.warning }]}>{st.unknown}</Text>
                      <Text style={[styles.countLabel, { color: COLORS.warning }]}>Unknown</Text>
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 28,
  },
  loader: {
    marginVertical: 14,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: COLORS.surface,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
  },
  modeTextActive: {
    color: COLORS.primary,
  },
  chipScroll: {
    marginBottom: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  chipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  chipSub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  chipTextActive: {
    color: COLORS.primaryDark,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#F8FAFC',
    color: COLORS.text,
  },
  fetchBtn: {
    marginTop: 12,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DBEAFE',
    marginTop: 2,
  },
  summaryPeriod: {
    fontSize: 11,
    color: '#BFDBFE',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  studentNim: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  pctBadge: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pctText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  countsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  countBox: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  countNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  countLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
