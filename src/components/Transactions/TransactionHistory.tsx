import { useEffect, useState } from 'react';
import { useStore } from '../../lib/store';
import { db } from '../../lib/db';
import type { AuditLog } from '../../types';
import { History, ArrowRight } from 'lucide-react';

export function TransactionHistory() {
    const { activeBookId } = useStore();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLogs = async () => {
            if (!activeBookId) return;
            const fetchedLogs = await db.getAuditLogs(activeBookId);
            fetchedLogs.sort((a: AuditLog, b: AuditLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setLogs(fetchedLogs);
            setLoading(false);
        };

        if (activeBookId) {
            loadLogs();
        }
    }, [activeBookId]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading history...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-center gap-3">
                <History className="text-primary-600" size={24} />
                <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {logs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No history found for this book.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {logs.map((log) => (
                            <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${log.action === 'create' ? 'bg-green-100 text-green-700' :
                                            log.action === 'update' ? 'bg-blue-100 text-blue-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {log.action}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            Transaction ID: <span className="font-mono text-xs">{log.transaction_id.slice(0, 8)}...</span>
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </span>
                                </div>

                                {log.changes.length > 0 && (
                                    <div className="mt-2 bg-gray-50 rounded-lg p-3 text-sm">
                                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Changes</p>
                                        <div className="space-y-1">
                                            {log.changes.map((change, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-gray-700">
                                                    <span className="font-medium min-w-[100px]">{change.field}:</span>
                                                    <span className="text-red-600 line-through opacity-75">
                                                        {typeof change.old_value === 'object' ? JSON.stringify(change.old_value) : String(change.old_value)}
                                                    </span>
                                                    <ArrowRight size={14} className="text-gray-400" />
                                                    <span className="text-green-600 font-medium">
                                                        {typeof change.new_value === 'object' ? JSON.stringify(change.new_value) : String(change.new_value)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {log.action === 'create' && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        Created new transaction.
                                    </p>
                                )}
                                {log.action === 'delete' && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        Deleted transaction.
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
