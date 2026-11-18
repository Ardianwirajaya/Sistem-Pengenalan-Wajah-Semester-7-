<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MlModel extends Model
{
    protected $table = 'ml_models';

    protected $fillable = ['name', 'version', 'type', 'object_key', 'metrics', 'is_active'];
    protected $casts = ['metrics' => 'array', 'is_active' => 'boolean'];
}