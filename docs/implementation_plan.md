# Implementation Plan - Audit Logs & Field Enhancements

## Goal Description
Implement missing features identified during exploration:
1.  **Audit Logs**: Enable viewing transaction history.
2.  **Multiline Fields**: Allow configuring text fields as multiline (textarea).
3.  **Date-Time Display**: Show time component in transaction list.

## Proposed Changes

### Lib Layer
#### [MODIFY] [db.ts](file:///g:/Git/Apps/Lekha/src/lib/db.ts)
- Implement `getAuditLogs(bookId: string)` to retrieve logs from `audit_logs` store.

#### [MODIFY] [utils.ts](file:///g:/Git/Apps/Lekha/src/lib/utils.ts)
- Add `formatDateTime(date: string | Date)` to display date and time (e.g., "DD/MM/YYYY HH:mm").

### Components
#### [MODIFY] [TransactionHistory.tsx](file:///g:/Git/Apps/Lekha/src/components/Transactions/TransactionHistory.tsx)
- Uncomment and use `db.getAuditLogs` to fetch and display logs.

#### [MODIFY] [BookSettings.tsx](file:///g:/Git/Apps/Lekha/src/components/Books/BookSettings.tsx)
- Add a checkbox to toggle `multiline` property when adding/editing a 'text' field.

#### [MODIFY] [TransactionList.tsx](file:///g:/Git/Apps/Lekha/src/components/Transactions/TransactionList.tsx)
- Update date column rendering to use `formatDateTime` instead of `formatDate`.

## Verification Plan

### Manual Verification
1.  **Audit Logs**:
    - Create/Edit/Delete a transaction.
    - Go to "Audit Log" page.
    - Verify that the actions are listed with correct details (changes, timestamp).
2.  **Multiline Fields**:
    - Go to Book Settings.
    - Add a new text field and check "Multiline".
    - Create a transaction and verify it shows a textarea.
    - Enter multi-line text and save.
    - Verify it displays correctly in the list (truncated) and details modal.
3.  **Date-Time Display**:
    - Create a transaction with a specific time.
    - Check the Transaction List.
    - Verify the date column shows the time.
