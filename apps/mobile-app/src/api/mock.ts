import type { ImagePickerAsset } from 'expo-image-picker';
import type {
  AttendanceDetail,
  AttendanceReport,
  AttendanceSession,
  ClassSchedule,
  ConfirmationItem,
  Course,
  Kelas,
  PaginatedResponse,
  RecognitionResult,
  RecognitionSession,
  SessionStatus,
  Student,
  StudentFace,
  User,
} from './client';

const delay = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_USERS: User[] = [
  { id: 1, name: 'Admin Sistem', email: 'admin@example.com', role: 'admin', is_active: true },
  { id: 2, name: 'Dr. Budi Santoso', email: 'budi@example.com', role: 'dosen', is_active: true },
  { id: 3, name: 'Ir. Siti Nurhaliza', email: 'siti@example.com', role: 'dosen', is_active: true },
];

const MOCK_COURSES: Course[] = [
  { id: 1, code: 'IF101', name: 'Algoritma & Pemrograman', sks: 3, is_active: true },
  { id: 2, code: 'IF201', name: 'Basis Data', sks: 3, is_active: true },
  { id: 3, code: 'IF301', name: 'Pemrograman Web', sks: 3, is_active: true },
];

const MOCK_CLASSES: Kelas[] = [
  { id: 1, course_id: 1, name: 'IF-1A', semester: 1, academic_year: '2025/2026', is_active: true, course: MOCK_COURSES[0] },
  { id: 2, course_id: 2, name: 'IF-2A', semester: 3, academic_year: '2025/2026', is_active: true, course: MOCK_COURSES[1] },
  { id: 3, course_id: 3, name: 'IF-3A', semester: 5, academic_year: '2025/2026', is_active: true, course: MOCK_COURSES[2] },
];

const MOCK_SCHEDULES: ClassSchedule[] = [
  { id: 1, class_id: 1, day: 'Senin', start_time: '08:00', end_time: '09:40', room: 'R.301', kelas: MOCK_CLASSES[0] },
  { id: 2, class_id: 1, day: 'Rabu', start_time: '13:00', end_time: '14:40', room: 'Lab.2', kelas: MOCK_CLASSES[0] },
  { id: 3, class_id: 2, day: 'Selasa', start_time: '10:00', end_time: '11:40', room: 'R.205', kelas: MOCK_CLASSES[1] },
  { id: 4, class_id: 3, day: 'Kamis', start_time: '08:00', end_time: '09:40', room: 'Lab.3', kelas: MOCK_CLASSES[2] },
];

let mockStudents: Student[] = [
  { id: 1, nim: '2025001', name: 'Ahmad Fauzi', email: 'ahmad@student.example.com', program_study: 'Informatika', is_active: true },
  { id: 2, nim: '2025002', name: 'Budi Rahmawan', email: 'budir@student.example.com', program_study: 'Informatika', is_active: true },
  { id: 3, nim: '2025003', name: 'Citra Dewi', email: 'citra@student.example.com', program_study: 'Informatika', is_active: true },
  { id: 4, nim: '2025004', name: 'Dimas Pratama', email: 'dimas@student.example.com', program_study: 'Informatika', is_active: true },
  { id: 5, nim: '2025005', name: 'Eka Putri', email: 'eka@student.example.com', program_study: 'Informatika', is_active: true },
  { id: 6, nim: '2025006', name: 'Fajar Nugroho', email: 'fajar@student.example.com', program_study: 'Informatika', is_active: true },
  { id: 7, nim: '2025007', name: 'Gita Lestari', email: 'gita@student.example.com', program_study: 'Informatika', is_active: true },
  { id: 8, nim: '2025008', name: 'Hendra Wijaya', email: 'hendra@student.example.com', program_study: 'Informatika', is_active: true },
];

let mockFaces: StudentFace[] = [
  {
    id: 1,
    student_id: 1,
    object_key: 'students/1/faces/primary.jpg',
    embedding: 'arcface-512d-mock',
    model_version: 'arcface-buffalo_l-v1.0',
    is_primary: true,
    url: 'https://placehold.co/400x400/2563EB/FFFFFF?text=Ahmad+Fauzi',
  },
];

