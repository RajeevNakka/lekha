import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { Plus, Trash2, FileText, Edit2 } from 'lucide-react';
import { CreateTemplateModal } from './CreateTemplateModal';
import { EditTemplateModal } from './EditTemplateModal';
import type { FieldTemplate } from '../../types';

export function TemplateManager() {
    const { templates, fetchTemplates, deleteTemplate } = useStore();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<FieldTemplate | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
            try {
                const { db } = await import('../../lib/db');
                await db.deleteTemplate(id);
                deleteTemplate(id);
            } catch (error) {
                console.error('Failed to delete template:', error);
                alert('Failed to delete template');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Field Templates</h3>
                    <p className="text-sm text-gray-500">Manage reusable field configurations for your books.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    title="Create Template"
                >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Create Template</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                    <div key={template.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                <FileText size={20} />
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setEditingTemplate(template)}
                                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                    title="Edit Template"
                                >
                                    <Edit2 size={16} />
                                </button>
                                {!template.is_default && (
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Template"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
                            {template.description || 'No description provided.'}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="px-2 py-1 bg-gray-100 rounded-md">
                                {template.field_config.length} Fields
                            </span>
                            {template.is_default && (
                                <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md">
                                    System Default
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {templates.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500">No templates found. Create one to get started.</p>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <CreateTemplateModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        fetchTemplates();
                    }}
                />
            )}

            {editingTemplate && (
                <EditTemplateModal
                    template={editingTemplate}
                    onClose={() => setEditingTemplate(null)}
                    onSuccess={() => {
                        fetchTemplates();
                    }}
                />
            )}
        </div>
    );
}
