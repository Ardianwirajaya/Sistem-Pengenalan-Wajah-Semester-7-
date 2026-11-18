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
    Schema::create('attendance_sessions', function (Blueprint $table) {
        $table->id();
        $table->foreignId('class_schedule_id')->constrained()->restrictOnDelete();
        $table->date('date');
        $table->foreignId('opened_by')->constrained('users')->restrictOnDelete();
        $table->string('status')->default('open'); // open|closed|cancelled
        $table->timestamps();
        $table->unique(['class_schedule_id', 'date']); // one session per slot per date
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_sessions');
    }
};
