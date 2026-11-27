import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { mockApi } from './mock';

/**
 * Set `true` untuk menguji seluruh alur UI di HP tanpa backend Laravel aktif.
 * Ubah ke `false` saat siap terhubung ke server Laravel REST API.
 */
export const USE_MOCK_API = false;

const STORAGE_KEYS = {
  baseUrl: 'spw_api_base_url',
  apiKey: 'spw_api_bearer_token',
} as const;

const FALLBACK_BASE_URL = 'http://localhost:8000/api';

export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed || FALLBACK_BASE_URL;
}

export const DEFAULT_BASE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_URL || FALLBACK_BASE_URL,
);

export const BASE_URL_PRESETS = [
  { label: 'Localhost / USB (adb reverse)', url: 'http://localhost:8000/api' },
  { label: 'Android Emulator', url: 'http://10.0.2.2:8000/api' },
] as const;

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'dosen' | string;
  is_active?: boolean;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  sks: number;
  is_active: boolean;
}

export interface Kelas {
  id: number;
  course_id: number;
  name: string;
  semester: number;
  academic_year: string;
  is_active: boolean;
  course?: Course;
}

export interface ClassSchedule {
  id: number;
  class_id: number;
  day: string;
  start_time: string;
  end_time: string;
  room: string | null;
  kelas?: Kelas;
}

export interface StudentFace {
  id: number;
  student_id: number;
  object_key: string;
  embedding: string | null;
  model_version: string | null;
  is_primary: boolean;
  url?: string;
  created_at?: string;
}

export interface Student {
  id: number;
  nim: string;
  name: string;
  email: string | null;
  program_study: string;
  is_active: boolean;
  faces?: StudentFace[];
}

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'unknown';
export type SessionStatus = 'open' | 'closed' | 'cancelled';

export interface RecognitionResult {
  id: number;
  recognition_session_id: number;
  bbox: number[] | null;
  candidate_student_id: number | null;
  similarity_score: number | null;
  status: 'matched' | 'unknown' | string;
  quality_flag?: 'clear' | 'blur' | 'occluded' | 'low_resolution' | string;
  quality_note?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  candidate_student?: Student | null;
}

export interface RecognitionSession {
  id: number;
  attendance_session_id: number;
  image_object_key: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | string;
  model_version: string | null;
  processing_time_ms: number | null;
  error_message?: string | null;
  created_at?: string;
  results?: RecognitionResult[];
}

export interface AttendanceDetail {
  id: number;
  attendance_session_id: number;
  student_id: number;
  status: AttendanceStatus;
  recognition_result_id: number | null;
  confirmed_by: number | null;
  confirmed_at: string | null;
  student?: Student;
}

export interface AttendanceSession {
  id: number;
  class_schedule_id: number;
  date: string;
  opened_by: number;
  status: SessionStatus;
  schedule?: ClassSchedule;
  opened_by_user?: User;
  openedBy?: User;
  details?: AttendanceDetail[];
  recognition_sessions?: RecognitionSession[];
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ConfirmationItem {
  recognition_result_id: number;
  student_id: number | null;
  status: AttendanceStatus;
}

export interface AttendanceReportStudent {
  student_id: number;
  nim: string | null;
  name: string | null;
  present: number;
  absent: number;
  excused: number;
  unknown: number;
}

export interface AttendanceReport {
  total_sessions: number;
  from: string | null;
  to: string | null;
  students: AttendanceReportStudent[];
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

let currentBaseUrl = DEFAULT_BASE_URL;
let currentApiKey = '';
let onUnauthorizedHandler: (() => void) | null = null;

export function getApiConfig(): { baseUrl: string; apiKey: string } {
  return { baseUrl: currentBaseUrl, apiKey: currentApiKey };
}

export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorizedHandler = handler;
}

export async function loadStoredAuthConfig(): Promise<{ baseUrl: string; apiKey: string }> {
  const [storedUrl, storedKey] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.baseUrl),
    AsyncStorage.getItem(STORAGE_KEYS.apiKey),
  ]);
  currentBaseUrl = storedUrl ? normalizeBaseUrl(storedUrl) : DEFAULT_BASE_URL;
  currentApiKey = storedKey?.trim() ?? '';
  return { baseUrl: currentBaseUrl, apiKey: currentApiKey };
}

