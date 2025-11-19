import { NavLink } from 'react-router-dom';
import { useStore } from '../../lib/store';
import {
    LayoutDashboard,
    Receipt,
    Settings,
    Book,
    ChevronLeft,
    PlusCircle,
    BarChart3
} from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';
import { CreateBookModal } from '../Books/CreateBookModal';

export function Sidebar() {
    const { sidebarOpen, toggleSidebar, books, activeBookId, setActiveBook } = useStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const activeBook = books.find(b => b.id === activeBookId);

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/transactions', icon: Receipt, label: 'Transactions' },
        { to: '/reports', icon: BarChart3, label: 'Reports' },
    ];

    return (
        <aside
            className={clsx(
                "fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col",
                sidebarOpen ? "w-64" : "w-20"
            )}
        >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
                <div
                    className={clsx("flex items-center gap-2 overflow-hidden cursor-pointer", !sidebarOpen && "justify-center w-full")}
                    onClick={() => !sidebarOpen && toggleSidebar()}
                >
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
                        L
                    </div>
                    {sidebarOpen && <span className="font-bold text-xl text-gray-800 truncate">Lekha</span>}
                </div>
                {sidebarOpen && (
                    <button onClick={toggleSidebar} className="p-1 hover:bg-gray-100 rounded-md text-gray-500">
                        <ChevronLeft size={20} />
                    </button>
                )}
            </div>

            {/* Book Switcher */}
            <div className="p-4 border-b border-gray-100">
                {sidebarOpen ? (
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase">Current Book</label>
                        <select
                            value={activeBookId || ''}
                            onChange={(e) => setActiveBook(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
                        >
                            {books.map(book => (
                                <option key={book.id} value={book.id}>{book.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="mt-2 w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
                        >
                            <PlusCircle size={16} />
                            <span>New Book</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex justify-center" title={activeBook?.name}>
                            <Book size={24} className="text-primary-600" />
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="p-1.5 text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
                            title="Create New Book"
                        >
                            <PlusCircle size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => clsx(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                            isActive
                                ? "bg-primary-50 text-primary-700"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                            !sidebarOpen && "justify-center px-2"
                        )}
                    >
                        <item.icon size={20} className="shrink-0" />
                        {sidebarOpen && <span className="font-medium">{item.label}</span>}
                    </NavLink>
                ))}

                <div className="pt-4 mt-4 border-t border-gray-100">
                    <NavLink
                        to={`/books/${activeBookId}/settings`}
                        className={({ isActive }) => clsx(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                            isActive
                                ? "bg-primary-50 text-primary-700"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                            !sidebarOpen && "justify-center px-2"
                        )}
                    >
                        <Settings size={20} className="shrink-0" />
                        {sidebarOpen && <span className="font-medium">Book Settings</span>}
                    </NavLink>

                    <NavLink
                        to="/settings"
                        className={({ isActive }) => clsx(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                            isActive
                                ? "bg-primary-50 text-primary-700"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                            !sidebarOpen && "justify-center px-2"
                        )}
                    >
                        <Settings size={20} className="shrink-0 text-gray-400" />
                        {sidebarOpen && <span className="font-medium">Global Settings</span>}
                    </NavLink>
                </div>
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-gray-100">
                <div className={clsx("flex items-center gap-3", !sidebarOpen && "justify-center")}>
                    <img
                        src="https://ui-avatars.com/api/?name=Demo+User&background=0ea5e9&color=fff"
                        alt="User"
                        className="w-9 h-9 rounded-full bg-gray-200"
                    />
                    {sidebarOpen && (
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-gray-700 truncate">Demo User</p>
                            <p className="text-xs text-gray-500 truncate">demo@example.com</p>
                        </div>
                    )}
                </div>
            </div>

            <CreateBookModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </aside>
    );
}
