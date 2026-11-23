<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CandidateStageHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'candidate_id',
        'stage',
        'entered_at',
        'exited_at',
        'duration_days',
    ];

    protected $casts = [
        'entered_at' => 'datetime',
        'exited_at' => 'datetime',
        'duration_days' => 'float',
    ];

    public function candidate()
    {
        return $this->belongsTo(Candidate::class);
    }
}
