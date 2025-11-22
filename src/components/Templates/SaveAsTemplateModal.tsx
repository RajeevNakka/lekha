import { useState } from 'react';
import { useStore } from '../../lib/store';
import { generateId } from '../../lib/utils';
import type { Book, FieldTemplate } from '../../types';
import { X, Save, AlertTriangle } from 'lucide-react';

interface SaveAsTemplateModalProps {
    book: Book;
    onClose: () => void;
    onSuccess: () => void;
}

export function SaveAsTemplateModal({ book, onClose, onSuccess }: SaveAsTemplateModalProps) {
    const { addTemplate } = useStore();
    const [name, setName] = useState(`${book.name} Template`);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            console.log('Starting template save...');
            const { db } = await import('../../lib/db');
            console.log('DB module imported');

            const newTemplate: FieldTemplate = {
                id: generateId(),
                name: name.trim(),
                description: description.trim(),
                field_config: book.field_config,
                preferences: book.preferences || {},
                is_default: false,
                created_at: new Date().toISOString()
            };
            console.log('New template object created:', newTemplate);

            // Timeout wrapper to prevent infinite loader
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Database operation timed out. Please refresh the page.')), 5000)
            );

            await Promise.race([
                db.addTemplate(newTemplate),
                timeoutPromise
            ]);

            console.log('Template added to DB');

            addTemplate(newTemplate);
            console.log('Template added to store');

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to save template:', err);
            setError('Failed to save template. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Save as Template</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            placeholder="e.g., Personal Finance Setup"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none h-24"
                            placeholder="Briefly describe what this template is for..."
                        />
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-500">
                        <p>This will save the current <strong>Field Configuration</strong> and <strong>Preferences</strong> as a reusable template.</p>
                        <p className="mt-1">Transaction data will NOT be saved.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !name.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            Save Template
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
