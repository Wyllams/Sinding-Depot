"use client";

import { useRef, useState } from "react";

// ─── Exported Types ────────────────────────────────────────────────────────────

export type MilestonePaymentMethod = "cash" | "check" | "credit_card" | "financing" | "zelle";

export interface ContractLineItem {
  title: string;
  description?: string;
  amount: number;
}

export interface ContractFormData {
  id: string;
  documentType: "job_start" | "completion_certificate";
  status: "draft" | "pending_signature" | "signed" | "paid";
  title: string;
  sortOrder: number;
  contractDate: string;
  homeownerName: string;
  address: string;
  phone: string;
  salesRepName: string;
  lineItems: ContractLineItem[];
  contractAmount: number;
  existingInitials?: string;
  existingCustomerNotes?: string;
  existingSignatureDataUrl?: string;
}

interface DynamicContractFormProps {
  data: ContractFormData;
  onSign: (payload: {
    milestoneId: string;
    initials?: string;
    customerNotes?: string;
    signatureDataUrl: string;
    paymentMethod: MilestonePaymentMethod;
  }) => Promise<void>;
  readOnly?: boolean;
}

const PAYMENT_LABELS: Record<MilestonePaymentMethod, string> = {
  cash: "Cash",
  check: "Check",
  credit_card: "Credit Card",
  financing: "Financing",
  zelle: "Zelle",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DynamicContractForm({
  data,
  onSign,
  readOnly = false,
}: DynamicContractFormProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!data.existingSignatureDataUrl);
  const [initials, setInitials] = useState(data.existingInitials ?? "");
  const [notes, setNotes] = useState(data.existingCustomerNotes ?? "");
  const [paymentMethod, setPaymentMethod] = useState<MilestonePaymentMethod>("check");
  const [submitting, setSubmitting] = useState(false);
  const [sigError, setSigError] = useState("");

  const alreadySigned = data.status === "signed" || data.status === "paid";

  // ── Canvas drawing helpers ─────────────────────────────────────
  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly || alreadySigned) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    setSigError("");
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDraw = () => setDrawing(false);

  const clearSig = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!hasSignature) {
      setSigError("A assinatura é obrigatória para continuar.");
      return;
    }
    const canvas = canvasRef.current;
    const signatureDataUrl = canvas ? canvas.toDataURL("image/png") : "";

    try {
      setSubmitting(true);
      await onSign({
        milestoneId: data.id,
        initials: initials.trim() || undefined,
        customerNotes: notes.trim() || undefined,
        signatureDataUrl,
        paymentMethod,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={formWrap}>
      {/* Document Header */}
      <div style={docHeader}>
        <h1 style={docTitle}>
          {data.documentType === "job_start"
            ? "Job Start Certificate"
            : "Certificate of Completion"}
        </h1>
        <p style={docSubtitle}>Document {data.sortOrder} · {data.contractDate}</p>
      </div>

      {/* Customer Info */}
      <section style={section}>
        <h2 style={sectionTitle}>Customer Information</h2>
        <div style={infoGrid}>
          <InfoRow label="Homeowner" value={data.homeownerName} />
          <InfoRow label="Property Address" value={data.address} />
          <InfoRow label="Phone" value={data.phone} />
          <InfoRow label="Sales Representative" value={data.salesRepName} />
        </div>
      </section>

      <hr style={divider} />

      {/* Line Items */}
      <section style={section}>
        <h2 style={sectionTitle}>Scope of Work</h2>
        <div style={lineItemsWrap}>
          {data.lineItems.map((item, i) => (
            <div key={i} style={lineItemRow}>
              <div>
                <p style={lineItemName}>{item.title}</p>
                {item.description && (
                  <p style={lineItemDesc}>{item.description}</p>
                )}
              </div>
              <p style={lineItemAmount}>{fmt(item.amount)}</p>
            </div>
          ))}
          <div style={totalRow}>
            <span style={totalLabel}>Total</span>
            <span style={totalAmount}>{fmt(data.contractAmount)}</span>
          </div>
        </div>
      </section>

      <hr style={divider} />

      {/* Payment Method */}
      {!alreadySigned && !readOnly && (
        <section style={section}>
          <h2 style={sectionTitle}>Payment Method</h2>
          <div style={paymentGrid}>
            {(Object.keys(PAYMENT_LABELS) as MilestonePaymentMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                style={{
                  ...paymentBtn,
                  ...(paymentMethod === m ? paymentBtnActive : {}),
                }}
              >
                {PAYMENT_LABELS[m]}
              </button>
            ))}
          </div>
        </section>
      )}

      {alreadySigned && data.existingSignatureDataUrl && (
        <section style={section}>
          <h2 style={sectionTitle}>Payment Method</h2>
          <p style={infoValue}>{PAYMENT_LABELS[paymentMethod]}</p>
        </section>
      )}

      <hr style={divider} />

      {/* Marketing Authorization Initials */}
      {data.documentType === "job_start" && (
        <>
          <section style={section}>
            <h2 style={sectionTitle}>Marketing Authorization</h2>
            <p style={clauseText}>
              I authorize Siding Depot LLC to use photos and/or videos of the work
              performed at my property for marketing purposes, including social media and
              website content.
            </p>
            <div style={initialsWrap}>
              <label style={fieldLabel}>Initials (optional)</label>
              <input
                type="text"
                maxLength={5}
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                disabled={readOnly || alreadySigned}
                placeholder="e.g. J.D."
                style={initialsInput}
              />
            </div>
          </section>
          <hr style={divider} />
        </>
      )}

      {/* Customer Notes */}
      <section style={section}>
        <h2 style={sectionTitle}>Customer Notes</h2>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={readOnly || alreadySigned}
          placeholder="Any comments or concerns before signing..."
          style={notesInput}
        />
      </section>

      <hr style={divider} />

      {/* Signature */}
      <section style={section}>
        <h2 style={sectionTitle}>Signature</h2>
        {alreadySigned && data.existingSignatureDataUrl ? (
          <div style={signedImgWrap}>
            <img
              src={data.existingSignatureDataUrl}
              alt="Assinatura"
              style={{ maxHeight: 80, objectFit: "contain" }}
            />
            <p style={signedAt}>
              Signed on {data.contractDate}
            </p>
          </div>
        ) : (
          <>
            <p style={sigInstructions}>
              By signing below, you confirm all work described has been completed to your
              satisfaction and authorize payment.
            </p>
            <div style={canvasWrap}>
              <canvas
                ref={canvasRef}
                width={640}
                height={160}
                style={canvasStyle}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              <p style={canvasLabel}>Sign above</p>
              {!readOnly && (
                <button type="button" onClick={clearSig} style={clearBtn}>
                  Clear
                </button>
              )}
            </div>
            {sigError && <p style={errorMsg}>{sigError}</p>}
          </>
        )}
      </section>

      {/* Submit */}
      {!alreadySigned && !readOnly && (
        <div style={submitWrap}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={submitBtn}
          >
            {submitting ? "Saving…" : "Sign & Submit Document"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoRowStyle}>
      <span style={infoLabel}>{label}</span>
      <span style={infoValue}>{value}</span>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const formWrap: React.CSSProperties = {
  background: "#0f1117",
  border: "1px solid #1e2130",
  borderRadius: 16,
  overflow: "hidden",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const docHeader: React.CSSProperties = {
  padding: "28px 28px 20px",
  borderBottom: "1px solid #1e2130",
  background: "linear-gradient(135deg, #0f1117, #151b28)",
};

const docTitle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "#f1f5f9",
  letterSpacing: "-0.02em",
};

const docSubtitle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: "0.78rem",
  color: "#475569",
};

const section: React.CSSProperties = {
  padding: "20px 28px",
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: "0.7rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#aeee2a",
};

const divider: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #1e2130",
  margin: 0,
};

const infoGrid: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const infoRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 8,
};

const infoLabel: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "#64748b",
  flexShrink: 0,
};

