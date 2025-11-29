'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// --- 1. Analyze Image (เหมือนเดิม ไม่ต้องแก้) ---
export async function analyzeImage(formData: FormData) {
  const file = formData.get('image') as File;
  const productType = formData.get('productType') as string;
  const inspectionType = (formData.get('inspectionType') as string) || 'QC_PRODUCT';
  const isMachineCheck = inspectionType === 'MACHINE_CHECK';
  const inspectionLabel = isMachineCheck
    ? 'Machine / Equipment Condition Check (ตรวจสอบเครื่องจักร)'
    : 'QC Product (ตรวจสอบชิ้นงาน)';

  if (!file) return { error: 'No image uploaded' };

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Image = buffer.toString('base64');

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const focusText = isMachineCheck
    ? `Machine check focus: oil/coolant leaks, burn marks, loose belts/chains, abnormal heat spots, smoke, exposed wiring, vibration or misalignment, missing/loose guards, warning lights or error codes on HMI/panel. Treat safety/overheat/leak issues as HIGH severity.`
    : `Product QC focus: dents, scratches, cracks, missing components, misalignment, solder/assembly quality, wrong/blurred labels, contamination, color defects.`;

  const prompt = `
    You are a Vision-Language QC Agent for a factory.
    Inspection Type: ${inspectionLabel}
    Target/Asset: ${productType}

    ${focusText}

    ✅ TAG 1: QC LIST
    1) Visual QC: Dents, scratches, color issues, deformation, misalignment.
    2) Machine Panel QC: Temp/Pressure anomalies, Error codes on HMI.
    3) Process QC: WIP pileups, missing docs, low raw materials.
    - If Machine Check mode, prioritize machine health (leaks/heat/alarms) over cosmetic issues.

    🎯 YOUR TASK:
    Analyze the image and return ONLY JSON with this structure:
    {
      "timestamp": "${new Date().toISOString()}",
      "status": "PASS" or "REJECT",
      "confidence": float (0.0-1.0),
      "defects": ["List of defects in Thai"],
      "reasoning": "Technical reasoning in Thai",
      "action_command": "ACCEPT_PART" or "REJECT_PART",
      "root_cause": "Root cause analysis in Thai (e.g. Machine calibration error, Material defect)",
      "severity": "LOW" or "MEDIUM" or "HIGH",
      "qc_list": {
        "visual_qc": { "issues": [], "ok": boolean },
        "machine_panel_qc": { "issues": [], "ok": boolean },
        "process_qc": { "issues": [], "ok": boolean }
      },
      "pain_points": ["Summary of pain points"],
      "solution": {
        "summary": "How AI helps in this case (Thai)",
        "recommended_actions": ["Specific step-by-step fix in Thai"]
      }
    }
  `;

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: file.type } },
    ]);
    const text = result.response.text();
    const jsonStr = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(jsonStr);
    return { success: true, data };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { error: 'Failed to analyze image' };
  }
}

// --- 2. Ask Spectra AI (อัปเกรดให้ตอบสาเหตุ/วิธีแก้) ---
export async function askSpectraAI(question: string, contextData: any) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // คัดกรองข้อมูล Log ให้สั้นกระชับ แต่ครบถ้วนเรื่องสาเหตุ
    const recentLogs = Array.isArray(contextData.recentLogs)
      ? contextData.recentLogs.slice(0, 5).map((log: any) => ({
          status: log.status,
          defect: log.defect,
          // เพิ่ม root_cause และ solution ลงไปใน context ถ้ามี
          reason: log.reason, 
        }))
      : [];

    const prompt = `
      คุณคือ "Spectra-Q Copilot" ผู้ช่วยวิศวกร AI อัจฉริยะประจำโรงงาน
      
      --- ข้อมูลหน้างาน Real-time (DATA CONTEXT) ---
      - Total Scans: ${contextData.total ?? '-'}
      - Passed: ${contextData.passed ?? '-'}
      - Rejected: ${contextData.rejected ?? '-'} (Yield: ${contextData.passRate ?? '-'}%)
      - Active Technicians: ${JSON.stringify(contextData.technicians)}
      - ล็อกการตรวจสอบล่าสุด 5 รายการ: ${JSON.stringify(recentLogs)}
      -----------------------------------------------

      คำถามจาก User: "${question}"

      หน้าที่ของคุณ:
      1. ตอบคำถามโดยอ้างอิงข้อมูลข้างต้นเสมอ
      2. **ถ้า User ถามถึงปัญหา/สาเหตุ:** ให้วิเคราะห์จาก 'defect' และ 'reason' ในล็อกล่าสุด แล้วสรุปว่าปัญหาหลักคืออะไร (เช่น "ปัญหาส่วนใหญ่เกิดจากรอยขีดข่วน ซึ่งอาจมาจากเครื่องจักร Feed งานไม่นิ่ง")
      3. **ถ้า User ถามวิธีแก้:** ให้แนะนำแนวทางแก้ไขทางวิศวกรรม (เช่น "แนะนำให้ Calibrate หัวจ่ายใหม่ หรือตรวจสอบความร้อนของ Sensor")
      4. ตอบเป็นภาษาไทย สั้น กระชับ แบบมืออาชีพ (Professional & Actionable)
    `;

    const result = await model.generateContent(prompt);
    const answer = result?.response?.text?.() ?? "ขออภัย ระบบไม่สามารถประมวลผลได้ในขณะนี้";
    return { success: true, answer };

  } catch (error) {
    console.error("Chat Error:", error);
    return { success: false, answer: "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI" };
  }
}
