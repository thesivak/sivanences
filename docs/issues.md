# Known Issues

Last updated: 2026-01-03

---

## Active Issues

### BUG-001: formatPercent displays wrong percentage in active loans table

**Priority:** HIGH
**Status:** Open
**Location:** `components/active-loans-table.tsx:144`

**Description:**
The "Celkem splaceno" (Total paid off) percentage is displayed incorrectly, showing values like `2500%` instead of `25%`.

**Root Cause:**
`formatPercent()` expects a decimal value (e.g., `0.25` for 25%), but the code passes a pre-multiplied value.

**Current Code:**
```typescript
{formatPercent((totalOriginalAmount - totalRemainingBalance) / totalOriginalAmount * 100)}
```

**Fix:**
```typescript
{formatPercent((totalOriginalAmount - totalRemainingBalance) / totalOriginalAmount)}
```

---

## Improvements Needed

### IMP-001: Missing test coverage for investment projections

**Priority:** Medium
**Status:** Open
**Location:** `app/investice/page.tsx:178-208`

**Description:**
The compound interest and future value calculations have no unit tests.

**Action Required:**
Create `app/investice/page.test.tsx` or extract calculation logic to `lib/investment.ts` with tests.

---

### IMP-002: Missing test coverage for summary API

**Priority:** Medium
**Status:** Open
**Location:** `app/api/summary/route.ts`

**Description:**
No unit tests for:
- Balance calculation
- Average monthly expenses calculation
- Year boundary handling for previous month
- Loan payment totals

**Action Required:**
Create `app/api/summary/route.test.ts`

---

### IMP-003: Missing test coverage for active loans API

**Priority:** Medium
**Status:** Open
**Location:** `app/api/loans/active/route.ts`

**Description:**
No unit tests for:
- Months elapsed calculation
- Remaining balance lookup from amortization
- Paid-off percentage calculation

**Action Required:**
Create `app/api/loans/active/route.test.ts`

---

### IMP-004: Currency precision standardization

**Priority:** Low
**Status:** Open
**Location:** Various

**Description:**
Currency values are stored with full floating-point precision, which can lead to values like `10606.548219...` in the database.

**Recommendation:**
Round all currency values to 2 decimal places before storage.

---

## Resolved Issues

_None yet_

---

## Related Documentation

- [Full Financial Audit Report](./financial-audit-2026-01-03.md)
