<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSession;
use App\Models\ClassSchedule;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function attendance(Request $request)
    {
        $query = AttendanceSession::with('details.student');

        if ($request->filled('class_schedule_id')) {
            $query->where('class_schedule_id', $request->integer('class_schedule_id'));
        }

        if ($request->filled('class_id')) {
            $scheduleIds = ClassSchedule::where('class_id', $request->integer('class_id'))
                ->pluck('id');
            $query->whereIn('class_schedule_id', $scheduleIds);
        }

        if ($request->filled('from')) {
            $query->where('date', '>=', $request->input('from'));
        }

        if ($request->filled('to')) {
            $query->where('date', '<=', $request->input('to'));
        }

        $sessions = $query->get();
        $totalSessions = $sessions->count();

        $byStudent = [];

        foreach ($sessions as $session) {
            foreach ($session->details as $detail) {
                $sid = $detail->student_id;

                if (! isset($byStudent[$sid])) {
                    $byStudent[$sid] = [
                        'student_id' => $sid,
                        'nim' => $detail->student->nim ?? null,
                        'name' => $detail->student->name ?? null,
                        'present' => 0,
                        'absent' => 0,
                        'excused' => 0,
                        'unknown' => 0,
                    ];
                }

                $status = $detail->status;
                if (isset($byStudent[$sid][$status])) {
                    $byStudent[$sid][$status]++;
                }
            }
        }

        return response()->json([
            'total_sessions' => $totalSessions,
            'from' => $request->input('from'),
            'to' => $request->input('to'),
            'students' => array_values($byStudent),
        ]);
    }
}
