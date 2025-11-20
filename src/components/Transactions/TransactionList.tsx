import { useStore } from '../../lib/store';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { ArrowUpRight, Search, Filter, Edit2, Trash2, History, Eye, Settings, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/db';
import type { Transaction, FieldConfig } from '../../types';
import { Link } from 'react-router-dom';
import { TransactionDetailsModal } from './TransactionDetailsModal';

export function TransactionList() {
    const { activeBookId, books } = useStore();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);

    // Column Management State
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
    const [columnOrder, setColumnOrder] = useState<string[]>([]); // New state for order
    const columnSelectorRef = useRef<HTMLDivElement>(null);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        type: 'all',
        sortBy: 'date-desc',
        dynamic: {} as Record<string, string> // Store dynamic filters here
    });

    const activeBook = books.find(b => b.id === activeBookId);

    // Load transactions and column preferences
    useEffect(() => {
        if (activeBookId && activeBook) {
            loadTransactions();
            loadColumnPreferences();
        }
    }, [activeBookId, activeBook]);

    // Close column selector when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
                setShowColumnSelector(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const loadColumnPreferences = () => {
        if (!activeBook) return;

        const savedColumns = localStorage.getItem(`grid_columns_${activeBook.id}`);
        const savedOrder = localStorage.getItem(`grid_column_order_${activeBook.id}`);

        if (savedColumns) {
            try {
                setVisibleColumns(JSON.parse(savedColumns));
            } catch (e) {
                console.error("Failed to parse saved columns", e);
                setDefaultColumns();
            }
        } else {
            setDefaultColumns();
        }

        if (savedOrder) {
            try {
                setColumnOrder(JSON.parse(savedOrder));
            } catch (e) {
                console.error("Failed to parse saved order", e);
                setColumnOrder([]);
            }
        }
    };

    const setDefaultColumns = () => {
        if (!activeBook) return;
        // Default: Show all visible fields from config
        const defaultCols = (activeBook.field_config || [])
            .filter(f => f.visible)
            .map(f => f.key);
        setVisibleColumns(defaultCols);
    };

    const toggleColumn = (key: string) => {
        let newColumns;
        if (visibleColumns.includes(key)) {
            newColumns = visibleColumns.filter(c => c !== key);
        } else {
            newColumns = [...visibleColumns, key];
        }
        setVisibleColumns(newColumns);
        if (activeBook) {
            localStorage.setItem(`grid_columns_${activeBook.id}`, JSON.stringify(newColumns));
        }
    };

    const moveColumn = (key: string, direction: 'up' | 'down') => {
        if (!activeBook) return;

        // Get current effective order
        const currentOrder = columnOrder.length > 0
            ? columnOrder
            : (activeBook.field_config || []).map(f => f.key);

        const currentIndex = currentOrder.indexOf(key);
        if (currentIndex === -1) return;

        const newOrder = [...currentOrder];
        if (direction === 'up' && currentIndex > 0) {
            [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
        } else if (direction === 'down' && currentIndex < newOrder.length - 1) {
            [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
        }

        setColumnOrder(newOrder);
        localStorage.setItem(`grid_column_order_${activeBook.id}`, JSON.stringify(newOrder));
    };

    const loadTransactions = async () => {
        if (!activeBookId) return;
        setLoading(true);
        const txs = await db.getTransactions(activeBookId);
        setTransactions(txs);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this transaction?')) {
            await db.deleteTransaction(id);
            loadTransactions();
        }
    };

    // Helper to get field value (handles custom_data and core fields)
    const getFieldValue = (tx: Transaction, key: string) => {
        if (tx.custom_data && tx.custom_data[key] !== undefined) {
            return tx.custom_data[key];
        }
        return (tx as any)[key];
    };

    // Get unique values for dynamic dropdown filters
    const getFilterOptions = (fieldKey: string) => {
        const values = new Set<string>();
        transactions.forEach(tx => {
            const val = getFieldValue(tx, fieldKey);
            if (val) values.add(String(val));
        });
        return Array.from(values).sort();
    };

    const filteredTransactions = transactions
        .filter(t => {
            // Text Search
            const matchesSearch =
                t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.amount.toString().includes(searchQuery);

            // Date Range
            const matchesStartDate = !filters.startDate || new Date(t.date) >= new Date(filters.startDate);
            const matchesEndDate = !filters.endDate || new Date(t.date) <= new Date(filters.endDate + 'T23:59:59');

            // Type
            const matchesType = filters.type === 'all' || t.type === filters.type;

            // Dynamic Filters
            const matchesDynamic = Object.entries(filters.dynamic).every(([key, value]) => {
                if (value === 'all') return true;
                const txValue = getFieldValue(t, key);
                return String(txValue) === value;
            });

            return matchesSearch && matchesStartDate && matchesEndDate && matchesType && matchesDynamic;
        })
        .sort((a, b) => {
            switch (filters.sortBy) {
                case 'date-asc':
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                case 'amount-desc':
                    return b.amount - a.amount;
                case 'amount-asc':
                    return a.amount - b.amount;
                default: // date-desc
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
            }
        });

    if (!activeBook) return <div className="p-8 text-center text-gray-500">Select a book to view transactions</div>;

    const DEFAULT_FIELD_CONFIG: FieldConfig[] = [
        { key: 'date', label: 'Date', type: 'date', visible: true, order: 1 },
        { key: 'description', label: 'Description', type: 'text', visible: true, order: 2 },
        { key: 'type', label: 'Type', type: 'dropdown', visible: true, order: 3, options: ['income', 'expense', 'transfer'] },
        { key: 'amount', label: 'Amount', type: 'number', visible: true, order: 4 }
    ];

    // Get fields to display in grid (sorted by order)
    // Use activeBook.field_config if available, otherwise fallback to default
    const effectiveFieldConfig = (activeBook.field_config && activeBook.field_config.length > 0)
        ? activeBook.field_config
        : DEFAULT_FIELD_CONFIG;

    const displayFields = effectiveFieldConfig
        .filter(f => visibleColumns.includes(f.key))
        .sort((a, b) => {
            // Use persisted order if available, otherwise default order
            if (columnOrder.length > 0) {
                const indexA = columnOrder.indexOf(a.key);
                const indexB = columnOrder.indexOf(b.key);
                // If both keys are in the order array, sort by index
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                // If only one is in, prioritize it? Or put it at the end?
                // Let's put un-ordered items at the end, sorted by their default order
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
            }
            return a.order - b.order;
        });

    // Get dropdown fields for filters
    const filterableFields = effectiveFieldConfig.filter(f => f.type === 'dropdown');

    // Initialize visible columns if empty
    useEffect(() => {
        if (activeBook && visibleColumns.length === 0) {
            const defaultCols = effectiveFieldConfig
                .filter(f => f.visible)
                .map(f => f.key);
            setVisibleColumns(defaultCols);
        }
    }, [activeBook, effectiveFieldConfig]);


    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
                    <p className="text-gray-500">{activeBook.name}</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/history"
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <History size={18} />
                        Audit Log
                    </Link>
                    <Link
                        to="/transactions/new"
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm"
                    >
                        <ArrowUpRight size={18} />
                        Add Entry
                    </Link>
                </div>
            </div>

            <div className="mb-6 space-y-4">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                        />
                    </div>

                    {/* Column Selector */}
                    <div className="relative" ref={columnSelectorRef}>
                        <button
                            onClick={() => setShowColumnSelector(!showColumnSelector)}
                            className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${showColumnSelector ? 'bg-gray-100 border-gray-400 text-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <Settings size={18} />
                            Columns
                        </button>

                        {showColumnSelector && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 p-2 animate-in fade-in zoom-in-95 duration-100">
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 mb-1">Toggle & Reorder</div>
                                <div className="max-h-60 overflow-y-auto space-y-1">
                                    {/* Sort fields by current display order for the list */}
                                    {[...effectiveFieldConfig].sort((a, b) => {
                                        if (columnOrder.length > 0) {
                                            const indexA = columnOrder.indexOf(a.key);
                                            const indexB = columnOrder.indexOf(b.key);
                                            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                            if (indexA !== -1) return -1;
                                            if (indexB !== -1) return 1;
                                        }
                                        return a.order - b.order;
                                    }).map(field => (
                                        <div key={field.key} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 rounded group">
                                            <button
                                                onClick={() => toggleColumn(field.key)}
                                                className="flex-1 flex items-center gap-2 text-sm text-left"
                                            >
                                                <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${visibleColumns.includes(field.key) ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
                                                    {visibleColumns.includes(field.key) && <Check size={12} className="text-white" />}
                                                </div>
                                                <span className="text-gray-700 truncate">{field.label}</span>
                                            </button>

                                            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveColumn(field.key, 'up'); }}
                                                    className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                                                >
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveColumn(field.key, 'down'); }}
                                                    className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                                                >
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Filter size={18} />
                        Filters
                    </button>
                </div>

                {showFilters && (
                    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 outline-none bg-white"
                            >
                                <option value="all">All Types</option>
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                                <option value="transfer">Transfer</option>
                            </select>
                        </div>

                        {/* Dynamic Filters for Dropdown Fields */}
                        {filterableFields.map(field => (
                            <div key={field.key}>
                                <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
                                <select
                                    value={filters.dynamic[field.key] || 'all'}
                                    onChange={(e) => setFilters({
                                        ...filters,
                                        dynamic: { ...filters.dynamic, [field.key]: e.target.value }
                                    })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 outline-none bg-white"
                                >
                                    <option value="all">All {field.label}s</option>
                                    {/* Use predefined options if available, otherwise scan transactions */}
                                    {(field.options && field.options.length > 0 ? field.options : getFilterOptions(field.key)).map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        ))}

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
                            <select
                                value={filters.sortBy}
                                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 outline-none bg-white"
                            >
                                <option value="date-desc">Date (Newest)</option>
                                <option value="date-asc">Date (Oldest)</option>
                                <option value="amount-desc">Amount (High-Low)</option>
                                <option value="amount-asc">Amount (Low-High)</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading transactions...</div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="text-gray-400" size={24} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No transactions found</h3>
                            <p className="text-gray-500 mt-1">Try adjusting your filters or add a new entry.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    {displayFields.map(field => (
                                        <th key={field.key} className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${field.key === 'amount' ? 'text-right' : ''}`}>
                                            {field.label}
                                        </th>
                                    ))}
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50 group transition-colors">
                                        {displayFields.map(field => {
                                            const value = getFieldValue(tx, field.key);

                                            // Special rendering for specific fields
                                            if (field.key === 'type') {
                                                return (
                                                    <td key={field.key} className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                            ${tx.type === 'income' ? 'bg-green-100 text-green-800' :
                                                                tx.type === 'expense' ? 'bg-red-100 text-red-800' :
                                                                    'bg-blue-100 text-blue-800'}`}>
                                                            {String(value)}
                                                        </span>
                                                    </td>
                                                );
                                            }

                                            if (field.key === 'amount') {
                                                return (
                                                    <td key={field.key} className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right
                                                        ${tx.type === 'income' ? 'text-green-600' :
                                                            tx.type === 'expense' ? 'text-red-600' :
                                                                'text-blue-600'}`}>
                                                        {tx.type === 'expense' ? '-' : '+'}{formatCurrency(Number(value), activeBook.currency)}
                                                    </td>
                                                );
                                            }

                                            if (field.key === 'description') {
                                                return (
                                                    <td key={field.key} className="px-6 py-4 text-sm text-gray-900 font-medium max-w-[300px] truncate" title={String(value)}>
                                                        {String(value)}
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td key={field.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate" title={value ? String(value) : ''}>
                                                    {value ? (
                                                        field.type === 'date' ? formatDateTime(String(value)) : String(value)
                                                    ) : '-'}
                                                </td>
                                            );
                                        })}

                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setViewTransaction(tx)}
                                                    className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <Link
                                                    to={`/transactions/${tx.id}/edit`}
                                                    className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(tx.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Transaction Details Modal */}
            {viewTransaction && activeBook && (
                <TransactionDetailsModal
                    transaction={viewTransaction}
                    book={activeBook}
                    onClose={() => setViewTransaction(null)}
                />
            )}
        </div>
    );
}
