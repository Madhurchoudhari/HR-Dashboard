import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'indigo',
}) => {
  const getColorStyles = (color: string) => {
    switch (color) {
      case 'emerald': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400';
      case 'amber': return 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400';
      case 'blue': return 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400';
      case 'purple': return 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400';
      default: return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wide uppercase">
            {title}
          </p>
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1.5 tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-xl ${getColorStyles(accentColor)}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/80">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {subtitle || 'Updated today'}
        </span>
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs font-bold ${trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {trend.isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};
