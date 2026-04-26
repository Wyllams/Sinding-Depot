"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import styles from "./DynamicContractForm.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MilestoneDocumentType = "job_start" | "completion_certificate";
export type MilestonePaymentStatus =
  | "draft"
  | "pending_signature"
  | "signed"
  | "paid";
export type MilestonePaymentMethod = "check" | "financing" | "credit_card";

export interface ServiceLineItem {
  title: string;
  description?: string;
  amount: number;
}

export interface ContractFormData {
  id: string;
  documentType: MilestoneDocumentType;
  status: MilestonePaymentStatus;
  title: string;
  sortOrder: number;

  // Auto-filled from DB
  contractDate: string;         // e.g. "April 13, 2026"
  homeownerName: string;
  address: string;
  phone: string;
  salesRepName: string;

  // Payment schedule
  lineItems: ServiceLineItem[]; // 1..N services for this milestone
  contractAmount: number;

  // Pre-filled customer data (if any)
  existingInitials?: string;    // job_start only
  existingCustomerNotes?: string; // completion_certificate only
  existingSignatureDataUrl?: string;
}

const CONSENT_TEXT =
  "By signing below, I acknowledge that I have reviewed this document in its entirety. " +
  "I understand that my electronic signature is legally binding and has the same legal effect " +
  "as a handwritten signature under federal (ESIGN Act) and Georgia (UETA) law. " +
  "I consent to conduct this transaction electronically.";

export interface DynamicContractFormProps {
  data: ContractFormData;
  /** Called when customer submits signature */
  onSign: (payload: {
    milestoneId: string;
    initials?: string;
    customerNotes?: string;
    signatureDataUrl: string;
    paymentMethod: MilestonePaymentMethod;
    consentAcceptedAt: string;
    consentText: string;
    userAgent: string;
    geolocation?: { lat: number; lng: number; accuracy_meters?: number } | null;
  }) => Promise<void>;
  /** Read-only mode (e.g. already signed) */
  readOnly?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// ─── Signature Pad ────────────────────────────────────────────────────────────

interface SignaturePadProps {
  onCapture: (dataUrl: string) => void;
  readOnly?: boolean;
  existingDataUrl?: string;
}

function SignaturePad({ onCapture, readOnly, existingDataUrl }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(!!existingDataUrl);

  useEffect(() => {
    if (existingDataUrl && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current!.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0);
      };
      img.src = existingDataUrl;
      setHasSignature(true);
    }
  }, [existingDataUrl]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    // Scale from CSS (visual) coordinates to canvas (internal) coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return {
        x: (t.clientX - rect.left) * scaleX,
        y: (t.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly || !canvasRef.current) return;
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d")!;
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [readOnly]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current || readOnly || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d")!;
    const pos = getPos(e, canvasRef.current);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#f8fafc";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [readOnly]);

  const endDraw = useCallback(() => {
    if (!drawing.current || !canvasRef.current) return;
    drawing.current = false;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setHasSignature(true);
    onCapture(dataUrl);
  }, [onCapture]);

