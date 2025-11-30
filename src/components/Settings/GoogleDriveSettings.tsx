import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { googleDriveService } from '../../lib/google-drive';
import { Cloud, Download, Upload, LogOut, Check, AlertCircle, Loader2 } from 'lucide-react';
import { ConfirmModal } from '../Common/ConfirmModal';

export const GoogleDriveSettings: React.FC = () => {
    const { currentUser, setCurrentUser, autoSyncEnabled, setAutoSyncEnabled } = useStore();
    const [loading, setLoading] = useState(false);
    const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

    useEffect(() => {
        // If we have a user in store but no access token in service (e.g. after reload),
        // we might want to try silent sign-in or just let the user re-connect when they try to backup.
        // For now, we assume if currentUser exists, we are "connected" UI-wise.
    }, []);

    const handleSignIn = async () => {
        setLoading(true);
        try {
            await googleDriveService.signIn();
            const profile = await googleDriveService.getUserProfile();
            // Map GoogleUser to our User type
            setCurrentUser({
                id: profile.email, // Use email as ID for now
                name: profile.name,
                email: profile.email,
                avatar_url: profile.picture
            });
            setSyncStatus({ type: 'success', message: 'Connected successfully' });
        } catch (error) {
            console.error(error);
            setSyncStatus({ type: 'error', message: 'Failed to sign in' });
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = () => {
        googleDriveService.signOut();
        setCurrentUser(null);
        setSyncStatus({ type: 'idle', message: '' });
    };

    const handleBackup = async () => {
        if (!currentUser) return;
        setLoading(true);
        setSyncStatus({ type: 'idle', message: 'Backing up...' });
        try {
            await googleDriveService.uploadBackup();
            setSyncStatus({ type: 'success', message: `Backup completed at ${new Date().toLocaleTimeString()}` });
        } catch (error: any) {
            console.error(error);
            if (error.message === "Not authenticated") {
                try {
                    await googleDriveService.signIn();
                    await googleDriveService.uploadBackup();
                    setSyncStatus({ type: 'success', message: `Backup completed at ${new Date().toLocaleTimeString()}` });
                } catch (retryError) {
                    setSyncStatus({ type: 'error', message: 'Backup failed: Authentication required' });
                }
            } else {
                setSyncStatus({ type: 'error', message: 'Backup failed' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        if (!currentUser) return;
        setShowRestoreConfirm(true);
    };

    const confirmRestore = async () => {
        setShowRestoreConfirm(false);
        setLoading(true);
        setSyncStatus({ type: 'idle', message: 'Restoring...' });
        try {
            await googleDriveService.downloadBackup();
            setSyncStatus({ type: 'success', message: 'Restore completed' });
            window.location.reload();
        } catch (error: any) {
            console.error(error);
            if (error.message === "Not authenticated") {
                try {
                    await googleDriveService.signIn();
                    await googleDriveService.downloadBackup();
                    setSyncStatus({ type: 'success', message: 'Restore completed' });
                    window.location.reload();
                } catch (retryError) {
                    setSyncStatus({ type: 'error', message: 'Restore failed: Authentication required' });
                }
            } else {
                setSyncStatus({ type: 'error', message: 'Restore failed' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Cloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Google Drive Sync</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Backup and sync your data across devices</p>
                    </div>
                </div>
                {currentUser && (
                    <button
                        onClick={handleSignOut}
                        className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1"
                    >
                        <LogOut size={16} />
                        Disconnect
                    </button>
                )}
            </div>

            {!currentUser ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 text-center max-w-xs">
                        Connect your Google account to enable cloud backup and restore functionality.
                    </p>
                    <button
                        onClick={handleSignIn}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                        )}
                        <span className="text-gray-700 dark:text-gray-200 font-medium">Sign in with Google</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                        {currentUser.avatar_url ? (
                            <img src={currentUser.avatar_url} alt={currentUser.name} className="w-10 h-10 rounded-full" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                                {currentUser.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{currentUser.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.email}</p>
                        </div>
                        <div className="ml-auto">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                Connected
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handleBackup}
                            disabled={loading}
                            className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                        >
                            <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">Backup Now</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">Save local data to Drive</span>
                        </button>

                        <button
                            onClick={handleRestore}
                            disabled={loading}
                            className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                        >
                            <Download className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">Restore Now</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">Replace local data from Drive</span>
                        </button>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <label className="flex items-center justify-between cursor-pointer">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">Auto-sync</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Automatically backup changes to Drive</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={autoSyncEnabled}
                                onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                        </label>
                    </div>

                    {syncStatus.message && (
                        <div className={`flex items-center gap-2 text-sm p-3 rounded-md ${syncStatus.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                            syncStatus.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                                'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                            }`}>
                            {syncStatus.type === 'success' && <Check size={16} />}
                            {syncStatus.type === 'error' && <AlertCircle size={16} />}
                            {syncStatus.type === 'idle' && <Loader2 size={16} className="animate-spin" />}
                            {syncStatus.message}
                        </div>
                    )}
                </div>
            )}

            <ConfirmModal
                isOpen={showRestoreConfirm}
                title="Restore from Google Drive"
                message="This will overwrite your current data with the backup from Google Drive. Are you sure you want to continue?"
                onConfirm={confirmRestore}
                onCancel={() => setShowRestoreConfirm(false)}
            />
        </div>
    );
};
