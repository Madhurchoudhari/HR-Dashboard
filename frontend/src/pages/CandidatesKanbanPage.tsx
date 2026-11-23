import React, { useEffect, useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { apiClient } from '../api/client';
import type { Candidate, JobOpening, Source, User } from '../types';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { CommunicationLogTab } from '../components/candidates/CommunicationLogTab';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  Phone,
  Mail,
  Star,
  Sparkles,
  UserCheck,
  UserX,
  UserPlus,
  Send,
  FileCheck,
  RefreshCw,
  Calendar,
  CalendarRange,
  Tag,
  X,
  SlidersHorizontal
} from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function parseSheetDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === '-') return null;
  const clean = dateStr.replace(/['"]/g, '').trim();
  const m = clean.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/);
  if (!m) return null;
  const day = parseInt(m[1]);
  const monthStr = m[2].toLowerCase();
  const yearRaw = parseInt(m[3]);
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const monthIdx = MONTHS.findIndex(mo => mo.toLowerCase().startsWith(monthStr.substring(0, 3)));
  if (monthIdx === -1) return null;
  return new Date(year, monthIdx, day);
}

const STAGES = [
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

export const CandidatesKanbanPage: React.FC = () => {
  const { canEdit, isAdmin, user: currentUser } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [recruiters, setRecruiters] = useState<User[]>([]);
  const [, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedJob] = useState('All');
  const [selectedSource] = useState('All');
  const [selectedRecruiter] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedRemark, setSelectedRemark] = useState('All');
  const [selectedHr, setSelectedHr] = useState('All');
  // Month / Date-range filter
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterMode, setFilterMode] = useState<'month' | 'daterange'>('month');
  const [showFilters, setShowFilters] = useState(false);

  // Candidate detail drawer/modal
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'interviews' | 'resume'>('timeline');

  // Interview schedule form
  const [interviewerName, setInterviewerName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [mode, setMode] = useState<'Online' | 'In-person'>('Online');
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(4);
  const [notificationStatus, setNotificationStatus] = useState('');

  // Resume Parser state
  const [resumeText, setResumeText] = useState('');
  const [parsedData, setParsedData] = useState<{ name?: string; email?: string; phone?: string; skills?: string[] } | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Create Candidate Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    source_id: 1,
    job_opening_id: 1,
    recruiter_id: currentUser?.id || 1,
    applied_position: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [candRes, jobRes, sourceRes] = await Promise.all([
        apiClient.get('/candidates', {
          params: {
            search,
            job_opening_id: selectedJob,
            source_id: selectedSource,
            recruiter_id: selectedRecruiter,
          }
        }),
        apiClient.get('/job-openings'),
        apiClient.get('/settings')
      ]);

      setCandidates(candRes.data);
      setJobs(jobRes.data);
      setSources(sourceRes.data.sources || []);
      setRecruiters(sourceRes.data.users || []);
    } catch (err) {
      console.error('Error loading candidates data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGoogleSheet = async () => {
    setSyncing(true);
    const activeUrl = localStorage.getItem('active_google_sheet_url') ||
      'https://docs.google.com/spreadsheets/d/1lFH4DVjFezQdnPC7N2EgDj8nvVklAP6J2-BuIv45uNQ/edit?gid=431827304#gid=431827304';
    try {
      await apiClient.post('/candidates/sync-google-sheet', {
        sheet_url: activeUrl
      });
      await fetchData();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedJob, selectedSource, selectedRecruiter]);

  const locationsList = useMemo(() => {
    const s = new Set<string>();
    candidates.forEach(c => { if (c.location && c.location.trim() !== '' && c.location !== '-') s.add(c.location.trim()); });
    return Array.from(s).sort();
  }, [candidates]);

  const remarksList = useMemo(() => {
    const s = new Set<string>();
    candidates.forEach(c => { if (c.remark && c.remark.trim() !== '') s.add(c.remark.trim()); });
    return Array.from(s).sort();
  }, [candidates]);

  const hrList = useMemo(() => {
    const s = new Set<string>();
    candidates.forEach(c => { if (c.hr_name && c.hr_name.trim()) s.add(c.hr_name.trim()); });
    return Array.from(s).sort();
  }, [candidates]);

  const monthsList = useMemo(() => {
    const s = new Set<string>();
    candidates.forEach(c => {
      if (c.date) { const p = parseSheetDate(c.date); if (p) s.add(MONTHS[p.getMonth()]); }
    });
    return MONTHS.filter(m => s.has(m));
  }, [candidates]);

  const yearsList = useMemo(() => {
    const s = new Set<string>();
    candidates.forEach(c => {
      if (c.date) { const p = parseSheetDate(c.date); if (p) s.add(String(p.getFullYear())); }
    });
    return Array.from(s).sort();
  }, [candidates]);

  const hasActiveFilters = search || selectedLocation !== 'All' || selectedRemark !== 'All' ||
    selectedHr !== 'All' || selectedMonth !== 'All' || selectedYear !== 'All' || dateFrom || dateTo;

  const resetFilters = () => {
    setSearch(''); setSelectedLocation('All'); setSelectedRemark('All');
    setSelectedHr('All'); setSelectedMonth('All'); setSelectedYear('All');
    setDateFrom(''); setDateTo('');
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (selectedLocation !== 'All' && c.location?.trim() !== selectedLocation) return false;
      if (selectedRemark !== 'All' && c.remark?.trim() !== selectedRemark) return false;
      if (selectedHr !== 'All' && c.hr_name?.trim() !== selectedHr) return false;
      const parsedDate = c.date ? parseSheetDate(c.date) : null;
      if (filterMode === 'month') {
        if (selectedMonth !== 'All' || selectedYear !== 'All') {
          if (!parsedDate) return false;
          if (selectedMonth !== 'All' && MONTHS[parsedDate.getMonth()] !== selectedMonth) return false;
          if (selectedYear !== 'All' && String(parsedDate.getFullYear()) !== selectedYear) return false;
        }
      } else {
        if (dateFrom || dateTo) {
          if (!parsedDate) return false;
          if (dateFrom && parsedDate < new Date(dateFrom)) return false;
          if (dateTo && parsedDate > new Date(dateTo + 'T23:59:59')) return false;
        }
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.location || '').toLowerCase().includes(q) ||
          (c.applied_position || '').toLowerCase().includes(q) ||
          (c.remark || '').toLowerCase().includes(q) ||
          (c.hr_name || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [candidates, search, selectedLocation, selectedRemark, selectedHr,
      selectedMonth, selectedYear, filterMode, dateFrom, dateTo]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const candidateId = parseInt(draggableId);
    const newStage = destination.droppableId;

    // Optimistic UI update
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: newStage } : c));

    try {
      await apiClient.patch(`/candidates/${candidateId}/stage`, { stage: newStage });
      fetchData();
    } catch (err) {
      console.error('Failed to update stage', err);
      fetchData();
    }
  };

  const openCandidateDrawer = async (candidateId: number) => {
    try {
      const res = await apiClient.get(`/candidates/${candidateId}`);
      setSelectedCandidate(res.data);
      setInterviewerName(currentUser?.name || '');
      setScheduledAt(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    } catch (err) {
      console.error('Failed to load candidate details', err);
    }
  };

  const handleAssignRecruiter = async (candidateId: number, recruiterId: number | null) => {
    try {
      const res = await apiClient.put(`/candidates/${candidateId}`, { recruiter_id: recruiterId });
      setCandidates(prev => prev.map(c => c.id === candidateId ? res.data : c));
      if (selectedCandidate && selectedCandidate.id === candidateId) {
        setSelectedCandidate(res.data);
      }
    } catch (err) {
      console.error('Failed to update recruiter assignment', err);
      alert('Failed to update recruiter assignment.');
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    try {
      await apiClient.post('/interviews', {
        candidate_id: selectedCandidate.id,
        interviewer_name: interviewerName,
        scheduled_at: scheduledAt,
        mode,
        feedback,
        rating,
      });

      setFeedback('');
      openCandidateDrawer(selectedCandidate.id);
      fetchData();
    } catch (err) {
      console.error('Failed to schedule interview', err);
    }
  };

  const handleSendNotification = async (interviewId: number, channel: 'email' | 'whatsapp') => {
    try {
      const res = await apiClient.post(`/interviews/${interviewId}/notify`, { channel });
      setNotificationStatus(res.data.message);
      setTimeout(() => setNotificationStatus(''), 5000);
      if (selectedCandidate) openCandidateDrawer(selectedCandidate.id);
    } catch (err) {
      console.error('Failed to send notification', err);
    }
  };

  const handleParseResume = async () => {
    if (!resumeText) return;
    setIsParsing(true);
    try {
      const res = await apiClient.post('/candidates/parse-resume', { resume_text: resumeText });
      setParsedData(res.data.parsed);
    } catch (err) {
      console.error('Failed to parse resume', err);
    } finally {
      setIsParsing(false);
    }
  };

  const applyParsedToNewCandidate = () => {
    if (!parsedData) return;
    setNewCandidate(prev => ({
      ...prev,
      name: parsedData.name && parsedData.name !== 'Parsed Candidate' ? parsedData.name : prev.name,
      email: parsedData.email || prev.email,
      phone: parsedData.phone || prev.phone,
    }));
    setSelectedCandidate(null);
    setIsCreateModalOpen(true);
  };

  const applyParsedToCurrentCandidate = async () => {
    if (!parsedData || !selectedCandidate) return;
    try {
      const updatePayload: any = {};
      if (parsedData.name && parsedData.name !== 'Parsed Candidate') updatePayload.name = parsedData.name;
      if (parsedData.email) updatePayload.email = parsedData.email;
      if (parsedData.phone) updatePayload.phone = parsedData.phone;

      const res = await apiClient.put(`/candidates/${selectedCandidate.id}`, updatePayload);
      setSelectedCandidate(res.data);
      setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? res.data : c));
      alert('Candidate details updated from parsed resume!');
    } catch (err) {
      console.error('Failed to update candidate details', err);
    }
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/candidates', newCandidate);
      setIsCreateModalOpen(false);
      setNewCandidate({
        name: '',
        email: '',
        phone: '',
        source_id: sources[0]?.id || 1,
        job_opening_id: jobs[0]?.id || 1,
        recruiter_id: currentUser?.id || 1,
        applied_position: '',
      });
      fetchData();
    } catch (err) {
      console.error('Failed to create candidate', err);
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* ── Header Bar ── */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
        {/* Top row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search name, phone, location, remark..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-xl pl-9 pr-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            {/* Location */}
            <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none">
              <option value="All">📍 All Locations ({locationsList.length})</option>
              {locationsList.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {/* Remark */}
            <select value={selectedRemark} onChange={e => setSelectedRemark(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none">
              <option value="All">📝 All Remarks ({remarksList.length})</option>
              {remarksList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {/* HR */}
            <select value={selectedHr} onChange={e => setSelectedHr(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none">
              <option value="All">👤 All HR ({hrList.length})</option>
              {hrList.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            {/* Toggle advanced date filters */}
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border font-semibold transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Date Filters
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
            </button>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-semibold">
                <X className="w-3.5 h-3.5" />Reset
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSyncGoogleSheet} disabled={syncing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Sheet'}</span>
            </button>
            {canEdit && (
              <button onClick={() => setIsCreateModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all">
                <Plus className="w-4 h-4" /><span>Add Candidate</span>
              </button>
            )}
          </div>
        </div>

        {/* Expanded date filter row */}
        {showFilters && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex flex-wrap items-center gap-3">
            {/* Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button onClick={() => setFilterMode('month')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                  filterMode === 'month' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Tag className="w-3.5 h-3.5" />Month Filter
              </button>
              <button onClick={() => setFilterMode('daterange')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                  filterMode === 'daterange' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <CalendarRange className="w-3.5 h-3.5" />Custom Range
              </button>
            </div>

            {/* Month filter */}
            {filterMode === 'month' && (
              <div className="flex flex-wrap items-center gap-2">
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold outline-none">
                  <option value="All">📅 All Months ({monthsList.length})</option>
                  {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold outline-none">
                  <option value="All">All Years ({yearsList.length})</option>
                  {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <div className="flex flex-wrap gap-1">
                  {monthsList.map(m => (
                    <button key={m} onClick={() => setSelectedMonth(selectedMonth === m ? 'All' : m)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                        selectedMonth === m
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-400'
                      }`}>{m.slice(0, 3)}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom date range */}
            {filterMode === 'daterange' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <label className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">From:</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="bg-transparent text-xs text-indigo-800 dark:text-indigo-200 outline-none" />
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <label className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">To:</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="bg-transparent text-xs text-indigo-800 dark:text-indigo-200 outline-none" />
                </div>
                {(dateFrom || dateTo) && (
                  <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                    className="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1">
                    <X className="w-3.5 h-3.5" />Clear
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Kanban Board Container */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 min-h-[calc(100vh-250px)]">
          {STAGES.map(stage => {
            const stageCandidates = filteredCandidates.filter(c => c.status === stage);

            return (
              <div
                key={stage}
                className="w-72 shrink-0 bg-gray-50/80 dark:bg-gray-900/60 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 flex flex-col"
              >
                {/* Stage Header */}
                <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <h3 className="text-xs font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                      {stage}
                    </h3>
                  </div>
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                    {stageCandidates.length}
                  </span>
                </div>

                {/* Droppable Column */}
                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 space-y-3 flex-1 overflow-y-auto min-h-[150px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      {stageCandidates.map((candidate, index) => (
                        <Draggable
                          key={candidate.id.toString()}
                          draggableId={candidate.id.toString()}
                          index={index}
                        >
                          {(providedDrag, snapshotDrag) => (
                            <div
                              ref={providedDrag.innerRef}
                              {...providedDrag.draggableProps}
                              {...providedDrag.dragHandleProps}
                              onClick={() => openCandidateDrawer(candidate.id)}
                              className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer ${
                                snapshotDrag.isDragging ? 'shadow-xl scale-105 border-indigo-500 ring-2 ring-indigo-500/30' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">
                                  {candidate.name}
                                </h4>
                                <span className="text-[10px] font-semibold text-gray-400">
                                  #{candidate.id}
                                </span>
                              </div>

                              <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300 mt-1 truncate">
                                {candidate.applied_position}
                              </p>

                              {/* Next Follow-up Chip */}
                              {candidate.latest_pending_note?.follow_up_date && (
                                <div className="mt-2 text-[10px] font-bold">
                                  {(() => {
                                    const d = new Date(candidate.latest_pending_note.follow_up_date);
                                    const now = new Date();
                                    now.setHours(0, 0, 0, 0);
                                    const isOverdue = d < now;
                                    const isToday = d.toDateString() === new Date().toDateString();

                                    return (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${
                                        isOverdue ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800' :
                                        isToday   ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                                        'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                      }`}>
                                        <span>📅 Follow-up:</span>
                                        <span>{d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                        {isOverdue && <span className="font-black">⚠</span>}
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}

                              <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50 text-[10px] text-gray-400">
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                                  {candidate.source?.name || 'Direct'}
                                </span>
                                <span className={`flex items-center gap-1 font-semibold ${candidate.recruiter ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-500'}`}>
                                  {candidate.recruiter ? (
                                    <><UserCheck className="w-3 h-3" /> {candidate.recruiter.name.split(' ')[0]}</>
                                  ) : (
                                    <><UserX className="w-3 h-3" /> Unassigned</>
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Candidate Detail Drawer */}
      {selectedCandidate && (
        <Modal
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          title={`Candidate Profile: ${selectedCandidate.name}`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Header info with Recruiter Assign Dropdown */}
            <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {selectedCandidate.name}
                    <Badge variant="open">{selectedCandidate.status}</Badge>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selectedCandidate.email}</span>
                    {selectedCandidate.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedCandidate.phone}</span>}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Position</span>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{selectedCandidate.applied_position}</p>
                </div>
              </div>

              {/* Recruiter Assignment Control */}
              <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  Assigned Recruiter:
                </span>
                {isAdmin ? (
                  <select
                    value={selectedCandidate.recruiter_id || ''}
                    onChange={e => handleAssignRecruiter(selectedCandidate.id, e.target.value ? parseInt(e.target.value) : null)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-1 font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {recruiters.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.role})</option>
                    ))}
                  </select>
                ) : (
                  <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">
                    {selectedCandidate.recruiter?.name ?? 'Unassigned'}
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 text-xs font-bold overflow-x-auto">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'timeline'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                }`}
              >
                Stage Timeline
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'notes'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                }`}
              >
                💬 Communication Log
              </button>
              <button
                onClick={() => setActiveTab('interviews')}
                className={`px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'interviews'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                }`}
              >
                Interviews
              </button>
              <button
                onClick={() => setActiveTab('resume')}
                className={`px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'resume'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                }`}
              >
                Resume Parser
              </button>
            </div>

            {/* TAB: Communication Log */}
            {activeTab === 'notes' && (
              <CommunicationLogTab
                candidateId={selectedCandidate.id}
                onNoteAdded={() => openCandidateDrawer(selectedCandidate.id)}
              />
            )}

            {/* TAB 1: Stage Timeline & TAT */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Pipeline Progression & Time-in-Stage Audit
                </h4>
                <div className="relative border-l-2 border-indigo-200 dark:border-indigo-900/60 ml-3 pl-4 space-y-4">
                  {selectedCandidate.stage_histories?.map((hist, _idx) => (
                    <div key={hist.id} className="relative">
                      <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-gray-900" />
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{hist.stage}</p>
                          <p className="text-[10px] text-gray-400">
                            Entered: {new Date(hist.entered_at).toLocaleDateString()} {new Date(hist.entered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-[11px]">
                            {hist.duration_days} days in stage
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: Interviews & Feedback */}
            {activeTab === 'interviews' && (
              <div className="space-y-5">
                {notificationStatus && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl text-xs font-medium border border-emerald-200">
                    {notificationStatus}
                  </div>
                )}

                {/* Existing Interviews */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scheduled / Completed Interviews</h4>
                  {selectedCandidate.interviews && selectedCandidate.interviews.length > 0 ? (
                    selectedCandidate.interviews.map(inv => (
                      <div key={inv.id} className="p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {inv.interviewer_name} ({inv.mode})
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(inv.scheduled_at).toLocaleString()}
                          </span>
                        </div>

                        {inv.rating && (
                          <div className="flex items-center gap-1 text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${i < inv.rating! ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-700'}`}
                              />
                            ))}
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 ml-1">{inv.rating}/5</span>
                          </div>
                        )}

                        {inv.feedback && (
                          <p className="text-[11px] text-gray-600 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                            "{inv.feedback}"
                          </p>
                        )}

                        {/* Notification Trigger Mocks */}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700/50">
                          <span className="text-[10px] text-gray-400">
                            {inv.notification_sent ? '✓ Reminder Sent' : 'No reminder sent yet'}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSendNotification(inv.id, 'email')}
                              className="px-2 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded font-semibold text-[10px] hover:bg-indigo-100 flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" /> Email
                            </button>
                            <button
                              onClick={() => handleSendNotification(inv.id, 'whatsapp')}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded font-semibold text-[10px] hover:bg-emerald-100 flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" /> WhatsApp
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic">No interviews scheduled yet.</p>
                  )}
                </div>

                {/* Schedule Form */}
                {canEdit && (
                  <form onSubmit={handleScheduleInterview} className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Schedule New Interview Round
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Interviewer Name</label>
                        <input
                          type="text"
                          required
                          value={interviewerName}
                          onChange={e => setInterviewerName(e.target.value)}
                          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Date & Time</label>
                        <input
                          type="datetime-local"
                          required
                          value={scheduledAt}
                          onChange={e => setScheduledAt(e.target.value)}
                          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Interview Mode</label>
                        <select
                          value={mode}
                          onChange={e => setMode(e.target.value as any)}
                          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white"
                        >
                          <option value="Online">Online Video Call</option>
                          <option value="In-person">In-person Office</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Rating (1 to 5)</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={rating}
                          onChange={e => setRating(parseInt(e.target.value))}
                          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Interviewer Feedback Notes</label>
                      <textarea
                        rows={2}
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        placeholder="Log candidate strengths, weaknesses, recommendation..."
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm"
                    >
                      Save & Schedule Interview
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: Resume & AI Parser */}
            {activeTab === 'resume' && (
              <div className="space-y-4">
                <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 p-3.5 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Regex Candidate Resume Parser</span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400">
                    Paste raw resume text below to extract Candidate Email, Phone, Name, and Skill keywords.
                  </p>

                  <textarea
                    rows={4}
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    placeholder="Paste resume raw text here..."
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg p-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <button
                    onClick={handleParseResume}
                    disabled={isParsing || !resumeText}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
                  >
                    {isParsing ? 'Parsing Resume...' : 'Parse Resume Keywords'}
                  </button>

                  {parsedData && (
                    <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs space-y-3">
                      <div className="space-y-1">
                        <p><strong className="text-gray-500">Extracted Name:</strong> <span className="font-bold text-gray-900 dark:text-white">{parsedData.name}</span></p>
                        <p><strong className="text-gray-500">Extracted Email:</strong> <span className="font-semibold text-indigo-600">{parsedData.email || 'Not found'}</span></p>
                        <p><strong className="text-gray-500">Extracted Phone:</strong> <span className="font-semibold text-emerald-600">{parsedData.phone || 'Not found'}</span></p>
                      </div>

                      <div>
                        <strong className="text-gray-500 block mb-1">Detected Skills:</strong>
                        <div className="flex flex-wrap gap-1">
                          {parsedData.skills && parsedData.skills.length > 0 ? (
                            parsedData.skills.map(sk => (
                              <span key={sk} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded font-semibold text-[10px]">
                                {sk}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 italic">No skill keywords detected.</span>
                          )}
                        </div>
                      </div>

                      {/* Resume Actions */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2">
                        <button
                          onClick={applyParsedToCurrentCandidate}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs transition-colors"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          Update Current Profile
                        </button>
                        <button
                          onClick={applyParsedToNewCandidate}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Create New Candidate Form
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Create Candidate Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Candidate to Pipeline"
      >
        <form onSubmit={handleCreateCandidate} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Full Name *</label>
            <input
              type="text"
              required
              value={newCandidate.name}
              onChange={e => setNewCandidate(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Email Address *</label>
              <input
                type="email"
                required
                value={newCandidate.email}
                onChange={e => setNewCandidate(f => ({ ...f, email: e.target.value }))}
                placeholder="rahul@example.com"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Phone Number</label>
              <input
                type="text"
                value={newCandidate.phone}
                onChange={e => setNewCandidate(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Applied Position *</label>
            <input
              type="text"
              required
              value={newCandidate.applied_position}
              onChange={e => setNewCandidate(f => ({ ...f, applied_position: e.target.value }))}
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Target Job Position *</label>
              <select
                value={newCandidate.job_opening_id}
                onChange={e => setNewCandidate(f => ({ ...f, job_opening_id: parseInt(e.target.value) }))}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2 text-gray-900 dark:text-white"
              >
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Sourcing Channel *</label>
              <select
                value={newCandidate.source_id}
                onChange={e => setNewCandidate(f => ({ ...f, source_id: parseInt(e.target.value) }))}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2 text-gray-900 dark:text-white"
              >
                {sources.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned Recruiter Selection */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Assigned Recruiter *</label>
            {isAdmin ? (
              <select
                value={newCandidate.recruiter_id}
                onChange={e => setNewCandidate(f => ({ ...f, recruiter_id: parseInt(e.target.value) }))}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-2 text-gray-900 dark:text-white font-bold"
              >
                {recruiters.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.role} - {r.department || 'HR'})</option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                <span>Auto-assigned to you:</span>
                <span>{currentUser?.name} ({currentUser?.role})</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              Save & Add Candidate
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
