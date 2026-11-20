<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecognitionResult extends Model
{
    protected $fillable = [
        'recognition_session_id',
        'bbox',
        'candidate_student_id',
        'similarity_score',
        'status',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'bbox' => 'array',
        'similarity_score' => 'float',
        'reviewed_at' => 'datetime',
    ];

    public function recognitionSession()
    {
        return $this->belongsTo(RecognitionSession::class);
    }

    public function candidateStudent()
    {
        return $this->belongsTo(Student::class, 'candidate_student_id');
    }
}