export async function saveBaseUrl(url: string): Promise<string> {
  const normalized = normalizeBaseUrl(url);
  currentBaseUrl = normalized;
  await AsyncStorage.setItem(STORAGE_KEYS.baseUrl, normalized);
  return normalized;
}

export async function saveApiKey(token: string): Promise<string> {
  const clean = token.replace(/^Bearer\s+/i, '').trim();
  currentApiKey = clean;
  if (clean) {
    await AsyncStorage.setItem(STORAGE_KEYS.apiKey, clean);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.apiKey);
  }
  return clean;
}

export async function clearApiKey(): Promise<void> {
  currentApiKey = '';
  await AsyncStorage.removeItem(STORAGE_KEYS.apiKey);
}

function buildQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return '';
  const pairs = Object.entries(params)
    .filter(([, val]) => val !== undefined && val !== null && val !== '')
    .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

function extractErrorMessage(payload: unknown, status: number): { message: string; errors?: Record<string, string[]> } {
  if (payload && typeof payload === 'object') {
    const record = payload as { message?: string; errors?: Record<string, string[]> };
    if (record.errors) {
      const firstFieldErrors = Object.values(record.errors).flat();
      if (firstFieldErrors.length > 0) {
        return { message: firstFieldErrors[0], errors: record.errors };
      }
    }
    if (typeof record.message === 'string' && record.message.trim()) {
      return { message: record.message, errors: record.errors };
    }
  }
  return { message: `Request gagal (HTTP ${status})` };
}

function sendFormDataWithXhr(
  url: string,
  method: string,
  headers: Record<string, string>,
  formData: FormData,
  timeoutMs: number,
): Promise<{ status: number; ok: boolean; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.timeout = timeoutMs;

    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === 'content-type') continue;
      xhr.setRequestHeader(key, value);
    }

    xhr.onload = () => {
      resolve({
        status: xhr.status,
        ok: xhr.status >= 200 && xhr.status < 300,
        text: xhr.responseText ?? '',
      });
    };

    xhr.onerror = () => {
      reject(new Error('Network request failed'));
    };

    xhr.ontimeout = () => {
      const timeoutErr = new Error('Request timed out');
      timeoutErr.name = 'AbortError';
      reject(timeoutErr);
    };

    xhr.send(formData);
  });
}

async function request<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    formData?: FormData;
    skipUnauthorizedCallback?: boolean;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    formData,
    skipUnauthorizedCallback = false,
    timeoutMs = formData ? 60000 : 15000,
  } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (currentApiKey) {
    headers.Authorization = `Bearer ${currentApiKey}`;
  }

  let fetchBody: BodyInit | undefined;
  if (formData) {
    fetchBody = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(body);
  }

  let status = 0;
  let ok = false;
  let text = '';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (formData && Platform.OS !== 'web') {
      const xhrRes = await sendFormDataWithXhr(
        `${currentBaseUrl}${path}`,
        method,
        headers,
        formData,
        timeoutMs,
      );
      status = xhrRes.status;
      ok = xhrRes.ok;
      text = xhrRes.text;
    } else {
      const response = await fetch(`${currentBaseUrl}${path}`, {
        method,
        headers,
        body: fetchBody,
        signal: controller.signal,
      });
      status = response.status;
      ok = response.ok;
      text = await response.text();
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(
        `Koneksi timeout (${Math.round(timeoutMs / 1000)} dtk). Server (${currentBaseUrl}) tidak merespons.`,
        408,
      );
    }
    const detail = err instanceof Error ? err.message : 'Network error';
    throw new ApiError(
      `Tidak dapat terhubung ke server (${currentBaseUrl}). Pastikan backend aktif dan URL benar. [${detail}]`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { message: text };
    }
  }

  if (!ok) {
    if (status === 401 && !skipUnauthorizedCallback && onUnauthorizedHandler) {
      onUnauthorizedHandler();
    }
    const { message, errors } = extractErrorMessage(parsed, status);
    throw new ApiError(message, status, errors);
  }

  return parsed as T;
}

