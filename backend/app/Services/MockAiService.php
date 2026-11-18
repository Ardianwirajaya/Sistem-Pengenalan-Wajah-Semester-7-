<?php

namespace App\Services;

use App\Models\Student;

class MockAiService
{
    public function recognize(string $imageObjectKey, int $sessionId): array
    {
        $students = Student::where('is_active', true)
            ->inRandomOrder()
            ->limit(rand(3, 8))
            ->get();

        $faces = [];
        $x = 100;

        foreach ($students as $student) {
            $matched = rand(0, 100) > 20;
            $score = $matched ? rand(70, 95) / 100 : rand(20, 45) / 100;

            $faces[] = [
                'bbox' => [$x, 100, $x + 80, 180],
                'candidate_student_id' => $matched ? $student->id : null,
                'similarity_score' => $score,
                'status' => $matched ? 'matched' : 'unknown',
            ];

            $x += 100;
        }

        return [
            'session_id' => $sessionId,
            'model_version' => 'mock-v1',
            'processing_time_ms' => rand(800, 2000),
            'faces' => $faces,
        ];
    }
}
