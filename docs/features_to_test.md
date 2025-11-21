# Features Ready for Testing

> [!IMPORTANT]
> **Testing Environment**: A dedicated git worktree has been created for testing at `../Lekha-Test` (branch: `tester-branch`). Please perform all tests in that directory.

## 1. Book Management
- [ ] **Create New Book**: Verify creating a new book with custom currency and fields.
- [ ] **Switch Books**: Verify switching between multiple books.
- [ ] **Book Settings - Enhanced** (NEW):
    - **Basic Information**:
        - [ ] Edit book name and verify it updates everywhere.
        - [ ] Change currency from dropdown (18 currencies available).
        - [ ] Verify "Created On" date is displayed (read-only).
        - [ ] Verify "Total Transactions" count is correct.
        - [ ] Select a number field as "Primary Amount Field" for calculations.
    - **Field Configuration** (Collapsible):
        - [ ] Verify Field Configuration section is collapsed by default.
        - [ ] Verify summary badges show correct counts (X required, Y visible, Z hidden).
        - [ ] Expand section and verify all fields are displayed.
        - [ ] Add/Remove fields.
        - [ ] **Multiline Fields**: Verify adding a text field with "Multiline" enabled.
        - [ ] Reorder fields.
        - [ ] Configure field visibility and requirements.
        - [ ] Verify section auto-expands when adding a new field.
    - **Additional Preferences** (Collapsible - NEW):
        - [ ] Verify section is collapsed by default.
        - **Date & Time Preferences**:
            - [ ] Change date format between YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY.
            - [ ] Set default transaction time (Current, Start of Day, or specific times).
        - **Transaction Defaults**:
            - [ ] Set default transaction type (Income/Expense/Transfer).
            - [ ] Set default category.
        - **Display Preferences**:
            - [ ] Change decimal places for amounts (0, 1, 2, or 3).
            - [ ] Toggle "Show Decimal Zeros" (₹100 vs ₹100.00).
    - **Data Management**:
        - [ ] Export Book (JSON).
        - [ ] Export Transactions (CSV).
        - [ ] Import Transactions (CSV).
    - **Danger Zone**:
        - [ ] Delete Book (verify confirmation dialog works).
    - **Save Changes**:
        - [ ] Make changes across different sections.
        - [ ] Verify "Save Changes" button becomes enabled.
        - [ ] Click Save and verify all changes persist.
        - [ ] Refresh page and verify changes are still there.

## 2. Transaction Management
- [ ] **Create Transaction**:
    - [ ] Verify all field types (Text, Number, Date, Dropdown, Checkbox).
    - [ ] Verify **Multiline Text** input (textarea) for configured fields.
    - [ ] Verify validation (Required fields).
    - [ ] Verify custom fields defined in Book Settings.
- [ ] **Edit Transaction**: Verify updating existing transactions.
- [ ] **Delete Transaction**: Verify deleting a transaction.
- [ ] **List View**:
    - [ ] Verify **Date & Time** display in the date column.
    - [ ] Verify sorting (Date, Amount).
    - [ ] Verify filtering (Date Range, Type, Dynamic Filters).
    - [ ] Verify column customization (Toggle visibility, Reorder).
    - [ ] Verify search functionality.

## 3. Data Persistence
- [ ] Verify data persists after page reload (IndexedDB).

## 4. Audit Logs
- [ ] **View History**: Verify "Audit Log" page displays all actions (Create, Update, Delete).
- [ ] **Verify Details**: Check that changes (old value vs new value) are recorded correctly.

## 5. Dashboard
- [ ] **Quick Stats**: Verify total income, expenses, and balance are correct.
- [ ] **Recent Activity**: Verify list of recent transactions.
- [ ] **Quick Actions**: Verify buttons to add transactions and create books.

## 6. Reports Module
- [ ] **Cash Flow**: Verify Income vs Expense summary and chart.
- [ ] **Category Breakdown**: Verify expense distribution by category.
- [ ] **Monthly Trends**: Verify Income and Expense trends over time.
- [ ] **Party Ledger**: Verify total paid/received per party.
- [ ] **Custom Reports**: Verify grouping transactions by custom fields.
- [ ] **Filtering**: Verify global date range filter (This Month, Last Month, This Year, All Time).

## 7. Smart CSV Import
- [ ] **Import Modal**: Verify file upload handling.
- [ ] **CSV Parsing**: Verify handling of quoted fields and newlines.
- [ ] **Column Mapping**: Verify auto-guessing and manual mapping.
- [ ] **Batch Processing**: Verify transactions are imported correctly.

## 8. Global Settings
- [ ] **Backup All**: Verify downloading a full backup of all books.
- [ ] **Restore**: Verify restoring data from a backup file.
- [ ] **Import Book**: Verify importing a single book from JSON.

