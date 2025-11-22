import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Transaction, Book, AuditLog, FieldTemplate } from '../types';
import { generateId } from './utils';

interface ProjectBooksDB extends DBSchema {
    transactions: {
        key: string;
        value: Transaction;
        indexes: { 'by-book': string; 'by-date': string };
    };
    books: {
        key: string;
        value: Book;
    };
    audit_logs: {
        key: string;
        value: AuditLog;
        indexes: { 'by-book': string; 'by-transaction': string };
    };
    templates: {
        key: string;
        value: FieldTemplate;
    };
}

const DB_NAME = 'project-books-db';
const DB_VERSION = 4;

let dbPromise: Promise<IDBPDatabase<ProjectBooksDB>>;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<ProjectBooksDB>(DB_NAME, DB_VERSION, {
            upgrade(database, oldVersion, _newVersion, _transaction) {
                if (oldVersion < 1) {
                    const txStore = database.createObjectStore('transactions', { keyPath: 'id' });
                    txStore.createIndex('by-book', 'book_id');
                    txStore.createIndex('by-date', 'date');
                    database.createObjectStore('books', { keyPath: 'id' });
                }
                if (oldVersion < 2) {
                    const auditStore = database.createObjectStore('audit_logs', { keyPath: 'id' });
                    auditStore.createIndex('by-book', 'book_id');
                    auditStore.createIndex('by-transaction', 'transaction_id');
                }

                // Ensure templates store exists (Version 3 or 4 fix)
                if (oldVersion < 4) {
                    if (!database.objectStoreNames.contains('templates')) {
                        const templateStore = database.createObjectStore('templates', { keyPath: 'id' });

                        // Seed default templates
                        const defaultTemplates: FieldTemplate[] = [
                            {
                                id: 'tpl_personal',
                                name: 'Personal Finance',
                                description: 'Standard setup for personal income and expenses.',
                                is_default: true,
                                created_at: new Date().toISOString(),
                                field_config: [
                                    { key: 'amount', label: 'Amount', type: 'number', required: true, visible: true, order: 1 },
                                    { key: 'date', label: 'Date', type: 'date', required: true, visible: true, order: 2 },
                                    { key: 'description', label: 'Description', type: 'text', required: true, visible: true, order: 3 },
                                    { key: 'category_id', label: 'Category', type: 'dropdown', required: true, visible: true, order: 4, options: ['Food', 'Transport', 'Utilities', 'Salary', 'Entertainment', 'Health', 'Shopping'] },
                                    { key: 'type', label: 'Type', type: 'dropdown', required: true, visible: true, order: 5, options: ['income', 'expense', 'transfer'] },
                                    { key: 'payment_mode', label: 'Payment Mode', type: 'dropdown', required: false, visible: true, order: 6, options: ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Bank Transfer'] }
                                ],
                                preferences: {
                                    defaultType: 'expense',
                                    decimalPlaces: 2
                                }
                            },
                            {
                                id: 'tpl_business',
                                name: 'Small Business',
                                description: 'Track invoices, expenses, and client payments.',
                                is_default: true,
                                created_at: new Date().toISOString(),
                                field_config: [
                                    { key: 'amount', label: 'Amount', type: 'number', required: true, visible: true, order: 1 },
                                    { key: 'date', label: 'Date', type: 'date', required: true, visible: true, order: 2 },
                                    { key: 'description', label: 'Description', type: 'text', required: true, visible: true, order: 3 },
                                    { key: 'client', label: 'Client / Vendor', type: 'text', required: true, visible: true, order: 4 },
                                    { key: 'invoice_no', label: 'Invoice #', type: 'text', required: false, visible: true, order: 5 },
                                    { key: 'category_id', label: 'Category', type: 'dropdown', required: true, visible: true, order: 6, options: ['Sales', 'Services', 'Office Supplies', 'Rent', 'Salaries', 'Marketing', 'Software'] },
                                    { key: 'type', label: 'Type', type: 'dropdown', required: true, visible: true, order: 7, options: ['income', 'expense'] },
                                    { key: 'tax_deductible', label: 'Tax Deductible', type: 'checkbox', required: false, visible: true, order: 8 }
                                ],
                                preferences: {
                                    defaultType: 'income',
                                    decimalPlaces: 2
                                }
                            },
                            {
                                id: 'tpl_trip',
                                name: 'Trip / Splitwise',
                                description: 'Group travel expenses with payer tracking.',
                                is_default: true,
                                created_at: new Date().toISOString(),
                                field_config: [
                                    { key: 'amount', label: 'Amount', type: 'number', required: true, visible: true, order: 1 },
                                    { key: 'date', label: 'Date', type: 'date', required: true, visible: true, order: 2 },
                                    { key: 'description', label: 'Description', type: 'text', required: true, visible: true, order: 3 },
                                    { key: 'paid_by', label: 'Paid By', type: 'dropdown', required: true, visible: true, order: 4, options: ['Me', 'Partner', 'Friend A', 'Friend B'] },
                                    { key: 'split_with', label: 'Split With', type: 'text', required: false, visible: true, order: 5 },
                                    { key: 'category_id', label: 'Category', type: 'dropdown', required: true, visible: true, order: 6, options: ['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping'] }
                                ],
                                preferences: {
                                    defaultType: 'expense',
                                    decimalPlaces: 0
                                }
                            }
                        ];

                        // Add them to the store
                        for (const tpl of defaultTemplates) {
                            templateStore.add(tpl);
                        }
                    }
                }
            },
            blocked(currentVersion, blockedVersion, _event) {
                console.error(`DB Open Blocked: Current version ${currentVersion} is blocking version ${blockedVersion}`);
                alert('Database update blocked. Please close other tabs of this application and reload.');
            },
            blocking(currentVersion, blockedVersion, _event) {
                console.warn(`DB Open Blocking: This connection (v${currentVersion}) is blocking a new version (v${blockedVersion})`);
                // Close this connection to allow the upgrade
                if (dbPromise) {
                    dbPromise.then(db => db.close());
                    // @ts-ignore
                    dbPromise = undefined;
                }
            },
            terminated() {
                console.error('DB Connection Terminated');
                // @ts-ignore
                dbPromise = undefined;
            }
        });
    }
    return dbPromise;
};

