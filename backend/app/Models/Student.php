<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use SoftDeletes;

    protected $fillable = ['nim', 'name', 'email', 'program_study', 'is_active'];
    protected $casts = ['is_active' => 'boolean'];

    public function faces()
    {
        return $this->hasMany(StudentFace::class);
    }
}