export async function appendPhotoToFormData(
  formData: FormData,
  fieldName: string,
  asset: ImagePickerAsset,
): Promise<void> {
  const rawName = asset.fileName || asset.uri.split('/').pop() || 'photo.jpg';
  const hasValidExt = /\.(jpe?g|png)$/i.test(rawName);
  const filename = hasValidExt ? rawName : `${rawName}.jpg`;
  const mimeType =
    asset.mimeType === 'image/png' || filename.toLowerCase().endsWith('.png')
      ? 'image/png'
      : 'image/jpeg';

  if (Platform.OS === 'web') {
    const webAsset = asset as ImagePickerAsset & { file?: File };
    if (webAsset.file) {
      formData.append(fieldName, webAsset.file, filename);
      return;
    }
    const res = await fetch(asset.uri);
    const blob = await res.blob();
    formData.append(fieldName, blob, filename);
    return;
  }

  const normalizedUri =
    asset.uri.startsWith('file://') || asset.uri.startsWith('content://')
      ? asset.uri
      : `file://${asset.uri}`;

  formData.append(fieldName, {
    uri: normalizedUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);
}

// --- Auth ---
export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = USE_MOCK_API
    ? await mockApi.login(email, password)
    : await request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: { email, password },
        skipUnauthorizedCallback: true,
      });
  await saveApiKey(res.token);
  return res;
}

export function getUser(): Promise<User> {
  if (USE_MOCK_API) return mockApi.getUser();
  return request<User>('/user');
}

export async function logout(): Promise<void> {
  try {
    if (USE_MOCK_API) {
      await mockApi.logout();
    } else if (currentApiKey) {
      await request('/auth/logout', { method: 'POST', skipUnauthorizedCallback: true });
    }
  } finally {
    await clearApiKey();
  }
}

// --- Academic & Schedules ---
export function getCourses(params?: { search?: string }): Promise<Course[]> {
  return request<Course[]>(`/courses${buildQuery(params)}`);
}

export function getClasses(params?: { course_id?: number; academic_year?: string }): Promise<Kelas[]> {
  if (USE_MOCK_API) return mockApi.getClasses(params);
  return request<Kelas[]>(`/classes${buildQuery(params)}`);
}

export function getSchedules(params?: { class_id?: number; day?: string }): Promise<ClassSchedule[]> {
  if (USE_MOCK_API) return mockApi.getSchedules(params);
  return request<ClassSchedule[]>(`/class-schedules${buildQuery(params)}`);
}

// --- Attendance Sessions ---
export function getAttendanceSessions(params?: {
  class_schedule_id?: number;
  date?: string;
  status?: SessionStatus;
  page?: number;
}): Promise<PaginatedResponse<AttendanceSession>> {
  if (USE_MOCK_API) return mockApi.getAttendanceSessions(params);
  return request<PaginatedResponse<AttendanceSession>>(`/attendance-sessions${buildQuery(params)}`);
}

export function createAttendanceSession(classScheduleId: number, date: string): Promise<AttendanceSession> {
  if (USE_MOCK_API) {
    return mockApi.createAttendanceSession(
      classScheduleId,
      date,
      (msg, field) => new ApiError(msg, 422, { [field]: [msg] }),
    );
  }
  return request<AttendanceSession>('/attendance-sessions', {
    method: 'POST',
    body: { class_schedule_id: classScheduleId, date },
  });
}

export function getAttendanceSession(id: number): Promise<AttendanceSession> {
  if (USE_MOCK_API) return mockApi.getAttendanceSession(id);
  return request<AttendanceSession>(`/attendance-sessions/${id}`);
}

export function updateAttendanceSessionStatus(id: number, status: SessionStatus): Promise<AttendanceSession> {
  if (USE_MOCK_API) return mockApi.updateAttendanceSessionStatus(id, status);
  return request<AttendanceSession>(`/attendance-sessions/${id}`, {
    method: 'PATCH',
    body: { status },
  });
}

// --- Face Recognition (with async-ready polling) ---
export async function uploadRecognitionPhoto(
  attendanceSessionId: number,
  asset: ImagePickerAsset,
): Promise<RecognitionSession> {
  if (USE_MOCK_API) return mockApi.uploadRecognitionPhoto(attendanceSessionId, asset);
  const formData = new FormData();
  formData.append('attendance_session_id', String(attendanceSessionId));
  await appendPhotoToFormData(formData, 'photo', asset);

  return request<RecognitionSession>('/recognitions', {
    method: 'POST',
    formData,
  });
}

export function getRecognition(id: number): Promise<RecognitionSession> {
  if (USE_MOCK_API) return mockApi.getRecognition(id);
  return request<RecognitionSession>(`/recognitions/${id}`);
}

