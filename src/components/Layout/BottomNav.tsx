import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Receipt,
    BarChart3,
    Settings,
    PlusCircle
} from 'lucide-react';
import { clsx } from 'clsx';

export function BottomNav() {
    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Home' },
        { to: '/transactions', icon: Receipt, label: 'Txns' },
        { to: '/transactions/new', icon: PlusCircle, label: 'Add', isPrimary: true },
        { to: '/reports', icon: BarChart3, label: 'Reports' },
        { to: '/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => clsx(
                            "flex flex-col items-center justify-center w-full h-full space-y-1",
                            isActive && !item.isPrimary ? "text-primary-600" : "text-gray-500",
                            item.isPrimary && "relative -top-5"
                        )}
                    >
                        {item.isPrimary ? (
                            <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center shadow-lg text-white">
                                <item.icon size={24} />
                            </div>
                        ) : (
                            <>
                                <item.icon size={20} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
