import { describe, it, expect } from 'vitest';
import { calculateServiceDuration, calculateEndDate } from '../duration-calculator';

// ═══════════════════════════════════════════════════════════════════
// Tests: duration-calculator.ts
// Validates partner-specific duration tables and cascade date logic
// ═══════════════════════════════════════════════════════════════════

describe('calculateServiceDuration', () => {
  // ── XICARA Siding ──
  describe('XICARA siding', () => {
    it('returns 1 day for SQ <= 13', () => {
      expect(calculateServiceDuration('XICARA', 'siding', 10)).toBe(1);
      expect(calculateServiceDuration('XICARA', 'siding', 13)).toBe(1);
    });

    it('returns 2 days for SQ 14-17', () => {
      expect(calculateServiceDuration('XICARA', 'siding', 14)).toBe(2);
      expect(calculateServiceDuration('XICARA', 'siding', 17)).toBe(2);
    });

    it('returns 3 days for SQ 18-20', () => {
      expect(calculateServiceDuration('XICARA', 'siding', 20)).toBe(3);
    });

    it('applies formula (ceil(SQ / 10)) for SQ > 20', () => {
      expect(calculateServiceDuration('XICARA', 'siding', 25)).toBe(3); // ceil(25/10) = 3
      expect(calculateServiceDuration('XICARA', 'siding', 30)).toBe(3); // ceil(30/10) = 3
      expect(calculateServiceDuration('XICARA', 'siding', 31)).toBe(4); // ceil(31/10) = 4
    });
  });

  // ── XICARA 02 uses same config ──
  it('XICARA 02 uses same config as XICARA', () => {
    expect(calculateServiceDuration('XICARA 02', 'siding', 13)).toBe(1);
    expect(calculateServiceDuration('XICARA 02', 'siding', 17)).toBe(2);
  });

  // ── WILMAR Siding ──
  describe('WILMAR siding', () => {
    it('returns 1 day for SQ <= 8', () => {
      expect(calculateServiceDuration('WILMAR', 'siding', 8)).toBe(1);
    });

    it('returns 2 days for SQ 9-12', () => {
      expect(calculateServiceDuration('WILMAR', 'siding', 12)).toBe(2);
    });

    it('applies formula (ceil(SQ / 6)) for SQ > 12', () => {
      expect(calculateServiceDuration('WILMAR', 'siding', 18)).toBe(3); // ceil(18/6) = 3
      expect(calculateServiceDuration('WILMAR', 'siding', 24)).toBe(4); // ceil(24/6) = 4
    });
  });

  // ── SULA Siding ──
  describe('SULA siding', () => {
    it('returns correct days for each range', () => {
      expect(calculateServiceDuration('SULA', 'siding', 11)).toBe(1);
      expect(calculateServiceDuration('SULA', 'siding', 15)).toBe(2);
      expect(calculateServiceDuration('SULA', 'siding', 26)).toBe(3);
      expect(calculateServiceDuration('SULA', 'siding', 36)).toBe(4);
      expect(calculateServiceDuration('SULA', 'siding', 40)).toBe(5);
      expect(calculateServiceDuration('SULA', 'siding', 55)).toBe(6);
    });

    it('applies formula (round(SQ / 10)) for SQ > 55', () => {
      expect(calculateServiceDuration('SULA', 'siding', 60)).toBe(6); // round(60/10) = 6
      expect(calculateServiceDuration('SULA', 'siding', 75)).toBe(8); // round(75/10) = 7.5 → 8
    });
  });

  // ── LUIS Siding ──
  describe('LUIS siding', () => {
    it('returns correct days for each range', () => {
      expect(calculateServiceDuration('LUIS', 'siding', 5)).toBe(1);
      expect(calculateServiceDuration('LUIS', 'siding', 10)).toBe(2);
      expect(calculateServiceDuration('LUIS', 'siding', 12)).toBe(3);
      expect(calculateServiceDuration('LUIS', 'siding', 20)).toBe(4);
      expect(calculateServiceDuration('LUIS', 'siding', 27)).toBe(5);
    });

    it('applies formula (round(SQ / 4.5)) for SQ > 27', () => {
      expect(calculateServiceDuration('LUIS', 'siding', 30)).toBe(7); // round(30/4.5) = 6.67 → 7
    });
  });

  // ── Painting ──
  describe('OSVIN painting', () => {
    it('returns correct days for each range', () => {
      expect(calculateServiceDuration('OSVIN', 'paint', 14)).toBe(1);
      expect(calculateServiceDuration('OSVIN', 'paint', 21)).toBe(2);
      expect(calculateServiceDuration('OSVIN', 'paint', 28)).toBe(3);
      expect(calculateServiceDuration('OSVIN', 'paint', 40)).toBe(4);
    });

    it('applies formula (ceil(SQ / 13)) for SQ > 40', () => {
      expect(calculateServiceDuration('OSVIN', 'paint', 50)).toBe(4); // ceil(50/13) = 4
      expect(calculateServiceDuration('OSVIN', 'paint', 52)).toBe(4); // ceil(52/13) = 4
      expect(calculateServiceDuration('OSVIN', 'paint', 53)).toBe(5); // ceil(53/13) = 5
    });
  });

  describe('VICTOR painting', () => {
    it('returns correct days for each range', () => {
      expect(calculateServiceDuration('VICTOR', 'paint', 8)).toBe(1);
      expect(calculateServiceDuration('VICTOR', 'paint', 15)).toBe(2);
      expect(calculateServiceDuration('VICTOR', 'paint', 20)).toBe(3);
    });

    it('JUAN uses same config as VICTOR', () => {
      expect(calculateServiceDuration('JUAN', 'painting', 15)).toBe(2);
    });
  });

  // ── Fixed-duration services ──
  describe('fixed-duration services', () => {
    it('gutters = 1 day regardless of SQ/partner', () => {
      expect(calculateServiceDuration('SIDING DEPOT', 'gutters', 50)).toBe(1);
      expect(calculateServiceDuration('LEANDRO', 'gutters', 100)).toBe(1);
    });

    it('roofing = 1 day regardless of SQ/partner', () => {
      expect(calculateServiceDuration('JOSUE', 'roofing', 50)).toBe(1);
    });

    it('doors = 1 day', () => {
      expect(calculateServiceDuration('SERGIO', 'doors', 30)).toBe(1);
    });

    it('windows = 1 day', () => {
      expect(calculateServiceDuration('SERGIO', 'windows', 30)).toBe(1);
    });

    it('decks = 2 days', () => {
      expect(calculateServiceDuration('SERGIO', 'decks', 30)).toBe(2);
    });

    it('doors_windows_decks combined = 2 days', () => {
      expect(calculateServiceDuration('SIDING DEPOT', 'doors_windows_decks', 30)).toBe(2);
    });
  });

  // ── Edge cases ──
  describe('edge cases', () => {
    it('returns 1 for zero SQ', () => {
      expect(calculateServiceDuration('XICARA', 'siding', 0)).toBe(1);
    });

    it('returns 1 for negative SQ', () => {
      expect(calculateServiceDuration('XICARA', 'siding', -5)).toBe(1);
    });

    it('returns 1 for unknown service type', () => {
      expect(calculateServiceDuration('XICARA', 'unknown_service', 50)).toBe(1);
    });

    it('falls back to XICARA for unknown siding partner', () => {
      // Unknown partner should use XICARA rates
      expect(calculateServiceDuration('UNKNOWN_PARTNER', 'siding', 13)).toBe(1);
      expect(calculateServiceDuration('UNKNOWN_PARTNER', 'siding', 17)).toBe(2);
    });

    it('normalizes partner names (accents, case)', () => {
      expect(calculateServiceDuration('xicara', 'siding', 13)).toBe(1);
      expect(calculateServiceDuration('Xícara', 'siding', 13)).toBe(1);
    });
  });
});

