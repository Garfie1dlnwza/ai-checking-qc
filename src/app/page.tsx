"use client";

import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import {
  analyzeImage,
  askSpectraAI,
  planProductionSchedule,
} from "./actions";
import { QCReportDocument } from "./ReportDocument";
import { pdf } from "@react-pdf/renderer";
import {
  AlertTriangle,
  Bell,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Send,
  X,
  Bot,
  Camera,
  Activity,
  Volume2,
  VolumeX,
} from "lucide-react";
import { clsx } from "clsx";
import { MonitorView } from "@/components/MonitorView";
import { DashboardView } from "@/components/DashboardView";
import { IssuesView } from "@/components/IssuesView";
import { ReportsView } from "@/components/ReportsView";
import { NavItem } from "@/components/NavItem";
import { InspectionType, QCResult, Technician } from "@/types/qc";

// --- DATA MODELS ---

const MOCK_TECHNICIANS: Technician[] = [
  { id: "T01", name: "Somchai Engineering", role: "Senior QC", avatar: "SE" },
  { id: "T02", name: "Wipa Tech", role: "Line Inspector", avatar: "WT" },
  { id: "T03", name: "Kenji Systems", role: "System Admin", avatar: "KS" },
];

const INSPECTION_PROFILES: Record<
  InspectionType,
  { label: string; target: string; activity: string }
