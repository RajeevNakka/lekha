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

    // Merge default fields with custom fields if needed, or just use the config
    // In our design, we put everything in field_config for simplicity in rendering
    // But we need to map them back to the Transaction object structure

    // Use the book's field configuration directly
    // The configuration now includes all required fields (amount, date, etc.)
    const fields: FieldConfig[] = [...activeBook.field_config].sort((a, b) => a.order - b.order);

    const handleSubmit = async (data: Record<string, string | number | boolean | undefined>) => {
        if (!currentUser) return;

        const transaction: Transaction = {
            id: generateId(),
            book_id: activeBook.id,
            type: data.type as 'income' | 'expense' | 'transfer',
            amount: Number(data.amount),
            date: String(data.date),
            description: String(data.description),
            category_id: String(data.category || 'uncategorized'), // simplified
            party_id: data.party as string | undefined,
            payment_mode: 'cash', // default for now
            tags: [],
            attachments: [],
            custom_data: {}, // store extra fields here
            created_by: currentUser.id,
            created_at: new Date().toISOString()
        };

        // Move custom fields to custom_data
        Object.keys(data).forEach(key => {
            if (!['type', 'amount', 'date', 'description', 'category', 'party'].includes(key)) {
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
                        date: new Date().toISOString().slice(0, 16), // Current datetime for input
                        type: 'expense'
                    }}
                />
            </div>
        </div>
    );
}
