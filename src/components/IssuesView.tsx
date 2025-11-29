import clsx from "clsx";
import { AlertTriangle, FileText } from "lucide-react";
import { QCResult, Technician } from "@/types/qc";

interface IssuesViewProps {
  history: QCResult[];
  technicians: Technician[];
  handleAssignTech: (id: string, techId: string) => void;
  handleResolveIssue: (id: string) => void;
  generatePDF: (record: QCResult) => void;
}

export function IssuesView({
  history,
  technicians,
  handleAssignTech,
  handleResolveIssue,
  generatePDF,
}: IssuesViewProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <AlertTriangle size={16} /> Incident Logs
        </h3>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-white text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
          <tr>
            <th className="p-4">ID</th>
            <th className="p-4">Timestamp</th>
            <th className="p-4">Sensors</th>
            <th className="p-4">Defect</th>
            <th className="p-4">Assigned To</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {history
            .filter((h) => h.status === "REJECT")
            .map((h) => (
              <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-mono text-slate-600 font-bold">{h.id}</td>
                <td className="p-4 text-slate-600">{new Date(h.timestamp).toLocaleTimeString()}</td>
                <td className="p-4 text-xs font-mono">
                  {h.inspectionType === "MACHINE_CHECK" ? (
                    <>
                      <div className={h.temperature > 80 ? "text-red-600 font-bold" : "text-slate-500"}>T: {h.temperature}°C</div>
                      <div className={h.noise_level > 90 ? "text-orange-600 font-bold" : "text-slate-500"}>
                        N: {h.noise_level}dB
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400">N/A</div>
                  )}
                </td>
                <td className="p-4 font-medium text-slate-900">
                  <div>{h.defects[0]}</div>
                  <span
                    className={clsx(
                      "inline-flex mt-1 text-[10px] px-2 py-0.5 rounded-full border font-bold",
                      h.inspectionType === "MACHINE_CHECK"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    )}
                  >
                    {h.inspectionType === "MACHINE_CHECK"
                      ? "ตรวจสอบเครื่องจักร"
                      : "QC Product"}
                  </span>
                </td>
                <td className="p-4">
                  {h.ticketStatus === "RESOLVED" ? (
                    <span className="text-slate-500 text-xs">{technicians.find((t) => t.id === h.inspectorId)?.name}</span>
                  ) : (
                    <select
                      value={h.inspectorId}
                      onChange={(e) => handleAssignTech(h.id, e.target.value)}
                      className="bg-white border border-slate-300 text-xs rounded px-2 py-1 focus:border-blue-500"
                    >
                      <option value="AUTO-CCTV">Auto</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="p-4">
                  <span
                    className={clsx(
                      "px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit",
                      h.ticketStatus === "OPEN"
                        ? "bg-red-50 text-red-600 border border-red-100"
                        : "bg-green-50 text-green-600 border border-green-100"
                    )}
                  >
                    {h.ticketStatus}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {h.ticketStatus === "OPEN" && (
                    <button onClick={() => handleResolveIssue(h.id)} className="text-blue-600 text-xs font-medium hover:underline">
                      Resolve
                    </button>
                  )}
                  {h.ticketStatus !== "OPEN" && (
                    <button onClick={() => generatePDF(h)} className="text-slate-400 hover:text-blue-600">
                      <FileText size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
