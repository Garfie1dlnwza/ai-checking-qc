"use client";

import { useState, useRef, useEffect } from "react";
import { analyzeImage, askSpectraAI } from "./actions"; // <--- เพิ่ม askSpectraAI
import { QCReportDocument } from "./ReportDocument";
import { pdf } from "@react-pdf/renderer";
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Camera,
  RefreshCw,
  LayoutDashboard,
  ClipboardList,
  Bell,
  FileText,
  UserPlus,
  Clock,
  Search,
  Thermometer,
  Volume2,
  Flame,
  Upload,
  MessageSquare,
  Send,
  X,
  Bot,
} from "lucide-react";
import { clsx } from "clsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// --- DATA MODELS ---

const MOCK_TECHNICIANS = [
  { id: "T01", name: "Somchai Engineering", role: "Senior QC", avatar: "SE" },
  { id: "T02", name: "Wipa Tech", role: "Line Inspector", avatar: "WT" },
  { id: "T03", name: "Kenji Systems", role: "System Admin", avatar: "KS" },
];

interface QCResult {
  id: string;
  timestamp: string;
  inspectorId: string;
  ticketStatus: "OPEN" | "RESOLVED" | "ARCHIVED";
  status: "PASS" | "REJECT";
  confidence: number;
  defects: string[];
  reasoning: string;
  temperature: number;
  noise_level: number;
  severity: "LOW" | "MEDIUM" | "HIGH";
  qc_list: {
    visual_qc: { issues: string[]; ok: boolean };
    machine_panel_qc: { issues: string[]; ok: boolean };
    process_qc: { issues: string[]; ok: boolean };
  };
  pain_points: string[];
  solution: {
    summary: string;
    recommended_actions: string[];
  };
}

