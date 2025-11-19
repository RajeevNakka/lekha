import { useState } from 'react';
import { X, Upload, ArrowRight } from 'lucide-react';
import { useStore } from '../../lib/store';
import { db } from '../../lib/db';
import { parseCSV, parseFlexibleDate } from '../../lib/utils';
import type { Book, Transaction, FieldConfig } from '../../types';
import clsx from 'clsx';

interface ImportCSVModalProps {
    book: Book;
    onClose: () => void;
    onSuccess: () => void;
}

type MappingType =
    | 'date'
    | 'time'
    | 'amount_in'
    | 'amount_out'
    | 'amount_net' // Single column amount (+/-)
    | 'description'
    | 'category'
    | 'mode'
    | 'party'
    | 'ignore'
    | string; // Custom field key or 'create_new:[name]'

interface ColumnMapping {
    csvHeader: string;
    sampleValue: string;
    targetField: MappingType;
    newFieldName?: string; // If targetField is 'create_new'
}

export function ImportCSVModal({ book, onClose, onSuccess }: ImportCSVModalProps) {
    const { updateBook } = useStore();
    const [step, setStep] = useState<'upload' | 'map' | 'processing'>('upload');
    const [csvData, setCsvData] = useState<string[][]>([]);
    const [mappings, setMappings] = useState<ColumnMapping[]>([]);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // System fields that can be mapped to
    const systemFields = [
        { value: 'date', label: 'Date (Required)' },
        { value: 'time', label: 'Time' },
        { value: 'amount_in', label: 'Amount In (Credit)' },
        { value: 'amount_out', label: 'Amount Out (Debit)' },
        { value: 'amount_net', label: 'Amount (Net +/-)' },
        { value: 'description', label: 'Description/Remark' },
        { value: 'category', label: 'Category' },
        { value: 'mode', label: 'Payment Mode' },
        { value: 'party', label: 'Party/Payee' },
    ];

    // Existing custom fields
    const customFields = book.field_config || [];

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setError(null);

        try {
            const text = await selectedFile.text();
            const rows = parseCSV(text);

            if (rows.length < 2) {
                throw new Error('CSV file must have a header row and at least one data row.');
            }

            setCsvData(rows);

            // Auto-guess mappings
            const headers = rows[0];
            const firstRow = rows[1];

            const initialMappings: ColumnMapping[] = headers.map((header, index) => {
                const lowerHeader = header.toLowerCase().trim();
                let target: MappingType = 'ignore';

                // Heuristics for auto-mapping
                if (lowerHeader.includes('date')) target = 'date';
                else if (lowerHeader.includes('time')) target = 'time';
                else if (lowerHeader.includes('remark') || lowerHeader.includes('desc') || lowerHeader.includes('narration')) target = 'description';
                else if (lowerHeader.includes('category')) target = 'category';
                else if (lowerHeader.includes('party') || lowerHeader.includes('payee')) target = 'party';
                else if (lowerHeader.includes('mode') || lowerHeader.includes('type')) target = 'mode';
                else if (lowerHeader.includes('credit') || lowerHeader.includes('deposit') || lowerHeader.includes('in') || lowerHeader === 'cash in') target = 'amount_in';
                else if (lowerHeader.includes('debit') || lowerHeader.includes('withdrawal') || lowerHeader.includes('out') || lowerHeader === 'cash out') target = 'amount_out';
                else if (lowerHeader.includes('amount') || lowerHeader.includes('balance')) target = 'amount_net';

                // Check against custom fields
                const customMatch = customFields.find(f => lowerHeader.includes(f.label.toLowerCase()));
                if (customMatch) target = customMatch.key;

                return {
                    csvHeader: header,
                    sampleValue: firstRow[index] || '',
                    targetField: target
                };
            });

            setMappings(initialMappings);
            setStep('map');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse CSV');
        }
    };

    const handleMappingChange = (index: number, value: string) => {
        const newMappings = [...mappings];
        newMappings[index].targetField = value;

        // Reset new field name if switching away from create_new
        if (value !== 'create_new') {
            newMappings[index].newFieldName = undefined;
        } else {
            // Default new field name to CSV header
            newMappings[index].newFieldName = newMappings[index].csvHeader;
        }

        setMappings(newMappings);
    };

    const handleNewFieldNameChange = (index: number, value: string) => {
        const newMappings = [...mappings];
        newMappings[index].newFieldName = value;
        setMappings(newMappings);
    };

    const executeImport = async () => {
        setStep('processing');
        setProgress(0);
        setError(null);

        try {
            // 1. Identify or Create New Fields
            const newFieldsToCreate = mappings.filter(m => m.targetField === 'create_new');
            let updatedBook = { ...book };

            if (newFieldsToCreate.length > 0) {
                const currentFieldCount = book.field_config?.length || 0;
                const newFieldConfigs: FieldConfig[] = newFieldsToCreate.map((m, i) => ({
                    key: `field_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    label: m.newFieldName || m.csvHeader,
                    type: 'text', // Default to text for imported fields
                    required: false,
                    visible: true,
                    order: currentFieldCount + i + 1
                }));

                // Update mappings to use the newly generated keys
                newFieldsToCreate.forEach((m, i) => {
                    m.targetField = newFieldConfigs[i].key;
                });

                updatedBook.field_config = [...(book.field_config || []), ...newFieldConfigs];

                // Save book with new fields first
                await db.updateBook(updatedBook);
                updateBook(updatedBook);
            }

            // 2. Process Transactions
            // const headers = csvData[0]; // Unused
            const dataRows = csvData.slice(1);
            const totalRows = dataRows.length;

            for (let i = 0; i < totalRows; i++) {
                const row = dataRows[i];
                if (row.length === 0 || (row.length === 1 && !row[0])) continue; // Skip empty rows

                const txData: any = {
                    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    book_id: book.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    custom_data: {}
                };

                let amountIn = 0;
                let amountOut = 0;
                let dateFound = false;

                mappings.forEach((mapping, colIndex) => {
                    if (mapping.targetField === 'ignore') return;

                    const value = row[colIndex]?.trim();
                    if (!value) return;

                    switch (mapping.targetField) {
                        case 'date':
                            const parsedDate = parseFlexibleDate(value);
                            if (parsedDate) {
                                // Format as YYYY-MM-DD for storage
                                const yyyy = parsedDate.getFullYear();
                                const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
                                const dd = String(parsedDate.getDate()).padStart(2, '0');
                                txData.date = `${yyyy}-${mm}-${dd}`;
                                dateFound = true;
                            }
                            break;
                        case 'time':
                            // Ignored for now
                            break;
                        case 'description':
                            txData.description = value;
                            break;
                        case 'category':
                            txData.category_id = value;
                            break;
                        case 'mode':
                            txData.payment_mode = value;
                            break;
                        case 'party':
                            txData.party_id = value;
                            break;
                        case 'amount_in':
                            amountIn = parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
                            break;
                        case 'amount_out':
                            amountOut = parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
                            break;
                        case 'amount_net':
                            const net = parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
                            if (net >= 0) amountIn = net;
                            else amountOut = Math.abs(net);
                            break;
                        default:
                            // Custom field
                            if (!txData.custom_data) txData.custom_data = {};
                            txData.custom_data[mapping.targetField] = value;
                    }
                });

                if (!dateFound) {
                    console.warn(`Row ${i + 2} skipped: No valid date found.`);
                    continue;
                }

                // Determine type and final amount
                if (amountIn > 0 && amountOut === 0) {
                    txData.type = 'income';
                    txData.amount = amountIn;
                } else if (amountOut > 0 && amountIn === 0) {
                    txData.type = 'expense';
                    txData.amount = amountOut;
                } else if (amountIn > 0 && amountOut > 0) {
                    txData.type = 'income';
                    txData.amount = amountIn;
                } else {
                    txData.type = 'expense';
                    txData.amount = 0;
                }

                // Default required fields if missing
                if (!txData.category_id) txData.category_id = 'Uncategorized';
                if (!txData.payment_mode) txData.payment_mode = 'Cash';
                if (!txData.description) txData.description = 'Imported Transaction';

                await db.addTransaction(txData as Transaction);

                // Update progress every 10 rows
                if (i % 10 === 0) {
                    setProgress(Math.round(((i + 1) / totalRows) * 100));
                }
            }

            setProgress(100);
            setTimeout(() => {
                onSuccess();
            }, 500);

        } catch (err) {
            console.error('Import execution failed:', err);
            setError(err instanceof Error ? err.message : 'Import failed during processing');
            setStep('map'); // Go back to map on error
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-900">Import Transactions (CSV)</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <Upload size={48} className="text-gray-400 mb-4" />
                            <p className="text-lg font-medium text-gray-700">Click to upload CSV file</p>
                            <p className="text-sm text-gray-500 mt-2">or drag and drop here</p>
                            {error && <p className="text-red-600 mt-4">{error}</p>}
                        </div>
                    )}

                    {step === 'map' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm">
                                <p className="font-medium">Map your CSV columns to Book fields.</p>
                                <p>Select "Create New Field" to automatically add a new custom field to your book.</p>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                                        <tr>
                                            <th className="p-3 w-1/4">CSV Header</th>
                                            <th className="p-3 w-1/4">Sample Value</th>
                                            <th className="p-3 w-1/2">Map To Field</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {mappings.map((mapping, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium text-gray-900">{mapping.csvHeader}</td>
                                                <td className="p-3 text-gray-500 truncate max-w-xs" title={mapping.sampleValue}>
                                                    {mapping.sampleValue || <span className="italic text-gray-300">Empty</span>}
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex gap-2">
                                                        <select
                                                            value={mapping.targetField}
                                                            onChange={(e) => handleMappingChange(index, e.target.value)}
                                                            className={clsx(
                                                                "flex-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500",
                                                                mapping.targetField === 'ignore' ? "text-gray-400 border-gray-200" : "border-primary-200 bg-primary-50 text-primary-900"
                                                            )}
                                                        >
                                                            <option value="ignore">Ignore Column</option>
                                                            <optgroup label="System Fields">
                                                                {systemFields.map(f => (
                                                                    <option key={f.value} value={f.value}>{f.label}</option>
                                                                ))}
                                                            </optgroup>
                                                            {customFields.length > 0 && (
                                                                <optgroup label="Existing Custom Fields">
                                                                    {customFields.map(f => (
                                                                        <option key={f.key} value={f.key}>{f.label}</option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                            <optgroup label="Actions">
                                                                <option value="create_new">+ Create New Field</option>
                                                            </optgroup>
                                                        </select>

                                                        {mapping.targetField === 'create_new' && (
                                                            <input
                                                                type="text"
                                                                value={mapping.newFieldName || ''}
                                                                onChange={(e) => handleNewFieldNameChange(index, e.target.value)}
                                                                placeholder="Field Name"
                                                                className="w-1/3 px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                                                autoFocus
                                                            />
                                                        )}
                                                    </div>
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
                                    <span>Importing transactions...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-center text-sm text-gray-500">
                                    Please wait while we process your file.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    {step === 'map' && (
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
                                Import Transactions
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

