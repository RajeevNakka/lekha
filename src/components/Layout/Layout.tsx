import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useStore } from '../../lib/store';
import { clsx } from 'clsx';

import { useEffect } from 'react';

export function Layout() {
    const { sidebarOpen, fetchBooks } = useStore();

    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar />

            <main
                className={clsx(
                    "flex-1 transition-all duration-300 ease-in-out min-h-screen flex flex-col",
                    sidebarOpen ? "ml-64" : "ml-20"
                )}
            >
                <div className="flex-1 p-8 overflow-auto">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
