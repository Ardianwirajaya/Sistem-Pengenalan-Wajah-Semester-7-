<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentFace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StudentFaceController extends Controller
{
    public function store(Request $request, Student $student)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpg,jpeg,png|max:5120',
            'is_primary' => 'sometimes|boolean',
        ]);

        $path = $request->file('photo')->store("students/{$student->id}/faces", 'minio');

        $face = $student->faces()->create([
            'object_key' => $path,
            'embedding' => null,
            'model_version' => null,
            'is_primary' => $request->boolean('is_primary', false),
        ]);

        return response()->json($this->faceWithUrl($face), 201);
    }

    public function index(Student $student)
    {
        $faces = $student->faces()->orderByDesc('is_primary')->orderByDesc('id')->get();

        return $faces->map(fn ($face) => $this->faceWithUrl($face));
    }

    public function url(StudentFace $studentFace)
    {
        return response()->json([
            'url' => $this->signedUrl($studentFace->object_key),
            'expires_in_seconds' => 900,
        ]);
    }

    private function faceWithUrl(StudentFace $face): array
    {
        return array_merge($face->toArray(), [
            'url' => $this->signedUrl($face->object_key),
        ]);
    }

    private function signedUrl(string $objectKey): string
    {
        return Storage::disk('minio')->temporaryUrl(
            $objectKey,
            now()->addMinutes(15)
        );
    }
}
