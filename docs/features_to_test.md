# Features Ready for Testing

> [!IMPORTANT]
> **Testing Environment**: A dedicated git worktree has been created for testing at `../Lekha-Test` (branch: `tester-branch`). Please perform all tests in that directory.

## 1. Book Management
- [ ] **Create New Book**: Verify creating a new book with custom currency and fields.
- [ ] **Switch Books**: Verify switching between multiple books.
- [ ] **Book Settings**:
    - [ ] Add/Remove fields.
    - [ ] **Multiline Fields**: Verify adding a text field with "Multiline" enabled.
    - [ ] Reorder fields.
    - [ ] Configure field visibility and requirements.
    - [ ] Export Book (JSON).
    - [ ] Export Transactions (CSV).
    - [ ] Import Transactions (CSV).
    - [ ] Delete Book.

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
