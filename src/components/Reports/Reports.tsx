import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../lib/store';
import { db } from '../../lib/db';
import type { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { BarChart3, PieChart, TrendingUp, Users, FileText, Calendar } from 'lucide-react';
import { clsx } from 'clsx';

type ReportType = 'cash-flow' | 'category' | 'trends' | 'party' | 'custom';
type DateRange = 'this-month' | 'last-month' | 'this-year' | 'all';

export function Reports() {
    const { activeBookId, books } = useStore();
    const activeBook = books.find(b => b.id === activeBookId);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const [reportType, setReportType] = useState<ReportType>('cash-flow');
    const [dateRange, setDateRange] = useState<DateRange>('this-month');
    const [customGroupBy, setCustomGroupBy] = useState<string>('');

    useEffect(() => {
        if (activeBookId) {
            loadTransactions();
        }
    }, [activeBookId]);

    const loadTransactions = async () => {
        if (!activeBookId) return;
        setLoading(true);
        const txs = await db.getTransactions(activeBookId);
        setTransactions(txs);
        setLoading(false);
    };

    const filteredTransactions = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        return transactions.filter(tx => {
            const txDate = new Date(tx.date);
            switch (dateRange) {
                case 'this-month':
                    return txDate >= startOfMonth;
                case 'last-month':
                    return txDate >= startOfLastMonth && txDate <= endOfLastMonth;
                case 'this-year':
                    return txDate >= startOfYear;
                case 'all':
                default:
                    return true;
            }
        });
    }, [transactions, dateRange]);

    const renderReportContent = () => {
        if (loading) return <div className="p-8 text-center text-gray-500">Loading data...</div>;
        if (filteredTransactions.length === 0) return <div className="p-8 text-center text-gray-500">No transactions found for this period.</div>;

        switch (reportType) {
            case 'cash-flow':
                return <CashFlowReport transactions={filteredTransactions} currency={activeBook?.currency || 'USD'} />;
            case 'category':
                return <CategoryReport transactions={filteredTransactions} currency={activeBook?.currency || 'USD'} />;
            case 'trends':
                return <TrendsReport transactions={filteredTransactions} currency={activeBook?.currency || 'USD'} />;
            case 'party':
                return <PartyReport transactions={filteredTransactions} currency={activeBook?.currency || 'USD'} />;
            case 'custom':
                return <CustomReport transactions={filteredTransactions} currency={activeBook?.currency || 'USD'} groupBy={customGroupBy} setGroupBy={setCustomGroupBy} fields={activeBook?.field_config || []} />;
            default:
                return null;
        }
    };

    if (!activeBook) return <div>Select a book</div>;

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                    <p className="text-gray-500">Insights for {activeBook.name}</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as DateRange)}
                        className="px-3 py-1.5 text-sm bg-transparent border-none focus:ring-0 cursor-pointer font-medium text-gray-700"
                    >
                        <option value="this-month">This Month</option>
                        <option value="last-month">Last Month</option>
                        <option value="this-year">This Year</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
            </div>

            {/* Report Selector Tabs */}
            <div className="flex overflow-x-auto pb-2 gap-2 border-b border-gray-200">
                <TabButton active={reportType === 'cash-flow'} onClick={() => setReportType('cash-flow')} icon={BarChart3} label="Cash Flow" />
                <TabButton active={reportType === 'category'} onClick={() => setReportType('category')} icon={PieChart} label="Categories" />
                <TabButton active={reportType === 'trends'} onClick={() => setReportType('trends')} icon={TrendingUp} label="Trends" />
                <TabButton active={reportType === 'party'} onClick={() => setReportType('party')} icon={Users} label="Parties" />
                <TabButton active={reportType === 'custom'} onClick={() => setReportType('custom')} icon={FileText} label="Custom" />
            </div>

            <div className="flex-1 overflow-y-auto">
                {renderReportContent()}
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                active ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"
            )}
        >
            <Icon size={18} />
            {label}
        </button>
    );
}

// --- Sub-components for specific reports ---

function CashFlowReport({ transactions, currency }: { transactions: Transaction[], currency: string }) {
    const stats = transactions.reduce((acc, tx) => {
        if (tx.type === 'income') acc.income += tx.amount;
        if (tx.type === 'expense') acc.expense += tx.amount;
        return acc;
    }, { income: 0, expense: 0 });

    const net = stats.income - stats.expense;
    const maxVal = Math.max(stats.income, stats.expense);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Total Income" value={stats.income} currency={currency} color="text-green-600" bg="bg-green-50" />
                <StatCard label="Total Expense" value={stats.expense} currency={currency} color="text-red-600" bg="bg-red-50" />
                <StatCard label="Net Cash Flow" value={net} currency={currency} color={net >= 0 ? "text-blue-600" : "text-red-600"} bg={net >= 0 ? "bg-blue-50" : "bg-red-50"} />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Income vs Expense</h3>
                <div className="space-y-4">
                    <BarRow label="Income" value={stats.income} max={maxVal} color="bg-green-500" currency={currency} />
                    <BarRow label="Expense" value={stats.expense} max={maxVal} color="bg-red-500" currency={currency} />
                </div>
            </div>
        </div>
    );
}

