import { AlertTriangle, Camera, CheckCircle, Thermometer, XCircle, TrendingUp, BrainCircuit, BookOpen } from "lucide-react";
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
  
  // --- TREND WATCHDOG LOGIC (Simulation) ---
  // ในงานจริง: ส่ง chartDataTemp 10 จุดล่าสุดไปให้ Gemini วิเคราะห์ Trend
  const lastTemp = chartDataTemp.length > 0 ? chartDataTemp[chartDataTemp.length - 1].temp : 45;
  const isTrendRising = chartDataTemp.length > 3 && chartDataTemp[chartDataTemp.length-1].temp > chartDataTemp[chartDataTemp.length-3].temp;
  
  const watchdogStatus = isTrendRising ? "Warning" : "Stable";
  const watchdogMessage = isTrendRising 
    ? `⚠️ Trend Alert: Temperature rising rate +2°C/min. Predicted to breach 80°C limit in ~15 mins if load constant.`
    : `✅ System Stable: Variance within acceptable range (±1.5%). No immediate anomalies predicted.`;

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      
      {/* 🚀 TREND WATCHDOG CARD (AI PREDICTION) */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><BrainCircuit size={100} /></div>
        
        <div className="flex items-start gap-4 relative z-10">
           <div className={`p-3 rounded-lg ${isTrendRising ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <TrendingUp size={24} />
           </div>
           <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">AI Trend Watchdog (Last 10 mins)</h3>
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

      {/* METRICS */}
      <div className="grid grid-cols-4 gap-6">
        <MetricCard label="Total Scans" value={total} icon={Camera} />
        <MetricCard label="Passed" value={passed} icon={CheckCircle} color="text-green-600" />
        <MetricCard label="Rejected" value={rejected} icon={XCircle} color="text-red-600" />
        <MetricCard label="Active Alerts" value={openIssues} icon={AlertTriangle} color="text-orange-500" />
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
            ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data recorded yet</div>}
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
            ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm">No defects detected yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}