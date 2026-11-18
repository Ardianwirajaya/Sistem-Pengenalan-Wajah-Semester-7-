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

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Students
    Route::get('/students', [StudentController::class, 'index']);
    Route::post('/students', [StudentController::class, 'store']);
    Route::post('/students/{student}/faces', [StudentFaceController::class, 'store']);
    Route::get('/students/{student}/faces', [StudentFaceController::class, 'index']);
    Route::get('/student-faces/{studentFace}/url', [StudentFaceController::class, 'url']);

    // Courses
    Route::get('/courses', [CourseController::class, 'index']);
    Route::post('/courses', [CourseController::class, 'store']);

    // Classes (Kelas)
    Route::get('/classes', [KelasController::class, 'index']);
    Route::post('/classes', [KelasController::class, 'store']);

    // Class Schedules
    Route::get('/class-schedules', [ClassScheduleController::class, 'index']);
    Route::post('/class-schedules', [ClassScheduleController::class, 'store']);

    // Attendance Sessions
    Route::get('/attendance-sessions', [AttendanceSessionController::class, 'index']);
    Route::post('/attendance-sessions', [AttendanceSessionController::class, 'store']);
    Route::get('/attendance-sessions/{attendanceSession}', [AttendanceSessionController::class, 'show']);
});
