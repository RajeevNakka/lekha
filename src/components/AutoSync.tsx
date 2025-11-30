import { useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { db } from '../lib/db';
import { googleDriveService } from '../lib/google-drive';

export function AutoSync() {
    const { currentUser, setSyncStatus, autoSyncEnabled } = useStore();
    const debounceTimerRef = useRef<number | null>(null);
    const isSyncingRef = useRef(false);

    useEffect(() => {
        // Only enable auto-sync if user is connected AND auto-sync is enabled
        if (!currentUser || !autoSyncEnabled) return;

        const handleChange = () => {
            // Clear existing timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            // Set status to saving
            setSyncStatus('saving');

            // Debounce: wait 5 seconds after last change
            debounceTimerRef.current = setTimeout(async () => {
                if (isSyncingRef.current) return;

                try {
                    isSyncingRef.current = true;
                    await googleDriveService.uploadBackup();
                    setSyncStatus('saved');

                    setTimeout(() => {
                        setSyncStatus('idle');
                    }, 2000);
                } catch (error: any) {
                    console.error('Auto-sync failed:', error);

                    // Try to re-authenticate if token expired
                    if (error.message === "Not authenticated") {
                        try {
                            await googleDriveService.signIn();
                            await googleDriveService.uploadBackup();
                            setSyncStatus('saved');
                            setTimeout(() => {
                                setSyncStatus('idle');
                            }, 2000);
                        } catch (retryError) {
                            setSyncStatus('error');
                            setTimeout(() => {
                                setSyncStatus('idle');
                            }, 3000);
                        }
                    } else {
                        setSyncStatus('error');
                        setTimeout(() => {
                            setSyncStatus('idle');
                        }, 3000);
                    }
                } finally {
                    isSyncingRef.current = false;
                }
            }, 5000);
        };

        // Warn user before closing if sync is in progress
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isSyncingRef.current || debounceTimerRef.current !== null) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Subscribe to database changes
        const unsubscribe = db.subscribe(handleChange);

        // Cleanup
        return () => {
            unsubscribe();
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [currentUser, setSyncStatus, autoSyncEnabled]);

    // This component doesn't render anything
    return null;
}