## 9. Mobile UI (New)
- [ ] **Responsive Navigation**:
    - [ ] Verify Bottom Navigation Bar appears on mobile (< 768px).
    - [ ] Verify Sidebar appears on desktop (> 768px).
    - [ ] Verify navigation links work correctly in both modes.
- [ ] **Transaction List (Mobile)**:
    - [ ] Verify transactions are displayed as Cards on mobile.
    - [ ] Verify "Add Transaction" floating button is visible and functional.
    - [ ] Verify Edit/Delete actions are accessible in Card view.

## 10. Regression Testing (Critical Fixes)
- [ ] **DEF-002: Edit Amount**:
    - [ ] Edit a transaction's amount.
    - [ ] Save and refresh.
    - [ ] Verify the new amount is persisted.
- [ ] **DEF-003: Delete Transaction**:
    - [ ] Click delete on a transaction.
    - [ ] Verify confirmation dialog appears.
    - [ ] Confirm delete.
    - [ ] Verify transaction is removed from list.
- [ ] **DEF-006: Date/Time Not Binding in Edit Mode** (NEW):
    - [ ] Create a transaction with a specific date and time.
    - [ ] Edit the transaction.
    - [ ] Verify the date/time field shows the existing value (not empty).
    - [ ] Change the date/time.
    - [ ] Save and verify the new date/time is persisted.

## 11. Book Settings Enhancements (NEW - Priority Testing)

> [!NOTE]
> These are brand new features. Please test thoroughly and report any issues.

- [ ] **Basic Information Section**:
    - [ ] Verify book name can be edited and updates in all places (sidebar, header).
    - [ ] Verify currency dropdown has 18 options (INR, USD, EUR, etc.).
    - [ ] Change currency and verify it reflects in transaction displays.
    - [ ] Verify transaction count matches actual number of transactions.
    - [ ] Create transactions with multiple number fields, then test "Primary Amount Field" selector:
        - [ ] Select different number field as primary.
        - [ ] Verify Dashboard stats use the selected field.
        - [ ] Verify Reports use the selected field.

- [ ] **Collapsible Field Configuration**:
    - [ ] **Initial State**: Verify section is collapsed on page load.
    - [ ] **Summary**: Verify header shows "Field Configuration (X fields)".
    - [ ] **Badges**: Verify badges show correct counts for required/visible/hidden fields.
    - [ ] **Expand/Collapse**: Click header to expand, verify all field editors appear.
    - [ ] **Add Field**: Click "Add Field" button, verify:
        - [ ] Section auto-expands.
        - [ ] New field appears in the list.
        - [ ] Field can be configured immediately.
    - [ ] **Save**: Configure fields, save, refresh, verify state persists.

- [ ] **Additional Preferences Section**:
    - [ ] **Initial State**: Verify section is collapsed by default.
    - [ ] **Expand**: Click to expand and see all preference options.
    - [ ] **Date Format**:
        - [ ] Change to DD/MM/YYYY.
        - [ ] Save settings.
        - [ ] Create/view transactions, verify dates display in new format.
    - [ ] **Default Transaction Time**:
        - [ ] Set to "Start of Day (00:00)".
        - [ ] Create new transaction, verify time defaults to 00:00.
        - [ ] Try "Morning (09:00)", "Noon (12:00)", "Evening (18:00)".
    - [ ] **Default Transaction Type**:
        - [ ] Set to "Income".
        - [ ] Create new transaction, verify type defaults to Income.
    - [ ] **Default Category**:
        - [ ] Enter a category name.
        - [ ] Create new transaction, verify category is pre-filled.
    - [ ] **Decimal Places**:
        - [ ] Set to 0 decimals.
        - [ ] View transaction list, verify amounts show as "₹100" (no decimals).
        - [ ] Set to 3 decimals.
         - [ ] Verify amounts show as "₹100.000".
    - [ ] **Show Decimal Zeros**:
        - [ ] Uncheck this option.
        - [ ] Verify whole numbers display as "₹100" instead of "₹100.00".

- [ ] **Auto-Save Detection**:
    - [ ] Edit book name, verify "Save Changes" button becomes enabled.
    - [ ] Edit currency, verify button enables.
    - [ ] Change any preference, verify button enables.
    - [ ] Modify field configuration, verify button enables.
    - [ ] Save changes, verify button becomes disabled again.

- [ ] **Persistence**:
    - [ ] Make changes to all sections (name, currency, fields, preferences).
    - [ ] Save changes.
    - [ ] Refresh browser (F5).
    - [ ] Navigate back to Book Settings.
    - [ ] Verify ALL changes persisted correctly.

- [ ] **Multiple Books**:
    - [ ] Configure settings for Book A (e.g., INR, DD/MM/YYYY, 0 decimals).
    - [ ] Configure settings for Book B (e.g., USD, MM/DD/YYYY, 2 decimals).
    - [ ] Switch between books.
    - [ ] Verify each book retains its own preferences.
    - [ ] Verify transactions in each book use their respective settings.

