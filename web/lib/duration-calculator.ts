// ═══════════════════════════════════════════════════════════════════
// Duration Calculator — Partner-specific service duration tables
// Calculates the number of working days a service will take based
// on the assigned partner and the job's SQ (square footage).
// ═══════════════════════════════════════════════════════════════════

// ─── Types ────────────────────────────────────────────────────────

/** A fixed range: if SQ <= max, duration is `days` */
interface RangeRule {
  max: number;
  days: number;
}

/** Formula for SQ above fixed ranges: SQ / perDay, then round */
interface FormulaRule {
  perDay: number;
  rounding: "ceil" | "round";
}

/** Full config for one partner on one service type */
interface PartnerDurationConfig {
  ranges: RangeRule[];
  formula: FormulaRule;
}

// ─── Siding Partner Tables ────────────────────────────────────────

const XICARA_SIDING: PartnerDurationConfig = {
  ranges: [
    { max: 13, days: 1 },
    { max: 17, days: 2 },
    { max: 20, days: 3 },
  ],
  formula: { perDay: 10, rounding: "ceil" },
};

const WILMAR_SIDING: PartnerDurationConfig = {
  ranges: [
    { max: 8, days: 1 },
    { max: 12, days: 2 },
  ],
  formula: { perDay: 6, rounding: "ceil" },
};

const SULA_SIDING: PartnerDurationConfig = {
  ranges: [
    { max: 11, days: 1 },
    { max: 15, days: 2 },
    { max: 26, days: 3 },
    { max: 36, days: 4 },
    { max: 40, days: 5 },
    { max: 55, days: 6 },
  ],
  formula: { perDay: 10, rounding: "round" },
};

const LUIS_SIDING: PartnerDurationConfig = {
  ranges: [
    { max: 5, days: 1 },
    { max: 10, days: 2 },
    { max: 12, days: 3 },
    { max: 20, days: 4 },
    { max: 27, days: 5 },
  ],
  formula: { perDay: 4.5, rounding: "round" },
};

// ─── Painting Partner Tables ──────────────────────────────────────

const OSVIN_PAINTING: PartnerDurationConfig = {
  ranges: [
    { max: 14, days: 1 },
    { max: 21, days: 2 },
    { max: 29, days: 3 },
    { max: 40, days: 4 },
  ],
  formula: { perDay: 13, rounding: "ceil" },
};

const VICTOR_PAINTING: PartnerDurationConfig = {
  ranges: [
    { max: 8, days: 1 },
    { max: 15, days: 2 },
    { max: 20, days: 3 },
  ],
  formula: { perDay: 7.5, rounding: "round" },
};

// ─── Partner → Config Lookup ──────────────────────────────────────
// Keys are UPPERCASE, normalized (without accents)

const SIDING_TABLE: Record<string, PartnerDurationConfig> = {
  "XICARA":       XICARA_SIDING,
  "XICARA 02":    XICARA_SIDING,
  "WILMAR":       WILMAR_SIDING,
  "WILMAR 02":    WILMAR_SIDING,
  "SULA":         SULA_SIDING,
  "LUIS":         LUIS_SIDING,
  "SIDING DEPOT": XICARA_SIDING,  // Company default: uses XICARA rate
};

const PAINTING_TABLE: Record<string, PartnerDurationConfig> = {
  "OSVIN":        OSVIN_PAINTING,
  "OSVIN 02":     OSVIN_PAINTING,
  "VICTOR":       VICTOR_PAINTING,
  "JUAN":         VICTOR_PAINTING,  // Same as VICTOR
  "SIDING DEPOT": OSVIN_PAINTING,   // Company default: uses OSVIN rate
};

// ─── Core Calculation ─────────────────────────────────────────────

function applyConfig(config: PartnerDurationConfig, sq: number): number {
  // Check fixed ranges first (sorted ascending by max)
  for (const range of config.ranges) {
    if (sq <= range.max) return range.days;
  }

  // Above all ranges → apply formula
  const raw = sq / config.formula.perDay;
  return Math.max(1, config.formula.rounding === "ceil" ? Math.ceil(raw) : Math.round(raw));
}

// ─── Normalize partner name (strip accents, trim, uppercase) ──────

function normalizePartner(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Calculates the number of working days a service takes, based on
 * the assigned partner, service type, and SQ.
 *
 * @param partner   - Partner/crew name (e.g. "XICARA", "Wilmar 02")
 * @param serviceType - Service type code (e.g. "siding", "paint", "gutters", "roofing", "doors", "windows", "decks", "doors_windows_decks")
 * @param sq        - Job square footage
 * @returns Number of working days (minimum 1)
 */
export function calculateServiceDuration(
  partner: string,
  serviceType: string,
  sq: number
): number {
  // Ensure valid SQ
  if (!sq || sq <= 0) return 1;

  const svc = serviceType.toLowerCase();
  const norm = normalizePartner(partner);

  // ── Fixed-duration services (no partner/SQ dependency) ──
  if (svc === "gutters" || svc.includes("gutter")) return 1;
  if (svc === "roofing" || svc.includes("roof")) return 1;
  if (svc === "decks" || svc === "deck") return 2;
  if (svc === "doors" || svc === "door") return 1;
  if (svc === "windows" || svc === "window") return 1; // Windows alone = 1 day default

  // ── Siding ──
  if (svc === "siding" || svc.includes("siding")) {
    const config = SIDING_TABLE[norm];
    if (config) return applyConfig(config, sq);
    // Fallback: use XICARA rate if partner not found
    return applyConfig(XICARA_SIDING, sq);
  }

  // ── Painting ──
  if (svc === "paint" || svc === "painting" || svc.includes("paint")) {
    const config = PAINTING_TABLE[norm];
    if (config) return applyConfig(config, sq);
    // Fallback: use OSVIN rate if partner not found
    return applyConfig(OSVIN_PAINTING, sq);
  }

  // ── Doors/Windows/Decks combined ──
  if (svc === "doors_windows_decks") {
    // Combined service defaults to 2 days (Decks is the longest)
    return 2;
  }

  // ── Unknown service: default 1 day ──
  return 1;
}

/**
 * Calculates the end date (ISO string) from a start date and duration,
 * skipping Sundays. Saturday is a working day.
 *
 * @param startDateIso - Start date in "YYYY-MM-DD" format
 * @param durationDays - Number of working days (minimum 1)
 * @returns End date in "YYYY-MM-DD" format
 */
export function calculateEndDate(startDateIso: string, durationDays: number): string {
  const [y, m, d] = startDateIso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  let daysAdded = 0;
  const totalToAdd = Math.max(1, durationDays) - 1; // First day is the start date itself

  while (daysAdded < totalToAdd) {
    date.setDate(date.getDate() + 1);
    // Skip Sundays (getDay() === 0)
    if (date.getDay() !== 0) {
      daysAdded++;
    }
  }

  const ey = date.getFullYear();
  const em = (date.getMonth() + 1).toString().padStart(2, "0");
  const ed = date.getDate().toString().padStart(2, "0");
  return `${ey}-${em}-${ed}`;
}
