<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassSchedule;
use Illuminate\Http\Request;

class ClassScheduleController extends Controller
{
    public function index(Request $request)
    {
        $query = ClassSchedule::with('kelas.course');

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->integer('class_id'));
        }

        if ($request->filled('day')) {
            $query->where('day', $request->input('day'));
        }

        return $query->orderBy('day')->orderBy('start_time')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'class_id' => 'required|exists:classes,id',
            'day' => 'required|string|max:20',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'room' => 'nullable|string|max:50',
        ]);

        $schedule = ClassSchedule::create($data);

        return response()->json($schedule->load('kelas.course'), 201);
    }

    public function show(ClassSchedule $classSchedule)
    {
        return $classSchedule->load('kelas.course');
    }

    public function update(Request $request, ClassSchedule $classSchedule)
    {
        $data = $request->validate([
            'class_id' => 'sometimes|exists:classes,id',
            'day' => 'sometimes|string|max:20',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i|after:start_time',
            'room' => 'sometimes|nullable|string|max:50',
        ]);

        $classSchedule->update($data);

        return $classSchedule->fresh('kelas.course');
    }

    public function destroy(ClassSchedule $classSchedule)
    {
        if ($classSchedule->attendanceSessions()->exists()) {
            return response()->json([
                'message' => 'Cannot delete schedule: attendance sessions exist.',
                'errors' => ['schedule' => ['Cannot delete schedule: attendance sessions exist.']],
            ], 422);
        }

        $classSchedule->delete();

        return response()->json(['message' => 'Schedule deleted.']);
    }
}
