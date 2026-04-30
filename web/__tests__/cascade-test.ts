// Comprehensive cascade tests
import { computeCascadeShifts } from '../lib/cascade-scheduler';
import type { ScheduledJob } from '../lib/constants';

const jobId = "test-job-id";
let pass = 0;
let fail = 0;

function makeJob(id: string, serviceType: ScheduledJob["serviceType"], startDate: string, durationDays: number, crewId: string): ScheduledJob {
  return {
    id,
    jobId,
    clientName: "Test Client",
    serviceType,
    partnerName: "Test Crew",
    startDate,
    durationDays,
    status: "scheduled",
    source: "service_assignments",
    crewId,
  };
}

function assertShift(shifts: ReturnType<typeof computeCascadeShifts>, serviceType: string, expectedExists: boolean, label: string): void {
  const found = shifts.find(s => s.serviceType === serviceType);
  if (expectedExists && !found) {
    console.error(`❌ FAIL [${label}]: Expected ${serviceType} to be cascaded but it wasn't`);
    fail++;
  } else if (!expectedExists && found) {
    console.error(`❌ FAIL [${label}]: Expected ${serviceType} NOT to be cascaded but it was: ${found.newStartDate}`);
    fail++;
  } else {
    const msg = expectedExists ? `found at ${found!.newStartDate}` : "correctly absent";
    console.log(`✅ PASS [${label}]: ${serviceType} ${msg}`);
    pass++;
  }
}

// ── Test 1: Full chain Siding → Paint → Gutters → Roofing ──
console.log("\n=== TEST 1: Full chain (Siding → Paint → Gutters → Roofing) ===");
{
  const siding = makeJob("s1", "siding", "2026-05-18", 3, "c1");
  const paint = makeJob("p1", "paint", "2026-05-21", 3, "c2");
  const gutters = makeJob("g1", "gutters", "2026-05-25", 1, "c3");
  const roofing = makeJob("r1", "roofing", "2026-05-27", 2, "c4");
  const allJobs = [siding, paint, gutters, roofing];
  const shifts = computeCascadeShifts(allJobs, siding, "2026-05-20", 3);
  assertShift(shifts, "paint", true, "T1");
  assertShift(shifts, "gutters", true, "T1");
  assertShift(shifts, "roofing", true, "T1");
}

// ── Test 2: Siding + Gutters (no Paint) ──
console.log("\n=== TEST 2: Siding + Gutters (no Paint) ===");
{
  const siding = makeJob("s1", "siding", "2026-05-18", 3, "c1");
  const gutters = makeJob("g1", "gutters", "2026-05-25", 1, "c3");
  const allJobs = [siding, gutters];
  const shifts = computeCascadeShifts(allJobs, siding, "2026-05-20", 3);
  assertShift(shifts, "paint", false, "T2");
  assertShift(shifts, "gutters", true, "T2");
}

// ── Test 3: Siding + Roofing (no Paint, no Gutters) ──
console.log("\n=== TEST 3: Siding + Roofing (no Paint, no Gutters) ===");
{
  const siding = makeJob("s1", "siding", "2026-05-18", 3, "c1");
  const roofing = makeJob("r1", "roofing", "2026-05-27", 2, "c4");
  const allJobs = [siding, roofing];
  const shifts = computeCascadeShifts(allJobs, siding, "2026-05-20", 3);
  assertShift(shifts, "roofing", true, "T3");
}

// ── Test 4: Siding + Paint (no Gutters, no Roofing) ──
console.log("\n=== TEST 4: Siding + Paint only ===");
{
  const siding = makeJob("s1", "siding", "2026-05-18", 3, "c1");
  const paint = makeJob("p1", "paint", "2026-05-21", 3, "c2");
  const allJobs = [siding, paint];
  const shifts = computeCascadeShifts(allJobs, siding, "2026-05-20", 3);
  assertShift(shifts, "paint", true, "T4");
  assertShift(shifts, "gutters", false, "T4");
  assertShift(shifts, "roofing", false, "T4");
}

// ── Test 5: DWD + Gutters (no Siding, no Paint) ──
console.log("\n=== TEST 5: DWD + Gutters (no Siding, no Paint) ===");
{
  const dwd = makeJob("d1", "doors_windows_decks", "2026-05-18", 2, "c1");
  const gutters = makeJob("g1", "gutters", "2026-05-25", 1, "c3");
  const allJobs = [dwd, gutters];
  const shifts = computeCascadeShifts(allJobs, dwd, "2026-05-20", 2);
  assertShift(shifts, "gutters", true, "T5");
}

// ── Test 6: Paint → Gutters → Roofing ──
console.log("\n=== TEST 6: Paint moved → Gutters → Roofing ===");
{
  const paint = makeJob("p1", "paint", "2026-05-21", 3, "c2");
  const gutters = makeJob("g1", "gutters", "2026-05-25", 1, "c3");
  const roofing = makeJob("r1", "roofing", "2026-05-27", 2, "c4");
  const allJobs = [paint, gutters, roofing];
  const shifts = computeCascadeShifts(allJobs, paint, "2026-05-23", 3);
  assertShift(shifts, "gutters", true, "T6");
  assertShift(shifts, "roofing", true, "T6");
}

// ── Test 7: Gutters → Roofing ──
console.log("\n=== TEST 7: Gutters moved → Roofing ===");
{
  const gutters = makeJob("g1", "gutters", "2026-05-25", 1, "c3");
  const roofing = makeJob("r1", "roofing", "2026-05-27", 2, "c4");
  const allJobs = [gutters, roofing];
  const shifts = computeCascadeShifts(allJobs, gutters, "2026-05-28", 1);
  assertShift(shifts, "roofing", true, "T7");
}

// ── Test 8: Siding only (no siblings) ──
console.log("\n=== TEST 8: Siding only (no siblings) ===");
{
  const siding = makeJob("s1", "siding", "2026-05-18", 3, "c1");
  const allJobs = [siding];
  const shifts = computeCascadeShifts(allJobs, siding, "2026-05-20", 3);
  if (shifts.length === 0) { console.log("✅ PASS [T8]: No cascades for solo siding"); pass++; }
  else { console.error("❌ FAIL [T8]: Should have 0 cascades"); fail++; }
}

// ── Summary ──
console.log(`\n${"=".repeat(50)}`);
console.log(`RESULTS: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
