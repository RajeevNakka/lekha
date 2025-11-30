import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { generateId } from '../../lib/utils';
import type { FieldTemplate, FieldConfig } from '../../types';
import { X, Save, AlertTriangle } from 'lucide-react';
import { FieldEditor } from '../Shared/FieldEditor';

interface CreateTemplateModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateTemplateModal({ onClose, onSuccess }: CreateTemplateModalProps) {
    const { addTemplate, templates, fetchTemplates } = useStore();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [baseTemplateId, setBaseTemplateId] = useState<string>('');
    const [fields, setFields] = useState<FieldConfig[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    // Initialize fields based on base template selection
    useEffect(() => {
        if (baseTemplateId) {
            const baseTemplate = templates.find(t => t.id === baseTemplateId);
            if (baseTemplate) {
                setFields([...baseTemplate.field_config]);
            }
        } else {
            // Default blank config
            setFields([
                { key: 'amount', label: 'Amount', type: 'number', required: true, visible: true, order: 1 },
                { key: 'date', label: 'Date', type: 'date', required: true, visible: true, order: 2 },
                { key: 'description', label: 'Description', type: 'text', required: true, visible: true, order: 3 },
                { key: 'category_id', label: 'Category', type: 'dropdown', required: true, visible: true, order: 4, options: ['General'] },
                { key: 'type', label: 'Type', type: 'dropdown', required: true, visible: true, order: 5, options: ['Income', 'Expense'] }
            ]);
        }
    }, [baseTemplateId, templates]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const { db } = await import('../../lib/db');

            let preferences = {};
            if (baseTemplateId) {
                const baseTemplate = templates.find(t => t.id === baseTemplateId);
                if (baseTemplate) {
                    preferences = { ...baseTemplate.preferences };
                }
            }

            const newTemplate: FieldTemplate = {
                id: generateId(),
                name: name.trim(),
                description: description.trim(),
                field_config: fields,
                preferences: preferences,
                is_default: false,
                created_at: new Date().toISOString()
            };

            await db.addTemplate(newTemplate);
            addTemplate(newTemplate);

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to create template:', err);
            setError('Failed to create template. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">Create New Template</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <form id="create-template-form" onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
                                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="e.g., Freelance Project"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Template (Optional)</label>
                                    <select
                                        value={baseTemplateId}
                                        onChange={(e) => setBaseTemplateId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                                    >
                                        <option value="">Start from Scratch (Basic Fields)</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} {t.is_default ? '(System)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Choose an existing template to start with.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none h-32"
                                    placeholder="Briefly describe what this template is for..."
                                />
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-6">
                            <h4 className="text-sm font-medium text-gray-900 mb-4">Field Configuration</h4>
                            <FieldEditor fields={fields} onChange={setFields} />
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3">
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
                        form="create-template-form"
                        disabled={isSubmitting || !name.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        Create Template
                    </button>
                </div>
            </div>
        </div>
    );
}