export default function SpectraManageQC() {
  const [currentView, setCurrentView] = useState<
    "dashboard" | "monitor" | "issues" | "reports"
  >("monitor");
  const [history, setHistory] = useState<QCResult[]>([]);
  const [notifications, setNotifications] = useState<number>(0);
  const [thermalMode, setThermalMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [latestResult, setLatestResult] = useState<QCResult | null>(null);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [productType] = useState("Electronic PCB");
  const [liveTemp, setLiveTemp] = useState(45);
  const [liveNoise, setLiveNoise] = useState(60);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CHAT STATE (WOW Feature) ---
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([
    {
      role: "ai",
      text: "สวัสดีครับ ผมคือ Spectra Copilot 🤖 ถามข้อมูลเกี่ยวกับไลน์ผลิตวันนี้ได้เลยครับ",
    },
  ]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Metrics
  const total = history.length;
  const passed = history.filter((h) => h.status === "PASS").length;
  const rejected = total - passed;
  const openIssues = history.filter(
    (h) => h.status === "REJECT" && h.ticketStatus === "OPEN"
  ).length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0.0";

  // Chart Data Preparation
  const chartDataTemp = history
    .slice(0, 10)
    .reverse()
    .map((h) => ({
      time: new Date(h.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      temp: h.temperature,
      noise: h.noise_level,
    }));
  const defectCounts = history.reduce((acc, curr) => {
    if (curr.status === "REJECT" && curr.defects.length > 0) {
      const defect = curr.defects[0];
      acc[defect] = (acc[defect] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const chartDataDefects = Object.keys(defectCounts).map((key) => ({
    name: key,
    value: defectCounts[key],
  }));
  const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];

  // Effects
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTemp((prev) => Math.floor(prev + (Math.random() * 2 - 1)));
      setLiveNoise((prev) => Math.floor(prev + (Math.random() * 4 - 2)));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Scroll Chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatOpen]);

  // --- ACTIONS ---

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userQuestion = chatInput;
    setChatInput(""); // Clear input
    setChatMessages((prev) => [...prev, { role: "user", text: userQuestion }]);
    setChatLoading(true);

    // Prepare Context Data for AI
    const contextData = {
      total,
      passed,
      rejected,
      passRate,
      recentLogs: history.slice(0, 5).map((h) => ({
        time: new Date(h.timestamp).toLocaleTimeString(),
        status: h.status,
        defect: h.defects[0] || "None",
        reason: h.reasoning,
      })),
      technicians: MOCK_TECHNICIANS.map((t) => t.name),
    };

    // Call Server Action
    const response = await askSpectraAI(userQuestion, contextData);

    setChatLoading(false);
    if (response.success && response.answer) {
      setChatMessages((prev) => [
        ...prev,
        { role: "ai", text: response.answer },
      ]);
    } else {
      setChatMessages((prev) => [
        ...prev,
        { role: "ai", text: "ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อครับ" },
      ]);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  // ...existing code...

  const processImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const frameUrl = URL.createObjectURL(file);
    setCapturedFrame(frameUrl);
    setLoading(true);

    // Simulate Sensor Spike
    const mockSensorTemp = Math.floor(Math.random() * (95 - 40) + 40);
    const mockSensorNoise = Math.floor(Math.random() * (100 - 60) + 60);

    setLiveTemp(mockSensorTemp);
    setLiveNoise(mockSensorNoise);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("productType", productType);

    const response = await analyzeImage(formData);

    if (response.success && response.data) {
      let finalStatus = response.data.status;
      let extraReasons: string[] = [];
      let sensorAlerts: string[] = [];

      // ตรวจสอบ Sensor และสร้างข้อความแจ้งเตือน
      if (mockSensorTemp > 80) {
        finalStatus = "REJECT";
        const msg = `อุณหภูมิสูงผิดปกติ (${mockSensorTemp}°C)`;
        extraReasons.push(msg);
        sensorAlerts.push(`⚠️ SYSTEM ALERT: ${msg}`);
      }
      if (mockSensorNoise > 90) {
        finalStatus = "REJECT";
        const msg = `เสียงดังผิดปกติ (${mockSensorNoise}dB)`;
        extraReasons.push(msg);
        sensorAlerts.push(`⚠️ SYSTEM ALERT: ${msg}`);
      }

      // รวมเหตุผลจาก AI และ Sensor ให้สอดคล้องกับสถานะ
      let finalReasoning = response.data.reasoning;
      if (sensorAlerts.length > 0) {
        finalReasoning = `${sensorAlerts.join(" ")}\n${
          response.data.reasoning
        }`;
      }

      const combinedDefects = [...response.data.defects, ...extraReasons];

      const newRecord: QCResult = {
        ...response.data,
        status: finalStatus as "PASS" | "REJECT",
        defects: combinedDefects,
        reasoning: finalReasoning,
        id: `LOG-${Math.floor(Math.random() * 10000)}`,
        inspectorId: "AUTO-CCTV",
        ticketStatus: finalStatus === "REJECT" ? "OPEN" : "ARCHIVED",
        temperature: mockSensorTemp,
        noise_level: mockSensorNoise,
      };

      setLatestResult(newRecord);
      setHistory((prev) => [newRecord, ...prev]);
      if (newRecord.status === "REJECT") {
        setNotifications((prev) => prev + 1);
      }
    }
    setLoading(false);
  };
  // ...existing code...
  const generatePDF = async (record: QCResult) => {
    const tech = MOCK_TECHNICIANS.find((t) => t.id === record.inspectorId);
    const inspectorName = tech
      ? tech.name
      : record.inspectorId === "AUTO-CCTV"
      ? "AI AUTO-AGENT"
      : "Unknown";
    const blob = await pdf(
      <QCReportDocument
        data={record}
        meta={{
          project: "Spectra IoT Node 04",
          location: "Line 4",
          activity: "Auto Inspection",
          materials: productType,
          laborHours: "0",
          equipment: `Cam + Temp Sensor (${record.temperature}°C)`,
          accidents: "N/A",
          inspector: inspectorName,
        }}
        imageSrc={capturedFrame}
      />
    ).toBlob();
    window.open(URL.createObjectURL(blob), "_blank");
  };

  const handleResolveIssue = (id: string) => {
    setHistory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ticketStatus: "RESOLVED" } : item
      )
    );
    if (notifications > 0) setNotifications((prev) => prev - 1);
  };

  const handleAssignTech = (id: string, techId: string) => {
    setHistory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, inspectorId: techId } : item
      )
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20 shadow-sm">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <Activity className="text-white h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            Spectra-Q
          </span>
        </div>
        <nav className="p-4 space-y-1 flex-1">
          <NavItem
            active={currentView === "monitor"}
            onClick={() => setCurrentView("monitor")}
            icon={Camera}
          >
            CCTV & Sensors
          </NavItem>
          <NavItem
            active={currentView === "dashboard"}
            onClick={() => setCurrentView("dashboard")}
            icon={LayoutDashboard}
          >
            Analytics
          </NavItem>
          <NavItem
            active={currentView === "issues"}
            onClick={() => setCurrentView("issues")}
            icon={AlertTriangle}
          >
            Incidents{" "}
            {openIssues > 0 && (
              <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {openIssues}
              </span>
            )}
          </NavItem>
          <NavItem
            active={currentView === "reports"}
            onClick={() => setCurrentView("reports")}
            icon={ClipboardList}
          >
            History Logs
          </NavItem>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-64 p-8">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {currentView === "monitor" && "Live Production & IoT Feed"}
              {currentView === "dashboard" && "Factory Analytics Dashboard"}
              {currentView === "issues" && "Incident Management"}
              {currentView === "reports" && "Full History Logs"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Line 4 • Integrated IoT Node
            </p>
          </div>
          <div className="flex gap-3">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
              <Bell size={20} />
              {notifications > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <div className="h-9 px-4 bg-white border border-slate-200 rounded-lg flex items-center gap-2 text-sm font-medium text-slate-600 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>{" "}
              Sensors Active
            </div>
          </div>
        </header>

        {/* Content Views (Monitor, Dashboard, etc.) - ใช้โค้ดเดิมของคุณ */}
        {currentView === "monitor" && (
          <MonitorView
            capturedFrame={capturedFrame}
            loading={loading}
            thermalMode={thermalMode}
            setThermalMode={setThermalMode}
            processImage={processImage}
            handleUploadClick={handleUploadClick}
            fileInputRef={fileInputRef}
            liveTemp={liveTemp}
            liveNoise={liveNoise}
            latestResult={latestResult}
            generatePDF={generatePDF}
          />
        )}

        {currentView === "dashboard" && (
          <DashboardView
            total={total}
            passed={passed}
            rejected={rejected}
            openIssues={openIssues}
            chartDataTemp={chartDataTemp}
            chartDataDefects={chartDataDefects}
            COLORS={COLORS}
          />
        )}

        {currentView === "issues" && (
          <IssuesView
            history={history}
            technicians={MOCK_TECHNICIANS}
            handleAssignTech={handleAssignTech}
            handleResolveIssue={handleResolveIssue}
            generatePDF={generatePDF}
          />
        )}

        {currentView === "reports" && (
          <ReportsView
            history={history}
            technicians={MOCK_TECHNICIANS}
            generatePDF={generatePDF}
          />
        )}
      </main>

      {/* --- WOW FEATURE #2: SPECTRA-Q CHAT ASSISTANT --- */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
        {chatOpen && (
          <div className="bg-white w-96 h-[500px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
            {/* Chat Header */}
            <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className="bg-blue-500 p-1.5 rounded-lg">
                  <Bot size={18} />
                </div>
                <div>
                  <div className="font-bold text-sm">Spectra Copilot</div>
                  <div className="text-[10px] text-blue-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>{" "}
                    Connected to Factory Data
                  </div>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Messages */}
            <div
              ref={chatScrollRef}
              className="flex-1 bg-slate-50 p-4 overflow-y-auto space-y-4"
            >
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={clsx(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={clsx(
                      "max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white text-slate-700 border border-slate-200 rounded-bl-none"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-500 text-xs px-3 py-2 rounded-2xl border border-slate-200 flex items-center gap-2">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask about yield, defects, or logs..."
                className="flex-1 bg-slate-100 text-slate-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={chatLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || chatLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl disabled:opacity-50 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Floating Action Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="h-14 w-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 relative group"
        >
          {chatOpen ? <X size={24} /> : <MessageSquare size={24} />}
          {!chatOpen && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white items-center justify-center font-bold">
                1
              </span>
            </span>
          )}
          {/* Tooltip */}
          {!chatOpen && (
            <div className="absolute right-16 bg-slate-800 text-white text-xs py-1 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Ask AI Assistant
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

// --- EXTRACTED VIEWS FOR CLEANLINESS (You can keep these in same file) ---

function MonitorView({
  capturedFrame,
  loading,
  thermalMode,
  setThermalMode,
  processImage,
  handleUploadClick,
  fileInputRef,
  liveTemp,
  liveNoise,
  latestResult,
  generatePDF,
}: any) {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="grid grid-cols-12 gap-6 h-[600px]">
        {/* Left: Video Feed */}
        <div className="col-span-8 bg-black rounded-2xl overflow-hidden relative shadow-lg flex flex-col group">
          {/* Header */}
          <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start z-10 pointer-events-none">
            <div>
              <div className="text-white/80 text-xs font-mono">
                CAM-04 | 1920x1080 | 60FPS
              </div>
              <div className="text-white font-bold text-lg mt-1">
                PRIMARY CONVEYOR BELT
              </div>
            </div>
            <div className="flex items-center gap-2">
              {thermalMode && (
                <span className="bg-orange-500/20 text-orange-400 border border-orange-500/50 px-2 py-1 rounded text-xs font-bold animate-pulse">
                  THERMAL MODE
                </span>
              )}
              <div className="flex items-center gap-2 bg-red-600/20 backdrop-blur-md px-3 py-1 rounded-full border border-red-500/30">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-500 text-xs font-bold tracking-wider">
                  LIVE
                </span>
              </div>
            </div>
          </div>
          {/* Video */}
          <div className="flex-1 flex items-center justify-center bg-zinc-900 relative overflow-hidden">
            <div
              className={clsx(
                "absolute inset-0 z-0 transition-all duration-500",
                thermalMode
                  ? "mix-blend-color-dodge opacity-80 pointer-events-none"
                  : "opacity-0"
              )}
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,255,0.2) 0%, rgba(255,0,0,0.2) 100%)",
              }}
            ></div>
            {capturedFrame ? (
              <img
                src={capturedFrame}
                className={clsx(
                  "w-full h-full object-contain transition-all duration-500",
                  thermalMode &&
                    "brightness-125 contrast-125 hue-rotate-[180deg] invert"
                )}
                alt="Captured Frame"
              />
            ) : (
              <div className="text-zinc-600 flex flex-col items-center z-0">
                <Camera size={48} className="mb-4 opacity-50" />
                <p>Waiting for visual feed...</p>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-cyan-500/10 z-20 border-b-2 border-cyan-400 animate-scan pointer-events-none"></div>
            )}
            {!loading && (
              <div className="absolute bottom-6 right-6 z-30 pointer-events-auto">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={processImage}
                  className="hidden"
                  accept="image/*"
                />
                <button
                  onClick={handleUploadClick}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg transition-all hover:scale-105"
                >
                  <Upload size={16} /> Upload CCTV Sample
                </button>
              </div>
            )}
          </div>
          {/* Footer */}
          <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center text-zinc-400 text-xs">
            <div>Spectra-Vision AI v2.4 (Model: Gemini-2.0-Flash)</div>
            <div className="flex items-center gap-3">
              <span className="mr-2">View Mode:</span>
              <button
                onClick={() => setThermalMode(false)}
                className={clsx(
                  "px-3 py-1 rounded transition-colors",
                  !thermalMode ? "bg-blue-600 text-white" : "hover:bg-zinc-800"
                )}
              >
                Normal
              </button>
              <button
                onClick={() => setThermalMode(true)}
                className={clsx(
                  "px-3 py-1 rounded transition-colors flex items-center gap-1",
                  thermalMode ? "bg-orange-600 text-white" : "hover:bg-zinc-800"
                )}
              >
                <Flame size={12} /> Thermal
              </button>
            </div>
          </div>
        </div>
        {/* Right: Sensors */}
        <div className="col-span-4 flex flex-col gap-4 h-full">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-slate-500 text-xs font-bold uppercase mb-3 flex items-center gap-2">
              <Activity size={14} /> Real-time Sensor Telemetry
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={clsx(
                  "p-3 rounded-xl border flex flex-col items-center transition-colors duration-500",
                  liveTemp > 80
                    ? "bg-red-50 border-red-200"
                    : "bg-slate-50 border-slate-100"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Thermometer
                    size={16}
                    className={
                      liveTemp > 80 ? "text-red-500" : "text-slate-400"
                    }
                  />
                  <span className="text-xs text-slate-500">Temp</span>
                </div>
                <span
                  className={clsx(
                    "text-2xl font-bold font-mono",
                    liveTemp > 80 ? "text-red-600" : "text-slate-800"
                  )}
                >
                  {liveTemp}°C
                </span>
              </div>
              <div
                className={clsx(
                  "p-3 rounded-xl border flex flex-col items-center transition-colors duration-500",
                  liveNoise > 90
                    ? "bg-orange-50 border-orange-200"
                    : "bg-slate-50 border-slate-100"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Volume2
                    size={16}
                    className={
                      liveNoise > 90 ? "text-orange-500" : "text-slate-400"
                    }
                  />
                  <span className="text-xs text-slate-500">Noise</span>
                </div>
                <span
                  className={clsx(
                    "text-2xl font-bold font-mono",
                    liveNoise > 90 ? "text-orange-600" : "text-slate-800"
                  )}
                >
                  {liveNoise}dB
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col">
            <h3 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
              <CheckCircle size={18} className="text-blue-500" /> QC Status
            </h3>
            {latestResult ? (
              <div className="flex-1 flex flex-col">
                <div
                  className={clsx(
                    "p-4 rounded-xl border mb-4 text-center",
                    latestResult.status === "PASS"
                      ? "bg-green-50 border-green-100 text-green-700"
                      : "bg-red-50 border-red-100 text-red-700"
                  )}
                >
                  <div className="text-3xl font-bold mb-1">
                    {latestResult.status}
                  </div>
                  <div className="text-xs opacity-70 uppercase tracking-widest">
                    Confidence: {(latestResult.confidence * 100).toFixed(0)}%
                  </div>
                </div>
                {latestResult.status === "REJECT" && (
                  <div className="mb-4 bg-red-50 p-3 rounded-lg border border-red-100 max-h-[100px] overflow-y-auto">
                    <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                      {latestResult.defects.map((d: any, i: any) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="text-sm text-slate-600 mb-6 flex-1 overflow-y-auto">
                  <span className="font-bold text-slate-900">AI:</span>{" "}
                  {latestResult.reasoning}
                </div>
                <button
                  onClick={() => generatePDF(latestResult)}
                  className="w-full py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
                >
                  <FileText size={16} /> QC Report
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic">
                Waiting for inspection data...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardView({
  total,
  passed,
  rejected,
  openIssues,
  chartDataTemp,
  chartDataDefects,
  COLORS,
}: any) {
  return (
    <div className="animate-in fade-in duration-300 space-y-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Thermometer size={18} className="text-blue-500" /> Temperature &
            Noise Trend
          </h3>
          <div className="h-[300px]">
            {chartDataTemp.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDataTemp}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                    itemStyle={{ fontSize: "12px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temp"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    name="Temp (°C)"
                  />
                  <Line
                    type="monotone"
                    dataKey="noise"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    name="Noise (dB)"
                  />
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
            <AlertTriangle size={18} className="text-red-500" /> Defect Types
            Breakdown
          </h3>
          <div className="h-[300px]">
            {chartDataDefects.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartDataDefects}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartDataDefects.map((entry: any, index: any) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
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

function IssuesView({
  history,
  technicians,
  handleAssignTech,
  handleResolveIssue,
  generatePDF,
}: any) {
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
            .filter((h: any) => h.status === "REJECT")
            .map((h: any) => (
              <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-mono text-slate-600 font-bold">
                  {h.id}
                </td>
                <td className="p-4 text-slate-600">
                  {new Date(h.timestamp).toLocaleTimeString()}
                </td>
                <td className="p-4 text-xs font-mono">
                  <div
                    className={
                      h.temperature > 80
                        ? "text-red-600 font-bold"
                        : "text-slate-500"
                    }
                  >
                    T: {h.temperature}°C
                  </div>
                  <div
                    className={
                      h.noise_level > 90
                        ? "text-orange-600 font-bold"
                        : "text-slate-500"
                    }
                  >
                    N: {h.noise_level}dB
                  </div>
                </td>
                <td className="p-4 font-medium text-slate-900">
                  {h.defects[0]}
                </td>
                <td className="p-4">
                  {h.ticketStatus === "RESOLVED" ? (
                    <span className="text-slate-500 text-xs">
                      {
                        technicians.find((t: any) => t.id === h.inspectorId)
                          ?.name
                      }
                    </span>
                  ) : (
                    <select
                      value={h.inspectorId}
                      onChange={(e) => handleAssignTech(h.id, e.target.value)}
                      className="bg-white border border-slate-300 text-xs rounded px-2 py-1 focus:border-blue-500"
                    >
                      <option value="AUTO-CCTV">Auto</option>
                      {technicians.map((tech: any) => (
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
                    <button
                      onClick={() => handleResolveIssue(h.id)}
                      className="text-blue-600 text-xs font-medium hover:underline"
                    >
                      Resolve
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

function ReportsView({ history, technicians, generatePDF }: any) {
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
          {history.map((h: any) => (
            <tr key={h.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 text-slate-600 flex items-center gap-2">
                <Clock size={14} className="text-slate-300" />
                {new Date(h.timestamp).toLocaleString()}
              </td>
              <td className="p-4">
                <span
                  className={clsx(
                    "px-2 py-1 rounded text-xs font-bold",
                    h.status === "PASS"
                      ? "text-green-600 bg-green-50"
                      : "text-red-600 bg-red-50"
                  )}
                >
                  {h.status}
                </span>
              </td>
              <td className="p-4 text-xs font-mono text-slate-500">
                {h.temperature}°C | {h.noise_level}dB
              </td>
              <td className="p-4 text-xs text-slate-600">
                {technicians.find((t: any) => t.id === h.inspectorId)?.name ||
                  "System"}
              </td>
              <td className="p-4 text-right">
                <button
                  onClick={() => generatePDF(h)}
                  className="text-slate-400 hover:text-blue-600"
                >
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

function NavItem({ children, icon: Icon, active, onClick }: any) {
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

function MetricCard({
  label,
  value,
  icon: Icon,
  color = "text-slate-700",
}: any) {
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
