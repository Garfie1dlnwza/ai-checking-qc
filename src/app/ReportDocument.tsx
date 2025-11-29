import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { QCResult, ReportMeta } from '@/types/qc';

// 1. ลงทะเบียนฟอนต์ภาษาไทย (Sarabun)
// เราใช้ CDN เพื่อให้ไม่ต้องดาวน์โหลดไฟล์ลงเครื่อง แต่ถ้าจะให้เร็วที่สุดควรโหลด .ttf ไว้ในโปรเจกต์
Font.register({
  family: 'Sarabun',
  fonts: [
    { 
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/sarabun/files/sarabun-thai-400-normal.woff' 
    },
    { 
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/sarabun/files/sarabun-thai-700-normal.woff', 
      fontWeight: 'bold' 
    }
  ]
});

const styles = StyleSheet.create({
  page: { 
    padding: 30, 
    fontSize: 10, 
    fontFamily: 'Sarabun' // <--- 2. เปลี่ยนจาก Helvetica เป็น Sarabun
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#111', paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold' },
  subTitle: { fontSize: 10, color: '#666' },
  section: { marginVertical: 10 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', backgroundColor: '#eee', padding: 4, marginBottom: 5 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 4 },
  label: { width: '30%', fontWeight: 'bold', color: '#444' },
  value: { width: '70%' },
  imageContainer: { height: 200, marginVertical: 10, alignItems: 'center' },
  image: { height: '100%', objectFit: 'contain' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '50%', padding: 4 },
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between' },
  signatureBox: { borderTopWidth: 1, borderColor: '#000', width: '40%', paddingTop: 5, marginTop: 40, textAlign: 'center' },
  statusPass: { color: 'green', fontWeight: 'bold' },
  statusFail: { color: 'red', fontWeight: 'bold' },
});

interface ReportProps {
  data: QCResult;
  meta: ReportMeta;
  imageSrc: string | null;
}

export const QCReportDocument = ({ data, meta, imageSrc }: ReportProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>QA/QC INSPECTION REPORT</Text>
          <Text style={styles.subTitle}>Spectra-Q Automated Analysis System</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text>Date: {new Date(data.timestamp).toLocaleDateString('th-TH')}</Text>
          <Text>Time: {new Date(data.timestamp).toLocaleTimeString('th-TH')}</Text>
          <Text>Report ID: #{Math.floor(Math.random() * 10000)}</Text>
        </View>
      </View>

      {/* 1. Project & Activity Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. PROJECT DETAILS & ACTIVITY (รายละเอียดโครงการ)</Text>
        <View style={styles.row}><Text style={styles.label}>Project Name:</Text><Text style={styles.value}>{meta.project}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Location/Site:</Text><Text style={styles.value}>{meta.location}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Activity On-going:</Text><Text style={styles.value}>{meta.activity}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Materials Delivered:</Text><Text style={styles.value}>{meta.materials}</Text></View>
      </View>

      {/* 2. Resources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. RESOURCES & SAFETY (ทรัพยากรและความปลอดภัย)</Text>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
             <Text style={styles.label}>Labor Hours:</Text><Text>{meta.laborHours}</Text>
          </View>
          <View style={styles.gridItem}>
             <Text style={styles.label}>Equipment:</Text><Text>{meta.equipment}</Text>
          </View>
          <View style={styles.gridItem}>
             <Text style={styles.label}>Accident Report:</Text><Text>{meta.accidents}</Text>
          </View>
        </View>
      </View>

      {/* 3. AI Inspection Results */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. AI INSPECTION FINDINGS (ผลการตรวจสอบ AI)</Text>
        <View style={styles.row}>
           <Text style={styles.label}>Overall Status:</Text>
           <Text style={data.status === 'PASS' ? styles.statusPass : styles.statusFail}>{data.status} (Confidence: {(data.confidence * 100).toFixed(1)}%)</Text>
        </View>
        
        {data.status === 'REJECT' && (
          <View>
            <View style={styles.row}><Text style={styles.label}>Defects Found:</Text><Text style={styles.value}>{data.defects.join(', ')}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Root Cause:</Text><Text style={styles.value}>{data.root_cause}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Severity:</Text><Text style={styles.value}>{data.severity}</Text></View>
          </View>
        )}
        
        <View style={{ marginTop: 5 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>Reasoning (เหตุผลการวิเคราะห์):</Text>
          <Text style={{ color: '#444' }}>{data.reasoning}</Text>
        </View>

        <View style={{ marginTop: 5 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>Recommended Actions (ข้อแนะนำ):</Text>
          {data.solution.recommended_actions.map((action: string, i: number) => (
             <Text key={i}>- {action}</Text>
          ))}
        </View>
      </View>

      {/* 4. Visual Evidence */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. VISUAL EVIDENCE (หลักฐานภาพถ่าย)</Text>
        {imageSrc && (
          <View style={styles.imageContainer}>
            <Image src={imageSrc} style={styles.image} />
            <Text style={{ fontSize: 8, marginTop: 4, color: '#888' }}>Capture Source: Production Line Camera Feed</Text>
          </View>
        )}
      </View>

      {/* Signatures */}
      <View style={styles.footer}>
        <View style={styles.signatureBox}>
          <Text>{meta.inspector}</Text>
          <Text style={{ fontSize: 8, color: '#888', marginTop: 2 }}>QC Inspector Signature</Text>
        </View>
        <View style={styles.signatureBox}>
          <Text>Spectra-Q AI Agent</Text>
          <Text style={{ fontSize: 8, color: '#888', marginTop: 2 }}>Automated Verification</Text>
        </View>
      </View>

    </Page>
  </Document>
);