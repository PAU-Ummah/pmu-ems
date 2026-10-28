import { describe, test, expect } from 'vitest';
import { computeOnHand, hasExpiringSoon } from './onHand';

describe('computeOnHand', () => {
  test('returns 0 for an empty array', () => {
    expect(computeOnHand([])).toBe(0);
  });

  test('returns the quantity for a single layer', () => {
    expect(computeOnHand([{ remainingQty: 7 }])).toBe(7);
  });

  test('sums remainingQty across multiple layers', () => {
    expect(computeOnHand([{ remainingQty: 3 }, { remainingQty: 5 }, { remainingQty: 0 }])).toBe(8);
  });
});

describe('hasExpiringSoon', () => {
  const asOfIso = '2026-01-01';

  test('true when a layer expires within the window', () => {
    const layers = [{ expiryDate: '2026-01-05', remainingQty: 2 }];
    expect(hasExpiringSoon(layers, asOfIso, 7)).toBe(true);
  });

  test('false when a layer expires after the window', () => {
    const layers = [{ expiryDate: '2026-02-01', remainingQty: 2 }];
    expect(hasExpiringSoon(layers, asOfIso, 7)).toBe(false);
  });

  test('true at exactly withinDays away (boundary)', () => {
    const layers = [{ expiryDate: '2026-01-08', remainingQty: 2 }];
    expect(hasExpiringSoon(layers, asOfIso, 7)).toBe(true);
  });

  test('false when the layer has already expired', () => {
    const layers = [{ expiryDate: '2025-12-20', remainingQty: 2 }];
    expect(hasExpiringSoon(layers, asOfIso, 7)).toBe(false);
  });

  test('false when no expiryDate is set', () => {
    const layers = [{ remainingQty: 2 }];
    expect(hasExpiringSoon(layers, asOfIso, 7)).toBe(false);
  });

  test('false when the expiring layer has remainingQty 0, even if within window', () => {
    const layers = [{ expiryDate: '2026-01-02', remainingQty: 0 }];
    expect(hasExpiringSoon(layers, asOfIso, 7)).toBe(false);
  });
});
