import { create } from 'zustand';
import type { Book, User } from '../types';

interface AppState {
    currentUser: User | null;
    activeBookId: string | null;
    books: Book[];
    sidebarOpen: boolean;

    // Actions
    setCurrentUser: (user: User) => void;
    setActiveBook: (bookId: string) => void;
    addBook: (book: Book) => void;
    updateBook: (book: Book) => void;
    deleteBook: (bookId: string) => void;
    toggleSidebar: () => void;

    // Async Actions
    fetchBooks: () => Promise<void>;
}

// Mock Data
const MOCK_USER: User = {
    id: 'u1',
    name: 'Demo User',
    email: 'demo@example.com',
    avatar_url: 'https://ui-avatars.com/api/?name=Demo+User'
};

const DEFAULT_BOOK: Book = {
    id: 'b1',
    name: 'Personal Finances',
    currency: 'USD',
    role: 'owner',
    created_at: new Date().toISOString(),
    members: [{ user_id: 'u1', role: 'owner' }],
    field_config: [
        { key: 'amount', label: 'Amount', type: 'number', required: true, visible: true, order: 1 },
        { key: 'date', label: 'Date', type: 'date', required: true, visible: true, order: 2 },
        { key: 'description', label: 'Description', type: 'text', required: true, visible: true, order: 3 },
        { key: 'category_id', label: 'Category', type: 'dropdown', required: true, visible: true, order: 4, options: ['Food', 'Transport', 'Salary', 'Utilities'] },
        { key: 'type', label: 'Type', type: 'dropdown', required: true, visible: true, order: 5, options: ['income', 'expense', 'transfer'] },
        { key: 'party', label: 'Party', type: 'text', visible: true, required: false, order: 6 }
    ]
};

export const useStore = create<AppState>((set) => ({
    currentUser: MOCK_USER,
    activeBookId: 'b1',
    books: [DEFAULT_BOOK],
    sidebarOpen: true,

    setCurrentUser: (user) => set({ currentUser: user }),
    setActiveBook: (bookId) => set({ activeBookId: bookId }),

    addBook: (book) => set((state) => ({ books: [...state.books, book] })),

    updateBook: (updatedBook) => set((state) => ({
        books: state.books.map((b) => b.id === updatedBook.id ? updatedBook : b)
    })),

    deleteBook: (bookId) => set((state) => ({
        books: state.books.filter((b) => b.id !== bookId)
    })),

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    fetchBooks: async () => {
        try {
            const { db } = await import('./db');
            const books = await db.getBooks();

            // Ensure default book always exists
            const defaultBookExists = books.some(b => b.id === DEFAULT_BOOK.id);
            let allBooks = books;

            if (!defaultBookExists) {
                // Use put to upsert
                await db.addBook(DEFAULT_BOOK).catch(console.error);
                allBooks = [...books, DEFAULT_BOOK];
            } else {
                // Force update default book config to ensure no duplicates/outdated fields
                const existingDefault = books.find(b => b.id === DEFAULT_BOOK.id);
                if (existingDefault) {
                    const updatedDefault = { ...existingDefault, field_config: DEFAULT_BOOK.field_config };
                    await db.updateBook(updatedDefault).catch(console.error);

                    // Update the book in the local list as well
                    allBooks = allBooks.map(b => b.id === DEFAULT_BOOK.id ? updatedDefault : b);
                }
            }

            set({ books: allBooks });
        } catch (error) {
            console.error('Failed to fetch books:', error);
        }
    }
}));
