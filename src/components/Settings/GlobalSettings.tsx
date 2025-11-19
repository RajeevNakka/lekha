import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';
import { db } from '../../lib/db';
import { Download, Upload, AlertTriangle, HardDrive, Database, Book as BookIcon, Trash2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Transaction } from '../../types';
import { ImportNewBookModal } from './ImportNewBookModal';

export function GlobalSettings() {
    const { books, fetchBooks, setActiveBook, deleteBook, activeBookId } = useStore();
    const navigate = useNavigate();
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [showImportNewBookModal, setShowImportNewBookModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]);

    const handleBackupAll = async () => {
        try {
            const allData = {
                version: '1.0',
                exported_at: new Date().toISOString(),
                books: await db.getBooks(),
                transactions: [] as Transaction[]
            };

            // Fetch transactions for each book
            for (const book of allData.books) {
                const txs = await db.getTransactions(book.id);
                allData.transactions.push(...txs);
            }

            const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `project_books_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to backup data:', error);
            alert('Failed to create backup');
        }
    };

    const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm('WARNING: This will OVERWRITE all existing data with the backup. Are you sure?')) {
            event.target.value = '';
            return;
        }

        setIsImporting(true);
        setImportError(null);

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.books || !Array.isArray(data.books)) {
                throw new Error('Invalid backup format: missing books');
            }

            // Clear existing data (simulated by just overwriting for now, but ideally we should clear DB first)
            // For a true restore, we should probably clear the DB.
            // Let's iterate and add/put.

            // Note: This is a "merge/overwrite" restore. To do a clean restore, we'd need a db.clear() method.
            // For now, we'll just upsert everything.

            for (const book of data.books) {
                await db.updateBook(book);
            }

            if (data.transactions && Array.isArray(data.transactions)) {
                for (const tx of data.transactions) {
                    await db.updateTransaction(tx);
                }
            }

            await fetchBooks();
            alert('Restore completed successfully');
            navigate('/');
        } catch (error) {
            console.error('Restore failed:', error);
            setImportError(error instanceof Error ? error.message : 'Unknown error during restore');
        } finally {
            setIsImporting(false);
            event.target.value = '';
        }
    };

    const handleImportBook = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportError(null);

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.book || !data.book.id || !data.book.name) {
                throw new Error('Invalid book file format');
            }

            const existing = books.find(b => b.id === data.book.id);
            let bookId = data.book.id;

            if (existing) {
                if (!window.confirm(`Book "${data.book.name}" already exists. Do you want to overwrite it? Cancel to import as a copy.`)) {
                    bookId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    data.book.id = bookId;
                    data.book.name = `${data.book.name} (Copy)`;

                    if (data.transactions) {
                        data.transactions.forEach((tx: any) => {
                            tx.book_id = bookId;
                            tx.id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        });
                    }
                }
            }

            await db.updateBook(data.book);

            if (data.transactions && Array.isArray(data.transactions)) {
                for (const tx of data.transactions) {
                    await db.updateTransaction(tx);
                }
            }

            await fetchBooks();
            setActiveBook(bookId);
            alert(`Book "${data.book.name}" imported successfully`);
            navigate('/');
        } catch (error) {
            console.error('Import failed:', error);
            setImportError(error instanceof Error ? error.message : 'Unknown error during import');
        } finally {
            setIsImporting(false);
            event.target.value = '';
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Global Settings</h2>
                <p className="text-gray-500">Manage all your books and application data.</p>
            </div>

            {/* Data Management */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Database size={20} className="text-primary-600" />
                    Data Management
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={handleBackupAll}
                        className="flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                            <Download size={24} />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-gray-900">Backup All Data</p>
                            <p className="text-sm text-gray-500">Download a full backup of all books</p>
                        </div>
                    </button>

                    <div className="relative group">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImportBook}
                            accept=".json"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:scale-110 transition-transform">
                                <Upload size={24} />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-gray-900">Import Book (JSON)</p>
                                <p className="text-sm text-gray-500">Restore a book from a JSON backup</p>
                            </div>
                        </button>
                    </div>

                    <button
                        onClick={() => setShowImportNewBookModal(true)}
                        className="flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                            <FileText size={24} />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-gray-900">Import CSV as New Book</p>
                            <p className="text-sm text-gray-500">Create a new book from a CSV file</p>
                        </div>
                    </button>

                    <div className="relative group">
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleRestoreBackup}
                            disabled={isImporting}
                            className="hidden"
                            id="restore-backup"
                        />
                        <label
                            htmlFor="restore-backup"
                            className="w-full flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                                <HardDrive size={24} />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-gray-900">Restore Backup</p>
                                <p className="text-sm text-gray-500">Restore all data from backup</p>
                            </div>
                        </label>
                    </div>
                </div>
            </section>

            {/* Book List */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Books</h3>
                <div className="space-y-3">
                    {books.map(book => (
                        <div key={book.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                    <BookIcon size={20} />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">{book.name}</h4>
                                    <p className="text-sm text-gray-500">{book.currency} • {new Date(book.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {activeBookId !== book.id && (
                                    <button
                                        onClick={() => setActiveBook(book.id)}
                                        className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                    >
                                        Switch To
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete "${book.name}"?`)) {
                                            deleteBook(book.id);
                                        }
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Book"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {importError && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
                    <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium">Import Failed</p>
                        <p className="text-sm">{importError}</p>
                    </div>
                </div>
            )}

            {showImportNewBookModal && (
                <ImportNewBookModal
                    onClose={() => setShowImportNewBookModal(false)}
                    onSuccess={() => setShowImportNewBookModal(false)}
                />
            )}
        </div>
    );
}
