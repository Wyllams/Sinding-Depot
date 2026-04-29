import { describe, it, expect } from 'vitest';
import {
  shiftDate,
  fromIso,
  toIso,
  isSundayIso,
  computeCascadeShifts,
  getCascadePreview,
} from '../cascade-scheduler';
import type { ScheduledJob } from '../constants';

// ═══════════════════════════════════════════════════════════════════
// Tests: cascade-scheduler.ts
// Validates date shifting, cascade chain, and preview logic
// ═══════════════════════════════════════════════════════════════════

describe('shiftDate', () => {
  it('shifts forward by 1 working day (Mon → Tue)', () => {
    expect(shiftDate('2026-05-04', 1)).toBe('2026-05-05'); // Mon → Tue
  });

  it('shifts forward by 5 working days (Mon → Sat)', () => {
    expect(shiftDate('2026-05-04', 5)).toBe('2026-05-09'); // Mon → Sat
  });

  it('skips Sunday when shifting forward', () => {
    // Sat May 9 + 1 working day = Mon May 11 (skips Sunday May 10)
    expect(shiftDate('2026-05-09', 1)).toBe('2026-05-11');
  });

  it('shifts forward by 0 returns same date', () => {
    expect(shiftDate('2026-05-05', 0)).toBe('2026-05-05');
  });

  it('shifts across multiple weeks', () => {
    // Mon May 4 + 12 working days:
    // Week 1: Tue-Sat = 5, Week 2: Mon-Sat = 6, Total = 11 → need 1 more → Mon May 18
    // Actually: Mon + 12 = count forward 12, skipping Sundays
    // May 4(Mon) → 5,6,7,8,9(Sat)=5 → skip 10(Sun) → 11,12,13,14,15,16(Sat)=6 → skip 17(Sun) → 18=1 more = 12 total
    expect(shiftDate('2026-05-04', 12)).toBe('2026-05-18');
  });
});

describe('fromIso / toIso', () => {
  it('roundtrips correctly', () => {
    expect(toIso(fromIso('2026-05-04'))).toBe('2026-05-04');
    expect(toIso(fromIso('2026-12-31'))).toBe('2026-12-31');
    expect(toIso(fromIso('2026-01-01'))).toBe('2026-01-01');
  });

  it('fromIso creates date at noon to avoid timezone issues', () => {
    const d = fromIso('2026-05-04');
    expect(d.getHours()).toBe(12);
  });
});

describe('isSundayIso', () => {
  it('returns true for Sundays', () => {
    expect(isSundayIso('2026-05-10')).toBe(true); // Sunday
    expect(isSundayIso('2026-05-17')).toBe(true); // Sunday
  });

  it('returns false for non-Sundays', () => {
    expect(isSundayIso('2026-05-04')).toBe(false); // Monday
    expect(isSundayIso('2026-05-09')).toBe(false); // Saturday
  });
});

