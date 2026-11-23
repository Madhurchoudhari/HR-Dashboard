<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobOpening extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'department',
        'location',
        'hiring_manager',
        'positions_count',
        'status',
        'opened_date',
        'closed_date',
    ];

    protected $casts = [
        'opened_date' => 'date',
        'closed_date' => 'date',
        'positions_count' => 'integer',
    ];

    public function candidates()
    {
        return $this->hasMany(Candidate::class);
    }
}
