<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentFaceController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\KelasController;
use App\Http\Controllers\Api\ClassScheduleController;
use App\Http\Controllers\Api\AttendanceSessionController;
use App\Http\Controllers\Api\RecognitionController;
use App\Http\Controllers\Api\ReportController;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Students
    Route::get('/students', [StudentController::class, 'index']);
    Route::post('/students', [StudentController::class, 'store']);
    Route::get('/students/{student}', [StudentController::class, 'show']);
    Route::match(['put', 'patch'], '/students/{student}', [StudentController::class, 'update']);
    Route::delete('/students/{student}', [StudentController::class, 'destroy']);
    Route::post('/students/{student}/faces', [StudentFaceController::class, 'store']);
    Route::get('/students/{student}/faces', [StudentFaceController::class, 'index']);

    // Student Faces
    Route::get('/student-faces/{studentFace}', [StudentFaceController::class, 'show']);
    Route::get('/student-faces/{studentFace}/url', [StudentFaceController::class, 'url']);
    Route::delete('/student-faces/{studentFace}', [StudentFaceController::class, 'destroy']);

    // Courses
    Route::get('/courses', [CourseController::class, 'index']);
    Route::post('/courses', [CourseController::class, 'store']);
    Route::get('/courses/{course}', [CourseController::class, 'show']);
    Route::match(['put', 'patch'], '/courses/{course}', [CourseController::class, 'update']);
    Route::delete('/courses/{course}', [CourseController::class, 'destroy']);

    // Classes
    Route::get('/classes', [KelasController::class, 'index']);
    Route::post('/classes', [KelasController::class, 'store']);
    Route::get('/classes/{kelas}', [KelasController::class, 'show']);
    Route::match(['put', 'patch'], '/classes/{kelas}', [KelasController::class, 'update']);
    Route::delete('/classes/{kelas}', [KelasController::class, 'destroy']);

    // Class Schedules
    Route::get('/class-schedules', [ClassScheduleController::class, 'index']);
    Route::post('/class-schedules', [ClassScheduleController::class, 'store']);
    Route::get('/class-schedules/{classSchedule}', [ClassScheduleController::class, 'show']);
    Route::match(['put', 'patch'], '/class-schedules/{classSchedule}', [ClassScheduleController::class, 'update']);
    Route::delete('/class-schedules/{classSchedule}', [ClassScheduleController::class, 'destroy']);

    // Attendance Sessions
    Route::get('/attendance-sessions', [AttendanceSessionController::class, 'index']);
    Route::post('/attendance-sessions', [AttendanceSessionController::class, 'store']);
    Route::get('/attendance-sessions/{attendanceSession}', [AttendanceSessionController::class, 'show']);
    Route::patch('/attendance-sessions/{attendanceSession}', [AttendanceSessionController::class, 'updateStatus']);

    // Recognitions
    Route::post('/recognitions', [RecognitionController::class, 'store']);
    Route::get('/recognitions/{recognition}', [RecognitionController::class, 'show']);
    Route::post('/recognitions/{recognition}/confirm', [RecognitionController::class, 'confirm']);

    // Reports
    Route::get('/reports/attendance', [ReportController::class, 'attendance']);
});
