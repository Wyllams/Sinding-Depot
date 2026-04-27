// ═══════════════════════════════════════════════════════════════════
// CASCADE SCHEDULER — Centralized service dependency logic
// ═══════════════════════════════════════════════════════════════════
//
// This module is the SINGLE SOURCE OF TRUTH for cascade scheduling.
// Both drag-and-drop and modal reschedule use this module.
//
// Cascade order:
//   Siding ──────────┐
//                     ├─→ Paint → Gutters → Roofing
//   Doors/Windows ───┘
//
// Paint starts after MAX(Siding end, Doors/Windows end).
// Gutters starts after Paint ends.
// Roofing starts after Gutters ends.
// ═══════════════════════════════════════════════════════════════════

import type { ServiceId, ScheduledJob } from "./constants";

// ─── Date Helpers (skip Sundays) ─────────────────────────────────

/**
 * Advances an ISO date by `delta` working days (skipping Sundays).
 * If delta is 0, returns the same date.
 * This effectively gives the "next start date" after a service ends:
 *   shiftDate(startDate, durationDays) = first available day AFTER the service.
 */
export function shiftDate(iso: string, delta: number): string {
  const d = fromIso(iso);
  const sign = delta > 0 ? 1 : -1;
  let remaining = Math.abs(delta);
  while (remaining > 0) {
    d.setDate(d.getDate() + sign);
    if (d.getDay() !== 0) remaining--;
  }
  return toIso(d);
}

/** Parse "YYYY-MM-DD" to Date at noon (avoids timezone edge cases) */
export function fromIso(s: string): Date {
  return new Date(s + "T12:00:00");
}

/** Format Date to "YYYY-MM-DD" using LOCAL time (avoids UTC conversion shift) */
export function toIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Check if an ISO date string falls on a Sunday */
export function isSundayIso(iso: string): boolean {
  return fromIso(iso).getDay() === 0;
}

// ─── Core Types ──────────────────────────────────────────────────

export interface CascadeShift {
  /** The service_assignment ID that needs to be shifted */
  id: string;
  /** New start date (ISO "YYYY-MM-DD") */
  newStartDate: string;
  /** Duration in working days (unchanged from original) */
  durationDays: number;
  /** Crew ID (unchanged from original) */
  crewId?: string;
  /** Service type for logging/debugging */
  serviceType: ServiceId;
  /** Client name for logging/debugging */
  clientName: string;
}

// ─── Internal Helpers ────────────────────────────────────────────

/**
 * Finds a sibling service assignment for the same JOB (not just same client).
 * Uses jobId for precise matching — critical for clients with multiple jobs.
 */
function findSiblingByService(
  allJobs: ScheduledJob[],
  jobId: string | undefined,
  serviceType: ServiceId,
  excludeId: string
): ScheduledJob | undefined {
  if (!jobId) return undefined;
  return allJobs.find(
    (j) =>
      j.serviceType === serviceType &&
      j.jobId === jobId &&
      j.id !== excludeId
  );
}

/**
 * Computes the "end date" of a service = the first available working day
 * AFTER the service finishes.
 * E.g., a 3-day service starting Mon finishes Wed, returns Thu.
 */
function getServiceEndDate(startDate: string, durationDays: number): string {
  return shiftDate(startDate, durationDays);
}

/**
 * Computes the start date for Paint, which depends on the latest
 * end date between Siding and Doors/Windows/Decks.
 */
