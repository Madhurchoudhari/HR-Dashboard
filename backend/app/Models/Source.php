<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Source extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'cost_per_hire',
    ];

    public function candidates()
    {
        return $this->hasMany(Candidate::class);
    }
}
