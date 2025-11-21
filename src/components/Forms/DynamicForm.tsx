import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { FieldConfig, Transaction } from '../../types';
import { clsx } from 'clsx';
import { Calendar, ChevronDown } from 'lucide-react';

interface DynamicFormProps {
    fields: FieldConfig[];
    onSubmit: (data: any) => void;
    onCancel?: () => void;
    defaultValues?: Partial<Transaction>;
    isSubmitting?: boolean;
}

export function DynamicForm({ fields, onSubmit, onCancel, defaultValues, isSubmitting }: DynamicFormProps) {
    // 1. Generate Zod Schema dynamically
    const generateSchema = (fields: FieldConfig[]) => {
        const shape: Record<string, z.ZodTypeAny> = {};

        fields.forEach((field) => {
            if (!field.visible) return;

            let schema: z.ZodTypeAny;

            switch (field.type) {
                case 'number': {
                    let numSchema = z.coerce.number();
                    if (field.validation?.min !== undefined) numSchema = numSchema.min(field.validation.min);
                    if (field.validation?.max !== undefined) numSchema = numSchema.max(field.validation.max);
                    schema = numSchema;
                    break;
                }
                case 'date':
                    // datetime-local input returns "YYYY-MM-DDTHH:mm", which isn't a strict ISO string
                    schema = z.string();
                    break;
                case 'dropdown':
                    schema = z.string();
                    break;
                case 'checkbox':
                    schema = z.boolean();
                    break;
                case 'file':
                    schema = z.any();
                    break;
                default: { // text
                    let strSchema = z.string();
                    if (field.validation?.regex) {
                        strSchema = strSchema.regex(new RegExp(field.validation.regex), "Invalid format");
                    }
                    schema = strSchema;
                }
            }

            if (!field.required) {
                schema = schema.optional().or(z.literal(''));
            } else {
                if (field.type === 'text' || field.type === 'dropdown') {
                    // Re-applying min(1) for strings if required
                    schema = (schema as z.ZodString).min(1, `${field.label} is required`);
                }
            }

            shape[field.key] = schema;
        });

        return z.object(shape);
    };

    const schema = generateSchema(fields);
    type FormValues = z.infer<typeof schema>;

    // Debug logging
    console.log('DynamicForm defaultValues:', defaultValues);
    console.log('DynamicForm fields:', fields.map(f => ({ key: f.key, type: f.type })));

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: defaultValues || {},
    });

    // Sort fields by order
    const sortedFields = [...fields].sort((a, b) => a.order - b.order);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedFields.map((field) => {
                    if (!field.visible) return null;

                    return (
                        <div key={field.key} className={clsx("flex flex-col gap-1", field.type === 'file' ? "md:col-span-2" : "")}>
                            <label htmlFor={field.key} className="text-sm font-medium text-gray-700">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>

                            {field.type === 'text' && (
                                field.multiline ? (
                                    <textarea
                                        id={field.key}
                                        {...register(field.key)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-y"
                                    />
                                ) : (
                                    <input
                                        id={field.key}
                                        type="text"
                                        {...register(field.key)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    />
                                )
                            )}

                            {field.type === 'number' && (
                                <input
                                    id={field.key}
                                    type="number"
                                    step="0.01"
                                    {...register(field.key)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                />
                            )}

                            {field.type === 'date' && (
                                <div className="relative">
                                    <input
                                        id={field.key}
                                        type="datetime-local"
                                        {...register(field.key)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    />
                                    <Calendar className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={18} />
                                </div>
                            )}

                            {field.type === 'dropdown' && (
                                <div className="relative">
                                    <select
                                        id={field.key}
                                        {...register(field.key)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none bg-white"
                                    >
                                        <option value="">Select...</option>
                                        {field.options?.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={18} />
                                </div>
                            )}

                            {field.type === 'checkbox' && (
                                <div className="flex items-center h-10">
                                    <input
                                        id={field.key}
                                        type="checkbox"
                                        {...register(field.key)}
                                        className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-500">Enable</span>
                                </div>
                            )}

                            {/* Error Message */}
                            {errors[field.key] && (
                                <span className="text-xs text-red-500 mt-1">
                                    {errors[field.key]?.message as string}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Saving...' : 'Save Transaction'}
                </button>
            </div>
        </form>
    );
}
