<?php

namespace Tests\Feature;

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

class CrudApiTest extends TestCase
{
    use RefreshDatabase;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        User::create([
            'name' => 'Admin',
            'email' => 'crud-admin@example.com',
            'password' => 'password',
            'role' => 'admin',
            'is_active' => true,
        ]);
        $this->token = $this->postJson('/api/auth/login', [
            'email' => 'crud-admin@example.com',
            'password' => 'password',
        ])->json('token');
    }

    private function auth()
    {
        return $this->withHeader('Authorization', "Bearer {$this->token}")
            ->withHeader('Accept', 'application/json');
    }

    private function makeStudent(): Student
    {
        return Student::create([
            'nim' => '2025001', 'name' => 'Ahmad',
            'program_study' => 'Informatika', 'is_active' => true,
        ]);
    }

    private function makeSchedule(): array
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
        return [$course, $kelas, $schedule];
    }

    // --- Students ---

    public function test_show_student(): void
    {
        $student = $this->makeStudent();
        $this->auth()->getJson("/api/students/{$student->id}")
            ->assertStatus(200)
            ->assertJsonPath('id', $student->id)
            ->assertJsonStructure(['id', 'nim', 'name', 'faces']);
    }

    public function test_update_student(): void
    {
        $student = $this->makeStudent();
        $this->auth()->putJson("/api/students/{$student->id}", ['name' => 'Updated Name'])
            ->assertStatus(200)
            ->assertJsonPath('name', 'Updated Name');
        $this->assertDatabaseHas('students', ['id' => $student->id, 'name' => 'Updated Name']);
    }

    public function test_update_student_same_nim_ok(): void
    {
        $student = $this->makeStudent();
        $this->auth()->putJson("/api/students/{$student->id}", ['nim' => '2025001', 'name' => 'X'])
            ->assertStatus(200);
    }

    public function test_delete_student_soft(): void
    {
        $student = $this->makeStudent();
        $this->auth()->deleteJson("/api/students/{$student->id}")->assertStatus(200);
        $this->assertSoftDeleted('students', ['id' => $student->id]);
    }

    // --- Courses ---

    public function test_show_course(): void
    {
        $course = Course::create(['code' => 'IF101', 'name' => 'Algo', 'sks' => 3, 'is_active' => true]);
        $this->auth()->getJson("/api/courses/{$course->id}")
            ->assertStatus(200)
            ->assertJsonPath('code', 'IF101');
    }

    public function test_update_course(): void
    {
        $course = Course::create(['code' => 'IF101', 'name' => 'Algo', 'sks' => 3, 'is_active' => true]);
        $this->auth()->putJson("/api/courses/{$course->id}", ['name' => 'Algoritma v2'])
            ->assertStatus(200)
            ->assertJsonPath('name', 'Algoritma v2');
    }

    public function test_delete_course(): void
    {
        $course = Course::create(['code' => 'IF101', 'name' => 'Algo', 'sks' => 3, 'is_active' => true]);
        $this->auth()->deleteJson("/api/courses/{$course->id}")->assertStatus(200);
        $this->assertDatabaseMissing('courses', ['id' => $course->id]);
    }

    public function test_cannot_delete_course_with_classes(): void
    {
        [$course] = $this->makeSchedule();
        $this->auth()->deleteJson("/api/courses/{$course->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('course');
    }

    // --- Classes ---

    public function test_show_class(): void
    {
        [, $kelas] = $this->makeSchedule();
        $this->auth()->getJson("/api/classes/{$kelas->id}")
            ->assertStatus(200)
            ->assertJsonStructure(['id', 'course', 'schedules']);
    }

    public function test_update_class(): void
    {
        [, $kelas] = $this->makeSchedule();
        $this->auth()->putJson("/api/classes/{$kelas->id}", ['name' => 'IF-1B'])
            ->assertStatus(200)
            ->assertJsonPath('name', 'IF-1B');
    }

    public function test_cannot_delete_class_with_sessions(): void
    {
        [, $kelas, $schedule] = $this->makeSchedule();
        AttendanceSession::create([
            'class_schedule_id' => $schedule->id, 'date' => '2026-11-18',
            'opened_by' => User::first()->id, 'status' => 'open',
        ]);
        $this->auth()->deleteJson("/api/classes/{$kelas->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('class');
    }

    // --- Schedules ---

    public function test_show_schedule(): void
    {
        [, , $schedule] = $this->makeSchedule();
        $this->auth()->getJson("/api/class-schedules/{$schedule->id}")
            ->assertStatus(200)
            ->assertJsonPath('day', 'Senin');
    }

    public function test_update_schedule(): void
    {
        [, , $schedule] = $this->makeSchedule();
        $this->auth()->putJson("/api/class-schedules/{$schedule->id}", ['room' => 'R.999'])
            ->assertStatus(200)
            ->assertJsonPath('room', 'R.999');
    }

    public function test_cannot_delete_schedule_with_sessions(): void
    {
        [, , $schedule] = $this->makeSchedule();
        AttendanceSession::create([
            'class_schedule_id' => $schedule->id, 'date' => '2026-11-18',
            'opened_by' => User::first()->id, 'status' => 'open',
        ]);
        $this->auth()->deleteJson("/api/class-schedules/{$schedule->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('schedule');
    }

    // --- Student Faces ---

    public function test_can_delete_face_and_minio_object(): void
    {
        Storage::fake('minio');
        $student = $this->makeStudent();
        $upload = $this->auth()->post("/api/students/{$student->id}/faces", [
            'photo' => UploadedFile::fake()->image('face.jpg'),
        ]);
        $upload->assertStatus(201);
        $faceId = $upload->json('id');
        $objectKey = $upload->json('object_key');
        Storage::disk('minio')->assertExists($objectKey);

        $this->auth()->deleteJson("/api/student-faces/{$faceId}")->assertStatus(200);

        Storage::disk('minio')->assertMissing($objectKey);
        $this->assertSoftDeleted('student_faces', ['id' => $faceId]);
    }

    // --- Attendance Sessions ---

    public function test_update_attendance_session_status(): void
    {
        [, , $schedule] = $this->makeSchedule();
        $session = AttendanceSession::create([
            'class_schedule_id' => $schedule->id, 'date' => '2026-11-18',
            'opened_by' => User::first()->id, 'status' => 'open',
        ]);
        $this->auth()->patchJson("/api/attendance-sessions/{$session->id}", ['status' => 'closed'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'closed');
    }

    public function test_rejects_invalid_session_status(): void
    {
        [, , $schedule] = $this->makeSchedule();
        $session = AttendanceSession::create([
            'class_schedule_id' => $schedule->id, 'date' => '2026-11-18',
            'opened_by' => User::first()->id, 'status' => 'open',
        ]);
        $this->auth()->patchJson("/api/attendance-sessions/{$session->id}", ['status' => 'invalid'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }
}
