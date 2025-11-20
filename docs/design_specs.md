# ProjectBooks - Design Specifications

## 1. User Stories

### Core Management
- **US-01**: As a User, I want to create multiple "Books" (projects) so I can keep finances separate.
- **US-02**: As a Book Owner, I want to invite members with specific roles (Admin, Member, Viewer) to collaborate.

### Customization
- **US-03**: As an Admin, I want to customize transaction fields (hide/show, reorder, rename) to fit the project's needs.
- **US-04**: As an Admin, I want to define custom fields (Text, Number, Date, Dropdown, Checkbox, File) with validation rules.

### Transactions
- **US-05**: As a Member, I want to record Income, Expense, and Transfer transactions with all configured fields.
- **US-06**: As a Member, I want to attach files (images/PDFs) to transactions.
- **US-07**: As a Member, I want to bulk move or copy transactions between books.

### Reporting & Data
- **US-08**: As a User, I want to filter transactions by date, category, party, and custom tags.
- **US-09**: As a Viewer, I want to see aggregate reports (Total Income/Expense, Balance) visualized.
- **US-10**: As a User, I want to export data to CSV/PDF for external use.

---

## 2. Data Model (JSON Schema)

### `Book`
```json
{
  "id": "uuid",
  "name": "Project Alpha",
  "currency": "USD",
  "created_at": "ISO8601",
  "field_config": [
    {
      "key": "party",
      "label": "Payee/Payer",
      "type": "text",
      "visible": true,
      "required": true,
      "order": 1
    },
    {
      "key": "custom_invoice_no",
      "label": "Invoice #",
      "type": "text",
      "visible": true,
      "required": false,
      "order": 2,
      "validation": { "regex": "^INV-\\d+" }
    }
  ],
  "members": [
    { "user_id": "u1", "role": "owner" }
  ]
}
```

### `Transaction`
```json
{
  "id": "uuid",
  "book_id": "uuid",
  "type": "expense", // income, expense, transfer
  "amount": 150.00,
  "date": "ISO8601",
  "description": "Server costs",
  "category_id": "cat_1",
  "party_id": "party_1", // optional, linked to Party entity
  "payment_mode": "credit_card",
  "tags": ["infrastructure", "monthly"],
  "attachments": ["url1", "url2"],
  "custom_data": {
    "custom_invoice_no": "INV-2023-001"
  },
  "created_by": "u1",
  "created_at": "ISO8601"
}
```

### `Category`
```json
{
  "id": "uuid",
  "book_id": "uuid",
  "name": "Hosting",
  "type": "expense", // income, expense
  "icon": "server",
  "color": "#FF5733"
}
```

---

## 3. API Endpoints (REST Design)

### Books
- `GET /api/books` - List all books user has access to
- `POST /api/books` - Create new book
- `GET /api/books/:id` - Get book details + config
- `PUT /api/books/:id/config` - Update field configuration

### Transactions
- `GET /api/books/:bookId/transactions` - List with filters (query params)
- `POST /api/books/:bookId/transactions` - Create transaction
- `PUT /api/books/:bookId/transactions/:id` - Update transaction
- `POST /api/books/:bookId/transactions/bulk-op` - Move/Copy/Delete

### Reports
- `GET /api/books/:bookId/stats` - Aggregate metrics

---

## 4. Component List

### Atoms
- `Button`, `Input`, `Select`, `DatePicker`, `Badge`, `Icon`

### Molecules
- `FormField` (Label + Input + Error)
- `TransactionRow` (Date, Desc, Amount, Actions)
- `FilterBar` (Search + Dropdowns)

### Organisms
- `DynamicForm` (Renders fields based on `Book.field_config`)
- `TransactionTable` (Virtual list for performance)
- `Sidebar` (Navigation + Book Switcher)
- `StatsWidget` (Charts/Summary)

### Templates/Pages
- `DashboardLayout`
- `BookView`
- `ReportView`
