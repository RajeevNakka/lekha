import { useState } from 'react';
import { X, Upload, ArrowRight, Settings, AlertTriangle } from 'lucide-react';
import { useStore } from '../../lib/store';
import { db } from '../../lib/db';
import { parseCSV, parseFlexibleDate, analyzeColumnData } from '../../lib/utils';
import type { Book, Transaction, FieldConfig, FieldType } from '../../types';
import clsx from 'clsx';

interface ImportNewBookModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface DetectedField {
    originalHeader: string;
    key: string;
    label: string;
    type: FieldType;
    uniqueValues: string[];
    options?: string[]; // For dropdowns
    include: boolean;
    sampleValue: string;
}

export function ImportNewBookModal({ onClose, onSuccess }: ImportNewBookModalProps) {
    const { addBook, setActiveBook } = useStore();
    const [step, setStep] = useState<'upload' | 'config' | 'processing'>('upload');
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    // Step 1 Data
    const [bookName, setBookName] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [csvData, setCsvData] = useState<string[][]>([]);

    // Step 2 Data
    const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
    const [primaryAmountField, setPrimaryAmountField] = useState<string>('');
    const [amountMode, setAmountMode] = useState<'single' | 'split'>('single');
    const [incomeField, setIncomeField] = useState<string>('');
    const [expenseField, setExpenseField] = useState<string>('');
    const [timeField, setTimeField] = useState<string>('');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setError(null);
        try {
            // Default book name to filename without extension
            const name = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
            setBookName(name);

            const text = await selectedFile.text();
            const rows = parseCSV(text);

            if (rows.length < 2) {
                throw new Error('CSV file must have a header row and at least one data row.');
            }

            setCsvData(rows);
            analyzeFields(rows);
            setStep('config');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse CSV');
        }
    };

    const analyzeFields = (rows: string[][]) => {
        const headers = rows[0];
        const firstRow = rows[1];

        const fields: DetectedField[] = headers.map((header, index) => {
            const analysis = analyzeColumnData(rows, index);
            const lowerHeader = header.toLowerCase();

            // Heuristics for better defaults
            let type = analysis.type as FieldType;

            // If it looks like a description/narration, force text
            if (lowerHeader.includes('description') || lowerHeader.includes('remark') || lowerHeader.includes('narration')) {
                type = 'text';
            }

            // If it looks like an amount, force number
            if (lowerHeader.includes('amount') || lowerHeader.includes('debit') || lowerHeader.includes('credit') || lowerHeader.includes('balance') || lowerHeader.includes('cost') || lowerHeader.includes('price')) {
                type = 'number';
            }

            // If it has very few unique values relative to total rows, suggest dropdown
            // But only if it's text and not too many unique values
            if (type === 'text' && analysis.uniqueValues.length <= 20 && rows.length > 20) {
                type = 'dropdown';
            }

            return {
                originalHeader: header,
                key: header.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                label: header,
                type: type,
                uniqueValues: analysis.uniqueValues,
                options: type === 'dropdown' ? analysis.uniqueValues : undefined,
                include: true,
                sampleValue: firstRow[index] || ''
            };
        });

        setDetectedFields(fields);

        // Auto-detect primary amount field
        const amountField = fields.find(f => f.type === 'number' && (f.label.toLowerCase().includes('amount') || f.label.toLowerCase().includes('cost') || f.label.toLowerCase().includes('price')));
        if (amountField) {
            setPrimaryAmountField(amountField.key);
        } else {
            // Fallback to first number field
            const firstNum = fields.find(f => f.type === 'number');
            if (firstNum) setPrimaryAmountField(firstNum.key);
        }

        // Auto-detect split fields
        const incField = fields.find(f => f.type === 'number' && (f.label.toLowerCase().includes('income') || f.label.toLowerCase().includes('credit') || f.label.toLowerCase().includes('deposit') || f.label.toLowerCase().includes('in')));
        const expField = fields.find(f => f.type === 'number' && (f.label.toLowerCase().includes('expense') || f.label.toLowerCase().includes('debit') || f.label.toLowerCase().includes('withdrawal') || f.label.toLowerCase().includes('out')));

        if (incField) setIncomeField(incField.key);
        if (expField) setExpenseField(expField.key);

        // Auto-detect time field
        const tField = fields.find(f => f.type === 'text' && (f.label.toLowerCase().includes('time') || f.label.toLowerCase().includes('hour') || f.label.toLowerCase().includes('clock')));
        if (tField) setTimeField(tField.key);

        // Heuristic: if we found both potential split fields, default to split mode? 
        // Maybe too aggressive. Let user choose.
    };

    const handleFieldChange = (index: number, updates: Partial<DetectedField>) => {
        const newFields = [...detectedFields];
        newFields[index] = { ...newFields[index], ...updates };

        // If switching to dropdown, pre-fill options if empty
        if (updates.type === 'dropdown' && !newFields[index].options) {
            newFields[index].options = newFields[index].uniqueValues;
        }

        setDetectedFields(newFields);
    };

    const executeImport = async () => {
        if (!bookName.trim()) {
            setError('Book name is required');
            return;
        }

        setStep('processing');
        setProgress(0);

        try {
            // 1. Create Book
            const bookId = `book_${Date.now()}`;

            // Smart Ordering: Date = 1, Amount = Last, others in between
            const dateFieldKey = detectedFields.find(f => f.include && f.type === 'date')?.key;

            const fieldConfig: FieldConfig[] = detectedFields
                .filter(f => {
                    if (!f.include) return false;
                    // Exclude split amount fields from config if in split mode
                    if (amountMode === 'split' && (f.key === incomeField || f.key === expenseField)) return false;
                    // Exclude time field from config (it's merged into date/created_at)
                    if (f.key === timeField) return false;
                    return true;
                })
                .map((f, i) => {
                    let order = i + 2; // Default start from 2
                    if (f.key === dateFieldKey) order = 1;
                    if (amountMode === 'single' && f.key === primaryAmountField) order = 100;

                    // Detect multiline fields
                    const lowerLabel = f.label.toLowerCase();
                    const isMultiline = lowerLabel.includes('description') || lowerLabel.includes('remark') || lowerLabel.includes('note') || lowerLabel.includes('address') || lowerLabel.includes('comment');

                    return {
                        key: f.key,
                        label: f.label,
                        type: f.type,
                        required: false,
                        visible: true,
                        order: order,
                        options: f.options,
                        multiline: isMultiline
                    };
                });

            // If split mode, add a synthetic "Amount" field
            if (amountMode === 'split') {
                fieldConfig.push({
                    key: 'amount',
                    label: 'Amount',
                    type: 'number',
                    required: true,
                    visible: true,
                    order: 100
                });
            }

            // Normalize order
            const finalFieldConfig = fieldConfig
                .sort((a, b) => a.order - b.order)
                .map((f, i) => ({ ...f, order: i + 1 }));

            const newBook: Book = {
                id: bookId,
                name: bookName,
                currency: currency,
                role: 'owner',
                created_at: new Date().toISOString(),
                field_config: finalFieldConfig,
                primary_amount_field: amountMode === 'single' ? primaryAmountField : 'amount',
                members: []
            };

            await db.addBook(newBook);
            addBook(newBook);

            // 2. Import Transactions
            const dataRows = csvData.slice(1);
            const totalRows = dataRows.length;
            const dateFieldIndex = detectedFields.findIndex(f => f.include && f.type === 'date');

            for (let i = 0; i < totalRows; i++) {
                const row = dataRows[i];
                if (row.length === 0) continue;

                const txData: any = {
                    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    book_id: bookId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    custom_data: {},
                    // Defaults
                    amount: 0,
                    type: 'expense',
                    description: 'Imported',
                    date: new Date().toISOString().split('T')[0]
                };

                detectedFields.forEach((field, colIndex) => {
                    if (!field.include) return;

                    const value = row[colIndex]?.trim();
                    if (!value) return;

                    // Store in custom_data
                    if (field.type === 'number') {
                        const num = parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
                        txData.custom_data[field.key] = num;

                        // If this is the primary amount field, set the core amount
                        if (amountMode === 'single' && field.key === primaryAmountField) {
                            txData.amount = Math.abs(num);
                            // Simple inference if not already set
                            const label = field.label.toLowerCase();
                            if (label.includes('credit') || label.includes('income') || label.includes('deposit')) {
                                txData.type = 'income';
                            } else if (label.includes('debit') || label.includes('expense') || label.includes('withdrawal')) {
                                txData.type = 'expense';
                            }
                        }

                        // Split Mode Logic
                        if (amountMode === 'split') {
                            if (field.key === incomeField && num > 0) {
                                txData.amount = Math.abs(num);
                                txData.type = 'income';
                                txData.custom_data['amount'] = Math.abs(num); // Store in synthetic field
                            } else if (field.key === expenseField && num > 0) {
                                txData.amount = Math.abs(num);
                                txData.type = 'expense';
                                txData.custom_data['amount'] = Math.abs(num); // Store in synthetic field
                            }
                        }
                    } else {
                        // For non-number fields, or number fields that are NOT the split amount fields
                        if (amountMode !== 'split' || (field.key !== incomeField && field.key !== expenseField)) {
                            // Also skip time field if it's being merged
                            if (field.key !== timeField) {
                                txData.custom_data[field.key] = value;
                            }
                        }
                    }

                    // 1. Date & Time
                    if (field.type === 'date') {
                        const parsed = parseFlexibleDate(value);
                        if (parsed) {
                            const yyyy = parsed.getFullYear();
                            const mm = String(parsed.getMonth() + 1).padStart(2, '0');
                            const dd = String(parsed.getDate()).padStart(2, '0');
                            const dateStr = `${yyyy}-${mm}-${dd}`;

                            if (colIndex === dateFieldIndex) {
                                txData.date = dateStr;

                                // If we have a time field, try to parse it and update created_at
                                if (timeField) {
                                    const timeVal = row[detectedFields.findIndex(f => f.key === timeField)]?.trim();
                                    if (timeVal) {
                                        // Simple time parsing (HH:MM or HH:MM:SS)
                                        // This is basic, might need more robust parsing later
                                        const timeParts = timeVal.match(/(\d+):(\d+)(?::(\d+))?/);
                                        if (timeParts) {
                                            const hours = parseInt(timeParts[1]);
                                            const minutes = parseInt(timeParts[2]);
                                            const seconds = timeParts[3] ? parseInt(timeParts[3]) : 0;

                                            const fullDate = new Date(parsed);
                                            fullDate.setHours(hours, minutes, seconds);
                                            txData.created_at = fullDate.toISOString();
                                        }
                                    }
                                }
                            }
                            txData.custom_data[field.key] = dateStr;
                        }
                    }

                    // 3. Description
                    const label = field.label.toLowerCase();
                    if (field.type === 'text' && (label.includes('description') || label.includes('narration') || label.includes('remark'))) {
                        txData.description = value;
                    }
                });

                await db.addTransaction(txData as Transaction);

                if (i % 10 === 0) {
                    setProgress(Math.round(((i + 1) / totalRows) * 100));
                }
            }

            setProgress(100);
            setTimeout(() => {
                setActiveBook(bookId);
                onSuccess();
            }, 500);

        } catch (err) {
            console.error('Import failed:', err);
            setError('Failed to create book and import transactions');
            setStep('config');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Import CSV as New Book</h3>
                        <p className="text-sm text-gray-500">Create a new book schema directly from your CSV file.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'upload' && (
                        <div className="space-y-8 max-w-xl mx-auto">
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700">Book Name</label>
                                <input
                                    type="text"
                                    value={bookName}
                                    onChange={(e) => setBookName(e.target.value)}
                                    placeholder="e.g., My Project Expenses"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700">Currency</label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="INR">INR (₹)</option>
                                    <option value="JPY">JPY (¥)</option>
                                </select>
                            </div>

                            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <Upload size={40} className="text-gray-400 mb-3" />
                                <p className="text-lg font-medium text-gray-700">Upload CSV File</p>
                                <p className="text-sm text-gray-500 mt-1">Drag & drop or click to browse</p>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                                    <AlertTriangle size={18} />
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'config' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm flex items-start gap-3">
                                <Settings size={18} className="mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium">Review Field Configuration</p>
                                    <p>We've analyzed your CSV. Please review the detected types and options. These will define the structure of your new book.</p>
                                </div>
                            </div>

                            {/* Amount Mode Selection */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                                <div className="flex items-center gap-4 mb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="amountMode"
                                            checked={amountMode === 'single'}
                                            onChange={() => setAmountMode('single')}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Single Amount Column</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="amountMode"
                                            checked={amountMode === 'split'}
                                            onChange={() => setAmountMode('split')}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Split Income/Expense Columns</span>
                                    </label>
                                </div>

                                {amountMode === 'single' ? (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Primary Amount Field</label>
                                        <select
                                            value={primaryAmountField}
                                            onChange={(e) => setPrimaryAmountField(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 outline-none"
                                        >
                                            {detectedFields.filter(f => f.type === 'number').map(f => (
                                                <option key={f.key} value={f.key}>{f.label}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-400 mt-1">This field will be used for calculations and dashboard stats.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Income Field (Cash IN)</label>
                                            <select
                                                value={incomeField}
                                                onChange={(e) => setIncomeField(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 outline-none"
                                            >
                                                <option value="">Select Field...</option>
                                                {detectedFields.filter(f => f.type === 'number').map(f => (
                                                    <option key={f.key} value={f.key}>{f.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Expense Field (Cash OUT)</label>
                                            <select
                                                value={expenseField}
                                                onChange={(e) => setExpenseField(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 outline-none"
                                            >
                                                <option value="">Select Field...</option>
                                                {detectedFields.filter(f => f.type === 'number').map(f => (
                                                    <option key={f.key} value={f.key}>{f.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Date & Time Configuration */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <label className="block text-xs font-medium text-gray-500 mb-2">Date & Time Configuration</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="block text-xs text-gray-400 mb-1">Detected Date Field</span>
                                        <div className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-100 text-gray-700">
                                            {detectedFields.find(f => f.type === 'date')?.label || 'None Detected'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Time Field (Optional)</label>
                                        <select
                                            value={timeField}
                                            onChange={(e) => setTimeField(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 outline-none"
                                        >
                                            <option value="">None</option>
                                            {detectedFields.filter(f => f.type === 'text' || f.type === 'number').map(f => (
                                                <option key={f.key} value={f.key}>{f.label}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-400 mt-1">Merged with Date to create timestamp.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                                        <tr>
                                            <th className="p-3 w-10 text-center">In?</th>
                                            <th className="p-3 w-1/4">CSV Header</th>
                                            <th className="p-3 w-1/4">Field Label</th>
                                            <th className="p-3 w-1/6">Type</th>
                                            <th className="p-3">Preview / Options</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {detectedFields.map((field, index) => (
                                            <tr key={index} className={clsx("hover:bg-gray-50", !field.include && "opacity-50 bg-gray-50")}>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={field.include}
                                                        onChange={(e) => handleFieldChange(index, { include: e.target.checked })}
                                                        className="rounded text-primary-600 focus:ring-primary-500"
                                                    />
                                                </td>
                                                <td className="p-3 font-medium text-gray-900">{field.originalHeader}</td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        value={field.label}
                                                        onChange={(e) => handleFieldChange(index, { label: e.target.value, key: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_') })}
                                                        disabled={!field.include}
                                                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <select
                                                        value={field.type}
                                                        onChange={(e) => handleFieldChange(index, { type: e.target.value as FieldType })}
                                                        disabled={!field.include}
                                                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-primary-500 outline-none bg-white"
                                                    >
                                                        <option value="text">Text</option>
                                                        <option value="number">Number</option>
                                                        <option value="date">Date</option>
                                                        <option value="dropdown">Dropdown</option>
                                                        <option value="checkbox">Checkbox</option>
                                                    </select>
                                                </td>
                                                <td className="p-3">
                                                    {field.type === 'dropdown' ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {field.options?.slice(0, 5).map(opt => (
                                                                <span key={opt} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">
                                                                    {opt}
                                                                </span>
                                                            ))}
                                                            {(field.options?.length || 0) > 5 && (
                                                                <span className="px-2 py-0.5 text-gray-400 text-xs">
                                                                    +{(field.options?.length || 0) - 5} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500 truncate block max-w-xs" title={field.sampleValue}>
                                                            {field.sampleValue || <span className="italic text-gray-300">Empty</span>}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="flex flex-col items-center justify-center h-64">
                            <div className="w-full max-w-md space-y-4">
                                <div className="flex justify-between text-sm font-medium text-gray-700">
                                    <span>Creating Book & Importing...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-center text-sm text-gray-500">
                                    Setting up your new book "{bookName}"...
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    {step === 'config' && (
                        <>
                            <button
                                onClick={() => setStep('upload')}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={executeImport}
                                className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors shadow-sm"
                            >
                                Create Book & Import
                                <ArrowRight size={18} />
                            </button>
                        </>
                    )}
                    {step === 'upload' && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
