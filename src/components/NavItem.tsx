import { LucideIcon } from "lucide-react";
import clsx from "clsx";

interface NavItemProps {
  children: React.ReactNode;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}

export function NavItem({ children, icon: Icon, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon size={18} className={active ? "text-blue-600" : "text-slate-400"} />
      {children}
    </button>
  );
}
