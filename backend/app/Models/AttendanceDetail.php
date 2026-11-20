<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceDetail extends Model
{
    protected $fillable = [
        'attendance_session_id',
        'student_id',
        'status',
        'recognition_result_id',
        'confirmed_by',
        'confirmed_at',
    ];

    protected $casts = ['confirmed_at' => 'datetime'];

    public function attendanceSession()
    {
        return $this->belongsTo(AttendanceSession::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function confirmedBy()
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
