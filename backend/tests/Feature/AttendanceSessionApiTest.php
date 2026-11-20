<?php

namespace Tests\Feature;

use App\Models\AttendanceSession;
use App\Models\ClassSchedule;
use App\Models\Course;
use App\Models\Kelas;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceSessionApiTest extends TestCase
{
    use RefreshDatabase;

    private function loginAsAdmin(): string
    {
        User::create([
            'name' => 'Admin',
            'email' => 'att-admin@example.com',
            'password' => 'password',
            'role' => 'admin',
            'is_active' => true,
        ]);

        return $this->postJson('/api/auth/login', [
            'email' => 'att-admin@example.com',
            'password' => 'password',
        ])->json('token');
    }

    private function makeSchedule(): ClassSchedule
    {
        $course = Course::create([
            'code' => 'IF101',
            'name' => 'Algoritma',
            'sks' => 3,
            'is_active' => true,
        ]);
        $kelas = Kelas::create([
            'course_id' => $course->id,
            'name' => 'IF-1A',
            'semester' => 1,
            'academic_year' => '2025/2026',
            'is_active' => true,
        ]);

        return ClassSchedule::create([
            'class_id' => $kelas->id,
            'day' => 'Senin',
            'start_time' => '08:00',
            'end_time' => '09:40',
            'room' => 'R.301',
        ]);
    }

    public function test_can_open_attendance_session(): void
    {
        $token = $this->loginAsAdmin();
        $schedule = $this->makeSchedule();

        $response = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/attendance-sessions', [
                'class_schedule_id' => $schedule->id,
                'date' => '2026-11-18',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'open')
            ->assertJsonPath('class_schedule_id', $schedule->id)
            ->assertJsonPath('schedule.id', $schedule->id);

        $this->assertDatabaseHas('attendance_sessions', [
            'class_schedule_id' => $schedule->id,
            'date' => '2026-11-18 00:00:00',
            'status' => 'open',
        ]);
    }

    public function test_duplicate_schedule_date_rejected(): void
    {
        $token = $this->loginAsAdmin();
        $schedule = $this->makeSchedule();

        AttendanceSession::create([
            'class_schedule_id' => $schedule->id,
            'date' => '2026-11-18',
            'opened_by' => User::first()->id,
            'status' => 'open',
        ]);

        $response = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/attendance-sessions', [
                'class_schedule_id' => $schedule->id,
                'date' => '2026-11-18',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('class_schedule_id');
    }

    public function test_can_list_and_show_sessions(): void
    {
        $token = $this->loginAsAdmin();
        $schedule = $this->makeSchedule();

        $create = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/attendance-sessions', [
                'class_schedule_id' => $schedule->id,
                'date' => '2026-11-18',
            ]);
        $sessionId = $create->json('id');

        $this->withHeader('Authorization', "Bearer $token")
            ->getJson('/api/attendance-sessions')
            ->assertStatus(200)
            ->assertJsonStructure([
                'data' => [['id', 'class_schedule_id', 'date', 'status', 'schedule']],
                'total',
            ]);

        $this->withHeader('Authorization', "Bearer $token")
            ->getJson("/api/attendance-sessions/{$sessionId}")
            ->assertStatus(200)
            ->assertJsonPath('id', $sessionId)
            ->assertJsonStructure([
                'schedule' => ['kelas' => ['course']],
                'details',
                'recognition_sessions',
            ]);
    }

    public function test_rejects_invalid_schedule(): void
    {
        $token = $this->loginAsAdmin();

        $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/attendance-sessions', [
                'class_schedule_id' => 99999,
                'date' => '2026-11-18',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('class_schedule_id');
    }

    public function test_requires_auth(): void
    {
        $this->getJson('/api/attendance-sessions')->assertStatus(401);

        $this->postJson('/api/attendance-sessions', [
            'class_schedule_id' => 1,
            'date' => '2026-11-18',
        ])->assertStatus(401);
    }
}
