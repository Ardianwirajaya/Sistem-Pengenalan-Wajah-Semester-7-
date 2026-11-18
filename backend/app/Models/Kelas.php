<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kelas extends Model
{
    protected $table = 'classes';

    protected $fillable = ['course_id', 'name', 'semester', 'academic_year', 'is_active'];
    protected $casts = ['semester' => 'integer', 'is_active' => 'boolean'];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function schedules()
    {
        return $this->hasMany(ClassSchedule::class, 'class_id');
    }
}
