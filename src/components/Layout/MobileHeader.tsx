import { useStore } from '../../lib/store';
import { PlusCircle, Loader2, Check, CloudOff, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { CreateBookModal } from '../Books/CreateBookModal';

export function MobileHeader() {
    const { books, activeBookId, setActiveBook, currentUser, syncStatus } = useStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
        <>
            <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
                        L
                    </div>
                    <span className="font-bold text-lg text-gray-800">Lekha</span>
                </div>

                <div className="flex items-center gap-2">
                    {currentUser ? (
                        <div className="flex items-center gap-1 mr-1">
                            {syncStatus === 'saving' && <Loader2 size={14} className="text-blue-500 animate-spin" />}
                            {syncStatus === 'saved' && <Check size={14} className="text-green-500" />}
                            {syncStatus === 'error' && <CloudOff size={14} className="text-red-500" />}

                            {currentUser.avatar_url ? (
                                <img src={currentUser.avatar_url} alt={currentUser.name} className="w-7 h-7 rounded-full bg-gray-200" />
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs">
                                    {currentUser.name.charAt(0)}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mr-1">
                            <UserIcon size={20} className="text-gray-400" />
                        </div>
                    )}

                    <select
                        value={activeBookId || ''}
                        onChange={(e) => setActiveBook(e.target.value)}
                        className="max-w-[120px] p-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 truncate"
                    >
                        {books.map(book => (
                            <option key={book.id} value={book.id}>{book.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="p-1.5 text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
                        title="Create New Book"
                    >
                        <PlusCircle size={20} />
                    </button>
                </div>
            </header>

            <CreateBookModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </>
    );
}
