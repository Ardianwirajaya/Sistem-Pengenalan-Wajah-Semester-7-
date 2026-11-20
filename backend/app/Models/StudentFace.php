<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class StudentFace extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'student_id',
        'object_key',
        'embedding',
        'model_version',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}