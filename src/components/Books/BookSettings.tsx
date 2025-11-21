import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { db } from '../../lib/db';
import { Plus, Trash2, Save as SaveIcon, ArrowUp, ArrowDown, Download, FileJson, AlertTriangle, Upload, ChevronDown, ChevronRight, BookOpen, DollarSign, Calendar, Settings as SettingsIcon } from 'lucide-react';
import type { FieldConfig, FieldType } from '../../types';
import { useNavigate } from 'react-router-dom';
import { ImportCSVModal } from './ImportCSVModal';

// Common currencies list
const CURRENCIES = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
];

export function BookSettings() {
    const { activeBookId, books, updateBook, deleteBook, setActiveBook } = useStore();
    const activeBook = books.find(b => b.id === activeBookId);
    const navigate = useNavigate();

    // State management
    const [fields, setFields] = useState<FieldConfig[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Basic Info state
    const [bookName, setBookName] = useState('');
    const [currency, setCurrency] = useState('');
    const [primaryAmountField, setPrimaryAmountField] = useState('');
    const [transactionCount, setTransactionCount] = useState(0);

    // Preferences state
    const [dateFormat, setDateFormat] = useState<'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'>('YYYY-MM-DD');
    const [defaultTime, setDefaultTime] = useState<'current' | 'startOfDay' | string>('current');
    const [defaultType, setDefaultType] = useState<'income' | 'expense' | 'transfer'>('expense');
    const [defaultCategory, setDefaultCategory] = useState('');
    const [decimalPlaces, setDecimalPlaces] = useState(2);
    const [showZeroDecimals, setShowZeroDecimals] = useState(true);

    // UI state
    const [fieldsExpanded, setFieldsExpanded] = useState(false);
    const [preferencesExpanded, setPreferencesExpanded] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);

    // Load initial data
    useEffect(() => {
        if (activeBook) {
            setFields([...activeBook.field_config].sort((a, b) => a.order - b.order));
            setBookName(activeBook.name);
            setCurrency(activeBook.currency);
            setPrimaryAmountField(activeBook.primary_amount_field || '');

            // Load preferences
            const prefs = activeBook.preferences || {};
            setDateFormat(prefs.dateFormat || 'YYYY-MM-DD');
            setDefaultTime(prefs.defaultTransactionTime || 'current');
            setDefaultType(prefs.defaultType || 'expense');
            setDefaultCategory(prefs.defaultCategory || '');
            setDecimalPlaces(prefs.decimalPlaces ?? 2);
            setShowZeroDecimals(prefs.showZeroDecimals ?? true);

            // Load transaction count
            db.getTransactions(activeBook.id).then(txs => {
                setTransactionCount(txs.length);
            });
        }
    }, [activeBook]);

    if (!activeBook) return <div className="p-8 text-center">No book selected</div>;

    // Calculate field summary
    const totalFields = fields.length;
    const requiredFields = fields.filter(f => f.required).length;
    const visibleFields = fields.filter(f => f.visible).length;
    const hiddenFields = totalFields - visibleFields;

    // Get number fields for primary amount selector
    const numberFields = fields.filter(f => f.type === 'number');

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
        setFieldsExpanded(true); // Auto-expand when adding field
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
            const transactions = await db.getTransactions(activeBookId!);
            const uniqueValues = new Set<string>();
            transactions.forEach((tx: any) => {
                if (tx.custom_data && tx.custom_data[field.key]) {
                    const value = String(tx.custom_data[field.key]).trim();
                    if (value) uniqueValues.add(value);
                }
            });

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
            // Re-normalize orders
            const normalizedFields = fields.map((f, i) => ({ ...f, order: i + 1 }));

            const updatedBook = {
                ...activeBook,
                name: bookName,
                currency,
                primary_amount_field: primaryAmountField || undefined,
                field_config: normalizedFields,
                preferences: {
                    dateFormat,
                    defaultTransactionTime: defaultTime,
                    defaultType,
                    defaultCategory: defaultCategory || undefined,
                    decimalPlaces,
                    showZeroDecimals
                }
            };

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

            const headers = ['Date', 'Type', 'Amount', 'Description', 'Category', 'Party'];
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
                        `"${tx.description.replace(/"/g, '""')}"`,
                        tx.category_id,
                        tx.party_id || ''
                    ];

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
        if (deleteConfirmation !== activeBook.name) return;

        try {
            await db.deleteBook(activeBook.id);
            deleteBook(activeBook.id);

            const remainingBooks = books.filter(b => b.id !== activeBook.id);
            if (remainingBooks.length > 0) {
                setActiveBook(remainingBooks[0].id);
                navigate('/');
            } else {
                setActiveBook(null as any);
                navigate('/');
            }
        } catch (error) {
            console.error('Failed to delete book:', error);
            alert('Failed to delete book');
        }
    };

    // Detect if any value changed
    useEffect(() => {
        if (!activeBook) return;

        const hasChanges =
            bookName !== activeBook.name ||
            currency !== activeBook.currency ||
            primaryAmountField !== (activeBook.primary_amount_field || '') ||
            dateFormat !== (activeBook.preferences?.dateFormat || 'YYYY-MM-DD') ||
            defaultTime !== (activeBook.preferences?.defaultTransactionTime || 'current') ||
            defaultType !== (activeBook.preferences?.defaultType || 'expense') ||
            defaultCategory !== (activeBook.preferences?.defaultCategory || '') ||
            decimalPlaces !== (activeBook.preferences?.decimalPlaces ?? 2) ||
            showZeroDecimals !== (activeBook.preferences?.showZeroDecimals ?? true);

        if (hasChanges !== isDirty) {
            setIsDirty(hasChanges);
        }
    }, [bookName, currency, primaryAmountField, dateFormat, defaultTime, defaultType, defaultCategory, decimalPlaces, showZeroDecimals, activeBook]);

    return (
        <div className="max-w-4xl mx-auto pb-10 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Book Settings</h1>
                    <p className="text-gray-500">Configure "{bookName}"</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                    <SaveIcon size={18} />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen size={20} className="text-primary-600" />
                        Basic Information
                    </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Book Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Book Name</label>
                        <input
                            type="text"
                            value={bookName}
                            onChange={(e) => {
                                setBookName(e.target.value);
                                setIsDirty(true);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                            placeholder="My Book"
                        />
                    </div>

                    {/* Currency */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                        <select
                            value={currency}
                            onChange={(e) => {
                                setCurrency(e.target.value);
                                setIsDirty(true);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                        >
                            {CURRENCIES.map(curr => (
                                <option key={curr.code} value={curr.code}>
                                    {curr.symbol} {curr.code} - {curr.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Created Date (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Created On</label>
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                            {new Date(activeBook.created_at).toLocaleDateString()}
                        </div>
                    </div>

                    {/* Transaction Count (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Total Transactions</label>
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                            {transactionCount} {transactionCount === 1 ? 'entry' : 'entries'}
                        </div>
                    </div>

                    {/* Primary Amount Field */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Primary Amount Field
                            <span className="text-xs text-gray-500 ml-2">(Used for calculations and reports)</span>
                        </label>
                        <select
                            value={primaryAmountField}
                            onChange={(e) => {
                                setPrimaryAmountField(e.target.value);
                                setIsDirty(true);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                        >
                            <option value="">Default (Amount field)</option>
                            {numberFields.map(field => (
                                <option key={field.key} value={field.key}>
                                    {field.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Field Configuration - Collapsible */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                    onClick={() => setFieldsExpanded(!fieldsExpanded)}
                    className="w-full p-6 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                            Field Configuration <span className="text-gray-500">({totalFields} {totalFields === 1 ? 'field' : 'fields'})</span>
                        </h3>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">{requiredFields} required</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">{visibleFields} visible</span>
                            {hiddenFields > 0 && (
                                <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full font-medium">{hiddenFields} hidden</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAddField();
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                        >
                            <Plus size={16} />
                            Add Field
                        </button>
                        {fieldsExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                </button>

                {fieldsExpanded && (
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
                                        {field.type === 'text' && (
                                            <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={field.multiline || false}
                                                    onChange={(e) => handleFieldChange(index, { multiline: e.target.checked })}
                                                    className="rounded text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="text-xs text-gray-500">Multiline</span>
                                            </label>
                                        )}
                                    </div>

                                    {/* Options */}
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

                        {fields.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                No fields configured. Click "Add Field" to start.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Additional Preferences - Collapsible */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                    onClick={() => setPreferencesExpanded(!preferencesExpanded)}
                    className="w-full p-6 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <SettingsIcon size={20} className="text-primary-600" />
                        Additional Preferences
                    </h3>
                    {preferencesExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>

                {preferencesExpanded && (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Date & Time Preferences */}
                        <div className="md:col-span-2">
                            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <Calendar size={18} className="text-primary-600" />
                                Date & Time Preferences
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                                    <select
                                        value={dateFormat}
                                        onChange={(e) => {
                                            setDateFormat(e.target.value as any);
                                            setIsDirty(true);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                                    >
                                        <option value="YYYY-MM-DD">YYYY-MM-DD (2025-11-22)</option>
                                        <option value="DD/MM/YYYY">DD/MM/YYYY (22/11/2025)</option>
                                        <option value="MM/DD/YYYY">MM/DD/YYYY (11/22/2025)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Default Transaction Time</label>
                                    <select
                                        value={defaultTime}
                                        onChange={(e) => {
                                            setDefaultTime(e.target.value);
                                            setIsDirty(true);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                                    >
                                        <option value="current">Current Time</option>
                                        <option value="startOfDay">Start of Day (00:00)</option>
                                        <option value="09:00">Morning (09:00)</option>
                                        <option value="12:00">Noon (12:00)</option>
                                        <option value="18:00">Evening (18:00)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Transaction Defaults */}
                        <div className="md:col-span-2 border-t pt-4">
                            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <DollarSign size={18} className="text-primary-600" />
                                Transaction Defaults
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Default Type</label>
                                    <select
                                        value={defaultType}
                                        onChange={(e) => {
                                            setDefaultType(e.target.value as any);
                                            setIsDirty(true);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                                    >
                                        <option value="expense">Expense</option>
                                        <option value="income">Income</option>
                                        <option value="transfer">Transfer</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Default Category</label>
                                    <input
                                        type="text"
                                        value={defaultCategory}
                                        onChange={(e) => {
                                            setDefaultCategory(e.target.value);
                                            setIsDirty(true);
                                        }}
                                        placeholder="Leave empty for none"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Display Preferences */}
                        <div className="md:col-span-2 border-t pt-4">
                            <h4 className="font-medium text-gray-900 mb-4">Display Preferences</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Decimal Places for Amounts</label>
                                    <select
                                        value={decimalPlaces}
                                        onChange={(e) => {
                                            setDecimalPlaces(Number(e.target.value));
                                            setIsDirty(true);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                                    >
                                        <option value={0}>0 (₹100)</option>
                                        <option value={1}>1 (₹100.0)</option>
                                        <option value={2}>2 (₹100.00)</option>
                                        <option value={3}>3 (₹100.000)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Show Decimal Zeros</label>
                                    <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={showZeroDecimals}
                                            onChange={(e) => {
                                                setShowZeroDecimals(e.target.checked);
                                                setIsDirty(true);
                                            }}
                                            className="rounded text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-700">
                                            {showZeroDecimals ? '₹100.00' : '₹100'}
                                        </span>
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
