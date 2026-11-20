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
    Schema::create('training_jobs', function (Blueprint $table) {
        $table->id();
        $table->foreignId('model_id')->nullable()->constrained('ml_models')->nullOnDelete();
        $table->foreignId('dataset_id')->nullable()->constrained('face_datasets')->nullOnDelete();
        $table->string('status')->default('queued'); // queued|running|completed|failed
        $table->jsonb('params')->nullable();         // epochs, lr, batch, etc.
        $table->string('log_object_key')->nullable();
        $table->timestamp('started_at')->nullable();
        $table->timestamp('finished_at')->nullable();
        $table->text('error_message')->nullable();
        $table->timestamps();
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_jobs');
    }
};
