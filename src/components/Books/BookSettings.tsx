import { useState } from 'react';
import { useStore } from '../../lib/store';
import { SaveIcon, Upload, FileJson, Download, AlertTriangle, ChevronDown, ChevronUp, FileText, Layout, Sliders, Settings as SettingsIcon, Info } from 'lucide-react';
import type { FieldConfig, Book } from '../../types';
import { useNavigate } from 'react-router-dom';
import { ImportCSVModal } from './ImportCSVModal';
import { SaveAsTemplateModal } from '../Templates/SaveAsTemplateModal';
import { ApplyTemplateModal } from '../Templates/ApplyTemplateModal';
import { FieldEditor } from '../Shared/FieldEditor';

// Common currencies list
const CURRENCIES = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'AED', symbol: 'dh', name: 'UAE Dirham' },
    { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal' },
];

export function BookSettings() {
    const { activeBookId, books, updateBook, deleteBook, setActiveBook } = useStore();
    const navigate = useNavigate();
    const activeBook = books.find(b => b.id === activeBookId);

    // UI State
    const [expandedSections, setExpandedSections] = useState({
        fields: true,
        preferences: false
    });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false);

    if (!activeBook) return null;

    const toggleSection = (section: 'fields' | 'preferences') => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Handlers for Basic Info
    const handleUpdateBook = async (updates: Partial<Book>) => {
        if (!activeBook) return;
        try {
            const updatedBook = { ...activeBook, ...updates };
            const { db } = await import('../../lib/db');
            await db.updateBook(updatedBook);
            updateBook(updatedBook);
        } catch (error) {
            console.error('Failed to update book:', error);
        }
    };

    // Handler for Field Configuration
    const handleFieldsChange = async (newFields: FieldConfig[]) => {
        if (!activeBook) return;

        // Optimistic update
        const updatedBook = { ...activeBook, field_config: newFields };
        updateBook(updatedBook);

        try {
            const { db } = await import('../../lib/db');
            await db.updateBook(updatedBook);
        } catch (error) {
            console.error('Failed to update fields:', error);
            // Revert on error (optional, but good practice)
            updateBook(activeBook);
        }
    };

    const handleDeleteBook = async () => {
        if (deleteConfirmation !== activeBook.name) return;

        try {
            await deleteBook(activeBook.id);
            setActiveBook(''); // Clear active book
            navigate('/'); // Redirect to home/dashboard
        } catch (error) {
            console.error('Failed to delete book:', error);
            alert('Failed to delete book. Please try again.');
        }
    };

    const handleExportBook = () => {
        const dataStr = JSON.stringify(activeBook, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${activeBook.name.replace(/\s+/g, '_')}_backup.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportTransactions = async () => {
        try {
            const { db } = await import('../../lib/db');
            const transactions = await db.getTransactions(activeBook.id);

            if (!transactions || transactions.length === 0) {
                alert('No transactions to export.');
                return;
            }

            // Convert to CSV
            const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', ...activeBook.field_config.filter(f => !['date', 'description', 'amount', 'type', 'category_id'].includes(f.key)).map(f => f.label)];
            const csvContent = [
                headers.join(','),
                ...transactions.map(tx => {
                    const row = [
                        tx.date,
                        `"${tx.description.replace(/"/g, '""')}"`,
                        tx.amount,
                        tx.type,
                        tx.category_id || '',
                        ...activeBook.field_config.filter(f => !['date', 'description', 'amount', 'type', 'category_id'].includes(f.key)).map(f => {
                            const val = tx.custom_data?.[f.key] || '';
                            return `"${String(val).replace(/"/g, '""')}"`;
                        })
                    ];
                    return row.join(',');
                })
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${activeBook.name.replace(/\s+/g, '_')}_transactions.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export transactions.');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Book Settings</h2>
                    <p className="text-gray-500">Manage configuration for {activeBook.name}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowApplyTemplateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <FileText size={18} />
                        Apply Template
                    </button>
                    <button
                        onClick={() => setShowSaveTemplateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <SaveIcon size={18} />
                        Save as Template
                    </button>
                </div>
            </div>

            {/* Basic Information */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <SettingsIcon size={18} />
                        Basic Information
                    </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Book Name</label>
                        <input
                            type="text"
                            value={activeBook.name}
                            onChange={(e) => handleUpdateBook({ name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
                        <select
                            value={activeBook.currency}
                            onChange={(e) => handleUpdateBook({ currency: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                        >
                            {CURRENCIES.map(c => (
                                <option key={c.code} value={c.symbol}>{c.symbol} - {c.name} ({c.code})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Primary Amount Field</label>
                        <select
                            value={activeBook.primary_amount_field || 'amount'}
                            onChange={(e) => handleUpdateBook({ primary_amount_field: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                        >
                            {activeBook.field_config.filter(f => f.type === 'number').map(f => (
                                <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Used for dashboard totals and summaries.</p>
                    </div>
                    <div className="pt-6 flex gap-4 text-sm text-gray-500">
                        <div>
                            <span className="block font-medium text-gray-700">Created</span>
                            {new Date(activeBook.created_at).toLocaleDateString()}
                        </div>
                        <div>
                            <span className="block font-medium text-gray-700">Transactions</span>
                            -
                        </div>
                    </div>
                </div>
            </div>

            {/* Field Configuration */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('fields')}
                    className="w-full p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors"
                >
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Layout size={18} />
                        Field Configuration
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xs bg-white px-2 py-1 rounded border border-gray-200 text-gray-600">
                            {activeBook.field_config.length} Fields
                        </span>
                        {expandedSections.fields ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                </button>

                {expandedSections.fields && (
                    <div className="p-6">
                        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-start gap-2">
                            <Info size={16} className="mt-0.5 shrink-0" />
                            <p>
                                Customize the form fields for your transactions.
                                <strong> Core fields (Amount, Date, Description)</strong> cannot be deleted but can be renamed.
                            </p>
                        </div>

                        <FieldEditor
                            fields={activeBook.field_config}
                            onChange={handleFieldsChange}
                            readOnlyCoreFields={true}
                        />
                    </div>
                )}
            </div>

            {/* Additional Preferences */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('preferences')}
                    className="w-full p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors"
                >
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Sliders size={18} />
                        Additional Preferences
                    </h3>
                    {expandedSections.preferences ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {expandedSections.preferences && (
                    <div className="p-6 space-y-6">
                        {/* Date & Time */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">Date & Time</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Date Format</label>
                                    <select
                                        value={activeBook.preferences?.dateFormat || 'YYYY-MM-DD'}
                                        onChange={(e) => handleUpdateBook({ preferences: { ...activeBook.preferences, dateFormat: e.target.value as any } })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                        <option value="YYYY-MM-DD">YYYY-MM-DD (2023-12-31)</option>
                                        <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2023)</option>
                                        <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2023)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Transaction Defaults */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">Transaction Defaults</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Default Type</label>
                                    <select
                                        value={activeBook.preferences?.defaultType || 'expense'}
                                        onChange={(e) => handleUpdateBook({ preferences: { ...activeBook.preferences, defaultType: e.target.value as 'income' | 'expense' } })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                        <option value="expense">Expense</option>
                                        <option value="income">Income</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Default Category</label>
                                    <select
                                        value={activeBook.preferences?.defaultCategory || ''}
                                        onChange={(e) => handleUpdateBook({ preferences: { ...activeBook.preferences, defaultCategory: e.target.value } })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                        <option value="">None</option>
                                        {activeBook.field_config.find(f => f.key === 'category_id')?.options?.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Display */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">Display</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Decimal Places</label>
                                    <select
                                        value={activeBook.preferences?.decimalPlaces ?? 2}
                                        onChange={(e) => handleUpdateBook({ preferences: { ...activeBook.preferences, decimalPlaces: parseInt(e.target.value) } })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                        <option value="0">0 (100)</option>
                                        <option value="2">2 (100.00)</option>
                                        <option value="3">3 (100.000)</option>
                                    </select>
                                </div>
                                <div className="flex items-center pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={activeBook.preferences?.showZeroDecimals ?? true}
                                            onChange={(e) => handleUpdateBook({ preferences: { ...activeBook.preferences, showZeroDecimals: e.target.checked } })}
                                            className="rounded text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-700">Show trailing zeros (e.g. .00)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Data Management */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Data Management</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
                        >
                            <Upload size={20} className="text-purple-600" />
                            Import CSV
                        </button>
                        <button
                            onClick={handleExportBook}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
                        >
                            <FileJson size={20} className="text-blue-600" />
                            Export Book (JSON)
                        </button>
                        <button
                            onClick={handleExportTransactions}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
                        >
                            <Download size={20} className="text-green-600" />
                            Export Transactions (CSV)
                        </button>
                    </div>
                    <p className="text-sm text-gray-500">
                        Import transactions from CSV, or export your data for backup and analysis.
                    </p>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                <div className="p-6 border-b border-red-100 bg-red-50">
                    <h3 className="font-semibold text-red-900 flex items-center gap-2">
                        <AlertTriangle size={20} />
                        Danger Zone
                    </h3>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-gray-900">Delete this book</h4>
                            <p className="text-sm text-gray-500 mt-1">
                                Once you delete a book, there is no going back. Please be certain.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setDeleteConfirmation('');
                                setShowDeleteModal(true);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                            Delete Book
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Book?</h3>
                            <p className="text-gray-600 mb-6">
                                This action cannot be undone. This will permanently delete
                                <span className="font-bold text-gray-900"> {activeBook.name} </span>
                                and all its transactions.
                            </p>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Type <span className="font-mono font-bold select-all">{activeBook.name}</span> to confirm:
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmation}
                                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                    placeholder="Type book name here"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteBook}
                                disabled={deleteConfirmation !== activeBook.name}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                            >
                                Delete Book
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save as Template Modal */}
            {showSaveTemplateModal && (
                <SaveAsTemplateModal
                    book={activeBook}
                    onClose={() => setShowSaveTemplateModal(false)}
                    onSuccess={() => {
                        setShowSaveTemplateModal(false);
                        alert('Template saved successfully!');
                    }}
                />
            )}

            {/* Apply Template Modal */}
            {showApplyTemplateModal && (
                <ApplyTemplateModal
                    book={activeBook}
                    onClose={() => setShowApplyTemplateModal(false)}
                    onSuccess={() => {
                        setShowApplyTemplateModal(false);
                        alert('Template applied successfully!');
                        window.location.reload();
                    }}
                />
            )}

            {/* Import CSV Modal */}
            {showImportModal && (
                <ImportCSVModal
                    book={activeBook}
                    onClose={() => setShowImportModal(false)}
                    onSuccess={() => {
                        setShowImportModal(false);
                        alert('Transactions imported successfully!');
                        navigate('/');
                    }}
                />
            )}
        </div>
    );
}
