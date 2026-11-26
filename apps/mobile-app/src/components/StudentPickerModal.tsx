import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Student } from '../api/client';
import { COLORS } from './Ui';

export function StudentPickerModal({
  visible,
  students,
  selectedStudentId,
  usedByOtherFaces = {},
  onSelect,
  onClose,
}: {
  visible: boolean;
  students: Student[];
  selectedStudentId: number | null;
  usedByOtherFaces?: Record<number, string>;
  onSelect: (student: Student | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.nim.toLowerCase().includes(q),
    );
  }, [students, query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Pilih / Koreksi Mahasiswa</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>Tutup</Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari nama atau NIM..."
            style={styles.search}
            autoCapitalize="none"
          />

          <Pressable
            onPress={() => {
              onSelect(null);
              setQuery('');
              onClose();
            }}
            style={[styles.row, selectedStudentId === null && styles.rowSelected]}
          >
            <Text style={styles.unknownLabel}>Tidak Dikenali / Lewati Wajah (Unknown)</Text>
            <Text style={styles.sub}>student_id: null</Text>
          </Pressable>

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = item.id === selectedStudentId;
              const usedLabel = usedByOtherFaces[item.id];
              const isDisabled = Boolean(usedLabel) && !selected;
              return (
                <Pressable
                  disabled={isDisabled}
                  onPress={() => {
                    onSelect(item);
                    setQuery('');
                    onClose();
                  }}
                  style={[
                    styles.row,
                    selected && styles.rowSelected,
                    isDisabled && styles.rowDisabled,
                  ]}
                >
                  <Text style={[styles.name, isDisabled && styles.nameDisabled]}>{item.name}</Text>
                  <Text style={styles.sub}>
                    NIM: {item.nim} · {item.program_study}
                    {usedLabel ? ` · (${usedLabel})` : ''}
                  </Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.empty}>Tidak ada mahasiswa yang cocok.</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '82%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  close: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  search: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  list: {
    marginTop: 4,
  },
  row: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  rowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  rowDisabled: {
    opacity: 0.5,
    backgroundColor: '#F8FAFC',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  nameDisabled: {
    color: COLORS.muted,
  },
  unknownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
  },
  sub: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.muted,
    paddingVertical: 20,
    fontSize: 13,
  },
});
