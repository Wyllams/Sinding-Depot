// ═══════════════════════════════════════════════════════════════════
// CONSTANTS — Shared types, service categories, colors, and config
// ═══════════════════════════════════════════════════════════════════
//
// This file is the SINGLE SOURCE OF TRUTH for all shared constants.
// Every page/component that needs SERVICE_CATEGORIES, STATUS_CONFIG,
// SALES_COLORS, or shared types MUST import from here.
//
// DO NOT redefine these constants in individual page files.
// ═══════════════════════════════════════════════════════════════════

// ─── Service Types ───────────────────────────────────────────────

export type ServiceId =
  | "siding"
  | "doors_windows_decks"
  | "paint"
  | "gutters"
  | "roofing";

// ─── Service Categories (partners, colors, icons) ────────────────

export interface ServiceCategory {
  id: ServiceId;
  label: string;
  color: string;
  icon: string;
  partners: string[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: "siding",
    label: "Siding",
    color: "#aeee2a",
    icon: "home_work",
    partners: ["XICARA", "XICARA 02", "WILMAR", "WILMAR 02", "SULA", "LUIS"],
  },
  {
    id: "doors_windows_decks",
    label: "Doors / Windows / Decks",
    color: "#f5a623",
    icon: "sensor_door",
    partners: ["SERGIO"],
  },
  {
    id: "paint",
    label: "Paint",
    color: "#60b8f5",
    icon: "format_paint",
    partners: ["OSVIN", "OSVIN 02", "VICTOR", "JUAN"],
  },
  {
    id: "gutters",
    label: "Gutters",
    color: "#c084fc",
    icon: "water_drop",
    partners: ["LEANDRO"],
  },
  {
    id: "roofing",
    label: "Roofing",
    color: "#ef4444",
    icon: "roofing",
    partners: ["JOSUE"],
  },
];

// ─── Job Status Configuration ────────────────────────────────────

export interface StatusConfig {
  color: string;
  label: string;
  bg: string;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending:     { color: "#ef4444", label: "Pending",     bg: "rgba(239,68,68,0.12)" },
  tentative:   { color: "#f5a623", label: "Tentative",   bg: "rgba(245,166,35,0.12)" },
  scheduled:   { color: "#60b8f5", label: "Confirmed",   bg: "rgba(96,184,245,0.12)" },
  in_progress: { color: "#aeee2a", label: "In Progress", bg: "rgba(174,238,42,0.12)" },
  done:        { color: "#22c55e", label: "Done",        bg: "rgba(34,197,94,0.12)" },
};

// ─── Salesperson Colors ──────────────────────────────────────────

export interface SalesColor {
  color: string;
  border: string;
  bg: string;
}

export const SALES_COLORS: Record<string, SalesColor> = {
  R: { color: "#9f7aea", border: "rgba(159, 122, 234, 0.4)", bg: "rgba(159, 122, 234, 0.08)" }, // Ruby
  A: { color: "#fc5c65", border: "rgba(252, 92, 101, 0.4)",  bg: "rgba(252, 92, 101, 0.08)" }, // Armando
  M: { color: "#2bcbba", border: "rgba(43, 203, 186, 0.4)",  bg: "rgba(43, 203, 186, 0.08)" }, // Matheus
};

export function getSalesColors(initial: string): SalesColor {
  return (
    SALES_COLORS[initial] || {
      color: "#ababa8",
      border: "rgba(171,171,168,0.4)",
      bg: "rgba(171,171,168,0.08)",
    }
  );
}

// ─── Salesperson Initials ────────────────────────────────────────

export function getInitials(name?: string): string {
  if (!name) return "S";
  const clean = name.replace(/[^a-zA-Z\s]/g, "").trim();
  const w = clean.split(/\s+/);
  if (w.length === 0 || w[0] === "") return "S";
  return w[0][0].toUpperCase();
}

// ─── Day Labels ──────────────────────────────────────────────────

export const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

// ─── Scheduled Job Model ─────────────────────────────────────────
// This is the runtime representation of a service assignment in the schedule.

export interface ScheduledJob {
  id: string;
  jobId?: string;
  clientName: string;
  serviceType: ServiceId;
  partnerName: string;
  salesperson?: string;
  startDate: string;
  durationDays: number;
  status: "tentative" | "scheduled" | "in_progress" | "done";
  jobStartStatus?: "pending" | "tentative" | "scheduled" | "in_progress" | "done";
  address?: string;
  contract_amount?: number;
  phone?: string;
  email?: string;
  title?: string;
  serviceNames?: string[];
  jobServiceIds?: string[];
  serviceCodes?: string[];
  isPending?: boolean;
  crewId?: string;
  sq?: number | null;
  city?: string;
  state?: string;
  zip?: string;
  street?: string;
  source?: "jobs" | "service_assignments";
}

// ─── Service Code → ServiceId Mapper ─────────────────────────────
// Maps database service_types.code to the internal ServiceId enum.

export function mapCodeToServiceId(code: string): ServiceId {
  if (!code) return "siding";
  const c = code.toLowerCase();
  if (c.includes("siding") || c.includes("ext")) return "siding";
  if (c.includes("roof")) return "roofing";
  if (c.includes("paint")) return "paint";
  if (c.includes("gutter") || c.includes("downspout")) return "gutters";
  if (c.includes("deck") || c.includes("window") || c.includes("door"))
    return "doors_windows_decks";
  return "siding";
}

// ─── Specialty Code Map ──────────────────────────────────────────
// Maps ServiceId to the specialty code used in the specialties table.

export const SPECIALTY_CODE_MAP: Record<ServiceId, string> = {
  siding: "siding_installation",
  doors_windows_decks: "windows",
  paint: "painting",
  gutters: "gutters",
  roofing: "roofing",
};

// ─── Misc Constants ──────────────────────────────────────────────

export const MS_DAY = 86_400_000;
export const MAX_UNDO = 50;
