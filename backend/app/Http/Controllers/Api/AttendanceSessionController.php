<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSession;
use Illuminate\Http\Request;

class AttendanceSessionController extends Controller
{
    public function index(Request $request)
    {
        $query = AttendanceSession::with(['schedule.kelas.course', 'openedBy']);

        if ($request->filled('class_schedule_id')) {
            $query->where('class_schedule_id', $request->integer('class_schedule_id'));
        }

        if ($request->filled('date')) {
            $query->where('date', $request->input('date'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return $query->orderByDesc('date')->paginate(15);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'class_schedule_id' => 'required|exists:class_schedules,id',
            'date' => 'required|date',
        ]);

        $exists = AttendanceSession::where('class_schedule_id', $data['class_schedule_id'])
            ->where('date', $data['date'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'An attendance session already exists for this schedule and date.',
                'errors' => [
                    'class_schedule_id' => ['An attendance session already exists for this schedule and date.'],
                ],
            ], 422);
        }

        $data['opened_by'] = $request->user()->id;
        $data['status'] = 'open';

        $session = AttendanceSession::create($data);

        return response()->json($session->load('schedule.kelas.course'), 201);
    }

    public function show(AttendanceSession $attendanceSession)
    {
        return $attendanceSession->load([
            'schedule.kelas.course',
            'openedBy',
            'details.student',
            'recognitionSessions.results.candidateStudent',
        ]);
    }
}
