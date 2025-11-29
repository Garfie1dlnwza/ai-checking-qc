import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  color = "text-slate-700",
}: MetricCardProps) {
  return (
    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-start justify-between">
      <div>
        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
          {label}
        </div>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
      </div>
      <div className={`p-2 rounded-lg bg-slate-50 ${color}`}>
        <Icon size={20} />
      </div>
    </div>
  );
}
