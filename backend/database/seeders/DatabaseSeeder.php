<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Source;
use App\Models\JobOpening;
use App\Models\PipelineStage;
use App\Models\Candidate;
use App\Models\CandidateStageHistory;
use App\Models\Interview;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Users (Admin, Recruiters, Viewer)
        $admin = User::create([
            'name' => 'Elena Rostova',
            'email' => 'admin@recruitment.com',
            'password' => Hash::make('password'),
            'role' => 'Admin',
            'department' => 'HR Leadership',
        ]);

        $recruiter1 = User::create([
            'name' => 'Sarah Connor',
            'email' => 'sarah.recruiter@recruitment.com',
            'password' => Hash::make('password'),
            'role' => 'Recruiter',
            'department' => 'Tech Hiring',
        ]);

        $recruiter2 = User::create([
            'name' => 'Alex Rivera',
            'email' => 'alex.recruiter@recruitment.com',
            'password' => Hash::make('password'),
            'role' => 'Recruiter',
            'department' => 'Sales & Business',
        ]);

        $recruiter3 = User::create([
            'name' => 'Morgan Vance',
            'email' => 'morgan.recruiter@recruitment.com',
            'password' => Hash::make('password'),
            'role' => 'Recruiter',
            'department' => 'Operations & HR',
        ]);

        $viewer = User::create([
            'name' => 'David Miller',
            'email' => 'manager.viewer@recruitment.com',
            'password' => Hash::make('password'),
            'role' => 'Viewer',
            'department' => 'Executive Board',
        ]);

        $recruiters = [$recruiter1, $recruiter2, $recruiter3];

        // 2. Seed Sources
        $sourcesData = [
            ['name' => 'LinkedIn', 'cost_per_hire' => 1200.00],
            ['name' => 'Naukri', 'cost_per_hire' => 800.00],
            ['name' => 'Referral', 'cost_per_hire' => 350.00],
            ['name' => 'Walk-in', 'cost_per_hire' => 150.00],
            ['name' => 'Indeed', 'cost_per_hire' => 600.00],
            ['name' => 'Direct Website', 'cost_per_hire' => 200.00],
        ];

        $sources = [];
        foreach ($sourcesData as $s) {
            $sources[] = Source::create($s);
        }

        // 3. Seed Pipeline Stages
        $stageNames = [
            'Applied',
            'Screening',
            'Interview Scheduled',
            'Interviewed',
            'Offer Extended',
            'Offer Accepted',
            'Joined',
            'Rejected',
            'Withdrawn'
        ];

        foreach ($stageNames as $idx => $name) {
            PipelineStage::create([
                'name' => $name,
                'order_index' => $idx + 1
            ]);
        }

        // 4. Seed Job Openings
        $jobData = [
            [
                'title' => 'Senior Full Stack Developer',
                'department' => 'Tech',
                'location' => 'San Francisco, CA (Hybrid)',
                'hiring_manager' => 'Marcus Thorne',
                'positions_count' => 3,
                'status' => 'Open',
                'opened_date' => Carbon::now()->subMonths(5)->format('Y-m-d'),
            ],
            [
                'title' => 'React Frontend Lead',
                'department' => 'Tech',
                'location' => 'Remote',
                'hiring_manager' => 'Samantha Reed',
                'positions_count' => 2,
                'status' => 'Open',
                'opened_date' => Carbon::now()->subMonths(4)->format('Y-m-d'),
            ],
            [
                'title' => 'Enterprise Sales Account Executive',
                'department' => 'Sales',
                'location' => 'New York, NY',
                'hiring_manager' => 'Robert Vance',
                'positions_count' => 2,
                'status' => 'Open',
                'opened_date' => Carbon::now()->subMonths(6)->format('Y-m-d'),
            ],
            [
                'title' => 'Product Marketing Manager',
                'department' => 'Marketing',
                'location' => 'Chicago, IL',
                'hiring_manager' => 'Emily Watson',
                'positions_count' => 1,
                'status' => 'Open',
                'opened_date' => Carbon::now()->subMonths(3)->format('Y-m-d'),
            ],
            [
                'title' => 'HR Business Partner',
                'department' => 'HR',
                'location' => 'Austin, TX',
                'hiring_manager' => 'Jessica Alba',
                'positions_count' => 1,
                'status' => 'Closed',
                'opened_date' => Carbon::now()->subMonths(5)->format('Y-m-d'),
                'closed_date' => Carbon::now()->subMonth()->format('Y-m-d'),
            ],
            [
                'title' => 'DevOps & Infrastructure Engineer',
                'department' => 'Operations',
                'location' => 'Remote',
                'hiring_manager' => 'Amanda Palmer',
                'positions_count' => 2,
                'status' => 'Open',
                'opened_date' => Carbon::now()->subMonths(2)->format('Y-m-d'),
            ],
            [
                'title' => 'Financial Analyst',
                'department' => 'Finance',
                'location' => 'New York, NY',
                'hiring_manager' => 'Michael Scott',
                'positions_count' => 1,
                'status' => 'On Hold',
                'opened_date' => Carbon::now()->subMonths(3)->format('Y-m-d'),
            ],
        ];

        $jobOpenings = [];
        foreach ($jobData as $j) {
            $jobOpenings[] = JobOpening::create($j);
        }

        // 5. Seed 125 Realistic Candidates & Stage Histories over 6 months
        $firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle', 'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Dorothy', 'George', 'Melissa', 'Edward', 'Deborah'];
        $lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'];

        $allStages = ['Applied', 'Screening', 'Interview Scheduled', 'Interviewed', 'Offer Extended', 'Offer Accepted', 'Joined', 'Rejected', 'Withdrawn'];
        $rejectionReasons = ['Salary Expectations High', 'Lack of Technical Depth', 'Cultural Alignment', 'Accepted Competitor Offer', 'Role Scope Misalignment', 'Failed System Design'];

        $interviewers = ['Marcus Thorne', 'Samantha Reed', 'Robert Vance', 'Emily Watson', 'Jessica Alba', 'Amanda Palmer', 'Elena Rostova'];

        for ($i = 1; $i <= 125; $i++) {
            $firstName = $firstNames[array_rand($firstNames)];
            $lastName = $lastNames[array_rand($lastNames)];
            $fullName = "$firstName $lastName";
            $email = strtolower($firstName . '.' . $lastName . rand(10, 99) . '@example.com');
            $phone = '+1 (' . rand(200, 999) . ') ' . rand(100, 999) . '-' . rand(1000, 9999);
            
            $job = $jobOpenings[array_rand($jobOpenings)];
            $source = $sources[array_rand($sources)];
            $recruiter = $recruiters[array_rand($recruiters)];

            // Weighted distribution of status
            $randVal = rand(1, 100);
            if ($randVal <= 25) {
                $finalStage = 'Applied';
            } elseif ($randVal <= 42) {
                $finalStage = 'Screening';
            } elseif ($randVal <= 58) {
                $finalStage = 'Interview Scheduled';
            } elseif ($randVal <= 70) {
                $finalStage = 'Interviewed';
            } elseif ($randVal <= 78) {
                $finalStage = 'Offer Extended';
            } elseif ($randVal <= 83) {
                $finalStage = 'Offer Accepted';
            } elseif ($randVal <= 92) {
                $finalStage = 'Joined';
            } elseif ($randVal <= 97) {
                $finalStage = 'Rejected';
            } else {
                $finalStage = 'Withdrawn';
            }

            $rejectionReason = ($finalStage === 'Rejected' || $finalStage === 'Withdrawn') 
                ? $rejectionReasons[array_rand($rejectionReasons)] 
                : null;

            // Date applied between 180 days ago and today
            $appliedDaysAgo = rand(5, 180);
            $appliedDate = Carbon::now()->subDays($appliedDaysAgo);

            $candidate = Candidate::create([
                'name' => $fullName,
                'email' => $email,
                'phone' => $phone,
                'source_id' => $source->id,
                'job_opening_id' => $job->id,
                'recruiter_id' => $recruiter->id,
                'applied_position' => $job->title,
                'resume_url' => 'https://example.com/resumes/' . strtolower($firstName . '-' . $lastName) . '.pdf',
                'status' => $finalStage,
                'rejection_reason' => $rejectionReason,
                'created_at' => $appliedDate,
                'updated_at' => $appliedDate,
            ]);

            // Create stage history timeline
            // Find path to final stage
            $stagePath = [];
            if ($finalStage === 'Rejected' || $finalStage === 'Withdrawn') {
                // Was in Applied -> Screening -> (maybe Interviewed) -> Rejected
                $stopIdx = rand(1, 4);
                for ($k = 0; $k < $stopIdx; $k++) {
                    $stagePath[] = $allStages[$k];
                }
                $stagePath[] = $finalStage;
            } else {
                $targetIdx = array_search($finalStage, $allStages);
                for ($k = 0; $k <= $targetIdx; $k++) {
                    $stagePath[] = $allStages[$k];
                }
            }

            $currentTimeline = clone $appliedDate;
            $numStages = count($stagePath);

            foreach ($stagePath as $idx => $stg) {
                $enteredAt = clone $currentTimeline;
                $daysInStage = rand(2, 9);
                $isLast = ($idx === $numStages - 1);
                
                $exitedAt = $isLast ? null : (clone $enteredAt)->addDays($daysInStage);
                $durationDays = $isLast ? Carbon::now()->diffInDays($enteredAt) : $daysInStage;

                CandidateStageHistory::create([
                    'candidate_id' => $candidate->id,
                    'stage' => $stg,
                    'entered_at' => $enteredAt,
                    'exited_at' => $exitedAt,
                    'duration_days' => round($durationDays, 1),
                ]);

                if ($exitedAt) {
                    $currentTimeline = clone $exitedAt;
                }
            }

            // Create interview records for candidates in interview stages or beyond
            if (in_array($finalStage, ['Interview Scheduled', 'Interviewed', 'Offer Extended', 'Offer Accepted', 'Joined', 'Rejected'])) {
                $scheduledAt = (clone $appliedDate)->addDays(rand(4, 14));
                Interview::create([
                    'candidate_id' => $candidate->id,
                    'interviewer_name' => $interviewers[array_rand($interviewers)],
                    'scheduled_at' => $scheduledAt,
                    'mode' => rand(0, 1) === 1 ? 'Online' : 'In-person',
                    'feedback' => $finalStage === 'Interview Scheduled' ? null : 'Strong technical foundation and clear communication. Recommended for next round.',
                    'rating' => $finalStage === 'Interview Scheduled' ? null : rand(3, 5),
                    'notification_sent' => true,
                ]);
            }
        }

        // 6. Seed Candidate Communication Notes & Follow-ups
        $allCandidates = Candidate::all();
        $sampleNotes = [
            ['Call', 'Initial screening call. Candidate interested, requested salary details.', 'Interested'],
            ['WhatsApp', 'Sent job description PDF via WhatsApp. Candidate acknowledged.', 'Interested'],
            ['Email', 'Followed up on offer letter documentation. Candidate negotiating joining date.', 'Salary Negotiation'],
            ['Call', 'Tried calling candidate twice. No answer.', 'No Response'],
            ['In-person', 'Met at career fair. Candidate looking for senior backend role.', 'Offer Discussed'],
            ['Call', 'Candidate currently traveling, asked to call back next week.', 'Call Later'],
        ];

        // Seed Overdue, Today, and Upcoming follow-ups specifically
        foreach ($allCandidates->take(30) as $idx => $cand) {
            $noteData = $sampleNotes[$idx % count($sampleNotes)];
            
            $needsFollowUp = ($idx % 2 === 0);
            $followUpDate = null;
            $status = 'Done';

            if ($needsFollowUp) {
                if ($idx < 5) {
                    // Overdue follow-up
                    $followUpDate = Carbon::now()->subDays(rand(1, 4))->setTime(rand(9, 17), 0);
                    $status = 'Pending';
                } elseif ($idx < 10) {
                    // Due Today follow-up
                    $followUpDate = Carbon::now()->setTime(rand(10, 18), 0);
                    $status = 'Pending';
                } elseif ($idx < 18) {
                    // Upcoming follow-up
                    $followUpDate = Carbon::now()->addDays(rand(1, 6))->setTime(rand(9, 17), 0);
                    $status = 'Pending';
                }
            }

            \App\Models\CandidateNote::create([
                'candidate_id' => $cand->id,
                'recruiter_id' => $cand->recruiter_id,
                'communication_type' => $noteData[0],
                'note_text' => $noteData[1],
                'outcome' => $noteData[2],
                'follow_up_needed' => $needsFollowUp,
                'follow_up_date' => $followUpDate,
                'follow_up_status' => $status,
                'created_at' => Carbon::now()->subDays(rand(1, 10)),
            ]);
        }
    }
}
