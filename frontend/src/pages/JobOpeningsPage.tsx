import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { JobOpening, Candidate } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Briefcase, MapPin, Layers, Filter, ChevronRight,
  Pencil, Trash2, AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';

const DEPARTMENTS = ['Tech', 'Sales', 'Marketing', 'HR', 'Operations', 'Finance'];
const EMPTY_FORM = {
  title: '',
  department: 'Tech',
  location: 'Remote',
  hiring_manager: '',
  positions_count: 1,
  status: 'Open' as 'Open' | 'Closed' | 'On Hold',
  opened_date: new Date().toISOString().split('T')[0],
};

export const JobOpeningsPage: React.FC = () => {
  const { canEdit } = useAuth();
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');

  // Detail modal
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [jobDetail, setJobDetail] = useState<{
    job: JobOpening;
    funnel: Array<{ stage: string; candidates: number }>;
    avg_tat_days: number;
    candidates: Candidate[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create / Edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobOpening | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirm modal
  const [deleteJob, setDeleteJob] = useState<JobOpening | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/job-openings', {
        params: { status: statusFilter, department: deptFilter }
      });
      setJobs(res.data);
    } catch (err) {
      console.error('Failed to fetch job openings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, [statusFilter, deptFilter]);

  const openJobDetail = async (id: number) => {
    setSelectedJobId(id);
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/job-openings/${id}`);
      setJobDetail(res.data);
    } catch (err) {
      console.error('Failed to fetch job detail', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreate = () => {
    setEditingJob(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (job: JobOpening, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingJob(job);
    setForm({
      title: job.title,
      department: job.department,
      location: job.location,
      hiring_manager: job.hiring_manager,
      positions_count: job.positions_count,
      status: job.status as 'Open' | 'Closed' | 'On Hold',
      opened_date: job.opened_date,
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingJob) {
        await apiClient.put(`/job-openings/${editingJob.id}`, form);
      } else {
        await apiClient.post('/job-openings', form);
      }
      setFormOpen(false);
      setEditingJob(null);
      setForm(EMPTY_FORM);
      fetchJobs();
    } catch (err) {
      console.error('Failed to save job', err);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (job: JobOpening, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteJob(job);
  };

  const handleDelete = async () => {
    if (!deleteJob) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/job-openings/${deleteJob.id}`);
      setDeleteJob(null);
      fetchJobs();
    } catch (err) {
      console.error('Failed to delete job', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open': return <Badge variant="open">Open</Badge>;
      case 'Closed': return <Badge variant="closed">Closed</Badge>;
      case 'On Hold': return <Badge variant="on-hold">On Hold</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  const inputCls = "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="p-6 space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status:</span>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-1.5 font-medium text-gray-900 dark:text-white focus:outline-none">
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Dept:</span>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-1.5 font-medium text-gray-900 dark:text-white focus:outline-none">
              <option value="All">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all">
            <Plus className="w-4 h-4" />
            <span>Create Job Opening</span>
          </button>
        )}
      </div>

      {/* Jobs Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading job openings...</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">No job openings found matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Job Title</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Hiring Manager</th>
                  <th className="py-3.5 px-4 text-center">Positions</th>
                  <th className="py-3.5 px-4 text-center">Applicants</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                {jobs.map((job) => (
                  <tr key={job.id} onClick={() => openJobDetail(job.id)} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer">
                    <td className="py-4 px-5 font-bold text-gray-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400 flex items-center justify-center">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{job.title}</span>
                          <p className="text-[10px] text-gray-400 font-normal">Opened {job.opened_date}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">{job.department}</td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" />{job.location}</span>
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-300">{job.hiring_manager}</td>
                    <td className="py-4 px-4 text-center font-bold text-gray-900 dark:text-white">{job.hired_count || 0} / {job.positions_count}</td>
                    <td className="py-4 px-4 text-center font-extrabold text-indigo-600 dark:text-indigo-400">{job.candidates_count || 0}</td>
                    <td className="py-4 px-4 text-center">{getStatusBadge(job.status)}</td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.stopPropagation(); openJobDetail(job.id); }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2 py-1.5 rounded-lg transition-colors"
                          title="View Analytics"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={e => openEdit(job, e)}
                              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={e => confirmDelete(job, e)}
                              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Analytics Detail Modal */}
      {selectedJobId && (
        <Modal isOpen={!!selectedJobId} onClose={() => { setSelectedJobId(null); setJobDetail(null); }} title={jobDetail?.job.title || 'Job Opening Analytics'} maxWidth="4xl">
          {detailLoading || !jobDetail ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading role breakdown...</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Department & Location</span>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{jobDetail.job.department} • {jobDetail.job.location}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Hiring Manager</span>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{jobDetail.job.hiring_manager}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Role Specific Time-to-Hire</span>
                  <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{jobDetail.avg_tat_days} Days Avg TAT</p>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" /> Candidate Funnel for this Position
                </h4>
                <div className="h-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jobDetail.funnel}>
                      <XAxis dataKey="stage" stroke="#9ca3af" fontSize={10} />
                      <YAxis stroke="#9ca3af" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                      <Bar dataKey="candidates" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-3">Applied Candidates ({jobDetail.candidates.length})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {jobDetail.candidates.map((cand) => (
                    <div key={cand.id} className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{cand.name}</p>
                        <p className="text-[10px] text-gray-400">{cand.email} • Source: {cand.source?.name || 'Direct'}</p>
                      </div>
                      <Badge variant={cand.status.toLowerCase().includes('interview') ? 'interview' : (cand.status === 'Joined' ? 'joined' : 'default')}>
                        {cand.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={formOpen} onClose={() => { setFormOpen(false); setEditingJob(null); }} title={editingJob ? 'Edit Job Opening' : 'Create New Job Opening'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input type="text" required placeholder="e.g. Senior Backend Engineer" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Department</label>
              <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className={inputCls}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <input type="text" required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Hiring Manager</label>
              <input type="text" required placeholder="Manager Name" value={form.hiring_manager} onChange={e => setForm({ ...form, hiring_manager: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Positions Count</label>
              <input type="number" min="1" required value={form.positions_count} onChange={e => setForm({ ...form, positions_count: parseInt(e.target.value) })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'Open' | 'Closed' | 'On Hold' })} className={inputCls}>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Opened Date</label>
              <input type="date" required value={form.opened_date} onChange={e => setForm({ ...form, opened_date: e.target.value })} className={inputCls} />
            </div>
          </div>
          <button type="submit" disabled={formLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-xs shadow-md mt-2 transition-all">
            {formLoading ? 'Saving...' : (editingJob ? 'Update Position' : 'Create Position')}
          </button>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteJob} onClose={() => setDeleteJob(null)} title="Delete Job Opening">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Are you sure?</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                You are about to delete <span className="font-bold text-red-600 dark:text-red-400">"{deleteJob?.title}"</span>. This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteJob(null)} className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={deleteLoading} className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white shadow-md transition-all">
              {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
