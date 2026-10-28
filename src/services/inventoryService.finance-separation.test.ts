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

// The Phase 2 UI forms are the only entry points that create issue/write-off movements;
// this is the same static check extended to those two files for the same reason.
describe('inventory issue/write-off UI finance separation', () => {
  const issueFormSource = fs.readFileSync(
    path.join(
      __dirname,
      '../app/(authenticated)/inventory/_component/IssueForm.tsx'
    ),
    'utf-8'
  );
  const writeOffFormSource = fs.readFileSync(
    path.join(
      __dirname,
      '../app/(authenticated)/inventory/_component/WriteOffForm.tsx'
    ),
    'utf-8'
  );

  it('IssueForm never references invoices or amountSpent', () => {
    expect(issueFormSource).not.toContain("'invoices'");
    expect(issueFormSource).not.toContain('amountSpent');
  });

  it('WriteOffForm never references invoices or amountSpent', () => {
    expect(writeOffFormSource).not.toContain("'invoices'");
    expect(writeOffFormSource).not.toContain('amountSpent');
  });
});
