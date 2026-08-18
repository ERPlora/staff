// A domain refusal reaches the person in THEIR language (staff#1, ADR-0055).
//
// The runtime answers a guard failure with a namespaced code (`staff.overlapping_time_off`) and an
// English message. The screens used to print that message verbatim: an English sentence in front of
// a Spanish manager. The code is the module's public ABI, so the module translates it itself
// (`locales/<lang>.json` → `errors`), and only falls back to the runtime's text when the code is
// one it does not know.
import { describe, expect, it } from 'vitest';
import { domainMessage } from './domain-error';

class FakeErploraError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'ErploraError';
  }
}

describe('domainMessage', () => {
  it('translates a code the module declares, in the active language', () => {
    const e = new FakeErploraError('staff.overlapping_time_off', 'That staff member already has …');
    expect(domainMessage(e, 'es', 'fallback')).toBe(
      'Ese miembro ya tiene una ausencia pendiente o aprobada en esas fechas.',
    );
    expect(domainMessage(e, 'en', 'fallback')).toBe(
      'That staff member already has pending or approved time off in those dates.',
    );
  });

  it('every code the module ships is translated in both languages (no key leaks to the screen)', () => {
    for (const code of [
      'staff.member_not_found', 'staff.already_inactive', 'staff.active_time_off',
      'staff.overlapping_time_off', 'staff.time_off_not_found', 'staff.invalid_transition',
      'staff.role_not_found', 'staff.member_update_rejected',
    ]) {
      for (const lang of ['es', 'en']) {
        const msg = domainMessage(new FakeErploraError(code, 'raw'), lang, 'fallback');
        expect(msg, `${code}/${lang}`).not.toBe('raw');
        expect(msg, `${code}/${lang}`).not.toBe('fallback');
        expect(msg, `${code}/${lang}`).not.toContain('staff.');
      }
    }
  });

  it('keeps the runtime message for a code it does not know, and the fallback for a bare error', () => {
    expect(domainMessage(new FakeErploraError('hub.elevation.required', 'Ask a manager'), 'es', 'fb')).toBe('Ask a manager');
    expect(domainMessage(new Error('boom'), 'es', 'fb')).toBe('boom');
    expect(domainMessage('not an error', 'es', 'fb')).toBe('fb');
  });
});
