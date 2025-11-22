import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { db } from '../../lib/db';
import { X, AlertTriangle, Check, LayoutTemplate } from 'lucide-react';
import type { Book, FieldTemplate } from '../../types';

interface ApplyTemplateModalProps {
    book: Book;
    onClose: () => void;
    onSuccess: () => void;
}

export function ApplyTemplateModal({ book, onClose, onSuccess }: ApplyTemplateModalProps) {
    const { updateBook } = useStore();
    const [templates, setTemplates] = useState<FieldTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const tpls = await db.getTemplates();
                setTemplates(tpls);
                if (tpls.length > 0) {
                    setSelectedTemplateId(tpls[0].id);
                }
            } catch (error) {
                console.error('Failed to load templates:', error);
                setError('Failed to load templates.');
            }
        };
        loadTemplates();
    }, []);

    const handleApply = async () => {
        if (!selectedTemplateId) return;

        setIsLoading(true);
        setError('');

        try {
            const template = templates.find(t => t.id === selectedTemplateId);
            if (!template) throw new Error('Template not found');

            const updatedBook: Book = {
                ...book,
                field_config: template.field_config,
                preferences: {
                    ...book.preferences,
                    ...template.preferences
                }
            };

            await updateBook(updatedBook);
            onSuccess();
        } catch (err) {
            console.error('Failed to apply template:', err);
            setError('Failed to apply template. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Apply Template</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3">
                        <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                        <div className="text-sm text-amber-800">
                            <p className="font-medium mb-1">Warning: Overwrite Action</p>
                            Applying a template will <strong>overwrite</strong> your current field configuration and preferences. Existing transaction data will remain, but fields may not match if keys are different.
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Template</label>
                        <div className="relative">
                            <select
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none appearance-none bg-white"
                            >
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} {t.is_default ? '(System)' : ''}
                                    </option>
                                ))}
                            </select>
                            <LayoutTemplate size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        {selectedTemplate && (
                            <p className="mt-2 text-sm text-gray-500">
                                {selectedTemplate.description}
                            </p>
                        )}
                    </div>

                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={isLoading || !selectedTemplateId}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                            {isLoading ? 'Applying...' : (
                                <>
                                    <Check size={18} />
                                    Apply Template
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
