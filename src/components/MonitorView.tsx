import type { ChangeEvent, RefObject } from "react";
import clsx from "clsx";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle,
  FileText,
  Flame,
  Upload,
  Volume2,
  Thermometer,
} from "lucide-react";
import { QCResult } from "@/types/qc";

interface MonitorViewProps {
  capturedFrame: string | null;
  loading: boolean;
  thermalMode: boolean;
  setThermalMode: (value: boolean) => void;
  processImage: (e: ChangeEvent<HTMLInputElement>) => void;
  handleUploadClick: () => void;
  fileInputRef: RefObject<HTMLInputElement>;
  liveTemp: number;
  liveNoise: number;
  latestResult: QCResult | null;
  generatePDF: (record: QCResult) => void;
}

export function MonitorView({
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
}: MonitorViewProps) {
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
                      {latestResult.defects.map((d, i) => (
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
