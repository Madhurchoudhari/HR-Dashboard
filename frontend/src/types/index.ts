export type UserRole = 'Admin' | 'Recruiter' | 'Viewer';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
}

export interface Source {
  id: number;
  name: string;
  cost_per_hire: number;
}

export interface JobOpening {
  id: number;
  title: string;
  department: string;
  location: string;
  hiring_manager: string;
  positions_count: number;
  status: 'Open' | 'Closed' | 'On Hold';
  opened_date: string;
  closed_date?: string | null;
  candidates_count?: number;
  hired_count?: number;
}

export interface CandidateStageHistory {
  id: number;
  candidate_id: number;
  stage: string;
  entered_at: string;
  exited_at?: string | null;
  duration_days: number;
}

export interface Interview {
  id: number;
  candidate_id: number;
  interviewer_name: string;
  scheduled_at: string;
  mode: 'Online' | 'In-person';
  feedback?: string | null;
  rating?: number | null;
  notification_sent?: boolean;
}

export type CommType = 'Call' | 'WhatsApp' | 'Email' | 'In-person' | 'Other';
export type NoteOutcome = 'Interested' | 'Call Later' | 'Not Interested' | 'Salary Negotiation' | 'No Response' | 'Offer Discussed' | 'Other';
export type FollowUpStatus = 'Pending' | 'Done' | 'Cancelled';

export interface CandidateNote {
  id: number;
  candidate_id: number;
  recruiter_id: number;
  communication_type: CommType;
  note_text: string;
  outcome: NoteOutcome;
  follow_up_needed: boolean;
  follow_up_date?: string | null;
  follow_up_status: FollowUpStatus;
  created_at: string;
  updated_at: string;
  recruiter?: User;
  candidate?: Candidate;
}

export interface Candidate {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  source_id?: number | null;
  job_opening_id?: number | null;
  recruiter_id?: number | null;
  applied_position?: string | null;
  resume_url?: string | null;
  status: string;
  rejection_reason?: string | null;
  date?: string | null;
  sr_no?: string | null;
  location?: string | null;
  interview_date?: string | null;
  interview_time?: string | null;
  current_employee?: string | null;
  current_ctc?: string | null;
  expected_ctc?: string | null;
  company_name?: string | null;
  hr_name?: string | null;
  remark?: string | null;
  b_plus_l?: string | null;
  cibil?: string | null;
  experience?: string | null;
  graduation?: string | null;
  age?: string | null;
  strength?: string | null;
  sheet_url?: string | null;
  created_at: string;
  source?: Source;
  job_opening?: JobOpening;
  recruiter?: User;
  stage_histories?: CandidateStageHistory[];
  interviews?: Interview[];
  notes?: CandidateNote[];
  latest_pending_note?: CandidateNote | null;
}

export interface DashboardData {
  kpis: {
    total_open_positions: number;
    total_active_candidates: number;
    avg_tat_days: number;
    offer_acceptance_rate: number;
  };
  funnel: Array<{
    stage: string;
    candidates: number;
    drop_off_pct: number;
  }>;
  hires_trend: Array<{
    month: string;
    hires: number;
  }>;
  source_comparison: Array<{
    source: string;
    volume: number;
    conversion_rate: number;
    cost_per_hire: number;
  }>;
  recruiter_leaderboard: Array<{
    id: number;
    name: string;
    department: string;
    positions_closed: number;
    avg_tat_days: number;
    pipeline_count: number;
  }>;
}

export interface ReportData {
  filters: {
    start_date: string;
    end_date: string;
    department: string;
  };
  summary: {
    total_candidates: number;
    total_hires: number;
    overall_conversion_rate: number;
  };
  time_to_hire_by_department: Array<{
    department: string;
    avg_tat_days: number;
    hires_count: number;
  }>;
  source_effectiveness: Array<{
    id: number;
    source: string;
    candidates_count: number;
    hired_count: number;
    conversion_rate: number;
    cost_per_hire: number;
    total_spend: number;
  }>;
  recruiter_performance: Array<{
    recruiter: string;
    department: string;
    hires: number;
    active_pipeline: number;
    avg_tat_days: number;
  }>;
  rejection_reasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

export interface FollowUpData {
  overdue: CandidateNote[];
  today: CandidateNote[];
  upcoming: CandidateNote[];
  counts: {
    overdue: number;
    today: number;
    upcoming: number;
    total_urgent: number;
  };
}
