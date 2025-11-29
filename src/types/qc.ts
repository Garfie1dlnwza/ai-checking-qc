export type QCStatus = 'PASS' | 'REJECT';

export interface QCListEntry {
  issues: string[];
  ok: boolean;
}

export interface QCResult {
  id: string;
  inspectorId: string;
  ticketStatus: 'OPEN' | 'RESOLVED' | 'ARCHIVED';
  timestamp: string;
  status: QCStatus;
  confidence: number;
  defects: string[];
  reasoning: string;
  temperature: number;
  noise_level: number;
  action_command: string;
  root_cause: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  qc_list: {
    visual_qc: QCListEntry;
    machine_panel_qc: QCListEntry;
    process_qc: QCListEntry;
  };
  pain_points: string[];
  solution: {
    summary: string;
    recommended_actions: string[];
  };
}

export interface ReportMeta {
  project: string;
  location: string;
  activity: string;
  materials: string;
  laborHours: string;
  equipment: string;
  accidents: string;
  inspector: string;
}

export interface QCReportPayload {
  data: QCResult;
  meta: ReportMeta;
  image?: string | null;
}

export interface Technician {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
}
