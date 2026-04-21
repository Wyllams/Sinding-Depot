import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

// ── Types ────────────────────────────────────────────────────
export interface SignedDocumentPDFData {
  title: string;
  documentType: "job_start" | "completion_certificate";
  customerName: string;
  address: string;
  phone: string;
  salesRepName: string;
  amount: number;
  signedAt: string;
  signatureDataUrl: string;
  paymentMethod: string;
  documentHash: string;
  consentText: string;
  ipAddress: string;
  userAgent: string;
  geolocation?: { lat: number; lng: number; accuracy_meters?: number } | null;
}

// ── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  // Header
  header: {
    borderBottom: "2px solid #1a1a1a",
    paddingBottom: 12,
    marginBottom: 16,
    textAlign: "center",
  },
  companyName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 8,
    color: "#666666",
    lineHeight: 1.6,
  },
  // Title
  docTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 20,
    marginTop: 8,
    padding: "8px 0",
    backgroundColor: "#f5f5f5",
  },
  // Info grid
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  infoCell: {
    width: "50%",
    paddingVertical: 4,
    paddingRight: 12,
  },
  infoLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  // Amount
  amountBlock: {
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    padding: "12px 16px",
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#666666",
    letterSpacing: 0.8,
  },
  amountValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  // Payment
  paymentRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  paymentLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#888888",
    textTransform: "uppercase",
  },
  paymentValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    textTransform: "uppercase",
  },
  // Consent
  consentBlock: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: "#fafafa",
    borderLeft: "3px solid #cccccc",
  },
  consentTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#888888",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.6,
  },
  consentText: {
    fontSize: 8,
    color: "#555555",
    lineHeight: 1.6,
    fontStyle: "italic",
  },
  // Signature
  signatureBlock: {
    marginTop: 8,
    marginBottom: 16,
    borderTop: "1px solid #e0e0e0",
    paddingTop: 12,
  },
  signatureLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  signatureImage: {
    width: 200,
    height: 60,
    objectFit: "contain",
    marginBottom: 4,
  },
  signatureLine: {
    borderBottom: "1px solid #1a1a1a",
    width: 250,
    marginBottom: 4,
  },
  signatureDate: {
    fontSize: 8,
    color: "#888888",
  },
  // Audit trail
  auditBlock: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 4,
    border: "1px solid #e8e8e8",
  },
  auditTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  auditRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  auditLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#999999",
    width: 100,
  },
  auditValue: {
    fontSize: 7,
    color: "#555555",
    flex: 1,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1px solid #e0e0e0",
    paddingTop: 8,
    textAlign: "center",
    fontSize: 7,
    color: "#aaaaaa",
  },
});

// ── PDF Component ────────────────────────────────────────────
function SignedDocumentPDF({
  data,
}: {
  data: SignedDocumentPDFData;
}): React.ReactElement {
  const fmtDate = (iso: string): string => {
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return "—";
    const date = `${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')}/${dt.getFullYear()}`;
    const time = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
    return `${date} ${time}`;
  };

  const fmtAmount = (n: number): string =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const paymentLabel: Record<string, string> = {
    check: "Check",
    financing: "Financing",
    credit_card: "Credit Card (3% fee applies)",
  };

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.companyName}>SIDING DEPOT</Text>
          <Text style={s.companyInfo}>
            2480 Sandy Plains Road · Marietta, GA 30066 · (678) 400-2004 ·
            office@sidingdepot.com
          </Text>
        </View>

        {/* Document Title */}
        <Text style={s.docTitle}>{data.title}</Text>

        {/* Info Grid */}
        <View style={s.infoGrid}>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Homeowner</Text>
            <Text style={s.infoValue}>{data.customerName}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Sales Representative</Text>
            <Text style={s.infoValue}>{data.salesRepName}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Service Address</Text>
            <Text style={s.infoValue}>{data.address}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Phone</Text>
            <Text style={s.infoValue}>{data.phone}</Text>
          </View>
        </View>

        {/* Amount */}
        <View style={s.amountBlock}>
          <Text style={s.amountLabel}>
            {data.documentType === "job_start"
              ? "Total Contract Amount"
              : "Service Amount"}
          </Text>
          <Text style={s.amountValue}>{fmtAmount(data.amount)}</Text>
        </View>

        {/* Payment Method */}
        <View style={s.paymentRow}>
          <Text style={s.paymentLabel}>Payment Method: </Text>
          <Text style={s.paymentValue}>
            {paymentLabel[data.paymentMethod] ?? data.paymentMethod}
          </Text>
        </View>

        {/* Consent */}
        <View style={s.consentBlock}>
          <Text style={s.consentTitle}>Electronic Consent Accepted</Text>
          <Text style={s.consentText}>{data.consentText}</Text>
        </View>

        {/* Signature */}
        <View style={s.signatureBlock}>
          <Text style={s.signatureLabel}>Homeowner Signature</Text>
          {data.signatureDataUrl && (
            <Image src={data.signatureDataUrl} style={s.signatureImage} />
          )}
          <View style={s.signatureLine} />
          <Text style={s.signatureDate}>
            Signed on: {fmtDate(data.signedAt)}
          </Text>
        </View>

        {/* Audit Trail */}
        <View style={s.auditBlock}>
          <Text style={s.auditTitle}>
            Digital Signature Audit Trail (ESIGN Act / Georgia UETA)
          </Text>
          <View style={s.auditRow}>
            <Text style={s.auditLabel}>Timestamp</Text>
            <Text style={s.auditValue}>{fmtDate(data.signedAt)}</Text>
          </View>
          <View style={s.auditRow}>
            <Text style={s.auditLabel}>IP Address</Text>
            <Text style={s.auditValue}>{data.ipAddress}</Text>
          </View>
          <View style={s.auditRow}>
            <Text style={s.auditLabel}>User Agent</Text>
            <Text style={s.auditValue}>{data.userAgent}</Text>
          </View>
          {data.geolocation && (
            <View style={s.auditRow}>
              <Text style={s.auditLabel}>Geolocation</Text>
              <Text style={s.auditValue}>
                {data.geolocation.lat.toFixed(6)},{" "}
                {data.geolocation.lng.toFixed(6)} (±
                {data.geolocation.accuracy_meters ?? "?"}m)
              </Text>
            </View>
          )}
          <View style={s.auditRow}>
            <Text style={s.auditLabel}>Document Hash</Text>
            <Text style={s.auditValue}>SHA-256: {data.documentHash}</Text>
          </View>
          <View style={s.auditRow}>
            <Text style={s.auditLabel}>Method</Text>
            <Text style={s.auditValue}>
              Canvas touch/mouse draw — electronic signature
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={s.footer}>
          This document was electronically signed using Siding Depot's secure
          digital signature system. It is legally binding under the Electronic
          Signatures in Global and National Commerce Act (ESIGN, 15 U.S.C. §
          7001) and the Georgia Uniform Electronic Transactions Act (O.C.G.A. §
          10-12-1 et seq.).
        </Text>
      </Page>
    </Document>
  );
}

// ── Render to Buffer ─────────────────────────────────────────
export async function generateSignedPDF(
  data: SignedDocumentPDFData
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <SignedDocumentPDF data={data} />
  );
  return Buffer.from(buffer);
}
