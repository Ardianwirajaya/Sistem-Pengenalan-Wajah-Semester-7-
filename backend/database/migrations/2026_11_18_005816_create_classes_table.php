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
    Schema::create('classes', function (Blueprint $table) {
        $table->id();
        $table->foreignId('course_id')->constrained()->restrictOnDelete();
        $table->string('name');               // e.g. "IF-1A"
        $table->smallInteger('semester');
        $table->string('academic_year');      // e.g. "2025/2026"
        $table->boolean('is_active')->default(true);
        $table->timestamps();
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('classes');
    }
};
