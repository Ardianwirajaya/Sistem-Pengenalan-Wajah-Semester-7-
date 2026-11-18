<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    protected $fillable = ['code', 'name', 'sks', 'is_active'];
    protected $casts = ['sks' => 'integer', 'is_active' => 'boolean'];
}