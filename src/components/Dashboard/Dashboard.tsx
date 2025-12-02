import { useStore } from '../../lib/store';
import { Link } from 'react-router-dom';
import { Plus, ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp, Settings } from 'lucide-react';
import { formatCurrency, formatDate, inferTransactionType } from '../../lib/utils';
import { useEffect, useState } from 'react';
import { db } from '../../lib/db';
import type { Transaction } from '../../types';

export function Dashboard() {
    const { activeBookId, books } = useStore();
    const activeBook = books.find(b => b.id === activeBookId);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState({ balance: 0, income: 0, expense: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeBookId) {
            loadData();
        }
    }, [activeBookId]);

    // Helper to get the effective amount for a transaction
    const getDisplayAmount = (tx: Transaction) => {
        if (activeBook?.primary_amount_field && tx.custom_data && tx.custom_data[activeBook.primary_amount_field] !== undefined) {
            const val = Number(tx.custom_data[activeBook.primary_amount_field]);
            return isNaN(val) ? tx.amount : val;
        }
        return tx.amount;
    };

    const loadData = async () => {
        setLoading(true);
        if (activeBookId) {
            const txs = await db.getTransactions(activeBookId);

            // Calculate stats
            const newStats = txs.reduce((acc, tx) => {
                const amount = getDisplayAmount(tx);
                const type = inferTransactionType(amount, tx.type);

                if (type === 'income') {
                    acc.income += Math.abs(amount);
                    acc.balance += Math.abs(amount);
                } else if (type === 'expense') {
                    acc.expense += Math.abs(amount);
                    acc.balance -= Math.abs(amount);
                }
                return acc;
            }, { balance: 0, income: 0, expense: 0 });

            setStats(newStats);

            // Sort by date desc and take top 5
            txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setRecentTransactions(txs.slice(0, 5));
        }
        setLoading(false);
    };

    // Helper to find a relevant tag to display (e.g., Category, Project, or first dropdown)
    const getDisplayTag = (tx: Transaction) => {
        if (!activeBook) return null;

        // Priority 1: Category (if not uncategorized)
        if (tx.category_id && tx.category_id !== 'uncategorized') {
            return tx.category_id;
        }

        // Priority 2: First visible dropdown field
        const firstDropdown = (activeBook.field_config || []).find(f => f.type === 'dropdown' && f.visible);
        if (firstDropdown) {
            const val = tx.custom_data?.[firstDropdown.key];
            if (val) return val;
        }

        // Priority 3: First visible text field (that isn't description)
        const firstText = (activeBook.field_config || []).find(f => f.type === 'text' && f.visible);
        if (firstText) {
            const val = tx.custom_data?.[firstText.key];
            if (val) return val;
        }

        return null;
    };

    if (!activeBook) return <div>Select a book</div>;

    return (
        <div className="space-y-4 md:space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500">Overview of {activeBook.name}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to={`/books/${activeBookId}/settings`}
                        className="group relative p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Book Settings"
                    >
                        <Settings size={20} />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Book Settings
                        </span>
                    </Link>
                    <Link
                        to="/transactions/new"
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md"
                        title="New Transaction"
                    >
                        <Plus size={20} />
                        <span className="hidden md:inline">New Transaction</span>
                    </Link>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-3 md:p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="p-1.5 md:p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Wallet size={24} />
                        </div>
                        <span className="text-xs font-medium text-gray-400 uppercase">Total Balance</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-gray-900">{formatCurrency(stats.balance, activeBook.currency)}</p>
                    <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                        <TrendingUp size={16} />
                        <span>Updated just now</span>
                    </p>
                </div>

                <div className="bg-white p-3 md:p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="p-1.5 md:p-2 bg-green-50 text-green-600 rounded-lg">
                            <ArrowDownLeft size={24} />
                        </div>
                        <span className="text-xs font-medium text-gray-400 uppercase">Income</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-gray-900">{formatCurrency(stats.income, activeBook.currency)}</p>
                    <p className="text-sm text-gray-500 mt-1">Total Income</p>
                </div>

                <div className="bg-white p-3 md:p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="p-1.5 md:p-2 bg-red-50 text-red-600 rounded-lg">
                            <ArrowUpRight size={24} />
                        </div>
                        <span className="text-xs font-medium text-gray-400 uppercase">Expenses</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-gray-900">{formatCurrency(stats.expense, activeBook.currency)}</p>
                    <p className="text-sm text-gray-500 mt-1">Total Expenses</p>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                    <Link to="/transactions" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                        View All
                    </Link>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : recentTransactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No recent transactions.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {recentTransactions.map((tx) => {
                            const tag = getDisplayTag(tx);
                            const amount = getDisplayAmount(tx);
                            const type = inferTransactionType(amount, tx.type);
                            return (
                                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${type === 'income' ? 'bg-green-100 text-green-600' :
                                            type === 'expense' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {type === 'income' ? <ArrowDownLeft size={20} /> :
                                                type === 'expense' ? <ArrowUpRight size={20} /> : <ArrowUpRight size={20} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-gray-900 truncate">
                                                {tx.description || <span className="text-gray-400 italic font-normal">No description</span>}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-gray-500 whitespace-nowrap">{formatDate(tx.date)}</p>
                                                {tag && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 truncate max-w-[100px]">
                                                        {tag}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`font-medium whitespace-nowrap ${type === 'income' ? 'text-green-600' :
                                        type === 'expense' ? 'text-red-600' : 'text-gray-900'
                                        }`}>
                                        {type === 'income' ? '+' : type === 'expense' ? '-' : ''}
                                        {formatCurrency(Math.abs(amount), activeBook.currency)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