  const clear = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
    onCapture("");
  };

  return (
    <div className={styles.signaturePadWrapper}>
      <canvas
        ref={canvasRef}
        width={520}
        height={160}
        className={styles.signatureCanvas}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      {!readOnly && (
        <button type="button" onClick={clear} className={styles.clearBtn}>
          Clear
        </button>
      )}
      {!hasSignature && !readOnly && (
        <span className={styles.signaturePlaceholder}>Sign here</span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DynamicContractForm({
  data,
  onSign,
  readOnly = false,
}: DynamicContractFormProps) {
  const isJobStart = data.documentType === "job_start";
  const isSigned = data.status === "signed" || data.status === "paid";
  const effectiveReadOnly = readOnly || isSigned;

  const [initials, setInitials] = useState(data.existingInitials ?? "");
  const [customerNotes, setCustomerNotes] = useState(data.existingCustomerNotes ?? "");
  const [signatureDataUrl, setSignatureDataUrl] = useState(data.existingSignatureDataUrl ?? "");
  const [paymentMethod, setPaymentMethod] = useState<MilestonePaymentMethod>("check");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentAcceptedAt, setConsentAcceptedAt] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number; accuracy_meters?: number } | null>(null);

  // Capture geolocation on mount (optional — user can deny)
  useEffect(() => {
    if (effectiveReadOnly) return;
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeo({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy_meters: Math.round(pos.coords.accuracy),
          });
        },
        () => { /* denied or unavailable — geo stays null, signature still valid */ }
      );
    }
  }, [effectiveReadOnly]);

  const canSubmit =
    !effectiveReadOnly &&
    signatureDataUrl.length > 0 &&
    consentAccepted &&
    (!isJobStart || initials.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSign({
        milestoneId: data.id,
        initials: isJobStart ? initials.trim() : undefined,
        customerNotes: !isJobStart ? customerNotes : undefined,
        signatureDataUrl,
        paymentMethod,
        consentAcceptedAt: consentAcceptedAt || new Date().toISOString(),
        consentText: CONSENT_TEXT,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        geolocation: geo,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar assinatura.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.formWrapper} onSubmit={handleSubmit} aria-label={data.title}>
      {/* ── HEADER ──────────────────────────────────────────── */}
      <div className={styles.documentHeader}>
        <div className={styles.docTitle}>
          {isJobStart ? "JOB START CERTIFICATE" : "CERTIFICATE OF COMPLETION"}
        </div>
        <div className={styles.companyInfo}>
          <span>2480 Sandy Plains Road</span>
          <span className={styles.sep}>·</span>
          <span>Office: 678-400-2004</span>
          <span className={styles.sep}>·</span>
          <span>www.sidingdepot.com</span>
        </div>
        <div className={styles.companyInfo}>
          Marietta, GA 30066
          <span className={styles.sep}>·</span>
          office@sidingdepot.com
        </div>
      </div>

      {/* ── STATUS BADGE ────────────────────────────────────── */}
      <div className={styles.statusRow}>
        <span className={`${styles.statusBadge} ${styles[`badge_${data.status}`]}`}>
          {data.status === "draft" && "Aguardando envio"}
          {data.status === "pending_signature" && "Aguardando Assinatura"}
          {data.status === "signed" && "✓ Assinado"}
          {data.status === "paid" && "✓ Pago"}
        </span>
      </div>

      {/* ── JOB INFO ─────────────────────────────────────────── */}
      <div className={styles.infoGrid}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>CONTRACT DATE:</span>
          <span className={styles.infoValue}>{data.contractDate}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>HOMEOWNER:</span>
          <span className={styles.infoValue}>{data.homeownerName}</span>
          <span className={styles.infoLabel} style={{ marginLeft: "auto" }}>SALES REPRESENTATIVE:</span>
          <span className={styles.infoValue}>{data.salesRepName}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>ADDRESS:</span>
          <span className={styles.infoValue}>{data.address}</span>
          <span className={styles.infoLabel} style={{ marginLeft: "auto" }}>PHONE:</span>
          <span className={styles.infoValue}>678-400-2004</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>PHONE:</span>
          <span className={styles.infoValue}>{data.phone}</span>
        </div>
      </div>

      {/* ── PROGRESS PAYMENT SCHEDULE ───────────────────────── */}
      <div className={styles.scheduleBlock}>
        <div className={styles.scheduleHeader}>
          <span>PROGRESS PAYMENT SCHEDULE</span>
          <span>AMOUNT</span>
        </div>
        {data.lineItems.map((item, idx) => (
          <div key={idx} className={styles.scheduleRow}>
            <div className={styles.scheduleService}>
              <span className={styles.serviceName}>{item.title}</span>
              {item.description && (
                <span className={styles.serviceDesc}>{item.description}</span>
              )}
            </div>
            <span className={styles.serviceAmount}>{formatUSD(item.amount)}</span>
          </div>
        ))}
        <div className={styles.scheduleTotalRow}>
          <span>CONTRACT AMOUNT</span>
          <span className={styles.totalAmount}>{formatUSD(data.contractAmount)}</span>
        </div>
      </div>

      {/* ── PAYMENT METHOD ───────────────────────────────────── */}
      <div className={styles.paymentBlock}>
        <label className={styles.paymentOption}>
          <input
            type="radio"
            name="paymentMethod"
            value="check"
            checked={paymentMethod === "check"}
            onChange={() => setPaymentMethod("check")}
            disabled={effectiveReadOnly}
          />
          <span>CHECK #: _______________________ &nbsp;&nbsp; CHECK AMOUNT: _______________________</span>
        </label>
        <label className={styles.paymentOption}>
          <input
            type="radio"
            name="paymentMethod"
            value="financing"
            checked={paymentMethod === "financing"}
            onChange={() => setPaymentMethod("financing")}
            disabled={effectiveReadOnly}
          />
          <span>FINANCING</span>
        </label>
        <label className={styles.paymentOption}>
          <input
            type="radio"
            name="paymentMethod"
            value="credit_card"
            checked={paymentMethod === "credit_card"}
            onChange={() => setPaymentMethod("credit_card")}
            disabled={effectiveReadOnly}
          />
          <span>DEBIT CARD / CREDIT CARD – Please call office for payment.</span>
        </label>
        <p className={styles.cardFeeNotice}>
          AN ADDITIONAL 3% TRANSACTION FEE WILL APPLY ON ALL DEBIT / CREDIT CARD PAYMENTS
        </p>
      </div>

      {/* ── CLAUSES ─────────────────────────────────────────── */}
      <ol className={styles.clauseList}>
        <li>FRIENDLY REMINDER: THE AGREED AMOUNT IS DUE AT THE COMPLETION OF EACH PORTION OF THE PROJECT.</li>
        <li>THIS DRAW SCHEDULE DOES NOT INCLUDE ADDITIONAL SERVICE COST.</li>
        <li>PAYMENTS ARE FOR COMPLETED TASKS ONLY AND WILL BE APPLIED TOWARDS TOTAL CONTRACT AMOUNT.</li>
      </ol>

      {/* ── CUSTOMER COMMENTS (COC only) ─────────────────────── */}
      {!isJobStart && (
        <div className={styles.commentsBlock}>
          <p className={styles.commentsLabel}>Customer Comments</p>
          <p className={styles.commentsSubLabel}>
            PLEASE NOTE ADDITIONAL COMMENTS BELOW, INCLUDING ANY OPEN ITEMS STILL TO BE COMPLETED:
          </p>
          <textarea
            className={styles.commentsTextarea}
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            disabled={effectiveReadOnly}
            rows={4}
            placeholder="Comentários ou itens pendentes (opcional)"
            aria-label="Customer comments"
          />
          <p className={styles.satisfactionClause}>
            THE PROJECT MENTIONED ABOVE HAS BEEN COMPLETED TO MY SATISFACTION,
            SUBJECT TO THE OPEN ITEMS LISTED ABOVE.
          </p>
        </div>
      )}

      {/* ── MARKETING AUTHORIZATION (Job Start only) ─────────── */}
      {isJobStart && (
        <div className={styles.marketingBlock}>
          <p className={styles.marketingText}>
            "I authorize Siding Depot to use photographs of my home for marketing and
            promotional purposes. No personal or identifying information will be shared."
          </p>
          <div className={styles.initialsRow}>
            <label htmlFor="initials" className={styles.initialsLabel}>Initials:</label>
            <input
              id="initials"
              type="text"
              maxLength={5}
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase())}
              disabled={effectiveReadOnly}
              className={styles.initialsInput}
              placeholder="___"
              aria-label="Customer initials for marketing authorization"
            />
          </div>
        </div>
      )}

      {/* ── LEGAL CONSENT (required before signing) ────────── */}
      {!effectiveReadOnly && (
        <div className={styles.consentBlock}>
          <label className={styles.consentLabel}>
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => {
                setConsentAccepted(e.target.checked);
                if (e.target.checked) setConsentAcceptedAt(new Date().toISOString());
              }}
              className={styles.consentCheckbox}
              aria-label="Legal consent for electronic signature"
            />
            <span className={styles.consentText}>{CONSENT_TEXT}</span>
          </label>
        </div>
      )}

      {/* ── SIGNATURE ───────────────────────────────────────── */}
      <div className={styles.signatureBlock}>
        <div className={styles.signatureLabel}>HOMEOWNER SIGNATURE:</div>
        <SignaturePad
          onCapture={setSignatureDataUrl}
          readOnly={effectiveReadOnly}
          existingDataUrl={data.existingSignatureDataUrl}
        />
        <div className={styles.signatureDateRow}>
          <span className={styles.signatureDateLabel}>DATE:</span>
          <span className={styles.signatureDateValue}>
            {isSigned ? data.contractDate : (() => { const _d = new Date(); return `${(_d.getMonth() + 1).toString().padStart(2, '0')}/${_d.getDate().toString().padStart(2, '0')}/${_d.getFullYear()}`; })()}
          </span>
        </div>
      </div>

      {/* ── ERROR ───────────────────────────────────────────── */}
      {error && <p className={styles.errorMsg} role="alert">{error}</p>}

      {/* ── SUBMIT ──────────────────────────────────────────── */}
      {!effectiveReadOnly && (
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!canSubmit || submitting}
          aria-busy={submitting}
        >
          {submitting
            ? "Salvando..."
            : isJobStart
            ? "Confirmar e Assinar Job Start Certificate"
            : "Confirmar e Assinar Certificate of Completion"}
        </button>
      )}

      {isSigned && (
        <div className={styles.signedBanner}>
          ✓ Documento assinado em{" "}
          {data.contractDate}
        </div>
      )}
    </form>
  );
}
