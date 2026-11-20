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
    Schema::create('recognition_sessions', function (Blueprint $table) {
        $table->id();
        $table->foreignId('attendance_session_id')->constrained()->cascadeOnDelete();
        $table->string('image_object_key');    // MinIO path to the class photo
        $table->string('status')->default('queued'); // queued|processing|completed|failed
        $table->string('model_version')->nullable();
        $table->unsignedInteger('processing_time_ms')->nullable();
        $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
        $table->text('error_message')->nullable();
        $table->timestamps();
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recognition_sessions');
    }
};