// Helper to create log entry
const createLog = (
    action: AuditLog['action'],
    tx: Transaction,
    changes: AuditLog['changes'] = []
): AuditLog => ({
    id: generateId(),
    book_id: tx.book_id,
    transaction_id: tx.id,
    action,
    changes,
    performed_by: tx.created_by || 'system',
    timestamp: new Date().toISOString()
});

export const db = {
    async getTransactions(bookId: string) {
        const db = await initDB();
        return db.getAllFromIndex('transactions', 'by-book', bookId);
    },

    async getTransaction(id: string) {
        const db = await initDB();
        return db.get('transactions', id);
    },

    async addTransaction(transaction: Transaction) {
        const db = await initDB();
        const log = createLog('create', transaction);

        const tx = db.transaction(['transactions', 'audit_logs'], 'readwrite');
        await Promise.all([
            tx.objectStore('transactions').add(transaction),
            tx.objectStore('audit_logs').add(log)
        ]);
        return tx.done;
    },

    async updateTransaction(transaction: Transaction) {
        const db = await initDB();
        const oldTx = await db.get('transactions', transaction.id);

        const changes: AuditLog['changes'] = [];
        if (oldTx) {
            // Compare fields to find changes
            (Object.keys(transaction) as (keyof Transaction)[]).forEach(key => {
                if (JSON.stringify(transaction[key]) !== JSON.stringify(oldTx[key])) {
                    changes.push({
                        field: key,
                        old_value: oldTx[key],
                        new_value: transaction[key]
                    });
                }
            });
        }

        const log = createLog('update', transaction, changes);

        const tx = db.transaction(['transactions', 'audit_logs'], 'readwrite');
        await Promise.all([
            tx.objectStore('transactions').put(transaction),
            tx.objectStore('audit_logs').add(log)
        ]);
        return tx.done;
    },

    async deleteTransaction(id: string) {
        const db = await initDB();
        const oldTx = await db.get('transactions', id);
        if (!oldTx) return;

        const log = createLog('delete', oldTx);

        const tx = db.transaction(['transactions', 'audit_logs'], 'readwrite');
        await Promise.all([
            tx.objectStore('transactions').delete(id),
            tx.objectStore('audit_logs').add(log)
        ]);
        return tx.done;
    },

    async addBook(book: Book) {
        const db = await initDB();
        return db.add('books', book);
    },

    async updateBook(book: Book) {
        const db = await initDB();
        return db.put('books', book);
    },

    async deleteBook(id: string) {
        const db = await initDB();

        const tx = db.transaction(['books', 'transactions', 'audit_logs'], 'readwrite');

        // Delete the book
        await tx.objectStore('books').delete(id);

    },

    async getBooks() {
        const db = await initDB();
        return db.getAll('books');
    },

    async getAuditLogs(bookId: string) {
        const db = await initDB();
        return db.getAllFromIndex('audit_logs', 'by-book', bookId);
    },

    // Template Methods
    async getTemplates() {
        const db = await initDB();
        return db.getAll('templates');
    },

    async addTemplate(template: FieldTemplate) {
        const db = await initDB();
        return db.add('templates', template);
    },

    async updateTemplate(template: FieldTemplate) {
        const db = await initDB();
        return db.put('templates', template);
    },

    async deleteTemplate(id: string) {
        const db = await initDB();
        return db.delete('templates', id);
    }
};
