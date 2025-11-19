import { useEffect, useState } from 'react';
import { useStore } from '../../lib/store';
import { DynamicForm } from '../Forms/DynamicForm';
import type { Transaction, FieldConfig } from '../../types';
import { db } from '../../lib/db';
import { useNavigate, useParams } from 'react-router-dom';

export function EditTransaction() {
    const { transactionId } = useParams();
    const { activeBookId, books, currentUser } = useStore();
    const navigate = useNavigate();
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);

    const activeBook = books.find(b => b.id === activeBookId);

    useEffect(() => {
        if (transactionId) {
            db.getTransaction(transactionId).then(tx => {
                if (tx) {
                    setTransaction(tx);
                }
                setLoading(false);
            });
        }
    }, [transactionId]);

    if (!activeBook) return <div>No book selected</div>;
    if (loading) return <div>Loading...</div>;
    if (!transaction) return <div>Transaction not found</div>;

    const fields: FieldConfig[] = [
        { key: 'type', label: 'Type', type: 'dropdown', visible: true, required: true, order: 0, options: ['income', 'expense', 'transfer'] },
        { key: 'amount', label: 'Amount', type: 'number', visible: true, required: true, order: 1, validation: { min: 0 } },
        { key: 'date', label: 'Date & Time', type: 'date', visible: true, required: true, order: 2 },
        { key: 'description', label: 'Description', type: 'text', visible: true, required: true, order: 3, multiline: true },
        ...activeBook.field_config
    ];

    const handleSubmit = async (data: any) => {
        if (!currentUser) return;

        // Handle Date & Time
        // data.date from datetime-local is "YYYY-MM-DDTHH:mm"
        const dateObj = new Date(data.date);
        const dateStr = data.date.split('T')[0]; // YYYY-MM-DD
        const createdAtStr = dateObj.toISOString();

        const updatedTransaction: Transaction = {
            ...transaction,
            type: data.type,
            amount: data.amount,
            date: dateStr,
            description: data.description,
            category_id: data.category || 'uncategorized',
            party_id: data.party,
            custom_data: { ...transaction.custom_data },
            created_at: createdAtStr // Update timestamp
        };

        // Update custom fields
        Object.keys(data).forEach(key => {
            if (!['type', 'amount', 'date', 'description', 'category', 'party'].includes(key)) {
                if (updatedTransaction.custom_data) {
                    updatedTransaction.custom_data[key] = data[key];
                }
            }
        });

        await db.updateTransaction(updatedTransaction);
        navigate('/transactions');
    };

    // Prepare default values from transaction object
    const defaultValues = {
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.created_at ? transaction.created_at.slice(0, 16) : transaction.date, // Use created_at for time
        description: transaction.description,
        category: transaction.category_id,
        party: transaction.party_id,
        ...transaction.custom_data
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Edit Transaction</h1>
                <p className="text-gray-500">Update transaction details for {activeBook.name}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <DynamicForm
                    fields={fields}
                    onSubmit={handleSubmit}
                    onCancel={() => navigate(-1)}
                    defaultValues={defaultValues}
                />
            </div>
        </div>
    );
}