function CategoryReport({ transactions, currency }: { transactions: Transaction[], currency: string }) {
    const expenses = transactions.filter(t => t.type === 'expense');
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

    const byCategory = expenses.reduce((acc, tx) => {
        const cat = tx.category_id || 'Uncategorized';
        acc[cat] = (acc[cat] || 0) + tx.amount;
        return acc;
    }, {} as Record<string, number>);

    const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Expense Breakdown</h3>
            <div className="space-y-6">
                {sortedCats.map(([cat, amount]) => (
                    <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{cat}</span>
                            <span className="text-gray-900 font-bold">{formatCurrency(amount, currency)} ({Math.round(amount / totalExpense * 100)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div className="bg-primary-500 h-2.5 rounded-full" style={{ width: `${(amount / totalExpense) * 100}%` }}></div>
                        </div>
                    </div>
                ))}
                {sortedCats.length === 0 && <p className="text-gray-500">No expenses recorded.</p>}
            </div>
        </div>
    );
}

function TrendsReport({ transactions, currency }: { transactions: Transaction[], currency: string }) {
    // Group by Month (YYYY-MM)
    const byMonth = transactions.reduce((acc, tx) => {
        const month = tx.date.substring(0, 7); // YYYY-MM
        if (!acc[month]) acc[month] = { income: 0, expense: 0 };
        if (tx.type === 'income') acc[month].income += tx.amount;
        if (tx.type === 'expense') acc[month].expense += tx.amount;
        return acc;
    }, {} as Record<string, { income: number, expense: number }>);

    const sortedMonths = Object.keys(byMonth).sort();
    const maxVal = Math.max(...Object.values(byMonth).flatMap(v => [v.income, v.expense]));

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Trends</h3>
            <div className="flex items-end gap-8 min-w-[600px] h-64 pb-8">
                {sortedMonths.map(month => (
                    <div key={month} className="flex-1 flex gap-2 items-end h-full group relative">
                        {/* Income Bar */}
                        <div
                            className="flex-1 bg-green-400 rounded-t-md hover:bg-green-500 transition-colors relative"
                            style={{ height: `${(byMonth[month].income / maxVal) * 100}%` }}
                            title={`Income: ${formatCurrency(byMonth[month].income, currency)}`}
                        ></div>
                        {/* Expense Bar */}
                        <div
                            className="flex-1 bg-red-400 rounded-t-md hover:bg-red-500 transition-colors relative"
                            style={{ height: `${(byMonth[month].expense / maxVal) * 100}%` }}
                            title={`Expense: ${formatCurrency(byMonth[month].expense, currency)}`}
                        ></div>

                        <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-gray-500">
                            {month}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-3 h-3 bg-green-400 rounded-sm"></div> Income
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-3 h-3 bg-red-400 rounded-sm"></div> Expense
                </div>
            </div>
        </div>
    );
}

function PartyReport({ transactions, currency }: { transactions: Transaction[], currency: string }) {
    const byParty = transactions.reduce((acc, tx) => {
        if (!tx.party_id) return acc;
        const party = tx.party_id;
        if (!acc[party]) acc[party] = { paid: 0, received: 0 };

        if (tx.type === 'expense') acc[party].paid += tx.amount;
        if (tx.type === 'income') acc[party].received += tx.amount;
        return acc;
    }, {} as Record<string, { paid: number, received: number }>);

    const sortedParties = Object.entries(byParty).sort((a, b) => (b[1].paid + b[1].received) - (a[1].paid + a[1].received));

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Party Ledger</h3>
            </div>
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Party Name</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Total Paid (Out)</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Total Received (In)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sortedParties.map(([party, stats]) => (
                        <tr key={party} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{party}</td>
                            <td className="px-6 py-4 text-sm text-red-600 font-bold text-right">{formatCurrency(stats.paid, currency)}</td>
                            <td className="px-6 py-4 text-sm text-green-600 font-bold text-right">{formatCurrency(stats.received, currency)}</td>
                        </tr>
                    ))}
                    {sortedParties.length === 0 && (
                        <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No party data found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

function CustomReport({ transactions, currency, groupBy, setGroupBy, fields }: {
    transactions: Transaction[],
    currency: string,
    groupBy: string,
    setGroupBy: (val: string) => void,
    fields: any[]
}) {
    // Filter fields that are dropdowns or text for grouping
    const groupableFields = fields.filter(f => f.type === 'dropdown' || f.type === 'text' || f.type === 'radio');

    const groupedData = useMemo(() => {
        if (!groupBy) return [];

        const groups = transactions.reduce((acc, tx) => {
            // Check custom_data first, then top-level fields
            let val = tx.custom_data?.[groupBy] || (tx as any)[groupBy] || 'Unknown';
            if (typeof val !== 'string') val = String(val);

            if (!acc[val]) acc[val] = { count: 0, amount: 0 };
            acc[val].count++;
            acc[val].amount += tx.amount; // Simple sum of amount (ignoring type for now, or could split)
            return acc;
        }, {} as Record<string, { count: number, amount: number }>);

        return Object.entries(groups).sort((a, b) => b[1].amount - a[1].amount);
    }, [transactions, groupBy]);

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Group By Field:</label>
                <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                    <option value="">Select a field...</option>
                    <option value="payment_mode">Payment Mode</option>
                    {groupableFields.map(f => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                </select>
            </div>

            {groupBy && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">{groupBy}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Count</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {groupedData.map(([key, stats]) => (
                                <tr key={key} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{key}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 text-right">{stats.count}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 font-bold text-right">{formatCurrency(stats.amount, currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, currency, color, bg }: { label: string, value: number, currency: string, color: string, bg: string }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
            <p className={clsx("text-2xl font-bold", color)}>{formatCurrency(value, currency)}</p>
        </div>
    );
}

function BarRow({ label, value, max, color, currency }: { label: string, value: number, max: number, color: string, currency: string }) {
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{label}</span>
                <span className="text-gray-900 font-bold">{formatCurrency(value, currency)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4">
                <div className={clsx("h-4 rounded-full transition-all duration-500", color)} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}></div>
            </div>
        </div>
    );
}