export async function pollRecognitionUntilDone(
  id: number,
  onProgress?: (session: RecognitionSession, attempt: number, maxAttempts: number) => void,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<RecognitionSession> {
  let latest = await getRecognition(id);
  onProgress?.(latest, 0, maxAttempts);

  let attempt = 0;
  while ((latest.status === 'queued' || latest.status === 'processing') && attempt < maxAttempts) {
    attempt += 1;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    latest = await getRecognition(id);
    onProgress?.(latest, attempt, maxAttempts);
  }

  if (latest.status === 'failed') {
    throw new ApiError(
      latest.error_message || 'Proses pengenalan wajah gagal di server AI.',
      500,
    );
  }

  if (latest.status === 'queued' || latest.status === 'processing') {
    throw new ApiError(
      'Waktu tunggu proses pengenalan wajah habis (timeout). Silakan tarik ke bawah untuk memuat ulang status sesi.',
      408,
    );
  }

  return latest;
}

export function confirmRecognition(
  id: number,
  confirmations: ConfirmationItem[],
): Promise<{ message: string; attendance_records: AttendanceDetail[] }> {
  if (USE_MOCK_API) return mockApi.confirmRecognition(id, confirmations);
  return request<{ message: string; attendance_records: AttendanceDetail[] }>(`/recognitions/${id}/confirm`, {
    method: 'POST',
    body: { confirmations },
  });
}

// --- Students & Face Registration ---
export function getStudents(params?: {
  search?: string;
  is_active?: boolean;
  per_page?: number;
  page?: number;
}): Promise<PaginatedResponse<Student>> {
  if (USE_MOCK_API) return mockApi.getStudents(params);
  return request<PaginatedResponse<Student>>(`/students${buildQuery(params)}`);
}

export function getStudent(id: number): Promise<Student> {
  if (USE_MOCK_API) return mockApi.getStudent(id);
  return request<Student>(`/students/${id}`);
}

export function createStudent(data: {
  nim: string;
  name: string;
  email?: string | null;
  program_study: string;
  is_active?: boolean;
}): Promise<Student> {
  if (USE_MOCK_API) return mockApi.createStudent(data);
  return request<Student>('/students', { method: 'POST', body: data });
}

export function updateStudent(
  id: number,
  data: Partial<{
    nim: string;
    name: string;
    email: string | null;
    program_study: string;
    is_active: boolean;
  }>,
): Promise<Student> {
  if (USE_MOCK_API) return mockApi.updateStudent(id, data);
  return request<Student>(`/students/${id}`, { method: 'PATCH', body: data });
}

export function getStudentFaces(studentId: number): Promise<StudentFace[]> {
  if (USE_MOCK_API) return mockApi.getStudentFaces(studentId);
  return request<StudentFace[]>(`/students/${studentId}/faces`);
}

export async function uploadStudentFace(
  studentId: number,
  asset: ImagePickerAsset,
  isPrimary: boolean,
): Promise<StudentFace> {
  if (USE_MOCK_API) return mockApi.uploadStudentFace(studentId, asset, isPrimary);
  const formData = new FormData();
  await appendPhotoToFormData(formData, 'photo', asset);
  formData.append('is_primary', isPrimary ? '1' : '0');

  return request<StudentFace>(`/students/${studentId}/faces`, {
    method: 'POST',
    formData,
  });
}

export function refreshStudentFaceUrl(faceId: number): Promise<{ url: string; expires_in_seconds: number }> {
  if (USE_MOCK_API) return mockApi.refreshStudentFaceUrl(faceId);
  return request<{ url: string; expires_in_seconds: number }>(`/student-faces/${faceId}/url`);
}

export function deleteStudentFace(faceId: number): Promise<{ message: string }> {
  if (USE_MOCK_API) return mockApi.deleteStudentFace(faceId);
  return request<{ message: string }>(`/student-faces/${faceId}`, { method: 'DELETE' });
}

// --- Reports ---
export function getAttendanceReport(params: {
  class_schedule_id?: number;
  class_id?: number;
  from?: string;
  to?: string;
}): Promise<AttendanceReport> {
  if (USE_MOCK_API) return mockApi.getAttendanceReport(params);
  return request<AttendanceReport>(`/reports/attendance${buildQuery(params)}`);
}
