<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceDetail;
use App\Models\AttendanceSession;
use App\Models\RecognitionResult;
use App\Models\RecognitionSession;
use App\Services\HttpAiService;
use Illuminate\Http\Request;

class RecognitionController extends Controller
{
    public function store(Request $request, HttpAiService $ai)
    {
        $request->validate([
            'attendance_session_id' => 'required|exists:attendance_sessions,id',
            'photo' => 'required|image|mimes:jpg,jpeg,png|max:10240',
        ]);

        $attendanceSession = AttendanceSession::findOrFail(
            $request->integer('attendance_session_id')
        );

        if ($attendanceSession->status !== 'open') {
            return response()->json([
                'message' => 'Sesi presensi tidak sedang dibuka.',
                'errors' => ['attendance_session_id' => ['Sesi presensi tidak sedang dibuka.']],
            ], 422);
        }

        $path = $request->file('photo')->store(
            "sessions/{$attendanceSession->id}",
            'minio'
        );

        $session = RecognitionSession::create([
            'attendance_session_id' => $attendanceSession->id,
            'image_object_key' => $path,
            'status' => 'processing',
            'created_by' => $request->user()->id,
        ]);

        // Call FastAPI YOLOv11 + ArcFace service
        $result = $ai->recognize($path, $session->id);

        foreach ($result['faces'] as $face) {
            RecognitionResult::create([
                'recognition_session_id' => $session->id,
                'bbox' => $face['bbox'],
                'candidate_student_id' => $face['candidate_student_id'],
                'similarity_score' => $face['similarity_score'],
                'status' => $face['status'],
            ]);
        }

        $session->update([
            'status' => 'completed',
            'model_version' => $result['model_version'],
            'processing_time_ms' => $result['processing_time_ms'],
        ]);

        return response()->json($session->load('results.candidateStudent'), 201);
    }

    public function show(RecognitionSession $recognition)
    {
        return $recognition->load('results.candidateStudent');
    }

    public function confirm(Request $request, RecognitionSession $recognition)
    {
        $request->validate([
            'confirmations' => 'required|array|min:1',
            'confirmations.*.recognition_result_id' => 'required|exists:recognition_results,id',
            'confirmations.*.student_id' => 'nullable|exists:students,id',
            'confirmations.*.status' => 'required|in:present,absent,excused,unknown',
        ]);

        $created = [];

        foreach ($request->input('confirmations') as $row) {
            $result = RecognitionResult::findOrFail($row['recognition_result_id']);

            if ($result->recognition_session_id !== $recognition->id) {
                return response()->json([
                    'message' => "Hasil {$result->id} bukan milik sesi ini.",
                    'errors' => ['confirmations' => ["Hasil {$result->id} bukan milik sesi ini."]],
                ], 422);
            }

            if (! empty($row['student_id'])) {
                $detail = AttendanceDetail::updateOrCreate(
                    [
                        'attendance_session_id' => $recognition->attendance_session_id,
                        'student_id' => $row['student_id'],
                    ],
                    [
                        'status' => $row['status'],
                        'recognition_result_id' => $result->id,
                        'confirmed_by' => $request->user()->id,
                        'confirmed_at' => now(),
                    ]
                );
                $created[] = $detail;
            }

            $result->update([
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Presensi dikonfirmasi.',
            'attendance_records' => $created,
        ]);
    }
}