function computePaintStartDate(
  sidingEndDate: string | null,
  decksEndDate: string | null
): string | null {
  if (sidingEndDate && decksEndDate) {
    return sidingEndDate > decksEndDate ? sidingEndDate : decksEndDate;
  }
  return sidingEndDate || decksEndDate;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Computes all cascade shifts that should happen when a service is
 * moved/rescheduled.
 *
 * @param allJobs      - Current state of ALL scheduled jobs
 * @param movedJob     - The job that was moved/rescheduled
 * @param newStartDate - The new start date for the moved job
 * @param newDuration  - The new duration for the moved job (may differ from original if SQ changed)
 * @returns Array of CascadeShift — each representing a service that needs to move
 *
 * @example
 * // When Siding is moved to May 5 with 3 days:
 * const shifts = computeCascadeShifts(allJobs, sidingJob, "2026-05-05", 3);
 * // Returns: [{ id: paintId, newStartDate: "2026-05-08" }, { id: guttersId, ... }, ...]
 */
export function computeCascadeShifts(
  allJobs: ScheduledJob[],
  movedJob: ScheduledJob,
  newStartDate: string,
  newDuration: number
): CascadeShift[] {
  const shifts: CascadeShift[] = [];
  const jobId = movedJob.jobId;

  // If no jobId, we can't find siblings — no cascade possible
  if (!jobId) return shifts;

  // Helper to find siblings
  const findSibling = (type: ServiceId) =>
    findSiblingByService(allJobs, jobId, type, movedJob.id);

  // ── SIDING moved ──────────────────────────────────────────────
  if (movedJob.serviceType === "siding") {
    // Decks is INDEPENDENT — do NOT move it when Siding moves
    const decksJob = findSibling("doors_windows_decks");
    const sidingEnd = getServiceEndDate(newStartDate, newDuration);
    const decksEnd = decksJob
      ? getServiceEndDate(decksJob.startDate, decksJob.durationDays)
      : null;

    // Paint starts after MAX(Siding end, Decks end)
    const paintStart = computePaintStartDate(sidingEnd, decksEnd);
    const paintJob = findSibling("paint");

    if (paintJob && paintStart) {
      shifts.push({
        id: paintJob.id,
        newStartDate: paintStart,
        durationDays: paintJob.durationDays,
        crewId: paintJob.crewId,
        serviceType: "paint",
        clientName: paintJob.clientName,
      });

      // Gutters starts after Paint ends
      const guttersJob = findSibling("gutters");
      if (guttersJob) {
        const guttersStart = getServiceEndDate(paintStart, paintJob.durationDays);
        shifts.push({
          id: guttersJob.id,
          newStartDate: guttersStart,
          durationDays: guttersJob.durationDays,
          crewId: guttersJob.crewId,
          serviceType: "gutters",
          clientName: guttersJob.clientName,
        });

        // Roofing starts after Gutters ends
        const roofJob = findSibling("roofing");
        if (roofJob) {
          const roofStart = getServiceEndDate(guttersStart, guttersJob.durationDays);
          shifts.push({
            id: roofJob.id,
            newStartDate: roofStart,
            durationDays: roofJob.durationDays,
            crewId: roofJob.crewId,
            serviceType: "roofing",
            clientName: roofJob.clientName,
          });
        }
      } else {
        // No gutters — check if roofing exists and cascade directly from paint
        const roofJob = findSibling("roofing");
        if (roofJob) {
          const roofStart = getServiceEndDate(paintStart, paintJob.durationDays);
          shifts.push({
            id: roofJob.id,
            newStartDate: roofStart,
            durationDays: roofJob.durationDays,
            crewId: roofJob.crewId,
            serviceType: "roofing",
            clientName: roofJob.clientName,
          });
        }
      }
    }
  }

  // ── DOORS/WINDOWS/DECKS moved ─────────────────────────────────
  else if (movedJob.serviceType === "doors_windows_decks") {
    const sidingJob = findSibling("siding");
    const decksEnd = getServiceEndDate(newStartDate, newDuration);
    const sidingEnd = sidingJob
      ? getServiceEndDate(sidingJob.startDate, sidingJob.durationDays)
      : null;

    // Paint starts after MAX(Siding end, Decks end)
    const paintStart = computePaintStartDate(sidingEnd, decksEnd);
    const paintJob = findSibling("paint");

    if (paintJob && paintStart) {
      shifts.push({
        id: paintJob.id,
        newStartDate: paintStart,
        durationDays: paintJob.durationDays,
        crewId: paintJob.crewId,
        serviceType: "paint",
        clientName: paintJob.clientName,
      });

      const guttersJob = findSibling("gutters");
      if (guttersJob) {
        const guttersStart = getServiceEndDate(paintStart, paintJob.durationDays);
        shifts.push({
          id: guttersJob.id,
          newStartDate: guttersStart,
          durationDays: guttersJob.durationDays,
          crewId: guttersJob.crewId,
          serviceType: "gutters",
          clientName: guttersJob.clientName,
        });

        const roofJob = findSibling("roofing");
        if (roofJob) {
          const roofStart = getServiceEndDate(guttersStart, guttersJob.durationDays);
          shifts.push({
            id: roofJob.id,
            newStartDate: roofStart,
            durationDays: roofJob.durationDays,
            crewId: roofJob.crewId,
            serviceType: "roofing",
            clientName: roofJob.clientName,
          });
        }
      } else {
        const roofJob = findSibling("roofing");
        if (roofJob) {
          const roofStart = getServiceEndDate(paintStart, paintJob.durationDays);
          shifts.push({
            id: roofJob.id,
            newStartDate: roofStart,
            durationDays: roofJob.durationDays,
            crewId: roofJob.crewId,
            serviceType: "roofing",
            clientName: roofJob.clientName,
          });
        }
      }
    }
  }

  // ── PAINT moved ───────────────────────────────────────────────
  else if (movedJob.serviceType === "paint") {
    const guttersJob = findSibling("gutters");
    if (guttersJob) {
      const guttersStart = getServiceEndDate(newStartDate, newDuration);
      shifts.push({
        id: guttersJob.id,
        newStartDate: guttersStart,
        durationDays: guttersJob.durationDays,
        crewId: guttersJob.crewId,
        serviceType: "gutters",
        clientName: guttersJob.clientName,
      });

      const roofJob = findSibling("roofing");
      if (roofJob) {
        const roofStart = getServiceEndDate(guttersStart, guttersJob.durationDays);
        shifts.push({
          id: roofJob.id,
          newStartDate: roofStart,
          durationDays: roofJob.durationDays,
          crewId: roofJob.crewId,
          serviceType: "roofing",
          clientName: roofJob.clientName,
        });
      }
    } else {
      const roofJob = findSibling("roofing");
      if (roofJob) {
        const roofStart = getServiceEndDate(newStartDate, newDuration);
        shifts.push({
          id: roofJob.id,
          newStartDate: roofStart,
          durationDays: roofJob.durationDays,
          crewId: roofJob.crewId,
          serviceType: "roofing",
          clientName: roofJob.clientName,
        });
      }
    }
  }

  // ── GUTTERS moved ─────────────────────────────────────────────
  else if (movedJob.serviceType === "gutters") {
    const roofJob = findSibling("roofing");
    if (roofJob) {
      const roofStart = getServiceEndDate(newStartDate, newDuration);
      shifts.push({
        id: roofJob.id,
        newStartDate: roofStart,
        durationDays: roofJob.durationDays,
        crewId: roofJob.crewId,
        serviceType: "roofing",
        clientName: roofJob.clientName,
      });
    }
  }

  // ── ROOFING moved ─────────────────────────────────────────────
  // Roofing is the last in the chain — no cascade needed

  return shifts;
}

/**
 * Returns a preview of all services that would be affected by a cascade.
 * Used by the modal to show "This will shift X other jobs" preview.
 *
 * Unlike the old `getAffected` which only showed Paint,
 * this shows the FULL cascade chain.
 */
export function getCascadePreview(
  allJobs: ScheduledJob[],
  movedJob: ScheduledJob,
  newStartDate: string,
  newDuration: number
): { clientName: string; serviceType: ServiceId; newStartDate: string }[] {
  const shifts = computeCascadeShifts(allJobs, movedJob, newStartDate, newDuration);
  return shifts.map((s) => ({
    clientName: s.clientName,
    serviceType: s.serviceType,
    newStartDate: s.newStartDate,
  }));
}
