import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  gradient: string;
  trend?: string;
}

export function StatCard({ title, value, icon: Icon, gradient, trend }: StatCardProps) {
  return (
    <div className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 overflow-hidden">
      {/* Gradient Background Effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <span className="text-xs">{trend}</span>
            </div>
          )}
        </div>

        <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{value}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      </div>
    </div>
  );
}
