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
    Schema::create('face_datasets', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('source');
        $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
        $table->unsignedInteger('image_count')->default(0);
        $table->string('object_key')->nullable();
        $table->text('notes')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('face_datasets');
    }
};
