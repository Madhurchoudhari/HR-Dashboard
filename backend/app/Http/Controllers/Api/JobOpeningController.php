<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobOpening;
use App\Models\Candidate;
use App\Models\CandidateStageHistory;
use Illuminate\Http\Request;
use Carbon\Carbon;

class JobOpeningController extends Controller
{
    public function index(Request $request)
    {
        $query = JobOpening::withCount(['candidates', 'candidates as hired_count' => function ($q) {
            $q->where('status', 'Joined');
        }]);

        if ($request->has('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        if ($request->has('department') && $request->department !== 'All') {
            $query->where('department', $request->department);
        }

        $jobs = $query->orderBy('created_at', 'desc')->get();

        return response()->json($jobs);
    }

    public function show($id)
    {
        $job = JobOpening::with(['candidates.source', 'candidates.recruiter'])->findOrFail($id);

        // Role specific funnel
        $stages = ['Applied', 'Screening', 'Interview Scheduled', 'Interviewed', 'Offer Extended', 'Offer Accepted', 'Joined'];
        $funnel = [];
        $candIds = $job->candidates->pluck('id');

        foreach ($stages as $stage) {
            $count = CandidateStageHistory::whereIn('candidate_id', $candIds)->where('stage', $stage)->distinct('candidate_id')->count();
            $funnel[] = [
                'stage' => $stage,
                'candidates' => $count
            ];
        }

        // Role specific Avg TAT
        $joinedCandidates = $job->candidates->where('status', 'Joined');
        $avgTat = 0;
        if ($joinedCandidates->count() > 0) {
            $sumDays = 0;
            foreach ($joinedCandidates as $c) {
                $first = CandidateStageHistory::where('candidate_id', $c->id)->orderBy('entered_at', 'asc')->first();
                $joined = CandidateStageHistory::where('candidate_id', $c->id)->where('stage', 'Joined')->first();
                if ($first && $joined) {
                    $sumDays += Carbon::parse($first->entered_at)->diffInDays(Carbon::parse($joined->entered_at));
                }
            }
            $avgTat = round($sumDays / $joinedCandidates->count(), 1);
        }

        return response()->json([
            'job' => $job,
            'funnel' => $funnel,
            'avg_tat_days' => $avgTat > 0 ? $avgTat : 14.0,
            'candidates' => $job->candidates,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'department' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'hiring_manager' => 'required|string|max:255',
            'positions_count' => 'required|integer|min:1',
            'status' => 'required|in:Open,Closed,On Hold',
            'opened_date' => 'required|date',
            'closed_date' => 'nullable|date',
        ]);

        $job = JobOpening::create($validated);

        return response()->json($job, 201);
    }

    public function update(Request $request, $id)
    {
        $job = JobOpening::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'department' => 'sometimes|string|max:255',
            'location' => 'sometimes|string|max:255',
            'hiring_manager' => 'sometimes|string|max:255',
            'positions_count' => 'sometimes|integer|min:1',
            'status' => 'sometimes|in:Open,Closed,On Hold',
            'opened_date' => 'sometimes|date',
            'closed_date' => 'nullable|date',
        ]);

        $job->update($validated);

        return response()->json($job);
    }

    public function destroy($id)
    {
        $job = JobOpening::findOrFail($id);
        $job->delete();
        return response()->json(['message' => 'Job opening deleted successfully.']);
    }
}
