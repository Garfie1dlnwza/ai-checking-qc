// app/actions.ts
'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function analyzeImage(formData: FormData) {
  const file = formData.get('image') as File;
  const productType = formData.get('productType') as string;

  if (!file) {
    return { error: 'No image uploaded' };
  }

  // Convert file to base64 for Gemini
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Image = buffer.toString('base64');

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // The Exact Prompt from your Streamlit App
  const prompt = `
    You are a Vision-Language QC Agent for a factory. Inspecting product: ${productType}

    ✅ TAG 1: QC LIST
    1) Visual QC: Dents, scratches, color issues, deformation, misalignment.
    2) Machine Panel QC: Temp/Pressure anomalies, Error codes on HMI.
    3) Process QC: WIP pileups, missing docs, low raw materials.

    ✅ TAG 2: PAIN POINTS
    1) Human error in reading values.
    2) Delayed reporting.
    3) Manual reporting errors.

    ✅ TAG 3: SOLUTIONS
    - Vision-Language QC Agent analysis.
    - PASS/REJECT decision with reasoning.
    - Root cause identification.

    🎯 YOUR TASK:
    Analyze the image and return ONLY JSON with this structure:
    {
      "timestamp": "${new Date().toISOString()}",
      "status": "PASS" or "REJECT",
      "confidence": float (0.0-1.0),
      "defects": ["List of defects in Thai"],
      "reasoning": "Technical reasoning in Thai",
      "action_command": "ACCEPT_PART" or "REJECT_PART",
      "root_cause": "Root cause analysis in Thai",
      "severity": "LOW" or "MEDIUM" or "HIGH",
      "qc_list": {
        "visual_qc": { "issues": ["issues found"], "ok": boolean },
        "machine_panel_qc": { "issues": ["issues found"], "ok": boolean },
        "process_qc": { "issues": ["issues found"], "ok": boolean }
      },
      "pain_points": ["Summary of pain points"],
      "solution": {
        "summary": "How AI helps in this case (Thai)",
        "recommended_actions": ["Action items"]
      }
    }
  `;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: file.type,
        },
      },
    ]);

    const text = result.response.text();
    
    // Clean JSON (remove markdown backticks if present)
    const jsonStr = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(jsonStr);
    
    return { success: true, data };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { error: 'Failed to analyze image' };
  }
}

export async function askSpectraAI(question: string, contextData: any) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Limit logs and technicians for prompt size
    const recentLogs = Array.isArray(contextData.recentLogs)
      ? contextData.recentLogs.slice(0, 5)
      : [];
    const technicians = Array.isArray(contextData.technicians)
      ? contextData.technicians.slice(0, 5)
      : [];

    const prompt = `
      คุณคือ "Spectra-Q Copilot" ผู้ช่วย AI อัจฉริยะประจำโรงงาน
      หน้าที่ของคุณคือตอบคำถามของผู้บริหารหรือหัวหน้าช่าง โดยอ้างอิงจากข้อมูล Real-time ด้านล่างนี้:

      --- DATA CONTEXT ---
      - Total Scans: ${contextData.total ?? '-'}
      - Passed: ${contextData.passed ?? '-'}
      - Rejected: ${contextData.rejected ?? '-'}
      - Yield Rate: ${contextData.passRate ?? '-'}%
      - Recent Issues (Logs): ${JSON.stringify(recentLogs)}
      - Active Technicians: ${JSON.stringify(technicians)}
      --------------------

      คำถามจาก User: "${question}"

      คำแนะนำการตอบ:
      1. ตอบเป็นภาษาไทย สั้น กระชับ และดูเป็นมืออาชีพ (Professional Engineer Tone)
      2. อ้างอิงตัวเลขจาก Data Context เสมอ
      3. ถ้าถามเรื่องที่ไม่มีในข้อมูล ให้ตอบว่า "ไม่มีข้อมูลในระบบครับ"
      4. ถ้า User ถามถึงสาเหตุของเสีย ให้วิเคราะห์จาก Recent Issues
    `;

    const result = await model.generateContent(prompt);
    const answer = result?.response?.text?.() ?? "ระบบขัดข้องชั่วคราว กรุณาลองใหม่ครับ";
    return { success: true, answer };

  } catch (error) {
    console.error("Chat Error:", error);
    return { success: false, answer: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่ครับ" };
  }
}