import { GripVertical, Trash2, Plus, ChevronDown } from 'lucide-react';
import { generateId } from '../../lib/utils';
import type { FieldConfig, FieldType } from '../../types';

interface FieldEditorProps {
    fields: FieldConfig[];
    onChange: (fields: FieldConfig[]) => void;
    readOnlyCoreFields?: boolean; // If true, core fields (amount, date, description) cannot be deleted/modified type
}

export function FieldEditor({ fields, onChange, readOnlyCoreFields = true }: FieldEditorProps) {

    const handleAddField = () => {
        const newField: FieldConfig = {
            key: `field_${generateId()}`,
            label: 'New Field',
            type: 'text',
            required: false,
            visible: true,
            order: fields.length + 1
        };
        onChange([...fields, newField]);
    };

    const handleUpdateField = (index: number, updates: Partial<FieldConfig>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        onChange(newFields);
    };

    const handleDeleteField = (index: number) => {
        const fieldToDelete = fields[index];
        // Prevent deleting core fields if readOnlyCoreFields is true
        if (readOnlyCoreFields && ['amount', 'date', 'description'].includes(fieldToDelete.key)) {
            alert('Cannot delete core system fields.');
            return;
        }

        const newFields = fields.filter((_, i) => i !== index);
        onChange(newFields);
    };

    const handleMoveField = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === fields.length - 1)
        ) return;

        const newFields = [...fields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap
        [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];

        // Update order property
        newFields.forEach((f, i) => f.order = i + 1);

        onChange(newFields);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleAddField}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-medium"
                >
                    <Plus size={16} />
                    Add Field
                </button>
            </div>

            <div className="space-y-3">
                {fields.sort((a, b) => (a.order || 0) - (b.order || 0)).map((field, index) => (
                    <div key={field.key} className="flex items-start gap-2 md:gap-3 p-2 md:p-3 border border-gray-200 rounded-lg bg-white hover:border-primary-200 transition-colors group">
                        <div className="flex flex-col gap-1 mt-2 text-gray-400 cursor-grab active:cursor-grabbing">
                            <button type="button" onClick={() => handleMoveField(index, 'up')} disabled={index === 0} className="hover:text-primary-600 disabled:opacity-30">
                                <ChevronDown size={14} className="rotate-180" />
                            </button>
                            <GripVertical size={16} />
                            <button type="button" onClick={() => handleMoveField(index, 'down')} disabled={index === fields.length - 1} className="hover:text-primary-600 disabled:opacity-30">
                                <ChevronDown size={14} />
                            </button>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4">
                            <div className="md:col-span-3">
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Label</label>
                                <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
                                <select
                                    value={field.type}
                                    onChange={(e) => handleUpdateField(index, { type: e.target.value as FieldType })}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 outline-none bg-white"
                                    disabled={readOnlyCoreFields && ['amount', 'date', 'description'].includes(field.key)}
                                >
                                    <option value="text">Text</option>
                                    <option value="number">Number</option>
                                    <option value="date">Date</option>
                                    <option value="dropdown">Dropdown</option>
                                    <option value="checkbox">Checkbox</option>
                                </select>
                            </div>
                            <div className="md:col-span-4">
                                {field.type === 'dropdown' && (
                                    <>
                                        <label className="text-xs font-medium text-gray-500 mb-1 block">Options (comma separated)</label>
                                        <input
                                            type="text"
                                            value={field.options?.join(', ') || ''}
                                            onChange={(e) => handleUpdateField(index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                                            placeholder="Option 1, Option 2..."
                                        />
                                    </>
                                )}
                            </div>
                            <div className="md:col-span-3 flex items-center gap-4 pt-2 md:pt-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) => handleUpdateField(index, { required: e.target.checked })}
                                        className="rounded text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm text-gray-600">Required</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={field.visible}
                                        onChange={(e) => handleUpdateField(index, { visible: e.target.checked })}
                                        className="rounded text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm text-gray-600">Visible</span>
                                </label>
                            </div>
                        </div>

                        <div className="pt-2 md:pt-6">
                            <button
                                type="button"
                                onClick={() => handleDeleteField(index)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete Field"
                                disabled={readOnlyCoreFields && ['amount', 'date', 'description'].includes(field.key)}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}

                {fields.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No fields configured. Click "Add Field" to start.
                    </div>
                )}
            </div>
        </div>
    );
}
