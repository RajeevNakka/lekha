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
        if (!currentUser || !transaction) return;

        const amount = Number(data.amount);
        const typeInput = data.type as string | undefined;

        // Normalize type to lowercase for database storage
        const type = typeInput?.toLowerCase() as 'income' | 'expense' | 'transfer' | undefined;

        // Infer type from amount if not provided
        const finalType: 'income' | 'expense' | 'transfer' = type || (amount >= 0 ? 'income' : 'expense');

        const dateObj = new Date(String(data.date));
        const createdAtStr = dateObj.toISOString();

        const descField = getDescriptionField(fields);
        const descValue = descField ? data[descField.key] : '';

        const updatedTransaction: Transaction = {
            ...transaction,
            type: finalType,
            amount: Math.abs(amount),
            date: String(data.date),
            description: descValue ? String(descValue) : '',
            category_id: String(data.category_id || 'uncategorized'),
            party_id: data.party as string | undefined,
            custom_data: { ...transaction.custom_data },
            created_at: createdAtStr
        };

        // Update custom fields
        const coreFields = ['type', 'amount', 'date', 'category_id', 'party', descField?.key];
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

    const descField = getDescriptionField(fields);

    const defaultValues = {
        ...transaction.custom_data,
        type: transaction.type,
        amount: transaction.amount,
        date: toDatetimeLocalFormat(transaction.date),
        [descField?.key || 'description']: transaction.description,
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
