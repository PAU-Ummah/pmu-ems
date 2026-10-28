import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

// This is intentionally a static source-text check, not a Firestore-emulator integration test.
describe('inventoryService finance separation', () => {
  const source = fs.readFileSync(
    path.join(__dirname, 'inventoryService.ts'),
    'utf-8'
  );

  it('never references the invoices collection', () => {
    expect(source).not.toContain("'invoices'");
  });

  it('never references amountSpent', () => {
    expect(source).not.toContain('amountSpent');
  });

  it('never calls a mutating operation against the events collection', () => {
    expect(source).not.toMatch(/collection\(db,\s*['"]events['"]\)/);
  });
});
