import { CheckCircle, XCircle } from 'lucide-react';
import clsx from 'clsx';

interface StatusBadgeProps {
  label: string;
  ok: boolean;
}

export function StatusBadge({ label, ok }: StatusBadgeProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center p-2 rounded border',
        ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'
      )}
    >
      <span className="text-xs text-gray-400 mb-1">{label}</span>
      {ok ? <CheckCircle size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-rose-400" />}
    </div>
  );
}
