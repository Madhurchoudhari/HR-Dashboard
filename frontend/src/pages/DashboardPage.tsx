import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { DashboardData } from '../types';
import { StatCard } from '../components/common/StatCard';
import { CardSkeleton } from '../components/common/Skeleton';
import { FollowUpWidget } from '../components/candidates/FollowUpWidget';
import { 
  Briefcase, 
  Users, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Award,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Error fetching dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 h-80 rounded-xl p-6 border border-gray-200 dark:border-gray-800 animate-pulse" />
          <div className="bg-white dark:bg-gray-900 h-80 rounded-xl p-6 border border-gray-200 dark:border-gray-800 animate-pulse" />
        </div>
      </div>
    );
  }

  const { kpis, funnel, hires_trend, source_comparison, recruiter_leaderboard } = data;

  const funnelColors = ['#6366f1', '#4f46e5', '#3b82f6', '#0284c7', '#06b6d4', '#10b981', '#059669'];

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Open Positions"
          value={kpis.total_open_positions}
          subtitle="Across 6 Departments"
          icon={Briefcase}
          trend={{ value: '+12%', isPositive: true }}
          accentColor="indigo"
        />
        <StatCard
          title="Active Candidates"
          value={kpis.total_active_candidates}
          subtitle="In Active Pipeline"
          icon={Users}
          trend={{ value: '+8%', isPositive: true }}
          accentColor="blue"
        />
        <StatCard
          title="Avg Time-to-Hire"
          value={`${kpis.avg_tat_days} Days`}
          subtitle="Application to Joined"
          icon={Clock}
          trend={{ value: '-3.2 Days', isPositive: true }}
          accentColor="emerald"
        />
        <StatCard
          title="Offer Acceptance Rate"
          value={`${kpis.offer_acceptance_rate}%`}
          subtitle="Offers Converted"
          icon={CheckCircle2}
          trend={{ value: '+4.5%', isPositive: true }}
          accentColor="purple"
        />
      </div>

      {/* Main Analytics Section: Funnel & Monthly Hires */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pipeline Funnel */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Recruitment Pipeline Funnel & Stage Drop-Off
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Conversion and drop-off rate between pipeline stages
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Live Stage History
            </span>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" opacity={0.15} />
                <XAxis type="number" stroke="#9ca3af" fontSize={11} />
                <YAxis dataKey="stage" type="category" stroke="#9ca3af" fontSize={11} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any, _name: any, item: any) => [
                    `${val} candidates (${item.payload.drop_off_pct}% drop-off)`,
                    'Volume'
                  ]}
                />
                <Bar dataKey="candidates" radius={[0, 8, 8, 0]}>
                  {funnel.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={funnelColors[index % funnelColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Hires Line Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Monthly Hires Trend
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Successfully joined candidates (Last 6 Months)
              </p>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hires_trend} margin={{ top: 15, right: 20, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="hires"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Source Comparison Bar Chart & Recruiter Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Source Volume vs Conversion */}
        <div className="lg:col-span-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Source Volume vs. Conversion Rate
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Candidate volume paired with hire conversion percentage
              </p>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={source_comparison} margin={{ top: 15, right: 20, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} />
                <XAxis dataKey="source" stroke="#9ca3af" fontSize={11} />
                <YAxis yAxisId="left" stroke="#6366f1" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="volume" name="Candidate Volume" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="conversion_rate" name="Conversion Rate (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recruiter Leaderboard Table */}
        <div className="lg:col-span-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Recruiter Performance Leaderboard
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Positions closed, TAT efficiency, and active candidate load
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="pb-3">Recruiter</th>
                    <th className="pb-3 text-center">Positions Closed</th>
                    <th className="pb-3 text-center">Avg TAT</th>
                    <th className="pb-3 text-right">In Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                  {recruiter_leaderboard.map((rec, idx) => (
                    <tr key={rec.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-3 font-semibold text-gray-900 dark:text-white flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <span>{rec.name}</span>
                          <p className="text-[10px] text-gray-400 font-normal">{rec.department}</p>
                        </div>
                      </td>
                      <td className="py-3 text-center font-extrabold text-indigo-600 dark:text-indigo-400">
                        {rec.positions_closed} Hires
                      </td>
                      <td className="py-3 text-center text-gray-600 dark:text-gray-300">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-semibold text-[11px]">
                          {rec.avg_tat_days} days
                        </span>
                      </td>
                      <td className="py-3 text-right font-medium text-gray-600 dark:text-gray-400">
                        {rec.pipeline_count} Candidates
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Follow-up Reminder Widget */}
          <FollowUpWidget />
        </div>
      </div>
    </div>
  );
};