const infoValue: React.CSSProperties = {
  fontSize: "0.82rem",
  fontWeight: 600,
  color: "#e2e8f0",
  textAlign: "right",
};

const lineItemsWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const lineItemRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const lineItemName: React.CSSProperties = {
  margin: 0,
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#e2e8f0",
};

const lineItemDesc: React.CSSProperties = {
  margin: "2px 0 0",
  fontSize: "0.75rem",
  color: "#64748b",
};

const lineItemAmount: React.CSSProperties = {
  margin: 0,
  fontSize: "0.85rem",
  fontWeight: 700,
  color: "#f1f5f9",
  whiteSpace: "nowrap",
};

const totalRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderTop: "1px solid #1e2130",
  paddingTop: 12,
  marginTop: 4,
};

const totalLabel: React.CSSProperties = {
  fontSize: "0.82rem",
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const totalAmount: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 800,
  color: "#aeee2a",
};

const paymentGrid: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const paymentBtn: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 100,
  border: "1px solid #1e2130",
  background: "transparent",
  color: "#64748b",
  fontSize: "0.78rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s",
};

const paymentBtnActive: React.CSSProperties = {
  border: "1px solid #aeee2a",
  background: "rgba(174, 238, 42, 0.08)",
  color: "#aeee2a",
};

const clauseText: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#64748b",
  lineHeight: 1.6,
  margin: "0 0 14px",
};

const initialsWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  maxWidth: 160,
};

const fieldLabel: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "#475569",
  fontWeight: 600,
};

const initialsInput: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #1e2130",
  background: "#080b10",
  color: "#f1f5f9",
  fontSize: "0.9rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textAlign: "center",
  outline: "none",
};

const notesInput: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: 10,
  border: "1px solid #1e2130",
  background: "#080b10",
  color: "#e2e8f0",
  fontSize: "0.82rem",
  lineHeight: 1.6,
  resize: "vertical",
  outline: "none",
  boxSizing: "border-box",
};

const sigInstructions: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "#475569",
  lineHeight: 1.6,
  margin: "0 0 14px",
};

const canvasWrap: React.CSSProperties = {
  position: "relative",
  background: "#ffffff",
  borderRadius: 12,
  overflow: "hidden",
  border: "1px solid #1e2130",
};

const canvasStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: 160,
  touchAction: "none",
  cursor: "crosshair",
};

const canvasLabel: React.CSSProperties = {
  position: "absolute",
  bottom: 8,
  left: "50%",
  transform: "translateX(-50%)",
  fontSize: "0.7rem",
  color: "#cbd5e1",
  pointerEvents: "none",
  margin: 0,
};

const clearBtn: React.CSSProperties = {
  position: "absolute",
  top: 8,
  right: 10,
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  background: "transparent",
  color: "#64748b",
  fontSize: "0.72rem",
  cursor: "pointer",
};

const errorMsg: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "0.78rem",
  color: "#f87171",
};

const signedImgWrap: React.CSSProperties = {
  padding: "16px",
  background: "#ffffff",
  borderRadius: 12,
  border: "1px solid #1e2130",
  display: "inline-block",
};

const signedAt: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "0.72rem",
  color: "#64748b",
  textAlign: "center",
};

const submitWrap: React.CSSProperties = {
  padding: "0 28px 28px",
};

const submitBtn: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: 12,
  border: "none",
  background: "#aeee2a",
  color: "#0f1117",
  fontSize: "0.9rem",
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "-0.01em",
};
