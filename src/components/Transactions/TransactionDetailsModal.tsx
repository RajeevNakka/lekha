import { X, Edit2, Calendar, Tag, CreditCard, FileText, DollarSign } from 'lucide-react';
import type { Transaction, Book } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface TransactionDetailsModalProps {
    transaction: Transaction;
    book: Book;
    onClose: () => void;
}

export function TransactionDetailsModal({ transaction, book, onClose }: TransactionDetailsModalProps) {
    // Helper to get value for a dynamic field
    const getFieldValue = (key: string) => {
        if (transaction.custom_data && transaction.custom_data[key] !== undefined) {
            return transaction.custom_data[key];
        }
        // Fallback to checking top-level properties if key matches (e.g. 'payment_mode')
        return (transaction as any)[key];
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Transaction Details</h2>
                        <p className="text-sm text-gray-500 mt-1">ID: {transaction.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Primary Info Card */}
                    <div className={`p-6 rounded-xl border ${transaction.type === 'income' ? 'bg-green-50 border-green-100' :
                        transaction.type === 'expense' ? 'bg-red-50 border-red-100' :
                            'bg-blue-50 border-blue-100'
                        }`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-full ${transaction.type === 'income' ? 'bg-green-100 text-green-600' :
                                    transaction.type === 'expense' ? 'bg-red-100 text-red-600' :
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                    <DollarSign size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Amount</p>
                                    <p className={`text-3xl font-bold ${transaction.type === 'income' ? 'text-green-700' :
                                        transaction.type === 'expense' ? 'text-red-700' :
                                            'text-blue-700'
                                        }`}>
                                        {formatCurrency(transaction.amount, book.currency)}
                                    </p>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium capitalize border ${transaction.type === 'income' ? 'bg-green-100 text-green-700 border-green-200' :
                                transaction.type === 'expense' ? 'bg-red-100 text-red-700 border-red-200' :
                                    'bg-blue-100 text-blue-700 border-blue-200'
                                }`}>
                                {transaction.type}
                            </div>
                        </div>
                    </div>

                    {/* Core Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <Calendar size={16} />
                                <span className="text-xs font-medium uppercase">Date & Time</span>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-gray-900 font-medium text-lg">{formatDate(transaction.date)}</p>
                                {transaction.created_at && (
                                    <p className="text-sm text-gray-500">
                                        {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <FileText size={16} />
                                <span className="text-xs font-medium uppercase">Description</span>
                            </div>
                            <p className="text-gray-900 font-medium text-lg whitespace-pre-wrap">{transaction.description}</p>
                        </div>

                        {/* Category (Special handling as it's a core field but might be dynamic in future) */}
                        {transaction.category_id && transaction.category_id !== 'uncategorized' && (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <Tag size={16} />
                                    <span className="text-xs font-medium uppercase">Category</span>
                                </div>
                                <p className="text-gray-900 font-medium text-lg">{transaction.category_id}</p>
                            </div>
                        )}
                    </div>

                    {/* Dynamic Fields Grid */}
                    {(book.field_config || []).length > 0 && (
                        <div className="border-t border-gray-100 pt-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Additional Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {(book.field_config || [])
                                    .filter(field => field.visible)
                                    .sort((a, b) => a.order - b.order)
                                    .map(field => {
                                        const value = getFieldValue(field.key);
                                        if (value === undefined || value === null || value === '') return null;

                                        return (
                                            <div key={field.key} className="space-y-1">
                                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                                    {/* Simple icon mapping based on type */}
                                                    {field.type === 'date' ? <Calendar size={16} /> :
                                                        field.type === 'number' ? <DollarSign size={16} /> :
                                                            field.type === 'dropdown' ? <Tag size={16} /> :
                                                                <FileText size={16} />}
                                                    <span className="text-xs font-medium uppercase">{field.label}</span>
                                                </div>
                                                <p className={`text-gray-900 font-medium ${field.multiline ? 'whitespace-pre-wrap' : ''}`}>
                                                    {field.type === 'date' ? formatDate(String(value)) : String(value)}
                                                </p>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                        Close
                    </button>
                    <Link
                        to={`/transactions/${transaction.id}/edit`}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm flex items-center gap-2 font-medium"
                    >
                        <Edit2 size={18} />
                        Edit Transaction
                    </Link>
                </div>
            </div>
        </div>
    );
}
