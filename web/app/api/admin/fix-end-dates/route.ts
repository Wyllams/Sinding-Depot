import { createClient } from "@supabase/supabase-js";
import {
  calculateServiceDuration,
  calculateEndDate,
} from "../../../../lib/duration-calculator";
import { NextResponse } from "next/server";

// ─── Service code → calculator service name mapping ──────────────
const CODE_TO_SVC: Record<string, string> = {
  SID: "siding",
  EXT: "siding",
  PNT: "painting",
  GTR: "gutters",
  RFG: "roofing",
  DWD: "doors_windows_decks",
};

function mapCode(raw: string): string {
  if (!raw) return "siding";
  const u = raw.toUpperCase();
  if (CODE_TO_SVC[u]) return CODE_TO_SVC[u];
  const l = raw.toLowerCase();
  if (l.includes("siding")) return "siding";
  if (l.includes("paint")) return "painting";
  if (l.includes("gutter")) return "gutters";
  if (l.includes("roof")) return "roofing";
  if (l.includes("deck") || l.includes("door") || l.includes("window"))
    return "doors_windows_decks";
  return "siding";
}

/**
 * POST /api/admin/fix-end-dates
 *
 * Recalculates all scheduled_end_at dates in service_assignments
 * based on the partner-specific SQ duration tables, skipping Sundays.
 *
 * This is a one-time fix for historical data stored with incorrect end dates.
 */
export async function POST(): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Missing Supabase env vars" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: assignments, error } = await supabase
    .from("service_assignments")
    .select(
      `
      id,
      scheduled_start_at,
      scheduled_end_at,
      crew_id,
      crews(name),
      job_services!service_assignments_job_service_id_fkey(
        quantity,
        unit_of_measure,
        service_types!job_services_service_type_id_fkey(code),
        jobs!job_services_job_id_fkey(sq)
      )
    `
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{
    id: string;
    crew: string;
    service: string;
    sq: number;
    oldEnd: string;
    newEnd: string;
    oldDur: number;
    newDur: number;
  }> = [];

  for (const a of assignments || []) {
    if (!a.scheduled_start_at || !a.scheduled_end_at) continue;

    const js = a.job_services as any;
    const crewName = (a.crews as any)?.name || "Siding Depot";
    const serviceCode = js?.service_types?.code || "";
    const svcName = mapCode(serviceCode);

    // Get SQ: prefer job.sq, fallback to job_services.quantity
    const jobSq = js?.jobs?.sq;
    const jsSq =
      js?.unit_of_measure === "SQ" && js?.quantity != null
        ? Number(js.quantity)
        : null;
    const sq = jobSq != null ? Number(jobSq) : jsSq != null ? jsSq : 0;

    if (sq <= 0) continue; // Can't recalculate without SQ

    // ── SKIP Decks/DWD — uses scope-based duration, NOT SQ ──
    if (svcName === "doors_windows_decks") continue;

    const correctDuration = calculateServiceDuration(crewName, svcName, sq);
    const startIso = a.scheduled_start_at.split("T")[0];
    const correctEndIso = calculateEndDate(startIso, correctDuration);

    const currentEndIso = a.scheduled_end_at.split("T")[0];

    // Compute old duration for logging
    const oldStart = new Date(a.scheduled_start_at);
    const oldEnd = new Date(a.scheduled_end_at);
    let oldWorkDays = 0;
    const cur = new Date(oldStart);
    while (cur < oldEnd) {
      if (cur.getDay() !== 0) oldWorkDays++;
      cur.setDate(cur.getDate() + 1);
    }

    if (currentEndIso !== correctEndIso) {
      const correctEndAt = new Date(correctEndIso + "T12:00:00").toISOString();
      const { error: updateErr } = await supabase
        .from("service_assignments")
        .update({ scheduled_end_at: correctEndAt })
        .eq("id", a.id);

      if (!updateErr) {
        results.push({
          id: a.id,
          crew: crewName,
          service: svcName,
          sq,
          oldEnd: currentEndIso,
          newEnd: correctEndIso,
          oldDur: Math.max(1, oldWorkDays),
          newDur: correctDuration,
        });
      }
    }
  }

  return NextResponse.json({
    message: `Fixed ${results.length} of ${assignments?.length || 0} assignments`,
    fixes: results,
  });
}
