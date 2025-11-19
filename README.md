# Lekha (లేఖ / लेखा)

**Lekha** - A flexible, offline-first financial tracking application that adapts to your unique accounting needs.

*Lekha* means "accounts" or "records" in Sanskrit and Telugu, reflecting the app's purpose of maintaining accurate financial records.

## ✨ Features

### 🎯 Dynamic Field System
- **Fully Customizable Fields**: Configure custom fields per book (text, number, date, dropdown, checkbox)
- **Smart Auto-Population**: Automatically populate dropdown options from existing transaction data
- **Multi-line Support**: Enhanced input for descriptions, remarks, and notes
- **Field Management**: Reorder fields, control visibility, and set required fields
- **Date & Time Tracking**: Precise timestamp tracking for all transactions

### 📊 Multi-Book Management
- **Separate Books**: Create independent books for different projects, purposes, or entities
- **Custom Configurations**: Each book has its own field configuration
- **Easy Switching**: Quick navigation between books
- **Export/Import**: Backup and restore individual books

### 📥 Smart CSV Import
- **Auto-Detection**: Automatically detect field types and configurations from CSV headers
- **Flexible Import Modes**:
  - Import as a new book with auto-configured schema
  - Import into existing books
- **Advanced Handling**:
  - Merge split amount columns (income/expense)
  - Combine separate date and time fields
  - Smart field type detection (numbers, dates, dropdowns)
- **Data Preservation**: Maintain data integrity during import

### 🎨 Modern User Experience
- **Offline-First**: Built on IndexedDB for complete offline functionality
- **Column Customization**: Reorder, hide, and filter columns in transaction lists
- **Advanced Filtering**: Filter transactions by type, date range, and custom fields
- **Search**: Quick search across transaction descriptions and fields
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: TailwindCSS 4
- **Form Management**: React Hook Form with Zod validation
- **State Management**: Zustand
- **Database**: IndexedDB (via idb)
- **Routing**: React Router v7
- **Build Tool**: Vite
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/RajeevNakka/lekha.git
cd lekha
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 📖 Usage

### Creating Your First Book

1. Click "Create Book" from the sidebar or dashboard
2. Enter a book name and select currency
3. Configure custom fields for your transactions
4. Start adding transactions!

### Importing from CSV

1. Go to Settings → Import CSV as New Book
2. Upload your CSV file
3. Review auto-detected fields and mappings
4. Configure field types and options
5. Complete the import

### Customizing Fields

1. Navigate to Book Settings
2. Add new fields or modify existing ones
3. For dropdown fields, click "Auto-fill" to populate options from existing data
4. Reorder fields using the up/down arrows
5. Save changes

## 🎯 Use Cases

- **Personal Finance**: Track personal income and expenses
- **Freelance Projects**: Separate books for each client or project
- **Small Business**: Manage business transactions with custom categories
- **Travel Expenses**: Track expenses during trips with custom fields
- **Shared Expenses**: Record group expenses with party tracking

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by the need for flexible, offline-first financial tracking
- Named after the Sanskrit/Telugu word for "accounts" (లేఖ / लेखा)

## 📧 Contact

Rajeev Nakka - [@RajeevNakka](https://github.com/RajeevNakka)

Project Link: [https://github.com/RajeevNakka/lekha](https://github.com/RajeevNakka/lekha)
