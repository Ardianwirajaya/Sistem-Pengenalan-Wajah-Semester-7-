<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentApiTest extends TestCase
{
    use RefreshDatabase;

    private function loginAsAdmin(): string
    {
        $admin = User::create([
            'name' => 'Admin Test',
            'email' => 'test-admin@example.com',
            'password' => 'password',
            'role' => 'admin',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test-admin@example.com',
            'password' => 'password',
        ]);

        return $response->json('token');
    }

    public function test_can_list_students(): void
    {
        $token = $this->loginAsAdmin();

        Student::create([
            'nim' => '2025001',
            'name' => 'Ahmad Test',
            'program_study' => 'Informatika',
            'is_active' => true,
        ]);

        $response = $this->withHeader('Authorization', "Bearer $token")
            ->getJson('/api/students');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [['id', 'nim', 'name', 'program_study', 'is_active']],
                'total', 'per_page', 'current_page',
            ]);
    }

    public function test_can_create_student(): void
    {
        $token = $this->loginAsAdmin();

        $response = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/students', [
                'nim' => '2025099',
                'name' => 'Test Student',
                'email' => 'test@student.example.com',
                'program_study' => 'Informatika',
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'nim' => '2025099',
                'name' => 'Test Student',
            ]);

        $this->assertDatabaseHas('students', ['nim' => '2025099']);
    }

    public function test_duplicate_nim_rejected(): void
    {
        $token = $this->loginAsAdmin();

        Student::create([
            'nim' => '2025099',
            'name' => 'Existing',
            'program_study' => 'Informatika',
            'is_active' => true,
        ]);

        $response = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/students', [
                'nim' => '2025099',
                'name' => 'Duplicate Attempt',
                'program_study' => 'Informatika',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('nim');
    }

    public function test_missing_name_rejected(): void
    {
        $token = $this->loginAsAdmin();

        $response = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/students', [
                'nim' => '2025100',
                'program_study' => 'Informatika',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_unauthenticated_rejected(): void
    {
        $response = $this->postJson('/api/students', [
            'nim' => '2025101',
            'name' => 'Should Fail',
            'program_study' => 'Informatika',
        ]);

        $response->assertStatus(401);
    }
}