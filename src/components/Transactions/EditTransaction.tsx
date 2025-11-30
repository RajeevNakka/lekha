import { useEffect, useState } from 'react';
import { useStore } from '../../lib/store';
import { DynamicForm } from '../Forms/DynamicForm';
import type { Transaction, FieldConfig } from '../../types';
import { db } from '../../lib/db';
import { useNavigate, useParams } from 'react-router-dom';
import { toDatetimeLocalFormat } from '../../lib/utils';

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

    const fields: FieldConfig[] = [...activeBook.field_config].sort((a, b) => a.order - b.order);

    const handleSubmit = async (data: Record<string, string | number | boolean | undefined>) => {
        if (!currentUser || !transaction) return;

        const amount = Number(data.amount);
        const typeInput = data.type as string | undefined;

        // Normalize type to lowercase for database storage
        const type = typeInput?.toLowerCase() as 'income' | 'expense' | 'transfer' | undefined;

        // Infer type from amount if not provided
        const finalType: 'income' | 'expense' | 'transfer' = type || (amount >= 0 ? 'income' : 'expense');

        const dateObj = new Date(String(data.date));
        const createdAtStr = dateObj.toISOString();

        const updatedTransaction: Transaction = {
            ...transaction,
            type: finalType,
            amount: Math.abs(amount),
            date: String(data.date),
            description: String(data.description),
            category_id: String(data.category_id || 'uncategorized'),
            party_id: data.party as string | undefined,
            custom_data: { ...transaction.custom_data },
            created_at: createdAtStr
        };

        // Update custom fields
        const coreFields = ['type', 'amount', 'date', 'description', 'category_id', 'party'];
        Object.keys(data).forEach(key => {
            if (!coreFields.includes(key)) {
                if (updatedTransaction.custom_data) {
                    updatedTransaction.custom_data[key] = data[key];
                }
            }
        });

        await db.updateTransaction(updatedTransaction);
        navigate('/transactions');
    };

    const defaultValues = {
        ...transaction.custom_data,
        type: transaction.type,
        amount: transaction.amount,
        date: toDatetimeLocalFormat(transaction.date),
        description: transaction.description,
        category_id: transaction.category_id,
        party: transaction.party_id,
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
