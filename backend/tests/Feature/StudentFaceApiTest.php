<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StudentFaceApiTest extends TestCase
{
    use RefreshDatabase;

    private function loginAsAdmin(): string
    {
        User::create([
            'name' => 'Admin Test',
            'email' => 'face-admin@example.com',
            'password' => 'password',
            'role' => 'admin',
            'is_active' => true,
        ]);

        return $this->postJson('/api/auth/login', [
            'email' => 'face-admin@example.com',
            'password' => 'password',
        ])->json('token');
    }

    private function makeStudent(): Student
    {
        return Student::create([
            'nim' => '2025001',
            'name' => 'Test Student',
            'program_study' => 'Informatika',
            'is_active' => true,
        ]);
    }

    public function test_can_upload_face(): void
    {
        Storage::fake('minio');
        $token = $this->loginAsAdmin();
        $student = $this->makeStudent();
        $file = UploadedFile::fake()->image('face.jpg', 400, 400);

        $response = $this->withHeaders([
                'Authorization' => "Bearer $token",
                'Accept' => 'application/json',
            ])
            ->post("/api/students/{$student->id}/faces", ['photo' => $file]);

        $response->assertStatus(201)
            ->assertJsonPath('student_id', $student->id)
            ->assertJsonPath('embedding', null)
            ->assertJsonPath('model_version', null);

        $objectKey = $response->json('object_key');
        $this->assertNotEmpty($objectKey);
        Storage::disk('minio')->assertExists($objectKey);

        $this->assertDatabaseHas('student_faces', [
            'student_id' => $student->id,
            'object_key' => $objectKey,
            'is_primary' => false,
        ]);
    }

    public function test_can_mark_first_face_primary(): void
    {
        Storage::fake('minio');
        $token = $this->loginAsAdmin();
        $student = $this->makeStudent();

        $response = $this->withHeaders([
                'Authorization' => "Bearer $token",
                'Accept' => 'application/json',
            ])
            ->post("/api/students/{$student->id}/faces", [
                'photo' => UploadedFile::fake()->image('face.jpg'),
                'is_primary' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('is_primary', true);
    }

    public function test_rejects_non_image_file(): void
    {
        Storage::fake('minio');
        $token = $this->loginAsAdmin();
        $student = $this->makeStudent();

        $response = $this->withHeaders([
                'Authorization' => "Bearer $token",
                'Accept' => 'application/json',
            ])
            ->post("/api/students/{$student->id}/faces", [
                'photo' => UploadedFile::fake()->create('doc.pdf', 100),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('photo');
    }

    public function test_rejects_missing_photo(): void
    {
        Storage::fake('minio');
        $token = $this->loginAsAdmin();
        $student = $this->makeStudent();

        $response = $this->withHeaders([
                'Authorization' => "Bearer $token",
                'Accept' => 'application/json',
            ])
            ->post("/api/students/{$student->id}/faces", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('photo');
    }

    public function test_rejects_unknown_student(): void
    {
        Storage::fake('minio');
        $token = $this->loginAsAdmin();

        $response = $this->withHeaders([
                'Authorization' => "Bearer $token",
                'Accept' => 'application/json',
            ])
            ->post('/api/students/99999/faces', [
                'photo' => UploadedFile::fake()->image('face.jpg'),
            ]);

        $response->assertStatus(404);
    }

    public function test_requires_auth(): void
    {
        $student = $this->makeStudent();

        $response = $this->withHeaders(['Accept' => 'application/json'])
            ->post("/api/students/{$student->id}/faces", [
                'photo' => UploadedFile::fake()->image('face.jpg'),
            ]);

        $response->assertStatus(401);
    }
}