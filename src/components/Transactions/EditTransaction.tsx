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

    const handleSubmit = async (data: any) => {
        if (!currentUser) return;

        console.log('Form data received:', data); // Debug log
        console.log('Amount in form data:', data.amount, 'Type:', typeof data.amount); // Debug amount specifically

        // Handle Date & Time
        // data.date from datetime-local is "YYYY-MM-DDTHH:mm"
        const dateObj = new Date(data.date);
        const createdAtStr = dateObj.toISOString();

        const updatedTransaction: Transaction = {
            ...transaction,
            type: data.type,
            amount: Number(data.amount), // Ensure number
            date: data.date, // Keep full datetime string
            description: data.description,
            category_id: data.category_id || 'uncategorized',
            party_id: data.party,
            custom_data: { ...transaction.custom_data },
            created_at: createdAtStr // Update timestamp
        };

        // Update custom fields - exclude all core fields from custom_data
        const coreFields = ['type', 'amount', 'date', 'description', 'category_id', 'party'];
        Object.keys(data).forEach(key => {
            if (!coreFields.includes(key)) {
                if (updatedTransaction.custom_data) {
                    updatedTransaction.custom_data[key] = data[key];
                }
            }
        });

        console.log('Updated transaction:', updatedTransaction); // Debug log
        console.log('Updated transaction amount:', updatedTransaction.amount, 'Type:', typeof updatedTransaction.amount); // Debug amount field specifically

        const result = await db.updateTransaction(updatedTransaction);
        console.log('DB Update result:', result); // Debug DB update result
        navigate('/transactions');
    };

    // Prepare default values from transaction object
    console.log('EditTransaction - transaction.date:', transaction.date);
    console.log('EditTransaction - converted date:', toDatetimeLocalFormat(transaction.date));

    const defaultValues = {
        ...transaction.custom_data, // Spread custom_data FIRST
        // Then override with core fields to prevent custom_data from overwriting them
        type: transaction.type,
        amount: transaction.amount,
        date: toDatetimeLocalFormat(transaction.date), // Convert to datetime-local format
        description: transaction.description,
        category_id: transaction.category_id,
        party: transaction.party_id,
    };

    console.log('EditTransaction - defaultValues:', defaultValues);

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
