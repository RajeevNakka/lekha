import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';
import { db } from '../../lib/db';
import { Download, Upload, AlertTriangle, HardDrive, Database, Book as BookIcon, Trash2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Transaction } from '../../types';
import { ImportNewBookModal } from './ImportNewBookModal';
import { TemplateManager } from '../Templates/TemplateManager';

export function GlobalSettings() {
    const { books, fetchBooks, setActiveBook, deleteBook, activeBookId } = useStore();
    const navigate = useNavigate();
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [showImportNewBookModal, setShowImportNewBookModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [bookToDelete, setBookToDelete] = useState<{ id: string, name: string } | null>(null);

    const [showOverwriteModal, setShowOverwriteModal] = useState(false);
    const [pendingImportData, setPendingImportData] = useState<any | null>(null);

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

    const handleRestoreClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setPendingRestoreFile(file);
        setShowRestoreModal(true);
        event.target.value = ''; // Reset input
    };

    const confirmRestore = async () => {
        if (!pendingRestoreFile) return;

        setIsImporting(true);
        setImportError(null);
        setShowRestoreModal(false);

        try {
            const text = await pendingRestoreFile.text();
            const data = JSON.parse(text);

            if (!data.books || !Array.isArray(data.books)) {
                throw new Error('Invalid backup format: missing books');
            }

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
            setPendingRestoreFile(null);
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

            if (existing) {
                setPendingImportData(data);
                setShowOverwriteModal(true);
                setIsImporting(false); // Pause importing state while waiting for user
                event.target.value = '';
                return;
            }

            await processImport(data);
        } catch (error) {
            console.error('Import failed:', error);
            setImportError(error instanceof Error ? error.message : 'Unknown error during import');
            setIsImporting(false);
        }
        event.target.value = '';
    };

    const processImport = async (data: any, asCopy: boolean = false) => {
        setIsImporting(true);
        try {
            let bookId = data.book.id;

            if (asCopy) {
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
            console.error('Import processing failed:', error);
            setImportError(error instanceof Error ? error.message : 'Unknown error during import');
        } finally {
            setIsImporting(false);
            setPendingImportData(null);
            setShowOverwriteModal(false);
        }
    };

    const handleDeleteClick = (book: { id: string, name: string }) => {
        setBookToDelete(book);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (bookToDelete) {
            await deleteBook(bookToDelete.id);
            setShowDeleteModal(false);
            setBookToDelete(null);
        }
    };

    const [activeTab, setActiveTab] = useState<'general' | 'templates' | 'about'>('general');

    // ... (keep existing handlers: handleBackupAll, handleRestoreClick, confirmRestore, handleImportBook, processImport, handleDeleteClick, confirmDelete)

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Global Settings</h2>
                <p className="text-gray-500">Manage your application preferences and data.</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    General
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'templates'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    Field Templates
                </button>
                <button
                    onClick={() => setActiveTab('about')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'about'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    About
                </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'general' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                                        onChange={handleRestoreClick}
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
                                                onClick={() => handleDeleteClick(book)}
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
                    </div>
                )}

                {activeTab === 'templates' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <TemplateManager />
                    </div>
                )}

                {activeTab === 'about' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <BookIcon size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Lekha</h3>
                        <p className="text-gray-500 mb-6">Simple, private, and flexible bookkeeping.</p>
                        <div className="text-sm text-gray-400">
                            <p>Version 1.0.0</p>
                            <p>Local-first architecture</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
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

            {/* Restore Confirmation Modal */}
            {showRestoreModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4 text-red-600">
                                <AlertTriangle size={24} />
                                <h3 className="text-xl font-bold">Warning: Overwrite Data</h3>
                            </div>
                            <p className="text-gray-600 mb-6">
                                You are about to restore a backup. This will <span className="font-bold text-red-600">OVERWRITE</span> all existing data.
                                This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowRestoreModal(false);
                                        setPendingRestoreFile(null);
                                    }}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRestore}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                                >
                                    Yes, Restore Backup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Book Modal */}
            {showDeleteModal && bookToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Book?</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete <span className="font-bold text-gray-900">{bookToDelete.name}</span>?
                                This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setBookToDelete(null);
                                    }}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                                >
                                    Delete Book
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Overwrite Modal */}
            {showOverwriteModal && pendingImportData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Book Already Exists</h3>
                            <p className="text-gray-600 mb-6">
                                The book <span className="font-bold text-gray-900">{pendingImportData.book.name}</span> already exists.
                                Do you want to overwrite it with the imported version?
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => processImport(pendingImportData, false)}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                                >
                                    Overwrite Existing Book
                                </button>
                                <button
                                    onClick={() => processImport(pendingImportData, true)}
                                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
                                >
                                    Import as Copy
                                </button>
                                <button
                                    onClick={() => {
                                        setShowOverwriteModal(false);
                                        setPendingImportData(null);
                                    }}
                                    className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
