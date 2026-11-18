<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Course;
use App\Models\Kelas;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcademicApiTest extends TestCase
{
    use RefreshDatabase;

    private function loginAsAdmin(): string
    {
        User::create([
            'name' => 'Admin',
            'email' => 'academic-admin@example.com',
            'password' => 'password',
            'role' => 'admin',
            'is_active' => true,
        ]);

        return $this->postJson('/api/auth/login', [
            'email' => 'academic-admin@example.com',
            'password' => 'password',
        ])->json('token');
    }

    public function test_can_create_and_list_courses(): void
    {
        $token = $this->loginAsAdmin();

        $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/courses', [
                'code' => 'IF101',
                'name' => 'Algoritma',
                'sks' => 3,
            ])
            ->assertStatus(201)
            ->assertJsonFragment(['code' => 'IF101']);

        $this->withHeader('Authorization', "Bearer $token")
            ->getJson('/api/courses')
            ->assertStatus(200)
            ->assertJsonCount(1);
    }

    public function test_can_create_class_with_course(): void
    {
        $token = $this->loginAsAdmin();
        $course = Course::create(['code' => 'IF101', 'name' => 'Algo', 'sks' => 3, 'is_active' => true]);

        $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/classes', [
                'course_id' => $course->id,
                'name' => 'IF-1A',
                'semester' => 1,
                'academic_year' => '2025/2026',
            ])
            ->assertStatus(201)
            ->assertJsonPath('course.id', $course->id);
    }

    public function test_can_create_schedule(): void
    {
        $token = $this->loginAsAdmin();
        $course = Course::create(['code' => 'IF101', 'name' => 'Algo', 'sks' => 3, 'is_active' => true]);
        $kelas = Kelas::create([
            'course_id' => $course->id,
            'name' => 'IF-1A',
            'semester' => 1,
            'academic_year' => '2025/2026',
            'is_active' => true,
        ]);

        $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/class-schedules', [
                'class_id' => $kelas->id,
                'day' => 'Senin',
                'start_time' => '08:00',
                'end_time' => '09:40',
                'room' => 'R.301',
            ])
            ->assertStatus(201)
            ->assertJsonFragment(['day' => 'Senin']);
    }

    public function test_duplicate_course_code_rejected(): void
    {
        $token = $this->loginAsAdmin();
        Course::create(['code' => 'IF101', 'name' => 'Algo', 'sks' => 3, 'is_active' => true]);

        $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/courses', [
                'code' => 'IF101',
                'name' => 'Algoritma v2',
                'sks' => 3,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('code');
    }

    public function test_requires_auth(): void
    {
        $this->getJson('/api/courses')->assertStatus(401);
        $this->getJson('/api/classes')->assertStatus(401);
        $this->getJson('/api/class-schedules')->assertStatus(401);
    }
}
