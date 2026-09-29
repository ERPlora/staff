// staff#87 — a calendar date shown and typed in the HUB's day/month order, not the browser's.
//
// The date fields of Staff (a schedule's «Effective from/until», an absence's «From/To», the hire
// date) were native `<input type="date">`: Chromium paints that control with the BROWSER's
// (operating system's) locale, so a Spanish hub on a US-English laptop read «10/05/2026» for the
// 5th of October and «03/04/2026» typed as the 3rd of April saved the 4th of March. The module
// paints the date itself and reads what is typed back in the same order (the schedules#56 reading).
import { afterAll, describe, expect, it } from 'vitest';

// A zone WEST of UTC: a calendar date formatted through the device's timezone slides to the day
// before here, so the helper must never let the device zone touch it.
const previousTz = process.env.TZ;
process.env.TZ = 'America/Los_Angeles';
afterAll(() => {
  process.env.TZ = previousTz;
});

const { formatCalendarDate, isUnreadableDate, parseCalendarDate } = await import('./calendar-date');

describe('formatCalendarDate — the stored ISO date in the hub order', () => {
  it('Spanish writes day/month/year', () => {
    expect(formatCalendarDate('2026-12-24', 'es')).toBe('24/12/2026');
    expect(formatCalendarDate('2026-04-03', 'es')).toBe('03/04/2026');
  });

  it('English writes month/day/year', () => {
    expect(formatCalendarDate('2026-12-24', 'en')).toBe('12/24/2026');
    expect(formatCalendarDate('2026-04-03', 'en')).toBe('04/03/2026');
  });

  it('the device timezone never moves the day (it is a date, not an instant)', () => {
    expect(formatCalendarDate('2026-01-01', 'es')).toBe('01/01/2026');
  });

  it('an unknown locale falls back to day first; empty or impossible dates paint nothing', () => {
    expect(formatCalendarDate('2026-12-24', 'xx-invalid-!!')).toBe('24/12/2026');
    expect(formatCalendarDate('', 'es')).toBe('');
    expect(formatCalendarDate('2026-02-30', 'es')).toBe('');
    expect(formatCalendarDate('24/12/2026', 'es')).toBe('');
  });
});

describe('parseCalendarDate — what is typed back to the stored ISO date', () => {
  it('Spanish reads day/month/year', () => {
    expect(parseCalendarDate('03/04/2026', 'es')).toBe('2026-04-03');
    expect(parseCalendarDate('24/12/2026', 'es')).toBe('2026-12-24');
  });

  it('English reads month/day/year', () => {
    expect(parseCalendarDate('03/04/2026', 'en')).toBe('2026-03-04');
    expect(parseCalendarDate('12/24/2026', 'en')).toBe('2026-12-24');
  });

  it('an unknown locale reads day first, the same order it is painted in', () => {
    expect(parseCalendarDate('03/04/2026', 'xx-invalid-!!')).toBe('2026-04-03');
  });

  it('what the field paints is read back unchanged, in both languages', () => {
    for (const locale of ['es', 'en']) {
      expect(parseCalendarDate(formatCalendarDate('2026-12-24', locale), locale)).toBe('2026-12-24');
    }
  });

  it('single digits and the usual separators (dot, dash, space) are read', () => {
    expect(parseCalendarDate('3/4/2026', 'es')).toBe('2026-04-03');
    expect(parseCalendarDate('3.4.2026', 'es')).toBe('2026-04-03');
    expect(parseCalendarDate('3-4-2026', 'es')).toBe('2026-04-03');
    expect(parseCalendarDate(' 3 4 2026 ', 'es')).toBe('2026-04-03');
  });

  it('digits only (the phone keypad has no slash) are read in the hub order', () => {
    expect(parseCalendarDate('03042026', 'es')).toBe('2026-04-03');
    expect(parseCalendarDate('03042026', 'en')).toBe('2026-03-04');
  });

  it('a pasted ISO date is read as it is, whatever the language', () => {
    expect(parseCalendarDate('2026-04-03', 'es')).toBe('2026-04-03');
    expect(parseCalendarDate('2026-04-03', 'en')).toBe('2026-04-03');
  });

  it('a half-typed or impossible date is not a date yet', () => {
    for (const text of ['', '24', '24/12', '24/12/20', '24/12/202', '31/02/2026', '29/02/2026', '32/01/2026', '00/01/2026', '24/13/2026', 'mañana', '0304202']) {
      expect(parseCalendarDate(text, 'es'), text).toBeNull();
    }
    expect(parseCalendarDate('29/02/2028', 'es')).toBe('2028-02-29');
    // Century years are leap only every 400 years: 2000 had a 29th of February, 2100 will not.
    expect(parseCalendarDate('29/02/2000', 'es')).toBe('2000-02-29');
    expect(parseCalendarDate('29/02/2100', 'es')).toBeNull();
    expect(parseCalendarDate('12/24/2026', 'es')).toBeNull();
  });
});

describe('isUnreadableDate — text that must stop a save instead of being dropped', () => {
  it('a real date, in the hub order or ISO, is readable', () => {
    expect(isUnreadableDate('03/04/2026', 'es')).toBe(false);
    expect(isUnreadableDate('2026-04-03', 'en')).toBe(false);
  });

  it('an empty or blank field is not unreadable: it is simply no date', () => {
    expect(isUnreadableDate('', 'es')).toBe(false);
    expect(isUnreadableDate('   ', 'es')).toBe(false);
  });

  it('a half-typed, impossible or foreign-order date is unreadable', () => {
    for (const text of ['24/12', '31/02/2026', '12/24/2026', 'mañana']) {
      expect(isUnreadableDate(text, 'es'), text).toBe(true);
    }
  });
});