> = {
  QC_PRODUCT: {
    label: "QC Product",
    target: "Electronic PCB",
    activity: "Product Quality Inspection",
  },
  MACHINE_CHECK: {
    label: "ตรวจสอบเครื่องจักร",
    target: "Machine Panel & Conveyor Health Check",
    activity: "Machine Condition Audit",
  },
};

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
  const [inspectionType, setInspectionType] =
    useState<InspectionType>("QC_PRODUCT");
  const inspectionProfile = INSPECTION_PROFILES[inspectionType];
  const [liveTemp, setLiveTemp] = useState(45);
  const [liveNoise, setLiveNoise] = useState(60);
  const [plannerPlan, setPlannerPlan] = useState<any | null>(null);
  const [plannerLoading, setPlannerLoading] = useState(false);

  // --- NEW STATE: Audio Control ---
  const [audioEnabled, setAudioEnabled] = useState(true);
  const thaiVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // --- VIDEO STATE ---
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CHAT STATE ---
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
  const handleAskManual = async (errorCode: string) => {
    setChatOpen(true);
    const question = `เครื่องจักรแจ้งเตือน Error Code ${errorCode} ต้องแก้ไขอย่างไรตามคู่มือ?`;
    setChatInput(question);

    // จำลอง Manual Context (ในงานจริงคือ Vector Search จาก PDF)
    const manualContext = `
      [MANUAL EXTRACT: SERIES-4 CONVEYOR]
      Error E-104: Motor Overheat. Cause: Bearing friction or dust buildup. Action: 1. Stop line immediately. 2. Inspect bearing #4. 3. Apply grease type lithium-complex.
      Error E-200: Sensor Misalignment. Action: Re-calibrate position X-Y.
    `;

    // ส่งเข้า Chat เลย (User ไม่ต้องกด Enter)
    setChatMessages((prev) => [...prev, { role: "user", text: question }]);
    setChatLoading(true);

    // เรียก API โดยแนบ Manual Context ไปด้วย (ต้องแก้ askSpectraAI นิดหน่อยให้รับ manual หรือใส่ใน prompt นี้เลย)
    // เพื่อความง่ายใน Demo เราจะ Hack prompt ใน frontend นี้ส่งไปถามเลย
    const response = await askSpectraAI(
      question + `\n\nReference Manual: ${manualContext}`,
      {
        total,
        passed,
        rejected,
        passRate,
        recentLogs: [],
        technicians: [],
      }
    );

    setChatLoading(false);
    if (response.success && response.answer) {
      setChatMessages((prev) => [
        ...prev,
        { role: "ai", text: response.answer },
      ]);
    }
  };
  // Chart Data
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

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const voices = synth.getVoices();
      const found = voices.find((v) => v.lang?.toLowerCase().startsWith("th"));
      thaiVoiceRef.current = found || null;
    };

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const triggerAudioAlert = (defect: string, severity: string) => {
    if (!audioEnabled) return;

    const playTone = (
      freq: number,
      duration: number,
      startAt = 0,
      gainValue = 0.14
    ) => {
      try {
        const AudioCtx =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
        gain.gain.setValueAtTime(gainValue, ctx.currentTime + startAt);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startAt);
        osc.stop(ctx.currentTime + startAt + duration);
      } catch (e) {
        console.error("Tone play failed", e);
      }
    };

    // Quick confirmation chime for all alerts
    playTone(660, 0.18, 0, 0.12);
    playTone(880, 0.22, 0.12, 0.12);

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const severityLabel =
        severity === "HIGH" ? "สูง" : severity === "MEDIUM" ? "ปานกลาง" : "ต่ำ";
      const speakText = `แจ้งเตือน พบความผิดปกติ ${defect} ระดับความรุนแรง ${severityLabel}`;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(speakText);
      utterance.lang = "th-TH";
      utterance.pitch = 1.05;
      utterance.rate = 0.95;
      if (!thaiVoiceRef.current) {
        const found = synth
          .getVoices()
          .find((v) => v.lang?.toLowerCase().startsWith("th"));
        thaiVoiceRef.current = found || null;
      }
      if (thaiVoiceRef.current) utterance.voice = thaiVoiceRef.current;
      synth.speak(utterance);
    }

    if (severity === "HIGH") {
      // Louder escalating tone for high severity
      playTone(520, 0.5, 0.3, 0.18);
      playTone(620, 0.5, 0.8, 0.18);
    }
  };

  const handleTestAudio = () => {
    triggerAudioAlert("ทดสอบเสียงเตือน", "MEDIUM");
  };

  const buildRecordFromAnalysis = (
    analysis: QCResult,
    mockSensorTemp: number,
    mockSensorNoise: number,
    idPrefix = "LOG",
    inspectionTypeValue: InspectionType
  ): QCResult => {
    const sensorGateEnabled = inspectionTypeValue === "MACHINE_CHECK";
    let finalStatus = analysis.status;
    let finalSeverity = analysis.severity;
    const extraReasons: string[] = [];
    const sensorAlerts: string[] = [];

    if (sensorGateEnabled) {
      if (mockSensorTemp > 80) {
        finalStatus = "REJECT";
        finalSeverity = "HIGH";
        const msg = `อุณหภูมิสูงผิดปกติ (${mockSensorTemp}°C)`;
        extraReasons.push(msg);
        sensorAlerts.push(`⚠️ SYSTEM ALERT: ${msg}`);
      }
      if (mockSensorNoise > 90) {
        finalStatus = "REJECT";
        finalSeverity = "HIGH";
        const msg = `เสียงดังผิดปกติ (${mockSensorNoise}dB)`;
        extraReasons.push(msg);
        sensorAlerts.push(`⚠️ SYSTEM ALERT: ${msg}`);
      }
    }

    const combinedDefects = [...analysis.defects, ...extraReasons];
    const finalReasoning =
      sensorAlerts.length > 0
        ? `${sensorAlerts.join(" ")}\n${analysis.reasoning}`
        : analysis.reasoning;

    return {
      ...analysis,
      status: finalStatus as "PASS" | "REJECT",
      severity: finalSeverity,
      defects: combinedDefects,
      reasoning: finalReasoning,
      id: `${idPrefix}-${Math.floor(Math.random() * 10000)}`,
      inspectionType: inspectionTypeValue,
      inspectorId: "AUTO-CCTV",
      ticketStatus: finalStatus === "REJECT" ? "OPEN" : "ARCHIVED",
      temperature: mockSensorTemp,
      noise_level: mockSensorNoise,
    };
  };

  const handleGeneratePlan = async (formData: FormData) => {
    setPlannerLoading(true);
    const response = await planProductionSchedule(formData);
    setPlannerLoading(false);
    if (response.success && response.data) {
      setPlannerPlan(response.data);
    } else {
      setPlannerPlan({
        summary: "ไม่สามารถสร้างแผนได้ โปรดลองใหม่",
        gantt_chart: [],
        worker_moves: [],
        impact_analysis: { delay_minutes: 0, cost_impact: "N/A" },
      });
    }
  };

  // --- ACTIONS ---

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userQuestion = chatInput;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userQuestion }]);
    setChatLoading(true);

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

  const processImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const frameUrl = URL.createObjectURL(file);
    setCapturedFrame(frameUrl);
    setLoading(true);

    const mockSensorTemp = Math.floor(Math.random() * (95 - 40) + 40);
    const mockSensorNoise = Math.floor(Math.random() * (100 - 60) + 60);

    setLiveTemp(mockSensorTemp);
    setLiveNoise(mockSensorNoise);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("productType", inspectionProfile.target);
    formData.append("inspectionType", inspectionType);

    const response = await analyzeImage(formData);

    if (response.success && response.data) {
      const newRecord = buildRecordFromAnalysis(
        response.data as QCResult,
        mockSensorTemp,
        mockSensorNoise,
        "LOG",
        inspectionType
      );

      setLatestResult(newRecord);
      setHistory((prev) => [newRecord, ...prev]);

      if (newRecord.status === "REJECT") {
        setNotifications((prev) => prev + 1);
        triggerAudioAlert(
          newRecord.defects[0] || "Unknown Defect",
          newRecord.severity
        );
      }
    }
    setLoading(false);
  };

  const processVideoFrame = async () => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const file = new File([blob], "video-frame.jpg", { type: "image/jpeg" });

        const mockSensorTemp = Math.floor(Math.random() * (95 - 40) + 40);
        const mockSensorNoise = Math.floor(Math.random() * (100 - 60) + 60);
        setLiveTemp(mockSensorTemp);
        setLiveNoise(mockSensorNoise);

        const formData = new FormData();
        formData.append("image", file);
        formData.append("productType", inspectionProfile.target);
        formData.append("inspectionType", inspectionType);

        const response = await analyzeImage(formData);
        if (response.success && response.data) {
          const newRecord = buildRecordFromAnalysis(
            response.data as QCResult,
            mockSensorTemp,
            mockSensorNoise,
            "V-LOG",
            inspectionType
          );
          setLatestResult(newRecord);
          setHistory((prev) => [newRecord, ...prev]);
          if (newRecord.status === "REJECT") {
            setNotifications((prev) => prev + 1);
            triggerAudioAlert(
              newRecord.defects[0] || "Defect Found",
              newRecord.severity
            );
          }
        }
      },
      "image/jpeg",
      0.8
    );
  };

  const stopVideoProcessing = () => {
    setIsVideoProcessing(false);
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    videoRef.current?.pause();
  };

  const handleVideoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setCapturedFrame(null);
    stopVideoProcessing();
  };

  const toggleVideoProcessing = () => {
    if (isVideoProcessing) {
      stopVideoProcessing();
    } else {
      setIsVideoProcessing(true);
      videoRef.current?.play();
      processVideoFrame();
      videoIntervalRef.current = setInterval(processVideoFrame, 3000);
    }
  };

  useEffect(() => {
    return () => {
      stopVideoProcessing();
    };
  }, []);

  const generatePDF = async (record: QCResult) => {
    const tech = MOCK_TECHNICIANS.find((t) => t.id === record.inspectorId);
    const inspectorName = tech
      ? tech.name
      : record.inspectorId === "AUTO-CCTV"
      ? "AI AUTO-AGENT"
      : "Unknown";
    const profile =
      INSPECTION_PROFILES[record.inspectionType] ||
      INSPECTION_PROFILES.QC_PRODUCT;
    const blob = await pdf(
      <QCReportDocument
        data={record}
        meta={{
          project: "Spectra IoT Node 04",
          location: "Line 4",
          activity: profile.activity,
          materials: profile.target,
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
            {/* --- AUDIO TOGGLE BUTTON --- */}
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={clsx(
                "p-2 rounded-full border transition-colors relative",
                audioEnabled
                  ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  : "bg-red-50 border-red-200 text-red-500"
              )}
              title={audioEnabled ? "Mute Alerts" : "Unmute Alerts"}
            >
              {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>

            <button
              onClick={handleTestAudio}
              disabled={!audioEnabled}
              className={clsx(
                "px-3 py-2 text-xs font-semibold rounded-lg border bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed",
                "border-slate-200"
              )}
              title={audioEnabled ? "Play a quick alert sound" : "Unmute alerts to test"}
            >
              Test Sound
            </button>

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

        {/* Content Views */}
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
            handleAskManual={handleAskManual}
            videoSrc={videoSrc}
            handleVideoUpload={handleVideoUpload}
            isVideoProcessing={isVideoProcessing}
            toggleVideoProcessing={toggleVideoProcessing}
            videoRef={videoRef}
            inspectionType={inspectionType}
            setInspectionType={setInspectionType}
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
            plannerLoading={plannerLoading}
            plannerPlan={plannerPlan}
            onGeneratePlan={handleGeneratePlan}
          />
        )}
        {/* ... Rest of views (IssuesView, ReportsView) ... */}
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
