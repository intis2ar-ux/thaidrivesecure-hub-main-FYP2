

# Applications Page — Improvement Recommendations

After auditing `src/pages/Applications.tsx` and surrounding components, here are concrete, high-value improvements grouped by impact. Pick any combination — each item is independently shippable.

---

## 1. Operational Power Features (highest ROI)

**a. Bulk actions with row selection**
Add a checkbox column + a sticky bulk action bar that appears when ≥1 row is selected. Actions: Bulk Approve, Bulk Reject, Bulk Delete, Bulk Export. Today, staff must click row-by-row through 50+ orders.

**b. Quick approve/reject from the row**
Add small green ✓ / red ✗ icon buttons in the Actions column for `pending` rows only. One click → confirmation toast with Undo. Skips the two-dialog flow for the common case.

**c. CSV / Excel export of filtered results**
"Export" button next to the filter card. Exports the currently filtered + sorted rows so finance/ops can reconcile in Excel.

**d. Saved views / quick filter chips**
Above the table: pill chips for "Pending today", "Awaiting payment", "Travel this week", "Rejected (last 7d)". One-click filtering — much faster than the dropdown.

---

## 2. Filtering & Search Upgrades

**a. Multi-dimensional filters**
Currently only Status + free-text. Add:
- Date range picker (created at / travel date)
- Border route filter
- Vehicle type filter
- Payment status filter
- Package filter

**b. Debounced search + result count feedback**
Debounce the search input (250ms) and show "X of Y results" inline. Also search across `vehicleType` and `where`.

**c. Persist filters in URL query params**
`/applications?status=pending&route=padang-besar` — shareable links and survives refresh.

---

## 3. Table UX Polish

**a. Sortable columns**
Only "Created At" sorts today. Add sort to: Order ID, Customer Name, Travel Day, Total Price, Status.

**b. Column visibility toggle**
Dropdown to show/hide columns. The table is 12 columns wide and forces horizontal scroll on most screens.

**c. Sticky first/last columns**
Pin Order ID (left) and Actions (right) when scrolling horizontally.

**d. Density toggle**
Compact / Comfortable rows — power users prefer compact for scanning 50+ rows.

**e. Clickable Order ID**
Make the Order ID cell open the detail panel (instead of needing to find the small "Details" button).

**f. Row-level visual cues**
Subtle left border color matching status (amber for pending, green for approved, red for rejected) so the eye scans faster.

---

## 4. EditOrderModal Improvements

**a. Inline edit for single fields**
Click a cell (name, phone) → edit in place + Enter to save. Faster than opening a modal for typo fixes.

**b. Auto-recalculate Total Price**
When packages, vehicle type, or duration changes in the modal, recompute and preview the new total before saving (use existing `formatPrice` / `pricing.ts`).

**c. Phone number formatting + country prefix**
Show formatted preview (`+60 12-345 6789`) and validate Malaysian format.

**d. Diff preview before save**
"You are changing: Vehicle Sedan → MPV, Duration 7d → 14d, Price RM120 → RM180." Confirms intent.

**e. Unsaved changes guard**
Block close if user has edits + show "Discard changes?" prompt.

---

## 5. Status Workflow Improvements

**a. Reason templates for rejection**
Pre-baked dropdown ("Invalid passport image", "Payment unverified", "Document expired") + free-text. Speeds up rejections and standardizes audit logs.

**b. Required notes for rejection**
Currently notes are optional even when rejecting — make required.

**c. Status timeline preview in row**
Hover over the Status badge → tooltip shows last 3 status events from `status_logs`.

**d. Undo toast after status change**
After approve/reject toast, show "Undo" button for 5s — reverts via a new status_log entry.

---

## 6. Empty / Loading / Error States

**a. Better empty state**
Today: generic "No applications found." Improve to context-aware:
- No matches for filters → "Clear filters" button
- No applications at all → onboarding hint + link to docs

**b. Skeleton mirrors the real table layout**
Current skeleton is a single block. Use 5 skeleton rows matching column widths so the layout doesn't jump.

**c. Real-time toast on new application**
When `useApplications` receives a new `pending` doc, show "New application received — TDS-051" with a "View" button. Increases ops responsiveness.

---

## 7. Performance

**a. Server-side pagination**
Currently fetches ALL orders then filters/paginates client-side. At 500+ orders this becomes slow. Switch to Firestore `query` + `limit` + `startAfter`.

**b. Memoize `filteredApplications`**
Wrap in `useMemo` keyed on `[applications, searchTerm, statusFilter, sortOrder]` to avoid re-sorting on every render (e.g., when opening the detail panel).

**c. Virtualized rows for large lists**
Use `@tanstack/react-virtual` if rowcount routinely exceeds 100.

---

## 8. Accessibility & Mobile

**a. Action buttons need `aria-label`**
The trash and pencil icon buttons have no accessible name. Add `aria-label="Delete order TDS-001"`.

**b. Mobile card view**
Below `md` breakpoint, swap the table for a card list. Today the table forces a 1200px horizontal scroll on phones.

**c. Keyboard shortcuts**
`/` → focus search, `Esc` → close any open modal/sheet, `j`/`k` → next/prev row.

---

## 9. Audit / Analytics Surface

**a. Show `lastEditedBy` + `lastEditedAt` in detail panel**
You already write these fields in `updateApplicationFields` but never display them. Add a "Last edited by Alice · 2h ago" line.

**b. KPI strip above the filter bar**
4 small stat cards: Pending count, Approved today, Rejected today, Avg processing time. Currently this lives only on the Dashboard — surfacing here helps ops triage.

---

## Recommended First Wave (1 implementation pass)

If you want a single focused upgrade, I'd ship:

1. Bulk select + bulk approve/reject/delete (1a)
2. Quick approve/reject icons on pending rows (1b)
3. Sortable columns for Customer, Travel Day, Total Price (3a)
4. Debounced search + URL query params (2b, 2c)
5. Auto-recalculated Total Price in EditOrderModal (4b)
6. KPI strip at top (9b)

Reply with the numbers you want and I'll switch to implementation mode.

