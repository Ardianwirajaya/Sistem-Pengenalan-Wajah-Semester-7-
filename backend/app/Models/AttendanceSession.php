<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceSession extends Model
{
    protected $fillable = ['class_schedule_id', 'date', 'opened_by', 'status'];
    protected $casts = ['date' => 'date'];

    public function schedule()
    {
        return $this->belongsTo(ClassSchedule::class, 'class_schedule_id');
    }

    public function openedBy()
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function details()
    {
        return $this->hasMany(AttendanceDetail::class);
    }

    public function recognitionSessions()
    {
        return $this->hasMany(RecognitionSession::class);
    }
}
