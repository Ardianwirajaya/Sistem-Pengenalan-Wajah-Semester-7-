<?php

namespace Tests\Feature;

use App\Models\AttendanceDetail;
use App\Models\AttendanceSession;
use App\Models\ClassSchedule;
use App\Models\Course;
use App\Models\Kelas;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RecognitionReportApiTest extends TestCase
{
    use RefreshDatabase;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        User::create([
            'name' => 'Admin',
            'email' => 'rec-rep@example.com',
            'password' => 'password',
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->token = $this->postJson('/api/auth/login', [
            'email' => 'rec-rep@example.com',
            'password' => 'password',
        ])->json('token');
    }

    private function auth()
    {
        return $this->withHeader('Authorization', "Bearer {$this->token}")
            ->withHeader('Accept', 'application/json');
    }

    private function makeSession(): AttendanceSession
    {
        $course = Course::create(['code' => 'IF101', 'name' => 'Algo', 'sks' => 3, 'is_active' => true]);
        $kelas = Kelas::create([
            'course_id' => $course->id, 'name' => 'IF-1A',
            'semester' => 1, 'academic_year' => '2025/2026', 'is_active' => true,
        ]);
        $schedule = ClassSchedule::create([
            'class_id' => $kelas->id, 'day' => 'Senin',
            'start_time' => '08:00', 'end_time' => '09:40', 'room' => 'R.301',
        ]);

        return AttendanceSession::create([
            'class_schedule_id' => $schedule->id,
            'date' => '2026-11-18',
            'opened_by' => User::first()->id,
            'status' => 'open',
        ]);
    }

    private function makeStudents(int $n): void
    {
        for ($i = 1; $i <= $n; $i++) {
            Student::create([
                'nim' => '2025' . str_pad((string) $i, 3, '0', STR_PAD_LEFT),
                'name' => "Student {$i}",
                'program_study' => 'Informatika',
                'is_active' => true,
            ]);
        }
    }

    public function test_upload_photo_returns_mock_results(): void
    {
        Storage::fake('minio');
        $this->makeStudents(10);
        $session = $this->makeSession();

        $response = $this->auth()->post('/api/recognitions', [
            'attendance_session_id' => $session->id,
            'photo' => UploadedFile::fake()->image('class.jpg', 1920, 1080),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'completed')
            ->assertJsonPath('model_version', 'mock-v1')
            ->assertJsonStructure([
                'results' => [
                    ['id', 'bbox', 'candidate_student_id', 'similarity_score', 'status'],
                ],
            ]);

        $this->assertGreaterThan(0, count($response->json('results')));
    }

    public function test_reject_upload_when_session_closed(): void
    {
        Storage::fake('minio');
        $this->makeStudents(5);
        $session = $this->makeSession();
        $session->update(['status' => 'closed']);

        $this->auth()->post('/api/recognitions', [
            'attendance_session_id' => $session->id,
            'photo' => UploadedFile::fake()->image('class.jpg'),
        ])->assertStatus(422);
    }

    public function test_confirm_creates_attendance_records(): void
    {
        Storage::fake('minio');
        $this->makeStudents(5);
        $session = $this->makeSession();

        $upload = $this->auth()->post('/api/recognitions', [
            'attendance_session_id' => $session->id,
            'photo' => UploadedFile::fake()->image('class.jpg'),
        ]);

        $results = $upload->json('results');
        $studentId = Student::first()->id;

        $confirmations = array_map(fn ($r) => [
            'recognition_result_id' => $r['id'],
            'student_id' => $r['candidate_student_id'] ?? $studentId,
            'status' => 'present',
        ], $results);

        $this->auth()->postJson("/api/recognitions/{$upload->json('id')}/confirm", [
            'confirmations' => $confirmations,
        ])->assertStatus(200);

        $this->assertDatabaseHas('attendance_details', [
            'attendance_session_id' => $session->id,
            'student_id' => $studentId,
            'status' => 'present',
        ]);
    }

    public function test_confirm_rejects_result_from_other_session(): void
    {
        Storage::fake('minio');
        $this->makeStudents(5);
        $session = $this->makeSession();

        $upload = $this->auth()->post('/api/recognitions', [
            'attendance_session_id' => $session->id,
            'photo' => UploadedFile::fake()->image('class.jpg'),
        ]);

        // different session, invalid IDs for the target session
        $this->auth()->postJson("/api/recognitions/99999/confirm", [
            'confirmations' => [
                [
                    'recognition_result_id' => $upload->json('results.0.id'),
                    'student_id' => Student::first()->id,
                    'status' => 'present',
                ],
            ],
        ])->assertStatus(404);
    }

    public function test_report_returns_per_student_counts(): void
    {
        $this->makeStudents(3);
        $session = $this->makeSession();
        $student = Student::first();

        AttendanceDetail::create([
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => 'present',
            'confirmed_by' => User::first()->id,
            'confirmed_at' => now(),
        ]);

        $response = $this->auth()->getJson(
            "/api/reports/attendance?class_schedule_id={$session->class_schedule_id}"
        );

        $response->assertStatus(200)
            ->assertJsonPath('total_sessions', 1)
            ->assertJsonFragment([
                'student_id' => $student->id,
                'present' => 1,
                'absent' => 0,
            ]);
    }

    public function test_logout_revokes_current_token(): void
    {
        $this->auth()->postJson('/api/auth/logout')->assertStatus(200);

        $this->auth()->getJson('/api/user')->assertStatus(401);
    }
}
