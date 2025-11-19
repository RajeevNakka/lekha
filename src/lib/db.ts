import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Transaction, Book, AuditLog } from '../types';
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
}

const DB_NAME = 'project-books-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<ProjectBooksDB>>;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<ProjectBooksDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, _newVersion, _transaction) {
                if (oldVersion < 1) {
                    const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
                    txStore.createIndex('by-book', 'book_id');
                    txStore.createIndex('by-date', 'date');
                    db.createObjectStore('books', { keyPath: 'id' });
                }
                if (oldVersion < 2) {
                    const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
                    auditStore.createIndex('by-book', 'book_id');
                    auditStore.createIndex('by-transaction', 'transaction_id');
                }
            },
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
    }
};
