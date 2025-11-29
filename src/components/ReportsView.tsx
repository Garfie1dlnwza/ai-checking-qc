import clsx from "clsx";
import { ClipboardList, Clock, FileText } from "lucide-react";
import { QCResult, Technician } from "@/types/qc";

interface ReportsViewProps {
  history: QCResult[];
  technicians: Technician[];
  generatePDF: (record: QCResult) => void;
}

export function ReportsView({ history, technicians, generatePDF }: ReportsViewProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <ClipboardList size={16} /> Full History
        </h3>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-white text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
          <tr>
            <th className="p-4">Time</th>
            <th className="p-4">Result</th>
            <th className="p-4">Sensor Data</th>
            <th className="p-4">Inspector</th>
            <th className="p-4 text-right">Doc</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {history.map((h) => (
            <tr key={h.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 text-slate-600 flex items-center gap-2">
                <Clock size={14} className="text-slate-300" />
                {new Date(h.timestamp).toLocaleString()}
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <span className={clsx("px-2 py-1 rounded text-xs font-bold", h.status === "PASS" ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50")}>
                    {h.status}
                  </span>
                  <span
                    className={clsx(
                      "px-2 py-0.5 rounded-full text-[11px] font-bold border",
                      h.inspectionType === "MACHINE_CHECK"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    )}
                  >
                    {h.inspectionType === "MACHINE_CHECK"
                      ? "ตรวจสอบเครื่องจักร"
                      : "QC Product"}
                  </span>
                </div>
              </td>
              <td className="p-4 text-xs font-mono text-slate-500">
                {h.inspectionType === "MACHINE_CHECK"
                  ? `${h.temperature}°C | ${h.noise_level}dB`
                  : "N/A"}
              </td>
              <td className="p-4 text-xs text-slate-600">
                {technicians.find((t) => t.id === h.inspectorId)?.name || "System"}
              </td>
              <td className="p-4 text-right">
                <button onClick={() => generatePDF(h)} className="text-slate-400 hover:text-blue-600">
                  <FileText size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
