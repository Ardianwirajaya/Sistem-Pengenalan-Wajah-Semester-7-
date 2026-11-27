<?php

namespace App\Services;

use App\Models\Student;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class HttpAiService
{
    public function recognize(string $imageObjectKey, int $sessionId): array
    {
        $baseUrl = rtrim((string) config('services.ai.url', 'http://127.0.0.1:8001'), '/');
        $imageBytes = Storage::disk('minio')->get($imageObjectKey);

        $response = Http::timeout(60)
            ->attach('file', $imageBytes, basename($imageObjectKey))
            ->post("{$baseUrl}/recognize", [
                'session_id' => $sessionId,
            ]);

        $response->throw();

        $payload = $response->json() ?? [];
        $rawFaces = is_array($payload['faces'] ?? null) ? $payload['faces'] : [];

        $faces = [];
        foreach ($rawFaces as $face) {
            $candidateName = $face['candidate_name'] ?? null;
            $status = $face['status'] ?? 'unknown';
            $candidateStudentId = null;

            if ($status === 'matched' && is_string($candidateName) && trim($candidateName) !== '') {
                $needle = '%' . mb_strtolower(trim($candidateName)) . '%';
                $student = Student::where('is_active', true)
                    ->whereRaw('LOWER(name) LIKE ?', [$needle])
                    ->first();

                if ($student) {
                    $candidateStudentId = $student->id;
                } else {
                    $status = 'unknown';
                }
            } else {
                $status = 'unknown';
            }

            $faces[] = [
                'bbox' => $face['bbox'] ?? null,
                'candidate_student_id' => $candidateStudentId,
                'similarity_score' => isset($face['similarity_score']) ? (float) $face['similarity_score'] : 0.0,
                'status' => $status,
            ];
        }

        return [
            'session_id' => $payload['session_id'] ?? $sessionId,
            'model_version' => $payload['model_version'] ?? 'yolov11-arcface-v1',
            'processing_time_ms' => (int) ($payload['processing_time_ms'] ?? 0),
            'faces' => $faces,
        ];
    }
}
