<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClassSchedule extends Model
{
    protected $fillable = ['class_id', 'day', 'start_time', 'end_time', 'room'];

    public function kelas()
    {
        return $this->belongsTo(Kelas::class, 'class_id');
    }
}
