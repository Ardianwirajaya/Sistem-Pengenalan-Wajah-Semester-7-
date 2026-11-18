<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $query = Student::query();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('nim', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = (int) $request->input('per_page', 15);
        $perPage = max(1, min($perPage, 100));

        return $query->orderBy('nim')->paginate($perPage);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nim' => 'required|string|max:50|unique:students,nim',
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'program_study' => 'required|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $student = Student::create($data);

        return response()->json($student, 201);
    }
}