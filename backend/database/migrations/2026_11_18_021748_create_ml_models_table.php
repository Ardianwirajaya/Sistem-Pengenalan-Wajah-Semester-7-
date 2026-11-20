<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up(): void
{
    Schema::create('ml_models', function (Blueprint $table) {
        $table->id();
        $table->string('name');              // 'yolov11-face', 'arcface-buffalo_l'
        $table->string('version');           // 'v1.0', '2025-11-18-01'
        $table->string('type');              // 'detector' | 'recognizer'
        $table->string('object_key')->nullable(); // MinIO path to weights
        $table->jsonb('metrics')->nullable();     // {mAP, precision, recall, ...}
        $table->boolean('is_active')->default(false);
        $table->timestamps();
        $table->unique(['type', 'name', 'version']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ml_models');
    }
};