describe('computeCascadeShifts', () => {
  const JOB_ID = 'job-001';

  function makeJob(overrides: Partial<ScheduledJob> & Pick<ScheduledJob, 'id' | 'serviceType' | 'startDate' | 'durationDays'>): ScheduledJob {
    return {
      clientName: 'Test Client',
      crewId: 'crew-001',
      partnerName: 'SIDING DEPOT',
      status: 'scheduled',
      jobId: JOB_ID,
      ...overrides,
    } as ScheduledJob;
  }

  it('cascades Siding → Paint → Gutters → Roofing', () => {
    const siding = makeJob({ id: 's1', serviceType: 'siding', startDate: '2026-05-04', durationDays: 3 });
    const paint = makeJob({ id: 'p1', serviceType: 'paint', startDate: '2026-05-10', durationDays: 2 });
    const gutters = makeJob({ id: 'g1', serviceType: 'gutters', startDate: '2026-05-15', durationDays: 1 });
    const roofing = makeJob({ id: 'r1', serviceType: 'roofing', startDate: '2026-05-20', durationDays: 1 });

    const allJobs = [siding, paint, gutters, roofing];

    // Move siding to May 4 with 3 days → ends May 6 → paint starts May 7
    const shifts = computeCascadeShifts(allJobs, siding, '2026-05-04', 3);

    expect(shifts).toHaveLength(3);
    expect(shifts[0]!.serviceType).toBe('paint');
    expect(shifts[0]!.newStartDate).toBe('2026-05-07'); // After siding ends

    expect(shifts[1]!.serviceType).toBe('gutters');
    // Paint starts May 7 with 2 days → ends May 8 → gutters starts May 9
    expect(shifts[1]!.newStartDate).toBe('2026-05-09');

    expect(shifts[2]!.serviceType).toBe('roofing');
    // Gutters starts May 9 with 1 day → ends May 9 → roofing starts May 11 (skip Sunday May 10)
    expect(shifts[2]!.newStartDate).toBe('2026-05-11');
  });

  it('Siding cascade considers DWD end date', () => {
    const siding = makeJob({ id: 's1', serviceType: 'siding', startDate: '2026-05-04', durationDays: 2 });
    const dwd = makeJob({ id: 'd1', serviceType: 'doors_windows_decks', startDate: '2026-05-04', durationDays: 5 });
    const paint = makeJob({ id: 'p1', serviceType: 'paint', startDate: '2026-05-15', durationDays: 2 });

    const allJobs = [siding, dwd, paint];

    // Move siding to May 4 with 2 days → siding ends May 5
    // DWD is at May 4 with 5 days → ends May 9 (Sat)
    // Paint should start after MAX(siding end May 5, DWD end May 9) = May 9
    // But shiftDate will give us the "next day after end" which is May 11 (skip Sun)
    const shifts = computeCascadeShifts(allJobs, siding, '2026-05-04', 2);

    expect(shifts).toHaveLength(1);
    expect(shifts[0]!.serviceType).toBe('paint');
    // shiftDate('2026-05-04', 5) = '2026-05-09' (Sat) — first available day AFTER DWD ends
    // Since Sat is a working day, paint starts on May 9
    expect(shifts[0]!.newStartDate).toBe('2026-05-09');
  });

  it('returns empty array when no cascade is needed (roofing moved)', () => {
    const roofing = makeJob({ id: 'r1', serviceType: 'roofing', startDate: '2026-05-04', durationDays: 1 });
    const allJobs = [roofing];

    const shifts = computeCascadeShifts(allJobs, roofing, '2026-05-07', 1);
    expect(shifts).toHaveLength(0);
  });

  it('returns empty array when no jobId', () => {
    const siding = makeJob({ id: 's1', serviceType: 'siding', startDate: '2026-05-04', durationDays: 3 });
    (siding as any).jobId = undefined;

    const shifts = computeCascadeShifts([siding], siding, '2026-05-04', 3);
    expect(shifts).toHaveLength(0);
  });

  it('Paint cascade propagates to Gutters and Roofing', () => {
    const paint = makeJob({ id: 'p1', serviceType: 'paint', startDate: '2026-05-04', durationDays: 2 });
    const gutters = makeJob({ id: 'g1', serviceType: 'gutters', startDate: '2026-05-10', durationDays: 1 });
    const roofing = makeJob({ id: 'r1', serviceType: 'roofing', startDate: '2026-05-15', durationDays: 1 });

    const allJobs = [paint, gutters, roofing];

    const shifts = computeCascadeShifts(allJobs, paint, '2026-05-04', 2);

    expect(shifts).toHaveLength(2);
    expect(shifts[0]!.serviceType).toBe('gutters');
    expect(shifts[1]!.serviceType).toBe('roofing');
  });

  it('Gutters cascade only propagates to Roofing', () => {
    const gutters = makeJob({ id: 'g1', serviceType: 'gutters', startDate: '2026-05-04', durationDays: 1 });
    const roofing = makeJob({ id: 'r1', serviceType: 'roofing', startDate: '2026-05-10', durationDays: 1 });

    const allJobs = [gutters, roofing];

    const shifts = computeCascadeShifts(allJobs, gutters, '2026-05-04', 1);

    expect(shifts).toHaveLength(1);
    expect(shifts[0]!.serviceType).toBe('roofing');
  });
});

describe('getCascadePreview', () => {
  const JOB_ID = 'job-001';

  function makeJob(overrides: Partial<ScheduledJob> & Pick<ScheduledJob, 'id' | 'serviceType' | 'startDate' | 'durationDays'>): ScheduledJob {
    return {
      clientName: 'Test Client',
      crewId: 'crew-001',
      partnerName: 'SIDING DEPOT',
      status: 'scheduled',
      jobId: JOB_ID,
      ...overrides,
    } as ScheduledJob;
  }

  it('returns simplified preview objects', () => {
    const siding = makeJob({ id: 's1', serviceType: 'siding', startDate: '2026-05-04', durationDays: 3 });
    const paint = makeJob({ id: 'p1', serviceType: 'paint', startDate: '2026-05-10', durationDays: 2 });

    const preview = getCascadePreview([siding, paint], siding, '2026-05-04', 3);

    expect(preview).toHaveLength(1);
    expect(preview[0]).toHaveProperty('clientName');
    expect(preview[0]).toHaveProperty('serviceType');
    expect(preview[0]).toHaveProperty('newStartDate');
    // Should NOT have id, durationDays, crewId
    expect(preview[0]).not.toHaveProperty('id');
    expect(preview[0]).not.toHaveProperty('durationDays');
  });
});
