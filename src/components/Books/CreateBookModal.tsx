import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { db } from '../../lib/db';
import { generateId } from '../../lib/utils';
import { X, LayoutTemplate } from 'lucide-react';
import type { Book, FieldTemplate, FieldConfig } from '../../types';

interface CreateBookModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateBookModal({ isOpen, onClose }: CreateBookModalProps) {
    const { addBook, setActiveBook } = useStore();
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl_personal');
    const [templates, setTemplates] = useState<FieldTemplate[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const loadTemplates = async () => {
                try {
                    const tpls = await db.getTemplates();
                    setTemplates(tpls);
                } catch (error) {
                    console.error('Failed to load templates:', error);
                }
            };
            loadTemplates();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            let fieldConfig: FieldConfig[] = [
                { key: 'amount', label: 'Amount', type: 'number', required: true, visible: true, order: 1 },
                { key: 'date', label: 'Date', type: 'date', required: true, visible: true, order: 2 },
                { key: 'description', label: 'Description', type: 'text', required: true, visible: true, order: 3 },
                { key: 'category_id', label: 'Category', type: 'dropdown', required: true, visible: true, order: 4, options: ['Food', 'Transport', 'Utilities', 'Salary', 'Other'] },
                { key: 'type', label: 'Type', type: 'dropdown', required: true, visible: true, order: 5, options: ['Income', 'Expense', 'Transfer'] },
                { key: 'party', label: 'Party', type: 'text', visible: true, required: false, order: 6 }
            ];

            let preferences = {};

            if (selectedTemplateId && selectedTemplateId !== 'custom') {
                const template = templates.find(t => t.id === selectedTemplateId);
                if (template) {
                    fieldConfig = template.field_config;
                    preferences = template.preferences || {};
                }
            }

            const newBook: Book = {
                id: generateId(),
                name,
                currency,
                role: 'owner',
                created_at: new Date().toISOString(),
                field_config: fieldConfig as any,
                preferences
            };

            await db.addBook(newBook);
            addBook(newBook);
            setActiveBook(newBook.id);
            onClose();
            setName('');
            setSelectedTemplateId('tpl_personal');
        } catch (error) {
            console.error('Failed to create book:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

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
                        <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
                            Template
                        </label>
                        <div className="relative">
                            <select
                                id="template"
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white appearance-none"
                            >
                                <option value="custom">Custom (Blank)</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} {t.is_default ? '(System)' : ''}
                                    </option>
                                ))}
                            </select>
                            <LayoutTemplate size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        {selectedTemplate && (
                            <p className="mt-1 text-xs text-gray-500">
                                {selectedTemplate.description}
                            </p>
                        )}
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
