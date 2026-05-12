import { normalizeRut, formatRut, isValidRut, areRutsEqual } from '../validators/rut.validator';

describe('normalizeRut', () => {
  it('strips dots', () => expect(normalizeRut('11.111.111-1')).toBe('111111111'));
  it('strips hyphens', () => expect(normalizeRut('11111111-1')).toBe('111111111'));
  it('strips spaces', () => expect(normalizeRut(' 11111111-1 ')).toBe('111111111'));
  it('uppercases DV k', () => expect(normalizeRut('12345678-k')).toBe('12345678K'));
  it('handles no formatting', () => expect(normalizeRut('111111111')).toBe('111111111'));
});

describe('formatRut', () => {
  it('formats 8-digit RUT', () => expect(formatRut('76354771K')).toBe('76.354.771-K'));
  it('is idempotent on already formatted', () => expect(formatRut('11.111.111-1')).toBe('11.111.111-1'));
  it('formats from raw digits', () => expect(formatRut('111111111')).toBe('11.111.111-1'));
});

describe('areRutsEqual', () => {
  it('matches with vs without dots', () => expect(areRutsEqual('11.111.111-1', '11111111-1')).toBe(true));
  it('matches formatted vs raw', () => expect(areRutsEqual('11.111.111-1', '111111111')).toBe(true));
  it('rejects different RUTs', () => expect(areRutsEqual('11111111-1', '22222222-2')).toBe(false));
  it('case insensitive on DV', () => expect(areRutsEqual('12345678-k', '12345678-K')).toBe(true));
});

describe('isValidRut', () => {
  it('accepts valid formatted RUT', () => expect(isValidRut('76.354.771-K')).toBe(true));
  it('accepts valid raw RUT', () => expect(isValidRut('76354771K')).toBe(true));
  it('rejects invalid DV', () => expect(isValidRut('11111111-9')).toBe(false));
  it('rejects non-string', () => expect(isValidRut(123)).toBe(false));
});
