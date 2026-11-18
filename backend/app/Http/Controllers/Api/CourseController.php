<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index(Request $request)
    {
        $query = Course::query();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('code', 'ilike', "%{$search}%");
            });
        }

        return $query->orderBy('code')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|max:20|unique:courses,code',
            'name' => 'required|string|max:255',
            'sks' => 'required|integer|min:1|max:10',
            'is_active' => 'sometimes|boolean',
        ]);

        $course = Course::create($data);

        return response()->json($course, 201);
    }
}
