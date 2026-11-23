import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { Candidate } from '../types';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  RefreshCw,
  Download,
  Edit2,
  Check,
  X,
  MapPin,
  Calendar,
  UserCheck,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
  ChevronUp,
  ChevronDown,
  CalendarRange,
  Tag,
  SlidersHorizontal
} from 'lucide-react';

const STAGES = [
  'Applied', 'Screening', 'Interview Scheduled', 'Interviewed',
  'Offer Extended', 'Offer Accepted', 'Joined', 'Rejected', 'Withdrawn'
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Helper: parse sheet date strings like "1 June 26", "2 July 26", "3 Aug 26" → Date object
function parseSheetDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === '-') return null;
  const clean = dateStr.replace(/['"]/g, '').trim();
  // Format: "D Month YY" like "1 June 26" or "2 July 26"
  const m = clean.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/);
  if (!m) return null;
  const day = parseInt(m[1]);
  const monthStr = m[2].toLowerCase();
  const yearRaw = parseInt(m[3]);
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const monthIdx = MONTHS.findIndex(mo => mo.toLowerCase().startsWith(monthStr.toLowerCase().substring(0, 3)));
  if (monthIdx === -1) return null;
  return new Date(year, monthIdx, day);
}

export const AllCandidatesPage: React.FC = () => {
  const { canEdit, user: currentUser } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // ─── Filter States ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');
  const [selectedRemark, setSelectedRemark] = useState('All');
  const [selectedHr, setSelectedHr] = useState('All');

  // Month filter (e.g. "June", "July", "August" etc.)
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');

  // Custom date range filter (applied on parsed date field)
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterMode, setFilterMode] = useState<'month' | 'daterange'>('month');

  // ─── Pagination & Sorting ─────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<keyof Candidate>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ─── Inline editing ────────────────────────────────────────────────────────────
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Candidate>>({});

  // ─── Modals ────────────────────────────────────────────────────────────────────
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState<Candidate | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCandidate, setNewCandidate] = useState<Partial<Candidate>>({
    name: '', phone: '', email: '', location: '', applied_position: '',
    status: 'Applied', remark: '', hr_name: currentUser?.name || 'Pooja',
  });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // ─── Google Sheet Presets ─────────────────────────────────────────────────────
  const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1lFH4DVjFezQdnPC7N2EgDj8nvVklAP6J2-BuIv45uNQ/edit?gid=431827304#gid=431827304';
  const [currentSheetUrl, setCurrentSheetUrl] = useState(
    () => localStorage.getItem('active_google_sheet_url') || DEFAULT_SHEET_URL
  );
  const [newSheetLabel, setNewSheetLabel] = useState('');
  const [savedSheets, setSavedSheets] = useState<Array<{ label: string; url: string }>>(() => {
    const stored = localStorage.getItem('saved_google_sheets');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { }
    }
    return [
      { label: 'August 2026 Sheet', url: 'https://docs.google.com/spreadsheets/d/1lFH4DVjFezQdnPC7N2EgDj8nvVklAP6J2-BuIv45uNQ/edit?gid=431827304#gid=431827304' },
      { label: 'July 2026 Sheet', url: 'https://docs.google.com/spreadsheets/d/1lFH4DVjFezQdnPC7N2EgDj8nvVklAP6J2-BuIv45uNQ/edit?gid=1261608263#gid=1261608263' },
      { label: 'June 2026 Sheet', url: 'https://docs.google.com/spreadsheets/d/1lFH4DVjFezQdnPC7N2EgDj8nvVklAP6J2-BuIv45uNQ/edit?gid=0#gid=0' }
    ];
  });

  // ─── Fetch Data ───────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [candRes] = await Promise.all([
        apiClient.get('/candidates'),
      ]);
      setCandidates(candRes.data);
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Sheet Presets ─────────────────────────────────────────────────────────────
  const saveSheetPresetsToStorage = (sheets: Array<{ label: string; url: string }>) => {
    setSavedSheets(sheets);
    localStorage.setItem('saved_google_sheets', JSON.stringify(sheets));
  };

  const handleAddSheetPreset = () => {
    if (!currentSheetUrl.trim()) return;
    const label = newSheetLabel.trim() || `Sheet (${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`;
    const updated = [...savedSheets.filter(s => s.url !== currentSheetUrl), { label, url: currentSheetUrl.trim() }];
    saveSheetPresetsToStorage(updated);
    setNewSheetLabel('');
  };

  const handleDeleteSheetPreset = (urlToDelete: string) => {
    saveSheetPresetsToStorage(savedSheets.filter(s => s.url !== urlToDelete));
  };

  // ─── Google Sheet Sync ─────────────────────────────────────────────────────────
  const handleSyncGoogleSheet = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl || currentSheetUrl).trim();
    if (!targetUrl) return;
    setSyncing(true);
    setSyncMessage(null);
    localStorage.setItem('active_google_sheet_url', targetUrl);
    setCurrentSheetUrl(targetUrl);
    try {
      const res = await apiClient.post('/candidates/sync-google-sheet', { sheet_url: targetUrl });
      setSyncMessage({
        type: 'success',
        text: `✅ Sync complete! Processed ${res.data.stats.total_processed} (${res.data.stats.created} added, ${res.data.stats.updated} updated).`
      });
      setLastSynced(new Date().toLocaleTimeString());
      setIsSyncModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setSyncMessage({
        type: 'error',
        text: err.response?.data?.message || 'Sync failed. Check the sheet URL and sharing settings.'
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 8000);
    }
  };

  // ─── Delete Candidate ──────────────────────────────────────────────────────────
  const handleDeleteCandidate = async () => {
    if (!deleteTargetId) return;
    try {
      await apiClient.delete(`/candidates/${deleteTargetId}`);
      setCandidates(prev => prev.filter(c => c.id !== deleteTargetId));
      setIsDeleteConfirmOpen(false);
      setDeleteTargetId(null);
    } catch (err) {
      console.error('Failed to delete candidate:', err);
      alert('Error deleting candidate.');
    }
  };

  const confirmDelete = (id: number) => {
    setDeleteTargetId(id);
    setIsDeleteConfirmOpen(true);
  };

  // ─── Dynamic Filter Lists ─────────────────────────────────────────────────────
  const locationsList = useMemo(() => {
    const s = new Set<string>();
    candidates.forEach(c => { if (c.location && c.location !== '-') s.add(c.location.trim()); });
    return Array.from(s).sort();
  }, [candidates]);

  const positionsList = useMemo(() => {
    const s = new Set<string>();
    candidates.forEach(c => { if (c.applied_position && c.applied_position !== '-' && c.applied_position !== 'General Candidate') s.add(c.applied_position.trim()); });
    return Array.from(s).sort();
  }, [candidates]);

  const remarksList = useMemo(() => {
    const s = new Set<string>();
    candidates.forEach(c => { if (c.remark && c.remark.trim()) s.add(c.remark.trim()); });
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
      if (c.date) {
        const parsed = parseSheetDate(c.date);
        if (parsed) s.add(MONTHS[parsed.getMonth()]);
      }
    });
    return MONTHS.filter(m => s.has(m));
  }, [candidates]);

  const yearsList = useMemo(() => {
    const s = new Set<string>();
    candidates.forEach(c => {
      if (c.date) {
        const parsed = parseSheetDate(c.date);
        if (parsed) s.add(String(parsed.getFullYear()));
      }
    });
    return Array.from(s).sort();
  }, [candidates]);

  // ─── Filtering Logic ──────────────────────────────────────────────────────────
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (selectedLocation !== 'All' && c.location?.trim() !== selectedLocation) return false;
      if (selectedPosition !== 'All' && c.applied_position?.trim() !== selectedPosition) return false;
      if (selectedStage !== 'All' && c.status !== selectedStage) return false;
      if (selectedRemark !== 'All' && c.remark?.trim() !== selectedRemark) return false;
      if (selectedHr !== 'All' && c.hr_name?.trim() !== selectedHr) return false;

      // Date filtering
      const parsedDate = c.date ? parseSheetDate(c.date) : null;

      if (filterMode === 'month') {
        if (selectedMonth !== 'All' || selectedYear !== 'All') {
          if (!parsedDate) return false;
          if (selectedMonth !== 'All' && MONTHS[parsedDate.getMonth()] !== selectedMonth) return false;
          if (selectedYear !== 'All' && String(parsedDate.getFullYear()) !== selectedYear) return false;
        }
      } else if (filterMode === 'daterange') {
        if (dateFrom || dateTo) {
          if (!parsedDate) return false;
          if (dateFrom && parsedDate < new Date(dateFrom)) return false;
          if (dateTo && parsedDate > new Date(dateTo + 'T23:59:59')) return false;
        }
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.location || '').toLowerCase().includes(q) ||
          (c.applied_position || '').toLowerCase().includes(q) ||
          (c.remark || '').toLowerCase().includes(q) ||
          (c.hr_name || '').toLowerCase().includes(q) ||
          (c.experience || '').toLowerCase().includes(q) ||
          (c.company_name || '').toLowerCase().includes(q) ||
          (c.cibil || '').includes(q)
        );
      }

      return true;
    });
  }, [candidates, search, selectedLocation, selectedPosition, selectedStage,
    selectedRemark, selectedHr, selectedMonth, selectedYear, filterMode, dateFrom, dateTo]);

  // ─── Sorting ──────────────────────────────────────────────────────────────────
  const sortedCandidates = useMemo(() => {
    return [...filteredCandidates].sort((a, b) => {
      let valA = (a[sortField] ?? '') as string;
      let valB = (b[sortField] ?? '') as string;
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCandidates, sortField, sortOrder]);

  // ─── Pagination ───────────────────────────────────────────────────────────────
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCandidates.slice(start, start + pageSize);
  }, [sortedCandidates, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sortedCandidates.length / pageSize));

  const handleSort = (field: keyof Candidate) => {
    if (sortField === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: keyof Candidate }) => {
    if (sortField !== field) return <span className="text-gray-300 dark:text-gray-600">↕</span>;
    return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 inline text-indigo-500" /> : <ChevronDown className="w-3 h-3 inline text-indigo-500" />;
  };

  // ─── Inline Editing ───────────────────────────────────────────────────────────
  const startInlineEdit = (c: Candidate) => { setEditingRowId(c.id); setEditFormData({ ...c }); };
  const cancelInlineEdit = () => { setEditingRowId(null); setEditFormData({}); };
  const saveInlineEdit = async (id: number) => {
    try {
      const res = await apiClient.put(`/candidates/${id}`, editFormData);
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...res.data } : c));
      setEditingRowId(null); setEditFormData({});
    } catch (err) { console.error(err); alert('Error saving changes.'); }
  };

  const openEditModal = (c: Candidate) => { setCandidateToEdit({ ...c }); setIsEditModalOpen(true); };
  const handleSaveEditModal = async () => {
    if (!candidateToEdit) return;
    try {
      const res = await apiClient.put(`/candidates/${candidateToEdit.id}`, candidateToEdit);
      setCandidates(prev => prev.map(c => c.id === candidateToEdit.id ? { ...c, ...res.data } : c));
      setIsEditModalOpen(false); setCandidateToEdit(null);
    } catch (err) { console.error(err); alert('Error saving candidate.'); }
  };

  const handleCreateCandidate = async () => {
    try {
      const res = await apiClient.post('/candidates', newCandidate);
      setCandidates(prev => [res.data, ...prev]);
      setIsCreateModalOpen(false);
      setNewCandidate({ name: '', phone: '', email: '', location: '', applied_position: '', status: 'Applied', remark: '', hr_name: currentUser?.name || 'Pooja' });
    } catch (err) { console.error(err); alert('Error creating candidate.'); }
  };

  // ─── CSV Export ───────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ['Sr', 'Date', 'Name', 'Phone', 'Location', 'Position', 'Stage', 'Int.Date', 'HR Name', 'Remark', 'CTC', 'Exp.CTC', 'Exp', 'Grad', 'CIBIL', 'B+L', 'Age', 'Strength'];
    const rows = filteredCandidates.map((c, i) => [
      c.sr_no || i + 1, `"${c.date || ''}"`, `"${c.name}"`, `"${c.phone || ''}"`,
      `"${c.location || ''}"`, `"${c.applied_position || ''}"`, `"${c.status}"`,
      `"${c.interview_date || ''}"`, `"${c.hr_name || ''}"`, `"${c.remark || ''}"`,
      `"${c.current_ctc || ''}"`, `"${c.expected_ctc || ''}"`, `"${c.experience || ''}"`,
      `"${c.graduation || ''}"`, `"${c.cibil || ''}"`, `"${c.b_plus_l || ''}"`,
      `"${c.age || ''}"`, `"${c.strength || ''}"`
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `candidates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSearch(''); setSelectedLocation('All'); setSelectedPosition('All');
    setSelectedStage('All'); setSelectedRemark('All'); setSelectedHr('All');
    setSelectedMonth('All'); setSelectedYear('All');
    setDateFrom(''); setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters = search || selectedLocation !== 'All' || selectedPosition !== 'All' ||
    selectedStage !== 'All' || selectedRemark !== 'All' || selectedHr !== 'All' ||
    selectedMonth !== 'All' || selectedYear !== 'All' || dateFrom || dateTo;

  // KPI stats
  const shortlisted = filteredCandidates.filter(c => (c.remark || '').toLowerCase().includes('shortlist') || c.status === 'Screening' || c.status === 'Interview Scheduled').length;
  const withInterview = filteredCandidates.filter(c => c.interview_date && c.interview_date !== '-').length;

  return (
    <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">All Candidates Directory</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Google Sheet linked database · Inline editable · Multi-month filterable
            {lastSynced && <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold">● Synced: {lastSynced}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => handleSyncGoogleSheet()} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 transition-all">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
          <button onClick={() => setIsSyncModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 font-medium text-xs flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Change Month Sheet</span>
          </button>
          <button onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          {canEdit && (
            <button onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center gap-1.5 shadow-md shadow-indigo-500/20">
              <Plus className="w-4 h-4" />
              <span>Add Candidate</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Sync Alert ── */}
      {syncMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm border ${syncMessage.type === 'success'
          ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
          : 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'}`}>
          <div className="flex items-center gap-2">
            {syncMessage.type === 'success' ? <UserCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{syncMessage.text}</span>
          </div>
          <button onClick={() => setSyncMessage(null)} className="ml-4 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total (Filtered)', value: filteredCandidates.length, color: 'indigo' },
          { label: 'Shortlisted', value: shortlisted, color: 'emerald' },
          { label: 'Interviews Scheduled', value: withInterview, color: 'purple' },
          { label: 'Locations', value: locationsList.length, color: 'amber' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl bg-${kpi.color}-50 dark:bg-${kpi.color}-950 flex items-center justify-center font-bold text-${kpi.color}-600 dark:text-${kpi.color}-400 text-lg shrink-0`}>
              {kpi.value}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-tight">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ── Advanced Filters Panel ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
            <span>Advanced Filters</span>
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold">
                Active
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-semibold">
              <X className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          )}
        </div>

        {/* Row 1: Search + Location + Position + Stage + HR + Remark */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search name, phone, location, remark..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          {/* Location */}
          <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="All">📍 All Locations ({locationsList.length})</option>
            {locationsList.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          {/* Position */}
          <select value={selectedPosition} onChange={e => setSelectedPosition(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="All">💼 All Positions ({positionsList.length})</option>
            {positionsList.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Pipeline Stage */}
          <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="All">🔄 All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Remark */}
          <select value={selectedRemark} onChange={e => setSelectedRemark(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="All">📝 All Remarks ({remarksList.length})</option>
            {remarksList.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Row 2: HR Filter + Date Filters (Month-wise vs. Custom Range) */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2.5">
          <div className="flex flex-wrap items-center gap-3">
            {/* HR Name */}
            <div>
              <select value={selectedHr} onChange={e => setSelectedHr(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="All">👤 All HR Names ({hrList.length})</option>
                {hrList.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            {/* Filter Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setFilterMode('month')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${filterMode === 'month' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                <Tag className="w-3.5 h-3.5" />
                Month Filter
              </button>
              <button
                onClick={() => setFilterMode('daterange')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${filterMode === 'daterange' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                <CalendarRange className="w-3.5 h-3.5" />
                Custom Range
              </button>
            </div>

            {/* Month-wise filter */}
            {filterMode === 'month' && (
              <div className="flex items-center gap-2 flex-wrap">
                <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold">
                  <option value="All">📅 All Months ({monthsList.length})</option>
                  {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold">
                  <option value="All">All Years ({yearsList.length})</option>
                  {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                {/* Month quick buttons */}
                <div className="flex flex-wrap gap-1">
                  {monthsList.map(m => (
                    <button key={m} onClick={() => { setSelectedMonth(selectedMonth === m ? 'All' : m); setCurrentPage(1); }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors ${selectedMonth === m
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-400'}`}>
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom date range filter */}
            {filterMode === 'daterange' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <label className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">From:</label>
                  <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
                    className="bg-transparent text-xs text-indigo-800 dark:text-indigo-200 outline-none" />
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <label className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">To:</label>
                  <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
                    className="bg-transparent text-xs text-indigo-800 dark:text-indigo-200 outline-none" />
                </div>
                {(dateFrom || dateTo) && (
                  <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                    className="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> Clear Range
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-indigo-400" />
            Loading candidate data...
          </div>
        ) : paginatedCandidates.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200">No candidates match your filters.</p>
            <p className="text-xs text-gray-400">Try adjusting your filters or sync a Google Sheet to import data.</p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="px-4 py-2 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 rounded-xl">
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-gray-800 uppercase tracking-wide select-none text-[11px]">
                  <th className="py-3 px-2 text-center w-10">Sr</th>
                  <th className="py-3 px-2 cursor-pointer whitespace-nowrap" onClick={() => handleSort('date')}>Date <SortIcon field="date" /></th>
                  <th className="py-3 px-2 cursor-pointer min-w-[150px]" onClick={() => handleSort('name')}>Candidate <SortIcon field="name" /></th>
                  <th className="py-3 px-2">Phone</th>
                  <th className="py-3 px-2 cursor-pointer" onClick={() => handleSort('location')}>Location <SortIcon field="location" /></th>
                  <th className="py-3 px-2 cursor-pointer" onClick={() => handleSort('applied_position')}>Position <SortIcon field="applied_position" /></th>
                  <th className="py-3 px-2">Stage</th>
                  <th className="py-3 px-2 whitespace-nowrap">Int. Date</th>
                  <th className="py-3 px-2 cursor-pointer" onClick={() => handleSort('remark')}>Remark <SortIcon field="remark" /></th>
                  <th className="py-3 px-2">HR</th>
                  <th className="py-3 px-2 whitespace-nowrap">CTC / Exp.CTC</th>
                  <th className="py-3 px-2 whitespace-nowrap">Exp / Grad</th>
                  <th className="py-3 px-2">CIBIL</th>
                  <th className="py-3 px-2 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedCandidates.map((candidate, idx) => {
                  const isEditing = editingRowId === candidate.id;
                  const rowNum = (currentPage - 1) * pageSize + idx + 1;
                  const remarkLow = (candidate.remark || '').toLowerCase();
                  const remarkColor = remarkLow.includes('shortlist') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : remarkLow.includes('not interested') || remarkLow.includes('rejected') ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

                  return (
                    <tr key={candidate.id}
                      className={`transition-colors ${isEditing ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : 'hover:bg-indigo-50/30 dark:hover:bg-gray-800/40'}`}>

                      <td className="py-2 px-2 text-center text-gray-400 text-[11px] font-mono">{candidate.sr_no || rowNum}</td>

                      {/* Date */}
                      <td className="py-2 px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {isEditing ? (
                          <input type="text" value={editFormData.date || ''} onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                            className="w-20 px-1.5 py-1 text-xs border rounded bg-white dark:bg-gray-800" />
                        ) : candidate.date || '-'}
                      </td>

                      {/* Name */}
                      <td className="py-2 px-2 font-semibold text-gray-900 dark:text-white">
                        {isEditing ? (
                          <input type="text" value={editFormData.name || ''} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                            className="w-full px-1.5 py-1 text-xs border rounded bg-white dark:bg-gray-800" />
                        ) : (
                          <span className="cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline" onClick={() => openEditModal(candidate)}>
                            {candidate.name}
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-2 px-2 font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {isEditing ? (
                          <input type="text" value={editFormData.phone || ''} onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                            className="w-24 px-1.5 py-1 text-xs border rounded bg-white dark:bg-gray-800" />
                        ) : candidate.phone || '-'}
                      </td>

                      {/* Location */}
                      <td className="py-2 px-2 text-gray-600 dark:text-gray-400">
                        {isEditing ? (
                          <input type="text" value={editFormData.location || ''} onChange={e => setEditFormData({ ...editFormData, location: e.target.value })}
                            className="w-20 px-1.5 py-1 text-xs border rounded bg-white dark:bg-gray-800" />
                        ) : candidate.location ? (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-rose-400 shrink-0" />{candidate.location}</span>
                        ) : '-'}
                      </td>

                      {/* Position */}
                      <td className="py-2 px-2 text-gray-700 dark:text-gray-300">
                        {isEditing ? (
                          <input type="text" value={editFormData.applied_position || ''} onChange={e => setEditFormData({ ...editFormData, applied_position: e.target.value })}
                            className="w-20 px-1.5 py-1 text-xs border rounded bg-white dark:bg-gray-800" />
                        ) : candidate.applied_position || '-'}
                      </td>

                      {/* Stage */}
                      <td className="py-2 px-2">
                        {isEditing ? (
                          <select value={editFormData.status || 'Applied'} onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                            className="px-1.5 py-1 text-xs border rounded bg-white dark:bg-gray-800">
                            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <Badge variant={
                            candidate.status === 'Joined' || candidate.status === 'Offer Accepted' ? 'joined' :
                              candidate.status === 'Rejected' || candidate.status === 'Withdrawn' ? 'rejected' :
                                candidate.status === 'Screening' || candidate.status === 'Interview Scheduled' ? 'screening' : 'applied'
                          }>{candidate.status}</Badge>
                        )}
                      </td>

                      {/* Interview Date */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        {isEditing ? (
                          <input type="text" value={editFormData.interview_date || ''} onChange={e => setEditFormData({ ...editFormData, interview_date: e.target.value })}
                            className="w-20 px-1.5 py-1 text-xs border rounded bg-white dark:bg-gray-800" />
                        ) : candidate.interview_date && candidate.interview_date !== '-' ? (
                          <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                            <Calendar className="w-3 h-3" />{candidate.interview_date}
                          </span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>

                      {/* Remark */}
                      <td className="py-2 px-2">
                        {isEditing ? (
                          <input type="text" value={editFormData.remark || ''} onChange={e => setEditFormData({ ...editFormData, remark: e.target.value })}
                            className="w-28 px-1.5 py-1 text-xs border rounded bg-white dark:bg-gray-800" />
                        ) : candidate.remark ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${remarkColor}`}>{candidate.remark}</span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>

                      {/* HR */}
                      <td className="py-2 px-2 text-gray-600 dark:text-gray-400">
                        {isEditing ? (
                          <input type="text" value={editFormData.hr_name || ''} onChange={e => setEditFormData({ ...editFormData, hr_name: e.target.value })}
                            className="w-16 px-1.5 py-1 text-xs border rounded bg-white dark:bg-gray-800" />
                        ) : candidate.hr_name || '-'}
                      </td>

                      {/* CTC */}
                      <td className="py-2 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap text-[11px]">
                        {candidate.current_ctc || '-'} / {candidate.expected_ctc || '-'}
                      </td>

                      {/* Exp / Grad */}
                      <td className="py-2 px-2 text-gray-600 dark:text-gray-400 text-[11px] whitespace-nowrap">
                        {candidate.experience || '-'} / {candidate.graduation || '-'}
                      </td>

                      {/* CIBIL */}
                      <td className="py-2 px-2 font-mono text-gray-700 dark:text-gray-300">
                        {candidate.cibil || '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => saveInlineEdit(candidate.id)} className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700" title="Save"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={cancelInlineEdit} className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button onClick={() => startInlineEdit(candidate)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors" title="Quick Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEditModal(candidate)} className="px-2 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors">
                              Details
                            </button>
                            <button onClick={() => confirmDelete(candidate.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors" title="Delete Candidate">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/70 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing <b className="text-gray-900 dark:text-white">{sortedCandidates.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</b>–<b className="text-gray-900 dark:text-white">{Math.min(currentPage * pageSize, sortedCandidates.length)}</b> of <b className="text-gray-900 dark:text-white">{sortedCandidates.length}</b> candidates
          </span>
          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none">
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40">← Prev</button>
            <span className="font-semibold text-gray-900 dark:text-white">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40">Next →</button>
          </div>
        </div>
      </div>

      {/* ── Delete Confirm Modal ── */}
      {isDeleteConfirmOpen && (
        <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirm Delete Candidate">
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center gap-3">
              <Trash2 className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Are you sure you want to delete this candidate?</p>
                <p className="text-xs mt-1 opacity-80">This will permanently remove the candidate along with their stage history, interviews, and notes. This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 font-medium text-xs">Cancel</button>
              <button onClick={handleDeleteCandidate} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete Candidate
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Candidate Modal ── */}
      {isEditModalOpen && candidateToEdit && (
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit: ${candidateToEdit.name}`}>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Candidate Name *', field: 'name' as const },
                { label: 'Contact Number', field: 'phone' as const },
                { label: 'Location', field: 'location' as const },
                { label: 'Applied Position', field: 'applied_position' as const },
                { label: 'Interview Date', field: 'interview_date' as const },
                { label: 'HR Name', field: 'hr_name' as const },
                { label: 'Current CTC', field: 'current_ctc' as const },
                { label: 'Expected CTC', field: 'expected_ctc' as const },
                { label: 'Experience', field: 'experience' as const },
                { label: 'Graduation', field: 'graduation' as const },
                { label: 'CIBIL Score', field: 'cibil' as const },
                { label: 'B+L', field: 'b_plus_l' as const },
                { label: 'Age', field: 'age' as const },
                { label: 'Company Name', field: 'company_name' as const },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block font-semibold mb-1">{label}</label>
                  <input type="text" value={(candidateToEdit as any)[field] || ''} onChange={e => setCandidateToEdit({ ...candidateToEdit, [field]: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                </div>
              ))}
              <div>
                <label className="block font-semibold mb-1">Remark</label>
                <input type="text" value={candidateToEdit.remark || ''} onChange={e => setCandidateToEdit({ ...candidateToEdit, remark: e.target.value })}
                  className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Pipeline Stage</label>
                <select value={candidateToEdit.status} onChange={e => setCandidateToEdit({ ...candidateToEdit, status: e.target.value })}
                  className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 font-medium">Cancel</button>
              <button onClick={handleSaveEditModal} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Save Changes</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Create Candidate Modal ── */}
      {isCreateModalOpen && (
        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add New Candidate">
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Name *', field: 'name', placeholder: 'Full name' },
                { label: 'Phone', field: 'phone', placeholder: 'Contact number' },
                { label: 'Location', field: 'location', placeholder: 'City' },
                { label: 'Position', field: 'applied_position', placeholder: 'e.g. SO, FSA' },
                { label: 'HR Name', field: 'hr_name', placeholder: 'HR Name' },
                { label: 'Remark', field: 'remark', placeholder: 'e.g. Shortlist, NR' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block font-semibold mb-1">{label}</label>
                  <input type="text" placeholder={placeholder} value={(newCandidate as any)[field] || ''}
                    onChange={e => setNewCandidate({ ...newCandidate, [field]: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 font-medium">Cancel</button>
              <button onClick={handleCreateCandidate} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Create Candidate</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Google Sheet URL & Monthly Presets Modal ── */}
      {isSyncModalOpen && (
        <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="Google Sheet Monthly Settings">
          <div className="space-y-4 text-xs">
            <p className="text-gray-600 dark:text-gray-400">Paste your Google Sheet URL for the active month. Save each month as a preset for 1-click switching!</p>
            <div>
              <label className="block font-semibold mb-1">Active Sheet URL *</label>
              <input type="text" placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=..." value={currentSheetUrl}
                onChange={e => setCurrentSheetUrl(e.target.value)}
                className="w-full p-2.5 border rounded-xl dark:bg-gray-800 dark:border-gray-700 font-mono text-[11px] text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Preset Label (e.g. September 2026)" value={newSheetLabel}
                onChange={e => setNewSheetLabel(e.target.value)}
                className="flex-1 p-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700 text-xs" />
              <button onClick={handleAddSheetPreset} className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100">Save Preset</button>
            </div>
            {savedSheets.length > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-1.5">
                <label className="block font-semibold text-gray-700 dark:text-gray-300">Saved Monthly Sheets:</label>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {savedSheets.map((p, i) => (
                    <div key={i} className={`p-2.5 rounded-xl border flex items-center justify-between ${currentSheetUrl === p.url ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700' : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'}`}>
                      <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={() => setCurrentSheetUrl(p.url)}>
                        <p className="font-bold text-gray-900 dark:text-white">{p.label}</p>
                        <p className="text-[10px] text-gray-400 truncate">{p.url}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleSyncGoogleSheet(p.url)} disabled={syncing} className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm">Sync</button>
                        <button onClick={() => handleDeleteSheetPreset(p.url)} className="p-1 text-gray-400 hover:text-rose-600"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setIsSyncModalOpen(false)} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 font-medium text-xs">Cancel</button>
              <button onClick={() => handleSyncGoogleSheet()} disabled={syncing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Active Sheet'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