let mockAttendanceSessions: AttendanceSession[] = [
  {
    id: 1,
    class_schedule_id: 1,
    date: '2026-11-18T00:00:00.000000Z',
    opened_by: 2,
    status: 'closed',
    schedule: MOCK_SCHEDULES[0],
    openedBy: MOCK_USERS[1],
    details: [
      {
        id: 1,
        attendance_session_id: 1,
        student_id: 1,
        status: 'present',
        recognition_result_id: null,
        confirmed_by: 2,
        confirmed_at: '2026-11-18T08:15:00Z',
        student: mockStudents[0],
      },
      {
        id: 2,
        attendance_session_id: 1,
        student_id: 2,
        status: 'present',
        recognition_result_id: null,
        confirmed_by: 2,
        confirmed_at: '2026-11-18T08:15:00Z',
        student: mockStudents[1],
      },
      {
        id: 3,
        attendance_session_id: 1,
        student_id: 3,
        status: 'excused',
        recognition_result_id: null,
        confirmed_by: 2,
        confirmed_at: '2026-11-18T08:15:00Z',
        student: mockStudents[2],
      },
    ],
    recognition_sessions: [],
  },
];

let mockRecognitions: RecognitionSession[] = [];
const pollCountByRecId: Record<number, number> = {};
let activeMockUser: User = MOCK_USERS[1];
let nextId = 100;

function makeResults(recognitionSessionId: number): RecognitionResult[] {
  return [
    {
      id: ++nextId,
      recognition_session_id: recognitionSessionId,
      bbox: [110, 120, 220, 240],
      candidate_student_id: mockStudents[0].id,
      similarity_score: 0.92,
      status: 'matched',
      quality_flag: 'clear',
      quality_note: null,
      candidate_student: mockStudents[0],
    },
    {
      id: ++nextId,
      recognition_session_id: recognitionSessionId,
      bbox: [270, 115, 380, 235],
      candidate_student_id: mockStudents[1].id,
      similarity_score: 0.87,
      status: 'matched',
      quality_flag: 'clear',
      quality_note: null,
      candidate_student: mockStudents[1],
    },
    {
      id: ++nextId,
      recognition_session_id: recognitionSessionId,
      bbox: [430, 140, 520, 245],
      candidate_student_id: mockStudents[2].id,
      similarity_score: 0.61,
      status: 'matched',
      quality_flag: 'blur',
      quality_note: 'Wajah blur / gerak — perlu pemeriksaan manual dosen',
      candidate_student: mockStudents[2],
    },
    {
      id: ++nextId,
      recognition_session_id: recognitionSessionId,
      bbox: [560, 130, 660, 245],
      candidate_student_id: mockStudents[3].id,
      similarity_score: 0.54,
      status: 'unknown',
      quality_flag: 'occluded',
      quality_note: 'Sebagian wajah tertutup masker/tangan — periksa manual',
      candidate_student: null,
    },
    {
      id: ++nextId,
      recognition_session_id: recognitionSessionId,
      bbox: [700, 135, 795, 240],
      candidate_student_id: null,
      similarity_score: 0.29,
      status: 'unknown',
      quality_flag: 'clear',
      quality_note: 'Wajah tidak cocok dengan data mahasiswa terdaftar',
      candidate_student: null,
    },
  ];
}

