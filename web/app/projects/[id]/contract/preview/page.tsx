"use client";

import DynamicContractForm, {
  ContractFormData,
  MilestonePaymentMethod,
} from "@/components/DynamicContractForm";
import { useState } from "react";

// ─── Mock data ────────────────────────────────────────────────

const JOB_START_MOCK: ContractFormData = {
  id: "preview-job-start",
  documentType: "job_start",
  status: "pending_signature",
  title: "Job Start — Siding",
  sortOrder: 1,
  contractDate: "April 13, 2026",
  homeownerName: "Michael & Sarah Thompson",
  address: "2280 Peachtree Rd NW, Atlanta, GA 30309",
  phone: "(404) 555-0192",
  salesRepName: "Nick Garner",
  lineItems: [
    {
      title: "Siding Installation — Deposit",
      description: "HardiePlank® Lap Siding, 2,400 sq ft. Job start payment.",
      amount: 8500,
    },
    {
      title: "Windows Deposit",
      description: "Andersen 400 Series — 14 units. 50% deposit.",
      amount: 6200,
    },
  ],
  contractAmount: 14700,
};

const COC_MOCK: ContractFormData = {
  id: "preview-coc",
  documentType: "completion_certificate",
  status: "pending_signature",
  title: "Certificate of Completion — Siding",
  sortOrder: 3,
  contractDate: "April 13, 2026",
  homeownerName: "Michael & Sarah Thompson",
  address: "2280 Peachtree Rd NW, Atlanta, GA 30309",
  phone: "(404) 555-0192",
  salesRepName: "Nick Garner",
  lineItems: [
    {
      title: "Siding Installation — Final Payment",
      description: "HardiePlank® Lap Siding, 2,400 sq ft. Project completed.",
      amount: 8500,
    },
    {
      title: "Windows Installation — Final Payment",
      description: "Andersen 400 Series — 14 units. All installed and inspected.",
      amount: 6200,
    },
    {
      title: "Gutters Installation",
      description: "Seamless aluminum gutters, 180 linear ft.",
      amount: 3100,
    },
  ],
  contractAmount: 17800,
};

const SIGNED_MOCK: ContractFormData = {
  ...JOB_START_MOCK,
  id: "preview-signed",
  status: "signed",
  existingInitials: "MT",
  existingSignatureDataUrl: "",
};

// ─── Page ─────────────────────────────────────────────────────

type Tab = "job_start" | "coc" | "signed";

export default function ContractPreviewPage() {
  const [activeTab, setActiveTab] = useState<Tab>("job_start");
  const [signedLocally, setSignedLocally] = useState(false);

  const handleSign = async (payload: {
    milestoneId: string;
    initials?: string;
    customerNotes?: string;
    signatureDataUrl: string;
    paymentMethod: MilestonePaymentMethod;
  }) => {
    // simulação de 1s de "salvando"
    await new Promise((r) => setTimeout(r, 1000));
    setSignedLocally(true);
    console.log("Assinatura capturada (preview):", payload);
  };

  const currentData = (): ContractFormData => {
    if (activeTab === "job_start")
      return { ...JOB_START_MOCK, status: signedLocally ? "signed" : "pending_signature" };
    if (activeTab === "coc") return COC_MOCK;
    return SIGNED_MOCK;
  };

  return (
    <div style={pageStyle}>
      {/* ── Banner de preview ──────────────────────────────── */}
      <div style={bannerStyle}>
        <span style={bannerIcon}>🧪</span>
        <span>
          <strong>Modo Preview</strong> — Esta tela simula exatamente o que o
          cliente vê ao receber o link de assinatura.
        </span>
      </div>

      {/* ── Tab switcher ───────────────────────────────────── */}
      <div style={tabBarStyle}>
        <TabButton
          active={activeTab === "job_start"}
          onClick={() => { setActiveTab("job_start"); setSignedLocally(false); }}
          label="📋 Job Start Certificate"
        />
        <TabButton
          active={activeTab === "coc"}
          onClick={() => { setActiveTab("coc"); setSignedLocally(false); }}
          label="✅ Certificate of Completion"
        />
        <TabButton
          active={activeTab === "signed"}
          onClick={() => { setActiveTab("signed"); setSignedLocally(false); }}
          label="🔒 Já Assinado (read-only)"
        />
      </div>

      {/* ── Form ───────────────────────────────────────────── */}
      <main style={mainStyle}>
        <DynamicContractForm
          key={activeTab + String(signedLocally)}
          data={currentData()}
          onSign={handleSign}
          readOnly={activeTab === "signed"}
        />
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer style={footerStyle}>
        <a href="/projects" style={backLinkStyle}>
          ← Voltar para Projects
        </a>
      </footer>
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 20px",
        borderRadius: 8,
        border: "1px solid",
        borderColor: active ? "#6366f1" : "#1e2130",
        background: active ? "rgba(99,102,241,0.12)" : "transparent",
        color: active ? "#818cf8" : "#475569",
        fontWeight: active ? 700 : 500,
        fontSize: "0.82rem",
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#080b10",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  paddingBottom: 64,
};

const bannerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  margin: "20px 16px 0",
  padding: "12px 20px",
  background: "rgba(245, 158, 11, 0.08)",
  border: "1px solid rgba(245, 158, 11, 0.25)",
  borderRadius: 10,
  fontSize: "0.82rem",
  color: "#f59e0b",
  display: "flex",
  alignItems: "center",
  gap: 10,
  boxSizing: "border-box",
};

const bannerIcon: React.CSSProperties = {
  fontSize: "1.1rem",
  flexShrink: 0,
};

const tabBarStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  padding: "20px 16px 0",
  width: "100%",
  maxWidth: 720,
  boxSizing: "border-box",
};

const mainStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  padding: "20px 16px 0",
  boxSizing: "border-box",
};

const footerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  padding: "24px 24px",
  textAlign: "center",
};

const backLinkStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "#475569",
  textDecoration: "none",
};
