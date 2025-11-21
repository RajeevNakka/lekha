# DEF-005: Dashboard Navigation & Action Issues

## Defect Information

| Field | Value |
|-------|-------|
| **Defect ID** | DEF-005 |
| **Title** | Dashboard "New Transaction" and Floating Add buttons navigate incorrectly |
| **Severity** | High |
| **Priority** | P2 |
| **Status** | Open |
| **Reported By** | Tester 1 |
| **Reported Date** | 2025-11-21 |
| **Assigned To** | Developer Agent |
| **Feature Area** | Dashboard |

## Environment

- **Application Version/Branch**: tester-branch
- **Browser**: Chrome (via Antigravity browser)
- **Operating System**: Windows
- **Test Environment**: Lekha-Test worktree
- **Dev Server**: http://localhost:5173/lekha/

## Description

There are multiple issues with the "Add Transaction" actions on the Dashboard:

1. **Incorrect Navigation**: Both the "New Transaction" button (top right) and the floating "+" button (bottom right) navigate to the **Transaction List** (`/transactions`) instead of the **Create Transaction** page (`/transactions/new`).
2. **Unexpected Behavior**: Clicking the floating "+" button navigates to the Transaction List and immediately triggers a **Delete Confirmation Dialog**, which is potentially dangerous and confusing.
3. **Missing Feature**: The "Quick Actions" section (Add Income / Add Expense buttons) mentioned in requirements is missing from the Dashboard.

## Preconditions

1. Application is running
2. Navigate to Dashboard (`/lekha/`)

## Steps to Reproduce

1. Open Dashboard
2. Click "New Transaction" button in top right corner -> Observe it goes to Transaction List
3. Go back to Dashboard
4. Click floating "+" button in bottom right corner -> Observe it goes to Transaction List and opens Delete Dialog

## Expected Result

- "New Transaction" button should navigate to `/transactions/new`
- Floating "+" button should navigate to `/transactions/new`
- "Quick Actions" section should be visible with specific Income/Expense options

## Actual Result

- Buttons navigate to `/transactions`
- Floating button triggers Delete Dialog
- Quick Actions section is missing

## Screenshots/Evidence

![Dashboard View](screenshots/DEF-005/dashboard-view.png)
*Dashboard showing "New Transaction" button*

![Floating Add Error](screenshots/DEF-005/floating-add-error.png)
*Result of clicking floating "+" button: Redirects to list and opens Delete Dialog*

**Video Recording**: file:///C:/Users/rajee/.gemini/antigravity/brain/34dd5cb7-35c2-450c-adf6-5f4ccbe73454/dashboard_test_1763729340896.webp

## Additional Information

- **Reproducibility**: Always
- **Impact**: Users cannot easily create transactions from the Dashboard. The delete dialog appearing is a significant UX bug.

## Developer Notes

- Check `Link` or `useNavigate` paths in `Dashboard.tsx`
- Check if the floating button is reusing a component that has a default "delete" action or ID conflict
