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