describe('calculateEndDate', () => {
  it('returns same day for 1-day service', () => {
    expect(calculateEndDate('2026-05-05', 1)).toBe('2026-05-05'); // Monday
  });

  it('calculates end date skipping Sundays', () => {
    // Monday + 5 working days = Saturday (Mon→Tue→Wed→Thu→Fri→Sat)
    expect(calculateEndDate('2026-05-04', 6)).toBe('2026-05-09'); // Mon → Sat
  });

  it('skips Sunday correctly', () => {
    // Saturday May 9 + 2 days:
    // Day 1 = Sat (start), Day 2 = skip Sunday → Mon May 11
    expect(calculateEndDate('2026-05-09', 2)).toBe('2026-05-11');
  });

  it('handles multi-week spans', () => {
    // Monday May 4 + 10 working days:
    // Week 1: Mon-Sat = 6 days, skip Sun, Week 2: Mon-Thu = 4 more days
    // Total: 10 working days → ends Thursday May 14
    expect(calculateEndDate('2026-05-04', 10)).toBe('2026-05-14');
  });

  it('returns start date for duration <= 1', () => {
    expect(calculateEndDate('2026-05-05', 0)).toBe('2026-05-05');
    expect(calculateEndDate('2026-05-05', 1)).toBe('2026-05-05');
  });
});
