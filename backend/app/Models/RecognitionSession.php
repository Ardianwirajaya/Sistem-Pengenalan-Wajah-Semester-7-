<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecognitionSession extends Model
{
    protected $fillable = [
        'attendance_session_id',
        'image_object_key',
        'status',
        'model_version',
        'processing_time_ms',
        'created_by',
        'error_message',
    ];

    protected $casts = ['processing_time_ms' => 'integer'];

    public function attendanceSession()
    {
        return $this->belongsTo(AttendanceSession::class);
    }

    public function results()
    {
        return $this->hasMany(RecognitionResult::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
