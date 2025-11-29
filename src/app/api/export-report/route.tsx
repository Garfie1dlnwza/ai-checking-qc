import { NextResponse } from 'next/server';
import { pdf } from '@react-pdf/renderer';
import { promises as fs } from 'fs';
import path from 'path';
import { QCReportDocument } from '@/app/ReportDocument';
import { QCReportPayload } from '@/types/qc';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const payload = formData.get('payload');
    if (!payload || typeof payload !== 'string') {
      return NextResponse.json({ error: 'Missing report payload' }, { status: 400 });
    }

    const { data, meta } = JSON.parse(payload) as QCReportPayload;
    if (!data || !meta) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    let imageSrc: string | null = null;
    const imageFile = formData.get('image');
    if (imageFile instanceof File) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const mime = imageFile.type || 'application/octet-stream';
      imageSrc = `data:${mime};base64,${buffer.toString('base64')}`;
    }

    const pdfInstance = pdf(<QCReportDocument data={data} meta={meta} imageSrc={imageSrc} />);
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdfInstance.toBuffer((err, buffer) => {
        if (err) return reject(err);
        resolve(Buffer.from(buffer));
      });
    });
    const pdfCopy = Buffer.from(pdfBuffer);

    const timestamp = new Date(data.timestamp || Date.now()).toISOString();
    const baseName = `QC_Report_${timestamp.split('T')[0]}_${Date.now()}`;
    const filename = `${baseName}.pdf`;

    // Persist a copy to disk so reports are retained server-side
    const reportsDir = path.join(process.cwd(), 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    const filePath = path.join(reportsDir, filename);
    // Fire-and-forget save to keep response fast
    fs.writeFile(filePath, pdfCopy).catch((err) =>
      console.error('Failed to persist report', err)
    );

    return new NextResponse(pdfCopy, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Report-Path': filePath,
      },
    });
  } catch (error) {
    console.error('PDF generation failed', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
