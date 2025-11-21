import { X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    type = 'danger'
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const typeStyles = {
        danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
        info: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                    {/* Close button */}
                    <button
                        onClick={onCancel}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>

                    {/* Content */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {title}
                        </h3>
                        <p className="text-gray-600">
                            {message}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${typeStyles[type]}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
