<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kelas;
use Illuminate\Http\Request;

class KelasController extends Controller
{
    public function index(Request $request)
    {
        $query = Kelas::with('course');

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->integer('course_id'));
        }

        if ($request->filled('academic_year')) {
            $query->where('academic_year', $request->input('academic_year'));
        }

        return $query->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'course_id' => 'required|exists:courses,id',
            'name' => 'required|string|max:50',
            'semester' => 'required|integer|min:1|max:14',
            'academic_year' => 'required|string|max:20',
            'is_active' => 'sometimes|boolean',
        ]);

        $kelas = Kelas::create($data);

        return response()->json($kelas->load('course'), 201);
    }
}
