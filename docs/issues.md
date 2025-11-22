# Issues Log

This file tracks all reported issues and defects.

## Defects

| ID | Severity | Feature | Description | Status |
|----|----------|---------|-------------|--------|
| 1 | High | Transaction Management | Edit Transaction form shows duplicate fields (Amount, Description). | Resolved |
| [DEF-002](defects/DEF-002-edit-amount-not-saving.md) | High | Transaction Management | Editing a transaction does not save Amount changes (Description saves correctly). | **Resolved** - Ready for QA |
| [DEF-003](defects/DEF-003-delete-transaction-not-working.md) | High | Transaction Management | Delete button in Transaction List does not delete the transaction and shows no confirmation dialog. | **Resolved** - Ready for QA |
| [DEF-004](defects/DEF-004-mobile-ui-not-responsive.md) | High | UI/UX - Responsive Design | Application unusable in mobile portrait mode - sidebar does not collapse, content requires horizontal scrolling. | **Resolved** - Ready for QA |
| [DEF-005](defects/DEF-005-dashboard-navigation-issues.md) | High | Dashboard | "New Transaction" and floating "+" buttons navigate to Transaction List instead of Create page. Floating button triggers Delete dialog. | **Cannot Reproduce** - Testing Required |
| DEF-006 | High | Transaction Management | Date/Time not binding in edit mode - field appears empty when editing transactions. | **Resolved** - Ready for QA |
| DEF-007 | Medium | Book Management | Book Settings - Save Changes button doesn't persist field configuration | **Resolved** - Ready for QA |
| DEF-008 | High | Global Settings | Global Settings not accessible - Backup/Restore/Import features not found in UI | **Resolved** - Ready for QA |
| DEF-009 | Medium | Book Management | Delete Book button doesn't work - No confirmation dialog, book not deleted | **Resolved** - Ready for QA |
| DEF-010 | High | Global Settings | Create Template modal does not submit/close after clicking Create | Open - Found in Section 12 Testing |
