<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\Request;

class StudentFaceController extends Controller
{
    public function store(Request $request, Student $student)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpg,jpeg,png|max:5120', // max 5 MB
            'is_primary' => 'sometimes|boolean',
        ]);

        $path = $request->file('photo')->store("students/{$student->id}/faces", 'minio');

        $face = $student->faces()->create([
            'object_key' => $path,
            'embedding' => null,      // filled later by AI enrollment
            'model_version' => null,  // filled later by AI enrollment
            'is_primary' => $request->boolean('is_primary', false),
        ]);

        return response()->json($face, 201);
    }
}