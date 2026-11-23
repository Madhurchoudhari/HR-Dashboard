<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Models\CandidateStageHistory;
use App\Models\JobOpening;
use App\Models\Source;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CandidateController extends Controller
{
    public function index(Request $request)
    {
        $query = Candidate::with(['source', 'jobOpening', 'recruiter', 'stageHistories', 'interviews', 'latestPendingNote']);

        if ($request->filled('job_opening_id') && $request->job_opening_id !== 'All') {
            $query->where('job_opening_id', $request->job_opening_id);
        }

        if ($request->filled('source_id') && $request->source_id !== 'All') {
            $query->where('source_id', $request->source_id);
        }

        if ($request->filled('recruiter_id') && $request->recruiter_id !== 'All') {
            $query->where('recruiter_id', $request->recruiter_id);
        }

        if ($request->filled('stage') && $request->stage !== 'All') {
            $query->where('status', $request->stage);
        }

        if ($request->filled('location') && $request->location !== 'All') {
            $query->where('location', 'like', "%{$request->location}%");
        }

        if ($request->filled('remark') && $request->remark !== 'All') {
            $query->where('remark', 'like', "%{$request->remark}%");
        }

        if ($request->filled('hr_name') && $request->hr_name !== 'All') {
            $query->where('hr_name', 'like', "%{$request->hr_name}%");
        }

        if ($request->filled('applied_position') && $request->applied_position !== 'All') {
            $query->where('applied_position', 'like', "%{$request->applied_position}%");
        }

        if ($request->filled('date') && $request->date !== 'All') {
            $query->where('date', 'like', "%{$request->date}%");
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('applied_position', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('remark', 'like', "%{$search}%")
                  ->orWhere('hr_name', 'like', "%{$search}%");
            });
        }

        $candidates = $query->orderBy('id', 'desc')->get();

        return response()->json($candidates);
    }

    public function show($id)
    {
        $candidate = Candidate::with(['source', 'jobOpening', 'recruiter', 'stageHistories', 'interviews', 'notes.recruiter'])->findOrFail($id);

        return response()->json($candidate);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'source_id' => 'nullable|exists:sources,id',
            'job_opening_id' => 'nullable|exists:job_openings,id',
            'recruiter_id' => 'nullable|exists:users,id',
            'applied_position' => 'nullable|string|max:255',
            'resume_url' => 'nullable|string',
            'status' => 'nullable|string',
            'date' => 'nullable|string',
            'sr_no' => 'nullable|string',
            'location' => 'nullable|string',
            'interview_date' => 'nullable|string',
            'interview_time' => 'nullable|string',
            'current_employee' => 'nullable|string',
            'current_ctc' => 'nullable|string',
            'expected_ctc' => 'nullable|string',
            'company_name' => 'nullable|string',
            'hr_name' => 'nullable|string',
            'remark' => 'nullable|string',
            'b_plus_l' => 'nullable|string',
            'cibil' => 'nullable|string',
            'experience' => 'nullable|string',
            'graduation' => 'nullable|string',
            'age' => 'nullable|string',
            'strength' => 'nullable|string',
        ]);

        $currentUser = auth()->user();

        if ($currentUser && $currentUser->role === 'Recruiter') {
            $validated['recruiter_id'] = $currentUser->id;
        } else {
            if (empty($validated['recruiter_id']) && $currentUser) {
                $validated['recruiter_id'] = $currentUser->id;
            }
        }

        if (empty($validated['applied_position'])) {
            $validated['applied_position'] = 'General Candidate';
        }

        $initialStage = $validated['status'] ?? 'Applied';
        unset($validated['status']);

        $candidate = Candidate::create($validated);
        $candidate->changeStage($initialStage);

        return response()->json($candidate->load(['source', 'jobOpening', 'recruiter']), 201);
    }

    public function update(Request $request, $id)
    {
        $candidate = Candidate::findOrFail($id);
        $currentUser = auth()->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'source_id' => 'nullable|exists:sources,id',
            'job_opening_id' => 'nullable|exists:job_openings,id',
            'recruiter_id' => 'nullable|exists:users,id',
            'applied_position' => 'nullable|string|max:255',
            'resume_url' => 'nullable|string',
            'status' => 'sometimes|string',
            'rejection_reason' => 'nullable|string',
            'date' => 'nullable|string',
            'sr_no' => 'nullable|string',
            'location' => 'nullable|string',
            'interview_date' => 'nullable|string',
            'interview_time' => 'nullable|string',
            'current_employee' => 'nullable|string',
            'current_ctc' => 'nullable|string',
            'expected_ctc' => 'nullable|string',
            'company_name' => 'nullable|string',
            'hr_name' => 'nullable|string',
            'remark' => 'nullable|string',
            'b_plus_l' => 'nullable|string',
            'cibil' => 'nullable|string',
            'experience' => 'nullable|string',
            'graduation' => 'nullable|string',
            'age' => 'nullable|string',
            'strength' => 'nullable|string',
        ]);

        if (array_key_exists('recruiter_id', $validated) && $currentUser && $currentUser->role === 'Recruiter') {
            unset($validated['recruiter_id']);
        }

        if (isset($validated['status'])) {
            $candidate->changeStage($validated['status'], $validated['rejection_reason'] ?? null);
            unset($validated['status']);
        }

        $candidate->update($validated);

        return response()->json($candidate->load(['source', 'jobOpening', 'recruiter', 'stageHistories', 'latestPendingNote']));
    }

    public function updateStage(Request $request, $id)
    {
        $request->validate([
            'stage' => 'required|string',
            'rejection_reason' => 'nullable|string',
        ]);

        $candidate = Candidate::findOrFail($id);
        $candidate->changeStage($request->stage, $request->rejection_reason);

        return response()->json($candidate->load(['source', 'jobOpening', 'recruiter', 'stageHistories']));
    }

    public function destroy($id)
    {
        $candidate = Candidate::findOrFail($id);
        $candidate->stageHistories()->delete();
        $candidate->interviews()->delete();
        $candidate->notes()->delete();
        $candidate->delete();
        return response()->json(['message' => 'Candidate deleted successfully.']);
    }

    /**
     * Sync candidates directly from Google Sheet (CSV export URL with tab gid support)
     */
    public function syncGoogleSheet(Request $request)
    {
        $rawUrl = $request->input('sheet_url', 'https://docs.google.com/spreadsheets/d/1lFH4DVjFezQdnPC7N2EgDj8nvVklAP6J2-BuIv45uNQ/edit?usp=sharing');

        // Extract tab gid if present (e.g. gid=1261608263 or gid=431827304)
        $gid = null;
        if (preg_match('/[?&]gid=(\d+)/', $rawUrl, $matches)) {
            $gid = $matches[1];
        }

        // Convert standard edit/sharing URL to CSV export URL
        $sheetUrl = $rawUrl;
        if (str_contains($sheetUrl, '/edit')) {
            $sheetUrl = preg_replace('/\/edit.*$/', '/export?format=csv', $sheetUrl);
        } else if (!str_contains($sheetUrl, 'format=csv')) {
            $sheetUrl = rtrim(explode('?', $sheetUrl)[0], '/') . '/export?format=csv';
        }

        if ($gid !== null && !str_contains($sheetUrl, 'gid=')) {
            $sheetUrl .= '&gid=' . $gid;
        }

        try {
            $response = Http::timeout(35)->get($sheetUrl);
            
            if (!$response->successful()) {
                return response()->json(['message' => 'Failed to fetch CSV content from Google Sheet URL.'], 400);
            }

            $csvContent = $response->body();
            $lines = explode("\n", $csvContent);
            if (count($lines) < 2) {
                return response()->json(['message' => 'Google Sheet CSV returned no data rows.'], 400);
            }

            // Find header line index dynamically
            $headerLineRaw = null;
            $headerIndex = -1;

            foreach ($lines as $idx => $line) {
                $row = str_getcsv($line);
                if (!empty($row) && count($row) >= 3) {
                    $rowStr = implode(' ', array_map('strtolower', $row));
                    if (str_contains($rowStr, 'name') || str_contains($rowStr, 'contact') || str_contains($rowStr, 'location') || str_contains($rowStr, 'sr')) {
                        $headerLineRaw = array_map(function($h) { return strtolower(trim($h)); }, $row);
                        $headerIndex = $idx;
                        break;
                    }
                }
            }

            if ($headerIndex === -1) {
                $headerIndex = 0;
            }

            // Build smart column index mapping based on header aliases
            $colIndexes = [
                'sr_no' => -1,
                'date' => -1,
                'name' => -1,
                'phone' => -1,
                'location' => -1,
                'position' => -1,
                'interview_date' => -1,
                'interview_time' => -1,
                'current_employee' => -1,
                'current_ctc' => -1,
                'expected_ctc' => -1,
                'company_name' => -1,
                'hr_name' => -1,
                'remark' => -1,
                'b_plus_l' => -1,
                'cibil' => -1,
                'experience' => -1,
                'graduation' => -1,
                'age' => -1,
                'strength' => -1,
            ];

            if ($headerLineRaw) {
                foreach ($headerLineRaw as $idx => $headerName) {
                    if (in_array($headerName, ['name', 'candidate name', 'candidate'])) $colIndexes['name'] = $idx;
                    else if (in_array($headerName, ['contact number', 'contact', 'phone', 'mobile'])) $colIndexes['phone'] = $idx;
                    else if (in_array($headerName, ['date'])) $colIndexes['date'] = $idx;
                    else if (in_array($headerName, ['sr. no', 'sr no', 'sr', 'sr.no'])) $colIndexes['sr_no'] = $idx;
                    else if (in_array($headerName, ['location', 'city'])) $colIndexes['location'] = $idx;
                    else if (in_array($headerName, ['position', 'applied position', 'designation'])) $colIndexes['position'] = $idx;
                    else if (in_array($headerName, ['int. date', 'interview date', 'int date', 'interview_date'])) $colIndexes['interview_date'] = $idx;
                    else if (in_array($headerName, ['int. time', 'interview time', 'int time'])) $colIndexes['interview_time'] = $idx;
                    else if (in_array($headerName, ['current employee', 'current working', 'currently working'])) $colIndexes['current_employee'] = $idx;
                    else if (in_array($headerName, ['ctc', 'current ctc', 'current_salary'])) $colIndexes['current_ctc'] = $idx;
                    else if (in_array($headerName, ['ectc', 'expected ctc', 'expected_salary'])) $colIndexes['expected_ctc'] = $idx;
                    else if (in_array($headerName, ['company name', 'company', 'previous company'])) $colIndexes['company_name'] = $idx;
                    else if (in_array($headerName, ['hr. name', 'hr name', 'recruiter', 'hr'])) $colIndexes['hr_name'] = $idx;
                    else if (in_array($headerName, ['remark', 'remarks', 'status'])) $colIndexes['remark'] = $idx;
                    else if (in_array($headerName, ['b+l', 'b + l'])) $colIndexes['b_plus_l'] = $idx;
                    else if (in_array($headerName, ['cibil', 'cibil score'])) $colIndexes['cibil'] = $idx;
                    else if (in_array($headerName, ['experience', 'exp'])) $colIndexes['experience'] = $idx;
                    else if (in_array($headerName, ['education', 'graduation', 'degree'])) $colIndexes['graduation'] = $idx;
                    else if (in_array($headerName, ['age'])) $colIndexes['age'] = $idx;
                    else if (in_array($headerName, ['strength'])) $colIndexes['strength'] = $idx;
                }
            }

            $getVal = function($row, $key, $fallbackIdx = -1) use ($colIndexes) {
                $idx = $colIndexes[$key] ?? -1;
                if ($idx !== -1 && isset($row[$idx])) {
                    return trim($row[$idx]);
                }
                if ($fallbackIdx !== -1 && isset($row[$fallbackIdx])) {
                    return trim($row[$fallbackIdx]);
                }
                return '';
            };

            $createdCount = 0;
            $updatedCount = 0;

            $defaultJob = JobOpening::first();
            $defaultSource = Source::first();
            $currentUser = auth()->user();

            for ($i = $headerIndex + 1; $i < count($lines); $i++) {
                $line = trim($lines[$i]);
                if (empty($line)) continue;

                $row = str_getcsv($line);
                if (count($row) < 2) continue;

                $name = $getVal($row, 'name', 2);
                $phone = $getVal($row, 'phone', 3);
                $dateVal = $getVal($row, 'date', 1);
                $srNo = $getVal($row, 'sr_no', 0);
                $location = $getVal($row, 'location', 4);
                $position = $getVal($row, 'position', 6);
                $interviewDate = $getVal($row, 'interview_date');
                $interviewTime = $getVal($row, 'interview_time');
                $currentEmp = $getVal($row, 'current_employee');
                $currentCtc = $getVal($row, 'current_ctc');
                $expectedCtc = $getVal($row, 'expected_ctc');
                $companyName = $getVal($row, 'company_name');
                $hrName = $getVal($row, 'hr_name');
                $remark = $getVal($row, 'remark');
                $bPlusL = $getVal($row, 'b_plus_l');
                $cibil = $getVal($row, 'cibil');
                $experience = $getVal($row, 'experience');
                $graduation = $getVal($row, 'graduation');
                $age = $getVal($row, 'age');
                $strength = $getVal($row, 'strength');

                if (empty($name) || strlen($name) < 2 || strtolower($name) === 'name' || strtolower($name) === 'candidate name') {
                    continue; // Skip header repetitions or empty names
                }

                // Determine pipeline stage based on remark / interview date
                $stage = 'Applied';
                $remarkLower = strtolower($remark);
                if (str_contains($remarkLower, 'shortlist')) {
                    $stage = 'Screening';
                } else if (str_contains($remarkLower, 'not interested') || str_contains($remarkLower, 'rejected')) {
                    $stage = 'Rejected';
                } else if (str_contains($remarkLower, 'joined')) {
                    $stage = 'Joined';
                } else if (!empty($interviewDate) && $interviewDate !== '-') {
                    $stage = 'Interview Scheduled';
                }

                // Clean phone number
                $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
                
                // Match existing candidate by phone or (name + location)
                $candidate = null;
                if (!empty($cleanPhone) && strlen($cleanPhone) >= 8) {
                    $candidate = Candidate::where('phone', 'like', "%{$cleanPhone}%")->first();
                }

                if (!$candidate) {
                    $candidate = Candidate::where('name', $name)
                        ->where(function($q) use ($location) {
                            if (!empty($location)) {
                                $q->where('location', $location)->orWhereNull('location');
                            }
                        })->first();
                }

                $dataPayload = [
                    'name' => $name,
                    'phone' => $phone,
                    'date' => $dateVal,
                    'sr_no' => $srNo,
                    'location' => $location,
                    'applied_position' => (!empty($position) && $position !== '-') ? $position : 'General Candidate',
                    'interview_date' => $interviewDate,
                    'interview_time' => $interviewTime,
                    'current_employee' => $currentEmp,
                    'current_ctc' => $currentCtc,
                    'expected_ctc' => $expectedCtc,
                    'company_name' => $companyName,
                    'hr_name' => $hrName,
                    'remark' => $remark,
                    'b_plus_l' => $bPlusL,
                    'cibil' => $cibil,
                    'experience' => $experience,
                    'graduation' => $graduation,
                    'age' => $age,
                    'strength' => $strength,
                    'sheet_url' => $rawUrl,
                ];

                if (!$candidate) {
                    // Create new candidate
                    $dataPayload['email'] = strtolower(str_replace(' ', '', $name)) . ($cleanPhone ? '.' . substr($cleanPhone, -4) : '') . '@candidate.local';
                    $dataPayload['source_id'] = $defaultSource ? $defaultSource->id : null;
                    $dataPayload['job_opening_id'] = $defaultJob ? $defaultJob->id : null;
                    $dataPayload['recruiter_id'] = $currentUser ? $currentUser->id : null;
                    $dataPayload['status'] = $stage;

                    $newCandidate = Candidate::create($dataPayload);
                    $newCandidate->changeStage($stage);
                    $createdCount++;
                } else {
                    // Update existing candidate without deleting records!
                    if (!empty($stage) && $candidate->status !== $stage) {
                        $candidate->changeStage($stage);
                    }
                    $candidate->update($dataPayload);
                    $updatedCount++;
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Successfully synced Google Sheet tab data!",
                'stats' => [
                    'total_processed' => $createdCount + $updatedCount,
                    'created' => $createdCount,
                    'updated' => $updatedCount,
                ],
                'last_synced_at' => Carbon::now()->toIso8601String(),
            ]);
        } catch (\Exception $e) {
            Log::error('Google Sheet Sync Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to sync with Google Sheet: ' . $e->getMessage()
            ], 500);
        }
    }

    public function parseResume(Request $request)
    {
        $request->validate([
            'resume_text' => 'nullable|string',
            'file' => 'nullable|file|mimes:txt,pdf,doc,docx|max:5000',
        ]);

        $text = $request->input('resume_text', '');
        
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $text = file_get_contents($file->getRealPath());
        }

        $email = null;
        if (preg_match('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', $text, $matches)) {
            $email = $matches[0];
        }

        $phone = null;
        if (preg_match('/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/', $text, $matches)) {
            $phone = $matches[0];
        }

        $name = null;
        $lines = explode("\n", trim($text));
        if (count($lines) > 0 && !empty(trim($lines[0]))) {
            $name = trim($lines[0]);
        }

        return response()->json([
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'raw_text_snippet' => substr($text, 0, 300),
        ]);
    }
}
