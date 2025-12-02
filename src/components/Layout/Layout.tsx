import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useStore } from '../../lib/store';
import { clsx } from 'clsx';

import { useEffect } from 'react';

import { BottomNav } from './BottomNav';
import { MobileHeader } from './MobileHeader';

export function Layout() {
    const { sidebarOpen, fetchBooks } = useStore();

    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            <Sidebar />

            <div className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out md:ml-64">
                <MobileHeader />

                <main className={clsx(
                    "flex-1 pb-16 md:pb-0",
                    !sidebarOpen && "md:ml-[-11rem]" // Adjust margin when sidebar is closed (desktop)
                )}>
                    <div className="flex-1 p-3 md:p-8 overflow-auto">
                        <div className="max-w-7xl mx-auto">
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>

            <BottomNav />
        </div>
    );
}