export const mockApi = {
  async login(email: string, _password: string): Promise<{ token: string; user: User }> {
    await delay(550);
    const found = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    activeMockUser = found ?? {
      id: 99,
      name: email.split('@')[0] || 'Dosen Demo',
      email,
      role: 'dosen',
      is_active: true,
    };
    return { token: `mock-sanctum-token-${activeMockUser.id}`, user: activeMockUser };
  },

  async getUser(): Promise<User> {
    await delay(250);
    return activeMockUser;
  },

  async logout(): Promise<void> {
    await delay(250);
  },

  async getClasses(params?: { course_id?: number; academic_year?: string }): Promise<Kelas[]> {
    await delay(350);
    return MOCK_CLASSES.filter((c) => {
      if (params?.course_id && c.course_id !== params.course_id) return false;
      if (params?.academic_year && c.academic_year !== params.academic_year) return false;
      return true;
    });
  },

  async getSchedules(params?: { class_id?: number; day?: string }): Promise<ClassSchedule[]> {
    await delay(350);
    return MOCK_SCHEDULES.filter((s) => {
      if (params?.class_id && s.class_id !== params.class_id) return false;
      if (params?.day && s.day !== params.day) return false;
      return true;
    });
  },

  async getAttendanceSessions(params?: {
    class_schedule_id?: number;
    date?: string;
    status?: SessionStatus;
  }): Promise<PaginatedResponse<AttendanceSession>> {
    await delay(350);
    const filtered = mockAttendanceSessions.filter((s) => {
      if (params?.class_schedule_id && s.class_schedule_id !== params.class_schedule_id) return false;
      if (params?.date && s.date.slice(0, 10) !== params.date) return false;
      if (params?.status && s.status !== params.status) return false;
      return true;
    });
    return {
      data: filtered,
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: filtered.length,
    };
  },

  async createAttendanceSession(
    classScheduleId: number,
    date: string,
    make422: (msg: string, field: string) => Error,
  ): Promise<AttendanceSession> {
    await delay(450);
    const duplicate = mockAttendanceSessions.find(
      (s) => s.class_schedule_id === classScheduleId && s.date.slice(0, 10) === date,
    );
    if (duplicate) {
      throw make422('An attendance session already exists for this schedule and date.', 'class_schedule_id');
    }
    const schedule = MOCK_SCHEDULES.find((s) => s.id === classScheduleId);
    const created: AttendanceSession = {
      id: ++nextId,
      class_schedule_id: classScheduleId,
      date: `${date}T00:00:00.000000Z`,
      opened_by: activeMockUser.id,
      status: 'open',
      schedule,
      openedBy: activeMockUser,
      details: [],
      recognition_sessions: [],
    };
    mockAttendanceSessions = [created, ...mockAttendanceSessions];
    return created;
  },

  async getAttendanceSession(id: number): Promise<AttendanceSession> {
    await delay(300);
    const found = mockAttendanceSessions.find((s) => s.id === id);
    if (!found) throw new Error(`Sesi presensi #${id} tidak ditemukan.`);
    return {
      ...found,
      details: [...(found.details ?? [])],
      recognition_sessions: mockRecognitions.filter((r) => r.attendance_session_id === id),
    };
  },

  async updateAttendanceSessionStatus(id: number, status: SessionStatus): Promise<AttendanceSession> {
    await delay(350);
    const found = mockAttendanceSessions.find((s) => s.id === id);
    if (!found) throw new Error(`Sesi presensi #${id} tidak ditemukan.`);
    found.status = status;
    return found;
  },

  async uploadRecognitionPhoto(attendanceSessionId: number, _asset: ImagePickerAsset): Promise<RecognitionSession> {
    await delay(700);
    const session = mockAttendanceSessions.find((s) => s.id === attendanceSessionId);
    if (!session || session.status !== 'open') {
      throw new Error('Sesi presensi tidak sedang dibuka.');
    }
    const recId = ++nextId;
    const rec: RecognitionSession = {
      id: recId,
      attendance_session_id: attendanceSessionId,
      image_object_key: `sessions/${attendanceSessionId}/mock-${recId}.jpg`,
      status: 'processing',
      model_version: 'yolov11-face+arcface-mock',
      processing_time_ms: null,
      results: [],
    };
    pollCountByRecId[recId] = 0;
    mockRecognitions = [...mockRecognitions, rec];
    return rec;
  },

  async getRecognition(id: number): Promise<RecognitionSession> {
    await delay(400);
    const rec = mockRecognitions.find((r) => r.id === id);
    if (!rec) throw new Error(`Recognition #${id} tidak ditemukan.`);
    pollCountByRecId[id] = (pollCountByRecId[id] ?? 0) + 1;
    // Simulate 1st poll still processing, 2nd poll completed with realistic results
    if (rec.status === 'processing' && pollCountByRecId[id] >= 2) {
      rec.status = 'completed';
      rec.processing_time_ms = 1240;
      rec.results = makeResults(rec.id);
    }
    return { ...rec, results: rec.results ? [...rec.results] : [] };
  },

  async confirmRecognition(
    id: number,
    confirmations: ConfirmationItem[],
  ): Promise<{ message: string; attendance_records: AttendanceDetail[] }> {
    await delay(500);
    const rec = mockRecognitions.find((r) => r.id === id);
    if (!rec) throw new Error(`Recognition #${id} tidak ditemukan.`);
    const session = mockAttendanceSessions.find((s) => s.id === rec.attendance_session_id);
    if (!session) throw new Error('Sesi presensi tidak ditemukan.');

    const details = session.details ?? [];
    const saved: AttendanceDetail[] = [];

    for (const row of confirmations) {
      if (!row.student_id) continue;
      const student = mockStudents.find((s) => s.id === row.student_id);
      const existingIdx = details.findIndex((d) => d.student_id === row.student_id);
      const record: AttendanceDetail = {
        id: existingIdx >= 0 ? details[existingIdx].id : ++nextId,
        attendance_session_id: session.id,
        student_id: row.student_id,
        status: row.status,
        recognition_result_id: row.recognition_result_id,
        confirmed_by: activeMockUser.id,
        confirmed_at: new Date().toISOString(),
        student,
      };
      if (existingIdx >= 0) {
        details[existingIdx] = record;
      } else {
        details.push(record);
      }
      saved.push(record);
    }
    session.details = details;
    return { message: 'Presensi dikonfirmasi (Mock API).', attendance_records: saved };
  },

  async getStudents(params?: { search?: string; is_active?: boolean }): Promise<PaginatedResponse<Student>> {
    await delay(300);
    const q = params?.search?.trim().toLowerCase();
    const filtered = mockStudents.filter((s) => {
      if (params?.is_active !== undefined && s.is_active !== params.is_active) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.nim.toLowerCase().includes(q)) return false;
      return true;
    });
    return {
      data: filtered,
      current_page: 1,
      last_page: 1,
      per_page: 50,
      total: filtered.length,
    };
  },

  async getStudent(id: number): Promise<Student> {
    await delay(250);
    const found = mockStudents.find((s) => s.id === id);
    if (!found) throw new Error(`Mahasiswa #${id} tidak ditemukan.`);
    return { ...found, faces: mockFaces.filter((f) => f.student_id === id) };
  },

  async createStudent(data: {
    nim: string;
    name: string;
    email?: string | null;
    program_study: string;
    is_active?: boolean;
  }): Promise<Student> {
    await delay(400);
    const created: Student = {
      id: ++nextId,
      nim: data.nim,
      name: data.name,
      email: data.email ?? null,
      program_study: data.program_study,
      is_active: data.is_active ?? true,
    };
    mockStudents = [...mockStudents, created];
    return created;
  },

  async updateStudent(id: number, data: Partial<Student>): Promise<Student> {
    await delay(350);
    const idx = mockStudents.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error(`Mahasiswa #${id} tidak ditemukan.`);
    mockStudents[idx] = { ...mockStudents[idx], ...data };
    return mockStudents[idx];
  },

  async getStudentFaces(studentId: number): Promise<StudentFace[]> {
    await delay(300);
    return mockFaces.filter((f) => f.student_id === studentId);
  },

  async uploadStudentFace(
    studentId: number,
    asset: ImagePickerAsset,
    isPrimary: boolean,
  ): Promise<StudentFace> {
    await delay(550);
    if (isPrimary) {
      mockFaces = mockFaces.map((f) =>
        f.student_id === studentId ? { ...f, is_primary: false } : f,
      );
    }
    const face: StudentFace = {
      id: ++nextId,
      student_id: studentId,
      object_key: `students/${studentId}/faces/mock-${nextId}.jpg`,
      embedding: 'arcface-512d-mock',
      model_version: 'arcface-buffalo_l-v1.0',
      is_primary: isPrimary,
      url: asset.uri,
    };
    mockFaces = [face, ...mockFaces];
    return face;
  },

  async refreshStudentFaceUrl(faceId: number): Promise<{ url: string; expires_in_seconds: number }> {
    await delay(250);
    const face = mockFaces.find((f) => f.id === faceId);
    return {
      url: face?.url ?? 'https://placehold.co/400x400/2563EB/FFFFFF?text=Face+Preview',
      expires_in_seconds: 900,
    };
  },

  async deleteStudentFace(faceId: number): Promise<{ message: string }> {
    await delay(300);
    mockFaces = mockFaces.filter((f) => f.id !== faceId);
    return { message: 'Face deleted.' };
  },

  async getAttendanceReport(params: {
    class_schedule_id?: number;
    class_id?: number;
    from?: string;
    to?: string;
  }): Promise<AttendanceReport> {
    await delay(400);
    const scheduleIds = params.class_id
      ? MOCK_SCHEDULES.filter((s) => s.class_id === params.class_id).map((s) => s.id)
      : params.class_schedule_id
        ? [params.class_schedule_id]
        : [];

    const sessions = mockAttendanceSessions.filter((s) => {
      if (scheduleIds.length && !scheduleIds.includes(s.class_schedule_id)) return false;
      const ymd = s.date.slice(0, 10);
      if (params.from && ymd < params.from) return false;
      if (params.to && ymd > params.to) return false;
      return true;
    });

    const byStudent: Record<number, AttendanceReport['students'][number]> = {};
    for (const sess of sessions) {
      for (const d of sess.details ?? []) {
        if (!byStudent[d.student_id]) {
          byStudent[d.student_id] = {
            student_id: d.student_id,
            nim: d.student?.nim ?? null,
            name: d.student?.name ?? null,
            present: 0,
            absent: 0,
            excused: 0,
            unknown: 0,
          };
        }
        byStudent[d.student_id][d.status] += 1;
      }
    }

    return {
      total_sessions: sessions.length,
      from: params.from ?? null,
      to: params.to ?? null,
      students: Object.values(byStudent),
    };
  },
};
