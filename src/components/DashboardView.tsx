import { AlertTriangle, Camera, CheckCircle, Thermometer, XCircle } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { MetricCard } from "./MetricCard";

interface DashboardViewProps {
  total: number;
  passed: number;
  rejected: number;
  openIssues: number;
  chartDataTemp: any[];
  chartDataDefects: any[];
  COLORS: string[];
}

export function DashboardView({
  total,
  passed,
  rejected,
  openIssues,
  chartDataTemp,
  chartDataDefects,
  COLORS,
}: DashboardViewProps) {
  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <div className="grid grid-cols-4 gap-6">
        <MetricCard label="Total Scans" value={total} icon={Camera} />
        <MetricCard label="Passed" value={passed} icon={CheckCircle} color="text-green-600" />
        <MetricCard label="Rejected" value={rejected} icon={XCircle} color="text-red-600" />
        <MetricCard label="Active Alerts" value={openIssues} icon={AlertTriangle} color="text-orange-500" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Thermometer size={18} className="text-blue-500" /> Temperature & Noise Trend
          </h3>
          <div className="h-[300px]">
            {chartDataTemp.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDataTemp}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                    itemStyle={{ fontSize: "12px" }}
                  />
                  <Line type="monotone" dataKey="temp" stroke="#ef4444" strokeWidth={2} dot={false} name="Temp (°C)" />
                  <Line type="monotone" dataKey="noise" stroke="#f59e0b" strokeWidth={2} dot={false} name="Noise (dB)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data recorded yet</div>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" /> Defect Types Breakdown
          </h3>
          <div className="h-[300px]">
            {chartDataDefects.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartDataDefects} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {chartDataDefects.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No defects detected yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
