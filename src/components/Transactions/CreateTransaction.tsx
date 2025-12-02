import { useStore } from '../../lib/store';
import { DynamicForm } from '../Forms/DynamicForm';
import type { Transaction, FieldConfig } from '../../types';
import { db } from '../../lib/db';
import { generateId } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export function CreateTransaction() {
    const { activeBookId, books, currentUser } = useStore();
    const navigate = useNavigate();

    const activeBook = books.find(b => b.id === activeBookId);

    if (!activeBook) return <div>No book selected</div>;

    // Use the book's field configuration directly
    const fields: FieldConfig[] = [...activeBook.field_config].sort((a, b) => a.order - b.order);

    // Helper to find description field
    const getDescriptionField = (fields: FieldConfig[]) => {
        // 1. Exact key match 'description'
        const descKey = fields.find(f => f.key === 'description');
        if (descKey) return descKey;

        // 2. Exact key match 'remark'
        const remarkKey = fields.find(f => f.key === 'remark');
        if (remarkKey) return remarkKey;

        // 3. Label match 'description' (case insensitive)
        const descLabel = fields.find(f => f.label.toLowerCase() === 'description');
        if (descLabel) return descLabel;

        // 4. Label match 'remark' (case insensitive)
        const remarkLabel = fields.find(f => f.label.toLowerCase() === 'remark');
        if (remarkLabel) return remarkLabel;

        return null;
    };

    const handleSubmit = async (data: Record<string, string | number | boolean | undefined>) => {
        if (!currentUser) return;

        const amount = Number(data.amount);
        const typeInput = data.type as string | undefined;

        // Normalize type to lowercase for database storage
        const type = typeInput?.toLowerCase() as 'income' | 'expense' | 'transfer' | undefined;

        // Infer type from amount if not provided
        const finalType: 'income' | 'expense' | 'transfer' = type || (amount >= 0 ? 'income' : 'expense');

        const descField = getDescriptionField(fields);
        const descValue = descField ? data[descField.key] : '';

        const transaction: Transaction = {
            id: generateId(),
            book_id: activeBook.id,
            type: finalType,
            amount: Math.abs(amount), // Store as absolute value
            date: String(data.date),
            description: descValue ? String(descValue) : '',
            category_id: String(data.category_id || 'uncategorized'),
            party_id: data.party as string | undefined,
            payment_mode: 'cash',
            tags: [],
            attachments: [],
            custom_data: {},
            created_by: currentUser.id,
            created_at: new Date().toISOString()
        };

        // Move custom fields to custom_data
        Object.keys(data).forEach(key => {
            if (!['type', 'amount', 'date', 'category_id', 'party', descField?.key].includes(key)) {
                if (transaction.custom_data) {
                    transaction.custom_data[key] = data[key];
                }
            }
        });

        await db.addTransaction(transaction);
        navigate('/transactions');
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">New Transaction</h1>
                <p className="text-gray-500">Record a new income or expense for {activeBook.name}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <DynamicForm
                    fields={fields}
                    onSubmit={handleSubmit}
                    onCancel={() => navigate(-1)}
                    defaultValues={{
                        date: new Date().toISOString().slice(0, 16),
                        type: 'Expense'
                    }}
                />
            </div>
        </div>
    );
}
