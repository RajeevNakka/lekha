# Walkthrough - Audit Logs & Field Enhancements

I have implemented the following features to enhance the application's functionality and data tracking.

## 1. Audit Logs
**Goal**: Track all changes made to transactions for accountability.
**Changes**:
- Implemented `getAuditLogs` in `db.ts` to fetch logs from IndexedDB.
- Updated `TransactionHistory.tsx` to display these logs.
- Logs are automatically created when adding, updating, or deleting transactions.

## 2. Multiline Text Fields
**Goal**: Allow users to enter longer descriptions or notes.
**Changes**:
- Added a "Multiline (Textarea)" checkbox in **Book Settings** when adding/editing a 'Text' field.
- Updated `BookSettings.tsx` to save this configuration.
- The `DynamicForm` component already supports rendering textareas for multiline fields.
- `TransactionDetailsModal` displays these fields with `whitespace-pre-wrap` to preserve formatting.

## 3. Date-Time Display
**Goal**: Show the exact time of transactions in the list view.
**Changes**:
- Added `formatDateTime` utility in `utils.ts`.
- Updated `TransactionList.tsx` to use this utility for the Date column.
- Transactions now show "DD/MM/YYYY, HH:mm" (format depends on locale).

## Verification
Since I am a Developer Agent, I have verified the code logic and ensured that:
- The `db` methods correctly interact with IndexedDB.
- The React components correctly use the new data and utilities.
- Lint errors have been resolved.

The features are now ready for the **Tester Agent** to verify in the running application.

---

# Project Overview & Historical Features

## Overview
ProjectBooks (Lekha) is a responsive web application for managing multiple project cashbooks. It allows users to track income and expenses, manage categories, and view reports.

## Core Features

### 1. Dashboard
- **Quick Stats**: View total income, expenses, and balance.
- **Recent Activity**: List of recent transactions.
- **Quick Actions**: Buttons to add transactions and create books.

### 2. Transaction Management
- **Create Transaction**: Dynamic form with validation.
- **List Transactions**: Filterable list with sorting.
- **Edit Transaction**: Update existing entries.
- **Delete Transaction**: Remove entries with confirmation.
- **Audit Log**: View history of changes (create, update, delete).

### 3. Book Management
- **Create Book**: Create multiple cashbooks with custom currencies.
- **Switch Books**: Seamlessly switch between different projects.

## Advanced Features

### Reports Module
- **Cash Flow**: Income vs Expense summary and chart.
- **Category Breakdown**: Expense distribution by category.
- **Monthly Trends**: Income and Expense trends over time.
- **Party Ledger**: Total paid/received per party.
- **Custom Reports**: Group transactions by any custom field.

### Smart CSV Import
- **Robust CSV Parsing**: Handles quoted fields, newlines, and delimiters.
- **Flexible Date Parsing**: Supports multiple date formats.
- **Intelligent Column Mapping**: Auto-guesses mappings and supports custom fields.

### Global Management
- **Backup All**: Download a full backup of all books and transactions.
- **Restore**: Restore data from a backup file.
- **Import Book**: Import a single book from a JSON file.
