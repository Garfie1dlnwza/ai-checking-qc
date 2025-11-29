
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  Thermometer,
  XCircle,
  TrendingUp,
  BrainCircuit,
  BookOpen,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
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
  // --- TREND WATCHDOG LOGIC (Simulation) ---
  // ในงานจริง: ส่ง chartDataTemp 10 จุดล่าสุดไปให้ Gemini วิเคราะห์ Trend
  const lastTemp =
    chartDataTemp.length > 0
      ? chartDataTemp[chartDataTemp.length - 1].temp
      : 45;
  const lastNoise =
    chartDataTemp.length > 0
      ? chartDataTemp[chartDataTemp.length - 1].noise
      : 60;
  const isTrendRising =
    chartDataTemp.length > 3 &&
    chartDataTemp[chartDataTemp.length - 1].temp >
      chartDataTemp[chartDataTemp.length - 3].temp;

  const watchdogStatus = isTrendRising ? "Warning" : "Stable";
  const watchdogMessage = isTrendRising
    ? `⚠️ Trend Alert: Temperature rising rate +2°C/min. Predicted to breach 80°C limit in ~15 mins if load constant.`
    : `✅ System Stable: Variance within acceptable range (±1.5%). No immediate anomalies predicted.`;

  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const rejectRate = total > 0 ? Math.round((rejected / total) * 100) : 0;
  const peakTemp =
    chartDataTemp.length > 0
      ? Math.max(...chartDataTemp.map((d) => d.temp))
      : lastTemp;
  const avgNoise =
    chartDataTemp.length > 0
      ? Math.round(
          chartDataTemp.reduce((acc, d) => acc + (d.noise || 0), 0) /
            chartDataTemp.length
        )
      : lastNoise;

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* 🚀 TREND WATCHDOG CARD (AI PREDICTION) */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <BrainCircuit size={100} />
        </div>

        <div className="flex items-start gap-4 relative z-10">
          <div
            className={`p-3 rounded-lg ${
              isTrendRising
                ? "bg-amber-500/20 text-amber-400"
                : "bg-emerald-500/20 text-emerald-400"
            }`}
          >
            <TrendingUp size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                AI Trend Watchdog (Last 10 mins)
              </h3>
              <span
                className={`px-3 py-1 text-[11px] rounded-full border font-bold ${
                  watchdogStatus === "Warning"
                    ? "bg-amber-500/20 text-amber-200 border-amber-400/60"
                    : "bg-emerald-500/20 text-emerald-200 border-emerald-400/60"
                }`}
              >
                {watchdogStatus}
              </span>
            </div>
            <div className="text-lg font-medium leading-relaxed">
              {watchdogMessage}
            </div>
            {isTrendRising && (
              <div className="mt-3 inline-block bg-amber-500/20 border border-amber-500/50 rounded px-3 py-1 text-xs text-amber-300">
                Suggested Action: Check cooling fan RPM on Conveyor 4
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SNAPSHOT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 via-white to-white border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-blue-700 uppercase mb-2">
            Quality Mix
            <span className="text-blue-500">{passRate}% Yield</span>
          </div>
          <div className="flex items-end gap-3">
            <div className="text-4xl font-extrabold text-slate-900">
              {passRate}%
            </div>
            <div className="text-xs text-slate-500 leading-tight">
              Pass Rate vs Reject {rejectRate}%
              <br />
              Last Temp: {lastTemp}°C • Noise: {lastNoise}dB
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-white to-white border border-amber-100 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-amber-700 mb-2">
            <Thermometer size={14} /> Peak Heat Window
          </div>
          <div className="text-3xl font-bold text-amber-700">{peakTemp}°C</div>
          <div className="text-xs text-amber-800/80 mt-1">
            Highest temp in last scans • Avg noise {avgNoise}dB
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-white border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-700 mb-2">
            <BookOpen size={14} /> Playbook
          </div>
          <ul className="text-xs text-emerald-800 space-y-1">
            <li>• Keep belt load steady for next 10 mins</li>
            <li>• If temp &gt; 80°C trigger coolant check</li>
            <li>• If &gt;2 rejects in 5 mins, switch to AI audit</li>
          </ul>
        </div>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-4 gap-6">
        <MetricCard label="Total Scans" value={total} icon={Camera} />
        <MetricCard
          label="Passed"
          value={passed}
          icon={CheckCircle}
          color="text-green-600"
        />
        <MetricCard
          label="Rejected"
          value={rejected}
          icon={XCircle}
          color="text-red-600"
        />
        <MetricCard
          label="Active Alerts"
          value={openIssues}
          icon={AlertTriangle}
          color="text-orange-500"
        />
      </div>

      {/* GRAPHS */}
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
                  <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                  <Line type="monotone" dataKey="temp" stroke="#ef4444" strokeWidth={2} dot={false} name="Temp (°C)" />
                  <Line type="monotone" dataKey="noise" stroke="#f59e0b" strokeWidth={2} dot={false} name="Noise (dB)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No data recorded yet
              </div>
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
                    {chartDataDefects.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No defects detected yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
