import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { db } from '../../lib/db';
import { Plus, Trash2, Save, ArrowUp, ArrowDown, Download, FileJson, AlertTriangle, Upload } from 'lucide-react';
import type { FieldConfig, FieldType } from '../../types';
import { useNavigate } from 'react-router-dom';
import { ImportCSVModal } from './ImportCSVModal';

export function BookSettings() {
    const { activeBookId, books, updateBook, deleteBook, setActiveBook } = useStore();
    const activeBook = books.find(b => b.id === activeBookId);
    const navigate = useNavigate();

    const [fields, setFields] = useState<FieldConfig[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');

    const [showImportModal, setShowImportModal] = useState(false);

    useEffect(() => {
        if (activeBook) {
            setFields([...activeBook.field_config].sort((a, b) => a.order - b.order));
        }
    }, [activeBook]);

    if (!activeBook) return <div className="p-8 text-center">No book selected</div>;

    const handleFieldChange = (index: number, updates: Partial<FieldConfig>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        setFields(newFields);
        setIsDirty(true);
    };

    const handleAddField = () => {
        const newField: FieldConfig = {
            key: `custom_${Date.now()}`,
            label: 'New Field',
            type: 'text',
            required: false,
            visible: true,
            order: fields.length + 1
        };
        setFields([...fields, newField]);
        setIsDirty(true);
    };

    const handleDeleteField = (index: number) => {
        const newFields = fields.filter((_, i) => i !== index);
        setFields(newFields);
        setIsDirty(true);
    };

    const handleMoveField = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === fields.length - 1)
        ) return;

        const newFields = [...fields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap order values
        const tempOrder = newFields[index].order;
        newFields[index].order = newFields[targetIndex].order;
        newFields[targetIndex].order = tempOrder;

        // Swap positions in array
        [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];

        setFields(newFields);
        setIsDirty(true);
    };

    const handlePopulateOptions = async (index: number) => {
        const field = fields[index];
        if (field.type !== 'dropdown') return;

        try {
            // Get all transactions for this book
            const transactions = await db.getTransactions(activeBookId!);

            // Extract unique values from custom_data[field.key]
            const uniqueValues = new Set<string>();
            transactions.forEach((tx: any) => {
                if (tx.custom_data && tx.custom_data[field.key]) {
                    const value = String(tx.custom_data[field.key]).trim();
                    if (value) {
                        uniqueValues.add(value);
                    }
                }
            });

            // Convert to sorted array
            const options = Array.from(uniqueValues).sort((a, b) =>
                a.localeCompare(b, undefined, { sensitivity: 'base' })
            );

            if (options.length > 0) {
                handleFieldChange(index, { options });
            } else {
                alert('No existing values found for this field in transactions.');
            }
        } catch (error) {
            console.error('Failed to populate options:', error);
            alert('Failed to analyze transaction data');
        }
    };

    const handleSave = async () => {

        setIsSaving(true);
        try {
            // Re-normalize orders just in case
            const normalizedFields = fields.map((f, i) => ({ ...f, order: i + 1 }));

            const updatedBook = { ...activeBook, field_config: normalizedFields };

            await db.updateBook(updatedBook);
            updateBook(updatedBook);

            setFields(normalizedFields);
            setIsDirty(false);
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportBook = async () => {
        try {
            const transactions = await db.getTransactions(activeBook.id);
            const exportData = {
                book: activeBook,
                transactions: transactions,
                exported_at: new Date().toISOString(),
                version: '1.0'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeBook.name.replace(/\s+/g, '_')}_backup.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export book:', error);
            alert('Failed to export book data');
        }
    };

    const handleExportTransactions = async () => {
        try {
            const transactions = await db.getTransactions(activeBook.id);
            if (transactions.length === 0) {
                alert('No transactions to export');
                return;
            }

            // Get all unique keys from transactions including custom data
            const headers = ['Date', 'Type', 'Amount', 'Description', 'Category', 'Party'];
            // Add custom fields to headers
            activeBook.field_config.forEach(f => {
                if (!['date', 'amount', 'description', 'category_id', 'type', 'party'].includes(f.key)) {
                    headers.push(f.label);
                }
            });

            const csvContent = [
                headers.join(','),
                ...transactions.map(tx => {
                    const row = [
                        tx.date,
                        tx.type,
                        tx.amount,
                        `"${tx.description.replace(/"/g, '""')}"`, // Escape quotes
                        tx.category_id,
                        tx.party_id || ''
                    ];

                    // Add custom field values
                    activeBook.field_config.forEach(f => {
                        if (!['date', 'amount', 'description', 'category_id', 'type', 'party'].includes(f.key)) {
                            const val = tx.custom_data?.[f.key] || '';
                            row.push(`"${String(val).replace(/"/g, '""')}"`);
                        }
                    });

                    return row.join(',');
                })
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeBook.name.replace(/\s+/g, '_')}_transactions.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export transactions:', error);
            alert('Failed to export transactions');
        }
    };

    const handleDeleteBook = async () => {
        if (deleteConfirmation !== activeBook.name) {
            return;
        }

        try {
            await db.deleteBook(activeBook.id);
            deleteBook(activeBook.id);

            // Switch to another book if available, or clear active book
            const remainingBooks = books.filter(b => b.id !== activeBook.id);
            if (remainingBooks.length > 0) {
                setActiveBook(remainingBooks[0].id);
                navigate('/');
            } else {
                setActiveBook(null as any); // Force clear
                navigate('/');
            }
        } catch (error) {
            console.error('Failed to delete book:', error);
            alert('Failed to delete book');
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-10 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Book Settings</h1>
                    <p className="text-gray-500">Customize transaction fields for {activeBook.name}</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                    <Save size={18} />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Field Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Field Configuration</h3>
                    <button
                        onClick={handleAddField}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                        <Plus size={16} />
                        Add Field
                    </button>
                </div>

                <div className="divide-y divide-gray-100">
                    {fields.map((field, index) => (
                        <div key={field.key} className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors group">
                            <div className="flex flex-col gap-1 mt-2 text-gray-400">
                                <button
                                    onClick={() => handleMoveField(index, 'up')}
                                    disabled={index === 0}
                                    className="hover:text-gray-600 disabled:opacity-30"
                                >
                                    <ArrowUp size={14} />
                                </button>
                                <button
                                    onClick={() => handleMoveField(index, 'down')}
                                    disabled={index === fields.length - 1}
                                    className="hover:text-gray-600 disabled:opacity-30"
                                >
                                    <ArrowDown size={14} />
                                </button>
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                                {/* Label */}
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                                    <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => handleFieldChange(index, { label: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 outline-none"
                                    />
                                </div>

                                {/* Type */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                                    <select
                                        value={field.type}
                                        onChange={(e) => handleFieldChange(index, { type: e.target.value as FieldType })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 outline-none bg-white"
                                    >
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="date">Date</option>
                                        <option value="dropdown">Dropdown</option>
                                        <option value="checkbox">Checkbox</option>
                                    </select>
                                </div>

                                {/* Options (for dropdown) */}
                                <div className="md:col-span-4">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Options (comma separated)
                                        {field.type === 'dropdown' && (
                                            <button
                                                type="button"
                                                onClick={() => handlePopulateOptions(index)}
                                                className="ml-2 text-xs text-primary-600 hover:text-primary-700 font-medium underline"
                                                title="Auto-populate from existing data"
                                            >
                                                Auto-fill
                                            </button>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        value={field.options?.join(', ') || ''}
                                        onChange={(e) => handleFieldChange(index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                        disabled={field.type !== 'dropdown'}
                                        placeholder={field.type === 'dropdown' ? "Option 1, Option 2" : "N/A"}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                </div>

                                {/* Toggles */}
                                <div className="md:col-span-2 flex flex-col justify-center gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => handleFieldChange(index, { required: e.target.checked })}
                                            className="rounded text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-700">Required</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={field.visible}
                                            onChange={(e) => handleFieldChange(index, { visible: e.target.checked })}
                                            className="rounded text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-700">Visible</span>
                                    </label>
                                </div>

                                {/* Delete */}
                                <div className="md:col-span-1 flex items-center justify-end">
                                    <button
                                        onClick={() => handleDeleteField(index)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Field"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {fields.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No fields configured. Click "Add Field" to start.
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

            {/* Delete Confirmation Modal */}
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
