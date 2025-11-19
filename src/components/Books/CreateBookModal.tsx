import { useState } from 'react';
import { useStore } from '../../lib/store';
import { db } from '../../lib/db';
import { generateId } from '../../lib/utils';
import { X } from 'lucide-react';
import type { Book } from '../../types';

interface CreateBookModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateBookModal({ isOpen, onClose }: CreateBookModalProps) {
    const { addBook, setActiveBook } = useStore();
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            const newBook: Book = {
                id: generateId(),
                name,
                currency,
                role: 'owner',
                created_at: new Date().toISOString(),
                field_config: [
                    // Default fields
                    { key: 'amount', label: 'Amount', type: 'number', required: true, visible: true, order: 1 },
                    { key: 'date', label: 'Date', type: 'date', required: true, visible: true, order: 2 },
                    { key: 'description', label: 'Description', type: 'text', required: true, visible: true, order: 3 },
                    { key: 'category_id', label: 'Category', type: 'dropdown', required: true, visible: true, order: 4, options: ['Food', 'Transport', 'Utilities', 'Salary', 'Other'] },
                    { key: 'type', label: 'Type', type: 'dropdown', required: true, visible: true, order: 5, options: ['income', 'expense', 'transfer'] },
                    { key: 'party', label: 'Party', type: 'text', visible: true, required: false, order: 6 }
                ]
            };

            await db.addBook(newBook);
            addBook(newBook);
            setActiveBook(newBook.id);
            onClose();
            setName('');
        } catch (error) {
            console.error('Failed to create book:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Create New Book</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label htmlFor="bookName" className="block text-sm font-medium text-gray-700 mb-1">
                            Book Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="bookName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Personal Finances, Project X"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                            autoFocus
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                            Currency
                        </label>
                        <select
                            id="currency"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white"
                        >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="INR">INR (₹)</option>
                            <option value="JPY">JPY (¥)</option>
                        </select>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Book'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
