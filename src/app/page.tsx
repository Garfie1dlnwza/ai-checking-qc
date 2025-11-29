"use client";

import { useState, useRef, useEffect, Activity } from "react";
import { analyzeImage, askSpectraAI } from "./actions";
import { QCReportDocument } from "./ReportDocument";
import { pdf } from "@react-pdf/renderer";
import { AlertTriangle, Bell, ClipboardList, LayoutDashboard, MessageSquare, Send, X, Bot, Camera } from "lucide-react";
import { clsx } from "clsx";
import { MonitorView } from "@/components/MonitorView";
import { DashboardView } from "@/components/DashboardView";
import { IssuesView } from "@/components/IssuesView";
import { ReportsView } from "@/components/ReportsView";
import { NavItem } from "@/components/NavItem";
import { QCResult, Technician } from "@/types/qc";

// --- DATA MODELS ---

const MOCK_TECHNICIANS: Technician[] = [
  { id: "T01", name: "Somchai Engineering", role: "Senior QC", avatar: "SE" },
  { id: "T02", name: "Wipa Tech", role: "Line Inspector", avatar: "WT" },
  { id: "T03", name: "Kenji Systems", role: "System Admin", avatar: "KS" },
];

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
