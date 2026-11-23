import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../api/client';
import type { ReportData } from '../types';
import { 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  Filter, 
  PieChart as PieIcon, 
  Clock, 
  DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

export const ReportsPage: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Date filters (default last 90 days)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('All');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/reports', {
        params: { start_date: startDate, end_date: endDate, department }
      });
      setReport(res.data);
    } catch (err) {
      console.error('Failed to fetch report analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, department]);

  const exportCSV = () => {
    if (!report) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'HR RECRUITMENT ANALYTICS REPORT\n';
    csvContent += `Period: ${startDate} to ${endDate}\n`;
    csvContent += `Department: ${department}\n\n`;

    // Department TAT
    csvContent += 'Time to Hire by Department\nDepartment,Avg TAT (Days),Hires Count\n';
    report.time_to_hire_by_department.forEach(d => {
      csvContent += `"${d.department}",${d.avg_tat_days},${d.hires_count}\n`;
    });

    // Source ROI
    csvContent += '\nSource Effectiveness & ROI\nSource,Candidates,Hires,Conversion %,Cost Per Hire,Total Spend\n';
    report.source_effectiveness.forEach(s => {
      csvContent += `"${s.source}",${s.candidates_count},${s.hired_count},${s.conversion_rate}%,₹${s.cost_per_hire},₹${s.total_spend}\n`;
    });

    // Rejection Reasons
    csvContent += '\nRejection Reason Breakdown\nReason,Count,Percentage\n';
    report.rejection_reasons.forEach(r => {
      csvContent += `"${r.reason}",${r.count},${r.percentage}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HR_Recruitment_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setIsExportingPdf(true);
    try {
      const element = reportRef.current;
      const dataUrl = await toPng(element, {
        quality: 0.95,
        cacheBust: true,
        backgroundColor: '#0f172a',
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (img.height * pdfWidth) / img.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Render first page
      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfPageHeight;

      // Render subsequent pages if content exceeds 1 page
      while (heightLeft > 0) {
        position -= pdfPageHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfPageHeight;
      }

      pdf.save(`HR_Recruitment_Analytics_Report_${startDate}_to_${endDate}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  return (
    <div className="p-6 space-y-6">
      {/* Controls & Filter Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Dept:</span>
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-3 py-1.5 font-medium text-gray-900 dark:text-white"
            >
              <option value="All">All Departments</option>
              <option value="Tech">Tech</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
              <option value="HR">HR</option>
              <option value="Operations">Operations</option>
              <option value="Finance">Finance</option>
            </select>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportPDF}
            disabled={isExportingPdf || loading}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>{isExportingPdf ? 'Generating PDF...' : 'Export PDF Report'}</span>
          </button>
        </div>
      </div>

      {/* Printable Report Canvas Container */}
      <div ref={reportRef} className="space-y-6 bg-slate-50/50 dark:bg-gray-950/40 rounded-2xl p-4">
        {loading || !report ? (
          <div className="p-12 text-center text-xs text-gray-400">Loading custom report...</div>
        ) : (
          <>
            {/* Header Title inside PDF */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">HR Recruitment Executive Analytics Report</h2>
                <p className="text-xs text-gray-500">Period: {startDate} to {endDate} | Department: {department}</p>
              </div>
              <span className="text-[10px] font-bold px-3 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
                Verified HR Report
              </span>
            </div>

            {/* Top Stat Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-semibold">Total Sourced</p>
                <h4 className="text-xl font-black text-gray-900 dark:text-white mt-1">
                  {report.source_effectiveness.reduce((acc, curr) => acc + curr.candidates_count, 0)}
                </h4>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-semibold">Total Hires</p>
                <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {report.source_effectiveness.reduce((acc, curr) => acc + curr.hired_count, 0)}
                </h4>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-semibold">Total Channel Spend</p>
                <h4 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  ₹{report.source_effectiveness.reduce((acc, curr) => acc + curr.total_spend, 0).toLocaleString()}
                </h4>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-semibold">Avg Cost / Hire</p>
                <h4 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  ₹{Math.round(
                    report.source_effectiveness.reduce((acc, curr) => acc + curr.cost_per_hire, 0) / (report.source_effectiveness.length || 1)
                  ).toLocaleString()}
                </h4>
              </div>
            </div>

            {/* Section 1: Department TAT */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Time-to-Hire (TAT) & Velocity by Department
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.time_to_hire_by_department}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} />
                    <XAxis dataKey="department" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af', fontSize: '11px' } }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="avg_tat_days" name="Avg TAT (Days)" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Section 2: Sourcing Channel Effectiveness */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Sourcing Channel Effectiveness & Spend Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-400 uppercase">
                      <th className="pb-3">Source Channel</th>
                      <th className="pb-3 text-center">Candidates Sourced</th>
                      <th className="pb-3 text-center">Hires Converted</th>
                      <th className="pb-3 text-center">Conversion Rate</th>
                      <th className="pb-3 text-right">Cost per Hire</th>
                      <th className="pb-3 text-right">Total Channel Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                    {report.source_effectiveness.map(src => (
                      <tr key={src.source} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                        <td className="py-3 font-bold text-gray-900 dark:text-white">{src.source}</td>
                        <td className="py-3 text-center text-gray-600 dark:text-gray-400">{src.candidates_count}</td>
                        <td className="py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{src.hired_count}</td>
                        <td className="py-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {src.conversion_rate}%
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono text-gray-700 dark:text-gray-300">₹{src.cost_per_hire}</td>
                        <td className="py-3 text-right font-mono font-bold text-gray-900 dark:text-white">₹{src.total_spend.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Rejection Reasons Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-amber-500" />
                  Candidate Rejection & Drop-off Causes
                </h3>
                <div className="h-64 flex justify-center items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={report.rejection_reasons}
                        dataKey="count"
                        nameKey="reason"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry: PieLabelRenderProps) => `${String(entry.name ?? '')} (${((Number(entry.percent ?? 0)) * 100).toFixed(1)}%)`}
                      >
                        {report.rejection_reasons.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-amber-500" />
                  Reason Distribution Summary
                </h3>
                <div className="space-y-3 pt-2">
                  {report.rejection_reasons.map((r, i) => (
                    <div key={r.reason} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{r.reason}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">{r.count} candidates</span>
                        <span className="font-bold text-gray-900 dark:text-white">{r.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
