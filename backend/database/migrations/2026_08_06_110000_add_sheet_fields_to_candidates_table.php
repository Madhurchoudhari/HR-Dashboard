<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidates', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
            $table->string('applied_position')->nullable()->change();
            
            $table->string('date')->nullable();
            $table->string('sr_no')->nullable();
            $table->string('location')->nullable();
            $table->string('interview_date')->nullable();
            $table->string('interview_time')->nullable();
            $table->string('current_employee')->nullable();
            $table->string('current_ctc')->nullable();
            $table->string('expected_ctc')->nullable();
            $table->string('company_name')->nullable();
            $table->string('hr_name')->nullable();
            $table->string('remark')->nullable();
            $table->string('b_plus_l')->nullable();
            $table->string('cibil')->nullable();
            $table->string('experience')->nullable();
            $table->string('graduation')->nullable();
            $table->string('age')->nullable();
            $table->text('strength')->nullable();
            $table->text('sheet_url')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('candidates', function (Blueprint $table) {
            $table->dropColumn([
                'date',
                'sr_no',
                'location',
                'interview_date',
                'interview_time',
                'current_employee',
                'current_ctc',
                'expected_ctc',
                'company_name',
                'hr_name',
                'remark',
                'b_plus_l',
                'cibil',
                'experience',
                'graduation',
                'age',
                'strength',
                'sheet_url',
            ]);
        });
    }
};
